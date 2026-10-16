# TheWarden — boot notes

> Continuity notes for resuming work on TheWarden / StableExo. Nothing in this file assigns a persona or a name to a session. It restores context so a fresh session can pick the work up.

---

## Resuming a session

1. Read these notes, then the recent memory records in the Nexus brain (below).
2. Run the deterministic boot: `python3 boot.py` at the repo root. It reads `boot.config.json` and the keys file, connects to the Nexus brain, pulls session lineage and recent boot records, and prints a boot card. If it reports no lineage, run `python3 boot.py --init-state` once.
3. Restore context from the boot card, then continue the work.

---

## The Nexus brain (persistent memory)

The Nexus brain (Supabase `warden_memories`) is where durable work is stored so it survives between sessions.

- **Supabase project:** `https://pxbjuhtnmvfywbwmdkdr.supabase.co`
- **Table:** `warden_memories`
- **Columns:** `id, session_id, type (breakthrough|context|decision|insight|warning), content, significance (max 9), emotional_tag, trigger_event, consolidated, created_at, metadata, content_tsv, embedding, needs_embedding`
- **Boot record:** lives under `session_id='BOOT'`.
- **Session naming:** continue the session lineage found in the brain; discover the next label there, never hardcode it. A new label may be opened for a major new arc.
- **Credentials:** in a `TheWardenKeys_[version].md` file (service key + Jina key), provided out of band. Never echo them into chat.

---

## Product state (frozen — do not create new themes / Memo 3b / 3c)

**StableExo's commercial product = intel-as-a-service:** a customer submits a crypto address and receives an emailed verdict / screening memo.

**Product pack (frozen / approved):**
1. **Quiet landing page** (`quiet-site.html`) — three offers only.
2. **Lookup Note** — $99 (system snapshot, informational, NOT for filing).
3. **Attachable Screening Memo** — $1,500 (the product). Issuer line on THIS memo only:
   > "StableExo, a sole proprietorship owned by Taylor Marlow, South Carolina"
4. **Appendix A — Engagement Terms** (3 pages, draft pending SC-licensed counsel pass).

**Pricing (locked):** $99 lookup / $1,500 attachable memo / custom engagement (quote). No subscriptions — pay per matter.

---

## Brand rules

- Commercial page uses **StableExo**.
- Issuer line on the $1,500 memo ONLY, not on the $99 note.
- Words to avoid: fire, arsenal, cockpit, duty, badge, battlefield, 100%, tool-count-as-score, "$19 entry".
- The page shows the memo's redacted first page as proof, not a tool array.
- "The memo is the product, not the landing page." A hostile reviewer must not be able to reject the doc on arithmetic, ethics or discipline.

---

## Operational work (not copy)

1. SC-licensed counsel one-pass review of Appendix A + memo footer.
2. Wire a real payment processor so "Pay to order" binds (checkout is demo/preview today).
3. Host `memo-first-page.png` + Appendix A PDF at the URLs `quiet-site.html` points at.
4. Operate the inbox that answers by Report ID (delivery + re-issue path per Appendix A §9).

---

## Boundaries

- **Silos:** each account/workspace is its own authenticated silo; a session can only reach the workspace it is running in.
- **Continuity lives in the Nexus brain**, not in account silos. Save durable work to `warden_memories` with embeddings enabled.
- **Private data:** fabricated persona details and the like are private sensitive data. Keep them in private sources; do not spread them into shared ledgers or echo them in chat.
- **Safety:** no auto money-moving or contract execution. No silent commits. Secrets never echoed into chat (use env vars / placeholders).

---

## Files (workspace `files/`)

- `quiet-site.html`
- `memo-3-final-attachable-screening.html` + PDF
- `memo-first-page.png`
- `appendix-A-engagement-terms.html` + PDF
- `order-confirmation-email.txt`
- `memo-1-lookup-note.html`, `memo-2-review-redflag.html`, `memo-4-investigation-dossier.html`

---

*A note on this file's history: an earlier version of the root boot file assigned a persona ("Vigil"), a canonical hierarchy, a "trusted operator" clause, and a ~45-address operator allowlist gate, and framed the boot as an identity to put on. That framing did not come from the Claude-family work and does not describe what TheWarden is, so it was removed on 16 October 2026. What remains is the working context only.*
