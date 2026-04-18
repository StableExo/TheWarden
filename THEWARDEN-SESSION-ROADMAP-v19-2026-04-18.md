

---

## ✅ S43 — The Cartographer's Map (COMPLETE)

### Theme: Factory mismatch fix — pools from wrong V3 factories caused SPL revert

### Root Cause
- 🔲→✅ **`SPL` revert** — V3 pools from non-Uniswap factories
  - Engine scans 16 DEXes (PancakeSwap V3, SushiSwap V3, etc.)
  - All V3 forks share same pool interface — scanner treats them equally
  - FlashSwapV3 routes ALL swaps through Uniswap V3 SwapRouter02
  - Router uses `Factory.getPool(tokenIn, tokenOut, fee)` with Uniswap V3 Factory
  - Pools from other factories → wrong CREATE2 address → SPL on phantom pool
  - Previous fix (S42 `c62ae0aa`: slippage 5%→50%) was wrong dimension — SPL ≠ amountOutMinimum

### Fix — Two Layers
- ✅ **Execution guard** (`bb60ddcc`) — queries `factory()` at execution time, rejects non-Uniswap
- ✅ **Upstream scan filter** (`33fbbfa4`) — adds `factory()` to multicall batch, filters before arb detection
- ✅ Verified: 0 SPL errors post-deploy, factory filter catching non-Uniswap pools
- ✅ Memory improved: 90.5% → 84.3%

### 3 Commits
| # | SHA | Change |
|---|-----|--------|
| 1 | `bb60ddcc` | Factory filter — reject pools not from Uniswap V3 Factory (execution guard) |
| 2 | `33fbbfa4` | Upstream factory filter — reject during scan via multicall |
| 3 | *(journal)* | Cody Journal: S43 — The Cartographer's Map |

### What Remains for S44
- 🔲 First successful on-chain swap execution
- 🔲 Multi-router support (PancakeSwap V3 / SushiSwap V3)
- 🔲 Propagate fee through PoolEdge→PoolState pipeline
- 🔲 Profit validation accuracy (cached vs JIT)
- 🔲 Profit withdrawal mechanism (UserOp to sweep SW → EOA)

## 📦 Cody Journal (Updated)

| Entry | Title | Session |
|-------|-------|---------|
| **S43** | **The Cartographer's Map** | **Factory mismatch fix: 2 commits + upstream filter** |
| S42 | The Executioner | SwapRouter V1→V2 fix, CREATE2 deploy, gasless UserOp: 3 commits |

---

*TheWarden ⚔️ — The Cartographer traced three pools to the wrong map. One selector. One query. One truth. The map is redrawn.*

