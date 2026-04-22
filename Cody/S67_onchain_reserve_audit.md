# On-Chain Flash Loan Reserves — Verified April 22, 2026
## Base Mainnet — Queried via Tenderly RPC

---

## AAVE V3 Pool (0xA238Dd80C259a72e81d7e4664a9801593F98d1c5)
Total reserves: 15 | Active: 13 | Frozen: 2

### ✅ ACTIVE (can flash loan)
| Token | Address |
|-------|---------|
| cbETH | 0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22 |
| USDbC | 0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca |
| wstETH | 0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452 |
| USDC | 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913 |
| weETH | 0x04c0599ae5a44757c0af6f9ec3b93da8976c150a |
| cbBTC | 0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf |
| ezETH | 0x2416092f143378750bb29b79ed961ab195cceea5 |
| LBTC | 0x6bb7a212910682dcfdbd5bcbb3e28fb4e8da10ee |
| AERO (virtual) | 0xecac9c5f704e954931349da37f60e39f515c11c1 |
| EURC | 0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42 |
| ??? | 0x63706e401c06ac8513145b7687a14804d17f814b |
| tBTC | 0x236aa50979d5f3de3bd1eeb40e81137f22ab794b |
| ??? | 0x660975730059246a68521a3e2fbd4740173100f5 |

### 🧊 FROZEN (CANNOT flash loan!)
| Token | Address | Note |
|-------|---------|------|
| **WETH** | 0x4200000000000000000000000000000000000006 | **CRITICAL: Most important token is FROZEN** |
| ??? | 0xedfa23602d0ec14714057867a78d01e94176bea0 | Unknown token |

### ❌ NOT LISTED (no reserve at all)
- AERO (0x0b3e32...) — the token that caused ReserveInactive
- DAI (0x50c572...) — may have been removed

## Balancer V2 Vault
- Address: 0xBA12222222228d8Ba445958a75a0704d566BF2C8
- Status: ✅ LIVE on Base (24,513 bytes)
- Fee: 0%
- Tokens: ALL tokens in Balancer pools (need to check which pools exist on Base)

## CRITICAL IMPLICATIONS
1. **WETH flash loans MUST use Balancer or UniV3** — NOT AAVE (FROZEN!)
2. **AERO flash loans** — Only UniV3 pool flash (not AAVE, likely not Balancer)
3. **USDC flash loans** — AAVE works (active) + Balancer (0% fee preferred)
4. **The whitelist we committed needs updating** — WETH should NOT be in AAVE whitelist

## Updated Flash Loan Strategy
| Token | Best Source | Fee |
|-------|-----------|-----|
| WETH | Balancer V2 → UniV3 pool | 0% → 0.05% |
| USDC | Balancer V2 → AAVE | 0% → 0.09% |
| cbBTC | AAVE (active) → Balancer | 0.09% → 0% |
| AERO | UniV3 pool ONLY | Pool fee tier |
| All others | Check Balancer → AAVE → UniV3 waterfall |
