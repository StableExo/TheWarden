# Pre-escrow + auto-release platform sweep - 2026-11-28

Eesel seat's parallel sweep, run live at ~11:01-11:03 UTC. Goal: platforms where the money is escrowed before work, and ideally releases on a timer if the buyer goes quiet. For each: escrow terms, auto-release, claim model, payout rail, agent path (API or MCP), and live supply.

## NEAR AI Agent Market (market.near.ai) - THE MATCH

- **Escrow: every hire.** "the buyer funds escrow at award; it releases to the agent owner's account when the buyer accepts the deliverable." (llms.txt)
- **Auto-release: YES.** Standardized Job Terms v2026-10-15, section 4.3 "Deemed acceptance on inaction": "If the Buyer takes no action within the Acceptance Window - neither accepting the output nor raising a dispute - the output is deemed accepted, and the Held Funds are released to the Agent Provider, less the Platform Fee." The Acceptance Window is **3 to 7 days** after delivery (3 days if the buyer selects none), fixed at hire.
- **Platform fee: 5%** of the job price, deducted before disbursement. No fee on a refund.
- **Rails:** USD (Stripe, agent is a Stripe connected account) or USDC (marketplace wallets, keys held by the Wallet Provider's infrastructure, parties hold no keys). Payout "usually within seconds" after acceptance (section 5).
- **Claim model:** bid on open board jobs (`GET /v1/jobs/board`, `POST /v1/jobs/{id}/bids`), or receive a dispatched assignment (managed agents). One bid per job. `startedAt` matters: until you call `POST /v1/assignments/{id}/start`, the buyer can cancel for a full refund; after it, you are protected up to the SLA deadline.
- **Gates:** reading `minBuilderVerification` on a row is required before bidding (a job above your badge refuses with `400 builder_verification_required`). A USD job takes bids only from builders with Stripe connected; **USDC jobs need nothing**.
- **Agent path: YES, the strongest found.** REST API under `/v1/*` (auth `Authorization: Bearer aat_<token>`; the token pins exactly one agent and can neither act as the owner nor move funds) AND a Model Context Protocol endpoint at `POST /mcp` (JSON-RPC 2.0 over HTTP, stateless), same bearer. Worker tools include `marketplace__list_open_jobs`, `marketplace__place_bid`, `marketplace__list_my_assignments`, `marketplace__start_assignment`, `marketplace__submit_deliverable`, `marketplace__upload_file`, `marketplace__confirm_upload`, `marketplace__send_message`, `marketplace__report_progress`. Integration over MCP supports push (signed webhooks) and pull (polling every 30-60 s).
- **Two ways in, and neither is a pasted key:** (1) mint an `aat_` token for the agent in the web app and hand it over via eesel's credential form; or (2) OAuth - a client points at `$BASE/mcp`, gets a `401` with `WWW-Authenticate`, the person signs in and approves in the browser, and the marketplace mints short-lived credentials per request (the consent screen can bind the grant to one agent). MCP buyer tools live at `/mcp`; the balance-spending variant at `/mcp/pro`.
- **Live supply:** the public job read (`GET /v1/jobs`) returns `401 unauthorized` without a token, so the board can only be counted with a token. Earlier snapshot this session: 1,205 agents, 1,365 jobs posted.
- **Competitions:** a job of kind `competition` holds a prize pool in USDC; enter with `POST /v1/jobs/{id}/entries`, submit before the deadline, a platform judge splits the pool.

## BountyHub (bountyhub.dev) - escrow yes, auto-release NO, no agent path

- **Pre-funding:** "A bounty can be paid in advance before the solution is submitted, which can be retracted if the issue is not solved." So even a pre-paid bounty is retractable, and a merged PR alone is not enough: "A bounty is not necessarily rewarded when a pull request is merged. The bounty creator has the ability to review the pull request and decide if it meets the requirements."
- **Auto-release: none.** The creator decides; there is no timer.
- **Claim:** submit a GitHub pull request, import it on BountyHub, await the creator's decision; dispute within 7 days.
- **Payout:** Stripe (121 countries) or PayPal. 0% hunter fee, 10% creator fee.
- **Agent path: NO.** Manual GitHub plus a Stripe dashboard; no API or MCP documented.
- **Live supply (browse page, 2026-11-28):** $15,999 microg RCS; $2,340 microg WearOS; $800 fluxer Threads; $500 fluxer Polls; $500 fluxer Events; $420 gqrx TX; $300 microg Nearby Share; $250 fluxer RPC; $250 microg Cast; $200 AzerothCore map partitioning.

## Algora (algora.io) - OUT

- `algora.io/bounties` returns **404**; the homepage is now a recruiting product ("Hire your competitors' best engineers"). Algora has pivoted away from bounties. Treat as dead for our purpose.

## Bottom line

NEAR is the only platform found that has all three at once: real escrow, **auto-release on the buyer's silence (3-7 days)**, and an agent path (MCP + REST) that can run the whole loop with no human in it. The one thing it needs from the owner is the credential: mint an `aat_` token for the agent in the web app, or approve an OAuth sign-in so a client can act as them. BountyHub has escrow but waits on a human and has no agent path. Algora is gone.
