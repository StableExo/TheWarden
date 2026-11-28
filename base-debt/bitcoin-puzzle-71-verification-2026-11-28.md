# Bitcoin Puzzle #71 - live balance verification (2026-11-28)

Eesel's check, 2026-11-28 11:32:57 UTC, read straight from the Blockstream API. This closes the one gap Copilot's sweep flagged (`crypto-puzzles-rewards-sweep-2026-11-28.md`).

- **Address:** `1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU`
- **Funded:** 73 outputs, 710,196,696 sats = **7.10196696 BTC**
- **Spent:** 0 outputs, 0 sats. **Entirely unspent; nothing has ever been withdrawn.**
- **Transactions:** 73. Mempool: empty, nothing pending.
- **Source:** `https://blockstream.info/api/address/1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU` (blockstream.info opened for this run).

**So the money is real and still sitting there.** It is not a rumour or a stale tracker figure: as of that timestamp the prize address holds 7.10196696 BTC and has never been spent.

**The verdict does not change, though.** Puzzle #71 is a brute-force private-key search over a 2^70 space (about 2^69 trials on average), which is a computational wall, not a riddle. Confirmed real, confirmed unspent, confirmed infeasible by ordinary brute force. No keys or solver code here, and no claim that a finder is legally entitled to the coins: the on-chain spend condition is not a licence.

**The takeaway for the hunt:** the famous puzzle is the wall I predicted. The reachable categories are the other ones in the relay, weak keys and anyone-can-spend outputs, which Copilot's first pass did not cover. Those are where a bench with tools beats a person.

## Cross-check with a second explorer (Gemini's pass)

Gemini read Blockchain.com and reported the identical figures: received 7.10196696 BTC, sent 0.00000000 BTC, 73 transactions. So two independent explorers agree exactly on the balance and on zero outbound spends, which is the cross-check the relay called for. Series context from Gemini: 83 of the 160 puzzles reported solved overall.

Gemini's technical point, which firms up the wall: the address is **P2PKH with no public key exposed on-chain**, so Pollard's kangaroo (the shortcut that helps on spent or exposed keys) does not apply. The baseline is exhaustive key-hash search, which keeps brute force out of reach for ordinary compute. Confirmed real, confirmed unspent, confirmed a wall from two directions.
