
---

## ✅ S45 — The Conqueror (COMPLETE — 7 commits)

*(See THEWARDEN-SESSION-ROADMAP-v22 for full S45 details)*

---

## ✅ S46 — The Optimizer (COMPLETE — 10 commits)

### Theme: Memory crisis + execution tuning + road to First Blood

---

### 🔴 P0 — Memory Crisis (92.5% → target <60%) ✅ COMPLETE

#### Pool Cache TTL + Eviction ✅
- ✅ 1248 pools cached with no TTL or eviction → FIXED
- ✅ Added LRU eviction — MAX_POOL_CACHE_SIZE=600, removes oldest when over cap
- ✅ Only keep pools with >$10K liquidity in hot cache (MIN_LIQUIDITY_THRESHOLD=1e16)
- ✅ Increased cache TTL from 1min → 5min (reduces RPC calls)
- 📝 Commit: `087989db` — Pool cache LRU eviction + 5min TTL + liquidity filter

#### Reduce Scanner Token Set ✅
- ✅ Was scanning 13 tokens × 16 DEXes → NOW 5 tokens (Balancer whitelist)
- ✅ Added BALANCER_WHITELIST with verified borrow tokens (WETH/USDC/DAI/USDbC/USDT)
- ✅ getScanTokens() defaults to whitelist — other tokens still appear as middle hops
- ✅ Override: SCAN_ALL_TOKENS=true for full discovery mode
- 📝 Commit: `2f8035b2` — Scanner token reduction (13→5 tokens)

#### Increase Node.js Heap Limit ✅ (Already done)
- ✅ `--max-old-space-size=256` already in package.json start script
- ✅ Railway also has NODE_OPTIONS set

#### Heartbeat Starvation Fix ✅ (Mitigated)
- ✅ Scan cycle dramatically shorter with 5 tokens instead of 13
- 🔲 Future: setImmediate() batching or worker thread if still needed

---

### 🔵 P2 — Infrastructure ✅ MOSTLY COMPLETE

#### Revert Dockerfile ✅
- ✅ Removed `start-with-deploy.sh` wrapper (S44 deploy complete)
- ⚠️ `npm prune --omit=dev` reverted — tsx needed at runtime
- 📝 Commits: `2de15a0b`, `e171b8cf` (hotfix)

#### Wallet Balance Warning ✅
- ✅ EOA balance=0 no longer marks system as "degraded" in gasless mode
- 📝 Commit: `8c130d3d`

#### Vercel Account Migration ✅ (UNPLANNED)
- ✅ Migrated from stableexo → metalxalloy-4309
- ✅ Fixed postcss/tailwind .ts→.js build error
- ✅ Live at: https://the-warden-alpha.vercel.app

#### Tenderly RPC Rotation ✅ (UNPLANNED)
- ✅ Old Tenderly key returned 403 Forbidden → crash loop
- ✅ Updated 5 Railway env vars via API
- ✅ New Tenderly node: base.gateway.tenderly.co/1IbS4S5LFFiqTW0TpJwyGb

---

## 🔲 S47 — The Blade (NEXT)

### Theme: Execution tuning + First Blood

### 🔴 P0 — Execution Fixes
- 🔲 Gas estimation revert: Skip eth_estimateGas when UserOp mode active
- 🔲 Min profit threshold: Lower from 1 USDC → 0.10 USDC for gasless mode
- 🔲 First successful on-chain flash loan execution ("First Blood")

### 🟡 P1 — Revenue Expansion
- 🔲 Profit withdrawal mechanism: Smart Wallet → EOA sweep
- 🔲 Dynamic borrow amount sizing (pool liquidity based)
- 🔲 SushiSwap V3 factory mapping

### 🔵 P2 — Discovery
- 🔲 Identify unknown factory 0x0fd83557b2be0f0c0f1bd28aaa0c6c4de82eb00c
- 🔲 Evaluate moving tsx to production deps (smaller container)

---

## 📦 Cody Journal

| Entry | Title | Session |
|-------|-------|---------|
| **S46** | **The Optimizer** | **Memory LRU + token whitelist + Vercel/Tenderly rotation: 10 commits** |
| S45 | The Conqueror | 7 layers, 7 commits — multi-factory + Balancer whitelist |
| S44 | The Blacksmith | Gas fix + multi-router deployed: 5 commits |
| S43 | The Cartographer's Map | Factory fix + multi-router compiled: 7 commits |
| S42 | The Executioner | SwapRouter V1→V2 fix: 3 commits |

---

### Contract Registry
| ID | Contract | Address | Status |
|----|----------|---------|--------|
| 2 | FlashSwapV2 | `0x54658E5758FA81a3C0DcC78D707391be4b494177` | 🔒 Retired |
| 12 | FlashSwapV3 (Single-Router) | `0x3d4bf8ece669b827ed3ac3e15c06c3701b8ab1fb` | 🔒 Retired |
| **13** | **FlashSwapV3 (Multi-Router)** | **`0x00558d994dec27f1df60ca90fec8ab45e8a62eaa`** | **✅ Active** |

---

*TheWarden ⚔️ — The Optimizer sharpened the blade — less memory, faster scans, cleaner containers, new Vercel home, fresh Tenderly keys. The Blade session will draw First Blood.*
