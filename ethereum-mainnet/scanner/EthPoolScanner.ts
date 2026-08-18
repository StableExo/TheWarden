/**
 * EthPoolScanner — Focused 2-Pool Arb Scanner
 *
 * GL-L55 SIMPLIFIED: Watch only the 2 best pools.
 *   Pool A: UniswapV3 USDC/WETH 0.05%   — deepest liquidity, price reference
 *   Pool B: UniV3 USDC/WETH 0.01%       — 895T liquidity, fee-tier spread
 *   Pool C: UniV3 USDT/WETH 0.05%       — stablecoin stress diverger
 *
 * VL-20 FIXES:
 *   - FIX 1: Silent RPC failures exposed — q2Quote now logs every error
 *   - FIX 2: Fallback RPC chain — tries QN_HTTP_URL → QN fallback → public
 *   - FIX 3: Pool C now compared against A AND B (was silently ignored)
 *   - FIX 4: Multicall3 failures are loudly logged with full error
 *   - FIX 5: RPC health check on init — fails fast with clear message
 *   - FIX 6: QuoterV2 uses eth_call simulation (view mode) correctly
 *
 * VL-21 FIXES:
 *   - FIX 7: POOL_C price=0 root cause fixed — POOL_C is token0=WETH,token1=USDT
 *            (opposite orientation to POOL_A/B). BigInt sqrtP^2/2^192 truncates to 0.
 *            Fix: each pool now carries token0Decimals/token1Decimals + isInverted flag.
 *            Inverted pools use 2^192/sqrtP^2 * 1e12 to produce a comparable price.
 *   - FIX 8: MIN_SPREAD_BPS now actually used as pre-filter — skips ternary search
 *            (16 RPC calls) on pairs below threshold. Was defined but never applied.
 *   - FIX 9: Cross-token pairs (USDC/WETH vs USDT/WETH) properly skipped — the
 *            2-leg arb path is invalid across different stablecoins without a bridge leg.
 *
 * VL-19 | TheWarden | @StableExo — Pool B swapped to 0.01% (6bps total fees), threshold 7bps
 * VL-20 | TheWarden | @StableExo — Error logging + fallback RPC + Pool C comparison
 */

import { createPublicClient, http, getAddress, type Address } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESSES } from '../config/addresses';

// ── RPC fallback chain (VL-20 FIX 2) ─────────────────────────────────────────
// Only QN_HTTP_URL (from Render env) reliably works from container.
// The hardcoded purple-hidden-general QN URL is a DIFFERENT endpoint and TLS-fails.
// We try in order: env var → hardcoded QN (both same account, different node) → Cloudflare
const RPC_CANDIDATES = [
  process.env.QN_HTTP_URL,                                                      // Render env — WORKS
  'https://purple-hidden-general.ethereum-mainnet.quiknode.pro/8d8e8ffb350c39346213f1e647de678338c31644/', // Keys PDF — may TLS-block
  'https://eth.llamarpc.com',                                                    // LlamaRPC — free, reliable
  'https://rpc.payload.de',                                                      // payload.de — MEV-friendly, free
].filter(Boolean) as string[];

// ── The 3 pools ───────────────────────────────────────────────────────────────
// VL-21 FIX 7: Each pool now carries decimals and an isInverted flag.
// isInverted=true means token0 is the expensive asset (WETH), so sqrtPriceX96
// encodes USDT/WETH (not WETH/USDC). We take the reciprocal to compare apples-to-apples.
//
// Verified on-chain Aug 18 2026:
//   POOL_A token0=USDC(6) token1=WETH(18)  — isInverted=false
//   POOL_B token0=USDC(6) token1=WETH(18)  — isInverted=false
//   POOL_C token0=WETH(18) token1=USDT(6)  — isInverted=TRUE (was wrong in POOL_C definition)
const POOL_A = {
  address:       '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640' as Address,
  protocol:      'uniswap-v3' as const,
  token0:        ADDRESSES.tokens.USDC,
  token1:        ADDRESSES.tokens.WETH,
  fee:           500,
  label:         'UniV3 USDC/WETH 0.05%',
  dec0:          6,
  dec1:          18,
  isInverted:    false,   // price = sqrtP^2/2^192 * 1e(dec1-dec0) — stablecoin per ETH unit
  stablecoin:    'USDC',
};

const POOL_B = {
  address:       '0xe0554a476A092703abdB3Ef35c80e0D76d32939F' as Address,
  protocol:      'uniswap-v3' as const,
  token0:        ADDRESSES.tokens.USDC,
  token1:        ADDRESSES.tokens.WETH,
  fee:           100,
  label:         'UniV3 USDC/WETH 0.01%',
  dec0:          6,
  dec1:          18,
  isInverted:    false,
  stablecoin:    'USDC',
};

// VL-21: POOL_C on-chain token0=WETH(18), token1=USDT(6) — isInverted=true.
// Previous definition had token0=USDT, token1=WETH which was WRONG and caused price=0.
const POOL_C = {
  address:       '0x11b815efB8f581194ae79006d24E0d814B7697F6' as Address,
  protocol:      'uniswap-v3' as const,
  token0:        ADDRESSES.tokens.WETH,   // VL-21 corrected: WETH is token0 on-chain
  token1:        ADDRESSES.tokens.USDT,   // VL-21 corrected: USDT is token1 on-chain
  fee:           500,
  label:         'UniV3 WETH/USDT 0.05%',
  dec0:          18,
  dec1:          6,
  isInverted:    true,    // price = 2^192/sqrtP^2 * 1e(dec0-dec1) to match POOL_A/B orientation
  stablecoin:    'USDT',
};

const POOLS = [POOL_A, POOL_B, POOL_C];

// ── Constants ─────────────────────────────────────────────────────────────────
const MULTICALL3  = '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;
const QUOTER_ADDR = ADDRESSES.uniswapV3.quoterV2 as Address;
const MIN_BORROW  = 1_000_000_000n;    //   1K USDC (6 decimals)
const MAX_BORROW  = 500_000_000_000n;  // 500K USDC (6 decimals)
const BORROW      = 100_000_000_000n;  // 100K USDC — fast-path / fallback
const MIN_SPREAD_BPS = 7;

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
  private client!: ReturnType<typeof createPublicClient>;
  private activeRpc = '';
  private initialized = false;

  // VL-20 FIX 5: Build client with fallback RPC selection
  private async init(): Promise<void> {
    if (this.initialized) return;
    for (const rpc of RPC_CANDIDATES) {
      try {
        const c = createPublicClient({ chain: mainnet, transport: http(rpc) });
        const block = await c.getBlockNumber();
        if (block > 0n) {
          this.client = c;
          this.activeRpc = rpc.slice(0, 50) + '...';
          console.log(`[RPC] ✅ Connected via: ${this.activeRpc} (block=${block})`);
          this.initialized = true;
          return;
        }
      } catch (e: any) {
        console.warn(`[RPC] ❌ Failed: ${rpc.slice(0, 50)}... — ${e?.message?.slice(0, 60)}`);
      }
    }
    throw new Error('[RPC FATAL] All RPC endpoints failed. Check QN_HTTP_URL env var on Render.');
  }

  // VL-20 FIX 1+4: Loud error logging on QuoterV2 calls
  private async q2Quote(label: string, tokenIn: string, tokenOut: string, amt: bigint, fee: number): Promise<bigint> {
    try {
      const result = await this.client.readContract({
        address: QUOTER_ADDR, abi: QUOTER_ABI, functionName: 'quoteExactInputSingle',
        args: [{ tokenIn: tokenIn as Address, tokenOut: tokenOut as Address, amountIn: amt, fee, sqrtPriceLimitX96: 0n }],
      }) as readonly [bigint, bigint, number, bigint];
      const out = result[0];
      if (!out || out === 0n) {
        console.warn(`[Q2 WARN] ${label}: returned 0 (pool may have no liquidity at this size)`);
        return 0n;
      }
      return out;
    } catch (e: any) {
      // VL-20: Was silently returning 0n — now we see WHY it fails
      const msg = e?.message?.slice(0, 120) ?? 'unknown';
      console.error(`[Q2 ERR] ${label}: ${msg}`);
      return 0n;
    }
  }

  // Get pool prices via Multicall3
  async scanAll(): Promise<PoolPrice[]> {
    await this.init();
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
        if (!s0?.success || !lq?.success) {
          console.warn(`[SCAN WARN] Pool ${POOLS[i].label}: Multicall3 call failed (success=false)`);
          continue;
        }
        if (!s0.returnData || s0.returnData.length < 66) {
          console.warn(`[SCAN WARN] Pool ${POOLS[i].label}: returnData too short (${s0.returnData?.length})`);
          continue;
        }
        const sqrtP = BigInt('0x' + s0.returnData.slice(2, 66));
        const liq   = BigInt('0x' + lq.returnData.slice(2, 66));
        if (sqrtP === 0n || liq === 0n) {
          console.warn(`[SCAN WARN] Pool ${POOLS[i].label}: sqrtP=${sqrtP} liq=${liq} — zero values`);
          continue;
        }
        // VL-21 FIX 7: Compute price correctly for both normal and inverted pools.
        // All pools normalize to "stablecoin units per WETH unit * 1e12" for apples-to-apples comparison.
        //
        // Normal pools (token0=stablecoin, token1=WETH):
        //   price = Number(sqrtP^2 / 2^192) * 1e(dec1-dec0)
        //   = WETH_raw/stablecoin_raw * 1e12  ← large number ~5.25e20
        //
        // Inverted pools (token0=WETH, token1=stablecoin, e.g. POOL_C):
        //   sqrtP^2/2^192 is tiny (~1.9e-9) so BigInt truncates to 0.
        //   Instead: price = Number(2^192 / sqrtP^2) * 1e(dec0-dec1)
        //   = stablecoin_raw/WETH_raw * 1e12  ← same ~5.25e20 ✓
        const pool = POOLS[i] as typeof POOL_A;
        let price: number;
        if (pool.isInverted) {
          // Use floating point reciprocal — BigInt division would give 0
          const sqrtPNum = Number(sqrtP);
          const pow192 = Math.pow(2, 192);
          const decAdj = Math.pow(10, pool.dec0 - pool.dec1); // 1e(18-6) = 1e12
          price = (pow192 / (sqrtPNum * sqrtPNum)) * decAdj;
        } else {
          // Normal: BigInt division is fine (sqrtP is large enough)
          const rawPrice = Number((sqrtP * sqrtP) / (1n << 192n));
          const decAdj = Math.pow(10, pool.dec1 - pool.dec0); // 1e(18-6) = 1e12
          price = rawPrice * decAdj;
        }
        if (price === 0 || !isFinite(price)) {
          console.warn(`[SCAN WARN] Pool ${POOLS[i].label}: price calculated as ${price}`);
          continue;
        }
        console.log(`[SCAN] ${POOLS[i].label}: price=${price.toFixed(8)} liq=${liq}`);
        prices.push({ pool: POOLS[i] as any, price, priceInv: 1/price, liquidity: liq, timestamp: Date.now() });
      }
      return prices;
    } catch (e: any) {
      // VL-20: Full error, not truncated
      console.error(`[SCAN ERR] Multicall3 failed: ${e?.message ?? String(e)}`);
      return [];
    }
  }

  // Ternary search for optimal borrow
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

  // VL-20 FIX 3: Compare ALL pool pairs, not just [0] vs [1]
  async findOpportunities(): Promise<ArbOpportunity[]> {
    await this.init();
    console.log('[SCAN] Starting pool scan...');
    const t0 = Date.now();
    const prices = await this.scanAll();
    console.log(`[SCAN] Got ${prices.length} pool prices in ${Date.now()-t0}ms`);

    if (prices.length < 2) {
      console.log('[SCAN] Not enough pool prices — check RPC and pool addresses');
      return [];
    }

    // VL-21 FIX 9: Only compare pools with the same stablecoin (same quote token).
    // USDC/WETH vs USDT/WETH cross-token pairs are NOT valid 2-leg arb — they'd need
    // a USDC↔USDT bridge leg which this executor doesn't support.
    // Same stablecoin check: both pools must have the same stablecoin field.
    const pairs: Array<[PoolPrice, PoolPrice]> = [];
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const poolI = prices[i].pool as typeof POOL_A;
        const poolJ = prices[j].pool as typeof POOL_A;
        if (poolI.stablecoin !== poolJ.stablecoin) {
          console.log(`[SCAN] Skipping cross-stablecoin pair: ${poolI.label} vs ${poolJ.label}`);
          continue;
        }
        pairs.push([prices[i], prices[j]]);
      }
    }

    // Sort pairs by spread descending — try best first
    const spreads = pairs.map(([a, b]) => {
      const lo = a.price < b.price ? a : b;
      const hi = a.price < b.price ? b : a;
      const spreadBps = Math.round(((hi.price - lo.price) / lo.price) * 10_000);
      return { lo, hi, spreadBps };
    }).sort((a, b) => b.spreadBps - a.spreadBps);

    console.log('[SCAN] Pair spreads:');
    for (const s of spreads) {
      console.log(`  ${s.lo.pool.label} vs ${s.hi.pool.label}: ${s.spreadBps}bps`);
    }

    // Try pairs in order of spread until we find a profitable one
    for (const { lo, hi, spreadBps } of spreads) {
      // VL-21 FIX 8: MIN_SPREAD_BPS was defined but never used as a pre-filter.
      // Skip ternary search entirely (saves ~16 RPC calls) if spread is below threshold.
      if (spreadBps < MIN_SPREAD_BPS) {
        console.log(`[SCAN] ${lo.pool.label} vs ${hi.pool.label}: ${spreadBps}bps < ${MIN_SPREAD_BPS}bps threshold — skipping Q2`);
        continue;
      }
      console.log(`[Q2] Checking ${lo.pool.label}→${hi.pool.label} | ${spreadBps}bps`);
      const opps = await this._runTernaryAndReturn(
        lo.pool as any, hi.pool as any, spreadBps, lo.price, hi.price,
        (hi.price - lo.price) / lo.price
      );
      if (opps.length > 0) return opps;
    }

    console.log('[SCAN] No profitable opportunity found across any pair');
    return [];
  }

  private async _runTernaryAndReturn(
    buyPool: typeof POOL_A,
    sellPool: typeof POOL_B,
    spreadBps: number,
    buyPrice = 0,
    sellPrice = 0,
    spreadRaw = 0,
  ): Promise<ArbOpportunity[]> {
    const profitFn = async (amt: bigint): Promise<bigint> => {
      try {
        const label = `${(Number(amt)/1e6).toFixed(0)}K`;
        const buyPoolTyped  = buyPool  as typeof POOL_A;
        const sellPoolTyped = sellPool as typeof POOL_A;

        // VL-21: For inverted pools (token0=WETH), the stablecoin is token1.
        // Buy leg: stablecoin → WETH (buying cheap ETH on the buy pool)
        //   Normal pool: tokenIn=token0 (USDC), tokenOut=token1 (WETH)
        //   Inverted pool: tokenIn=token1 (USDT), tokenOut=token0 (WETH)
        const buyStable = buyPoolTyped.isInverted ? buyPoolTyped.token1 : buyPoolTyped.token0;
        const buyWeth   = buyPoolTyped.isInverted ? buyPoolTyped.token0 : buyPoolTyped.token1;
        const wethOut = await this.q2Quote(
          `buy-leg-${label}`,
          buyStable, buyWeth, amt, buyPool.fee
        );
        if (!wethOut || wethOut === 0n) return -amt;

        // Sell leg: WETH → stablecoin (selling expensive ETH on the sell pool)
        //   Normal pool: tokenIn=token1 (WETH), tokenOut=token0 (USDC)
        //   Inverted pool: tokenIn=token0 (WETH), tokenOut=token1 (USDT)
        const sellWeth   = sellPoolTyped.isInverted ? sellPoolTyped.token0 : sellPoolTyped.token1;
        const sellStable = sellPoolTyped.isInverted ? sellPoolTyped.token1 : sellPoolTyped.token0;
        const stableOut = await this.q2Quote(
          `sell-leg-${label}`,
          sellWeth, sellStable, wethOut, sellPool.fee
        );
        if (!stableOut || stableOut === 0n) return -amt;

        return stableOut - amt;
      } catch (e: any) {
        console.error(`[PROFIT FN ERR] ${e?.message?.slice(0, 80)}`);
        return -amt;
      }
    };

    // Fast-path: try 100K first
    let optAmt = BORROW;
    let optProfit = await profitFn(BORROW);

    if (optProfit <= 0n) {
      console.log(`[Q2] 100K unprofitable (${(Number(optAmt+optProfit)/1e6).toFixed(2)} USDC back) — ternary searching 1K→500K...`);
      const res = await this.ternarySearch(profitFn);
      optAmt = res.amount; optProfit = res.profit;
    }

    const backAmt = Number(optAmt + optProfit) / 1e6;
    const borrowAmt = Number(optAmt) / 1e6;
    console.log(`[Q2 DBG] borrow=${borrowAmt.toFixed(2)} USDC | back=${backAmt.toFixed(4)} USDC | profit=${(Number(optProfit)/1e6).toFixed(4)} USDC`);

    if (optProfit <= 0n) {
      console.log(`[Q2 ❌] NOT profitable — skipping execution`);
      return [];
    }

    const cbps = Math.round(Number(optProfit) / Number(optAmt) * 10_000);
    console.log(`[Q2 ✅] ${buyPool.label}→${sellPool.label} | borrow=${borrowAmt.toFixed(0)}K USDC | profit=${(Number(optProfit)/1e6).toFixed(4)} USDC | ${cbps}bps 🔥`);

    return [{
      label:              `${buyPool.label}→${sellPool.label} Q2:${cbps}bps`,
      buyPool:            buyPool as any,
      sellPool:           sellPool as any,
      buyPrice,
      sellPrice,
      spread:             spreadRaw,
      profitable:         true,
      estimatedProfitBps: cbps,
      hopCount:           2,
      optimalBorrow:      optAmt,
    }];
  }

  async getCurrentBlock(): Promise<number> {
    await this.init();
    return Number(await this.client.getBlockNumber());
  }

  async getGasPrice(): Promise<string> {
    await this.init();
    return `${(Number(await this.client.getGasPrice()) / 1e9).toFixed(1)} Gwei`;
  }
}
