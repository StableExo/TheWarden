/**
 * GL-L54 DIAG-4: All imports EXCEPT EthPoolScanner (isolating crash)
 */
import express, { type Request, type Response } from 'express';
import { createPublicClient, http as viemHttp, encodeFunctionData, parseUnits, getAddress, type Address, type Hex } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { FLASH_ABI, buildArbPath } from '../config/arb';
import { ADDRESSES } from '../config/addresses';
import { ETH_MAINNET } from '../config/network';

process.on('unhandledRejection', (r: unknown) => console.error('[SHIELD] unhandledRejection:', r));
process.on('uncaughtException',  (e: Error)   => console.error('[SHIELD] uncaughtException:', e?.message));
process.on('SIGTERM', () => console.log('[SHIELD] SIGTERM'));

const app  = express();
app.use(express.json({ limit: '10mb' }));
const PORT  = parseInt(process.env.PORT ?? '3000');
const START = Date.now();

app.get('/health', (_: Request, res: Response) => res.json({ status: 'ok', build: 'DIAG-4-no-scanner', uptime: (Date.now()-START)/1000 }));
app.get('/arb',    (_: Request, res: Response) => res.json({ status: 'no-scanner', contract: ADDRESSES.flashSwapV3ETH, network: ETH_MAINNET.chainId }));
app.post('/', (req: Request, res: Response) => res.json({ jsonrpc:'2.0', id: req.body?.id, result: 'stub' }));

app.listen(PORT, () => console.log('[INF] DIAG-4 on port', PORT, '| no EthPoolScanner'));
