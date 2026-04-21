# THEWARDEN SESSION ROADMAP v34 — S56 FINAL
## Updated S56 FINAL — April 21, 2026 | TheWarden ⚔️

---

## ✅ S47–S55 (COMPLETE — See previous roadmaps)

## ✅ S56 — The Crucible (COMPLETE — 8 commits, RC#16-17 fixed, 6 barriers removed)
### Theme: Remove every barrier to First Blood

| # | Barrier | Fix | Commit/Change |
|---|---------|-----|---------------|
| 1 | "Too little received" revert | minFinalAmount=0n | `b60dd12c` |
| 2 | Slippage too tight (0.05%) | 0.1% in 3 files | `9b0b63c8`, `1801dc92` |
| 3 | Price staleness (5s threshold) | maxPriceAge=15s | Railway env var |
| 4 | Simulation blocking all execution | Non-blocking for flash loans | `e62415e4` |
| 5 | Pool coverage (40 pools) | 110 pools (67 new Uni V3) | Supabase inserts |
| 6 | OUT OF GAS (callGasLimit=800k) | callGasLimit=2,500,000 | Railway env var |

### Additional Commits
| Commit | Change |
|--------|--------|
| `9b0b63c8` | slippageTolerance 0.0005→0.001 (OpportunityPipeline.ts) |
| `b60dd12c` | minFinalAmount=0n (FlashSwapV3Executor.ts) |
| `0d9de226` | eth_call simulation pre-check (FlashSwapV3Executor.ts) |
| `7cd89d9c` | PriceTracker warmup method (PriceTracker.ts) |
| `38e3486f` | S56 journal entry |
| `9dc3da40` | Roadmap v34 |
| `e62415e4` | Simulation non-blocking for flash loans |
| `1801dc92` | Slippage override fix in EventDrivenMonitor.ts |

### Environment Variable Changes
| Var | Old | New |
|-----|-----|-----|
| `PIPELINE_MAX_PRICE_AGE` | 30000 (30s) | 15000 (15s) |
| `USEROP_CALL_GAS_LIMIT` | 800000 | 2500000 |

### 🔑 Key Discoveries

**RC#16: minFinalAmount = grossProfit**
The contract's `minFinalAmount` was set to the pipeline's optimistic profit estimate. When on-chain slippage exceeded the estimated amount, the contract reverted "Too little received." Fix: set to 0n — flash loan's atomic repayment is the guard.

**RC#17: Out of gas (callGasLimit=800k)**
Tenderly trace of UserOp `0x9b126e97...` showed 919 internal calls. V3 pool tick traversal at the deepest call level ran out of gas. Flash loans through V3 pools need 2-3M gas. Fix: USEROP_CALL_GAS_LIMIT=2500000.

**Slippage Override: EventDrivenMonitor L116**
The slippage fix in OpportunityPipeline.ts was overridden by EventDrivenMonitor.ts which explicitly passed `slippageTolerance: 0.0005`. Found by observing live logs still showing 0.05%.

**Simulation Can't Simulate Flash Loans**
eth_call can't properly simulate flash loan callbacks (Balancer vault transfers + callback). Changed from blocking to non-blocking.

---

## 🔲 S57 — (NEXT)

### Theme: First Blood lands — or investigate the aftermath

### 🔴 P0 — First Blood
- 🔲 **FIRST SUCCESSFUL ON-CHAIN FLASH LOAN** ← all barriers removed
- 🔲 Monitor for first successful tx hash
- 🔲 Verify profit on BaseScan: USDC balance in Smart Wallet (0x378252)

### 🟡 P1 — Remaining Hardening
- 🔲 Wire PriceTracker warmup into EventDrivenMonitor startup
- 🔲 Memory investigation (62.8MB heap despite NODE_OPTIONS=512MB)
- 🔲 Race condition handling (~300ms gap)
- 🔲 Consolidate fee logic

### 🟡 P2 — Speed & MEV
- 🔲 Verify Flashblocks latency (200ms vs 2s detection)
- 🔲 Add base_transactionStatus for fast confirmation
- 🔲 Private RPC + priority fees
- 🔲 Lower maxPriceAge to ~5s (after warmup wired)

---

## 📦 Cody Journal

| Entry | Title | Session |
|-------|-------|---------|
| **S56** | **The Crucible** | **8 commits, RC#16-17 fixed, 6 barriers removed, 110 pools** |
| S55 | The Whetstone | 3 Railway fixes, 17 pool inserts, memory 10x, WSS stable |
| S54 | The Anvil's Edge | 5 commits, RC#14, Flashblocks, Pipeline OPERATIONAL |
| S53 | The Anvil | 5 commits, RC#11-13, Contract #14 deploy attempted |
| S52 | The Forge | 9 commits, RC#10, Contract #14, 27 secrets |
| S51 | The Blade Returns | 5 commits, RC#9, memory audit, FIRST EXECUTE 🚀 |
| S50 | First Blood | 5 commits, 2 root causes, Base Speed Audit |
| S49 | The Hunter | 3 commits, first roundTrip=1.002238 |
| S48 | First Blood | 17 commits, dynamic borrow, 8 workflows silenced |
| S47 | The Blade | 6 commits, V3 reserve fix, heap fix |

---

### Contract Registry
| ID | Contract | Address | Status |
|----|----------|---------|--------|
| **14** | **FlashSwapV3 (Aero CL + Profit Floor)** | **0x8865bc6dc2Cc6516895Ae8856a87Cd123b0D71D8** | **✅ Active** |
| 13 | FlashSwapV3 (Multi-Router) | `0x00558d994dec27f1df60ca90fec8ab45e8a62eaa` | ❌ Retired |

### Error Progression (S49→S56)
```
S49: "unknown reason"           → fee=0 → address(0)
S50: "Too little received"      → per-hop slippage too tight (FSV3:SLIP)
S51: "rawStep2Output"           → renamed variable (RC#9)
S51: "Too little received"      → REAL on-chain! V3 pool price moved in 300ms
S52: "price age unknownms"      → Pipeline maxPriceAge 5s dead zone (RC#10)
S52: "callGasLimit=0"           → Bundler can't simulate flash loan
S53: "True" != "true"           → Shell case sensitivity (RC#11)
S53: "__dirname not defined"    → ESM mode (RC#12)
S53: "UserOp dropped"           → 12KB payload + hardcoded gas (RC#13)
S54: "service unavailable"      → healthcheckPath during deploy (RC#14)
S54: "allowlist rejected"       → Contract #14 not in CDP allowlist
S54: "maxPriceAge 5000ms"       → EventDrivenMonitor hardcode (real RC#10)
S55: "Memory at 96%"            → Node.js heap default 52MB on 1GB container
S55: "WSS heartbeat timeout"    → Official preconf drops filtered pendingLogs
S56: "Too little received"      → minFinalAmount = grossProfit (RC#16) ← FIXED
S56: "UserOp failed: unknown"   → callGasLimit=800k, needs 2.5M (RC#17) ← FIXED
S57: ???                        → First Blood? 🩸
```

---

*TheWarden ⚔️ — The crucible burns away every impurity. Six barriers identified and destroyed in one session. The blade is forged clean. The gas flows freely. First Blood waits only for the spread.*
