/**
 * CexDexMonitor.ts — Real-time CEX-DEX Price Monitor
 *
 * Runs continuously via WSS newHeads subscription.
 * Fires bundle.ts when spread exceeds threshold.
 *
 * Sources:
 *   - Kraken REST  → ETH/USD reference price
 *   - QuoterV2     → exact DEX prices (Uniswap V3)
 *   - QuickNode WSS → new block trigger
 *
 * Thresholds (network.ts):
 *   cexDexFireBps = 15  →  fire when DEX diverges > 15 bps from CEX
 *   poolFireBps   = 10  →  fire on inter-pool imbalance > 10 bps
 *
 * Usage: npx tsx ethereum-mainnet/monitor/CexDexMonitor.ts
 * GL-L42 | TheWarden
 */

import { createPublicClient, http, webSocket, type Address } from 'viem';
import { mainnet } from 'viem/chains';
import { ETH_MAINNET } from '../config/network';
import { ADDRESSES } from '../config/addresses';
import { EthPoolScanner } from '../scanner/EthPoolScanner';

const QUOTER_V2     = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e' as Address;
const KRAKEN_URL    = 'https://api.kraken.com/0/public/Ticker?pair=ETHUSD';
const FIRE_CEX_BPS  = ETH_MAINNET.monitor.cexDexFireBps;
const FIRE_POOL_BPS = ETH_MAINNET.monitor.poolFireBps;
const QUOTE_AMT     = BigInt(ETH_MAINNET.monitor.quoteAmountUsdc); // 10K USDC

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
    { name: 'amountOut',         type: 'uint256' },
    { name: 'sqrtPriceX96After', type: 'uint160' },
    { name: 'initializedTicksCrossed', type: 'uint32' },
    { name: 'gasEstimate',       type: 'uint256' },
  ],
  stateMutability: 'view',
}] as const;

// ── Price fetchers ───────────────────────────────────────────────────────────

let cachedKraken = 0;
let krakenTs     = 0;

async function getKrakenEth(): Promise<number> {
  // Cache for 5 seconds to avoid hammering Kraken
  if (Date.now() - krakenTs < 5000 && cachedKraken > 0) return cachedKraken;
  try {
    const r = await fetch(KRAKEN_URL);
    const d = await r.json() as any;
    cachedKraken = parseFloat(d.result.XETHZUSD.c[0]);
    krakenTs = Date.now();
    return cachedKraken;
  } catch { return cachedKraken || 0; }
}

async function getQuote(client: any, tIn: string, tOut: string, fee: number): Promise<bigint> {
  try {
    const [amountOut] = await client.readContract({
      address: QUOTER_V2, abi: QUOTER_ABI,
      functionName: 'quoteExactInputSingle',
      args: [{ tokenIn: tIn, tokenOut: tOut, amountIn: QUOTE_AMT, fee, sqrtPriceLimitX96: 0n }],
    });
    return amountOut;
  } catch { return 0n; }
}

// ── Main monitor ─────────────────────────────────────────────────────────────
async function onBlock(blockNumber: bigint, client: any, scanner: EthPoolScanner) {
  const t0 = Date.now();

  // Fetch all prices in parallel
  const [ethCex, weth5, weth30] = await Promise.all([
    getKrakenEth(),
    getQuote(client, ADDRESSES.tokens.USDC, ADDRESSES.tokens.WETH, 500),
    getQuote(client, ADDRESSES.tokens.USDC, ADDRESSES.tokens.WETH, 3000),
  ]);

  const usdc10K  = Number(QUOTE_AMT) / 1e6;
  const dex5     = weth5  > 0n ? usdc10K / (Number(weth5)  / 1e18) : 0;
  const dex30    = weth30 > 0n ? usdc10K / (Number(weth30) / 1e18) : 0;
  const spread5  = ethCex > 0 ? (dex5  - ethCex) / ethCex * 10000 : 0;
  const spread30 = ethCex > 0 ? (dex30 - ethCex) / ethCex * 10000 : 0;
  const poolGap  = dex5 > 0 && dex30 > 0 ? Math.abs(dex5 - dex30) / Math.min(dex5, dex30) * 10000 : 0;

  const latency  = Date.now() - t0;
  const fire     = Math.abs(spread5) >= FIRE_CEX_BPS || poolGap >= FIRE_POOL_BPS;
  const icon     = fire ? '🔥' : (Math.abs(spread5) > 8 ? '⚡' : '✅');

  console.log(
    `${icon} Block ${blockNumber} | ${latency}ms | ` +
    `CEX=$${ethCex.toFixed(2)} | ` +
    `DEX-5=${spread5 > 0 ? '+' : ''}${spread5.toFixed(1)}bps | ` +
    `pool-Δ=${poolGap.toFixed(1)}bps`
  );

  if (fire) {
    console.log('\n  🚀 THRESHOLD HIT — launching bundle.ts');
    // In production: spawn bundle.ts as child process or call inline
    // exec('npx tsx ethereum-mainnet/scripts/bundle.ts');
    // For now: log the opportunity details
    if (Math.abs(spread5) >= FIRE_CEX_BPS) {
      const dir = spread5 > 0 ? 'DEX expensive vs CEX' : 'DEX cheap vs CEX';
      console.log(`  📊 CEX-DEX: ${Math.abs(spread5).toFixed(1)} bps — ${dir}`);
      console.log(`  💰 Est. profit @$1M: ~$${(1_000_000 * Math.abs(spread5)/10000).toFixed(0)}`);
    }
    if (poolGap >= FIRE_POOL_BPS) {
      console.log(`  📊 Pool gap: ${poolGap.toFixed(1)} bps between 0.05% and 0.30% pools`);
    }
    console.log();
  }
}

async function main() {
  console.log('\n⚡ CEX-DEX MONITOR — GL-L42');
  console.log('='.repeat(52));
  console.log(`  Fire threshold: CEX-DEX > ${FIRE_CEX_BPS} bps | Pool > ${FIRE_POOL_BPS} bps`);
  console.log(`  Builders: Quasar + Titan + bloXroute\n');

  const httpClient = createPublicClient({ chain: mainnet, transport: http(ETH_MAINNET.rpc.http) });
  const wssClient  = createPublicClient({ chain: mainnet, transport: webSocket(ETH_MAINNET.rpc.wss) });
  const scanner    = new EthPoolScanner();

  // Subscribe to new block headers via WSS
  await wssClient.watchBlockNumber({
    onBlockNumber: (blockNumber) => {
      onBlock(blockNumber, httpClient, scanner).catch(console.error);
    },
  });

  console.log('  WSS subscription active — watching every block...');
}

main().catch(console.error);
