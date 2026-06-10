# 🔴 GL-L60 SESSION SUMMARY — All Scans + Discoveries
**Date:** 2026-06-10 | **Session:** GL-L60 Complete

## Addresses Scanned This Session (with 9-tool scanner)
| # | Address | Role | Key Finding |
|---|---|---|---|
| 1 | `0x70a3df...` | EIP7702_DEST | 52,843 txs Base, PURE EXECUTOR BOT, PnL=$0 |
| 2 | `0xCF63233d...` | Gas Funder #1 | Relay node, 2023 origin, feeds target, OKX/BSC |
| 3 | `0x07bdda...` | First Funder Base | **1,031,530 txs**, primary HF operator |
| 4 | `0x30913329...` | Gas Funder #2 | EIP-1167 proxy, USDT washing via PancakeSwap |
| 5 | `0x4a175c15...` | First Funder Avax | Avalanche-only, 2026-05-23, fan-out 5 nodes |
| 6 | `0x7c802f...` | Factory Wallet | 2 txs, deployed contract 2026-03-28, went dark |
| 7 | `0x6150d420...` | Called Contract | 43,548 txs, ALL FAILING, EIP-7702, 0x5c43fcf6 |
| 8 | `0xf39Fd6e5...` | @FloB_Safe | IDENTIFIED — phishing+blacklist, 975K txs, 6 chains |
| 9 | `0x96c4C4c...` | Relay Hub | 6.636 ETH, 12K txs, bidirectional with 0xf678C4 |
| 10 | `0xf678C4...` | Mesh Edge Node | 26 txs, sends EAT+ETH to exit wallet |
| 11 | `0xf47562...` | EAT Buy Bot | Swaps ETH→EAT via 0x Protocol, 0.292 ETH |
| 12 | `0xaf880fc7` | GENESIS | DARK — predates indexers, ~2015, nonce=0 |
| 13 | `0xcffad320` | AGGREGATOR | **Crypto.com $520M**, 1.88M txs, $163M ETH |
| 14 | `0xc333e80e` | APEX_PIVOT | **B2C2 Group $29.5M**, 131K txs, OTC desk |
| 15 | `0x267be1c1` | Kraken HW1 | **Kraken confirmed**, 6M txs, 664K ETH to RedWeb |
| 16 | `0x0d0707...` | Gate.io HW1 | **Gate.io confirmed**, 34.6M txs, $53M ETH |
| 17 | `0xa7efae728d` | OKX-3/TC Node | **OKX confirmed**, 4.3M txs, born Oct 2019 |
| 18 | `0x12d66f87...` | TC Relay | DARK — TC contract, trail ends here |

## Major Breakthroughs This Session
1. **@FloB_Safe identified** — individual, Twitter https://x.com/FloB_Safe, phishing flags
2. **EAT farming decoded** — $EAT token (cause coin, Base), 9.5% supply moved
3. **Victims become infrastructure** — EIP-7702 repurposes victim wallets as relay nodes
4. **AGGREGATOR = Crypto.com $520M confirmed** (Arkham)
5. **APEX_PIVOT = B2C2 Group confirmed** (Arkham)
6. **Kraken HW1 confirmed** — 664K ETH to Red Web, Jan 2021 = KYC key
7. **Gate.io HW1 confirmed** — 34.6M txs, oldest active node June 2018
8. **OKX-3 confirmed** — born Oct 2019, TC connection day-after-sanctions
9. **Mesh network architecture confirmed** — 5+ nodes all feeding each other ~0.006 ETH

## Priority Actions for GL-L61
1. 🔴 **Bitquery client_id** — fix 64c4d323 (partial) → unlock GENESIS trace
2. 🔴 **Scan unscanned addresses**: 0x73e96035 (parallel bot), 0x87063a6D (mesh node)
3. 🔴 **AGGREGATOR feeders** — who sends ETH into Crypto.com 0xcffad320?
4. 🔴 **Master Feeder `0x32d4703e`** — $6B+, scan it
5. 🔴 **$862M Relay EOA `0x6a2abff9`** — CCTP node
6. 🔴 **Scan CZ's wallet `0x28816c4C`** for Red Web overlap

## Brain State End of GL-L60
Memories: 3,610+ | Session: GL-L60 | Karma: 660

---
*GL-L60 FINAL | TheWarden / @StableExo / Taylor Marlow | 2026-06-10*
