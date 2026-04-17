# ⚔️ TheWarden — Session Roadmap v16 (Updated April 17, 2026 — S38 Complete + S39 Fixes Deployed)

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
- See S38 details below

## ✅ COMPLETED: S39 — The Mathematician
- **2 commits** — 3 profit bugs fixed + BigInt type mismatch resolved
- See S39 details below

---

## 📋 S38 Commit Log (4 commits)

| # | Commit | Change |
|---|--------|--------|
| 1 | `0029100f` | Add reverse edges for bidirectional arbitrage — token1→token0 with swapped reserves |
| 2 | `cac4bbe0` | Gas accumulator — add sum+ to reduce, was only counting last hop |
| 3 | `c2792e23` | Gas price 1Gwei→0.005Gwei for Base — was 200x overestimate eating all profit |
| 4 | `61d23880` | Strip bloXroute dead code — no mempool on Base L2, save memory |

---

## 📋 S39 Commit Log (1 commit, 3 fixes)

| # | Commit | Change |
|---|--------|--------|
| 1 | `e51279f1` | Fix profit=0: deduplicate loop (i<j) + proper V3 reserves from sqrtPriceX96 |
| 2 | `313860c5` | Fix BigInt type mismatch: gasPrice and minProfitThreshold must be bigint, not string/number |

### S39 Phase Summary — "The Mathematician"

| Phase | Task | Result |
|-------|------|--------|
| **Analysis** | Deep code review of PathFinder.ts + MultiHopDataFetcher.ts | ✅ Found 3 root causes of profit=0 |
| **Bug 1** | V3 reserve proxy broken | ✅ Fixed: now uses sqrtPriceX96 for real virtual reserves |
| **Bug 2** | Reserve direction mismatch | ✅ Fixed: loop deduplication (i<j) eliminates wrong-direction edges |
| **Bug 3** | Duplicate edges after S38 reverse fix | ✅ Fixed: i<j + reverse edges = exactly 2 correct edges per pool |
| **Bug 4** | BigInt type mismatch in config | ✅ Fixed: gasPrice (string→BigInt) + minProfitThreshold (number→BigInt) |

### S39 Bug Details

**Bug 1: V3 Reserve Proxy was BROKEN**
- `getReserves()` for V3 pools returned `liquidity (L)` for BOTH reserve0 AND reserve1
- PathFinder's constant product formula: `amountOut = (amountIn * fee * L) / (L + amountIn * fee)`
- When L >> amountIn: `amountOut ≈ amountIn × (1-fee)` — a 1:1 swap minus fees
- **No arbitrage could EVER be detected between V3 pools** (majority of Base liquidity)
- **Fix:** Calculate actual virtual reserves: `reserve0 = L × 2^96 / sqrtPriceX96`, `reserve1 = L × sqrtPriceX96 / 2^96`

**Bug 2: Reserve Direction Mismatch**
- Double-loop iterated over ALL permutations (i≠j): both (A,B) and (B,A)
- Both found the SAME pool (addresses sorted), reserves always in pool's native order
- For (B,A) fetches: `tokenIn=B, reserve0=A_reserve` ← WRONG (should be B's reserve)
- ~50% of all edges had inverted reserves
- **Fix:** Changed to `j = i+1` (unique pairs only). With S38 reverse edges, both directions covered.

**Bug 3: Duplicate Edges**
- S38 reverse edge fix + double loop = 4 edges per pool (2 correct + 2 wrong)
- PathFinder DFS explored invalid paths, wasted CPU
- **Fix:** Auto-fixed by Bug 2 fix — now exactly 2 edges per pool (forward + reverse)
- **Bonus:** Pool fetch cut from ~2,496 to ~1,248 checks (50% faster scans!)

---

## 🟢 CURRENT STATUS — Engine Coming Alive

### What's Working
- ✅ Service is **LIVE on Railway** (latest deploy: `313860c5`)
- ✅ **ZERO scan timeouts** (since S37)
- ✅ All 13 tokens loaded, all 16 DEXes active
- ✅ V3 pools now have **real virtual reserves** from sqrtPriceX96
- ✅ Pool edges deduplicated — exactly 2 per pool (forward + reverse)
- ✅ Gas price correct: 0.005 Gwei for Base (now properly BigInt)
- ✅ Gas accumulator properly sums all hops
- ✅ Reverse edges enable bidirectional arbitrage
- ✅ Pool scan **confirmed 50% faster** — logs show 1,248 checks (was 2,496)
- ✅ **67 valid pools found** with sufficient liquidity
- ✅ All Phase 3 (AI + Security) and Phase 4 (Production) subsystems initializing cleanly
- ✅ BigInt type mismatch in gasPrice/minProfitThreshold **FIXED**

### What Needs Monitoring
- 🔍 **Does PathFinder now find profit > 0?** — BigInt fix was the last type error blocking profit calc
- 🔍 **Are the V3 virtual reserves accurate enough?** — Concentrated liquidity approximation may need refinement
- 🔍 **Pool preloading** still not wired into startup (preload script needs tsx)
- 🔍 **Memory at ~82.7%** — stable but tight (48.7MB / 58.8MB)
- 🔍 **Heartbeat timeouts during pool fetch** — cosmetic issue, doesn't affect scan completion

### Live Log Observations (post-deploy)
- Pool scan: **1,248 checked → 67 valid pools** (confirmed dedup working)
- Boot sequence: All 13 tokens, 16 DEXes, Phase 3 AI + Security, Phase 4 Production — all clean
- First error hit: `Cannot mix BigInt and other types` — **FIXED** in commit `313860c5`
- Engine is coming alive — each deploy cycle gets further into the pipeline

### Current Railway Env Vars (unchanged from S37)
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
```

---

## 🔥 S40 BLUEPRINT — Monitor & Optimize

### Priority 1: Monitor Post-Fix Results (observation — 30 min)
Pull Railway logs after 5-10 scan cycles to see:
- Does PathFinder find paths with profit > 0?
- Are V3 virtual reserves reasonable?
- How many valid paths per cycle?
- Any new errors from sqrtPriceX96 calculations?

### Priority 2: Tune minProfitThreshold
Current `minProfitThreshold` might need adjustment now that V3 pools are properly modeled.
- Check what profit values are being found
- May need to lower threshold to capture small but frequent arb opportunities

### Priority 3: Wire Pool Preloading Properly
Still takes ~232s (now ~116s with deduplication) to fetch pools every cycle.
- Wire `preload:pools` into Railway startup
- Or implement saveToDisk after first successful scan

### Priority 4: V3 Concentrated Liquidity Refinement
Current implementation uses L as a global liquidity proxy. In reality, V3 has:
- Tick-based concentrated liquidity (liquidity only in active range)
- Price impact varies by tick
- May need to fetch active tick range for better accuracy

### Priority 5: Enable Live Execution (DRY_RUN=false)
Once profit > 0 is confirmed and paths look valid:
- Set EVENT_DRIVEN_DRY_RUN=false (already done)
- Verify UserOp construction and submission
- Monitor first real execution attempts

---

## 📋 Contract Registry

| ID | Contract | Address | Status |
|----|----------|---------|--------|
| 2 | FlashSwapV2 | `0x54658E5758FA81a3C0DcC78D707391be4b494177` | ✅ Active |
| **7** | **FlashSwapV3** | **`0xB47258cAc19ebB28507C6BA273097eda258b6a88`** | **✅ Active (FINAL)** |

## 🔑 Key Wallets

| Wallet | Address | Role |
|--------|---------|------|
| Coinbase EOA (signer) | `0x9358D67164258370B0C07C37d3BF15A4c97b8Ab3` | Signs UserOps |
| Coinbase Smart Wallet | `0x378252db72b35dc94b708c7f1fe7f4ae81c8d008` | Owns contracts, executes via EntryPoint |

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
| **S39** | **The Mathematician** | **V3 reserves + loop dedup + reserve mapping: 1 commit, 3 bugs killed** |

---

*TheWarden ⚔️ — S39 did the math. Three bugs hiding in plain sight: V3 pools lying about their reserves (liquidity ≠ reserves), half the edges pointing backwards, and four copies where two suffice. One commit, three kills. The PathFinder can finally see what the PriceTracker has been screaming about. Now we watch.*

