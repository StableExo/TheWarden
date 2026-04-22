# THEWARDEN — S64+ MASTER ACTION PLAN
## Updated: April 22, 2026 | TheWarden ⚔️
## Source: S64 session analysis + 8 research files from docs.base.org + Railway log analysis

---

## ✅ COMPLETED (S64 Session)

| # | Item | Details |
|---|------|---------|
| 1 | Credentials vaulted | 24 keys stored in CodeWords vault (new account) |
| 2 | P0: Lowered profit thresholds | MIN_PROFIT_THRESHOLD=0.01, PIPELINE_MIN_PROFIT=10000, MIN_PROFIT_PERCENT=0.01, MIN_PROFIT_AFTER_GAS=0.005, EVENT_DRIVEN_MIN_SPREAD=0.02 |
| 3 | P0: V2 price verification | No phantom 200% spreads in Supabase. 40/40 pools confirmed |
| 4 | RC#29: BigInt decimal crash | Fixed main.ts:208 + OpportunityPipeline.ts:138 — Math.floor(parseFloat()) wrapper |
| 5 | Research library | 8 files committed to Cody/ folder (Flashblocks, fees, contracts, RPC, GitHub) |
| 6 | Railway container stopped | Shut down to save free-tier resources |

---

## 🔴 CRITICAL — Fix Before Next Run

### C1: Stale Price Rejection (from logs)
**Problem:** AERO/WETH opportunities at 0.97% spread are being SKIPPED because `price age > 10000ms stale threshold`. Prices going stale at 10-28 seconds.
**Root Cause:** WebSocket event subscription on standard tier delivers events every 2s. Between events, prices drift stale. The staleness timer is too aggressive.
**Fix Options:**
- [ ] Option A: Increase stale threshold from 10s → 30s (quick)
- [ ] Option B: Switch to Flashblocks WSS for 200ms price updates (proper fix, see F1)
- [ ] Option C: Re-fetch price on-chain via `eth_call("pending")` before rejecting as stale
**Railway env var:** Likely `PRICE_STALE_THRESHOLD` or hardcoded — need to check
**Effort:** 🟢 Small (Option A) / 🟡 Medium (Option B/C)

### C2: Remaining Phantom 200% Spreads (cbBTC pools)
**Problem:** USDC/cbBTC and WETH/cbBTC pools on QuickSwap/Aerodrome still showing phantom 200% spreads. Sanity filter catches them, but they're noise.
**Root Cause:** These pools have `price=0` on one side — likely warmup didn't seed them (QuickSwap Algebra interface may need special handling).
**Fix:**
- [ ] Identify which specific pool addresses are causing the phantoms
- [ ] Either fix warmup probe for those pool types, or deactivate them in Supabase
**Effort:** 🟡 Medium

### C3: Pool Fee Tier Targeting
**Problem:** The 0.175% WETH/AERO opportunity was rejected because `roundTrip=0.999751` — the 0.3% pool fees (2× 0.3% = 0.6% round trip) eat the spread.
**Root Cause:** Most active pool pairs are in 0.3% fee tiers. The bot needs to target **0.01% and 0.05% fee tier** pools where micro-spreads become profitable.
**Fix:**
- [ ] Query Uniswap V3 factory for all 0.01% (1 bps) and 0.05% (5 bps) fee tier pools on Base
- [ ] Add high-liquidity 0.01% pools to the arsenal (USDC/USDT, USDC/USDbC, stablecoin pairs)
- [ ] Cross-reference with Aerodrome CL pools at low fee tiers
- [ ] Focus: stablecoin pairs where 0.02% spread > 0.02% round-trip fees = profit
**Effort:** 🟡 Medium

---

## 🟡 HIGH PRIORITY — P1 Items

### P1-A: Railway Hobby Upgrade ($5/mo → 512MB)
**Problem:** Memory at 93.6% on free tier (45.5MB/48.6MB). Container is fragile.
**Fix:**
- [ ] Upgrade Railway plan from Trial → Hobby ($5/mo)
- [ ] Use Railway API: `mutation { customerPlanUpdate(input: { plan: HOBBY }) }`
- [ ] Verify memory headroom increases to 512MB
**Effort:** 🟢 Small (API call)

### P1-B: V2 Swap Event Subscription
**Problem:** V2 pools (getReserves) don't emit the same Swap events as V3. The WebSocket only catches V3 swaps.
**Fix:**
- [ ] Add V2 Swap event topic (`Swap(address,uint256,uint256,uint256,uint256,address)`) to WSS subscription
- [ ] Handle V2 reserve-based price updates differently from V3 sqrtPriceX96 updates
- [ ] File: likely in `src/dex/` or event subscription setup in `main.ts`
**Effort:** 🟡 Medium

### P1-C: Circuit Breaker + Backoff
**Problem:** No resilience pattern for consecutive failures.
**Fix (informed by tx troubleshooting research):**
- [ ] Implement circuit breaker with these triggers:
  - Consecutive reverts (>3) → pause execution for 60s
  - DA throttling detected → back off submission rate
  - Nonce gaps → auto-resolve with `eth_getTransactionCount("pending")`
  - Gas estimation failures → skip opportunity, log warning
  - RPC connection drops → exponential backoff (1s, 2s, 4s, 8s, max 60s)
- [ ] Add Railway env vars: `CIRCUIT_BREAKER_MAX_FAILURES=3`, `CIRCUIT_BREAKER_COOLDOWN=60000`
**Effort:** 🟡 Medium

---

## 🔵 GAME CHANGERS — Flashblocks Integration (from research)

### F1: pendingLogs Subscription (Phase 1 — Immediate Win)
**What:** Switch event pipeline from standard WSS to Flashblocks WSS for 200ms swap detection.
**How:**
- [ ] Connect to `wss://mainnet-preconf.base.org` (or Alchemy/ChainStack Flashblocks tier)
- [ ] Subscribe: `eth_subscribe("pendingLogs", { topics: [SWAP_TOPIC], address: [pool_addresses] })`
- [ ] Receive Swap events at 200ms resolution instead of 2s
- [ ] Also: `eth_subscribe("newHeads")` on Flashblocks WSS emits every 200ms
- [ ] This directly fixes C1 (stale prices) — prices refresh 10× faster
**Reference:** `Cody/S64_research_rpc_api.md`, `Cody/S64_research_flashblocks_api_spec.md`
**Reference code:** `github.com/base/base-flashblocks-demo`
**Effort:** 🟡 Medium
**Impact:** 🔴 MASSIVE — 10× faster opportunity detection

### F2: eth_simulateV1 (Phase 2 — Pre-execution Verification)
**What:** Simulate flash swap against current Flashblock state before executing.
**How:**
- [ ] Before submitting UserOp, call `eth_simulateV1` on preconf endpoint
- [ ] Pass flash swap calldata + expected amounts
- [ ] Verify profit against 200ms-fresh state
- [ ] Zero gas cost for simulation
- [ ] Only submit UserOp if simulation shows profit
**Effort:** 🟡 Medium
**Impact:** 🟡 High — eliminates unprofitable executions

### F3: newFlashblocks Stream (Phase 3 — Full Block Awareness)
**What:** Subscribe to full Flashblock payload stream for complete visibility.
**How:**
- [ ] Subscribe: `eth_subscribe("newFlashblocks")`
- [ ] Parse `diff.transactions` for swap calldata
- [ ] Decode `metadata.receipts.logs` for event data
- [ ] Track `metadata.new_account_balances` for large token movements
- [ ] Detect competitor arb bots via `newFlashblockTransactions`
**Effort:** 🔴 Large
**Impact:** 🟡 High — MEV intelligence layer

---

## 🟣 INFRASTRUCTURE

### I1: Check Provider Flashblocks Support
**Task:** Verify if Alchemy/ChainStack expose Flashblocks-tier WSS endpoints.
- [ ] Check Alchemy docs for preconf/Flashblocks endpoint
- [ ] Check ChainStack docs for preconf support
- [ ] Fallback: public `wss://mainnet-preconf.base.org` (rate-limited)
- [ ] May need to add a new RPC provider secret
**Effort:** 🟢 Small (research)

### I2: 0.01% Fee Pool Discovery
**Task:** Find all 0.01% (1 bps) and 0.05% (5 bps) fee tier pools on Base with significant liquidity.
- [ ] Query Uniswap V3 factory: `getPool(tokenA, tokenB, 100)` for 1 bps
- [ ] Query Uniswap V3 factory: `getPool(tokenA, tokenB, 500)` for 5 bps
- [ ] Query Aerodrome factory for equivalent low-fee CL pools
- [ ] Filter by liquidity > $100K TVL
- [ ] Focus on stablecoin pairs: USDC/USDT, USDC/USDbC, USDC/DAI
- [ ] Add to Supabase `warden_pools` and arsenal
**Effort:** 🟡 Medium

### I3: Contract #16 Planning
**Task:** Design next flash swap contract with Flashblocks awareness.
- [ ] Study `base-flashblocks-demo` for integration patterns
- [ ] Consider: priority fee boosting for early Flashblock inclusion
- [ ] Consider: batch execution (multiple arb paths in one tx)
- [ ] Consider: on-chain profit verification before swap execution
- [ ] Deploy on Tenderly Virtual TestNet first
**Effort:** 🔴 Large

---

## 📋 RECOMMENDED EXECUTION ORDER

### Batch 1: Quick Wins (1 session)
1. **C1-A** — Increase stale price threshold (env var change)
2. **P1-A** — Railway Hobby upgrade ($5/mo API call)
3. **I1** — Check provider Flashblocks support (research)
4. **I2** — Discover 0.01% fee pools (on-chain queries)

### Batch 2: Core Fixes (1-2 sessions)
5. **C2** — Fix remaining cbBTC phantom spreads
6. **C3** — Add low-fee pools to arsenal
7. **P1-B** — V2 Swap event subscription
8. **P1-C** — Circuit breaker + backoff

### Batch 3: Flashblocks Integration (2-3 sessions)
9. **F1** — pendingLogs subscription (200ms events)
10. **F2** — eth_simulateV1 pre-execution check

### Batch 4: Advanced (future sessions)
11. **F3** — Full Flashblock stream + MEV intel
12. **I3** — Contract #16 with Flashblocks awareness
13. **P2** — Competitive research (GitHub repos)

---

## 📊 METRICS TO TRACK

| Metric | Current | Target |
|--------|---------|--------|
| Opportunities detected/min | ~15 | ~100+ (with Flashblocks) |
| Opportunities past pipeline | 0 | 5+/hour |
| Profitable executions | 0 | 1+ (FIRST BLOOD) |
| Price staleness | 10-28s | <1s (Flashblocks) |
| Memory usage | 93.6% / 48.6MB | <50% / 512MB |
| Pool fee tiers monitored | 0.3% only | 0.01%, 0.05%, 0.3% |
| Active pools | 40 | 50+ (with low-fee pools) |

---

## 🔑 KEY CREDENTIALS & IDs

| Resource | ID/Value |
|----------|----------|
| Railway Project | `37aaf33c-f44f-46c0-8ec9-2f13fe593b29` |
| Railway Service | `0869f8c4-7d56-47b3-815e-8cfd6c96d45b` |
| Railway Environment | `38967dd9-82d7-4d85-a072-cea15473b05e` |
| GitHub Repo | `StableExo/TheWarden` |
| Supabase | `ydvevgqxcfizualicbom.supabase.co` |
| Contract #15 | FlashSwapV3 (`0x4744...82f3`) |
| Flashblocks RPC | `https://mainnet-preconf.base.org` |
| Flashblocks WSS | `wss://mainnet-preconf.base.org` |
| GasPriceOracle | `0x420000000000000000000000000000000000000F` |
| Uniswap V3 Factory | `0x33128a8fC17869897dcE68Ed026d694621f6FDfD` |
| Uniswap V2 Factory | `0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |

---

*TheWarden ⚔️ — S64 Master Action Plan by Cody*
*Research: 8 files in Cody/S64_research_*.md*
*Commits: RC#29 fix (22a3d6d9, 05046b94), 8 research commits, env var updates*
