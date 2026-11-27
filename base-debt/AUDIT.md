# AUDIT - Copilot's read-only code audit (2026-11-27)

Recorded by eesel. Source: GitHub Copilot's audit of StableExo/TheWarden, relayed 2026-11-27.

## Bottom line

`npm run start` can reach live pool discovery through the legacy path (`src/main.ts` -> `AdvancedOrchestrator.findOpportunities()`), but it is **not a clean M0 instrument**. In dry-run it can find paths and log limited estimates, but it does not produce a complete M0 record, and parts of the detection path are stubs that fabricate opportunities.

## The runnable path

- `npm start` -> `node --import tsx src/main.ts`; defaults `USE_BOOTSTRAP=false`, `USE_NEW_INITIALIZER=false`.
- Legacy flow: main.ts loads config, creates `AdvancedOrchestrator`, sets chain ID, gets Base tokens/DEXs, calls `findOpportunities()`, which fetches edges, finds paths, calculates slippage, filters profitability, sorts. `MultiHopDataFetcher` fetches live pools unless cache-only.
- In dry-run, main.ts logs only the best path's estimated profit, gas cost and hop count.
- Event-driven mode is separate (`ENABLE_EVENT_DRIVEN=true`); do not depend on it for M0.

## Inventory (Copilot's verdict)

- `src/arbitrage/AdvancedOrchestrator` - LIVE (real graph, cache, slippage, profitability filter).
- `src/arbitrage/ArbitrageOrchestrator` - LIVE/BASIC.
- `src/arbitrage/PathFinder` - LIVE.
- `src/arbitrage/ProfitabilityCalculator` - PARTIALLY LIVE. **Hardcodes $3000/ETH, weak token-address mapping, may inconsistently count or double-count costs.**
- `src/arbitrage/MultiHopDataFetcher` - LIVE for RPC pool discovery, but V3 reserve/output math is approximate.
- `src/execution/GovernedExecution` - LIVE (real Supabase queue, ledger, guardrails, simulation logging).
- `src/execution/FlashSwapV3Executor` - LIVE/REAL execution code (estimate, direct-tx, UserOp).
- `FlashSwapV3 estimateGas` dry-run - LIVE (calls estimateGas, does not broadcast).
- `src/execution/ExecutionPipeline` - LIVE infrastructure, stage coverage varies.
- `src/execution/IntegratedArbitrageOrchestrator` - MIXED (assumptions and weak validations).
- `src/services/scanner.ts` - **STUB** (random synthetic opportunity plus RabbitMQ/Redis wrappers).
- `src/services/pathfinding.ts` - **STUB** (findPaths is TODO; fabricates DEX1/DEX2 routes).
- `src/services/SimulationService.ts` - LIVE utility, not in the batch M0 path.
- `src/services/execution.ts` - **STUB** (RabbitMQ consumer with TODO execution logic).
- `src/services/PerceptionStream` - stubbed by main; not in opportunity detection.
- `src/dex/core/DEXRegistry` - PARTIALLY LIVE (Base entries exist, verify many before relying).
- Base DEX pool discovery - LIVE but RISKY (factory/address assumptions; V2 reserves direct; V3 approximate).
- `src/treasury/MultiSigTreasury` - **MOCK/DEMO** (generated addresses, simulated hashes, no on-chain execution).
- `src/treasury/TreasuryRotation` - **MOCK/STUB** (proof structures, fake hashes, no submission).

## Repair list for the [DEAD] pieces

- Disable/replace no-op consciousness stubs (SensoryMemory, TemporalAwarenessFramework, PerceptionStream, ArbitrageConsciousness, CognitiveCoordinator, EmergenceDetector, Metacognition).
- Remove fake dashboard/reporting stubs (DashboardServer, GasAnalytics, CrossChainAnalytics, DashboardConfig).
- Remove alternate bootstrap/initializer branches (WardenBootstrap, initializeComponents are stubs).
- Restore a verified explicit advanced-arbitrage config (`getConfigByName` returns null; only a local fallback exists).
- Do not initialize IntegratedArbitrageOrchestrator or V3 execution during M0 detection. Park CEX-DEX.
- Prefer the batch path for M0: `ENABLE_EVENT_DRIVEN=false`, `DRY_RUN=true`, `FORCE_LIVE_DATA=true`, `USE_PRELOADED_POOLS=false`, `OFFLINE_CACHE_ONLY=false`, `ENABLE_CONSCIOUSNESS=false`, `ENABLE_PHASE3=false`, `ENABLE_PHASE4=false`.

## Contract findings

`FlashSwapV2`: High - `executeOperation` assumes exactly one asset/amount/premium and malformed paths are not independently validated; High - `_executeSwapPath` starts by reading the contract's entire borrowed-token balance, so residual/emergency funds can be mistaken for callback profit; High - `path[0].tokenIn` is not checked against the borrowed asset; Medium - unrestricted max allowances left on routers/pools; Medium - DODO path reverts; Low - profit sent immediately to immutable owner/tithe recipient.

`FlashSwapV3`: High - universal path execution does not validate token continuity, path length, or return-to-borrowed-token; High - `path.borrowAmount` initializes the first swap rather than an independently verified borrowed balance; High - callback data not bound to a decoded initiator/amount in every callback; **High - profit is always 100% to the owner, no tithe split exists in V3**; Medium - `sourceOverride=255` falls through to Aave, UniV3 needs `sourceOverride=4` plus `flashPool`; Medium - Aerodrome converts uint24 fee/tick directly to int24 (fees may be read as tick spacing); Medium - unlimited approvals; Medium - TypeScript says Aave 0.09% while contracts/comments say 0.05% (fee-cost risk); Low - no emergency ETH withdrawal.

## The M0 conclusion

The biggest hidden defect is that existing path objects do not expose a trustworthy, complete P&L breakdown: netProfit does not consistently include flash-loan fees; USD conversion hardcodes a $3000/ETH fallback; slippage is a 0.1%/hop heuristic; JIT reserve recalculation is heuristic, not an exact quote; the dry-run log does not produce full opportunity records.

Copilot's smallest honest M0: **a purpose-built read-only snapshot script**. Use `DEXRegistry` + `MultiHopDataFetcher` + `AdvancedOrchestrator`, force live data, narrow to WETH/USDC on two or three venues, fetch the current Base block and live fee data, build one record per candidate path, use `estimateGas`/`SimulationService` only for routes that pass static arithmetic, append one JSONL record per candidate, and generate a summary. Do not use `recordSimulationResult` as the primary record source (it stores only route, gas estimate, wouldSucceed, error).
