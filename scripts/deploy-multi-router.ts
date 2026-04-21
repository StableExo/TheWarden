/**
 * S58: Deploy FlashSwapV3 Contract #15 via CREATE2 + UserOp + CDP Paymaster
 * Fixed: ESM compat, DEPLOYER_PRIVATE_KEY, bundler gas estimation (no hardcoded limits)
 */

import { createPublicClient, http, type Hex, encodeAbiParameters, parseAbiParameters, concat } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { toCoinbaseSmartAccount, createBundlerClient } from 'viem/account-abstraction';
import * as fs from 'fs';
import * as path from 'path';

const CREATE2_FACTORY = '0x4e59b44847b379578588920cA78FbF26c0B4956C' as const;
const SALT = 6n; // S58: Bumped for Contract #15 (was 5n for #14)

const CONSTRUCTOR_ARGS = {
  uniswapV3Router: '0x2626664c2603336e57b271c5c0b26f421741e481',
  sushiRouter: '0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891',
  balancerVault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  dydxSoloMargin: '0x0000000000000000000000000000000000000001',
  aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
  aaveAddressesProvider: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D',
  v3Factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  titheRecipient: '0x0000000000000000000000000000000000000000',
  titheBps: 0,
};

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY || process.env.COINBASE_WALLET_KEY;
  const cdpUrl = process.env.CDP_PAYMASTER_URL || process.env.COINBASE_PAYMASTER_URL;
  const rpcUrl = process.env.CHAINSTACK_HTTPS || process.env.CHAINSTACK_HTTPS_ENDPOINT || 'https://mainnet.base.org';

  if (!privateKey) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY required');
    process.exit(1);
  }
  if (!cdpUrl) {
    console.error('ERROR: CDP_PAYMASTER_URL required');
    process.exit(1);
  }

  // ESM-compatible path resolution
  const artifactPath = path.resolve('artifacts', 'contracts', 'FlashSwapV3.sol', 'FlashSwapV3.json');
  if (!fs.existsSync(artifactPath)) {
    console.error('ERROR: Artifact not found at ' + artifactPath);
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  const bytecode = artifact.bytecode as Hex;
  console.log('Bytecode loaded: ' + (bytecode.length / 2) + ' bytes');

  const pk = (privateKey.startsWith('0x') ? privateKey : '0x' + privateKey) as Hex;
  const owner = privateKeyToAccount(pk);

  console.log('=== S58: FlashSwapV3 Contract #15 Deployment ===');
  console.log('  EOA: ' + owner.address);

  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
  const smartAccount = await toCoinbaseSmartAccount({ client: publicClient, owners: [owner] });
  console.log('  Smart Wallet: ' + smartAccount.address);

  const encodedArgs = encodeAbiParameters(
    parseAbiParameters('address, address, address, address, address, address, address, address, uint16, address'),
    [
      CONSTRUCTOR_ARGS.uniswapV3Router as Hex,
      CONSTRUCTOR_ARGS.sushiRouter as Hex,
      CONSTRUCTOR_ARGS.balancerVault as Hex,
      CONSTRUCTOR_ARGS.dydxSoloMargin as Hex,
      CONSTRUCTOR_ARGS.aavePool as Hex,
      CONSTRUCTOR_ARGS.aaveAddressesProvider as Hex,
      CONSTRUCTOR_ARGS.v3Factory as Hex,
      CONSTRUCTOR_ARGS.titheRecipient as Hex,
      CONSTRUCTOR_ARGS.titheBps,
      smartAccount.address,
    ]
  );

  const saltHex = ('0x' + SALT.toString(16).padStart(64, '0')) as Hex;
  const initCode = concat([bytecode, encodedArgs]);
  const deployData = concat([saltHex, initCode]);

  const { getContractAddress } = await import('viem');
  const expectedAddress = getContractAddress({
    bytecode: initCode,
    from: CREATE2_FACTORY,
    opcode: 'CREATE2',
    salt: saltHex,
  });
  console.log('  Expected address: ' + expectedAddress);

  const existingCode = await publicClient.getCode({ address: expectedAddress });
  if (existingCode && existingCode !== '0x') {
    console.log('  Contract #15 already deployed at ' + expectedAddress + ' (' + (existingCode.length / 2) + ' bytes)');
    console.log('  >>> FLASHSWAP_V3_ADDRESS=' + expectedAddress + ' <<<');
    return;
  }

  const bundlerClient = createBundlerClient({
    client: publicClient,
    account: smartAccount,
    transport: http(cdpUrl),
    paymaster: true,
  });

  // S53 FIX: Let the bundler estimate gas for CREATE2 deployments
  // Unlike flash loans, CREATE2 CAN be simulated by the bundler
  // Do NOT hardcode gas limits — let eth_estimateUserOperationGas handle it
  console.log('  Deploying via UserOp + CDP Paymaster (bundler gas estimation)...');
  console.log('  Calldata size: ' + deployData.length + ' hex chars (' + (deployData.length / 2) + ' bytes)');
  
  try {
    const userOpHash = await bundlerClient.sendUserOperation({
      calls: [{ to: CREATE2_FACTORY, data: deployData, value: 0n }],
      // No gas overrides — let bundler estimate for CREATE2 simulation
    });
    console.log('  UserOp hash: ' + userOpHash);
    console.log('  Waiting for inclusion (may take 10-60s on Base)...');

    const receipt = await bundlerClient.waitForUserOperationReceipt({ 
      hash: userOpHash,
      timeout: 120_000, // 2 minute timeout
    });
    
    if (receipt.success) {
      const code = await publicClient.getCode({ address: expectedAddress });
      console.log('  Contract #15 deployed at ' + expectedAddress + ' (' + ((code?.length ?? 0) / 2) + ' bytes)');
      console.log('  TX: ' + receipt.receipt.transactionHash);
      console.log('  Gas used: ' + receipt.receipt.gasUsed);
      console.log('  >>> FLASHSWAP_V3_ADDRESS=' + expectedAddress + ' <<<');
    } else {
      console.error('  UserOp executed but FAILED: ' + (receipt.reason || 'unknown'));
      console.error('  TX: ' + receipt.receipt.transactionHash);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('  UserOp submission/receipt error:');
    console.error('  ' + (err.message || err));
    if (err.details) console.error('  Details: ' + err.details);
    if (err.shortMessage) console.error('  Short: ' + err.shortMessage);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Deploy error:', e);
  process.exit(1);
});
