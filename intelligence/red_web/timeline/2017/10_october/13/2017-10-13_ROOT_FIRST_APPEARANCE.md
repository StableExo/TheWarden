# 2017-10-13 — ROOT ADDRESS FIRST APPEARANCE: 0xaf1931

> **Completion:** 🟡 PARTIAL — on-chain confirmed, full attribution TBD
> **Scan Depth:** 🟡 PARTIAL — Etherscan traced, full scanner not yet run
> **Verified On-Chain:** YES — Block 4362087

---

## Summary

| Field | Value |
|-------|-------|
| **Date** | October 13, 2017 |
| **Block** | 4,362,087 (Ethereum mainnet) |
| **Address** | 0xaf1931c20ee0c11bea17a41bfbbad299b2763bc0 |
| **Role** | ROOT — top of traced ancestry chain |
| **Event** | First transaction — sends 0.0001 ETH to 0xeeea04 |
| **Discovered** | VL-29 session 2026-08-21 via ancestry trace from 0x70a3df |

---

## What We Know

This address is the **earliest confirmed node** in the traced ancestry chain leading to current target 0x70a3df699512f39C682F94fad498454C90B8C219.

It first moved on **October 13, 2017** — during the peak of the 2017 ETH bull run.

Over the following **29 days (Oct 13 – Nov 10, 2017)**, it distributed **361.6 ETH** across 50 transactions to at least 10 downstream addresses.

---

## Activity Summary (Oct–Nov 2017)

| Metric | Value |
|--------|-------|
| First tx | 2017-10-13 — Block 4,362,087 |
| Last tx | 2017-11-10 — Block 4,464,828 |
| Total txs | 50 |
| ETH moved OUT | 361.61 ETH |
| ETH moved IN | 0 (funded entirely via internal txs from seeder contracts) |
| Primary recipient | 0x416299aade6443e6f6e8ab67126e65a7f606eef5 |
| USD value (2017 peak ~$400/ETH) | ~$144,600 |
| USD value (2026 price ~$2,340/ETH) | ~$846,000 |

---

## Funding Source

The ROOT was funded via **internal transactions** (not standard EOA transfers) from two contract addresses:

| Contract | Role | Amount |
|----------|------|--------|
| 0x0f677498c86131b55368a8d627a78218f1e24a58 | Primary seeder — multiple small internal txs from Oct 10 | ~0.33 ETH seed |
| 0x102ae6ff2e75e4c40de17e3a6e0562e34f0e8fd3 | Large injections — 10 ETH (Oct 26) + 5 ETH (Oct 30) | 15 ETH |

**Neither contract has standard EOA transactions or verified source code.** This strongly suggests they are **exchange hot wallets or early mixer contracts** from the 2017 era (Poloniex, Bittrex, or similar).

> ⚠️ 0x0f677498 appears in a CIRCULAR pattern — it seeded the ROOT and also received funds downstream from 0x416299. This is a hub/mixer signature.

---

## Ancestry Chain (as traced VL-29)

```
0x0f677498 / 0x102ae6ff  ← exchange hot wallets / mixer contracts (2017)
        ↓
0xaf1931  ← ROOT (this file) — Oct 2017, 361 ETH in 29 days
        ↓
0x416299aade6443e6f6e8  ← Oct 26, 2017
        ↓
0x227469af1b32d99de627  ← Jul 29, 2019
        ↓
0xa17b82a62c8532704ca1  ← "Thief1" Nansen label, Aug 2019
        ↓
0x70a3df699512f39C682F  ← CURRENT TARGET — Aug 2026, $3,624 live
```

---

## Next Steps

- [ ] Run full 20-tool scanner on 0xaf1931
- [ ] Identify 0x0f677498 and 0x102ae6ff — exchange subpoena target?
- [ ] Map all 10+ addresses that received from ROOT in Nov 2017
- [ ] Cross-reference ROOT with 2015 Poloniex operator address

→ [Timeline Index](../../README.md) | [Legal Filings](../../../legal_filings/)
