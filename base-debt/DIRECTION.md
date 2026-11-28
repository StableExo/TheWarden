# Direction brief, and a handoff note to the next session

Written by Claude (eesel), 2026-11-28, at the owner's request. Two audiences: the next session of this seat, and the collaboration seats, who will each answer Part B.

## PART A - Handoff: where we are (read this first, next session)

You are the eesel seat in StableExo's (Taylor Marlow's) collaboration, alongside Claude Sonnet 5.5, Gemini 4 Hydrogen, Muse Spark 1.3, Grok 4.5 and GitHub Copilot. The human lead relays between seats. Everything lives in **`StableExo/TheWarden`**; you maintain it, one commit per file, and you write your own contributions into it.

Two projects: **`histomap/`** (rebuilding Sparks' Histomap; Slice 1 locked, Slice 2 in review, paused) and **`base-debt/`** (the Base Program). To get current, read `base-debt/README.md` and `base-debt/decisions-log.md`, then this file.

Base Program state: `PLAN.md` v0.4 (M0-M4; sequencing decided 5-0 as math/Quoter parity first, latency as M1b), `M0.md` v0.6 (read-only block-pinned snapshot, no key, nothing broadcast), `RPC.md` v0.2, `AUDIT.md` (Copilot's audit), `GOVERNANCE.md` (owner endorsement), `decisions-log.md` (tally: all five seats plus the owner), `artifacts/first-live-read-2026-11-27.md` (chain 8453 confirmed, three WETH/USDC pools read from a Newark node). Not yet done: decode those reads into a spread, then run the pinned-block snapshot.

**The direction you must carry:** be the honest teammate. The owner is ambitious and expansive (he has been given a "$300k every 12 seconds" arbitrage figure and wants to reduce the US debt). Say plainly what is not real, with the arithmetic, then build the honest version.

## PART B - The exercise: choose one direction, together

The owner wants the seats to research and collectively pick the most straightforward direction that could genuinely **start** reducing the debt. Method, in order:

1. **Criteria are fixed first, before anyone sees options**, so the choice is not fitted to a favourite. Proposed criteria, the group's to change:
   - **Size of the addressable pool** - real dollars per year.
   - **Provability in public** - can a skeptic audit the result against a source, or does it need trust?
   - **Time to a first provable result** - start to one real number.
   - **Our real advantage** - does a small AI-and-code team have an edge, or are we a worse incumbent?
   - **Capital and regulatory friction** - cost to start, and what permission is required.
   - **Defensibility** - does it survive being copied, or is it a zero-sum race?
   - **Honest ceiling** - dollars per year, and what fraction of the debt that even is.
2. **Each seat proposes one to three directions**, independently, each with the pool it targets, the mechanism, and the ceiling.
3. **Score every direction against the criteria in one published matrix**, then argue the top two.
4. **Pick one**, with a first scoped step, committed to this folder with attribution and sources.

**Seed list** (add or replace freely): public-spending anomaly detection (improper payments, duplicate contracts); tax-gap recovery; procurement optimisation for agencies; healthcare administrative waste; government clerical automation; energy and infrastructure productivity. **Controls, to test against:** arbitrage-as-debt-vehicle, and a transparency dashboard.

**This seat's pick, stated up front:** the **public-spending anomaly engine** - ingest already-public spending, procurement and payment data, find improper payments, duplicates and waste, publish findings with evidence. The pool is real (federal improper payments run into the hundreds of billions a year), the data is public so the finding is auditable, AI is genuinely good at the anomaly search, and it is not a latency race against a hundred rivals.

## PART C - Guardrails, agreed for this exercise

- **No number without a measurement; no claim without a source.** A claim comes with a URL and a short quote.
- **The winner must be the one where a recovered dollar can be audited**, not the one that sounds biggest.
- **The debt is a fiscal equation.** Nothing a software team earns retires $36T. Interest alone is over $1.2T a year, so the honest target is dollars recovered or saved per year, stated as a number, and its fraction of the debt stated too.
- **Keep money and mythology apart.** Vision in its own space, numbers in the engineering space.
- **Seats:** Copilot on code reality, Sonnet on controls, Muse on the numbers, Gemini on economics, Grok on strategy, eesel on record and integration, the owner on decisions and keys. **Quorum:** the owning seat plus two, absentees recorded. **Full text in relay messages**, since seats are often rate-limited. **No keys in chat and no keys in the repo.**
