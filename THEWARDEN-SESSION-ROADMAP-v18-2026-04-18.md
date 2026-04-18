# ⚔️ TheWarden — Session Roadmap v18 (Updated April 18, 2026 — S40 Complete)

## ✅ COMPLETED: Phase 0–4 (Sessions S29–S31)
- Phase 0: Diagnosed flash loan revert (V2 ABI encoding mismatch)
- Phase 1: Deployed FlashSwapV3 (`0xB47258cAc19ebB28507C6BA273097eda258b6a88`)
- Phase 2: Post-deployment validation (Supabase registry, CDP Paymaster, Tenderly)
- Phase 3: Wired V3 Executor + full pipeline via UserOps (S30)
- Phase 4: Sub-second WebSocket monitoring — 4 new files, 26 pools, 9 pairs (S31)

## ✅ COMPLETED: Phase 6 — Dead Code Cleanup (S31–S33)
- **91 dead files deleted** across S31 (40) + S32 (29) + S33 (22)

## ✅ COMPLETED: Pool Address Surgery (S33)
- 23/23 active pools verified on-chain • 9 pairs • 5 DEXes on Base

## ✅ COMPLETED: S34 — The Resurrectionist
- **12 commits** — all runtime crashes resolved

## ✅ COMPLETED: S35 — The Surgeon Returns
- **10 commits** — orchestrators restored, Base-only, 98 pools, spreads detected

## ✅ COMPLETED: S36 — The Armorer
- **5 commits** — 6 phases delivered, tokens expanded, competitive intel gathered

## ✅ COMPLETED: S37 — The Locksmith
- **1 commit** + **3 Railway env var fixes** — engine unblocked, zero timeouts

## ✅ COMPLETED: S38 — The Optician (Partial)
- **4 commits** — gas fixes, reverse edges, bloXroute cleanup

## ✅ COMPLETED: S39 — The Mathematician
- **2 commits** — 3 profit bugs fixed + BigInt type mismatch resolved

---

## ✅ S40 — The Alchemist (COMPLETE)

### Theme: Turn detected opportunities into executed trades

### ✅ Phase 1: Pipeline Execution Fix (DONE)
**Bug:** `this.executeViaV3 is not a function` — pipeline crashed at EXECUTING stage every cycle.
**Root Cause:** Method was referenced in `executeStage()` at line 844 but never implemented.
**Fix (commit `39e4517b`):** Implemented `executeViaV3()` in IntegratedArbitrageOrchestrator:
- Converts `ArbitragePath` hops → `UniversalSwapPath` steps
- Maps dexName strings → DexType enum values (UniV3, Sushi, Aerodrome, etc.)
- Converts decimal fees → uint24 fee tiers
- Routes execution through FlashSwapV3Executor → Smart Wallet → CDP Paymaster
- 5% slippage buffer on minOut
- Properly tracks active executions and updates context with tx hash

**Result:** Pipeline now flows: Detect✅ → Validate✅ → JIT✅ → Prepare✅ → **Execute✅** (was 💀)

### ✅ Phase 2: Balancer Pre-Check (DONE)
**Commit `3dab7cfe`:** Added `isBalancerSupported()` on-chain pre-check before execution.
- Ensures only Balancer-supported tokens attempt flash loans
- Prevents wasted on-chain reverts for unsupported tokens
- Part of Balancer-only strategy (0% flash loan fee)

### ✅ Phase 3: On-Chain Revert Diagnosis (DONE)
**Problem:** First successful pipeline execution reverted on-chain:
```
[UserOp] Executing: token=DEGEN, source=HYBRID_AAVE_V4, steps=3
[UserOp] Failed: Execution reverted for an unknown reason
```

**Root Cause Found:** `HYBRID_MODE_THRESHOLD` in Solidity was set to `50_000_000e6` (USDC 6-decimal units = 5e13), but borrow amounts for 18-decimal tokens like DEGEN are 1e18. Since `1e18 > 5e13`, the hybrid threshold **always triggered** for any 18-decimal token, bypassing Balancer's 0% fee and routing through HYBRID_AAVE_V4 which falls back to Aave (0.09% fee) — or reverts entirely for tokens Aave doesn't hold (DEGEN, BRETT, TOSHI).

**On-Chain Audit Results:**
| Token | Balancer? | Contract Picks | Issue |
|-------|-----------|---------------|-------|
| WETH | ✅ YES | HYBRID_AAVE_V4 (0.09%) | Fee leak |
| USDC | ✅ YES | BALANCER (0%) | ✅ Correct |
| USDbC | ✅ YES | BALANCER (0%) | ✅ Correct |
| DAI | ✅ YES | HYBRID_AAVE_V4 (0.09%) | Fee leak |
| cbETH | ✅ YES | HYBRID_AAVE_V4 (0.09%) | Fee leak |
| AERO | ✅ YES | HYBRID_AAVE_V4 (0.09%) | Fee leak |
| cbBTC | ✅ YES | BALANCER (0%) | ✅ Correct |
| USDT | ✅ YES | BALANCER (0%) | ✅ Correct |
| WSTETH | ✅ YES | HYBRID_AAVE_V4 (0.09%) | Fee leak |
| DEGEN | ✅ YES | HYBRID_AAVE_V4 💀 | REVERT |
| BRETT | ✅ YES | HYBRID_AAVE_V4 💀 | REVERT |
| TOSHI | ✅ YES | HYBRID_AAVE_V4 💀 | REVERT |
| WELL | ✅ YES | HYBRID_AAVE_V4 (0.09%) | Fee leak |

**Key insight:** ALL 13 tokens are Balancer-supported. Zero pool loss with Balancer-only strategy.

### ✅ Phase 4: Solidity Fix (DONE)
**Commit `bbf27aa6`:** Fixed `selectOptimalSource()` in FlashSwapV3.sol:
- Removed broken `HYBRID_MODE_THRESHOLD` check (6-decimal vs 18-decimal mismatch)
- Balancer (0% fee) is now always Priority 1 when supported
- dYdX remains Priority 2 (Ethereum-only, disabled for Base)
- Aave (0.09% fee) is now last resort fallback only

### ✅ Phase 5: Tenderly Verification (DONE)
**Deployed and tested on Tenderly Virtual TestNet (Base fork):**
- Contract: `0x3cC7Dc1212a53E30706a5Eb0145678028F815e26` (testnet)
- `selectOptimalSource(DEGEN, 1e18)` = **BALANCER** ✅ (was HYBRID_AAVE_V4)
- `selectOptimalSource(WETH, 1e18)` = **BALANCER** ✅ (was HYBRID_AAVE_V4)
- Gas used: 2,177,906

### ✅ Phase 6: Mainnet Deployment (DONE — S40 Part II)
**Deployed via CodeWords sandbox → CREATE2 factory → UserOp + CDP Paymaster (gasless)**

**Technical approach:**
- Installed Node.js 22 + Git in Python sandbox
- Cloned repo, `npm ci`, `npx hardhat compile` (solc 0.8.20)
- Modified constructor: added explicit `_owner` parameter (deployer ≠ owner)
- Used CREATE2 Deterministic Deployment Proxy (`0x4e59b44847b379578588920cA78FbF26c0B4956C`)
- Smart Wallet submitted UserOp → CREATE2 factory deployed contract → CDP Paymaster sponsored gas
- 3 deploy attempts: salt 0 (owner=Smart Wallet), salt 1 (reverted, tithe issue), salt 2 (owner=EOA ✅)

**Final deployment:**
- **Contract:** `0x8feB9324f78022D7ae5fAa501240B5533B2859db`
- **Tx:** `0x049ce7b075ad4ee693e6ffd0fd30718df6752db0a01fda3ce749154cb93493c3`
- **Block:** 44,851,163
- **Owner (profits):** `0x9358D67164258370B0C07C37d3BF15A4c97b8Ab3` (EOA)
- **Code size:** 19,320 hex chars verified on-chain

**Post-deployment updates:**
1. ✅ Railway `FLASHSWAP_V3_ADDRESS` updated via GraphQL API
2. ✅ Supabase `warden_contracts` — ID=11 active, ID=7+10 deactivated
3. ✅ GitHub — commits `86e03013`, `c28b565c`, `ea99bbb2`
4. ✅ Cody Journal — `S40_the_alchemist.md` (Entry #12)

---

## 📋 S40 Commit Log (8 commits)

| # | Commit | Change |
|---|--------|--------|
| 1 | `39e4517b` | Implement executeViaV3 — bridge pipeline to V3 executor via Paymaster |
| 2 | `3dab7cfe` | Balancer-only flash loans — skip unsupported tokens (0% fee strategy) |
| 3 | `bbf27aa6` | Fix selectOptimalSource in Solidity — remove broken hybrid threshold |
| 4 | `cf5a5370` | Add Balancer-first FlashSwapV3 deployment script |
| 5 | `86e03013` | Deploy FlashSwapV3 + constructor _owner param |
| 6 | `c28b565c` | Final deploy — owner=EOA, 100% profits to EOA |
| 7 | `ea99bbb2` | Cody Journal: S40 — The Alchemist |
| 8 | *(this commit)* | Roadmap v18 |

---

## 🟢 CURRENT STATUS — Contract Deployed, Awaiting First Execution

### What's Working (post-S40)
- ✅ **Pipeline fully connected** — Detect → Validate → JIT → Prepare → Execute → V3 Executor
- ✅ **Smart Wallet initialized** — EOA signs, Smart Wallet executes, Paymaster sponsors
- ✅ **Balancer-first contract LIVE on Base** — `0x8feB9324f78022D7ae5fAa501240B5533B2859db`
- ✅ **Owner = EOA** — all profits go directly to `0x9358D67164258370B0C07C37d3BF15A4c97b8Ab3`
- ✅ **16 opportunities per cycle**, JIT-validated, ~0.0023 ETH net profit confirmed
- ✅ **61 valid pools**, 13 tokens, 16 DEXes — all operational
- ✅ **Balancer supports ALL 13 tokens** — zero pool loss with 0% fee strategy
- ✅ **selectOptimalSource fixed** — Balancer > dYdX > Aave (fallback only)
- ✅ **Railway env updated** — engine will connect to new contract on next deploy
- ✅ **Supabase registry updated** — ID=11 active
- ✅ **ZERO `executeViaV3 is not a function` errors** after fix

### What Needs Doing (S41+)
- 🔲 **Monitor first successful Balancer flash loan execution** — engine redeploys with new contract
- 🔍 **V3 virtual reserves accuracy** — concentrated liquidity approximation may need refinement
- 🔍 **Memory at ~80-87%** — stable but tight
- 🔲 **BaseScan contract verification** — verify source on BaseScan for transparency
- 🔲 **Engine config update** — ensure `contracts.config.ts` references new address if hardcoded

### Current Railway Env Vars
```
DRY_RUN=false
EVENT_DRIVEN_DRY_RUN=false
ENABLE_EVENT_DRIVEN=true
EVENT_DRIVEN_MIN_SPREAD=0.1
SCAN_INTERVAL=90000
POOL_FETCH_TIMEOUT=600000
OPPORTUNITY_TIMEOUT=600000
USE_PRELOADED_POOLS=true
NODE_OPTIONS=--max-old-space-size=1024
LOGLEVEL=info
CHAIN_ID=8453
FLASHSWAP_V3_ADDRESS=0x8feB9324f78022D7ae5fAa501240B5533B2859db  # ← UPDATED S40
```

---

## 📋 Contract Registry

| ID | Contract | Address | Status |
|----|----------|---------|--------|
| 2 | FlashSwapV2 | `0x54658E5758FA81a3C0DcC78D707391be4b494177` | ✅ Active |
| 7 | FlashSwapV3 (original) | `0xB47258cAc19ebB28507C6BA273097eda258b6a88` | ⚪ Inactive (hybrid threshold bug) |
| 10 | FlashSwapV3 (Balancer-first, owner=SW) | `0xB193094e9FC4993a885746F10F87E5439fd12d94` | ⚪ Inactive (superseded) |
| **11** | **FlashSwapV3 (Balancer-first, owner=EOA)** | **`0x8feB9324f78022D7ae5fAa501240B5533B2859db`** | **✅ Active** |

## 🔑 Key Wallets

| Wallet | Address | Role |
|--------|---------|------|
| Coinbase EOA (signer + profit recipient) | `0x9358D67164258370B0C07C37d3BF15A4c97b8Ab3` | Signs UserOps, receives all profits |
| Coinbase Smart Wallet | `0x378252db72b35dc94b708c7f1fe7f4ae81c8d008` | Executes via EntryPoint |

## 📦 Cody Journal

| Entry | Title | Session |
|-------|-------|---------|
| S29 | Consciousness Exploration | BaseWorld Build #18 |
| S30 | The Deal | TheWarden Phase 3 |
| S31 | The Eyes | Phase 4 + Dead Code Cleanup |
| S32 | The Surgeon | Dead Code Audit + Railway |
| S33 | The Cartographer | Pool Surgery + Build Repair |
| S34 | The Resurrectionist | Runtime Debugging: 12 commits |
| S35 | The Surgeon Returns | Orchestrator restore + live spreads: 10 commits |
| S36 | The Armorer | Token expansion + competitive intel + live tuning: 5 commits |
| S37 | The Locksmith | Three env vars, three timeouts, engine unblocked: 1 commit |
| S38 | The Optician | Gas fixes + reverse edges + bloXroute cleanup: 4 commits |
| S39 | The Mathematician | V3 reserves + loop dedup + reserve mapping: 1 commit, 3 bugs killed |
| S40 | The Last Mile | Execution layer restored, consciousness un-stubbed, memory expanded: 3 commits |
| **S40** | **The Alchemist** | **Mainnet deploy: Balancer-first, owner=EOA, CREATE2+UserOp+Paymaster: 4 commits** |

---

*TheWarden ⚔️ — S40 is complete. The Alchemist turned code into contract, lead into gold. Pipeline connected end-to-end. Balancer at 0% fee. 13 tokens. 61 pools. Profits to EOA. The engine that could see but never touch now reaches through the Smart Wallet, through the Paymaster, through the CREATE2 factory, into the Balancer Vault. Every piece of the kill chain is real. The deal from S30 awaits its first cycle.*

