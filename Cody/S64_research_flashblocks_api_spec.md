# S64 Research: Flashblocks API Deep Spec
## Collected: April 22, 2026 | Source: docs.base.org/base-chain/api-reference/flashblocks-api/flashblocks-api-overview

---

## Overview

Flashblocks endpoints expose all standard Ethereum JSON-RPC methods PLUS pre-confirmation-specific additions. Read state, simulate txs, and stream events against sequencer-ordered data **up to ~1.8 seconds before block seals**.

Use `"pending"` block tag to resolve against pre-confirmed state (not tx pool).

## HTTP Methods (Flashblocks-only)

| Method | Description |
|--------|-------------|
| `eth_simulateV1` | Simulate tx bundles against pre-confirmed state |
| `base_transactionStatus` | Check if tx received by node mempool |

## WebSocket Subscriptions (Flashblocks-only)

On Flashblocks WSS, `eth_subscribe("newHeads")` emits **every 200ms** (vs 2s on standard).

Three exclusive subscription types:

| Subscription | Description |
|-------------|-------------|
| **`newFlashblockTransactions`** | Stream individual txs as they're pre-confirmed (~200ms each) |
| **`pendingLogs`** | Stream filtered event logs from pre-confirmed txs |
| **`newFlashblocks`** | Stream full Flashblock payload objects from sequencer |

## Infrastructure Stream (Node Operators Only)

Raw upstream WebSocket feed — emits every ~200ms as sequencer pre-confirms.

| Network | Raw Stream URL |
|---------|---------------|
| **Mainnet** | `wss://mainnet.flashblocks.base.org/ws` |
| Sepolia | `wss://sepolia.flashblocks.base.org/ws` |

> ⚠️ **Apps should NOT connect directly.** These are for node operators only.
> App developers should use `pendingLogs`/`newFlashblocks` via Flashblocks-aware RPC provider.

## Flashblock Object Structure

Root message structure (received every ~200ms):

```json
{
  "payload_id": "0x03997352d799c31a",  // Consistent across all FBs in one full block
  "index": 4,                           // 0=system, 1-10=user txs (can exceed 10)
  "base": { ... },                      // Block header — ONLY at index 0
  "diff": { ... },                      // Incremental state changes — EVERY message
  "metadata": { ... }                   // Supplemental — UNSTABLE, may change
}
```

### Index Behavior
- **Index 0**: System transactions only. Includes `base` object (block header)
- **Index 1–N**: User transactions. Only `diff` + `metadata`, NO `base`
- Typically 9–10 per block, but **may exceed 10** during sequencer timing drift

### Base Object (index 0 only)
Full block header properties:
- `parent_hash`, `fee_recipient`, `block_number`
- `gas_limit`, `timestamp`, `base_fee_per_gas`

### Diff Object (every message)
Incremental block state changes:
- `state_root` — updated state root after this Flashblock
- `block_hash` — hash incorporating this Flashblock's txs
- `gas_used` — cumulative gas used
- `transactions[]` — raw encoded transactions
- `withdrawals[]` — withdrawal records

### Metadata Object (UNSTABLE — don't depend on for production)
- `block_number` — integer block number
- `new_account_balances` — map of address → new balance
- `receipts` — map of txHash → abbreviated receipt:
  - `type` — transaction type (0x2 = EIP-1559, 0x7e = deposit)
  - `status` — "0x1" = success
  - `cumulativeGasUsed`
  - `logs[]` — event logs
  - `logsBloom`
  - `transactionIndex`

## Complete Examples

### Index 0 (Block Start — with base object):
```json
{
  "payload_id": "0x03997352d799c31a",
  "index": 0,
  "base": {
    "parent_hash": "0x9edc29b8b0a1e31d...",
    "fee_recipient": "0x4200000000000000000000000000000000000011",
    "block_number": "0x158a0e9",
    "gas_limit": "0x3938700",
    "timestamp": "0x67bf8332",
    "base_fee_per_gas": "0xfa"
  },
  "diff": {
    "state_root": "0x208fd63edc...",
    "block_hash": "0x5c330e55a1...",
    "gas_used": "0xab3f",
    "transactions": ["0x7ef8f8a0b4..."],
    "withdrawals": []
  },
  "metadata": {
    "block_number": 22585577,
    "new_account_balances": { "0x000f3df6...": "0x0" },
    "receipts": { "0x07d7f06b...": { "type": "0x7e", "status": "0x1", ... } }
  }
}
```

### Index 1–N (Diff only — user transactions):
```json
{
  "payload_id": "0x03997352d799c31a",
  "index": 4,
  "diff": {
    "state_root": "0x7a8f45038...",
    "block_hash": "0x9b32f7a14...",
    "gas_used": "0x1234f",
    "transactions": ["0x02f90133...", "0x02f90196..."],
    "withdrawals": []
  },
  "metadata": {
    "block_number": 22585577,
    "new_account_balances": { "0x420...0015": "0x1234" },
    "receipts": {
      "0x7c69632dc...": {
        "type": "0x2",
        "status": "0x1",
        "cumulativeGasUsed": "0x1234f",
        "logs": [],
        "logsBloom": "0x00000000...",
        "transactionIndex": "0x1"
      }
    }
  }
}
```

---

## 🗡️ TheWarden Integration Blueprint

### Phase 1: pendingLogs Subscription (Immediate Win)
```
Subscribe via Flashblocks WSS:
  eth_subscribe("pendingLogs", { topics: [SWAP_EVENT_TOPIC], address: [pool_addresses] })

→ Receive Swap events at 200ms resolution
→ Feed into existing opportunity detection pipeline
→ 10x faster than current standard WSS subscription
```

### Phase 2: newFlashblocks Stream (Advanced)
```
Subscribe to full Flashblock payloads:
  eth_subscribe("newFlashblocks")

→ Parse diff.transactions for swap calldata
→ Decode metadata.receipts.logs for event data
→ Track new_account_balances for large token movements
→ Full block awareness 200ms at a time
```

### Phase 3: eth_simulateV1 (Pre-execution Verification)
```
Before submitting flash swap UserOp:
  eth_simulateV1([{
    from: smartWallet,
    to: flashSwapContract,
    data: encodedSwapCalldata,
    gas: estimatedGas
  }], "pending")

→ Simulate against current Flashblock state
→ Verify profit BEFORE paying gas
→ Zero cost for simulation
```

### Provider Support Check
- Need to verify if Alchemy/ChainStack expose Flashblocks WSS tier
- Public `mainnet-preconf.base.org` available but rate-limited
- Raw stream `mainnet.flashblocks.base.org/ws` is for node operators only

---
*TheWarden ⚔️ — S64 Research collected by Cody*
