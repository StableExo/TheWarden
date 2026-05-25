# THEWARDEN SESSION ROADMAP v37 — S57 FINAL
## Updated S57 FINAL — April 21, 2026 | TheWarden ⚔️

---

## ✅ COMPLETED SESSIONS (S47–S57)

### S56 — The Crucible (11 commits, RC#16-17, 6 barriers, 142 pools)
### S57 — The Vigil (4 commits, 16 Aerodrome pools, warmup wired, 161 pools)

#### S57 Commits
| Commit | Change |
|--------|--------|
| `965ccbc8` | Wire PriceTracker warmup into EventDrivenMonitor.start() |
| `87e74b59` | Thread rpcUrl through EventDrivenInitializer |
| `995bf100` | S57 journal — The Vigil |
| `c59073cb` | Roadmap v36 |

#### S57 Supabase Changes
| Change | Details |
|--------|---------|
| Aerodrome pools | 16 new (cbBTC/WETH $22.9M, cbBTC/USDC $13.2M, LBTC/cbBTC $4.2M) |
| **Total pools** | **145 → 161** |
| **Total tokens** | **25** |

#### S57 Intelligence Gathered
| Finding | Details |
|---------|---------|
| Balancer V2 on Base | $299K total — too thin for flash loans |
| Balancer V3 on Base | $419K total — better architecture, still too thin |
| Aave V3 on Base | **$221M total** — 2,026 cbBTC ($176M), USDC ($14.5M) |
| Aave V3 flash loan flag | `flash_loan_enabled` reads false — needs verification |
| Flash loan % caps | **None** on any V2+ protocol — all allow 100% of available |
| Balancer V1 (deprecated) | Was 2% cap — no longer applies |

---

## 🔲 S58 — First Blood (NEXT)

### Theme: Deploy warmup + 161 pools → wait for the spread

### 🔴 P0 — First Blood
- 🔲 Verify Railway redeploy picked up S57 commits (warmup + Aerodrome pools)
- 🔲 Monitor for first successful tx hash
- 🔲 Verify profit on BaseScan: balance increase in Smart Wallet (0x378252)
- 🔲 Track cross-DEX UniV3 ↔ Aerodrome opportunities (cbBTC, LBTC, tBTC)

### 🟡 P1 — Hardening
- 🔲 Power 20 pool pruning (focus on high-liquidity pools, reduce WSS noise)
- 🔲 Memory investigation (62.8MB heap despite NODE_OPTIONS=512MB)
- 🔲 Race condition handling (~300ms gap)
- 🔲 Consolidate fee logic across executor

---

## 📋 MILESTONE ROADMAP — Post-First Blood

### 🏁 M1: Speed & MEV Optimization
**Goal:** Reduce detection-to-execution latency below 200ms
- 🔲 Verify Flashblocks latency (200ms vs 2s detection)
- 🔲 Add base_transactionStatus for fast confirmation
- 🔲 Private RPC + priority fees (maxPriorityFeePerGas 0.05-0.1 gwei)
- 🔲 Lower maxPriceAge to ~5s (safe now after warmup wired)
- 🔲 Bundler optimization (Pimlico/Alchemy high-priority endpoints)

### 🏁 M2: Aave V3 Flash Loan Integration
**Goal:** Access $221M in flash loan liquidity at 0.05% fee
- 🔲 Verify Aave V3 flash loan enabled status on Base (bitmap parsing fix)
- 🔲 Test Aave V3 flash loan with small cbBTC amount on Tenderly
- 🔲 Update selectOptimalSource() to prioritize Aave for large borrows
- 🔲 Benchmark: Aave (0.05%) vs UniV3 (pool fee) cost comparison per opportunity
**Reserves available:** cbBTC: 2,026 ($176M), USDC: $14.5M, wstETH: $25.2M, cbETH: $5.4M

### 🏁 M3: Balancer V3 Contract Upgrade
**Goal:** Zero-fee flash loans when Balancer TVL grows on Base
**Pre-condition:** Balancer V3 Base TVL > $10M (currently $419K)
- 🔲 Write Contract #15: FlashSwapV3 with Balancer V3 `Vault.unlock()` + transient accounting
- 🔲 Implement `IFlashLoanRecipient` for V3's EIP-1153 "till pattern"
- 🔲 Deploy on Tenderly virtual testnet first
- 🔲 Deploy to Base mainnet
- 🔲 Add to CDP allowlist
- 🔲 Update FlashSwapV3Executor to support V3 Vault ABI
**V3 Addresses:**
  - Vault: `0xbA1333333333a1BA1108E8412f11850A5C319bA9`
  - Router: `0x3f170631ed9821ca51a59d996ab095162438dc10`
  - Batch Router: `0x136f1efcc3f8f88516b9e94110d56fdbfb1778d1`
**Architecture notes:**
  - Transient Accounting (EIP-1153): Balance deltas in transient storage, settle at end
  - Vault.unlock() pattern replaces receiveFlashLoan() callback
  - Custom Solidity errors replace assembly workarounds
  - 100% Boosted Pools with native yield-bearing token support
  - Hooks framework for custom pool logic (LVR reduction, dynamic fees)

### 🏁 M4: Triangle Arbitrage
**Goal:** Multi-hop cross-protocol arb (3+ hops)
- 🔲 Implement Balancer → Aerodrome → UniV3 → Balancer triangle paths
- 🔲 Multi-token flash loan from Balancer V3 (borrow cbBTC + WETH simultaneously)
- 🔲 Graph-based pathfinder for optimal route selection
- 🔲 Benchmark gas costs for 3-hop vs 2-hop strategies

### 🏁 M5: Cross-Chain Expansion
**Goal:** Extend arb to Arbitrum + multi-chain opportunities
- 🔲 Strategy already exists in warden_strategies (id=7: "Cross-Chain Base-Arbitrum")
- 🔲 Bridge integration (Stargate, Synapse)
- 🔲 Multi-chain price tracking
- 🔲 Cross-chain flash loan strategies

### 🏁 M6: ML-Driven Optimization
**Goal:** Predictive opportunity scoring
- 🔲 OpportunityNNScorer already exists in src/ai/
- 🔲 Priority fee prediction (PriorityFeePredictorMLP)
- 🔲 Historical spread pattern detection
- 🔲 Adaptive borrow sizing based on spread confidence

---

## 📊 Supabase State (S57 Final)

| Table | Records | Status |
|-------|---------|--------|
| warden_pools | 161 | ✅ Active (142 UniV3 + 16 Aero + 3 inactive) |
| warden_tokens | 25 | ✅ Active |
| warden_opportunities | 7 | All expired (USDC/AERO arbs from Feb 2026) |
| warden_executions | 1 | Failed (Web3 library in Edge Function — S29 era) |
| warden_strategies | 7 | Flash loan, realtime scanner, cross-chain, etc. |
| sessions | 3 | Consciousness writes (Tasklet sessions Jan 2026) |

## 📊 Flash Loan Source Registry

| Source | Vault/Pool | Available | Fee | Status |
|--------|-----------|-----------|-----|--------|
| Balancer V2 | `0xBA122...2C8` | $299K | 0% | ⚠️ Too thin on Base |
| Balancer V3 | `0xbA133...bA9` | $419K | 0% | ⚠️ Too thin, future M3 |
| Aave V3 | `0xA238D...1c5` | $221M | 0.05% | ✅ Huge reserves, verify flash enabled |
| UniV3/Aero | Pool-specific | $50M+ | Pool fee | ✅ Proven, Contract #14 |

## 📦 Cody Journal

| Entry | Title | Session |
|-------|-------|---------|
| **S57** | **The Vigil** | **4 commits, 16 Aero pools, warmup wired, 161 pools, flash loan research** |
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

### Contract Registry
| ID | Contract | Address | Status |
|----|----------|---------|--------|
| **14** | **FlashSwapV3 (Aero CL + Profit Floor)** | **0x8865bc6dc2Cc6516895Ae8856a87Cd123b0D71D8** | **✅ Active** |
| 13 | FlashSwapV3 (Multi-Router) | `0x00558d994dec27f1df60ca90fec8ab45e8a62eaa` | ❌ Retired |
| 15 | FlashSwapV3 (Balancer V3 + EIP-1153) | TBD | 📋 Planned (M3) |

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
S57: warmup wired, 161 pools    → First Blood? 🩸
```

---

*TheWarden ⚔️ — The vigil watches. 161 pools armed. Warmup eliminates dead time. Cross-DEX unlocked. Six milestones charted. First Blood waits for the spread.*
