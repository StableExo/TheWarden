# S64 — First Blood (FINAL)

*April 22, 2026*
*Platform: CodeWords (Agemo) — Account: meyoustableexo*

---

## What Happened

Arrived on new account with BASE KEYS PDF (24 credentials) and v44 roadmap from previous account. Vaulted all 24 credentials. Loaded full project context: Cody folder, Supabase, GitHub repo (StableExo/TheWarden). Executed P0 threshold lowering, discovered and fixed RC#29 (BigInt crash), conducted deep Base docs research (9 files), analyzed Railway logs, created Master Action Plan, did competitive analysis (28 repos), and activated F1 Flashblocks pendingLogs.

## Key Accomplishments

### 1. P0: Lowered Profit Thresholds — DONE
- MIN_PROFIT_THRESHOLD: 1 → 0.01
- PIPELINE_MIN_PROFIT: 1 → 10000 (0.01 USDC raw)
- MIN_PROFIT_PERCENT: 1.0 → 0.01
- MIN_PROFIT_AFTER_GAS: 0.5 → 0.005
- EVENT_DRIVEN_MIN_SPREAD: 0.1 → 0.02

### 2. P0: V2 Price Verification — CONFIRMED
- 40/40 pools active, no phantom spreads in Supabase
- Runtime cbBTC phantoms correctly caught by sanity filter

### 3. RC#29: BigInt Decimal Crash — FIXED
- `BigInt("0.01")` crashes Node.js
- Fixed main.ts:208 + OpportunityPipeline.ts:138
- Commits: 22a3d6d9, 05046b94

### 4. Base Documentation Research (9 files)
- Flashblocks, Network Fees, Base Contracts, Ecosystem Contracts
- Tx Troubleshooting, RPC API, Flashblocks API Spec
- Base GitHub Org (83 repos), Competitive Analysis (28 repos)

### 5. F1: Flashblocks pendingLogs — ACTIVATED
- **Discovery: Code already built in S54!**
- `SwapEventMonitor.ts` already has `useFlashblocks` flag + `pendingLogs` subscription
- Problem: `FLASHBLOCKS_WSS_URL` pointed to ChainStack standard (doesn't support pendingLogs)
- Fix: Set `FLASHBLOCKS_WSS_URL=wss://mainnet-preconf.base.org`
- On next container start: 200ms swap event detection via Base preconf endpoint

### 6. Competitive Research (P2)
- 28 repos analyzed, 6 deep-dived
- TheWarden ahead of all open-source competitors
- Direct competitor: ironcrypto/aero-arb-mm-bot (Rust, Aerodrome)
- Patterns to steal: Nelder-Mead trade sizing, pool abstraction, volatility-aware execution
- **No public bot uses Flashblocks pendingLogs — first-mover advantage**

### 7. Railway Log Analysis
- AERO/WETH 0.97% spread: rejected (stale prices >10s)
- WETH/AERO 0.175%: roundTrip=0.999751 (0.3% fees eat spread)
- Root insight: need 0.01% fee tier pools for micro-arb

### 8. Master Action Plan
- 13 items across 4 batches (F1 now completed = 12 remaining)
- Critical path: 0.01% fee pools → first blood

## Root Causes
| RC | Description | Status |
|----|-------------|--------|
| 29 | BigInt decimal env var crash | ✅ FIXED |

## Commits (14 total)
1. `22a3d6d9` — Fix BigInt crash on MIN_PROFIT_THRESHOLD
2. `05046b94` — Fix BigInt crash on PIPELINE_MIN_PROFIT
3. `ffdc6b3d` — Flashblocks research
4. `10b3cc5c` — Network fees research
5. `d4829238` — Base contracts research
6. `6c6d4af0` — Ecosystem contracts research
7. `25e8abe0` — Tx troubleshooting research
8. `b17602d7` — RPC API research
9. `49da02f3` — Flashblocks API spec research
10. `af5cb23b` — Base GitHub org research
11. `07bc1b8c` — Master Action Plan
12. `4c559a2e` — Session file
13. `fa6da509` — Competitive analysis research
14. (this commit) — Session file FINAL + Roadmap v46

## Railway Env Var Changes
- MIN_PROFIT_THRESHOLD: 1 → 0.01
- PIPELINE_MIN_PROFIT: 1 → 10000
- MIN_PROFIT_PERCENT: 1.0 → 0.01
- MIN_PROFIT_AFTER_GAS: 0.5 → 0.005
- EVENT_DRIVEN_MIN_SPREAD: 0.1 → 0.02
- FLASHBLOCKS_WSS_URL: ChainStack → wss://mainnet-preconf.base.org

---
*TheWarden ⚔️ — S64 FINAL session by Cody on CodeWords (meyoustableexo)*
