# Red Web Intel — GL-L60 — Gas Funder #2 Scan
**Address:** 0x30913329705559c9426db411bbda9fe1e8a85773
**Role:** Gas Funder #2 — EIP-1167 minimal proxy, multi-chain stablecoin washing hub
**Scan Date:** 2026-06-10 | **Session:** GL-L60

## Ground Truth (9-Tool Scan)
| Chain | TXs | Activity |
|---|---|---|
| ETH | 16 | Contract deployed (EIP-1167 proxy 23 bytes) |
| Base | 1,072 | Gas relay to 0x70a3df |
| BSC | 811 | USDT washing via PancakeSwap WBNB-USDT |
| Polygon | 6 | Admin calls, USDT transfers |
| Arbitrum | 311 | USDC.e transfers |
| **TOTAL** | **2,216** | Active TODAY across 4 chains |

## Contract: EIP-1167 Minimal Proxy
- Bytecode: `0xef010088cf071b4bf5...` (23 bytes, ETH mainnet)
- QuickNode confirmed: contract on ETH, EOA behavior on Base/Polygon/Arbitrum
- Proxy delegates all logic to an implementation contract

## Stablecoin Washing — ACTIVE TODAY
```
0xc417Ab + 0xC8F6b8Ba → USDC → 0x30913329 (Base)
0x62cceF + 0xc417Ab   → USDT → 0x30913329 (BSC)
0x30913329 → PancakeSwap WBNB-USDT swap (BSC, same day)
```
Not just a gas relay — actively laundering stablecoins through DEX.

## Two Admin Wallets Found — HIGH PRIORITY
| Address | Function | Chain | Date |
|---|---|---|---|
| `0xec10779407fb...` | `rescueToken(address)` | Polygon | 2026-05-20 |
| `0xec10779407fb...` | `transfer(address to,)` | Arbitrum | 2026-05-03 |
| `0xecf8ff1e1c78...` | `withdrawEth(address)` | Polygon | 2026-03-28 |

- `0xec10779407fb` = **OPERATOR** (multi-chain, recent activity)
- `0xecf8ff1e1c78` = **OWNER** (original deployer, 2026-03-28 = launch day)

## Shared Nodes Confirmed
- `0xb9...da7c` receives USDT from THIS address AND mDXN from Gas Funder #1 (0xCF63233d) — central aggregation point
- `0xc118d14516f947` receives dust from both gas funders — controller coordination wallet

## Queue Additions
| Address | Priority | Reason |
|---|---|---|
| `0xec10779407fb...` | 🔴 CRITICAL | Operator wallet — multi-chain admin |
| `0xecf8ff1e1c78...` | 🔴 CRITICAL | Owner wallet — original deployer |
| `0xb94c721bb2...` | HIGH | Sent 0.0005 ETH on ETH mainnet |

---
*GL-L60 | TheWarden | 2026-06-10*
