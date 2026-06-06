/**
 * CoalitionBundleAPI — TheWarden AEV  
 * GL-L54 DIAGNOSTIC: No scanner imports — isolate crash source.
 * Shields + Express health only. ArB loop stubbed.
 */

import express, { type Request, type Response } from 'express';

// ── Process shields ──────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[SHIELD] unhandledRejection:', reason);
});
process.on('uncaughtException', (e: Error) => {
  console.error('[SHIELD] uncaughtException:', e?.message || e);
});
process.on('SIGTERM', () => {
  console.log('[SHIELD] SIGTERM received — staying alive (graceful)');
});

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT       = parseInt(process.env.PORT ?? '3000');
const START_TIME = Date.now();
const EOA_PK     = process.env.ETH_PRIVATE_KEY ?? '';

const log  = (...a: any[]) => console.log( '[INF]', new Date().toISOString(), ...a);
const err  = (...a: any[]) => console.error('[ERR]', new Date().toISOString(), ...a);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: (Date.now() - START_TIME) / 1000, build: 'GL-L54-diag' });
});

app.get('/arb', (_req: Request, res: Response) => {
  res.json({ status: EOA_PK ? 'stub-running' : 'no-pk', build: 'GL-L54-diag' });
});

app.post('/', (req: Request, res: Response) => {
  res.json({ jsonrpc:'2.0', id: req.body?.id, result: 'stub' });
});

app.listen(PORT, () => {
  log(`TheWarden DIAG-2 on port ${PORT} | EOA_PK: ${EOA_PK ? 'SET' : 'NOT SET'}`);
  log('No scanner imports — pure Express health server');
  
  // Stub arb "loop" — just logs, no RPC calls
  if (EOA_PK) {
    log('Stub arb loop starting (no real RPC)');
    setInterval(() => log('[ARB] stub scan tick'), 15_000);
  }
});
