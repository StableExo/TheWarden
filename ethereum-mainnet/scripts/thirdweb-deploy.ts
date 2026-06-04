/**
 * thirdweb-deploy.ts — Deploy FlashSwapV3 to ETH Mainnet
 *
 * FREE gas via ThirdWeb ERC-4337 sponsorship (GL-L40 confirmed pattern)
 * GL-L52: Tithe removed — 100% profit → owner (stableexo.base.eth)
 *         Constructor now takes 8 args (was 10 — titheRecipient + titheBps removed)
 *
 * Usage: npx tsx ethereum-mainnet/scripts/thirdweb-deploy.ts
 * GL-L52 | TheWarden | @StableExo
 */

import { createPublicClient, http, encodeFunctionData,
         encodeAbiParameters, parseAbiParameters, keccak256, concat,
         type Hex, type Address } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────
const EOA_PK              = (process.env.ETH_PRIVATE_KEY || '0x76a241aed24fb4878260bcb1325485f8aa325ac2d4bcb17f6e7eef5a46d8e4e7') as Hex;
const THIRDWEB_CLIENT_ID  =  process.env.THIRDWEB_CLIENT_ID  || '0282b1b3ed884ef92509e46b8da1fad7';
const THIRDWEB_SECRET_KEY =  process.env.THIRDWEB_SECRET_KEY || '';
const QN_HTTP             = 'https://dry-delicate-hill.ethereum-mainnet.quiknode.pro/bf439b3d22b12a2626fb538b3f942f4d3f86c169/';
const BUNDLER_URL         = 'https://1.bundler.thirdweb.com/v2';
const ENTRY_POINT_V06     = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address;
const SMART_ACCOUNT       = '0x9Cf21D503EAe5Cf33f9c4c58C75e16065007f367' as Address;
const CREATE2_FACTORY     = '0x4e59b44847b379578588920cA78FbF26c0B4956C' as Address;

// ─── FlashSwapV3 Constructor Args (GL-L52: 8 args — tithe removed) ────────────
const UNISWAP_V3_ROUTER   = '0xE592427A0AEce92De3Edee1F18E0157C05861564' as Address;
const SUSHI_ROUTER        = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F' as Address;
const BALANCER_VAULT      = '0xBA12222222228d8Ba445958a75a0704d566BF2C8' as Address;
const DYDX_SOLO_MARGIN    = '0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e' as Address;
const AAVE_V3_POOL        = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2' as Address;
const AAVE_ADDRESSES_PROV = '0x2f39d218133AfaB8F2B819B1066c7E434Ad94E9e' as Address;
const V3_FACTORY          = '0x1F98431c8aD98523631AE4a59f267346ea31F984' as Address;
// GL-L52: owner = stableexo.base.eth — all profit lands here directly, no tithe
const OWNER               = '0x1Aa04F01106Aa53bc7A112C502A934a6d72062d4' as Address;

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

async function main() {
  console.log('\n🏴‍☠️  FlashSwapV3 — ETH Mainnet Deploy via ThirdWeb FREE Gas');
  console.log('='.repeat(60));
  console.log('  GL-L52 | Tithe removed | 100% → stableexo.base.eth');
  console.log('='.repeat(60));

  // Load compiled bytecode
  const artifactPath = path.join(process.cwd(), 'artifacts/contracts/FlashSwapV3.sol/FlashSwapV3.json');
  if (!fs.existsSync(artifactPath)) {
    console.error('\n❌ Missing artifact. Run: npx hardhat compile --force');
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bytecode = artifact.bytecode as Hex;
  console.log(`  ✅ Bytecode: ${((bytecode.length - 2) / 2).toLocaleString()} bytes`);

  // ABI-encode 8 constructor args (GL-L52: titheRecipient + titheBps removed)
  const encodedArgs = encodeAbiParameters(
    parseAbiParameters('address,address,address,address,address,address,address,address'),
    [UNISWAP_V3_ROUTER, SUSHI_ROUTER, BALANCER_VAULT, DYDX_SOLO_MARGIN,
     AAVE_V3_POOL, AAVE_ADDRESSES_PROV, V3_FACTORY, OWNER]
  );
  const deployBytecode = concat([bytecode, encodedArgs]) as Hex;
  console.log(`  ✅ Constructor args encoded (8 params — tithe removed)`);
  console.log(`  ✅ Owner (profit dest): ${OWNER}  (stableexo.base.eth)`);

  // CREATE2 salt — GL-L52 (new salt = new address from old)
  const salt         = keccak256(new TextEncoder().encode('TheWarden.FlashSwapV3.GL-L52.ETH'));
  const initCodeHash = keccak256(deployBytecode);
  const predicted    = ('0x' + keccak256(concat(['0xff', CREATE2_FACTORY, salt, initCodeHash])).slice(26)) as Address;
  console.log(`  🎯 Predicted: ${predicted}`);

  const publicClient = createPublicClient({ chain: mainnet, transport: http(QN_HTTP) });

  // Check already deployed
  const existingCode = await publicClient.getBytecode({ address: predicted });
  if (existingCode && existingCode !== '0x') {
    console.log(`\n  ✅ Already deployed at ${predicted}`);
    return;
  }

  // SmartAccount.execute calldata
  const create2Calldata  = concat([salt, deployBytecode]) as Hex;
  const executeCalldata  = encodeFunctionData({
    abi: SIMPLE_ACCOUNT_ABI, functionName: 'execute',
    args: [CREATE2_FACTORY, 0n, create2Calldata],
  });

  // Get nonce + gas
  const NONCE_ABI = [{ name:'getNonce', type:'function', inputs:[{name:'key',type:'uint192'}], outputs:[{name:'',type:'uint256'}], stateMutability:'view' }] as const;
  const nonce    = await publicClient.readContract({ address: SMART_ACCOUNT, abi: NONCE_ABI, functionName: 'getNonce', args: [0n] });
  const gasPrice = await publicClient.getGasPrice();
  const account  = privateKeyToAccount(EOA_PK);
  console.log(`  ✅ SmartAccount nonce: ${nonce} | Gas: ${Number(gasPrice)/1e9} gwei`);

  const hdrs: Record<string,string> = { 'Content-Type': 'application/json', 'x-client-id': THIRDWEB_CLIENT_ID };
  if (THIRDWEB_SECRET_KEY) hdrs['x-secret-key'] = THIRDWEB_SECRET_KEY;

  let userOp: any = {
    sender:               SMART_ACCOUNT,
    nonce:                \`0x\${nonce.toString(16)}\`,
    initCode:             '0x',
    callData:             executeCalldata,
    callGasLimit:         '0x493E0',
    verificationGasLimit: '0x186A0',
    preVerificationGas:   '0xC350',
    maxFeePerGas:         \`0x\${(gasPrice * 2n).toString(16)}\`,
    maxPriorityFeePerGas: '0x3B9ACA00',
    paymasterAndData:     '0x',
    signature:            '0x',
  };

  const toContract = (op: any) => ({
    ...op, nonce, callGasLimit: BigInt(op.callGasLimit),
    verificationGasLimit: BigInt(op.verificationGasLimit),
    preVerificationGas:   BigInt(op.preVerificationGas),
    maxFeePerGas:         BigInt(op.maxFeePerGas),
    maxPriorityFeePerGas: BigInt(op.maxPriorityFeePerGas),
  });

  // Step 1: Paymaster stub
  console.log('\n  📡 ThirdWeb paymaster stub...');
  const stubR  = await fetch(BUNDLER_URL, { method:'POST', headers: hdrs,
    body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'pm_getPaymasterStubData', params:[userOp, ENTRY_POINT_V06, '0x1', {}] }) });
  const stubJ  = await stubR.json() as any;
  if (stubJ.error) throw new Error(`Stub: ${JSON.stringify(stubJ.error)}`);
  userOp.paymasterAndData = stubJ.result.paymasterAndData;

  // Step 2: Sign
  const h1 = await publicClient.readContract({ address:ENTRY_POINT_V06, abi:EP_ABI, functionName:'getUserOpHash', args:[toContract(userOp)] });
  userOp.signature = await account.signMessage({ message: { raw: h1 } });

  // Step 3: Sponsor
  console.log('  📡 Sponsoring (FREE gas)...');
  const sponsorR = await fetch(BUNDLER_URL, { method:'POST', headers: hdrs,
    body: JSON.stringify({ jsonrpc:'2.0', id:2, method:'pm_sponsorUserOperation', params:[userOp, ENTRY_POINT_V06, {}] }) });
  const sponsorJ = await sponsorR.json() as any;
  if (sponsorJ.error) throw new Error(`Sponsor: ${JSON.stringify(sponsorJ.error)}`);
  Object.assign(userOp, {
    paymasterAndData:     sponsorJ.result.paymasterAndData,
    ...(sponsorJ.result.callGasLimit         && { callGasLimit:         sponsorJ.result.callGasLimit }),
    ...(sponsorJ.result.verificationGasLimit && { verificationGasLimit: sponsorJ.result.verificationGasLimit }),
    ...(sponsorJ.result.preVerificationGas   && { preVerificationGas:   sponsorJ.result.preVerificationGas }),
  });
  console.log(`  ✅ GAS SPONSORED — $0.00!`);

  // Step 4: Re-sign with final gas values
  const h2 = await publicClient.readContract({ address:ENTRY_POINT_V06, abi:EP_ABI, functionName:'getUserOpHash', args:[toContract(userOp)] });
  userOp.signature = await account.signMessage({ message: { raw: h2 } });

  // Step 5: Submit
  console.log('\n  🚀 Submitting to ThirdWeb bundler...');
  const sendR = await fetch(BUNDLER_URL, { method:'POST', headers: hdrs,
    body: JSON.stringify({ jsonrpc:'2.0', id:3, method:'eth_sendUserOperation', params:[userOp, ENTRY_POINT_V06] }) });
  const sendJ = await sendR.json() as any;
  if (sendJ.error) throw new Error(`Send: ${JSON.stringify(sendJ.error)}`);
  const userOpHash = sendJ.result;
  console.log(`  ✅ UserOp submitted: ${userOpHash}`);

  // Step 6: Wait + verify
  console.log('  ⏳ Waiting 20s...');
  await new Promise(r => setTimeout(r, 20000));
  const code2 = await publicClient.getBytecode({ address: predicted });
  if (code2 && code2 !== '0x') {
    console.log(`\n  🏴‍☠️  DEPLOYED! FlashSwapV3 (GL-L52) on ETH Mainnet`);
    console.log(`  Contract: ${predicted}`);
    console.log(`  Etherscan: https://etherscan.io/address/${predicted}`);
    console.log(`  Gas: $0.00 | 100% profit → ${OWNER} (stableexo.base.eth) | GL-L52`);
    console.log(`\n  ➡️  Update addresses.ts: flashSwapV3ETH: '${predicted}'`);
  } else {
    console.log(`  ⚠️  Still pending. Track: https://jiffyscan.xyz/userOpHash/${userOpHash}`);
  }
}

main().catch(console.error);
