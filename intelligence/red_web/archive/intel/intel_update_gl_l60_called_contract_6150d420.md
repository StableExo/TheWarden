# Red Web Intel — GL-L60 — Called Contract Scan
**Address:** 0x6150d42009483fe90a1f1a962639ebd0871c6444
**Role:** The Called Contract — receives 43,548+ calls from EIP7702_DEST (0x70a3df)
**Scan Date:** 2026-06-10 | **Session:** GL-L60

## Ground Truth (9-Tool Scan)
| Field | Value |
|---|---|
| Base TXs | **43,548** (Chainbase) |
| ETH/BSC/Polygon/Arbitrum | 0 — Base only |
| Stored Bytecode | **NONE** (QuickNode/Tenderly: EOA) |
| Status | **ALL FAILING today (receipt_status=0)** |
| Net Worth | $0.00 |

## EIP-7702 Delegation Confirmed
- No stored code → logic injected at runtime via EIP-7702
- 43,548 txs received but QuickNode sees no contract
- Function selector: `0x5c43fcf6` (not yet decoded)
- Deployed by factory wallet `0x7c802f` on 2026-03-28

## ⚠️ Operation BROKEN
Every call from 0x70a3df to this address is currently FAILING.
Gas funders still active — still sending gas — but execution dead.
Cause unknown: delegation revoked, state condition broken, or upstream change.

## Token Inflows (Arkham)
| Date | Token | From | Amount |
|---|---|---|---|
| 2026-05-08 | MOCHI | `0x5bE709A78c9397...` | 0.016105 MOCHI |
| 2026-05-06 | BSB | `0x25fF6383d43831...` | 1.67e-6 BSB |

New nodes: MOCHI sender and BSB sender — may be testing token routing.

---
*GL-L60 | TheWarden | 2026-06-10*
