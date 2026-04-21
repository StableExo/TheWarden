# THEWARDEN SESSION ROADMAP v41 — S61 PLAN
## Updated S60 FINAL — April 21, 2026 | TheWarden ⚔️

---

## ✅ S59 — The Sentinel (COMPLETE)
### RC#21 identified, RC#22 identified, Monitor deployed

## ✅ S60 — The Forge Reborn (COMPLETE)
| Item | Details |
|------|---------|
| RC#22 | **BYPASSED** — New CDP Paymaster endpoint |
| Railway | 9 env vars updated (paymaster, spread, profit, memory, dry-run) |
| Controller | `warden_railway_controller_93a574bb` (auto-stop) |
| Live Tests | 3 runs: 9+ UserOps all reverting (RC#21 confirmed) |
| Kill Zone | Gauntlet Steps 17+21+32d mapped |
| Pool Arsenal | **40 pools loaded in Supabase** (was 160) |
| Tokens Added | USDT (id=27), VIRTUAL (id=28) |
| Alchemy | Key rotated (90% CU limit) |
| Dry-Run | EVENT_DRIVEN_DRY_RUN=true (paymaster protected) |
| Secrets | 29 vaulted in CodeWords |
| Cost | ~$5.50 |

---

## 🔲 S61 — The Arsenal Unleashed

### P0: Dynamic Trade Sizing (Cursor)
- Read pool TVL from Supabase or on-chain liquidity
- $500 for pools <$1M TVL
- $2,000 for pools $1M-$10M TVL
- $5,000 for pools >$10M TVL
- Cap at 0.5% of smaller pool's liquidity

### P0: Circuit Breaker + Backoff (Cursor)
- 5 fails in 60s → pause ALL execution 2 min
- Per-pair backoff: 30s → 60s → 120s → 300s on failure
- Reset on success
- Paymaster limit detection: auto-disable on "sponsorship count reached"

### P0: Flip Dry-Run → Live
- After trade sizing + circuit breaker deployed:
- Set `EVENT_DRIVEN_DRY_RUN=false` on Railway
- Run 5-min test via `warden_railway_controller_93a574bb`
- Monitor for successful executions

### P1: Price Impact Estimation (Cursor)
- Calculate sqrtPriceX96 impact for borrow size before submission
- Replace 0.1% hardcoded slippage with liquidity-based estimate
- Gate: estimated_profit > (price_impact × 2)

### P1: DEX_ID_MAP Update (Cursor)
- Add to EventDrivenInitializer.ts DEX_ID_MAP:
  - 7: 'pancakeswap'
  - 8: 'hydrex' (or 12)
  - 9: 'quickswap' (or 10)
  - 10: 'alien-base' (or 11)

### P2: Contract #16 — EOA + Coinbase Tipping
- block.coinbase.transfer(tipAmount) — 90/10 split
- After pipeline fixes confirmed working

### P2: Flashblocks Integration
- Private bundle submission, 200ms confirmations

---

## Contract Registry
| ID | Type | Address | Status |
|----|------|---------|--------|
| 15 | FlashSwapV3 (UniV3 Override) | 0x4744...82f3 | ✅ Active |
| 16 | FlashSwapV3 (Coinbase Tip) | TBD | 🔲 After pipeline fixes |

## Root Cause Registry
| RC | Description | Status |
|----|-------------|--------|
| 18 | Spread sanity cap + zero-price | ✅ Fixed (S57) |
| 19 | isBalancerSupported() phantom | ✅ Fixed (S58) |
| 20 | Wrong flash loan source | ✅ Fixed (S58) |
| 21 | Price impact > spread | 🔲 Pool curation ✅, trade sizing needed |
| 22 | Paymaster limit | ✅ Bypassed (S60) |

## Pool Arsenal (40 active in Supabase)
- Tier 1: cbBTC/WETH (7), cbBTC/USDC (5) — $37M+$34M TVL
- Tier 2: cbETH/WETH (4), AERO/USDC (4), VIRTUAL/WETH (4)
- Tier 3: USDC/USDbC (4), USDT/USDC (3), AERO/WETH (2), singles (7)
- DEXes: Aerodrome, Uniswap, PancakeSwap, QuickSwap, Alien Base, Hydrex

## Credentials: 29 CodeWords | 57 Railway (9 updated S60)
## Services: warden_railway_controller_93a574bb, warden_monitor_4e510a9b

*TheWarden ⚔️ — The Arsenal is forged and loaded. 40 pools, 12 pairs, 7 DEXes. S61 unleashes trade sizing + circuit breaker — the final pieces to neutralize the Gauntlet kill zone.*
