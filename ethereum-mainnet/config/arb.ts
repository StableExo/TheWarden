/**
 * arb.ts — Shared arbitrage constants + helpers
 * GL-L44: Extracted from bundle.ts so build-block.ts can import
 *         without triggering bundle.ts main() execution.
 *
 * Zero side effects — safe to import from any module.
 */

import { type Address } from 'viem';

// ── FlashSwapV3 ABI ──────────────────────────────────────────────────────────
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

// ── UniV3 Router ─────────────────────────────────────────────────────────────
export const UNIV3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564' as Address;

// ── buildArbPath ─────────────────────────────────────────────────────────────
// Constructs UniversalSwapPath for executeArbitrage()
// sourceOverride=0 → Balancer V2 (0% fee) — always use first
export function buildArbPath(
  step1Pool: string, step1In: string, step1Out: string, step1Fee: number, step1MinOut: bigint,
  step2Pool: string, step2In: string, step2Out: string, step2Fee: number, step2MinOut: bigint,
  borrowAmount: bigint, minFinalAmount: bigint,
) {
  return {
    steps: [
      {
        pool: step1Pool as Address, tokenIn: step1In as Address, tokenOut: step1Out as Address,
        fee: step1Fee, minOut: step1MinOut, dexType: 0, router: UNIV3_ROUTER, useDeadline: false,
      },
      {
        pool: step2Pool as Address, tokenIn: step2In as Address, tokenOut: step2Out as Address,
        fee: step2Fee, minOut: step2MinOut, dexType: 0, router: UNIV3_ROUTER, useDeadline: false,
      },
    ],
    borrowAmount,
    minFinalAmount,
  };
}

