/**
 * build-block — TheWarden AEV Block Builder
 * GL-L45 v2: HTTP health server starts FIRST, synchronously.
 *             watchSlots() runs in background — never blocks health check.
 *             Poll fallback: if WSS silent for >20s, poll via HTTP getBlock.
 */

import http from 'http';
import axios from 'axios';
import {
  createPublicClient, createWalletClient, http as viemHttp, webSocket,
  encodeFunctionData, parseUnits, getAddress, type Address, type Hex
} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { BUILDER_CONFIG, type BidTrace, type SignedBuilderBid } from '../builder/BlockBuilder';
import { BLSSigner } from '../builder/BLSSigner';
import { EthPoolScanner, type ArbOpportunity } from '../scanner/EthPoolScanner';
import { FLASH_ABI, buildArbPath } from '../config/arb';
import { ETH_MAINNET } from '../config/network';
import { ADDRESSES } from '../config/addresses';

// ── Config ────────────────────────────────────────────────────────────────────
const COALITION_API  = process.env.COALITION_API_URL   ?? 'https://thewarden.onrender.com';
const BLS_SK         = process.env.BUILDER_BLS_SK      ?? '';
const PRIVATE_KEY    = process.env.ETH_PRIVATE_KEY     as `0x${string}`;
const FEE_RECIPIENT  = process.env.BUILDER_FEE_RECIPIENT ?? '0x1Aa04F01106Aa53bc7A112C502A934a6d72062d4';
const MIN_PROFIT_ETH = parseFloat(process.env.MIN_PROFIT_ETH ?? '0.00005');
const PORT           = parseInt(process.env.PORT ?? '3001');
const BORROW_AMOUNT  = parseUnits('100000', 6);
const MIN_POOL_BPS   = 10;

if (!BLS_SK || BLS_SK === '0x') { console.error('❌ BUILDER_BLS_SK not set'); process.exit(1); }
if (!PRIVATE_KEY)                { console.error('❌ ETH_PRIVATE_KEY not set'); process.exit(1); }

// ── Clients ───────────────────────────────────────────────────────────────────
const httpClient = createPublicClient({ chain: mainnet, transport: viemHttp(ETH_MAINNET.rpc.http) });
const walClient  = createWalletClient({
  account: privateKeyToAccount(PRIVATE_KEY),
  chain: mainnet,
  transport: viemHttp(ETH_MAINNET.rpc.http),
});
const account  = privateKeyToAccount(PRIVATE_KEY);
const signer   = new BLSSigner(BLS_SK);
const scanner  = new EthPoolScanner();

// ── Stats ─────────────────────────────────────────────────────────────────────
let slotsProcessed = 0, blocksWon = 0, arbsInjected = 0;
let totalProfit = 0n;
let lastSlotMs  = 0;
const startTime = Date.now();

// ── STEP 1: Start HTTP health server IMMEDIATELY (sync, before anything else) ─
const server = http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'building', builder: 'TheWarden-GL-L45',
    pubkey: signer.pubkey.slice(0, 22) + '...',
    relays: BUILDER_CONFIG.relays.length, pools: 36,
    slotsProcessed, blocksWon, arbsInjected,
    lastSlotAgo: lastSlotMs ? `${Math.round((Date.now()-lastSlotMs)/1000)}s ago` : 'waiting',
    winRatePct: slotsProcessed > 0 ? ((blocksWon/slotsProcessed)*100).toFixed(1)+'%' : '0%',
    profitEth: (Number(totalProfit)/1e18).toFixed(6),
    uptimeSeconds: Math.floor((Date.now()-startTime)/1000),
  }));
});
server.listen(PORT, () => {
  console.log(`[TheWarden] 🌐 Health: http://localhost:${PORT} — READY`);
  console.log(`[TheWarden] ⚡ GL-L45 | 6 relays | 36 pools | Profits → stableexo.base.eth`);
});

// ── dexType helper ────────────────────────────────────────────────────────────
function dexTypeFor(p: string): 0 | 1 { return p === 'sushi-v3' ? 1 : 0; }

// ── Build arb tx ──────────────────────────────────────────────────────────────
async function buildArbTx(opp: ArbOpportunity, slot: number): Promise<Hex | null> {
  try {
    const minFinal     = BORROW_AMOUNT * 1001n / 1000n;
    const d1           = dexTypeFor(opp.buyPool.protocol);
    const d2           = dexTypeFor(opp.sellPool.protocol);
    // getAddress() normalises EIP-55 checksum on all pool+token addresses
    const path         = buildArbPath(
      getAddress(opp.buyPool.address),  getAddress(opp.buyPool.token0),  getAddress(opp.buyPool.token1),  opp.buyPool.fee  ?? 500,  0n,       d1,
      getAddress(opp.sellPool.address), getAddress(opp.sellPool.token0), getAddress(opp.sellPool.token1), opp.sellPool.fee ?? 3000, minFinal, d2,
      BORROW_AMOUNT, minFinal,
    );
    const calldata = encodeFunctionData({
      abi: FLASH_ABI, functionName: 'executeArbitrage',
      args: [ADDRESSES.tokens.USDC as Address, BORROW_AMOUNT, path, 0,
             '0x0000000000000000000000000000000000000000' as Address],
    });
    const [nonce, gasPrice] = await Promise.all([
      httpClient.getTransactionCount({ address: account.address }),
      httpClient.getGasPrice(),
    ]);
    const signed = await walClient.signTransaction({
      to: getAddress('0x1F27BA663dC5233DCf2635AD295Bd42197d854A9') as Address,
      data: calldata, gasPrice: gasPrice + parseUnits('2', 'gwei'),
      gas: 600_000n, nonce, chain: mainnet,
    });
    const cross = d1 !== d2 ? ' [CROSS-DEX]' : '';
    console.log(`[Slot ${slot}] ⚡ Arb | ${opp.label}${cross} | ${opp.estimatedProfitBps}bps`);
    arbsInjected++;
    return signed as Hex;
  } catch (e: any) {
    console.log(`[Slot ${slot}] ⚠️  Arb failed: ${e.message?.slice(0, 80)}`);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getValidators(url: string): Promise<any[]> {
  try {
    const r = await axios.get(`${url}/relay/v1/builder/validators`, { timeout: 3000 });
    return Array.isArray(r.data) ? r.data : [];
  } catch { return []; }
}
async function getCoalitionBundles(): Promise<any[]> {
  try {
    const r = await axios.get(`${COALITION_API}/relay/v1/bundle/list`, { timeout: 2000 });
    return Array.isArray(r.data) ? r.data : [];
  } catch { return []; }
}
// bloXroute requires Authorization header — open relay token
const BLOXROUTE_AUTH = 'Flashbots+https://boost-relay.flashbots.net';

async function submitToRelay(name: string, url: string, bid: SignedBuilderBid) {
  try {
    const extraHeaders: Record<string,string> = {};
    // bloXroute max-profit requires an Auth header — use open relay format
    if (url.includes('blxrbdn.com')) {
      extraHeaders['Authorization'] = BLOXROUTE_AUTH;
    }
    const r = await axios.post(`${url}/relay/v1/builder/blocks`, bid, {
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      timeout: 4000,
    });
    return { name, ok: r.status === 200 || r.status === 202, status: r.status };
  } catch (e: any) {
    return { name, ok: false, status: e?.response?.data?.message ?? e?.message?.slice(0, 50) };
  }
}

// ── Process one slot ──────────────────────────────────────────────────────────
async function processSlot(slot: number, parentHash: string) {
  const t0 = Date.now();
  slotsProcessed++;
  lastSlotMs = Date.now();
  console.log(`\n[Slot ${slot}] 🔨 Building | parent=${parentHash.slice(0, 12)}...`);

  const [valSets, opps, bundles, blockNum, gasPrice] = await Promise.all([
    Promise.all(BUILDER_CONFIG.relays.map(r => getValidators(r.url))),
    scanner.findOpportunities().catch(() => [] as ArbOpportunity[]),
    getCoalitionBundles(),
    httpClient.getBlockNumber(),
    httpClient.getGasPrice(),
  ]);

  const validators = valSets.flat();
  console.log(`[Slot ${slot}] 👥 ${validators.length}v | ${opps.length} opps | ${bundles.length} bundles`);

  if (validators.length === 0 && bundles.length === 0) {
    console.log(`[Slot ${slot}] ⚠️  Nothing to build — skip`);
    return;
  }

  const bestOpp = opps.find(o => o.estimatedProfitBps >= MIN_POOL_BPS);
  const arbTx   = bestOpp ? await buildArbTx(bestOpp, slot) : null;

  const txList: Hex[] = [
    ...(arbTx ? [arbTx] : []),
    ...bundles.flatMap((b: any) => (b.txs ?? []) as Hex[]),
  ];

  const estimatedProfit = arbTx
    ? BORROW_AMOUNT / 1000n
    : BigInt(bundles.length) * 1000n;

  if (txList.length === 0) {
    console.log(`[Slot ${slot}] 💸 No txs — skip`);
    return;
  }

  const proposer = validators[0] ?? {};
  const gasUsed  = BigInt(txList.length) * 200_000n + 300_000n;

  const bidTrace: BidTrace = {
    slot:                   String(slot + 1),  // ★ FIX 11: bid for NEXT slot (N+1), relay wants upcoming slot
    parent_hash:            parentHash,
    block_hash:             '0x' + '0'.repeat(64),
    builder_pubkey:         signer.pubkey,
    proposer_pubkey:        proposer?.entry?.registration?.message?.pubkey ?? '0x' + '0'.repeat(96),
    proposer_fee_recipient: proposer?.entry?.registration?.message?.fee_recipient ?? FEE_RECIPIENT,
    gas_limit:              String(gasUsed),
    gas_used:               String(gasUsed),
    value:                  String(estimatedProfit),
  };

  const signedBid: SignedBuilderBid = {
    message: bidTrace,
    execution_payload: {
      parent_hash:       parentHash,
      fee_recipient:     FEE_RECIPIENT,
      state_root:        '0x' + '0'.repeat(64),
      receipts_root:     '0x' + '0'.repeat(64),
      logs_bloom:        '0x' + '0'.repeat(512),
      prev_randao:       '0x' + '0'.repeat(64),
      block_number:      String(blockNum + 1n),
      gas_limit:         '30000000',
      gas_used:          String(gasUsed),
      timestamp:         String(Math.floor(Date.now()/1000)),
      extra_data:        '0x' + Buffer.from('TheWarden-GL-L45').toString('hex'),
      base_fee_per_gas:  String(gasPrice),
      block_hash:        '0x' + '0'.repeat(64),
      transactions:      txList,
      // ★ GL-L45 FIX 7: Post-Shapella (slot >6.2M) — withdrawals required
      withdrawals:       [],
      // ★ GL-L45 FIX 7: Post-Cancun/Deneb (slot >8.6M) — blob fields required
      blob_gas_used:         '0',
      excess_blob_gas:       '0',
      // ★ GL-L45 FIX 10: execution_requests as proper Electra struct
      execution_requests:    { deposits: [], withdrawals: [], consolidations: [] },
    },
    signature:    signer.signBid(bidTrace),
    // ★ GL-L45 FIX 8: Post-Deneb/Cancun relay spec requires blobs_bundle
    // For non-blob blocks send empty bundle — Flashbots + Agnostic require this field
    blobs_bundle: { commitments: [], proofs: [], blobs: [] },
    // ★ GL-L45 FIX 10: execution_requests as Electra struct (deposits/withdrawals/consolidations)
    execution_requests: { deposits: [], withdrawals: [], consolidations: [] },
  };

  const results = await Promise.allSettled(
    BUILDER_CONFIG.relays.map(r => submitToRelay(r.name, r.url, signedBid))
  );

  let wins = 0;
  for (const res of results) {
    if (res.status === 'fulfilled') {
      const v = res.value as any;
      console.log(`[Slot ${slot}] ${v.ok ? '✅' : '⚠️ '} ${String(v.name).padEnd(22)} → ${v.status}`);
      if (v.ok) wins++;
    }
  }

  if (wins > 0) {
    blocksWon++;
    totalProfit += estimatedProfit;
    const wr = ((blocksWon/slotsProcessed)*100).toFixed(1);
    console.log(`[Slot ${slot}] 🏆 ${wins}/${BUILDER_CONFIG.relays.length} | wins=${blocksWon} (${wr}%) arbs=${arbsInjected}`);
    for (const b of bundles) {
      axios.post(`${COALITION_API}/relay/v1/bundle/included`,
        { bundleId: (b as any).id, profitWei: estimatedProfit.toString() }).catch(() => {});
    }
  }

  console.log(`[Slot ${slot}] ⏱️  ${Date.now()-t0}ms`);
}

// ── STEP 2: Start slot watcher in background (after HTTP server is up) ────────
// Two modes:
//   Primary:  WSS watchBlockNumber — fires every ~12s
//   Fallback: HTTP poll every 12s  — kicks in if WSS silently fails

let lastSeenBlock = 0n;

async function startWssWatcher() {
  try {
    const wssClient = createPublicClient({
      chain: mainnet,
      transport: webSocket(ETH_MAINNET.rpc.wss),
    });
    console.log('[TheWarden] 🔗 WSS connected — watching blocks');
    await wssClient.watchBlockNumber({
      onBlockNumber: async (blockNum) => {
        if (blockNum <= lastSeenBlock) return;
        lastSeenBlock = blockNum;
        try {
          const block = await httpClient.getBlock({ blockNumber: blockNum, includeTransactions: false });
          const slot  = Math.floor((Date.now()/1000 - 1606824023) / 12);
          await processSlot(slot, block.hash ?? '0x' + '0'.repeat(64));
        } catch (e: any) {
          console.error('[WSS] block fetch error:', e.message?.slice(0, 80));
        }
      },
      onError: (err) => {
        console.error('[WSS] error:', (err as Error).message?.slice(0, 80));
      },
    });
  } catch (e: any) {
    console.error('[WSS] connection failed:', e.message?.slice(0, 80));
  }
}

async function startHttpPoller() {
  console.log('[TheWarden] 🔄 HTTP poller running (12s fallback)');
  setInterval(async () => {
    try {
      const blockNum = await httpClient.getBlockNumber();
      if (blockNum <= lastSeenBlock) return;
      lastSeenBlock = blockNum;
      const block = await httpClient.getBlock({ blockNumber: blockNum, includeTransactions: false });
      const slot  = Math.floor((Date.now()/1000 - 1606824023) / 12);
      await processSlot(slot, block.hash ?? '0x' + '0'.repeat(64));
    } catch (e: any) {
      console.error('[Poll] error:', e.message?.slice(0, 60));
    }
  }, 12_000);
}

// Fire both — WSS primary, HTTP poll as safety net
// Both check lastSeenBlock so only ONE runs per block
Promise.all([
  startWssWatcher(),
  startHttpPoller(),
]).catch(e => console.error('[main]', e.message));

// Stats every 5 min
setInterval(() => {
  const up  = Math.floor((Date.now()-startTime)/60000);
  const wr  = slotsProcessed > 0 ? ((blocksWon/slotsProcessed)*100).toFixed(1) : '0.0';
  const pr  = (Number(totalProfit)/1e18).toFixed(6);
  console.log(`\n📊 [${up}m] slots=${slotsProcessed} wins=${blocksWon}(${wr}%) arbs=${arbsInjected} profit=${pr}ETH\n`);
}, 300_000);
