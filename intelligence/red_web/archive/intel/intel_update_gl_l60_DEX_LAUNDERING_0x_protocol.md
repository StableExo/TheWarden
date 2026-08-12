# Red Web Intel — GL-L60 — DEX LAUNDERING MECHANISM CONFIRMED
**Discovery:** EAT tokens laundered via 0x Protocol DEX on Base
**Date:** 2026-06-10 | **Session:** GL-L60

## 🔴 LAUNDERING MECHANISM DECODED

```
Red Web operation → EAT tokens minted/earned
                  ↓
     0xf678C4feb55759537e23... (mesh edge node)
                  ↓
     0x0000000000001fF3684f28 = 0x Protocol Fee Collector (Base)
     0x7747F8D2a76BD63... = 0x Protocol Settlement Contract
                  ↓
     DEX swap: EAT → ETH via 0x aggregated routing
                  ↓
     0xf47562E7586616f77A7f4952d3BAfe958a405C83 (exit wallet)
     receives: 0.3229 ETH + 278,348 EAT + 9,528,490 EAT
```

## 0x Protocol Contracts Identified (Base)
| Address | Role |
|---|---|
| `0x0000000000001fF3684f28c67538d4D072C22734` | 0x Protocol Fee Collector |
| `0x7747F8D2a76BD6345Cc29622a946A929647F2359` | 0x Protocol Settlement |

## Next Target: 0xf47562E7586616f77A7f4952d3BAfe958a405C83
The actual exit wallet receiving extracted ETH + EAT post-swap.

---
*GL-L60 | TheWarden | 2026-06-10*
