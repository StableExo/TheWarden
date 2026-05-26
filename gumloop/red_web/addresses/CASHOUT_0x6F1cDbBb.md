# 🔴 `0x6F1cDbBb4d53d226cf4B917B5C31fb1E14FFcBfB` — CASHOUT

> **Red Web Intelligence File | GL-L29 Forensic Scan**

---

## Identity
| Field | Value |
|---|---|
| **Full Address** | `0x6F1cDbBb4d53d226cf4B917B5C31fb1E14FFcBfB` |
| **Label** | CASHOUT |
| **Role** | CASH-OUT — all stolen ETH from Base victims lands here. Low nonce. Personal wallet or CEX deposit. |
| **Chain** | BASE (primary) + ETH, BSC, Polygon, Arbitrum |
| **Node Type** | CASHOUT |
| **Sessions** | GL-L12, GL-L29 |
| **Last Scanned** | ✅ 2026-05-26 00:21 UTC (GL-L29) |
| **Scan Time** | 7.9s |

---

## Network Position

**Sends to:**
- `BSC Orchestrator 0x63825239...`
- `Solana wallets (final EVM exit)`

**Receives from:**
- `Victims via sweeper script`
- `AGGREGATOR 0xcffad320...`

**Assets:** ETH, USDT

---

## Background
PRIORITY TARGET GL-L29. 3x `withdrawNative()` calldata decoded — all point here.
Low nonce = personal wallet or CEX deposit address.
**If CEX deposit → KYC identity cracked.**

---

## 🎯 Key Findings

- ✅ Arkham: Unlabeled — not tracked by Arkham intelligence
- 💰 Moralis: $0.00 net worth — wallet appears empty or uses non-ERC20 assets
- ⚡ Tenderly ETH: 👤 EOA — confirmed not a contract
- ⚡ Tenderly Base: 👤 EOA — confirmed not a contract

---

## Forensic Scan — GL-L29 Full Stack (7.9s)

### 🔒 GoPlus — Security Flags
```
✅ No real security flags on any chain
```

### 🏛️ Arkham — Entity Attribution
**Entity:** Unknown / Unlabeled 

| Date | From | To | Amount |
|---|---|---|---|
| 2026-05-26 | `0x23981fC34e69eeDFE2...` | `0x7a70cb77A12FA2dc3F...` | 0.005 ETH |
| 2026-05-26 | `0x7B016e360ae245f382...` | `0xB1026b8e7276e7AC75...` | 163.043978 USDC |
| 2026-05-26 | `0x7a70cb77A12FA2dc3F...` | `0x56Ca675c3633cC16Bd...` | 4.375e-05 ETH |
| 2026-05-26 | `0x000000000000000000...` | `0x0C0dCB97FD5B9d88d9...` | 63 XPOW |
| 2026-05-26 | `0x3B2EB2d6dd4E8746E0...` | `0x159FcC970e504D21a7...` | 0.035701 USD₮0 |
| 2026-05-26 | `0x000000000000000000...` | `0x6e6682b9001E13A866...` | 63 XPOW |
| 2026-05-26 | `0x3B2EB2d6dd4E8746E0...` | `0xfF1609b459395AE3fe...` | 0.321294 USD₮0 |
| 2026-05-26 | `0x000000000000000000...` | `0x846181662c4c4380D0...` | 63 XPOW |
| 2026-05-26 | `0x8A1Ba3d5B7864621A6...` | `0x82aF49447D8a07e3bd...` | 0.02369426542657228 ETH |
| 2026-05-26 | `0x069C637CC3Dc68AAb4...` | `0x5E6adBE46c93480D43...` | 5782.212298801922 OP |

### 🔗 Chainbase MCP — Multi-chain Activity
| Chain | Tx Count | |
|---|---|---|
| ETH | 0 | ⚪ |
| Base | 0 | ⚪ |
| BSC | 0 | ⚪ |
| Polygon | 0 | ⚪ |
| Arbitrum | 0 | ⚪ |

**Total transactions across all chains: 0**

### 💰 Moralis — Net Worth
**Total: $0.00**

No chain-level breakdown



### 🧠 Nansen MCP — Smart Money Profile
**Entity search:**
```
No results found for query: "0x6f1cdbbb4d53d226cf4b917b5c31fb1e14ffcbfb"
```
**Related addresses:**
```
No active chains found for the provided address.
```
**Portfolio:**
```
# Token Holdings
*No token holdings found for this wallet*

This wallet either:
- Has no token balances on the specified chain(s)
- Only holds tokens below the minimum threshold
- Has only suspicious/spam tokens (filtered out)


---
*Use mode parameter ('wallet_balances', 'defi', 'hyperliquid') to focus on specific position types*

**Note for interpretation**: Certain positions may be represented 
```
**PnL (30d):**
```
## PnL Summary

**PnL USD Realized**: 0

**ROI % Realized**: 0.0%

**Win Rate**: 0.0%

**Traded Token**: 0

**Traded Times**: 0

## Top 5 Tokens
```
**Counterparties:**
```
Error calling tool 'address_counterparties': Validation error in address counterparties request:
- timeRange: Field required

**Common fixes:**
- Ensure required fields are provided at the root level
- Include `address` (single string) or `entity_id`
- Include `timeRange` with valid from/to dates
- Set `sourceInput` to "Combined", "Tokens", or "ETH"
- Set `groupBy` to "wallet" or "entity"

**Examp
```

### ⚡ Tenderly MCP — Contract Verification
- **ETH Mainnet:** 👤 EOA — confirmed not a contract
- **Base:** 👤 EOA — confirmed not a contract

### 📡 Etherscan — Balance + Recent Transactions

**ETH — Balance: 0.0 ETH | 0 recent txs:**
**Base — Balance: 0 ETH | 0 recent txs:**
**BSC — Balance: 0 ETH | 0 recent txs:**
**Polygon — Balance: 0.0 ETH | 0 recent txs:**
**Arbitrum — Balance: 0.0 ETH | 0 recent txs:**

---

## Open Questions
- [ ] Is this address labeled on Arkham or Nansen as a CEX deposit?
- [ ] What is the nonce count on Base?
- [ ] Where does the ETH go after it arrives here?
- [ ] Is `0x6F1c...` the final hop or does it relay further?
- [ ] Any known DEX interactions?

---

## Session History
| Session | Finding |
|---|---|
| GL-L12 | First identified — 3x withdrawNative() calldata all decoded to this address |
| GL-L29 | Full 7-API forensic scan run. 0 total txs. Arkham: Unknown / Unlabeled. |

---
*Auto-populated by TheWarden GL-L29 · 2026-05-26 00:21 UTC · 7-API MCP+REST stack*
