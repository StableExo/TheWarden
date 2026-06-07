/**
 * EthPoolScanner — Focused 2-Pool Arb Scanner
 *
 * GL-L55 SIMPLIFIED: Watch only the 2 best pools.
 *   Pool A: UniswapV3 USDC/WETH 0.05%   — deepest liquidity, price reference
 *   Pool B: SushiSwap V3 USDC/WETH 0.05% — same pair/fee, diverges on large Sushi flows
 *
 * Why these two:
 *   - Same token pair (no decimal mismatch)
 *   - Same fee tier (total 2-hop cost = 10bps, not 35bps)
 *   - Different DEXes — price diverges when a large swap hits one side
 *   - 4 RPC calls per scan (slot0+liquidity×2 via Multicall3) instead of 70+
 *   - No Balancer/Curve/multi-pair overhead — no more 429s
 *
 * Arb logic:
 *   1. Multicall3: get both pool prices in one batch (4 calls)
 *   2. If spread < 10bps: skip (fees would eat it)
 *   3. If spread >= 10bps: ternary search (8 iters = 16 Q2 calls) for optimal borrow
 *   4. Return opportunity with optimalBorrow if profitable
 *
 * GL-L56 | TheWarden | @StableExo — Gated on real profit (no more fire-regardless)
 */

import { createPublicClient, http, getAddress, type Address, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { ETH_MAINNET } from '../config/network';
import { ADDRESSES } from '../config/addresses';

// ── The 2 pools ───────────────────────────────────────────────────────────────
const POOL_A = {
  address:  '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640' as Address, // UniV3 USDC/WETH 0.05%
  protocol: 'uniswap-v3' as const,
  token0:   ADDRESSES.tokens.USDC,
  token1:   ADDRESSES.tokens.WETH,
  fee:      500,
  label:    'UniV3 USDC/WETH 0.05%',
};

const POOL_B = {
  address:  '0x35644Fb61aFBc458bf92B15AdD6ABc1996Be5014' as Address, // SushiV3 USDC/WETH 0.05%
  protocol: 'sushi-v3' as const,
  token0:   ADDRESSES.tokens.USDC,
  token1:   ADDRESSES.tokens.WETH,
  fee:      500,
  label:    'SushiV3 USDC/WETH 0.05%',
};

const POOLS = [POOL_A, POOL_B];

// ── Constants ─────────────────────────────────────────────────────────────────
const MULTICALL3  = '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;
const QUOTER_ADDR = ADDRESSES.uniswapV3.quoterV2 as Address;
const MIN_BORROW  = 1_000_000_000n;    //   1K USDC (6 decimals)
const MAX_BORROW  = 500_000_000_000n;  // 500K USDC (6 decimals)
const BORROW      = 100_000_000_000n;  // 100K USDC — fast-path / fallback
const MIN_SPREAD_BPS = 5;              // GL-L56: Gate at 5bps — below fee cost (10bps), avoids noise

// ── ABIs ──────────────────────────────────────────────────────────────────────
const MULTICALL3_ABI = [{
  name: 'aggregate3', type: 'function', stateMutability: 'payable',
  inputs: [{ name: 'calls', type: 'tuple[]', components: [
    { name: 'target',       type: 'address' },
    { name: 'allowFailure', type: 'bool'    },
    { name: 'callData',     type: 'bytes'   },
  ]}],
  outputs: [{ name: 'returnData', type: 'tuple[]', components: [
    { name: 'success',    type: 'bool'  },
    { name: 'returnData', type: 'bytes' },
  ]}],
}] as const;

const QUOTER_ABI = [{
  name: 'quoteExactInputSingle', type: 'function',
  inputs: [{ name: 'params', type: 'tuple', components: [
    { name: 'tokenIn',           type: 'address' },
    { name: 'tokenOut',          type: 'address' },
    { name: 'amountIn',          type: 'uint256' },
    { name: 'fee',               type: 'uint24'  },
    { name: 'sqrtPriceLimitX96', type: 'uint160' },
  ]}],
  outputs: [
    { name: 'amountOut',               type: 'uint256' },
    { name: 'sqrtPriceX96After',       type: 'uint160' },
    { name: 'initializedTicksCrossed', type: 'uint32'  },
    { name: 'gasEstimate',             type: 'uint256' },
  ],
  stateMutability: 'nonpayable',
}] as const;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PoolPrice {
  pool: typeof POOL_A; price: number; priceInv: number; liquidity: bigint; timestamp: number;
}
export interface ArbOpportunity {
  label: string; buyPool: typeof POOL_A; sellPool: typeof POOL_A;
  buyPrice: number; sellPrice: number; spread: number;
  profitable: boolean; estimatedProfitBps: number;
  optimalBorrow?: bigint; hopCount: 2;
  midPool?: undefined;
}

// ── Scanner ───────────────────────────────────────────────────────────────────
export class EthPoolScanner {
  private client = createPublicClient({ chain: mainnet, transport: http(ETH_MAINNET.rpc.http) });

  // Get both pool prices in one Multicall3 batch (4 calls: slot0+liquidity × 2 pools)
  async scanAll(): Promise<PoolPrice[]> {
    const SLOT0 = '0x3850c7bd' as Address;
    const LIQ   = '0x1a686502' as Address;

    const calls = POOLS.flatMap(p => [
      { target: getAddress(p.address), allowFailure: true, callData: SLOT0 },
      { target: getAddress(p.address), allowFailure: true, callData: LIQ   },
    ]);

    try {
      const results = await this.client.readContract({
        address: MULTICALL3, abi: MULTICALL3_ABI,
        functionName: 'aggregate3', args: [calls],
      }) as readonly { success: boolean; returnData: string }[];

      const prices: PoolPrice[] = [];
      for (let i = 0; i < POOLS.length; i++) {
        const s0 = results[i * 2];
        const lq = results[i * 2 + 1];
        if (!s0?.success || !lq?.success) continue;
        const sqrtP = BigInt('0x' + s0.returnData.slice(2, 66));
        const liq   = BigInt('0x' + lq.returnData.slice(2, 66));
        if (sqrtP === 0n || liq === 0n) continue;
        const price = Number((sqrtP * sqrtP) / (1n << 192n));
        if (price === 0) continue;
        prices.push({ pool: POOLS[i] as any, price, priceInv: 1/price, liquidity: liq, timestamp: Date.now() });
      }
      return prices;
    } catch (e: any) {
      console.error('[SCANNER ERR] Multicall3:', e?.message?.slice(0, 60));
      return [];
    }
  }

  // QuoterV2 single-hop quote
  private async q2Quote(tokenIn: string, tokenOut: string, amt: bigint, fee: number): Promise<bigint> {
    try {
      const result = await this.client.readContract({
        address: QUOTER_ADDR, abi: QUOTER_ABI, functionName: 'quoteExactInputSingle',
        args: [{ tokenIn: tokenIn as Address, tokenOut: tokenOut as Address, amountIn: amt, fee, sqrtPriceLimitX96: 0n }],
      }) as readonly [bigint, bigint, number, bigint];
      return result[0];
    } catch { return 0n; }
  }

  // Ternary search: finds borrow size that maximises profit (concave profit curve)
  // 8 iterations = (500K-1K)/3^8 ≈ $800 precision — fast, accurate, 16 Q2 calls max
  private async ternarySearch(fn: (amt: bigint) => Promise<bigint>): Promise<{ amount: bigint; profit: bigint }> {
    let lo = MIN_BORROW, hi = MAX_BORROW;
    for (let i = 0; i < 8; i++) {
      const t = (hi - lo) / 3n;
      if (t === 0n) break;
      const [p1, p2] = await Promise.all([fn(lo + t), fn(hi - t)]);
      if (p1 < p2) { lo = lo + t; } else { hi = hi - t; }
    }
    const opt = (lo + hi) / 2n;
    return { amount: opt, profit: await fn(opt) };
  }

  // Main scan: Multicall3 prices → spread check → ternary search → opportunity
  async findOpportunities(): Promise<ArbOpportunity[]> {
    const t0 = Date.now();
    console.log('[SCAN] Starting pool scan...');
    const prices = await this.scanAll();
    console.log(`[SCAN] Got ${prices.length} pool prices in ${Date.now()-t0}ms`);

    if (prices.length < 2) {
      console.log('[SCAN] Not enough pool prices — skipping');
      return [];
    }

    const [pA, pB] = prices[0].price < prices[1].price
      ? [prices[0], prices[1]]
      : [prices[1], prices[0]];

    const spread    = (pB.price - pA.price) / pA.price;
    const spreadBps = Math.round(spread * 10_000);

    console.log(`[SCAN] ${pA.pool.label} vs ${pB.pool.label} | spread=${spreadBps}bps | min=${MIN_SPREAD_BPS}bps`);

    // GL-L55: No spread gate — ternary search runs every cycle
    // FlashSwapV3 contract reverts on-chain if unprofitable — gas is $0 (ThirdWeb paymaster)
    console.log(`[Q2] Running ternary search on ${spreadBps}bps spread...`);

    // Spread exceeds fee cost — run ternary search for optimal borrow
    // Buy WETH at cheap pool (pA), sell WETH at expensive pool (pB)
    const profitFn = async (amt: bigint): Promise<bigint> => {
      try {
        // Step 1: USDC → WETH at lower-priced pool (buy cheap)
        const wethOut = await this.q2Quote(pA.pool.token0, pA.pool.token1, amt, pA.pool.fee);
        if (!wethOut || wethOut === 0n) return -amt;
        // Step 2: WETH → USDC at higher-priced pool (sell expensive)
        const usdcOut = await this.q2Quote(pB.pool.token1, pB.pool.token0, wethOut, pB.pool.fee);
        if (!usdcOut || usdcOut === 0n) return -amt;
        return usdcOut - amt; // positive = profitable
      } catch { return -amt; }
    };

    // Fast-path: try 100K first
    let optAmt = BORROW; let optProfit = await profitFn(BORROW);
    if (optProfit <= 0n) {
      console.log(`[Q2] 100K unprofitable (${(Number(optAmt+optProfit)/1e6).toFixed(2)}) — ternary searching 1K→500K...`);
      const res = await this.ternarySearch(profitFn);
      optAmt = res.amount; optProfit = res.profit;
    }

    // GL-L56: Gate on real profit — nonce collisions (AA25) cost us even with free gas
    if (optProfit <= 0n) {
      console.log(`[Q2 ❌] ${pA.pool.label}→${pB.pool.label} | spread=${spreadBps}bps | best back=${(Number(optAmt+optProfit)/1e6).toFixed(4)} USDC — NOT profitable, skipping`);
      return [];
    }

    const cbps = Math.round(Number(optProfit) / Number(optAmt) * 10_000);
    console.log(`[Q2 ✅] ${pA.pool.label}→${pB.pool.label} | borrow=${(Number(optAmt)/1e6).toFixed(0)} USDC | profit=${(Number(optProfit)/1e6).toFixed(4)} USDC | ${cbps}bps 🔥`);

    return [{
      label:             `${pA.pool.label}→${pB.pool.label} Q2:${cbps}bps`,
      buyPool:           pA.pool as any,
      sellPool:          pB.pool as any,
      buyPrice:          pA.price,
      sellPrice:         pB.price,
      spread,
      profitable:        true,
      estimatedProfitBps: cbps,
      hopCount:          2,
      optimalBorrow:     optAmt,
    }];
  }

  async getCurrentBlock(): Promise<number> {
    return Number(await this.client.getBlockNumber());
  }

  async getGasPrice(): Promise<string> {
    return `${(Number(await this.client.getGasPrice()) / 1e9).toFixed(1)} Gwei`;
  }
}