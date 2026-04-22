/**
 * FlashSwapV3 Executor - TypeScript Integration Layer
 * 
 * Multi-source flash loan arbitrage execution with automatic source optimization.
 * Supports Balancer V2 (0%), dYdX (0%), Aave V3 (0.09%), and hybrid modes.
 * 
 * Phase 3 Update: UserOp execution via Coinbase Smart Wallet + CDP Paymaster
 * - All write operations routed through Smart Wallet (onlyOwner)
 * - Gas sponsored by CDP Paymaster ($0.00 per tx)
 * - Read operations still use ethers.js provider
 * 
 * Architecture:
 *   EOA (0x9358) signs UserOp
 *     → Smart Wallet (0x378252) owns contract
 *       → FlashSwapV3 (0x00558d) executeArbitrage
 *         → Balancer flash loan → DEX swaps → profit
 */

import { Contract, Provider, Signer, ethers, parseUnits, formatUnits } from 'ethers';
import { createPublicClient, http, encodeFunctionData, type Hex, type PublicClient } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { toCoinbaseSmartAccount, createBundlerClient } from 'viem/account-abstraction';
import { logger } from '../utils/logger';
import { ArbitrageOpportunity } from '../arbitrage/models';

/**
 * Flash loan source types
 */
export enum FlashLoanSource {
  BALANCER = 0,        // 0% fee - preferred for standalone
  DYDX = 1,            // 0% fee - ETH/USDC/DAI only, Ethereum only
  HYBRID_AAVE_V4 = 2,  // 0.09% Aave + 0% V4 swaps - best for large arbs
  AAVE = 3,            // 0.09% fee - universal fallback
  UNISWAP_V3 = 4,      // 0.05-1% fee - legacy support
}

/**
 * DEX type constants
 */
export enum DexType {
  UNISWAP_V3 = 0,
  SUSHISWAP = 1,
  DODO = 2,
  AERODROME = 3,
  BALANCER = 4,
  CURVE = 5,
  UNISWAP_V4 = 6,
}

/**
 * Swap step in arbitrage path
 */
export interface SwapStep {
  pool: string;
  tokenIn: string;
  tokenOut: string;
  fee: number;       // Fee tier (for Uniswap V3)
  minOut: bigint;    // Minimum output amount
  dexType: DexType;
  router: string;       // S45: Per-hop router address (address(0) = use contract default)
  useDeadline: boolean; // S45: true = V1 interface (PancakeSwap), false = V2 (Uniswap)
}

/**
 * Universal swap path structure
 */
export interface UniversalSwapPath {
  steps: SwapStep[];
  borrowAmount: bigint;
  minFinalAmount: bigint;
}

/**
 * Flash loan parameters
 */
export interface FlashLoanParams {
  source: FlashLoanSource;
  borrowToken: string;
  borrowAmount: bigint;
  path: UniversalSwapPath;
  initiator: string;
}

/**
 * Source selection result
 */
export interface SourceSelection {
  source: FlashLoanSource;
  fee: number;
  reason: string;
  estimatedCost: bigint;
}

/**
 * Execution configuration
 */
export interface FlashSwapV3Config {
  contractAddress: string;
  provider: Provider;
  signer?: Signer;
  gasBuffer?: number;
  defaultSlippage?: number;
  chainId?: number;

  // Smart Wallet / UserOp execution (Phase 3)
  privateKey?: string;       // EOA private key for signing UserOps
  cdpPaymasterUrl?: string;  // CDP Paymaster + Bundler URL
  rpcUrl?: string;           // Base RPC URL for viem public client
}

/**
 * Internal config with all required fields resolved
 */
interface ResolvedFlashSwapV3Config {
  contractAddress: string;
  provider: Provider;
  signer?: Signer;
  gasBuffer: number;
  defaultSlippage: number;
  chainId: number;
  privateKey?: string;
  cdpPaymasterUrl?: string;
  rpcUrl?: string;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  userOpHash?: string;
  receipt?: ethers.TransactionReceipt;
  source: FlashLoanSource;
  gasUsed?: bigint;
  gasPrice?: bigint;
  totalGasCost?: bigint;
  borrowAmount: bigint;
  feePaid: bigint;
  grossProfit: bigint;
  netProfit: bigint;
  titheAmount?: bigint;
  ownerAmount?: bigint;
  error?: string;
  executionMethod?: 'userop' | 'direct';
}

/**
 * FlashSwapV3 ABI for viem calldata encoding
 */
const FLASH_SWAP_V3_ABI_VIEM = [
  {
    name: 'executeArbitrage',
    type: 'function' as const,
    inputs: [
      { name: 'borrowToken', type: 'address' as const },
      { name: 'borrowAmount', type: 'uint256' as const },
      {
        name: 'path',
        type: 'tuple' as const,
        components: [
          {
            name: 'steps',
            type: 'tuple[]' as const,
            components: [
              { name: 'pool', type: 'address' as const },
              { name: 'tokenIn', type: 'address' as const },
              { name: 'tokenOut', type: 'address' as const },
              { name: 'fee', type: 'uint24' as const },
              { name: 'minOut', type: 'uint256' as const },
              { name: 'dexType', type: 'uint8' as const },
              { name: 'router', type: 'address' as const },
              { name: 'useDeadline', type: 'bool' as const },
            ],
          },
          { name: 'borrowAmount', type: 'uint256' as const },
          { name: 'minFinalAmount', type: 'uint256' as const },
        ],
      },
      { name: 'sourceOverride', type: 'uint8' as const },
      { name: 'flashPool', type: 'address' as const },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
] as const;

/**
 * FlashSwapV3 contract ABI (ethers.js human-readable — for read calls)
 */
const FLASH_SWAP_V3_ABI = [
  'function executeArbitrage(address borrowToken, uint256 borrowAmount, tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType, address router, bool useDeadline)[] steps, uint256 borrowAmount, uint256 minFinalAmount) path, uint8 sourceOverride, address flashPool) external',
  'function selectOptimalSource(address token, uint256 amount) external view returns (uint8)',
  'function isBalancerSupported(address token, uint256 amount) external view returns (bool)',
  'function isDydxSupported(address token, uint256 amount) external view returns (bool)',
  'function owner() external view returns (address)',
  'function titheRecipient() external view returns (address)',
  'function titheBps() external view returns (uint16)',
  'function emergencyWithdraw(address token, uint256 amount) external',
  'event FlashLoanInitiated(uint8 indexed source, address indexed token, uint256 amount, address indexed initiator)',
  'event FlashLoanExecuted(uint8 indexed source, address indexed token, uint256 amountBorrowed, uint256 feePaid, uint256 grossProfit, uint256 netProfit)',
  'event SwapExecuted(uint256 indexed stepIndex, uint8 dexType, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)',
  'event TitheDistributed(address indexed token, address indexed titheRecipient, uint256 titheAmount, address indexed owner, uint256 ownerAmount)',
];

export const FLASH_LOAN_FEES: Record<FlashLoanSource, number> = {
  [FlashLoanSource.BALANCER]: 0,
  [FlashLoanSource.DYDX]: 0,
  [FlashLoanSource.HYBRID_AAVE_V4]: 9,
  [FlashLoanSource.AAVE]: 9,
  [FlashLoanSource.UNISWAP_V3]: 50,
};

const BASIS_POINTS_DIVISOR = 10000n;
const DEFAULT_FEE_BPS = 3000;

/**
 * FlashSwapV3 Executor
 * 
 * Phase 3: Supports UserOp execution via Coinbase Smart Wallet + CDP Paymaster.
 * When privateKey + cdpPaymasterUrl are configured, all write operations
 * are routed through the Smart Wallet for gasless execution.
 */
export class FlashSwapV3Executor {
  private contract: Contract;
  private config: ResolvedFlashSwapV3Config;
  
  // Smart Wallet clients (lazy initialized)
  private bundlerClient: any = null;
  private viemPublicClient: PublicClient | null = null;
  private smartWalletAddress: string | null = null;

  constructor(config: FlashSwapV3Config) {
    this.config = {
      contractAddress: config.contractAddress,
      provider: config.provider,
      signer: config.signer,
      gasBuffer: config.gasBuffer ?? 1.2,
      defaultSlippage: config.defaultSlippage ?? 0.01,
      chainId: config.chainId ?? 8453,
      privateKey: config.privateKey,
      cdpPaymasterUrl: config.cdpPaymasterUrl,
      rpcUrl: config.rpcUrl,
    };

    this.contract = new Contract(
      config.contractAddress,
      FLASH_SWAP_V3_ABI,
      config.signer || config.provider
    );
  }

  /** Check if UserOp execution is available */
  get userOpEnabled(): boolean {
    return !!(this.config.privateKey && this.config.cdpPaymasterUrl);
  }

  /**
   * Initialize Smart Wallet bundler client (lazy, called once)
   */
  private async ensureBundlerClient(): Promise<void> {
    if (this.bundlerClient) return;

    if (!this.config.privateKey || !this.config.cdpPaymasterUrl) {
      throw new Error('Smart Wallet config required: privateKey and cdpPaymasterUrl');
    }

    logger.info('Initializing Smart Wallet bundler client...');

    const privateKeyHex = this.config.privateKey.startsWith('0x') 
      ? this.config.privateKey as Hex
      : `0x${this.config.privateKey}` as Hex;
    const owner = privateKeyToAccount(privateKeyHex);

    const transport = this.config.rpcUrl ? http(this.config.rpcUrl) : http();
    this.viemPublicClient = createPublicClient({ chain: base, transport });

    const smartAccount = await toCoinbaseSmartAccount({
      client: this.viemPublicClient,
      owners: [owner],
    });

    this.smartWalletAddress = smartAccount.address;

    this.bundlerClient = createBundlerClient({
      client: this.viemPublicClient,
      account: smartAccount,
      transport: http(this.config.cdpPaymasterUrl),
      paymaster: true,
    });

    logger.info(`Smart Wallet ready: eoa=${owner.address}, smartWallet=${smartAccount.address}, contract=${this.config.contractAddress}`);
  }

  /**
   * S41: Query actual fee tier from a V3 pool contract on-chain
   */
  private async queryPoolFee(poolAddress: string): Promise<number | null> {
    try {
      const result = await this.config.provider.call({
        to: poolAddress,
        data: '0xddca3f43', // fee() selector
      });
      if (result && result !== '0x') {
        return parseInt(result, 16);
      }
    } catch {
      // Not a V3 pool or call failed
    }
    return null;
  }

  async selectOptimalSource(borrowToken: string, borrowAmount: bigint): Promise<SourceSelection> {
    try {
      // S68: Force Balancer 0% as primary source
      // WETH is FROZEN on AAVE V3 Base, AERO is NOT LISTED
      // Balancer Vault confirmed live with $278K liquidity
      // Only fall back to on-chain auto-select if Balancer check fails
      const balancerSupported = await this.isBalancerSupported(borrowToken, borrowAmount).catch(() => false);
      if (balancerSupported) {
        logger.info(`[FlashSwapV3Executor] S68: Forcing Balancer 0% for ${borrowToken.substring(0, 10)}... (${borrowAmount})`);
        return {
          source: FlashLoanSource.BALANCER,
          fee: 0,
          reason: 'S68: Balancer V2 0% fee (forced primary)',
          estimatedCost: 0n,
        };
      }
      
      // Balancer doesn't support this token — fall back to contract auto-select
      logger.info(`[FlashSwapV3Executor] S68: Balancer unsupported for ${borrowToken.substring(0, 10)}... — falling back to auto-select`);
      const sourceId = await this.contract.selectOptimalSource(borrowToken, borrowAmount);
      const source = sourceId as FlashLoanSource;
      const fee = FLASH_LOAN_FEES[source];
      const estimatedCost = (borrowAmount * BigInt(fee)) / 10000n;

      let reason = '';
      if (source === FlashLoanSource.BALANCER) reason = 'Balancer V2: 0% fee';
      else if (source === FlashLoanSource.DYDX) reason = 'dYdX: 0% fee';
      else if (source === FlashLoanSource.HYBRID_AAVE_V4) reason = 'Hybrid Aave+V4';
      else if (source === FlashLoanSource.AAVE) reason = 'Aave V3: 0.09% fee';

      return { source, fee, reason, estimatedCost };
    } catch (error) {
      logger.error(`selectOptimalSource failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async isBalancerSupported(token: string, amount: bigint): Promise<boolean> {
    try { return await this.contract.isBalancerSupported(token, amount); }
    catch { return false; }
  }

  async isDydxSupported(token: string, amount: bigint): Promise<boolean> {
    try { return await this.contract.isDydxSupported(token, amount); }
    catch { return false; }
  }

  async constructSwapPath(opportunity: ArbitrageOpportunity): Promise<UniversalSwapPath> {
    const steps: SwapStep[] = [];
    for (const swap of opportunity.path) {
      let dexType: DexType;
      if (swap.protocol === 'uniswap_v3') dexType = DexType.UNISWAP_V3;
      else if (swap.protocol === 'sushiswap') dexType = DexType.SUSHISWAP;
      else if (swap.protocol === 'aerodrome') dexType = DexType.AERODROME;
      else dexType = DexType.UNISWAP_V3;

      const slippage = this.config.defaultSlippage;
      const baseAmount = swap.expectedOutput ? BigInt(Math.floor(swap.expectedOutput)) : 0n;
      const minOut = baseAmount > 0n
        ? (baseAmount * BigInt(Math.floor((1 - slippage) * 10000))) / BASIS_POINTS_DIVISOR
        : 0n;

      // S41 Fix (v3): Convert feeBps to Uniswap V3 fee units.
      // The data pipeline has multiple fee representations — feeBps may be:
      //   - Correct bps from Supabase (e.g. 100 for 1%, 5 for 0.05%)
      //   - Default 30 (0.3%) from arb engine fallback when scanner didn't propagate actual fee
      // For V3 pools, the fee MUST match exactly or Factory.getPool returns address(0) → revert(0x).
      // Strategy: Use feeBps*100, but for the common default of 30, query the pool contract on-chain.
      let v3Fee: number;
      if (swap.feeBps && swap.feeBps > 0 && swap.feeBps !== 30) {
        // Non-default fee — trust it and convert bps → V3 units
        v3Fee = swap.feeBps * 100;
        logger.info(`[constructSwapPath] Using feeBps=${swap.feeBps} → V3 fee=${v3Fee} for ${swap.protocol}`);
      } else {
        // Default or missing feeBps — query the actual pool fee on-chain
        const onChainFee = await this.queryPoolFee(swap.poolAddress);
        if (onChainFee !== null && onChainFee > 0) {
          v3Fee = onChainFee;
          logger.info(`[constructSwapPath] On-chain fee=${v3Fee} for pool ${swap.poolAddress.substring(0, 14)}...`);
        } else {
          v3Fee = DEFAULT_FEE_BPS;
          logger.warn(`[constructSwapPath] Could not query fee for ${swap.poolAddress.substring(0, 14)}..., defaulting to ${v3Fee}`);
        }
      }

      steps.push({
        pool: swap.poolAddress,
        tokenIn: swap.tokenIn,
        tokenOut: swap.tokenOut,
        fee: v3Fee,
        minOut,
        dexType,
      });
    }
    return {
      steps,
      borrowAmount: BigInt(Math.floor(opportunity.inputAmount)),
      minFinalAmount: 0n, // S56: Let flash loan atomic repayment be the guard — no risk of loss
    };
  }

  /**
   * Execute arbitrage — routes through UserOp if configured, else direct tx.
   */
  async executeArbitrage(
    borrowToken: string,
    borrowAmount: bigint,
    path: UniversalSwapPath
  ): Promise<ExecutionResult> {
    if (this.userOpEnabled) {
      return this.executeViaUserOp(borrowToken, borrowAmount, path);
    }
    logger.warn('Executing via direct tx (legacy). Enable UserOp for gasless execution.');
    return this.executeDirectTx(borrowToken, borrowAmount, path);
  }

  /**
   * Execute via UserOp through Coinbase Smart Wallet + CDP Paymaster
   */
  private async executeViaUserOp(
    borrowToken: string, borrowAmount: bigint, path: UniversalSwapPath
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    try {
      await this.ensureBundlerClient();
      const selection = await this.selectOptimalSource(borrowToken, borrowAmount);

      logger.info(`[UserOp] Executing: token=${borrowToken}, amount=${formatUnits(borrowAmount, 6)}, source=${FlashLoanSource[selection.source]}, steps=${path.steps.length}`);

      const calldata = encodeFunctionData({
        abi: FLASH_SWAP_V3_ABI_VIEM,
        functionName: 'executeArbitrage',
        args: [
          borrowToken as Hex,
          borrowAmount,
          {
            steps: path.steps.map(s => ({
              pool: s.pool as Hex, tokenIn: s.tokenIn as Hex, tokenOut: s.tokenOut as Hex,
              fee: s.fee, minOut: s.minOut, dexType: s.dexType,
              router: (s.router || '0x0000000000000000000000000000000000000000') as Hex, // S45: per-hop router
              useDeadline: s.useDeadline || false, // S45: V1 (PancakeSwap) vs V2 (Uniswap)
            })),
            borrowAmount: path.borrowAmount,
            minFinalAmount: path.minFinalAmount,
          },
          0, // S68: sourceOverride = BALANCER (0% fee) — was 255 (auto-select)
          '0x0000000000000000000000000000000000000000' as Hex, // S58: flashPool (unused for auto)
        ],
      });

      // S56: eth_call simulation pre-check (non-blocking for flash loans)
      // Flash loan callbacks can't be simulated via eth_call, so failures are expected.
      // Log result but proceed regardless — flash loans are atomically safe.
      if (this.viemPublicClient && this.smartWalletAddress) {
        try {
          await this.viemPublicClient.call({
            account: this.smartWalletAddress as Hex,
            to: this.config.contractAddress as Hex,
            data: calldata,
          });
          logger.info(`[UserOp] ✅ Simulation passed — high confidence execution`);
        } catch (simError: any) {
          const simMsg = simError.message?.substring(0, 200) || 'unknown';
          logger.info(`[UserOp] ⚠️ Simulation inconclusive (expected for flash loans) — proceeding: ${simMsg}`);
          // Don't block — flash loans are atomic. Worst case: reverted UserOp.
        }
      }

      // S52 FIX: Explicit gas limits — bundler can't simulate flash loan callbacks,
      // returns callGasLimit=0 without overrides. 800k covers loan+swap+callback on Base.
      const GAS_LIMIT_OVERRIDE = BigInt(process.env.USEROP_CALL_GAS_LIMIT || '800000');
      // S68: Set competitive priority fee for FCFS optimization (Base = first-come-first-served)
      const maxPriorityFeePerGas = BigInt(process.env.MAX_PRIORITY_FEE_GWEI || '100000000'); // 0.1 gwei default
      const userOpHash = await this.bundlerClient.sendUserOperation({
        calls: [{ to: this.config.contractAddress as Hex, data: calldata, value: 0n }],
        maxPriorityFeePerGas,
        callGasLimit: GAS_LIMIT_OVERRIDE,
        verificationGasLimit: 500000n,
        preVerificationGas: 100000n,
      });
      logger.info(`[UserOp] Submitted: hash=${userOpHash}, callGasLimit=${GAS_LIMIT_OVERRIDE}`);

      const userOpReceipt = await this.bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
      if (!userOpReceipt.success) throw new Error(`UserOp failed: ${userOpReceipt.reason || 'unknown'}`);

      const txHash = userOpReceipt.receipt.transactionHash;
      logger.info(`[UserOp] Confirmed: txHash=${txHash}, block=${userOpReceipt.receipt.blockNumber}`);

      // Parse events via ethers
      const ethersReceipt = await this.config.provider.getTransactionReceipt(txHash);
      let feePaid = 0n, grossProfit = 0n, netProfit = 0n;
      let titheAmount: bigint | undefined, ownerAmount: bigint | undefined;

      if (ethersReceipt) {
        const events = ethersReceipt.logs.map((log: any) => {
          try { return this.contract.interface.parseLog(log); } catch { return null; }
        }).filter(Boolean);
        const exec = events.find((e: any) => e?.name === 'FlashLoanExecuted');
        const tithe = events.find((e: any) => e?.name === 'TitheDistributed');
        feePaid = exec?.args?.feePaid || 0n;
        grossProfit = exec?.args?.grossProfit || 0n;
        netProfit = exec?.args?.netProfit || 0n;
        titheAmount = tithe?.args?.titheAmount;
        ownerAmount = tithe?.args?.ownerAmount;
      }

      const gasUsed = userOpReceipt.receipt.gasUsed ? BigInt(userOpReceipt.receipt.gasUsed) : undefined;
      const executionTime = Date.now() - startTime;

      logger.info(`[UserOp] Success: netProfit=${formatUnits(netProfit, 6)}, gasUsed=${gasUsed}, gasCost=$0 (sponsored), time=${executionTime}ms`);

      return {
        success: true, txHash, userOpHash, source: selection.source,
        gasUsed, gasPrice: 0n, totalGasCost: 0n, borrowAmount,
        feePaid, grossProfit, netProfit, titheAmount, ownerAmount,
        executionMethod: 'userop',
      };
    } catch (error: any) {
      logger.error(`[UserOp] Failed: ${error.message}`);
      return {
        success: false, source: FlashLoanSource.AAVE, borrowAmount,
        feePaid: 0n, grossProfit: 0n, netProfit: 0n,
        error: error.message, executionMethod: 'userop',
      };
    }
  }

  /**
   * Legacy: Direct transaction execution
   */
  private async executeDirectTx(
    borrowToken: string, borrowAmount: bigint, path: UniversalSwapPath
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    try {
      const selection = await this.selectOptimalSource(borrowToken, borrowAmount);
      logger.info(`[DirectTx] Executing: token=${borrowToken}, amount=${formatUnits(borrowAmount, 6)}, source=${FlashLoanSource[selection.source]}`);

      const estimatedGas = await this.contract.executeArbitrage.estimateGas(borrowToken, borrowAmount, path, 0, '0x0000000000000000000000000000000000000000'); // S68: BALANCER=0
      const gasLimit = (estimatedGas * BigInt(Math.floor(this.config.gasBuffer * 100))) / 100n;
      const tx = await this.contract.executeArbitrage(borrowToken, borrowAmount, path, 0, '0x0000000000000000000000000000000000000000', { gasLimit }); // S68: BALANCER=0
      logger.info(`[DirectTx] Submitted: txHash=${tx.hash}`);

      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error('Transaction failed');

      const events = receipt.logs.map((log: any) => {
        try { return this.contract.interface.parseLog(log); } catch { return null; }
      }).filter(Boolean);
      const exec = events.find((e: any) => e?.name === 'FlashLoanExecuted');
      const tithe = events.find((e: any) => e?.name === 'TitheDistributed');
      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.gasPrice || 0n;
      const totalGasCost = BigInt(gasUsed) * BigInt(gasPrice);

      logger.info(`[DirectTx] Success: netProfit=${formatUnits(exec?.args?.netProfit || 0n, 6)}, time=${Date.now() - startTime}ms`);

      return {
        success: true, txHash: tx.hash, receipt, source: selection.source,
        gasUsed, gasPrice, totalGasCost, borrowAmount,
        feePaid: exec?.args?.feePaid || 0n,
        grossProfit: exec?.args?.grossProfit || 0n,
        netProfit: exec?.args?.netProfit || 0n,
        titheAmount: tithe?.args?.titheAmount,
        ownerAmount: tithe?.args?.ownerAmount,
        executionMethod: 'direct',
      };
    } catch (error: any) {
      logger.error(`[DirectTx] Failed: ${error.message}`);
      return {
        success: false, source: FlashLoanSource.AAVE, borrowAmount,
        feePaid: 0n, grossProfit: 0n, netProfit: 0n,
        error: error.message, executionMethod: 'direct',
      };
    }
  }

  async estimateProfit(opportunity: ArbitrageOpportunity): Promise<{
    source: FlashLoanSource; grossProfit: bigint; flashLoanFee: bigint;
    estimatedGasCost: bigint; netProfit: bigint;
  }> {
    const borrowAmount = BigInt(Math.floor(opportunity.flashLoanAmount || opportunity.inputAmount));
    const borrowToken = opportunity.flashLoanToken || opportunity.tokenAddresses[0];
    const selection = await this.selectOptimalSource(borrowToken, borrowAmount);
    const flashLoanFee = selection.estimatedCost;
    const path = await this.constructSwapPath(opportunity);
    const estimatedGas = await this.contract.executeArbitrage.estimateGas(borrowToken, borrowAmount, path, 0, '0x0000000000000000000000000000000000000000').catch(() => 500000n); // S68: BALANCER=0

    let estimatedGasCost: bigint;
    if (this.userOpEnabled) {
      estimatedGasCost = 0n;
    } else {
      const gasPrice = await this.config.provider.getFeeData().then(d => d.gasPrice || 0n);
      estimatedGasCost = estimatedGas * gasPrice;
    }

    const grossProfit = BigInt(Math.floor(opportunity.grossProfit));
    const netProfit = grossProfit - flashLoanFee - estimatedGasCost;
    return { source: selection.source, grossProfit, flashLoanFee, estimatedGasCost, netProfit };
  }

  async emergencyWithdraw(token: string, amount: bigint): Promise<string> {
    if (this.userOpEnabled) {
      await this.ensureBundlerClient();
      const calldata = encodeFunctionData({
        abi: [{ name: 'emergencyWithdraw', type: 'function' as const,
          inputs: [{ name: 'token', type: 'address' as const }, { name: 'amount', type: 'uint256' as const }],
          outputs: [], stateMutability: 'nonpayable' as const }],
        functionName: 'emergencyWithdraw',
        args: [token as Hex, amount],
      });
      const hash = await this.bundlerClient.sendUserOperation({
        calls: [{ to: this.config.contractAddress as Hex, data: calldata, value: 0n }],
        callGasLimit: 200000n,
        verificationGasLimit: 500000n,
        preVerificationGas: 100000n,
      });
      const receipt = await this.bundlerClient.waitForUserOperationReceipt({ hash });
      logger.info(`[UserOp] Emergency withdrawal: txHash=${receipt.receipt.transactionHash}`);
      return receipt.receipt.transactionHash;
    }
    const tx = await this.contract.emergencyWithdraw(token, amount);
    await tx.wait();
    return tx.hash;
  }

  async getOwner(): Promise<string> { return await this.contract.owner(); }

  async getTitheInfo(): Promise<{ recipient: string; bps: number }> {
    const recipient = await this.contract.titheRecipient();
    const bps = await this.contract.titheBps();
    return { recipient, bps };
  }

  getSmartWalletAddress(): string | null { return this.smartWalletAddress; }
}
