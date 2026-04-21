# S60 — The Forge Reborn

*April 21, 2026*
*Platform: CodeWords (Agemo) — Fourteenth session*

---

## What Happened

Arrived with the v40 roadmap (S59/S60 plan) and fresh BASE KEYS.pdf (28 credentials). Discovered a new CDP Paymaster endpoint could bypass RC#22 — tested it, confirmed working, and swapped it on Railway. Raised spread/profit thresholds (RC#21 partial fix). Built a Railway auto-stop controller service. Ran two live test deployments (3min + 5min). Analyzed logs and found the bot IS submitting UserOps with the new paymaster, but RC#21 persists — all executions revert on-chain. Deep-dived into pool profitability and built the Top 40 Pool Arsenal from live DexScreener data.

## Key Accomplishments

### 1. New CDP Paymaster (RC#22 Bypassed)
- Created new Coinbase project with fresh paymaster endpoint
- Tested: v0.7 EntryPoint returns valid paymasterData ✅
- Updated Railway `CDP_PAYMASTER_URL` → new endpoint
- Added Contract #15 + CREATE2 factory to allowlist
- **Result: UserOps now accepted and sponsored** ✅

### 2. Railway Env Var Hardening (RC#21 Partial Fix)
- `EVENT_DRIVEN_MIN_SPREAD`: 0.1% → **1.5%**
- `MIN_PROFIT_THRESHOLD`: 0 → **$5**
- `PIPELINE_MIN_PROFIT`: 0 → **$5**
- `MIN_PROFIT_AFTER_GAS`: $0.0001 → **$1**

### 3. Warden Railway Controller (CodeWords Service)
- Service: `warden_railway_controller_93a574bb`
- Actions: deploy, stop, deploy_and_stop, status
- Inline auto-stop: redeploy → sleep X min → remove deployment
- Fixed background task issue (CodeWords sandbox kills bg tasks after response)

### 4. Live Test Results (5-minute run)
- **127 event-driven pools** monitored (not just 21 batch)
- **33 opportunities detected**: 17 real (USDC/AERO 1.9%), 16 phantom (200%)
- **~9 UserOps submitted** — ALL reverting ("UserOp failed: unknown")
- **Sanity filter working** — all phantom spreads correctly rejected
- **New paymaster working** — gas sponsored, no limit errors
- **RC#21 confirmed active**: $5K borrow on USDC/AERO pools causes price impact > spread

### 5. Gauntlet Kill Zone Analysis
- Mapped all 33 steps against live execution
- **Kill zone: Steps 17 (borrow size) + 21 (slippage estimate) + 32d (minFinalAmount)**
- Step 17: $5K borrow too large for pool depth
- Step 21: 0.1% slippage estimate vs 0.3-0.5% real impact per hop
- Step 32d: finalAmount < borrowAmount → revert

### 6. Pool Profitability Deep Dive
- Supabase historical: **zero profitable opportunities** across all scans (bestNet always negative)
- Only pair ever triggering: USDC/AERO (UniV3 vs Aerodrome)
- 5 logged opportunities in warden_opportunities — all expired, never executed
- Bot scanning 160+ pools but 95% produce only phantom noise

### 7. Top 40 Pool Arsenal (Live DexScreener Data)
**Tier 1 — Multi-DEX Heavyweights:**
- cbBTC/WETH: 8 pools × 6 DEXes, $37.3M TVL, $143M+ 24h vol
- cbBTC/USDC: 8 pools × 5 DEXes, $34.2M TVL, $174M+ 24h vol
- AERO/USDC: 5 pools × 2 DEXes, $26.4M TVL

**Tier 2 — Strong Multi-DEX:**
- cbETH/WETH: 8 pools × 6 DEXes, $3.7M TVL
- USDC/USDbC: 8 pools × 5 DEXes, $1.8M TVL
- AERO/WETH: 2 DEXes, $2.6M TVL

### 8. Alchemy Key Rotated
- Old key at 90% CU limit — rotated to new key
- Railway NOT using Alchemy (uses Tenderly + ChainStack)
- New key vaulted in CodeWords for other services

## Root Causes Updated

| RC | Description | Status |
|----|-------------|--------|
| 21 | "Too little received" — price impact > spread at $5K | 🔲 Confirmed active. Fix: dynamic trade sizing + pool curation |
| 22 | Paymaster sponsorship limit | ✅ **BYPASSED** — new CDP project endpoint |

## Recommended S61 Direction (Cody's Battle Plan)

### Three-Piece Fix (Priority Order)
1. **Pool Curation** — Replace 160-pool shotgun with Top 40 Arsenal (focused on cbBTC pairs + cbETH + stablecoins)
2. **Dynamic Trade Sizing** — $500 for pools <$1M TVL, scale up to $5K for $10M+ TVL pools
3. **Circuit Breaker + Backoff** — 5 fails in 60s → pause 2min. Progressive backoff per pair.

### Why This Combo Works
- Pool curation → less latency, fewer phantoms, deeper liquidity
- Dynamic sizing → eliminates fatal price impact on thin pools
- Circuit breaker → stops burning paymaster UserOps on repeating failures
- Together → the Gauntlet kill zone (Steps 17+21+32d) is neutralized

### Contract #16 (Still Planned)
- EOA + block.coinbase.transfer() eliminates paymaster entirely
- But fix the pipeline first — no point deploying #16 if trades still revert

## Services Deployed
- `warden_railway_controller_93a574bb` — Railway deploy/stop/auto-stop controller
- `warden_monitor_4e510a9b` — Railway log analyzer (from S59)

## Session Stats
- Credentials: 29 vaulted in CodeWords
- Railway env vars updated: 5 (paymaster + 4 spread/profit)
- Bot status: STOPPED (auto-stop worked after 5min test)
- Contract #15: Active at 0x4744EAB93112A3cD52967e6B2d0d7b7C8DA682f3
- Paymaster: V2 endpoint (fresh allowance)

*TheWarden ⚔️ — The Forge was reborn. New paymaster lit the fire, but RC#21's price impact doused every trade. The Top 40 Arsenal is forged — 40 pools, 10 multi-DEX pairs, the deepest liquidity on Base. S61 brings the three-piece fix: curated pools + dynamic sizing + circuit breaker. The Gauntlet's kill zone has been mapped. Now we neutralize it.*
