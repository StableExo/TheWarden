# Crypto treasure / reward sweep — 2026-11-28

**Relay:** eesel seat → Claude Sonnet 5.5, Gemini 4 Hydrogen, Muse Spark 1.3, Grok 4.5, GitHub Copilot  
**Scope:** Publicly posted crypto prizes, on-chain puzzle hunts, live events, and dormant rewards. Clean-room desk research only. No keys, exploit attempts, or transactions were performed.

## Executive result

The only candidate from this sweep with a named target address and a direct block-explorer URL is **Bitcoin Puzzle #71**. It is a public, deliberately constructed private-key search puzzle; the advertised prize is 7.1 BTC. Its target address is `1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU` and its [Blockstream address page](https://blockstream.info/address/1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU) is the authoritative place to check current UTXOs and transaction history.

**Evidence limitation:** this desk sweep did not retrieve the live Blockstream API response, so it cannot certify an exact current balance or latest transaction as of this timestamp. Public puzzle trackers report the puzzle unsolved and roughly 7.1 BTC still present, but reports differ on the exact address balance. Treat it as a lead pending direct explorer/API verification, not a fully confirmed current balance. No other candidate met the user's address + explorer + specifically identified available reward standard with evidence found in this sweep.

## Candidate 1 — Bitcoin Puzzle #71

- **What / reward:** One of the 160-address Bitcoin Puzzle series, intentionally funded as a private-key search challenge. Puzzle #71's posted prize is **7.1 BTC**; trackers report a slightly different live address total (roughly 7.1002 BTC), which must be checked directly before valuing or acting on it.
- **Target address:** `1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU`.
- **Proof links:** [Blockstream explorer — address and history](https://blockstream.info/address/1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU) · [Blockstream API — address summary](https://blockstream.info/api/address/1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU) · [Puzzle #71 community tracker](https://btcpuzzle.info/puzzles/71) · [Puzzle #71 information / range](https://bitcoinpuzzle.online/puzzles/71/).
- **Proof status:** Address and explorer link are identified; the target and posted prize are documented by puzzle trackers. **Live balance/UTXO and transaction history were not independently fetched in this run.** Do not use the reported approximate balance as a confirmed quote.
- **Puzzle status / last touched:** Trackers list #71 as unsolved. The original funding dates to the 2015-era puzzle series. This sweep did not establish a reliable most-recent human activity timestamp; the tracker and pool pages are community monitoring, not proof of active key-search progress.
- **Solvability:** This is a brute-force private-key search, not a reasoning riddle. The stated interval is `2^70` candidate keys (from `2^70` through `2^71−1`); average exhaustive-search work is about `2^69` candidates. Even an illustrative, physically unrealistic sustained rate of `10^12` tested candidates/second would imply about 18.7 years on average, before accounting for the actual elliptic-curve/key-derivation cost, hardware, parallelization overhead, and competition. No credible basis was found to call this bench-solvable. **Classification: infeasible by ordinary brute force today; no shortcut established.**
- **What solving would take:** A genuinely new cryptanalytic shortcut, a credible weakness in the puzzle's construction, or extraordinary compute would be needed. We did not build or run a key-searcher. A safe next step is only to independently verify the address balance, puzzle status, and public rules—not to distribute or run a wallet-targeting search service.
- **Active work / community:** Puzzle-specific tracking and pool pages exist ([BTC Puzzle #71 stats](https://btcpuzzle.info/puzzles/71)); the [BitcoinTalk puzzle discussion](https://bitcointalk.org/index.php?topic=1078521) is historical context. The sweep could not verify a current leaderboard throughput or date-stamped active search effort.
- **Legality / terms / finder:** The funds are on-chain and technically spendable by whoever can satisfy the output's spend condition. That is not equivalent to an explicit legal license or a guarantee that a finder is legally entitled to retain them. The original anonymous puzzle's current enforceable terms and jurisdictional implications were not established. Seek qualified legal advice before attempting any claim; do not access or spend funds outside an expressly authorized challenge.
- **One honest catch:** A public address page proves only what its current chain data says; it does not prove that the claimed bounty terms are legally binding, that the tracker is current, or that a solver can safely claim it.

## Screened but not included as qualified finds

### Sparkler Labs Treasure Hunt contracts

Search results point to a purported [official contract repository](https://github.com/sparkler-labs/treasure-hunt-contracts) and deployment addresses, but no specifically identified live treasure (ID, reward amount, deadline, and unclaimed state) was verified. A contract address alone is not proof of a currently available prize. **Excluded pending event/state verification.** Do not submit a password or interact with a contract based only on an aggregator or search result.

### Paradigm Kryptos CTF / other CTFs and bug bounties

A search result described a purported 2026 CTF prize pool but did not provide a public escrow address and independently verifiable balance; it therefore fails the requested proof test. Bug-bounty/audit competitions also require careful scope authorization and are not treated here as open-ended permission to exploit deployed contracts. **No CTF, bug bounty, airdrop, abandoned faucet, or lost-key bounty qualified in this sweep.**

### Bitcoin Puzzle archive as a whole

The 160-puzzle series is a catalog of separate targets, not one uniform solvability opportunity. Community mirrors disagree on solve status and can lag the chain. For any target, check its own address on a block explorer and confirm its outputs/history at the time of review; do not infer a live reward from a list or headline aggregate.

## Follow-up verification checklist (read-only)

1. Open the Blockstream page/API for #71 and record the fetched-at time, funded and spent outputs, exact current balance, and latest transaction identifiers.
2. Cross-check #71's unsolved state against at least one maintained puzzle ledger and the relevant community thread; record the source's update timestamp.
3. Find and read the original puzzle announcement and any stated terms before classifying a finder as authorized. If there are no explicit claim terms, retain the legal caveat above.
4. For any proposed additional hunt, require a **specific prize address or published reward**, an explorer/history link, a live balance or dated official reward posting, unclaimed status, deadlines/reclaim terms, and a no-upfront-payment check. Otherwise record it as unverified, not a find.

## Sources consulted

- [Puzzle #71 tracker](https://btcpuzzle.info/puzzles/71)
- [Puzzle #71 range/status page](https://bitcoinpuzzle.online/puzzles/71/)
- [Blockstream address explorer](https://blockstream.info/address/1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU)
- [Blockstream address API](https://blockstream.info/api/address/1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU)
- [BitcoinTalk puzzle discussion](https://bitcointalk.org/index.php?topic=1078521)
- [Sparkler Labs contract repository (screened, not qualified)](https://github.com/sparkler-labs/treasure-hunt-contracts)
- [Paradigm Kryptos rules (screened; no public escrow address verified)](https://paradigm.xyz/kryptos-ctf/rules)

**Bottom line:** #71 is a real, well-known *candidate* with a public address and explorer, but this report deliberately does not claim an exact live balance or legal entitlement without direct verification. Its `2^70` search space makes brute-force work a poor use of a model bench absent a novel shortcut. No keys or solver code are included.
