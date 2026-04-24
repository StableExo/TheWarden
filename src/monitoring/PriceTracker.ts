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
import { PriceOracleValidator, PriceUpdate as OracleUpdate } from '../security/PriceOracleValidator';
import { logger } from '../utils/logger';
import { SwapEvent, MonitoredPool, sqrtPriceX96ToPrice } from './SwapEventMonitor';

// CW-S5: ProviderPool type for multi-endpoint warmup
interface ProviderPool {
  size: number;
  getNext(): string;
}


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
  /** RPC URL for direct on-chain queries (used by forceRefreshPrice). Required. */
  rpcUrl?: string;
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
  
  /** S68: Price oracle validator — circuit breaker + rate-of-change protection */
  private oracleValidator: PriceOracleValidator;
  
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
      rpcUrl: config.rpcUrl ?? '',
    };
    
    // S68: Initialize price oracle validator with circuit breaker
    this.oracleValidator = new PriceOracleValidator({
      minPrice: 1n,                    // Allow very small prices (some tokens are cheap)
      maxPrice: 10n ** 30n,            // Allow very large prices
      maxRateChangeBps: 2000,          // 20% max change per update (arb-appropriate)
      timelockDelay: 0,                // No timelock for real-time trading
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 50,     // 50% movement triggers circuit breaker
      maxPriceAge: 120,                // 2 minutes staleness threshold
    });
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
  async warmup(rpcUrl: string, pool?: ProviderPool): Promise<void> {
    const pools = Array.from(this.poolMeta.entries());
    if (pools.length === 0) {
      logger.warn('[PriceTracker] No pools registered — skip warmup');
      return;
    }

    // S73: ProviderPool parallel warmup — no delays needed when pool has DIFFERENT providers
    // CW-S2 FIX: Both endpoints are QuickNode = shared 15 req/s rate limit
    // Parallel mode only safe when endpoints are on DIFFERENT providers (e.g., QuickNode + ChainStack)
    // Force sequential + 75ms delay to stay under rate limit and seed all pools
    const useParallel = false; // CW-S2: Disabled — both endpoints share QuickNode rate limit
    const rpcDelay = () => new Promise<void>(r => setTimeout(r, 75)); // S72: Rate limit protection
    
    logger.info(`[PriceTracker] ♨️ Warming up ${pools.length} pools (${useParallel ? `PARALLEL via ${pool!.size} endpoints` : 'sequential, 75ms RPC delay'})...`);
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
          await rpcDelay(); // S72: Rate limit protection
          const callUrl = useParallel ? pool!.getNext() : rpcUrl;
          const response = await fetch(callUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: 1, method: 'eth_call',
              params: [{ to: addr, data: selector }, 'latest']
            }),
          });
          const data: any = await response.json();

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
                await rpcDelay(); // S72: Rate limit protection
                const t0CallUrl = useParallel ? pool!.getNext() : rpcUrl;
                const t0Resp = await fetch(t0CallUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0', id: 1, method: 'eth_call',
                    params: [{ to: addr, data: '0x0dfe1681' }, 'latest'] // token0()
                  }),
                });
                const t0Data: any = await t0Resp.json();
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
                // CW-S2 RC#52v2: Verify V3 pool ONLY for DEXes with known V2/CL overlap
                // Aerodrome, AlienBase, QuickSwap have both V2 and CL pools — slot0() selector can collide
                // UniV3, SushiV3, BaseSwap, PancakeSwap are always V3 — skip verification to save RPC calls
                const dexLower = (meta.dex || '').toLowerCase();
                const needsV3Verification = dexLower.includes('aerodrome') || dexLower.includes('alien') || 
                  dexLower.includes('quickswap') || dexLower.includes('dex_16') || dexLower.includes('dex_17') || dexLower.includes('dex_20');
                
                if (needsV3Verification) {
                  let isRealV3 = true;
                  try {
                    await rpcDelay();
                    const liqCallUrl = useParallel ? pool!.getNext() : rpcUrl;
                    const liqResp = await fetch(liqCallUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        jsonrpc: '2.0', id: 1, method: 'eth_call',
                        params: [{ to: addr, data: '0x1a686502' }, 'latest'] // liquidity()
                      }),
                    });
                    const liqData: any = await liqResp.json();
                    if (!liqData.result || liqData.result === '0x' || liqData.result.length < 66) {
                      isRealV3 = false;
                      logger.warn(`[PriceTracker] ⚠️ CW-S2: Pool ${addr.substring(0, 14)}... (${meta.dex}) slot0() responded but liquidity() failed — NOT V3, trying getReserves`);
                    }
                  } catch {
                    isRealV3 = false;
                  }
                  if (!isRealV3) continue; // Fall through to next probe (getReserves)
                }

                // S71: Align on-chain token0 with Supabase for correct decimal adjustment
                // Aerodrome CL cbBTC/WETH pools have inverted token order → 10^20 decimal error without this
                let d0 = token0Decimals;
                let d1 = token1Decimals;
                try {
                  await rpcDelay(); // S72: Rate limit protection
                  const t0CallUrl2 = useParallel ? pool!.getNext() : rpcUrl;
                  const t0Resp = await fetch(t0CallUrl2, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      jsonrpc: '2.0', id: 1, method: 'eth_call',
                      params: [{ to: addr, data: '0x0dfe1681' }, 'latest']
                    }),
                  });
                  const t0Data: any = await t0Resp.json();
                  if (t0Data.result && t0Data.result.length >= 66) {
                    const onChainT0 = '0x' + t0Data.result.slice(26).toLowerCase();
                    if (onChainT0 !== meta.token0.toLowerCase()) {
                      d0 = token1Decimals; d1 = token0Decimals;
                      (meta as any)._invertedDecimals = true;
                      logger.info(`[PriceTracker] 🔀 S71: V3 pool ${addr.substring(0, 14)}... token0 mismatch — corrected decimals for warmup+events`);
                    }
                  }
                } catch (t0Err: any) {
                  // CW-S2 RC#53: Retry token0() once — rate limit failure causes permanent decimal cascade
                  logger.warn(`[PriceTracker] ⚠️ CW-S2: token0() failed for ${addr.substring(0, 14)}... — retrying`);
                  try {
                    await new Promise<void>(r => setTimeout(r, 200)); // Extra delay for rate limit recovery
                    const retryUrl = useParallel ? pool!.getNext() : rpcUrl;
                    const retryResp = await fetch(retryUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        jsonrpc: '2.0', id: 1, method: 'eth_call',
                        params: [{ to: addr, data: '0x0dfe1681' }, 'latest']
                      }),
                    });
                    const retryData: any = await retryResp.json();
                    if (retryData.result && retryData.result.length >= 66) {
                      const onChainT0 = '0x' + retryData.result.slice(26).toLowerCase();
                      if (onChainT0 !== meta.token0.toLowerCase()) {
                        d0 = token1Decimals; d1 = token0Decimals;
                        (meta as any)._invertedDecimals = true;
                        logger.info(`[PriceTracker] 🔀 CW-S2: ${addr.substring(0, 14)}... token0 corrected on retry`);
                      }
                    }
                  } catch { logger.error(`[PriceTracker] ❌ CW-S2: token0() retry also failed for ${addr.substring(0, 14)}... — decimal alignment unknown`); }
                }
                price = sqrtPriceX96ToPrice(sqrtPriceX96, d0, d1);
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
            token0Decimals: (meta as any)._invertedDecimals ? token1Decimals : token0Decimals,
            token1Decimals: (meta as any)._invertedDecimals ? token0Decimals : token1Decimals,
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
  // S68: Force Refresh Price — Direct on-chain query when price=0
  // "Retry on Zero" pattern: slot0 → globalState → getReserves
  // ============================================================

  /**
   * Force a direct on-chain price query for a pool.
   * Used when a swap event or warmup returns price=0.
   * Tries slot0() → globalState() → getReserves() in order.
   * Returns the refreshed price, or 0 if all queries fail.
   */
  async forceRefreshPrice(poolAddr: string, meta: MonitoredPool, rpcUrl: string): Promise<number> {
    const token0Decimals = this.config.tokenDecimals.get(meta.token0.toLowerCase()) ?? 18;
    const token1Decimals = this.config.tokenDecimals.get(meta.token1.toLowerCase()) ?? 18;
    
    const SELECTORS = [
      { name: 'slot0',       selector: '0x3850c7bd', type: 'v3' as const },
      { name: 'globalState', selector: '0xe76c01e4', type: 'algebra' as const },
      { name: 'getReserves', selector: '0x0902f1ac', type: 'v2' as const },
    ];

    for (const { name, selector, type } of SELECTORS) {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'eth_call',
            params: [{ to: poolAddr, data: selector }, 'latest']
          }),
        });
        const data: any = await response.json();

        if (!data.result || data.result === '0x' || data.result.length < 66) continue;

        if (type === 'v2') {
          if (data.result.length >= 194) {
            let rawR0 = BigInt('0x' + data.result.slice(2, 66));
            let rawR1 = BigInt('0x' + data.result.slice(66, 130));
            if (rawR0 > 0n && rawR1 > 0n) {
              // S69: Align on-chain token0 with Supabase (fixes cbBTC 10,000x phantom)
              let d0 = token0Decimals;
              let d1 = token1Decimals;
              try {
                const t0Resp = await fetch(rpcUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0', id: 1, method: 'eth_call',
                    params: [{ to: poolAddr, data: '0x0dfe1681' }, 'latest']
                  }),
                });
                const t0Data: any = await t0Resp.json();
                if (t0Data.result && t0Data.result.length >= 66) {
                  const onChainT0 = '0x' + t0Data.result.slice(26).toLowerCase();
                  if (onChainT0 !== meta.token0.toLowerCase()) {
                    const tmpR = rawR0; rawR0 = rawR1; rawR1 = tmpR;
                    d0 = token1Decimals; d1 = token0Decimals;
                  }
                }
              } catch {}
              const scale = 10n ** 18n;
              const scaledPrice = (rawR1 * (10n ** BigInt(d0)) * scale) /
                                  (rawR0 * (10n ** BigInt(d1)));
              const price = Number(scaledPrice) / Number(scale);
              if (price > 0) {
                logger.info(`[PriceTracker] 🔄 forceRefresh ${poolAddr.substring(0, 14)}... via ${name}: price=${price.toFixed(8)}`);
                return price;
              }
            }
          }
        } else {
          if (data.result.length >= 130) {
            const sqrtPriceX96 = BigInt('0x' + data.result.slice(2, 66));
            if (sqrtPriceX96 > 0n) {
              // S71: Align on-chain token0 with Supabase token0 for correct decimal adjustment
              // Same fix as V2 handler (S70) — Aerodrome CL cbBTC/WETH pools have inverted token order
              // On-chain: token0=WETH(18), token1=cbBTC(8). Supabase: token0=cbBTC(8), token1=WETH(18)
              // Without alignment: decimals are swapped → price computes to ~0 (10^20x error)
              let d0 = token0Decimals;
              let d1 = token1Decimals;
              try {
                const t0Resp = await fetch(rpcUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0', id: 1, method: 'eth_call',
                    params: [{ to: poolAddr, data: '0x0dfe1681' }, 'latest']
                  }),
                });
                const t0Data: any = await t0Resp.json();
                if (t0Data.result && t0Data.result.length >= 66) {
                  const onChainT0 = '0x' + t0Data.result.slice(26).toLowerCase();
                  if (onChainT0 !== meta.token0.toLowerCase()) {
                    d0 = token1Decimals; d1 = token0Decimals;
                    logger.info(`[PriceTracker] 🔀 S71: Token0 mismatch for ${poolAddr.substring(0, 14)}... — swapped decimals (on-chain=${onChainT0.substring(0, 10)})`);
                  }
                }
              } catch {}
              const price = sqrtPriceX96ToPrice(sqrtPriceX96, d0, d1);
              if (price > 0) {
                logger.info(`[PriceTracker] 🔄 forceRefresh ${poolAddr.substring(0, 14)}... via ${name}: price=${price.toFixed(8)}`);
                return price;
              }
            }
          }
        }
      } catch (err: any) {
        logger.warn(`[PriceTracker] forceRefresh ${name} failed for ${poolAddr.substring(0, 14)}...: ${err.message}`);
      }
    }

    logger.warn(`[PriceTracker] ⚠️ forceRefresh FAILED for ${poolAddr.substring(0, 14)}... — all probes returned 0`);
    return 0;
  }

  // ============================================================
  // Swap Event Processing
  // ============================================================

  /**
   * Process a swap event — update price state and check for opportunities.
   * Called by SwapEventMonitor's 'swap' event handler.
   */
  async onSwap(event: SwapEvent): Promise<void> {
    this.stats.totalSwapsProcessed++;
    
    const poolAddr = event.pool.toLowerCase();
    const meta = this.poolMeta.get(poolAddr);
    if (!meta) return; // Unknown pool, ignore
    
    // Get decimals for price calculation
    const token0Decimals = this.config.tokenDecimals.get(meta.token0.toLowerCase()) ?? 18;
    const token1Decimals = this.config.tokenDecimals.get(meta.token1.toLowerCase()) ?? 18;
    
    // Calculate human-readable price
    // S71: Use corrected decimals if warmup detected inverted on-chain token order
    const correctedD0 = (meta as any)._invertedDecimals ? token1Decimals : token0Decimals;
    const correctedD1 = (meta as any)._invertedDecimals ? token0Decimals : token1Decimals;
    let price = sqrtPriceX96ToPrice(event.sqrtPriceX96, correctedD0, correctedD1);
    let refreshedSqrtPriceX96 = event.sqrtPriceX96;
    
    // S68: "Retry on Zero" — if price=0, force direct on-chain query
    // This catches the cbBTC phantom bug (155/157 opportunities were phantoms)
    if (price === 0 || event.sqrtPriceX96 === 0n) {
      if (this.config.rpcUrl) {
        const refreshedPrice = await this.forceRefreshPrice(poolAddr, meta, this.config.rpcUrl);
        if (refreshedPrice > 0) {
          price = refreshedPrice;
          logger.info(`[PriceTracker] 🔄 S68 Retry on Zero: ${meta.dex} ${poolAddr.substring(0, 10)}... refreshed to ${price.toFixed(8)}`);
        } else {
          // All probes failed — keep the LAST KNOWN GOOD price (don't overwrite with 0)
          const existingState = this.poolStates.get(poolAddr);
          if (existingState && existingState.price > 0) {
            logger.info(`[PriceTracker] 🛡️ S68 Zero Guard: keeping last good price ${existingState.price.toFixed(8)} for ${poolAddr.substring(0, 10)}...`);
            return; // Skip this update entirely
          }
          // No existing state either — skip this event
          logger.warn(`[PriceTracker] ⚠️ S68: No valid price for ${poolAddr.substring(0, 10)}... — skipping`);
          return;
        }
      } else {
        // No RPC URL configured — defensive skip
        const existingState = this.poolStates.get(poolAddr);
        if (existingState && existingState.price > 0) {
          return; // Keep last known good price
        }
        return; // Skip entirely
      }
    }
    const inversePrice = price > 0 ? 1 / price : 0;
    
    // S68: Validate price through oracle circuit breaker
    // Catches manipulation, extreme movements, and corrupted data
    const priceBigint = BigInt(Math.floor(price * 1e18)); // Convert to bigint for validator
    const oracleResult = this.oracleValidator.validatePriceUpdate({
      symbol: poolAddr, // Track per-pool
      price: priceBigint,
      source: meta.dex,
      timestamp: Date.now(),
    });
    
    if (!oracleResult.valid) {
      // Circuit breaker or rate-of-change violation
      logger.warn(
        `[PriceTracker] 🛑 Oracle REJECTED ${meta.dex} ${poolAddr.substring(0, 10)}... ` +
        `price=${price.toFixed(8)}: ${oracleResult.errors.join(', ')}`
      );
      // Keep existing state — don't update with suspicious price
      return;
    }
    
    if (oracleResult.warnings.length > 0) {
      logger.info(
        `[PriceTracker] ⚠️ Oracle WARNING ${poolAddr.substring(0, 10)}...: ${oracleResult.warnings.join(', ')}`
      );
    }
    
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
    if (!poolAddrs || poolAddrs.size < 2) {
      // CW-S6: Diagnostic — pair has < 2 registered pools
      if (this.config.verboseLogging) {
        logger.debug(`[PriceTracker] checkSpread(${pairKey}): only ${poolAddrs?.size ?? 0} pool(s) registered — need ≥2`);
      }
      return;
    }
    
    const now = Date.now();
    
    // Collect fresh pool states
    // CW-S6: Added diagnostic counters for all rejection paths
    const freshStates: PoolPriceState[] = [];
    let staleCount = 0;
    let zeroCount = 0;
    let missingCount = 0;
    for (const addr of poolAddrs) {
      const state = this.poolStates.get(addr);
      if (!state) { missingCount++; continue; }
      
      const age = now - state.lastUpdatedAt;
      if (age > this.config.maxPriceAge) {
        staleCount++;
        continue;
      }
      
      // S68: Skip pools with price=0 (phantom prevention)
      if (state.price === 0) { zeroCount++; continue; }
      
      freshStates.push(state);
    }
    
    if (freshStates.length < 2) {
      // CW-S6: Diagnostic — why not enough fresh prices
      if (this.config.verboseLogging) {
        logger.debug(
          `[PriceTracker] checkSpread(${pairKey}): ${freshStates.length} fresh / ${poolAddrs.size} total ` +
          `(stale=${staleCount} zero=${zeroCount} missing=${missingCount}) — need ≥2 fresh`
        );
      }
      return;
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
    
    // S72 RC#50: Calculate NET spread after pool swap fees
    // Raw spread between pools does NOT account for fees charged by each pool.
    // A 1.04% spread between a 1% fee pool and a 0.05% fee pool is actually
    // UNPROFITABLE because total fees (1.05%) exceed the spread.
    const midPrice = (minPriceState.price + maxPriceState.price) / 2;
    if (midPrice === 0) return;
    
    const spreadAbsolute = maxPriceState.price - minPriceState.price;
    const grossSpreadPercent = (spreadAbsolute / midPrice) * 100;
    
    // Deduct pool swap fees: buy pool fee + sell pool fee (both in bps)
    // fee is stored as bps (e.g., 500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
    const buyFeePercent = (minPriceState.fee || 0) / 10000 * 100;
    const sellFeePercent = (maxPriceState.fee || 0) / 10000 * 100;
    const totalFeePercent = buyFeePercent + sellFeePercent;
    
    // Net spread = gross spread minus total fees
    const spreadPercent = grossSpreadPercent - totalFeePercent;
    
    // S72 P1-4: Reject phantom spreads > 50% (guaranteed decimal error / token0 inversion)
    if (grossSpreadPercent > 50) {
      logger.debug(`[PriceTracker] checkSpread(${pairKey}): PHANTOM gross=${grossSpreadPercent.toFixed(2)}% > 50% — skipped`);
      return;
    }
    
    // Check threshold (now fee-aware — only genuine opportunities pass)
    if (spreadPercent < this.config.minSpreadPercent) {
      // CW-S6: Log near-misses (within 2x of threshold) for tuning visibility
      if (this.config.verboseLogging && spreadPercent > this.config.minSpreadPercent * -2) {
        logger.debug(
          `[PriceTracker] checkSpread(${pairKey}): netSpread=${spreadPercent.toFixed(4)}% < min=${this.config.minSpreadPercent}% ` +
          `(gross=${grossSpreadPercent.toFixed(4)}% fees=${totalFeePercent.toFixed(4)}%) ` +
          `${minPriceState.dex}=${minPriceState.price.toFixed(8)} vs ${maxPriceState.dex}=${maxPriceState.price.toFixed(8)}`
        );
      }
      return;
    }
    
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
      `[PriceTracker] 🎯 OPPORTUNITY: ${pairKey} netSpread=${spreadPercent.toFixed(4)}% ` +
      `(gross=${grossSpreadPercent.toFixed(4)}% fees=${totalFeePercent.toFixed(4)}%) ` +
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
      spreadPercent: ((max.price - min.price) / mid) * 100 - ((min.fee || 0) + (max.fee || 0)) / 10000 * 100,
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

  /** S68: Check if circuit breaker is active */
  isCircuitBreakerActive(): boolean {
    return this.oracleValidator.isCircuitBreakerActive();
  }

  /** S68: Reset circuit breaker (manual intervention required) */
  resetCircuitBreaker(): void {
    this.oracleValidator.resetCircuitBreaker();
    logger.info('[PriceTracker] 🔄 Circuit breaker RESET — price updates resumed');
  }

  /** S68: Get oracle validator stats */
  getOracleStats() {
    return this.oracleValidator.getStats();
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
