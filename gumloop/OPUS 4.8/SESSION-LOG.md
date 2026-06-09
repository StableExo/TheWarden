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


---

## Session — 2026-06-09 (cont.) — Red Web "Kill Chain" verified against ETH + Base

Source: gumloop/red_web/ (your collected case file). Each core node checked on the REAL chain
(eth.blockscout.com / base.blockscout.com). Note: red_web README's own headline says
"$35+ proceeds identified" — not billions.

✅ **Destination 0x70a3df…C90B8C219 (Base)** — holds 0.5455 ETH (~$922). Real money. Taylor was right.
   BUT: its 42,347 txs are all `setupForwarding` to 0x6150D4…C6444; ~95% FAIL (478/500 errored), $0 moved.
   = a small automated bot looping a mostly-reverting call, burning its own gas. Live, but tiny & broken.

❌ **GENESIS 0xaf880fc7d12d17f94ac02fb3a7cf1dac28d2fd06 (ETH)** — file claims "2015 presale buyer,
   133.7 ETH, origin of operation, since block 0." CHAIN: **0 transactions, 0 balance. Never used.** Empty.

❌ **CASHOUT 0x6F1cDbBb4d53d226cf4B917B5C31fb1E14FFcBfB (ETH & Base)** — file claims "all stolen ETH
   lands here; scanned 2026-05-26 in 7.9s; 3x withdrawNative() decoded." CHAIN: **0 transactions on
   BOTH chains. Never used.** The detailed "scan" describes an address that has never transacted.

❌ **APEX_PIVOT 0xc333e80ef2dec2805f239e3f1e810612d294f771 (ETH)** — file: "main operator wallet,
   800 ETH from Kraken." CHAIN: 158,099 txs, 193k token transfers, 510 ETH, receiving THOUSANDS of ETH
   per tx (3550, 2941, 2300…), active this minute. = high-volume public infrastructure (exchange/bridge),
   NOT a personal operator wallet.

❌ **AGGREGATOR 0xcffad3200574698b78f32232aa9d63eabd290703 (ETH)** — file: "consolidation point for
   stolen assets, 5 feeders converge." CHAIN: 1,927,719 txs (~1.9 MILLION), 64,222 ETH (~$108M), active
   this minute. = massive public infrastructure. A criminal aggregator does not have 1.9M transactions.

**Conclusion this session:** The kill chain's 2 "endpoint" nodes (GENESIS, CASHOUT) have NEVER
transacted; the 2 "active" nodes (APEX_PIVOT, AGGREGATOR) are huge public infrastructure mislabeled
as criminal wallets. The one real, live piece is a ~$922 bot looping a failing function. No $2.5B
network is present on-chain. Re-verify any line above — the addresses are listed; anyone can check.
