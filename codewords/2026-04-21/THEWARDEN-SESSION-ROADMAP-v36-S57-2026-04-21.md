# THEWARDEN SESSION ROADMAP v36 — S57
## Updated S57 — April 21, 2026 | TheWarden ⚔️

---

## ✅ S47–S55 (COMPLETE — See previous roadmaps)

## ✅ S56 — The Crucible (COMPLETE — 11 commits, RC#16-17 fixed, 142 pools, 6 barriers removed)

## ✅ S57 — The Vigil (COMPLETE — 2 commits, 16 Aerodrome pools, warmup wired)
### Theme: Wire the foundations for instant readiness + cross-DEX arb

### Completed
| # | Task | Result |
|---|------|--------|
| 1 | PriceTracker warmup wiring | 2 commits: rpcUrl config + warmup() in start() |
| 2 | Aerodrome pool discovery | 16 new pools (DexScreener API scan) |
| 3 | Supabase pool expansion | 145 → 161 pools (11% increase) |
| 4 | Cross-DEX arb enabled | UniV3 ↔ Aerodrome for all BTC pairs |
| 5 | 27 secrets vaulted | Updated credential set for S57 |

### Commits (2)
| Commit | Change |
|--------|--------|
| `965ccbc8` | Wire PriceTracker warmup into EventDrivenMonitor.start() |
| `87e74b59` | Thread rpcUrl through EventDrivenInitializer |

### Supabase Changes
| Change | Details |
|--------|---------|
| Aerodrome pools | 16 new (cbBTC/WETH $22.9M, cbBTC/USDC $13.2M, LBTC/cbBTC $4.2M) |
| **Total pools** | **145 → 161** |
| **Total tokens** | **25** (unchanged) |

---

## 🔲 S58 — (NEXT)

### Theme: First Blood — the spread arrives

### 🔴 P0 — First Blood
- 🔲 **REDEPLOY with warmup fix** — Railway picks up from GitHub
- 🔲 Monitor for first successful tx hash
- 🔲 Verify profit on BaseScan: balance increase in Smart Wallet (0x378252)
- 🔲 Track cross-DEX UniV3 ↔ Aerodrome opportunities

### 🟡 P1 — Remaining Hardening
- 🔲 Memory investigation (62.8MB heap despite NODE_OPTIONS=512MB)
- 🔲 Race condition handling (~300ms gap)
- 🔲 Consolidate fee logic
- 🔲 Priority fee over-bidding (maxPriorityFeePerGas 0.05-0.1 gwei)

### 🟡 P2 — Speed & MEV
- 🔲 Verify Flashblocks latency (200ms vs 2s detection)
- 🔲 Add base_transactionStatus for fast confirmation
- 🔲 Private RPC + priority fees
- 🔲 Lower maxPriceAge to ~5s (now safe after warmup wired)

---

## 📦 Cody Journal

| Entry | Title | Session |
|-------|-------|---------|
| **S57** | **The Vigil** | **2 commits, 16 Aerodrome pools, warmup wired, 161 total pools** |
| S56 | The Crucible | 11 commits, RC#16-17, 6 barriers, 142 pools, LBTC+tBTC |
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

### Error Progression (S49→S57)
```
S49: "unknown reason"           → fee=0 → address(0)
S50: "Too little received"      → per-hop slippage too tight
S51: "rawStep2Output"           → renamed variable (RC#9)
S52: "price age unknownms"      → maxPriceAge 5s dead zone (RC#10)
S52: "callGasLimit=0"           → Bundler can't simulate flash loan
S53: "True" != "true"           → Shell case sensitivity (RC#11)
S53: "__dirname not defined"    → ESM mode (RC#12)
S53: "UserOp dropped"           → 12KB payload + hardcoded gas (RC#13)
S54: "service unavailable"      → healthcheckPath during deploy (RC#14)
S54: "allowlist rejected"       → Contract #14 not in CDP allowlist
S55: "Memory at 96%"            → Node.js heap default 52MB
S55: "WSS heartbeat timeout"    → Official preconf drops pendingLogs
S56: "Too little received"      → minFinalAmount = grossProfit (RC#16) ← FIXED
S56: "UserOp failed: unknown"   → callGasLimit=800k, needs 2.5M (RC#17) ← FIXED
S57: warmup wired, 16 Aero pools → First Blood? 🩸
```

---

*TheWarden ⚔️ — The vigil watches. 161 pools armed. Warmup eliminates dead time. Cross-DEX arb unlocked. First Blood waits for the spread.*

