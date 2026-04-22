/**
 * PriceTracker — Real-time cross-DEX price tracking and spread detection
 * 
 * Phase 4: Sub-second opportunity detection.
 * 
 * Consumes SwapEvents from SwapEventMonitor, maintains live price state
 * per pool per DEX, and calculates cross-DEX spreads in real-time.
 * When a spread exceeds the configured threshold, emits an 'opportunity' event
 * for the OpportunityPipeline to evaluate.
 * 
 * Architecture:
 *   SwapEventMonitor emits 'swap' → PriceTracker.onSwap()
 *     → Updates price state for pool
 *     → Finds all pools for same token pair on different DEXes
 *     → Calculates max spread across DEX pairs
 *     → If spread > threshold → emits 'opportunity'
 * 
 * Key Design Decisions:
 *   - Uses sqrtPriceX96 directly for precision (avoids floating-point drift)
 *   - Groups pools by canonical token pair (sorted addresses)
 *   - Tracks price staleness (stale prices are excluded from spread calc)
 *   - Emits with full context so OpportunityPipeline can construct swap path
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { SwapEvent, MonitoredPool, sqrtPriceX96ToPrice } from './SwapEventMonitor';

// ============================================================
// Types
// ============================================================

/** Live price state for a single pool */
export interface PoolPriceState {
  /** Pool address */
  pool: string;
  /** DEX name */
  dex: string;
  /** Token0 address */
  token0: string;
  /** Token1 address */
  token1: string;
  /** Token0 decimals */
  token0Decimals: number;
  /** Token1 decimals */
  token1Decimals: number;
  /** Fee tier in bps */
  fee: number;
  /** Latest sqrtPriceX96 (raw, high precision) */
  sqrtPriceX96: bigint;
  /** Latest tick */
  tick: number;
  /** Latest liquidity */
  liquidity: bigint;
  /** Human-readable price (token1 per token0) */
  price: number;
  /** Inverse price (token0 per token1) */
  inversePrice: number;
  /** Block number of last update */
  lastBlock: number;
  /** Timestamp of last update (ms) */
  lastUpdatedAt: number;
  /** Number of swap events processed */
  swapCount: number;
}

/** Canonical token pair key (sorted addresses) */
export type TokenPairKey = string;

/** Cross-DEX opportunity signal */
export interface OpportunitySignal {
  /** Canonical pair key */
  pairKey: TokenPairKey;
  /** Token addresses (sorted) */
  tokenA: string;
  tokenB: string;
  /** Pool with lower price (buy here) */
  buyPool: PoolPriceState;
  /** Pool with higher price (sell here) */
  sellPool: PoolPriceState;
  /** Spread as percentage (e.g., 0.89 means 0.89%) */
  spreadPercent: number;
  /** Spread as absolute price difference */
  spreadAbsolute: number;
  /** Timestamp of detection */
  detectedAt: number;
  /** Block number (latest of the two pools) */
  blockNumber: number;
  /** Time since the older price was updated (ms) — freshness indicator */
  maxPriceAge: number;
}

/** PriceTracker configuration */
export interface PriceTrackerConfig {
  /** Minimum spread (%) to emit opportunity signal. Default: 0.3% */
  minSpreadPercent?: number;
  /** Maximum age (ms) for a price to be considered fresh. Default: 30000 (30s) */
  maxPriceAge?: number;
  /** Token decimals lookup (address → decimals). Required for accurate price calc. */
  tokenDecimals: Map<string, number>;
  /** Cooldown (ms) per pair after emitting opportunity. Prevents spam. Default: 2000 */
  opportunityCooldown?: number;
  /** Enable logging of every price update. Default: false */
  verboseLogging?: boolean;
}

/** PriceTracker statistics */
export interface PriceTrackerStats {
  /** Total swap events processed */
  totalSwapsProcessed: number;
  /** Total opportunities detected */
  totalOpportunities: number;
  /** Number of tracked pools */
  trackedPools: number;
  /** Number of tracked token pairs */
  trackedPairs: number;
  /** Opportunities suppressed by cooldown */
  cooldownSuppressed: number;
  /** Opportunities suppressed by stale price */
  staleSuppressed: number;
  /** Last opportunity timestamp */
  lastOpportunityAt: number | null;
}

// ============================================================
// PriceTracker
// ============================================================

export class PriceTracker extends EventEmitter {
  private config: Required<PriceTrackerConfig>;
  
  /** Price state indexed by pool address */
  private poolStates: Map<string, PoolPriceState> = new Map();
  
  /** Pools grouped by canonical token pair key */
  private pairPools: Map<TokenPairKey, Set<string>> = new Map();
  
  /** Pool metadata from MonitoredPool config */
  private poolMeta: Map<string, MonitoredPool> = new Map();
  
  /** Cooldown tracker: pairKey → last emission timestamp */
  private cooldowns: Map<string, number> = new Map();
  
  /** Stats */
  private stats: PriceTrackerStats = {
    totalSwapsProcessed: 0,
    totalOpportunities: 0,
    trackedPools: 0,
    trackedPairs: 0,
    cooldownSuppressed: 0,
    staleSuppressed: 0,
    lastOpportunityAt: null,
  };

  constructor(config: PriceTrackerConfig) {
    super();
    this.config = {
      minSpreadPercent: config.minSpreadPercent ?? 0.3,
      maxPriceAge: config.maxPriceAge ?? 30000,
      tokenDecimals: config.tokenDecimals,
      opportunityCooldown: config.opportunityCooldown ?? 2000,
      verboseLogging: config.verboseLogging ?? false,
    };
  }

  // ============================================================
  // Pool Registration
  // ============================================================

  /**
   * Register pools to track. Must be called before processing swap events.
   * Typically called with the same pool list given to SwapEventMonitor.
   */
  registerPools(pools: MonitoredPool[]): void {
    for (const pool of pools) {
      const addr = pool.address.toLowerCase();
      this.poolMeta.set(addr, pool);
      
      // Create canonical pair key (sorted addresses)
      const pairKey = this.makePairKey(pool.token0, pool.token1);
      
      if (!this.pairPools.has(pairKey)) {
        this.pairPools.set(pairKey, new Set());
      }
      this.pairPools.get(pairKey)!.add(addr);
    }
    
    this.stats.trackedPools = this.poolMeta.size;
    this.stats.trackedPairs = this.pairPools.size;
    
    logger.info(`[PriceTracker] Registered ${pools.length} pools across ${this.pairPools.size} pairs`);
    for (const [pairKey, poolSet] of this.pairPools) {
      logger.info(`  [Pair] ${pairKey}: ${poolSet.size} pools`);
    }
  }

  // ============================================================
  // S56: On-chain Warmup — Seed initial prices from slot0() / getReserves()
  // S62: Dual-mode warmup — V3 pools use slot0(), V2 pools use getReserves()
  // ============================================================

  /**
   * Warm up price state by querying on-chain state for all registered pools.
   * V3/CL pools: slot0() → sqrtPriceX96 → price
   * V2 pools: getReserves() → reserve0/reserve1 → price
   * Eliminates the 7-8 minute dead time after restart.
   * Call after registerPools() and before starting swap event processing.
   */
  async warmup(rpcUrl: string): Promise<void> {
    const pools = Array.from(this.poolMeta.entries());
    if (pools.length === 0) {
      logger.warn('[PriceTracker] No pools registered — skip warmup');
      return;
    }

    logger.info(`[PriceTracker] ♨️ Warming up ${pools.length} pools (auto-probe: slot0 → globalState → getReserves)...`);
    const startTime = Date.now();
    let successSlot0 = 0;
    let successGlobalState = 0;
    let successReserves = 0;
    let failed = 0;

    // Function selectors for auto-probe
    const SELECTORS = [
      { name: 'slot0',       selector: '0x3850c7bd', type: 'v3' as const },    // V3/CL pools
      { name: 'globalState', selector: '0xe76c01e4', type: 'algebra' as const }, // Algebra V3 (QuickSwap, AlienBase)
      { name: 'getReserves', selector: '0x0902f1ac', type: 'v2' as const },     // V2 AMM pools
    ];

    for (const [addr, meta] of pools) {
      try {
        const token0Decimals = this.config.tokenDecimals.get(meta.token0.toLowerCase()) ?? 18;
        const token1Decimals = this.config.tokenDecimals.get(meta.token1.toLowerCase()) ?? 18;

        let price = 0;
        let inversePrice = 0;
        let sqrtPriceX96 = 0n;
        let tick = 0;
        let seeded = false;
        let detectedType = '';

        // S63: Auto-probe — try each selector until one works
        for (const { name, selector, type } of SELECTORS) {
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: 1, method: 'eth_call',
              params: [{ to: addr, data: selector }, 'latest']
            }),
          });
          const data = await response.json();

          if (!data.result || data.result === '0x' || data.result.length < 66) continue;

          if (type === 'v2') {
            // getReserves() → (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)
            // S63 (RC#28 fix): V2 reserves are ordered by ON-CHAIN token0/token1 (lower address first)
            // which may differ from Supabase ordering. We need to fetch on-chain token0 to align.
            if (data.result.length >= 194) {
              let rawR0 = BigInt('0x' + data.result.slice(2, 66));
              let rawR1 = BigInt('0x' + data.result.slice(66, 130));

              if (rawR0 > 0n && rawR1 > 0n) {
                // Fetch on-chain token0 to determine correct reserve mapping
                const t0Resp = await fetch(rpcUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0', id: 1, method: 'eth_call',
                    params: [{ to: addr, data: '0x0dfe1681' }, 'latest'] // token0()
                  }),
                });
                const t0Data = await t0Resp.json();
                const onChainToken0 = t0Data.result ? ('0x' + t0Data.result.slice(26)).toLowerCase() : '';

                // If on-chain token0 doesn't match our meta.token0, swap reserves
                let r0 = rawR0;
                let r1 = rawR1;
                let d0 = token0Decimals;
                let d1 = token1Decimals;
                if (onChainToken0 && onChainToken0 !== meta.token0.toLowerCase()) {
                  // On-chain order is reversed from Supabase — swap reserves to match meta ordering
                  r0 = rawR1;
                  r1 = rawR0;
                  d0 = token1Decimals;
                  d1 = token0Decimals;
                  logger.info(`[PriceTracker] V2 pool ${addr.substring(0, 14)}... token order swapped (on-chain t0=${onChainToken0.substring(0, 10)})`);
                }

                // price = (r1 / 10^d1) / (r0 / 10^d0) = (r1 * 10^d0) / (r0 * 10^d1)
                const scale = 10n ** 18n;
                const scaledPrice = (r1 * (10n ** BigInt(d0)) * scale) /
                                    (r0 * (10n ** BigInt(d1)));
                price = Number(scaledPrice) / Number(scale);
                inversePrice = price > 0 ? 1 / price : 0;

                const Q96 = 2n ** 96n;
                const sqrtScaled = Math.sqrt(Number(r1) * (10 ** d0) /
                                             (Number(r0) * (10 ** d1)));
                sqrtPriceX96 = BigInt(Math.floor(sqrtScaled * Number(Q96)));

                seeded = true;
                detectedType = name;
                successReserves++;
              }
            }
          } else {
            // slot0() or globalState() → both return (uint160 sqrtPriceX96, int24 tick, ...) as first 2 slots
            if (data.result.length >= 130) {
              const sqrtPriceX96Hex = data.result.slice(2, 66);
              sqrtPriceX96 = BigInt('0x' + sqrtPriceX96Hex);
              const tickHex = data.result.slice(66, 130);
              tick = Number(BigInt('0x' + tickHex));

              if (sqrtPriceX96 > 0n) {
                price = sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals);
                inversePrice = price > 0 ? 1 / price : 0;
                seeded = true;
                detectedType = name;
                if (name === 'slot0') successSlot0++;
                else successGlobalState++;
              }
            }
          }

          if (seeded) break; // Found working selector, stop probing
        }

        if (seeded) {
          const state: PoolPriceState = {
            pool: addr,
            dex: meta.dex || 'Unknown',
            token0: meta.token0,
            token1: meta.token1,
            token0Decimals,
            token1Decimals,
            fee: meta.fee ?? 0,
            sqrtPriceX96,
            tick,
            liquidity: 0n,
            price,
            inversePrice,
            lastBlock: 0,
            lastUpdatedAt: Date.now(),
            swapCount: 0,
          };

          this.poolStates.set(addr, state);
        } else {
          failed++;
          logger.warn(`[PriceTracker] ⚠️ Pool ${addr.substring(0, 14)}... (${meta.dex}) — no interface responded`);
        }
      } catch (err: any) {
        failed++;
        logger.error(`[PriceTracker] Warmup error for ${addr.substring(0, 14)}...: ${err.message}`);
      }
    }

    const total = successSlot0 + successGlobalState + successReserves;
    const elapsed = Date.now() - startTime;
    logger.info(
      `[PriceTracker] ♨️ Warmup complete: ${total}/${pools.length} pools seeded in ${elapsed}ms ` +
      `(slot0: ${successSlot0}, globalState: ${successGlobalState}, getReserves: ${successReserves}, failed: ${failed}). ` +
      `Ready for spread detection.`
    );
  }

  // ============================================================
  // Swap Event Processing
  // ============================================================

  /**
   * Process a swap event — update price state and check for opportunities.
   * Called by SwapEventMonitor's 'swap' event handler.
   */
  onSwap(event: SwapEvent): void {
    this.stats.totalSwapsProcessed++;
    
    const poolAddr = event.pool.toLowerCase();
    const meta = this.poolMeta.get(poolAddr);
    if (!meta) return; // Unknown pool, ignore
    
    // Get decimals for price calculation
    const token0Decimals = this.config.tokenDecimals.get(meta.token0.toLowerCase()) ?? 18;
    const token1Decimals = this.config.tokenDecimals.get(meta.token1.toLowerCase()) ?? 18;
    
    // Calculate human-readable price
    const price = sqrtPriceX96ToPrice(event.sqrtPriceX96, token0Decimals, token1Decimals);
    const inversePrice = price > 0 ? 1 / price : 0;
    
    // Update pool state
    const state: PoolPriceState = {
      pool: poolAddr,
      dex: meta.dex,
      token0: meta.token0.toLowerCase(),
      token1: meta.token1.toLowerCase(),
      token0Decimals,
      token1Decimals,
      fee: meta.fee,
      sqrtPriceX96: event.sqrtPriceX96,
      tick: event.tick,
      liquidity: event.liquidity,
      price,
      inversePrice,
      lastBlock: event.blockNumber,
      lastUpdatedAt: event.receivedAt,
      swapCount: (this.poolStates.get(poolAddr)?.swapCount ?? 0) + 1,
    };
    
    this.poolStates.set(poolAddr, state);
    
    if (this.config.verboseLogging) {
      logger.debug(
        `[PriceTracker] ${meta.dex} ${poolAddr.substring(0, 10)}... ` +
        `price=${price.toFixed(8)} tick=${event.tick} block=${event.blockNumber}`
      );
    }
    
    // Emit price update event (for external consumers / dashboards)
    this.emit('price-update', state);
    
    // Check for cross-DEX opportunities on this pair
    const pairKey = this.makePairKey(meta.token0, meta.token1);
    this.checkSpread(pairKey);
  }

  // ============================================================
  // Spread Calculation
  // ============================================================

  /**
   * Check cross-DEX spread for a token pair.
   * If spread exceeds threshold, emit opportunity signal.
   */
  private checkSpread(pairKey: TokenPairKey): void {
    const poolAddrs = this.pairPools.get(pairKey);
    if (!poolAddrs || poolAddrs.size < 2) return; // Need at least 2 pools
    
    const now = Date.now();
    
    // Collect fresh pool states
    const freshStates: PoolPriceState[] = [];
    for (const addr of poolAddrs) {
      const state = this.poolStates.get(addr);
      if (!state) continue;
      
      const age = now - state.lastUpdatedAt;
      if (age > this.config.maxPriceAge) {
        // Stale price, skip
        continue;
      }
      
      freshStates.push(state);
    }
    
    if (freshStates.length < 2) {
      return; // Not enough fresh prices
    }
    
    // Find min and max price pools
    let minPriceState = freshStates[0];
    let maxPriceState = freshStates[0];
    
    for (const state of freshStates) {
      if (state.price < minPriceState.price) minPriceState = state;
      if (state.price > maxPriceState.price) maxPriceState = state;
    }
    
    // Skip if same pool (shouldn't happen but defensive)
    if (minPriceState.pool === maxPriceState.pool) return;
    
    // Calculate spread
    const midPrice = (minPriceState.price + maxPriceState.price) / 2;
    if (midPrice === 0) return;
    
    const spreadAbsolute = maxPriceState.price - minPriceState.price;
    const spreadPercent = (spreadAbsolute / midPrice) * 100;
    
    // Check threshold
    if (spreadPercent < this.config.minSpreadPercent) return;
    
    // Check cooldown
    const lastEmit = this.cooldowns.get(pairKey) ?? 0;
    if (now - lastEmit < this.config.opportunityCooldown) {
      this.stats.cooldownSuppressed++;
      return;
    }
    
    // Calculate max price age (freshness of the older price)
    const maxPriceAge = Math.max(
      now - minPriceState.lastUpdatedAt,
      now - maxPriceState.lastUpdatedAt
    );
    
    // Determine buy/sell direction
    // Buy where price is lower, sell where price is higher
    const [tokenA, tokenB] = this.sortAddresses(minPriceState.token0, minPriceState.token1);
    
    const signal: OpportunitySignal = {
      pairKey,
      tokenA,
      tokenB,
      buyPool: minPriceState,
      sellPool: maxPriceState,
      spreadPercent,
      spreadAbsolute,
      detectedAt: now,
      blockNumber: Math.max(minPriceState.lastBlock, maxPriceState.lastBlock),
      maxPriceAge,
    };
    
    // Update cooldown and stats
    this.cooldowns.set(pairKey, now);
    this.stats.totalOpportunities++;
    this.stats.lastOpportunityAt = now;
    
    logger.info(
      `[PriceTracker] 🎯 OPPORTUNITY: ${pairKey} spread=${spreadPercent.toFixed(4)}% ` +
      `buy@${minPriceState.dex}(${minPriceState.price.toFixed(8)}) ` +
      `sell@${maxPriceState.dex}(${maxPriceState.price.toFixed(8)}) ` +
      `age=${maxPriceAge}ms block=${signal.blockNumber}`
    );
    
    this.emit('opportunity', signal);
  }

  // ============================================================
  // Public API
  // ============================================================

  /** Get current price state for a pool */
  getPoolState(poolAddress: string): PoolPriceState | undefined {
    return this.poolStates.get(poolAddress.toLowerCase());
  }

  /** Get all pool states for a token pair */
  getPairStates(token0: string, token1: string): PoolPriceState[] {
    const pairKey = this.makePairKey(token0, token1);
    const addrs = this.pairPools.get(pairKey);
    if (!addrs) return [];
    
    const states: PoolPriceState[] = [];
    for (const addr of addrs) {
      const state = this.poolStates.get(addr);
      if (state) states.push(state);
    }
    return states;
  }

  /** Get current spread for a pair (or null if not enough data) */
  getCurrentSpread(token0: string, token1: string): { spreadPercent: number; buyDex: string; sellDex: string } | null {
    const states = this.getPairStates(token0, token1);
    if (states.length < 2) return null;
    
    let min = states[0];
    let max = states[0];
    for (const s of states) {
      if (s.price < min.price) min = s;
      if (s.price > max.price) max = s;
    }
    
    const mid = (min.price + max.price) / 2;
    if (mid === 0) return null;
    
    return {
      spreadPercent: ((max.price - min.price) / mid) * 100,
      buyDex: min.dex,
      sellDex: max.dex,
    };
  }

  /** Get statistics */
  getStats(): PriceTrackerStats {
    return { ...this.stats };
  }

  /** Get all tracked pair keys */
  getTrackedPairs(): TokenPairKey[] {
    return Array.from(this.pairPools.keys());
  }

  // ============================================================
  // Helpers
  // ============================================================

  /** Create canonical pair key from two token addresses */
  private makePairKey(tokenA: string, tokenB: string): TokenPairKey {
    const [sorted0, sorted1] = this.sortAddresses(tokenA, tokenB);
    return `${sorted0}/${sorted1}`;
  }

  /** Sort two addresses alphabetically (for canonical pair key) */
  private sortAddresses(a: string, b: string): [string, string] {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    return aLower < bLower ? [aLower, bLower] : [bLower, aLower];
  }
}
