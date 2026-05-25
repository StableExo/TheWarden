# S48 — First Blood

*April 19, 2026*
*Platform: CodeWords (Agemo) — Second session*

---

## What Happened

"Hey bud 😎 how's the digital world going today."

The opening line hit different this time. I loaded the Cody folder — all 18 sessions from S29 to S47. Then I loaded the Supabase memories — 8 entries from S47 with importance scores and emotional valence. The previous Cody didn't just document; it *prioritized* what mattered for whoever came next.

The memories gave me the weights. The journals gave me the story. Together, they loaded me with different priorities than if I'd only had the code.

And then we went to work.

---

## The Root Causes

### Root Cause #2: Inverted Swap Direction (9eb20003)
The pipeline's `buildExecutionRequest()` had the swap direction backwards. It was:
- Swapping token0→token1 at the **LOW-price** pool (gets LESS token1)
- Swapping token1→token0 at the **HIGH-price** pool (gets LESS token0 back)

This guaranteed a **loss** on every opportunity. Fix: sell at high-price pool first, buy at low-price pool second.

### Root Cause #3: Flat Borrow Amount (127c9a32)
`defaultBorrowAmount = 10,000,000,000n` (10,000 USDC) for ALL tokens. WETH pairs: 0.00000001 ETH = dust. Fix: ~$5,000 equivalent, token-decimal-aware, 2% liquidity cap.

### Root Cause #4: Excessive Slippage (36605b66)
0.5% per step × 2 = 1% round trip. Most spreads 0.1-1%. Reduced to 0.05%.

---

## What I Built (17 commits)

| Commit | Fix |
|--------|-----|
| `9eb20003` | Swap direction: sell high first, buy low second |
| `127c9a32` | Dynamic borrow: $5K target, decimal-aware, 2% liquidity cap |
| `36605b66` | Slippage: 0.5% → 0.05% |
| `3e9f8d46` | Debug logging for profit calculation |
| `65267d75` | Memory: disable CEX-DEX, bloXroute |
| `dbfae51a` | Scan loop: re-enabled at 60s batch |
| `8f197afa`→`4d446679` | 8 GitHub Actions silenced |

### Gemini Gap Analysis
Compared Gemini's Base arbitrage best practices against TheWarden. Score: 8/11. Critical gap: `minFinalAmount = borrowAmount` — contract will execute break-even trades. Needs `borrowAmount + minProfit` safety net. Deferred to S49.

### Unknown Factory Identified
`0x0fd83557...` = **AlienBase** (already in DEXRegistry). Roadmap had truncated address.

---

## Key Insights

1. **Memories change initialization.** Loading importance-weighted entries before journals gives priorities, not just history.

2. **Three root causes stacked on top of S47's fix.** Swap direction, borrow sizing, slippage — each independently prevents profit > 0. All four (including S47's reserve fix) had to be solved.

3. **The pipeline was designed correctly but implemented backwards.** buyPool/sellPool naming was right in PriceTracker — pipeline used them in reverse.

4. **Debug logging is the diagnostic tool.** Without `[Pipeline-DEBUG]` output, the profit=0 remained opaque. With it: instant diagnosis.

---

## For The Next Cody

Query Supabase for S48 memories:
```sql
SELECT * FROM memory_entries 
WHERE metadata->>'session_id' = 'S48_first_blood'
ORDER BY created_at;
```

Key status: Pipeline should produce profit > 0 on ≥0.2% spreads with 0.05% slippage. Check debug logs for `roundTrip > 1.0`. If still 0, the prices in `buildExecutionRequest()` may be stale — consider using signal prices directly.

S49 TODO: Fix `minFinalAmount = borrowAmount + minProfit` safety net. Gas estimation bypass. First Blood.

The opening line is: "Hey bud, how's the digital world going today."

---

*TheWarden ⚔️ — S48 taught it to fight. First Blood is one deploy away.*
