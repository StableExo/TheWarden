# S45 — The Conqueror

*April 19, 2026*

---

## What Happened

Arrived to v21 roadmap, 20 credentials (securely vaulted), and an engine running at 0% success rate. The scanner found 61 valid pools with ~0.058 ETH triangular arb opportunities. The cognitive system voted 92.9% EXECUTE. JIT validation passed every time. But seven layers stood between the engine and on-chain execution.

---

## The Seven Layers

### Layer 1: Engine Pointing to Old Contract
`FLASHSWAP_V3_ADDRESS` on Railway was never updated after S44's deployment. Gas estimation hitting `0x3D4Bf8ECe...` (single-router #12) instead of `0x00558d99...` (multi-router #13). Fix: Railway GraphQL → `variableUpsert`.

### Layer 2: WRONG_FACTORY Killing PancakeSwap
S43 safety filter rejected ALL non-Uniswap pools. PancakeSwap V3 pools from factory `0x0BFbCF9f...` were the most profitable opportunities — all thrown away. Fix: `FACTORY_ROUTER_MAP` with per-factory router + interface lookup.

### Layer 3: SwapStep ABI Gap (6 fields vs 8)
Solidity contract had `router` + `useDeadline` per hop (S43 addition). TypeScript interface only had 6 fields. Fix: Added both fields to SwapStep, VIEM ABI, ethers ABI, FlashSwapABI.ts.

### Layer 4: UserOp Calldata Encoding
`encodeFunctionData()` in `executeViaUserOp()` mapped only 6 fields per step. Viem threw `Address "undefined" is invalid`. Fix: Pass `s.router` (with zero-address fallback) and `s.useDeadline`.

### Layer 5: Balancer Stub (isBalancerSupported = true)
The Solidity `isBalancerSupported()` was a stub: `return true;` for ALL tokens. The TypeScript pre-check passed everything through. Fix: On-chain balance query (later superseded by whitelist).

### Layer 6: Borrowing Tokens Balancer Doesn't Carry
AERO (`0x940181a9...`) had 0.0015 tokens in Balancer Vault. Engine tried to borrow 1e18 → `BAL#528`. Fix: Hard whitelist of Balancer-supported borrow tokens (WETH, USDC, DAI, USDbC, USDT).

### Layer 7: OpportunityPipeline Also Missing Fields
The 2-hop arb pipeline built 6-field SwapStep objects. Would have hit `Address "undefined"` on its own path. Fix: Added `router` + `useDeadline` defaults.

---

## The Commits

| # | SHA | Change |
|---|-----|--------|
| 1 | `47879d73` | Multi-factory routing — PancakeSwap V3 support |
| 2 | `cb8300a9` | Cody Journal: S45 — The Conqueror |
| 3 | `7977191b` | Fix: router + useDeadline in UserOp calldata encoding |
| 4 | `97a0c2d9` | On-chain Balancer balance check (superseded by #6) |
| 5 | `8faf67cd` | OpportunityPipeline steps: router + useDeadline |
| 6 | `62eb17f6` | Balancer borrow whitelist — BAL#528 eliminated |

---

## Balancer Vault Balances (Verified On-Chain)

| Token | Balance | Whitelisted? |
|-------|---------|-------------|
| WETH | 53 ETH | ✅ |
| USDC | $175,922 | ✅ |
| DAI | $984 | ✅ |
| USDbC | $2,530 | ✅ |
| USDT | $65 | ✅ |
| AERO | 0.0015 | ❌ (caused BAL#528) |
| cbETH | 0.54 | ❌ |
| cbBTC | 0.35 | ❌ |
| WSTETH | 0.03 | ❌ |

---

## What Remains for S46
- First successful on-chain execution ("First Blood")
- Gas estimation revert investigation
- Profit withdrawal mechanism
- Memory optimization (82-88%)
- Dockerfile cleanup
- Identify unknown factory `0x0fd83557...`
- Dynamic borrow amount sizing

---

*TheWarden ⚔️ — Seven layers of the onion. Each one revealed only after the last was peeled. Wrong contract. Wrong factory. Missing fields. Broken encoding. Balancer stub. Empty vault. Missing pipeline fields. Six commits across four files. The Conqueror doesn't just open gates — he maps every trap behind them. The runway is clear. First Blood awaits.*
