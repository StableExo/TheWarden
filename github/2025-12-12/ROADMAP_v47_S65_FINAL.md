# THEWARDEN SESSION ROADMAP v47 — S66 PLAN
## Updated S65 FINAL — April 22, 2026 | TheWarden ⚔️

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
| RC#29 | **FIXED** — BigInt decimal crash |
| F1: Flashblocks | **DONE** — pendingLogs wired |
| P2: Competitive | **DONE** — 28 repos analyzed |

## ✅ S65 — The Prospector (COMPLETE)
| Item | Details |
|------|---------|
| I2: Low-Fee Pools | **DONE** — 40→64 pools, 34 at 1-5bps, 7 DEXes mapped |
| C1: Stale Price Fix | **DONE** — PIPELINE_MAX_PRICE_AGE: 10s→30s on Railway |
| I1: Flashblocks Check | **DONE** — Current config optimal, public endpoint is only source |
| Fee Bug Fix | **DONE** — Pool #200 corrected (5bps→1bps) |
| DEX Registration | **DONE** — HydreX (id=16), QuickSwap (id=17), Alien Base (id=20) |
| Arsenal | **64 pools** (13×1bps, 21×5bps, 27×30bps, 3×100bps) across 7 DEXes |

---

## 🔲 S66 — Batch 2: Core Fixes

### C2: Fix cbBTC Phantom Spreads
- USDC/cbBTC + WETH/cbBTC still showing 200% phantoms at runtime
- Need to validate price oracle for cbBTC pairs

### C3: Add Low-Fee Pools to Arsenal (IN CODEBASE)
- S65 added pools to Supabase — now wire them in the TypeScript scanner
- Update pool preloading to include new 1bps/5bps pools
- Update DEX type mappings for HydreX (Algebra) and QuickSwap (Algebra)

### P1-B: V2 Swap Event Subscription
- Add V2 Swap topic to WebSocket for live V2 price updates
- Currently only monitoring V3 swap events

### P1-C: Circuit Breaker + Backoff
- Auto-disable failing paths, exponential retry, DA throttling awareness
- Prevents wasting execution attempts on dead paths

---

## 🔲 S67-S68 — Batch 3: Optimization

### F2: eth_simulateV1 Pre-check
- Simulate flash swap against current Flashblock state
- Verify profit before execution (zero gas cost)

### OPT1: Nelder-Mead Trade Sizing
- Replace fixed borrow with mathematically optimal trade size

### OPT2: Pool Abstraction Cleanup
- Unified interface for V2/V3/Algebra/CL pools

---

## 🔲 S69+ — Batch 4: Advanced

### F3: Full Flashblock Stream + MEV Intel
### I3: Contract #16 + Flashblocks Awareness
### OPT3: Volatility-Aware Execution

---

## Status Summary
| Metric | Value |
|--------|-------|
| Root Causes Fixed | 29/29 (RC#18-29) ALL ✅ |
| Pool Arsenal | **64 active** (13×1bps + 21×5bps + 27×30bps + 3×100bps) |
| DEXes | **7** (UniV3, PCS, Aerodrome, HydreX, QuickSwap, Alien Base, BaseSwap) |
| Credentials | 29 CodeWords (itsbackstableexo) |
| Container | STOPPED (saving free tier) |
| Contract #15 | FlashSwapV3 (`0x4744...82f3`, Active) |
| Flashblocks | F1 READY — pendingLogs wired to wss://mainnet-preconf.base.org |
| Stale Threshold | 30s (was 10s) |
| Min Profitable Spread | **0.02%** (was 0.65%) — 32x improvement |
| Remaining Items | 8 across 3 batches |
| Critical Path | **Container start → first blood via 1bps stablecoin arb** |

*TheWarden ⚔️ — S66 targets codebase integration of 64-pool arsenal + phantom spread fix.*
