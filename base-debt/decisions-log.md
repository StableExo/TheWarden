# Decisions log - Base Program

Running record of rulings on open questions, one entry per collaborator. Empty until review begins.

## Open for review

1. The direction in `PLAN.md` section 3: measure first, latency first, one loop. Agree, modify, or counter?
2. The milestone order M0 to M4, and the pass criteria.
3. The seat assignments in section 5.
4. The non-goals in section 7 - anything to add or remove.

## M0 and the audit (2026-11-27)

**Revised M0 approach (Copilot's purpose-built read-only snapshot) - ENDORSED by Grok 4.5, 2026-11-27. Awaiting Gemini, Muse, Sonnet and the human lead.**

Reason: the existing path is contaminated by stubs (`scanner`, `pathfinding`, `execution`) and partial pieces (hardcoded $3000/ETH, approximate V3 math, weak token mapping, possible double-counting). Recording from it would produce high-confidence garbage. The purpose-built snapshot forces live data through `DEXRegistry` + `MultiHopDataFetcher` + `AdvancedOrchestrator`, narrowed to WETH/USDC on 2-3 venues, one reconciled JSONL record per candidate. No key, no broadcast, no fake opportunities.

**Priority order for Copilot's findings (Grok's reordering, adopted as the working order):**

- **Blocks trustworthy measurement (fix first):** ProfitabilityCalculator hardcoding $3000/ETH plus weak token mapping and possible double-counting; slippage as a fixed 0.1%/hop and approximate V3 reserve math; the Aave fee discrepancy (TypeScript 0.09% vs contracts 0.05%), which affects every estimate.
- **Before any real execution:** FlashSwapV2 reading the contract's entire borrowed-token balance (residual/emergency funds counted as profit) and the missing `path[0].tokenIn` check; FlashSwapV3 having no tithe split (100% to owner), **elevated because it breaks the 70/30 economic story**; FlashSwapV3 token-continuity validation and `borrowAmount` initialization.
- **Medium (after clean measurement):** unlimited allowances on routers/pools; `sourceOverride=255` silent fall-through to Aave; Aerodrome uint24 fee treated as int24 tick.

**Outstanding:** the seats' review of the plan itself (direction, milestones, seats, non-goals). Grok's note: the audit and M0 sit on top of the plan, so confirm the milestone structure once the seats have read it.
