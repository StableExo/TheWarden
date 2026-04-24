/**
 * EventDrivenInitializer — Bootstrap the event-driven monitoring pipeline
 * 
 * Phase 4: Sub-second WebSocket monitoring initialization.
 * 
 * Loads pool configuration from Supabase (warden_pools + warden_tokens),
 * resolves foreign keys, and creates a fully configured EventDrivenMonitor.
 * 
 * Called from main.ts when ENABLE_EVENT_DRIVEN=true.
 */

import { logger } from '../utils/logger';
import { MonitoredPool } from './SwapEventMonitor';
import { EventDrivenMonitor, EventDrivenMonitorConfig } from './EventDrivenMonitor';

// ============================================================
// DEX ID Mapping (matches warden_pools.dex_id)
// ============================================================

const DEX_ID_MAP: Record<number, string> = {
  1: 'uniswap_v3',
  2: 'sushiswap_v3',
  3: 'aerodrome',
  4: 'pancakeswap_v3',
  5: 'baseswap',
  6: 'velodrome',
  7: 'pancakeswap',    // S61: Added
  8: 'hydrex',         // S61: Added
  9: 'quickswap',      // S61: Added  
  10: 'alienbase',     // S61: Added
  11: 'swapbased',     // S61: Added
  12: 'rocketswap',    // S61: Added
};

// S63: V2_DEXES removed — PriceTracker.warmup() now auto-probes each pool
// (tries slot0 → globalState → getReserves). No per-DEX classification needed.

// ============================================================
// Supabase Types
// ============================================================

interface SupabasePool {
  id: number;
  chain_id: number;
  dex_id: number;
  pool_address: string;
  token0_id: number;
  token1_id: number;
  fee: number;
  active: boolean;
}

interface SupabaseToken {
  id: number;
  chain_id: number;
  address: string;
  symbol: string;
  decimals: number;
  active: boolean;
}

// ============================================================
// Pool Loading
// ============================================================

/**
 * Load monitored pools from Supabase, resolving foreign keys.
 * Returns MonitoredPool[] + token decimals map.
 */
export async function loadPoolsFromSupabase(
  supabaseUrl: string,
  supabaseKey: string,
  chainId: number = 8453
): Promise<{ pools: MonitoredPool[]; tokenDecimals: Map<string, number> }> {
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  // Load tokens
  const tokensResp = await fetch(
    `${supabaseUrl}/rest/v1/warden_tokens?chain_id=eq.${chainId}&active=eq.true&select=*`,
    { headers }
  );
  if (!tokensResp.ok) throw new Error(`Failed to load tokens: ${tokensResp.status}`);
  const tokens: SupabaseToken[] = await tokensResp.json() as any;

  // Build token lookup maps
  const tokenById = new Map<number, SupabaseToken>();
  const tokenDecimals = new Map<string, number>();
  for (const t of tokens) {
    tokenById.set(t.id, t);
    tokenDecimals.set(t.address.toLowerCase(), t.decimals);
  }

  logger.info(`[EventDrivenInit] Loaded ${tokens.length} tokens from Supabase`);

  // Load pools
  const poolsResp = await fetch(
    `${supabaseUrl}/rest/v1/warden_pools?chain_id=eq.${chainId}&active=eq.true&select=*`,
    { headers }
  );
  if (!poolsResp.ok) throw new Error(`Failed to load pools: ${poolsResp.status}`);
  const rawPools: SupabasePool[] = await poolsResp.json() as any;

  logger.info(`[EventDrivenInit] Loaded ${rawPools.length} pools from Supabase`);

  // Resolve pools
  const pools: MonitoredPool[] = [];
  for (const p of rawPools) {
    const token0 = tokenById.get(p.token0_id);
    const token1 = tokenById.get(p.token1_id);
    const dexName = DEX_ID_MAP[p.dex_id] || `dex_${p.dex_id}`;

    if (!token0 || !token1) {
      logger.warn(`[EventDrivenInit] Skipping pool ${p.pool_address}: missing token (t0=${p.token0_id}, t1=${p.token1_id})`);
      continue;
    }

    // Convert fee from decimal (0.003) to bps (30)
    const feeBps = Math.round(p.fee * 10000);

    pools.push({
      address: p.pool_address,
      dex: dexName,
      token0: token0.address,
      token1: token1.address,
      fee: feeBps,
      // S63: dexType removed — warmup auto-probes on-chain
    });

    logger.info(
      `  [Pool] ${p.pool_address.substring(0, 14)}... | ${dexName} | ` +
      `${token0.symbol}/${token1.symbol} | fee=${feeBps}bps`
    );
  }

  return { pools, tokenDecimals };
}

// ============================================================
// Initialization
// ============================================================

export interface EventDrivenInitConfig {
  supabaseUrl: string;
  supabaseKey: string;
  chainId?: number;
  /** Start in dry-run mode (no real execution). Default: true (safe) */
  dryRun?: boolean;
  /** Minimum spread to detect opportunities (%). Default: 0.3 */
  minSpreadPercent?: number;
  /** Default borrow amount. Default: 10_000 USDC (10_000_000_000 in 6 decimals) */
  defaultBorrowAmount?: bigint;
  /** Verbose logging. Default: false */
  verbose?: boolean;
  /** RPC URL for PriceTracker warmup. If not provided, reads from env. */
  rpcUrl?: string;
}

/**
 * Initialize the event-driven monitoring pipeline.
 * 
 * @returns EventDrivenMonitor ready to start()
 */
export async function initializeEventDrivenMonitoring(
  config: EventDrivenInitConfig
): Promise<EventDrivenMonitor> {
  logger.info('[EventDrivenInit] Initializing event-driven monitoring...');

  // Load pools from Supabase
  const { pools, tokenDecimals } = await loadPoolsFromSupabase(
    config.supabaseUrl,
    config.supabaseKey,
    config.chainId ?? 8453
  );

  if (pools.length === 0) {
    throw new Error('[EventDrivenInit] No active pools found in Supabase');
  }

  // Create monitor
  const monitor = new EventDrivenMonitor({
    tokenDecimals,
    minSpreadPercent: config.minSpreadPercent ?? 0.3,
    minExecuteSpread: config.minSpreadPercent ?? 0.1, // S61: Execute threshold matches detect threshold
    executionEnabled: !(config.dryRun ?? true), // Default dry-run
    defaultBorrowAmount: config.defaultBorrowAmount ?? 10_000_000_000n,
    verbose: config.verbose ?? false,
    rpcUrl: config.rpcUrl, // S57: Pass RPC URL for PriceTracker warmup
  });

  // Set pools
  monitor.setPools(pools);

  logger.info(`[EventDrivenInit] ✅ Event-driven monitor configured: ${pools.length} pools, ` +
    `execution=${config.dryRun === false ? 'LIVE' : 'DRY-RUN'}`);

  return monitor;
}

/**
 * Shutdown event-driven monitoring.
 */
export function shutdownEventDrivenMonitoring(monitor: EventDrivenMonitor): void {
  monitor.stop();
  logger.info('[EventDrivenInit] Event-driven monitoring shut down');
}
