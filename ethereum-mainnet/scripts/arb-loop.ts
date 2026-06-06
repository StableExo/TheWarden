/**
 * arb-loop.ts — GL-L54 DIAGNOSTIC: minimal health server (no arb imports)
 * Tests whether the crash is in arb/scanner imports or env/platform.
 */

import http from 'http';

const PORT = parseInt(process.env.PORT ?? '10000');
const START = Date.now();

process.on('unhandledRejection', (reason) => {
  console.error('[SHIELD] unhandledRejection:', reason);
});
process.on('uncaughtException', (e) => {
  console.error('[SHIELD] uncaughtException:', e?.message || e);
});

const srv = http.createServer((req, res) => {
  const url = req.url ?? '/';
  res.setHeader('Content-Type', 'application/json');
  if (url.startsWith('/health')) {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', uptime: (Date.now() - START) / 1000, mode: 'diagnostic' }));
    return;
  }
  if (url.startsWith('/arb')) {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'diagnostic mode — no arb running', uptime: (Date.now() - START) / 1000 }));
    return;
  }
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});

srv.listen(PORT, () => {
  console.log('[INF]', new Date().toISOString(), `TheWarden DIAGNOSTIC health server on port ${PORT}`);
  console.log('[INF]', new Date().toISOString(), `ETH_PRIVATE_KEY: ${process.env.ETH_PRIVATE_KEY ? 'SET' : 'NOT SET'}`);
  console.log('[INF]', new Date().toISOString(), `NODE_ENV: ${process.env.NODE_ENV ?? 'undefined'}`);
  console.log('[INF]', new Date().toISOString(), 'Listening — no arb imports — pure health server');
});
