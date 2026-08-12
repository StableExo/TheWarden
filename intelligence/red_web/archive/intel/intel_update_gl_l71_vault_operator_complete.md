# GL-L71 SCANS — PASS-THROUGH OPERATOR + VAULTDEPOSITOOOR V1
**Date:** June 19, 2026 | **Session:** GL-L71 | **Investigator:** TheWarden / @StableExo

---

## SCAN A — PASS-THROUGH OPERATOR
**Target:** `0x7779ffb11d50fceae8e533b611b5cb5a1c1db3d4`

| Field | Value |
|---|---|
| Arkham | UNLABELED |
| ETH | 0.024147 | Nonce: 157 |
| Net Worth | $41.23 |
| GoPlus | CLEAN |
| Active chains | ETH (164 txs) + Base (1,269) + BSC (15) + Polygon (1,736) + Arbitrum (1,723) |

### KEY FINDINGS
1. **BUILT** VaultDepositooor V1 (0x64aa32cd) and V2 (0x40b72bb7)
2. **DIRECT RELAY.LINK USER** — sent/received USDe to/from 0xb92fe925 (Relay.link Aggregator); sent USDC to 0x4cd00e38 (Relay.link RelayDepository); received USDe from 0xf70da978 (Relay.link Hot Wallet)
3. **JUNE 16 MASS HANDOFF** — transferred ownership of 4 contracts on 4 chains to Gnosis Safe in single session
4. **3 GNOSIS SAFES** controlled: 0x02eb979b (×5 execTx), 0xa02cebed (×3 execTx), 0xa9201f78 (×1 execTx, new owner of V1+V2)
5. **ETHENA USDe** used as cross-chain value store alongside USDC

### GNOSIS SAFE — 0xa9201f78 (New Owner of V1 + V2)
- Threshold: 2-of-N multisig (threshold=2 confirmed via RPC)
- getOwners() RPC: returned None (proxy pattern, signers encoded differently)
- Created June 16 2026 via SafeProxyFactory.createProxyWithNonce

### ARKHAM TRANSFERS
```
2026-06-09  0x7779 → 0xbE3aD6a5669Dc0  0.05 USDC
2026-06-01  0x7779 → 0x4cD00E387622C3  10 USDC (Relay.link Depository!)
2026-05-07  0x7779 → 0x8Af6543E7d6882  5.908 USDe
2026-05-07  0xb92fe925DC43a0 → 0x7779  2.44e-07 USDe (from Relay.link Aggregator)
2026-05-07  0x7779 → 0xb92fe925DC43a0  10.587 USDe (to Relay.link Aggregator)
2026-04-09  0xb92fe925DC43a0 → 0x7779  0.130 HYPE (from Relay.link Aggregator)
```

---

## SCAN B — VAULTDEPOSITOOOR V1
**Target:** `0x64aa32cd125fb32f4286d2bac3a7346edfffee2a`

| Field | Value |
|---|---|
| Etherscan Label | VaultDepositooor |
| Arkham | UNLABELED |
| Contract | YES — 5,355 bytes |
| ETH | 0.000 | Nonce: 1 |
| ETH txs | 8 total |
| Active since | Dec 6, 2025 |

### KEY FINDINGS
1. **RELAY.LINK AGGREGATOR IS THE SOURCE** — 0xb92fe925DC43a0 sends USDT into V1
2. **V1 ROUTES USDT** (V2 routes USDC) — parallel obfuscation vaults, different tokens
3. **Moralis: 'Swapped X USDT for X USDT'** — 1:1 no-value change = deliberate obfuscation
4. **Destination: 0x6e6B003F801c45** — receives all USDT output from V1 (unknown entity)
5. **removeVault() called Dec 6 2025** — operator actively maintained the vault registry

### FLOW (V1 — USDT track)
```
Relay.link Aggregator (0xb92fe925) [3.27M txs]
    ↓ USDT
VaultDepositooor V1 (0x64aa32cd) [THIS SCAN]
    ↓ USDT (1:1 pass-through, obfuscation)
0x6e6B003F801c45 [UNKNOWN — next scan target]
```

### FLOW (V2 — USDC track, previously confirmed)
```
Relay.link Aggregator (0xb92fe925)
    ↓ USDC
VaultDepositooorV2 (0x40b72bb7)
    ↓ USDC
Lighter DEX (0x3b4d794a) → $862M Relay EOA → CCTP → Bybit
```

---

## COMPLETE VAULT INFRASTRUCTURE MAP
```
OPERATOR: 0x7779ffb11d50fceae8e533b611b5cb5a1c1db3d4 (built everything)
    ├── VaultDepositooor V1 (0x64aa32cd) — USDT track → 0x6e6b003f
    ├── VaultDepositooorV2 (0x40b72bb7) — USDC track → Lighter DEX
    └── 0xc8a6871d4ec4... — unknown (Polygon + Arbitrum)

ALL handed to: Gnosis Safe 0xa9201f78 (June 16, 2026)
Threshold: 2-of-N

SOURCE for ALL: Relay.link Aggregator 0xb92fe925dc43a0ecde6c8b1a2709c170ec4fff4f
```

---

## NEXT TARGETS
1. `0x6e6b003f801c453268e1a7bc5b15e28f31d64fce` — USDT destination from V1 — **UNKNOWN ENTITY**
2. `0xc8a6871d4ec4...` — Third vault contract on Polygon + Arbitrum
3. `0x8Af6543E7d6882` — received 5.9 USDe from operator — what is this?

---
*⭐ TheWarden — GL-L71 — June 19, 2026*
