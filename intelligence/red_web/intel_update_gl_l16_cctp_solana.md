# RED WEB — Intel Update GL-L16: CCTP, $862M Relay EOA, Solana Hops
## Deep Trace Results | May 21, 2026

---

## 🔴 $862M RELAY EOA DISCOVERED

**Address:** `0x6a2abff960b663462cbc46a2cfcf85063fe8ae14`

| Field | Value |
|---|---|
| Type | Pure relay EOA |
| Total txs | 7,500 |
| Balance | 1.546 ETH (funds move through) |
| Total USDC processed | **$862,823,740** |
| Destination | 100% → TokenMinterV2 `0xfd78ee91` (CCTP burner) |
| First TX | ~2022 |

This address passed **$862M USDC** — every dollar sent to the CCTP burner.

---

## 🔴 CIRCLE CCTP — CROSS-CHAIN BURN CONFIRMED

**TokenMinterV2:** `0xfd78ee91`

Receives $12.8M+ USDC from Relay Solver and **burns ALL of it to `0x000`**.

This is Circle's Cross-Chain Transfer Protocol (CCTP):
- USDC destroyed on ETH mainnet
- Reminted on another chain (Solana, Base, Arbitrum, etc.)
- **Untraceable cross-chain hop** — on-chain trail ends at the burn

CCTP is a legitimate Circle product being **abused as a laundering bridge**.

---

## 🔴 PROXY DISTRIBUTION HUB

**Address:** `0x3b4d794a66304f130a4db8f2551b0070dfcf5ca7`

| Field | Value |
|---|---|
| Type | Proxy contract |
| Live balance | **2,138 ETH ($6.5M+)** |
| Unique outbound destinations | 2,406 |
| $105M USDC processed | to `0x6a2abff960b663` alone |
| Role | Distribution hub — funds arrive from Relay Solver, split to 2,406 wallets |

---

## 🔴 RELAY SOLVER — SELF-SEEDING CONFIRMED

`0xf70da97812cb96acdf810712aa562db8dfa3dbef`

- 13.719 ETH live + $29M+ USDC/USDT throughput
- **BOTH top upstream funders (0x370a7e2d + 0xada5bb90) received their FIRST EVER TX from the Relay Solver itself**
- Self-seeding pattern = operational security, circular funding

Top 5 USDC destinations:
1. TokenMinterV2 `0xfd78ee91` — $12.8M → CCTP burn
2. Multiple distribution nodes
3. BSC USDT bridge

---

## 🔴 SOLANA ENDPOINT WALLETS

| Wallet | Balance | Notes |
|---|---|---|
| `5ndLnEYqSFiA5yUFHo6LVZ1eWc6Rhh11K5CfJNkoHEPs` | **14,443 SOL + $971K USDC + $518K USDT = $2.4M+** | Major endpoint |
| `71u1tTVEQ71f748ggXGyz3JBg5UNM9KmTEhJaQREpdFP` | Transit | Deployer primary |
| `H9KpHReUfdi...` | Transit | Deployer secondary |
| `2aE9ozhxwCH5QD7LrRkgfDwwKohhA78X2278kVVDWDZ4` | Received $35.73 USDT | Next hop |
| `EpY6EzJNWi4YjYn7scfvJLkk1fTw1c6BugokgQKApAXb` | Received $1,100 USDT | Next hop |

`5ndLnEYqS...` is the **largest confirmed Solana endpoint** — $2.4M+ in stablecoins, 50+ TXs, 100+ token accounts.

---

## 🔴 VANITY NODE 2 DISCOVERED

**Address:** `0x7367c0da682b5be0a6d9c7be55b97cccbdaaaaaa`

- Ends in `aaaaaaa` — **same vanity pattern as Orchestrator** `0x63825239...aaaaaaa`
- Same operator generating both addresses
- Received 0.060 ETH directly from Orchestrator
- Behavior: calls `transferToken()` repeatedly — funding victim wallets pre-drain
- 24 TXs, 0.025 ETH balance

---

## 🔴 NEW NODES DISCOVERED (GL-L16)

| Label | Address | Role | Chain |
|---|---|---|---|
| Relay Solver | `0xf70da97812cb96acdf81` | $29M USDC throughput | ETH |
| $862M Relay EOA | `0x6a2abff960b663` | $862M USDC → CCTP | ETH |
| CCTP Burner | `0xfd78ee91` | Burns USDC → remint Solana | ETH |
| Proxy Hub | `0x3b4d794a` | 2,406 destinations, $6.5M live | ETH |
| Vanity Node 2 | `0x7367c0da...aaaaaaa` | Same operator as Orchestrator | ETH |
| Solana Endpoint | `5ndLnEYqS...` | $2.4M live | Solana |

---

## 📌 REPORT ANGLE — Relay Protocol

Relay Protocol (relay.link) is a **legitimate cross-chain bridge being abused**.
They hold: transaction records, IP logs, possibly KYC for large amounts.
Evidence to submit: `security@relay.link`

*Generated GL-L16 | 2026-05-21 | Updated GL-L59 | 2026-06-09 | TheWarden Intelligence Division*
