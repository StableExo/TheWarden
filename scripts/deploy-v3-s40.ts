#!/usr/bin/env tsx
/**
 * S40: Deploy FlashSwapV3 (Balancer-first) via Smart Wallet + CREATE2 Factory
 * 
 * Run: npx tsx scripts/deploy-v3-s40.ts
 * 
 * Uses CREATE2 deterministic deployment through Smart Wallet UserOp + CDP Paymaster.
 * Constructor accepts explicit _owner parameter to set Smart Wallet as owner.
 */

import { createPublicClient, http, type Hex, keccak256, getContractAddress } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { toCoinbaseSmartAccount, createBundlerClient } from 'viem/account-abstraction';
import { ethers } from 'ethers';
import path from 'path';
import fs from 'fs';

const CREATE2_FACTORY = '0x4e59b44847b379578588920cA78FbF26c0B4956C' as const;

async function main() {
  const privateKey = process.env.PRIVATE_KEY || process.env.COINBASE_WALLET_KEY;
  const paymasterUrl = process.env.CDP_PAYMASTER_URL;
  const rpcUrl = process.env.RPC_URL || process.env.CHAINSTACK_HTTPS || 'https://mainnet.base.org';
  
  if (!privateKey || !paymasterUrl) {
    console.error('Missing PRIVATE_KEY or CDP_PAYMASTER_URL');
    process.exit(1);
  }
  
  const pkHex = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as Hex;
  const ownerAccount = privateKeyToAccount(pkHex);
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  
  const smartAccount = await toCoinbaseSmartAccount({
    client: publicClient,
    owners: [ownerAccount],
  });
  
  console.log(`EOA: ${ownerAccount.address}`);
  console.log(`Smart Wallet: ${smartAccount.address}`);
  
  const bundlerClient = createBundlerClient({
    client: publicClient,
    account: smartAccount,
    transport: http(paymasterUrl),
    paymaster: true,
  });
  
  const artifactPath = path.resolve('artifacts/contracts/FlashSwapV3.sol/FlashSwapV3.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  
  // Constructor args with EIP-55 checksummed addresses + explicit _owner
  const constructorArgs = [
    '0x2626664c2603336E57B271c5C0b26F421741e481', // uniswapV3Router
    '0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891', // sushiRouter
    '0xBA12222222228d8Ba445958a75a0704d566BF2C8',  // balancerVault
    '0x0000000000000000000000000000000000000001',   // dydxSoloMargin (placeholder)
    '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', // aavePool
    '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D', // aaveAddressesProvider
    '0x33128a8fC17869897dcE68Ed026d694621f6FDfD', // v3Factory
    '0x0000000000000000000000000000000000000000',   // titheRecipient
    0,                                               // titheBps (0%)
    smartAccount.address,                            // _owner = Smart Wallet
  ];
  
  const iface = new ethers.Interface(artifact.abi);
  const deployTx = iface.encodeDeploy(constructorArgs);
  const initCode = (artifact.bytecode + deployTx.slice(2)) as Hex;
  
  const salt = '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;
  const initCodeHash = keccak256(initCode);
  const create2Address = getContractAddress({
    bytecodeHash: initCodeHash,
    from: CREATE2_FACTORY,
    opcode: 'CREATE2',
    salt: salt,
  });
  
  console.log(`Predicted address: ${create2Address}`);
  
  const factoryData = (salt + initCode.slice(2)) as Hex;
  
  try {
    const userOpHash = await bundlerClient.sendUserOperation({
      calls: [{ to: CREATE2_FACTORY, data: factoryData, value: 0n }],
    });
    
    console.log(`UserOp: ${userOpHash}`);
    const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
    
    console.log(`\n✅ DEPLOYED!`);
    console.log(`Tx: ${receipt.receipt.transactionHash}`);
    console.log(`Block: ${receipt.receipt.blockNumber}`);
    console.log(`Contract: ${create2Address}`);
    console.log(`Owner: ${smartAccount.address}`);
    
  } catch (error: any) {
    console.error(`Deploy failed: ${error.message}`);
  }
}

main().catch(console.error);
