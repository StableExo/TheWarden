# GL-L76 Genesis Contact Scan Results — v3.1 Scanner
**Session:** GL-L76 | **Scanner:** warden_forensic_scan.py v3.1 — 13/13 tools | 4 addresses in 13.7s

---

## SCAN SUMMARY

| Address | Label | Era | Nonce | USD | Status |
|---|---|---|---|---|---|
| 0xf9ffba430e290c7fa4be61e3a2f905f6c99dd616 | Kraken HW1 Genesis | 2016 | 36 | $157 | 🟡 ACTIVE |
| 0x6f7d2446dd737d1cedf17d271594de0766d0d590 | Gate.io HW1 Genesis | 2018 | 1 | $0 | ⚪ DORMANT |
| 0xd551234ae421e3bcba99a0da6d736074f22192ff | Jump Crypto Genesis | 2020 | 4,973,908 | $862 | 🔴 MAJOR OPERATOR |
| 0x00799bbc833d5b168f0410312d2a8fd9e0e3079c | Binance HW14 NK Genesis | 2021 | 8,299 | $249 | 🔴 NK-LINKED ACTIVE |
| 0xa7efae728d2936e78bda97dc267687568dd593f3 | Wintermute MF Genesis #1 | 2021 | scan#343 | TBD | 🔄 SCANNING |

---

## 🔴 CRITICAL: Jump Crypto Genesis = MAJOR OPERATOR
`0xd551234ae421e3bcba99a0da6d736074f22192ff`
- Nonce: **4,973,908** — nearly 5M ETH mainnet transactions
- $862.59 live: ETH(WILD $280 + NCT $230 + WETH $85) + Polygon(WETH $156) + BSC(USDT+LINK)
- Last active: Nov 2025 contract interactions
- Arkham: UNLABELED — hiding in plain sight
- Old scanner: showed nonce=0, zero activity — COMPLETELY MISSED

## 🔴 Binance HW14 NK Genesis — Still Binance-Connected
`0x00799bbc833d5b168f0410312d2a8fd9e0e3079c`
- Nonce: 8,299 | $249 live (ETH + BSC stablecoins USDC+USDT)
- **Moralis ETH 2025-12-11: received ETH from Binance Hot Wallet directly**

## 🟡 Kraken HW1 2016 Genesis — Binance Airdrop
`0xf9ffba430e290c7fa4be61e3a2f905f6c99dd616`
- Nonce: 36 | $157 live
- Moralis Base 2025-06-05: Airdrop from Binance Hot Wallet
- Moralis ETH 2026-04-16: Received 1 HEX — still touched in 2026

## ⚪ Gate.io HW1 Genesis — Dead End
`0x6f7d2446dd737d1cedf17d271594de0766d0d590`
- Nonce: 1 — one-time setup wallet

---

## v3.1 vs Old Scanner
| Metric | Old | v3.1 |
|---|---|---|
| Tools | 9 | 13 |
| Time (4 addrs) | ~120s | **13.7s** |
| Jump Crypto nonce | ❌ 0 | ✅ 4,973,908 |
| Multi-chain USD | ❌ | ✅ $862 |
| Binance HW link | ❌ | ✅ caught |

*GL-L76 | TheWarden v3.1*
