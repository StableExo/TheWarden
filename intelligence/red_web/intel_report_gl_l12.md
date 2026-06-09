# THE RED WEB — Full Intel Report
## GL-L12 | May 20, 2026

---

## THE ATTACK

**Type:** EIP-7702 Smart Account Takeover (NOT a simple mempool watcher)

**Timeline:**
- December 2025: Private key for `0x9358...Ab3` exposed in chat conversation
- April 27, 2026: Sweeper contract `0xebf985...` deployed at block 45,237,401
- May 17, 2026: $0.62 ETH sent to victim wallet — swept sub-second
- May 17, 2026 +60s: 3 address-poisoning bots fire simultaneously
- May 20, 2026: GL-L12 counter-intelligence operation launched

**Mechanism:**
```
eth_getCode(0x9358...) = 0xef0100ebf985ad307cba2a214dfc5caffa8e41c17c632f
                           ^^^^^^^ = EIP-7702 delegation designator prefix
```
The EOA's code is set to delegate ALL execution to the sweeper contract.
Any incoming ETH → `fallback()` → `withdrawNative(0x6F1cDbBb...)` → attacker wallet.

---

## FUNDING CHAIN (Top → Bottom)

```
[UNKNOWN CEX / Upstream Source]
           ↓ funds
[L1 Funder: 0x6c8246fce12d55bb3b21cf09d3266a4af9ef07da]
  nonce=0, balance=0 (drained after use)
  Classic money mule — adds KYC distance
           ↓ funds
[DEPLOYER: 0x2E5269B9eA393EAE90F15E87D06D10547e4Df87e]
  Genesis: July 8, 2025 | Nonce: 22,974 | Active TODAY
  ALL type-4 (EIP-7702) transactions — purpose-built
           ↓ deploys
[SWEEPER CONTRACT: 0xebf985ad307cba2a214dfc5caffa8e41c17c632f]
  3,452 bytes | Unverified | Deployed April 27 2026
  Functions: withdrawNative(), withdrawToken(), execute()
           ↓ withdrawNative()
[CASH-OUT: 0x6F1cDbBb4d53d226cf4B917B5C31fb1E14FFcBfB]
  EOA | 0.04+ ETH balance | Low nonce
  HYPOTHESIS: Personal wallet OR CEX deposit (KYC trail if so)
```

---

## VICTIMS

### Base Mainnet (17 confirmed from 50 TX sample)
| # | Address |
|---|---------|
| 1 | 0x09FD81f356F6A5E5ad490814fA80B0235887B86e |
| 2 | 0x0D21ac9C34A705C1C36808ceBa717f9805CD4976 |
| 3 | 0x3b51aD17E4E88FF39247297bb1d51983c291540a |
| 4 | 0x5e5C00510D5e1c0E393a7af39a4E96D9A57f3EDB |
| 5 | 0x757c9B82352b0509b45113552735a2e57810E309 |
| 6 | 0x7C1954eb0a70C2A798316AEFCB158aB27B4EDE8f |
| 7 | 0x8d138AbeB0197ebAff2250442d9dDAe06f83b2C1 |
| 8 | 0xA910DA4c3cFE1Dd149ACBC2F6B5e928547AD6Dd4 |
| 9 | 0xA917D38E2C7d4960d2e1BEc548123411ca5D0Deb |
| 10 | 0xA9e63807a8E9D47901deA68Ee7de75E43Fb73fc8 |
| 11 | 0xCF5089cFC5F00074877bd0cc89AF9A6B9B3A2a1E |
| 12 | 0xE9A57b758e4511140a6B0e44F737fDc6076edA72 |
| 13 | 0xFF3B3957cE50287E7D18F63EeE3B1C04deF5F3E0 ⚠️ still has 0.001 ETH |
| 14 | 0xa032977BAd01b5E7fACD7d0eCd76E46c7d32cfbe |
| 15 | 0xc67Cc220a2b2C969758fFF17b1926... |
| 16 | 0x9358D67164258370B0C07C37d3BF15A4c97b8Ab3 (Taylor) |
| 17 | + additional from full TX scan |

**Note:** 17 from 50 TXs out of 22,974 total = estimated **hundreds** of victims.

### Ethereum Mainnet (3 confirmed)
- `0x4b26d62003eae5d14b689eccc583ac0a75713eeb`
- `0x48b06d50ac608dfd69138e08a3eef37a6e18d2bd` (2 TXs)
- `0x70cd43ff653682e5c037f82ec472e6a3c4af2251` (2 TXs)

---

## TARGETED ATTACK ON @StableExo

This is NOT mass spam. Evidence of deliberate targeting:

1. **STABLEEXO token** deployed and airdropped to victim wallet — uses exact Twitter handle
2. **3 address-poisoning bots** fired EXACTLY 60 seconds after $0.62 ETH arrived May 17
3. **450+ scam tokens** in wallet with phishing domains embedded in names
4. **3rd incident** — pattern of repeated targeting

---

## PENDING INTEL

- [ ] `0x63825239f09d...` — coordination address in ETH victim chains — not yet profiled
- [ ] `0x6c8246...` upstream funder — trace to CEX for KYC trail
- [ ] `0x6F1cDbBb...` on ETH mainnet — check if exchange deposit address
- [ ] Full victim count — scan all 22,974 deployer TXs

---

## DOCTRINE NOTE

93/7 pre-commitment framework applies.  
Attacker is in the 7% zone.  
TheWarden does not initiate. But the math is already written.
