/**
 * EthPoolScanner — ETH Mainnet Pool Price Scanner
 * Adapted from OptimizedPoolScanner.ts | GL-L40 | TheWarden
 * Scans UniV3 / Balancer V2 / Curve with viem + QuickNode
 */
import { createPublicClient, http, type Address, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';
import { ETH_MAINNET } from '../config/network';
import { ADDRESSES } from '../config/addresses';
import { ALL_POOLS, ARB_PAIRS, type PoolConfig } from '../config/pools';

const UNIV3_ABI = parseAbi(['function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)', 'function liquidity() view returns (uint128)']);
const BAL_ABI   = parseAbi(['function getPoolTokens(bytes32) view returns (address[],uint256[],uint256)']);
const CURVE_ABI = parseAbi(['function get_dy(int128,int128,uint256) view returns (uint256)']);

export interface PoolPrice { pool: PoolConfig; price: number; priceInv: number; liquidity: bigint; timestamp: number; }
export interface ArbOpportunity { label: string; buyPool: PoolConfig; sellPool: PoolConfig; buyPrice: number; sellPrice: number; spread: number; profitable: boolean; estimatedProfitBps: number; }

export class EthPoolScanner {
  private client   = createPublicClient({ chain: mainnet, transport: http(ETH_MAINNET.rpc.http) });
  private cache    = new Map<string, PoolPrice>();
  private CACHE    = 12_000;
  private MIN_BPS  = 10;

  async scanAll(): Promise<PoolPrice[]> {
    const out: PoolPrice[] = [];
    await Promise.allSettled(ALL_POOLS.map(async p => { const r = await this.getPrice(p); if (r) out.push(r); }));
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
      for (let i = 0; i < pp.length; i++)
        for (let j = i + 1; j < pp.length; j++) {
          const [a, b] = [pp[i], pp[j]];
          const spread = Math.abs(a.price - b.price) / Math.min(a.price, b.price);
          const bps = Math.round(spread * 10_000);
          if (bps >= this.MIN_BPS) {
            const [buy, sell] = a.price < b.price ? [a, b] : [b, a];
            opps.push({ label: pair.label, buyPool: buy.pool, sellPool: sell.pool, buyPrice: buy.price, sellPrice: sell.price, spread, profitable: bps > 30, estimatedProfitBps: Math.max(0, bps - 30) });
          }
        }
    }
    return opps.sort((a, b) => b.estimatedProfitBps - a.estimatedProfitBps);
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
    } catch (e) { console.warn(`[Scanner] ${pool.label}: ${(e as Error).message?.slice(0, 60)}`); return null; }
  }

  private async _v3(pool: PoolConfig): Promise<PoolPrice> {
    const [s0, liq] = await Promise.all([
      this.client.readContract({ address: pool.address as Address, abi: UNIV3_ABI, functionName: 'slot0' }) as Promise<any[]>,
      this.client.readContract({ address: pool.address as Address, abi: UNIV3_ABI, functionName: 'liquidity' }) as Promise<bigint>,
    ]);
    const sqrtP = BigInt(s0[0]);
    const price = Number((sqrtP * sqrtP) / (1n << 192n));
    const r: PoolPrice = { pool, price, priceInv: price > 0 ? 1 / price : 0, liquidity: liq, timestamp: Date.now() };
    this.cache.set(pool.address, r); return r;
  }

  private async _bal(pool: PoolConfig): Promise<PoolPrice> {
    if (!pool.poolId) throw new Error('Missing poolId');
    const [tokens, balances] = await this.client.readContract({ address: ADDRESSES.balancer.vault as Address, abi: BAL_ABI, functionName: 'getPoolTokens', args: [pool.poolId as `0x${string}`] }) as [string[], bigint[], bigint];
    const i0 = tokens.findIndex(t => t.toLowerCase() === pool.token0.toLowerCase());
    const i1 = tokens.findIndex(t => t.toLowerCase() === pool.token1.toLowerCase());
    const price = (i0 >= 0 && i1 >= 0 && Number(balances[i0]) > 0) ? Number(balances[i1]) / Number(balances[i0]) : 0;
    const r: PoolPrice = { pool, price, priceInv: price > 0 ? 1 / price : 0, liquidity: balances[i0] ?? 0n, timestamp: Date.now() };
    this.cache.set(pool.address, r); return r;
  }

  private async _curve(pool: PoolConfig): Promise<PoolPrice> {
    const probe = 1_000_000n;
    const dy = await this.client.readContract({ address: pool.address as Address, abi: CURVE_ABI, functionName: 'get_dy', args: [0n as any, 1n as any, probe] }) as bigint;
    const price = Number(dy) / Number(probe);
    const r: PoolPrice = { pool, price, priceInv: price > 0 ? 1 / price : 0, liquidity: dy, timestamp: Date.now() };
    this.cache.set(pool.address, r); return r;
  }

  async getCurrentBlock(): Promise<number> { return Number(await this.client.getBlockNumber()); }
  async getGasPrice(): Promise<string>     { return `${Number(await this.client.getGasPrice()) / 1e9} gwei`; }
}
