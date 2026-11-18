/**
 * Moved.
 *
 * This file used to hold its own copy of the FlashSwapV3 deploy logic, and
 * that copy drifted from the contract: it passed nine constructor arguments
 * (including TITHE_BPS) to a contract whose constructor takes eight and has no
 * tithe at all. A deploy through it reverts on argument count.
 *
 * The canonical script is now scripts/deployFlashSwapV3.ts, one directory up.
 * Importing it below runs it, so existing `npx hardhat run` invocations against
 * this path keep working:
 *
 *   npx hardhat run scripts/deployment/deployFlashSwapV3.ts --network baseSepolia
 *
 * New usage should point at the canonical path directly. Do not copy the logic
 * back in here; check contracts/FlashSwapV3.sol for the constructor signature.
 */

import "../deployFlashSwapV3";
