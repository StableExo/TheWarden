# RPC - what we need, which one, and the sources (v0.2)

Corrected 2026-11-27 after Muse's sanity check. Each claim carries its source; claims still needing a pinned URL are marked.

## M0 (now)

- Endpoint: `https://mainnet.base.org` - Base docs list it as the Base mainnet RPC endpoint. (Source: Base docs, via Muse.)
- Public endpoints are **rate-limited and "not suitable for production traffic"**. (Source: Base docs, via Muse.) Fine for read-only M0.
- Public endpoints **"do not serve debug methods or the `trace` and `txpool` namespaces"**. (Source: Base docs, via Muse.) **So M0 must not depend on `debug_`/`trace_`.**
- M0 is read-only, block-pinned and region-agnostic, so the provider choice does not affect it.

## M1b (latency) - the model, corrected

- Base has **no public peer-to-peer mempool**. (Source: Base docs, via Muse.) True as previously stated.
- **Ordering is not pure first-come-first-served.** Base docs (updated 2026-11-23): "transactions within each block are ordered by priority fee", and a late transaction "becomes eligible for the first block that starts building after it arrives, where it is ordered by priority fee". So **arrival decides which block snapshot you can join; priority fee decides order inside it.** Both matter. This corrects the earlier "first, not richest" framing in `PLAN.md`.
- **Sequencer region: UNVERIFIED.** The "us-east, near the sequencer" claim has no source found. Marked open, to pin before any colocation decision.

## Costs, with sources and thresholds

- **Chainstack request units: Full = 1 RU, Archive = 2 RU.** For Base, **less than 127 blocks behind the tip is full; 127 or more is archive.** (Source: Chainstack docs, via Muse.)
- **Alchemy CU weights** (`eth_blockNumber` 10, `eth_call` 26, `eth_getLogs` 60) and **QuickNode** 20 credits standard are **secondary-verified only** (a comparison article checked 2026-11-25). **Gemini must re-check the primary pricing pages before any buy**; do not price from these.
- **Rate-limit signalling:** Alchemy docs say to check the HTTP status and then "check the error field in the JSON response body". So the rate-limit-inside-a-200 gotcha is real in principle; test it per provider.

## Unverified / open

- Sequencer region (no source).
- Infura, Ankr, Allnodes, BlockPI - not verified here.

## Poll cadence (must be pinned before Gemini can price anything)

Nothing yet states M0's call volume, so a monthly bill cannot be forecast. **Proposal to pin:** one snapshot per block over a fixed range (e.g. 600 blocks, about 20 minutes at 2s blocks), recording calls-per-snapshot. Then the method mix and the monthly cost are computable.
