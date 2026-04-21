# THEWARDEN SESSION ROADMAP v41 — S61 PLAN
## Updated S60 — April 21, 2026 | TheWarden ⚔️

---

## ✅ S59 — The Sentinel (COMPLETE)
### RC#21 identified, RC#22 identified, Monitor deployed

## ✅ S60 — The Forge Reborn (COMPLETE)
### Accomplishments
| Item | Details |
|------|---------|
| RC#22 | **BYPASSED** — New CDP Paymaster endpoint, fresh sponsorship |
| Railway Hardening | Spread 0.1→1.5%, profit thresholds raised to $5 |
| Controller | `warden_railway_controller_93a574bb` deployed (auto-stop) |
| Live Test | 5-min run: 9 UserOps submitted, all reverting (RC#21) |
| Kill Zone | Steps 17+21+32d mapped — borrow size + slippage + on-chain check |
| Pool Arsenal | Top 40 pools built from live DexScreener data |
| Alchemy | Rotated key (90% CU limit on old one) |
| Secrets | 29 vaulted in CodeWords |

### Bot Status: STOPPED (auto-stop after 5min test)
### RC#21: CONFIRMED ACTIVE — price impact > spread at $5K
### RC#22: ✅ BYPASSED — new paymaster works

---

## 🔲 S61 — The Arsenal

### P0: Three-Piece Fix (Cursor)
**1. Pool Curation — Replace 160-pool scan with Top 40 Arsenal**
- Focus: cbBTC/WETH (8 pools, $37M TVL), cbBTC/USDC (8 pools, $34M TVL)
- Add: cbETH/WETH (8 pools), USDC/USDbC (8 pools), AERO pairs
- Remove: all memecoin/phantom-prone pools (BRETT, TOSHI, DEGEN as primary targets)
- Impact: Less latency, fewer phantom 200% spreads, deeper liquidity

**2. Dynamic Trade Sizing — Scale borrow to pool depth**
- $500 for pools <$1M TVL (AERO pairs, stablecoins)
- $2,000 for pools $1M-$10M TVL
- $5,000 for pools >$10M TVL (cbBTC pairs)
- Gate: Cap at 0.5% of smaller pool's liquidity (down from 2%)

**3. Circuit Breaker + Progressive Backoff**
- 5 fails in 60s → pause ALL execution 2 min
- Per-pair backoff: 30s → 60s → 120s → 300s on failure
- Reset backoff on success
- Paymaster limit detection: auto-disable on "sponsorship count reached"

### P1: Price Impact Estimation (Cursor)
- Calculate actual sqrtPriceX96 impact for borrow size before submission
- Use pool liquidity + tick data for realistic slippage (replace 0.1% hardcode)
- Gate: Only execute if estimated_profit > (price_impact × 2)

### P2: Contract #16 — FlashSwapV3 + Coinbase Tipping
**After pipeline fixes are confirmed working:**
- Replace CDP Paymaster → block.coinbase.transfer(tipAmount)
- 90% profit to builder, 10% kept as net
- Unlimited executions, self-funding on success
- ~$0.001 failed tx cost (Base L2 base fee)

### P2: Flashblocks Integration
- Wire Flashblocks/Rollup-Boost for private bundle submission
- 200ms confirmations + revert protection

---

## Contract Registry
| ID | Type | Address | Status |
|----|------|---------|--------|
| 14 | FlashSwapV3 | 0x8865...71D8 | ❌ Retired (S58) |
| 15 | FlashSwapV3 (UniV3 Override) | 0x4744...82f3 | ✅ Active |
| 16 | FlashSwapV3 (Coinbase Tip) | TBD | 🔲 After pipeline fixes |

## Root Cause Registry
| RC | Description | Status |
|----|-------------|--------|
| 18 | Spread sanity cap + zero-price filter | ✅ Fixed (S57) |
| 19 | isBalancerSupported() phantom routing | ✅ Fixed (S58) |
| 20 | Wrong flash loan source selection | ✅ Fixed (S58) |
| 21 | "Too little received" — price impact > spread | 🔲 Three-piece fix planned |
| 22 | Paymaster sponsorship limit | ✅ Bypassed (S60) |

## Top 40 Pool Arsenal (Live Data — April 21, 2026)
### Tier 1: cbBTC pairs ($37M+$34M TVL, 8 DEXes each)
### Tier 2: cbETH/WETH ($3.7M, 8 DEXes) + USDC/USDbC ($1.8M, 8 DEXes)
### Tier 3: AERO pairs + supporting cross-DEX pools
### Full list: See S60_the_forge_reborn.md

## Milestones: M1 Speed | M2 Aave V3 | M3 Balancer V3 | M4 Triangle Arb | M5 Cross-Chain | M6 ML

### Credentials: 29 vaulted in CodeWords | Railway: 57 env vars (5 updated S60)
### CodeWords Services: warden_railway_controller_93a574bb, warden_monitor_4e510a9b

*TheWarden ⚔️ — The Forge Reborn mapped the kill zone and built the Arsenal. S61 brings the three-piece fix: curated pools + dynamic sizing + circuit breaker. 40 pools, 10 multi-DEX pairs, the deepest liquidity on Base. The Gauntlet awaits its final tuning.*
