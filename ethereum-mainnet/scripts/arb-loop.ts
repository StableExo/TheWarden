/**
 * arb-loop.ts — TheWarden CEX-DEX Arb Engine (VL-15)
 *
 * Replaces the GL-L54 diagnostic stub. Runs the real scan-execute loop.
 *
 * Flow (every SCAN_INTERVAL_MS):
 *   1. Check ETH spread from EthPoolScanner
 *   2. If spread >= MIN_SPREAD_BPS: call arb-execute logic
 *   3. Expose /health + /arb /status endpoints for Render monitoring
 *
 * Critical fixes (VL-15):
 *   - Bug 1 FIX: Real arb engine, not a stub
 *   - Bug 2 FIX: Live ETH price fetched from Kraken, refreshed every 60s
 *   - Bug 3 FIX: Profit thresholds tuned to realistic levels
 *
 * Usage:
 *   npx tsx ethereum-mainnet/scripts/arb-loop.ts
 *   npx tsx ethereum-mainnet/scripts/arb-loop.ts --dry-run
 *
 * VL-15 | TheWarden | @StableExo
 */

import http from 'http';
import {
  createPublicClient, http as viemHttp, webSocket, encodeFunctionData, parseUnits, getAddress,
  type Address, type Hex,
} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { EthPoolScanner } from '../scanner/EthPoolScanner';
import { FLASH_ABI, buildArbPath } from '../config/arb';
import { ADDRESSES } from '../config/addresses';
import { ETH_MAINNET } from '../config/network';

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT              = parseInt(process.env.PORT ?? '10000');
const EOA_PK            = process.env.ETH_PRIVATE_KEY as Hex;
const THIRDWEB_CLIENT_ID = process.env.THIRDWEB_CLIENT_ID || '0282b1b3ed884ef92509e46b8da1fad7';
const THIRDWEB_SECRET_KEY = process.env.THIRDWEB_SECRET_KEY || '';
const BUNDLER_URL       = 'https://api.pimlico.io/v2/ethereum/rpc?apikey=pim_FrLy7ab9HvvjQkTWXcBEmx'; // VL-18: ThirdWeb mainnet billing required — switched to Pimlico
const ENTRY_POINT_V06   = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address;
const SMART_ACCOUNT     = '0x9Cf21D503EAe5Cf33f9c4c58C75e16065007f367' as Address;
const FLASH_SWAP        = ADDRESSES.flashSwapV3ETH as Address;
const PROFIT_DEST       = ETH_MAINNET.wallet.eoa as Address;
const BORROW_AMOUNT     = parseUnits('100000', 6);   // 100K USDC
const MIN_PROFIT_BPS    = 10;                         // only fire if >= 10bps
const SCAN_INTERVAL_MS  = 12_000;                     // every ~1 block (12s)
const PRICE_REFRESH_MS  = 60_000;                     // refresh ETH price every 60s

const DRY_RUN = process.argv.includes('--dry-run');

// ─── State ────────────────────────────────────────────────────────────────────
const START = Date.now();
let scans      = 0;
let fires      = 0;
let lastScan   = 0;
let lastFire   = 0;
let lastOpp: string | null = null;
const FIRE_COOLDOWN_MS = 45_000; // FIX #5 VL-18: 45s cooldown after fire — prevents AA25 nonce collision
let liveEthPriceUsd = 0;  // Bug 2 FIX: live price, never hardcoded

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const SIMPLE_ACCOUNT_ABI = [{
  name: 'execute', type: 'function',
  inputs: [
    { name: 'dest',  type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'func',  type: 'bytes'   },
  ],
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
  outputs: [{ name: '', type: 'bytes32' }],
  stateMutability: 'view',
}] as const;

const NONCE_ABI = [{
  name: 'getNonce', type: 'function',
  inputs: [{ name: 'key', type: 'uint192' }],
  outputs: [{ name: '', type: 'uint256' }],
  stateMutability: 'view',
}] as const;

// ─── Bug 2 FIX: Live ETH price from Kraken ────────────────────────────────────
async function fetchKrakenEthPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.kraken.com/0/public/Ticker?pair=ETHUSD', {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as any;
    const price = parseFloat(data?.result?.XETHZUSD?.c?.[0] ?? '0');
    if (price > 100) {  // sanity check
      liveEthPriceUsd = price;
      console.log(`[PRICE] Kraken ETH: $${price.toFixed(2)}`);
      return price;
    }
    throw new Error(`Implausible price: ${price}`);
  } catch (e: any) {
    console.error(`[PRICE ERR] Kraken fetch failed: ${e?.message} — keeping $${liveEthPriceUsd || '?'}`);
    return liveEthPriceUsd;
  }
}

// ─── Execute one arb attempt ──────────────────────────────────────────────────
async function executeArb(opp: any, client: ReturnType<typeof createPublicClient>, account: any): Promise<void> {
  console.log(`\n[ARB] Executing: ${opp.label}`);

  const gas = await client.getGasPrice();

  // FIX #3 VL-18: use actual borrow size for minOut, not hardcoded constant
  const actualBorrow = opp.optimalBorrow ?? BORROW_AMOUNT;
  const minFinal = actualBorrow * 1001n / 1000n;
  const path = buildArbPath(
    getAddress(opp.buyPool.address),  opp.buyPool.token0,  opp.buyPool.token1,
    opp.buyPool.fee  ?? 500,          0n,                  0,
    getAddress(opp.sellPool.address), opp.sellPool.token0, opp.sellPool.token1,
    opp.sellPool.fee ?? 3000,         minFinal,             0,
    actualBorrow, minFinal,
  );

  const arbCalldata = encodeFunctionData({
    abi: FLASH_ABI, functionName: 'executeArbitrage',
    args: [
      ADDRESSES.tokens.USDC as Address,
      actualBorrow,
      path,
      0,
      '0x0000000000000000000000000000000000000000' as Address,
    ],
  });

  const saCalldata = encodeFunctionData({
    abi: SIMPLE_ACCOUNT_ABI, functionName: 'execute',
    args: [FLASH_SWAP, 0n, arbCalldata],
  });

  if (DRY_RUN) {
    console.log(`[ARB DRY-RUN] calldata built (${saCalldata.length / 2} bytes) — skipping UserOp submission`);
    return;
  }

  const hdrs: Record<string, string> = {
    'Content-Type': 'application/json',
    // VL-18: Pimlico uses apikey in URL — no extra auth header needed
  };
  if (THIRDWEB_SECRET_KEY) hdrs['x-secret-key'] = THIRDWEB_SECRET_KEY;

  const nonce = await client.readContract({
    address: SMART_ACCOUNT, abi: NONCE_ABI,
    functionName: 'getNonce', args: [0n],
  });

  let userOp: any = {
    sender:               SMART_ACCOUNT,
    nonce:                `0x${nonce.toString(16)}`,
    initCode:             '0x',
    callData:             saCalldata,
    callGasLimit:         '0x7A120',
    verificationGasLimit: '0x186A0',
    preVerificationGas:   '0xC350',
    maxFeePerGas:         `0x${(gas * 2n).toString(16)}`,
    maxPriorityFeePerGas: '0x3B9ACA00',
    paymasterAndData:     '0x',
    signature:            '0x',
  };

  const toContract = (op: any) => ({
    ...op, nonce,
    callGasLimit:         BigInt(op.callGasLimit),
    verificationGasLimit: BigInt(op.verificationGasLimit),
    preVerificationGas:   BigInt(op.preVerificationGas),
    maxFeePerGas:         BigInt(op.maxFeePerGas),
    maxPriorityFeePerGas: BigInt(op.maxPriorityFeePerGas),
  });

  // Paymaster stub
  const stubRes = await fetch(BUNDLER_URL, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'pm_getPaymasterStubData', params:[userOp, ENTRY_POINT_V06, '0x1', {}] }),
  });
  const stubJ = await stubRes.json() as any;
  if (stubJ.error) throw new Error(`Paymaster stub: ${JSON.stringify(stubJ.error)}`);
  userOp.paymasterAndData = stubJ.result.paymasterAndData;

  // Sign
  const hash1 = await client.readContract({ address: ENTRY_POINT_V06, abi: EP_ABI, functionName: 'getUserOpHash', args: [toContract(userOp)] });
  userOp.signature = await account.signMessage({ message: { raw: hash1 } });

  // Sponsor gas
  const sponsorRes = await fetch(BUNDLER_URL, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({ jsonrpc:'2.0', id:2, method:'pm_sponsorUserOperation', params:[userOp, ENTRY_POINT_V06, {}] }),
  });
  const sponsorJ = await sponsorRes.json() as any;
  if (sponsorJ.error) throw new Error(`Sponsor: ${JSON.stringify(sponsorJ.error)}`);
  Object.assign(userOp, {
    paymasterAndData: sponsorJ.result.paymasterAndData,
    ...(sponsorJ.result.callGasLimit         && { callGasLimit:         sponsorJ.result.callGasLimit }),
    ...(sponsorJ.result.verificationGasLimit && { verificationGasLimit: sponsorJ.result.verificationGasLimit }),
    ...(sponsorJ.result.preVerificationGas   && { preVerificationGas:   sponsorJ.result.preVerificationGas }),
  });

  // Re-sign with final gas
  const hash2 = await client.readContract({ address: ENTRY_POINT_V06, abi: EP_ABI, functionName: 'getUserOpHash', args: [toContract(userOp)] });
  userOp.signature = await account.signMessage({ message: { raw: hash2 } });

  // Submit
  const sendRes = await fetch(BUNDLER_URL, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({ jsonrpc:'2.0', id:3, method:'eth_sendUserOperation', params:[userOp, ENTRY_POINT_V06] }),
  });
  const sendJ = await sendRes.json() as any;
  if (sendJ.error) throw new Error(`Submit: ${JSON.stringify(sendJ.error)}`);

  const userOpHash = sendJ.result;
  fires++;
  lastFire = Date.now();
  console.log(`[ARB ✅] Submitted! UserOp: ${userOpHash}`);
  console.log(`[ARB]    Track: https://jiffyscan.xyz/userOpHash/${userOpHash}`);
}

// ─── Main scan loop ───────────────────────────────────────────────────────────
async function runScanLoop(): Promise<void> {
  if (!EOA_PK) {
    console.error('[FATAL] ETH_PRIVATE_KEY not set — cannot execute arb');
    if (!DRY_RUN) process.exit(1);
  }

  const client = createPublicClient({
    chain: mainnet,
    transport: viemHttp(ETH_MAINNET.rpc.http),
  });
  const account = EOA_PK ? privateKeyToAccount(EOA_PK) : null;
  const scanner = new EthPoolScanner();

  // Bug 2 FIX: Fetch live price immediately, then refresh every 60s
  await fetchKrakenEthPrice();
  setInterval(fetchKrakenEthPrice, PRICE_REFRESH_MS);

  console.log(`[LOOP] Starting arb loop — interval=${SCAN_INTERVAL_MS}ms | min_spread=${MIN_PROFIT_BPS}bps | mode=${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);

  const tick = async () => {
    // FIX #5 VL-18: skip scan if within cooldown window after a fire
    if (lastFire > 0 && Date.now() - lastFire < FIRE_COOLDOWN_MS) {
      const remaining = Math.ceil((FIRE_COOLDOWN_MS - (Date.now() - lastFire)) / 1000);
      console.log(`[COOLDOWN] ${remaining}s remaining after last fire — skipping scan`);
      return;
    }
    scans++;
    lastScan = Date.now();
    try {
      const [block, gas, opps] = await Promise.all([
        client.getBlockNumber(),
        client.getGasPrice(),
        scanner.findOpportunities(),
      ]);
      const gasGwei = (Number(gas) / 1e9).toFixed(1);
      console.log(`[SCAN #${scans}] Block=${block} | Gas=${gasGwei}gwei | ETH=$${liveEthPriceUsd.toFixed(0)} | opps=${opps.length}`);

      if (opps.length > 0) {
        const opp = opps[0];
        lastOpp = opp.label;
        console.log(`[OPP] ${opp.label} | spread=${opp.estimatedProfitBps}bps | borrow=${opp.optimalBorrow ? (Number(opp.optimalBorrow)/1e6).toFixed(0)+'K' : '100K'} USDC`);

        if (opp.estimatedProfitBps >= MIN_PROFIT_BPS && account) {
          await executeArb(opp, client, account);
        } else if (opp.estimatedProfitBps < MIN_PROFIT_BPS) {
          console.log(`[SKIP] ${opp.estimatedProfitBps}bps < ${MIN_PROFIT_BPS}bps threshold`);
        }
      }
    } catch (e: any) {
      console.error(`[SCAN ERR] ${e?.message?.slice(0, 120)}`);
    }
  };

  // First tick immediately, then on interval
  await tick();
  setInterval(tick, SCAN_INTERVAL_MS);
}

// ─── Health server ────────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => console.error('[SHIELD] unhandledRejection:', reason));
process.on('uncaughtException',  (e)      => console.error('[SHIELD] uncaughtException:',  e?.message || e));

const srv = http.createServer((req, res) => {
  const url = req.url ?? '/';
  res.setHeader('Content-Type', 'application/json');

  if (url.startsWith('/health')) {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      mode:   DRY_RUN ? 'dry-run' : 'live',
      uptime: ((Date.now() - START) / 1000).toFixed(0) + 's',
      eth:    `$${liveEthPriceUsd.toFixed(2)}`,
    }));
    return;
  }

  if (url.startsWith('/arb') || url.startsWith('/status')) {
    res.writeHead(200);
    res.end(JSON.stringify({
      status:     'running',
      mode:       DRY_RUN ? 'dry-run' : 'live',
      uptime:     ((Date.now() - START) / 1000).toFixed(0) + 's',
      scans,
      fires,
      lastScanAgo: lastScan ? `${((Date.now() - lastScan) / 1000).toFixed(0)}s ago` : 'never',
      lastFireAgo: lastFire ? `${((Date.now() - lastFire) / 1000).toFixed(0)}s ago` : 'never',
      lastOpp,
      ethPriceUsd:  liveEthPriceUsd,
      minSpreadBps: MIN_PROFIT_BPS,
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});

srv.listen(PORT, () => {
  console.log(`[INF] ${new Date().toISOString()} TheWarden ARB ENGINE on port ${PORT} (VL-15)`);
  console.log(`[INF] ETH_PRIVATE_KEY: ${EOA_PK ? 'SET' : 'NOT SET'}`);
  console.log(`[INF] NODE_ENV: ${process.env.NODE_ENV ?? 'undefined'}`);
  console.log(`[INF] DRY_RUN: ${DRY_RUN}`);
  runScanLoop().catch(e => {
    console.error('[FATAL] Loop crashed:', e?.message);
    process.exit(1);
  });
});
