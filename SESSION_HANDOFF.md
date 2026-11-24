# TheWarden arbitrage system - handoff

Compiled 2026-11-24 by eesel, for the next session to pick up where this one left off.
Repo: `StableExo/TheWarden` (public, MIT), default branch `main` at `67a9ee33` ("deploy: set healthcheckPath = /health", 2026-11-24 01:06 UTC).

## 0. How to resume (the project's own boot)

- Read `WARDEN_BOOT.md` (root) and `.warden/boot.md` first. Both are neutral continuity notes, no persona.
- Durable memory lives in the Nexus brain: Supabase project `pxbjuhtnmvfywbwmdkdr`, table `warden_memories`. Session lineage is the SESSION_STATE record under `session_id = BOOT`.
- Deterministic boot: `python3 boot.py` at the repo root (reads `boot.config.json`, key file `TheWardenKeys_*.md`). Read-only by default; `--init-state` refreshes SESSION_STATE.
- Boundaries stated in `WARDEN_BOOT.md`: **no silent commits**; secrets never echoed into chat; private data kept out of shared surfaces.

## 1. Repo state at handoff

- 16 branches. 14 are already merged into `main`. **Two hold unmerged work:**
  - `fix/arb-loop-dry-run-env` (`646739e7`) - makes `ethereum-mainnet/scripts/arb-loop.ts` honour `DRY_RUN=true` from the environment (not only the `--dry-run` flag). Commit note says Railway's start-command override did not carry `--dry-run`, so the engine ran live and exited without `ETH_PRIVATE_KEY`. **Not merged.**
  - `feat/phase1-main-ts-wiring` (`ba4af246`) - adds `phase1-main-ts.patch`, the Phase 1 signer wiring for `src/main.ts`, intended to be applied in a Codespace then removed. **Not applied.**
- Open issues and PRs: 0.
- CI: only "pages build and deployment" runs appear. The repo defines other workflows (`code-quality.yml`, `codeql.yml`, `deploy-flashswap.yml`, etc.) but no recent runs of them surfaced.

Recent `main` commits (newest first): `67a9ee33` healthcheckPath=/health; `8858d6fd` bind $PORT first; `1fd47f4e` non-blocking typecheck in buildCommand; `30475c93` drop redundant prestart; `6a252f63` executor viemPublicClient fix; then the Nov 17-18 deploy/env hardening and the Phase 1 signer series.

## 2. Railway (project "Cold Hunter")

- One project, environment `production`, three services, all deploying from `StableExo/TheWarden` main: `thewarden-coalition-api`, `thewarden-blockbuilder`, `stableexo-store`.
- **All three latest deploys FAILED** (2026-11-24 01:06 UTC, commit `67a9ee3`). Across 61 recorded deploys: 44 failed, 1 succeeded (blockbuilder, 23 Nov 19:37), 13 superseded, 3 skipped.
- Failures are at boot, not build (the Docker build completes; the typecheck is non-blocking):
  - `thewarden-coalition-api`: exits with `ETH_PRIVATE_KEY not set` (also `QN_HTTP_URL` unset). Start command `npx tsx ethereum-mainnet/scripts/arb-loop.ts`.
  - `thewarden-blockbuilder`: `WALLET_PRIVATE_KEY is required` at `src/main.ts:326`. Start command `npm start`.
  - `stableexo-store`: `Cannot find module '/app/server.js'` - start command `node server.js` points at a file that is not there.
  - All three healthcheck `/health`, which none of them serves before crashing.
- Two Railway connections point at the same account/project; one is redundant (same as the two GitHub connections).

## 3. The arbitrage system, end to end (verified map)

- **Detection**: `OptimizedPoolScanner` reads reserves through Multicall3 (`src/arbitrage/OptimizedPoolScanner.ts`); `PathFinder` builds the pool graph and paths (`src/arbitrage/PathFinder.ts`); the event-driven entry is `src/monitoring/OpportunityPipeline.ts`.
- **Build / orchestrate**: `IntegratedArbitrageOrchestrator.executeStage` routes to `executeViaV3` (`src/execution/IntegratedArbitrageOrchestrator.ts`).
- **Execute**: `FlashSwapV3Executor.executeArbitrage` - either a UserOp through a Coinbase Smart Account + CDP bundler/paymaster, or a direct transaction (`src/execution/FlashSwapV3Executor.ts`).
- **Settle**: `contracts/FlashSwapV3.sol` - `owner`-gated (`onlyOwner`), takes a flash loan, runs `_executeUniversalPath`, distributes profit to `owner`.
- **Signing**: `src/execution/signing/` (`SignerProvider`, `LocalKeySigner`, `CdpEnclaveSigner`). The V3 path as wired uses the local key, not the CDP enclave signer.

## 4. Independent audit (GitHub AI code review, commit `67a9ee3`) - and what I verified

The GitHub AI review returned 7 findings. I re-read each cited region and **all 7 are corroborated in code**:

1. **Borrowing token1 does not flip the route.** `OpportunityPipeline.ts:371-381` selects `token1` when `token0` is not flash-loan eligible, but `:387` still uses `buyPool.token0Decimals` and `:470-493` still build the route `token0 -> token1 -> token0`. The route does not start with the borrowed token. Corroborated.
2. **Profit estimate mixes human prices with token base units.** `OpportunityPipeline.ts:433` multiplies `borrowAmount` (base units) by `sellPool.price` (human-readable) with no decimal scaling. Wrong by orders of magnitude on mixed-decimal pairs. Corroborated.
3. **Live ("JIT") validation is heuristic, and the original cached path is executed.** `MultiHopDataFetcher.ts:846-894` only compares reserve ratios and discounts cached profit; missing live pool data is skipped (`:858`). `main.ts:1616-1626` logs the validation, then `:1685` passes the original `bestPath` to execution. Corroborated.
4. **Flash-loan source is overridden to Balancer.** `FlashSwapV3Executor.ts` hard-codes `sourceOverride = 0` / `flashPool = 0x0` on both send paths (around `:537` and `:680`), bypassing source selection. Corroborated.
5. **Net-profit estimate ignores gas.** `OpportunityPipeline.ts:512-513` sets `estimatedNetProfit = grossProfit` with the comment "Gas is paid by paymaster" - false on the direct-tx fallback. Corroborated.
6. **Inconsistent cost accounting.** `PathFinder.ts:179-187` subtracts wei-denominated gas from token-unit profit; `ProfitabilityCalculator.ts:70-94` omits the flash-loan fee, and `AdvancedOrchestrator.ts:202-204` filters on that simpler calculation. Corroborated.
7. **The contract does not enforce path start/end token.** `FlashSwapV3.sol:639-672` (`_executeUniversalPath`) executes the supplied steps and checks repayment but never checks the first `tokenIn` equals the borrowed token, or that the final token returns to it. Corroborated.

The review itself states it is a static review, not a runtime test or a contract security certification, and that its code-search was capped.

## 5. Security item (open)

- `.memory-exports/environment/production-config.md` sat in this **public** repo holding live production credentials. **Removed** in commit `e7ab62f8` (24 Nov 2026). Deletion does not remove it from history: **the credentials still need rotating, and the file purging from git history**, and the repo's visibility should be reconsidered.
- Other files worth eyes: `github/2025-12-15/PRIVATE_KEY_SETUP.md` (three random-looking 64-hex key strings, unconfirmed) and `archive/bitcoin-research/🔥 ~1000 BTC Bitcoin Challenge - Private Keys Directory` (1.5 MB, a directory of private keys by name). Not yet removed.

## 6. Next steps, in order

1. **Merge `fix/arb-loop-dry-run-env`** - it directly unblocks the coalition-api booting in dry-run.
2. **Set the Warden services' Railway variables** (`ETH_PRIVATE_KEY` / `WALLET_PRIVATE_KEY`, `QN_HTTP_URL`, `BASE_RPC_URL`, or run with `DRY_RUN=true`), fix `stableexo-store`'s start command, and give each service a real `/health`.
3. **Fix the high-severity findings before enabling live execution**, starting with #1 and #2 (build the route from the chosen borrow token, with explicit decimal conversions) and #3 (execute the freshly validated path).
4. **Security**: rotate the exposed credentials, purge history, decide repo visibility.

## 7. Key env vars (arbitrage)

`ENABLE_FLASHSWAP_V3`, `FLASHSWAP_V3_ADDRESS`, `CDP_PAYMASTER_URL`, `DEPLOYER_PRIVATE_KEY` or `WALLET_PRIVATE_KEY`, `BASE_RPC_URL`; optional `SIGNER_MODE` and the `CDP_*` set.

## Sources

- GitHub read via the connected `StableExo` account: repo, tree (11,939 paths), branches (16), commits, compare `main...<branch>`, and file contents.
- Railway read via the connected project "Cold Hunter": 61 deployments, service instances, build and runtime logs.
- The GitHub AI code review of commit `67a9ee3` (provided by the team), with each finding re-verified against the cited file lines.
- `WARDEN_BOOT.md`, `.warden/boot.md`, `boot.config.json`, `sessions/README.md`, `github/2026-10-17/eesel_collaboration_notes.md`.
