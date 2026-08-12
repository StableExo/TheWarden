# Red Web Intel — GL-L60 — Deployed Contract Wallet Scan
**Address:** 0x7c802f062c67058d0dd40b041204b960e8bde26a
**Role:** Factory Wallet — deployed Red Web contract on Base (Nansen confirmed)
**Scan Date:** 2026-06-10 | **Session:** GL-L60

## Ground Truth: 2 Transactions. Ever.
| Block | Timestamp | Type | Status |
|---|---|---|---|
| 43961519 | 2026-03-28 | EIP-1559 (type 2) | ✅ Success |
| 43961574 | 2026-03-28 | EIP-1559 (type 2) | ✅ Success |

**3 minutes apart. Deploy then initialize. Wallet went permanently dark.**

## Classification: Pure Factory Wallet
- Funded by `0x07bdda` (First Funder Base) 2026-03-28T15:36:55
- Tx #1 (block 43961519): deployed contract
- Tx #2 (block 43961574): initialized contract
- **Silent ever since — 2+ months**
- Arkham: 0 transfers (completely invisible to standard analysis)
- ETH mainnet: 0 txs, 0 balance
- All other chains: 0 activity

## Kill Chain Link
```
0x07bdda (First Funder Base)
    ↓ funded 2026-03-28T15:36:55
0x7c802f (Factory Wallet)
    ↓ deployed 2026-03-28T15:39:45 (block 43961519)
0x6150d420... (The Contract) ← 52,843 calls from 0x70a3df
```
Next scan: 0x6150d420... to confirm deployment link.

---
*GL-L60 | TheWarden | 2026-06-10*
