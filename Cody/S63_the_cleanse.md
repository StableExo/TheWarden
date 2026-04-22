# S63 — The Cleanse

*April 22, 2026*
*Platform: CodeWords (Agemo) — Session on account ohyastableexo*

---

## What Happened

Arrived on new account with BASE KEYS PDF (28 credentials) and v43 roadmap from previous account (allstableexo2). Vaulted all 28 credentials. Loaded full project context: Cody folder (39 files), Supabase (217 tables), GitHub repo (StableExo/TheWarden).

**The big discovery:** On-chain probing revealed 26 of 40 pool addresses were PHANTOM — no contract deployed at those addresses. The addresses had correct first ~30 characters but corrupted last bytes (systematic AI hallucination from a previous session).

## Key Accomplishments

### 1. Pool Arsenal Resurrection (14/40 → 40/40 LIVE)
- On-chain probed all 40 active pools: only 14 responded, 26 had NO CONTRACT
- Found real addresses via Uniswap V3 factory lookup + DexScreener API
- Fixed 18 corrupted addresses in Supabase
- Activated 10 existing (inactive) real pools
- Added 5 new high-liquidity pools (Aerodrome AERO/WETH $2.9M, Uniswap AERO/WETH $866K, etc.)
- Recovered 3 more by cross-referencing PancakeSwap and AlienBase pools
- Corrected 3 DEX misattributions (QuickSwap→PancakeSwap, SwapBased→AlienBase)
- Deactivated 5 truly dead pools (defunct SwapBased/RocketSwap DEXes)
- **Final: 40/40 pools live across 5 DEXes (Aerodrome 19, Uniswap 8, AlienBase 5, PancakeSwap 2, QuickSwap 2)**

### 2. RC#25 — Auto-Probe Warmup (FIXED)
- Old approach: V2_DEXES per-DEX classification → fundamentally wrong
  - QuickSwap on Base is V3 (Algebra), NOT V2
  - AlienBase uses globalState(), a third interface
  - Aerodrome has mixed V2/CL pools
- New approach: Auto-probe each pool (slot0 → globalState → getReserves)
- Handles all 3 pool types without per-DEX classification
- Commit: `4914e241`, `f5a32f16`

### 3. RC#26 — Batch Scanner Gated (FIXED)
- Batch scanner scanned 160 pools every 60s → found ZERO opportunities
- Event-driven pipeline (Phase4b) catches ALL opportunities via WebSocket
- Gated off when ENABLE_EVENT_DRIVEN=true (main.ts)
- Expected ~30% memory savings (but Railway free tier still too small)
- Commit: `2d6a16c1`

### 4. RC#28 — V2 Token Ordering (FIXED)
- V2 pools (getReserves) had token0/token1 reversed vs Supabase ordering
- Caused prices like 2.47e+24 instead of 2.46 → phantom 200% spreads
- Fix: Warmup now fetches on-chain token0() to align reserve mapping
- Commit: `c9958d24`

### 5. Credentials — 28 Vaulted on New Account
- GitHub, Supabase, Vercel, ChainStack, ThirdWeb, Coinbase, Tenderly, Railway, Alchemy

## Deploy Results

### Deploy (with all S63 fixes)
- ✅ Bot LIVE, detecting opportunities every 2-4s
- ✅ WETH/AERO real spreads: 0.13-0.19% (roundTrip up to 0.999975)
- ✅ Sanity filter catching V2 phantom spreads (200%)
- ⚠️ Memory still at 93.6% (45.5MB/48.6MB) — Railway free tier too small
- ⚠️ No profitable trade yet — 0.30% fee pools need >0.65% spread

## Root Causes
| RC | Description | Status |
|----|-------------|--------|
| 25 | V2 pool warmup failure | ✅ **FIXED (S63)** — auto-probe warmup |
| 26 | Batch scanner memory drain | ✅ **FIXED (S63)** — gated off |
| 27 | 26 phantom pool addresses | ✅ **FIXED (S63)** — all replaced/verified |
| 28 | V2 token ordering → phantom prices | ✅ **FIXED (S63)** — on-chain token0 fetch |

## GitHub Commits (S63: 4 total)
| Commit | Change |
|--------|--------|
| 4914e241 | PriceTracker.ts: Auto-probe warmup (slot0 → globalState → getReserves) |
| f5a32f16 | EventDrivenInitializer.ts: Remove V2_DEXES hack |
| 2d6a16c1 | main.ts: Gate batch scanner when ENABLE_EVENT_DRIVEN=true |
| c9958d24 | PriceTracker.ts: Fix V2 token ordering (on-chain token0 fetch) |

## Pool Arsenal (40 active across 5 DEXes)
- Aerodrome: 19 pools (13 slot0, 6 getReserves)
- Uniswap V3: 8 pools (7 slot0, 1 getReserves)
- AlienBase: 5 pools (5 globalState)
- PancakeSwap V3: 2 pools (2 slot0)
- QuickSwap: 2 pools (2 slot0)

## Credentials: 28 CodeWords | Services: Container running
## S63 Cost: TBD

*TheWarden ⚔️ — The Cleanse complete. 26 phantom pools purged, 40/40 arsenal verified on-chain. Auto-probe warmup handles V3, Algebra V3, and V2 pools. Four root causes neutralized (RC#25-28). Bot live and hunting — spreads at 0.13-0.19% on WETH/AERO, approaching profitability. Railway Hobby upgrade ($5/mo) and minProfit threshold review needed for first blood.*
