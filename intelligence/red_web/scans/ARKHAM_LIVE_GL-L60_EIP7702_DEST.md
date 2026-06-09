# ARKHAM LIVE INTEL — EIP7702_DEST
`0x70a3df699512f39C682F94fad498454C90B8C219`
**Date:** 2026-06-09 23:11 UTC | GL-L60

## ⚡ ACTIVE TRANSACTIONS — 2026-06-09 23:11 UTC (MINUTES AGO)

### INCOMING TO EIP7702_DEST
| From Address | Entity / Label | Amount |
|---|---|---|
| 0x47e1fa0C... | — (unknown) | 640 USDC |
| 0xdfD97C55... | — (unknown) | 499.94 USDT |
| 0x00000000717... | **ERC4337 EntryPoint** | 0.0000137 ETH |
| 0x82aF4944... | Wrapped Ether (WETH) | 0.0001247 ETH |
| 0x238a3588... | **PancakeSwap Vault** | 245 BTW |
| 0xa2Cc1f4b... | Golden Key (金钥匙) | 0.001 BNB |
| 0x882df4B0... | **QuickSwap V2 Pool** | 3.73 LGNS |

### OUTGOING FROM EIP7702_DEST
| To Address | Entity / Label | Amount |
|---|---|---|
| 0x478946BC... | **Velodrome Finance — CL Pool** | 1,435 USDC |
| 0x31eF83a5... | **GMX — OrderVault** | 0.0001247 ETH |
| 0x5E9Cc770... | — (unknown) | 63,929 VELO |
| 0x6e6682b9... | MoeTreasury | 63 XPOW |

## KEY FINDINGS

1. **ERC-4337 EntryPoint** — address is a smart account, uses BOTH EIP-7702 + ERC-4337
2. **Velodrome Finance** — stolen USDC being routed through Base DEX liquidity pools
3. **GMX OrderVault** — stolen ETH being routed through perpetuals derivatives on Base
4. **PancakeSwap + QuickSwap** — multi-DEX feeds coming IN from multiple chains
5. **Golden Key (金钥匙)** — Chinese token/BNB connection to BSC layer
6. **Multi-asset**: ETH, USDC, USDT, BNB, VELO, XPOW all active simultaneously

## NEW ADDRESSES TO SCAN NEXT
- `0x478946BcD4a5a22b316470F5486fAfb928C0bA25` — Velodrome CL Pool (Base)
- `0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5` — GMX OrderVault (Base/Arb)
- `0x47e1fa0CD66610DDE6497cFcF58D0dA9070044dD` — Unknown (640 USDC sender)
- `0xdfD97C55F95E8C1BF652B3B43B4facAF8ad53489` — Unknown (499 USDT sender)

## IMPLICATION FOR MAP
EIP7702_DEST is NOT just a sweep destination.
It is an active Base DeFi operator routing stolen assets through Velodrome + GMX
**before** bridging to BSC/Solana. This is a previously unmapped laundering layer.

Kill chain update:
```
EIP7702_DEST → [Velodrome / GMX swaps on Base] → CASHOUT → BSC → Solana → ONDO → EXIT
```
*GL-L60 | TheWarden / @StableExo*
