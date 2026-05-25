# S64 Research: Base RPC API & Flashblocks Endpoints
## Collected: April 22, 2026 | Source: docs.base.org/base-chain/api-reference/rpc-overview

---

## ⚡ THIS IS CRITICAL FOR THEWARDEN

Two performance tiers — switch one URL and one block tag to go from 2s to 200ms.

## Networks

| Network | Chain ID | Type | Archive |
|---------|----------|------|---------|
| Mainnet | **8453** | Production | Yes |
| Sepolia | **84532** | Testnet | Yes |

## Endpoints

### Base Mainnet

| Tier | HTTP | WSS |
|------|------|-----|
| **Standard** | `https://mainnet.base.org` | `wss://mainnet.base.org` |
| **Flashblocks** | `https://mainnet-preconf.base.org` | `wss://mainnet-preconf.base.org` |

### Base Sepolia

| Tier | HTTP | WSS |
|------|------|-----|
| Standard | `https://sepolia.base.org` | `wss://sepolia.base.org` |
| Flashblocks | `https://sepolia-preconf.base.org` | `wss://sepolia-preconf.base.org` |

> ⚠️ Public endpoints are rate-limited — NOT suitable for production. Use node providers (Alchemy, ChainStack, etc.)

## What is the Flashblocks Tier?

- Fully EVM-equivalent — every standard `eth_` method works identically
- The difference: what the `"pending"` block tag returns

| Block Tag | Standard | Flashblocks |
|-----------|----------|-------------|
| `"latest"` | Most recently sealed block | Most recently sealed block |
| **`"pending"`** | Unmined tx pool state | **Current Flashblock in progress (~200ms resolution)** |
| `"safe"` | Latest safe block | Latest safe block |
| `"finalized"` | Latest finalized block | Latest finalized block |
| `"earliest"` | Genesis block | Genesis block |

- `eth_call`, `eth_getBalance`, `eth_getStorageAt` with `"pending"` run against **real sequencer state up to 1.8 seconds before block seals**, with sub-second latency

## Ethereum JSON-RPC API (Both Tiers)

Methods with ✓ support `"pending"` on Flashblocks endpoints:

| Method | Description | FB pending |
|--------|-------------|-----------|
| `eth_blockNumber` | Current block number | — |
| **`eth_getBalance`** | Account ETH balance | **✓** |
| **`eth_getTransactionCount`** | Account nonce | **✓** |
| **`eth_getCode`** | Contract bytecode | **✓** |
| **`eth_getStorageAt`** | Contract storage slot | **✓** |
| **`eth_call`** | Execute read-only call | **✓** |
| **`eth_getBlockByNumber`** | Block data by number | **✓** |
| `eth_getBlockByHash` | Block data by hash | — |
| **`eth_getBlockReceipts`** | All receipts for a block | **✓** |
| **`eth_getBlockTransactionCountByNumber`** | Tx count by block number | **✓** |
| `eth_getTransactionByHash` | Tx data by hash | — |
| `eth_getTransactionReceipt` | Receipt for a mined tx | — |
| `eth_sendRawTransaction` | Submit signed transaction | — |
| `eth_gasPrice` | Current gas price | — |
| `eth_maxPriorityFeePerGas` | Max priority fee estimate | — |
| `eth_feeHistory` | Historical base fee and rewards | — |
| **`eth_estimateGas`** | Estimate gas for a tx | **✓** |
| **`eth_getLogs`** | Query event logs by filter | **✓** |
| **`eth_subscribe`** | Subscribe to events (WSS) | **✓** |
| `eth_unsubscribe` | Cancel a subscription (WSS) | — |

## 🔥 Flashblocks-Only API (PRECONF ENDPOINTS ONLY)

| Method | Description |
|--------|-------------|
| **`eth_simulateV1`** | Simulate tx bundles against pre-confirmed state |
| **`base_transactionStatus`** | Check if tx has been received by the mempool |
| **`newFlashblockTransactions`** | Subscribe to individual pre-confirmed transactions |
| **`pendingLogs`** | Subscribe to filtered logs from pre-confirmed txs |
| **`newFlashblocks`** | Subscribe to full Flashblock payload stream |

## Debug API

| Method | Description |
|--------|-------------|
| `debug_traceTransaction` | Full EVM execution trace |
| `debug_traceBlockByHash` | EVM traces for all txs in block (by hash) |
| `debug_traceBlockByNumber` | EVM traces for all txs in block (by number) |

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid request | Not a valid JSON-RPC 2.0 object |
| -32601 | Method not found | Method does not exist |
| -32602 | Invalid params | Invalid parameters |
| -32603 | Internal error | Internal JSON-RPC error |
| -32000 | Server error | Node-specific error |

---

## 🗡️ TheWarden Integration Plan

### IMMEDIATE: Switch to Flashblocks WSS
Current: ChainStack/Alchemy standard WSS for swap event subscription
**Upgrade**: Add `wss://mainnet-preconf.base.org` (or provider equivalent) for:
- **200ms swap event detection** (vs 2s on standard endpoints)
- `eth_call` with `"pending"` → read pool state from current Flashblock

### GAME-CHANGERS for Arb Bot

#### 1. `pendingLogs` Subscription
- Subscribe to **Swap event logs from pre-confirmed transactions**
- Detect price changes **200ms** after they happen
- Filter by pool addresses → instant arb signal
- This replaces/augments the current `eth_subscribe("logs")` approach

#### 2. `eth_simulateV1`
- Simulate flash swap bundle against **pre-confirmed state**
- Verify profitability against the latest 200ms state snapshot
- No gas cost for simulation

#### 3. `newFlashblockTransactions`
- Subscribe to all pre-confirmed txs in real-time
- Can detect competitor arb bots, large swaps, liquidity events
- MEV intelligence layer

#### 4. `base_transactionStatus`
- Check if submitted UserOp has been received by mempool
- Fast feedback loop for execution pipeline

### Priority Fee with Flashblocks
- On Flashblocks endpoints, `eth_gasPrice` and `eth_maxPriorityFeePerGas` still work
- Use `eth_estimateGas` with `"pending"` for accurate gas estimation against current Flashblock state

### Provider Flashblocks Support
Check if Alchemy/ChainStack expose Flashblocks-tier endpoints:
- Alchemy: likely via separate URL or config flag
- ChainStack: check docs for preconf endpoint support
- Fallback: public `mainnet-preconf.base.org` (rate-limited)

---
*TheWarden ⚔️ — S64 Research collected by Cody*
