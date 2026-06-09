# S70 — The Arsenal Cleanse
## Session Date: April 23, 2026 | TheWarden ⚔️ | Account: manstableexo (CodeWords/Cody)

---

## Account Migration
- Migrated from `oheystableexo` to `manstableexo`
- **28 credentials vaulted** in CodeWords secrets vault

## Commits Pushed (3)

| Commit | File | Fix |
|--------|------|-----|
| `21894906` | LongRunningManager.ts | Fix false memory CRITICAL alerts — compare heapUsed against max-old-space-size (512MB), not V8 heapTotal |
| `087f1d7c` | FlashSwapV3Executor.ts | Wire PriorityFeePredictorMLP — adaptive ML priority fee bidding replaces static 0.1 gwei |
| `e3d1806d` | PriceTracker.ts | Fix cbBTC phantom — align on-chain token0 in forceRefreshPrice() (10,000x decimal fix) |

## Pool Arsenal Audit (Full — Pools 1-233)

### Summary
| Metric | Count |
|--------|-------|
| Total Pools | **227** |
| Active (verified) | **89** |
| Inactive (dead/low-liq) | **138** |
| NULL (unaudited) | **0** ← was 227 |
| Total Liquidity | **$154M** |
| DEXes Covered | **10+** (UniV3, Aerodrome, PancakeSwap, SushiSwap, BaseSwap, HydreX, QuickSwap, AlienBase, Camelot) |

### Top Pools by Liquidity
| # | Pair | DEX | Liquidity | Volume 24h |
|---|------|-----|-----------|------------|
| 29 | WETH/USDC | UniswapV3 | $121M | $81M |
| 179 | AERO/USDC | Aerodrome | $26M | $3.7M |
| 147 | cbBTC/WETH | Aerodrome | $23M | $171M |
| 148 | cbBTC/USDC | Aerodrome | $12M | $147M |
| 43 | WETH/cbBTC | UniswapV3 | $11M | $3.4M |
| 113 | USDC/cbBTC | UniswapV3 | $10.8M | $16M |
| 166 | cbBTC/WETH | UniV3 Arb | $7.4M | $73M |
| 195 | VIRTUAL/WETH | Aerodrome | $5.5M | $119K |
| 215 | WETH/USDC | PancakeSwap | $4.7M | $45M |

### Bug Fixes
1. **Memory false alarm** — LongRunningManager compared heapUsed/heapTotal (always 90%+). Now uses max-old-space-size. Old: 51MB/53MB = 95.7%. New: 51MB/512MB = 9.9%.
2. **cbBTC phantom (199.96%)** — forceRefreshPrice() didn't align on-chain token0 with Supabase. 8-dec cbBTC vs 6-dec USDC = 10,000x mismatch. Fixed: port warmup()'s token0 check.
3. **100+ dead pools deactivated** — NOT_ON_DEXSCREENER, $0 liquidity, or <$1K.

### MLP Wiring
- PriorityFeePredictorMLP wired into FlashSwapV3Executor
- Module-level singleton, persists across executions
- Uses getOptimalBid(2n) with 1 gwei cap
- Falls back to static 0.1 gwei during warmup (<20 observations)
- Feeds execution data back for online learning
- Confirmed working in logs: `[S69-MLP] Priority fee: 100000000 wei (source=static, confidence=warming)`

### Live Run Intel
- **Executions fired** — roundTrip > 1.0 on WETH/USDC (0.25-0.29% spreads)
- **Reverts: "Too little received"** — market moves between detection and execution
- **Next fix needed**: Slippage tolerance tuning or faster execution path

## Resume Point
- Container: STOPPED
- Next: Tune slippage, investigate "Too little received" reverts, Flashblocks verification

*TheWarden ⚔️ — S70: The arsenal cleansed. 89 verified pools, 138 dead weight cut. Memory fixed, MLP wired, cbBTC phantom killed. Executions firing — First Blood approaches. 🩸*
