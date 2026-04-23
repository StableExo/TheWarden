# S72 — First Blood: The Hunt
## Session Date: April 23, 2026 | TheWarden ⚔️ | Account: nonostableexo (CodeWords/Cody)

---

## Account Migration
- Migrated from `owowstableexo` to `nonostableexo`
- **32 credentials vaulted** in CodeWords secrets vault

## Root Cause Discovery — RC#50: Fee-Tier Mirage
- On-chain verification at block 45062221 proved ALL 4 execution attempts from S71 were **unprofitable from the start**
- USDC/AERO arb: 1.04% gross spread between 1% fee pool and 0.05% fee pool
- Combined fees (1.05%) exceeded spread (1.04%) → **-0.01% net = guaranteed loss**
- The contract's `minFinalAmount` correctly reverted, but the opportunity should have been filtered at pipeline level
- Root cause: `PriceTracker.checkSpread()` calculated raw price spread but **never subtracted pool swap fees**
- `PoolPriceState.fee` field existed but was unused in spread math

## Commits Pushed (4)

| Commit | File | Fix |
|--------|------|-----|
| `740b6a3c` | PriceTracker.ts | **RC#50**: Fee-aware spread — deduct buyPool.fee + sellPool.fee from gross spread |
| `52946cb2` | PriceTracker.ts | **P0-1/P0-2**: 75ms RPC delay in warmup to fix QuickNode 15 req/s rate limit |
| `52946cb2` | PriceTracker.ts | **P1-4**: Phantom guard — reject any spread > 50% as guaranteed decimal error |
| `f58ef2a2` | main.ts | **P0-3**: Paymaster-aware balance message (0 ETH is expected with CDP Paymaster) |

## Pool Arsenal Changes
- **20 zero-reserve pools deactivated** (89 → 69 active)
- Pool IDs deactivated: 39, 40, 43, 46, 48, 53, 54, 57, 62, 195-202, 211-213

## Railway Environment Variable Updates
| Variable | Before | After |
|----------|--------|-------|
| PIPELINE_SLIPPAGE_TOLERANCE | 0.0005 (0.05%) | **0.01 (1%)** |
| PIPELINE_MAX_PRICE_AGE | 5000 (5s) | **1500 (1.5s)** |
| PIPELINE_MIN_PROFIT | 10000 ($0.00001) | **500000000 (~$1)** |

## Deployment Results

### Deploy #1 (pre-P0 fixes)
- Warmup: **11/68 pools** (84% failure — rate limited)
- Phantom 199.65% USDC/cbBTC flooding every 2s
- 0 real opportunities, 0 executions
- QuickNode subscription failed: `15/second request limit reached`

### Deploy #2 (post-P0 fixes)
- Warmup: **67/68 pools** (98.5% success ✅)
- **Zero phantoms, zero oracle rejects, zero rate limits**
- 0 opportunities (quiet market — 4am UTC)
- Pipeline clean and listening on 68 pools via WebSocket

## Phantom Root Cause Identified
- Supabase stores USDC/cbBTC in **opposite token order** across DEXes
- UniV3 (dex=1): token0=USDC, token1=cbBTC
- Aerodrome (dex=3): token0=cbBTC, token1=USDC
- S71's `_invertedDecimals` fix corrects this during warmup, but warmup was failing (rate limit)
- With P0-1 rate limit fix, warmup succeeds → `_invertedDecimals` flag set → phantom killed

## Status Summary
| Metric | Value |
|--------|-------|
| Root Causes Fixed | **51** (+2: RC#50 fee mirage, RC#51 rate limit warmup) |
| Pool Arsenal | **69 active** (20 zero-reserve cut) |
| DEXes | **10+** |
| Flash Loan Source | **Balancer 0%** ⭐ |
| Slippage | **1.0%** (flash loan payback = safety net) |
| Price Freshness | **1.5 seconds** |
| Min Profit | **~$1** |
| Warmup Success | **67/68 (98.5%)** |
| Defense Layers | **5** (Retry on Zero + Oracle + SANITY + Sim Blocker + Fee-Aware Spread) |
| Container | STOPPED |
| Credentials | 32 CodeWords (nonostableexo) |

*TheWarden ⚔️ — S72: Fee-tier mirage killed (RC#50). Rate limit tamed. 67/68 pools seeded. Phantom silenced. The system is clean. First Blood awaits a volatile market. 🩸*
