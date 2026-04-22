# S65-S66 — The Prospector & Core Fixes ⛏️🔧
## TheWarden Combined Session Log | April 22, 2026

---

## S65 — The Prospector ⛏️ (COMPLETE)
### I2: Low-Fee Pool Discovery
- 7 DEXes scanned: UniV3, PCS V3, Aerodrome, HydreX, QuickSwap, Alien Base, BaseSwap
- 34 low-fee pools discovered (13×1bps + 21×5bps)
- Fee bug fixed: Pool #200 (5bps→1bps)
- 3 new DEXes registered in Supabase

### C1: Stale Price Fix
- PIPELINE_MAX_PRICE_AGE: 10s→30s via Railway API

### I1: Flashblocks Provider Check
- Alchemy/ChainStack/Tenderly: No Flashblocks support
- Public wss://mainnet-preconf.base.org is only source (already configured)

## S66 — Core Fixes 🔧 (3/4 DONE)
### C2: cbBTC Phantom Spreads
- 11 NULL reserve pools fixed (set to 0)
- 3 wrong-chain pools deactivated (Arbitrum labels on Base)

### C3: Wire New Pools in Codebase
- DEX_TYPE_MAP expanded 9→17 entries
- Added: PancakeSwap, HydreX, QuickSwap, Alien Base, BaseSwap
- Committed to OpportunityPipeline.ts

### Pool Cleanup
- Deactivated 13 pools total:
  - 7 non-Base / mislabeled pools
  - 3 duplicate cbBTC Aerodrome pools
  - 3 high-fee 100bps pools
- Final: 51 clean active pools

## Account
- Migrated: meyoustableexo → itsbackstableexo
- 29 credentials vaulted

## GitHub Commits
1. Cody/arsenal_64_pools_s65.json → arsenal data
2. Cody/S65_the_prospector.md → session log (this file)
3. Cody/ROADMAP_v48_S66.md → roadmap v48
4. src/monitoring/OpportunityPipeline.ts → DEX type mappings
5. Root roadmap updated

*TheWarden ⚔️ — Forged and cleaned. Ready for blood.*
