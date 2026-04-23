# S73 — First Blood: The Strike (RPC Consolidation)
## Session Date: April 23, 2026 | TheWarden ⚔️ | Account: thatstableexo (CodeWords/Cody)

---

## Account Migration
- Migrated from `nonostableexo` to `thatstableexo`
- **32 credentials vaulted** in CodeWords secrets vault (new account)

## RPC Provider Consolidation

### Benchmark Results (from CodeWords sandbox — EU region)
| Provider | P50 | Avg | Min | Max | Errors |
|----------|-----|-----|-----|-----|--------|
| ⚡ QuickNode | **31ms** | 42ms | 31ms | 135ms | 0 |
| 🔗 ChainStack | **67ms** | 76ms | 63ms | 156ms | 0 |
| 🛡️ Tenderly | **65ms** | 110ms | 63ms | 310ms | 0 |

### New Provider Hierarchy
1. **Primary**: QuickNode (dedicated Base node) — 31ms P50 ⚡
2. **Fallback**: ChainStack — 67ms P50, lower spike risk than Tenderly
3. **TestNet Only**: Tenderly — 110ms avg with 310ms spikes, good for simulation
4. **Removed**: Alchemy — all env vars deleted, services confirmed dead code

### Code Scan Results
- `src/main.ts` — **clean** (no Alchemy refs)
- `src/services/PoolDataFetcher.ts` — **clean**
- `src/services/scanner.ts` — **clean**
- `src/services/execution.ts` — **clean**
- `src/execution/FlashSwapV3Executor.ts` — **clean**
- `src/services/alchemy/` — **self-contained dead code** (0 imports from hot path, uses alchemy-sdk)

### Railway Environment Variable Changes
| Action | Variable | Value |
|--------|----------|-------|
| ✅ Already set | BASE_RPC_URL | QuickNode HTTPS |
| ✅ Already set | BASE_WSS_URL | QuickNode WSS |
| 🆕 Added | BASE_RPC_URL_FALLBACK | ChainStack HTTPS |
| 🆕 Added | BASE_WSS_URL_FALLBACK | ChainStack WSS |
| 🗑️ Deleted | ALCHEMY_HTTPS_ENDPOINT | (was Alchemy URL) |
| 🗑️ Deleted | ALCHEMY_WSS_ENDPOINT | (was misnamed — contained QuickNode WSS) |

### Commits Pushed (2)

| Commit | File | Change |
|--------|------|--------|
| `205525ae` | .env.example | Replace Alchemy defaults with QuickNode primary + ChainStack fallback |
| `0c0ce283` | src/main.ts | Add `rpcUrlFallback` config, fallback provider loading, health check labels |

### Anomaly Fixed
- `ALCHEMY_WSS_ENDPOINT` on Railway contained QuickNode's WSS URL (misnamed from partial migration). Deleted and replaced with properly named `BASE_WSS_URL_FALLBACK`.

## Status Summary
| Metric | Value |
|--------|-------|
| Root Causes Fixed | **51** |
| Pool Arsenal | **69 active** |
| Primary RPC | **QuickNode dedicated** ⚡ (31ms P50) |
| Fallback RPC | **ChainStack** 🔗 (67ms P50) |
| TestNet RPC | **Tenderly** 🛡️ (simulation only) |
| Alchemy Status | **REMOVED** (env vars + dead code confirmed) |
| Defense Layers | **5** |
| Container | STOPPED |
| Credentials | 32 CodeWords (thatstableexo) |

*TheWarden ⚔️ — S73: QuickNode confirmed fastest (31ms). ChainStack promoted to fallback (67ms). Alchemy purged. Tenderly demoted to TestNet. RPC architecture clean. 🩸*
