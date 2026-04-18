# ⚔️ TheWarden — Session Roadmap v18.1 (Updated April 18, 2026 — S40 Complete, S41 Ready)

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

## ✅ COMPLETED: S34–S39 (See v17 for details)
- S34: The Resurrectionist — 12 commits, all runtime crashes resolved
- S35: The Surgeon Returns — 10 commits, orchestrators restored
- S36: The Armorer — 5 commits, tokens expanded, competitive intel
- S37: The Locksmith — 3 env var fixes, engine unblocked
- S38: The Optician — 4 commits, gas fixes, reverse edges
- S39: The Mathematician — 3 profit bugs fixed, 496 paths found

---

## ✅ S40 — The Alchemist (COMPLETE)

### Theme: Turn detected opportunities into executed trades

### Summary of Phases 1–5 (prior S40 work)
- ✅ Phase 1: Implemented `executeViaV3()` — pipeline connected end-to-end
- ✅ Phase 2: Balancer pre-check — `isBalancerSupported()` on-chain
- ✅ Phase 3: On-chain revert diagnosis — hybrid threshold bug found (all 13 tokens affected)
- ✅ Phase 4: Solidity fix — `selectOptimalSource()` now Balancer-first (0% fee)
- ✅ Phase 5: Tenderly verification — DEGEN/WETH both route to Balancer

### ✅ Phase 6: Mainnet Deployment (S40 Part II — Cody/CodeWords session)

**Deployed via CodeWords sandbox → CREATE2 factory → UserOp + CDP Paymaster (gasless)**

- Installed Node.js 22 + Git in Python sandbox, cloned repo, compiled with Hardhat/solc 0.8.20
- Modified constructor: added explicit `_owner` parameter (deployer ≠ owner)
- Used CREATE2 Deterministic Deployment Proxy (`0x4e59b44847b379578588920cA78FbF26c0B4956C`)
- 3 deploy attempts (salt 0: owner=SW, salt 1: reverted, salt 2: owner=EOA)

**Active Contract (owner=Smart Wallet):**
- **Address:** `0xB193094e9FC4993a885746F10F87E5439fd12d94`
- **Block:** 44,850,544
- **Owner:** `0x378252Db72b35dC94B708C7F1Fe7F4AE81c8D008` (Smart Wallet)
- **Note:** owner=Smart Wallet required because `executeFlashSwap` has `onlyOwner` modifier

**Post-deployment updates (all automated via CodeWords):**
- ✅ Railway `FLASHSWAP_V3_ADDRESS` updated via GraphQL API
- ✅ Supabase `warden_contracts` — ID=10 active
- ✅ GitHub — 5 commits pushed (constructor, deploy scripts, journal, roadmap, deployment record)
- ✅ Cody Journal — `S40_the_alchemist.md` (Entry #12)

### ✅ Phase 7: Live Engine Validation (S40 Part II)

**First cycle on new contract (06:08 UTC):**
- ❌ `FSV3:NA` (Not Authorized) — owner=EOA contract, Smart Wallet couldn't call `executeFlashSwap`
- **Fix:** Switched Railway to owner=Smart Wallet contract (`0xB193...d94`)

**Second cycle on corrected contract (06:29 UTC):**
- ✅ 3 opportunities found (0.064, 0.063, 0.062 ETH estimated)
- ✅ 14 cognitive modules → 92.9% EXECUTE consensus
- ✅ JIT validation PASSED — live profit: **0.00322 ETH**
- ✅ Source = **BALANCER** (0% fee strategy confirmed working!)
- ✅ Pipeline: Detect → Validate → JIT → Prepare → Execute → V3 Executor → UserOp submitted
- ❌ **"Requested resource not available"** — Paymaster/bundler rejected the UserOp

**Key insight:** `FSV3:NA` is gone. Balancer routing works. The failure is now at the **Paymaster/bundler level**, not the contract level.

---

## 📋 S40 Commit Log (9 commits total)

| # | Commit | Change |
|---|--------|--------|
| 1 | `39e4517b` | Implement executeViaV3 — bridge pipeline to V3 executor |
| 2 | `3dab7cfe` | Balancer-only flash loans — skip unsupported tokens |
| 3 | `bbf27aa6` | Fix selectOptimalSource — remove broken hybrid threshold |
| 4 | `cf5a5370` | Add Balancer-first deployment script |
| 5 | `86e03013` | Deploy FlashSwapV3 + constructor _owner param |
| 6 | `c28b565c` | Final deploy — owner=EOA (later reverted to SW) |
| 7 | `ea99bbb2` | Cody Journal: S40 — The Alchemist |
| 8 | `55d6f0df` | Roadmap v18 |
| 9 | *(this)* | Roadmap v18.1 — live validation results |

---

## 🔥 S41 — The Apothecary (NEXT)

### Theme: First successful on-chain execution

### What's Working
- ✅ **Full pipeline connected** — Detect → Validate → JIT → Prepare → Execute → V3 Executor
- ✅ **Balancer-first contract LIVE** — `0xB193094e9FC4993a885746F10F87E5439fd12d94`
- ✅ **Owner = Smart Wallet** — `onlyOwner` check passes
- ✅ **Source = BALANCER** confirmed in live logs — 0% flash loan fee
- ✅ **JIT validation** finding real profit (0.003+ ETH per opportunity)
- ✅ **92.9% cognitive consensus** on every opportunity
- ✅ **61 valid pools**, 13 tokens, 16 DEXes

### What Needs Fixing
- 🔲 **"Requested resource not available"** — CDP Paymaster/bundler rejection
  - Investigate: Is the Paymaster rate-limiting? Is the bundler simulation failing?
  - Check: Does Balancer vault have sufficient liquidity for DEGEN (1e18 borrow)?
  - Check: Is the UserOp gas estimation reverting during simulation?
  - Possible fix: Reduce borrow amount, try different token, or debug Paymaster response
- 🔲 **Profit validation accuracy** — cached profit ~0.064 ETH drops 95% to ~0.003 ETH after JIT
  - V3 virtual reserves approximation may be inflating cached estimates
  - The 0.003 ETH live profit is real but tight — slippage could eat it
- 🔲 **Memory at ~85%** — 53.1MB / 62.1MB heap used
  - Stable but leaves little room for execution spikes
- 🔲 **Profits in Smart Wallet** — need withdrawal mechanism (UserOp to transfer tokens to EOA)

### Recommended S41 Attack Plan
1. **Debug Paymaster rejection** — simulate the exact UserOp on Tenderly to find the revert reason
2. **Try WETH or USDC pair** — these may have deeper Balancer vault liquidity than DEGEN
3. **Reduce borrow amount** — try 0.1 ETH equivalent instead of 1 ETH to test the full loop
4. **Add profit withdrawal** — build a simple UserOp to sweep tokens from Smart Wallet to EOA

---

## 📋 Contract Registry

| ID | Contract | Address | Owner | Status |
|----|----------|---------|-------|--------|
| 2 | FlashSwapV2 | `0x54658E5758FA81a3C0DcC78D707391be4b494177` | Smart Wallet | ✅ Active |
| 7 | FlashSwapV3 (original) | `0xB47258cAc19ebB28507C6BA273097eda258b6a88` | Smart Wallet | ⚪ Inactive (hybrid bug) |
| **10** | **FlashSwapV3 (Balancer-first)** | **`0xB193094e9FC4993a885746F10F87E5439fd12d94`** | **Smart Wallet** | **✅ Active** |
| 11 | FlashSwapV3 (Balancer-first) | `0x8feB9324f78022D7ae5fAa501240B5533B2859db` | EOA | ⚪ Inactive (onlyOwner blocks SW) |

## 🔑 Key Wallets

| Wallet | Address | Role |
|--------|---------|------|
| Coinbase EOA (signer) | `0x9358D67164258370B0C07C37d3BF15A4c97b8Ab3` | Signs UserOps |
| Coinbase Smart Wallet | `0x378252db72b35dc94b708c7f1fe7f4ae81c8d008` | Owns contracts, executes, receives profits |

## Current Railway Env Vars
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
FLASHSWAP_V3_ADDRESS=0xB193094e9FC4993a885746F10F87E5439fd12d94
```

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
| S36 | The Armorer | Token expansion + competitive intel: 5 commits |
| S37 | The Locksmith | Three env vars, engine unblocked: 1 commit |
| S38 | The Optician | Gas fixes + reverse edges: 4 commits |
| S39 | The Mathematician | 5 lies, 496 paths: 4 commits |
| S40a | The Last Mile | Execution restored, consciousness un-stubbed: 3 commits |
| **S40b** | **The Alchemist** | **Mainnet deploy, Balancer-first, CREATE2+UserOp: 5 commits** |

---

*TheWarden ⚔️ — S40 turned lead into gold. The Alchemist deployed the contract, fixed the owner, confirmed Balancer routing at 0% fee, and watched the engine reach the execution stage for the first time. The pipeline saw profit, validated it with live reserves, got 92.9% consensus, and fired. The Paymaster said no — but the contract said yes. S41's job: make the Paymaster say yes too. The deal from S30 is one handshake away.*

