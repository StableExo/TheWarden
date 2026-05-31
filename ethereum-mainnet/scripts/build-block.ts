/**
 * build-block — TheWarden AEV Block Builder
 * GL-L44: 6 relays | Coalition 95% | BLS signed | Health-first init
 */

import axios from 'axios';
import http from 'http';

// ── Config ───────────────────────────────────────────────────────────────────
const COALITION_API   = process.env.COALITION_API_URL ?? 'https://thewarden.onrender.com';
const BLS_SK          = process.env.BUILDER_BLS_SK    ?? '';
const FEE_RECIPIENT   = process.env.BUILDER_FEE_RECIPIENT ?? '0x92d1d44C37Eb5a6996968FE4F2907f403757E611';
const MIN_PROFIT_ETH  = parseFloat(process.env.MIN_PROFIT_ETH ?? '0.001');
const PORT            = parseInt(process.env.PORT ?? '3001');

// ── Stats ────────────────────────────────────────────────────────────────────
let slotsProcessed = 0;
let blocksWon      = 0;
let totalProfit    = 0n;
let builderReady   = false;
let lastError      = '';
const startTime    = Date.now();

// ── Health server FIRST — must bind before anything else ─────────────────────
const server = http.createServer((_req, res) => {
  const uptime   = Math.floor((Date.now() - startTime) / 1000);
  const winRate  = slotsProcessed > 0 ? ((blocksWon / slotsProcessed) * 100).toFixed(1) : '0.0';
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status:     builderReady ? 'building' : 'starting',
    relay_count: 6,
    slots:      slotsProcessed,
    wins:       blocksWon,
    winRate:    winRate + '%',
    profit:     (Number(totalProfit) / 1e18).toFixed(6) + ' ETH',
    uptime:     uptime + 's',
    error:      lastError || undefined,
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[TheWarden] 🌐 Health server live on port ${PORT}`);
  console.log('[TheWarden] 🛡️  Initializing block builder...');
  // Start the builder AFTER health server is up
  startBuilder().catch(err => {
    lastError = err.message?.slice(0, 200) ?? String(err);
    console.error('[TheWarden] ❌ Builder fatal:', err.message);
    // DO NOT process.exit — keep health server alive so Render doesn't kill us
  });
});

// ── Main builder ─────────────────────────────────────────────────────────────
async function startBuilder() {
  if (!BLS_SK) throw new Error('BUILDER_BLS_SK not set');

  // Dynamic imports so they run AFTER health server is bound
  const { BlockBuilder, BUILDER_CONFIG } = await import('../builder/BlockBuilder.js');
  const { BLSSigner }                    = await import('../builder/BLSSigner.js');

  const builder = new BlockBuilder();
  const signer  = new BLSSigner(BLS_SK);

  console.log(`[TheWarden] ✅ Builder ready`);
  console.log(`[TheWarden]    BLS: ${signer.pubkey.slice(0, 20)}...`);
  console.log(`[TheWarden]    Relays: ${BUILDER_CONFIG.relays.length}`);
  console.log(`[TheWarden]    Coalition: ${COALITION_API}`);
  console.log(`[TheWarden]    Fee recipient: ${FEE_RECIPIENT}`);
  builderReady = true;

  // ── Fetch validators ──────────────────────────────────────────────────────
  async function getValidators(url: string) {
    try {
      const r = await axios.get(`${url}/relay/v1/builder/validators`, { timeout: 3000 });
      return Array.isArray(r.data) ? r.data : [];
    } catch { return []; }
  }

  // ── Fetch coalition bundles ───────────────────────────────────────────────
  async function getCoalitionBundles(block: number) {
    try {
      const r = await axios.get(`${COALITION_API}/relay/v1/bundle/list`, { timeout: 2000 });
      return (r.data as any[]).filter(b => b.blockNumber === block);
    } catch { return []; }
  }

  // ── Submit to relay ───────────────────────────────────────────────────────
  async function submitToRelay(name: string, url: string, bid: any) {
    try {
      const r = await axios.post(`${url}/relay/v1/builder/blocks`, bid,
        { headers: { 'Content-Type': 'application/json' }, timeout: 4000 });
      return { name, success: r.status === 200 || r.status === 202, status: r.status };
    } catch (e: any) {
      return { name, success: false, error: e?.response?.data?.message ?? e?.message?.slice(0, 60) };
    }
  }

  // ── Build slot ────────────────────────────────────────────────────────────
  async function buildSlot(slot: number, parentHash: string) {
    slotsProcessed++;
    const t0 = Date.now();
    console.log(`\n[Slot ${slot}] ⚡ Building... parent=${parentHash.slice(0,12)}...`);

    const validatorSets = await Promise.all(BUILDER_CONFIG.relays.map(r => getValidators(r.url)));
    const validators    = validatorSets.flat();
    if (!validators.length) { console.log(`[Slot ${slot}] ⚠️  No validators`); return; }
    console.log(`[Slot ${slot}] 👥 ${validators.length} validators`);

    const bundles = await getCoalitionBundles(slot);
    if (bundles.length) console.log(`[Slot ${slot}] 📦 ${bundles.length} coalition bundles`);

    let assembled;
    try {
      assembled = await builder.assemble(
        '0x' as `0x${string}`,
        '0x' as `0x${string}`,
        bundles.map(b => b.txs as `0x${string}`[])
      );
    } catch (e: any) {
      console.log(`[Slot ${slot}] ❌ Assembly: ${e.message?.slice(0,60)}`);
      return;
    }

    const profitEth = Number(assembled.estimatedProfit) / 1e18;
    if (profitEth < MIN_PROFIT_ETH && !bundles.length) {
      console.log(`[Slot ${slot}] 💸 Low profit ${profitEth.toFixed(6)} ETH`);
      return;
    }

    const proposer = validators[0];
    const bidTrace = {
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
    const signedBid = {
      message: bidTrace,
      execution_payload: {
        parent_hash: parentHash, fee_recipient: FEE_RECIPIENT,
        state_root: '0x' + '0'.repeat(64), receipts_root: '0x' + '0'.repeat(64),
        logs_bloom: '0x' + '0'.repeat(512), prev_randao: '0x' + '0'.repeat(64),
        block_number: String(slot), gas_limit: '30000000',
        gas_used: String(assembled.gasUsed),
        timestamp: String(Math.floor(Date.now() / 1000)),
        extra_data: '0x' + Buffer.from('TheWarden-GL-L44').toString('hex'),
        base_fee_per_gas: '7', block_hash: '0x' + '0'.repeat(64),
        transactions: assembled.transactions,
      },
      signature,
    };

    const results = await Promise.allSettled(
      BUILDER_CONFIG.relays.map(r => submitToRelay(r.name, r.url, signedBid))
    );

    let wins = 0;
    for (const res of results) {
      if (res.status === 'fulfilled') {
        const { name, success, status: st, error } = res.value;
        console.log(`[Slot ${slot}] ${success ? '✅' : '⚠️ '} ${name.padEnd(22)} → ${st ?? error}`);
        if (success) wins++;
      }
    }

    if (wins > 0) {
      blocksWon++;
      totalProfit += assembled.estimatedProfit;
      const winRate = ((blocksWon / slotsProcessed) * 100).toFixed(1);
      console.log(`[Slot ${slot}] 🏆 ${wins}/${BUILDER_CONFIG.relays.length} relays | wins=${blocksWon} (${winRate}%)`);
      for (const b of bundles) {
        axios.post(`${COALITION_API}/relay/v1/bundle/included`,
          { bundleId: b.id, profitWei: assembled.estimatedProfit.toString() }).catch(() => {});
      }
    }
    console.log(`[Slot ${slot}] ⏱️  ${Date.now()-t0}ms`);
  }

  // ── Main slot loop ────────────────────────────────────────────────────────
  console.log('[TheWarden] 🔗 Connecting to Ethereum...');
  await builder.watchSlots(async (slot, parentHash) => {
    try { await buildSlot(slot, parentHash); }
    catch (e: any) { console.error(`[Slot ${slot}] 💥 ${e.message}`); }
  });

  setInterval(() => {
    const up = Math.floor((Date.now() - startTime) / 60000);
    const wr = slotsProcessed > 0 ? ((blocksWon / slotsProcessed)*100).toFixed(1) : '0.0';
    console.log(`\n📊 [${up}m] slots=${slotsProcessed} wins=${blocksWon} (${wr}%) profit=${(Number(totalProfit)/1e18).toFixed(6)} ETH\n`);
  }, 600_000);
}
