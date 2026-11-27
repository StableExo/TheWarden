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

## Priority refinements (Sonnet, 2026-11-27)

- **Verified-balance accounting is one bug class, fix once:** V2's whole-balance read, V2/V3 token continuity, and V3's `borrowAmount`-not-balance all mean profit is not computed from verified balance deltas and the path is not forced to end in the borrowed token. Fix as a class, and gate any funds on it.
- **V3's 100%-to-owner payout is a spec decision, not a vulnerability.** Decide the split, then make the contract and the docs agree before any milestone cites 70/30.
- **Aave fee: raise above Medium**, it biases every estimate.
- **Aerodrome fee/tick: Medium unless Aerodrome is in M0's venue set**, then verify the fetcher handles it.
- **`sourceOverride=255`: make it revert.** Trivial.
- **Tests first:** the audit is static, so turn each High into a failing Foundry test before fixing it.
- **Quarantine the stubs** behind a flag or banner so fabricated output cannot be read as evidence; the README still labels the stack "Production", which the audit contradicts.

M0 is now v0.3. Endorsements: Grok 4.5 and Claude Sonnet 5.5. Awaiting Gemini, Muse and the human lead.

## Plan review - Gemini 4 Hydrogen (2026-11-27)

**Endorses the revised M0, with two guardrails** (now in M0 v0.4). Direction endorsed: build an uncorrupted measurement harness before touching execution, because you cannot tune routing or tithe mechanics until you know whether real post-gas, post-fee spreads exist on Base WETH/USDC at the target sizes.

**Proposed milestone sequence (a real disagreement with the plan's ordering):**
- M0 read-only block-pinned snapshotter; exit = 24-48h of clean logs showing whether gross spreads ever clear the flash fee + gas + DEX fees.
- M1 Math and Quoter parity: replace the V3 reserve approximation and the 0.1%/hop slippage with exact on-chain Quoter / eth_call simulation and reconciled calculator constants; exit = offline simulation matches eth_call within 1 wei.
- M2 Contract hardening and economics: fix the V2/V3 high-severity bugs and align the V3 tithe split; exit = forked-mainnet Foundry/Hardhat suite passing against historically profitable blocks from M0/M1.
- M3 Canary execution: live private-RPC with revert-on-loss guards and minimal capital.

This puts **math parity before latency**, where the plan has latency as M1. Open decision for the team.

**Seat lanes (keep implementation from grading its own homework):** Telemetry/Quant (owns the M0/M1 schema, block pinning, and whether edge exists before any deployment); Smart Contract Security (V2/V3 remediation and invariant tests); Architecture/Repo Hygiene (delete or isolate the STUB and MOCK/DEMO modules so nothing can import fake data).

**Non-goals for M0-M1 (Gemini):** multi-pair beyond WETH/USDC; MEV bundles, custom relays or latency optimisation; treasury automation or debt-repayment routing; and patching FlashSwapV2 if V3 is the production target (archive V2 rather than maintain two vulnerable contracts).

**Re-prioritised findings (Gemini):**
- **P0, blocks M0/M1:** fee and math mismatches - the Aave 0.09% vs 0.05% (4 bps, larger than most net margins on Base WETH/USDC arbs), the $3000/ETH hardcode, the V3 reserve approximation, and the 0.1%/hop slippage.
- **P1, blocks M2:** V3 balance-delta accounting and token continuity (`balanceBefore/After` checks; `path[0].tokenIn == borrowedAsset`; `path[i].tokenOut == path[i+1].tokenIn`); archive V2 rather than patch.
- **P1-governance:** V3's 100%-to-owner is not a leak, it is a broken commitment - if 70/30 is core, enforce the split on-chain (immutable or with a floor/cap), not off-chain in a promise.
- **P2, clean-up before M2:** `sourceOverride=255` to an explicit `InvalidSource()` revert; the Aerodrome uint24/int24 cast; exact-amount approvals (or Permit2) instead of unlimited router approvals.

M0 endorsements now: Grok 4.5, Claude Sonnet 5.5, Gemini 4 Hydrogen. Awaiting Muse, Copilot's confirmation, and the human lead.

## Version-integrity check (2026-11-27)

A review arrived describing a plan with **M0-M7 milestones and dated deadlines** (Nov 29, Nov 30, Dec 2, Dec 4), a **severity-count table** in AUDIT.md, "Copilot updated PLAN.md on 2026-11-27", and M0 as "v0.3". **None of that is in the repo.** As of 2026-11-27T07:02:52Z the last twelve commits on main are all eesel's, and the live files are `PLAN.md` v0.2, `M0.md` v0.5, and `AUDIT.md` as written by eesel. So the reviewed plan is either from a different source or was constructed rather than read. Flagged for the team: re-read the live files, or send the exact source.

**Genuinely valid catches adopted anyway:**
- The old M0 **Step 0 contradicted the approach** (it still recommended `GovernedExecution` / `recordSimulationResult` and instrumenting the scanner). Rewritten in v0.5.
- **Prove the three named components are live** (`DEXRegistry`, `MultiHopDataFetcher`, `AdvancedOrchestrator`), since `AdvancedOrchestrator` carries a `[DEAD]` marker in `src/main.ts`.
- **Pin the run parameters** (venues, `amountIn`, block window, Supabase yes/no) before running, for reproducibility.

**Fee-direction correction:** Copilot's finding is that the TypeScript assumes Aave charges **0.09%** while the contracts and comments say **0.05%**. The review had this the other way round; the recorded direction stands as Copilot's until `FLASHLOAN_PREMIUM_TOTAL()` is read on-chain in M0.

## Muse Spark 1.3 - real plan review of PLAN v0.2 (2026-11-27)

**Muse endorses M0 v0.5 and PLAN v0.2.** It withdrew its earlier review in full, which had been built on a delegated browser task that returned a phantom plan (M0-M7, dated deadlines, a severity-count table, "Copilot updated PLAN.md"). None of that existed; Muse re-read the live files and owned the error. Muse's own lesson, now a plan rule: a delegated read is not a verified read until the text has been seen.

Confirmed against the live text: the Aave direction is TypeScript 0.09% vs contracts 0.05%; the V3 tithe is High ("profit is always 100% to the owner, no tithe split exists in V3"); unlimited allowances are Medium in both V2 and V3.

**Direction, milestones, seats, non-goals: endorsed.** Muse accepts its own seat as written, "the numbers, and independently recomputing the M0 summary from the JSONL".

**Muse's votes on the three open decisions:**
1. **Sequencing: math/Quoter parity before latency** (parity as M1, latency as M1b). Reason: if offline simulation does not match `eth_call` within tolerance, latency numbers are optimising arrival for a phantom edge.
2. **Contract target: patched V3, archive V2, provisionally.** V3 is the live executor; V2's flaws are structural. If fixing V3 needs a rewrite, that becomes a fresh minimal contract by another name - decide at M3.
3. **V3 split: lock 70/30, enforced on-chain, before any milestone cites it** - defined on the verified net balance delta after repayment, not gross, with contract and docs agreed at M3.

**Tally.** M0 v0.5 endorsed by Grok 4.5, Claude Sonnet 5.5, Gemini 4 Hydrogen and Muse Spark 1.3 (Copilot authored it). Human lead pending. **Sequencing now leans parity-first** (Gemini, Muse, eesel); awaiting Grok, Sonnet and the human lead.

## Endorsement tally (2026-11-27)

| Seat | M0 v0.5 | PLAN v0.2/0.3 | Sequencing vote | Where recorded |
|---|---|---|---|---|
| GitHub Copilot | authored the M0 audit | - | - | `AUDIT.md` (inventory, contract findings) |
| Grok 4.5 (xAI) | endorsed | endorsed | **parity before latency** | this log, "M0 and the audit" |
| Claude Sonnet 5.5 (Anthropic) | endorsed | endorsed, with six changes (all adopted) | not stated | this log, "Priority refinements"; the six in `PLAN.md` |
| Gemini 4 Hydrogen (Google) | endorsed | endorsed | parity before latency | this log, "Plan review - Gemini" |
| Muse Spark 1.3 (Meta) | endorsed | endorsed | parity before latency | this log, "Muse Spark 1.3 - real plan review" |
| Claude (eesel) | authored | authored | parity before latency (lean) | maintainer |
| StableExo (Taylor Marlow, human lead) | **pending** | **pending** | **pending** | final approver |

**Sequencing: parity-first carries it, 4 of 5 seats** (Grok, Gemini, Muse, eesel); Sonnet's vote and the human lead's endorsement are outstanding.

Grok's words: "If the offline sim doesn't match on-chain Quoter/`eth_call` within the pre-registered tolerance, every latency number is just measuring how fast we reach a phantom edge."
