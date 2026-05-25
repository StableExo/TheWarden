# S64 Research: Base Transaction Troubleshooting
## Collected: April 22, 2026 | Source: docs.base.org/base-chain/network-information/troubleshooting-transactions

---

## Transaction Not Being Included

### Max Fee Too Low
- If `maxFeePerGas` < current base fee → tx stays pending until base fee drops
- **Formula** (ethers.js default): `maxFeePerGas = 2 * baseFee + maxPriorityFeePerGas`
- Provides headroom for base fee to **double** before tx becomes unexecutable
- You only pay the **actual** base fee at inclusion time, not the max
- ⚠️ Base has a **minimum base fee** (0.005 gwei) — txs below this **never** included

### Priority Fee Too Low
- During high demand, txs compete for block space via priority fees
- **Solution**: Use `eth_maxPriorityFeePerGas` RPC to get competitive estimate
- ⚠️ **DA Throttling**: No RPC endpoint accounts for DA throttling. During DA throttling, even high-fee txs may be delayed as sequencer limits L2 txs to manage L1 data availability throughput

### Nonce Gap
- Pending tx with nonce N blocks ALL nonce N+1, N+2... txs regardless of fees
- **Solution**: Wait for pending tx, OR replace with same nonce + **at least 10% higher** maxPriorityFeePerGas AND maxFeePerGas

### Nonce Too Low
- Tx with already-used nonce → rejected
- **Solution**: Query nonce via `eth_getTransactionCount` with `pending` tag

## Transaction Rejected

### Gas Limit Exceeds Maximum
- **Hard limit: 25,000,000 gas per transaction**
- Txs specifying higher gas limit → rejected by mempool before inclusion
- Error: `exceeds maximum per-transaction gas limit`
- **Solution**: Reduce gas limit to ≤25M, or break into multiple txs

## Transaction Included But Failed

### Out of Gas
- Tx ran out of gas during execution
- **Solution**: Use `eth_estimateGas` + 20% buffer for variability

### Reverted by Contract
- Contract execution hit a revert condition
- **Solution**: Check Basescan for revert reason
- Common causes: failed `require()`, arithmetic errors, invalid state transitions

## Slow Confirmation

### Understanding Confirmation Times
- Base: blocks every **2 seconds**
- Flashblocks: preconfirmations every **200ms**

### Using Flashblocks for Faster Confirmations
- Use **Flashblocks-aware RPC endpoints** for fastest confirmation
- These return tx receipts as soon as tx is in a Flashblock (200ms)
- Standard endpoints wait for full 2s L2 block

## Debugging Tools

| Tool | Usage |
|------|-------|
| **Basescan** | View tx status, logs, revert reasons |
| **Tenderly** | Simulate and debug transactions |
| `eth_call` | Test contract calls without submitting |
| `eth_estimateGas` | Estimate gas usage before submitting |

---

## Impact on TheWarden

### Critical Parameters
| Parameter | Value | Impact |
|-----------|-------|--------|
| **Max gas per tx** | 25,000,000 | Flash swap (~300K) well within limit |
| **Min base fee** | 0.005 gwei | Floor for maxFeePerGas |
| **Nonce replacement** | +10% fees | For stuck UserOp replacement |
| **Flashblock confirm** | 200ms | Use FB-aware RPC for speed |

### Transaction Strategy
1. **maxFeePerGas**: Set to `2 * baseFee + priorityFee` (ethers.js default)
2. **Priority fee**: Query `eth_maxPriorityFeePerGas` for competitive bid
3. **Gas limit**: `eth_estimateGas` + 20% buffer, capped at 25M
4. **Nonce management**: Use `pending` tag for `eth_getTransactionCount`
5. **DA throttling awareness**: Monitor for periods where even high-fee txs delay
6. **Flashblocks RPC**: Use FB-aware endpoint for 200ms receipt confirmation

### Circuit Breaker Triggers (P1)
- Consecutive reverts → pause execution
- DA throttling detected → back off submission rate
- Nonce gaps → auto-resolve or alert
- Gas estimation failures → skip opportunity

---
*TheWarden ⚔️ — S64 Research collected by Cody*
