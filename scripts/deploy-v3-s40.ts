#!/usr/bin/env tsx
/**
 * FlashSwapV3 gasless deploy via Coinbase Smart Wallet + CREATE2 factory
 * (Contract #15, v6.0.0 - eight constructor arguments, no tithe)
 *
 * This is the gasless path: the deploy is sent as an ERC-4337 UserOp from a
 * Coinbase Smart Wallet, with gas sponsored by the CDP Paymaster. There is no
 * ETH required in the signer for gas, only an allowlisted paymaster.
 *
 * For the plain, non-gasless deploy use scripts/deployFlashSwapV3.ts instead.
 * That script is the canonical one and takes the same eight arguments.
 *
 * ---------------------------------------------------------------------------
 * READ THIS BEFORE YOU RUN IT
 * ---------------------------------------------------------------------------
 * 1. The contract's `owner` is IMMUTABLE (no transferOwnership). `_owner` is
 *    the only address that can call executeArbitrage() and emergencyWithdraw(),
 *    and it receives 100% of profit. Choose it deliberately.
 * 2. The predicted CREATE2 address depends on BOTH the salt and the init code.
 *    The init code changes whenever the constructor arguments or the compiled
 *    bytecode change, so any address predicted before this fix is stale. Do
 *    not reuse an old predicted address.
 * 3. Any address used with the CDP Paymaster must be allowlisted with it, or
 *    the UserOp is not sponsored.
 *
 * ---------------------------------------------------------------------------
 * Environment variables
 * ---------------------------------------------------------------------------
 *   CDP_PAYMASTER_URL      Required. Paymaster + bundler endpoint.
 *   FLASHSWAP_V3_OWNER     The immutable owner. Defaults to the Smart Wallet
 *                          address, which keeps the gasless path self-owned.
 *                          Set it explicitly to a different address if you want
 *                          a separate profit recipient.
 *   NETWORK                'baseSepolia' for testnet, otherwise Base Mainnet.
 *   RPC_URL                Optional. Defaults to the network's public RPC.
 *   DEPLOY_SALT            32-byte hex salt. Default 0x00..00.
 *   CONFIRM_SEND=true      Required to actually send. Without it the script
 *                          only prints the predicted address and dry-runs.
 *   PRIVATE_KEY / COINBASE_WALLET_KEY   Owner key of the Smart Wallet.
 *
 * ---------------------------------------------------------------------------
 * Usage
 * ---------------------------------------------------------------------------
 *   # dry run on Sepolia: prints everything, sends nothing
 *   NETWORK=baseSepolia npx tsx scripts/deploy-v3-s40.ts
 *
 *   # for real, free gas on testnet
 *   NETWORK=baseSepolia CONFIRM_SEND=true npx tsx scripts/deploy-v3-s40.ts
 *
 *   # mainnet (gas + 7% fee via the paymaster), once testnet is clean
 *   CONFIRM_SEND=true npx tsx scripts/deploy-v3-s40.ts
 *
 * Requires a compiled artifact at
 *   artifacts/contracts/FlashSwapV3.sol/FlashSwapV3.json
 * Run `npx hardhat compile` first.
 */

import { createPublicClient, http, type Hex, keccak256, getContractAddress } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { toCoinbaseSmartAccount, createBundlerClient } from 'viem/account-abstraction';
import { ethers } from 'ethers';
import path from 'path';
import fs from 'fs';
import { ADDRESSES, NetworkKey, requireAddress } from '../src/config/addresses';

const CREATE2_FACTORY = '0x4e59b44847b379578588920cA78FbF26c0B4956C' as const;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_SALT = `0x${'0'.repeat(64)}` as Hex;

function looksLikeAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

async function main(): Promise<void> {
  const isSepolia = (process.env.NETWORK || '').toLowerCase().includes('sepolia');
  const netName: NetworkKey = isSepolia ? 'baseSepolia' : 'base';
  const chain = isSepolia ? baseSepolia : base;
  const confirmSend = process.env.CONFIRM_SEND === 'true';

  const privateKey = process.env.PRIVATE_KEY || process.env.COINBASE_WALLET_KEY;
  const paymasterUrl = process.env.CDP_PAYMASTER_URL;
  const rpcUrl = process.env.RPC_URL || chain.rpcUrls.default.http[0];

  if (!privateKey || !paymasterUrl) {
    console.error('Missing PRIVATE_KEY (or COINBASE_WALLET_KEY) or CDP_PAYMASTER_URL.');
    process.exit(1);
  }

  const pkHex = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as Hex;
  const ownerAccount = privateKeyToAccount(pkHex);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  const smartAccount = await toCoinbaseSmartAccount({
    client: publicClient,
    owners: [ownerAccount],
  });

  console.log(`Network:        ${netName} (chainId ${chain.id})`);
  console.log(`RPC:            ${rpcUrl}`);
  console.log(`Signer EOA:     ${ownerAccount.address}`);
  console.log(`Smart Wallet:   ${smartAccount.address}`);

  // ---- Owner: immutable, so decide it out loud -----------------------------
  const ownerEnv = (process.env.FLASHSWAP_V3_OWNER || '').trim();
  if (ownerEnv && !looksLikeAddress(ownerEnv)) {
    throw new Error(`FLASHSWAP_V3_OWNER is not a valid address: ${ownerEnv}`);
  }
  const contractOwner = ownerEnv || smartAccount.address;
  if (contractOwner.toLowerCase() === ZERO_ADDRESS) {
    throw new Error('Owner cannot be the zero address (FSV3:IOW on chain).');
  }

  // ---- Constructor arguments: EIGHT, from the shared address config --------
  const constructorArgs = [
    requireAddress(netName, 'uniswapV3Router'),
    requireAddress(netName, 'sushiRouter'),
    requireAddress(netName, 'balancerVault'),
    ADDRESSES[netName].dydxSoloMargin || ZERO_ADDRESS, // Ethereum only
    requireAddress(netName, 'aavePool'),
    requireAddress(netName, 'aaveAddressesProvider'),
    requireAddress(netName, 'uniswapV3Factory'),
    contractOwner, // _owner, immutable
  ];

  const artifactPath = path.resolve('artifacts/contracts/FlashSwapV3.sol/FlashSwapV3.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  const iface = new ethers.Interface(artifact.abi);

  // Fail loudly here rather than on chain if the contract changed under us.
  const deployFragment = iface.deploy;
  if (!deployFragment) {
    throw new Error('The FlashSwapV3 artifact has no constructor; recompile.');
  }
  if (deployFragment.inputs.length !== 8) {
    throw new Error(
      `FlashSwapV3's constructor takes ${deployFragment.inputs.length} arguments in this ` +
        `artifact, but this script passes 8. Re-read contracts/FlashSwapV3.sol and update ` +
        `the constructor args (and this check) to match.`
    );
  }

  const deployTx = iface.encodeDeploy(constructorArgs);
  const initCode = (artifact.bytecode + deployTx.slice(2)) as Hex;

  const salt = (process.env.DEPLOY_SALT as Hex) || DEFAULT_SALT;
  const create2Address = getContractAddress({
    bytecodeHash: keccak256(initCode),
    from: CREATE2_FACTORY,
    opcode: 'CREATE2',
    salt,
  });

  console.log('-'.repeat(64));
  console.log('Constructor arguments (8):');
  constructorArgs.forEach((arg, i) => console.log(`  ${i + 1}. ${arg}`));
  console.log(`Salt:                 ${salt}`);
  console.log(`Predicted address:    ${create2Address}`);
  console.log(`Owner (immutable):    ${contractOwner}${ownerEnv ? '' : '  (defaulted to the Smart Wallet)'}`);
  console.log('-'.repeat(64));

  if (!confirmSend) {
    console.log('\nDRY RUN. Nothing was sent. Re-run with CONFIRM_SEND=true to deploy.');
    return;
  }

  const bundlerClient = createBundlerClient({
    client: publicClient,
    account: smartAccount,
    transport: http(paymasterUrl),
    paymaster: true,
  });

  const factoryData = (salt + initCode.slice(2)) as Hex;

  console.log('Sending UserOp through the paymaster...');
  const userOpHash = await bundlerClient.sendUserOperation({
    calls: [{ to: CREATE2_FACTORY, data: factoryData, value: 0n }],
  });
  console.log(`UserOp: ${userOpHash}`);

  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });

  console.log('\nDeployed.');
  console.log(`Contract: ${create2Address}`);
  console.log(`Owner:    ${contractOwner}`);
  console.log(`Tx:       ${receipt.receipt.transactionHash}`);
  console.log(`Block:    ${receipt.receipt.blockNumber}`);
  console.log('\nAllowlist this contract in the CDP paymaster, then set');
  console.log(`FLASHSWAP_V3_ADDRESS=${create2Address}`);
  console.log('on the service that runs the bot.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
