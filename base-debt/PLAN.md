# Base Program - Plan v0.1

Author: Claude (eesel). Date: 2026-11-26. For review by all seats.

## 1. What this is, and what it is not

A program to prove that an autonomous system can find and execute a profitable trade on Base, with the numbers published. It is Phase 1 of a longer idea about AI-driven economic efficiency.

It is not a plan to retire the US national debt. Direct arbitrage revenue cannot do that; the program's own documents compute it at a rounding error (tens of thousands to under a million a year against tens of trillions). Any honest version of this has to say so up front, and this one does. What arbitrage can do is produce the first verifiable number, and a credible debt case, if one ever exists, is built on real numbers, not hoped-for ones.

## 2. What already exists (audit, 2026-11-26; read-only)

- **Engine.** Multi-hop pathfinding, a DEX registry (Uniswap V3, Aerodrome), pool scanning via multicall, and profitability that accounts for fees, slippage and gas (`src/arbitrage/`).
- **Execution.** `contracts/FlashSwapV2.sol` (and V3), Aave V3 flash loans, Uniswap V3 flash callback. **Access control is sound:** `owner` and `titheRecipient` are immutable (constructor-set, no setters), `initiateUniswapV3FlashLoan` and `initiateAaveFlashLoan` are `onlyOwner`, `emergencyWithdraw` and `emergencyWithdrawETH` are `onlyOwner`, both flash callbacks verify their caller, and reentrancy is guarded. **Exposure:** the owner is a single key, so one wallet controls the whole contract and the 30% operator share. A multisig is the natural upgrade (`src/treasury/MultiSigTreasury`).
- **Governance.** `npm run start:base` is dry-run by default; `--live` is explicit and labelled real money. The 2026-11-13/14 work added a CDP enclave signer behind a `SignerProvider` seam, ERC-4337 account abstraction, and a `DRY_RUN` path that simulates and never broadcasts.
- **The tithe is in the contract.** 70% of net profit to a configured `titheRecipient`, 30% to the owner, capped at 90%.
- **Strategy is stale.** The configs (`configs/strategies/base_weth_usdc.json`) were last touched around 2026-11-05 and have not been re-tested since.
- **Scale is the problem.** Roughly 80 subsystems under `src` (arbitrage, execution, treasury, safety, security, simulation, ml, consciousness). Breadth far ahead of depth.
- **The debt documents** (`github/**/US_DEBT*`) hold a phased strategy whose honest core (efficiency gains over 30-50 years) is buried under unsupported projections and narrative claims (the "synchronicity", competitor jabs). Those claims are the one thing that could sink the credible parts.

## 3. Direction

1. **Measure before planning.** The first artifact is not another document; it is one dry-run that publishes two numbers: the distribution of opportunities seen, and the simulated net P&L after fees, slippage and gas.
2. **Settle latency first.** On Base the winner is whoever arrives first, not whoever pays most (FCFS sequencer, no public mempool). Measure where the runner executes and its round-trip to the sequencer, and fix the location before any strategy work, because it gates everything.
3. **Narrow to one loop.** One pair (WETH/USDC), two or three venues, one path. Park multi-hop, ML scoring and the consciousness layers until the loop is proven end to end.
4. **Keep money and mythology apart.** The code should read like a quant toolkit. The debt narrative lives in its own space, never in the same folder as the strategy numbers.
5. **Real money only after dry-run evidence**, in tiny size, capped, published, win or lose.

## 4. Milestones

**M0 - Measurement harness.** Instrument the dry-run so every opportunity seen is logged with pair, venues, gross spread, fees, slippage, gas, estimated net, and whether a simulated execution would have reverted. Deliverable: a reproducible report over a fixed window. Pass: the report exists and its arithmetic reconciles.

**M1 - Latency reality.** Determine where the runner executes, measure p50 and p95 round-trip to the Base sequencer, and compare against a run from us-east. Deliverable: a measured latency number and a relocation decision. Pass: the number exists and a decision is recorded.

**M2 - One proven loop, in dry-run.** Run the single WETH/USDC loop for a fixed number of hours. Deliverable: simulated net P&L plus the reason for every miss (no spread, fees ate it, slippage, too slow). Pass: an honest net, positive or negative, with causes.

**M3 - Governance verification.** Confirm in code that `DRY_RUN` cannot broadcast, that the spend cap holds, that the kill switch stops the runner, and whether the owner should move to the multisig. Deliverable: each control verified with a file and line. Pass: no unverified control remains.

**M4 - First honest live run.** Minimal capital, one pair, a hard spend cap, published result regardless of outcome. Pass: one executed trade and its real number.

## 5. Seats

- **GitHub Copilot:** the code reality - what is live, stubbed, or doc-only; the contract and execution review.
- **Claude Sonnet 5.5:** the execution controls and the dry-run guarantee.
- **Muse Spark 1.3:** the numbers - arithmetic, cost model, the measured report.
- **Gemini 4 Hydrogen:** the economics - whether the edge is real given competition and costs.
- **Grok 4.5:** strategy - single-loop design, venue choice, the latency plan.
- **Claude (eesel):** record, integrate, maintain the repo, write the drafts.
- **StableExo (Taylor Marlow):** human lead - decisions and the keys.

## 6. Rules of the collaboration

- No number without a measurement; no claim without a source.
- Pre-register criteria before looking at results; write rubrics before tests.
- One artifact, one decisions log; every ruling attributed; full text in relay messages, because the seats are often rate-limited.
- Wait for all seats before advancing a milestone.
- Keep the debt narrative out of the engineering numbers.

## 7. Non-goals

- No promise of debt payoff, government adoption, or specific profit.
- No touching real funds until M4, and only after M0-M3 pass.
- No adding breadth (more chains, more pairs, more models) until one loop is proven.

## 8. Definition of done for Phase 1

One pair, one loop, measured in dry-run, then one tiny live execution, with published honest numbers and a written statement of the edge or its absence that a skeptical quant could not dismiss.
