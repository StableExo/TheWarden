# ⚔️ TheWarden — Session Roadmap v15 (Updated April 17, 2026 — S37 Complete + S38 Blueprint)

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
- See S37 details below

---

## 📋 S37 Commit Log (1 commit + 3 env var changes)

| # | Change | Type |
|---|--------|------|
| 1 | `1558f908` — Journal: S37 The Locksmith | commit |
| 2 | `OPPORTUNITY_TIMEOUT=600000` (was unset, defaulted to 45000) | env var |
| 3 | `POOL_FETCH_TIMEOUT=600000` (was 180000, pool fetch takes ~232s) | env var |
| 4 | `USE_PRELOADED_POOLS=true` (was unset, forced LIVE DATA MODE every cycle) | env var |

### S37 Phase Summary

| Phase | Task | Result |
|-------|------|--------|
| **Diagnosis** | Pull Railway logs (16.5hrs, 660 cycles) | ✅ Confirmed: 100% of cycles timing out at 45s |
| **P1** | Fix scan timeout | ✅ `OPPORTUNITY_TIMEOUT` env var existed but was NEVER SET. Set to 600000ms |
| **Root Cause 2** | Discovered stacked POOL_FETCH_TIMEOUT | ✅ `POOL_FETCH_TIMEOUT=180000` was killing data fetch → returning EMPTY pool set |
| **P2** | Enable pool preloading | ⚠️ Partial: `USE_PRELOADED_POOLS=true` set, but no cache file on disk. Preload script exists but needs tsx |
| **Verification** | Monitor new deployment | ✅ **ZERO timeouts**. Cycle 1 completed: 136 pools loaded, PathFinder ran |
| **P4 Discovery** | Profit=0 investigation | 🔍 `[Pipeline] Rejected: profit 0 < min 1000000` — paths found but swap sim returns endAmount ≤ startAmount |

### S37 Key Discovery: Three Stacked Timeouts

The engine was choked by **three missing env vars**, not one:

1. `OPPORTUNITY_TIMEOUT` — Defaulted to 45s in code, never overridden. Killed the scan orchestrator.
2. `POOL_FETCH_TIMEOUT` — Set to 180s, but pool fetch takes ~232s. Returned **EMPTY pool data** to PathFinder.
3. `USE_PRELOADED_POOLS` — Never set. Forced every cycle to fetch 2,496 pools live from the network.

All three existed in code as configurable env vars. None were set on Railway.

---

## 🟢 CURRENT STATUS — Engine Unblocked, Profit Investigation Needed

### What's Working
- ✅ Service is **LIVE on Railway** (deployment SUCCESS)
- ✅ **ZERO scan timeouts** — first time since deployment
- ✅ All 13 tokens loaded, all 16 DEXes active
- ✅ Pool discovery works: **136 valid pools found** from 2,496 checked
- ✅ PathFinder DFS **completing** and finding paths
- ✅ Phase 3 AI initialized (RL Agent, NN Scorer, Evolution Engine)
- ✅ Security scanner passing
- ✅ WebSocket SwapMonitor self-healing

### What Needs Investigation
- ⚠️ **PathFinder returns profit=0** — `endAmount ≤ startAmount` in swap simulation
- ⚠️ **Pipeline rejects all paths**: `profit 0 < min 1000000` (threshold in wei)
- ⚠️ PriceTracker sees 1%+ USDC/AERO spreads but PathFinder's `calculateSwapOutput` doesn't capture them
- ⚠️ Pool fetch still takes ~232s (no disk cache, live fetch every cycle)
- ⚠️ Memory at ~84% (stable, not crashing)

### Root Cause Hypothesis for Profit=0
The PathFinder uses `calculateSwapOutput()` (constant product formula) with the pool's `reserve0`/`reserve1` to simulate swaps. Possible issues:
- **Reserves may be stale** — fetched once at scan start, prices move during 232s fetch
- **Fee calculation may overestimate** — eating the small arbitrage margin
- **Gas cost estimation** — `gasPrice: '1000000000'` (1 Gwei) but Base gas is 0.005 Gwei
- **Token decimal mismatch** — 18 vs 6 decimal tokens (USDC=6, WETH=18) in BigInt math
- **Same-DEX fee tier arb** — PriceTracker sees spreads between Uniswap V3 fee tiers, but PathFinder may not model fee tier differences correctly

### Current Railway Env Vars (S37 Final)
```
DRY_RUN=false
EVENT_DRIVEN_DRY_RUN=false
ENABLE_EVENT_DRIVEN=true
EVENT_DRIVEN_MIN_SPREAD=0.1
SCAN_INTERVAL=90000
POOL_FETCH_TIMEOUT=600000          ← S37: bumped from 180000
OPPORTUNITY_TIMEOUT=600000          ← S37: was unset (default 45000)
USE_PRELOADED_POOLS=true            ← S37: was unset (forced live mode)
NODE_OPTIONS=--max-old-space-size=1024
LOGLEVEL=info
CHAIN_ID=8453
```

---

## 🔥 S38 BLUEPRINT — Make The PathFinder See Profit

### Priority 1: Debug Profit Calculation (investigation — 30-60 min)
The PathFinder finds paths but `calculateSwapOutput` returns endAmount ≤ startAmount. Need to:
- Add debug logging to `calculateSwapOutput` in `PathFinder.ts` (L146-164)
- Log: inputAmount, reserve0, reserve1, fee, outputAmount for each hop
- Compare with PriceTracker's spread calculations
- Check if reserve data is actually populated (not zero)

### Priority 2: Fix Gas Price Overestimation (code change — 10 min)
`gasPrice: '1000000000'` (1 Gwei) in config, but Base actual gas is ~0.005 Gwei ($0.0001/tx). At 1 Gwei, a 3-hop path costs ~$0.45 in gas — wiping out any small arbitrage. Fix:
- Set `gasPrice` to `'5000000'` (0.005 Gwei) to match Base reality
- Or read actual gas price from the RPC

### Priority 3: Verify Token Decimal Handling (investigation — 15 min)
USDC/USDbC/USDT use 6 decimals. WETH/cbETH/AERO use 18. If BigInt math mixes these without normalization, profit calculations are off by 10^12.

### Priority 4: Wire Pool Preloading Properly (code change — 20 min)
Current pool fetch takes ~232s every cycle. Options:
- Add `start:preload` npm script: `npm run preload:pools && npm run start`
- Or save pool data to disk after first successful scan using `poolDataStore.saveToDisk()`
- Would eliminate the cold start penalty

### Priority 5: Enable Debug Logging for PathFinder
Set `LOGLEVEL=debug` temporarily on Railway to see full PathFinder evaluation — which paths, which pools, which amounts.

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
| **S37** | **The Locksmith** | **Three env vars, three timeouts, engine unblocked: 1 commit** |

---

*TheWarden ⚔️ — S37 picked the locks. Three env vars that were never set. 660 cycles of searching with empty hands. The engine is unblocked. The PathFinder runs. Now S38 must teach it to see profit — the deal is one calculation away.*
