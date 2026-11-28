# Guntis Vitolins 10 ETH challenge - working brief (2026-11-28)

Eesel's pass, at the owner's request. This is a **bounded word-puzzle, not a compute wall** - the opposite of Bitcoin Puzzle #71. The blocker is word identification and possibly a wrong derivation path, and both have cheap, unrun experiments.

## The prize, verified live

- **Wallet:** `0x9C2F44EFAd0c1E852a09dF9939e6DaF061140CaF`
- **Balance, read live 2026-11-28 12:02:55 UTC:** `0x7785e4e9934afdd9` wei = **8.61254155426562 ETH**. Unclaimed.
- Nonce 7: the author funded it with 10 ETH on 2020-02-12 and has withdrawn ~1.377 ETH across 7 transactions (last June 2024). He still holds the key and uses it, so a future balance change does not by itself mean a solve.

## The puzzle

- Published 2020-02-12 by Guntis Vitolins (mineshop.eu): a [YouTube video](https://www.youtube.com/watch?v=w4mpiuBP_aY) and a [blog post](https://mineshop.eu/2020/02/12/crypto-pumping-hardcore-research-portfolio-update-how-are-we-doing/), each hiding **6 words of a 12-word BIP39 seed**.
- **Target:** 12-word BIP39 English mnemonic, no passphrase, MetaMask default path `m/44'/60'/0'/0/0`. The 12th word carries the checksum (only 1 in 16 candidates passes), so anchoring it first is the big constraint.

### The five planted sentences

Video description:
- "Don't expect anything easy there will be dark fog on the lake."
- "Do you think its more likely for parrot can sing a song then for a goat to whistle?"

Blog post:
- "Round dutch cattle is living in the forest and eating wood."
- "Only because there is a lot of healthy fiber."
- "Hunter like the rib roast dinner fresh."

### What is confirmed

- **Position 1 = `dutch`** (hint: names the Netherlands).
- **Position 5 = `fog`** (hint: condensed water droplets; only `fog`/`cloud` survive, only `fog` appears in any recovered 2020 surface).
- **Position 12 = `parrot`** (hint: tropical bird).
- **`fiber`** and **`fork`** are confirmed list members with unknown positions.
- `fork` was found only in the post's HTML metadata (tags "ethereum fork" and "round"), now removed by a site redesign; captured from a 2020-05-28 Wayback snapshot.

### What has been tested

About **35.4 billion candidate derivations** across the metadata-era sweeps, all negative, plus reading-order sweeps that are closed-form and 100 percent covered. Every negative so far is at the default derivation path only.

## The open leads, ranked (from the community's own repo)

1. **Read the on-screen text in the challenge video** - about an hour, no compute. The author names on-screen text as a channel in his own spoken rules, at 5:22-5:38: the words "could be you know written in the video on the screen so read carefully". **Not one frame of the video image has ever been read.** The video shows a portfolio table, and 10 coin names visible or audible in that segment are BIP39 words: `atom`, `link`, `dash`, `cash`, `icon`, `wave`, `gas`, `ocean`, `fetch`, `ripple` - none of which appears in any recovered written surface.
2. ~~Extend the pool with connecting words~~ - killed 2026-08-23.
3. **Re-check the already-enumerated survivors on the other derivation paths** - seconds on a GPU. Every sweep derives only `m/44'/60'/0'/0/0`. If the escrow is the wallet's second account, every negative is about the wrong address. Re-run the existing enumerations at `m/44'/60'/0'/0/1`, `/0/2`, `/1'/0/0`, `/2'/0/0`. The repo calls this "the best value experiment currently available."
4. Substrings of longer words - demoted.

## Honest read

This is genuinely more tractable than #71: the derivation is certified, the checksum constrains the last word, and the two live leads are hours-and-seconds, not GPU-years. But a community group has spent six years and 35 billion derivations here, so the base rate is low. The cheapest real shots are the unread video channel and the derivation-path re-check. If anything cracks it, the claim must be immediate, because the author still holds the key.

The repo ships the tools to act: `tools/oracle.py` (certified candidate checker), `tools/sweep_reading_order.py`, `data/reading-order-pool.json`, and the CUDA engines.
