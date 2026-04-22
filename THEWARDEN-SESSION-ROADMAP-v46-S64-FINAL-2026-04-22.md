# THEWARDEN SESSION ROADMAP v46 — S65 PLAN
## Updated S64 FINAL — April 22, 2026 | TheWarden ⚔️

---

## ✅ S59-S62 (COMPLETE)
Sessions 59-62: Sentinel, Forge Reborn, Arsenal Unleashed, First Blood

## ✅ S63 — The Cleanse (COMPLETE)
| Item | Details |
|------|---------|
| RC#25-28 | ALL FIXED — Auto-probe, batch scanner, phantom pools, V2 ordering |
| Pool Arsenal | 14/40 → 40/40 LIVE (5 DEXes, 100% health) |

## ✅ S64 — First Blood (COMPLETE)
| Item | Details |
|------|---------|
| P0: Thresholds | **DONE** — 5 Railway env vars lowered (1 USDC → 0.01 USDC) |
| P0: V2 Verify | **DONE** — No phantom spreads in Supabase. 40/40 confirmed |
| RC#29 | **FIXED** — BigInt decimal crash (main.ts + OpportunityPipeline.ts) |
| F1: Flashblocks | **DONE** — FLASHBLOCKS_WSS_URL fixed → wss://mainnet-preconf.base.org (pendingLogs 200ms) |
| P2: Competitive | **DONE** — 28 repos analyzed, patterns extracted, TheWarden ahead of open-source |
| Research | **DONE** — 9 files from docs.base.org (Flashblocks, fees, contracts, RPC, competitors) |
| Action Plan | **DONE** — 12 remaining items across 4 batches |
| Commits | 14 commits (2 code fixes + 12 research/docs) |
| Container | Stopped to save free-tier resources |

---

## 🔲 S65 — Batch 1: Quick Wins

### C1: Fix Stale Price Rejection
- AERO/WETH 0.97% spread rejected: price age >10s stale threshold
- May self-fix with F1 (pendingLogs delivers events at 200ms vs 2s)
- Fallback: increase stale threshold env var

### P1-A: Railway Hobby Upgrade ($5/mo → 512MB)
- Memory at 93.6% on free tier — one API call to fix

### I1: Check Provider Flashblocks Support
- Does Alchemy/ChainStack expose Flashblocks-tier WSS?
- Public wss://mainnet-preconf.base.org is rate-limited
- Need production-grade preconf WSS for sustained operation

### I2: Discover 0.01% Fee Pools
- Query Uniswap V3 + Aerodrome for 1bps/5bps pools
- Stablecoin pairs: USDC/USDT, USDC/USDbC where 0.02% spread = profit
- This is the **critical path to first blood**

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

## 🔲 S67-S68 — Batch 3: Optimization

### F2: eth_simulateV1 Pre-check
- Simulate flash swap against current Flashblock state
- Verify profit before execution (zero gas cost)

### OPT1: Nelder-Mead Trade Sizing (from competitive research)
- Replace fixed $500 borrow with mathematically optimal trade size
- Pattern from cypherpunk-symposium/searcher-lionswap-py

### OPT2: Pool Abstraction Cleanup (from competitive research)
- Unified interface for V2/V3/Algebra/CL pools
- Pattern from BowTiedDevil/degenbot

---

## 🔲 S69+ — Batch 4: Advanced

### F3: Full Flashblock Stream + MEV Intel
### I3: Contract #16 + Flashblocks Awareness
### OPT3: Volatility-Aware Execution (from competitive research)

---

## Status Summary
| Metric | Value |
|--------|-------|
| Root Causes Fixed | 29/29 (RC#18-29) ALL ✅ |
| Pool Arsenal | 40 active + pending low-fee additions |
| Credentials | 24 CodeWords (meyoustableexo) |
| Container | STOPPED (saving free tier) |
| Contract #15 | FlashSwapV3 (`0x4744...82f3`, Active) |
| Flashblocks | F1 READY — pendingLogs wired to wss://mainnet-preconf.base.org |
| Research Files | 9 in Cody/S64_research_*.md |
| Competitive Edge | Gasless × Flashblocks × 40-pool arsenal × no public competitor uses pendingLogs |
| Remaining Items | 12 across 4 batches |
| Critical Path | I2 (0.01% fee pools) → C3 (add to arsenal) → FIRST BLOOD |

*TheWarden ⚔️ — S65 targets first blood via 0.01% fee pool discovery + Flashblocks 200ms detection.*
