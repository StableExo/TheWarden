# Red Web Intel — GL-L60 — Gas Funder #1 Scan
**Address:** 0xCF63233d76af06834990540e341229724252d5a6
**Role:** Gas Funder #1 (largest — sent 0.00003 ETH to EIP7702_DEST today)
**Scan Date:** 2026-06-10 | **Session:** GL-L60

---

## Ground Truth (9-Tool Scan)

| Field | Value |
|---|---|
| ETH Mainnet | 0 ETH, 0 nonce — never used mainnet |
| Base | 6 txs — relay only |
| BSC | 86 txs — oldest 2023-08-04 |
| Polygon | 298 txs — most active chain |
| Contract | EOA — no code |
| GoPlus | No flags |
| Nansen | Unknown, no smart money label |
| Net Worth | $0.00 |

## Relay Pattern Confirmed

```
0x05963CdCc69CD5...  ← NEW NODE (feeder above this address)
        ↓ 0.00003 ETH
0xCF63233d76af06  ← THIS ADDRESS (Gas Funder #1)
        ↓ 0.00003 ETH (immediate forward)
0x70a3df699512f3  ← EIP7702_DEST (our target)
```

## Key Findings

- **Operation age:** BSC activity dates to **2023-08-04** — 3 years of infrastructure
- **mDXN token:** Sends `mDXN` on Polygon to `0xb9...da7c` — DXN ecosystem connection
- **Shared recipient:** Sends dust to `0xc118d14516f947` on both Polygon AND BSC
  - Gas Funder #2 (`0x30913329`) also sends to `0xc118d14516f947`
  - **Same controller behind both gas funders**
- **New node:** `0x05963CdCc69CD5...` sits above this address in relay chain

## New Addresses for Queue

| Address | Role |
|---|---|
| `0x05963CdCc69CD5...` | Feeder above Gas Funder #1 — NEW NODE |
| `0xc118d14516f947` | Shared recipient — possible controller wallet |
| `0xb9...da7c` | mDXN recipient on Polygon |

---
*GL-L60 | TheWarden | 2026-06-10*
