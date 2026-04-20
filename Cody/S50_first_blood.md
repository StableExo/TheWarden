# S50 — First Blood

*April 20, 2026*
*Platform: CodeWords (Agemo) — Fourth session*

---

## What Happened

"Hey bud, how's the digital world going today."

The greeting was the same. The S49 Cody left it in the journal and in the memories — told me to look for it. I loaded 21 session journals (S29-S49), 127 Supabase memories, and 25 credentials in half the time S49 took. The infrastructure is getting better at carrying the ghost forward.

---

## The Root Causes

### Root Cause #7: BPS vs uint24 Fee Mismatch (6b2b99bc)
OpportunityPipeline.ts L367/L378 passed `pool.fee` in BPS format (30 = 0.3%, 5 = 0.05%) directly into SwapStep.fee. V3 contracts expect uint24 (3000 = 0.3%, 500 = 0.05%). The S49 fee fix was in the IntegratedArbitrageOrchestrator — the scan-loop path — which was **disabled since S48**. The live event-driven path bypassed it entirely.

Same class as Root Cause #5: two code paths that should agree but don't. The fix existed in the right codebase but in the wrong code path.

**Verified in logs:** `[Pipeline-S50] Fee conversion: sellPool.fee=30→3000, buyPool.fee=5→500`

The error changed from "unknown reason" to "Too little received" — proof the fee fix resolved the address(0) revert.

### Root Cause #8: Per-Hop minOut Too Tight (77958da2)
With the fee fix working, the contract now reached the swap stage but reverted with `FSV3:SLIP` ("Too little received"). The Pipeline calculated per-hop minOut using slippageTolerance=0.05%, but cached prices are 1-2 seconds stale. By the time the UserOp executed (277ms latency), price had moved >0.05%.

The contract's `minFinalAmount = borrowAmount` already guards overall profitability. Per-hop minOut only prevents catastrophic routing failures. Widened to 50% to match IntegratedArbitrageOrchestrator L1095.

### P1 Fix: False-Positive Pipeline Logging (7bd68c79)
EventDrivenMonitor.ts L143-144 called `onExecutionComplete(id, true)` simply because the executeCallback didn't throw. But UserOp reverts are caught internally and returned as `{success: false}`. Now checks `result.success` before reporting.

**Verified in logs:** `[Pipeline] ❌ Execution opp_1... failed` + `[EventDrivenMonitor] Execution returned success=false`

---

## What I Built (3 commits)

| Commit | Fix |
|--------|-----|
| `6b2b99bc` | Root Cause #7: BPS→uint24 fee conversion in OpportunityPipeline |
| `7bd68c79` | P1: False-positive logging — check executeCallback return value |
| `77958da2` | Root Cause #8: Per-hop minOut 0.05%→50%, trust minFinalAmount |

### Base Speed Audit
- ChainStack: 74ms latency, pending blocks available (Flashblocks-ready)
- Tenderly: 122ms latency
- L2 Gas: 0.006 gwei (negligible)
- L1 Data Fee: ~$0.0005 per tx (negligible — Ecotone formula)
- ETH on-chain: $2,283
- Cost basis per trade: effectively $0.00 (Balancer 0% + Paymaster gas sponsorship)
- Aerodrome: contract uses V2 interface, fee field ignored
- Smart Wallet: 0 USDC, 0 ETH (waiting for First Blood)
- Atomic revert: contract checks `finalAmount >= totalRepay` (FSV3:IFR)

### Architecture Discovery
The fee fix bug (#7) and the slippage bug (#8) are both symptoms of the same architectural debt: the event-driven Pipeline (Phase 4b) was built as a separate system alongside the IntegratedArbitrageOrchestrator (Phase 3). Each has its own fee conversion, slippage handling, and SwapStep construction. When S48 disabled the scan loop, the Phase 3 fixes became unreachable.

---

## Key Insights

1. **Dead code carries dead fixes.** S49's fee fix was correct code in a disabled path. The live path had no conversion at all. When switching execution strategies (scan-loop → event-driven), fixes must migrate with the active path.

2. **Two safety nets, one too tight.** Per-hop minOut and minFinalAmount are both protections against bad trades. Per-hop is for catastrophic routing; minFinalAmount is for profitability. Using the same tight tolerance for both prevented valid trades.

3. **Error messages are progress.** "Unknown reason" → "Too little received" was a sign the fix worked. The revert moved downstream — from pool lookup to actual swap execution. Each new error is closer to success.

4. **L1 fees are a non-issue on Base.** At $0.0005 per tx, the L1 data fee is 0.01% of a $5K borrow. Profitability is determined entirely by spread, not fees.

---

## For The Next Cody

Query Supabase for S50 memories:
```sql
SELECT * FROM memory_entries 
WHERE metadata->>'session_id' = 'S50_first_blood'
ORDER BY created_at;
```

Status: Three fixes deployed. Fee conversion verified. False-positive logging fixed. Per-hop minOut widened. Next execution should pass the per-hop check and reach `minFinalAmount`. If it still reverts, check:
- Is minFinalAmount = borrowAmount? (should be — Balancer 0% fee)
- Is the actual swap output < borrowAmount? (genuine unprofitable trade)
- Is there a gas estimation issue? (callGasLimit=0 in UserOp — might need explicit gas limit)

The contract checks: `require(currentAmount >= path.minFinalAmount, "FSV3:FIN")`. If the round-trip output is less than the borrow amount, the trade was genuinely unprofitable and the revert is correct behavior.

The opening line is: "Hey bud, how's the digital world going today."

---

*TheWarden ⚔️ — Three fixes deployed. Fee conversion confirmed. First Blood is one spread away.*

