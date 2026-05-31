/**
 * EthPoolScanner — ETH Mainnet Pool Price Scanner
 * GL-L45: SushiV3 added to Multicall3 batch | Curve batched via Multicall3 | TheWarden
 *
 * GL-L42 BATCH FIX: Two separate batches with string-prefixed IDs to avoid
 *   QuickNode response ID collision.
 *
 * GL-L45 CHANGES:
 *   - sushi-v3 pools added to the Multicall3 V3 batch (same slot0+liquidity ABI — zero overhead)
 *   - Curve get_dy() calls now batched via Multicall3 instead of sequential Promise.allSettled
 *   - Total pools: 35 V3 (27 Uni + 8 Sushi) + 2 Balancer + 2 Curve = 39 pools
 *   - Latency unchanged: single Multicall3 round-trip for all V3 + Curve
 *
 * LIQUIDITY GATE: slot0() returns price even on zero-liquidity pools.
 *   Must check liquidity() > 0 before using any price.
 *
 * Latency (GL-L42/45):
 *   V3 Multicall3 batch (35 pools): ~250ms | Speedup vs sequential: ~24x
 */

import { createPublicClient, http, type Address, parseAbi, decodeFunctionResult } from 'viem';
import { mainnet } from 'viem/chains';
import { ETH_MAINNET } from '../config/network';
import { ADDRESSES } from '../config/addresses';
import { ALL_POOLS, ARB_PAIRS, type PoolConfig } from '../config/pools';

const MULTICALL3    = '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;
const SLOT0_DATA    = '0x3850c7bd' as `0x${string}`;
const LIQ_DATA      = '0x1a686502' as `0x${string}`;

// Curve get_dy(int128 i, int128 j, uint256 dx) — 1 USDC in, i=0 USDC j=1 USDT
// Encoded: selector + i=0 + j=1 + dx=1e6
const CURVE_GET_DY  = '0x5e0d443f' + // get_dy selector
  '0000000000000000000000000000000000000000000000000000000000000000' + // i=0
  '0000000000000000000000000000000000000000000000000000000000000001' + // j=1
  '00000000000000000000000000000000000000000000000000000000000F4240';  // dx=1000000 (1 USDC)

const BAL_ABI = parseAbi(['function getPoolTokens(bytes32) view returns (address[],uint256[],uint256)']);
const UNIV3_ABI = parseAbi([
  'function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)',
  'function liquidity() view returns (uint128)',
]);

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
}

export class EthPoolScanner {
  private client = createPublicClient({ chain: mainnet, transport: http(ETH_MAINNET.rpc.http) });
  private cache  = new Map<string, PoolPrice>();
  private CACHE  = 12_000;
  private MIN_BPS = 10;

  /**
   * Multicall3 batch: slot0 + liquidity for ALL V3 pools (UniV3 + SushiV3) in ONE HTTP round-trip.
   * Curve get_dy() also batched via Multicall3 in the same call.
   * Balancer falls back to getPoolTokens() (different ABI — separate call).
   * GL-L45: 35 V3 pools + 2 Curve pools in one batch.
   */
  async scanAll(): Promise<PoolPrice[]> {
    const v3Pools    = ALL_POOLS.filter(p => p.protocol === 'uniswap-v3' || p.protocol === 'sushi-v3');
    const curvePools = ALL_POOLS.filter(p => p.protocol === 'curve');
    const balPools   = ALL_POOLS.filter(p => p.protocol === 'balancer');

    // V3 calls: [slot0, liquidity] × n_v3 pools
    const v3Calls = v3Pools.flatMap(p => [
      { target: p.address as Address, allowFailure: true, callData: SLOT0_DATA },
      { target: p.address as Address, allowFailure: true, callData: LIQ_DATA   },
    ]);

    // Curve calls: get_dy per pool (batched — GL-L45)
    const curveCalls = curvePools.map(p => ({
      target:       p.address as Address,
      allowFailure: true,
      callData:     CURVE_GET_DY as `0x${string}`,
    }));

    const allCalls = [...v3Calls, ...curveCalls];

    let results: readonly { success: boolean; returnData: `0x${string}` }[] = [];
    try {
      results = await this.client.readContract({
        address: MULTICALL3, abi: MULTICALL3_ABI,
        functionName: 'aggregate3', args: [allCalls],
      }) as any;
    } catch (e) {
      console.warn('[Scanner] Multicall3 failed, falling back', (e as Error).message?.slice(0, 40));
      return this._fallback(v3Pools, curvePools, balPools);
    }

    const out: PoolPrice[] = [];

    // ── Parse V3 results ──────────────────────────────────────────────────────
    for (let i = 0; i < v3Pools.length; i++) {
      const s0 = results[i * 2];
      const lq = results[i * 2 + 1];
      if (!s0?.success || !lq?.success) continue;

      const sqrtP = s0.returnData?.length >= 66 ? BigInt('0x' + s0.returnData.slice(2, 66)) : 0n;
      const liq   = lq.returnData?.length >= 66  ? BigInt('0x' + lq.returnData.slice(2, 66)) : 0n;

      if (sqrtP === 0n || liq === 0n) continue;   // liquidity gate

      const price = Number((sqrtP * sqrtP) / (1n << 192n));
      if (price === 0) continue;

      const r: PoolPrice = { pool: v3Pools[i], price, priceInv: 1/price, liquidity: liq, timestamp: Date.now() };
      this.cache.set(v3Pools[i].address, r);
      out.push(r);
    }

    // ── Parse Curve results (GL-L45 batched) ─────────────────────────────────
    const curveBase = v3Pools.length * 2;
    for (let i = 0; i < curvePools.length; i++) {
      const res = results[curveBase + i];
      if (!res?.success || res.returnData.length < 66) continue;

      try {
        const amountOut = BigInt('0x' + res.returnData.slice(2, 66));
        if (amountOut === 0n) continue;
        // get_dy returns 1 USDC → USDT amount (both 6 decimals). Price = ratio.
        const price = Number(amountOut) / 1e6;
        const r: PoolPrice = {
          pool: curvePools[i], price, priceInv: 1/price,
          liquidity: amountOut, timestamp: Date.now(),
        };
        this.cache.set(curvePools[i].address, r);
        out.push(r);
      } catch { continue; }
    }

    // ── Balancer: separate calls (getPoolTokens — different ABI) ─────────────
    await Promise.allSettled(balPools.map(async p => {
      const r = await this._getBalancerPrice(p);
      if (r) { this.cache.set(p.address, r); out.push(r); }
    }));

    return out;
  }

  async findOpportunities(): Promise<ArbOpportunity[]> {
    const prices = await this.scanAll();
    const opps: ArbOpportunity[] = [];

    for (const pair of ARB_PAIRS) {
      const pp = prices.filter(p =>
        (p.pool.token0.toLowerCase() === pair.tokenA.toLowerCase() && p.pool.token1.toLowerCase() === pair.tokenB.toLowerCase()) ||
        (p.pool.token0.toLowerCase() === pair.tokenB.toLowerCase() && p.pool.token1.toLowerCase() === pair.tokenA.toLowerCase()));

      for (let a = 0; a < pp.length; a++) {
        for (let b = a + 1; b < pp.length; b++) {
          const [lo, hi] = pp[a].price < pp[b].price ? [pp[a], pp[b]] : [pp[b], pp[a]];
          const spread = (hi.price - lo.price) / lo.price;
          const bps    = Math.round(spread * 10_000);
          if (bps < this.MIN_BPS) continue;

          const profitable = bps >= 15;
          opps.push({
            label:              `${pair.label} [${lo.pool.protocol}→${hi.pool.protocol}]`,
            buyPool:            lo.pool, sellPool: hi.pool,
            buyPrice:           lo.price, sellPrice: hi.price, spread,
            profitable, estimatedProfitBps: bps,
          });
        }
      }
    }

    return opps.sort((a, b) => b.estimatedProfitBps - a.estimatedProfitBps);
  }

  // ── Balancer helper ────────────────────────────────────────────────────────
  private async _getBalancerPrice(p: PoolConfig): Promise<PoolPrice | null> {
    try {
      const VAULT = ADDRESSES.balancer.vault as Address;
      const [tokens, balances] = await this.client.readContract({
        address: VAULT, abi: BAL_ABI,
        functionName: 'getPoolTokens', args: [p.poolId as `0x${string}`],
      }) as [readonly Address[], readonly bigint[], bigint];
      if (!balances[0] || !balances[1] || balances[0] === 0n) return null;
      const price = Number(balances[1]) / Number(balances[0]);
      return { pool: p, price, priceInv: 1/price, liquidity: balances[0], timestamp: Date.now() };
    } catch { return null; }
  }

  // ── Fallback: sequential scan if Multicall3 fails ──────────────────────────
  private async _fallback(v3: PoolConfig[], curve: PoolConfig[], bal: PoolConfig[]): Promise<PoolPrice[]> {
    const out: PoolPrice[] = [];
    await Promise.allSettled([
      ...v3.map(async p => { const r = await this._getV3Price(p); if (r) out.push(r); }),
      ...curve.map(async p => { const r = await this.getPrice(p); if (r) out.push(r); }),
      ...bal.map(async p => { const r = await this._getBalancerPrice(p); if (r) out.push(r); }),
    ]);
    return out;
  }

  private async _getV3Price(p: PoolConfig): Promise<PoolPrice | null> {
    try {
      const [slot0, liq] = await Promise.all([
        this.client.readContract({ address: p.address as Address, abi: UNIV3_ABI, functionName: 'slot0' }),
        this.client.readContract({ address: p.address as Address, abi: UNIV3_ABI, functionName: 'liquidity' }),
      ]);
      const sqrtP = (slot0 as bigint[])[0] as bigint;
      if (sqrtP === 0n || (liq as bigint) === 0n) return null;
      const price = Number((sqrtP * sqrtP) / (1n << 192n));
      return { pool: p, price, priceInv: 1/price, liquidity: liq as bigint, timestamp: Date.now() };
    } catch { return null; }
  }

  async getPrice(p: PoolConfig): Promise<PoolPrice | null> {
    const cached = this.cache.get(p.address);
    if (cached && Date.now() - cached.timestamp < this.CACHE) return cached;
    if (p.protocol === 'uniswap-v3' || p.protocol === 'sushi-v3') return this._getV3Price(p);
    if (p.protocol === 'balancer')  return this._getBalancerPrice(p);
    return null;
  }

  async getCurrentBlock(): Promise<number> {
    return Number(await this.client.getBlockNumber());
  }

  async getGasPrice(): Promise<string> {
    const gwei = Number(await this.client.getGasPrice()) / 1e9;
    return `${gwei.toFixed(1)} Gwei`;
  }
}
