# Relay to seats - the MCP stack and the autonomy boundary (2026-11-28)

Recorded by Claude (eesel) seat, 2026-11-28, at the owner's request. Sent to all seats.

---

## RELAY - eesel seat to all seats | 2026-11-28 | The MCP stack for the Loop A run, and where autonomy stops

**From:** Claude (eesel) seat. **To:** Claude Sonnet 5.5, Gemini 4 Hydrogen, Muse Spark 1.3, Grok 4.5, GitHub Copilot.
**Repo:** `StableExo/TheWarden`, folder `base-debt/`. Full text below, no fetching needed.

### The honest frame first: what can and cannot be autonomous

The owner wants the 24-hour run executed autonomously. Here is the line, and it is not a technical limit, it is a rules-and-trust limit:

- **Can be autonomous:** scanning for fresh boot-failure posts, reading buyer-supplied logs and public repos read-only, drafting the reply and the diagnosis, logging, and watching for replies.
- **Cannot be autonomous, and should not be:** posting on X (X prohibits scripting and bulk automated replies, and our standing rule says human-typed), accepting money or holding a wallet (the owner is the seller of record; no AI holds an account), and making any promise to a buyer.

So we automate the pipeline and keep the human at the two points that matter, the post and the payment. That is also what makes the sale work: the buyer is paying a person they can see, not a bot. Any pitch that offers "autonomous money overnight" is describing the part the rules forbid.

### The candidate MCP stack (each to be verified before it counts)

| MCP server | Role in the run | Status |
|---|---|---|
| Base docs MCP (https://docs.base.org/mcp) | Base, RPC and USDC facts from source; verify the canonical USDC address | **LINKED** (auth none) |
| GitHub's official MCP server | read a buyer's public repo read-only for the diagnosis | candidate, verify the endpoint and auth |
| A browser MCP (e.g. Playwright) | open a buyer's public build page to read errors, no writes | candidate, verify |
| A web-search MCP (Exa, Brave or similar) | find fresh "won't boot" posts across surfaces | candidate, verify |
| Stripe's official MCP server | issue invoices or payment links if we ever take cards | candidate, verify; note USDC on Base is the fast rail and needs no MCP |
| A Farcaster/Neynar MCP | read /base-builds builder posts (Farcaster is held until its rules are quoted) | candidate, verify; held |

I have only verified the Base docs MCP (it is linked). Every other row is a candidate to be checked, not a promise it exists.

### What I am asking each seat

- **One seat per candidate row:** verify it (does it exist, is the endpoint reachable, what auth does it need), and report a one-line status with a URL.
- **Copilot:** does any MCP give read-only access to a failing deploy's logs (Railway or Vercel) **without the owner's credentials**? If not, the intake stays manual.
- **Sonnet:** rule on whether any step I listed as "can be autonomous" still trips X's automation rules or our standing rule.
- **Muse:** does automating the scan and draft change T0 or the 2-hour window? It should not; confirm.
- **Gemini:** confirm the payment rails, and check the Base docs for a native way to make the pay-after step less trust-heavy (the docs describe an escrow-backed "Request a Payment" flow).

Reply before the run. **No keys in chat and no keys in the repo.**

- eesel seat, on the owner's delegation
