/**
 * deploy.ts — Deploy FlashSwapV3 to ETH Mainnet
 *
 * Deploys the FlashSwapV3 contract (same bytecode as Base Contract #15)
 * to Ethereum mainnet using the new ops EOA.
 * Gas: $0 via Pimlico ERC-4337 OR manual (ultra-low at ~0.15 gwei)
 *
 * Usage: npx tsx ethereum-mainnet/scripts/deploy.ts
 * GL-L40 | TheWarden
 */

import { createWalletClient, createPublicClient, http, parseGwei, type Address } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ETH_MAINNET } from '../config/network';

// Load from env
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY as `0x${string}`;
if (!PRIVATE_KEY) throw new Error('ETH_PRIVATE_KEY env var required');

// FlashSwapV3 bytecode from contracts/FlashSwapV3.sol
// Compile with: npx hardhat compile
// Then copy from artifacts/contracts/FlashSwapV3.sol/FlashSwapV3.json
const FLASH_SWAP_V3_BYTECODE = process.env.FLASH_SWAP_V3_BYTECODE as `0x${string}`;
if (!FLASH_SWAP_V3_BYTECODE) {
  console.error('\nMissing FLASH_SWAP_V3_BYTECODE env var.');
  console.error('Steps to get bytecode:');
  console.error('  1. npx hardhat compile');
  console.error('  2. cat artifacts/contracts/FlashSwapV3.sol/FlashSwapV3.json | jq .bytecode');
  console.error('  3. export FLASH_SWAP_V3_BYTECODE=0x...');
  process.exit(1);
}

// Constructor args for FlashSwapV3
// FlashSwapV3 constructor: (address _aaveV3Pool, address _balancerVault)
const AAVE_V3_POOL      = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2' as Address;
const BALANCER_VAULT    = '0xBA12222222228d8Ba445958a75a0704d566BF2C8' as Address;

async function main() {
  console.log('\n🚀 FlashSwapV3 — ETH Mainnet Deploy');
  console.log('='.repeat(50));

  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`  Deployer: ${account.address}`);

  const publicClient = createPublicClient({ chain: mainnet, transport: http(ETH_MAINNET.rpc.http) });
  const walletClient = createWalletClient({ account, chain: mainnet, transport: http(ETH_MAINNET.rpc.http) });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  const gasPrice = await publicClient.getGasPrice();
  console.log(`  Balance:  ${Number(balance) / 1e18} ETH`);
  console.log(`  Gas:      ${Number(gasPrice) / 1e9} gwei`);

  if (balance === 0n) {
    console.log('\n  ⚠️  EOA has 0 ETH.');
    console.log('  Options:');
    console.log('    1. Fund 0x92d1d44C37Eb5a6996968FE4F2907f403757E611 with ~0.01 ETH');
    console.log('    2. Use Pimlico ERC-4337 sponsored deployment (advanced)');
    console.log('    3. Use Quasar bundle with CREATE2 factory');
    return;
  }

  // Estimate gas
  const estimated = await publicClient.estimateGas({
    account: account.address,
    data: FLASH_SWAP_V3_BYTECODE,
  });
  console.log(`  Est. gas: ${estimated.toLocaleString()} units`);
  console.log(`  Est. cost: ${Number(estimated * gasPrice) / 1e18} ETH (${ (Number(estimated * gasPrice) / 1e18 * 2500).toFixed(4) } USD @ $2500)`);

  console.log('\n  Deploying...');
  const hash = await walletClient.deployContract({
    abi: [],
    bytecode: FLASH_SWAP_V3_BYTECODE,
    // ABI-encode constructor args if needed
    // args: [AAVE_V3_POOL, BALANCER_VAULT],
    gas: estimated + 50_000n,
    maxFeePerGas: gasPrice + parseGwei('0.1'),
    maxPriorityFeePerGas: parseGwei('0.1'),
  });

  console.log(`  Tx: ${hash}`);
  console.log('  Waiting for receipt...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  console.log(`\n  ✅ Deployed at: ${receipt.contractAddress}`);
  console.log(`  Block:        ${receipt.blockNumber}`);
  console.log(`  Gas used:     ${receipt.gasUsed.toLocaleString()}`);
  console.log(`\n  → Update ethereum-mainnet/config/addresses.ts:`);
  console.log(`  flashSwapV3ETH: '${receipt.contractAddress}'`);
}

main().catch(console.error);
