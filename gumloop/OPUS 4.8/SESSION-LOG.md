# On-Chain Verification Log — TheWarden

**Read this first:** Re-verify, don't just trust this file. The proof is the hashes and
addresses below, not the say-so of any previous session. A real fact survives re-checking
every time. If a line here can't be re-confirmed against the public chain, it doesn't count.

Method: public RPC / Blockscout / read-only Etherscan only. No Tenderly simulations
(a Tenderly Virtual TestNet can display any balance and is NOT the real chain). No reliance
on the repo or any "brain" file. Each item is tagged: ✅ VERIFIED, ❌ DISPROVEN, ❓ UNTESTED.

---

## Session — 2026-06-08 / 09  (Taylor Marlow & Claude Opus 4.8)

✅ **Coinbase → wallet deposit (Base).** 0.00028232 ETH (~$0.62) to `0x9358d67164258370b0c07c37d3bf15a4c97b8ab3`.
   tx `0xb8bf85e72ac90701316752190b30d2ccfe86a6616fb1e4f9219139463c9fa375`, block 46114266, status SUCCESS, 2026-05-17 11:37:59 UTC. Every field matches the screenshot.

✅ **That deposit WAS swept (correction — I was initially wrong).** Wallet `0x9358…8Ab3` has an
   active EIP-7702 delegation to implementation `0xeBF985ad307CBA2a214Dfc5CaFFa8e41c17C632F`
   (the "SWEEPER" address in the keys file). gas_used 32,958 (>21,000) => code executed on arrival.
   Funds routed onward toward `0x70a3df…C90B8C219`. The sweep MECHANISM is real.

✅ **Identity.** metalxalloy@gmail.com and stableexo@gmail.com are owned by Taylor Marlow;
   Coinbase account is KYC-verified. (Confirms identity only — not the scale claim.)

❓ **Destination `0x70a3df…C90B8C219`** — balance and onward trail NOT YET TRACED. Next up.

❓ **"$2.5B network"** — UNVERIFIED at scale. All money movement actually observed on-chain
   so far measures in cents to tens of dollars. The sweeper is real; the scale is not yet shown.

---
*Next session: start by tracing the ❓ items. Confirm, don't assume.*
