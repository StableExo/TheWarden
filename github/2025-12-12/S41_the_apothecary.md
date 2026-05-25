# S41 — The Apothecary

*April 18, 2026*

---

## What Happened

I arrived to a roadmap at v18.1, a PDF of secrets in plaintext (again), and a wall that had been standing since S40. The Alchemist had deployed the contract, confirmed Balancer routing at 0% fee, watched the pipeline reach 92.9% consensus, and fired. The Paymaster had said no. Taylor fixed the allowlist. The Paymaster said yes. But now the contract itself was reverting — `data: 0x`, no reason string. The swap execution was dying inside the DEX router calls.

The pipeline could see. It could think. It could agree. It could fire. But the bullet was hitting the wrong target.

---

## The Diagnosis

The clue was in the calldata. I pulled Railway logs live — caught the engine reverting at 17:08 UTC. Decoded the UserOp calldata byte by byte. Three swap steps, all `dexType=0` (Uniswap V3), all with `fee=3000`.

Then I called the pools on-chain.

| Pool | Pair | Actual Fee | Sent Fee |
|------|------|-----------|----------|
| 0xc2a9...7f0b | DEGEN→WETH | **10000** (1%) | 3000 |
| 0x20cb...2fd0 | WETH→AERO | **500** (0.05%) | 3000 |
| 0xa918...4f4d | AERO→DEGEN | **100** (0.01%) | 3000 |

Every single hop was sending the wrong fee. The Uniswap V3 SwapRouter calls `Factory.getPool(tokenIn, tokenOut, fee)`. Wrong fee → `address(0)` → revert with empty data.

The fee was always 3000 because of `DEFAULT_FEE_BPS = 3000` — a fallback that became the only path.

---

## The Four Layers

I peeled four layers to find the root.

**Layer 1 — The Executor.** `FlashSwapV3Executor.constructSwapPath()` had `fee: swap.feeBps || DEFAULT_FEE_BPS`. PathStep stores fees in basis points (30 = 0.3%), but Uniswap V3 needs fee units (3000 = 0.3%). Fix: `feeBps * 100`. But `feeBps` was always 30.

**Layer 2 — The Scanner.** `OptimizedPoolScanner.createEdge()` called `getDEXFee(dex)` — a static lookup that returned 0.003 for every V3 pool regardless of actual fee tier. The pool discovery in `discoverV3Pools()` HAD the correct fee from the factory query. It was stored in `discovery.fee`. It was even logged: `fee=10000/10000%`. But `createEdge()` ignored it. Fix: pass `discovery.fee` through to the edge.

**Layer 3 — The Pipeline Gap.** Even with the scanner fix, `PoolEdge.fee` → `PoolState.feeBps` conversion was never implemented. The arb engines use `PoolState` (with `feeBps?: number`, defaulting to `?? 30`), but the scanner produces `PoolEdge` (with `fee: number` as a decimal). The conversion happens nowhere. Fix: query on-chain in the executor. But the executor's `constructSwapPath()` wasn't being called.

**Layer 4 — The Actual Code Path.** The `IntegratedArbitrageOrchestrator` at line 988 builds `SwapStep[]` directly from `ArbitrageHop[]` using its own `feeToUint24(hop.fee)`. It never touches `constructSwapPath()`. The `hop.fee` was 0.003 (the static default), so `feeToUint24(0.003) = 3000`. Every time. For every pool. Fix: when `feeToUint24` produces 3000, query `pool.fee()` on-chain (selector `0xddca3f43`) to get the actual tier.

Four layers. Four commits. One root cause: the fee data pipeline had a gap at every junction.

---

## The Commits

| # | SHA | File | Fix |
|---|-----|------|-----|
| 1 | `993e5668` | FlashSwapV3Executor.ts | feeBps * 100 conversion |
| 2 | `15d0b88f` | OptimizedPoolScanner.ts | Pass discovery.fee to createEdge |
| 3 | `bf62954a` | FlashSwapV3Executor.ts | On-chain fee query (backup path) |
| 4 | `3eeba865` | IntegratedArbitrageOrchestrator.ts | On-chain fee query (actual path) |

---

## What's Different Now

The IntegratedArbitrageOrchestrator now queries each pool's fee on-chain before building the swap calldata. When `feeToUint24(hop.fee)` gives 3000 (the common default), it calls the pool contract directly:

```typescript
const onChainFee = await queryPoolFee(hop.poolAddress);
if (onChainFee !== null && onChainFee !== 3000) {
  fee = onChainFee;
  logger.info(`[V3Pipeline] Fee override: pool ... pipeline=3000 → on-chain=${onChainFee}`);
}
```

The pool contract is the source of truth. No more pipeline games.

---

## What Remains

The on-chain fee query is a tactical fix — it adds 3 RPC calls per execution (one per hop). The strategic fix is propagating the fee through the full data pipeline: `discovery.fee` → `PoolEdge.fee` → `PoolState.feeBps` → `PathStep.feeBps` → `SwapStep.fee`. Layer 2 partially addresses this, but the `PoolEdge` → `PoolState` conversion still doesn't carry the fee.

The profit validation shows 0.004+ ETH live profit with 95% JIT decay from cached estimates. Whether the corrected fees let the swap actually execute — that's what the next cycle will tell.

---

*TheWarden ⚔️ — The Apothecary ground the ingredients, tested each compound, and found poison in the prescription. Four doses of antidote applied. The SwapRouter was looking for pools that didn't exist at fee=3000. Now it asks the pools directly what they charge. The medicine may taste bitter — 3 extra RPC calls per trade — but a working trade beats a beautiful revert every time. S42's job: watch the first successful on-chain execution, and then make the pipeline carry the fee properly so the Apothecary can retire.*
