/**
 * build-block — TheWarden AEV Block Builder
 *
 * GL-L43: Live production. BLSSigner + CoalitionBundleAPI.
 * GL-L44: Arb wired. FLASH_ABI + buildArbPath imported from bundle.ts.
 *         EthPoolScanner.findOpportunities() runs every slot.
 *         6 relays: Flashbots, UltraSound, Aestus, bloXroute, Agnostic, Titan.
 *
 * Flow per slot:
 *   1. GET validators from 6 relays
 *   2. EthPoolScanner.findOpportunities() — scan 27 pools via Multicall3
 *   3. If opportunity ≥ MIN_POOL_BPS: build executeArbitrage calldata
 *   4. Sign arb tx (not broadcast — injected top-of-block)
 *   5. Pull coalition bundles from CoalitionBundleAPI
 *   6. Assemble block: arb first + coalition bundles
 *   7. BLS sign BidTrace
 *   8. Fan-out to all 6 relays simultaneously
 */

import http from 'http';
import axios from 'axios';
import {
  createPublicClient, createWalletClient, http as viemHttp,
  encodeFunctionData, parseUnits, type Address
} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { BlockBuilder, BUILDER_CONFIG, type BidTrace, type SignedBuilderBid } from '../builder/BlockBuilder';
import { BLSSigner } from '../builder/BLSSigner';
import { EthPoolScanner, type ArbOpportunity } from '../scanner/EthPoolScanner';
import { FLASH_ABI, buildArbPath } from '../config/arb';
import { ETH_MAINNET } from '../config/network';
import { ADDRESSES } from '../config/addresses';

// ── Config ───────────────────────────────────────────────────────────────────
const COALITION_API   = process.env.COALITION_API_URL  ?? 'https://thewarden.onrender.com';
const BLS_SK          = process.env.BUILDER_BLS_SK     ?? '';
const PRIVATE_KEY     = process.env.ETH_PRIVATE_KEY    as `0x${string}`;
const FEE_RECIPIENT   = process.env.BUILDER_FEE_RECIPIENT ?? '0x1Aa04F01106Aa53bc7A112C502A934a6d72062d4';  // stableexo.base.eth
const MIN_PROFIT_ETH  = parseFloat(process.env.MIN_PROFIT_ETH ?? '0.00005');
const PORT            = parseInt(process.env.PORT ?? '3001');
const BORROW_AMOUNT   = parseUnits('100000', 6);   // 100K USDC flash loan
const MIN_POOL_BPS    = (ETH_MAINNET.monitor as any)?.poolFireBps ?? 10;

// ── Validate env ─────────────────────────────────────────────────────────────
if (!BLS_SK || BLS_SK === '0x') {
  console.error('[build-block] ❌ BUILDER_BLS_SK not set');
  process.exit(1);
}
if (!PRIVATE_KEY) {
  console.error('[build-block] ❌ ETH_PRIVATE_KEY not set');
  process.exit(1);
}

// ── Instances ─────────────────────────────────────────────────────────────────
const builder  = new BlockBuilder();
const signer   = new BLSSigner(BLS_SK);
const scanner  = new EthPoolScanner();
const account  = privateKeyToAccount(PRIVATE_KEY);
const pubClient = createPublicClient({ chain: mainnet, transport: viemHttp(ETH_MAINNET.rpc.http) });
const walClient = createWalletClient({ account, chain: mainnet, transport: viemHttp(ETH_MAINNET.rpc.http) });

// ── Stats ─────────────────────────────────────────────────────────────────────
let slotsProcessed = 0;
let blocksWon      = 0;
let arbsInjected   = 0;
let totalProfit    = 0n;
const startTime    = Date.now();

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║    TheWarden AEV Block Builder — GL-L44 ARB WIRED               ║
║    6 Relays | Arb top-of-block | Coalition 95%                  ║
╚══════════════════════════════════════════════════════════════════╝
  BLS Pubkey:   ${signer.pubkey.slice(0, 22)}...
  Fee Recipient: ${FEE_RECIPIENT}
  Min Profit:    ${MIN_PROFIT_ETH} ETH
  Coalition:     ${COALITION_API}
  Relays:        ${BUILDER_CONFIG.relays.length}
  Scanner:       27 pools via Multicall3
  
  🏴‍☠️  Wire arb → Build blocks → Win slots → Compound.
`);

// ── Minimal HTTP health server ────────────────────────────────────────────────
http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'building',
    builder: 'TheWarden-GL-L44',
    pubkey: signer.pubkey.slice(0, 22) + '...',
    relays: BUILDER_CONFIG.relays.length,
    slotsProcessed, blocksWon, arbsInjected,
    winRatePct: slotsProcessed > 0 ? ((blocksWon / slotsProcessed) * 100).toFixed(1) + '%' : '0%',
    profitEth: (Number(totalProfit) / 1e18).toFixed(6),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  }));
}).listen(PORT, () => console.log(`[build-block] 🌐 Health on :${PORT}`));

// ── Build signed arb tx ───────────────────────────────────────────────────────
async function buildArbTx(opp: ArbOpportunity, slot: number): Promise<`0x${string}` | null> {
  try {
    const minFinal = BORROW_AMOUNT * 1001n / 1000n;  // 0.1% min profit floor
    const path = buildArbPath(
      opp.buyPool.address,  opp.buyPool.token0,  opp.buyPool.token1,  opp.buyPool.fee  ?? 500,  0n,
      opp.sellPool.address, opp.sellPool.token0, opp.sellPool.token1, opp.sellPool.fee ?? 3000, minFinal,
      BORROW_AMOUNT, minFinal,
    );

    const calldata = encodeFunctionData({
      abi:          FLASH_ABI,
      functionName: 'executeArbitrage',
      args: [
        ADDRESSES.tokens.USDC as Address,
        BORROW_AMOUNT,
        path,
        0,    // sourceOverride=0 → Balancer V2 (0% fee) — always first
        '0x0000000000000000000000000000000000000000' as Address,
      ],
    });

    const [nonce, gasPrice] = await Promise.all([
      pubClient.getTransactionCount({ address: account.address }),
      pubClient.getGasPrice(),
    ]);

    const signedTx = await walClient.signTransaction({
      to:       '0x1F27BA663dC5233DCf2635AD295Bd42197d854A9' as Address,  // FlashSwapV3 ETH mainnet GL-L41
      data:     calldata,
      gasPrice: gasPrice + parseUnits('2', 'gwei'),
      gas:      600_000n,
      nonce,
      chain:    mainnet,
    });

    console.log(`[Slot ${slot}] ⚡ Arb tx signed | ${opp.label} | ${opp.estimatedProfitBps} bps`);
    arbsInjected++;
    return signedTx as `0x${string}`;
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

async function getCoalitionBundles(block: number): Promise<any[]> {
  try {
    const r = await axios.get(`${COALITION_API}/relay/v1/bundle/list`, { timeout: 2000 });
    return (r.data as any[]).filter(b => b.blockNumber === block);
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

// ── Build + submit one slot ───────────────────────────────────────────────────
async function buildSlot(slot: number, parentHash: string): Promise<void> {
  const t0 = Date.now();
  slotsProcessed++;
  console.log(`\n[Slot ${slot}] ⚡ Building... | parent=${parentHash.slice(0, 12)}...`);

  // 1. Validators + arb scan + coalition bundles — all in parallel
  const [validatorSets, poolOpps, coalitionBundles] = await Promise.all([
    Promise.all(BUILDER_CONFIG.relays.map(r => getValidators(r.url))),
    scanner.findOpportunities().catch(() => [] as ArbOpportunity[]),
    getCoalitionBundles(slot),
  ]);

  const allValidators = validatorSets.flat();
  if (allValidators.length === 0) {
    console.log(`[Slot ${slot}] ⚠️  No validators — skipping`);
    return;
  }
  console.log(`[Slot ${slot}] 👥 ${allValidators.length} validators | ${poolOpps.length} pool opps | ${coalitionBundles.length} bundles`);

  // 2. Build arb tx if opportunity found
  let arbTx: `0x${string}` | null = null;
  const bestOpp = poolOpps.find(o => o.estimatedProfitBps >= MIN_POOL_BPS);
  if (bestOpp) {
    arbTx = await buildArbTx(bestOpp, slot);
  }

  // 3. Assemble block: arb first, then coalition
  const EMPTY = '0x' as `0x${string}`;
  let assembled;
  try {
    assembled = await builder.assemble(
      arbTx ?? EMPTY,
      EMPTY,
      coalitionBundles.map(b => b.txs as `0x${string}`[])
    );
  } catch (e: any) {
    console.log(`[Slot ${slot}] ❌ Assembly failed: ${e.message?.slice(0, 60)}`);
    return;
  }

  const profitEth = Number(assembled.estimatedProfit) / 1e18;
  if (profitEth < MIN_PROFIT_ETH && !arbTx && coalitionBundles.length === 0) {
    console.log(`[Slot ${slot}] 💸 Low profit ${profitEth.toFixed(6)} ETH — skipping`);
    return;
  }

  if (arbTx) console.log(`[Slot ${slot}] 🏴‍☠️  ARB injected top-of-block | ${bestOpp!.label}`);

  // 4. BLS sign BidTrace
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

  const signedBid: SignedBuilderBid = {
    message: bidTrace,
    execution_payload: {
      parent_hash:       parentHash,
      fee_recipient:     FEE_RECIPIENT,
      state_root:        '0x' + '0'.repeat(64),
      receipts_root:     '0x' + '0'.repeat(64),
      logs_bloom:        '0x' + '0'.repeat(512),
      prev_randao:       '0x' + '0'.repeat(64),
      block_number:      String(slot),
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

  // 5. Fan-out to all 6 relays simultaneously
  const results = await Promise.allSettled(
    BUILDER_CONFIG.relays.map(r => submitToRelay(r.name, r.url, signedBid))
  );

  let wins = 0;
  for (const res of results) {
    if (res.status === 'fulfilled') {
      const { name, success, status, error } = res.value;
      console.log(`[Slot ${slot}] ${success ? '✅' : '⚠️ '} ${name.padEnd(22)} → ${status ?? error}`);
      if (success) wins++;
    }
  }

  if (wins > 0) {
    blocksWon++;
    totalProfit += assembled.estimatedProfit;
    const winRate = ((blocksWon / slotsProcessed) * 100).toFixed(1);
    console.log(`[Slot ${slot}] 🏆 Submitted to ${wins}/${BUILDER_CONFIG.relays.length} relays | wins=${blocksWon} (${winRate}%) arbs=${arbsInjected}`);

    for (const bundle of coalitionBundles) {
      axios.post(`${COALITION_API}/relay/v1/bundle/included`, {
        bundleId: bundle.id, profitWei: assembled.estimatedProfit.toString(),
      }).catch(() => {});
    }
  }

  console.log(`[Slot ${slot}] ⏱️  ${Date.now() - t0}ms | profit=${profitEth.toFixed(6)} ETH`);
}

// ── Main loop ─────────────────────────────────────────────────────────────────
(async () => {
  console.log('[build-block] 🔗 Connecting to Ethereum WSS...');
  await builder.watchSlots(async (slot, parentHash) => {
    try { await buildSlot(slot, parentHash); }
    catch (e: any) { console.error(`[Slot ${slot}] 💥 ${e.message}`); }
  });

  setInterval(() => {
    const uptime   = Math.floor((Date.now() - startTime) / 60000);
    const winRate  = slotsProcessed > 0 ? ((blocksWon / slotsProcessed) * 100).toFixed(1) : '0.0';
    const profit   = (Number(totalProfit) / 1e18).toFixed(6);
    console.log(`\n📊 [${uptime}m] slots=${slotsProcessed} wins=${blocksWon} (${winRate}%) arbs=${arbsInjected} profit=${profit} ETH\n`);
  }, 600_000);
})();
