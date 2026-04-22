# S64 — First Blood (Session on meyoustableexo)

*April 22, 2026*
*Platform: CodeWords (Agemo) — Account: meyoustableexo*

---

## What Happened

Arrived on new account with BASE KEYS PDF (24 credentials) and v44 roadmap from previous account (ohyastableexo). Vaulted all 24 credentials. Loaded full project context: Cody folder (39→47 files), Supabase, GitHub repo (StableExo/TheWarden). Executed P0 threshold lowering, discovered and fixed RC#29 (BigInt crash), conducted deep Base docs research (8 files), analyzed Railway logs, and created Master Action Plan.

## Key Accomplishments

### 1. P0: Lowered Profit Thresholds
- MIN_PROFIT_THRESHOLD: 1 → 0.01
- PIPELINE_MIN_PROFIT: 1 → 10000 (0.01 USDC raw)
- MIN_PROFIT_PERCENT: 1.0 → 0.01
- MIN_PROFIT_AFTER_GAS: 0.5 → 0.005
- EVENT_DRIVEN_MIN_SPREAD: 0.1 → 0.02

### 2. P0: V2 Price Verification — CONFIRMED
- 40/40 pools active in Supabase
- 3 pools with stored reserves show correct prices (USDC/USDbC ≈1:1, WETH/USDC ≈3300)
- No phantom 200% spreads in Supabase data
- Remaining phantom spreads are runtime cbBTC issues (C2 in action plan)

### 3. RC#29: BigInt Decimal Crash — FIXED
- `BigInt("0.01")` crashes Node.js — decimal strings invalid for BigInt()
- Fixed main.ts:208 + OpportunityPipeline.ts:138
- Wrapped with `BigInt(Math.floor(parseFloat(...)))`
- Commits: 22a3d6d91673, 05046b945dc9
- Railway deploy: SUCCESS after fix

### 4. Base Documentation Research (8 files)
Comprehensive research from docs.base.org:
- **Flashblocks**: 200ms sub-blocks, op-rbuilder, preconfirmations
- **Network Fees**: 0.005 gwei min, EIP-1559 params, GasPriceOracle
- **Base Contracts**: Full L2/L1 contract registry
- **Ecosystem Contracts**: Official Uniswap V2/V3, Multicall3, Permit2
- **Tx Troubleshooting**: 25M gas cap, fee formula, DA throttling
- **RPC API**: Flashblocks WSS endpoints, pendingLogs, eth_simulateV1
- **Flashblocks API Spec**: Object format, 3-phase integration blueprint
- **Base GitHub Org**: 83 repos, tiered by relevance

### 5. Railway Log Analysis
- Real opportunities: AERO/WETH 0.97% spread (rejected: stale prices)
- WETH/AERO 0.175% evaluated through pipeline → roundTrip=0.999751 (0.3% fees eat spread)
- **Root insight**: Need 0.01% fee tier pools for micro-arb to work
- cbBTC phantom 200% spreads correctly rejected by sanity filter

### 6. Master Action Plan Created
- 13 action items across 4 execution batches
- Critical path: discover 0.01% fee pools → add to arsenal → first blood
- Flashblocks integration blueprint (3 phases)
- Filed as Cody/S64_MASTER_ACTION_PLAN.md

## Credentials — 24 Vaulted on New Account
GitHub, Supabase, Vercel, ChainStack, ThirdWeb, Coinbase, Tenderly, Railway, Alchemy

## Deploy Results
- ✅ Bot ran with lowered thresholds (detected opportunities)
- ✅ RC#29 fix deployed successfully
- ⚠️ No profitable trade yet — 0.3% fee pools need >0.65% spread
- 🛑 Container stopped at end of session to save free-tier resources

## Root Causes
| RC | Description | Status |
|----|-------------|--------|
| 29 | BigInt decimal env var crash | ✅ FIXED |

## Commits (10 total)
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

---
*TheWarden ⚔️ — S64 session by Cody on CodeWords (meyoustableexo)*
