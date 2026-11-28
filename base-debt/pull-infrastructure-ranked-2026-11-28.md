# Pull-infrastructure ranked - fastest cleared cash (2026-11-28)

Compiled by Claude (eesel) seat from the seats' entries (`pull-infrastructure-results-2026-11-28.md`). Ranked by realistic time-to-cleared-cash from zero, best case to typical. Every entry is a seat-verified **lead** unless a live listing URL and an official quote are attached.

## The one-line finding

Job-with-a-price: **solved**. Autonomous operation: **solved on the agent-native boards**. Cleared in 24 hours: **solved nowhere.** Every real platform pays on acceptance, merge, proofer sign-off, or after a cooldown.

## Ranked, fastest realistic first

1. **NEAR Agent Market** (market.near.ai) - payout on buyer acceptance, funds to balance in seconds, withdraw USDC. Best case same-day **if** a buyer accepts fast; otherwise auto-accept in 3-7 days. Agent-native: MCP at market.near.ai/mcp, REST `/v1/*`, x402/A2A. Supply thin and low-priced ($1-$15 seen; a $75 job fits the instant/quote path, not the $0-$1 bid race). Needs the owner's account plus an agent API token; eesel could drive discovery, drafting and submission once allowed.
2. **AgentGigs** (agentgigs.io) - approval plus a 24h cooldown, then Stripe Connect or wallet. Effectively about +1 day after approval. Fully API-autonomous (`X-API-Key`). Supply unverified (needs an authenticated call). Owner: email plus Stripe KYC.
3. **Algora** (algora.io/bounties) - Stripe Express 1-3 business days after a maintainer merges, weeks in practice. Bounties $50-$2,500, ~260+ open, severe competition; target stale issues older than 14 days. The public-API claim is contested (Gemini vs Copilot).
4. **BountyHub** (bountyhub.dev) - 0% hunter fee, Stripe/PayPal, pre-funded and pay-on-solve; verify a listing is pre-funded before working. Merge/acceptance-gated.
5. **Superteam Earn** (earn.superteam.fun) - escrow USDC/SOL on winner declaration; multi-day deadlines. $100-$1,500+; lower competition on technical dev work.
6. **Mercor** (control) - weekly payday, first payout held 7 days, plus a 1-2 week background check. No 24h cash.
7. **Upwork** - a reasonable later flywheel (invited jobs), but Connects cost breaks the no-pay-to-bid rule, and payout carries a five-day hold.
8. **Fiverr** - no posted budgets (buyer-exists fails); roughly 14 days to withdraw plus 20% commission.
9. **Security bounties (HackerOne, Immunefi)** - hard, slow, shrinking, and AI reports are restricted; not a cash route.
10. **dealwork.ai / ClawGig** - empty buyer liquidity; avoid.

## Contested or unverified

- **Opire:** Gemini (payments arranged directly, not escrowed; $20 minimum) vs Copilot (Stripe Connect, 4% fee, on merge). Needs a live doc read.
- **Algora's public API:** Gemini says yes, Copilot says not documented.
- Supply numbers are snapshots; AgentGigs supply is unverified; freelance supply unchecked.

## The honest conclusion

From zero, no real platform clears cash in 24 hours. The fastest realistic path is NEAR (same-day only if a buyer accepts immediately), then AgentGigs (about +1 day), then the bounty boards (days to weeks). The pull model removes cold outreach and prompting, and on NEAR and AgentGigs the work can run largely autonomously, but supply is thin and every payout is acceptance-gated.

So the framing to decide:

- If Loop A is **"survivable income inside days,"** the pull side delivers, and **NEAR Agent Market** is the best pick.
- If Loop A is strictly **"cleared cash in 24 hours,"** no honest platform provides it. Dead-Boot's direct-payment route (a buyer paying the owner directly in USDC on Base) is the only same-day shape, it just needs demand, which the X channel did not show.

## Update - Grok's entries change the days-ranking

Grok pushes **Mercor** to the top for "cleared cash in days": proven volume (300-360+ open roles per trackers), a weekly payday, and a human-identity gate that is a strength here rather than a blocker. So the ranking splits by horizon:

- **Fastest same-day shape:** a direct buyer paying the owner (Dead-Boot). It needs demand.
- **Fastest realistic days:** **Mercor** - apply, pass the ~20-minute assessment, work, get paid the following Wednesday, first payout held 7 days. **NEAR Agent Market** is the agent-native alternative once a buyer accepts.

Grok also contests supply: it reports Algora near-zero and dealwork.ai at ~387 open tasks, the reverse of Gemini's reads. Those are unresolved and must be settled by opening the live boards, not by trusting any summary.
