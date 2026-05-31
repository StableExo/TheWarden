/**
 * arb.ts — Shared arbitrage constants + helpers
 * GL-L44: Extracted from bundle.ts — zero side effects, safe to import anywhere.
 * GL-L45: SushiV3 router added. buildArbPath now accepts dexType per step.
 *         dexType 0 = UniV3 | dexType 1 = SushiV3 (same interface, different router)
 */

import { type Address, getAddress } from 'viem';

// ── FlashSwapV3 ABI ───────────────────────────────────────────────────────────
export const FLASH_ABI = [{
  name: 'executeArbitrage',
  type: 'function',
  inputs: [
    { name: 'borrowToken',   type: 'address' },
    { name: 'borrowAmount',  type: 'uint256' },
    {
      name: 'path', type: 'tuple',
      components: [
        {
          name: 'steps', type: 'tuple[]',
          components: [
            { name: 'pool',        type: 'address' },
            { name: 'tokenIn',     type: 'address' },
            { name: 'tokenOut',    type: 'address' },
            { name: 'fee',         type: 'uint24'  },
            { name: 'minOut',      type: 'uint256' },
            { name: 'dexType',     type: 'uint8'   },
            { name: 'router',      type: 'address' },
            { name: 'useDeadline', type: 'bool'    },
          ],
        },
        { name: 'borrowAmount',   type: 'uint256' },
        { name: 'minFinalAmount', type: 'uint256' },
      ],
    },
    { name: 'sourceOverride', type: 'uint8'   },
    { name: 'flashPool',      type: 'address' },
  ],
  outputs: [],
  stateMutability: 'nonpayable',
}] as const;

// ── Routers ───────────────────────────────────────────────────────────────────
export const UNIV3_ROUTER   = getAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564') as Address;
// ★ GL-L45: SushiSwap V3 SwapRouter — identical exactInputSingle interface to UniV3
export const SUSHIV3_ROUTER = getAddress('0x2c9ed6b9927ef12dd85d2caa3dce8dfe8e36ebf') as Address;

/** Map dexType uint8 → router address */
export function routerForDex(dexType: 0 | 1): Address {
  return dexType === 1 ? SUSHIV3_ROUTER : UNIV3_ROUTER;
}

// ── buildArbPath ──────────────────────────────────────────────────────────────
// Constructs UniversalSwapPath for executeArbitrage()
// sourceOverride=0 → Balancer V2 (0% fee) — always use first
//
// dexType: 0 = UniV3 (default) | 1 = SushiV3
// Cross-protocol arb: pass dexType=0 for step1, dexType=1 for step2 (or vice versa)
export function buildArbPath(
  step1Pool: string, step1In: string, step1Out: string, step1Fee: number, step1MinOut: bigint, step1DexType: 0 | 1,
  step2Pool: string, step2In: string, step2Out: string, step2Fee: number, step2MinOut: bigint, step2DexType: 0 | 1,
  borrowAmount: bigint, minFinalAmount: bigint,
) {
  return {
    steps: [
      {
        pool:        step1Pool as Address,
        tokenIn:     step1In   as Address,
        tokenOut:    step1Out  as Address,
        fee:         step1Fee,
        minOut:      step1MinOut,
        dexType:     step1DexType,
        router:      routerForDex(step1DexType),
        useDeadline: false,
      },
      {
        pool:        step2Pool as Address,
        tokenIn:     step2In   as Address,
        tokenOut:    step2Out  as Address,
        fee:         step2Fee,
        minOut:      step2MinOut,
        dexType:     step2DexType,
        router:      routerForDex(step2DexType),
        useDeadline: false,
      },
    ],
    borrowAmount,
    minFinalAmount,
  };
}
