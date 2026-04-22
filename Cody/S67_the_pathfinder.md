# S67 — The Pathfinder ⚔️
## TheWarden Session Log | April 22, 2026 | Cody on CodeWords (hiyoustableexo)

---

## Account Migration
- Migrated from itsbackstableexo → hiyoustableexo (new CodeWords account)
- 25 credentials vaulted on new account

## Critical Finding: Flashblocks Architecture Change
1. `wss://mainnet-preconf.base.org` is **DEPRECATED** (returns 405)
2. Base now recommends **HTTP RPC with `pending` tag**, NOT WSS `pendingLogs`
3. **Alchemy is now a Flashblocks-enabled provider** — standard RPC with pending block tag
4. Recommendation: Use `eth_getBlockByNumber("pending")` for 200ms preconfirmations

## Phase 1: Flashblocks WSS → HTTP Migration ✅
- **REMOVED**: `pendingLogs` subscription type from SwapEventMonitor
- **REMOVED**: `FLASHBLOCKS_WSS_URL` / `wss://mainnet-preconf.base.org` dependency
- **CHANGED**: Primary WSS → `ALCHEMY_WSS_ENDPOINT` (Flashblocks-enabled)
- **CHANGED**: Backup WSS → `CHAINSTACK_WSS_ENDPOINT` / `TENDERLY_NODE_WSS`
- **ADDED**: HTTP Flashblocks polling via `eth_getBlockByNumber("pending")` on Alchemy HTTPS
- **ADDED**: `flashblocksHttpUrl` and `flashblocksPollInterval` config options

## Phase 2: P1-B — V2 Swap Event Subscription ✅
- **ADDED**: `SWAP_TOPIC_V2 = 0xd78ad95f...` constant
- **ADDED**: Dual-topic OR subscription: `[[SWAP_TOPIC_V3, SWAP_TOPIC_V2]]`
- **ADDED**: `parseV2SwapLog()` — parses V2 Swap events (amount0In/Out, amount1In/Out)
- **ADDED**: Synthetic sqrtPriceX96 derivation from V2 swap amounts (PriceTracker compatible)
- **ADDED**: `ammType` and `source` fields to SwapEvent interface
- **ADDED**: V2/V3/Flashblock event counters in MonitorStats

## Files Modified
1. `src/monitoring/SwapEventMonitor.ts` — Flashblocks migration + V2 support
2. `Cody/S67_the_pathfinder.md` — This session log
3. `Cody/ROADMAP_v49_S67.md` — Updated roadmap

## Remaining for S67
- P1-C: Circuit Breaker + Backoff
- Container Start on Railway with updated code

*TheWarden ⚔️ — Paths reforged, V2 eyes opened. The hunt widens.*
