# 2026-08-27 — CR-3 LIVE SCAN: MESRI (Behzad) ETH `0x252a8bd2319d8a555b872990601221b3a2053bce`

> **Completion:** 🟢 COMPLETE (finding captured)
> **Scan Depth:** 🟢 DEEP (warden_forensic_scan v5.7, 20 tools)
> **Verified On-Chain:** YES (Arkham txs + GoPlus flag)
> **Source:** SDN [HRIT-IR][CYBER2]; TheWarden CR-3 live scan
> **Report:** `files/scan_mesri_cr3.json`

---

## 1. Event Summary
Live scan of **MESRI, Behzad** primary ETH (re-designated 2026-08-24 under Operation Economic Outcast; MOIS cyber co-leader; charged with 2017 HBO extortion ~$6M BTC). Address is **ACTIVE**, not dormant.

## 2. Key Findings
- **GoPlus (SlowMist): `stealing_attack` flag = 1** — ⚠️ flagged, not clean
- **Arkham: 46 transfers**, entity "Unknown/Unlabeled"
- **ACTIVE ON DESIGNATION DAY (2026-08-24)**: received **6,581 ETH** on Optimism from `0xb42fB19dC9...`; sent 999 ETH to `0xB9d...55`; received 999 ETH from `0xA338aEDf7e...`
- **Base large-chunking 2026**: received 9,999 ETH from `0x1CE44f...206` on 2026-02-15, 2026-01-16, 2026-01-08, 2025-11-25 (repeated ~10k ETH)
- BICSCAN: 0/9 engines CLEAN (no OFAC hit) — engines do NOT flag this one despite activity
- TRM (keyless free tier): Not Sanctioned

## 3. Interpretation (careful)
**Pattern: active rebalance/drain at the moment of designation.** 2026-08-24 = both the designation date AND the largest ETH movement date. Classic "reorganize funds as sanctions land" behavior. He is NOT dormant.

## 4. Open Lead (address truncation noted)
- Largest counterparty `0xb42fB19dC9...` (sent 6,581 ETH on designation day) — **Arkham proxy returns truncated 20-char addresses**, so full address not resolvable from this snapshot. Needs a chain-explorer lookup of the full tx to chase.
- `0x1ceA44f206...` (Base, repeated 9,999 ETH) — same truncation limitation.

## 5. Next Action
- Resolve the full address of the `0xb42fB19d...` counterparty via Etherscan/Optimism explorer of the 2026-08-24 tx, then scan it.
- Re-scan MESRI's other ETH addrs (`0x1CAb81...`, `0xA40cFB...`, etc.) + XBT `12aNKp2...`.

---
*Last updated: 2026-08-27 | Session: CR-3 | Scan depth: DEEP*