#!/usr/bin/env tsx
/**
 * S40: Deploy FlashSwapV3 (Balancer-first) via Smart Wallet UserOp
 * 
 * Run: npx tsx scripts/deploy-v3-s40.ts
 * 
 * This deploys the updated FlashSwapV3 contract with the fixed selectOptimalSource
 * that prioritizes Balancer (0% fee) over the broken HYBRID_AAVE_V4 path.
 */

import { createPublicClient, http, type Hex } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { toCoinbaseSmartAccount, createBundlerClient } from 'viem/account-abstraction';
import { ethers } from 'ethers';
import path from 'path';
import fs from 'fs';

async function main() {
  // Load env
  const privateKey = process.env.PRIVATE_KEY || process.env.COINBASE_WALLET_KEY;
  const paymasterUrl = process.env.CDP_PAYMASTER_URL || process.env.PAYMASTER_URL;
  const rpcUrl = process.env.RPC_URL || process.env.CHAINSTACK_HTTPS || 'https://mainnet.base.org';
  
  if (!privateKey || !paymasterUrl) {
    console.error('Missing PRIVATE_KEY or CDP_PAYMASTER_URL');
    process.exit(1);
  }
  
  const pkHex = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as Hex;
  const owner = privateKeyToAccount(pkHex);
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  
  const smartAccount = await toCoinbaseSmartAccount({
    client: publicClient,
    owners: [owner],
  });
  
  console.log(`EOA: ${owner.address}`);
  console.log(`Smart Wallet: ${smartAccount.address}`);
  
  const bundlerClient = createBundlerClient({
    client: publicClient,
    account: smartAccount,
    transport: http(paymasterUrl),
    paymaster: true,
  });
  
  // Compile the contract using Hardhat artifacts
  console.log('\nCompiling contract...');
  const { execSync } = await import('child_process');
  execSync('npx hardhat compile', { stdio: 'inherit' });
  
  // Read the compiled artifact
  const artifactPath = path.resolve('artifacts/contracts/FlashSwapV3.sol/FlashSwapV3.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  
  // Constructor args (same as existing deployment)
  const constructorArgs = [
    '0x2626664c2603336e57b271c5c0b26f421741e481', // uniswapV3Router
    '0x6bDEd42c6DA8FBf0d2bA55B2fa120C5e0c8D7891', // sushiRouter
    '0xBA12222222228d8Ba445958a75a0704d566BF2C8', // balancerVault
    '0x0000000000000000000000000000000000000001', // dydxSoloMargin (placeholder)
    '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', // aavePool
    '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D', // aaveAddressesProvider
    '0x33128a8fC17869897dcE68Ed026d694621f6FDfD', // v3Factory
    '0x0000000000000000000000000000000000000000', // titheRecipient (none)
    0, // titheBps (0%)
  ];
  
  // Encode deployment data
  const iface = new ethers.Interface(artifact.abi);
  const deployTx = iface.encodeDeploy(constructorArgs);
  const initCode = artifact.bytecode + deployTx.slice(2);
  
  console.log(`\nDeploy bytecode: ${initCode.length} hex chars`);
  console.log('Deploying via UserOp + CDP Paymaster (gasless)...');
  
  try {
    const userOpHash = await bundlerClient.sendUserOperation({
      calls: [{
        data: initCode as Hex,
      }],
    });
    
    console.log(`UserOp submitted: ${userOpHash}`);
    
    const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
    console.log(`\n✅ DEPLOYED!`);
    console.log(`Success: ${receipt.success}`);
    console.log(`Tx Hash: ${receipt.receipt.transactionHash}`);
    console.log(`Block: ${receipt.receipt.blockNumber}`);
    
    // Find contract address from logs
    for (const log of receipt.receipt.logs || []) {
      console.log(`Log: ${log.address}`);
    }
    
    console.log(`\n📋 UPDATE THESE:`);
    console.log(`  1. Railway env: FLASHSWAP_V3_ADDRESS=<new address>`);
    console.log(`  2. src/config/contracts.config.ts`);
    console.log(`  3. Supabase contract registry`);
    
  } catch (error: any) {
    console.error(`Deploy failed: ${error.message}`);
    if (error.details) console.error(`Details: ${error.details}`);
  }
}

main().catch(console.error);
