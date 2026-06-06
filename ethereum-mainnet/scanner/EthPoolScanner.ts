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
 * Total pools: 35 (27 UniV3 + 8 SushiV3 + 2 Balancer + 1 Curve 3pool)
 * Multicall3 batch: 70 calls (35 slot0 + 35 liquidity) in one round-trip
 */

import { createPublicClient, http, getAddress, type Address, parseAbi } from 'viem';
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

    let results: readonly { success: boolean; returnData: `0x${string}` }[] = [];
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

  async findOpportunities(): Promise<ArbOpportunity[]> {
    const t0 = Date.now();
    console.log('[SCAN] Starting pool scan...');
    const prices = await this.scanAll();
    console.log(`[SCAN] Got ${prices.length} pool prices in ${Date.now()-t0}ms`);
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

          // FIX: filter phantom cross-protocol arbs (denomination mismatch noise)
          const crossProto = lo.pool.protocol !== hi.pool.protocol;
          if (crossProto && bps > this.MAX_CROSS_BPS) continue;


          // GL-L53: QuoterV2 pre-flight — only push opps that will actually execute
          try {
            const QUOTER_ADDR = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';
            const QUOTER_ABI  = [{
              name: 'quoteExactInputSingle', type: 'function',
              inputs: [{ name: 'params', type: 'tuple', components: [
                { name: 'tokenIn',           type: 'address' },
                { name: 'tokenOut',          type: 'address' },
                { name: 'amountIn',          type: 'uint256' },
                { name: 'fee',               type: 'uint24'  },
                { name: 'sqrtPriceLimitX96', type: 'uint160' },
              ]}],
              outputs: [
                { name: 'amountOut',                  type: 'uint256' },
                { name: 'sqrtPriceX96After',          type: 'uint160' },
                { name: 'initializedTicksCrossed',    type: 'uint32'  },
                { name: 'gasEstimate',                type: 'uint256' },
              ],
              stateMutability: 'nonpayable',
            }] as const;
            const BORROW = 100_000_000_000n;
            const step1Result = await this.client.readContract({
              address: QUOTER_ADDR as `0x${string}`,
              abi: QUOTER_ABI, functionName: 'quoteExactInputSingle',
              args: [{ tokenIn: lo.pool.token0 as `0x${string}`, tokenOut: lo.pool.token1 as `0x${string}`, amountIn: BORROW, fee: lo.pool.fee ?? 500, sqrtPriceLimitX96: 0n }],
            ]) as readonly [bigint,bigint,number,bigint];
                        const step1Out = (step1Result as readonly [bigint,bigint,number,bigint])[0];
            if (!step1Out || step1Out === 0n) { console.log(`[Q2 ❌] ${lo.pool.protocol} ${pair.label} step1=0 no liquidity`); continue; }
            const step2Result = await this.client.readContract({
              address: QUOTER_ADDR as `0x${string}`,
              abi: QUOTER_ABI, functionName: 'quoteExactInputSingle',
              args: [{ tokenIn: hi.pool.token1 as `0x${string}`, tokenOut: hi.pool.token0 as `0x${string}`, amountIn: step1Out, fee: hi.pool.fee ?? 3000, sqrtPriceLimitX96: 0n }],
            ]) as readonly [bigint,bigint,number,bigint];
                        const step2Out = (step2Result as readonly [bigint,bigint,number,bigint])[0];
            if (!step2Out || step2Out <= BORROW) { console.log(`[Q2 ❌] step2 unprofitable: back=${(Number(step2Out||0n)/1e6).toFixed(4)} < borrow=100000`); continue; }
            const cbps = Math.round(Number(step2Out - BORROW) / Number(BORROW) * 10_000);
            console.log(`[Q2 ✅] ${pair.label} | step1=${(Number(step1Out)/1e18).toFixed(6)} WETH | back=${(Number(step2Out)/1e6).toFixed(4)} USDC | profit=${cbps}bps`);
            opps.push({
              label: `${pair.label} [${lo.pool.protocol}→${hi.pool.protocol}] Q2:${cbps}bps`,
              buyPool: lo.pool, sellPool: hi.pool,
              buyPrice: lo.price, sellPrice: hi.price, spread,
              profitable: true, estimatedProfitBps: cbps,
            });
          } catch (e: any) { console.error('[Q2 ERR]', e?.message || e); continue; }
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
          functionName: 'getPoolTokens', args: [p.poolId as `0x${string}`],
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
