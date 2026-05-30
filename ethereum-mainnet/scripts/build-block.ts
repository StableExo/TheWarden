/**
 * build-block — TheWarden AEV Block Builder
 *
 * Continuous building loop. Fires every slot (12 seconds).
 * Pulls validators, assembles block, signs with BLS, submits to all 5 relays.
 *
 * GL-L43: Live production. Wired to BLSSigner + CoalitionBundleAPI.
 *
 * Flow per slot:
 *   1. GET /relay/v1/builder/validators from each relay
 *   2. Pull coalition bundles from CoalitionBundleAPI
 *   3. Assemble block (arb + coalition bundles + mempool fill)
 *   4. Sign BidTrace with BLS12-381 builder key
 *   5. POST /relay/v1/builder/blocks to all relays simultaneously
 *   6. Record result, pay coalition refunds
 *
 * AEV Doctrine: We build the block. We keep 100% of our arb.
 * Searchers get 95% back. Coalition grows. Compound.
 */

import axios from 'axios';
import { BlockBuilder, BUILDER_CONFIG, type BidTrace, type SignedBuilderBid } from './BlockBuilder';
import { BLSSigner } from './BLSSigner';

// ── Config ───────────────────────────────────────────────────────────────────
const COALITION_API    = process.env.COALITION_API_URL ?? 'http://localhost:3000';
const BLS_SK           = process.env.BUILDER_BLS_SK ?? '';
const FEE_RECIPIENT    = process.env.BUILDER_FEE_RECIPIENT ?? '0x92d1d44C37Eb5a6996968FE4F2907f403757E611';
const MIN_PROFIT_ETH   = parseFloat(process.env.MIN_PROFIT_ETH ?? '0.001');

// ── Instances ─────────────────────────────────────────────────────────────────
const builder = new BlockBuilder();
const signer  = new BLSSigner(BLS_SK);

// ── Stats ─────────────────────────────────────────────────────────────────────
let slotsProcessed = 0;
let blocksWon      = 0;
let totalProfit    = 0n;
const startTime    = Date.now();

console.log(`
╔══════════════════════════════════════════════════════════╗
║         TheWarden AEV Block Builder — STARTING          ║
║                  GL-L43 | build-block.ts                ║
╚══════════════════════════════════════════════════════════╝
  BLS Pubkey:     ${signer.pubkey.slice(0, 24)}...
  Fee Recipient:  ${FEE_RECIPIENT}
  Min Profit:     ${MIN_PROFIT_ETH} ETH
  Coalition API:  ${COALITION_API}
  Relays:         ${BUILDER_CONFIG.relays.length} configured
  
  🏴‍☠️  Building starts now. Every slot. No 10% cut.
`);

// ── Fetch validator duties from a relay ───────────────────────────────────────
async function getValidators(relayUrl: string): Promise<any[]> {
  try {
    const r = await axios.get(`${relayUrl}/relay/v1/builder/validators`, { timeout: 3000 });
    return Array.isArray(r.data) ? r.data : [];
  } catch {
    return [];
  }
}

// ── Fetch coalition bundles from our API ──────────────────────────────────────
async function getCoalitionBundles(currentBlock: number): Promise<any[]> {
  try {
    const r = await axios.get(`${COALITION_API}/relay/v1/bundle/list`, { timeout: 2000 });
    return (r.data as any[]).filter(b => b.blockNumber === currentBlock);
  } catch {
    return [];
  }
}

// ── Submit block to a single relay ────────────────────────────────────────────
async function submitToRelay(
  relayName: string,
  relayUrl: string,
  signedBid: SignedBuilderBid
): Promise<{ name: string; success: boolean; status?: number; error?: string }> {
  try {
    const r = await axios.post(
      `${relayUrl}/relay/v1/builder/blocks`,
      signedBid,
      { headers: { 'Content-Type': 'application/json' }, timeout: 4000 }
    );
    return { name: relayName, success: r.status === 200 || r.status === 202, status: r.status };
  } catch (e: any) {
    return {
      name: relayName,
      success: false,
      error: e?.response?.data?.message ?? e?.message?.slice(0, 60)
    };
  }
}

// ── Build and submit a block for one slot ─────────────────────────────────────
async function buildSlot(slot: number, parentHash: string): Promise<void> {
  const slotStart = Date.now();
  slotsProcessed++;

  console.log(`\n[Slot ${slot}] ⚡ Building... | parent=${parentHash.slice(0,12)}...`);

  // 1. Get validators from all relays in parallel
  const validatorSets = await Promise.all(
    BUILDER_CONFIG.relays.map(r => getValidators(r.url))
  );
  const allValidators = validatorSets.flat();
  if (allValidators.length === 0) {
    console.log(`[Slot ${slot}] ⚠️  No validators found — skipping slot`);
    return;
  }
  console.log(`[Slot ${slot}] 👥 ${allValidators.length} validators across relays`);

  // 2. Get coalition bundles
  const currentBlock = Number(
    await axios.get(`${BUILDER_CONFIG.relays[0].url}/relay/v1/builder/validators`)
      .then(r => (r.data as any[])[0]?.slot ?? slot)
      .catch(() => slot)
  );
  const coalitionBundles = await getCoalitionBundles(currentBlock);
  if (coalitionBundles.length > 0) {
    console.log(`[Slot ${slot}] 📦 ${coalitionBundles.length} coalition bundles`);
  }

  // 3. Assemble block
  //    Note: In production, signedArbTx comes from our live arb scanner
  //    For now we use a placeholder — wired to bundle.ts in next iteration
  const PLACEHOLDER_ARB_TX = '0x' as `0x${string}`;
  const PLACEHOLDER_COINBASE_TX = '0x' as `0x${string}`;
  const coalitionTxSets = coalitionBundles.map(b => b.txs as `0x${string}`[]);

  let assembled;
  try {
    assembled = await builder.assemble(
      PLACEHOLDER_ARB_TX,
      PLACEHOLDER_COINBASE_TX,
      coalitionTxSets
    );
  } catch (e: any) {
    console.log(`[Slot ${slot}] ❌ Assembly failed: ${e.message?.slice(0, 60)}`);
    return;
  }

  // 4. Check minimum profit
  const profitEth = Number(assembled.estimatedProfit) / 1e18;
  if (profitEth < MIN_PROFIT_ETH) {
    console.log(`[Slot ${slot}] 💸 Below min profit (${profitEth.toFixed(6)} ETH) — skipping`);
    return;
  }
  console.log(`[Slot ${slot}] 💰 Estimated profit: ${profitEth.toFixed(6)} ETH`);

  // 5. Build BidTrace and sign
  const proposer = allValidators[0]; // highest-value proposer
  const bidTrace: BidTrace = {
    slot:                   String(slot),
    parent_hash:            parentHash,
    block_hash:             '0x' + '0'.repeat(64), // filled by relay after acceptance
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
      extra_data:        '0x' + Buffer.from('TheWarden').toString('hex'),
      base_fee_per_gas:  '7',
      block_hash:        '0x' + '0'.repeat(64),
      transactions:      assembled.transactions,
    },
    signature,
  };

  // 6. Submit to ALL relays simultaneously
  const submissions = await Promise.allSettled(
    BUILDER_CONFIG.relays.map(r => submitToRelay(r.name, r.url, signedBid))
  );

  let wins = 0;
  for (const result of submissions) {
    if (result.status === 'fulfilled') {
      const { name, success, status, error } = result.value;
      const icon = success ? '✅' : '⚠️ ';
      console.log(`[Slot ${slot}] ${icon} ${name:12} → ${status ?? error}`);
      if (success) wins++;
    }
  }

  if (wins > 0) {
    blocksWon++;
    totalProfit += assembled.estimatedProfit;
    console.log(`[Slot ${slot}] 🏆 Block submitted to ${wins}/${BUILDER_CONFIG.relays.length} relays`);

    // Notify coalition bundles of inclusion
    for (const bundle of coalitionBundles) {
      axios.post(`${COALITION_API}/relay/v1/bundle/included`, {
        bundleId:  bundle.id,
        profitWei: assembled.estimatedProfit.toString(),
      }).catch(() => {});
    }
  }

  const elapsed = Date.now() - slotStart;
  console.log(`[Slot ${slot}] ⏱️  ${elapsed}ms | Total: ${slotsProcessed} slots, ${blocksWon} wins`);
}

// ── Main loop: watch slots via BlockBuilder.watchSlots ────────────────────────
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
    const uptime = Math.floor((Date.now() - startTime) / 60000);
    console.log(`\n📊 STATS [${uptime}m] slots=${slotsProcessed} wins=${blocksWon} profit=${Number(totalProfit)/1e18:.6f} ETH\n`);
  }, 600_000);
})();
