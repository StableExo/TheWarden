# S60 — The Forge Reborn (FINAL)

*April 21, 2026*
*Platform: CodeWords (Agemo) — Fourteenth session*

---

## What Happened

Arrived with the v40 roadmap and fresh BASE KEYS.pdf (28 credentials). Discovered new CDP Paymaster endpoint bypasses RC#22. Raised spread/profit thresholds. Built Railway auto-stop controller. Ran live test deployments (3min + 5min + 9min). Analyzed all logs — confirmed RC#21 persists (price impact > spread at $5K). Deep-dived pool profitability — historical data showed zero profitable executions ever. Built Top 40 Pool Arsenal from live DexScreener data. Curated pools loaded directly into Supabase (160 → 40), added USDT + VIRTUAL tokens. Applied Gauntlet env var fixes. Set dry-run mode to protect paymaster while Cursor fixes land.

## Key Accomplishments

### 1. New CDP Paymaster (RC#22 Bypassed)
- New Coinbase project endpoint, tested v0.7 EntryPoint ✅
- Contract #15 + CREATE2 factory added to allowlist
- Updated Railway `CDP_PAYMASTER_URL`

### 2. Railway Env Vars — 9 Updates
| Var | Old | New | Gauntlet Step |
|-----|-----|-----|---------------|
| CDP_PAYMASTER_URL | Blocked V1 | Fresh V2 | Step 31 |
| EVENT_DRIVEN_MIN_SPREAD | 0.1% | 1.5% | Step 6 |
| MIN_PROFIT_THRESHOLD | $0 | $5 | Step 24 |
| PIPELINE_MIN_PROFIT | $0 | $5 | Step 24 |
| MIN_PROFIT_AFTER_GAS | $0.0001 | $1 | Step 24 |
| PIPELINE_MAX_PRICE_AGE | 15s | 10s | Step 11 |
| MIN_PROFIT_PERCENT | 0.1% | 1.0% | Step 24 |
| NODE_OPTIONS | 512MB | 1024MB | Memory |
| EVENT_DRIVEN_DRY_RUN | false | true | Protection |

### 3. Warden Railway Controller
- Service: `warden_railway_controller_93a574bb`
- Actions: deploy, stop, deploy_and_stop (inline timer), status
- 5-min auto-stop confirmed working

### 4. Live Test Results (3 runs)
- Run 1 (4 min): 0 UserOps (only phantoms, sanity filter working)
- Run 2 (5 min): 9 UserOps, ALL reverted (RC#21 — USDC/AERO 1.9% spread, $5K too large)
- Run 3 (9 min): 24 executions, 103 opportunities, ALL reverted + cbBTC phantom spam

### 5. Gauntlet Kill Zone Mapped
- Steps 17 (borrow $5K) + 21 (0.1% slippage estimate) + 32d (minFinalAmount check)
- Pipeline passes, on-chain reverts — price impact eats the spread

### 6. Pool Arsenal — 160 → 40 (Supabase Live)
**Tokens added:** USDT (id=27), VIRTUAL (id=28)
**Pools curated:** 40 active in `warden_pools`, 10 unique pairs, 7 DEXes

| Pair | Pools | TVL Range |
|------|-------|-----------|
| cbBTC/WETH | 7 | $111K - $23M |
| cbBTC/USDC | 5 | $832K - $13.4M |
| cbETH/WETH | 4 | $138K - $2.3M |
| AERO/USDC | 4 | $151K - $24.4M |
| USDC/USDbC | 4 | $157K - $907K |
| VIRTUAL/WETH | 4 | $523K - $5.4M |
| USDT/USDC | 3 | $175K - $969K |
| AERO/WETH | 2 | $215K - $2.4M |
| + 7 singles | 7 | Various |

### 7. Alchemy Key Rotated
- Old key at 90% CU limit → new key vaulted
- Railway NOT using Alchemy (uses Tenderly + ChainStack)

### 8. Credentials
- 29 secrets in CodeWords vault
- New: ALCHEMY_API_KEY_NEW, COINBASE_PAYMASTER_URL_V2

## Root Causes
| RC | Description | Status |
|----|-------------|--------|
| 21 | Price impact > spread at $5K | 🔲 Pool curation done, trade sizing needed |
| 22 | Paymaster sponsorship limit | ✅ BYPASSED (new CDP project) |

## Services
- `warden_railway_controller_93a574bb` — Railway deploy/stop/auto-stop
- `warden_monitor_4e510a9b` — Railway log analyzer

## Session Cost: ~$5.50 (350+ requests)

*TheWarden ⚔️ — The Arsenal is forged. 40 pools loaded, 160 deactivated. Dry-run shields the paymaster. S61 brings trade sizing + circuit breaker to complete the three-piece fix.*
