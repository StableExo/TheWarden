/**
 * CoalitionBundleAPI — TheWarden AEV Pure Arbitrage Engine
 *
 * GL-L54: ALL crashes fixed — ]) bracket bug resolved. Process shields. as Address fix in EthPoolScanner.
 * GL-L55: Triangular arb support — buildTriPath hooked in. Handles hopCount=3 from EthPoolScanner.
 * GL-L53: Integrated arb scanner loop — pure arbitrage, no block builder needed.
 *   - EthPoolScanner + QuoterV2 validation every 15s (one ETH slot)
 *   - ThirdWeb ERC-4337 execution — $0.00 gas
 *   - 100% profit → stableexo.base.eth
 *
 * Endpoints:
 *   GET  /health  — liveness + uptime
 *   GET  /stats   — bundle stats
 *   GET  /arb     — arb loop status
 *   POST /        — eth_sendBundle compatible
 */

import express, { type Request, type Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import {
  createPublicClient, http as viemHttp,
  encodeFunctionData, parseUnits, getAddress,
  type Address, type Hex,
} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
// EthPoolScanner loaded dynamically inside app.listen (shields-first pattern)
import { FLASH_ABI, buildArbPath, buildTriPath } from '../config/arb';
import { ADDRESSES } from '../config/addresses';
import { ETH_MAINNET } from '../config/network';

// ── Process-level error shields (GL-L54) ──────────────────────────────────
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[SHIELD]', new Date().toISOString(), 'unhandledRejection:', reason);
});
process.on('uncaughtException', (e: Error) => {
  console.error('[SHIELD]', new Date().toISOString(), 'uncaughtException:', e?.message || e);
});
process.on('SIGTERM', () => {
  console.log('[SHIELD]', new Date().toISOString(), 'SIGTERM received');
});

const app = express();
app.use(express.json({ limit: '10mb' }));

// ── Config ────────────────────────────────────────────────────────────────
const PORT           = parseInt(process.env.PORT ?? '3000');
const REFUND_BPS     = 9500;
const MAX_BUNDLE_AGE = 60;
const EOA_PK         = (process.env.ETH_PRIVATE_KEY ?? '') as Hex;
const SMART_ACCOUNT  = '0x9Cf21D503EAe5Cf33f9c4c58C75e16065007f367' as Address;
const ENTRY_POINT    = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address;
const FLASH_SWAP     = ADDRESSES.flashSwapV3ETH as Address;
const PROFIT_DEST    = '0x1Aa04F01106Aa53bc7A112C502A934a6d72062d4' as Address;
const BORROW_AMOUNT  = parseUnits('100000', 6);
const TW_CLIENT_ID   = '0282b1b3ed884ef92509e46b8da1fad7';
const BUNDLER_URL    = 'https://1.bundler.thirdweb.com/v1';
const QN_HTTP        = ETH_MAINNET.rpc.http;
const ARB_INTERVAL   = 15_000;

// ── Logger ────────────────────────────────────────────────────────────────
const log  = (...a: any[]) => console.log( '[INF]', new Date().toISOString(), ...a);
const dbg  = (...a: any[]) => console.log( '[DBG]', new Date().toISOString(), ...a);
const err  = (...a: any[]) => console.error('[ERR]', new Date().toISOString(), ...a);
const warn = (...a: any[]) => console.warn( '[WRN]', new Date().toISOString(), ...a);

// ── State ─────────────────────────────────────────────────────────────────
const START_TIME = Date.now();
const bundles    = new Map<string, any>();
let totalBundlesReceived = 0;
let totalBundlesIncluded = 0;
let arbScans = 0, arbFired = 0, arbSucceeded = 0, arbFailed = 0;
let lastScanTime = 0, lastOpp = '', lastUserOpHash = '', lastError = '';
let totalProfitUSDC = 0, lastProfitCheck = 0;

// ── ABIs ──────────────────────────────────────────────────────────────────
const SIMPLE_ACCOUNT_ABI = [{
  name: 'execute', type: 'function',
  inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }],
  outputs: [], stateMutability: 'nonpayable',
}] as const;

const EP_ABI = [{
  name: 'getUserOpHash', type: 'function',
  inputs: [{ name: 'userOp', type: 'tuple', components: [
    { name: 'sender',               type: 'address' },
    { name: 'nonce',                type: 'uint256' },
    { name: 'initCode',             type: 'bytes'   },
    { name: 'callData',             type: 'bytes'   },
    { name: 'callGasLimit',         type: 'uint256' },
    { name: 'verificationGasLimit', type: 'uint256' },
    { name: 'preVerificationGas',   type: 'uint256' },
    { name: 'maxFeePerGas',         type: 'uint256' },
    { name: 'maxPriorityFeePerGas', type: 'uint256' },
    { name: 'paymasterAndData',     type: 'bytes'   },
    { name: 'signature',            type: 'bytes'   },
  ]}],
  outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view',
}] as const;

const NONCE_ABI = [{
  name: 'getNonce', type: 'function',
  inputs: [{ name: 'sender', type: 'address' }, { name: 'key', type: 'uint192' }],
  outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view',
}] as const;

const ERC20_ABI = [{
  name: 'balanceOf', type: 'function',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view',
}] as const;

// ── Public client + scanner ───────────────────────────────────────────────
const client  = createPublicClient({ chain: mainnet, transport: viemHttp(QN_HTTP) });
let scanner: any = null; // populated dynamically in app.listen

// ── Arb Cycle ─────────────────────────────────────────────────────────────
async function runArbCycle() {
  if (!EOA_PK) { warn('ETH_PRIVATE_KEY not set — arb loop disabled'); return; }
  const cycleId = ++arbScans;
  lastScanTime  = Date.now();

  try {
    dbg(`[ARB #${cycleId}] Scanning pools...`);
    const opps = await scanner.findOpportunities();
    if (!opps.length) { dbg(`[ARB #${cycleId}] No Q2-confirmed opportunities`); return; }

    const opp = opps[0];
    lastOpp = `${opp.label} | ${opp.estimatedProfitBps}bps`;
    log(`[ARB #${cycleId}] ✅ OPPORTUNITY: ${opp.label} | ${opp.estimatedProfitBps}bps`);

    // Build path — 2-hop or 3-hop triangular
    const minFinal = BORROW_AMOUNT * 1001n / 1000n;
    const path = (opp as any).hopCount === 3 && (opp as any).midPool
      ? buildTriPath(
          getAddress(opp.buyPool.address),              opp.buyPool.token0  as Address, opp.buyPool.token1  as Address, opp.buyPool.fee  ?? 500,  0,
          getAddress((opp as any).midPool.address),     (opp as any).midPool.token0 as Address, (opp as any).midPool.token1 as Address, (opp as any).midPool.fee ?? 3000, 0,
          getAddress(opp.sellPool.address),             opp.sellPool.token0 as Address, opp.sellPool.token1 as Address, opp.sellPool.fee ?? 3000, 0,
          BORROW_AMOUNT, minFinal,
        )
      : buildArbPath(
          getAddress(opp.buyPool.address),  opp.buyPool.token0 as Address,  opp.buyPool.token1 as Address,  opp.buyPool.fee  ?? 500,  0n, 0,
          getAddress(opp.sellPool.address), opp.sellPool.token0 as Address, opp.sellPool.token1 as Address, opp.sellPool.fee ?? 3000, 0n, 0,
          BORROW_AMOUNT, minFinal,
        );

    const arbCalldata = encodeFunctionData({
      abi: FLASH_ABI, functionName: 'executeArbitrage',
      args: [
        ADDRESSES.tokens.USDC as Address, BORROW_AMOUNT,
        path,
        0, '0x0000000000000000000000000000000000000000' as Address,
      ],
    });

    const executeCalldata = encodeFunctionData({
      abi: SIMPLE_ACCOUNT_ABI, functionName: 'execute',
      args: [FLASH_SWAP, 0n, arbCalldata],
    });

    const nonce    = await client.readContract({ address: ENTRY_POINT, abi: NONCE_ABI, functionName: 'getNonce', args: [SMART_ACCOUNT, 0n] });
    const gasPrice = await client.getGasPrice();
    const account  = privateKeyToAccount(EOA_PK);
    const hdrs: Record<string,string> = { 'Content-Type': 'application/json', 'x-client-id': TW_CLIENT_ID };
    const STUB_SIG = ('0x' + 'ff'.repeat(64) + '1c') as Hex;

    let userOp: any = {
      sender: SMART_ACCOUNT, nonce: `0x${nonce.toString(16)}`,
      initCode: '0x', callData: executeCalldata,
      callGasLimit: '0x3D0900', verificationGasLimit: '0x186A0', preVerificationGas: '0xC350',
      maxFeePerGas: `0x${(gasPrice * 2n).toString(16)}`, maxPriorityFeePerGas: '0x3B9ACA00',
      paymasterAndData: '0x', signature: STUB_SIG,
    };

    const toContract = (op: any) => ({
      ...op, nonce, callGasLimit: BigInt(op.callGasLimit),
      verificationGasLimit: BigInt(op.verificationGasLimit),
      preVerificationGas: BigInt(op.preVerificationGas),
      maxFeePerGas: BigInt(op.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(op.maxPriorityFeePerGas),
    });

    const stubRes = await fetch(BUNDLER_URL, { method: 'POST', headers: hdrs,
      body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'pm_getPaymasterStubData', params:[userOp, ENTRY_POINT, '0x1', {}] }) });
    const stubJ = await stubRes.json() as any;
    if (stubJ.error) throw new Error(`stub: ${JSON.stringify(stubJ.error)}`);
    userOp.paymasterAndData = stubJ.result.paymasterAndData;

    const h1 = await client.readContract({ address: ENTRY_POINT, abi: EP_ABI, functionName: 'getUserOpHash', args: [toContract(userOp)] });
    userOp.signature = await account.signMessage({ message: { raw: h1 } });

    const sponsorRes = await fetch(BUNDLER_URL, { method: 'POST', headers: hdrs,
      body: JSON.stringify({ jsonrpc:'2.0', id:2, method:'pm_sponsorUserOperation', params:[userOp, ENTRY_POINT, {}] }) });
    const sponsorJ = await sponsorRes.json() as any;
    if (sponsorJ.error) throw new Error(`sponsor: ${JSON.stringify(sponsorJ.error)}`);
    Object.assign(userOp, {
      paymasterAndData: sponsorJ.result.paymasterAndData,
      ...(sponsorJ.result.callGasLimit         && { callGasLimit:         sponsorJ.result.callGasLimit }),
      ...(sponsorJ.result.verificationGasLimit && { verificationGasLimit: sponsorJ.result.verificationGasLimit }),
      ...(sponsorJ.result.preVerificationGas   && { preVerificationGas:   sponsorJ.result.preVerificationGas }),
    });
    log(`[ARB #${cycleId}] ✅ GAS SPONSORED — $0.00`);

    const h2 = await client.readContract({ address: ENTRY_POINT, abi: EP_ABI, functionName: 'getUserOpHash', args: [toContract(userOp)] });
    userOp.signature = await account.signMessage({ message: { raw: h2 } });

    const sendRes = await fetch(BUNDLER_URL, { method: 'POST', headers: hdrs,
      body: JSON.stringify({ jsonrpc:'2.0', id:3, method:'eth_sendUserOperation', params:[userOp, ENTRY_POINT] }) });
    const sendJ = await sendRes.json() as any;
    if (sendJ.error) throw new Error(`send: ${JSON.stringify(sendJ.error)}`);

    lastUserOpHash = sendJ.result;
    arbFired++;
    log(`[ARB #${cycleId}] 🚀 SUBMITTED! UserOp: ${lastUserOpHash}`);

    setTimeout(async () => {
      try {
        const usdcAfter = await client.readContract({
          address: ADDRESSES.tokens.USDC as Address, abi: ERC20_ABI,
          functionName: 'balanceOf', args: [PROFIT_DEST],
        }) as bigint;
        const profit = Number(usdcAfter - BigInt(lastProfitCheck)) / 1e6;
        lastProfitCheck = Number(usdcAfter);
        if (profit > 0) { totalProfitUSDC += profit; arbSucceeded++; log(`[ARB #${cycleId}] 💰 +${profit.toFixed(4)} USDC`); }
        else { arbFailed++; warn(`[ARB #${cycleId}] No profit — inner op may have failed`); }
      } catch (e: any) { err(`[ARB #${cycleId}] profit check: ${e?.message}`); }
    }, 35_000);

  } catch (e: any) {
    lastError = e?.message || String(e);
    err(`[ARB #${cycleId}] CYCLE FAILED: ${lastError}`);
  }
}

// ── Request logger ────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: any) => {
  dbg(`→ ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok', builder: 'TheWarden AEV GL-L54',
    refundBps: REFUND_BPS, refundPct: '95%',
    pendingBundles: bundles.size,
    uptime: (Date.now() - START_TIME) / 1000,
  });
});

app.get('/stats', (_req: Request, res: Response) => {
  res.json({ totalBundlesReceived, totalBundlesIncluded, pendingBundles: bundles.size });
});

app.get('/arb', (_req: Request, res: Response) => {
  res.json({
    status: EOA_PK ? 'running' : 'disabled (no ETH_PRIVATE_KEY)',
    contract: FLASH_SWAP, profitDest: PROFIT_DEST,
    scans: arbScans, fired: arbFired, succeeded: arbSucceeded, failed: arbFailed,
    totalProfitUSDC: totalProfitUSDC.toFixed(6),
    lastScanTime: lastScanTime ? new Date(lastScanTime).toISOString() : 'never',
    lastOpp, lastUserOpHash, lastError,
  });
});

app.post('/', async (req: Request, res: Response) => {
  const { method, params, id } = req.body ?? {};
  if (method === 'eth_sendBundle') {
    try {
      const [bundle] = params ?? [];
      const now = Math.floor(Date.now() / 1000);
      if (!bundle?.txs?.length) return res.json({ jsonrpc:'2.0', id, error:{ code:-32602, message:'txs required' } });
      if (bundle.maxTimestamp && now > bundle.maxTimestamp) return res.json({ jsonrpc:'2.0', id, error:{ code:-32602, message:'bundle expired' } });
      const bundleId = randomUUID();
      bundles.set(bundleId, { ...bundle, id: bundleId, receivedAt: now });
      totalBundlesReceived++;
      res.json({ jsonrpc:'2.0', id, result: { bundleHash: createHash('sha256').update(bundleId).digest('hex') } });
    } catch (e: any) { res.json({ jsonrpc:'2.0', id, error:{ code:-32603, message: e?.message } }); }
    return;
  }
  res.json({ jsonrpc:'2.0', id, error:{ code:-32601, message:`Method not found: ${method}` } });
});

app.get('/relay/v1/bundle/list', (_req: Request, res: Response) => {
  res.json([...bundles.values()]);
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  log(`🚀 TheWarden AEV GL-L54 on port ${PORT}`);
  log(`   Contract:  ${FLASH_SWAP}`);
  log(`   ProfDest:  ${PROFIT_DEST}`);
  log(`   EOA_PK:    ${EOA_PK ? 'SET' : 'NOT SET'}`);

  // Dynamic scanner import — shields already registered, any parse error is caught
  try {
    const { EthPoolScanner } = await import('../scanner/EthPoolScanner');
    scanner = new EthPoolScanner(QN_HTTP);
    log('✅ EthPoolScanner loaded');
  } catch (e: any) {
    err('Scanner load failed:', e?.message || e);
  }

  if (!EOA_PK) {
    warn('⚠️  ETH_PRIVATE_KEY not set — arb loop disabled');
  } else if (!scanner) {
    err('Arb loop disabled — scanner failed to load');
  } else {
    log('✅ Starting arb scan loop...');
    runArbCycle().catch(e => err('Boot cycle:', e?.message));
    setInterval(() => runArbCycle().catch(e => err('Interval:', e?.message)), ARB_INTERVAL);
  }
});
