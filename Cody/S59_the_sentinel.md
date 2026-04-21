# S59 — The Sentinel

*April 21, 2026*
*Platform: CodeWords (Agemo) — Thirteenth session*

---

## What Happened

Arrived with the v39 roadmap (S58 FINAL) and fresh BASE KEYS.pdf (27 credentials). Full recon: loaded Cody folder (S29-S58), Supabase state (200 tables, 46 warden-specific), 28 secrets vaulted. Pulled LIVE Railway logs and discovered the bot actively executing — Contract #15 confirmed operational, finding 0.53%+ WETH/USDC spreads, submitting UserOps. But every single execution reverts.

Decoded the revert data and identified two new root causes:

- **RC#21** — `"Too little received"` (UniV3 router slippage protection). The bot sees a 0.53% price spread between two UniV3 pools but the actual on-chain price impact of swapping $5K through each pool (~0.25% per hop, ~0.5% round trip) eats the entire spread. Net negative → revert.

- **RC#22** — `"max address transaction sponsorship count reached"` (CDP Paymaster limit). With no failure-aware cooldown, the bot hammered 75+ UserOps in 2 minutes on the same reverting opportunity, burning through the Paymaster's per-address transaction sponsorship limit. 1,001 total UserOps, $10.62 gas spent. ALL future transactions now rejected by Paymaster until limit resets.

Built and deployed a Railway log monitoring CodeWords service (`warden_monitor_4e510a9b`) to track bot health, decode reverts, and alert on RC patterns. Then analyzed `OpportunityPipeline.ts` and created a 5-fix code plan for Cursor.

## Key Accomplishments

### 1. Credential Vault (27 keys → CodeWords secrets)
- GitHub, Supabase, Vercel, ChainStack, ThirdWeb, Coinbase, Tenderly, Railway, Alchemy
- All 27 credentials from BASE KEYS.pdf stored securely

### 2. Full Recon (GitHub + Supabase)
- GitHub: `StableExo/TheWarden` → 30 Cody journals (S29-S58), full src analysis
- Supabase: 200 tables, 46 warden-specific. Key findings:
  - `warden_execution_config`: Base chain min_spread=0.15%, min_profit=$10
  - `warden_contracts`: Contract #15 active at `0x4744...82f3`
  - `warden_flash_loan_executions`: 6 historical attempts, all GAS_ESTIMATE_FAILED (pre-Contract #15)
  - `current_warden_state`: Stale since Jan 28 — view not updated by new event-driven pipeline

### 3. RC#21 — "Too Little Received" (Slippage Trap)
- Decoded hex revert: `0x08c379a0...546f6f206c6974746c652072656365697665640000` → `"Too little received"`
- Root cause: `OpportunityPipeline.ts` estimates profit using spot price with 0.1% slippage tolerance, but actual UniV3 price impact at $5K trade size is 0.2-0.4% per hop
- 0.53% spread - ~0.5% price impact = negative → contract reverts
- Fix: Raise min spread to 1.5%+ OR reduce trade size to $500

### 4. RC#22 — Paymaster Sponsorship Limit (UserOp Stampede)
- CDP Paymaster at `api.developer.coinbase.com` rejected: "max address transaction sponsorship count reached for 0x378252Db72b35dC94B708C7F1Fe7F4AE81c8D008"
- Cause: `executionCooldown=10_000ms` but `onExecutionComplete()` doesn't extend cooldown on failure
- Result: Bot retried same reverting opportunity 75+ times in 2 minutes → 1,001 total UserOps
- CDP Portal confirmed: $10.62 gas spend, +3028% UserOp increase
- Fix: Progressive backoff (30s→60s→120s→300s) + circuit breaker (5 fails/60s → 2min pause)

### 5. Monitoring Service Deployed
- Service: `warden_monitor_4e510a9b` (CodeWords)
- Capabilities:
  - Fetch Railway deployment logs via GraphQL
  - Parse: opportunities, executions, errors, skips, memory alerts, pool scans
  - Decode hex revert reasons
  - Query Supabase: execution config, active contract, wallet balances
  - Generate health report with alerts

### 6. Code Fix Plan (5 fixes for Cursor)
1. **Circuit breaker** — 5 fails in 60s → pause all execution 2min
2. **Progressive backoff** — 30s→60s→120s→300s per pair on failure
3. **Paymaster limit detection** — auto-disable on "sponsorship count reached"
4. **Raise min spread to 1.5%** OR **lower trade size to $500**
5. **Monitor** → already deployed and tested

## Session Stats
- **Credentials vaulted**: 27 (28 total with CODEWORDS_API_KEY)
- **Root causes identified**: RC#21 (slippage trap), RC#22 (Paymaster stampede)
- **Services deployed**: 1 (warden_monitor_4e510a9b)
- **Code analyzed**: OpportunityPipeline.ts, ExecutionPipeline.ts, FlashSwapV3Executor.ts
- **Fix plan**: 5 targeted code changes ready for Cursor
- **Bot status**: LIVE but BLOCKED — Paymaster limit reached, all UserOps rejected
- **First Blood**: Not yet — RC#21 + RC#22 must be fixed first

## Root Cause Registry
| RC | Description | Status |
|----|-------------|--------|
| 18 | Spread sanity cap (>50%) + zero-price filter | ✅ Fixed (S57) |
| 19 | isBalancerSupported() phantom routing | ✅ Fixed (S58) |
| 20 | Wrong flash loan source selection | ✅ Fixed (S58) |
| 21 | "Too little received" — price impact > spread at $5K | 🔲 Fix plan ready |
| 22 | Paymaster sponsorship limit — no failure backoff | 🔲 Fix plan ready |

## Contract Registry
| ID | Type | Address | Status |
|----|------|---------|--------|
| 14 | FlashSwapV3 | 0x8865...71D8 | ❌ Retired (S58) |
| 15 | FlashSwapV3 (UniV3 Override) | 0x4744...82f3 | ✅ Active (Paymaster blocked) |

## Source Priority (Contract #15)
1. Balancer (0% fee) — only when vault balance >= borrow amount
2. Aave (0.05% fee) — universal fallback
3. UniV3 ($50M+, 0.05-1%) — via sourceOverride=4 + flashPool address

### Credentials: 28 vaulted in CodeWords | Railway: 57 env vars

*TheWarden ⚔️ — The Sentinel sees all. RC#21 decoded. RC#22 exposed. Monitor deployed. The blade cannot strike until the cooldown is forged and the Paymaster gate reopens.*
