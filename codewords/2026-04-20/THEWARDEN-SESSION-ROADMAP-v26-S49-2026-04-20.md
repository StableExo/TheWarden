
---

## ✅ S47 — The Blade (COMPLETE — 6 commits, 10 wonders, 8 memories)

### Theme: First Memory + V3 Reserve Fix

**P0 Memory Bridge** ✅ — First CodeWords ↔ TheWarden persistence bridge
- 24 credentials vaulted in CodeWords secrets
- GitHub + Supabase API access verified (read/write)
- 8 memory entries written to neural network
- 10 wonders planted in garden (12→22 total)

**P1 Wonder Garden** ✅ — Capstone wonder #27: complexity 1.0

**P2 Bug Hunt** ✅ — Found and fixed TWO critical issues:
- `c8f7b1c7` — Fix heap: package.json hardcoded --max-old-space-size=256, overriding Railway's 384
- `32e31613` — **ROOT CAUSE FIX: V3 virtual reserves were reserve0=reserve1=liquidity. Added slot0() sqrtPriceX96 read + computeV3VirtualReserves(). Pools now have real prices.**

---

## ✅ S48 — First Blood (COMPLETE — 17 commits)

### Theme: Fix the pipeline, validate the math, close on First Blood

### ✅ P0 — Validate V3 Reserve Fix
- ✅ Confirmed PriceTracker detects real spreads (0.1-1.05%) — V3 fix works
- ✅ `9eb20003` — **ROOT CAUSE #2: Pipeline swap direction was INVERTED.** Was buying expensive, selling cheap. Fixed: sell at high-price pool first, buy at low-price pool second.
- ✅ `127c9a32` — **Dynamic borrow amount sizing.** Was flat 10B (10,000 USDC) for all tokens — WETH pairs got 0.00000001 ETH. Now: ~$5,000 equivalent, token-decimal-aware, capped at 2% of pool liquidity.
- ✅ `36605b66` — **Slippage tolerance: 0.5% → 0.1% → 0.05%.** Base L2 pools have low slippage; original 0.5%×2=1% round-trip ate all sub-1% spreads.
- ✅ `3e9f8d46` — **Debug logging added** to trace exact profit calculation numbers.

### ✅ P1 — Infrastructure & Cleanup
- ✅ `8f197afa` → `4d446679` — **Silenced 8 GitHub Actions workflows**
- ✅ `65267d75` — **Memory optimization:** CEX-DEX hard-disabled
- ✅ `dbfae51a` — **Scan loop re-enabled at 60s**

---

## ✅ S49 — The Hunter (COMPLETE — 3 commits, 2 root causes, first profitable roundTrip)

### Theme: Execute, debug, unblock First Blood

### ✅ P0 — Root Cause #5: Slippage Override
- ✅ `f8ca7978` — **EventDrivenMonitor.ts L116 passed slippageTolerance=0.005 (0.5%) to OpportunityPipeline, overriding the S48 fix (0.0005/0.05%).** All 0.2-0.4% spreads were killed by 1% round-trip slippage. Fix: 0.005→0.0005 in EventDrivenMonitor.
- ✅ **First profitable roundTrip: 1.002238** — spread=0.3236% on USDC/AERO, est_profit=$11.19 on $5K borrow

### ✅ P1 — Root Cause #6: Fee Tier Mismatch (Execution Revert)
- ✅ Pipeline sent 🚀 EXECUTE but UserOp reverted: "Execution reverted for an unknown reason"
- ✅ Traced: Supabase `warden_pools` has NO fee_tier data → `hop.fee=0` → `feeToUint24(0)=0` → skips on-chain check → `Factory.getPool(t0,t1,0)` → `address(0)` → revert
- ✅ `5d81f06a` — **Always query on-chain fee when fee=0, undefined, or default 3000.** Verified USDC/AERO pools: fee=100(0.01%), 500(0.05%), 3000(0.3%), 10000(1%)
- ✅ `feb5b1d7` — **Cache immutable V3 pool fees in memory.** Saves ~100-200ms latency per trade.

### ✅ P2 — Architecture Audit & Research
- ✅ **Full architecture audit:** System already supports cross-DEX at every layer:
  - Supabase: 7 Aerodrome pools active, DEX_ID_MAP includes aerodrome=3
  - SwapEventMonitor: Aerodrome CL uses same Swap event as UniV3 — already subscribed
  - PriceTracker: Groups by token pair, compares across DEXes
  - FlashSwapV3: DEX_TYPE_AERODROME=3, _swapAerodrome() implemented, 1-5 hop UniversalSwapPath
  - Protocol Registry: Aerodrome router + factory registered
- ✅ **Perplexity deep research:** Flashblocks (200ms pre-confirmation), EIP-7702, Aerodrome 4x arb volume vs UniV3
- ✅ **25 credentials re-vaulted** in CodeWords secrets

### ⚠️ Known Issues (Carried)
- **Memory: 80-93% heap** — Railway container limits V8 to ~50-60MB
- **Heartbeat timeouts** — Memory pressure causes event loop freezes (118s on startup)
- **Pipeline false-positive logging** — UserOp fails but Pipeline logs "succeeded"

---

## 🔲 S50 — First Blood (NEXT)

### Theme: First successful on-chain execution

### 🔴 P0 — First Blood
- 🔲 Confirm fee override works in logs (`[V3Pipeline] Fee override: ... → on-chain=500`)
- 🔲 **FIRST SUCCESSFUL ON-CHAIN FLASH LOAN EXECUTION** ← fee fix should unblock
- 🔲 Verify profit on BaseScan: USDC balance increase in Smart Wallet

### 🔴 P1 — Execution Hardening
- 🔲 Fix false-positive Pipeline logging (UserOp fails → logs "succeeded")
- 🔲 Add Quoter V2 validation for candidates before execution
- 🔲 Race condition handling — price moves between detection and execution

### 🟡 P2 — Speed & Revenue
- 🔲 Investigate Flashblocks (200ms pre-confirmation) for faster inclusion
- 🔲 EIP-7702 evaluation: EOA speed + Paymaster sponsorship
- 🔲 Profit withdrawal: Smart Wallet → EOA sweep mechanism
- 🔲 3-hop cross-DEX path building (contract ready, pipeline needs expansion)

### 🟡 P3 — Memory & Infrastructure
- 🔲 Railway plan upgrade or lazy-load consciousness modules
- 🔲 Remove debug logging after pipeline is validated

---

## 📦 Cody Journal

| Entry | Title | Session |
|-------|-------|---------|
| **S49** | **The Hunter** | **3 commits, 2 root causes, first profitable roundTrip=1.002238** |
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

### S49 Key Insight: The Silent Killers

S47 gave it eyes (V3 reserves). S48 taught it to fight (swap direction, borrow sizing, slippage). S49 found the two silent killers that prevented First Blood.

**Root Cause #5:** EventDrivenMonitor.ts L116 passed `slippageTolerance=0.005` to OpportunityPipeline — overriding S48's fix. The Pipeline's own default (0.0005) never fired because the Monitor always provided its old value. One layer up overrode one layer down. Fix: `f8ca7978`.

**Root Cause #6:** Supabase `warden_pools` stores no fee tier data. When the Orchestrator built SwapSteps, `hop.fee=0` → `feeToUint24(0)=0`. The on-chain verification only triggered when fee=3000 (the old default), so fee=0 sailed through unchecked. Contract called `Factory.getPool(USDC, AERO, 0)` → `address(0)` → silent revert. Fix: `5d81f06a`.

The architecture audit revealed TheWarden is already cross-DEX capable at every layer — Aerodrome pools active, same Swap event, PriceTracker grouping across DEXes. The bottleneck was never the architecture. It was always the data flow: slippage and fee propagation.

Three commits: slippage fix → fee fix → fee cache. First Blood is one spread away.

---

*TheWarden ⚔️ — The Hunter tracked the silent killers. roundTrip=1.002238. First Blood draws near.*


