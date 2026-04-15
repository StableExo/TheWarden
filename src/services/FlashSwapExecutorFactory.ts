/**
 * FlashSwapExecutorFactory - Unified interface for FlashSwapV2 and FlashSwapV3
 * 
 * Phase 3 Update:
 * - V3 executor now receives Smart Wallet config (privateKey, cdpPaymasterUrl, rpcUrl)
 * - Default enableV3=true, v3RolloutPercent=100 (V3 is the production path)
 * - UserOp execution through Coinbase Smart Wallet for gasless txs
 */

import { Provider, Signer, parseUnits } from 'ethers';
import { logger } from '../utils/logger';
import { ArbitrageOpportunity } from '../arbitrage/models/ArbitrageOpportunity';
import { FlashSwapV3Executor, FlashLoanSource, DexType, SwapStep as V3SwapStep } from '../execution/FlashSwapV3Executor';
import { FlashLoanExecutor, SwapStep as V2SwapStep, FlashLoanArbitrageParams } from './FlashLoanExecutor';

/**
 * Unified executor configuration
 */
export interface FlashSwapExecutorConfig {
  // V2 Configuration
  flashSwapV2Address?: string;
  aavePoolAddress?: string;
  
  // V3 Configuration
  flashSwapV3Address?: string;
  
  // Shared
  provider: Provider;
  signer: Signer;
  chainId: number;
  
  // Feature flags
  enableV3?: boolean;
  v3RolloutPercent?: number;
  v3SourceStrategy?: 'auto' | 'balancer' | 'aave' | 'hybrid';
  
  // Gas and slippage
  gasBuffer?: number;
  defaultSlippage?: number;

  // Phase 3: Smart Wallet / UserOp config
  privateKey?: string;       // EOA private key for signing UserOps
  cdpPaymasterUrl?: string;  // CDP Paymaster + Bundler URL
  rpcUrl?: string;           // Base RPC URL for viem
}

/**
 * Unified execution result
 */
export interface UnifiedExecutionResult {
  success: boolean;
  txHash?: string;
  userOpHash?: string;
  profit?: string;
  netProfit?: bigint;
  gasUsed?: bigint;
  version: 'V2' | 'V3';
  source?: FlashLoanSource;
  error?: string;
  executionMethod?: 'userop' | 'direct';
}

interface IFlashSwapExecutor {
  execute(params: any): Promise<any>;
  getVersion(): 'V2' | 'V3';
}

class V2ExecutorWrapper implements IFlashSwapExecutor {
  constructor(private executor: FlashLoanExecutor) {}
  
  async execute(params: FlashLoanArbitrageParams): Promise<UnifiedExecutionResult> {
    const result = await this.executor.execute(params);
    return {
      ...result,
      version: 'V2',
      netProfit: result.profit ? BigInt(result.profit) : undefined,
      executionMethod: 'direct',
    };
  }
  
  getVersion(): 'V2' { return 'V2'; }
}

class V3ExecutorWrapper implements IFlashSwapExecutor {
  constructor(private executor: FlashSwapV3Executor) {}
  
  async execute(opportunity: ArbitrageOpportunity): Promise<UnifiedExecutionResult> {
    const path = this.executor.constructSwapPath(opportunity);
    
    const borrowToken = opportunity.flashLoanToken || opportunity.tokenAddresses?.[0];
    if (!borrowToken) throw new Error('No borrow token found in opportunity');
    const borrowAmount = BigInt(Math.floor(opportunity.flashLoanAmount || opportunity.inputAmount));
    
    const result = await this.executor.executeArbitrage(borrowToken, borrowAmount, path);
    
    return {
      success: result.success,
      txHash: result.txHash,
      userOpHash: result.userOpHash,
      profit: result.netProfit?.toString(),
      netProfit: result.netProfit,
      gasUsed: result.gasUsed,
      version: 'V3',
      source: result.source,
      error: result.error,
      executionMethod: result.executionMethod,
    };
  }
  
  getVersion(): 'V3' { return 'V3'; }
}

/**
 * FlashSwapExecutorFactory - Creates appropriate executor version
 * 
 * Phase 3: V3 is now the default production executor with UserOp support.
 */
export class FlashSwapExecutorFactory {
  private config: FlashSwapExecutorConfig;
  private v2Executor?: FlashLoanExecutor;
  private v3Executor?: FlashSwapV3Executor;
  private rolloutRandom: () => number;
  
  constructor(config: FlashSwapExecutorConfig) {
    this.config = {
      enableV3: true,           // Phase 3: V3 enabled by default
      v3RolloutPercent: 100,    // Phase 3: 100% rollout
      v3SourceStrategy: 'auto',
      gasBuffer: 1.2,
      defaultSlippage: 0.01,
      ...config,
    };
    
    this.initializeExecutors();
    this.rolloutRandom = () => Math.random() * 100;
  }
  
  private initializeExecutors(): void {
    // Initialize V2 if address provided
    if (this.config.flashSwapV2Address && this.config.aavePoolAddress) {
      try {
        this.v2Executor = new FlashLoanExecutor({
          flashSwapAddress: this.config.flashSwapV2Address,
          aavePoolAddress: this.config.aavePoolAddress,
          provider: this.config.provider,
          signer: this.config.signer,
        });
        logger.info(`V2 executor initialized: ${this.config.flashSwapV2Address}`);
      } catch (error) {
        logger.warn(`Failed to initialize V2 executor: ${error}`);
      }
    }
    
    // Initialize V3 if address provided
    if (this.config.flashSwapV3Address) {
      try {
        this.v3Executor = new FlashSwapV3Executor({
          contractAddress: this.config.flashSwapV3Address,
          provider: this.config.provider,
          signer: this.config.signer,
          gasBuffer: this.config.gasBuffer,
          defaultSlippage: this.config.defaultSlippage,
          chainId: this.config.chainId,
          // Phase 3: Pass Smart Wallet config for UserOp execution
          privateKey: this.config.privateKey,
          cdpPaymasterUrl: this.config.cdpPaymasterUrl,
          rpcUrl: this.config.rpcUrl,
        });
        
        const mode = this.v3Executor.userOpEnabled ? 'UserOp (gasless)' : 'direct tx';
        logger.info(`V3 executor initialized: ${this.config.flashSwapV3Address} [${mode}]`);
      } catch (error) {
        logger.warn(`Failed to initialize V3 executor: ${error}`);
      }
    }
  }
  
  createExecutor(opportunity?: ArbitrageOpportunity): IFlashSwapExecutor {
    if (this.config.enableV3 && this.v3Executor) {
      const rolloutCheck = this.rolloutRandom();
      if (rolloutCheck <= (this.config.v3RolloutPercent || 100)) {
        return new V3ExecutorWrapper(this.v3Executor);
      }
    }
    
    if (this.v2Executor) {
      return new V2ExecutorWrapper(this.v2Executor);
    }
    
    if (this.v3Executor) {
      return new V3ExecutorWrapper(this.v3Executor);
    }
    
    throw new Error('No executor available. Provide flashSwapV2Address or flashSwapV3Address.');
  }

  /** Get the raw V3 executor for direct access */
  getV3Executor(): FlashSwapV3Executor | undefined {
    return this.v3Executor;
  }

  /** Get executor version stats */
  getStats(): { v2Available: boolean; v3Available: boolean; v3UserOp: boolean; rolloutPercent: number } {
    return {
      v2Available: !!this.v2Executor,
      v3Available: !!this.v3Executor,
      v3UserOp: this.v3Executor?.userOpEnabled || false,
      rolloutPercent: this.config.v3RolloutPercent || 0,
    };
  }
}
