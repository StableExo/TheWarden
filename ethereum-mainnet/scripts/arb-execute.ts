/**
 * arb-execute.ts — One-shot AEV Arb Execution via ThirdWeb FREE Gas
 *
 * Prove it works once. Loop it after.
 *
 * Flow:
 *   1. Scan pools for opportunity
 *   2. Build executeArbitrage calldata
 *   3. Wrap in SmartAccount.execute()
 *   4. Submit as UserOp via ThirdWeb (gas: $0.00)
 *   5. Wait for inclusion, verify profit landed
 *
 * Usage:
 *   npx tsx ethereum-mainnet/scripts/arb-execute.ts
 *   npx tsx ethereum-mainnet/scripts/arb-execute.ts --dry-run   (simulate only, no submit)
 *
 * GL-L52 | TheWarden | @StableExo
 */

import {
  createPublicClient, http, encodeFunctionData, parseUnits, getAddress,
  type Address, type Hex,
} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { EthPoolScanner } from '../scanner/EthPoolScanner';
import { FLASH_ABI, buildArbPath } from '../config/arb';
import { ADDRESSES } from '../config/addresses';
import { ETH_MAINNET } from '../config/network';

// ─── Config ───────────────────────────────────────────────────────────────────
const EOA_PK             = process.env.ETH_PRIVATE_KEY as Hex;
const THIRDWEB_CLIENT_ID = process.env.THIRDWEB_CLIENT_ID || '0282b1b3ed884ef92509e46b8da1fad7';
const THIRDWEB_SECRET_KEY= process.env.THIRDWEB_SECRET_KEY || '';
const QN_HTTP            = ETH_MAINNET.rpc.http;
const BUNDLER_URL        = 'https://1.bundler.thirdweb.com/v2';
const ENTRY_POINT_V06    = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address;
const SMART_ACCOUNT      = '0x9Cf21D503EAe5Cf33f9c4c58C75e16065007f367' as Address;
const FLASH_SWAP         = ADDRESSES.flashSwapV3ETH as Address;  // update to new address after redeploy
const PROFIT_DEST        = ETH_MAINNET.wallet.eoa as Address;    // stableexo.base.eth
const BORROW_AMOUNT      = parseUnits('100000', 6);              // 100K USDC flash loan
const MIN_PROFIT_BPS     = 10;                                   // only fire if >= 10bps estimated

const DRY_RUN = process.argv.includes('--dry-run');

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

const ERC20_ABI = [{
  name: 'balanceOf', type: 'function',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
  stateMutability: 'view',
}] as const;

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n⚡ AEV Arb Execute — ONE SHOT' + (DRY_RUN ? ' [DRY RUN]' : ''));
  console.log('='.repeat(52));
  console.log(`  Contract:     ${FLASH_SWAP}`);
  console.log(`  SmartAccount: ${SMART_ACCOUNT}`);
  console.log(`  Profit dest:  ${PROFIT_DEST}  (stableexo.base.eth)`);
  console.log(`  Gas:          $0.00 (ThirdWeb sponsored)`);
  console.log(`  Threshold:    ${MIN_PROFIT_BPS} bps\n`);

  if (!EOA_PK) throw new Error('ETH_PRIVATE_KEY required');

  const client  = createPublicClient({ chain: mainnet, transport: http(QN_HTTP) });
  const account = privateKeyToAccount(EOA_PK);
  const scanner = new EthPoolScanner();

  // ── Step 1: Scan for opportunity ──────────────────────────────────────────
  console.log('1️⃣  Scanning pools...');
  const [block, gas, opps] = await Promise.all([
    client.getBlockNumber(),
    client.getGasPrice(),
    scanner.findOpportunities(),
  ]);
  console.log(`   Block: ${block.toLocaleString()} | Gas: ${(Number(gas)/1e9).toFixed(1)} gwei`);

  if (opps.length === 0) {
    console.log('   No opportunities above threshold. Try again next block.');
    return;
  }

  const opp = opps[0];
  console.log(`   ✅ Best opportunity: ${opp.label}`);
  console.log(`      spread=${opp.estimatedProfitBps} bps | buy@${opp.buyPool.protocol} sell@${opp.sellPool.protocol}`);

  if (opp.estimatedProfitBps < MIN_PROFIT_BPS) {
    console.log(`   ⚡ Below ${MIN_PROFIT_BPS} bps threshold — skip`);
    return;
  }

  // ── Step 2: Build arb calldata ────────────────────────────────────────────
  console.log('\n2️⃣  Building arb calldata...');

  const minOut1  = 0n;   // accept any output on step 1 (profit check is on net)
  const minFinal = BORROW_AMOUNT * 1001n / 1000n;  // at least 0.1% profit = repay + fee

  const path = buildArbPath(
    getAddress(opp.buyPool.address),  opp.buyPool.token0,  opp.buyPool.token1,
    opp.buyPool.fee  ?? 500,          minOut1,              0,
    getAddress(opp.sellPool.address), opp.sellPool.token0, opp.sellPool.token1,
    opp.sellPool.fee ?? 3000,         minFinal,             0,
    BORROW_AMOUNT, minFinal,
  );

  const arbCalldata = encodeFunctionData({
    abi: FLASH_ABI, functionName: 'executeArbitrage',
    args: [
      ADDRESSES.tokens.USDC as Address,   // borrow USDC
      BORROW_AMOUNT,                       // 100K USDC
      path,
      0,                                   // source=0 → Balancer (0% fee)
      '0x0000000000000000000000000000000000000000' as Address,  // auto flash pool
    ],
  });

  console.log(`   borrowToken:  USDC (${ADDRESSES.tokens.USDC})`);
  console.log(`   borrowAmount: 100,000 USDC`);
  console.log(`   source:       Balancer V2 (0% flash loan fee)`);
  console.log(`   calldata:     ${arbCalldata.slice(0, 42)}... (${arbCalldata.length / 2} bytes)`);

  // ── Step 3: Wrap in SmartAccount.execute ──────────────────────────────────
  console.log('\n3️⃣  Building SmartAccount.execute calldata...');

  const saCalldata = encodeFunctionData({
    abi: SIMPLE_ACCOUNT_ABI, functionName: 'execute',
    args: [FLASH_SWAP, 0n, arbCalldata],
  });
  console.log(`   SmartAccount → FlashSwapV3.executeArbitrage()`);
  console.log(`   execute calldata: ${saCalldata.slice(0, 42)}... (${saCalldata.length / 2} bytes)`);

  if (DRY_RUN) {
    console.log('\n⚡ DRY RUN — calldata built, skipping UserOp submission');
    console.log('   Re-run without --dry-run to execute');
    return;
  }

  // ── Step 4: Build UserOp ──────────────────────────────────────────────────
  console.log('\n4️⃣  Building UserOp...');

  const nonce = await client.readContract({
    address: SMART_ACCOUNT, abi: NONCE_ABI,
    functionName: 'getNonce', args: [0n],
  });

  // Check USDC balance at profit dest BEFORE arb (to verify profit after)
  const usdcBefore = await client.readContract({
    address: ADDRESSES.tokens.USDC as Address, abi: ERC20_ABI,
    functionName: 'balanceOf', args: [PROFIT_DEST],
  });

  console.log(`   SmartAccount nonce: ${nonce}`);
  console.log(`   USDC at ${PROFIT_DEST.slice(0,10)}... before: ${(Number(usdcBefore)/1e6).toFixed(2)} USDC`);

  const hdrs: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-client-id': THIRDWEB_CLIENT_ID,
  };
  if (THIRDWEB_SECRET_KEY) hdrs['x-secret-key'] = THIRDWEB_SECRET_KEY;

  let userOp: any = {
    sender:               SMART_ACCOUNT,
    nonce:                `0x${nonce.toString(16)}`,
    initCode:             '0x',
    callData:             saCalldata,
    callGasLimit:         '0x7A120',    // 500K — arb needs more gas than deploy
    verificationGasLimit: '0x186A0',   // 100K
    preVerificationGas:   '0xC350',    // 50K
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

  // ── Step 5: Paymaster stub ────────────────────────────────────────────────
  console.log('\n5️⃣  Getting paymaster stub...');
  const stubRes = await fetch(BUNDLER_URL, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'pm_getPaymasterStubData',
      params: [userOp, ENTRY_POINT_V06, '0x1', {}],
    }),
  });
  const stubJ = await stubRes.json() as any;
  if (stubJ.error) throw new Error(`Paymaster stub: ${JSON.stringify(stubJ.error)}`);
  userOp.paymasterAndData = stubJ.result.paymasterAndData;
  console.log('   ✅ Stub received');

  // ── Step 6: Sign ──────────────────────────────────────────────────────────
  console.log('\n6️⃣  Signing UserOp...');
  const hash1 = await client.readContract({
    address: ENTRY_POINT_V06, abi: EP_ABI,
    functionName: 'getUserOpHash', args: [toContract(userOp)],
  });
  userOp.signature = await account.signMessage({ message: { raw: hash1 } });
  console.log(`   ✅ Signed by ${account.address}`);

  // ── Step 7: Sponsor (FREE gas) ────────────────────────────────────────────
  console.log('\n7️⃣  Getting gas sponsorship...');
  const sponsorRes = await fetch(BUNDLER_URL, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({
      jsonrpc: '2.0', id: 2,
      method: 'pm_sponsorUserOperation',
      params: [userOp, ENTRY_POINT_V06, {}],
    }),
  });
  const sponsorJ = await sponsorRes.json() as any;
  if (sponsorJ.error) throw new Error(`Sponsor: ${JSON.stringify(sponsorJ.error)}`);
  Object.assign(userOp, {
    paymasterAndData: sponsorJ.result.paymasterAndData,
    ...(sponsorJ.result.callGasLimit         && { callGasLimit:         sponsorJ.result.callGasLimit }),
    ...(sponsorJ.result.verificationGasLimit && { verificationGasLimit: sponsorJ.result.verificationGasLimit }),
    ...(sponsorJ.result.preVerificationGas   && { preVerificationGas:   sponsorJ.result.preVerificationGas }),
  });
  console.log('   ✅ GAS SPONSORED — $0.00!');

  // ── Step 8: Re-sign with final gas ────────────────────────────────────────
  const hash2 = await client.readContract({
    address: ENTRY_POINT_V06, abi: EP_ABI,
    functionName: 'getUserOpHash', args: [toContract(userOp)],
  });
  userOp.signature = await account.signMessage({ message: { raw: hash2 } });
  console.log('   ✅ Re-signed with final gas values');

  // ── Step 9: Submit ────────────────────────────────────────────────────────
  console.log('\n8️⃣  Submitting UserOp...');
  const sendRes = await fetch(BUNDLER_URL, {
    method: 'POST', headers: hdrs,
    body: JSON.stringify({
      jsonrpc: '2.0', id: 3,
      method: 'eth_sendUserOperation',
      params: [userOp, ENTRY_POINT_V06],
    }),
  });
  const sendJ = await sendRes.json() as any;
  if (sendJ.error) throw new Error(`Submit: ${JSON.stringify(sendJ.error)}`);

  const userOpHash = sendJ.result;
  console.log(`   ✅ Submitted!`);
  console.log(`   UserOp: ${userOpHash}`);
  console.log(`   Track:  https://jiffyscan.xyz/userOpHash/${userOpHash}`);

  // ── Step 10: Wait + verify profit ─────────────────────────────────────────
  console.log('\n9️⃣  Waiting 30s for inclusion...');
  await new Promise(r => setTimeout(r, 30_000));

  const usdcAfter = await client.readContract({
    address: ADDRESSES.tokens.USDC as Address, abi: ERC20_ABI,
    functionName: 'balanceOf', args: [PROFIT_DEST],
  });

  const profitUsdc = usdcAfter > usdcBefore
    ? Number(usdcAfter - usdcBefore) / 1e6
    : 0;

  console.log('\n' + '='.repeat(52));
  if (profitUsdc > 0) {
    console.log(`🏴‍☠️  ARB EXECUTED!`);
    console.log(`   Profit: $${profitUsdc.toFixed(4)} USDC`);
    console.log(`   Landed: ${PROFIT_DEST}  (stableexo.base.eth)`);
    console.log(`   Gas:    $0.00`);
  } else {
    console.log(`⚠️  No profit detected yet — may still be pending`);
    console.log(`   USDC before: ${(Number(usdcBefore)/1e6).toFixed(2)}`);
    console.log(`   USDC after:  ${(Number(usdcAfter)/1e6).toFixed(2)}`);
    console.log(`   Track: https://jiffyscan.xyz/userOpHash/${userOpHash}`);
  }
  console.log('='.repeat(52));
}

main().catch(console.error);
