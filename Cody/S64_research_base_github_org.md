# S64 Research: Base GitHub Organization (github.com/base)
## Collected: April 22, 2026 | 83 repos total

---

## 🗡️ Repos Most Relevant to TheWarden

### Tier 1: Critical (Direct impact on arb bot)

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| **[paymaster](https://github.com/base/paymaster)** | 159★ | Solidity | Paymaster contracts — TheWarden uses Coinbase Paymaster for gasless |
| **[base-flashblocks-demo](https://github.com/base/base-flashblocks-demo)** | 16★ | TypeScript | Flashblocks integration demo — reference for P3 integration |
| **[flashblocks-websocket-proxy](https://github.com/base/flashblocks-websocket-proxy)** | 13★ | Rust | WSS proxy for Flashblocks distribution [ARCHIVED] |
| **[op-rbuilder](https://github.com/base/op-rbuilder)** | 13★ | Rust | Block builder [ARCHIVED — now at flashbots/op-rbuilder] |
| **[rollup-boost](https://github.com/base/rollup-boost)** | 9★ | - | Sidecar to enable rollup extensions |
| **[contracts](https://github.com/base/contracts)** | 278★ | Solidity | Base contracts |
| **[contract-deployments](https://github.com/base/contract-deployments)** | 495★ | Solidity | Contract deployment addresses/info |
| **[transaction-latency](https://github.com/base/transaction-latency)** | 13★ | Go | Tx latency measurement tool |

### Tier 2: Useful (Smart wallet, SDK, infrastructure)

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| **[account-sdk](https://github.com/base/account-sdk)** | 129★ | TypeScript | Smart wallet SDK — CoinbaseSmartWallet integration |
| **[eip-7702-proxy](https://github.com/base/eip-7702-proxy)** | 67★ | Solidity | EOA upgrade proxy for CoinbaseSmartWallet |
| **[eip712sign](https://github.com/base/eip712sign)** | 101★ | Go | EIP-712 signing utility |
| **[webauthn-sol](https://github.com/base/webauthn-sol)** | 290★ | Solidity | WebAuthn verification in Solidity |
| **[op-viem](https://github.com/base/op-viem)** | 370★ | TypeScript | Viem extensions for OP Stack |
| **[withdrawer](https://github.com/base/withdrawer)** | 532★ | Go | Proving/finalizing withdrawals from op-stack chains |
| **[pessimism](https://github.com/base/pessimism)** | 1614★ | Go | Real-time threat/event detection [ARCHIVED] |
| **[benchmark](https://github.com/base/benchmark)** | 53★ | Go | Benchmarking tool for OP stack chains |

### Tier 3: Reference/Infrastructure

| Repo | Stars | Lang | Description |
|------|-------|------|-------------|
| [node](https://github.com/base/node) | 68615★ | Go | Run your own Base node |
| [base](https://github.com/base/base) | 339★ | Rust | All components to run Base |
| [optimism](https://github.com/base/optimism) | 91★ | Go | OP Stack fork |
| [op-geth](https://github.com/base/op-geth) | 76★ | - | Base's op-geth |
| [base-mcp](https://github.com/base/base-mcp) | 346★ | TypeScript | MCP server for onchain LLM tools |
| [blob-archiver](https://github.com/base/blob-archiver) | 122★ | Go | Blob data archiving |
| [docs](https://github.com/base/docs) | 241★ | TypeScript | Base documentation source |
| [bridge](https://github.com/base/bridge) | 203★ | TypeScript | Base Bridge interface |

---

## 🔥 Immediate Action Items from GitHub

### 1. Study `base-flashblocks-demo` (P3 Reference)
- TypeScript demo of Flashblocks integration
- Reference implementation for `pendingLogs`, `newFlashblocks` subscriptions
- Copy patterns for TheWarden's event pipeline upgrade
- URL: https://github.com/base/base-flashblocks-demo

### 2. Study `paymaster` Contracts (Gasless Verification)
- Understand Coinbase Paymaster contract internals
- Verify UserOp gas limit handling (currently USEROP_CALL_GAS_LIMIT=2500000)
- Check if Paymaster imposes priority fee constraints
- URL: https://github.com/base/paymaster

### 3. Study `transaction-latency` (Benchmarking)
- Go tool for measuring tx latency on OP stack chains
- Use to benchmark TheWarden's submission → confirmation latency
- Compare standard vs Flashblocks tier latency
- URL: https://github.com/base/transaction-latency

### 4. Study `account-sdk` (Smart Wallet)
- TypeScript SDK for CoinbaseSmartWallet
- May have better patterns for UserOp construction than current ThirdWeb approach
- URL: https://github.com/base/account-sdk

### 5. Note: `flashblocks-websocket-proxy` [ARCHIVED]
- Rust proxy for distributing Flashblocks — archived but code is reference
- Shows how Flashblock payloads are structured and distributed
- URL: https://github.com/base/flashblocks-websocket-proxy

---

## Full Repo List (83 repos, sorted by last updated)

| Repo | Stars | Language | Updated | Status |
|------|-------|----------|---------|--------|
| base | 339 | Rust | 2026-04-22 | Active |
| node | 68615 | Go | 2026-04-22 | Active |
| contract-deployments | 495 | Solidity | 2026-04-22 | Active |
| basenames | 164 | Solidity | 2026-04-22 | Active |
| chains | 79011 | Kotlin | 2026-04-21 | Archived |
| ui | 58 | TypeScript | 2026-04-21 | Active |
| docs | 241 | TypeScript | 2026-04-21 | Active |
| contracts | 278 | Solidity | 2026-04-21 | Active |
| base-mcp | 346 | TypeScript | 2026-04-21 | Active |
| web | 670 | TypeScript | 2026-04-20 | Archived |
| op-enclave | 99 | Go | 2026-04-20 | Active |
| paymaster | 159 | Solidity | 2026-04-20 | Active |
| optimism | 91 | Go | 2026-04-19 | Active |
| op-wagmi | 126 | TypeScript | 2026-04-19 | Active |
| eip712sign | 101 | Go | 2026-04-19 | Active |
| pessimism | 1614 | Go | 2026-04-19 | Archived |
| brand-kit | 1524 | - | 2026-04-19 | Active |
| withdrawer | 532 | Go | 2026-04-19 | Active |
| op-viem | 370 | TypeScript | 2026-04-19 | Active |
| webauthn-sol | 290 | Solidity | 2026-04-19 | Active |
| op-geth | 76 | - | 2026-04-19 | Active |
| blob-archiver | 122 | Go | 2026-04-19 | Active |
| onchainsummer.xyz | 133 | TypeScript | 2026-04-19 | Active |
| account-sdk | 129 | TypeScript | 2026-04-16 | Active |
| eip-7702-proxy | 67 | Solidity | 2026-04-16 | Active |
| triedb | 106 | Rust | 2026-04-15 | Active |
| bridge | 203 | TypeScript | 2026-03-31 | Active |
| commerce-payments | 129 | Solidity | 2026-03-07 | Active |
| base-flashblocks-demo | 16 | TypeScript | 2026-02-13 | Active |
| op-rbuilder | 13 | Rust | 2026-02-02 | Archived |
| flashblocks-websocket-proxy | 13 | Rust | 2026-01-24 | Archived |
| rollup-boost | 9 | - | 2026-01-24 | Active |
| transaction-latency | 13 | Go | 2026-01-30 | Active |
| benchmark | 53 | Go | 2026-04-06 | Active |

---
*TheWarden ⚔️ — S64 Research collected by Cody*
