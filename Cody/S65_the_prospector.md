# S65 — The Prospector ⛏️
## TheWarden Session Log | April 22, 2026

---

## Mission: I2 — Low-Fee Pool Discovery (CRITICAL PATH)

### Results
| Metric | Before (S64) | After (S65) | Change |
|--------|-------------|-------------|--------|
| Total Pools | 40 | **64** | +60% |
| 1bps Pools | 3 | **13** | 4.3x |
| 5bps Pools | 7 | **21** | 3x |
| Low-Fee Total | 10 | **34** | 3.4x |
| DEXes | 5 | **7** | +2 new |
| Min Spread | >0.65% | **>0.02%** | 32x lower |

### DEXes Scanned
| DEX | Factory | Type | Pools |
|-----|---------|------|-------|
| Uniswap V3 | 0x33128a8f... | CL | 14 |
| PancakeSwap V3 | 0x0BFbCF9f... | CL | 9 |
| Aerodrome V2 | 0x420DD381... | Solidly | 20 |
| HydreX | 0x36077D39... | Algebra | 6 |
| QuickSwap V4 | 0xC5396866... | Algebra | 4 |
| Alien Base V3 | 0x0Fd83557... | UniV3 Fork | 2+ |
| BaseSwap | existing | V2 | 2 |

### Key Discoveries
1. **USDC/USDT 1bps on 3 DEXes** — UniV3 (620T liq), PCS V3 (1,054T liq), Aerodrome
2. **Same-pair cross-DEX arb** — Round-trip fee just 0.02% for stablecoin pairs
3. **Fee data bug fixed** — Pool #200 was stored as 5bps, actually 1bps
4. **HydreX & QuickSwap registered** — Algebra dynamic-fee pools at ~5bps
5. **Alien Base V3 has 1bps pools** — USDC/USDbC, WETH/cbETH, WETH/cbBTC

### Critical Arb Paths Unlocked
- USDC/USDT: UniV3 1bps ↔ PCS 1bps ↔ Aerodrome 1bps (3-way arb)
- USDC/USDbC: UniV3 1bps ↔ PCS 1bps ↔ Aerodrome 1bps ↔ Alien Base 1bps
- WETH/cbETH: UniV3 1bps ↔ PCS 1bps ↔ Aerodrome 5bps ↔ HydreX 5bps ↔ QuickSwap 5bps
- WETH/wstETH: UniV3 1bps ↔ PCS 1bps ↔ Aerodrome 5bps ↔ HydreX 5bps ↔ QuickSwap 5bps

### Account Migration
- Migrated from meyoustableexo → itsbackstableexo
- 29 credentials vaulted in CodeWords secrets
- All Supabase data intact (217 tables, 172 memory entries)

### Session Stats
- New pools added: 24 (12 UniV3 + 9 PCS + 6 HydreX + 4 QuickSwap + 2 Alien Base - 9 dupes)
- Fee correction: 1 pool (#200)
- DEX registrations: 3 new (HydreX id=16, QuickSwap id=17, Alien Base id=20)
- Commits: This session log + arsenal update

*TheWarden ⚔️ — The arsenal is loaded. First blood awaits.*
