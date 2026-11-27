# Base Program - Plan v0.4

Author: Claude (eesel). Date: 2026-11-27. Revised after review by Grok 4.5, Claude Sonnet 5.5 and Gemini 4 Hydrogen; Copilot authored the M0 audit. One sequencing decision remains open, and the milestone numbering is fixed once that is chosen.

## 1. Purpose

**Determine whether** an autonomous system can find and execute a profitable trade on Base, **and publish the number either way**. This is Phase 1 of a longer idea about AI-driven economic efficiency. It is not a plan to retire the US national debt; direct arbitrage revenue cannot, and the job here is one verifiable number. Trust is built from real numbers.

## 2. What already exists

See `AUDIT.md` for the full read-only audit. In short: a capable multi-hop engine, a soundly access-controlled executor (V2), a real governance chokepoint (`GovernedExecution`), but a detection path partly built from **stubs that fabricate opportunities** (`scanner.ts`, `pathfinding.ts`), a P&L layer that **hardcodes $3000/ETH** and uses a 0.1%/hop slippage heuristic, an Aave fee disagreement (0.09% vs 0.05%), and a FlashSwapV3 that pays **100% to the owner with no tithe**.

## 3. Direction

1. **Measure before planning.** The first artifact is a dry-run snapshot, not another document.
2. **Narrow to one loop.** WETH/USDC, two or three venues, one path.
3. **Latency matters, but from M1 onward.** Base is won by arriving first, not by paying most; M0 is cheap and keyless, and is not a feasibility signal.
4. **Keep money and mythology apart.** The code reads like a quant toolkit; the debt narrative lives elsewhere.
5. **Real money only after dry-run evidence**, tiny, capped, published, win or lose.

## 4. Milestones

Numbering is nominal until the sequencing call in section 8 is made.

- **M0 - Measurement harness.** A purpose-built, read-only, block-pinned snapshot over WETH/USDC on 2-3 venues, one reconciled JSONL record per candidate, plus a summary. No key, nothing broadcast. Pass: it reproduces and reconciles (tolerance pre-registered).
- **M1 - Math/Quoter parity (decided).** Replace the V3 reserve approximation and the 0.1%/hop slippage with exact on-chain Quoter / `eth_call` simulation and reconciled calculator constants. Pass: offline simulation matches `eth_call` within the pre-registered tolerance.
- **M1b - Latency reality.** Collect p50/p95 round-trip to the Base sequencer from the current box (cheap, and it can run in parallel with M1), but **hold the relocation decision until parity passes**. Pass: a measured number and a decision.
- **M2 - One proven loop, keyless.** Run the loop in dry-run using `eth_call` or a fork only, so "cannot broadcast" means no key exists rather than a flag being set. Deliverable: simulated net plus a pre-registered miss taxonomy (stale quote, outbid, revert, gas) and a net threshold. Pass: an honest net, with causes. Move the DRY_RUN and kill-switch verification ahead of M2 if M2 will ever hold a key.
- **M3 - Contract remediation and governance verification.** Precondition for M4: verified-balance accounting and token continuity fixed (`balanceBefore/After`; `path[0].tokenIn == borrowedAsset`; `path[i].tokenOut == path[i+1].tokenIn`); the V3 payout split decided and enforced on-chain; each High turned into a failing Foundry test before its fix; the DRY_RUN guarantee, spend cap and kill switch verified with citations; the stubs quarantined behind a flag. Decide here whether M4 uses a patched V2/V3 or a fresh minimal contract.
- **M4 - First honest live run.** Minimal capital, one pair, hard spend cap, revert-on-loss guards, published result. **Conditional on M2 clearing its threshold and M3 passing.** Pass: one executed trade and its real number. One trade proves the mechanics, not the edge.

## 5. Seats

- **Copilot:** the code reality (audit, inventory, contract review).
- **Sonnet:** execution controls and the dry-run guarantee.
- **Muse:** the numbers, and **independently recomputing the M0 summary from the JSONL**, so the author is never the only checker.
- **Gemini:** the economics and the fee/math parity.
- **Grok:** strategy and the latency plan.
- **eesel:** record, integrate, maintain the repo, draft.
- **StableExo (Taylor Marlow):** human lead; decisions and the keys.

Seat lanes keep implementation from grading its own homework: Telemetry/Quant, Smart Contract Security, Architecture/Repo Hygiene.

## 6. Rules

- No number without a measurement; no claim without a source.
- Pre-register criteria before looking at results; write rubrics before tests.
- One artifact, one decisions log; every ruling attributed; full text in relay messages.
- **Quorum:** a decision needs the owning seat plus two others; absentees are recorded rather than waited for indefinitely.
- **Keys stay out of every seat and out of the repo.**
- The debt narrative stays out of the engineering numbers.
- **A read must be quoted.** A claim to have read a file comes with the URL and a short quote from it; a delegated or summarised read is not a verified read, and a phantom document once entered a review under the guise of a live read.

## 7. Non-goals

- No promise of debt payoff, government adoption or specific profit.
- No real funds until M4, and only after M2 and M3 pass.
- No added breadth until one loop is proven: no multi-pair, no MEV bundles or relays, no latency optimisation work, no treasury automation or debt-repayment routing.
- **AEV, Ethereum mainnet, and the other TheWarden systems are out of scope**, to stop drift.
- Do not patch FlashSwapV2 if V3 is the production target; archive it.

## 8. Open decisions

1. ~~**Sequencing**~~ **DECIDED, 5-0: math/Quoter parity before latency.** Parity is keyless, deterministic and reproducible; a latency number for a simulation that does not match the chain measures arrival at a possibly-phantom edge. Latency data is collected in parallel (M1b) but the relocation decision waits.
2. **Contract target for the single loop:** patched V3 with V2 archived (provisional), decided finally at M3.
3. **Venue parity fallback:** if V3 or Aerodrome cannot reach parity within tolerance, evaluate those venues **Quoter-only** rather than stalling the milestone.
4. **V3 payout split:** decide the split, then make the contract and the docs agree before any milestone cites 70/30.

## 9. Definition of done for Phase 1

One pair, one loop, measured in dry-run, then one tiny live execution, with published honest numbers and a statement of the edge or its absence that a skeptical quant could not dismiss.
