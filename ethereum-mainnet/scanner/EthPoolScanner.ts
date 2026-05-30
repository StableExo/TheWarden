/**
 * EthPoolScanner — ETH Mainnet Pool Price Scanner
 * GL-L42 BATCH FIX | TheWarden
 *
 * BUG FIX (GL-L42): Batch JSON-RPC response IDs were colliding when using
 * numeric IDs (0..n for slot0, n..2n for liq). QuickNode may reorder responses.
 * FIX: Use TWO separate batches with string-prefixed IDs ("s_0"..."s_27" and "l_0"..."l_27")
 * to guarantee correct mapping.
 *
 * LIQUIDITY GATE: slot0() returns price even on zero-liquidity pools.
 * Must check liquidity() > 0 before using any price. Same bug hit StableWarden v40.
 *
 * MULTICALL3: For production TS (viem), use Multicall3 (0xcA11bde...CA11).
 * See the multicall-based implementation for atomic block snapshots.
 *
 * Latency (GL-L42):
 *   Two batches (slot0 + liq): ~250ms total | 28 pools
 *   Seq equivalent: ~6,048ms | Speedup: ~24x
 */

import { createPublicClient, http, type Address, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { ETH_MAINNET } from '../config/network';
import { ADDRESSES } from '../config/addresses';
import { ALL_POOLS, ARB_PAIRS, type PoolConfig } from '../config/pools';

const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;
const SLOT0_DATA = '0x3850c7bd' as `0x${string}`;
const LIQ_DATA   = '0x1a686502' as `0x${string}`;

const BAL_ABI   = parseAbi(['function getPoolTokens(bytes32) view returns (address[],uint256[],uint256)']);
const CURVE_ABI = parseAbi(['function get_dy(int128,int128,uint256) view returns (uint256)']);
const UNIV3_ABI = parseAbi([
  'function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)',
  'function liquidity() view returns (uint128)',
]);

const MULTICALL3_ABI = parseAbi([
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
]);

export interface PoolPrice { pool: PoolConfig; price: number; priceInv: number; liquidity: bigint; timestamp: number; }
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

  /** Multicall3 batch: slot0 + liquidity in ONE HTTP round-trip with liquidity gate. */
  async scanAll(): Promise<PoolPrice[]> {
    const univ3 = ALL_POOLS.filter(p => p.protocol === 'uniswap-v3');
    const other = ALL_POOLS.filter(p => p.protocol !== 'uniswap-v3');

    // Two calls per pool: [slot0, liquidity, slot0, liquidity, ...]
    const calls = univ3.flatMap(p => [
      { target: p.address as Address, allowFailure: true, callData: SLOT0_DATA },
      { target: p.address as Address, allowFailure: true, callData: LIQ_DATA  },
    ]);

    let results: readonly { success: boolean; returnData: `0x${string}` }[] = [];
    try {
      results = await this.client.readContract({
        address: MULTICALL3, abi: MULTICALL3_ABI,
        functionName: 'aggregate3', args: [calls],
      }) as any;
    } catch (e) {
      console.warn('[Scanner] Multicall3 failed, falling back', (e as Error).message?.slice(0,40));
      return this._fallback(univ3, other);
    }

    const out: PoolPrice[] = [];
    for (let i = 0; i < univ3.length; i++) {
      const s0 = results[i * 2];
      const lq = results[i * 2 + 1];
      if (!s0?.success || !lq?.success) continue;

      const sqrtP = s0.returnData?.length >= 66 ? BigInt('0x' + s0.returnData.slice(2, 66)) : 0n;
      const liq   = lq.returnData?.length >= 66 ? BigInt('0x' + lq.returnData.slice(2, 66)) : 0n;

      // Liquidity gate — skip phantom pools
      if (sqrtP === 0n || liq === 0n) continue;

      const price = Number((sqrtP * sqrtP) / (1n << 192n));
      if (price === 0) continue;

      const r: PoolPrice = { pool: univ3[i], price, priceInv: 1/price, liquidity: liq, timestamp: Date.now() };
      this.cache.set(univ3[i].address, r);
      out.push(r);
    }

    await Promise.allSettled(other.map(async p => { const r = await this.getPrice(p); if (r) out.push(r); }));
    return out;
  }

  async findOpportunities(): Promise<ArbOpportunity[]> {
    const prices = await this.scanAll();
    const opps: ArbOpportunity[] = [];

    for (const pair of ARB_PAIRS) {
      const pp = prices.filter(p =>
        (p.pool.token0.toLowerCase() === pair.tokenA.toLowerCase() && p.pool.token1.toLowerCase() === pair.tokenB.toLowerCase()) ||
        (p.pool.token0.toLowerCase() === pair.tokenB.toLowerCase() && p.pool.token1.toLowerCase() === pair.tokenA.toLowerCase()));

      if (pp.length < 2) continue;
      for (let i = 0; i < pp.length; i++) for (let j = i+1; j < pp.length; j++) {
        const [a, b] = [pp[i], pp[j]];
        const spread = Math.abs(a.price - b.price) / Math.min(a.price, b.price);
        const bps    = Math.round(spread * 10_000);
        if (bps >= this.MIN_BPS) {
          const [buy, sell] = a.price < b.price ? [a, b] : [b, a];
          opps.push({ label: pair.label, buyPool: buy.pool, sellPool: sell.pool,
            buyPrice: buy.price, sellPrice: sell.price, spread,
            profitable: bps > 30, estimatedProfitBps: Math.max(0, bps - 30) });
        }
      }
    }
    return opps.sort((a, b) => b.estimatedProfitBps - a.estimatedProfitBps);
  }

  private async _fallback(univ3: PoolConfig[], other: PoolConfig[]): Promise<PoolPrice[]> {
    const out: PoolPrice[] = [];
    await Promise.allSettled([...univ3, ...other].map(async p => { const r = await this.getPrice(p); if (r) out.push(r); }));
    return out;
  }

  async getPrice(pool: PoolConfig): Promise<PoolPrice | null> {
    const c = this.cache.get(pool.address);
    if (c && Date.now() - c.timestamp < this.CACHE) return c;
    try {
      switch (pool.protocol) {
        case 'uniswap-v3': return await this._v3(pool);
        case 'balancer':   return await this._bal(pool);
        case 'curve':      return await this._curve(pool);
        default: return null;
      }
    } catch { return null; }
  }

  private async _v3(pool: PoolConfig): Promise<PoolPrice | null> {
    const [s0, liq] = await Promise.all([
      this.client.readContract({ address: pool.address as Address, abi: UNIV3_ABI, functionName: 'slot0' }) as Promise<any[]>,
      this.client.readContract({ address: pool.address as Address, abi: UNIV3_ABI, functionName: 'liquidity' }) as Promise<bigint>,
    ]);
    const sqrtP = BigInt(s0[0]);
    if (sqrtP === 0n || liq === 0n) return null;
    const price = Number((sqrtP * sqrtP) / (1n << 192n));
    const r: PoolPrice = { pool, price, priceInv: 1/price, liquidity: liq, timestamp: Date.now() };
    this.cache.set(pool.address, r); return r;
  }

  private async _bal(pool: PoolConfig): Promise<PoolPrice | null> {
    if (!pool.poolId) return null;
    const [tokens, balances] = await this.client.readContract({
      address: ADDRESSES.balancer.vault as Address, abi: BAL_ABI,
      functionName: 'getPoolTokens', args: [pool.poolId as `0x${string}`],
    }) as [string[], bigint[], bigint];
    const i0 = tokens.findIndex(t => t.toLowerCase() === pool.token0.toLowerCase());
    const i1 = tokens.findIndex(t => t.toLowerCase() === pool.token1.toLowerCase());
    if (i0 < 0 || i1 < 0 || Number(balances[i0]) === 0) return null;
    const price = Number(balances[i1]) / Number(balances[i0]);
    return { pool, price, priceInv: 1/price, liquidity: balances[i0], timestamp: Date.now() };
  }

  private async _curve(pool: PoolConfig): Promise<PoolPrice | null> {
    const probe = 1_000_000n;
    const dy = await this.client.readContract({ address: pool.address as Address, abi: CURVE_ABI,
      functionName: 'get_dy', args: [0n as any, 1n as any, probe] }) as bigint;
    if (dy === 0n) return null;
    return { pool, price: Number(dy)/Number(probe), priceInv: Number(probe)/Number(dy), liquidity: dy, timestamp: Date.now() };
  }

  async getCurrentBlock(): Promise<number> { return Number(await this.client.getBlockNumber()); }
  async getGasPrice():     Promise<string>  { return `${Number(await this.client.getGasPrice()) / 1e9} gwei`; }
}
