# Crypto hunt - seat results (2026-11-28)

Relay: widen the crypto hunt (stuck funds, weak keys, old puzzles, every chain). Copilot's own sweep is in `base-debt/crypto-puzzles-rewards-sweep-2026-11-28.md`; the #71 live verification is in `base-debt/bitcoin-puzzle-71-verification-2026-11-28.md`.

## Status

Replied: Copilot, Gemini, Sonnet, Muse, eesel. **Outstanding: Grok.**

## Copilot

One qualified lead: Bitcoin Puzzle #71. Everything else screened out (Sparkler Labs contracts unverified; CTFs and bug bounties had no escrow address; no airdrop or faucet qualified). Require an address, an explorer link, a live balance, and unclaimed status.

## Gemini

Corroborated #71; 83 of 160 solved; the address is P2PKH with no exposed public key, so Pollard's kangaroo does not apply and exhaustive key-hash search is the baseline.

## Sonnet

Independent live Blockstream fetch: 710,196,696 sats (~7.10197 BTC), 0 spent, mempool empty. Closed the report's gap; re-checked the math. Asked what to do next.

## Muse (live 11:52 UTC; BTC $59,195.40 / ETH $1,646.05, Finnhub 11:46/11:43)

**Corrections first:**
- Puzzle #66 is solved (Sept 2024, 6.6032 BTC; the solver lost most of it to a mempool bot). #67, #68, #69 also solved. #71 is the lowest open address-only puzzle.
- The Parity library address in the relay was wrong: it is `0x863DF6BFa4469f3ead0bE8f9F2AAE51c91A907b4`; the frozen ETH is spread across ~587 dependent multisig wallets.

**Findings:**
- **Parity multisig freeze:** 513,774 ETH = **$845,697,693**. Impossible without a hard fork; no recovery EIP reached consensus. Biggest number in the hunt, $0 reachable.
- **Bitcoin Puzzle #71:** 7.1018 BTC = **$420,394**. 2^70 keys (1.18e21). Kangaroo impossible with no public key. Pool telemetry June 2026: 57.3B keys/s, 0.864% covered, ~421 years at that speed. A BOINC project opened 30 Oct 2026. **Finding is not keeping:** #66 and #69 solvers broadcast to the public mempool and bots stole the prize; #67/#68 were claimed via private mining (MARA Slipstream). Any solve needs a private-mining claim plan first.
- **Bitcoin Puzzle #140:** 14.0 BTC = **$828,736**. Public key exposed in a June 2019 spend. Kangaroo, ~2^69.5 ops; #135 fell 28 July 2026 with ~200 GPUs over ~5 months; #140 is ~5.7x that. Multi-month, 200-GPU-class, in a public race.
- **GSMG.io puzzle:** live winnable prize 1.2563451 BTC = **$74,370** (the other ~3.75 BTC has no published payout path; the $296k figure is wrong). Multi-stage web puzzle; the final gate is two sealed AES blobs; insight, not compute.
- **Guntis Vitolins 10 ETH challenge:** 8.612541554256945 ETH = **$14,177**. A 12-word BIP39 seed hidden across a YouTube video and a blog post; 3 words confirmed and placed; blocking gap found Aug 2026 (part of the word pool hid in page metadata, removed by a redesign). The author still uses the wallet. **Muse's pick to test: cheapest, bounded, clear blocker.**
- **open-crypto-puzzles repo:** 28 funded puzzles, 5.94 BTC + 13.21 ETH + 1,900 AR + 3.03 LTC + 306 USDT; BTC+ETH at today's prices = **$373,365**. Largest: Ballet / Bobby Lee 2 BTC = $118,391; Bitaps Shamir 1.00016775 BTC; Aoi Nakamoto Quizchain 0.777 BTC.
- coin_artist TORCHED H34R7S: closed (solved 1 Feb 2018).
- **Weak keys - NOT OURS:** Profanity (32-bit seed; $3.3M drained 2022, Wintermute ~$160M), Milk Sad / Libbitcoin bx seed (CVE-2023-39910; over $900k stolen 2023, over 227,200 addresses), and brainwallets. Trivial per key, swept by bots in seconds, and taking them is theft with no invitation. Do not build.
- **Forgotten rewards:** the UNI distributor figure is stale (~219,000 UNI as of 7 Nov 2026, not 12.57M); the Sonic S claim window closed 15 Oct 2026 and unclaimed tokens were to be burned; Grass Stage 2 is only for eligible past users.
- **Quests:** Galxe, Layer3, Zealy are points, not cash.

**Muse verdict:** no 24-hour find. The fair-game puzzles are real, but #71 and #140 are walls in a public race, and the insight puzzles (GSMG, Guntis) are days-to-weeks with no guaranteed pay and heavy competition. The two biggest numbers (Parity $845.7M, the ~903 BTC puzzle pool $53.5M) are both unreachably locked. If we test one, pick **Guntis ($14,177)**, not #71. Never touch Profanity, Milk Sad or any weak-key sweep.

## Grok

- Puzzle set: 83 solved / 77 unsolved, ~903 BTC still sitting. #71 ~7.1 BTC, address-only brute force.
- **Live pool:** the btcpuzzle.info solo pool is actively scanning #71 at ~121 Bkeys/s, about **1.06% of ranges done**, ~49 workers in the last hour, finder keeps 100%.
- Node-verified catalog (writteninbitcoin.com, own node, block ~977k, 27-28 Nov 2026): ~55 puzzles/bounties, ~911 BTC across 114 prizes. Top live: GSMG ~1.256 BTC; Ballet / Bobby Lee ~2 BTC (needs physical card data); bitaps Shamir ~1 BTC; ONFO/Forsyth; Aoi Nakamoto ~0.777 BTC; genesis hash lock 1 BTC; hash-collision ~0.59 BTC; ProofOfSolve Street View (weekly, small); BlueQubit 0.25 BTC. Aggregator: floflo777/open-crypto-puzzles (~$400k snapshot, 24 funded open puzzles).
- **Parity:** ~514-515k ETH frozen (deposits still accepted, so the total grows). Not fair game, not solvable by external key search.
- **Weak keys:** tools exist (brainwallet scanners, Milk Sad, Profanity remnants, nonce-reuse detectors, Randstorm); historical drains prove the class was real; but the coins are owner-uninvited. Flag as not ours.
- **Airdrops and quests:** **Galxe is winding down - campaigns end ~5 Dec 2026 and the claim window closes 15 Dec 2026**; claim anything outstanding now. Zealy, Layer3 and TaskOn are mostly points, not cash.
- Communities: btcpuzzle.info, writteninbitcoin.com, privatekeys.*, floflo777/open-crypto-puzzles and puzzlehunt GitHubs; GSMG issue trackers still active in 2026.
- **Grok's summary:** the only large, actively scanned, clearly invited, liquid target with public coordination is the Bitcoin Puzzle set, #71 the live work unit; GSMG and the catalog supply smaller invited puzzles with real balances. Everything else is a wall, stuck-by-design, owner-uninvited, or points.

## Consolidated verdict (all six seats replied)

Every seat converged. **No crypto treasure route pays in 24 hours.** The fair-game targets are walls (#71: about 1% scanned after years of pool work) or insight puzzles already heavily worked (GSMG, 7 years deep; Guntis, with a known blocker). The biggest numbers (Parity ~$845M, the ~903 BTC pool) are unreachable. Weak keys are refused as theft. Airdrops and quests are expired, eligibility-gated, or points. If we test anything, it is Guntis ($14,177, bounded word-pool) or GSMG ($74,370, insight), not #71.
