/**
 * EventDrivenMonitor — Wires SwapEventMonitor → PriceTracker → OpportunityPipeline → Orchestrator
 * 
 * Phase 4: Sub-second WebSocket monitoring integration layer.
 * 
 * This is the top-level coordinator that:
 * 1. Creates and configures SwapEventMonitor, PriceTracker, OpportunityPipeline
 * 2. Wires their event chains together
 * 3. Connects to the IntegratedArbitrageOrchestrator for execution
 * 4. Provides unified start/stop/stats interface
 * 5. Loads pool configuration from Supabase
 * 
 * Usage (from main.ts):
 *   const monitor = new EventDrivenMonitor(config, orchestrator);
 *   await monitor.loadPoolsFromSupabase(supabaseClient);
 *   await monitor.start();
 */

import { ProviderPool } from '../infrastructure/ProviderPool';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { SwapEventMonitor, MonitoredPool, createMonitorConfigFromEnv } from './SwapEventMonitor';
import { PriceTracker, PriceTrackerConfig, OpportunitySignal } from './PriceTracker';
import { OpportunityPipeline, OpportunityPipelineConfig, ExecutionRequest } from './OpportunityPipeline';
import { UniversalSwapPath } from '../execution/FlashSwapV3Executor';

// ============================================================
// Types
// ============================================================

/** EventDrivenMonitor configuration */
export interface EventDrivenMonitorConfig {
  /** Minimum spread to detect (PriceTracker). Default: 0.3% */
  minSpreadPercent?: number;
  /** Minimum spread to execute (Pipeline, higher bar). Default: 0.2% */
  minExecuteSpread?: number;
  /** Maximum price age for opportunity detection (ms). Default: 30000 */
  maxPriceAge?: number;
  /** Maximum price age for execution (ms, stricter). Default: 5000 */
  maxExecutePriceAge?: number;
  /** Opportunity cooldown per pair (ms). Default: 2000 */
  opportunityCooldown?: number;
  /** Execution cooldown per pair (ms). Default: 10000 */
  executionCooldown?: number;
  /** Default borrow amount. Default: 10_000_000_000 (10k USDC) */
  defaultBorrowAmount?: bigint;
  /** Slippage tolerance. Default: 0.001 (0.1%) */
  slippageTolerance?: number;
  /** Minimum profit in borrow token units. Default: 1_000_000 (1 USDC) */
  minProfitAmount?: bigint;
  /** Enable execution (false = dry-run monitoring only). Default: false (safe start) */
  executionEnabled?: boolean;
  /** Token decimals map. Required. */
  tokenDecimals: Map<string, number>;
  /** Verbose logging. Default: false */
  verbose?: boolean;
  /** RPC URL for PriceTracker warmup (slot0 queries). Required for instant readiness. */
  rpcUrl?: string;
}

/** Unified stats */
export interface EventDrivenStats {
  monitor: {
    isConnected: boolean;
    eventsReceived: number;
    reconnections: number;
    uptime: number;
    poolCount: number;
  };
  priceTracker: {
    totalSwapsProcessed: number;
    totalOpportunities: number;
    trackedPools: number;
    trackedPairs: number;
  };
  pipeline: {
    totalReceived: number;
    totalValidated: number;
    totalRejected: number;
    totalExecuted: number;
    activeExecutions: number;
    rejectionReasons: Record<string, number>;
  };
}

// ============================================================
// EventDrivenMonitor
// ============================================================

export class EventDrivenMonitor extends EventEmitter {
  private swapMonitor: SwapEventMonitor | null = null;
  private priceTracker: PriceTracker;
  private pipeline: OpportunityPipeline;
  private pools: MonitoredPool[] = [];
  private config: EventDrivenMonitorConfig;
  private isRunning = false;

  /** Callback for execution — set by the orchestrator */
  private executeCallback?: (request: ExecutionRequest) => Promise<void>;

  constructor(config: EventDrivenMonitorConfig) {
    super();
    this.config = config;

    // Initialize PriceTracker
    // S68: Resolve rpcUrl early so PriceTracker can use forceRefreshPrice in onSwap
    const resolvedRpcUrl = config.rpcUrl || process.env.BASE_RPC_URL || process.env.CHAINSTACK_HTTPS || process.env.RPC_URL || '';
    
    this.priceTracker = new PriceTracker({
      minSpreadPercent: config.minSpreadPercent ?? 0.3,
      maxPriceAge: config.maxPriceAge ?? 30000,
      tokenDecimals: config.tokenDecimals,
      opportunityCooldown: config.opportunityCooldown ?? 2000,
      verboseLogging: config.verbose ?? false,
      rpcUrl: resolvedRpcUrl, // S68: Enable "Retry on Zero" forceRefreshPrice in onSwap
    });

    // Initialize OpportunityPipeline
    this.pipeline = new OpportunityPipeline({
      minSpreadPercent: config.minExecuteSpread ?? 0.2,
      maxPriceAge: config.maxExecutePriceAge ?? parseInt(process.env.PIPELINE_MAX_PRICE_AGE || '30000', 10), // S54: was 5000 hardcoded — killed all opportunities
      defaultBorrowAmount: config.defaultBorrowAmount ?? 10_000_000_000n,
      slippageTolerance: config.slippageTolerance ?? parseFloat(process.env.PIPELINE_SLIPPAGE_TOLERANCE || '0.0005'), // S71: Read from env var, default 0.05%. Was 0.001 (hardcoded override)
      minProfitAmount: config.minProfitAmount ?? 1_000_000n,
      executionCooldown: config.executionCooldown ?? 10_000,
      executionEnabled: config.executionEnabled ?? false, // Safe default
    });

    // Wire events
    this.wireEvents();
  }

  // ============================================================
  // Event Wiring
  // ============================================================

  private wireEvents(): void {
    // PriceTracker → Pipeline
    this.priceTracker.on('opportunity', (signal: OpportunitySignal) => {
      this.pipeline.onOpportunity(signal);
      this.emit('opportunity', signal);
    });

    // Pipeline → Execute
    this.pipeline.on('execute', async (request: ExecutionRequest) => {
      this.emit('execute', request);
      
      if (this.executeCallback) {
        try {
          // S50 FIX: Check return value instead of assuming success.
          // The executor catches UserOp reverts internally and returns {success: false}
          // instead of throwing. Without this check, Pipeline always logs "succeeded".
          const result = await this.executeCallback(request);
          const success = result?.success ?? false;
          this.pipeline.onExecutionComplete(request.id, success);
          if (!success) {
            logger.warn(`[EventDrivenMonitor] Execution returned success=false for ${request.id}`);
          }
        } catch (err: any) {
          logger.error(`[EventDrivenMonitor] Execution threw: ${err.message}`);
          this.pipeline.onExecutionComplete(request.id, false);
        }
      } else {
        logger.warn('[EventDrivenMonitor] No execute callback set — opportunity not executed');
        this.pipeline.onExecutionComplete(request.id, false);
      }
    });

    // Pipeline dry-run events
    this.pipeline.on('dry-run', (request: ExecutionRequest) => {
      this.emit('dry-run', request);
    });

    // Price updates (for dashboard/logging)
    this.priceTracker.on('price-update', (state: any) => {
      this.emit('price-update', state);
    });
  }

  // ============================================================
  // Pool Management
  // ============================================================

  /**
   * Set pools to monitor. Can be called before start().
   */
  setPools(pools: MonitoredPool[]): void {
    this.pools = pools;
    this.priceTracker.registerPools(pools);
    logger.info(`[EventDrivenMonitor] Configured ${pools.length} pools`);
  }

  /**
   * Load pools from Supabase warden_pools + warden_tokens tables.
   * Uses EventDrivenInitializer for proper FK resolution.
   * @deprecated Use EventDrivenInitializer.loadPoolsFromSupabase() instead
   */
  async loadPoolsFromSupabase(supabaseUrl: string, supabaseKey: string): Promise<void> {
    // Delegate to the initializer which handles FK resolution
    const { loadPoolsFromSupabase: loadPools } = await import('./EventDrivenInitializer');
    const { pools, tokenDecimals } = await loadPools(supabaseUrl, supabaseKey);
    
    // Update token decimals in config
    for (const [addr, decimals] of tokenDecimals) {
      this.config.tokenDecimals.set(addr, decimals);
    }
    
    this.setPools(pools);
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  /**
   * Start the event-driven monitoring pipeline.
   * Connects to WebSocket and begins processing swap events.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[EventDrivenMonitor] Already running');
      return;
    }

    if (this.pools.length === 0) {
      throw new Error('[EventDrivenMonitor] No pools configured. Call setPools() or loadPoolsFromSupabase() first.');
    }

    logger.info('[EventDrivenMonitor] Starting event-driven monitoring pipeline...');
    logger.info(`  Pools: ${this.pools.length}`);
    logger.info(`  Min spread (detect): ${this.config.minSpreadPercent ?? 0.3}%`);
    logger.info(`  Min spread (execute): ${this.config.minExecuteSpread ?? 0.2}%`);
    logger.info(`  Execution: ${this.config.executionEnabled ? 'ENABLED' : 'DRY-RUN'}`);

    // S57: PriceTracker warmup — seed prices from on-chain slot0() before WSS starts
    // Eliminates 7-8 minute dead time after restart (prices go stale → maxPriceAge kills opportunities)
    const rpcUrl = this.config.rpcUrl || process.env.BASE_RPC_URL || process.env.CHAINSTACK_HTTPS_ENDPOINT || process.env.RPC_URL || '';
    if (rpcUrl) {
      try {
        // S73: ProviderPool for parallel warmup across multiple endpoints
        const pool = new ProviderPool();
        await this.priceTracker.warmup(rpcUrl, pool);
        pool.logStats();
        logger.info('[EventDrivenMonitor] ♨️ PriceTracker warmup complete — prices seeded');
      } catch (err: any) {
        logger.warn(`[EventDrivenMonitor] ♨️ Warmup failed (non-fatal): ${err.message}`);
        // Non-fatal: prices will populate naturally from swap events (7-8 min delay)
      }
    } else {
      logger.warn('[EventDrivenMonitor] No RPC URL for warmup — prices will populate from swap events (7-8 min delay)');
    }

    // Create SwapEventMonitor
    const monitorConfig = createMonitorConfigFromEnv(this.pools);
    this.swapMonitor = new SwapEventMonitor(monitorConfig);

    // Wire SwapEventMonitor → PriceTracker
    this.swapMonitor.on('swap', (event) => {
      this.priceTracker.onSwap(event);
    });

    // Handle fatal errors
    this.swapMonitor.on('fatal', (error: Error) => {
      logger.error(`[EventDrivenMonitor] Fatal monitor error: ${error.message}`);
      this.emit('fatal', error);
    });

    // Start monitoring
    await this.swapMonitor.start();
    this.isRunning = true;

    logger.info('[EventDrivenMonitor] ✅ Pipeline active — listening for swap events');
  }

  /**
   * Stop the monitoring pipeline.
   */
  stop(): void {
    if (!this.isRunning) return;

    logger.info('[EventDrivenMonitor] Stopping...');
    this.swapMonitor?.stop();
    this.isRunning = false;
    logger.info('[EventDrivenMonitor] Stopped');
  }

  // ============================================================
  // Execution Integration
  // ============================================================

  /**
   * Set the callback that will be invoked when the pipeline wants to execute.
   * This is how the orchestrator receives execution requests.
   * 
   * @param callback - async function that receives ExecutionRequest
   */
  setExecuteCallback(callback: (request: ExecutionRequest) => Promise<void>): void {
    this.executeCallback = callback;
    logger.info('[EventDrivenMonitor] Execute callback registered');
  }

  /**
   * Enable/disable live execution (toggle dry-run mode)
   */
  setExecutionEnabled(enabled: boolean): void {
    this.pipeline.setExecutionEnabled(enabled);
  }

  // ============================================================
  // Stats & Status
  // ============================================================

  getStats(): EventDrivenStats {
    const monitorStats = this.swapMonitor?.getStats();
    const trackerStats = this.priceTracker.getStats();
    const pipelineStats = this.pipeline.getStats();

    return {
      monitor: {
        isConnected: monitorStats?.isConnected ?? false,
        eventsReceived: monitorStats?.eventsReceived ?? 0,
        reconnections: monitorStats?.reconnections ?? 0,
        uptime: monitorStats?.uptime ?? 0,
        poolCount: monitorStats?.poolCount ?? 0,
      },
      priceTracker: {
        totalSwapsProcessed: trackerStats.totalSwapsProcessed,
        totalOpportunities: trackerStats.totalOpportunities,
        trackedPools: trackerStats.trackedPools,
        trackedPairs: trackerStats.trackedPairs,
      },
      pipeline: {
        totalReceived: pipelineStats.totalReceived,
        totalValidated: pipelineStats.totalValidated,
        totalRejected: pipelineStats.totalRejected,
        totalExecuted: pipelineStats.totalExecuted,
        activeExecutions: pipelineStats.activeExecutions,
        rejectionReasons: pipelineStats.rejectionReasons,
      },
    };
  }

  /** Quick health check */
  isHealthy(): boolean {
    return this.isRunning && (this.swapMonitor?.getStats().isConnected ?? false);
  }

  /** Get the PriceTracker instance (for external queries) */
  getPriceTracker(): PriceTracker {
    return this.priceTracker;
  }

  /** Get the OpportunityPipeline instance */
  getPipeline(): OpportunityPipeline {
    return this.pipeline;
  }
}
