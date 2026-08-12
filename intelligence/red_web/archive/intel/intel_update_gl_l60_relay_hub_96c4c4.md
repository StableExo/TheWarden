# Red Web Intel — GL-L60 — 0x96c4C4c Relay Hub Scan
**Address:** 0x96c4C4c106715Cb370E49430357F6f3dd19BA671
**Role:** Relay hub — funds @FloB_Safe and parallel bots, bidirectional with 0xf678C4
**Scan Date:** 2026-06-10 | **Session:** GL-L60

## Ground Truth
| Chain | Balance | TXs |
|---|---|---|
| Base | **6.636517 ETH** | 7,134 (Chainstack) / 12,007 (Chainbase) |
| All others | 0 | 0 |

## Bidirectional Relay Pattern
```
0xf678C4feb55759... ↔ 0x96c4C4c106715C  (~0.00616 ETH same-block both ways)
0x96c4C4c106715C → @FloB_Safe (0xf39Fd6e51aad88)   distributed
0x96c4C4c106715C → 0x87063a6D5C7be7...              distributed
```
Receives and returns almost identical amounts in same block — liquidity relay loop.

## New Nodes
| Address | Role |
|---|---|
| `0xf678C4feb55759...` | 🔴 CRITICAL — upstream feeder, bidirectional |
| `0x87063a6D5C7be7...` | HIGH — parallel bot recipient |

## GoPlus: Clean | Nansen: Unknown | Tenderly: EOA

---
*GL-L60 | TheWarden | 2026-06-10*
