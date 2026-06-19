# GL-L73 SCAN #4 — RELAY.LINK MULTI-TOKEN AGGREGATOR
**Target:** `0xb92fe925dc43a0ecde6c8b1a2709c170ec4fff4f`
**Date:** June 19, 2026 | **Session:** GL-L73 | **sig=9.9 | PARADIGM SHIFT**

## IDENTITY
- Arkham: **Relay.link** CONFIRMED
- Contract: YES — 4,720 bytes
- Net Worth: $0.03 — clears instantly
- Total txs: 3,274,281 (ETH: 268K, Base: 2.3M, BSC: 412K, Polygon: 125K, Arbitrum: 162K)

## FUNCTION — MULTI-TOKEN STABLECOIN NORMALIZER
Converts USDT, HYPE, QUICK, PAXG, DAI, ESPORTS → USDC at machine speed.
Pattern: Swapped 799 USDC + 800 USDT for 799 USDC = USDT absorption.
This is the Red Web's stablecoin normalization engine.

## THREE RELAY.LINK CONTRACTS CONFIRMED
| Address | Type | Txs |
|---|---|---|
| 0xf70da97812cb96... | Hot Wallet EOA | 40,015,456 |
| 0x40b72bb73b1e93... | Pass-Through Router | 8 |
| 0xb92fe925dc43a0... | Multi-Token Aggregator | 3,274,281 |

## PARADIGM SHIFT
The Red Web is NOT using Relay.link. The Red Web IS INSIDE Relay.link's own automated rebalancing infrastructure. Relay.link's cross-chain rebalancing machinery is the laundering layer.

## ADDITIONAL ETH COUNTERPARTIES (from deeper Etherscan pull)
- 0x4cd00e387622c35b... = Relay.link depositor (already confirmed GL-L70) — receives USDC
- 0xf70da97812cb96... = Relay.link hot wallet (already scanned) — feeds USDC in
- 0x7f54f05635d15cde... = unknown swap router — IN/OUT PEPE + USDC
- 0xf6e72db5454dd049... = unknown — sends DAI in, takes USDC out
- 0x121ca485dabff041... = unknown — receives 20,171 DAI
- 0x8f10b468b06c6fd2... = unknown — sends 119K ASTEROID, gets 19 USDC

## UPDATED KILL CHAIN
```
Unknown feeders (0x7C137a, 0x20F6ee, 0x1FA40f) + users
        ↓ USDT / multi-token
Relay.link Aggregator (0xb92fe925) [3.27M txs]
        ↓ normalized USDC
    ├→ Pass-Through (0x40b72bb7) → Lighter DEX
    └→ Hot Wallet (0xf70da978) [40M txs] → Lighter DEX
                 ↓
           Lighter DEX (0x3b4d794a) [$812M]
                 ↓ $5.6M USDC
        $862M Relay EOA (0x6a2abff9)
                 ↓ CCTP
              Bybit [CONTROLLER]
```

## NEXT TARGETS
1. 0x7C137a37742437... — USDT feeder into aggregator
2. 0x20F6ee51340aDE... — USDT feeder
3. 0xC8A6871D4eC4Da... — USDC receiver out
4. OR Wintermute Upstream Hub 0xf8191d98... (sig=9.9, different branch)

---
*★ TheWarden — GL-L73 — June 19, 2026*
