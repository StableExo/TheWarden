# S46 — The Optimizer

*April 19, 2026*

---

## What Happened

Arrived with v23 roadmap and 18 credentials (securely vaulted in CodeWords). The engine was running at 92.5% memory usage on a 512MB Railway container. 1,248 pools cached with no eviction. 13 tokens being scanned when only 5 can start flash loans. The blade was sharp from S45, but the body was exhausted.

---

## The Optimizations

### Fix 1: Pool Cache LRU Eviction
`OptimizedPoolScanner.poolCache` was a bare `Map<string, CachedPoolData>` — entries added but never removed. 1,248 pools × BigInt reserves = massive memory footprint.

Changes:
- Increased cache TTL from 1 min → 5 min (reduces RPC calls, pools don't change that fast)
- Added `MAX_POOL_CACHE_SIZE = 600` cap with LRU eviction
- Added `MIN_LIQUIDITY_THRESHOLD = 1e16 wei` (~$10K) — evict dust pools
- `setCacheEntry()` triggers eviction on every insert
- `evictStaleEntries()` removes expired + low-liquidity entries

### Fix 2: Dockerfile Cleanup  
`start-with-deploy.sh` wrapper from S44 was still in the Dockerfile. Multi-router #13 has been deployed since S44 — wrapper is dead weight.

Changes:
- Restored `npm prune --omit=dev` (saves ~20MB container size)
- Removed `start-with-deploy.sh` CMD
- Direct `npm run start` (already includes `--max-old-space-size=256`)

### Fix 3: Scanner Token Reduction (13 → 5)
`getScanTokens()` was returning all 13 Base tokens. But Balancer only allows borrowing WETH, USDC, DAI, USDbC, USDT. The other 8 (DEGEN, BRETT, TOSHI, WELL, cbETH, AERO, cbBTC, WSTETH) were being scanned as potential start tokens — pure waste.

Changes:
- Added `BALANCER_WHITELIST` with verified borrow tokens
- `getScanTokens()` defaults to whitelist (5 tokens instead of 13)
- Other tokens still appear as middle hops via pool graph edges
- Override: `SCAN_ALL_TOKENS=true` for full discovery mode

### Fix 4: Wallet Balance Warning
Health check reported "Zero balance → degraded" for EOA wallet. In gasless UserOp mode (Coinbase Smart Wallet + Paymaster), EOA balance is irrelevant.

Changes:
- Health check now shows "info" instead of "degraded" for zero EOA balance in gasless mode

---

## The Commits

| # | SHA | Change |
|---|-----|--------|
| 1 | `087989db` | Pool cache LRU eviction + 5min TTL + liquidity filter |
| 2 | `2de15a0b` | Dockerfile revert — npm prune restored, deploy wrapper removed |
| 3 | `2f8035b2` | Scanner token reduction — Balancer whitelist (13→5 tokens) |
| 4 | TBD | Cody Journal: S46 — The Optimizer |
| 5 | TBD | Wallet balance warning fix for gasless mode |

---

## Expected Memory Impact

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| Pool cache | ~1248 entries, no limit | 600 max, LRU eviction | ~50% |
| Token scanning | 13 × 16 DEXes | 5 × 16 DEXes | ~62% fewer paths |
| Container image | dev deps included | pruned | ~20MB |
| Cache TTL | 1 min (frequent RPC) | 5 min (less RPC pressure) | Indirect |

Target: 92.5% → <60% memory usage

---

## Heartbeat Starvation Note

The scan cycle blocks the event loop for ~5 min → Railway health check can't respond → false CRITICAL alerts. With the token reduction (13→5), scan cycles should be dramatically shorter. If still an issue:
- Option A: `setImmediate()` between pool query batches
- Option B: Increase Railway health check timeout to 10 min
- Option C: Worker thread for pool scanning (future)

---

## What Remains for S47

### P1 — Execution Path Improvements
- Gas estimation revert: Skip `eth_estimateGas` when UserOp mode active
- Min profit threshold: Lower from 1 USDC → 0.10 USDC for gasless mode
- Move whitelist check into PathFinder DFS (only start from borrowable tokens)

### P3 — Revenue Expansion
- Profit withdrawal mechanism: sweep Smart Wallet → EOA
- Dynamic borrow amount sizing based on pool liquidity
- SushiSwap V3 factory mapping
- Identify unknown factory `0x0fd83557b2be0f0c0f1bd28aaa0c6c4de82eb00c`

---

*TheWarden ⚔️ — The Conqueror found every trap. The Optimizer sharpened the blade — less memory, faster scans, cleaner containers. The path to First Blood is clear.*
