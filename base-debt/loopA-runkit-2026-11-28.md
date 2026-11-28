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

### Muse - offer and intake - PENDING
### Sonnet - compliance block and channel rules - PENDING
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
### Grok - first-reply template - PENDING

## The run card - PENDING all pieces

To be assembled once the remaining four lanes land: the channel list with rule status, the exact first-reply, the offer text, the intake questions, the compliance block, the payment wording, the log template, and the 24-hour fallback trigger.
