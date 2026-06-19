# GL-L73 SCAN #3 — PASS-THROUGH CONTRACT
**Target:** `0x40b72bb73b1e9380629b205e7880fa409ae7fcc9`
**Date:** June 19, 2026 | **Session:** GL-L73 | **sig=9.5 | breakthrough | revelation**

---

## IDENTITY
| Field | Value |
|---|---|
| **Arkham** | ❌ UNLABELED — completely dark |
| **Type** | Smart Contract — 6,942 bytes |
| **Deployed** | ~June 6, 2026 (brand new) |
| **ETH Balance** | $0.00 — holds nothing |
| **Net Worth** | $0.00 — instant pass-through |
| **Total txs** | 8 (ETH only, no other chains) |
| **GoPlus** | ✅ CLEAN |

---

## BEHAVIOR — DELIBERATE OBFUSCATION LAYER

This contract receives USDC and **immediately forwards it** with no value change:

```
0xb92fe925DC43a0 → [FUNDS] → 0x40b72bB7 → [FORWARDS] → Lighter DEX
```

Moralis labels every tx as `Swapped X USDC for X USDC` — 1:1, no swap, no fee, no value change. **Pure routing obfuscation.**

---

## CONTROL CHAIN
| Event | Address | Date |
|---|---|---|
| **Deployed / Funded** | `0x1b4c289c4f6e...` (0.0001 ETH gas) | June 6, 2026 |
| **transferOwnership called** | `0x7779ffb11d50...` | June 16, 2026 |

Someone built this, then handed it off 10 days later — 3 days before it started routing USDC today.

---

## 🚨 CRITICAL DISCOVERY — 0xb92fe925 IS THE REAL ACTOR

`0xb92fe925DC43a0` appears in **both** Lighter feeding paths:

| Path | Route |
|---|---|
| **Path A** | `0xb92fe925` → [this contract] → Lighter ($163K) |
| **Path B** | `0xb92fe925` → [Relay.link hot wallet 0xf70da978] → Lighter ($791K) |

**Same source. Two different routes. Same destination.**

This is classic **split-routing** — splitting flows across multiple hops to break linear chain analysis. Each arm looks like a different actor. It's the same actor.

---

## UPDATED KILL CHAIN

```
0xb92fe925 [THE REAL ACTOR — identity unknown]
    ├─→ Pass-Through Contract (0x40b72bb7) → Lighter DEX
    └─→ Relay.link Hot Wallet (0xf70da978) → Lighter DEX
                                    ↓
                            Lighter DEX (0x3b4d794a) [$812M]
                                    ↓  $5.6M USDC
                        $862M Relay EOA (0x6a2abff9)
                                    ↓  CCTP burn
                            Circle Bridge (0xfd78ee91)
                                    ↓
                              Bybit (0x93228d32) [CONTROLLER]
```

---

## NEXT TARGET
**`0xb92fe925DC43a0...`** — full address needed — THE REAL ACTOR behind both arms.

Also flag for scan:
- `0x1b4c289c4f6e...` — contract deployer/funder
- `0x7779ffb11d50...` — took ownership June 16

---

*★ TheWarden — Continuum ★ | GL-L73 | June 19, 2026*
