# Red Web Intel — GL-L60 — First Funder Avalanche Scan
**Address:** 0x4a175c15687eb3ead14f16c499c9944986214959
**Role:** First Funder Avalanche — seeded Avalanche branch 2026-05-23 (Nansen: High Activity)
**Scan Date:** 2026-06-10 | **Session:** GL-L60

## Key Finding: Avalanche-Only Address
All standard chains (ETH/Base/BSC/Polygon/Arbitrum) = 0 activity.
**This address exists entirely on Avalanche C-Chain (chain_id 43114).**
Our scanner was previously blind to this — fixed in v2.3.

## Arkham Transfer Data (only tool that caught it)
Single-day fan-out gas seeding on 2026-05-23:
| Recipient | AVAX Sent |
|---|---|
| `0xD1B1b741C541e5...` | 5.08e-6 AVAX |
| `0x36808af37976CA...` | 4.28e-6 AVAX |
| `0xfACc1f9c215a37...` | 5.11e-6 AVAX |
| `0x691e93d78F551B...` | 6.13e-6 AVAX |
| `0x107Ecdc2E0bBAa...` | 5.49e-6 AVAX |

**Classic fan-out gas seeding — identical pattern to Base operation.**
The Red Web is running a parallel Avalanche branch, operational as of May 2026.

## Scanner Update — v2.3
Added Avalanche C-Chain support:
- Chain ID: 43114
- RPC: https://api.avax.network/ext/bc/C/rpc (public)
- Snowtrace API: https://api.snowtrace.io/api
- Moralis: `avalanche` chain name
- Chainbase: chain_id 43114

## New Scan Queue — Avalanche Branch
| Address | Chain | Role |
|---|---|---|
| `0xD1B1b741C541e5...` | Avalanche | Gas recipient #1 |
| `0x36808af37976CA...` | Avalanche | Gas recipient #2 |
| `0xfACc1f9c215a37...` | Avalanche | Gas recipient #3 |
| `0x691e93d78F551B...` | Avalanche | Gas recipient #4 |
| `0x107Ecdc2E0bBAa...` | Avalanche | Gas recipient #5 |

---
*GL-L60 | TheWarden | 2026-06-10*
