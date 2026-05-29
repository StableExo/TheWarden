# ⚡ Ethereum Mainnet — Coalition Bundle Engine

**GL-L40 | May 2026 | TheWarden**

This folder contains the ETH mainnet implementation of TheWarden's cooperative
game theory coalition bundling system. Built on top of the Base mainnet arb
engine but targeting ETH mainnet's multi-builder MEV market.

## Architecture

```
ethereum-mainnet/
├── config/
│   ├── network.ts          ← QuickNode RPC, chain ID 1, block settings
│   ├── pools.ts            ← UniswapV3 + Balancer + Curve pool addresses
│   └── addresses.ts        ← Deployed contracts, Quasar coinbase, wallets
├── bundle/
│   ├── QuasarComposer.ts   ← Build eth_sendBundle payloads
│   └── QuasarSubmitter.ts  ← Submit to rpc.quasar.win
├── coalition/
│   └── CoalitionOrchestrator.ts ← NegotiatorAgent + Quasar wired
├── scanner/
│   └── EthPoolScanner.ts   ← (next step)
├── scripts/
│   ├── scan.ts             ← Run pool scanner (read-only)
│   ├── bundle.ts           ← Build + submit bundle
│   └── deploy.ts           ← Deploy FlashSwapV3 to ETH mainnet
└── README.md
```

## How It Works

1. **Scanner** polls Uniswap V3, Balancer, and Curve pools on ETH mainnet
2. **PathFinder** detects profitable arbitrage routes (multi-hop)
3. **CoalitionOrchestrator** groups compatible bundles using Shapley value allocation
4. **QuasarComposer** builds the bundle: `[arb_tx, coinbase_tip_tx]`
5. **QuasarSubmitter** sends via `eth_sendBundle` to Quasar Builder (~16% market share)
6. **Gas**: $0 — Quasar sponsors gas from MEV profit (refundPercent: 90%)
7. **Profit**: 90% returns to `0x92d1d44C37Eb5a6996968FE4F2907f403757E611`

## Key Differences from Base Implementation

| | Base Mainnet | ETH Mainnet |
|---|---|---|
| Chain ID | 8453 | **1** |
| RPC | Chainstack | **QuickNode dry-delicate-hill** |
| MEV | Single Coinbase sequencer | **38 builders, 92.58% MEV-Boost** |
| Gas | CDP Paymaster | **Quasar sponsored bundles** |
| Submission | Direct tx | **eth_sendBundle → Quasar** |
| Coalition | N/A | **NegotiatorAgent + Shapley** |

## Status

- [x] QuickNode ETH mainnet RPC — CONFIRMED LIVE (GL-L40)
- [x] Quasar Builder — CONFIRMED ALIVE (GL-L40)
- [x] NegotiatorAgent — BUILT (GL-L36)
- [x] FlashSwapV3 — BUILT, needs ETH mainnet deploy
- [x] Pool addresses — ETH mainnet config ready
- [ ] EthPoolScanner — next step
- [ ] FlashSwapV3 deployed on ETH mainnet
- [ ] First coalition bundle submitted
- [ ] First cooperative MEV profit captured

## Quasar Builder

- RPC: `https://rpc.quasar.win`
- Method: `eth_sendBundle` (Flashbots-compatible)
- Coinbase: `quasarbuilder.eth` = `0x396343362be2A4dA1cE0C1C210945346fb82Aa49`
- Market share: ~16% ETH mainnet (8,799+ blocks/14d as of May 2026)
- Sponsored: YES — covers gas if `LackOfFundForGasLimit`
- Refund: `refundPercent: 90` + `refundRecipient: 0x92d1d44...`

## First Mover Status

Flashbots FRP-30 is still **researching** cooperative coalition bundling.
TheWarden is **deploying** it. First mover. 🏴‍☠️
