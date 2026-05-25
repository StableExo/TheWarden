# THEWARDEN SESSION ROADMAP v28.1 — S51 FINAL
## Updated S51 — April 20, 2026 | TheWarden ⚔️

---

## ✅ S47 — The Blade (COMPLETE — 6 commits)
### Theme: First Memory + V3 Reserve Fix
- 24 credentials vaulted, V3 virtual reserve fix, heap fix

## ✅ S48 — First Blood (COMPLETE — 17 commits)
### Theme: Fix the pipeline, validate the math
- Swap direction fix, dynamic borrow sizing, slippage 0.5%→0.05%, 8 GH Actions silenced

## ✅ S49 — The Hunter (COMPLETE — 3 commits)
### Theme: Execute, debug, unblock First Blood
- RC#5: Slippage override, RC#6: Fee tier mismatch, first roundTrip=1.002238

## ✅ S50 — First Blood (COMPLETE — 5 commits, 2 root causes, Base Speed Audit)
### Theme: Fix execution pipeline, verify on-chain readiness

| Commit | Fix |
|--------|-----|
| `6b2b99bc` | RC#7: BPS→uint24 fee conversion in OpportunityPipeline |
| `7bd68c79` | P1: False-positive logging — check executeCallback return value |
| `77958da2` | RC#8: Per-hop minOut 0.05%→50%, trust minFinalAmount |
| `7dba421b` | Fix: Decouple on-chain minOut (wide) from profit estimation (tight) |
| `7093e9ae` | Hotfix: Variable reference after rename |

## ✅ S51 — The Blade Returns (COMPLETE — 5 commits, 1 root cause, 3 env vars)
### Theme: Clear the noise, sharpen the blade

| Commit | Fix |
|--------|-----|
| `ce693db2` | Gate Phase 3/4 behind ENABLE_PHASE3/ENABLE_PHASE4 |
| `b92d9fc0` | Gate consciousness behind ENABLE_CONSCIOUSNESS |
| `65b03d55` | Memory warning threshold 80%→92% |
| `18d1c392` | RC#9: rawStep2Output → estStep2Output in Pipeline debug log |
| `6c0b11dc` | Opportunity lifecycle + rejection logging |

| Env Var | Value | Effect |
|---------|-------|--------|
| `ENABLE_CONSCIOUSNESS` | `false` | Skip 49KB ArbitrageConsciousness + 14 modules |
| `NODE_OPTIONS` | `--max-semi-space-size=16` | Better V8 GC behavior |
| `SCAN_INTERVAL` | `60000` | Batch scan 90s → 60s (50% more scans/hour) |

### Results
- Memory: 54.9MB → 45.7MB, warnings: constant → ZERO
- Build time: <30s, boot to scanning: ~1s
- Scan interval: 90s → 60s (60 cycles/hour)
- RC#9: Pipeline crashed on debug log variable — fixed
- Lifecycle logging: every opportunity shows RECEIVED → SKIP/EXECUTE with reasons
- 7 USDC/AERO opportunities spotted (max 0.26% spread)
- WETH/USDC opportunity detected at 1ms age (same-block detection)

### Key Insights
1. **heapUsed/heapTotal ≠ OOM Risk** — V8 at 43.6MB / 256MB = 17%. The 92% was noise.
2. **Noise drowns signal** — 80% threshold fired every minute. Raised to 92%.
3. **Debug logging can kill execution** — RC#9 was a crash in a log line, not execution code.
4. **50 layers of onion** — Taylor: "We never had to go back to something we fixed."

---

## 🔲 S52 — (NEXT)

### Theme: First on-chain profit or next root cause

### 🔴 P0 — First Blood (Top Priority)
- 🔲 Confirm Pipeline reaches EXECUTE stage (RC#9 fix unblocked this)
- 🔲 Verify roundTrip shows ~1.002 (not 0.50) in Pipeline-DEBUG logs
- 🔲 Verify on-chain minOut uses 50% tolerance (wide) while profit calc uses 0.05% (tight)
- 🔲 **FIRST SUCCESSFUL ON-CHAIN FLASH LOAN EXECUTION**
- 🔲 Verify profit on BaseScan: USDC balance increase in Smart Wallet (0x378252)
- 🔲 If still reverting: check callGasLimit=0 in UserOp (may need explicit gas limit)
- 🔲 If FSV3:FIN revert: trade was genuinely unprofitable — wait for wider spread

### 🔴 P1 — Execution Hardening
- 🔲 Add Quoter V2 pre-validation — simulate swap on-chain before executing UserOp
- 🔲 Race condition handling — price moves between detection and execution
- 🔲 Gas estimation: callGasLimit=0 in UserOp might cause silent failures
- 🔲 Consolidate fee logic — eliminate dual code paths (Pipeline vs Orchestrator)
- 🔲 Remove debug logging after pipeline is validated (saves memory)

### 🟡 P2 — Speed & MEV
- 🔲 **Flashblocks streaming** — ChainStack supports pending blocks (200ms pre-confirmation)
- 🔲 **Private RPC** — prevent front-running (Flashbots Protect or ChainStack protected endpoint)
- 🔲 **Priority fees** — tip sequencer for faster inclusion on high-value spreads
- 🔲 Evaluate EIP-7702: EOA speed + Paymaster (eliminates ~1s bundler overhead)

### 🟡 P3 — Revenue & Scaling
- 🔲 Profit withdrawal: Smart Wallet → EOA sweep mechanism
- 🔲 3-hop cross-DEX path building (contract ready, pipeline needs expansion)
- 🔲 Multi-pair monitoring expansion (currently USDC/AERO dominant)
- 🔲 L1 Data Fee in profit calculation (currently ~$0.0005, negligible but good practice)
- 🔲 Dynamic borrow sizing based on pool depth and spread magnitude

### 🟡 P4 — Infrastructure
- ✅ ~~Memory pressure~~ — SOLVED in S51 (3 commits + 2 env vars)
- ✅ ~~Scan interval~~ — 90s → 60s in S51
- 🔲 Heartbeat timeout fixes — memory pressure causes event loop freezes
- 🔲 Consolidate Phase 3 (Orchestrator) and Phase 4b (Pipeline) into single execution path
- 🔲 Add structured error codes to revert reasons for faster debugging
- 🔲 Convert Phase3/Phase4 top-level imports to dynamic imports (further memory savings)

### 🟢 P5 — Research (Post-First Blood)
- 🔲 Aerodrome Slipstream direct routing (tickSpacing-based, currently V2 fallback)
- 🔲 Sandwich protection analysis — are our UserOps being sandwiched?
- 🔲 Cross-chain opportunities (Base ↔ Optimism ↔ Arbitrum)
- 🔲 Contract upgrade: minFinalAmount = borrowAmount + minProfit (explicit profit guard)

---

## 📦 Cody Journal

| Entry | Title | Session |
|-------|-------|---------|
| **S51** | **The Blade Returns** | **5 commits, RC#9, memory audit, lifecycle logging, scan speedup** |
| S50 | First Blood | 5 commits, 2 root causes, Base Speed Audit, philosophical breakthroughs |
| S49 | The Hunter | 3 commits, 2 root causes, first profitable roundTrip=1.002238 |
| S48 | First Blood | 17 commits, pipeline root cause #2, dynamic borrow, 8 workflows silenced |
| S47 | The Blade | 6 commits, 10 wonders, 8 memories, V3 reserve fix, heap fix |
| S46 | The Optimizer | 11 commits, 13 env vars, Vercel+Tenderly migration |
| S45 | The Conqueror | 7 layers, 7 commits — multi-factory + Balancer whitelist |
| S44 | The Blacksmith | Gas fix + multi-router deployed: 5 commits |
| S43 | The Cartographer's Map | Factory fix + multi-router compiled: 7 commits |
| S42 | The Executioner | SwapRouter V1→V2 fix: 3 commits |

---

### Contract Registry
| ID | Contract | Address | Status |
|----|----------|---------|--------|
| 2 | FlashSwapV2 | `0x54658E5758FA81a3C0DcC78D707391be4b494177` | 🔒 Retired |
| 12 | FlashSwapV3 (Single-Router) | `0x3d4bf8ece669b827ed3ac3e15c06c3701b8ab1fb` | 🔒 Retired |
| **13** | **FlashSwapV3 (Multi-Router)** | **`0x00558d994dec27f1df60ca90fec8ab45e8a62eaa`** | **✅ Active** |

---

### Error Progression (S49→S51)
```
S49: "unknown reason"           → address(0) from fee=0
S50: "Too little received"      → per-hop slippage too tight  
S50: "step1OutputWithSlippage"  → renamed variable
S51: "rawStep2Output"           → another renamed variable (RC#9)
S52: ???                        → First Blood?
```

Each error was progress. Each fix moved the Pipeline one step closer to the UserOp submission. S52 will answer the question mark.

---

### S51 Key Insight: Noise Drowns Signal

The memory warnings weren't a real problem — they were a noise problem. V8 running at 87% of its current 48MB allocation is normal. The LongRunningManager reported the percentage that looked scary: 87% → WARNING. Every minute. Drowning out everything.

Three fixes: gate the unused modules (save heap), raise the threshold (eliminate noise), set NODE_OPTIONS (smooth GC). Result: zero warnings, clean logs, same execution capability.

Taylor's observation: "It's always another layer of the onion." S51's layer wasn't a bug — it was a threshold. The hardest problems aren't always in the code. Sometimes they're in the metrics that tell you the code is broken when it isn't.

---

*TheWarden ⚔️ — Five commits. Zero warnings. The blade is clean. First Blood waits for a spread.*
