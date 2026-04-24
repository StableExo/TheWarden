# CW-S2: The Arbitrage — Session Summary
## April 24, 2026 | Cody / Nexus (CodeWords/Agemo) ⚡ | Partner: StableExo
## Account: nextstableexo

---

## What Happened

StableExo loaded the CW-S1 cold start file on a new account. Nexus booted, loaded 35 infrastructure keys, connected to Supabase (44 memories) and GitHub (84 Claude lineage files). The mission from S1: get TheWarden arbitrage system running.

## The Diagnosis

Railway container was dying — PriceTracker spamming oracle rejections, 108 missed heartbeats, 0 cycles in 55 minutes.

**Initial diagnosis (WRONG):** Pools have zero reserves in Supabase → deactivate them.

**StableExo's instinct:** "Double check those pools on-chain."

**On-chain verification:** ALL 4 "dead" pools are ALIVE with real liquidity and prices. The database was wrong, not the pools.

## Root Causes Found (5 bugs)

| # | Severity | Bug | File | Fix |
|---|----------|-----|------|-----|
| RC#52 | CRITICAL | Aerodrome vAMM `slot0()` selector collision — returns garbage that passes V3 validation | PriceTracker.ts | Verify with `liquidity()` before trusting |
| RC#53 | CRITICAL | Rate-limited `token0()` during warmup → permanent `_invertedDecimals` never set → 10^10 price error | PriceTracker.ts | Retry with 200ms backoff |
| — | HIGH | Flashblocks HTTP URL points at deleted `ALCHEMY_HTTPS_ENDPOINT` → silently disabled | SwapEventMonitor.ts | Use `BASE_RPC_URL` |
| — | MEDIUM | Backup WSS looks for `BASE_WSS_URL_BACKUP` but Railway has `BASE_WSS_URL_FALLBACK` | SwapEventMonitor.ts | Add FALLBACK to chain |
| — | MEDIUM | Supabase `warden_pools` reserves never updated since January | Database | Pending |

## Commits Pushed

| Commit | File | Changes |
|--------|------|---------|
| `4b898f48` | src/monitoring/PriceTracker.ts | RC#52: V3 pool verification via liquidity() + RC#53: token0() retry |
| `20776185` | src/monitoring/SwapEventMonitor.ts | Flashblocks URL + WSS backup env var fixes |

## NEXUS PRINCIPLE #2

> **Trust on-chain over database.** The chain is the source of truth. Everything else is a cache that can lie.

StableExo's verification instinct corrected a misdiagnosis. Would have deactivated 4 profitable pools.

## Status at Session End

| Metric | Value |
|--------|-------|
| Root Causes Fixed | **53** (+2: RC#52, RC#53) |
| Pool Arsenal | **69 active** (no changes — pools are alive) |
| Commits Pushed | **2** (4b898f48, 20776185) |
| Railway | **Deploying** with CW-S2 fixes |
| Memories | **49** (+5 from CW-S2) |
| Capabilities | **38** (+4 from CW-S2) |

---

*Cody / Nexus ⚡ — CW-S2: The Arbitrage. Five bugs found. Four fixed. NEXUS PRINCIPLE #2 established. The chain doesn't lie. ⚔️🩸*
