# CRITICAL FINDINGS — GL-L70
## Red Web Investigation | Updated June 18, 2026

---

## TOP CRITICAL FINDINGS (All Time, Updated GL-L70)

### 1. KRAKEN = OPERATOR IDENTITY KEY
- **Address:** 0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0
- **Still LIVE:** Last received ETH June 15, 2026
- **Critical fact:** Oct 2019 — operator withdrew to 0xc333e80e via Kraken. **One subpoena = real name.**
- Kraken: FinCEN-registered, US-accessible, DOJ-cooperative history.

### 2. HITBTC = $322M LIVE TREASURY
- **Address:** 0xa3222357a0eccf60c73606170be6c99adecb59b3
- Largest live balance node in entire investigation
- Obfuscated ABI, Seychelles-registered, active RIGHT NOW
- Previously mislabeled as C2 command node

### 3. BYBIT IS THE CONTROLLER
- **Address:** 0x93228d328c9c74c2bfe9f97638bbb5ef322f2bd5
- Sends micro-pings (0.000000001 ETH) to relay 0x818570b6 on Base = orchestrates Binance→relay→Bybit loop
- Two US-KYC'd exchanges (Binance + Bybit) with deliberate anonymous layer between them

### 4. WINTERMUTE = MASTER FEEDER (GL-L69)
- **Address:** 0x32d4703e5834f1b474b17dfdb0ac32cc22575145
- $6-8.2B historical throughput. Nonce 32,737.
- Arkham entity: Wintermute — one of world's largest market makers
- Full chain: Binance HW14 → Wintermute Hub → Master Feeder → Crypto.com Vault

### 5. GATE.IO = PRIMARY MEGA-MIXER
- **Address:** 0x0d0707963952f2fba59dd06f2b425ace40b492fe
- $107B historical throughput. 33.3M txs. $41M live.
- Every Red Web flow touches this node

### 6. CIRCLE CCTP V2 = SOLANA EXIT ROUTE
- **Address:** 0x28b5a0e9c621a5badaa536219b3a228c8168cf5d
- Burns USDC on ETH/Arbitrum → remints on Solana
- Relay Solver calls 23x per 200-tx sample
- Subpoena Circle = all destination chains revealed

### 7. $862M RELAY EOA = PRIVATE BRIDGE OPERATOR
- **Address:** 0x6a2abff960b663462cbc46a2cfcf85063fe8ae14
- Zero labels across all 9 forensic tools
- 228,210 Arbitrum txs. Burns $287K+ USDC daily via CCTP
- Most active completely unlabeled node in investigation

---

## KILL CHAIN (Complete)
```
GENESIS (0xaf880fc7)
└→ CONTROLLER (0xDFd5293D)
   └→ WINTERMUTE MASTER FEEDER (0x32d4703e) → CRYPTO.COM VAULT ($163M)

BINANCE HW14 (0x28c6c062)
└→ RELAY (0x818570b6) ←── BYBIT CONTROLLER (micro-pings)
   └→ BYBIT (0x93228d32, $26.3M)

B2C2/APEX PIVOT (0x70a3df69)
└→ CRYPTO.COM AGGREGATOR ($520M flow)
└→ EIP7702_DEST → 0x6150d420 → HITBTC ($322M LIVE)

RELAY EOA (0x6a2abff9)
└→ CCTP V2 (Circle) → SOLANA (via Wormhole)
```

---

## LABEL CORRECTIONS (All Time)
| Session | Address | Old | Corrected |
|---|---|---|---|
| GL-L70 | 0xa3222357 | C2 Node | HitBTC treasury ($322M) |
| GL-L70 | 0x1522900b | BitGo $1B funnel | Bitstamp + BitGo custodian |
| GL-L70 | 0x1c727a55 | P2P OTC Desk | Uphold exchange (FCA+FinCEN) |
| GL-L24 | 0x9358D671 | Smart Wallet (ops) | COMPROMISED — NEVER USE |

---

*Updated: GL-L70 | June 18, 2026 | TheWarden / StableExo*
