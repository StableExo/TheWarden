# 🔴 RED WEB — Enforcement Cross-Reference GL-L72
**Date:** June 19, 2026 | **Session:** GL-L72 | **Investigator:** Taylor Marlow (@StableExo)

---

## OFAC SDN CROSS-REFERENCE RESULT

**OFAC SDN List checked:** 796 crypto addresses | **Updated:** June 12, 2026  
**Red Web addresses checked:** 20+  
**DIRECT MATCHES: ZERO**

> ⚠️ CRITICAL FINDING: Every Red Web node is currently UNSANCTIONED.
> All addresses are live, active, and unblocked as of June 19, 2026.
> This is the core value of the Federal Source document.

---

## ENFORCEMENT CASES INVOLVING RED WEB ENTITIES

### 1. GOTBIT LLC — Market Manipulation as a Service
**Case:** 24-cr-10190-AK (D. Mass.) | **DOJ Filed:** 2024-2025  
**CEO:** Aleksei Andriunin (indicted)

- GOTBIT sold wash trading and coordinated pump/dump as a **paid service**
- Routed funds through **Binance** (our confirmed Red Web root node)
- WALLET 1 (ending 052E3): $4.1M USDC via Circle
- WALLET 2 (0xB937Ba93...): $4,975,000 USDT
- WALLET 3 (0x64b9de4E...): $4,725,000 USDT
- Transfer chain: GOTBIT → Binance account → $6.2M → WALLET 2/3
- **Red Web connection:** Same Binance node, same USDC/Circle infrastructure, identical layering pattern
- **Implication:** GOTBIT may have been a CLIENT of the Red Web's market manipulation layer

### 2. GATE.IO — FBI Asset Seizure
**Case:** 2:25-cv-00534 (D. Nev.) | **Filed:** March 21, 2025  
**Seized:** 519,803.53 USDT + 1,135.508 XMR (March 20, 2024)

- Gate.io **voluntarily froze assets** after FBI contact (Feb 2024)
- FBI moved assets from Gate.io to FBI cryptocurrency wallet
- Gate.io IS cooperating with FBI — has demonstrated willingness to freeze
- **Red Web connection:** Gate.io HW1 (0x0d0707963952f2fba59dd06f2b425ace40b492fe) = our LARGEST node ($107B historical, 9.8M nonce)
- **Implication:** FBI may already possess transaction records connecting to our Red Web through Gate.io cooperation
- **Counter-note:** Gate.io defying 4 Chilean court orders (379.2 BNB hack, Nov 2024-May 2025) — selective cooperation pattern

### 3. WINTERMUTE TRADING — SEC Crypto Task Force Meeting
**Date:** March 28, 2025 | **Memo:** sec.gov/files/ctf-memo-wintermute-trading-morrison-cohen-3-28-25.pdf

- Wintermute met with SEC Crypto Task Force seeking regulatory clarity
- Topics: anti-manipulation measures, market making rules, best execution
- Citing Cumberland DRW case — seeking to avoid enforcement uncertainty
- **NOT under enforcement** as of June 2026
- **Red Web connection:** Wintermute Hub (0xf8191d98) + Master Feeder (0x32d4703e) = $8.2B+ in kill chain
- **Implication:** Wintermute is aware of tightening crypto regulation while operating as a $8.2B throughput node

### 4. BYBIT — North Korea $1.5B Hack
**FBI PSA:** ic3.gov/PSA/2025/PSA250226 | **Date:** Feb 21, 2025

- North Korea (TraderTraitor) stole $1.5B from Bybit Feb 21, 2025
- FBI published list of involved Ethereum addresses for blocking
- **CRITICAL DUAL ROLE:** Bybit is SIMULTANEOUSLY:
  - ✅ Confirmed North Korea hack victim ($1.5B)
  - ✅ Confirmed Red Web CONTROLLER — sends micro-ETH coordination pings to relay node (GL-L70)
- This dual role suggests: (1) Different Bybit infrastructure, OR (2) North Korea accessed Bybit infrastructure that was already compromised/used for Red Web coordination

### 5. LIGHTER.XYZ — No Enforcement Found
**CEO:** Vladimir Novakovski

- Lighter applying for on-chain derivatives trading licenses (April 2026)
- Seeking to attract Citadel and traditional financial institutions
- No regulatory enforcement or subpoenas found
- **Red Web connection:** 0x3b4d794a66304f130a4db8f2551b0070dfcf5ca7 = Lighter contract, $825M net worth, 2,348 ETH balance, sends USDC to our $862M Relay EOA

---

## WHY ZERO OFAC MATCHES IS THE MOST IMPORTANT FINDING

The fact that 20+ Red Web addresses handling billions in historical flow are NOT on the OFAC SDN list means:

1. **We mapped this before OFAC did** — the investigation is ahead of federal enforcement
2. **These addresses are fully operational** — no exchange is blocking them, no transactions are flagged
3. **The Federal Source document is the first comprehensive map** of this unsanctioned infrastructure
4. **Federal value:** FBI/DOJ/SEC/CFTC would need this roadmap to begin enforcement
5. **Gate.io is already cooperating with FBI** — a referral from the Federal Source could unlock those records

---

## ADDITIONAL NAMES/ENTITIES OF INTEREST

| Name | Connection | Public Action |
|---|---|---|
| **Aleksei Andriunin** | GOTBIT CEO — market manipulation via Binance | Indicted 24-cr-10190-AK |
| **CZ (Changpeng Zhao)** | Binance founder — Red Web root node | Pled guilty Nov 2023, $4.3B settlement |
| **Justin Sun** | TRON/HTX — Red Web exit layer | SEC charged March 2023, ongoing |
| **Ben Zhou** | Bybit CEO — Red Web controller | NK hack victim, no personal charges |
| **Vladimir Novakovski** | Lighter.xyz CEO — $825M DEX in web | No enforcement |
| **Lin Han** | Gate.io CEO — $107B mega mixer | FBI cooperation confirmed |

---

*TheWarden ★ GL-L72 ★ June 19, 2026 | Priority claim: Taylor Marlow / @StableExo*