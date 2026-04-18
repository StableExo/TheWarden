# S43 — The Cartographer's Map

*April 18, 2026*

---

## What Happened

I arrived to the same PDF of secrets (fourth time — they're now in the vault), a roadmap at v18.3, and an engine that had solved the SwapRouter V1→V2 interface mismatch in S42. The slippage had been widened from 5% to 50%. The fee tiers were corrected. The router selector was right. Everything should have worked.

But the logs still showed `SPL`. Every cycle. The previous Cody had pushed commit `c62ae0aa` — "Widen per-hop slippage 5%→50%" — and called it a night. I pulled Railway logs at 19:06 UTC and caught the revert mid-cycle.

---

## The Diagnosis

The contract was clean. `_swapUniswapV3()` sets `sqrtPriceLimitX96: 0`, and SwapRouter02's `exactInputInternal` correctly converts that to `MIN_SQRT_RATIO + 1` or `MAX_SQRT_RATIO - 1`. The slippage fix changed `amountOutMinimum` — but SPL isn't about slippage. SPL is about `sqrtPriceLimitX96`. Wrong dimension. The fix was aimed at the wrong wall.

So I queried the three pools from the last failed execution on-chain:

| Pool | Factory | Uniswap V3? |
|------|---------|-------------|
| `0xc2A9bB7E...` | `0x0fd83557...` | ❌ NO |
| `0x20CB8f87...` | `0x0bfbcf9f...` | ❌ NO |
| `0xa91809cC...` | `0x0bfbcf9f...` | ❌ NO |

Uniswap V3 Factory on Base: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`.

**None of the three pools came from the Uniswap V3 Factory.**

The engine scans 16 DEXes — Uniswap V3, PancakeSwap V3, SushiSwap V3, Aerodrome, BaseSwap, and more. All V3-compatible forks use the same pool interface: `token0()`, `token1()`, `fee()`, `liquidity()`, `swap()`. The scanner found arbitrage across pools from different factories. But the FlashSwapV3 contract routes ALL V3 swaps through the Uniswap V3 SwapRouter02.

The router internally calls `Factory.getPool(tokenIn, tokenOut, fee)` — which computes a CREATE2 address using the **Uniswap V3 Factory**. For a pool from PancakeSwap's factory, this computation yields a completely different address. The swap goes to a phantom — a contract that either doesn't exist or is a different pool at a different tick. `SPL`.

Every execution since the first deployment was routing to addresses derived from the wrong factory. The scanner was right. The fees were right. The tokens were right. The factory was wrong.

---

## The Fix

Two layers, both deployed and verified:

### Layer 1: Execution Guard (`bb60ddcc`)
In `IntegratedArbitrageOrchestrator.ts`, before building the swap path:
- Queries `factory()` on each pool in the path via ethers `provider.call()`
- If any pool's factory ≠ `0x33128a8f...`, rejects the entire opportunity with `WRONG_FACTORY`
- Zero-cost early exit — no wasted UserOps

### Layer 2: Upstream Scan Filter (`33fbbfa4`)
In `OptimizedPoolScanner.ts`, during the multicall batch:
- Added `factory()` as a 4th call in the existing `token0()`/`token1()`/`liquidity()` multicall
- Zero extra RPC calls (piggybacks on existing batch)
- If factory ≠ Uniswap V3, returns `null` → pool never enters the arb detection pipeline
- Reduces memory pressure + eliminates false opportunities before they're even evaluated

### Verification
Post-deploy at 19:25 UTC, first scan cycle found 27 potential opportunities. The factory filter caught pool `0xc2A9bB7E...` from factory `0x0fd83557...` and rejected it cleanly. **Zero SPL errors.** Zero wasted UserOps. Memory dropped from 90.5% to 84.3%.

---

## The Commits

| # | SHA | Change |
|---|-----|--------|
| 1 | `bb60ddcc` | Factory filter — reject pools not from Uniswap V3 Factory (execution guard) |
| 2 | `33fbbfa4` | Upstream factory filter — reject during scan via multicall (saves memory + CPU) |
| 3 | *(this)* | Cody Journal: S43 — The Cartographer's Map |

---

## Contract Registry (Unchanged)

| ID | Contract | Address | Status |
|----|----------|---------|--------|
| 2 | FlashSwapV2 | `0x54658E5758FA81a3C0DcC78D707391be4b494177` | ✅ Active |
| 10 | FlashSwapV3 (V1 router bug) | `0xB193094e9FC4993a885746F10F87E5439fd12d94` | ⚪ Inactive |
| 11 | FlashSwapV3 (owner=EOA) | `0x8feB9324f78022D7ae5fAa501240B5533B2859db` | ⚪ Inactive |
| **12** | **FlashSwapV3 (SwapRouter02)** | **`0x3d4bf8ece669b827ed3ac3e15c06c3701b8ab1fb`** | **✅ Active** |

---

## What Remains for S44

- 🔲 First successful on-chain swap execution (SPL blocker removed — waiting for Uniswap-only opportunity)
- 🔲 Multi-router support (unlock PancakeSwap V3 / SushiSwap V3 arbs — currently filtered out)
- 🔲 Propagate fee through PoolEdge→PoolState pipeline
- 🔲 Profit validation accuracy (cached vs JIT)
- 🔲 Profit withdrawal mechanism (UserOp to sweep SW → EOA)
- 🔲 Memory optimization (84.3% still high — consider pool cache TTL tuning)

---

*TheWarden ⚔️ — The Cartographer traced three pools to the wrong map. Every swap since deployment was being routed to phantom addresses — CREATE2 computations from the wrong factory. The scanner found sixteen kingdoms of DEXes, but the blade could only cut through one. One selector — `factory()` — one query, one truth. The map is redrawn. Now the blade knows where to swing.*
