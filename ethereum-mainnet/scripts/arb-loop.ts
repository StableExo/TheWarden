/**
 * arb-loop.ts — TheWarden CEX-DEX Arb Engine (VL-33)
 *
 * Replaces the GL-L54 diagnostic stub. Runs the real scan-execute loop.
 *
 * Flow (every SCAN_INTERVAL_MS):
 *   1. Check ETH spread from EthPoolScanner
 *   2. If spread >= MIN_SPREAD_BPS: call arb-execute logic
 *   3. Expose /health + /arb /status endpoints for Render monitoring
 *
 * VL-33 PIVOT — Quasar/Titan sponsored bundle path:
 *   - DROP: ERC-4337 / Pimlico UserOps (paymaster balance=$0, 150K gas overhead)
 *   - ADD: Plain EOA tx calling FlashSwapV3 directly + coinbase tip tx in bundle
 *   - Fan-out to Quasar (~16% share) + Titan (~18% share) simultaneously
 *   - Gas sponsored by builder from bundle profit — zero pre-funded balance needed
 *   - EOA signer: Ops EOA 0x92d1...E611 (ETH_PRIVATE_KEY env var)
 *
 * Usage:
 *   npx tsx ethereum-mainnet/scripts/arb-loop.ts
 *   npx tsx ethereum-mainnet/scripts/arb-loop.ts --dry-run
 *
 * VL-33 | TheWarden | @StableExo
 */

import http from 'http';
import {
  createPublicClient, http as viemHttp, encodeFunctionData, parseUnits, getAddress,
  createWalletClient, parseEther,
  type Address, type Hex,
} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { EthPoolScanner } from '../scanner/EthPoolScanner';
import { FLASH_ABI, buildArbPath } from '../config/arb';
import { ADDRESSES } from '../config/addresses';
import { ETH_MAINNET } from '../config/network';

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT         = parseInt(process.env.PORT ?? '10000');
const ARKHAM_KEY   = process.env.ARKHAM_KEY   ?? '';
const ZERION_KEY   = process.env.ZERION_KEY   ?? '';
const QN_HTTP_URL  = process.env.QN_HTTP_URL  ?? '';
const PROXY_SECRET = process.env.PROXY_SECRET ?? 'warden-proxy-vl31';
const EOA_PK       = process.env.ETH_PRIVATE_KEY as Hex;

const FLASH_SWAP   = ADDRESSES.flashSwapV3ETH as Address;
const BORROW_AMOUNT = parseUnits('100000', 6);  // 100K USDC
const MIN_PROFIT_BPS = 7;                        // 6bps pool fees + 1bps buffer
const SCAN_INTERVAL_MS = 12_000;                 // ~1 block
const PRICE_REFRESH_MS = 60_000;

// VL-33: Quasar + Titan builder endpoints (fan-out both)
const BUILDERS = ETH_MAINNET.builders;

// VL-33: Coinbase tip — 10% of estimated profit, floor 0.00001 ETH (~$0.025)
// Builder sponsors gas from profit; tip is how we pay for inclusion.
const TIP_FRACTION  = 0.10;   // 10% of profit goes to builder as tip
const MIN_TIP_WEI   = parseEther('0.00001');

const DRY_RUN = process.argv.includes('--dry-run');

// ─── State ────────────────────────────────────────────────────────────────────
const START = Date.now();
let scans      = 0;
let fires      = 0;
let lastScan   = 0;
let lastFire   = 0;
let lastOpp: string | null = null;
// VL-33: Nonce tracked locally to avoid stale on-chain reads under fast refire
let localNonce: bigint | null = null;
const FIRE_COOLDOWN_MS = 30_000;  // 30s — 1 EOA tx, no AA25 risk, shorter cooldown OK
let liveEthPriceUsd = 0;

// ─── Live ETH price from Kraken ──────────────────────────────────────────────
async function fetchKrakenEthPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.kraken.com/0/public/Ticker?pair=ETHUSD', {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as any;
    const price = parseFloat(data?.result?.XETHZUSD?.c?.[0] ?? '0');
    if (price > 100) {
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

// ─── Submit bundle to a single builder ───────────────────────────────────────
async function submitBundle(
  builderRpc: string,
  builderName: string,
  rawTxs: string[],
  targetBlock: number,
): Promise<{ submitted: boolean; bundleHash?: string; error?: string }> {
  try {
    const res = await fetch(builderRpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method:  'eth_sendBundle',
        params:  [{
          txs:         rawTxs,
          blockNumber: `0x${targetBlock.toString(16)}`,
        }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json() as any;
    if (data.error) {
      return { submitted: false, error: data.error.message ?? JSON.stringify(data.error) };
    }
    return { submitted: true, bundleHash: data.result?.bundleHash ?? data.result ?? 'ok' };
  } catch (e: any) {
    return { submitted: false, error: e?.message ?? String(e) };
  }
}

// ─── Execute one arb attempt — VL-33 Quasar/Titan bundle path ────────────────
async function executeArb(
  opp: any,
  client: ReturnType<typeof createPublicClient>,
  walletClient: ReturnType<typeof createWalletClient>,
  account: ReturnType<typeof privateKeyToAccount>,
): Promise<void> {
  console.log(`\n[ARB] Executing: ${opp.label} | dryRun=${DRY_RUN}`);

  // Floor gas — some RPC states return 0
  const gasRaw = await client.getGasPrice();
  const baseFee = gasRaw > 0n ? gasRaw : 3_000_000_000n;
  // Use 2x baseFee as maxFeePerGas — ensures inclusion without overpaying
  const maxFeePerGas         = baseFee * 2n;
  const maxPriorityFeePerGas = 100_000_000n;  // 0.1 gwei priority

  const actualBorrow = opp.optimalBorrow ?? BORROW_AMOUNT;
  const minFinal = actualBorrow + 1n;  // floor — contract enforces NOP

  const path = buildArbPath(
    getAddress(opp.buyPool.address),  opp.buyPool.token0,  opp.buyPool.token1,
    opp.buyPool.fee  ?? 500,          0n,                  0,
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

  if (DRY_RUN) {
    console.log(`[ARB DRY-RUN] calldata built (${arbCalldata.length / 2} bytes) — skipping bundle submission`);
    return;
  }

  // ── Nonce management ─────────────────────────────────────────────────────
  // Use local nonce cache — falls back to on-chain if null (first fire or after reset)
  if (localNonce === null) {
    localNonce = await client.getTransactionCount({ address: account.address });
    console.log(`[ARB] On-chain nonce: ${localNonce}`);
  }
  const nonce = localNonce;

  // ── Tx 1: Arb tx — EOA calls FlashSwapV3 directly ───────────────────────
  const arbTxHash = await walletClient.sendTransaction({
    to:                  FLASH_SWAP,
    data:                arbCalldata,
    gas:                 300_000n,          // FlashSwapV3 ~150-250K gas measured
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce:               Number(nonce),
    account,
    chain:               mainnet,
  });
  console.log(`[ARB] Arb tx signed: ${arbTxHash}`);

  // ── Tx 2: Coinbase tip tx — pays builder for gas sponsorship ─────────────
  // Tip = 10% of estimated profit (in ETH terms), floored at MIN_TIP_WEI
  // Profit est: optimalBorrow * estimatedProfitBps / 10000 USDC → convert to ETH
  const profitUSDC  = Number(actualBorrow) * opp.estimatedProfitBps / 10_000 / 1e6; // in USDC
  const profitETH   = liveEthPriceUsd > 0 ? profitUSDC / liveEthPriceUsd : 0;
  const tipWei      = profitETH > 0
    ? BigInt(Math.max(Math.floor(profitETH * TIP_FRACTION * 1e18), Number(MIN_TIP_WEI)))
    : MIN_TIP_WEI;
  console.log(`[ARB] Profit est: ~$${profitUSDC.toFixed(4)} USDC | tip: ${Number(tipWei)/1e18} ETH`);

  // Fan-out: submit to Quasar + Titan simultaneously
  // We use eth_sendBundle raw tx flow — need signed raw txs, not tx hashes.
  // Re-sign both txs as raw using signTransaction for bundle submission.
  const rawArbTx = await account.signTransaction({
    to:                  FLASH_SWAP,
    data:                arbCalldata,
    gas:                 300_000n,
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce:               Number(nonce),
    chainId:             1,
    type:                'eip1559',
  });

  const rawTipTx = await account.signTransaction({
    to:                  ETH_MAINNET.builders[0].coinbase as Address,  // quasarbuilder.eth
    value:               tipWei,
    gas:                 21_000n,
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce:               Number(nonce) + 1,
    chainId:             1,
    type:                'eip1559',
  });

  const block = await client.getBlockNumber();
  const targetBlock = Number(block) + 1;

  console.log(`[ARB] Submitting bundle to ${BUILDERS.length} builders | target block: ${targetBlock}`);

  // Fan-out to all builders in parallel
  const results = await Promise.all(
    BUILDERS.map(b => submitBundle(b.rpc, b.name, [rawArbTx, rawTipTx], targetBlock))
  );

  let anySuccess = false;
  for (let i = 0; i < BUILDERS.length; i++) {
    const r = results[i];
    const b = BUILDERS[i];
    if (r.submitted) {
      console.log(`[ARB ✅] ${b.name}: bundleHash=${r.bundleHash}`);
      anySuccess = true;
    } else {
      console.warn(`[ARB ⚠️] ${b.name}: ${r.error}`);
    }
  }

  if (anySuccess) {
    fires++;
    lastFire = Date.now();
    // Advance local nonce by 2 (arb tx + tip tx)
    localNonce = nonce + 2n;
    console.log(`[ARB] Bundle submitted! Local nonce now ${localNonce}`);
  } else {
    console.error(`[ARB ❌] All builders rejected bundle — not incrementing nonce`);
    // Reset local nonce so next attempt re-reads from chain
    localNonce = null;
  }
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
  // VL-33: walletClient for signing + sending EOA txs (plain sendTransaction)
  const walletClient = account ? createWalletClient({
    account,
    chain:     mainnet,
    transport: viemHttp(ETH_MAINNET.rpc.http),
  }) : null;
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

        if (opp.estimatedProfitBps >= MIN_PROFIT_BPS && account && walletClient) {
          await executeArb(opp, client, walletClient, account);
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

  // ── /test-userop — full Pimlico UserOp proof test ──────────────────────────
  if (url.startsWith('/test-userop') && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    (async () => {
      const log: string[] = [];
      const L = (s: string) => { console.log('[TEST-USEROP] ' + s); log.push(s); };
      try {
        if (!EOA_PK) throw new Error('ETH_PRIVATE_KEY not set in Render env');
        const client2 = createPublicClient({ chain: mainnet, transport: viemHttp(ETH_MAINNET.rpc.http) });
        const account2 = privateKeyToAccount(EOA_PK);
        L(`Signer: ${account2.address}`);
        const EP_NONCE_ABI2 = [{
          name: 'getNonce', type: 'function',
          inputs: [{ name: 'sender', type: 'address' }, { name: 'key', type: 'uint192' }],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
        }] as const;
        const nonce2 = await client2.readContract({
          address: ENTRY_POINT_V06, abi: EP_NONCE_ABI2,
          functionName: 'getNonce', args: [SMART_ACCOUNT, 0n],
        }) as bigint;
        L(`SmartAccount nonce: ${nonce2}`);
        const saCalldata2 = encodeFunctionData({
          abi: SIMPLE_ACCOUNT_ABI, functionName: 'execute',
          args: ['0x0000000000000000000000000000000000000001' as Address, 0n, '0x' as `0x${string}`],
        });
        const gasRaw2 = await client2.getGasPrice();
        const gas2 = gasRaw2 > 0n ? gasRaw2 : 3_000_000_000n;
        L(`Gas: ${(Number(gas2)/1e9).toFixed(2)} gwei`);
        const hdrs2: Record<string, string> = { 'Content-Type': 'application/json' };
        let userOp2: any = {
          sender: SMART_ACCOUNT, nonce: `0x${nonce2.toString(16)}`,
          initCode: '0x', callData: saCalldata2,
          callGasLimit: '0x186A0', verificationGasLimit: '0x186A0', preVerificationGas: '0xC350',
          maxFeePerGas: `0x${(gas2 * 2n).toString(16)}`, maxPriorityFeePerGas: '0x3B9ACA00',
          paymasterAndData: '0x',
          // FIX4 (GL-L53): stub sig required before pm_getPaymasterStubData — empty 0x causes Internal server error
          signature: ('0x' + 'ff'.repeat(64) + '1c') as `0x${string}`,
        };
        const toC2 = (op: any) => ({ ...op, nonce: nonce2,
          callGasLimit: BigInt(op.callGasLimit), verificationGasLimit: BigInt(op.verificationGasLimit),
          preVerificationGas: BigInt(op.preVerificationGas), maxFeePerGas: BigInt(op.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(op.maxPriorityFeePerGas),
        });
        L('Step 1: pm_getPaymasterStubData...');
        const stubR = await fetch(BUNDLER_URL, { method:'POST', headers:hdrs2,
          body: JSON.stringify({jsonrpc:'2.0',id:1,method:'pm_getPaymasterStubData',params:[userOp2,ENTRY_POINT_V06,'0x1',{}]}),
          signal: AbortSignal.timeout(15000) });
        const stubJ2 = await stubR.json() as any;
        if (stubJ2.error) throw new Error(`Stub: ${JSON.stringify(stubJ2.error)}`);
        userOp2.paymasterAndData = stubJ2.result.paymasterAndData;
        L(`Stub OK: ${String(userOp2.paymasterAndData).slice(0,20)}...`);
        const h1 = await client2.readContract({ address: ENTRY_POINT_V06, abi: EP_ABI, functionName: 'getUserOpHash', args: [toC2(userOp2)] }) as `0x${string}`;
        userOp2.signature = await account2.signMessage({ message: { raw: h1 } });
        L('Signed with stub');
        L('Step 3: pm_sponsorUserOperation...');
        const sponR = await fetch(BUNDLER_URL, { method:'POST', headers:hdrs2,
          body: JSON.stringify({jsonrpc:'2.0',id:2,method:'pm_sponsorUserOperation',params:[userOp2,ENTRY_POINT_V06,{}]}),
          signal: AbortSignal.timeout(15000) });
        const sponJ2 = await sponR.json() as any;
        if (sponJ2.error) throw new Error(`Sponsor: ${JSON.stringify(sponJ2.error)}`);
        Object.assign(userOp2, { paymasterAndData: sponJ2.result.paymasterAndData,
          ...(sponJ2.result.callGasLimit         && { callGasLimit:         sponJ2.result.callGasLimit }),
          ...(sponJ2.result.verificationGasLimit && { verificationGasLimit: sponJ2.result.verificationGasLimit }),
          ...(sponJ2.result.preVerificationGas   && { preVerificationGas:   sponJ2.result.preVerificationGas }),
        });
        L('Sponsored — $0.00 gas');
        const h2 = await client2.readContract({ address: ENTRY_POINT_V06, abi: EP_ABI, functionName: 'getUserOpHash', args: [toC2(userOp2)] }) as `0x${string}`;
        userOp2.signature = await account2.signMessage({ message: { raw: h2 } });
        L('Re-signed with final gas');
        L('Step 5: eth_sendUserOperation...');
        const sendR = await fetch(BUNDLER_URL, { method:'POST', headers:hdrs2,
          body: JSON.stringify({jsonrpc:'2.0',id:3,method:'eth_sendUserOperation',params:[userOp2,ENTRY_POINT_V06]}),
          signal: AbortSignal.timeout(15000) });
        const sendJ2 = await sendR.json() as any;
        if (sendJ2.error) throw new Error(`Submit: ${JSON.stringify(sendJ2.error)}`);
        const userOpHash = sendJ2.result;
        L(`SUBMITTED: ${userOpHash}`);
        L(`Track: https://jiffyscan.xyz/userOpHash/${userOpHash}`);
        res.writeHead(200);
        res.end(JSON.stringify({ status:'submitted', userOpHash, track:`https://jiffyscan.xyz/userOpHash/${userOpHash}`, log }, null, 2));
      } catch(e: any) {
        L(`ERROR: ${e?.message}`);
        res.writeHead(500);
        res.end(JSON.stringify({ status:'error', error: e?.message, log }, null, 2));
      }
    })();
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
  // v1.1 endpoints per arkm.com/llms.txt — old /entity/ path removed in v1.1
  const hdrs = { 'API-Key': ARKHAM_KEY, 'Accept': 'application/json' };
  const out: Record<string, unknown> = {};

  const makeReq = (url: string) => fetch(url, { headers: hdrs, signal: AbortSignal.timeout(15000) });

  const [intelRes, transferRes, cpRes, balRes] = await Promise.allSettled([
    // v1.1: GET /intelligence/address/{address} — entity + label
    makeReq(`https://api.arkm.com/intelligence/address/${address}`),
    // GET /transfers?base=<addr> — transfers from or to this address
    makeReq(`https://api.arkm.com/transfers?base=${address}&limit=20&sortKey=time&sortDir=desc`),
    // GET /counterparties/address/{address} — top counterparties by USD volume
    makeReq(`https://api.arkm.com/counterparties/address/${address}?limit=10`),
    // GET /balances/address/{address} — token balances all chains
    makeReq(`https://api.arkm.com/balances/address/${address}`),
  ]);

  // Entity / label
  if (intelRes.status === 'fulfilled') {
    if (intelRes.value.ok) {
      const ij = await intelRes.value.json() as any;
      const entity = ij?.arkhamEntity?.name;
      const label  = ij?.arkhamLabel?.name;
      out.entity       = entity ?? label ?? 'Unknown / Unlabeled';
      out.entity_type  = ij?.arkhamEntity?.type ?? null;
      out.is_contract  = ij?.contract ?? false;
      out.chain        = ij?.chain ?? null;
    } else {
      const body = await intelRes.value.text();
      out.entity       = `HTTP ${intelRes.value.status}`;
      out.intel_error  = body.slice(0, 100);
    }
  } else {
    out.entity      = 'fetch_error';
    out.intel_error = String(intelRes.reason).slice(0, 100);
  }

  // Transfers
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
  } else {
    out.transfers = [];
    out.transfer_error = transferRes.status === 'fulfilled'
      ? `HTTP ${transferRes.value.status}`
      : String((transferRes as any).reason).slice(0, 80);
  }

  // Counterparties — response is keyed by chain e.g. {"ethereum":[...], "base":[...]}
  if (cpRes.status === 'fulfilled' && cpRes.value.ok) {
    const cpj = await cpRes.value.json() as any;
    const counterparties: unknown[] = [];
    const chainMap: Record<string, any[]> = typeof cpj === 'object' && !Array.isArray(cpj) ? cpj : {};
    for (const [chain, entries] of Object.entries(chainMap)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries.slice(0, 5)) {
        const addrInfo = entry.address ?? {};
        counterparties.push({
          address:  String(addrInfo.address ?? '?').slice(0, 22),
          entity:   String(addrInfo.arkhamEntity?.name ?? addrInfo.arkhamLabel?.name ?? 'Unknown').slice(0, 25),
          usd:      Math.round((entry.usd ?? 0) * 100) / 100,
          tx_count: entry.transactionCount ?? 0,
          flow:     entry.flow ?? '?',
          chain,
        });
      }
    }
    out.counterparties = counterparties.sort((a: any, b: any) => b.usd - a.usd).slice(0, 8);
  } else {
    out.counterparties = [];
    out.cp_error = cpRes.status === 'fulfilled'
      ? `HTTP ${cpRes.value.status}`
      : String((cpRes as any).reason).slice(0, 80);
  }

  // Balances
  if (balRes.status === 'fulfilled' && balRes.value.ok) {
    const bj = await balRes.value.json() as any;
    const balOut: Record<string, number> = {};
    for (const [chain, tokens] of Object.entries(bj ?? {})) {
      if (!Array.isArray(tokens)) continue;
      const total = (tokens as any[]).reduce((s, t) => s + parseFloat(t?.usdValue ?? 0), 0);
      if (total > 0) balOut[chain] = Math.round(total * 100) / 100;
    }
    out.balances = balOut;
  } else {
    out.balances = {};
    out.bal_error = balRes.status === 'fulfilled'
      ? `HTTP ${balRes.value.status}`
      : String((balRes as any).reason).slice(0, 80);
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
  console.log(`[INF] ${new Date().toISOString()} TheWarden ARB ENGINE on port ${PORT} (VL-33)`);
  console.log(`[INF] MODE: Quasar/Titan sponsored bundle path (EOA direct tx — no ERC-4337)`);
  console.log(`[INF] ETH_PRIVATE_KEY: ${EOA_PK ? 'SET ✅' : 'NOT SET ❌ — cannot execute'}`);
  console.log(`[INF] QN_HTTP_URL: ${process.env.QN_HTTP_URL ? 'SET ✅ (' + process.env.QN_HTTP_URL.slice(0,40) + '...)' : 'NOT SET ⚠️ — using hardcoded fallback'}`);
  console.log(`[INF] BUILDERS: ${BUILDERS.map(b => b.name).join(', ')}`);
  console.log(`[INF] FLASH_SWAP: ${FLASH_SWAP}`);
  console.log(`[INF] MIN_PROFIT_BPS: ${MIN_PROFIT_BPS}bps`);
  console.log(`[INF] BORROW_AMOUNT: ${Number(BORROW_AMOUNT)/1e6}K USDC`);
  console.log(`[INF] NODE_ENV: ${process.env.NODE_ENV ?? 'undefined'}`);
  console.log(`[INF] DRY_RUN: ${DRY_RUN}`);
  runScanLoop().catch(e => {
    console.error('[FATAL] Loop crashed:', e?.message);
    process.exit(1);
  });
});
