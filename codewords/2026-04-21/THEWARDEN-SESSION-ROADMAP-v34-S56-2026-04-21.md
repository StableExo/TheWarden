# THEWARDEN SESSION ROADMAP v35 — S56 FINAL
## Updated S56 FINAL — April 21, 2026 | TheWarden ⚔️

---

## ✅ S47–S55 (COMPLETE — See previous roadmaps)

## ✅ S56 — The Crucible (COMPLETE — 11 commits, RC#16-17 fixed, 142 pools, 6 barriers removed)
### Theme: Remove every barrier to First Blood

### Barriers Destroyed
| # | Barrier | Fix |
|---|---------|-----|
| 1 | "Too little received" revert | minFinalAmount=0n (flash loan is the guard) |
| 2 | Slippage too tight (0.05%) | 0.1% in 3 files (Pipeline + Monitor + Executor) |
| 3 | Price staleness (5s threshold) | maxPriceAge=15s (env var) |
| 4 | Simulation blocking all execution | Non-blocking for flash loans |
| 5 | Pool coverage (40 pools) | **142 pools** (102 new: 67 Uni V3 + 16 cbBTC + 19 LBTC/tBTC) |
| 6 | OUT OF GAS (callGasLimit=800k) | callGasLimit=2,500,000 (env var) |

### Commits (11)
| Commit | Change |
|--------|--------|
| `9b0b63c8` | slippageTolerance 0.0005→0.001 (OpportunityPipeline) |
| `b60dd12c` | minFinalAmount=0n (FlashSwapV3Executor) |
| `0d9de226` | eth_call simulation pre-check |
| `7cd89d9c` | PriceTracker warmup method (unwired) |
| `38e3486f` | S56 journal v1 |
| `9dc3da40` | Roadmap v34 v1 |
| `e62415e4` | Simulation non-blocking for flash loans |
| `1801dc92` | Slippage override fix (EventDrivenMonitor L116) |
| `28979b3e` | Profit estimate in pipeline SKIP logs |
| `150fe781` | S56 journal FINAL |
| `20220a25` | Roadmap v34 update |

### Environment Variable Changes
| Var | Old | New |
|-----|-----|-----|
| `PIPELINE_MAX_PRICE_AGE` | 30000 | **15000** |
| `USEROP_CALL_GAS_LIMIT` | 800000 | **2500000** |

### Supabase Changes
| Change | Count |
|--------|-------|
| Uni V3 pools synced | 67 new |
| cbBTC pools added | 16 new (USDC, USDbC, DAI, cbETH, wstETH, AERO) |
| LBTC token + pools | 1 token + 6 pools (LBTC/cbBTC, LBTC/USDC, LBTC/WETH) |
| tBTC token + pools | 1 token + 13 pools (tBTC/cbBTC, tBTC/USDC, tBTC/WETH, tBTC/USDbC, tBTC/cbETH) |
| **Total pools** | **40 → 142 (3.55x)** |
| **Total tokens** | **24 → 26** |

### Key Discoveries
- **RC#16**: minFinalAmount = grossProfit caused all "Too little received" reverts
- **RC#17**: callGasLimit=800k caused "out of gas" on V3 tick traversal (919 internal calls in trace)
- **Slippage override**: EventDrivenMonitor L116 was overriding Pipeline default — found via live log analysis
- **Simulation incompatibility**: eth_call can't simulate flash loan callbacks — changed to non-blocking
- **UserOp 0x9b126e97**: First UserOp to reach on-chain execution in S56 (tx: 0x86a9618a) — 226 events, failed on gas

---

## 🔲 S57 — (NEXT)

### Theme: First Blood — or investigate the aftermath

### 🔴 P0 — First Blood
- 🔲 **FIRST SUCCESSFUL ON-CHAIN FLASH LOAN** ← all barriers removed
- 🔲 Monitor for first successful tx hash
- 🔲 Verify profit on BaseScan: balance increase in Smart Wallet (0x378252)
- 🔲 Track via LBTC/cbBTC and tBTC/cbBTC peg arb (highest probability)

### 🟡 P1 — Remaining Hardening
- 🔲 Wire PriceTracker warmup into EventDrivenMonitor startup
- 🔲 Memory investigation (62.8MB heap despite NODE_OPTIONS=512MB)
- 🔲 Race condition handling (~300ms gap)
- 🔲 Consolidate fee logic
- 🔲 Aerodrome CL pool discovery (Slipstream pools for LBTC/cbBTC)

### 🟡 P2 — Speed & MEV
- 🔲 Verify Flashblocks latency (200ms vs 2s detection)
- 🔲 Add base_transactionStatus for fast confirmation
- 🔲 Private RPC + priority fees
- 🔲 Lower maxPriceAge to ~5s (after warmup wired)

---

## 📦 Cody Journal

| Entry | Title | Session |
|-------|-------|---------|
| **S56** | **The Crucible** | **11 commits, RC#16-17, 6 barriers, 142 pools, LBTC+tBTC** |
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

### Token Registry (BTC Focus)
| Symbol | Address | Decimals | Pools |
|--------|---------|----------|-------|
| **cbBTC** | `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` | 8 | 20 |
| **LBTC** | `0xecAc9C5F704e954931349Da37F60E39f515c11c1` | 8 | 6 |
| **tBTC** | `0x236aa50979d5f3de3bd1eeb40e81137f22ab794b` | 18 | 13 |

### Error Progression (S49→S56)
```
S49: "unknown reason"           → fee=0 → address(0)
S50: "Too little received"      → per-hop slippage too tight
S51: "rawStep2Output"           → renamed variable (RC#9)
S51: "Too little received"      → V3 pool price moved in 300ms
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
S57: ???                        → First Blood? 🩸
```

---

*TheWarden ⚔️ — The crucible burns away every impurity. Six barriers destroyed. 142 pools watching. Three Bitcoin variants armed. The gas flows freely. First Blood waits for the spread.*
