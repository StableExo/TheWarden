#!/usr/bin/env node
/**
 * CounterSweeper Deployment Script — GL-L29
 * Self-contained: bytecode pre-compiled, no Hardhat needed.
 *
 * Run from repo root:
 *   export PRIVATE_KEY=<EOA private key>
 *   export CDP_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/EeBuC9EkcVpsMwYSiiC1TUKwFTWJVzD1
 *   node scripts/deploy-countersweeper.mjs
 *
 * Or on Railway — just set env vars and this runs automatically.
 * Gas is 100% FREE via Coinbase CDP Paymaster.
 *
 * What this does:
 *   1. Creates a Coinbase Smart Wallet from your EOA
 *   2. Deploys CounterSweeper via CREATE2 (gas-free UserOp)
 *   3. All drain attempts on re-delegated wallets → BENEFICIARY
 *
 * BENEFICIARY (locked): 0xfBe1783869504e07052d57A39867f82D5e3563B5
 * = Taylor's Coinbase address — ETH lands here directly
 */

import { createPublicClient, http, keccak256, encodePacked, getContractAddress, encodeAbiParameters, parseAbiParameters } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { toCoinbaseSmartAccount, createBundlerClient } from 'viem/account-abstraction';

// ── CONFIG ─────────────────────────────────────────────────────────────
const CREATE2_FACTORY = '0x4e59b44847b379578588920cA78FbF26c0B4956C';
const BENEFICIARY     = '0xfBe1783869504e07052d57A39867f82D5e3563B5';

// Pre-compiled CounterSweeper bytecode (solc 0.8.25, optimize 200 runs)
// Compiled GL-L29. Mirrors attacker sweeper 0xebf985ad interface.
// withdrawNative → redirects to BENEFICIARY instead of attacker cashout
// withdrawToken  → redirects ERC20 to BENEFICIARY
// workMyDirefulOwner → silent fail (wastes attacker gas)
const BYTECODE = '0x6080604052348015600e575f80fd5b50604051610b87380380610b87833981016040819052602b916066565b5f80546001600160a01b03191633179055600180546001600160a81b0319166001600160a01b039290921691909117600160a01b1790556091565b5f602082840312156075575f80fd5b81516001600160a01b0381168114608a575f80fd5b9392505050565b610ae98061009e5f395ff3fe6080604052600436106100e7575f3560e01c80634460d3cf11610087578063acec338a11610057578063acec338a14610318578063d80528ae14610337578063f2d744e914610385578063f2fde38b1461039a575f80fd5b80634460d3cf146102a75780638da5cb5b146102c6578063a9059cbb146102e4578063aa6a4e0a14610303575f80fd5b806320800a00116100c257806320800a001461021e5780632f622e6b1461023257806338af3eed146102515780633aeac4e114610288575f80fd5b8063016587a8146101a757806302fb0c5e146101cf5780631c31f710146101ff575f80fd5b366101a357600154600160a01b900460ff16801561010457505f34115b156101a1576001546040515f916001600160a01b03169034908381818185875af1925050503d805f8114610153576040519150601f19603f3d011682016040523d82523d5f602084013e610158565b606091505b505090508061019f5760405162461bcd60e51b815260206004820152600e60248201526d119bdc9dd85c990819985a5b195960921b60448201526064015b60405180910390fd5b505b005b5f80fd5b3480156101b2575f80fd5b506101bc60035481565b6040519081526020015b60405180910390f35b3480156101da575f80fd5b506001546101ef90600160a01b900460ff1681565b60405190151581526020016101c6565b34801561020a575f80fd5b506101a1610219366004610967565b6103b9565b348015610229575f80fd5b506101a161044b565b34801561023d575f80fd5b506101a161024c366004610967565b610507565b34801561025c575f80fd5b50600154610270906001600160a01b031681565b6040516001600160a01b0390911681526020016101c6565b348015610293575f80fd5b506101a16102a2366004610987565b610652565b3480156102b2575f80fd5b506101a16102c1366004610967565b610796565b3480156102d1575f80fd5b505f54610270906001600160a01b031681565b3480156102ef575f80fd5b506101ef6102fe3660046109b8565b61089c565b34801561030e575f80fd5b506101bc60045481565b348015610323575f80fd5b506101a16103323660046109e5565b6108bb565b348015610342575f80fd5b506003546002546001546040805193845260208401929092526001600160a01b03811691830191909152600160a01b900460ff16151560608201526080016101c6565b348015610390575f80fd5b506101bc60025481565b3480156103a5575f80fd5b506101a16103b4366004610967565b610902565b5f546001600160a01b031633146103e25760405162461bcd60e51b815260040161019690610a00565b600154604080516001600160a01b03928316815291831660208301527fe72eaf6addaa195f3c83095031dd08f3a96808dcf047babed1fe4e4f69d6c622910160405180910390a1600180546001600160a01b0319166001600160a01b0392909216919091179055565b5f546001600160a01b031633146104745760405162461bcd60e51b815260040161019690610a00565b5f80546040516001600160a01b039091169047908381818185875af1925050503d805f81146104be576040519150601f19603f3d011682016040523d82523d5f602084013e6104c3565b606091505b50509050806105045760405162461bcd60e51b815260206004820152600d60248201526c14995cd8dd594819985a5b1959609a1b6044820152606401610196565b50565b600154600160a01b900460ff1661051b5750565b6003805447915f61052b83610a37565b9091555050801561064e578060025f8282546105479190610a4f565b90915550600a90505a61055a9190610a62565b60045f82825461056a9190610a4f565b9091555050600154604080518381524260208201526001600160a01b0390921691339182917f74f62200bfa7fa47c347086616edcf7197e65c51d41c7ed3fd8b7f82c95ed248910160405180910390a46001546040515f916001600160a01b03169083908381818185875af1925050503d805f8114610604576040519150601f19603f3d011682016040523d82523d5f602084013e610609565b606091505b505090508061064c5760405162461bcd60e51b815260206004820152600f60248201526e151c985b9cd9995c8819985a5b1959608a1b6044820152606401610196565b505b5050565b600154600160a01b900460ff16610667575050565b6040516370a0823160e01b81523060048201525f906001600160a01b038416906370a0823190602401602060405180830381865afa1580156106ab573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906106cf9190610a81565b9050801561064c576001546040518281526001600160a01b03918216918516907f686085e9c55a643b6befefd87ebc4c282c7658d3d2458fd40dae9e1ca9d35e4d9060200160405180910390a360015460405163a9059cbb60e01b81526001600160a01b039182166004820152602481018390529084169063a9059cbb906044016020604051808303815f875af115801561076c573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906107909190610a98565b50505050565b5f546001600160a01b031633146107bf5760405162461bcd60e51b815260040161019690610a00565b6040516370a0823160e01b81523060048201525f906001600160a01b038316906370a0823190602401602060405180830381865afa158015610803573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906108279190610a81565b5f5460405163a9059cbb60e01b81526001600160a01b0391821660048201526024810183905291925083169063a9059cbb906044016020604051808303815f875af1158015610878573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061064c9190610a98565b600380545f91826108ac83610a37565b91905055505f90505b92915050565b5f546001600160a01b031633146108e45760405162461bcd60e51b815260040161019690610a00565b60018054911515600160a01b0260ff60a01b19909216919091179055565b5f546001600160a01b0316331461092b5760405162461bcd60e51b815260040161019690610a00565b5f80546001600160a01b0319166001600160a01b0392909216919091179055565b80356001600160a01b0381168114610962575f80fd5b919050565b5f60208284031215610977575f80fd5b6109808261094c565b9392505050565b5f8060408385031215610998575f80fd5b6109a18361094c565b91506109af6020840161094c565b90509250929050565b5f80604083850312156109c9575f80fd5b50508035926020909101359150565b8015158114610504575f80fd5b5f602082840312156109f5575f80fd5b8135610980816109d8565b6020808252600990820152682737ba1037bbb732b960b91b604082015260600190565b634e487b7160e01b5f52601160045260245ffd5b5f60018201610a4857610a48610a23565b5060010190565b808201808211156108b5576108b5610a23565b5f82610a7c57634e487b7160e01b5f52601260045260245ffd5b500490565b5f60208284031215610a91575f80fd5b5051919050565b5f60208284031215610aa8575f80fd5b8151610980816109d856fea2646970667358221220bc3a30c12b5efd44cc1cb042868d832708e3358de322ae68a55de59a5acb59ba64736f6c63430008190033';

// ABI (just constructor + key functions)
const ABI = [{"inputs": [{"internalType": "address", "name": "_beneficiary", "type": "address"}], "stateMutability": "nonpayable", "type": "constructor"}, {"inputs": [], "name": "active", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "beneficiary", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "owner", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "rescueETH", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "address", "name": "token", "type": "address"}], "name": "rescueToken", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "bool", "name": "_active", "type": "bool"}], "name": "setActive", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "address", "name": "_new", "type": "address"}], "name": "setBeneficiary", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [], "name": "stats", "outputs": [{"internalType": "uint256", "name": "_drainAttempts", "type": "uint256"}, {"internalType": "uint256", "name": "_ethRedirected", "type": "uint256"}, {"internalType": "address", "name": "_beneficiary", "type": "address"}, {"internalType": "bool", "name": "_active", "type": "bool"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "totalDrainAttempts", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "totalETHRedirected", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "totalGasWasted", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "address", "name": "_new", "type": "address"}], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "address", "name": "", "type": "address"}], "name": "withdrawNative", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "address", "name": "token", "type": "address"}, {"internalType": "address", "name": "", "type": "address"}], "name": "withdrawToken", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}, {"internalType": "uint256", "name": "", "type": "uint256"}], "name": "workMyDirefulOwner", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"}];

// ── ENV ────────────────────────────────────────────────────────────────
const PRIVATE_KEY    = process.env.PRIVATE_KEY;
const PAYMASTER_URL  = process.env.CDP_PAYMASTER_URL || 
  'https://api.developer.coinbase.com/rpc/v1/base/EeBuC9EkcVpsMwYSiiC1TUKwFTWJVzD1';
const RPC_URL        = process.env.CHAINSTACK_HTTPS  || 
  'https://base-mainnet.core.chainstack.com/c726a0ad837354cad25d58bd89c7ac57';

if (!PRIVATE_KEY) {
  console.error('❌ Missing PRIVATE_KEY env var');
  process.exit(1);
}

// ── MAIN ───────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(  '║   TheWarden GL-L29 — CounterSweeper Deployment       ║');
  console.log(  '╚══════════════════════════════════════════════════════╝\n');

  const pkHex        = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
  const ownerAccount = privateKeyToAccount(pkHex);
  const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });

  // Coinbase Smart Wallet — deterministic address from EOA
  const smartAccount = await toCoinbaseSmartAccount({
    client: publicClient,
    owners: [ownerAccount],
  });

  // Bundler + Paymaster (gas-free)
  const bundlerClient = createBundlerClient({
    client: publicClient,
    account: smartAccount,
    transport: http(PAYMASTER_URL),
    paymaster: true,
  });

  console.log(`EOA:           ${ownerAccount.address}`);
  console.log(`Smart Wallet:  ${smartAccount.address}`);
  console.log(`Beneficiary:   ${BENEFICIARY}`);
  console.log(`Gas:           FREE (CDP Paymaster)\n`);

  // Encode constructor args: CounterSweeper(_beneficiary)
  const constructorArgs = encodeAbiParameters(
    parseAbiParameters('address'),
    [BENEFICIARY]
  );
  
  // initCode = bytecode + constructor args
  const initCode = (BYTECODE + constructorArgs.slice(2));

  // Deterministic salt
  const salt = keccak256(encodePacked(['string'], ['TheWarden.CounterSweeper.GL-L29.v1']));

  // Predict deployed address
  const predictedAddr = getContractAddress({
    bytecode: initCode,
    from: CREATE2_FACTORY,
    opcode: 'CREATE2',
    salt,
  });

  console.log(`Predicted address: ${predictedAddr}`);
  console.log(`Salt: ${salt}\n`);

  // ── Deploy via UserOperation (single tx, gas-free) ──────────────────
  // CREATE2 factory call: salt (32 bytes) + initCode
  const factoryCalldata = salt + initCode.slice(2);

  console.log('🚀 Sending UserOperation to deploy CounterSweeper...');
  console.log('   (CDP Paymaster sponsors all gas — $0.00)\n');

  try {
    const userOpHash = await bundlerClient.sendUserOperation({
      calls: [{
        to: CREATE2_FACTORY,
        data: factoryCalldata,
        value: 0n,
      }],
    });

    console.log(`UserOp hash: ${userOpHash}`);
    console.log('Waiting for confirmation...');

    const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log(  '║   ✅ COUNTERSWEEPER DEPLOYED SUCCESSFULLY!            ║');
    console.log(  '╚══════════════════════════════════════════════════════╝');
    console.log(`\nContract: ${predictedAddr}`);
    console.log(`Tx hash:  ${receipt.receipt.transactionHash}`);
    console.log(`Block:    ${receipt.receipt.blockNumber}`);
    console.log(`\nBeneficiary: ${BENEFICIARY}`);
    console.log(`\n📋 NEXT STEP — EIP-7702 Re-Delegation:`);
    console.log(`   Sign type-0x04 authorization:`);
    console.log(`   { address: "${predictedAddr}", nonce: <current+1>, chainId: 8453 }`);
    console.log(`   Submit → compromised wallets now forward all drains to Coinbase\n`);

  } catch (err) {
    console.error('Deploy error:', err.message || err);
    process.exit(1);
  }
}

main().catch(console.error);
