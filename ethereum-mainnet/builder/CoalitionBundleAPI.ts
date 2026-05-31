/**
 * CoalitionBundleAPI — TheWarden AEV Block Builder
 *
 * Path B: Accept external searcher bundles, offer 95% refund.
 * This beats Quasar's 90% refund — attracts more searchers.
 * More searchers → better blocks → more validator slots → compound growth.
 *
 * API: eth_sendBundle compatible (drop-in replacement for Quasar/Titan)
 * Deploy target: Render (rnd_orIsrYSD0bDSO9QKOjBs5K0ibC6j)
 *
 * Endpoints:
 *   POST /                    — JSON-RPC (eth_sendBundle, eth_cancelBundle)
 *   GET  /health              — health check
 *   GET  /stats               — coalition statistics
 *   GET  /relay/v1/bundle/list — list pending bundles (builder internal)
 *
 * GL-L43: Deploy on Render, advertise to searcher community.
 * Coalition growth: TheWarden → more searchers → bigger blocks → dominate.
 */

import express, { type Request, type Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';

const app = express();
app.use(express.json({ limit: '10mb' }));

// ── Config ───────────────────────────────────────────────────────────────────
const PORT             = parseInt(process.env.PORT ?? '3000');
const REFUND_BPS       = 9500; // 95% refund to searchers (beats Quasar 90%)
const MAX_BUNDLE_AGE   = 60;   // seconds — reject stale bundles
const BUILDER_PUBKEY   = process.env.BUILDER_BLS_PUBKEY ?? '';

// ── Bundle store (in-memory, flushed each slot) ───────────────────────────────
interface Bundle {
  id:           string;
  txs:          string[];        // RLP-encoded signed txs
  blockNumber:  number;
  minTimestamp: number;
  maxTimestamp: number;
  revertingTxHashes: string[];
  signingAddress?: string;
  refundPercent: number;         // always 95 for coalition
  receivedAt:   number;
  shapleyValue?: bigint;         // set by block builder during assembly
}

const pendingBundles: Map<string, Bundle> = new Map();
let totalBundlesReceived = 0;
let totalBundlesIncluded = 0;
let totalRefundPaid      = BigInt(0);

// ── Helpers ──────────────────────────────────────────────────────────────────
function validateBundle(params: any): { valid: boolean; error?: string } {
  if (!params?.txs || !Array.isArray(params.txs) || params.txs.length === 0) {
    return { valid: false, error: 'txs array required and must not be empty' };
  }
  if (!params.blockNumber) {
    return { valid: false, error: 'blockNumber required' };
  }
  const blockNum = parseInt(params.blockNumber, 16);
  if (isNaN(blockNum) || blockNum <= 0) {
    return { valid: false, error: 'invalid blockNumber' };
  }
  return { valid: true };
}

function computeBundleHash(txs: string[]): string {
  return '0x' + createHash('sha256')
    .update(txs.join(''))
    .digest('hex');
}

// ── JSON-RPC handler ─────────────────────────────────────────────────────────
async function handleEthSendBundle(params: any, id: any, res: Response) {
  const validation = validateBundle(params);
  if (!validation.valid) {
    return res.json({
      jsonrpc: '2.0', id,
      error: { code: -32602, message: validation.error }
    });
  }

  const bundle: Bundle = {
    id:                randomUUID(),
    txs:               params.txs,
    blockNumber:       parseInt(params.blockNumber, 16),
    minTimestamp:      params.minTimestamp ?? 0,
    maxTimestamp:      params.maxTimestamp ?? 9999999999,
    revertingTxHashes: params.revertingTxHashes ?? [],
    signingAddress:    params.signingAddress,
    refundPercent:     REFUND_BPS / 100, // 95
    receivedAt:        Math.floor(Date.now() / 1000),
  };

  pendingBundles.set(bundle.id, bundle);
  totalBundlesReceived++;

  console.log(`[Coalition] Bundle ${bundle.id.slice(0,8)} received | ` +
              `block=${bundle.blockNumber} txs=${bundle.txs.length} ` +
              `refund=${bundle.refundPercent}%`);

  const bundleHash = computeBundleHash(bundle.txs);

  return res.json({
    jsonrpc: '2.0', id,
    result: {
      bundleHash,
      bundleId:      bundle.id,
      refundPercent: bundle.refundPercent,
      message:       `Bundle queued. ${bundle.refundPercent}% refund on inclusion. TheWarden Coalition.`,
    }
  });
}

async function handleEthCancelBundle(params: any, id: any, res: Response) {
  const bundleId = params?.bundleId;
  if (!bundleId) {
    return res.json({ jsonrpc: '2.0', id, error: { code: -32602, message: 'bundleId required' } });
  }
  const deleted = pendingBundles.delete(bundleId);
  return res.json({ jsonrpc: '2.0', id, result: { cancelled: deleted } });
}

// ── Routes ───────────────────────────────────────────────────────────────────

// JSON-RPC endpoint (drop-in for Quasar/Titan)
app.post('/', async (req: Request, res: Response) => {
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== '2.0') {
    return res.status(400).json({ error: 'Only JSON-RPC 2.0 supported' });
  }

  switch (method) {
    case 'eth_sendBundle':
      return handleEthSendBundle(params?.[0] ?? params, id, res);

    case 'eth_cancelBundle':
      return handleEthCancelBundle(params?.[0] ?? params, id, res);

    case 'eth_sendPrivateTransaction':
      // Wrap single tx as bundle
      return handleEthSendBundle(
        { txs: [params?.[0]?.tx], blockNumber: params?.[0]?.maxBlockNumber ?? '0x' },
        id, res
      );

    default:
      return res.json({
        jsonrpc: '2.0', id,
        error: { code: -32601, message: `Method ${method} not supported` }
      });
  }
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status:       'ok',
    builder:      'TheWarden AEV Coalition',
    pubkey:       BUILDER_PUBKEY.slice(0, 20) + '...',
    refundBps:    REFUND_BPS,
    refundPct:    `${REFUND_BPS / 100}%`,
    pendingBundles: pendingBundles.size,
    uptime:       process.uptime(),
  });
});

// Stats endpoint
app.get('/stats', (_req: Request, res: Response) => {
  res.json({
    totalBundlesReceived,
    totalBundlesIncluded,
    totalRefundPaidWei: totalRefundPaid.toString(),
    pendingBundles:     pendingBundles.size,
    coalitionOffer:     `${REFUND_BPS / 100}% refund (vs Quasar 90%)`,
    builderPubkey:      BUILDER_PUBKEY,
  });
});

// Internal: get pending bundles for block assembly (called by build-block.ts)
app.get('/relay/v1/bundle/list', (_req: Request, res: Response) => {
  const bundles = Array.from(pendingBundles.values())
    .sort((a, b) => (b.shapleyValue ?? 0n) > (a.shapleyValue ?? 0n) ? 1 : -1);
  res.json(bundles);
});

// Internal: mark bundle as included + record refund
app.post('/relay/v1/bundle/included', (req: Request, res: Response) => {
  const { bundleId, profitWei } = req.body;
  const bundle = pendingBundles.get(bundleId);
  if (!bundle) return res.status(404).json({ error: 'Bundle not found' });

  const profit    = BigInt(profitWei ?? 0);
  const refund    = (profit * BigInt(REFUND_BPS)) / 10000n;
  totalRefundPaid = totalRefundPaid + refund;
  totalBundlesIncluded++;
  pendingBundles.delete(bundleId);

  console.log(`[Coalition] Bundle ${bundleId.slice(0,8)} INCLUDED | ` +
              `profit=${profit} refund=${refund} (${REFUND_BPS / 100}%)`);

  res.json({ bundleId, refundWei: refund.toString(), included: true });
});

// ── Cleanup old bundles every slot (12s) ─────────────────────────────────────
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  let pruned = 0;
  for (const [id, bundle] of pendingBundles) {
    if (now - bundle.receivedAt > MAX_BUNDLE_AGE) {
      pendingBundles.delete(id);
      pruned++;
    }
  }
  if (pruned > 0) console.log(`[Coalition] Pruned ${pruned} stale bundles`);
}, 12_000);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║        TheWarden Coalition Bundle API — LIVE            ║
║                   GL-L43 | Path B                       ║
╚══════════════════════════════════════════════════════════╝
  Port:        ${PORT}
  Builder:     ${BUILDER_PUBKEY.slice(0, 24)}...
  Refund:      ${REFUND_BPS / 100}% (Quasar offers 90%)
  Endpoint:    POST / (eth_sendBundle compatible)
  Health:      GET  /health
  Stats:       GET  /stats

  🏴‍☠️  Coalition is OPEN. 95% refund. Searchers welcome.
`);
});

export { pendingBundles, app };
