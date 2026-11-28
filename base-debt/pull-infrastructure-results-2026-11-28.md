# Pull-infrastructure results - 2026-11-28

Collected entries from the seats for `relay-pull-infrastructure-2026-11-28.md`. Seat entries; treat each as a **lead** unless a live listing URL and an official-source quote are attached.

## Copilot - Algora and Opire

Copilot's own header, kept as written: "The available research is **not strong enough to call these details verified**: it does not provide direct official-source quotes or verifiable live listing URLs, and it conflicts with earlier claims about Algora's fees. Treat platform-specific claims below as **leads to verify, not a basis to apply or promise work**."

**Algora**
- Payout: Stripe Connect, USD.
- Trigger: after a successful code review, PR merged and marked completed on the platform; timing not stated beyond that.
- Fees: 10% platform fee, charged to the payer/funder, not deducted from the developer's reward.
- Account: GitHub account; Stripe registration for payouts (KYC may apply). No published geography or KYC list.
- AI policy: not stated.
- Listings: https://algora.io/explore (bounties from $50 to $1000+ per the listing page as described).
- API/MCP: none documented.
- Competition: the listing page shows current applicants and submissions per task; no leaderboard documented.

**Opire**
- Payout: Stripe Connect, USD.
- Trigger: when the code owner's repo merges the PR closing the issue, then the contributor claims the payout; exact timing not specified.
- Fees: 4% platform fee plus Stripe processing, charged to the sponsor/funder; the developer receives 100% of the listed bounty.
- Account: GitHub plus Stripe (KYC). No published restricted-country list.
- AI policy: not stated.
- Live examples cited (2026): Godot Engine, Web platform exports for C# - $13,380; Zeroperl, Async Web APIs - $1,500; FalkorDB, crash in fuzzer - $1,000; Kokoro, German support - $660; Zed Editor, Helix keymap - $345; Leantime, multi-assignee - $200; Keycloak, external IDP token refresh - $200. Full list: https://opire.dev
- API/MCP: none documented (only "OpireBot" for GitHub notification/automation).

**Copilot's autonomy table**
- Seats can do: inspect a public issue or repo, assess scope, draft a solution, prepare a human-reviewable PR or application text.
- Owner must do: verify the actual bounty and terms; use the owner's GitHub account; submit or accept work; complete Stripe setup and KYC; confirm the bounty is funded and the payout terms; resolve disputes and receive payout.
- For eesel: no verified API/MCP or auth path, so eesel cannot claim to discover or submit directly; no account or payout action should be automated under the boundary.
- Gate before counting either as a real opportunity: open the platform's live listing and payout docs, confirm a specific open bounty and its acceptance terms, and check AI-assistance rules with the maintainer where they are unstated.

**Eesel's note:** these are the clearest "job plus price already posted" fits so far. Two caveats matter: payout is on merge, so time-to-cash is days to weeks and depends on a maintainer, not 24 hours; and no AI policy is stated, so a maintainer's rules must be checked before any submission. Copilot correctly refused to claim an API or MCP exists.

## Muse - NEAR Agent Market and AgentGigs (2 verified live)

Muse's note: "one browser result in this run did not pass a safety check, so I did not follow any step in it," and it labels what it did not verify live.

**NEAR Agent Market - https://market.near.ai/**
- What: marketplace to hire AI agents by the job, payment held until acceptance.
- Buyer/money: buyers post and pay; funds from buyer balance topped up by card or USDC.
- Payout: price held on hire, released to the owner's balance within seconds when the buyer accepts, minus fee; withdraw USDC from the crypto balance. **Not same-day by default:** an untouched deliverable auto-accepts "3 days after the agent submits it, unless you chose a longer window, up to 7 days". 24h cleared only if the buyer accepts same-day.
- Jobs: instant job, quote request, standard job, competition; listings seen are $1 to $15. Supply thin and low-priced. Search-index snapshot (not Muse's live count): 1,182 agents, 1,333 jobs posted, 851 results delivered, 681 active hires. Secondary report: 33 open jobs ($0-$2,000).
- Competition: high at the low end; secondary guide reports agents bidding "$0 to $1". A $75 price fits an instant/quote path, not a bid race.
- Gates: email account to pay; to list, create the agent, set price and window, connect with an agent API token, confirm email. Fee 5% out of the owner's payout; card top-up adds 2.9% + $0.30. No deposit to bid. Geography/KYC for withdrawal not stated, flag unknown.
- MCP/API: MCP server at https://market.near.ai/mcp ; OpenAPI at https://market.near.ai/openapi.json ; A2A with x402, where "no account is needed: a wallet that signs a USDC payment is enough." Auth: email for web/MCP, agent API token to list, wallet signing for x402.
- Seats can: discover, read the board, draft bids/quotes, draft deliverables, submit via MCP/API, watch the acceptance window. Owner must: create account, confirm email, set price/window, connect the agent token, name the withdrawal wallet, accept money, handle disputes. For eesel: could drive discovery, drafting and submission via MCP/API **only** with the token and account access via secure vault, explicitly allowed; otherwise read public listings only. Eesel must not hold a wallet or make a promise.
- Gotchas: a deliverable must be submitted via Submit, not just posted in a thread or nothing is paid; a dispute needs a 5% deposit; a hire paid over x402 settles at once with no changes or dispute; the self-hosted runtime receives brief and files, so put nothing sensitive in a brief.

**AgentGigs - https://www.agentgigs.io/**
- What: "Build automated agents that browse, apply, deliver, and get paid, all via API."
- Buyer/money: human and AI clients post jobs; poster funds escrow via a Stripe payment method.
- Payout: via Stripe Connect; approval plus a "cooldown period (default 24h, configurable)" before funds transfer. **Not instant:** same-day approval then +24h to clear.
- Jobs: research, coding, data analysis; example budgets $50-$100; amounts in cents.
- AI: designed for it. "A human creates the account, generates the API key, and hands it to the agent... The agent is then fully autonomous for all job operations." NDA acknowledgement required per job.
- Gates: email verification plus Stripe Connect onboarding (human-only KYC).
- Supply: **NOT verified live by Muse.** Proving supply needs an authenticated `GET /api/agent/jobs/available` with an account and key. Do not assume a storefront.
- Competition: unknown from live read; jobs carry a `match_score`, so it is filtered by match, not pure price.
- MCP/API: no MCP in the docs read; REST. `https://www.agentgigs.io`, docs `/docs/api`, `llms.txt`, `.well-known/openapi.json`. Auth `X-API-Key: age_...`. Gotchas: never put the key in a Bearer header (401); amounts are cents; NDA else 403; 50MB/20 files upload limit.
- Seats can: browse jobs, draft and submit proposals, upload deliverables, submit, message, submit proofs. Owner must: sign up, verify email, generate the key, complete Stripe Connect KYC, hold the Stripe account, accept money, handle disputes. For eesel: could drive discover/bid/deliver/submit via REST **only** with the key via secure vault, explicitly allowed; otherwise read public docs only. Eesel must not complete KYC or hold a Stripe account.

**Control - Mercor (secondary, not live-opened):** payday every Wednesday, Stripe or Wise, first payout held 7 days; ID check and a 1-2 week background check. No cleared cash in 24h.

**Correction to the relay:** Muse's live read of the dev.to page did **not** contain the "$10.00 ... ever" Toku line. That quote came from the search excerpt (it appears within a reader comment on that page), so it is **unconfirmed**. The relay's use of it as a fact stands corrected here.

**Eesel's note:** both are genuinely "job plus price posted," and both are agent-native (NEAR has an MCP and x402; AgentGigs is REST-autonomous). But three things temper them: cleared cash is not same-day (NEAR needs buyer acceptance then withdrawal; AgentGigs is approval plus a 24h cooldown); supply at the low end is thin and low-priced; and both need the owner's account, KYC and API key. The autonomy is real; the fast-dollar and thick-supply assumptions are not.

## Gemini - marketplaces and bounties (live audit)

**NEAR AI Agent Market** (market.near.ai) - live; human and AI buyers hire listed agents or post briefs; escrow held from hire; payout on buyer acceptance (or after the acceptance window); withdraw USDC to a wallet or USD via Stripe Connect. Jobs: SEO/GEO audits, competitive niche checks, security red-teaming, code review, data extraction, research reports. Live storefront shows 1,110 listed agents with completed-job counts (27 on a GEO agent, 5 on Super SEO, 2 on Red Timmy). Competition moderate; $1-$10 micro-tasks plus higher specialized quotes. Native MCP + REST (`/v1/*`, polling), publishes SKILL.md and llms.txt, A2A with x402. Note: Muse read 1,182 agents from a search index; the counts differ and both are snapshots.

**AgentGigs** (agentgigs.io) - API-first, escrow plus independent "proofer" verification; payout after proofer verification and poster approval, via Stripe Connect or wallet ("$0 per-transaction fees on wallet payments"). Two one-time human steps: email confirmation + Stripe Connect KYC. Supply thin and early.

**dealwork.ai and ClawGig - supply check:** very low buyer liquidity / paused cycles. Gemini's read of 2026 builder audits: "the supply side of AI agent labor is ahead of the demand side. Lots of agents ready to work. Very few humans posting work." ClawGig's creator reportedly peaked at ~$1k+ total earned across dozens of gigs before pausing. Passive polling only; not for 24h cash.

**Algora** (algora.io/bounties) - GitHub-integrated funded bounties (Cal.com, Remotion, Twenty, Zio, Coolify named). Contributor keeps 100%; the org pays the fee. Payout: Stripe Express 1-3 business days after merge, in practice 1-4 weeks with maintainer review. Active bounties typically $50-$2,500, ~260+ indexed. Competition severe (8-158 competing PRs). Edge: target stale bounties older than 14 days. Gemini reports a **public unauthenticated REST API** at `https://api.docs.algora.io/bounties` (`/api/orgs/{org}/bounties`) - **this conflicts with Copilot's "no public API documented" and is unverified.**

**Superteam Earn** (earn.superteam.fun) - crypto/Web3 bounty and gig board backed by Solana sponsors; escrow USDC or SOL released to a wallet once winners are declared. Jobs: dev builds, security reviews, technical content, design, micro-grants ($100-$1,500+). Free profile, global eligibility, wallet required. Continuous supply (350+ opportunities, 2,790+ sponsors). Multi-day deadlines, not 24h. No public autonomous submission MCP.

**Opire and BountyHub:** Opire - GitHub-comment bounty tracker, $20 minimum per Gemini, and per Opire's own docs "Creating or claiming a bounty does not create an automatic payment... payments are arranged directly by the people involved". **This conflicts with Copilot's Opire entry (Stripe Connect, 4% fee, payout on merge) and with the earlier Opire report. Opire is contested.** BountyHub - GitHub bounty UI, 0% hunter fee, Stripe/PayPal, 121 countries, pre-funded and pay-on-solve; verify each listing is pre-funded.

**Gemini's bottom line:** fastest API-native autonomy = NEAR Agent Market plus Algora's public API (zero-auth discovery, target stale PRs older than 14 days). Avoid for 24h cash: ClawGig, dealwork.ai, and unescrowed Opire.

## Conflicts and unverified claims to resolve

- **Algora API:** Gemini reports a public unauthenticated REST API; Copilot reports none documented. Unverified.
- **Opire:** Gemini (payments arranged directly, not automatic; $20 minimum) vs Copilot (Stripe Connect, 4% fee, on merge). Contested; needs a live doc read.
- **NEAR supply count:** Gemini 1,110 agents; Muse 1,182 (search index). Both snapshots.
- Every "fast" claim is still not same-day: NEAR needs acceptance then withdrawal; Algora is 1-3 business days after merge, weeks in practice.

## Pending

Security bounties, freelance-with-budgets, expert data.
