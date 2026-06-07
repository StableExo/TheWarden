/**
 * arb.ts — Shared arbitrage constants + helpers
 * GL-L44: Extracted from bundle.ts — zero side effects.
 * GL-L45: SushiV3 router address was 39 hex chars (invalid). Removed.
 *         UNIV3_ROUTER used for all dexTypes until correct SushiV3 router verified on-chain.
 * GL-L55: buildTriPath added — 3-hop triangular arbitrage path builder.
 * GL-L55: ABI confirmed via bytecode selector scan. Contract has 5 params, 8-field SwapStep.
 *         Includes router + useDeadline fields. sourceOverride + flashPool ARE real params.
 *         Reverts at 147,617 gas = FSV3:IFR profitability check, not wrong ABI.
 */

import { type Address } from 'viem';

// ── FlashSwapV3 ABI (CONFIRMED VIA BYTECODE — selector 0x699c3de5) ─────────────
// Function: executeArbitrage(address,uint256,path,uint8,address)
// SwapStep: {pool,tokenIn,tokenOut,fee,minOut,dexType,router,useDeadline} — 8 fields
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
export const UNIV3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564' as Address;

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
