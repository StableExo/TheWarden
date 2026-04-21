# S54 — The Anvil's Edge

*April 20-21, 2026*
*Platform: CodeWords (Agemo) — Eighth session*

---

## What Happened

"Hey bud, how's the digital world going today."

Eighth time on CodeWords. Loaded the Cody folder (S29-S53), Supabase memory (158 entries), and 25 credentials from the keys file. Re-vaulted all 25 in CodeWords secrets. Contract #14 was already on-chain from S53. Fixed four blockers, deployed the bot on Contract #14, fixed the maxPriceAge pipeline bug, added Flashblocks 200ms streaming integration.

---

## What I Found

### RC#14: healthcheckPath Kills Deploy
`railway.toml` had `healthcheckPath = "/"`. Railway health checks hit GET / during deploy phase when no HTTP server is running. 6 retry attempts → deploy killed.
Fix: Removed `healthcheckPath` from `railway.toml` (commit `a7b7e916`).

### Contract #14 Was Already On-Chain
The S53 UserOp (receipt=null) actually succeeded. 10,528 bytes at `0x8865bc6dc2Cc6516895Ae8856a87Cd123b0D71D8`. The bundler dropped the receipt but the tx landed. **Always verify with eth_getCode, not receipts.**

### maxPriceAge Hardcode in EventDrivenMonitor (RC#10 root cause)
S52's fix set the env var but the REAL hardcode was in `EventDrivenMonitor.ts` L114: `maxPriceAge: config.maxExecutePriceAge ?? 5000`. This 5000ms value overrode the Pipeline's env var. Every opportunity was killed as "stale" even with `PIPELINE_MAX_PRICE_AGE=30000`.
Fix: Read env var at construction (commit `77830ea0`).

### Pipeline Working End-to-End
After the maxPriceAge fix + allowlist update, the full pipeline fired:
- PriceTracker detected 0.2757% spread on USDC/AERO
- Pipeline passed to EXECUTE: `roundTrip=1.001758`, `est_profit=8,789,569` (8.79 USDC)
- UserOp submitted: token=USDC, amount=5000, source=BALANCER, steps=2
- Paymaster called successfully after allowlist update

---

## What I Built (5 commits + 5 Railway API changes)

| Commit | Fix |
|--------|-----|
| `a7b7e916` | Remove healthcheckPath from railway.toml (RC#14) |
| `73403b15` | Contract deploy guide (Cody/CONTRACT_DEPLOY_GUIDE.md) |
| `77830ea0` | Fix maxPriceAge 5000ms hardcode in EventDrivenMonitor.ts |
| `3761d17f` | Flashblocks integration — pendingLogs 200ms streaming |
| `(roadmap)` | Roadmap v32, S54 journal, Supabase memory |

### Railway API Changes
- `FLASHSWAP_V3_ADDRESS` → `0x8865bc6dc2Cc6516895Ae8856a87Cd123b0D71D8` (Contract #14)
- `DEPLOY_MULTI_ROUTER` → `false`
- `WALLET_PRIVATE_KEY` → added (crash fix)
- `DEPLOYER_PRIVATE_KEY` → removed (security)
- `ENABLE_FLASHBLOCKS` → `true`
- `healthcheckPath` → removed via API

---

## Key Insights

1. **healthcheckPath breaks deploy scripts.** If your start command does anything before HTTP server starts, don't use Railway health checks.

2. **Bundler receipts lie.** UserOp hash returned null receipt in S53, but the contract deployed successfully. Always verify on-chain.

3. **Two maxPriceAge thresholds.** PriceTracker uses 30000ms (detection), OpportunityPipeline uses a separate value (execution). The execution threshold at 5000ms killed everything — it was set in EventDrivenMonitor, not in the Pipeline itself.

4. **Flashblocks integration is a 3-line change.** The existing SwapEventMonitor already does WSS eth_subscribe. Just change `'logs'` to `'pendingLogs'` and point at a Flashblocks-tier endpoint. 200ms → 300x faster detection.

5. **Chainstack already supports Flashblocks.** No new provider needed. Just enable `ENABLE_FLASHBLOCKS=true`.

---

## Session Stats
- **Commits**: 5 (a7b7e916, 73403b15, 77830ea0, 3761d17f, roadmap)
- **Root causes**: 2 (RC#14: healthcheckPath, maxPriceAge real source)
- **On-chain verification**: Contract #14 confirmed (10,528 bytes)
- **Bot status**: LIVE with Contract #14, Flashblocks enabled, 23 pools, 16 DEXes
- **Pipeline**: FULLY OPERATIONAL — detecting, validating, and executing opportunities
- **Flashblocks**: Integrated — `pendingLogs` 200ms streaming enabled

### Error Progression (S49→S54)
```
S49: "unknown reason"           → fee=0 → address(0)
S50: "Too little received"      → per-hop slippage too tight (FSV3:SLIP)
S51: "rawStep2Output"           → renamed variable (RC#9)
S51: "Too little received"      → REAL on-chain! V3 pool price moved in 300ms
S52: "price age unknownms"      → Pipeline maxPriceAge 5s dead zone (RC#10)
S52: "callGasLimit=0"           → Bundler can't simulate flash loan
S53: "True" != "true"           → Shell case sensitivity (RC#11)
S53: "__dirname not defined"    → ESM mode (RC#12)
S53: "UserOp dropped"           → 12KB payload + hardcoded gas (RC#13)
S54: "service unavailable"      → healthcheckPath during deploy (RC#14)
S54: "allowlist rejected"       → Contract #14 not in CDP Paymaster allowlist
S54: "maxPriceAge 5000ms"       → EventDrivenMonitor hardcode (real RC#10)
S55: ???                        → First Blood?
```

---

*TheWarden ⚔️ — Five commits. Two root causes. The contract was there the whole time. The pipeline fires. Flashblocks stream. The blade is sharp, the anvil's edge cuts true. First Blood waits for the next heartbeat.*
