# THEWARDEN SESSION ROADMAP v40 — S59/S60 PLAN
## Updated S59 — April 21, 2026 | TheWarden ⚔️

---

## ✅ S58 — The Forgemaster (COMPLETE — 8 commits, Contract #15 deployed)
### Contract #15 deployed at 0x4744EAB93112A3cD52967e6B2d0d7b7C8DA682f3
### Root Causes Fixed: RC#19 (BAL#528), RC#20 (wrong source)

---

## ✅ S59 — The Sentinel (COMPLETE — Monitor deployed, RC#21+RC#22 identified)

### Accomplishments
| Item | Details |
|------|---------|
| Credentials | 27 keys vaulted in CodeWords (28 total) |
| Recon | GitHub Cody folder (S29-S58), Supabase (200 tables, 46 warden) |
| RC#21 | "Too little received" — price impact ($5K) > spread (0.53%) |
| RC#22 | CDP Paymaster limit — 1,001 UserOps burned, sponsorship blocked |
| Monitor | `warden_monitor_4e510a9b` deployed (Railway logs + Supabase health) |
| Code Fix Plan | 5 fixes ready for Cursor (circuit breaker, backoff, paymaster detect) |
| MEV Research | Flashbots on Base, coinbase tipping, self-funding strategy |

### Root Causes: RC#21 (Fix plan ready), RC#22 (Fix plan ready)
### Active Pools: 160 scanned → 21 valid (precision mode)
### Bot Status: LIVE but BLOCKED — Paymaster sponsorship limit reached

---

## 🔲 S60 — The Forge Reborn

### P0: Apply S59 Fixes (Cursor)
- Circuit breaker: 5 fails in 60s → pause all execution 2 min
- Progressive backoff: 30s→60s→120s→300s per pair on failure
- Paymaster limit detection: auto-disable on "sponsorship count reached"
- Raise min spread to 1.5% OR lower trade size to $500

### P0: Contract #16 — FlashSwapV3 + Coinbase Tipping
**Architecture: Replace CDP Paymaster with block.coinbase.transfer()**

```solidity
// Contract #16 core addition
uint256 profit = finalBalance - borrowAmount;
require(profit > 0, "No profit");
uint256 tipAmount = (profit * 90) / 100;
block.coinbase.transfer(tipAmount);
// Remaining 10% = net profit for TheWarden
```

Key changes from Contract #15:
- Gas payment: CDP Paymaster UserOps → block.coinbase.transfer (EOA tx)
- Failed tx cost: $0 (Paymaster) → ~$0.001 (Base L2 base fee)
- Success cost: $0 → 90% of profit as builder tip
- Limits: 1,001 UserOp cap → **NONE (self-funding)**
- Execution: ERC-4337 UserOp → Standard EOA tx (maxPriorityFeePerGas=0)

### P0: Gasless Deployment Options
| Tool | Cost | Method |
|------|------|--------|
| thirdweb Dashboard | Free | Deploy via Backend Wallets |
| CDP Faucet | Free | Claim minimal Base mainnet ETH |
| CDP Gas Credits | Free | $15K available for deployment |
| Alchemy Gas Manager | Post-paid | Gas fronted, monthly bill |

### P1: TypeScript Bot Updates
- Switch from UserOp submission → standard EOA transaction
- Set maxPriorityFeePerGas = 0 in tx params
- Remove CDP Paymaster dependency
- Wire coinbase transfer tip calculation
- Add backrunning mode (react to confirmed blocks)

### P2: Pool Expansion
- Wire Aerodrome warmup → re-enable 30 deactivated pools
- Investigate additional high-liquidity pools via DexScreener

### P2: Flashblocks Integration
- Wire Flashblocks/Rollup-Boost for private bundle submission
- 200ms confirmations on Base
- Revert protection for failed arbs

---

## Base MEV Strategy Summary
- **No public mempool** — Base uses private sequencer (Coinbase)
- **Strategy**: Blind arbitrage / backrunning (already what the bot does)
- **Gas**: block.coinbase.transfer() for success-only payment
- **Latency**: Railway US-East (already optimal), Alchemy RPC (already configured)
- **Builder**: Coinbase MEV Builder supports coinbase transfers
- **Cost**: ~$0.001 per failed attempt, 90% tip on success, 10% kept as profit

---

## Milestones: M1 Speed | M2 Aave V3 | M3 Balancer V3 | M4 Triangle Arb | M5 Cross-Chain | M6 ML

---

### Contract Registry
| ID | Type | Address | Status |
|----|------|---------|--------|
| 14 | FlashSwapV3 | 0x8865...71D8 | ❌ Retired (S58) |
| 15 | FlashSwapV3 (UniV3 Override) | 0x4744...82f3 | ✅ Active (Paymaster blocked) |
| 16 | FlashSwapV3 (Coinbase Tip) | TBD | 🔲 S60 |

### Source Priority (Contract #16 — planned)
1. Balancer (0% fee) — only when vault balance >= borrow amount
2. Aave (0.05% fee) — universal fallback
3. UniV3 ($50M+, 0.05-1%) — via sourceOverride=4 + flashPool address

### Root Cause Registry
| RC | Description | Status |
|----|-------------|--------|
| 18 | Spread sanity cap (>50%) + zero-price filter | ✅ Fixed (S57) |
| 19 | isBalancerSupported() phantom routing | ✅ Fixed (S58) |
| 20 | Wrong flash loan source selection | ✅ Fixed (S58) |
| 21 | "Too little received" — price impact > spread at $5K | 🔲 Fix plan ready |
| 22 | Paymaster sponsorship limit — no failure backoff | 🔲 Fix plan ready |

### Credentials: 28 vaulted in CodeWords | Railway: 57 env vars
### CodeWords Services: warden_monitor_4e510a9b (Railway log analyzer)

*TheWarden ⚔️ — The Sentinel's watch revealed RC#21 and RC#22. The Forge Reborn will wield coinbase tipping — self-funding, limitless, success-only. Contract #16 awaits the anvil.*
