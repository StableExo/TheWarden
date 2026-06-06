/**
 * GL-L54 DIAG-5: EthPoolScanner imported + instantiated, findOpportunities NOT called
 */
import express, { type Request, type Response } from 'express';
import { createPublicClient, http as viemHttp, type Address, type Hex } from 'viem';
import { mainnet } from 'viem/chains';
import { EthPoolScanner } from '../scanner/EthPoolScanner';
import { ADDRESSES } from '../config/addresses';
import { ETH_MAINNET } from '../config/network';

process.on('unhandledRejection', (r: unknown) => console.error('[SHIELD] unhandledRejection:', r));
process.on('uncaughtException',  (e: Error)   => console.error('[SHIELD] uncaughtException:', e?.message));
process.on('SIGTERM', () => console.log('[SHIELD] SIGTERM'));

const app     = express();
app.use(express.json({ limit: '10mb' }));
const PORT    = parseInt(process.env.PORT ?? '3000');
const START   = Date.now();
let scannerOk = false;
try {
  const s = new EthPoolScanner(ETH_MAINNET.rpc.http);
  scannerOk = true;
  console.log('[INF] EthPoolScanner instantiated OK');
} catch (e: any) { console.error('[ERR] scanner init:', e?.message); }

app.get('/health', (_: Request, res: Response) => res.json({ status: 'ok', build: 'DIAG-5-scanner-no-scan', scannerOk, uptime: (Date.now()-START)/1000 }));
app.get('/arb',    (_: Request, res: Response) => res.json({ status: 'no-scan', scannerOk }));
app.post('/', (req: Request, res: Response) => res.json({ jsonrpc:'2.0', id: req.body?.id, result: 'stub' }));

app.listen(PORT, () => console.log('[INF] DIAG-5 on port', PORT, '| scanner instantiated, NO findOpportunities call'));
