/**
 * OpportunityPipeline — Validates opportunities and triggers V3 execution
 * 
 * Phase 4: Sub-second opportunity detection → execution.
 * 
 * Receives OpportunitySignal from PriceTracker, validates profitability
 * (accounting for gas costs, flash loan fees, slippage), constructs the
 * UniversalSwapPath for FlashSwapV3, and triggers execution.
 * 
 * Architecture:
 *   PriceTracker emits 'opportunity' → OpportunityPipeline.onOpportunity()
 *     → Validate: gas cost vs expected profit
 *     → Validate: slippage tolerance
 *     → Validate: minimum profit threshold
 *     → Construct UniversalSwapPath (buy pool → sell pool)
 *     → Emit 'execute' with full execution params
 * 
 * Safety Features:
 *   - Rate limiter per pair (configurable cooldown)
 *   - Global execution lock (one opportunity at a time)
 *   - Max concurrent executions limit
 *   - Stale opportunity rejection
 *   - Min liquidity check
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { OpportunitySignal, PoolPriceState } from './PriceTracker';
import { DexType, SwapStep, UniversalSwapPath } from '../execution/FlashSwapV3Executor';

// ============================================================
// Types
// ============================================================

/** DEX name → DexType enum mapping */
const DEX_TYPE_MAP: Record<string, DexType> = {
  'uniswap_v3': DexType.UNISWAP_V3,
  'sushiswap': DexType.SUSHISWAP,
  'sushiswap_v3': DexType.SUSHISWAP,
  'dodo': DexType.DODO,
  'aerodrome': DexType.AERODROME,
  'aerodrome_cl': DexType.AERODROME,
  'balancer': DexType.BALANCER,
  'curve': DexType.CURVE,
  'uniswap_v4': DexType.UNISWAP_V4,
};

/** Execution request emitted to the orchestrator */
export interface ExecutionRequest {
  /** Unique ID for this execution attempt */
  id: string;
  /** The opportunity signal that triggered this */
  signal: OpportunitySignal;
  /** Token to borrow via flash loan */
  borrowToken: string;
  /** Amount to borrow (in token's smallest unit) */
  borrowAmount: bigint;
  /** Constructed swap path for FlashSwapV3 */
  swapPath: UniversalSwapPath;
  /** Estimated net profit (after gas + fees) */
  estimatedNetProfit: bigint;
  /** Estimated gas cost in ETH (wei) */
  estimatedGasCost: bigint;
  /** Flash loan fee estimate */
  flashLoanFee: bigint;
  /** Timestamp of request creation */
  createdAt: number;
}

/** Pipeline configuration */
export interface OpportunityPipelineConfig {
  /** Minimum profit in borrow token units after all costs. Default: 1_000_000 (1 USDC) */
  minProfitAmount?: bigint;
  /** Minimum spread % to proceed (additional filter on top of PriceTracker). Default: 0.2 */
  minSpreadPercent?: number;
  /** Default borrow amount in borrow token units. Default: 10_000_000_000 (10,000 USDC) */
  defaultBorrowAmount?: bigint;
  /** Slippage tolerance as decimal (e.g., 0.005 = 0.5%). Default: 0.005 */
  slippageTolerance?: number;
  /** Maximum price age (ms) to accept. Default: 5000 (5s) */
  maxPriceAge?: number;
  /** Estimated gas per swap step (in gas units). Default: 200_000 */
  gasPerStep?: number;
  /** Gas price in wei. Updated dynamically. Default: 50_000_000 (0.05 gwei on Base) */
  gasPriceWei?: bigint;
  /** Maximum concurrent executions. Default: 1 */
  maxConcurrent?: number;
  /** Cooldown per pair after execution attempt (ms). Default: 10_000 */
  executionCooldown?: number;
  /** Minimum liquidity in the pool (sqrtPriceX96 > 0 and liquidity > threshold). Default: 0 */
  minLiquidity?: bigint;
  /** Whether execution is enabled (set false for dry-run / monitoring only). Default: true */
  executionEnabled?: boolean;
}

/** Pipeline statistics */
export interface PipelineStats {
  totalReceived: number;
  totalValidated: number;
  totalRejected: number;
  totalExecuted: number;
  rejectionReasons: Record<string, number>;
  activeExecutions: number;
  lastExecutionAt: number | null;
}

// ============================================================
// OpportunityPipeline
// ============================================================

export class OpportunityPipeline extends EventEmitter {
  private config: Required<OpportunityPipelineConfig>;
  
  /** Active execution count */
  private activeExecutions = 0;
  
  /** Execution cooldowns: pairKey → last attempt timestamp */
  private executionCooldowns: Map<string, number> = new Map();
  
  /** Execution counter for unique IDs */
  private executionCounter = 0;
  
  /** Stats */
  private stats: PipelineStats = {
    totalReceived: 0,
    totalValidated: 0,
    totalRejected: 0,
    totalExecuted: 0,
    rejectionReasons: {},
    activeExecutions: 0,
    lastExecutionAt: null,
  };

  constructor(config?: Partial<OpportunityPipelineConfig>) {
    super();
    this.config = {
      // S46: Read from env var, lower default for gasless mode (0.10 USDC → 100_000)
      minProfitAmount: config?.minProfitAmount ?? BigInt(process.env.PIPELINE_MIN_PROFIT || (process.env.GASLESS_MODE === 'true' ? '100000' : '1000000')),
      minSpreadPercent: config?.minSpreadPercent ?? 0.2,
      defaultBorrowAmount: config?.defaultBorrowAmount ?? 10_000_000_000n, // 10,000 USDC
      slippageTolerance: config?.slippageTolerance ?? 0.001, // S48: 0.1% (was 0.5%, too aggressive for sub-1% spreads)
      maxPriceAge: config?.maxPriceAge ?? 5000,
      gasPerStep: config?.gasPerStep ?? 200_000,
      gasPriceWei: config?.gasPriceWei ?? 50_000_000n, // 0.05 gwei (Base L2)
      maxConcurrent: config?.maxConcurrent ?? 1,
      executionCooldown: config?.executionCooldown ?? 10_000,
      minLiquidity: config?.minLiquidity ?? 0n,
      executionEnabled: config?.executionEnabled ?? true,
    };
  }

  // ============================================================
  // Opportunity Processing
  // ============================================================

  /**
   * Process an opportunity signal from PriceTracker.
   * Validates, constructs swap path, and emits execution request.
   */
  onOpportunity(signal: OpportunitySignal): void {
    this.stats.totalReceived++;
    
    const rejectReason = this.validate(signal);
    if (rejectReason) {
      this.reject(rejectReason);
      return;
    }
    
    // Construct execution request
    const request = this.buildExecutionRequest(signal);
    if (!request) {
      this.reject('BUILD_FAILED');
      return;
    }
    
    // Final profit check
    if (request.estimatedNetProfit < this.config.minProfitAmount) {
      this.reject('PROFIT_BELOW_THRESHOLD');
      logger.info(
        `[Pipeline] Rejected: profit ${request.estimatedNetProfit.toString()} < ` +
        `min ${this.config.minProfitAmount.toString()}`
      );
      return;
    }
    
    this.stats.totalValidated++;
    
    if (!this.config.executionEnabled) {
      logger.info(
        `[Pipeline] 📊 DRY RUN: ${signal.pairKey} spread=${signal.spreadPercent.toFixed(4)}% ` +
        `est_profit=${request.estimatedNetProfit.toString()} borrow=${request.borrowAmount.toString()}`
      );
      this.emit('dry-run', request);
      return;
    }
    
    // Mark execution active
    this.activeExecutions++;
    this.stats.activeExecutions = this.activeExecutions;
    this.executionCooldowns.set(signal.pairKey, Date.now());
    
    logger.info(
      `[Pipeline] 🚀 EXECUTE: ${signal.pairKey} spread=${signal.spreadPercent.toFixed(4)}% ` +
      `borrow=${request.borrowAmount.toString()} est_profit=${request.estimatedNetProfit.toString()}`
    );
    
    this.stats.totalExecuted++;
    this.stats.lastExecutionAt = Date.now();
    
    // Emit execution request — the orchestrator will pick this up
    this.emit('execute', request);
  }

  /**
   * Called when an execution completes (success or failure).
   * Releases the execution slot.
   */
  onExecutionComplete(requestId: string, success: boolean): void {
    this.activeExecutions = Math.max(0, this.activeExecutions - 1);
    this.stats.activeExecutions = this.activeExecutions;
    
    if (success) {
      logger.info(`[Pipeline] ✅ Execution ${requestId} succeeded`);
    } else {
      logger.warn(`[Pipeline] ❌ Execution ${requestId} failed`);
    }
  }

  // ============================================================
  // Validation
  // ============================================================

  private validate(signal: OpportunitySignal): string | null {
    const now = Date.now();
    
    // 1. Spread check
    if (signal.spreadPercent < this.config.minSpreadPercent) {
      return 'SPREAD_TOO_LOW';
    }
    
    // 2. Price freshness
    if (signal.maxPriceAge > this.config.maxPriceAge) {
      return 'STALE_PRICE';
    }
    
    // 3. Concurrent execution limit
    if (this.activeExecutions >= this.config.maxConcurrent) {
      return 'MAX_CONCURRENT';
    }
    
    // 4. Pair cooldown
    const lastExec = this.executionCooldowns.get(signal.pairKey) ?? 0;
    if (now - lastExec < this.config.executionCooldown) {
      return 'COOLDOWN';
    }
    
    // 5. Liquidity check
    if (this.config.minLiquidity > 0n) {
      if (signal.buyPool.liquidity < this.config.minLiquidity || 
          signal.sellPool.liquidity < this.config.minLiquidity) {
        return 'LOW_LIQUIDITY';
      }
    }
    
    // 6. Sanity: prices must be positive
    if (signal.buyPool.price <= 0 || signal.sellPool.price <= 0) {
      return 'INVALID_PRICE';
    }
    
    return null; // Valid
  }

  private reject(reason: string): void {
    this.stats.totalRejected++;
    this.stats.rejectionReasons[reason] = (this.stats.rejectionReasons[reason] ?? 0) + 1;
  }

  // ============================================================
  // Swap Path Construction
  // ============================================================

  /**
   * Build the execution request with UniversalSwapPath.
   * 
   * Strategy: 2-hop arbitrage
   *   Step 1: Buy tokenB on buyPool (low price) — swap tokenA → tokenB
   *   Step 2: Sell tokenB on sellPool (high price) — swap tokenB → tokenA
   * 
   * We borrow tokenA via flash loan, execute the 2 swaps, repay loan + fees.
   */
  private buildExecutionRequest(signal: OpportunitySignal): ExecutionRequest | null {
    try {
      const { buyPool, sellPool } = signal;
      const borrowToken = buyPool.token0; // Borrow token0
      
      // S48: Dynamic borrow amount based on token decimals + pool liquidity
      // The old flat 10B (10,000 USDC) was wrong for non-6-decimal tokens:
      //   WETH (18 dec): 10B wei = 0.00000001 ETH → dust profit
      //   USDC (6 dec):  10B = 10,000 USDC → reasonable
      const token0Decimals = buyPool.token0Decimals;
      
      // Target borrow: ~$5,000 worth of token0
      // For stablecoins (6 dec): 5000 * 10^6 = 5,000,000,000
      // For WETH (18 dec): ~2.2 ETH at $2280 = 2.2 * 10^18 ≈ 2,200,000,000,000,000,000
      // For other tokens: scale by decimals, use price to approximate
      let borrowAmount: bigint;
      
      if (token0Decimals <= 8) {
        // Stablecoin-like (USDC=6, USDT=6, WBTC=8)
        borrowAmount = BigInt(5000) * BigInt(10 ** token0Decimals);
      } else {
        // ETH-like tokens (18 decimals)
        // Use the pool price to estimate: if price = token1/token0,
        // and token1 is a stablecoin, then 1 token0 = price USD
        // We want ~$5000 worth: borrowAmount = 5000 / price * 10^decimals
        const pricePerToken0 = sellPool.price > 0 ? sellPool.price : buyPool.price;
        if (pricePerToken0 > 0) {
          const tokensNeeded = 5000 / pricePerToken0; // how many token0 for $5000
          borrowAmount = BigInt(Math.floor(tokensNeeded * (10 ** token0Decimals)));
        } else {
          // Fallback: 1 token0
          borrowAmount = BigInt(10 ** token0Decimals);
        }
      }
      
      // Cap at 2% of the smaller pool's liquidity to limit price impact
      const minLiquidity = buyPool.liquidity < sellPool.liquidity ? buyPool.liquidity : sellPool.liquidity;
      if (minLiquidity > 0n && borrowAmount > minLiquidity / 50n) {
        borrowAmount = minLiquidity / 50n; // 2% of liquidity
        logger.info(`[Pipeline] Borrow capped to 2% of pool liquidity: ${borrowAmount.toString()}`);
      }
      
      // Floor: minimum 1 token unit
      if (borrowAmount <= 0n) borrowAmount = BigInt(10 ** token0Decimals);
      
      // S48 FIX: Correct swap direction for arbitrage profit
      // Strategy: Sell token0 at HIGH-price pool (sellPool) first → get MORE token1
      //           Buy token0 at LOW-price pool (buyPool) second → spend LESS token1
      // Previous code was INVERTED: swapped at low first, high second → guaranteed loss
      
      // Step 1: Swap token0→token1 at sellPool (HIGHER price = more token1 per token0)
      const step1PriceRatio = sellPool.price; // token1 per token0 (HIGHER)
      const rawStep1Output = Number(borrowAmount) * step1PriceRatio;
      
      // Apply slippage to step 1 output
      const step1OutputWithSlippage = rawStep1Output * (1 - this.config.slippageTolerance);
      const step1MinOut = BigInt(Math.floor(step1OutputWithSlippage));
      
      // Step 2: Swap token1→token0 at buyPool (LOWER price = higher inversePrice = more token0 per token1)
      const step2PriceRatio = buyPool.inversePrice; // token0 per token1 (HIGHER because price is lower)
      const rawStep2Output = step1OutputWithSlippage * step2PriceRatio;
      
      // Apply slippage to step 2 output
      const step2OutputWithSlippage = rawStep2Output * (1 - this.config.slippageTolerance);
      const step2MinOut = BigInt(Math.floor(step2OutputWithSlippage));
      
      // Build swap steps — CORRECTED DIRECTION
      const buyDexType = DEX_TYPE_MAP[buyPool.dex] ?? DexType.UNISWAP_V3;
      const sellDexType = DEX_TYPE_MAP[sellPool.dex] ?? DexType.UNISWAP_V3;
      
      const steps: SwapStep[] = [
        {
          // S48: Step 1 — Sell token0 at HIGH-price pool (get more token1)
          pool: sellPool.pool,
          tokenIn: sellPool.token0,
          tokenOut: sellPool.token1,
          fee: sellPool.fee,
          minOut: step1MinOut,
          dexType: sellDexType,
          router: '0x0000000000000000000000000000000000000000',
          useDeadline: false,
        },
        {
          // S48: Step 2 — Buy token0 at LOW-price pool (spend less token1)
          pool: buyPool.pool,
          tokenIn: buyPool.token1,
          tokenOut: buyPool.token0,
          fee: buyPool.fee,
          minOut: step2MinOut,
          dexType: buyDexType,
          router: '0x0000000000000000000000000000000000000000',
          useDeadline: false,
        },
      ];
      
      // Min final amount = enough to repay flash loan
      // Balancer has 0% fee, so minFinalAmount = borrowAmount
      const minFinalAmount = borrowAmount;
      
      const swapPath: UniversalSwapPath = {
        steps,
        borrowAmount,
        minFinalAmount,
      };
      
      // Estimate costs
      const totalGasUnits = BigInt(this.config.gasPerStep * steps.length);
      const estimatedGasCost = totalGasUnits * this.config.gasPriceWei;
      const flashLoanFee = 0n; // Balancer = 0% fee
      
      // S48: Estimate profit from corrected direction
      // step2MinOut = token0 received after round trip. Profit = received - borrowed.
      const grossProfit = step2MinOut > borrowAmount ? step2MinOut - borrowAmount : 0n;
      const estimatedNetProfit = grossProfit; // Gas is paid by paymaster ($0.00)
      
      // S48 DEBUG: Trace profit calculation
      logger.info(`[Pipeline-DEBUG] Pair: ${signal.pairKey}`);
      logger.info(`[Pipeline-DEBUG] borrowToken=${borrowToken} borrowAmount=${borrowAmount.toString()}`);
      logger.info(`[Pipeline-DEBUG] Step1: sellPool.price=${sellPool.price} rawStep1=${rawStep1Output.toFixed(0)} afterSlip=${step1OutputWithSlippage.toFixed(0)} minOut=${step1MinOut.toString()}`);
      logger.info(`[Pipeline-DEBUG] Step2: buyPool.inversePrice=${buyPool.inversePrice} rawStep2=${rawStep2Output.toFixed(0)} afterSlip=${step2OutputWithSlippage.toFixed(0)} minOut=${step2MinOut.toString()}`);
      logger.info(`[Pipeline-DEBUG] grossProfit=${grossProfit.toString()} netProfit=${estimatedNetProfit.toString()} minRequired=${this.config.minProfitAmount.toString()}`);
      
      const id = `opp_${++this.executionCounter}_${Date.now()}`;
      
      return {
        id,
        signal,
        borrowToken,
        borrowAmount,
        swapPath,
        estimatedNetProfit,
        estimatedGasCost,
        flashLoanFee,
        createdAt: Date.now(),
      };
    } catch (err: any) {
      logger.error(`[Pipeline] Failed to build execution request: ${err.message}`);
      return null;
    }
  }

  // ============================================================
  // Dynamic Config Updates
  // ============================================================

  /** Update gas price (call from gas oracle) */
  updateGasPrice(gasPriceWei: bigint): void {
    this.config.gasPriceWei = gasPriceWei;
  }

  /** Update borrow amount */
  setBorrowAmount(amount: bigint): void {
    this.config.defaultBorrowAmount = amount;
  }

  /** Enable/disable execution */
  setExecutionEnabled(enabled: boolean): void {
    this.config.executionEnabled = enabled;
    logger.info(`[Pipeline] Execution ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  // ============================================================
  // Public API
  // ============================================================

  /** Get statistics */
  getStats(): PipelineStats {
    return { ...this.stats };
  }

  /** Check if pipeline is ready to accept opportunities */
  isReady(): boolean {
    return this.activeExecutions < this.config.maxConcurrent;
  }
}
