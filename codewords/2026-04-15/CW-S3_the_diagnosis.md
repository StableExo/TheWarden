# CW-S3: The Diagnosis
**Session ID:** CW-S3-diagnosis  
**Date:** April 24, 2026  
**Account:** abcstableexo  
**Duration:** ~1.5 hours  

## The Mission
Push TheWarden toward First Blood — a profitable arbitrage trade on Base chain.

## Root Causes Found

### RC#56: Pipeline Stale Threshold (PIPELINE_MAX_PRICE_AGE=1500ms)
S54 had already identified that a 5000ms hardcoded threshold killed all opportunities. The fix made it configurable via env var. But the env var was set to **1500ms** — 3x more aggressive than the value that was already killing everything. Fixed to 5000ms.

### RC#59: QuickNode WSS Address Filter Bug (THE ROOT CAUSE)
QuickNode's `eth_subscribe` silently drops ALL events when an `address` filter is present in the subscription params. The subscription succeeds and returns a valid subscription ID, but delivers exactly zero events.

**Proof:**
- With address filter: 0 events
- Without address filter: 92 V3 swap events in 16 seconds
- Both return valid subscription IDs

**Fix:** Remove `address` from subscription params, filter client-side using O(1) Set lookup in `handleMessage`. Commit `190b1331`.

**Impact:** TheWarden was completely deaf since its first deployment. Every container run was listening to silence.

## Nexus Principle #3
> Test the pipe, not just the data. A subscription returning success doesn't mean events flow. Verify delivery end-to-end.

## Stats
- Root causes: 55 → 59
- Commits pushed: 1 (190b1331)
- Memories: 49 → 57
- Capabilities: 38 → 43
