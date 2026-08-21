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
const ARKHAM_KEY        = process.env.ARKHAM_KEY        ?? '';
const ZERION_KEY        = process.env.ZERION_KEY        ?? '';
const QN_HTTP_URL       = process.env.QN_HTTP_URL       ?? '';
// Shared proxy secret — scanner must send this to authenticate /scan/proxy calls
const PROXY_SECRET      = process.env.PROXY_SECRET      ?? 'warden-proxy-vl31';
const EOA_PK            = process.env.ETH_PRIVATE_KEY as Hex;
const THIRDWEB_CLIENT_ID = process.env.THIRDWEB_CLIENT_ID || '0282b1b3ed884ef92509e46b8da1fad7';
const THIRDWEB_SECRET_KEY = process.env.THIRDWEB_SECRET_KEY || '';
// VL-18: ThirdWeb mainnet billing required — switched to Pimlico
// VL-20: Pimlico v2 API — pm_sponsorUserOperation params[2] must be {} (context object), NOT "0x1" string
const BUNDLER_URL       = 'https://api.pimlico.io/v2/ethereum/rpc?apikey=pim_FrLy7ab9HvvjQkTWXcBEmx';
const ENTRY_POINT_V06   = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address;
const SMART_ACCOUNT     = '0x9Cf21D503EAe5Cf33f9c4c58C75e16065007f367' as Address;
const FLASH_SWAP        = ADDRESSES.flashSwapV3ETH as Address;
const PROFIT_DEST       = ETH_MAINNET.wallet.eoa as Address;
const BORROW_AMOUNT     = parseUnits('100000', 6);   // 100K USDC
const MIN_PROFIT_BPS    = 7;                          // VL-19: fee cost 6bps (0.05%+0.01%), fire at 7bps net minimum
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
  console.log(`\n[ARB] Executing: ${opp.label} | dryRun=${DRY_RUN}`);

  // VL-19: Floor gas at 3 gwei — getGasPrice() returns 0 from some RPC states, which makes maxFeePerGas=0 and Pimlico rejects the UserOp
  const gasRaw = await client.getGasPrice();
  const gas = gasRaw > 0n ? gasRaw : 3_000_000_000n;

  // VL-19: Fix token direction bug — sell leg must be WETH→USDC, not USDC→WETH
  // Fix minFinal — only needs to exceed borrow by 1 unit; real gate is FSV3:NOP on-chain
  const actualBorrow = opp.optimalBorrow ?? BORROW_AMOUNT;
  const minFinal = actualBorrow + 1n;  // any profit passes; contract enforces FSV3:NOP
  const path = buildArbPath(
    getAddress(opp.buyPool.address),  opp.buyPool.token0,  opp.buyPool.token1,
    opp.buyPool.fee  ?? 500,          0n,                  0,
    // sell leg: WETH→USDC — token1→token0, so swap token0/token1 order
    getAddress(opp.sellPool.address), opp.sellPool.token1, opp.sellPool.token0,
    opp.sellPool.fee ?? 100,          0n,                  0,
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

  // VL-20: Correct Pimlico v2 flow:
  // Step 1 — get stub paymasterAndData so we can sign a complete op
  const stubRes = await fetch(BUNDLER_URL, {
    method: 'POST', headers: hdrs,
    // VL-20 FIX: params[2] is {} context object, NOT "0x1" string (causes validation error)
    body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'pm_getPaymasterStubData', params:[userOp, ENTRY_POINT_V06, {}] }),
  });
  const stubJ = await stubRes.json() as any;
  if (stubJ.error) throw new Error(`Paymaster stub: ${JSON.stringify(stubJ.error)}`);
  userOp.paymasterAndData = stubJ.result.paymasterAndData;
  console.log(`[ARB] Stub paymasterAndData: ${(userOp.paymasterAndData as string).slice(0, 20)}...`);

  // Step 2 — sign with stub data so simulation can validate signature
  const hash1 = await client.readContract({ address: ENTRY_POINT_V06, abi: EP_ABI, functionName: 'getUserOpHash', args: [toContract(userOp)] });
  userOp.signature = await account.signMessage({ message: { raw: hash1 } });
  console.log(`[ARB] Step 1 signed. Requesting gas sponsorship...`);

  // Step 3 — get final paymasterAndData + gas limits from Pimlico
  const sponsorRes = await fetch(BUNDLER_URL, {
    method: 'POST', headers: hdrs,
    // VL-20 FIX: params[2] is {} context, not "0x1"
    body: JSON.stringify({ jsonrpc:'2.0', id:2, method:'pm_sponsorUserOperation', params:[userOp, ENTRY_POINT_V06, {}] }),
  });
  const sponsorJ = await sponsorRes.json() as any;
  console.log(`[ARB] Sponsor response: ${JSON.stringify(sponsorJ).slice(0, 120)}`);
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

  // ── /scan/proxy — TLS-blocked forensic tool relay ────────────────────────
  // Called by warden_forensic_scan.py for tools that 403/timeout from Vellum
  // container: QuickNode RPC, Arkham REST, Zerion REST.
  // Auth: X-Proxy-Secret header must match PROXY_SECRET env var.
  if (url.startsWith('/scan/proxy') && req.method === 'POST') {
    const secret = req.headers['x-proxy-secret'] ?? '';
    if (secret !== PROXY_SECRET) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', async () => {
      let address = '';
      let tools: string[] = ['quicknode', 'arkham', 'zerion'];
      try {
        const parsed = JSON.parse(body);
        address = (parsed.address ?? '').toLowerCase();
        if (parsed.tools) tools = parsed.tools;
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'invalid JSON body' }));
        return;
      }

      if (!address || !address.startsWith('0x')) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'address required (0x...)' }));
        return;
      }

      const out: Record<string, unknown> = {};

      await Promise.all(tools.map(async (tool) => {
        try {
          if (tool === 'quicknode') out.quicknode  = await proxyQuickNode(address);
          if (tool === 'arkham')    out.arkham     = await proxyArkham(address);
          if (tool === 'zerion')    out.zerion     = await proxyZerion(address);
        } catch (e: any) {
          out[tool] = { error: String(e?.message ?? e).slice(0, 120) };
        }
      }));

      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', address, results: out }));
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found' }));
});

// ─── Proxy tool functions (run on Render, TLS unrestricted) ──────────────────

async function proxyQuickNode(address: string): Promise<Record<string, unknown>> {
  if (!QN_HTTP_URL) return { error: 'QN_HTTP_URL not set on Render' };
  const rpc = async (method: string, params: unknown[]) => {
    const r = await fetch(QN_HTTP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(12000),
    });
    const j = await r.json() as any;
    return j.result;
  };
  const [bal, nonce, code, block] = await Promise.all([
    rpc('eth_getBalance',          [address, 'latest']),
    rpc('eth_getTransactionCount', [address, 'latest']),
    rpc('eth_getCode',             [address, 'latest']),
    rpc('eth_blockNumber',         []),
  ]);
  return {
    balance_eth:  bal   ? parseInt(bal,   16) / 1e18 : 0,
    nonce:        nonce ? parseInt(nonce, 16)         : 0,
    is_contract:  code  ? code.length > 4            : false,
    latest_block: block ? parseInt(block, 16)         : 0,
    source:       'render-proxy',
  };
}

async function proxyArkham(address: string): Promise<Record<string, unknown>> {
  if (!ARKHAM_KEY) return { error: 'ARKHAM_KEY not set on Render' };
  const hdrs = { 'API-Key': ARKHAM_KEY, 'Accept': 'application/json' };
  const out: Record<string, unknown> = {};

  const [entityRes, transferRes, cpRes, balRes] = await Promise.allSettled([
    fetch(`https://api.arkm.com/entity/${address}`,                                              { headers: hdrs, signal: AbortSignal.timeout(15000) }),
    fetch(`https://api.arkm.com/transfers?base=${address}&limit=20&sortKey=time&sortDir=desc`,   { headers: hdrs, signal: AbortSignal.timeout(15000) }),
    fetch(`https://api.arkm.com/counterparties/address/${address}?limit=10`,                     { headers: hdrs, signal: AbortSignal.timeout(15000) }),
    fetch(`https://api.arkm.com/balances/address/${address}`,                                    { headers: hdrs, signal: AbortSignal.timeout(15000) }),
  ]);

  if (entityRes.status === 'fulfilled' && entityRes.value.ok) {
    const ej = await entityRes.value.json() as any;
    out.entity = ej?.name ?? ej?.entity?.name ?? 'Unknown / Unlabeled';
  } else { out.entity = 'fetch_error'; }

  if (transferRes.status === 'fulfilled' && transferRes.value.ok) {
    const tj = await transferRes.value.json() as any;
    const transfers = tj?.transfers ?? [];
    out.transfer_count = tj?.count ?? transfers.length;
    out.transfers = transfers.slice(0, 10).filter((tr: any) => typeof tr === 'object').map((tr: any) => ({
      time:        String(tr.blockTimestamp ?? '').slice(0, 10),
      from:        String(tr.fromAddress?.address ?? '?').slice(0, 22),
      from_entity: String(tr.fromAddress?.arkhamEntity?.name ?? '?').slice(0, 20),
      to:          String(tr.toAddress?.address ?? '?').slice(0, 22),
      to_entity:   String(tr.toAddress?.arkhamEntity?.name ?? '?').slice(0, 20),
      amount:      String(tr.unitValue ?? '?').slice(0, 14),
      token:       String(tr.tokenAddress?.symbol ?? 'ETH').slice(0, 8),
      chain:       String(tr.fromAddress?.chain ?? '?').slice(0, 8),
    }));
  } else { out.transfers = []; out.transfer_error = 'fetch_error'; }

  if (cpRes.status === 'fulfilled' && cpRes.value.ok) {
    const cpj = await cpRes.value.json() as any;
    const cpIter: any[] = Array.isArray(cpj) ? [cpj] : Object.values(cpj ?? {});
    const counterparties: unknown[] = [];
    for (const chainCps of cpIter) {
      if (!Array.isArray(chainCps)) continue;
      for (const entry of chainCps.slice(0, 5)) {
        const addrInfo = entry.address ?? {};
        counterparties.push({
          address: String(addrInfo.address ?? '?').slice(0, 22),
          entity:  String(addrInfo.arkhamEntity?.name ?? 'Unknown').slice(0, 25),
          usd:     Math.round((entry.usd ?? 0) * 100) / 100,
          tx_count: entry.transactionCount ?? 0,
          flow:    entry.flow ?? '?',
        });
      }
    }
    out.counterparties = counterparties.sort((a: any, b: any) => b.usd - a.usd).slice(0, 8);
  } else { out.counterparties = []; }

  if (balRes.status === 'fulfilled' && balRes.value.ok) {
    const bj = await balRes.value.json() as any;
    const balOut: Record<string, number> = {};
    for (const [chain, tokens] of Object.entries(bj ?? {})) {
      if (!Array.isArray(tokens)) continue;
      const total = (tokens as any[]).reduce((s, t) => s + parseFloat(t?.usdValue ?? 0), 0);
      if (total > 0) balOut[chain] = Math.round(total * 100) / 100;
    }
    out.balances = balOut;
  }

  out.source = 'render-proxy';
  return out;
}

async function proxyZerion(address: string): Promise<Record<string, unknown>> {
  if (!ZERION_KEY) return { error: 'ZERION_KEY not set on Render' };
  const token = btoa(`${ZERION_KEY}:`);
  const hdrs  = { 'Authorization': `Basic ${token}`, 'Accept': 'application/json' };
  const addr  = address.toLowerCase();
  const out: Record<string, unknown> = { status: 'ok', source: 'render-proxy' };

  const [posRes, defiRes] = await Promise.allSettled([
    fetch(`https://api.zerion.io/v1/wallets/${addr}/positions/?filter[position_types]=wallet&currency=usd&sort=value&page[size]=10`, { headers: hdrs, signal: AbortSignal.timeout(15000) }),
    fetch(`https://api.zerion.io/v1/wallets/${addr}/positions/?filter[position_types]=deposited,borrowed,staked&currency=usd&page[size]=5`, { headers: hdrs, signal: AbortSignal.timeout(15000) }),
  ]);

  if (posRes.status === 'fulfilled' && posRes.value.ok) {
    const pj = await posRes.value.json() as any;
    const items: any[] = pj?.data ?? [];
    let total = 0;
    const positions = items.slice(0, 10).map((item: any) => {
      const attr = item?.attributes ?? {};
      const val  = parseFloat(attr.value ?? 0);
      total += val;
      return { symbol: attr.fungible_info?.symbol ?? '?', balance: attr.quantity?.float ?? 0, usd: Math.round(val * 100) / 100 };
    });
    out.total_usd  = Math.round(total * 100) / 100;
    out.positions  = positions;
    out.pos_count  = items.length;
  } else {
    out.positions_error = `HTTP ${(posRes as any)?.value?.status ?? 'fetch_error'}`;
  }

  if (defiRes.status === 'fulfilled' && defiRes.value.ok) {
    const dj = await defiRes.value.json() as any;
    out.defi_positions = (dj?.data ?? []).slice(0, 5).map((item: any) => ({
      protocol: item?.relationships?.protocol?.data?.id ?? '?',
      type:     item?.attributes?.position_type ?? '?',
      usd:      Math.round(parseFloat(item?.attributes?.value ?? 0) * 100) / 100,
    }));
  }

  return out;
}

srv.listen(PORT, () => {
  console.log(`[INF] ${new Date().toISOString()} TheWarden ARB ENGINE on port ${PORT} (VL-20)`);
  console.log(`[INF] ETH_PRIVATE_KEY: ${EOA_PK ? 'SET ✅' : 'NOT SET ❌ — cannot execute'}`);
  console.log(`[INF] QN_HTTP_URL: ${process.env.QN_HTTP_URL ? 'SET ✅ (' + process.env.QN_HTTP_URL.slice(0,40) + '...)' : 'NOT SET ⚠️ — using hardcoded fallback'}`);
  console.log(`[INF] THIRDWEB_SECRET_KEY: ${process.env.THIRDWEB_SECRET_KEY ? 'SET ✅' : 'NOT SET ⚠️ — Pimlico will still work, ThirdWeb paymaster unavailable'}`);
  console.log(`[INF] THIRDWEB_CLIENT_ID: ${THIRDWEB_CLIENT_ID ? 'SET ✅' : 'NOT SET'}`);
  console.log(`[INF] BUNDLER: Pimlico v2 (${BUNDLER_URL.slice(0, 50)}...)`);
  console.log(`[INF] FLASH_SWAP: ${FLASH_SWAP}`);
  console.log(`[INF] SMART_ACCOUNT: ${SMART_ACCOUNT}`);
  console.log(`[INF] PROFIT_DEST: ${PROFIT_DEST}`);
  console.log(`[INF] MIN_PROFIT_BPS: ${MIN_PROFIT_BPS}bps`);
  console.log(`[INF] BORROW_AMOUNT: ${Number(BORROW_AMOUNT)/1e6}K USDC`);
  console.log(`[INF] NODE_ENV: ${process.env.NODE_ENV ?? 'undefined'}`);
  console.log(`[INF] DRY_RUN: ${DRY_RUN}`);
  runScanLoop().catch(e => {
    console.error('[FATAL] Loop crashed:', e?.message);
    process.exit(1);
  });
});
