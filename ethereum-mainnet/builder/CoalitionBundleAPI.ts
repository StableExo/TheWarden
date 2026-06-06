/**
 * CoalitionBundleAPI — TheWarden AEV  
 * GL-L54 DIAG-3: Scanner imports ONLY, no EthPoolScanner instantiation
 */

import express, { type Request, type Response } from 'express';
import {
  createPublicClient, http as viemHttp,
  encodeFunctionData, parseUnits, getAddress,
  type Address, type Hex,
} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { EthPoolScanner } from '../scanner/EthPoolScanner';
import { FLASH_ABI, buildArbPath }  from '../config/arb';
import { ADDRESSES } from '../config/addresses';
import { ETH_MAINNET } from '../config/network';

// ── Shields ──────────────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[SHIELD] unhandledRejection:', reason);
});
process.on('uncaughtException', (e: Error) => {
  console.error('[SHIELD] uncaughtException:', e?.message || e);
});
process.on('SIGTERM', () => {
  console.log('[SHIELD] SIGTERM — staying alive');
});

const app      = express();
app.use(express.json({ limit: '10mb' }));
const PORT      = parseInt(process.env.PORT ?? '3000');
const START     = Date.now();
const EOA_PK    = (process.env.ETH_PRIVATE_KEY ?? '') as Hex;

// Instantiate scanner (GL-L54 DIAG-3 — if this crashes, problem is HERE)
let scanner: EthPoolScanner | null = null;
try {
  scanner = new EthPoolScanner(ETH_MAINNET.rpc.http);
  console.log('[INF] EthPoolScanner instantiated OK');
} catch (e: any) {
  console.error('[ERR] EthPoolScanner instantiation failed:', e?.message || e);
}

const log = (...a: any[]) => console.log('[INF]', new Date().toISOString(), ...a);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: (Date.now() - START) / 1000, build: 'GL-L54-diag3', scannerOk: !!scanner });
});

app.get('/arb', (_req: Request, res: Response) => {
  res.json({ status: EOA_PK ? 'running' : 'no-pk', scannerOk: !!scanner, contract: ADDRESSES.flashSwapV3ETH });
});

app.post('/', (req: Request, res: Response) => {
  res.json({ jsonrpc:'2.0', id: req.body?.id, result: 'stub' });
});

app.listen(PORT, () => {
  log(`TheWarden DIAG-3 on port ${PORT}`);
  log(`scannerOk=${!!scanner} | contract=${ADDRESSES.flashSwapV3ETH}`);
  log(`EOA_PK: ${EOA_PK ? 'SET' : 'NOT SET'}`);

  if (!EOA_PK) { log('No PK — arb disabled'); return; }
  if (!scanner) { log('No scanner — arb disabled'); return; }

  // Single stub scan to test scanner.findOpportunities()
  setTimeout(async () => {
    try {
      log('Running findOpportunities test...');
      const opps = await scanner!.findOpportunities();
      log(`findOpportunities: ${opps.length} opps found`);
    } catch (e: any) {
      console.error('[ERR] findOpportunities:', e?.message || e);
    }
  }, 5_000);
});
