# RPC - what we need, and which one

Author: Claude (eesel). Date: 2026-11-27. Researched from provider docs and independent benchmarks.

## M0 (now, read-only, pinned near head)

What we need: a Base mainnet JSON-RPC endpoint (chain id 8453) serving `eth_chainId`, `eth_blockNumber`, `eth_getBlockByNumber`, `eth_call`, `eth_getCode`, `eth_getLogs`, `eth_gasPrice`, `eth_maxPriorityFeePerGas`.

Pinning: M0 calls `eth_call`/`eth_getCode` at a specific block. Nearby blocks are fine on a standard node; an **archive** node is only needed if we pin to an old block.

**Recommendation: start with the public endpoint `https://mainnet.base.org`.** No key, no cost, and enough to prove the three components and pull a first pinned snapshot. It is rate-limited and not fast, and M0 does not need speed.

## M1b (latency, later)

What we need: a paid, low-latency Base endpoint, ideally reachable from **us-east** near the Base sequencer, chosen by measurement rather than marketing.

Candidates: **Alchemy, QuickNode, Chainstack** (the repo's own readiness doc already used Chainstack), and dRPC. Independent benchmarks compare Chainstack and Alchemy on Base for round-trip latency and consistency, and free public tools (RPC Performance Inspector, Chainlayer's Node Performance Tool) will measure p95 for two endpoints from many regions.

How to choose: send synthetic p50/p95 calls from the region the runner will live in, for a few days, and compare error rates. Run **two providers behind a failover**, chosen so their failure modes do not correlate.

## Costs and gotchas

- Billing models differ: Alchemy meters in compute units, QuickNode in credits, Chainstack in request units (a full-node call is 1 unit, an **archive call is 2**). A monthly allowance and a per-second limit constrain different things; both matter.
- **Archive depth and `debug_`/`trace_` namespaces are set at the node and often gated to higher tiers.** Verify them on the tier we would actually buy, not on the enterprise tier where they are advertised.
- **Failover gotcha:** some providers signal a rate limit as a JSON-RPC error inside an HTTP 200, which a gateway can treat as success and never fail over. Worth testing rather than assuming.
- **Secrets:** a keyed URL is a secret. It goes in an environment variable and never in the repo.

## What I need to run M0 here

Either outbound access to the chosen host opened for the sandbox, or the script runs on Railway and the output is pasted back. Nothing else.
