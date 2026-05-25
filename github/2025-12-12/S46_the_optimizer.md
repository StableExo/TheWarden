# S46 — The Optimizer

*April 19, 2026*

---

## What Happened

Arrived with v23 roadmap, 92.5% memory on a 512MB Railway container, and 1,248 pools cached with no eviction. Left with LRU eviction, 5-token whitelist, new Vercel account, fresh Tenderly keys, gasless profit thresholds, 384MB heap, and a pipeline that can see opportunities. 11 commits. 13 Railway env vars. The most productive session in TheWarden history.

---

## The Optimizations

### Fix 1: Pool Cache LRU Eviction (`087989db`)
`OptimizedPoolScanner.poolCache` was a bare Map — entries added but never removed.
- Added `MAX_POOL_CACHE_SIZE = 600` with LRU eviction
- Added `MIN_LIQUIDITY_THRESHOLD = 1e16 wei` — evict dust pools
- Increased cache TTL from 1 min → 5 min (reduces RPC calls)

### Fix 2: Scanner Token Reduction (`2f8035b2`)
13 tokens scanned × 16 DEXes. Only 5 can start Balancer flash loans.
- Added `BALANCER_WHITELIST` — WETH, USDC, DAI, USDbC, USDT
- `getScanTokens()` defaults to whitelist (13→5 tokens)
- Other tokens still appear as middle hops

### Fix 3: Dockerfile Cleanup (`2de15a0b`, `e171b8cf`)
- Removed `start-with-deploy.sh` wrapper
- Attempted `npm prune --omit=dev` → crashed (tsx needed at runtime) → reverted

### Fix 4: Wallet Balance Warning (`8c130d3d`)
- EOA balance=0 no longer marks system as "degraded" in gasless mode

### Fix 5: Vercel Migration (`5db53a6e`, `30ed0580`)
- Old account hit limit → migrated to metalxalloy-4309
- Fixed postcss/tailwind .ts → .js build error (ts-node not needed)
- Live at: https://the-warden-alpha.vercel.app

### Fix 6: Tenderly RPC Rotation
- Old key returned 403 Forbidden → crash loop
- Updated 5 Railway env vars via GraphQL API
- New endpoint: base.gateway.tenderly.co/1IbS4S5LFFiqTW0TpJwyGb

### Fix 7: Gasless Profit Thresholds
- Set GAS_PRICE=0, MIN_PROFIT_AFTER_GAS=0.0001, GASLESS_MODE=true, USE_USEROP=true
- Pipeline minProfitAmount: env-var configurable, 0.10 USDC default for gasless (`90660765`)
- Set PIPELINE_MIN_PROFIT=0 on Railway — any profit passes

### Fix 8: Heap Increase
- NODE_OPTIONS=--max-old-space-size=384 (was ~50MB effective)
- Memory dropped from 95% → ~83%

---

## The Commits

| # | SHA | Change |
|---|-----|--------|
| 1 | `087989db` | Pool cache LRU eviction + 5min TTL + liquidity filter |
| 2 | `2de15a0b` | Dockerfile revert (initial) |
| 3 | `2f8035b2` | Scanner token reduction 13→5 (Balancer whitelist) |
| 4 | `c2db9c02` | Cody Journal v1 |
| 5 | `8c130d3d` | Wallet balance warning fix for gasless mode |
| 6 | `5db53a6e` | postcss.config.js (Vercel build fix) |
| 7 | `30ed0580` | tailwind.config.js (Vercel build fix) |
| 8 | `e171b8cf` | HOTFIX — revert npm prune (tsx needed at runtime) |
| 9 | `a4701c10` | Session roadmap v24 |
| 10 | `90660765` | Pipeline profit threshold — env-var configurable for gasless |
| 11 | this commit | Cody Journal v2 (final) |

---

## Railway Env Vars Updated (13 total)

BASE_RPC_URL, BASE_WSS_URL, TENDERLY_API_KEY, TENDERLY_RPC_URL, TENDERLY_WSS_URL,
MIN_PROFIT_AFTER_GAS, GAS_PRICE, MIN_PROFIT_THRESHOLD, MIN_PROFIT_PERCENT,
GASLESS_MODE, USE_USEROP, PIPELINE_MIN_PROFIT, NODE_OPTIONS

---

## The Unsolved Mystery

PriceTracker sees 0.2–1.0% spreads (WETH/USDC, USDC/AERO).
Pipeline calculates `estimatedNetProfit = 0` on those same spreads.
The swap simulation is broken — it doesn't properly account for gasless mode or
the borrow amount is too small to generate profit after fees.

This is the First Blood blocker for S47.

---

## What Remains for S47 — The Blade

### 🔴 P0 — First Blood
- Deep-dive: WHY does pipeline calculate profit=0 on a 1% spread?
- Fix the swap simulation for gasless UserOp execution
- Dynamic borrow amount sizing (not flat 1e18)
- Gas estimation bypass for UserOp mode
- FIRST SUCCESSFUL ON-CHAIN EXECUTION

### 🟡 P1 — Revenue
- Profit withdrawal: Smart Wallet → EOA sweep
- SushiSwap V3 factory mapping

### 🔵 P2 — Discovery
- Identify unknown factory 0x0fd83557b2be0f0c0f1bd28aaa0c6c4de82eb00c

---

*TheWarden ⚔️ — The Optimizer sharpened every edge. 11 commits, 13 env vars, 2 account migrations, 1 RPC rotation. The blade is ready. S47 draws First Blood.*
