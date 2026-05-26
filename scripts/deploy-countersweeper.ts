#!/usr/bin/env tsx
/**
 * deploy-countersweeper.ts — TheWarden GL-L29 CounterSweeper Deployment
 * 
 * Deploys the CounterSweeper contract via Coinbase Smart Wallet + CDP Paymaster.
 * Gas is FREE — sponsored by Coinbase Developer Platform.
 * 
 * WHAT THIS DOES:
 * 1. Creates/loads Coinbase Smart Wallet from your EOA
 * 2. Deploys CounterSweeper.sol via CREATE2 (deterministic address)
 * 3. Gas-free via CDP Paymaster UserOp
 * 4. Outputs the contract address to use in EIP-7702 delegations
 *
 * USAGE:
 *   export PRIVATE_KEY=0x<your_key>
 *   export CDP_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/EeBuC9EkcVpsMwYSiiC1TUKwFTWJVzD1
 *   export BENEFICIARY=0x<safe_wallet_to_receive_funds>
 *   npx tsx scripts/deploy-countersweeper.ts
 *
 * NEXT STEP AFTER DEPLOY:
 *   Use the output CounterSweeper address in an EIP-7702 authorization:
 *   The compromised wallet signs: { address: counterSweeperAddr, nonce: nonce+1, chainId: 8453 }
 *   Submit as type-0x04 transaction
 *   Now any withdrawNative() call on the compromised wallet → funds go to BENEFICIARY
 *
 * GL-L29 OPERATION:
 *   Attacker: 0x2E5269B9 (deployer) — 24,300 txs — ACTIVE
 *   Sweeper:  0xebf985ad (their contract) — 4 variants
 *   We deploy: CounterSweeper (our contract)
 *   We re-delegate: compromised wallets → CounterSweeper
 *   Result: attacker drains gas, we get ETH
 */

import { createPublicClient, http, type Hex, keccak256, encodePacked } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { toCoinbaseSmartAccount, createBundlerClient } from 'viem/account-abstraction';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// ── Constants ──────────────────────────────────────────────────────────
const CREATE2_FACTORY = '0x4e59b44847b379578588920cA78FbF26c0B4956C' as const;
const RPC_URL = process.env.CHAINSTACK_HTTPS || 
               'https://base-mainnet.core.chainstack.com/c726a0ad837354cad25d58bd89c7ac57';

// ── Countersweeper ABI (just what we need for deployment) ──────────────
const COUNTER_SWEEPER_ABI = [
  {
    "type": "constructor",
    "inputs": [{"name": "_beneficiary", "type": "address"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawNative",
    "inputs": [{"name": "", "type": "address"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawToken",
    "inputs": [{"name": "token", "type": "address"}, {"name": "", "type": "address"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "stats",
    "inputs": [],
    "outputs": [
      {"name": "_drainAttempts", "type": "uint256"},
      {"name": "_ethRedirected", "type": "uint256"},
      {"name": "_beneficiary", "type": "address"},
      {"name": "_active", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setBeneficiary",
    "inputs": [{"name": "_new", "type": "address"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
];

async function main() {
  console.log("\n=== TheWarden GL-L29 — CounterSweeper Deployment ===\n");
  
  // ── Load env ──────────────────────────────────────────────────────
  const privateKey    = process.env.PRIVATE_KEY as Hex;
  const paymasterUrl  = process.env.CDP_PAYMASTER_URL;
  const beneficiary   = process.env.BENEFICIARY as Hex;
  
  if (!privateKey)   throw new Error("Missing PRIVATE_KEY");
  if (!paymasterUrl) throw new Error("Missing CDP_PAYMASTER_URL");
  if (!beneficiary)  throw new Error("Missing BENEFICIARY (safe wallet address)");
  
  // ── Setup viem clients ─────────────────────────────────────────────
  const ownerAccount  = privateKeyToAccount(privateKey);
  const publicClient  = createPublicClient({ chain: base, transport: http(RPC_URL) });
  
  // ── Coinbase Smart Wallet (gas-free via Paymaster) ─────────────────
  const smartAccount = await toCoinbaseSmartAccount({
    client: publicClient,
    owners: [ownerAccount],
  });
  
  const bundlerClient = createBundlerClient({
    client: publicClient,
    account: smartAccount,
    transport: http(paymasterUrl),
    paymaster: true,  // CDP Paymaster sponsors gas — $0 per tx
  });
  
  console.log(`EOA:          ${ownerAccount.address}`);
  console.log(`Smart Wallet: ${smartAccount.address}`);
  console.log(`Beneficiary:  ${beneficiary}`);
  console.log(`Paymaster:    CDP (gas-free)`);
  
  // ── Load CounterSweeper bytecode ──────────────────────────────────
  // Note: Run `npx hardhat compile` first to generate artifacts
  // OR use pre-compiled bytecode below
  
  // Pre-compiled CounterSweeper bytecode would go here
  // For now, show how to compile and get bytecode:
  console.log("\n📋 NEXT STEPS:");
  console.log("1. Run: npx hardhat compile");
  console.log("2. Get bytecode from artifacts/contracts/CounterSweeper.sol/CounterSweeper.json");
  console.log("3. Uncomment the deployment code below");
  console.log("4. Run this script — gas is FREE via CDP Paymaster");
  
  /*
  // ── Compile + deploy ────────────────────────────────────────────
  const artifactPath = path.resolve('artifacts/contracts/CounterSweeper.sol/CounterSweeper.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  
  const iface = new ethers.Interface(artifact.abi);
  const constructorArgs = iface.encodeDeploy([beneficiary]);
  const initCode = (artifact.bytecode + constructorArgs.slice(2)) as Hex;
  
  const salt = keccak256(encodePacked(['string'], ['TheWarden.CounterSweeper.GL-L29.v1']));
  
  const deployCalldata = encodeFunctionData({
    abi: [{
      name: 'deploy',
      type: 'function',
      inputs: [
        { name: 'amount', type: 'uint256' },
        { name: 'salt', type: 'bytes32' },
        { name: 'bytecode', type: 'bytes' }
      ],
      outputs: [{ name: 'addr', type: 'address' }],
      stateMutability: 'payable',
    }],
    functionName: 'deploy',
    args: [0n, salt, initCode],
  });
  
  console.log("\n🚀 Deploying CounterSweeper (gas-free via CDP Paymaster)...");
  
  const userOpHash = await bundlerClient.sendUserOperation({
    calls: [{
      to: CREATE2_FACTORY,
      data: deployCalldata,
      value: 0n,
    }],
  });
  
  console.log(`UserOp: ${userOpHash}`);
  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
  console.log(`✅ Deployed! Tx: ${receipt.receipt.transactionHash}`);
  
  // Compute deterministic address
  const deployedAddr = getContractAddress({
    bytecode: initCode,
    from: CREATE2_FACTORY,
    opcode: 'CREATE2',
    salt,
  });
  
  console.log(`\nCounterSweeper address: ${deployedAddr}`);
  console.log("\n📋 NOW: Sign EIP-7702 delegation:");
  console.log(`  { address: "${deployedAddr}", nonce: N+1, chainId: 8453 }`);
  console.log("  Submit as type-0x04 transaction to update delegation");
  */
}

main().catch(console.error);
