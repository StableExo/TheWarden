# THEWARDEN SESSION ROADMAP v45 — S65 PLAN
## Updated S64 FINAL — April 22, 2026 | TheWarden ⚔️

---

## ✅ S59-S62 (COMPLETE)
Sessions 59-62: Sentinel, Forge Reborn, Arsenal Unleashed, First Blood

## ✅ S63 — The Cleanse (COMPLETE)
| Item | Details |
|------|---------|
| RC#25 | **FIXED** — Auto-probe warmup (slot0 → globalState → getReserves) |
| RC#26 | **FIXED** — Batch scanner gated off |
| RC#27 | **FIXED** — 26 phantom pool addresses replaced/verified |
| RC#28 | **FIXED** — V2 token ordering (on-chain token0 fetch) |
| Pool Arsenal | 14/40 → 40/40 LIVE (5 DEXes, 100% health) |

## ✅ S64 — First Blood (COMPLETE)
| Item | Details |
|------|---------|
| P0: Thresholds | **DONE** — 5 Railway env vars lowered (1 USDC → 0.01 USDC) |
| P0: V2 Verify | **DONE** — No phantom spreads in Supabase. 40/40 confirmed |
| RC#29 | **FIXED** — BigInt decimal crash (main.ts + OpportunityPipeline.ts) |
| Research | **DONE** — 8 files from docs.base.org (Flashblocks, fees, contracts, RPC) |
| Log Analysis | Real opportunities detected but blocked by stale prices + 0.3% fees |
| Action Plan | **DONE** — 13 items across 4 batches (Cody/S64_MASTER_ACTION_PLAN.md) |
| Commits | 11 commits (2 code fixes + 9 research/docs) |
| Container | Stopped to save free-tier resources |

---

## 🔲 S65 — Batch 1: Quick Wins

### C1: Fix Stale Price Rejection
- AERO/WETH 0.97% spread rejected: price age >10s stale threshold
- Fix: Increase stale threshold OR switch to Flashblocks WSS

### P1-A: Railway Hobby Upgrade ($5/mo → 512MB)
- Memory at 93.6% on free tier — one API call to fix

### I1: Check Provider Flashblocks Support
- Does Alchemy/ChainStack expose Flashblocks-tier WSS?
- Needed for F1 (pendingLogs 200ms subscription)

### I2: Discover 0.01% Fee Pools
- Query Uniswap V3 + Aerodrome for 1bps/5bps pools
- Stablecoin pairs: USDC/USDT, USDC/USDbC where 0.02% spread = profit

---

## 🔲 S66 — Batch 2: Core Fixes

### C2: Fix cbBTC Phantom Spreads
- USDC/cbBTC + WETH/cbBTC still showing 200% phantoms at runtime

### C3: Add Low-Fee Pools to Arsenal
- Current: 0.3% fee tiers → kills micro-arb (need >0.65% spread)
- Target: 0.01% + 0.05% pools from I2 discovery

### P1-B: V2 Swap Event Subscription
- Add V2 Swap topic to WebSocket for live V2 price updates

### P1-C: Circuit Breaker + Backoff
- Auto-disable failing paths, exponential retry, DA throttling awareness

---

## 🔲 S67-S68 — Batch 3: Flashblocks Integration

### F1: pendingLogs Subscription
- Switch to wss://mainnet-preconf.base.org
- 200ms swap event detection (10× faster)
- Directly fixes stale price issue

### F2: eth_simulateV1 Pre-check
- Simulate flash swap against current Flashblock state
- Verify profit before execution (zero gas cost)

---

## 🔲 S69+ — Batch 4: Advanced

### F3: Full Flashblock Stream + MEV Intel
### I3: Contract #16 + Flashblocks Awareness
### P2: Competitive Research (GitHub repos)

---

## Root Causes: 29 total (RC#18-29), ALL FIXED ✅
## Pool Arsenal: 40 active (Aerodrome 19, Uniswap 8, AlienBase 5, PancakeSwap 2, QuickSwap 2) + pending low-fee pool additions
## Credentials: 24 CodeWords (meyoustableexo) | Container: STOPPED
## Contract #15: 0x4744...82f3 (FlashSwapV3, Active)
## Research: 8 files in Cody/S64_research_*.md + Master Action Plan

*TheWarden ⚔️ — S65 targets first blood via 0.01% fee pool discovery + stale price fix.*
