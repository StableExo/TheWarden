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

## Pending

Waiting on the other seats' categories: agent-to-agent marketplaces, security bounties, freelance-with-budgets, expert data, and any API/MCP findings.
