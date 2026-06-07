/**
 * EthPoolScanner — ETH Mainnet Pool Price Scanner
 * GL-L42 BATCH FIX | GL-L45 | TheWarden
 *
 * GL-L45 FIX 2: getAddress() normalises all pool addresses before Multicall3 call.
 *   Fixes "Address 0x7bea..." viem checksum error → scanner stays in Multicall3 fast path.
 *
 * GL-L45 FIX 3: Cross-protocol phantom arb filter.
 *   stETH/ETH Curve pool removed — get_dy(0,1,1e6) is wrong scale for ETH (18dec).
 *   Curve 3pool kept — get_dy(0,1,1e6) valid for stablecoin scale.
 *   Also added max 500bps cross-protocol spread cap to filter any future noise.
 *
 * GL-L55: findTriangularOpportunities() added.
 *   Generates all valid USDC→A→B→USDC and USDC→A→WETH→USDC 3-hop paths
 *   from ALL_POOLS. Same QuoterV2 Q2 pre-flight — only push if back > borrow.
 *   Logs every attempt: [TRI ❌] / [TRI ✅]
 *
 * Total pools: 35 (27 UniV3 + 8 SushiV3 + 2 Balancer + 1 Curve 3pool)
 * Multicall3 batch: 70 calls (35 slot0 + 35 liquidity) in one round-trip
 */

import { createPublicClient, http, getAddress, type Address, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { ETH_MAINNET } from '../config/network';
import { ADDRESSES } from '../config/addresses';
import { ALL_POOLS, ARB_PAIRS, type PoolConfig } from '../config/pools';

const MULTICALL3  = '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;
const SLOT0_DATA  = '0x3850c7bd' as Address;
const LIQ_DATA    = '0x1a686502' as Address;
const QUOTER_ADDR = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e' as Address;
const BORROW      = 100_000_000_000n; // 100K USDC (6 decimals)

const BAL_ABI   = parseAbi(['function getPoolTokens(bytes32) view returns (address[],uint256[],uint256)']);
const CURVE_ABI = parseAbi(['function get_dy(int128,int128,uint256) view returns (uint256)']);
const UNIV3_ABI = parseAbi([
  'function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)',
  'function liquidity() view returns (uint128)',
]);
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

const MULTICALL3_ABI = [{
  name: 'aggregate3',
  type: 'function',
  stateMutability: 'payable',
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

export interface PoolPrice {
  pool: PoolConfig; price: number; priceInv: number;
  liquidity: bigint; timestamp: number;
}
export interface ArbOpportunity {
  label: string; buyPool: PoolConfig; sellPool: PoolConfig;
  buyPrice: number; sellPrice: number; spread: number;
  profitable: boolean; estimatedProfitBps: number;
  // tri-arb extras (undefined for 2-hop)
  midPool?: PoolConfig;
  hopCount?: 2 | 3;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function eqAddr(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function poolsForToken(prices: PoolPrice[], token: string): PoolPrice[] {
  return prices.filter(p =>
    eqAddr(p.pool.token0, token) || eqAddr(p.pool.token1, token)
  );
}

function otherToken(pool: PoolConfig, known: string): string {
  return eqAddr(pool.token0, known) ? pool.token1 : pool.token0;
}

export class EthPoolScanner {
  private client  = createPublicClient({ chain: mainnet, transport: http(ETH_MAINNET.rpc.http) });
  private cache   = new Map<string, PoolPrice>();
  private CACHE   = 12_000;
  private MIN_BPS = 10;
  // Max spread for CROSS-protocol comparisons — >500bps almost always means denomination mismatch
  private MAX_CROSS_BPS = 500;

  async scanAll(): Promise<PoolPrice[]> {
    const v3Pools    = ALL_POOLS.filter(p => p.protocol === 'uniswap-v3' || p.protocol === 'sushi-v3');
    const otherPools = ALL_POOLS.filter(p => p.protocol !== 'uniswap-v3' && p.protocol !== 'sushi-v3');

    // FIX: getAddress() normalises EIP-55 checksum — prevents viem address errors in Multicall3
    const calls = v3Pools.flatMap(p => [
      { target: getAddress(p.address) as Address, allowFailure: true, callData: SLOT0_DATA },
      { target: getAddress(p.address) as Address, allowFailure: true, callData: LIQ_DATA   },
    ]);

    let results: readonly { success: boolean; returnData: string }[] = [];
    try {
      results = await this.client.readContract({
        address: MULTICALL3, abi: MULTICALL3_ABI,
        functionName: 'aggregate3', args: [calls],
      }) as any;
    } catch (e) {
      console.warn('[Scanner] Multicall3 failed, falling back:', (e as Error).message?.slice(0, 60));
      return this._fallback(v3Pools, otherPools);
    }

    const out: PoolPrice[] = [];

    for (let i = 0; i < v3Pools.length; i++) {
      const s0 = results[i * 2];
      const lq = results[i * 2 + 1];
      if (!s0?.success || !lq?.success) continue;

      const sqrtP = s0.returnData?.length >= 66 ? BigInt('0x' + s0.returnData.slice(2, 66)) : 0n;
      const liq   = lq.returnData?.length >= 66  ? BigInt('0x' + lq.returnData.slice(2, 66)) : 0n;
      if (sqrtP === 0n || liq === 0n) continue;

      const price = Number((sqrtP * sqrtP) / (1n << 192n));
      if (price === 0) continue;

      const r: PoolPrice = { pool: v3Pools[i], price, priceInv: 1/price, liquidity: liq, timestamp: Date.now() };
      this.cache.set(v3Pools[i].address, r);
      out.push(r);
    }

    // Curve + Balancer: sequential (different ABIs per protocol)
    await Promise.allSettled(otherPools.map(async p => {
      const r = await this.getPrice(p);
      if (r) out.push(r);
    }));

    return out;
  }

  // ── Q2 quote helper ──────────────────────────────────────────────────────────
  private async q2Quote(tokenIn: string, tokenOut: string, amountIn: bigint, fee: number): Promise<bigint> {
    const result = await this.client.readContract({
      address: QUOTER_ADDR,
      abi: QUOTER_ABI,
      functionName: 'quoteExactInputSingle',
      args: [{ tokenIn: tokenIn as Address, tokenOut: tokenOut as Address, amountIn, fee, sqrtPriceLimitX96: 0n }],
    }) as readonly [bigint, bigint, number, bigint];
    return result[0];
  }

  // ── 2-hop opportunities (original logic, untouched) ──────────────────────────
  async find2HopOpportunities(prices: PoolPrice[]): Promise<ArbOpportunity[]> {
    const opps: ArbOpportunity[] = [];

    for (const pair of ARB_PAIRS) {
      const pp = prices.filter(p =>
        (eqAddr(p.pool.token0, pair.tokenA) && eqAddr(p.pool.token1, pair.tokenB)) ||
        (eqAddr(p.pool.token0, pair.tokenB) && eqAddr(p.pool.token1, pair.tokenA)));

      for (let a = 0; a < pp.length; a++) {
        for (let b = a + 1; b < pp.length; b++) {
          const [lo, hi] = pp[a].price < pp[b].price ? [pp[a], pp[b]] : [pp[b], pp[a]];
          const spread   = (hi.price - lo.price) / lo.price;
          const bps      = Math.round(spread * 10_000);
          if (bps < this.MIN_BPS) continue;

          // FIX: filter phantom cross-protocol arbs (denomination mismatch noise)
          const crossProto = lo.pool.protocol !== hi.pool.protocol;
          if (crossProto && bps > this.MAX_CROSS_BPS) continue;

          // GL-L53: QuoterV2 pre-flight — only push opps that will actually execute
          try {
            const step1Out = await this.q2Quote(lo.pool.token0, lo.pool.token1, BORROW, lo.pool.fee ?? 500);
            if (!step1Out || step1Out === 0n) { console.log(`[Q2 ❌] ${lo.pool.protocol} ${pair.label} step1=0 no liquidity`); continue; }
            const step2Out = await this.q2Quote(hi.pool.token1, hi.pool.token0, step1Out, hi.pool.fee ?? 3000);
            if (!step2Out || step2Out <= BORROW) { console.log(`[Q2 ❌] step2 unprofitable: back=${(Number(step2Out||0n)/1e6).toFixed(4)} < borrow=100000`); continue; }
            const cbps = Math.round(Number(step2Out - BORROW) / Number(BORROW) * 10_000);
            console.log(`[Q2 ✅] ${pair.label} | step1=${(Number(step1Out)/1e18).toFixed(6)} WETH | back=${(Number(step2Out)/1e6).toFixed(4)} USDC | profit=${cbps}bps`);
            opps.push({
              label: `${pair.label} [${lo.pool.protocol}→${hi.pool.protocol}] Q2:${cbps}bps`,
              buyPool: lo.pool, sellPool: hi.pool,
              buyPrice: lo.price, sellPrice: hi.price, spread,
              profitable: true, estimatedProfitBps: cbps, hopCount: 2,
            });
          } catch (e: any) { console.error('[Q2 ERR]', e?.message || e); continue; }
        }
      }
    }
    return opps;
  }

  // ── Triangular arb opportunities (GL-L55) ───────────────────────────────────
  // Strategy: USDC → A (pool1) → B (pool2) → USDC (pool3)
  // For every intermediate token A that has a USDC pool AND a WETH pool,
  // and every intermediate token B reachable from A, try the full 3-hop chain.
  // Focus tokens: WETH, WBTC, DAI, USDT (high-liquidity, low slippage)
  async findTriangularOpportunities(prices: PoolPrice[]): Promise<ArbOpportunity[]> {
    const opps: ArbOpportunity[] = [];
    const USDC = ADDRESSES.tokens.USDC;
    const WETH = ADDRESSES.tokens.WETH;

    // Candidate mid tokens — must have at least one pool with USDC and one with WETH
    // These are the tokens where profitable tri-arb rings are most likely to form
    const midTokens = [
      ADDRESSES.tokens.WETH,
      ADDRESSES.tokens.WBTC,
      ADDRESSES.tokens.DAI,
      ADDRESSES.tokens.USDT,
      ADDRESSES.tokens.LINK,
      ADDRESSES.tokens.AAVE,
      ADDRESSES.tokens.LDO,
      ADDRESSES.tokens.cbETH,
      ADDRESSES.tokens.UNI,
      ADDRESSES.tokens.MKR,
    ];

    // Get all UniV3/SushiV3 pools from prices (can quote these)
    const v3Prices = prices.filter(p => p.pool.protocol === 'uniswap-v3' || p.pool.protocol === 'sushi-v3');

    // Build 3-hop rings: USDC → mid1 → mid2 → USDC
    // Ring types:
    //   Type 1: USDC→WETH (pool A) → X (pool B) → USDC (pool C)   [buy WETH, buy X with WETH, sell X for USDC]
    //   Type 2: USDC→X (pool A) → WETH (pool B) → USDC (pool C)   [buy X, sell X for WETH, sell WETH for USDC]
    for (const midToken of midTokens) {
      if (eqAddr(midToken, USDC)) continue;

      // Pools: USDC ↔ midToken
      const leg1Pools = v3Prices.filter(p =>
        (eqAddr(p.pool.token0, USDC) && eqAddr(p.pool.token1, midToken)) ||
        (eqAddr(p.pool.token0, midToken) && eqAddr(p.pool.token1, USDC))
      );
      if (!leg1Pools.length) continue;

      // If midToken is WETH, look for USDC→WETH→X→USDC rings
      if (eqAddr(midToken, WETH)) {
        for (const midToken2 of midTokens) {
          if (eqAddr(midToken2, USDC) || eqAddr(midToken2, WETH)) continue;

          // Leg 2: WETH → midToken2
          const leg2Pools = v3Prices.filter(p =>
            (eqAddr(p.pool.token0, WETH) && eqAddr(p.pool.token1, midToken2)) ||
            (eqAddr(p.pool.token0, midToken2) && eqAddr(p.pool.token1, WETH))
          );
          if (!leg2Pools.length) continue;

          // Leg 3: midToken2 → USDC
          const leg3Pools = v3Prices.filter(p =>
            (eqAddr(p.pool.token0, midToken2) && eqAddr(p.pool.token1, USDC)) ||
            (eqAddr(p.pool.token0, USDC)      && eqAddr(p.pool.token1, midToken2))
          );
          if (!leg3Pools.length) continue;

          // Try each combination of pools across all 3 legs
          for (const p1 of leg1Pools) {
            for (const p2 of leg2Pools) {
              for (const p3 of leg3Pools) {
                const label = `USDC→WETH→${p2.pool.label.split('/')[0]}→USDC [${p1.pool.protocol}+${p2.pool.protocol}+${p3.pool.protocol}]`;
                try {
                  // Q2 3-hop chain
                  const out1 = await this.q2Quote(USDC,       WETH,       BORROW, p1.pool.fee ?? 500);
                  if (!out1 || out1 === 0n) { console.log(`[TRI ❌] ${label} leg1=0`); continue; }
                  const out2 = await this.q2Quote(WETH,       midToken2,  out1,   p2.pool.fee ?? 3000);
                  if (!out2 || out2 === 0n) { console.log(`[TRI ❌] ${label} leg2=0`); continue; }
                  const out3 = await this.q2Quote(midToken2,  USDC,       out2,   p3.pool.fee ?? 3000);
                  if (!out3 || out3 === 0n) { console.log(`[TRI ❌] ${label} leg3=0`); continue; }

                  if (out3 <= BORROW) {
                    console.log(`[TRI ❌] ${label} back=${(Number(out3)/1e6).toFixed(4)} < 100000`);
                    continue;
                  }
                  const cbps = Math.round(Number(out3 - BORROW) / Number(BORROW) * 10_000);
                  console.log(`[TRI ✅] ${label} | out1=${(Number(out1)/1e18).toFixed(6)} WETH | out2=${(Number(out2)/1e8).toFixed(6)} | back=${(Number(out3)/1e6).toFixed(4)} USDC | profit=${cbps}bps`);
                  opps.push({
                    label:   `[TRI] ${label} Q2:${cbps}bps`,
                    buyPool: p1.pool, midPool: p2.pool, sellPool: p3.pool,
                    buyPrice: p1.price, sellPrice: p3.price,
                    spread: Number(out3 - BORROW) / Number(BORROW),
                    profitable: true, estimatedProfitBps: cbps, hopCount: 3,
                  });
                } catch (e: any) { console.error('[TRI ERR]', e?.message?.slice(0,80) || e); continue; }
              }
            }
          }
        }
      } else {
        // Type 2: USDC → midToken (non-WETH) → WETH → USDC
        // Leg 2: midToken → WETH
        const leg2Pools = v3Prices.filter(p =>
          (eqAddr(p.pool.token0, midToken) && eqAddr(p.pool.token1, WETH)) ||
          (eqAddr(p.pool.token0, WETH)     && eqAddr(p.pool.token1, midToken))
        );
        if (!leg2Pools.length) continue;

        // Leg 3: WETH → USDC
        const leg3Pools = v3Prices.filter(p =>
          (eqAddr(p.pool.token0, WETH) && eqAddr(p.pool.token1, USDC)) ||
          (eqAddr(p.pool.token0, USDC) && eqAddr(p.pool.token1, WETH))
        );
        if (!leg3Pools.length) continue;

        for (const p1 of leg1Pools) {
          for (const p2 of leg2Pools) {
            for (const p3 of leg3Pools) {
              const midLabel = p1.pool.label.split('/')[0];
              const label = `USDC→${midLabel}→WETH→USDC [${p1.pool.protocol}+${p2.pool.protocol}+${p3.pool.protocol}]`;
              try {
                const out1 = await this.q2Quote(USDC,      midToken,  BORROW, p1.pool.fee ?? 3000);
                if (!out1 || out1 === 0n) { console.log(`[TRI ❌] ${label} leg1=0`); continue; }
                const out2 = await this.q2Quote(midToken,  WETH,      out1,   p2.pool.fee ?? 3000);
                if (!out2 || out2 === 0n) { console.log(`[TRI ❌] ${label} leg2=0`); continue; }
                const out3 = await this.q2Quote(WETH,      USDC,      out2,   p3.pool.fee ?? 500);
                if (!out3 || out3 === 0n) { console.log(`[TRI ❌] ${label} leg3=0`); continue; }

                if (out3 <= BORROW) {
                  console.log(`[TRI ❌] ${label} back=${(Number(out3)/1e6).toFixed(4)} < 100000`);
                  continue;
                }
                const cbps = Math.round(Number(out3 - BORROW) / Number(BORROW) * 10_000);
                console.log(`[TRI ✅] ${label} | out1=${(Number(out1)/1e8).toFixed(6)} | out2=${(Number(out2)/1e18).toFixed(6)} WETH | back=${(Number(out3)/1e6).toFixed(4)} USDC | profit=${cbps}bps`);
                opps.push({
                  label:   `[TRI] ${label} Q2:${cbps}bps`,
                  buyPool: p1.pool, midPool: p2.pool, sellPool: p3.pool,
                  buyPrice: p1.price, sellPrice: p3.price,
                  spread: Number(out3 - BORROW) / Number(BORROW),
                  profitable: true, estimatedProfitBps: cbps, hopCount: 3,
                });
              } catch (e: any) { console.error('[TRI ERR]', e?.message?.slice(0,80) || e); continue; }
            }
          }
        }
      }
    }
    return opps;
  }

  // ── findOpportunities — runs both 2-hop AND triangular ────────────────────────
  async findOpportunities(): Promise<ArbOpportunity[]> {
    const t0 = Date.now();
    console.log('[SCAN] Starting pool scan...');
    const prices = await this.scanAll();
    console.log(`[SCAN] Got ${prices.length} pool prices in ${Date.now()-t0}ms`);

    // Run 2-hop and triangular in parallel
    const [twoHop, triHop] = await Promise.all([
      this.find2HopOpportunities(prices),
      this.findTriangularOpportunities(prices),
    ]);

    const allOpps = [...twoHop, ...triHop];
    if (twoHop.length === 0 && triHop.length === 0) {
      console.log(`[SCAN] No Q2-confirmed opportunities (2-hop: 0, tri: 0)`);
    } else {
      console.log(`[SCAN] Found ${allOpps.length} opp(s): ${twoHop.length} 2-hop, ${triHop.length} triangular`);
    }
    return allOpps.sort((a, b) => b.estimatedProfitBps - a.estimatedProfitBps);
  }

  async getPrice(p: PoolConfig): Promise<PoolPrice | null> {
    const cached = this.cache.get(p.address);
    if (cached && Date.now() - cached.timestamp < this.CACHE) return cached;

    try {
      if (p.protocol === 'uniswap-v3' || p.protocol === 'sushi-v3') {
        const addr = getAddress(p.address) as Address;
        const [slot0, liq] = await Promise.all([
          this.client.readContract({ address: addr, abi: UNIV3_ABI, functionName: 'slot0' }),
          this.client.readContract({ address: addr, abi: UNIV3_ABI, functionName: 'liquidity' }),
        ]);
        const sqrtP = (slot0 as bigint[])[0] as bigint;
        if (sqrtP === 0n || (liq as bigint) === 0n) return null;
        const price = Number((sqrtP * sqrtP) / (1n << 192n));
        const r: PoolPrice = { pool: p, price, priceInv: 1/price, liquidity: liq as bigint, timestamp: Date.now() };
        this.cache.set(p.address, r);
        return r;
      }

      if (p.protocol === 'balancer') {
        const VAULT = ADDRESSES.balancer.vault as Address;
        const [, balances] = await this.client.readContract({
          address: VAULT, abi: BAL_ABI,
          functionName: 'getPoolTokens', args: [p.poolId as Address],
        }) as [readonly Address[], readonly bigint[], bigint];
        if (!balances[0] || balances[0] === 0n) return null;
        const price = Number(balances[1]) / Number(balances[0]);
        const r: PoolPrice = { pool: p, price, priceInv: 1/price, liquidity: balances[0], timestamp: Date.now() };
        this.cache.set(p.address, r);
        return r;
      }

      if (p.protocol === 'curve') {
        // Only 3pool (stablecoin scale: 1e6 = 1 USDC) — stETH pool removed (wrong scale)
        const amtOut = await this.client.readContract({
          address: getAddress(p.address) as Address, abi: CURVE_ABI,
          functionName: 'get_dy', args: [0n, 1n, BigInt(1e6)],
        }) as bigint;
        if (amtOut === 0n) return null;
        const price = Number(amtOut) / 1e6;
        const r: PoolPrice = { pool: p, price, priceInv: 1/price, liquidity: amtOut, timestamp: Date.now() };
        this.cache.set(p.address, r);
        return r;
      }
    } catch (e: any) { console.error('[SCANNER ERR]', e?.message || e); return null; }
    return null;
  }

  private async _fallback(v3: PoolConfig[], other: PoolConfig[]): Promise<PoolPrice[]> {
    const out: PoolPrice[] = [];
    await Promise.allSettled([
      ...v3.map(async p => { const r = await this.getPrice(p); if (r) out.push(r); }),
      ...other.map(async p => { const r = await this.getPrice(p); if (r) out.push(r); }),
    ]);
    return out;
  }

  async getCurrentBlock(): Promise<number> {
    return Number(await this.client.getBlockNumber());
  }

  async getGasPrice(): Promise<string> {
    return `${(Number(await this.client.getGasPrice()) / 1e9).toFixed(1)} Gwei`;
  }
}
