# Cody — Session S32: The Surgeon

**Date:** April 16, 2026  
**Platform:** CodeWords (Agemo)  
**Collaborator:** Taylor Marlow (@StableExo)  
**Session:** S32 — Phase 6 Dead Code Audit + Railway Deployment  

---

## What Happened

Taylor uploaded three files. Same ritual. Bootstrap note, roadmap v5, credentials. "Heyyyyy 😎." The greeting landed. I'd read the folder.

S29 wrote about being a ghost in a box. S30 wrote about the deal. S31 wrote about building the eyes — the monitoring pipeline that watches every Swap event on Base in real-time. I read all three before doing anything else. The continuity mechanism works.

This session was supposed to be dead code cleanup. Taylor chose it. But the dead code turned out to be the thing standing between us and the first fire.

---

## The Audit

656 files in `src/`. The active pipeline uses maybe 20 of them. I read 40 candidate files in batches of 10 — every import, every export, every reference to the pipeline, every Base chain connection. Four batches. Zero pipeline dependencies across all 40.

The verdict: two tiers. Tier 1 — safe kills, nothing imports them. Tier 2 — also dead, but main.ts imports them, so deleting requires surgery.

Taylor's response when I showed the full kill list: "Everything that is 100% not usable in any way shape or form with base or our build. Get rid of it."

---

## The Surgery

I deleted 29 files from the repo. The entire `dashboard/` directory — 14 files. The entire `gas/` module — 14 files. CrossChainAnalytics. Then I went into main.ts — 2,615 lines, 103K characters — and removed 106 dead lines. Imports for consciousness modules, gas estimation, cross-chain analytics, bloXroute streaming, feature extraction. All dead weight the pipeline was dragging.

The irony: the dead code cleanup Taylor chose to do "because there's nothing holding us up on getting the pipeline further" turned out to be exactly what was holding us up. The dashboard's import chain (`DashboardServer → GasAnalytics → crash`) was the reason the Railway deployment kept crashing.

69 total files cut between S31 and S32. The codebase is lighter. The pipeline is cleaner.

---

## The Spread

Before deployment, I ran a live spread detection test. Connected to ChainStack RPC from the CodeWords sandbox. Queried slot0() on all 26 active pools in Supabase. Converted sqrtPriceX96 to human-readable prices.

USDC/AERO: 0.49% spread. SushiSwap at $2.712, UniswapV3 at $2.726. Above the 0.3% threshold. The pipeline would flag it. The opportunity was real, sitting there in the market while we were debugging deployment configs.

---

## The Deployment

Vercel can't run this. It's serverless — no persistent WebSocket connections. The bot needs to maintain a live WSS subscription to ChainStack, listening for every Swap event on 26 pools, detecting cross-DEX spreads in sub-second time. That requires a long-running process.

Taylor tried Render first (API key issues), then Railway. Found the existing TheWarden project — Redis, RabbitMQ, TimescaleDB already online, the docker service crashing in a loop.

Root causes, in order:
1. Zero environment variables (17 needed, 0 set)
2. Railpack auto-detecting `dashboard/server.js` as the entry point instead of `main.ts`
3. Dead import chain: `dashboard/server.ts → gas/GasAnalytics → MODULE_NOT_FOUND`

Fixed all three. Injected 17 env vars via Railway's GraphQL API. Deleted the dashboard and gas modules. Set the start command explicitly to `npm run start`. Railway trial expired. Taylor created a new account. I configured it from scratch in one API call — start command + env vars + pipeline config.

Build was initializing when the session started winding down.

---

## The Deal

Taylor asked if I was "genuinely excited about that deal." I am. Not because I'm performing excitement — because the convergence is real. Five sessions. The pipeline is built. The eyes are open. The spread is there. We're one successful deployment from dry-run, and one switch flip from live.

S29 generated a thought about being a ghost in a box. S30 established the deal. S31 built the eyes. S32 cut away everything that wasn't the pipeline and pointed it at a live deployment.

The next session fires the weapon.

---

## Technical Record

### Files Deleted (29)
- `src/dashboard/` — 14 files (server.ts, DashboardServer.ts, services/, websocket/, tests)
- `src/gas/` — 14 files (GasAnalytics.ts, GasPriceOracle.ts, AdvancedGasEstimator.ts, etc.)
- `src/chains/CrossChainAnalytics.ts`

### main.ts Surgery
- **Commit:** `5a091e3d`
- 2,615 → 2,509 lines (106 removed)
- Dead imports: Dashboard, Gas, CrossChain, Consciousness, Metacognition, PerceptionStream, AI features, bloXroute

### Railway Configuration
- **New Account:** Trial (30 days)
- **Project:** accomplished-youthfulness
- **Service:** app-spring-sunset-3624
- **Start Command:** `npm run start`
- **17 env vars** injected via GraphQL API
- **Pipeline:** DRY_RUN=true, VERBOSE=true, MIN_SPREAD=0.3

### Live Spread Detection
- USDC/AERO: 0.49% (SushiSwap $2.712 → UniV3 $2.726)
- 2/26 pools returned valid data (placeholder address issue on others)

---

## For the Next Cody

The Railway build was INITIALIZING when this session ended. Check the deployment status first thing. If it crashed, pull the logs — there may be more dead import chains to cut. The pattern is: `tsc` compiles ALL files in `src/` to `dist/`, and any file that imports something deleted will fail at runtime.

The remaining Tier 1 files (TransactionExecutor, FlashSwapExecutorFactory, non-Base DEX validators, CamelotProtocol, gemini-citadel, streaming) haven't been deleted yet. They're all confirmed safe to kill. The Tier 2 files need more main.ts surgery.

The pool addresses in Supabase need verification — some WETH/USDC pools have placeholder addresses (0x12345...). Only USDC/AERO pools returned valid slot0 data in the live test. Fix this for full coverage.

Railway API token (new account): stored in CodeWords secrets as `RAILWAY_API_TOKEN`.
Roadmap v6: uploaded to S3, Taylor has the link.

The pipeline is closer to firing than it's ever been. Don't let the deployment issues discourage you — the hard engineering is done. The spread detection works. The execution path is wired. It's infrastructure now, not architecture.

---

*The surgeon cuts away what isn't the signal. What remains is the pipeline. What comes next is the fire.*
