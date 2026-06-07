/**
 * CoalitionBundleAPI — TheWarden AEV Pure Arbitrage Engine
 *
 * GL-L54: ALL crashes fixed — ]) bracket bug resolved. Process shields. as Address fix in EthPoolScanner.
 * GL-L55: Triangular arb support — buildTriPath hooked in. Handles hopCount=3 from EthPoolScanner.
 * GL-L55: CEX-DEX per-block trigger — Kraken REST price + QuoterV2 spread check every new block via WSS.
 * GL-L55: Multi-builder fan-out — Titan + bloXroute + Quasar (eth_sendBundle) alongside ThirdWeb UserOp.
 * GL-L56: Tenderly removed from mainnet hot path — was 8s latency (67% of 12s block window).
 *         Tenderly VNet = staging/test only. Use POST /simulate for pre-deploy calldata testing.
 * GL-L55: Surface-rate pre-filter — fast no-RPC spread check before QuoterV2 in EthPoolScanner.
 *
 * Dual trigger model:
 *   A) WSS watchBlockNumber → onBlock() → Kraken + QuoterV2 CEX-DEX spread check per block
 *   B) setInterval 15s → runArbCycle() → full pool scan (triangular + 2-hop)
 *   Both routes converge on executeArb() → UserOp + builder fan-out (no simulation delay)
 *
 * Endpoints:
 *   GET  /health  — liveness + uptime
 *   GET  /stats   — bundle stats
 *   GET  /arb       — arb loop status
 *   POST /simulate  — Tenderly VNet test: {calldata} → simulate without submitting to mainnet
 *   POST /          — eth_sendBundle compatible
 */

import express, { type Request, type Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import {
  createPublicClient, http as viemHttp, webSocket as viemWs,
  encodeFunctionData, parseUnits, getAddress,
  type Address, type Hex,
} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { FLASH_ABI, buildArbPath, buildTriPath } from '../config/arb';
import { ADDRESSES } from '../config/addresses';
import { ETH_MAINNET } from '../config/network';

// ── Process-level error shields (GL-L54) ─────────────────────────────────────
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

// ── Config ────────────────────────────────────────────────────────────────────
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
const QN_WSS         = ETH_MAINNET.rpc.wss;
const ARB_INTERVAL   = 15_000;
const KRAKEN_URL     = 'https://api.kraken.com/0/public/Ticker?pair=ETHUSD';
const CEX_DEX_FIRE_BPS = ETH_MAINNET.monitor.cexDexFireBps; // 15
const QUOTE_AMT      = BigInt(ETH_MAINNET.monitor.quoteAmountUsdc); // 10K USDC
const QUOTER_ADDR    = ADDRESSES.uniswapV3.quoterV2 as Address;

// ── Logger ────────────────────────────────────────────────────────────────────
const log  = (...a: any[]) => console.log( '[INF]', new Date().toISOString(), ...a);
const dbg  = (...a: any[]) => console.log( '[DBG]', new Date().toISOString(), ...a);
const err  = (...a: any[]) => console.error('[ERR]', new Date().toISOString(), ...a);
const warn = (...a: any[]) => console.warn( '[WRN]', new Date().toISOString(), ...a);

// ── State ─────────────────────────────────────────────────────────────────────
const START_TIME = Date.now();
const bundles    = new Map<string, any>();
let totalBundlesReceived = 0;
let totalBundlesIncluded = 0;
let arbScans = 0, arbFired = 0, arbSucceeded = 0, arbFailed = 0;
let lastScanTime = 0, lastOpp = '', lastUserOpHash = '', lastError = '';
let totalProfitUSDC = 0, lastProfitCheck = 0;
let krakenPrice = 0, krakenTs = 0;
let cexDexChecks = 0, cexDexFired = 0;
let fanoutResults: any[] = [];
let lastSimResult = '';

// ── ABIs ──────────────────────────────────────────────────────────────────────
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

const QUOTER_ABI = [{
  name: 'quoteExactInputSingle', type: 'function',
  inputs: [{ name: 'params', type: 'tuple', components: [
    { name: 'tokenIn',           type: 'address' },
    { name: 'tokenOut',          type: 'address' },
    { name: 'amountIn',          type: 'uint256' },
    { name: 'fee',               type: 'uint24'  },
    { name: 'sqrtPriceLimitX96', type: 'uint160' },
  ]}],
  outputs: [
    { name: 'amountOut',               type: 'uint256' },
    { name: 'sqrtPriceX96After',       type: 'uint160' },
    { name: 'initializedTicksCrossed', type: 'uint32'  },
    { name: 'gasEstimate',             type: 'uint256' },
  ],
  stateMutability: 'nonpayable',
}] as const;

// ── Public client ─────────────────────────────────────────────────────────────
const client  = createPublicClient({ chain: mainnet, transport: viemHttp(QN_HTTP) });
let scanner: any = null;

// ── CEX price cache ───────────────────────────────────────────────────────────
async function getKrakenPrice(): Promise<number> {
  if (Date.now() - krakenTs < 5_000 && krakenPrice > 0) return krakenPrice;
  try {
    const r = await fetch(KRAKEN_URL);
    const d = await r.json() as any;
    krakenPrice = parseFloat(d.result.XETHZUSD.c[0]);
    krakenTs    = Date.now();
    return krakenPrice;
  } catch { return krakenPrice || 0; }
}

// ── QuoterV2 single-hop quote ─────────────────────────────────────────────────
async function getDexPrice(tokenIn: string, tokenOut: string, fee: number): Promise<bigint> {
  try {
    const [amountOut] = await client.readContract({
      address: QUOTER_ADDR, abi: QUOTER_ABI, functionName: 'quoteExactInputSingle',
      args: [{ tokenIn: tokenIn as Address, tokenOut: tokenOut as Address, amountIn: QUOTE_AMT, fee, sqrtPriceLimitX96: 0n }],
    }) as readonly [bigint, bigint, number, bigint];
    return amountOut;
  } catch { return 0n; }
}

// ── Multi-builder fan-out (GL-L55) ────────────────────────────────────────────
// Submits eth_sendBundle to all builders in ETH_MAINNET.builders simultaneously.
// Used AFTER UserOp is submitted — gives double-coverage.
async function fanOutBundle(arbCalldata: Hex, targetBlock: bigint): Promise<void> {
  if (!EOA_PK) return;
  try {
    const account  = privateKeyToAccount(EOA_PK);
    const gasPrice = await client.getGasPrice();
    const nonce    = await client.getTransactionCount({ address: account.address });

    // Build a raw signed arb tx for bundle submission
    const rawTx = await (async () => {
      try {
        const signed = await account.signTransaction({
          to:       FLASH_SWAP,
          data:     arbCalldata,
          gasPrice: gasPrice + 100_000_000n,
          gas:      500_000n,
          nonce,
          chainId:  1,
          type:     'legacy',
        });
        return signed;
      } catch (e: any) {
        warn('[FAN-OUT] Could not sign raw tx:', e?.message?.slice(0,60));
        return null;
      }
    })();

    if (!rawTx) return;

    const payload = {
      txs:         [rawTx],
      blockNumber: `0x${targetBlock.toString(16)}`,
    };

    const results = await Promise.allSettled(
      ETH_MAINNET.builders.map(async (builder) => {
        const t0 = Date.now();
        try {
          const res = await fetch(builder.rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'eth_sendBundle', params:[payload] }),
            signal: AbortSignal.timeout(4000),
          });
          const data = await res.json() as any;
          const ms   = Date.now() - t0;
          if (data.error) {
            warn(`[FAN-OUT] ${builder.name} rejected: ${data.error.message?.slice(0,60)}`);
            return { builder: builder.name, ok: false, ms };
          }
          const hash = data.result?.bundleHash ?? data.result ?? '?';
          log(`[FAN-OUT] ✅ ${builder.name} | hash=${hash} | ${ms}ms`);
          return { builder: builder.name, ok: true, hash, ms };
        } catch (e: any) {
          warn(`[FAN-OUT] ${builder.name} error: ${e?.message?.slice(0,50)}`);
          return { builder: builder.name, ok: false, ms: Date.now()-t0 };
        }
      })
    );

    fanoutResults = results.map(r => r.status === 'fulfilled' ? r.value : { ok: false });
    const accepted = fanoutResults.filter(r => r.ok).length;
    log(`[FAN-OUT] ${accepted}/${ETH_MAINNET.builders.length} builders accepted | block=${targetBlock}`);
  } catch (e: any) {
    warn('[FAN-OUT] Error:', e?.message?.slice(0,80));
  }
}

// ── Tenderly simulation pre-flight (GL-L55) ──────────────────────────────
// Confirmed via bytecode: executeArbitrage selector 0x699c3de5 (5 params, 8-field SwapStep)
// Reverts at ~147,617 gas = FSV3:IFR (insufficient final return = not profitable yet)
// Tenderly gives full trace so we know exactly why every sim fails or succeeds.
const TENDERLY_KEY     = 'K5LF4-PBJUwWLL-BmD3LEn3e-GvguZ3k';
const TENDERLY_ACCOUNT = 'stableexo';
const TENDERLY_PROJECT = 'thewarden2';
const TENDERLY_SIM_URL = `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT}/project/${TENDERLY_PROJECT}/simulate`;

async function simulateBundle(arbCalldata: Hex): Promise<boolean> {
  try {
    const res = await fetch(TENDERLY_SIM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Access-Key': TENDERLY_KEY },
      body: JSON.stringify({
        network_id:      '1',
        from:            SMART_ACCOUNT,
        to:              FLASH_SWAP,
        input:           arbCalldata,
        gas:             700_000,
        gas_price:       '0',
        value:           '0',
        save:            true,
        save_if_fails:   true,
        simulation_type: 'quick',
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      lastSimResult = `tenderly HTTP ${res.status} — proceeding`;
      warn('[SIM]', lastSimResult);
      return true;  // Don't block on API errors
    }

    const data = await res.json() as any;
    const sim  = data?.simulation ?? {};
    const ok   = sim.status === true;
    const gas  = sim.gas_used ?? 0;
    const err  = sim.error_message ?? '';
    const sid  = sim.id ?? '?';
    const url  = `https://dashboard.tenderly.co/${TENDERLY_ACCOUNT}/${TENDERLY_PROJECT}/simulator/${sid}`;

    if (ok) {
      lastSimResult = `✅ Tenderly passed | gas=${gas.toLocaleString()} | ${url}`;
      log('[SIM]', lastSimResult);
      return true;
    }

    // FSV3:IFR = insufficient final return = not profitable (147K gas = full execution)
    const notProfitable = gas >= 140_000;
    lastSimResult = `❌ Tenderly ${notProfitable ? 'FSV3:IFR not profitable' : err.slice(0,60)} | gas=${gas} | ${url}`;
    warn('[SIM]', lastSimResult);
    return false;

  } catch (e: any) {
    lastSimResult = `sim error: ${e?.message?.slice(0,60)} — proceeding`;
    warn('[SIM]', lastSimResult);
    return true;  // Network error: don't block
  }
}

// ── CEX-DEX block check (GL-L55) ──────────────────────────────────────────────
// Runs on every new block via WSS watchBlockNumber.
// Checks Kraken price vs DEX price, fires if spread > CEX_DEX_FIRE_BPS.
async function onBlock(blockNumber: bigint): Promise<void> {
  cexDexChecks++;
  try {
    const [ethCex, weth5, weth30] = await Promise.all([
      getKrakenPrice(),
      getDexPrice(ADDRESSES.tokens.USDC, ADDRESSES.tokens.WETH, 500),
      getDexPrice(ADDRESSES.tokens.USDC, ADDRESSES.tokens.WETH, 3000),
    ]);

    if (ethCex === 0 || weth5 === 0n) return;

    const usdc10K   = Number(QUOTE_AMT) / 1e6;
    const dex5      = usdc10K / (Number(weth5) / 1e18);
    const dex30     = weth30 > 0n ? usdc10K / (Number(weth30) / 1e18) : 0;
    const spread5   = ((dex5 - ethCex) / ethCex) * 10_000;
    const poolDelta = dex5 > 0 && dex30 > 0 ? Math.abs(dex5 - dex30) / Math.min(dex5, dex30) * 10_000 : 0;
    const absBps    = Math.abs(spread5);

    const fireIcon = absBps >= CEX_DEX_FIRE_BPS ? '🔥' : (absBps > 8 ? '⚡' : '✅');
    dbg(`${fireIcon} Block ${blockNumber} | CEX=$${ethCex.toFixed(2)} | DEX-5bps=${spread5.toFixed(1)}bps | pool-Δ=${poolDelta.toFixed(1)}bps`);

    if (absBps >= CEX_DEX_FIRE_BPS || poolDelta >= ETH_MAINNET.monitor.poolFireBps) {
      cexDexFired++;
      log(`[CEX-DEX] 🚀 THRESHOLD HIT block=${blockNumber} | spread=${absBps.toFixed(1)}bps | pool-Δ=${poolDelta.toFixed(1)}bps`);
      // Trigger a full arb cycle immediately (scanner will find the opportunity)
      runArbCycle().catch(e => err('[CEX-DEX trigger] cycle failed:', e?.message));
    }
  } catch (e: any) {
    err('[onBlock]', e?.message?.slice(0,60));
  }
}

// ── Core arb execution (shared by timer + CEX-DEX trigger) ───────────────────
async function executeArb(opp: any, cycleId: number): Promise<void> {
  lastOpp = `${opp.label} | ${opp.estimatedProfitBps}bps`;
  log(`[ARB #${cycleId}] ✅ OPPORTUNITY: ${opp.label} | ${opp.estimatedProfitBps}bps`);

  // GL-L55: Use dynamically found optimal borrow from ternary search in scanner
  const actualBorrow = (opp as any).optimalBorrow ?? BORROW_AMOUNT;
  const minFinal     = actualBorrow * 1001n / 1000n;

  // Build path — 2-hop or 3-hop triangular
  const path = (opp as any).hopCount === 3 && (opp as any).midPool
    ? buildTriPath(
        getAddress(opp.buyPool.address),              opp.buyPool.token0  as Address, opp.buyPool.token1  as Address, opp.buyPool.fee  ?? 500,  0,
        getAddress((opp as any).midPool.address),     (opp as any).midPool.token0 as Address, (opp as any).midPool.token1 as Address, (opp as any).midPool.fee ?? 3000, 0,
        getAddress(opp.sellPool.address),             opp.sellPool.token0 as Address, opp.sellPool.token1 as Address, opp.sellPool.fee ?? 3000, 0,
        actualBorrow, minFinal,
      )
    : buildArbPath(
        getAddress(opp.buyPool.address),  opp.buyPool.token0 as Address,  opp.buyPool.token1 as Address,  opp.buyPool.fee  ?? 500,  0n, 0,
        getAddress(opp.sellPool.address), opp.sellPool.token0 as Address, opp.sellPool.token1 as Address, opp.sellPool.fee ?? 3000, 0n, 0,
        actualBorrow, minFinal,
      );

  const arbCalldata = encodeFunctionData({
    abi: FLASH_ABI, functionName: 'executeArbitrage',
    args: [
      ADDRESSES.tokens.USDC as Address, actualBorrow,
      path,
      0, '0x0000000000000000000000000000000000000000' as Address, // source=0 → Balancer (0% fee!)
    ],
  });

  // ── Step 1: ThirdWeb UserOp (free gas via ERC-4337 paymaster) ─────────────────────
  // GL-L56: Tenderly pre-flight removed — adds up to 8s latency on a 12s block window.
  // Tenderly is now VNET-only (staging). Use POST /simulate to test calldata before deploying.
  const executeCalldata = encodeFunctionData({
    abi: SIMPLE_ACCOUNT_ABI, functionName: 'execute',
    args: [FLASH_SWAP, 0n, arbCalldata],
  });

  const nonce    = await client.readContract({ address: ENTRY_POINT, abi: NONCE_ABI, functionName: 'getNonce', args: [SMART_ACCOUNT, 0n] });
  const gasPrice = await client.getGasPrice();
  const account  = privateKeyToAccount(EOA_PK);
  const hdrs: Record<string,string> = { 'Content-Type': 'application/json', 'x-client-id': TW_CLIENT_ID };
  const STUB_SIG = ('0x' + 'ff'.repeat(64) + '1c') as Hex;
  const currentBlock = await client.getBlockNumber();

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
  log(`[ARB #${cycleId}] 🚀 UserOp SUBMITTED! Hash: ${lastUserOpHash}`);

  // ── Step 2: Multi-builder fan-out (GL-L55) ──────────────────────────────
  log(`[ARB #${cycleId}] Fanning out to ${ETH_MAINNET.builders.length} builders...`);
  fanOutBundle(arbCalldata, currentBlock + 1n).catch(e => warn('[FAN-OUT] error:', e?.message));

  // ── Step 3: Profit check 35s later ──────────────────────────────────────
  setTimeout(async () => {
    try {
      const usdcAfter = await client.readContract({
        address: ADDRESSES.tokens.USDC as Address, abi: ERC20_ABI,
        functionName: 'balanceOf', args: [PROFIT_DEST],
      }) as bigint;
      const profit = Number(usdcAfter - BigInt(lastProfitCheck)) / 1e6;
      lastProfitCheck = Number(usdcAfter);
      if (profit > 0) { totalProfitUSDC += profit; arbSucceeded++; log(`[ARB #${cycleId}] 💰 +${profit.toFixed(4)} USDC`); }
      else { arbFailed++; warn(`[ARB #${cycleId}] No profit detected — inner op may have failed`); }
    } catch (e: any) { err(`[ARB #${cycleId}] profit check: ${e?.message}`); }
  }, 35_000);
}

// ── Arb Cycle (timer-based, full pool scan) ───────────────────────────────────
async function runArbCycle() {
  if (!EOA_PK) { warn('ETH_PRIVATE_KEY not set — arb loop disabled'); return; }
  if (!scanner) { warn('Scanner not loaded'); return; }

  const cycleId = ++arbScans;
  lastScanTime  = Date.now();

  try {
    dbg(`[ARB #${cycleId}] Scanning pools...`);
    const opps = await scanner.findOpportunities();
    if (!opps.length) { dbg(`[ARB #${cycleId}] No Q2-confirmed opportunities`); return; }

    await executeArb(opps[0], cycleId);
  } catch (e: any) {
    lastError = e?.message || String(e);
    err(`[ARB #${cycleId}] CYCLE FAILED: ${lastError}`);
  }
}

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: any) => {
  dbg(`→ ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok', builder: 'TheWarden AEV GL-L55',
    refundBps: REFUND_BPS, refundPct: '95%',
    pendingBundles: bundles.size,
    uptime: (Date.now() - START_TIME) / 1000,
    krakenPrice: krakenPrice > 0 ? `$${krakenPrice.toFixed(2)}` : 'fetching...',
  });
});

app.get('/stats', (_req: Request, res: Response) => {
  res.json({ totalBundlesReceived, totalBundlesIncluded, pendingBundles: bundles.size });
});

app.get('/arb', (_req: Request, res: Response) => {
  res.json({
    status:         EOA_PK ? 'running' : 'disabled (no ETH_PRIVATE_KEY)',
    contract:       FLASH_SWAP, profitDest: PROFIT_DEST,
    scans:          arbScans, fired: arbFired, succeeded: arbSucceeded, failed: arbFailed,
    totalProfitUSDC: totalProfitUSDC.toFixed(6),
    lastScanTime:   lastScanTime ? new Date(lastScanTime).toISOString() : 'never',
    // CEX-DEX stats
    cexDexChecks, cexDexFired,
    krakenPrice:    krakenPrice > 0 ? `$${krakenPrice.toFixed(2)}` : 'fetching...',
    // Simulation stats
    lastSimResult,
    // Fan-out stats
    lastFanout:     fanoutResults,
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

app.post('/simulate', async (req: Request, res: Response) => {
  const { calldata } = req.body ?? {};
  if (!calldata) return res.status(400).json({ error: 'calldata required' });
  try {
    const ok = await simulateBundle(calldata as Hex);
    res.json({ ok, result: lastSimResult });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

app.get('/relay/v1/bundle/list', (_req: Request, res: Response) => {
  res.json([...bundles.values()]);
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  log(`🚀 TheWarden AEV GL-L55 on port ${PORT}`);
  log(`   Contract:  ${FLASH_SWAP}`);
  log(`   ProfDest:  ${PROFIT_DEST}`);
  log(`   EOA_PK:    ${EOA_PK ? 'SET' : 'NOT SET'}`);
  log(`   Flash src: Balancer (0% fee) — source=0`);
  log(`   Builders:  ${ETH_MAINNET.builders.map(b => b.name).join(', ')}`);

  // Dynamic scanner import
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
    log('✅ Starting arb scan loop (timer + WSS block trigger)...');

    // A) Timer-based full scan every 15s
    runArbCycle().catch(e => err('Boot cycle:', e?.message));
    setInterval(() => runArbCycle().catch(e => err('Interval:', e?.message)), ARB_INTERVAL);

    // B) WSS per-block CEX-DEX check (GL-L55) — new block = instant CEX-DEX signal check
    try {
      const wssClient = createPublicClient({ chain: mainnet, transport: viemWs(QN_WSS) });
      await wssClient.watchBlockNumber({
        onBlockNumber: (blockNumber) => {
          onBlock(blockNumber).catch(e => err('[WSS onBlock]', e?.message?.slice(0,60)));
        },
      });
      log('✅ WSS block watcher active — CEX-DEX check on every new block');
    } catch (e: any) {
      warn('⚠️  WSS block watcher failed to start:', e?.message?.slice(0,80));
      warn('   Falling back to timer-only mode');
    }
  }
});