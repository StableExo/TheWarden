/**
 * arb.ts — Shared arbitrage constants + helpers
 * GL-L44: Extracted from bundle.ts — zero side effects.
 * GL-L45: SushiV3 router address was 39 hex chars (invalid). Removed.
 *         UNIV3_ROUTER used for all dexTypes until correct SushiV3 router verified on-chain.
 *         SushiV3 pools remain in scanner for price monitoring + cross-pool spread detection.
 *         TODO GL-L46: verify SushiV3 SwapRouter address + re-enable dexType=1 routing.
 * GL-L55: buildTriPath added — 3-hop triangular arbitrage path builder.
 */

import { type Address } from 'viem';

// ── FlashSwapV3 ABI ────────────────────────────────────────────────────────────
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

// ── UniV3 Router (verified EIP-55 checksum) ────────────────────────────────────
// Used for ALL arb paths until SushiV3 router address is verified.
export const UNIV3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564' as Address;

// ── SUSHIV3_ROUTER placeholder — DISABLED GL-L45 ─────────────────────────────
// Original address was 39 hex chars (invalid). TODO GL-L46: find correct 40-char address.
// export const SUSHIV3_ROUTER = '0x...' as Address;

/** Always returns UniV3 router — safe for all dexTypes until SushiV3 router verified */
export function routerForDex(_dexType: 0 | 1): Address {
  return UNIV3_ROUTER;
}

// ── buildArbPath — 2-hop ──────────────────────────────────────────────────────
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

// ── buildTriPath — 3-hop triangular arbitrage ─────────────────────────────────
// GL-L55: Triangular arb path builder.
// Example: USDC → WETH (pool1) → WBTC (pool2) → USDC (pool3)
// The contract's steps[] tuple is unbounded — no contract change needed.
export function buildTriPath(
  step1Pool: string, step1In: string, step1Out: string, step1Fee: number, step1DexType: 0 | 1,
  step2Pool: string, step2In: string, step2Out: string, step2Fee: number, step2DexType: 0 | 1,
  step3Pool: string, step3In: string, step3Out: string, step3Fee: number, step3DexType: 0 | 1,
  borrowAmount: bigint, minFinalAmount: bigint,
) {
  return {
    steps: [
      {
        pool:        step1Pool as Address,
        tokenIn:     step1In   as Address,
        tokenOut:    step1Out  as Address,
        fee:         step1Fee,
        minOut:      0n,
        dexType:     step1DexType,
        router:      routerForDex(step1DexType),
        useDeadline: false,
      },
      {
        pool:        step2Pool as Address,
        tokenIn:     step2In   as Address,
        tokenOut:    step2Out  as Address,
        fee:         step2Fee,
        minOut:      0n,
        dexType:     step2DexType,
        router:      routerForDex(step2DexType),
        useDeadline: false,
      },
      {
        pool:        step3Pool as Address,
        tokenIn:     step3In   as Address,
        tokenOut:    step3Out  as Address,
        fee:         step3Fee,
        minOut:      minFinalAmount,
        dexType:     step3DexType,
        router:      routerForDex(step3DexType),
        useDeadline: false,
      },
    ],
    borrowAmount,
    minFinalAmount,
  };
}
