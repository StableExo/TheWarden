/**
 * EthPoolScanner — ETH Mainnet Pool Price Scanner
 * GL-L42 BATCH FIX | GL-L45: SushiV3 added to Multicall3 V3 batch | TheWarden
 *
 * GL-L42 FIX: String-prefixed batch IDs to avoid QuickNode response reordering.
 * GL-L45 CHANGE: sushi-v3 pools included in Multicall3 batch (same slot0+liquidity ABI).
 *   Pool addresses factory-verified on-chain. Curve stays sequential (pool-specific ABI).
 *
 * Total: 36 pools (27 UniV3 + 9 SushiV3 + 2 Curve + 2 Balancer)
 * V3 Multicall3 batch: 36 calls (18 slot0 + 18 liquidity) in one round-trip ~250ms
 *
 * LIQUIDITY GATE: slot0() returns price even on zero-liq pools — always gate on liq > 0.
 */

import { createPublicClient, http, type Address, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { ETH_MAINNET } from '../config/network';
import { ADDRESSES } from '../config/addresses';
import { ALL_POOLS, ARB_PAIRS, type PoolConfig } from '../config/pools';

const MULTICALL3  = '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;
const SLOT0_DATA  = '0x3850c7bd' as `0x${string}`;
const LIQ_DATA    = '0x1a686502' as `0x${string}`;

const BAL_ABI   = parseAbi(['function getPoolTokens(bytes32) view returns (address[],uint256[],uint256)']);
const CURVE_ABI = parseAbi(['function get_dy(int128,int128,uint256) view returns (uint256)']);
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
  private client  = createPublicClient({ chain: mainnet, transport: http(ETH_MAINNET.rpc.http) });
  private cache   = new Map<string, PoolPrice>();
  private CACHE   = 12_000;
  private MIN_BPS = 10;

  /**
   * Multicall3 batch: slot0 + liquidity for ALL V3 pools (UniV3 + SushiV3) in ONE round-trip.
   * Curve stays sequential via getPrice() — pool-specific ABI, not worth batching.
   * Balancer uses getPoolTokens() — separate call, different ABI.
   */
  async scanAll(): Promise<PoolPrice[]> {
    // ★ GL-L45: include both uniswap-v3 AND sushi-v3 in the same Multicall3 batch
    const v3Pools    = ALL_POOLS.filter(p => p.protocol === 'uniswap-v3' || p.protocol === 'sushi-v3');
    const otherPools = ALL_POOLS.filter(p => p.protocol !== 'uniswap-v3' && p.protocol !== 'sushi-v3');

    const calls = v3Pools.flatMap(p => [
      { target: p.address as Address, allowFailure: true, callData: SLOT0_DATA },
      { target: p.address as Address, allowFailure: true, callData: LIQ_DATA   },
    ]);

    let results: readonly { success: boolean; returnData: `0x${string}` }[] = [];
    try {
      results = await this.client.readContract({
        address: MULTICALL3, abi: MULTICALL3_ABI,
        functionName: 'aggregate3', args: [calls],
      }) as any;
    } catch (e) {
      console.warn('[Scanner] Multicall3 failed, falling back', (e as Error).message?.slice(0, 40));
      return this._fallback(v3Pools, otherPools);
    }

    const out: PoolPrice[] = [];

    for (let i = 0; i < v3Pools.length; i++) {
      const s0 = results[i * 2];
      const lq = results[i * 2 + 1];
      if (!s0?.success || !lq?.success) continue;

      const sqrtP = s0.returnData?.length >= 66 ? BigInt('0x' + s0.returnData.slice(2, 66)) : 0n;
      const liq   = lq.returnData?.length >= 66  ? BigInt('0x' + lq.returnData.slice(2, 66)) : 0n;

      if (sqrtP === 0n || liq === 0n) continue;  // liquidity gate

      const price = Number((sqrtP * sqrtP) / (1n << 192n));
      if (price === 0) continue;

      const r: PoolPrice = { pool: v3Pools[i], price, priceInv: 1/price, liquidity: liq, timestamp: Date.now() };
      this.cache.set(v3Pools[i].address, r);
      out.push(r);
    }

    // Curve + Balancer: sequential (different ABIs)
    await Promise.allSettled(otherPools.map(async p => {
      const r = await this.getPrice(p);
      if (r) out.push(r);
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
          const spread   = (hi.price - lo.price) / lo.price;
          const bps      = Math.round(spread * 10_000);
          if (bps < this.MIN_BPS) continue;

          opps.push({
            label:             `${pair.label} [${lo.pool.protocol}→${hi.pool.protocol}]`,
            buyPool:           lo.pool, sellPool: hi.pool,
            buyPrice:          lo.price, sellPrice: hi.price, spread,
            profitable:        bps >= 15,
            estimatedProfitBps: bps,
          });
        }
      }
    }

    return opps.sort((a, b) => b.estimatedProfitBps - a.estimatedProfitBps);
  }

  async getPrice(p: PoolConfig): Promise<PoolPrice | null> {
    const cached = this.cache.get(p.address);
    if (cached && Date.now() - cached.timestamp < this.CACHE) return cached;

    try {
      if (p.protocol === 'uniswap-v3' || p.protocol === 'sushi-v3') {
        const [slot0, liq] = await Promise.all([
          this.client.readContract({ address: p.address as Address, abi: UNIV3_ABI, functionName: 'slot0' }),
          this.client.readContract({ address: p.address as Address, abi: UNIV3_ABI, functionName: 'liquidity' }),
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
        const [tokens, balances] = await this.client.readContract({
          address: VAULT, abi: BAL_ABI,
          functionName: 'getPoolTokens', args: [p.poolId as `0x${string}`],
        }) as [readonly Address[], readonly bigint[], bigint];
        if (!balances[0] || balances[0] === 0n) return null;
        const price = Number(balances[1]) / Number(balances[0]);
        const r: PoolPrice = { pool: p, price, priceInv: 1/price, liquidity: balances[0], timestamp: Date.now() };
        this.cache.set(p.address, r);
        return r;
      }

      if (p.protocol === 'curve') {
        const amtOut = await this.client.readContract({
          address: p.address as Address, abi: CURVE_ABI,
          functionName: 'get_dy', args: [0n, 1n, BigInt(1e6)],
        }) as bigint;
        if (amtOut === 0n) return null;
        const price = Number(amtOut) / 1e6;
        const r: PoolPrice = { pool: p, price, priceInv: 1/price, liquidity: amtOut, timestamp: Date.now() };
        this.cache.set(p.address, r);
        return r;
      }
    } catch { return null; }
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
    const gwei = Number(await this.client.getGasPrice()) / 1e9;
    return `${gwei.toFixed(1)} Gwei`;
  }
}
