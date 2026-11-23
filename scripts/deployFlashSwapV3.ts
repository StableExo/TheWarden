import hre from "hardhat";
import { ADDRESSES, NetworkKey, requireAddress } from "../src/config/addresses";

/**
 * FlashSwapV3 deployment (Contract #15, v6.0.0)
 * Source of truth: contracts/FlashSwapV3.sol
 *
 * The constructor takes EXACTLY EIGHT arguments and there is no tithe:
 * 100% of arbitrage profit routes to `owner` (GL-L52).
 *
 *   constructor(
 *       address _uniswapV3Router,
 *       address _sushiRouter,
 *       address _balancerVault,
 *       address _dydxSoloMargin,
 *       address _aavePoolAddress,
 *       address _aaveAddressesProvider,
 *       address _v3Factory,
 *       address payable _owner
 *   )
 *
 * If you change this file, re-read the constructor in
 * contracts/FlashSwapV3.sol first. An argument-count mismatch reverts the
 * deploy transaction before anything reaches the chain, which is how the
 * previous revision of this script failed.
 *
 * ---------------------------------------------------------------------------
 * THE OWNER IS IMMUTABLE
 * ---------------------------------------------------------------------------
 * `address payable public immutable owner;` is set in the constructor and
 * there is no transferOwnership(). The address passed as `_owner` is, forever:
 *   - the only address allowed to call executeArbitrage() and
 *     emergencyWithdraw() (`onlyOwner`, `require(msg.sender == owner)`)
 *   - the address that receives 100% of arbitrage profit
 * There is no recovery path. This script therefore refuses to guess an owner.
 *
 * ---------------------------------------------------------------------------
 * Environment variables
 * ---------------------------------------------------------------------------
 *   FLASHSWAP_V3_OWNER=0x...       REQUIRED. The immutable owner. Must be a
 *                                  wallet you control (recommended: the
 *                                  Coinbase Smart Wallet, or a fresh
 *                                  hardware-backed address). Never a key that
 *                                  has ever been pasted into a chat or commit.
 *   ALLOW_DEPLOYER_AS_OWNER=true   Opt in to using the deployer key's address
 *                                  as owner. Only for throwaway testnet runs.
 *   CONFIRM_MAINNET=true           Required to deploy to `--network base`
 *                                  (chainId 8453). Base Sepolia needs nothing.
 *   VERIFY_CONTRACT=true           Verify the source on Basescan after deploy.
 *   SKIP_CONFIRMATION=true         Do not wait for block confirmations.
 *
 * ---------------------------------------------------------------------------
 * Usage
 * ---------------------------------------------------------------------------
 *   # 1. Prove the whole path on free testnet gas
 *   FLASHSWAP_V3_OWNER=0xYourOwner \
 *     npx hardhat run scripts/deployFlashSwapV3.ts --network baseSepolia
 *
 *   # 2. Mainnet, only once step 1 is clean
 *   FLASHSWAP_V3_OWNER=0xYourOwner CONFIRM_MAINNET=true VERIFY_CONTRACT=true \
 *     npx hardhat run scripts/deployFlashSwapV3.ts --network base
 *
 * The deployer key is read from WALLET_PRIVATE_KEY by hardhat.config.ts. The
 * deployer funds the deploy transaction only; it gets no rights afterwards,
 * unless it is also the owner.
 */

const VERIFY_CONTRACT = process.env.VERIFY_CONTRACT === "true";
const SKIP_CONFIRMATION = process.env.SKIP_CONFIRMATION === "true";
const ALLOW_DEPLOYER_AS_OWNER = process.env.ALLOW_DEPLOYER_AS_OWNER === "true";
const CONFIRM_MAINNET = process.env.CONFIRM_MAINNET === "true";

const BASE_MAINNET_CHAIN_ID = 8453n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** True for a 20-byte hex address. Kept dependency-free on purpose. */
function looksLikeAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

async function main(): Promise<void> {
  const networkConnection = await hre.network.connect();
  const networkName = networkConnection.networkName;
  const [deployer] = await hre.ethers.getSigners();

  const networkInfo = await hre.ethers.provider.getNetwork();
  const chainId = networkInfo.chainId;
  const isBaseMainnet = chainId === BASE_MAINNET_CHAIN_ID;

  console.log("FlashSwapV3 deploy (Contract #15, v6.0.0, 8 constructor args)");
  console.log("=".repeat(64));
  console.log(`Network:   ${networkName} (chainId ${chainId})`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(
    `Balance:   ${hre.ethers.formatEther(
      await hre.ethers.provider.getBalance(deployer.address)
    )} ETH`
  );

  // Mainnet is irreversible and the owner is immutable. Make it deliberate.
  if (isBaseMainnet && !CONFIRM_MAINNET) {
    throw new Error(
      "Refusing to deploy to Base Mainnet (chainId 8453).\n" +
        "  Deploy to Base Sepolia first, confirm the owner, then re-run with\n" +
        "  CONFIRM_MAINNET=true."
    );
  }

  const netName = networkName as NetworkKey;
  if (!ADDRESSES[netName]) {
    throw new Error(
      `No address configuration for network: ${networkName}. ` +
        `Add it to src/config/addresses.ts first.`
    );
  }

  // Protocol addresses, from the single source of truth.
  const uniswapV3Router = requireAddress(netName, "uniswapV3Router");
  const sushiRouter = requireAddress(netName, "sushiRouter");
  const balancerVault = requireAddress(netName, "balancerVault");
  const aavePool = requireAddress(netName, "aavePool");
  const aaveAddressesProvider = requireAddress(netName, "aaveAddressesProvider");
  const uniswapV3Factory = requireAddress(netName, "uniswapV3Factory");

  // dYdX Solo Margin exists on Ethereum mainnet only. The constructor does not
  // reject the zero address, so zero is the correct value off-mainnet.
  const dydxSoloMargin = ADDRESSES[netName].dydxSoloMargin || ZERO_ADDRESS;

  // ---- Owner: the one decision that cannot be undone -----------------------
  const ownerEnv = (process.env.FLASHSWAP_V3_OWNER || "").trim();
  let owner: string;
  let ownerSource: string;

  if (ownerEnv) {
    if (!looksLikeAddress(ownerEnv)) {
      throw new Error(`FLASHSWAP_V3_OWNER is not a valid address: ${ownerEnv}`);
    }
    owner = ownerEnv;
    ownerSource = "FLASHSWAP_V3_OWNER";
  } else if (ALLOW_DEPLOYER_AS_OWNER) {
    owner = deployer.address;
    ownerSource = "ALLOW_DEPLOYER_AS_OWNER (deployer key)";
  } else {
    throw new Error(
      "FLASHSWAP_V3_OWNER is not set.\n" +
        "  The owner is immutable and receives 100% of profit. Set it, for example:\n" +
        "  FLASHSWAP_V3_OWNER=0xYourWallet npx hardhat run scripts/deployFlashSwapV3.ts --network baseSepolia\n" +
        "  If you really mean the deployer key, set ALLOW_DEPLOYER_AS_OWNER=true."
    );
  }

  if (owner.toLowerCase() === ZERO_ADDRESS) {
    throw new Error("Owner cannot be the zero address (FSV3:IOW on chain).");
  }
  if (owner.toLowerCase() === deployer.address.toLowerCase()) {
    console.log(
      "\nWARNING: owner == deployer. The deploy key becomes the only operator\n" +
        "         and the profit recipient. Fine for a throwaway test; not for mainnet."
    );
  }

  const args = [
    uniswapV3Router,
    sushiRouter,
    balancerVault,
    dydxSoloMargin,
    aavePool,
    aaveAddressesProvider,
    uniswapV3Factory,
    owner,
  ];

  console.log("-".repeat(64));
  console.log("Constructor arguments (8):");
  console.log(`  1 _uniswapV3Router       ${uniswapV3Router}`);
  console.log(`  2 _sushiRouter           ${sushiRouter}`);
  console.log(`  3 _balancerVault         ${balancerVault}`);
  console.log(`  4 _dydxSoloMargin        ${dydxSoloMargin}${dydxSoloMargin === ZERO_ADDRESS ? "  (not on this network)" : ""}`);
  console.log(`  5 _aavePoolAddress       ${aavePool}`);
  console.log(`  6 _aaveAddressesProvider ${aaveAddressesProvider}`);
  console.log(`  7 _v3Factory             ${uniswapV3Factory}`);
  console.log(`  8 _owner                 ${owner}  <- IMMUTABLE, receives 100% of profit`);
  console.log(`      owner source:         ${ownerSource}`);
  console.log("-".repeat(64));

  console.log("\nDeploying...");
  const FlashSwapV3 = await hre.ethers.getContractFactory("FlashSwapV3");
  const flashSwapV3 = await FlashSwapV3.deploy(...args);
  await flashSwapV3.waitForDeployment();

  const contractAddress = await flashSwapV3.getAddress();
  const deployTx = flashSwapV3.deploymentTransaction();

  console.log("\nFlashSwapV3 deployed.");
  console.log("=".repeat(64));
  console.log(`Contract: ${contractAddress}`);
  console.log(`Owner:    ${owner}`);
  if (deployTx) {
    console.log(`Tx:       ${deployTx.hash}`);
  }
  console.log("=".repeat(64));

  if (!SKIP_CONFIRMATION && deployTx) {
    console.log("\nWaiting for 5 confirmations...");
    await deployTx.wait(5);
    console.log("5 confirmations received.");
  } else if (SKIP_CONFIRMATION) {
    console.log("\nSkipped confirmation wait (SKIP_CONFIRMATION=true).");
  }

  const manualVerifyLines = [
    `npx hardhat verify --network ${networkName} ${contractAddress}`,
    ...args,
  ];

  if (VERIFY_CONTRACT) {
    console.log("\nVerifying source on Basescan...");
    try {
      const verifyModule = await import("@nomicfoundation/hardhat-verify/verify");
      await verifyModule.verifyContract(
        {
          address: contractAddress,
          constructorArgs: args,
          contract: "contracts/FlashSwapV3.sol:FlashSwapV3",
        },
        hre
      );
      console.log("Verified.");
    } catch (verifyError: unknown) {
      const message =
        verifyError instanceof Error ? verifyError.message : String(verifyError);
      if (/already verified/i.test(message)) {
        console.log("Already verified.");
      } else {
        console.error(`Verification failed: ${message}`);
        console.log("\nVerify manually with:");
        console.log(manualVerifyLines.join(" \\\n  "));
      }
    }
  } else {
    console.log("\nTo verify later, re-run with VERIFY_CONTRACT=true, or manually run:");
    console.log(manualVerifyLines.join(" \\\n  "));
  }

  console.log("\nAdd these to .env (and to the Railway service that runs the bot):");
  console.log("-".repeat(64));
  console.log(`FLASHSWAP_V3_ADDRESS=${contractAddress}`);
  console.log(`FLASHSWAP_V3_OWNER=${owner}`);
  console.log(`ENABLE_FLASHSWAP_V3=true`);
  console.log("-".repeat(64));
  console.log("\nNext: allowlist this contract in the CDP paymaster before any");
  console.log("gasless UserOp will be sponsored. Testnet sponsorship is free;");
  console.log("mainnet sponsorship costs gas plus a 7% fee.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
