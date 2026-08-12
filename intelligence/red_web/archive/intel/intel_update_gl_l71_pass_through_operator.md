# GL-L71 SCAN — PASS-THROUGH CONTRACT OPERATOR
**Target:** `0x7779ffb11d50fceae8e533b611b5cb5a1c1db3d4`
**Date:** June 19, 2026 | **Session:** GL-L71 | **sig=9.4**

---

## IDENTITY
| Field | Value |
|---|---|
| **Arkham** | UNLABELED |
| **Type** | EOA |
| **ETH Balance** | 0.024147 ETH |
| **Nonce** | 157 |
| **Net Worth** | $41.23 |
| **Contract** | False |
| **GoPlus** | {} |

---

## ROLE — PASS-THROUGH OBFUSCATION LAYER BUILDER

This address **BUILT** and **OPERATED** the Red Web pass-through contract (0x40b72bb73b1e9380629b205e7880fa409ae7fcc9):

| Event | Date | Detail |
|---|---|---|
| **Deployed contract** | June 6, 2026 | Block 23992610 |
| **Initialized** (set Lighter as target) | June 6, 2026 | fn: 0x2f9182cc → 0x3b4d794a (Lighter DEX) |
| Routed USDC through it | Multiple times | fn: 0x2f9182cc × 3 more |
| Mystery caller (0xee5a7a26) | Mid-June | Hex-encoded message "Claim: https://..." |
| **transferOwnership** | June 16, 2026 | Block 25332021 → to Gnosis Safe 0xa9201f78 |

**KEY:** The pass-through was built to route Relay.link USDC into Lighter DEX as an obfuscation hop.
After operating it directly, control was handed to a Gnosis Safe multisig.

---

## CONTRACT INTERACTION HISTORY
| Address | Entity | Label | Count |
|---|---|---|---|
| `0x02eb979b7231dbccc892c7bdd398c6f4adaf63e2` | UNLABELED | Gnosis Safe Proxy | ×5 |
| `0x40b72bb73b1e9380629b205e7880fa409ae7fcc9` | UNLABELED | VaultDepositooorV2 | ×4 |
| `0x4c9edd5852cd905f086c759e8383e09bff1e68b3` | Ethena | USDe (USDe) | ×4 |
| `0x64aa32cd125fb32f4286d2bac3a7346edfffee2a` | UNLABELED | VaultDepositooor | ×3 |
| `0xa02cebed432374e6442f5901c8b2bd30ad76eb3e` | UNLABELED | Gnosis Safe Proxy | ×3 |
| `0x4cd00e387622c35bddb9b4c962c136462338bc31` | Relay.link | RelayDepository | ×3 |
| `0x4e1dcf7ad4e460cfd30791ccc4f9c8a4f820ec67` | Safe | SafeProxyFactory | ×2 |
| `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` | Circle | USD Coin Token (USDC) | ×2 |
| `0xa9201f78994e6bab714ce319abb786dad1b618a0` | UNLABELED | Gnosis Safe Proxy | ×1 |
| `0x16ea1a47ca69d067b6d31af1af3c2b52b6ba0eb0` | UNLABELED |  | ×1 |


---

## GNOSIS SAFE — NEW OWNER
`0xa9201f78994e6bab714ce319abb786dad1b618a0` — Gnosis Safe Proxy (Arkham label)
- Multisig wallet — requires multiple signers to operate
- Took ownership June 16, 2026 — 10 days after contract deployment
- **This is the current operator of the pass-through obfuscation layer**
- Next scan: this Gnosis Safe — who are the signers?

---

## MORALIS ACTIVITY (ETH)
2026-06-16 [contract interaction] Signed a transaction | 2026-06-16 [contract interaction] Signed a transaction | 2026-06-16 [contract interaction] Signed a transaction | 2026-06-16 [contract interaction] Signed a transaction | 2026-05-29 [contract interaction] Signed a transaction | 

---

## UPDATED RED WEB KILL CHAIN (this node)
```
Relay.link Aggregator (0xb92fe925) [3.27M txs]
    ↓ USDC
0x7779ffb11d50 [THIS SCAN — ORIGINAL OPERATOR]
    ↓ built + operated
Pass-Through Contract (0x40b72bb73b1e93) [obfuscation hop]
    ↓ transferred control to
Gnosis Safe (0xa9201f78) [CURRENT OPERATOR — multisig]
    ↓ USDC routes to
Lighter DEX (0x3b4d794a) [$812M] → $862M Relay EOA → CCTP → Bybit
```

---

## NEXT TARGETS
1. `0xa9201f78994e6bab714ce319abb786dad1b618a0` — Gnosis Safe current owner — **who are the signers?**
2. `0xee5a7a26f0345086c48da6886253296c4d5f6f7a` — mystery caller with hex message
3. Continue upstream through 0x7779ffb11d50's other contract interactions

---
*⭐ TheWarden — GL-L71 — June 19, 2026*
