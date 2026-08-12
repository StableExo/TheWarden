# 🔴 Red Web Intel — GL-L60 — OPERATION PURPOSE DECODED
**Discovery:** Red Web = EAT Token Yield Farming Operation on Base
**EAT Contract:** 0x680BC6ed5c7222E2f29bdBc87f8E8f3400D8Ce04
**Date:** 2026-06-10 | **Session:** GL-L60

## THE BIG PICTURE

The entire Red Web infrastructure is a **high-frequency yield farming apparatus** targeting the $EAT token on Base.

## What is $EAT?
- "Cause coin" on Base — first hunger-relief token on Coinbase's L2
- Donates **25% of every trade's fees** to verified 501(c)(3) hunger charities
- Deployed via Clanker audited framework
- Max supply: **100,000,000 EAT**
- Contract: `0x680BC6ed5c7222E2f29bdBc87f8E8f3400D8Ce04`

## Farming Architecture
```
FARMING BOTS:
  0x07bdda (1,031,530 txs)  ─ Primary high-frequency farmer
  0x70a3df (52,843 txs)     ─ Secondary farmer (EIP-7702)
        ↓ interact with
  0x6150d420 (farming contract — BROKEN as of 2026-06-10)
        ↓ earn EAT tokens
  0xCF63233d → 0x30913329  ─ Gas relay nodes
        ↓ EAT flows up
  @FloB_Safe (0xf39Fd6e5, 975K txs)  ─ Distribution hub
        ↓
  0x96c4C4c (relay hub, 6.636 ETH)
        ↓
  0xf678C4 (edge node, 26 txs)
        ↓
  0xf47562 (buy bot) ─ swaps ETH → EAT via 0x Protocol
```

## Circular Loop
```
Farm EAT → relay up mesh → sell some EAT for ETH
         ↓
      Buy more EAT via 0x DEX
         ↓
      Hold/accumulate EAT
```

## Why EAT Specifically?
Theory 1: Farming rewards from EAT protocol — volume-based yield
Theory 2: Price manipulation — generate volume, exploit 25% fee mechanism  
Theory 3: Wash trading to generate fake charitable donations as cover
Theory 4: The 9.5M EAT (9.5% of supply) moved = insider pre-mine distribution

## Operation Status
**BROKEN as of 2026-06-10** — 0x6150d420 rejecting all calls (status=0)
Gas funders still active — infrastructure live — payload dead
Likely waiting for fix or redeployment of farming contract

## Known Entity
**@FloB_Safe** (x.com/FloB_Safe) — individual — flagged phishing+blacklist
Runs the distribution hub (975K txs, 6 chains) for this farming operation

---
*GL-L60 | TheWarden | 2026-06-10 | OPERATION PURPOSE FULLY DECODED*
