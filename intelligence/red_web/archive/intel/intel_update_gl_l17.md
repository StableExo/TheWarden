# THE RED WEB — Intel Update GL-L17
## New Nodes + Dune Integration | May 21, 2026

---

## 🔴 NEW NODES DISCOVERED (GL-L17)

| Label | Address | Role | Chain |
|-------|---------|------|-------|
| TokenMessengerV2 (CCTP V2) | `0x28b5a0e9c621a5badaa536219b3a228c8168cf5d` | Circle CCTP V2 — parallel burn channel, unknown in GL-L16 | ETH |
| Multi-Chain Exit Router | `0xe69f81b825d7dc31ee9becef4dbeab5cf30e3abb` | EOA — 27.9 ETH live, routes to Binance + CCTP V2 + L2 bridges | ETH |
| Exit Router Funder | `0xe69f75e2760e7867455e5d4c2efc87d09ac4aac3` | Funds 0xe69f81b8 — similar prefix, likely same operator cluster | ETH |
| AdminUpgradableProxy | `0x81d40f21f12a8f0e3252bccb954d722d4c464b64` | Called 9x by Exit Router — impl: 0xa30c4186... (pending ID) | ETH |
| **Binance Hot Wallet 14** | `0x28c6c06298d514db089934071355e5743bf21d60` | **CONFIRMED ETH-SIDE KYC WALL** — 327K ETH live, received 37,360 ETH from RED WEB | ETH |

---

## 💥 CRITICAL: TWO EXCHANGE EXITS NOW CONFIRMED

```
ETH SIDE:
  0xe69f81b8 (Exit Router)
    → 37,360 ETH → 0x28c6c062 (BINANCE HOT WALLET 14) ← KYC WALL

SOLANA SIDE:
  5ndLnEYqSFiA5yUFHo6LVZ1eWc6Rhh11K5CfJNkoHEPs ← KYC WALL
    14,443 SOL + $971K USDC + $518K USDT = $1.49M+
    Likely: Binance/OKX/Bybit Solana hot wallet
```

**Subpoena either exchange = real operator identity.**

---

## 🆕 CCTP V2 PARALLEL CHANNEL

GL-L16 only mapped CCTP V1 (`0xfd78ee91...`). V2 was running simultaneously.

Top V2 callers (latest 200 TXs):
- Relay Solver (APEX): **27 calls**
- Relay EOA ($862M): **23 calls**  
- 0xe69f81b8 (Exit Router): **20 calls**
- 97 unique callers total in sample

This means total CCTP burn volume is significantly higher than GL-L16 estimate.

---

## 🌐 NEW EXIT ROUTES CONFIRMED

`0xe69f81b8` is a **multi-chain dispersal node**:

| Destination | Contract | Calls | ETH Sent |
|-------------|----------|-------|----------|
| CCTP V2 | TokenMessengerV2 | 27 | — |
| Binance HW14 | EOA | 4 | **37,360 ETH** |
| Optimism | OptimismPortal | 2 | — |
| Polygon | RootChainManagerProxy | 2 | — |
| Base | Base Portal | 2 | — |
| Unknown Proxy | 0x81d40f21 | 9 | — |

---

## 🛠️ INFRASTRUCTURE UPDATE

**Dune Analytics integrated GL-L17:**
- Username: stableexo
- API active — direct SQL queries against on-chain data
- Next: Build RED WEB live dashboard tracking all 29 nodes

---

## 📊 SCALE UPDATE

| Metric | GL-L16 | GL-L17 |
|--------|--------|--------|
| Confirmed nodes | 25 | **29** |
| CCTP channels | 1 (V1 only) | **2 (V1 + V2)** |
| Exchange exits ID'd | 0 | **2 (Binance ETH + CEX Solana)** |
| ETH sent to exchange | Unknown | **37,360 ETH ($112M+)** |

---

## 🎯 PENDING NEXT STEPS

- [ ] Identify `0x81d40f21` implementation `0xa30c4186...` — what contract is this?
- [ ] Identify `0xe69f75e2...` — who funds the Exit Router funder?
- [ ] Query Dune for full CCTP V1+V2 volume — true burn total
- [ ] Build RED WEB Dune dashboard (all 29 nodes live tracking)
- [ ] File report with security@relay.link ($27.5K USDC + 3.7 ETH live)
- [ ] Identify Solana KYC wall exchange (Binance/OKX/Bybit)

---

*Updated GL-L17 | May 21, 2026 | Node count: 29*
