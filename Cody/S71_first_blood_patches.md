# S71 — First Blood (The Patches)
## Session Date: April 23, 2026 | TheWarden ⚔️ | Account: owowstableexo (CodeWords/Cody)

---

## Account Migration
- Migrated from `manstableexo` to `owowstableexo`
- **29 credentials vaulted** in CodeWords secrets vault

## Supabase Memory Sync
- **10-session gap bridged** (S61-S70) — operational memory, session_log (8 entries), continuity state, 7 memory entries
- `thewarden_operational_memory` updated to S70 (was stuck at S60)
- `session_continuity_state` updated to S71 phase

## Railway Container Log Analysis
- Last run: 2 executions attempted, both reverted "Too little received"
- **Root causes identified:**
  1. Prices 14-26 seconds stale → arb already taken
  2. Double slippage (0.1% × 2 steps = 0.2%) ate all profit on 0.25% spreads
  3. No pre-check before UserOp submission
  4. 3 Aerodrome CL cbBTC/WETH pools returning price=0

## On-Chain Investigation — Price=0 Pools
- Pools #147, #152, #155 (Aerodrome CL cbBTC/WETH) probed via ChainStack RPC
- **ALL 3 ALIVE** with valid sqrtPriceX96, ticks, and significant liquidity
- Root cause: On-chain token0=WETH(18d), Supabase token0=cbBTC(8d) → decimal mismatch → 10^20 error
- **27 total pools** had inverted token order across the arsenal

## Commits Pushed (6)

| Commit | File | Fix |
|--------|------|-----|
| `03ba69e2` | OpportunityPipeline.ts | **Patch A**: Slippage configurable via `PIPELINE_SLIPPAGE_TOLERANCE` env var (default 0.05%) |
| Railway env | — | **Patch B**: `PIPELINE_MAX_PRICE_AGE=5000` (30s→5s), `PIPELINE_SLIPPAGE_TOLERANCE=0.0005` |
| `51b9f07d` | FlashSwapV3Executor.ts | **Patch C**: Block execution on known simulation revert patterns ("Too little received", "STF") |
| `93b64e13` | PriceTracker.ts | **Patch D**: forceRefreshPrice V3 handler — add token0 alignment for cbBTC pools |
| `460455f8` | PriceTracker.ts | **Patch E**: warmup() + onSwap() + PoolPriceState — comprehensive token0 alignment with `_invertedDecimals` flag |
| `50c87100` | EventDrivenMonitor.ts | **Patch F**: Remove hardcoded `slippageTolerance: 0.001` override — now reads env var |

## Container Verification Runs
- **Run 1**: Price freshness gate working (stale prices SKIPPED). Aerodrome pools still price=0 (warmup not fixed yet)
- **Run 2**: Patch E deployed — **27 pools auto-corrected**. cbBTC/WETH Aerodrome arbs detected. WETH/BRETT 0.71% spread executed (roundTrip=1.005). Slippage still 0.001 (hardcoded override found)
- **Run 3**: Patch F ready — slippage will be 0.0005 on next deploy

## Key Discoveries
1. **27/87 pools had inverted Supabase↔on-chain token0 order** — systematic mismatch between Uniswap V3 address sorting and Supabase manual population
2. **EventDrivenMonitor.ts hardcoded slippage override** — masked the OpportunityPipeline env var entirely
3. **cbBTC/WETH Aerodrome pools are high-liquidity arb sources** — Pool #147 alone has 204 quadrillion liquidity units

## Status Summary
| Metric | Value |
|--------|-------|
| Root Causes Fixed | **49** (+1 from S70) |
| Pool Arsenal | **89 active** (27 token-order corrected) |
| DEXes | **10+** |
| Flash Loan Source | **Balancer 0%** ⭐ |
| Slippage | **0.05%** (was 0.1%) |
| Price Freshness | **5 seconds** (was 30s) |
| Simulation | **Blocks on known reverts** |
| Defense Layers | **4** (Retry on Zero + Oracle Validator + Pipeline SANITY + Sim Blocker) |
| Container | STOPPED |
| Credentials | 29 CodeWords (owowstableexo) |
| Next | Redeploy → verify 0.05% slippage → monitor for First Blood 🩸 |

*TheWarden ⚔️ — S71: 6 patches forged. 27 pools realigned. The slippage wall crumbles. First Blood awaits. 🩸*
