/**
 * arb-loop.ts — TheWarden Pure Arb Engine (Render deployment)
 * GL-L53: Continuous arb loop. Health server starts FIRST (no delay).
 * Monitor: GET /health | GET /arb
 */

import http from 'http';
import {
  createPublicClient, http as viemHttp,
  encodeFunctionData, parseUnits, getAddress,
  type Address, type Hex,
} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { EthPoolScanner } from '../scanner/EthPoolScanner';
import { FLASH_ABI, buildArbPath } from '../config/arb';
import { ADDRESSES } from '../config/addresses';
import { ETH_MAINNET } from '../config/network';

// ── Config ──────────────────────────────────────────────────────────────────
const PORT         = parseInt(process.env.PORT ?? '10000');
const EOA_PK       = (process.env.ETH_PRIVATE_KEY ?? '') as Hex;
const TW_ID        = process.env.THIRDWEB_CLIENT_ID ?? '0282b1b3ed884ef92509e46b8da1fad7';
const BUNDLER      = 'https://1.bundler.thirdweb.com/v1';
const QN_HTTP      = ETH_MAINNET.rpc.http;
const SA           = '0x9Cf21D503EAe5Cf33f9c4c58C75e16065007f367' as Address;
const EP           = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address;
const FLASH        = ADDRESSES.flashSwapV3ETH as Address;
const DEST         = '0x1Aa04F01106Aa53bc7A112C502A934a6d72062d4' as Address;
const BORROW       = parseUnits('100000', 6);
const INTERVAL_MS  = 15_000;

// ── Process-level error shields (GL-L54) ───────────────────────────────────
// Node 22: unhandled rejections crash the process by default — prevent that.
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SHIELD] unhandledRejection', promise, 'reason:', reason);
});
process.on('uncaughtException', (e) => {
  console.error('[SHIELD] uncaughtException', e?.message || e);
});


// ── Logger ───────────────────────────────────────────────────────────────────
const ts  = () => new Date().toISOString();
const log = (...a: any[]) => console.log('[INF]', ts(), ...a);
const dbg = (...a: any[]) => console.log('[DBG]', ts(), ...a);
const err = (...a: any[]) => console.error('[ERR]', ts(), ...a);

// ── State ────────────────────────────────────────────────────────────────────
const START = Date.now();
let scans = 0, fired = 0, ok = 0, bad = 0;
let lastScan = '', lastOpp = '', lastUOH = '', lastErr = '', profit = 0;

// ── ABIs ─────────────────────────────────────────────────────────────────────
const SA_ABI = [{
  name: 'execute', type: 'function',
  inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }],
  outputs: [], stateMutability: 'nonpayable',
}] as const;

const EP_ABI = [{
  name: 'getUserOpHash', type: 'function',
  inputs: [{ name: 'userOp', type: 'tuple', components: [
    { name: 'sender', type: 'address' }, { name: 'nonce', type: 'uint256' },
    { name: 'initCode', type: 'bytes' }, { name: 'callData', type: 'bytes' },
    { name: 'callGasLimit', type: 'uint256' }, { name: 'verificationGasLimit', type: 'uint256' },
    { name: 'preVerificationGas', type: 'uint256' }, { name: 'maxFeePerGas', type: 'uint256' },
    { name: 'maxPriorityFeePerGas', type: 'uint256' }, { name: 'paymasterAndData', type: 'bytes' },
    { name: 'signature', type: 'bytes' },
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

// ── Clients ───────────────────────────────────────────────────────────────────
const client  = createPublicClient({ chain: mainnet, transport: viemHttp(QN_HTTP) });
const scanner = new EthPoolScanner(QN_HTTP);

// ── Health server — FIRST, no async deps ────────────────────────────────────
const srv = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', uptime: (Date.now() - START) / 1000, arbEnabled: !!EOA_PK }));
    return;
  }
  if (req.url === '/arb') {
    res.writeHead(200);
    res.end(JSON.stringify({ scans, fired, ok, bad, profit: profit.toFixed(6), lastScan, lastOpp, lastUOH, lastErr, contract: FLASH, dest: DEST }));
    return;
  }
  res.writeHead(404); res.end(JSON.stringify({ error: 'not found' }));
});

srv.listen(PORT, () => {
  log(`TheWarden arb-loop running on port ${PORT}`);
  log(`Contract:  ${FLASH}`);
  log(`Dest:      ${DEST}`);
  log(`EOA_PK:    ${EOA_PK ? 'set' : 'NOT SET'}`);
  if (!EOA_PK) { err('ETH_PRIVATE_KEY missing — loop disabled'); return; }
  log(`Starting loop every ${INTERVAL_MS / 1000}s...`);
  runCycle().catch(e => err('boot cycle:', e?.message));
  setInterval(() => runCycle().catch(e => err('cycle:', e?.message)), INTERVAL_MS);
});

// ── Arb Cycle ─────────────────────────────────────────────────────────────────
async function runCycle() {
  const n = ++scans;
  lastScan = ts();
  dbg(`[#${n}] scanning...`);

  try {
    const opps = await scanner.findOpportunities();
    if (!opps.length) { dbg(`[#${n}] no Q2 opps`); return; }

    const opp = opps[0];
    lastOpp = `${opp.label} | ${opp.estimatedProfitBps}bps`;
    log(`[#${n}] OPP: ${lastOpp}`);

    const arbData = encodeFunctionData({
      abi: FLASH_ABI, functionName: 'executeArbitrage',
      args: [
        ADDRESSES.tokens.USDC as Address, BORROW,
        buildArbPath(
          getAddress(opp.buyPool.address),  opp.buyPool.token0 as Address,  opp.buyPool.token1 as Address,  opp.buyPool.fee  ?? 500,  0n, 0,
          getAddress(opp.sellPool.address), opp.sellPool.token0 as Address, opp.sellPool.token1 as Address, opp.sellPool.fee ?? 3000, 0n, 0,
          BORROW, BORROW * 1001n / 1000n,
        ),
        0, '0x0000000000000000000000000000000000000000' as Address,
      ],
    });

    const callData = encodeFunctionData({ abi: SA_ABI, functionName: 'execute', args: [FLASH, 0n, arbData] });
    const nonce    = await client.readContract({ address: EP, abi: NONCE_ABI, functionName: 'getNonce', args: [SA, 0n] });
    const gp       = await client.getGasPrice();
    const acct     = privateKeyToAccount(EOA_PK);
    const hdrs     = { 'Content-Type': 'application/json', 'x-client-id': TW_ID };
    const STUB     = ('0x' + 'ff'.repeat(64) + '1c') as Hex;

    let op: any = {
      sender: SA, nonce: `0x${nonce.toString(16)}`, initCode: '0x', callData,
      callGasLimit: '0x3D0900', verificationGasLimit: '0x186A0', preVerificationGas: '0xC350',
      maxFeePerGas: `0x${(gp * 2n).toString(16)}`, maxPriorityFeePerGas: '0x3B9ACA00',
      paymasterAndData: '0x', signature: STUB,
    };
    const big = (o: any) => ({ ...o, nonce, callGasLimit: BigInt(o.callGasLimit), verificationGasLimit: BigInt(o.verificationGasLimit), preVerificationGas: BigInt(o.preVerificationGas), maxFeePerGas: BigInt(o.maxFeePerGas), maxPriorityFeePerGas: BigInt(o.maxPriorityFeePerGas) });

    const sJ = await (await fetch(BUNDLER, { method: 'POST', headers: hdrs, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'pm_getPaymasterStubData', params: [op, EP, '0x1', {}] }) })).json() as any;
    if (sJ.error) throw new Error(`stub: ${JSON.stringify(sJ.error)}`);
    op.paymasterAndData = sJ.result.paymasterAndData;

    const h1 = await client.readContract({ address: EP, abi: EP_ABI, functionName: 'getUserOpHash', args: [big(op)] });
    op.signature = await acct.signMessage({ message: { raw: h1 } });

    const spJ = await (await fetch(BUNDLER, { method: 'POST', headers: hdrs, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'pm_sponsorUserOperation', params: [op, EP, {}] }) })).json() as any;
    if (spJ.error) throw new Error(`sponsor: ${JSON.stringify(spJ.error)}`);
    Object.assign(op, { paymasterAndData: spJ.result.paymasterAndData, ...(spJ.result.callGasLimit && { callGasLimit: spJ.result.callGasLimit }), ...(spJ.result.verificationGasLimit && { verificationGasLimit: spJ.result.verificationGasLimit }), ...(spJ.result.preVerificationGas && { preVerificationGas: spJ.result.preVerificationGas }) });
    log(`[#${n}] sponsored $0.00`);

    const h2 = await client.readContract({ address: EP, abi: EP_ABI, functionName: 'getUserOpHash', args: [big(op)] });
    op.signature = await acct.signMessage({ message: { raw: h2 } });

    const txJ = await (await fetch(BUNDLER, { method: 'POST', headers: hdrs, body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'eth_sendUserOperation', params: [op, EP] }) })).json() as any;
    if (txJ.error) throw new Error(`send: ${JSON.stringify(txJ.error)}`);
    lastUOH = txJ.result; fired++;
    log(`[#${n}] SUBMITTED: ${lastUOH}`);

    setTimeout(async () => {
      try {
        const bal = await client.readContract({ address: ADDRESSES.tokens.USDC as Address, abi: ERC20_ABI, functionName: 'balanceOf', args: [DEST] }) as bigint;
        const now = Number(bal) / 1e6;
        if (now > profit) { ok++; log(`[#${n}] PROFIT: +${(now - profit).toFixed(4)} USDC | total: ${now.toFixed(4)}`); profit = now; }
        else { bad++; err(`[#${n}] no profit — op likely failed`); }
      } catch (e: any) { err(`[#${n}] profit check: ${e?.message}`); }
    }, 35_000);

  } catch (e: any) {
    lastErr = e?.message ?? String(e);
    err(`[#${n}] FAILED: ${lastErr}`);
  }
}
