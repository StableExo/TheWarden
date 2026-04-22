# S65 — The Prospector ⛏️
## TheWarden Session Log | April 22, 2026

---

## Mission: S65 Batch 1 — Quick Wins (ALL COMPLETE ✅)

### I2: Low-Fee Pool Discovery (CRITICAL PATH) ✅
| Metric | Before (S64) | After (S65) | Change |
|--------|-------------|-------------|--------|
| Total Pools | 40 | **64** | +60% |
| 1bps Pools | 3 | **13** | 4.3x |
| 5bps Pools | 7 | **21** | 3x |
| Low-Fee Total | 10 | **34** | 3.4x |
| DEXes | 5 | **7** | +2 new |
| Min Spread | >0.65% | **>0.02%** | 32x lower |

#### DEXes Scanned
| DEX | Factory | Type | Pools Found | New Added |
|-----|---------|------|-------------|-----------|
| Uniswap V3 | `0x33128a8f...` | CL | 24 | 3 (+1 fee fix) |
| PancakeSwap V3 | `0x0BFbCF9f...` | CL | 23 | 9 |
| Aerodrome V2 | `0x420DD381...` | Solidly | existing | 0 (already mapped) |
| HydreX | `0x36077D39...` | Algebra | 6 | 6 (registered dex_id=16) |
| QuickSwap V4 | `0xC5396866...` | Algebra | 8 | 4 (registered dex_id=17) |
| Alien Base V3 | `0x0Fd83557...` | UniV3 Fork | 3 | 2 (registered dex_id=20) |
| BaseSwap | existing | V2 | existing | 0 |

#### Key Discoveries
1. **USDC/USDT at 1bps on 3 DEXes** — UniV3 (620T liq), PCS V3 (1,054T liq), Aerodrome
2. **Same-pair cross-DEX arb** — Round-trip fee just 0.02% for stablecoin pairs
3. **Fee data bug fixed** — Pool #200 stored as 5bps, actually 1bps (corrected)
4. **3 new DEXes registered** — HydreX, QuickSwap, Alien Base

### C1: Fix Stale Price Rejection ✅
- **Root Cause:** `PIPELINE_MAX_PRICE_AGE = 10000` (10s) in Railway — too tight
- **Fix:** Updated to `30000` (30s) via Railway API
- **Verified:** Confirmed via Railway GraphQL query
- **Note:** With Flashblocks at 200ms, actual price age <1s; 30s is safety buffer

### I1: Check Provider Flashblocks Support ✅
| Provider | Pending Block | Flashblocks WSS | Verdict |
|----------|--------------|-----------------|---------|
| Alchemy | ✅ 123 txns | ❌ | Standard pending only |
| ChainStack | ✅ 147 txns | ❌ | Standard pending only |
| Tenderly | ✅ 43 txns | ❌ | Standard pending only |
| Base Public | — | ✅ | Only Flashblocks source |

**Finding:** Current config is optimal. `wss://mainnet-preconf.base.org` is the only Flashblocks endpoint. 
For dedicated/rate-unlimited access, need Base/Coinbase team relationship.

### ~~P1-A: Railway Hobby Upgrade~~ (REMOVED from plan)

---

## Account Migration
- Migrated from meyoustableexo → itsbackstableexo
- 29 credentials vaulted in CodeWords secrets
- All Supabase data intact (217 tables, 172 memory entries)

## Session Stats
- New pools added: 24 total across 5 DEXes
- Fee correction: 1 pool (#200: 5bps → 1bps)
- DEX registrations: 3 new (HydreX, QuickSwap, Alien Base)
- Railway env update: 1 (PIPELINE_MAX_PRICE_AGE)
- GitHub commits: 3 files (arsenal + session log + roadmap)

*TheWarden ⚔️ — The prospector has struck gold. 34 low-fee pools, 0.02% breakeven. First blood awaits.*
