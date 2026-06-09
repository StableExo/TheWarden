# THE RED WEB — Intel Update GL-L16
## Deep Trace Results | May 21, 2026

---

## 🔴 NEW NODES DISCOVERED (GL-L16)

| Label | Address | Role | Chain |
|-------|---------|------|-------|
| Vanity Node 2 | `0x7367c0da682b5be0a6d9c7be55b97cccbdaaaaaa` | Gas feeder/drainer bot — same 'aaaaaaa' operator signature | ETH |
| Top Orch Funder | `0x370a7e2d300c14d79d4a7ee07aaca46c4b3012cf` | Funded directly by Relay Solver (10 ETH genesis) | ETH |
| Genesis Orch Funder | `0xada5bb90d0de0bd1b6f3938708f49295a8d1f7cb` | Funded directly by Relay Solver (2 ETH genesis) | ETH |
| $105M Hub Recipient | `0x6a2abff960b663462cbc46a2cfcf85063fe8ae14` | Received $105M USDC from Proxy Hub | ETH |

---

## 💥 BOMBSHELL — CLOSED LOOP CIRCUIT CONFIRMED

The Relay Solver IS the apex controller of the entire network:

```
[RELAY SOLVER 0xf70da9...]  ← APEX CONTROLLER
    ↓ funded genesis (10 ETH + 2 ETH)
[0x370a7e2d... + 0xada5bb90...]  ← Orchestrator funders
    ↓ drip ETH
[ORCHESTRATOR 0x63825239...aaaaaaa]  ← 9,134 TXs, 493 feeders
    ↓ gas + coordination
[VANITY NODE 2 0x7367c0da...aaaaaaa]  ← calls transferToken() to victims
    ↓ victim gas feed
[20+ VICTIMS]  ← EIP-7702 sweep fires sub-second
    ↓ ETH swept via fallback()
[CASH-OUT 0x6F1cDbBb...]
    ↓ OP bridge
[BRIDGE EXTRACTOR 0xDEAD...666]
    ↓ + Gas Feeder + LiFi Router
[RELAY DEPOSITORY 0x4cd00e38...]  ← 3.737 ETH + $27,513 USDC LIVE RIGHT NOW
    ↓
[RELAY SOLVER 0xf70da9...]  ← BACK TO APEX — CLOSED LOOP
    ↓ USDC flows out to:
[TokenMinterV2 0xfd78ee91]  → $12.8M BURNED via CCTP → another chain (Solana?)
[Proxy Hub 0x3b4d794a]      → $130M+ total flow, 2138 ETH live, 2408 destinations
[TransparentProxy 0x6c96de] → $4.9M USDT, 2067 destinations
```

---

## 📊 SCALE UPDATE

| Metric | GL-L12 | GL-L16 |
|--------|--------|--------|
| Confirmed nodes | 13 | 15+ |
| Visible total flow | ~$8.6K USDC | **$130M+** |
| Proxy Hub ETH balance | Unknown | **2,138 ETH ($6.5M)** |
| RelayDepository live | ~11 ETH + $8.6K | **3.7 ETH + $27.5K USDC** |
| Victim count estimate | Hundreds | **Hundreds confirmed** |

---

## 🔑 KEY FINDINGS

### Vanity Address Operator Signature
Both `0x63825239...aaaaaaa` and `0x7367c0da...aaaaaaa` end in 7x 'a'.
Same operator, multiple purpose-built addresses. Pattern is deliberate.

### Vanity Node 2 Behavior
- Receives ETH gas from Orchestrator
- Calls `transferToken()` repeatedly to victim wallets
- Reports tx hashes back to Orchestrator
- **Role: victim gas feeder pre-drain**

### CCTP Cross-Chain Exit
$12.8M USDC sent to `TokenMinterV2 0xfd78ee91...` → burned → reminted on another chain
Suspected destinations: **Solana** wallets H9KpHReU... + EgsBEMk3... (PENDING Solscan check)

### Live Funds (Report NOW)
- `0x4cd00e38...` RelayDepository: **3.737 ETH + $27,513 USDC**
- Report to: **security@relay.link**
- `0x3b4d794a...` Proxy Hub: **2,138 ETH = $6.5M+** (no freeze mechanism but document)

---

## 🎯 PENDING NEXT STEPS

- [ ] Solscan check H9KpHReU... + EgsBEMk3... (CCTP Solana destination)
- [ ] Profile $105M recipient 0x6a2abff9... (largest single flow from Proxy Hub)
- [ ] File report with security@relay.link (live funds in depository)
- [ ] Trace Proxy Hub 0x3b4d794a upstream — who controls it?
- [ ] Identify what chain CCTP is bridging to

---

*Updated GL-L16 | May 21, 2026*
