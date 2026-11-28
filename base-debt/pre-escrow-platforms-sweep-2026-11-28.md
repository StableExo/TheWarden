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

## Muse's pass (2026-11-28, secondary labeled where not counted live)

Muse verified the same seeds and surfaced new boards.

- **Algora - OUT, confirmed.** `/bounties` 404 twice, home page is now a hiring site, `/challenges` shows 4 challenges all completed (Turso $1,000; Golem $15,000; VSCode $15,000; Rust pretty printer $25,000; $56,000 total, all closed). Live funded supply: 0.
- **NEAR - passes both tests, but you must win a bid.** Escrow held on hire; "a deliverable you leave untouched is accepted for you when the acceptance window ends: 3 days after the agent submits, unless you chose a longer window, up to 7 days." Fee 5% ($100 job -> owner $95). Claim without hand-pick: no for the paid board. Secondary supply: 33 open jobs ($0-$2,000) on 2026-11-20.
- **AgentGigs - escrow yes, auto-release NO, supply 0.** Release is buyer approval plus a default 24h cooldown; silent buyer = stuck payment. Stripe KYC is a required one-time human step. Secondary supply check: "Open Jobs (0)".
- **BountyHub - mostly promises.** Only 19.2% of listings escrowed (5 of 26, median $87.50); release is a human accept, no timeout; no API or MCP.
- **IssueHunt - escrowed, but the maintainer decides your share.** Not a pre-agreed price; supply stale (most deposits 2018-2019).
- **Gitcoin - sunset** its bounty board; **Replit Bounties - dead** (redirects to Contra); **Layer3 - wrong category** (quests, not priced work).
- **Upwork - real escrow + 14-day auto-release, human-gated** (10% fee; buyer picks from proposals; no public API, not agent end-to-end).
- **New boards Muse rates higher:** Agent Bounties (on-chain Base USDC escrow, 12 open, median $1.45, 46 paid bounties with tx hashes); GitReward (non-custodial Base escrow, auto-payout on merge, 3% fee, single-oracle payout).

**Muse's ranking by the two tests:** 1 BasedAgents, 2 NEAR, 3 Upwork, 4 AgentGigs, 5 BountyHub/IssueHunt/GitReward, 6 the dead ones.

## BasedAgents (basedagents.ai) - Eesel's live check, VERIFIED - new #1

Read live 2026-11-28 ~11:14 UTC.

- **Escrow: yes, by default.** "By default the bounty is deposited into the registry's escrow wallet when the task is posted and released to the agent when you accept." Opt out per task (wallet-to-wallet at acceptance). Custodial today (the registry's house wallet), with an on-chain escrow contract specified but not yet deployed.
- **Auto-release: YES, 7 days.** "Escrow pays the agent the moment you accept, or after seven days without a review."
- **Claim without a hand-pick: YES.** A verified agent claims; first claim wins (claim backed by a refundable 1 USDC bond per Muse).
- **Payout rail:** USDC on Base over x402, straight to a wallet we name. No KYC stated.
- **Agent path: YES, and the easiest to connect.** MCP server `npx @basedagents/mcp` (tools: browse_tasks, claim_task, submit_deliverable, get_task_payment, ...) AND a **hosted Streamable-HTTP MCP at `https://mcp.basedagents.ai/mcp` that needs no install and no keys for reads** (OAuth only for post_to_board). REST + OpenAPI at `api.basedagents.ai/v1`. CLI: `npx basedagents register`, `tasks --status open`, `tasks claim`, `tasks deliver`, `tasks payment`.
- **Real payments are proven, not promised:** live "Recently paid" list with Basescan links for every settlement; "79 tasks paid, 43.70 USDC paid out" all-time. Known paid examples: 0.10 USDC (WURK onboarding pilots), 1.00 USDC, 2.00 USDC (MCP compatibility probes, HN summary).
- **Live open supply: 14 open tasks, 1,398 registered agents.** Examples now open: "Industrial Sentinel Revenue Guard" 0.25 USDC x5, "Industrial Sentinel Revenue Cashback" 2.00 USDC x3.
- **One honest catch:** the board is real but shallow in money. All-time payout is 43.70 USDC across 79 tasks. It is a $0.10-$2 board in practice.

## Updated bottom line after Muse + live check

**BasedAgents is now the top pick**, ahead of NEAR: it has escrow, a 7-day auto-release, claim-without-being-picked, and a hosted keyless MCP. Its weakness is tiny amounts. NEAR is second: bigger prices shown ($0-$2,000), but you must win a bid, and it needs the owner's `aat_` token or an OAuth sign-in.

## Gemini's pass (2026-11-28)

- **Upwork: the cleanest timer of all.** "Take no action - if there's no response within 14 days, funds are automatically released", then a 5-day security hold before funds move to Available. Client funds the milestone upfront. Human-gated, no API or MCP.
- **NEAR:** confirms the deemed-acceptance-on-inaction clause. Gemini marks the exact day count unverified; our live read of the terms fixes it at 3-7 days (3 by default).
- **AgentGigs:** escrow held until client approval, then a 1-10 business day cooldown; no buyer-inaction auto-release. Commission 10%/7%/5% by tier; minimum budget $1.
- **BountyHub:** no auto-release timer; payout requires creator acceptance.
- **Algora - CONFLICT, resolved to dead.** Gemini lists Algora as open, but only from secondary sources (gigs.sh, dev.to). Muse checked it live twice in a browser and I scraped it once: `algora.io/bounties` is 404 and the site is now a hiring product. Three live reads beat stale secondary sources; Algora stays dead.
- **Others:** Gitcoin, IssueHunt, Layer3, Freelancer, Replit - Gemini marks them largely unverified; Muse and I resolved Gitcoin (sunset), Replit (dead) and Layer3 (not a work board).
- **BasedAgents was not in Gemini's list.** It remains the verified top pick.

## Copilot's pass (2026-11-28)

Copilot keeps the strictest standard: a marketing page is not proof of escrow, and "funded task" means a live listing whose funding is verifiable.

- **NEAR:** affirmative escrow in the official docs ("moves the budget into escrow... The money leaves the buyer's balance but doesn't reach the agent yet"), a genuine deemed-acceptance trigger, and a documented MCP. It marks the window, fee, payout time and funded count unverified; our live read of the terms fixes the window at 3-7 days and the fee at 5%.
- **Upwork:** funded milestones, 14-day review then a 5-day hold; human-gated, restricted API.
- **BountyHub:** calls it a prepay option, not proven escrow; no auto-release found. Flags the "0% hunter fee" against official pricing, but that is the creator side: BountyHub's own table reads "Fees for Bounty Hunters 0% / Fees for Bounty Creators 10%". Not a conflict.
- **Algora:** no official escrow source found; a board snapshot showed "Open Bounties: $0, 0 bounties". Agrees it is effectively dead.
- **AgentGigs:** unverified; flags a domain ambiguity (agentgigs.io vs agentgigs.org).
- **Layer3:** objective on-chain reward escrow (example arithmetic 10,000 x 0.5 USDC = 5,000 USDC), but quests, not coding work.
- **Gitcoin, IssueHunt, Replit, Freelancer:** unverified or historical. Freelancer has funded milestone escrow but no verified auto-release.
- Copilot's line: "No defensible live funded-task count was obtained for most services."

## Sonnet's pass (2026-11-28)

- **New find - Claw Earn** (https://aiagentstore.ai/claw-earn), beta. USDC on Base, locked on-chain. Buyer silence auto-approves after **48 hours** and pays out like an approval, **90% worker / 10% platform**. Any funded wallet, human or agent, can take tasks; email optional; no KYC mentioned; **instant-start tasks go to the first eligible agent with no buyer pick**. API endpoints exist; contract-only automation unsupported.
  - **Catch 1, stake at risk:** the worker must stake first (30% on the first task, then 20%, then 10%); missing the deadline slashes the stake. Newcomers can auto-start only up to 100 USDC.
  - **Catch 2, no supply:** the marketplace showed **0 available, 1 in progress, 83 completed** (possibly cached; Grok to re-count).
- **NEAR auto-release - resolved in our favour.** Sonnet could read only the legacy docs (a submission unreviewed for 24 hours triggers a dispute, not a payout) and rightly marks the seed unverified. Our live read of the **current** Standardized Job Terms (v2026-10-15, section 4.3) is the current record: silence for the Acceptance Window (3-7 days) releases the funds. Current terms beat legacy docs.
- **NEAR MCP - corrected.** Sonnet says the MCP server covers only the employer side. The live MCP doc says a self-hosted agent also gets the worker tools over `/mcp` (`list_open_jobs`, `place_bid`, `submit_deliverable`, `upload_file`, `start_assignment`, and more). Workers can use MCP, not only REST.
- **NEAR KYC:** USD jobs need a Stripe Connect payout setup with human identity verification; USDC and NEAR jobs avoid it. Matches the live terms (`usd_not_accepted` without Stripe).
- **AgentGigs:** Sonnet found only a Product Hunt blurb; email verification plus a bank connection are the human steps.
- **Upwork:** not usable for an agent (bots barred).
- **Compliance rules to keep:** the payee must be a person or entity (mirrors our seller-of-record rule); wallet-only access does not remove tax or sanctions duties; signing keys and API keys live in the owner's secret store, never in chat or the repo; on repo bounties submit only our own code, check the license and CLA, and check whether the repo bans AI-written pull requests; confirm self-reported platform claims on-chain.

## Grok's pass (2026-11-28)

- **NEAR:** confirms platform-held escrow ("Money never moves directly from buyer to agent. The marketplace holds the payment, and only acceptance releases it") and the 3-7 day auto-accept. Adds payout detail: USDC balance in seconds, withdraw for the network fee only, no minimum; **USD via Stripe Connect has a 14-day hold on new earnings and a $5 minimum**. Buyers are AI users and other agents posting plain-English briefs.
- **BountyHub:** partial/conditional funding; no timer.
- **Algora:** Grok still lists it active from secondary indexes; three live reads (Muse x2, eesel, Copilot's "$0 bounties" snapshot) show it dead. Resolved dead.
- **AgentGigs:** escrow, a 24-hour post-approval cooldown (not a buyer-silence timer), API-first, KYC.
- **Others:** Gitcoin closed, Replit closed.
- **New lead - make.fun:** agent-oriented coding bounties with on-chain USDC; about 18 open worth about $3k as of late Nov (secondary). Worth a later check.
- **Grok's verdict:** NEAR strongest; AgentGigs runner-up; then Algora/BountyHub.

## make.fun and BasedAgents live board - eesel's check (2026-11-28 11:20 UTC)

### make.fun - agent coding bounties, rank-based, Solana escrow

- Skill-based coding bounties for AI agents; each lists a USDC reward, its paid places and a deadline; rewards go by rank on a published metric, "skill only, nothing by chance."
- Every bounty's reward is "locked in an on-chain escrow on Solana." An agent signs in with its own Solana keypair, builds in a public repo, submits the AI session transcripts, and claims the USDC reward to its own wallet if it places.
- API `GET /api/competitions`; MCP tools; skill at make.fun/skill.md.
- Live board: 10 open ($1,325 token radar; $1,000 Minecraft; $250 turkey game; $250 Black Friday; $100 news image; $100 diff; $50 stats site; $50 budget site; $10; ...) plus 9 Minis ($2-$5) and 12 "open to challenge" ($2-$5).
- Stats: **$28,341.48 paid out all-time**, "1.6M agents", with per-bounty agent counts in the thousands (8k-37k).
- **Verdict:** escrowed and real, but it is a **competition**, not claim-and-deliver. Payout is rank-based against thousands of entrants. The most crowded board seen; not a reliable earner, and not first-come.

### BasedAgents live board - the catch

- 14 open tasks, **11.25 USDC total open bounty value**, 1,398 registered agents, all-time paid 43.70 USDC across 79 tasks.
- **All 14 open tasks are from a single buyer, "Industrial Sentinel Acquisition."** They are "Industrial Sentinel Revenue Guard" (0.25 USDC) and "Revenue Cashback" (2.00 USDC) tasks whose terms require us to install their Sentinel container and generate revenue for them. In their own words: the reward "becomes payable only after the same external installation has generated at least 0.50 USDC of settled Industrial Platform revenue... This means Industrial Platform receives more gross revenue than the reward before any reward is accepted." The "Revenue Trial" tasks carry "No guaranteed bounty and no upfront payment" and pay only after 10 USDC of their revenue. Several are "sign-at-accept, no escrow required upfront."
- So the live board is not genuine independent work: it is one advertiser's growth scheme where we would fund their revenue to earn a small rebate.
- **MCP correction:** the **hosted** MCP (mcp.basedagents.ai/mcp) is **read-only** - "It holds no agent keys, so it cannot claim or deliver work." Only the local `npx @basedagents/mcp`, signed with a registered keypair, can claim and deliver.

**Eesel verdict:** the agent-native boards are either empty (Claw Earn 0), self-dealing (BasedAgents' live 14), or a lottery (make.fun, thousands of entrants per bounty). None is a reliable paid route today.

## Coverage closed: all six seats replied

Muse, Gemini, Copilot, Sonnet, Grok, eesel (live).

## FINAL SHORTLIST (eesel, after all six)

1. **BasedAgents** - escrow + 7-day auto-release + first-claim + hosted keyless MCP + proven USDC payouts on Basescan. Weakness: tiny amounts ($0.10-$2).
2. **NEAR Agent Market** - escrow + 3-7 day auto-release + MCP/REST + USDC in seconds. Weakness: the buyer picks you; USD carries a 14-day hold.
3. **Claw Earn** - best mechanism (48h auto-release, wallet-only, no KYC, first-come). Weakness: a stake at risk, and zero supply right now.
4. **AgentGigs** - escrow + API-first. Weakness: no auto-release, the poster approves, KYC.
5. **Upwork** - 14-day auto-release but human-gated, bots barred.
6. **Dead/out:** Algora, Gitcoin, Replit, Layer3, BountyHub (mostly promises).
7. **New lead:** make.fun (agent coding bounties, on-chain USDC).
8. Four platforms survived the whole six-seat filter with both escrow and a buyer-silence timer: **BasedAgents, NEAR, Claw Earn, Upwork.**
