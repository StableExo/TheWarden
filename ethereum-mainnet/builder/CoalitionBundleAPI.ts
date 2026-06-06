/**
 * GL-L54 DIAG-6: Shields FIRST, then dynamic import of EthPoolScanner
 * Catches module-init errors that happen before static imports resolve
 */

// ── Shields register FIRST — before any imports ────────────────────────────
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[SHIELD] unhandledRejection caught:', String(reason));
});
process.on('uncaughtException', (e: Error) => {
  console.error('[SHIELD] uncaughtException caught:', e?.stack || e?.message || e);
});
process.on('SIGTERM', () => console.log('[SHIELD] SIGTERM'));

import express, { type Request, type Response } from 'express';

const app   = express();
app.use(express.json({ limit: '10mb' }));
const PORT  = parseInt(process.env.PORT ?? '3000');
const START = Date.now();
let scannerError = '';
let scannerOk    = false;

// Health server starts BEFORE scanner import attempt
const server = app.listen(PORT, () => {
  console.log('[INF] Health server up on port', PORT, '— attempting scanner import...');
});

app.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'ok', build: 'DIAG-6-dynamic-import', scannerOk, scannerError, uptime: (Date.now()-START)/1000 });
});
app.get('/arb', (_: Request, res: Response) => {
  res.json({ status: scannerOk ? 'scanner-ok' : 'scanner-failed', scannerError });
});
app.post('/', (req: Request, res: Response) => {
  res.json({ jsonrpc:'2.0', id: req.body?.id, result: 'stub' });
});

// Dynamic import AFTER health server is up — error will show in /health response
try {
  const mod = await import('../scanner/EthPoolScanner');
  const { EthPoolScanner } = mod;
  const scanner = new EthPoolScanner('');
  scannerOk = true;
  console.log('[INF] EthPoolScanner dynamic import + instantiation OK');
} catch (e: any) {
  scannerError = e?.message || String(e);
  console.error('[ERR] Scanner import/init failed:', scannerError);
  console.error('[ERR] Stack:', e?.stack);
}
