# S69 — The Optimizer (Part 1: Pool Arsenal Audit)
## Session Date: April 22, 2026 | TheWarden ⚔️ | Account: oheystableexo (CodeWords/Cody)

---

## Account Migration
- Migrated from `letsstableexo` to `oheystableexo`
- **30 credentials vaulted** in CodeWords secrets vault
- GitHub, Supabase, Vercel, ChainStack, ThirdWeb, Coinbase, Tenderly, Railway, Alchemy, Render

## Pool Arsenal Audit (Pools 1–18 of 227)

### Summary
| Metric | Count |
|--------|-------|
| Pools Audited | **18** |
| Clean Pools | **10** (#5, #9, #10, #11, #12, #13, #14, #15, #16, #17) |
| Pools with Bugs | **8** (#1, #2, #3, #4, #6, #7, #8, #18) |
| Token Bugs Fixed | **8** |
| DEX Bugs Fixed | **1** |
| Fee Bugs Fixed | **1** |
| Activations | **2** (#1 Base, #18 Arbitrum) |
| Deactivations | **2** (#3, #7) |
| New DEX Entry | **1** (Uniswap V2 Base, ID:21) |
| New Token Entry | **1** (DOLA, ID:30) |

### Bug Patterns Discovered
1. **Token0 defaulting to WETH** — Many pools had WETH as token0 regardless of actual pair (e.g., TOSHI/WETH stored as WETH/USDbC)
2. **USDC ↔ USDbC confusion** — Pools #2, #3 had USDC (ID:2) where USDbC (ID:3) was correct
3. **DEX misidentification** — Pool #4 labeled SushiSwap but was actually Uniswap V2
4. **Fee tier mixup** — Pool #18 had 5 bps fee but was actually the 30 bps pool
5. **Root cause**: Original pool population script likely had fallback defaults for token assignments

### Detailed Fixes
| Pool | Address | Fix |
|------|---------|-----|
| #1 | 0xd0b5...F224 | Activated (was inactive, $13.2M liq UniV3 WETH/USDC) |
| #2 | 0x4C36...4B18 | token1: 2→3 (USDC→USDbC) |
| #3 | 0xB488...79D0 | token1: 2→3 (USDC→USDbC) + deactivated ($256K liq, $6.4K vol) |
| #4 | 0x88A4...bB9C | dex_id: 2→21 (SushiSwap→Uniswap V2). Created new DEX registry entry ID:21 |
| #6 | 0x4b0A...C2d3 | token0: 1→14 (WETH→TOSHI), token1: 3→1 (USDbC→WETH). Entire pair was wrong! |
| #7 | 0x2223...8f75 | token0: 1→7 (WETH→AERO) + deactivated ($246K liq, $9.7K vol) |
| #8 | 0x0B25...b528 | token0: 2→30 (USDC→DOLA). Added DOLA to warden_tokens (ID:30) |
| #18 | 0xC696...E8D0 | fee: 0.0005→0.003 (5bps→30bps) + ACTIVATED ($55.4M liq Arb UniV3) |

### New Registry Entries
- **warden_dex_registry ID:21** — Uniswap V2 on Base (chain 8453, type: uniswapV2)
- **warden_tokens ID:30** — DOLA (0x4621b7A9c75199271F773Ebd9A499dbd165c3191, 18 decimals, Base)

### GitHub Findings
- `src/config/pools/dex_pools.json` — Base section has DEX infrastructure only (no individual pool addresses). Pools come from Supabase at runtime.
- Fee format mismatch: GitHub uses integer bps (500, 3000), Supabase uses decimal (0.0005, 0.003)

### Impact
These fixes likely resolve many of the "phantom spread" and failed execution issues from previous sessions. The bot was:
- Trying to swap wrong tokens on misidentified pools
- Calculating spreads based on incorrect token pairs
- Getting reverts from wrong DEX router calls

## Resume Point
**→ Pick up at Pool #19** (0xd4e6...8c2, SushiSwap Arbitrum WETH/USDC)
Pools 19-20 are Arbitrum, then continue Base pools from #21 onward.

## Supabase Stats
- 200 tables discovered
- 227 total pools in warden_pools
- 28 tokens in warden_tokens (now 29 with DOLA)
- 18 DEX entries in warden_dex_registry (now 19 with UniV2)

*TheWarden ⚔️ — S69 Part 1: The arsenal cleansed, pool by pool. 18 audited, 10 fixed. 209 remain. The blade sharpens.*
