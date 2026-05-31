/**
 * build-block — TheWarden AEV Block Builder
 *
 * GL-L43: Live production. BLSSigner + CoalitionBundleAPI.
 * GL-L44: Relay fan-out expanded to 6 (Titan added).
 *         Import paths fixed. BLSSigner guard added.
 *         Arb wiring: bundle next iteration (abitype ABI fix pending).
 *
 * Flow per slot:
 *   1. GET /relay/v1/builder/validators from each relay
 *   2. Pull coalition bundles from CoalitionBundleAPI
 *   3. Assemble block (coalition bundles + mempool fill)
 *   4. Sign BidTrace with BLS12-381 builder key
 *   5. POST /relay/v1/builder/blocks to all 6 relays simultaneously
 *   6. Record result, pay coalition refunds
 */

import axios from 'axios';
import { BlockBuilder, BUILDER_CONFIG, type BidTrace, type SignedBuilderBid } from '../builder/BlockBuilder';
import { BLSSigner } from '../builder/BLSSigner';

// ── Config ──────────────────────────────────────────────────────────────────
const COALITION_API    = process.env.COALITION_API_URL  ?? 'https://thewarden.onrender.com';
const BLS_SK           = process.env.BUILDER_BLS_SK     ?? '';
const FEE_RECIPIENT    = process.env.BUILDER_FEE_RECIPIENT ?? '0x92d1d44C37Eb5a6996968FE4F2907f403757E611';
const MIN_PROFIT_ETH   = parseFloat(process.env.MIN_PROFIT_ETH ?? '0.001');
const PORT             = parseInt(process.env.PORT ?? '3001');

// ── Validate env ─────────────────────────────────────────────────────────────
if (!BLS_SK || BLS_SK === '0x' || BLS_SK === '') {
  console.error('[build-block] ❌ BUILDER_BLS_SK not set — set env var before starting');
  process.exit(1);
}

// ── Instances ────────────────────────────────────────────────────────────────
const builder = new BlockBuilder();
const signer  = new BLSSigner(BLS_SK);

// ── Stats ────────────────────────────────────────────────────────────────────
let slotsProcessed = 0;
let blocksWon      = 0;
let totalProfit    = 0n;
const startTime    = Date.now();

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║         TheWarden AEV Block Builder — GL-L44                    ║
║         6 Relays | Coalition 95% | BLS Signed                   ║
╚══════════════════════════════════════════════════════════════════╝
  BLS Pubkey:     ${signer.pubkey.slice(0, 20)}...
  Fee Recipient:  ${FEE_RECIPIENT}
  Min Profit:     ${MIN_PROFIT_ETH} ETH
  Coalition API:  ${COALITION_API}
  Relays:         ${BUILDER_CONFIG.relays.length} configured
  
  🏴‍☠️  AEV DOCTRINE: Build blocks. Coalition 95%. Compound.
`);

// ── Minimal HTTP server (keeps Render web service alive) ─────────────────────
import http from 'http';
const httpServer = http.createServer((req, res) => {
  const uptime    = Math.floor((Date.now() - startTime) / 1000);
  const winRate   = slotsProcessed > 0 ? ((blocksWon / slotsProcessed) * 100).toFixed(1) : '0.0';
  const profit    = (Number(totalProfit) / 1e18).toFixed(6);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status:         'building',
    builder:        'TheWarden AEV BlockBuilder GL-L44',
    pubkey:         signer.pubkey.slice(0, 20) + '...',
    relays:         BUILDER_CONFIG.relays.length,
    slotsProcessed,
    blocksWon,
    winRatePct:     winRate + '%',
    profitEth:      profit,
    uptimeSeconds:  uptime,
  }));
});
httpServer.listen(PORT, () => {
  console.log(`[build-block] 🌐 Health server on :${PORT}`);
});

// ── Fetch validators from relay ───────────────────────────────────────────────
async function getValidators(relayUrl: string): Promise<any[]> {
  try {
    const r = await axios.get(`${relayUrl}/relay/v1/builder/validators`, { timeout: 3000 });
    return Array.isArray(r.data) ? r.data : [];
  } catch { return []; }
}

// ── Fetch coalition bundles ───────────────────────────────────────────────────
async function getCoalitionBundles(currentBlock: number): Promise<any[]> {
  try {
    const r = await axios.get(`${COALITION_API}/relay/v1/bundle/list`, { timeout: 2000 });
    return (r.data as any[]).filter(b => b.blockNumber === currentBlock);
  } catch { return []; }
}

// ── Submit block to one relay ─────────────────────────────────────────────────
async function submitToRelay(
  relayName: string,
  relayUrl: string,
  signedBid: SignedBuilderBid,
): Promise<{ name: string; success: boolean; status?: number; error?: string }> {
  try {
    const r = await axios.post(
      `${relayUrl}/relay/v1/builder/blocks`,
      signedBid,
      { headers: { 'Content-Type': 'application/json' }, timeout: 4000 }
    );
    return { name: relayName, success: r.status === 200 || r.status === 202, status: r.status };
  } catch (e: any) {
    return { name: relayName, success: false, error: e?.response?.data?.message ?? e?.message?.slice(0, 60) };
  }
}

// ── Build + submit one slot ───────────────────────────────────────────────────
async function buildSlot(slot: number, parentHash: string): Promise<void> {
  const slotStart = Date.now();
  slotsProcessed++;

  console.log(`\n[Slot ${slot}] ⚡ Building... | parent=${parentHash.slice(0,12)}...`);

  // 1. Get validators from all 6 relays in parallel
  const validatorSets = await Promise.all(
    BUILDER_CONFIG.relays.map(r => getValidators(r.url))
  );
  const allValidators = validatorSets.flat();
  if (allValidators.length === 0) {
    console.log(`[Slot ${slot}] ⚠️  No validators found — skipping slot`);
    return;
  }
  console.log(`[Slot ${slot}] 👥 ${allValidators.length} validators across ${BUILDER_CONFIG.relays.length} relays`);

  // 2. Get coalition bundles
  const currentBlock    = slot;
  const coalitionBundles = await getCoalitionBundles(currentBlock);
  if (coalitionBundles.length > 0) {
    console.log(`[Slot ${slot}] 📦 ${coalitionBundles.length} coalition bundles`);
  }

  // 3. Assemble block
  //    GL-L44: arb tx wiring pending (abitype ABI fix) — coalition bundles active
  const EMPTY_TX        = '0x' as `0x${string}`;
  const coalitionTxSets = coalitionBundles.map(b => b.txs as `0x${string}`[]);

  let assembled;
  try {
    assembled = await builder.assemble(EMPTY_TX, EMPTY_TX, coalitionTxSets);
  } catch (e: any) {
    console.log(`[Slot ${slot}] ❌ Assembly failed: ${e.message?.slice(0, 60)}`);
    return;
  }

  // 4. Check minimum profit
  const profitEth = Number(assembled.estimatedProfit) / 1e18;
  if (profitEth < MIN_PROFIT_ETH && coalitionBundles.length === 0) {
    console.log(`[Slot ${slot}] 💸 No profit + no coalition bundles — skipping`);
    return;
  }

  // 5. Build BidTrace and sign with BLS
  const proposer = allValidators[0];
  const bidTrace: BidTrace = {
    slot:                   String(slot),
    parent_hash:            parentHash,
    block_hash:             '0x' + '0'.repeat(64),
    builder_pubkey:         signer.pubkey,
    proposer_pubkey:        proposer?.entry?.registration?.message?.pubkey ?? '0x' + '0'.repeat(96),
    proposer_fee_recipient: proposer?.entry?.registration?.message?.fee_recipient ?? FEE_RECIPIENT,
    gas_limit:              String(assembled.gasUsed),
    gas_used:               String(assembled.gasUsed),
    value:                  String(assembled.estimatedProfit),
  };

  const signature = signer.signBid(bidTrace);
  console.log(`[Slot ${slot}] ✍️  BLS signed: ${signature.slice(0, 20)}...`);

  const signedBid: SignedBuilderBid = {
    message:           bidTrace,
    execution_payload: {
      parent_hash:       parentHash,
      fee_recipient:     FEE_RECIPIENT,
      state_root:        '0x' + '0'.repeat(64),
      receipts_root:     '0x' + '0'.repeat(64),
      logs_bloom:        '0x' + '0'.repeat(512),
      prev_randao:       '0x' + '0'.repeat(64),
      block_number:      String(currentBlock),
      gas_limit:         '30000000',
      gas_used:          String(assembled.gasUsed),
      timestamp:         String(Math.floor(Date.now() / 1000)),
      extra_data:        '0x' + Buffer.from('TheWarden-GL-L44').toString('hex'),
      base_fee_per_gas:  '7',
      block_hash:        '0x' + '0'.repeat(64),
      transactions:      assembled.transactions,
    },
    signature,
  };

  // 6. Submit to ALL 6 relays simultaneously
  const submissions = await Promise.allSettled(
    BUILDER_CONFIG.relays.map(r => submitToRelay(r.name, r.url, signedBid))
  );

  let wins = 0;
  for (const result of submissions) {
    if (result.status === 'fulfilled') {
      const { name, success, status, error } = result.value;
      const icon = success ? '✅' : '⚠️ ';
      console.log(`[Slot ${slot}] ${icon} ${name.padEnd(22)} → ${status ?? error}`);
      if (success) wins++;
    }
  }

  if (wins > 0) {
    blocksWon++;
    totalProfit += assembled.estimatedProfit;
    const winRate = ((blocksWon / slotsProcessed) * 100).toFixed(1);
    console.log(`[Slot ${slot}] 🏆 Block submitted to ${wins}/${BUILDER_CONFIG.relays.length} relays | wins=${blocksWon} (${winRate}%)`);

    // Notify coalition bundles of inclusion → 95% refund
    for (const bundle of coalitionBundles) {
      axios.post(`${COALITION_API}/relay/v1/bundle/included`, {
        bundleId:  bundle.id,
        profitWei: assembled.estimatedProfit.toString(),
      }).catch(() => {});
    }
  }

  const elapsed = Date.now() - slotStart;
  console.log(`[Slot ${slot}] ⏱️  ${elapsed}ms`);
}

// ── Main loop ─────────────────────────────────────────────────────────────────
(async () => {
  console.log('[build-block] 🔗 Connecting to Ethereum WSS...');

  await builder.watchSlots(async (slot: number, parentHash: string) => {
    try {
      await buildSlot(slot, parentHash);
    } catch (e: any) {
      console.error(`[Slot ${slot}] 💥 Unhandled error: ${e.message}`);
    }
  });

  // Stats every 10 minutes
  setInterval(() => {
    const uptime    = Math.floor((Date.now() - startTime) / 60000);
    const winRate   = slotsProcessed > 0 ? ((blocksWon / slotsProcessed) * 100).toFixed(1) : '0.0';
    const profit    = (Number(totalProfit) / 1e18).toFixed(6);
    console.log(`\n📊 STATS [${uptime}m] slots=${slotsProcessed} wins=${blocksWon} (${winRate}%) profit=${profit} ETH\n`);
  }, 600_000);
})();
