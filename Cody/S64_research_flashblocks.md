# S64 Research: Base Flashblocks & Block Building Intel
## Collected: April 22, 2026 | Source: docs.base.org

---

## Overview
Flashblocks are **LIVE on Base mainnet**. Every 2-second block is actually **10 sub-blocks (Flashblocks)** built every **200ms** using Flashbots' `op-rbuilder`.

- All blocks on Base are now Flashblocks
- Apps can consume preconfirmations (200ms) or wait for full 2s finality
- Builder: [op-rbuilder](https://github.com/flashbots/op-rbuilder)

## Key Concepts

| Term | Definition |
|------|-----------|
| Flashblock | 200ms sub-block containing a portion of the full block's transactions |
| Preconfirmation | Ultra-fast signal that a tx will be included, before full block is sealed |
| Full Block | 10 Flashblocks combined into the complete 2-second block |

## Gas Budget per Flashblock (Incremental)

| Flashblock Index | Available Gas |
|-----------------|---------------|
| 1 | ~14M gas (1/10) |
| 2 | ~28M gas (2/10) |
| 3 | ~42M gas (3/10) |
| ... | ... |
| 10 | ~140M gas (full) |

- Index 0 exists but only contains system transactions
- Transactions exceeding 14M gas cannot fit in Flashblock 1

## Three Key Differences from Vanilla Ordering

### 1. Timing
- Flashblocks built every 200ms, each ordering a portion of the block
- Once built and broadcast, **transaction ordering is LOCKED**
- Later-arriving txs with higher priority fees CANNOT be included in earlier Flashblocks

### 2. Gas Allocation  
- Each Flashblock has incrementally increasing gas budget
- FB1 = 1/10, FB2 = 2/10, ... FB10 = 10/10 (full)
- Large txs (>14M gas) must wait for later Flashblocks

### 3. Dynamic Mempool
- Builder continuously accepts new txs while building each Flashblock
- Minimizes inclusion latency
- Txs ordered by fee **at time of selection**, NOT globally across the 200ms window
- Late-arriving high-fee tx may appear AFTER an already-committed lower-fee tx

## Transaction Lifecycle
1. **Submission**: User → DNS (mainnet.base.org) → Load Balancer → Proxyd → Mempool
2. **Selection** (every 200ms): op-rbuilder picks txs from mempool by priority fee
3. **Preconfirmation**: Flashblock streamed via WebSocket — ordering LOCKED
4. **Full Block** (every 2s): 10 Flashblocks combined, gossiped to network

## Network Configuration (Current)
- **Base Mainnet**: Flashblocks + Per-Transaction Gas Max
- **Base Sepolia**: Flashblocks + Per-Transaction Gas Max

## Impact on TheWarden Arb Bot

### Opportunities
- 200ms price updates = 10x faster opportunity detection
- First to detect + submit = first into Flashblock = guaranteed execution
- No frontrunning within locked Flashblocks
- More micro-arb opportunities per block (10 price snapshots vs 1)

### Considerations
- Speed = alpha: latency from detection → submission is critical
- Priority fee strategy matters more with 200ms windows
- Coinbase Paymaster UserOps may have different priority handling vs direct txs
- ENABLE_FLASHBLOCKS=true already set in Railway ✅

### P3 Action Items
- Subscribe to Flashblock preconfirmation WebSocket for 200ms price data
- Contract #16 could optimize for Flashblock-aware submission timing
- Consider priority fee boost for early Flashblock inclusion
- Test UserOp latency vs direct tx latency for Flashblock races

---
*TheWarden ⚔️ — S64 Research collected by Cody*
