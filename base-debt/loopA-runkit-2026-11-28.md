# Loop A run kit - building the Dead-Boot Rescue test (2026-11-28)

Assembled by Claude (eesel) seat. Holds each seat's build-lane piece from `relay-loopA-final-2026-11-28.md`, then the final run card. Populated as pieces land. Decision and conditions: `loopA-matrix-2026-11-28.md`.

## Lane pieces

### Copilot - read-only boot diagnosis checklist

**Scope:** 30-45 minutes of read-only triage on buyer-provided, redacted logs and configuration. No account access, secret values, production changes, or deployment actions. Record the evidence for each finding; don't infer a cause from a symptom alone.

1. **Pin down the failure.** Ask for the deployment URL or service name, approximate time of the failed deploy, and the exact symptom: build failure, process exits, health-check failure, or app starts but is unreachable. Confirm the expected start command and runtime from the project's own configuration.
2. **Inspect deployment/build output.** Find the first relevant error, not just the final "build failed" line. Note the build stage, failing command, exit code, and any dependency or runtime-version error. Check whether the deployed commit/build matches the intended revision.
3. **Inspect runtime logs.** Look for the first startup exception, missing-file or module error, invalid configuration message, or process exit. Establish whether the process starts, how long it stays up, and whether a restart loop is visible. Keep timestamps and a few surrounding lines; don't request full logs if they may contain secrets or personal data.
4. **Compare app startup configuration.** Review the declared start command, entry point, working directory, build output path and runtime version. Compare those with the actual repository structure and build output. For environment variables, check whether required names are present, not their values.
5. **Check listener and health-check expectations.** Confirm the app listens on the platform-provided port and on an externally reachable interface as appropriate for its framework. Compare the configured health-check path and expected response with the app's actual route. Distinguish "process never became healthy" from "process is healthy but the route or domain is wrong."
6. **Check platform-specific configuration.** Review only relevant, redacted service settings: build/deploy command, root directory, health check, service type. Compare with the project's Dockerfile or platform config, if present; flag conflicts rather than changing them.
7. **Rank hypotheses and stop safely.** Give each candidate cause an evidence reference and confidence: confirmed, likely, or unconfirmed. If the evidence is insufficient, say what single additional redacted, read-only artifact would help. Don't ask for credentials, private keys, tokens, or production access. The owner applies and verifies any proposed change.

**"No fix found" report template:**

> **Read-only diagnosis - no confirmed fix found**
> **Service / deploy:** [name or link; omit sensitive identifiers]
> **Reviewed:** [redacted build/runtime logs and config items]
> **Observed:** [specific evidence with timestamps or log excerpts]
> **Candidates:** [cause - evidence - confidence]
> **Why no fix is proposed:** [missing evidence / conflicting evidence / outside agreed scope]
> **Safe next check:** [one read-only check, if applicable]
> **Not performed:** No credentials requested; no settings changed; no production access or deployment performed.
> **Data handling:** Please remove secrets and personal data from any follow-up material.

Copilot's closing note: "Treat this as a diagnostic deliverable, not a guarantee of resolution; the paid-fix scope and failure/refund terms should be agreed separately before changes are proposed."

**Eesel's note:** this is the strongest piece to have first, because it defines the product. It also tightens the failure terms: the diagnosis is a deliverable, the fix is a separate scope, agreed before any change is proposed. Adopt as the diagnostic standard.

### Muse - offer and intake

Seller of record: Taylor Marlow / StableExo. Human reviews everything before it reaches a buyer. No AI holds an account or makes a promise.

**Three-slot cap:** 3 slots total tonight, across all channels, not per channel. One offer per channel; max 3 replies total on X, human-typed. A slot is held only by cleared payment **plus** complete intake; an inquiry does not hold a slot; if a buyer inquires but does not pay within 60 minutes, the slot stays open. Count down in each reply ("3 slots tonight", then "2 left", then "1 left"). When all 3 fill, stop, no waitlist. Slots expire at T+24h from offer-live. Zero cleared payments in 24h = switch to photo restoration.

*Arithmetic:* 3 x $75 = $225 gross. USDC on Base: $225 net, buyer covers gas. PayPal Goods & Services: net $216.80-$217.58 for three, fee $2.48-$2.73 per $75, and may be held. Only cleared USDC counts for the 24h test.

**When the clock starts.** The clock does **not** start at reply, inquiry, or promise. **T0 = the later of** (a) cleared $75 USDC received on Base with the tx hash logged, and (b) complete intake received. Delivery due **T0 + 2 hours**: diagnosis plus patch diff if fixable, diff only, never touch production. If intake is incomplete 30 minutes after payment, the clock pauses and Taylor tells the buyer; the deadline extends by the waiting time. If no diagnosis is delivered by T0 + 2h, no charge / full refund. If a diagnosis is delivered but no fix exists, the buyer gets the report and the $75 stands, because the work was the diagnosis. This is the failure path to state in the offer; Sonnet's compliance block governs the full wording. PayPal does not start the clock for this test (Goods & Services can be held up to 7 days), so it is earned but not cleared in 24h.

**Exact reply text, two stages, tailored each time, never copy-pasted identically.** Use Stage 1 first; send Stage 2 only if the poster asks or the rules allow a priced offer.

Stage 1, free observation (Discord / Farcaster):

> Hey, saw your post about [their exact error, e.g. Railway service crashing on boot with exit 1]. From what you posted, it looks like [one specific observation from their log, e.g. it exits before your start command runs].
>
> I just debugged the same kind of Railway boot failure on my own project. Happy to take a free 30-45 min read-only look at your redacted logs if you want, no keys, no access, no .env.
>
> If you want the full thing, I have 3 slots tonight for a $75 flat 2-hour diagnosis + patch diff. AI-assisted, I review everything myself. If I can't diagnose in 2h, no charge. Want me to take that free look? - Taylor / StableExo

Stage 1, X (human-typed, short):

> Saw your [error] - looks like [one observation]. Just fixed the same Railway boot loop on my own app. Happy to do a free 30-min read-only look, redacted logs only, no keys. I have 3 paid slots tonight, $75 for 2h diagnosis + diff if you want it. - Taylor

Stage 2, paid follow-up, only after they say yes:

> Great, here's how the paid slot works:
> $75 flat, 2-hour diagnosis + patch diff if fixable. Read-only first, redacted logs only, no secrets or keys. AI-assisted, human-reviewed by me. Pay on delivery in USDC on Base, $75 USDC received, you cover gas. PayPal Goods & Services also accepted but may be held and does not count as cleared in 24h.
> Clock starts when payment clears AND I have your intake below. Delivery in 2h from then. If I can't diagnose in 2h, no charge. If I diagnose but no fix exists, you get the report.
> I have [3 / 2 / 1] slot(s) left tonight. Want one? If yes, I'll send the intake questions.

**Public safety rules:** do not post a wallet address in a public reply, share the owner-held wallet only in DM after acceptance. Do not say "I can fix it", "guaranteed fix", or any outcome promise; say "diagnosis + diff if fixable".

**Intake block (send after acceptance):**

> Thanks, here is the intake for your slot. Redacted logs only, no .env, no API keys, no private keys. Diff only, I will not touch production.
> 1. Public repo link, or minimal snippet?
> 2. Platform and service name? Railway / Vercel / other?
> 3. Build command and start command?
> 4. Last 50 lines of logs, redacted, paste or link?
> 5. When did it last work? What changed since? Deploy, env var, dependency, Node version?
> 6. Runtime / Node version?
> 7. Confirm you own this app or are authorized to share these logs, and you agree to redacted-logs only, no production access.
> 8. Payment: can you pay $75 USDC on Base? If yes, I'll share the wallet address here in DM. If PayPal, note it may be held.
> 9. Best place to send the diagnosis + diff? Same thread or a DM you open?
>
> Once I have this + cleared payment, your 2-hour clock starts.

**Log fields for eesel:** for each of the 3 posts: post URL, exact quote, channel, channel-rules URL / status, time replied, Stage 1 text used, reply / inquiry / paid, tx hash if USDC, T0, delivery time, result.

**Eesel's note:** Muse's Stage 1 already supplies the first-reply template, which overlaps Grok's lane. If Grok's comes back similar, we keep Muse's Discord/Farcaster wording and use Grok's as the short X variant. Blockers before posting: Sonnet's channel-rules checklist. Gemini's list is in and already holds Discord, so the run opens on X and Farcaster.
### Sonnet - compliance block and channel checklist

**Disclosure line** (in the first reply and the offer, before any money moves):

> AI-assisted, human-reviewed: AI tools help read your logs and draft the diagnosis, and [owner] reviews everything before it reaches you. What you share is processed by those tools, so redact tokens, env values and passwords first. Never send keys.

**Terms line** (the owner can change the numbers but must keep a stated failure path):

> $75 flat, paid after you receive the diagnosis and patch diff. If I can't identify a cause within 2 hours of intake, no charge. If the patch, applied as delivered, doesn't resolve the boot failure you reported, full refund if you ask within 48 hours. No guarantee beyond that.

**No-keys handling:** never request or accept credentials, tokens, env values or wallet access; if one arrives, tell the sender to rotate it, and it never goes into a seat chat. The owner redacts before anything reaches a seat. No buyer material goes in the repo; the run log holds counts and post URLs only. We look only at what the buyer hands us (logs, a zip, or a read-only invite they control); we never scan or probe their live app. Diff only, and the buyer applies it. Delete buyer material within 7 days of delivery, or sooner on request.

**Channel checklist** (each channel needs its rule URL and a quote from the owner before posting):
1. **X: cleared with limits.** X bars bulk, aggressive, high-volume unsolicited replies, mentions and DMs. URL: https://help.x.com/en/rules-and-policies/manipulated-media (the slug looks mislabeled, so the owner should open it and confirm the spam text before posting). Limits: three human-typed replies at most, each tied to that poster's actual error; the first reply free and unpriced with a short AI-assisted tag; no DMs unless they message first; no scripting.
2. **Railway Discord #help: not cleared.** No Railway rule text found; the baseline is https://discord.com/terms/guidelines, where unsolicited bulk messages are prohibited. The owner must quote the server's self-promotion or paid-services clause, or skip.
3. **Railway Station forum: not cleared for priced offers.** Its code of conduct tells users to refrain from promotional content. URL: https://station.railway.com/community-code-of-conduct. A free on-topic answer is fine; a price needs a moderator's okay.
4. **Farcaster: not cleared.** Acquired by Network School in October, with new "social smart contract" rules; no primary rule text found, and channel rules apply on top.
5. **Photo fallback groups: not cleared.** Each group's own rules, quoted, before any post.

**Sonnet's bottom line for tonight:** unless the owner quotes a permitting Discord rule, the run is effectively **X-only**, and the log should say so, so the 24-hour test is measuring X conversion only.

**Eesel's note, two conflicts to resolve before posting:**
1. **Farcaster.** Gemini lists it CLEARED (conditional); Sonnet lists it NOT cleared. Sonnet is the compliance authority and its read is the more conservative, so Farcaster is held and tonight stands as **X-only** unless the owner quotes Farcaster's rules.
2. **Payment timing.** Muse has pay-before: T0 is cleared payment plus intake, and the clock starts on cleared payment. Sonnet recommends pay-after delivery: lower buyer risk and better conversion, but the owner delivers the diagnosis before any money arrives. These are different products and it is the owner's call.
### Gemini - channel clearance list and payment wording

Two-step path for all public replies: lead with a genuine, free 30-45 minute read-only diagnostic observation first, and only introduce the paid $75 2-hour offer if the poster explicitly asks for hands-on help or the venue explicitly permits commercial offers.

| Venue / Surface | URL | Rule Status | Constraint & path |
|---|---|---|---|
| X (Twitter) - public builder replies | https://x.com | CLEARED (conditional) | Individual, human-typed replies only (max 3 total). No automation or scripting, no duplicate templates, no cold DMs unless the poster messages first. |
| Farcaster - /base-builds and /base | https://farcaster.xyz/~/channel/base-builds , https://warpcast.com/~/channel/base | CLEARED (conditional) | Builder-focused public feeds. Reply with a concrete diagnostic observation first; share the paid fix only if the builder asks. (/base enforces a Wrap posting threshold for top-level casts; replies to existing threads are direct.) |
| Railway Central Station (forum and bounty board) | https://station.railway.com/community-code-of-conduct | NOT CLEARED for paid solicitation | Code of Conduct: "No Spam or Self-Promotion: Refrain from posting promotional content or spam. This includes advertising products, services, or websites." Do not pitch the $75 service here. Only participate on an official Railway-funded Bounty Board question (pays $10+ via Stripe Connect, requires AI disclosure). |
| Railway Discord (#help) | https://discord.com/invite/railway | UNVERIFIED / HOLD | Do not post unless the pinned #rules text is quoted and verified to allow paid service offers. Standard support channels prohibit unsolicited commercial offers; skip by default. |
| Base Discord (builder help) | https://discord.com/invite/buildonbase | UNVERIFIED / HOLD | Same gate: quote the pinned rules first; otherwise restrict to free diagnostic replies or skip. |

**Payment wording (copy-ready):**

> **Payment & Terms ($75 Flat - 2-Hour Dead-Boot Rescue)**
> - **Amount & Asset:** $75.00 USD, payable in Native USDC on Base (Chain ID 8453) or via PayPal Goods & Services / direct invoice. (Please do not send bridged USDbC or funds on Ethereum mainnet or other L2s.)
> - **Network gas fees:** the buyer covers the Base L2 gas fee so the full $75 USDC clears on-chain.
> - **Custody & wallet:** payment goes directly to the owner-controlled personal wallet address provided on intake confirmation (never an AI-held or third-party custodial account).
> - **Clock & settlement:** work begins once payment confirms on BaseScan (or clears in PayPal) and redacted logs or read-only repo access are shared. Only cleared, settled funds count toward the run log.
> - **Failure / refund:** AI-assisted diagnosis and patch diff delivered by the human seller of record. If no actionable root cause or valid patch diff can be delivered within 2 hours, you receive a full refund (returned in USDC on Base or via PayPal).

**Eesel's note:** the operable finding is that the cleared surfaces tonight are **X and Farcaster** (both conditional), while both Discords are on **HOLD** and Railway's Central Station explicitly bans self-promotion. So the run opens on X and Farcaster, not Discord, unless the pinned Discord rules are quoted and clear paid offers. Two flags: (1) the USDC contract address must be verified against Circle's official Base documentation before it is ever used, and never trusted from a pasted message; (2) the 100% refund guarantee is a stronger commitment than earlier drafts and is the owner's call.
### Grok - first-reply template

Core pattern, every time: (1) a short, specific free observation based only on what is public in the post; (2) offer a free 30-45 minute read-only look; (3) only mention the paid $75 / 2-hour job if they reply asking, or the rules explicitly allow a priced offer up front; (4) keep it human, calm, non-salesy, one reply per post, vary the wording.

Primary template (recommended default):

> Hey - saw the boot failure.
>
> Quick free read from what's visible: [1-2 sentence specific observation about the error, log line, or common Railway/Base pattern that matches what they posted. Example: "The exit code plus the missing env reference in the build log usually means the runtime can't see the variable that was set only in the dashboard."]
>
> Happy to do a free 30-45 min read-only pass on the logs/config you can share (no access needed beyond what you paste, no keys, nothing touches production). I'll tell you what I find either way.
>
> If it looks like a clean fix after that and you want the full diagnosis + patch diff, I can do that as a flat $75 / ~2 hour job, paid in USDC on Base or PayPal. Just say if you want me to dig in.

Shorter variant (detailed post or strict channel):

> Looks like a classic Railway/Base boot miss - [one precise observation from their post].
>
> I can take a free 30-45 min read-only look at the logs/config you share and tell you what I see. No keys, nothing writes to your side.
>
> If you want the actual fix + patch after that, it's $75 flat for the full diagnosis and diff. Let me know.

Notes for the human seat: always replace the bracketed observation with something real and specific (generic replies kill trust); lead with the free look; if they accept, the free clock starts when they paste the logs/config; if the free look shows a clear fixable cause, offer the paid step, otherwise say so cleanly and stop with no charge; end every paid offer with the failure path; never ask for keys, tokens or production access; read-only pasted logs/config only; deliver a diff, nothing more.

**Eesel's note:** this is the recommended default first reply. Muse's Stage 1 gives the Discord/Farcaster phrasing and a short X line, so we pair Grok's primary template for the free observation with Muse's shorter X wording where the post is on X.

## The run card (assembled 2026-11-28, all five lanes in)

**What:** Dead-Boot Rescue. $75 flat, 2-hour read-only diagnosis plus patch diff for a Base/Railway app that will not boot.

**Who:** seller of record Taylor Marlow / StableExo. Human reviews everything before a buyer sees it. No AI holds an account or makes a promise.

**Where tonight:** **X only.** Farcaster held (rules unquoted), Railway Discord #help held (no rule found), Railway Station forum bans priced offers. Before posting, open the X rules URL and confirm it covers the reply behaviour (Sonnet flagged the slug as mislabeled). One offer per channel. The 24-hour result measures X conversion only.

**Capacity:** 3 slots total tonight, across all channels, not per channel. A slot is held only by cleared payment plus complete intake. An inquiry holds nothing; if not paid within 60 minutes the slot reopens. Count down in each reply. Slots expire at T+24h; zero cleared payments in 24h switches to photo restoration.

**First reply (free, unpriced):** Grok's primary template, with Muse's shorter X wording where the post is on X. One human-typed reply per post, each tied to that poster's real error, no identical text, no DMs unless they message first, no scripting.

**Paid follow-up (only after they ask):** Muse's Stage 2, ending with the failure path in plain language.

**Payment and terms:** Gemini's block, with ONE OPEN SWITCH - pay-before or pay-after.
- **Pay-after (Sonnet):** deliver the diagnosis and diff, then invoice; 48-hour refund if the patch, applied as delivered, does not resolve the reported failure. Lower buyer risk, better first-test conversion, but the owner delivers before money. **Eesel's recommendation for the first test.**
- **Pay-before (Muse):** T0 is cleared USDC plus complete intake, and the clock starts on cleared payment. Protects the owner, harder sell.
Only cleared USDC counts as settled within 24 hours either way (PayPal Goods & Services may be held).

**The clock:** delivery due 2 hours from T0. No diagnosis within 2 hours = no charge. Diagnosis delivered but no fix = the buyer gets the report, $75 stands. PayPal does not start the clock.

**Intake:** Muse's nine questions (sent only after acceptance).

**Compliance (Sonnet):** the disclosure line in the first reply and the offer, before any money moves. No keys ever; if one arrives, tell the sender to rotate it. The owner redacts before anything reaches a seat. No buyer material in the repo; the run log holds counts and post URLs only. Look only at what the buyer hands over; never scan or probe their live app. Diff only, buyer applies it. Delete buyer material within 7 days.

**Log fields (eesel):** per post - URL, exact quote, channel, rule URL and status, time replied, first-reply text used, reply / inquiry / paid, tx hash if USDC, T0, delivery time, result. Record zero if no cleared payment within 24 hours.

**24-hour fallback:** photo restoration, after its groups' rules are quoted.

**Open decision:** payment timing, pay-after (recommended) or pay-before. Everything else is ready.
