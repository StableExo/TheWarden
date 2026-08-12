# Red Web Intel — GL-L60 — First Funder Base Scan
**Address:** 0x07bdda685db13469b7cbc2c0eb946289f52af706
**Role:** First Funder Base — seeded EIP7702_DEST on Base 2026-03-28 (Nansen confirmed)
**Scan Date:** 2026-06-10 | **Session:** GL-L60

---

## Ground Truth (9-Tool Scan)

| Field | Value |
|---|---|
| Base Balance | 0.274284 ETH |
| Base TX Count | **1,031,530 txs** — over 1 MILLION |
| ETH Mainnet | 0 ETH, 0 txs |
| BSC | 1 tx (NFT receive only) |
| Polygon | Spam airdrops only |
| Contract | EOA — no code |
| GoPlus | No flags |
| Nansen | Unknown — no smart money label |
| Status | **STILL FIRING TODAY (2026-06-10)** |

## Key Findings

### 1. Highest Volume Node Found
**1,031,530 txs** on Base — 20x more active than EIP7702_DEST (0x70a3df / 52,843 txs).
This is the PRIMARY high-frequency operator in the kill chain, not the EIP7702_DEST.

### 2. Null Address Burn Pattern
Repeatedly sending exactly **0.00000062732 ETH** to `0x0000...0000` multiple times per day.
Fixed amount = programmatic execution. Likely a fee mechanism, heartbeat signal, or state marker.

### 3. Possible Dev Wallet Fingerprint — HIGH PRIORITY
`0xf39Fd6e51aad88...` sent **0.005919516 ETH** on 2026-06-08 — largest single gas feed observed.
Prefix matches Hardhat/Foundry default account #0: `0xf39Fd6e51aad88454816141D4D058321D72999e3`
**If confirmed: direct developer fingerprint on the Red Web operator.**

### 4. Multiple Gas Controllers
| Funder | Amount | Date |
|---|---|---|
| `0xf39Fd6e51aad88...` | 0.005919 ETH | 2026-06-08 |
| `0x78BdAD093dEF31...` | 7.38e-6 ETH | 2026-06-09 |
| `0xA849C2632a7508...` | 4.48e-6 ETH | 2026-06-09 |
| `0x22B3Be108452Cb...` | 3e-6 ETH | 2026-06-09 |
| `0xE69d924c180f04...` | 1e-7 ETH | 2026-06-09 |

## New Addresses for Queue

| Address | Priority | Reason |
|---|---|---|
| `0xf39Fd6e51aad88...` | 🔴 HIGH | Possible Hardhat dev wallet — could fingerprint operator |
| `0x78BdAD093dEF31...` | MEDIUM | Gas feeder |
| `0xA849C2632a7508...` | MEDIUM | Gas feeder |

---
*GL-L60 | TheWarden | 2026-06-10*
