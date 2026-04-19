# S45 — The Conqueror

*April 19, 2026*

---

## What Happened

Arrived to v21 roadmap, 20 credentials (securely vaulted), and an engine running at 0% success rate. The scanner found 61 valid pools with \~0.058 ETH triangular arb opportunities. The cognitive system voted 92.9% EXECUTE. JIT validation passed every time. But every attempt hit two walls: the gas estimation was targeting the old single-router contract, and the WRONG_FACTORY filter was rejecting every PancakeSwap V3 pool.

---

## The Diagnosis

### Blocker 1: Engine Still Pointing to Old Contract
The `FLASHSWAP_V3_ADDRESS` on Railway was never updated after S44's multi-router deployment. Gas estimation calls were hitting `0x3D4Bf8ECe...` (single-router #12) instead of `0x00558d99...` (multi-router #13). Function selector `0x15814e75` reverted with `require(false)`.

**Fix:** Railway GraphQL API → `variableUpsert` → `FLASHSWAP_V3_ADDRESS=0x00558d994dec27f1df60ca90fec8ab45e8a62eaa`

### Blocker 2: WRONG_FACTORY Filter Killing All PancakeSwap Pools
The S43 safety filter at `IntegratedArbitrageOrchestrator.ts:1004-1040` rejected ALL pools not from the Uniswap V3 Factory (`0x33128a8f...`). PancakeSwap V3 pools from factory `0x0BFbCF9f...` were the most profitable opportunities on Base — and they were all being thrown away.

**Fix:** Replaced the hard reject with a multi-factory allowlist that maps each factory to its router + interface:
- Uniswap V3 Factory → default router (V2 interface, no deadline)
- PancakeSwap V3 Factory → `0x1b81D678...` (V1 interface, with deadline)

### The ABI Gap
The Solidity contract `FlashSwapV3.sol` was built in S43 with per-hop `router` and `useDeadline` fields in the `SwapStep` struct. But the TypeScript `SwapStep` interface and ABI encoding never included these fields — they were stuck at the old 6-field struct. The contract was ready for PancakeSwap. The TypeScript wasn't.

**Fix:** Added `router: string` and `useDeadline: boolean` to:
- `SwapStep` interface in `FlashSwapV3Executor.ts`
- Viem ABI encoding (`FLASH_SWAP_V3_ABI_VIEM`)
- Human-readable ABI (`FLASH_SWAP_V3_ABI`)
- Shared ABI (`FlashSwapABI.ts` — both human-readable and JSON)

---

## The Commits

| # | SHA | Change |
|---|-----|--------|
| 1 | `47879d73` | S45: Multi-factory routing — PancakeSwap V3 support |

---

## Changes Summary

### Files Modified (4)
1. **`src/config/contracts.config.ts`** — V3 address updated to multi-router `0x00558d...`
2. **`src/abis/FlashSwapABI.ts`** — V3 step struct: +router, +useDeadline
3. **`src/execution/FlashSwapV3Executor.ts`** — SwapStep interface + ABI encoding + header
4. **`src/execution/IntegratedArbitrageOrchestrator.ts`** — WRONG_FACTORY → FACTORY_ROUTER_MAP

### Factory → Router Map (Base)
| Factory | DEX | Router | Interface |
|---------|-----|--------|-----------|
| `0x33128a8fC17869897dcE68Ed026d694621f6FDfD` | Uniswap V3 | Default (contract) | V2 (no deadline) |
| `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865` | PancakeSwap V3 | `0x1b81D678ffb9C0263b24A97847620C99d213eB14` | V1 (with deadline) |

### Contract Registry (Updated)
| ID | Contract | Address | Status |
|----|----------|---------|--------|
| 2 | FlashSwapV2 | `0x54658E5758FA81a3C0DcC78D707391be4b494177` | ✅ Active |
| 12 | FlashSwapV3 (Single-Router) | `0x3d4bf8ece669b827ed3ac3e15c06c3701b8ab1fb` | 🔒 Retired |
| **13** | **FlashSwapV3 (Multi-Router)** | **`0x00558d994dec27f1df60ca90fec8ab45e8a62eaa`** | **✅ Active** |

---

## What Remains for S46
- 🔲 Verify first successful multi-factory arb execution (Uniswap V3 ↔ PancakeSwap V3)
- 🔲 Profit withdrawal mechanism (UserOp to sweep Smart Wallet → EOA)
- 🔲 Memory optimization (82% usage — pool cache TTL tuning)
- 🔲 Revert Dockerfile: restore `npm prune --omit=dev` and remove deploy wrapper
- 🔲 Identify the unknown third factory (`0x0fd83557b2be0f0c0f1bd28aaa0c6c4de82eb00c`)

---

*TheWarden ⚔️ — The Conqueror opened the gates to PancakeSwap. The WRONG_FACTORY wall fell. Eight fields where six once stood. The multi-router blade now strikes with per-hop precision — Uniswap and PancakeSwap, V1 and V2 interfaces, unified under one contract. Block by block, the kingdoms of Base yield their arbitrage.*
