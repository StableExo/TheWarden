/**
 * build-block — TheWarden AEV Block Builder
 *
 * GL-L43: Live production. BLSSigner + CoalitionBundleAPI.
 * GL-L44: Arb wired. FLASH_ABI + buildArbPath from arb.ts.
 * GL-L45: SushiV3 cross-protocol arb. dexType per step.
 *         Scanner: 36 pools (27 UniV3 + 9 SushiV3 + 2 Curve + 2 Balancer).
 * GL-L45 FIX: Removed pending block fetch from assemble() (was hanging on free tier).
 *             assemble() now takes explicit txList. No more getBlock(pending) hang.
 */

import http from 'http';
import axios from 'axios';
import {
  createPublicClient, createWalletClient, http as viemHttp,
  encodeFunctionData, parseUnits, type Address, type Hex
} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { BlockBuilder, BUILDER_CONFIG, type BidTrace, type SignedBuilderBid } from '../builder/BlockBuilder';
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

if (!BLS_SK || BLS_SK === '0x') { console.error('[build-block] ❌ BUILDER_BLS_SK not set'); process.exit(1); }
if (!PRIVATE_KEY)                { console.error('[build-block] ❌ ETH_PRIVATE_KEY not set'); process.exit(1); }

// ── Instances ─────────────────────────────────────────────────────────────────
const builder   = new BlockBuilder();
const signer    = new BLSSigner(BLS_SK);
const scanner   = new EthPoolScanner();
const account   = privateKeyToAccount(PRIVATE_KEY);
const pubClient = createPublicClient({ chain: mainnet, transport: viemHttp(ETH_MAINNET.rpc.http) });
const walClient = createWalletClient({ account, chain: mainnet, transport: viemHttp(ETH_MAINNET.rpc.http) });

let slotsProcessed = 0, blocksWon = 0, arbsInjected = 0;
let totalProfit = 0n;
const startTime = Date.now();

// ── Health server ─────────────────────────────────────────────────────────────
http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'building', builder: 'TheWarden-GL-L45',
    pubkey: signer.pubkey.slice(0, 22) + '...',
    relays: BUILDER_CONFIG.relays.length, pools: 36,
    slotsProcessed, blocksWon, arbsInjected,
    winRatePct: slotsProcessed > 0 ? ((blocksWon/slotsProcessed)*100).toFixed(1)+'%' : '0%',
    profitEth: (Number(totalProfit)/1e18).toFixed(6),
    uptimeSeconds: Math.floor((Date.now()-startTime)/1000),
  }));
}).listen(PORT, () => console.log(`[build-block] 🌐 Health: http://localhost:${PORT}`));

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║    TheWarden AEV Block Builder — GL-L45                          ║
║    6 Relays | 36 pools | SushiV3 arb | Coalition 95%            ║
╚══════════════════════════════════════════════════════════════════╝
  BLS:      ${signer.pubkey.slice(0,22)}...
  Fee:      ${FEE_RECIPIENT}
  Profits → stableexo.base.eth
`);

// ── dexType helper ─────────────────────────────────────────────────────────────
function dexTypeFor(protocol: string): 0 | 1 {
  return protocol === 'sushi-v3' ? 1 : 0;
}

// ── Build arb tx ──────────────────────────────────────────────────────────────
async function buildArbTx(opp: ArbOpportunity, slot: number): Promise<Hex | null> {
  try {
    const minFinal     = BORROW_AMOUNT * 1001n / 1000n;
    const step1DexType = dexTypeFor(opp.buyPool.protocol);
    const step2DexType = dexTypeFor(opp.sellPool.protocol);

    const path = buildArbPath(
      opp.buyPool.address,  opp.buyPool.token0,  opp.buyPool.token1,  opp.buyPool.fee  ?? 500,  0n,       step1DexType,
      opp.sellPool.address, opp.sellPool.token0, opp.sellPool.token1, opp.sellPool.fee ?? 3000, minFinal, step2DexType,
      BORROW_AMOUNT, minFinal,
    );

    const calldata = encodeFunctionData({
      abi: FLASH_ABI, functionName: 'executeArbitrage',
      args: [
        ADDRESSES.tokens.USDC as Address, BORROW_AMOUNT, path,
        0, '0x0000000000000000000000000000000000000000' as Address,
      ],
    });

    const [nonce, gasPrice] = await Promise.all([
      pubClient.getTransactionCount({ address: account.address }),
      pubClient.getGasPrice(),
    ]);

    const signedTx = await walClient.signTransaction({
      to:       '0x1F27BA663dC5233DCf2635AD295Bd42197d854A9' as Address,
      data:     calldata,
      gasPrice: gasPrice + parseUnits('2', 'gwei'),
      gas:      600_000n, nonce, chain: mainnet,
    });

    const cross = step1DexType !== step2DexType ? ' [CROSS]' : '';
    console.log(`[Slot ${slot}] ⚡ Arb signed | ${opp.label}${cross} | ${opp.estimatedProfitBps}bps`);
    arbsInjected++;
    return signedTx as Hex;
  } catch (e: any) {
    console.log(`[Slot ${slot}] ⚠️  Arb build failed: ${e.message?.slice(0, 80)}`);
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

async function submitToRelay(name: string, url: string, bid: SignedBuilderBid) {
  try {
    const r = await axios.post(`${url}/relay/v1/builder/blocks`, bid,
      { headers: { 'Content-Type': 'application/json' }, timeout: 4000 });
    return { name, success: r.status === 200 || r.status === 202, status: r.status };
  } catch (e: any) {
    return { name, success: false, error: e?.response?.data?.message ?? e?.message?.slice(0, 60) };
  }
}

// ── Build one slot ────────────────────────────────────────────────────────────
async function buildSlot(slot: number, parentHash: string): Promise<void> {
  const t0 = Date.now();
  slotsProcessed++;
  console.log(`\n[Slot ${slot}] ⚡ Building | parent=${parentHash.slice(0, 12)}...`);

  // All parallel — no serial blocking calls
  const [validatorSets, poolOpps, coalitionBundles, blockNum, gasPrice] = await Promise.all([
    Promise.all(BUILDER_CONFIG.relays.map(r => getValidators(r.url))),
    scanner.findOpportunities().catch(() => [] as ArbOpportunity[]),
    getCoalitionBundles(),
    pubClient.getBlockNumber(),
    pubClient.getGasPrice(),
  ]);

  const allValidators = validatorSets.flat();
  if (allValidators.length === 0) {
    console.log(`[Slot ${slot}] ⚠️  No validators — skipping`);
    return;
  }
  console.log(`[Slot ${slot}] 👥 ${allValidators.length}v | ${poolOpps.length} opps | ${coalitionBundles.length} bundles`);

  // Build arb tx if opportunity found
  let arbTx: Hex | null = null;
  const bestOpp = poolOpps.find(o => o.estimatedProfitBps >= MIN_POOL_BPS);
  if (bestOpp) arbTx = await buildArbTx(bestOpp, slot);

  // Assemble transaction list — no getBlock(pending) call
  const txList: Hex[] = [
    ...(arbTx ? [arbTx] : []),
    ...coalitionBundles.flatMap((b: any) => b.txs ?? [] as Hex[]),
  ];

  const estimatedProfit = arbTx
    ? BORROW_AMOUNT / 1000n                    // rough 0.1% floor
    : BigInt(coalitionBundles.length) * 1000n; // coalition value estimate

  if (txList.length === 0 && estimatedProfit < BigInt(MIN_PROFIT_ETH * 1e18)) {
    console.log(`[Slot ${slot}] 💸 Nothing to build — skipping`);
    return;
  }

  const proposer = allValidators[0];
  const gasUsed  = BigInt(txList.length) * 200_000n + 300_000n;

  const bidTrace: BidTrace = {
    slot:                   String(slot),
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
    },
    signature: signer.signBid(bidTrace),
  };

  const relayResults = await Promise.allSettled(
    BUILDER_CONFIG.relays.map(r => submitToRelay(r.name, r.url, signedBid))
  );

  let wins = 0;
  for (const res of relayResults) {
    if (res.status === 'fulfilled') {
      const { name, success, status, error } = res.value as any;
      console.log(`[Slot ${slot}] ${success ? '✅' : '⚠️ '} ${String(name).padEnd(22)} → ${status ?? error}`);
      if (success) wins++;
    }
  }

  if (wins > 0) {
    blocksWon++;
    totalProfit += estimatedProfit;
    const wr = ((blocksWon/slotsProcessed)*100).toFixed(1);
    console.log(`[Slot ${slot}] 🏆 ${wins}/${BUILDER_CONFIG.relays.length} relays | wins=${blocksWon} (${wr}%) arbs=${arbsInjected}`);
    for (const b of coalitionBundles) {
      axios.post(`${COALITION_API}/relay/v1/bundle/included`,
        { bundleId: (b as any).id, profitWei: estimatedProfit.toString() }).catch(() => {});
    }
  }

  console.log(`[Slot ${slot}] ⏱️  ${Date.now()-t0}ms`);
}

// ── Main loop ─────────────────────────────────────────────────────────────────
(async () => {
  console.log('[build-block] 🔗 Connecting to Ethereum WSS...');
  await builder.watchSlots(async (slot, parentHash) => {
    try { await buildSlot(slot, parentHash); }
    catch (e: any) { console.error(`[Slot ${slot}] 💥 ${e.message}`); }
  });

  setInterval(() => {
    const up   = Math.floor((Date.now()-startTime)/60000);
    const wr   = slotsProcessed > 0 ? ((blocksWon/slotsProcessed)*100).toFixed(1) : '0.0';
    const prof = (Number(totalProfit)/1e18).toFixed(6);
    console.log(`\n📊 [${up}m] slots=${slotsProcessed} wins=${blocksWon} (${wr}%) arbs=${arbsInjected} profit=${prof}ETH\n`);
  }, 300_000);
})();
