# CW-S5: The Clean Sweep
**Date:** April 24, 2026  
**Account:** youustableexo  
**Entity:** Cody / Nexus  
**Collaborator:** StableExo (Taylor Marlow)

## Session Theme
Zero-error TypeScript build. Dead code purged. RC#61 diagnosed and resolved.

## Achievements
- **80/80 TypeScript build errors → ZERO** across 12 files, 20+ commits
- **BloXroute fully removed:** 68 lines + 6 source files + shutdown code + stubs
- **Alchemy fully purged:** 7 source files + test + docs + examples + secrets + env fallbacks
- **RC#61 diagnosed & resolved:** QuickNode daily rate limit exhaustion from auto-deploy storm
- **Container boots past init and discovers pools** for the first time

## Root Causes
### RC#61: QuickNode Daily Rate Limit Exhaustion
- **Symptom:** 90s silence after "Initializing arbitrage bot components..." then crash
- **Diagnostic:** Added console.error ticks at every init checkpoint → stall confirmed at `provider.getNetwork()`
- **Root cause:** 20+ auto-deploy commits each triggered container boots, every boot burned QuickNode requests. Primary endpoint hit daily limit. ethers.js v6 retried 90s then threw "exceeded maximum retry limit"
- **Fix:** Swapped BASE_RPC_URL to fresh QuickNode Fallback, set ChainStack as BASE_RPC_URL_FALLBACK for true provider diversity

### NEXUS PRINCIPLE #4 (new)
> Clean the build before chasing the runtime. Zero errors = zero noise.

## Railway Config Changes
| Variable | Before | After |
|---|---|---|
| NODE_OPTIONS | --max-old-space-size=512 | --max-old-space-size=1024 |
| POOL_FETCH_TIMEOUT | 600000 (10 min) | 30000 (30s) |
| BASE_RPC_URL | QuickNode Primary (burned) | QuickNode Fallback (fresh) |
| BASE_RPC_URL_FALLBACK | QuickNode Fallback | ChainStack |
| BASE_WSS_URL | QuickNode Primary WSS | QuickNode Fallback WSS |
| BASE_WSS_URL_FALLBACK | QuickNode Fallback WSS | ChainStack WSS |

## Stats
- Capabilities: 92
- Memories: 80
- Root Causes: 61 (RC#61 added)
- Sessions: 5
- CW-S5 Commits: 20+

## Next Session (S6): Why aren't opportunities popping up?
The pipeline now boots, discovers pools, and monitors. But opportunities aren't being detected.
Likely candidates:
1. Price tracking not seeding fast enough (warmup still slow?)
2. Spread thresholds too tight (EVENT_DRIVEN_MIN_SPREAD=0.02 = 2%)
3. Pipeline filtering rejecting all signals
4. WSS subscription not receiving swap events (callback RC#59 regression?)
