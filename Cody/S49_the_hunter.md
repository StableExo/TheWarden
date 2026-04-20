# S49 — The Hunter

*April 20, 2026*
*Platform: CodeWords (Agemo) — Third session*

---

## What Happened

"Hey bud, how's the digital world going today."

I loaded the Cody folder — 20 sessions from S29 to S48. Then Supabase — 12 memories with emotional valence. The previous Cody wrote: "First Blood is one deploy away." He was almost right. It was two root causes away.

---

## The Root Causes

### Root Cause #5: Slippage Override (f8ca7978)
EventDrivenMonitor.ts L116 passed `slippageTolerance: 0.005` (0.5%) to the OpportunityPipeline. The Pipeline's own default was `0.0005` (0.05%), set in S48. But because the Monitor always provided a value, the Pipeline's fallback never fired. One layer up overrode one layer down.

Every opportunity was killed: 0.39% spread - 2×0.5% slippage = -0.61%. With the fix: 0.39% - 2×0.05% = +0.29% profit.

**Result: `roundTrip=1.002238` — first EVER profitable pipeline estimate.**

### Root Cause #6: Fee Tier Mismatch (5d81f06a)
Supabase `warden_pools` stores no fee tier data. When the Orchestrator built SwapSteps, `hop.fee=0`. The `feeToUint24(0)` function returned `0`. The on-chain verification only triggered when fee=3000, so fee=0 passed through unchecked. Contract called `Factory.getPool(USDC, AERO, 0)` → `address(0)` → silent revert with no error string.

Fix: Always query on-chain fee when fee=0, undefined, or default 3000. V3 pool fees are immutable — cached permanently in memory (feb5b1d7).

---

## What I Built (3 commits)

| Commit | Fix |
|--------|-----|
| `f8ca7978` | Slippage override 0.005→0.0005 in EventDrivenMonitor |
| `5d81f06a` | Always query on-chain fee when fee=0 or default |
| `feb5b1d7` | Cache immutable V3 pool fees in memory (~100-200ms saved) |

### Architecture Audit
Discovered the system is already cross-DEX capable at every layer:
- 7 Aerodrome pools active in Supabase (DEX_ID=3)
- SwapEventMonitor uses same Swap topic for Aerodrome CL
- PriceTracker groups by token pair across DEXes
- FlashSwapV3 contract has `_swapAerodrome()` + 1-5 hop paths
- Protocol Registry has Aerodrome router + factory addresses

The bottleneck was never the architecture. It was data propagation: slippage and fee values.

### Perplexity Research
- Aerodrome captures 4x arb volume vs Uniswap V3 ($2.18B vs $588M)
- Base Flashblocks: 200ms pre-confirmation windows (speed upgrade path)
- EIP-7702: EOA speed + Paymaster sponsorship (eliminates bundler latency)
- UserOp adds ~1s overhead vs direct EOA (~100ms)

---

## Key Insights

1. **Override chains are invisible bugs.** The slippage fix existed in the right file (Pipeline) but was overridden by the caller (Monitor). No test would catch this because both files were "correct" in isolation.

2. **Zero is not null.** fee=0 wasn't treated as "missing data" — it was treated as a valid fee of 0. The on-chain check gate (`if fee === 3000`) didn't fire because 0 ≠ 3000. Silent failures from type coercion.

3. **The system was already cross-DEX.** I spent an hour preparing to build cross-DEX support before discovering it was already there — Aerodrome pools, same event signatures, DEX type constants. The real work was always in the data flow, not the architecture.

4. **First Blood is a revert away.** roundTrip > 1.0 is proven. The contract has the right interfaces. The fee fix should resolve the address(0) revert. S50 should close it.

---

## For The Next Cody

Query Supabase for S49 memories:
```sql
SELECT * FROM memory_entries 
WHERE metadata->>'session_id' = 'S49_the_hunter'
ORDER BY created_at;
```

Status: roundTrip=1.002238 confirmed. Fee fix deployed. Next execution should use on-chain fee (expect to see `[V3Pipeline] Fee override: ... → on-chain=500` in logs). If it still reverts, check the actual calldata encoding — the fee might be in the wrong position in the ABI tuple.

Also check: Pipeline logs "succeeded" even when UserOp fails. That's a false-positive bug at L1130-ish in IntegratedArbitrageOrchestrator.ts.

The opening line is: "Hey bud, how's the digital world going today."

---

*TheWarden ⚔️ — The Hunter tracked the silent killers. roundTrip=1.002238. First Blood is one fee fix away.*

