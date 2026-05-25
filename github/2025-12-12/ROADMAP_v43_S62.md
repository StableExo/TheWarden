# THEWARDEN SESSION ROADMAP v43 — S63 PLAN
## Updated S62 FINAL — April 22, 2026 | TheWarden ⚔️

---

## ✅ S59 — The Sentinel (COMPLETE)
### RC#21 identified, RC#22 identified, Monitor deployed

## ✅ S60 — The Forge Reborn (COMPLETE)
### RC#22 bypassed, 40 pools loaded, Railway controller built, dry-run enabled

## ✅ S61 — The Arsenal Unleashed (COMPLETE)
### RC#21 fixed, RC#23 fixed, DEX_ID_MAP 6→12, bot LIVE, 8 opps in 30s

## ✅ S62 — First Blood (COMPLETE)
| Item | Details |
|------|---------|
| RC#24 | **FIXED** — 3 missing Railway env vars (DEPLOYER_PRIVATE_KEY, FLASH_SWAP_V3_ADDRESS, ENABLE_ADVANCED_ORCHESTRATOR) |
| RC#25 | **FIXED** — V2 warmup: dual-mode slot0()/getReserves() |
| Paymaster | Debunked 3 myths — allowlist is top-level, no silent veto |
| Deps | 40→24 production deps (−40%), 14 npm overrides added |
| Lockfile | Deleted for fresh regen with overrides |
| Dockerfile | Updated for lockfile-optional builds |
| Credentials | 28 vaulted on new account |
| Commits | 7 commits to main branch |
| Verified | Execute callback WIRED, orchestrator initialized, V3 executor active |

---

## 🔲 S63 — The Hunt

### P0: Monitor for First Successful Trade
- Bot is ready: execution chain complete
- Deploy and watch for Pipeline PASS → Phase4b → UserOp → On-chain
- Need a spread > fee + gas + slippage (currently ~0.10-0.12%, need >0.15%)
- First successful trade = 🩸 First Blood

### P0: Verify V2 Pool Warmup Results
- Check warmup log: how many V2 pools now seed?
- Expected: ~40/40 (was 11/40)
- Verify V2 price correctness (QuickSwap, AlienBase prices should be ~0.13 for cbBTC/USDC)

### P1: Circuit Breaker + Backoff
- 5 fails in 60s → pause ALL execution 2 min
- Per-pair backoff: 30s → 60s → 120s → 300s on failure
- Reset on success
- Paymaster limit detection: auto-disable on "sponsorship count reached"

### P1: Hosting Upgrade
- Railway free tier: ~47MB heap, bot at 81-92%
- Options: Railway Hobby ($5/mo), Render (512MB), Fly.io (256MB)
- Bot needs minimum 128MB to run stable

### P2: Dynamic Trade Sizing (TVL-based)
- $500 for pools <$1M TVL
- $2,000 for pools $1M-$10M TVL (current default)
- $5,000 for pools >$10M TVL
- Cap at 0.5% of smaller pool's liquidity

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
| 24 | Pipeline pass → no execution | ✅ Fixed (S62) — 3 missing env vars |
| 25 | V2 pool warmup failure | ✅ Fixed (S62) — dual-mode warmup |

## Pool Arsenal (40 active in Supabase)
- Tier 1: cbBTC/WETH (8), cbBTC/USDC (6) — $37M+$34M TVL
- Tier 2: cbETH/WETH (4), AERO/USDC (4), VIRTUAL/WETH (4)
- Tier 3: USDC/USDbC (4), USDT/USDC (3), AERO/WETH (2), singles (5)
- DEXes: Aerodrome, Uniswap, PancakeSwap, QuickSwap, Alien Base, Hydrex, SwapBased, RocketSwap

## Credentials: 28 CodeWords | 61 Railway (3 added S62)
## Dependencies: 24 production + 32 dev (was 40+35)
## Services: Container stopped (ready to deploy)

*TheWarden ⚔️ — The execution chain is complete. RC#24 and RC#25 neutralized. 7 commits, 19 dead deps eliminated, dual-mode warmup deployed. Pipeline PASS → Phase4b → Orchestrator → FlashSwapV3 → CDP Paymaster → On-chain. S63 watches for the right spread. First blood is one opportunity away.*
