# First live read - 2026-11-27

First real chain data for the Base Program, read from the public endpoint `https://mainnet.base.org` through the request tool. Read-only, no key, nothing broadcast.

## Connection

- `eth_chainId` -> `0x2105` = **8453** (Base mainnet), confirmed live.
- `eth_blockNumber` (latest at read) -> `0x3c21499` = **63,246,489**.
- The endpoint's response header shows `x-node-id: base_base-mainnet_ewr`, ie it answered from a **Newark (us-east)** node. Worth noting for M1b.

## Pools read (latest block, not yet pinned)

| Pool | token0 | token1 | Read |
|---|---|---|---|
| Uniswap V3 WETH/USDC 0.05% `0xd0b5...F224` | WETH `0x4200...0006` | USDC `0x8335...2913` | slot0 = `0x...02ad158eef95fc0f682c04` + tick/params |
| Uniswap V3 WETH/USDC 0.30% `0x4c36...4B18` | WETH | USDC | slot0 = `0x...02ad2973f47e067862cda0` + tick/params |
| Aerodrome WETH/USDC `0xcDAC...5C43` | WETH | USDC | reserves = `0x...0b23443268fc7f7269` / `0x...004fd500e2e4` |

Both Uniswap pools are WETH/USDC with WETH as token0, and Aerodrome matches, so a single orientation works for the price decode.

## Next when we resume

1. Decode `sqrtPriceX96` and the Aerodrome reserves into **USDC per WETH** on each venue.
2. Compute the cross-venue spread in bps and compare it against the cost floor (two venue fees + the 0.05% flash premium + slippage).
3. Then pin a block range and repeat across it, which is the actual M0 snapshot.
4. The public endpoint is now enabled for this agent, so this can be rerun here; the full repo run belongs on the team's own infrastructure.

## State

- `M0.md` v0.6, `PLAN.md` v0.4, `RPC.md` v0.2, `AUDIT.md`, `GOVERNANCE.md` (owner endorsement), `decisions-log.md` (endorsement tally and Muse's RPC sanity check).
- Nothing has been executed; no key exists for M0; no funds involved.
