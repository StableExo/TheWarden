# ⚔️ THEWARDEN — BATTLE PLAN v2 (POST-S68)
## Updated After S68 — April 22, 2026 | Account: letsstableexo
## 5 commits pushed, 2 dead pools cut, 3 defense layers active

---

> *"The Phantom isn't a ghost — it's the money."*
> *S68 proved it: 155 phantoms caught, 2 dead pools cut, 3 defense layers built.*

---

# PHASE 1: CRITICAL PATH TO FIRST BLOOD 🩸 — ✅ COMPLETE

| Item | Status | Commit/Action |
|------|--------|--------------|
| 1.1 Phantom Warmup Fix | ✅ DONE | `c29902b0` — forceRefreshPrice + Zero Guard |
| 1.1b rpcUrl Wiring | ✅ DONE | `ef2d8cdb` — Wire rpcUrl into EventDrivenMonitor |
| 1.2 Balancer 0% Primary | ✅ DONE | `ee55bd2f` — sourceOverride 255→0, $0 fee |
| 1.3 Borrow Token Selection | ✅ DONE (S67) | Smart whitelist + direction flipping |
| 1.4 Priority Fee 0.1 gwei | ✅ DONE | `ee55bd2f` — maxPriorityFeePerGas + env var |
| 1.5 Railway Region | ✅ DONE | us-east4 (Ashburn VA — optimal) |
| 1.6 Start Container | ✅ TESTED | Logs confirmed: Oracle + Pipeline catching phantoms |

**Remaining for First Blood:**
- [ ] Restart with all S68 fixes (dead pools removed + rpcUrl wired + 512MB memory)
- [ ] Monitor for real (non-phantom) opportunities reaching execution
- [ ] Verify Balancer source selection in logs ("S68: Forcing Balancer 0%")
- [ ] First profitable trade = 🩸

---

# PHASE 2: STABILITY & RELIABILITY 🛡️ — PARTIALLY COMPLETE

| Item | Status | Details |
|------|--------|---------|
| 2.1 Circuit Breaker | ✅ DONE | `f142ce66` — PriceOracleValidator wired (20% rate limit, 50% breaker) |
| 2.2 Memory Leak | 🟡 MITIGATED | Bumped 384→512MB. Root cause TBD (profile Maps/Sets). |
| 2.3 Phantom Root Cause | ✅ DONE | 2 dead pools (147, 183) deactivated. Oracle catches remaining. |
| 2.4 Security Audit | ✅ DONE | 4/4 passed: callbacks, onlyOwner, exact approvals, 5-layer profit guard |
| 2.5 Logging Improvements | 🔲 TODO | Source selection + latency + P&L tracking |

---

# PHASE 3: PERFORMANCE & OPTIMIZATION ⚡ — READY TO START

| Item | Status | Details |
|------|--------|---------|
| 3.0 ML Priority Fee | 🔲 READY | PriorityFeePredictorMLP exists! Wire into executor. |
| 3.1 Contract #16 Killshot | 🔲 TODO | Balancer-native contract |
| 3.2 eth_simulateV1 | 🔲 TODO | Pre-check before gas spend |
| 3.3 Nelder-Mead Sizing | 🔲 TODO | Dynamic borrow amounts |
| 3.4 Pool Abstraction | 🔲 TODO | Unified V2/V3 interface |
| 3.5 Flashblocks Verify | 🔲 TODO | Confirm 200ms granularity |
| 3.6 VIRTUAL Tokens | 🔲 TODO | AI agent token pools |

---

# APPENDIX: QUICK REFERENCE (Updated)

## Key Addresses
| Contract | Address |
|----------|---------|
| FlashSwapV3 (#15) | `0x4744EAB93112A3cD52967e6B2d0d7b7C8DA682f3` |
| Balancer V2 Vault | `0xBA12222222228d8Ba445958a75a0704d566BF2C8` |
| Smart Wallet | `0x378252Db72b35dC94B708C7F1Fe7F4AE81c8D008` |

## Defense Layers (S68)
1. **Layer 1 — Retry on Zero:** forceRefreshPrice (slot0→globalState→getReserves)
2. **Layer 2 — Oracle Validator:** Rate-of-change (20%) + Circuit breaker (50%)
3. **Layer 3 — Pipeline SANITY:** Rejects spreads > threshold as phantom

## Pool Arsenal: 49 Active
- Deactivated: Pool 147 (cbBTC/WETH Aerodrome — reserves 0/0)
- Deactivated: Pool 183 (AERO/USDC Aerodrome — reserves 0/0)

## Infrastructure
- Railway: us-east4, sleepApplication=false, 512MB memory
- RPC: Tenderly (primary), Alchemy (WSS), ChainStack (backup)

---

*TheWarden ⚔️ — Phase 1 complete. The blade is sharp, the armor tested, the dead weight cut.*
*49 pools. 3 defense layers. 0% fees. The money awaits. 🩸*
