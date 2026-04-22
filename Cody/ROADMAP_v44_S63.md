# THEWARDEN SESSION ROADMAP v44 — S64 PLAN
## Updated S63 FINAL — April 22, 2026 | TheWarden ⚔️

---

## ✅ S59 — The Sentinel (COMPLETE)
### RC#21 identified, RC#22 identified, Monitor deployed

## ✅ S60 — The Forge Reborn (COMPLETE)
### RC#22 bypassed, 40 pools loaded, Railway controller built, dry-run enabled

## ✅ S61 — The Arsenal Unleashed (COMPLETE)
### RC#21 fixed, RC#23 fixed, DEX_ID_MAP 6→12, bot LIVE, 8 opps in 30s

## ✅ S62 — First Blood (COMPLETE)
### RC#24 fixed, deps 40→24, execute callback wired, 7 commits

## ✅ S63 — The Cleanse (COMPLETE)
| Item | Details |
|------|---------|
| RC#25 | **FIXED** — Auto-probe warmup (slot0 → globalState → getReserves) |
| RC#26 | **FIXED** — Batch scanner gated off when ENABLE_EVENT_DRIVEN=true |
| RC#27 | **FIXED** — 26 phantom pool addresses replaced/verified on-chain |
| RC#28 | **FIXED** — V2 token ordering: on-chain token0() fetch |
| Pool Arsenal | 14/40 → 40/40 LIVE (100% health, 5 DEXes) |
| Credentials | 28 vaulted on new account |
| Commits | 4 commits to main branch |
| Deploy | Bot live, opportunities every 2-4s, roundTrip up to 0.999975 |

---

## 🔲 S64 — First Blood

### P0: Lower Profit Threshold
- Current minProfit = 1,000,000 (1 USDC) — too high for gasless execution
- Base arb bots often use near-zero thresholds since Paymaster covers gas
- **Action**: Lower to 100,000 (0.10 USDC) or even 10,000 (0.01 USDC)
- With 0.30% fee pools, need >0.65% spread → rare
- With 0.01% fee stablecoins, need >0.02% spread → achievable!

### P0: Monitor Stablecoin Arb Pairs
- USDC/USDbC on Aerodrome (0.01% fee) vs Uniswap (0.01% fee)
- USDT/USDC on Aerodrome vs Uniswap
- These low-fee pools need only tiny spreads to profit
- Watch pipeline logs for opportunities on these specific pairs

### P0: Verify V2 Warmup Prices After RC#28 Fix
- Phantom 200% spreads should disappear with token ordering fix
- Confirm AERO/USDC V2 price = ~2.46 (not 2.47e+24)
- Confirm all V2 pools seed correctly

### P1: Railway Hosting Upgrade
- Memory still at 93.6% (45.5MB/48.6MB) on free tier
- Railway Hobby ($5/mo) → 512MB heap
- Will eliminate memory warnings + allow more pools
- **Action**: After first successful trade, upgrade to Hobby

### P1: Add V2 Swap Event Subscription
- Currently only V3 Swap events (topic 0xc42079...) are subscribed
- V2 pools never get live price updates (frozen at warmup values)
- Add V2 Swap topic (0xd78ad9...) to WebSocket subscription
- Parse V2 events differently (amounts, not sqrtPriceX96)

### P1: Circuit Breaker + Backoff
- 5 fails in 60s → pause ALL execution 2 min
- Per-pair backoff: 30s → 60s → 120s → 300s on failure
- Paymaster limit detection: auto-disable on "sponsorship count reached"

### P2: Competitive Research
- Analyze GitHub repos for Base arb bot patterns:
  - Aboudoc/UniswapV3-FlashSwap-Arbitrage
  - coinbase/paymaster-bundler-examples
  - juroberttyb/Upgraded-simple-arbitrage
- Compare minProfit settings, execution speed, pool selection

### P3: Contract #16 — EOA + Coinbase Tipping
- block.coinbase.transfer(tipAmount) — 90/10 split
- After first successful trade confirmed

### P3: Flashblocks Integration
- Private bundle submission, 200ms confirmations

---

## Contract Registry
| ID | Type | Address | Status |
|----|------|---------|--------|
| 15 | FlashSwapV3 (UniV3 Override) | 0x4744...82f3 | ✅ Active |
| 16 | FlashSwapV3 (Coinbase Tip) | TBD | 🔲 After first blood |

## Root Cause Registry
| RC | Description | Status |
|----|-------------|--------|
| 18 | Spread sanity cap + zero-price | ✅ Fixed (S57) |
| 19 | isBalancerSupported() phantom | ✅ Fixed (S58) |
| 20 | Wrong flash loan source | ✅ Fixed (S58) |
| 21 | Price impact > spread | ✅ Fixed (S61) |
| 22 | Paymaster limit | ✅ Bypassed (S60) |
| 23 | Execute threshold mismatch | ✅ Fixed (S61) |
| 24 | Pipeline pass → no execution | ✅ Fixed (S62) |
| 25 | V2 pool warmup failure | ✅ Fixed (S63) — auto-probe |
| 26 | Batch scanner memory drain | ✅ Fixed (S63) — gated off |
| 27 | Phantom pool addresses | ✅ Fixed (S63) — 40/40 verified |
| 28 | V2 token ordering | ✅ Fixed (S63) — on-chain token0 |

## Pool Arsenal (40 active in Supabase)
- Aerodrome: 19 pools (CL + V2 classic)
- Uniswap V3: 8 pools
- AlienBase: 5 pools (Algebra V3)
- PancakeSwap V3: 2 pools
- QuickSwap: 2 pools (Algebra V3)
- New additions: AERO/WETH Aero V2 ($2.9M), AERO/WETH Uni ($866K), VIRTUAL/USDC Uni ($764K), AERO/cbBTC Aero CL ($667K), cbBTC/WETH Uni ($verified)

## S63 GitHub Commits (4 total)
| Commit | Change |
|--------|--------|
| 4914e241 | PriceTracker.ts: Auto-probe warmup |
| f5a32f16 | EventDrivenInitializer.ts: Remove V2_DEXES |
| 2d6a16c1 | main.ts: Gate batch scanner |
| c9958d24 | PriceTracker.ts: Fix V2 token ordering |

## Credentials: 28 CodeWords | 61 Railway
## Dependencies: 24 production + 32 dev
## Services: Container RUNNING

*TheWarden ⚔️ — The Cleanse complete. 40/40 pool arsenal verified. Four root causes neutralized. Bot live with WETH/AERO opportunities at 0.13-0.19% spread. S64 targets lowering profit threshold + stablecoin arb — the path to first blood at near-zero gas cost.*
