# THE RED WEB — Intel Update GL-L12
## Pending Intel — COMPLETED

---

## RELAY PROTOCOL BREAKTHROUGH

**`0x4cd00e387622c35bddb9b4c962c136462338bc31` = RelayDepository (relay.link)**

The aggregator at the end of the Base→ETH bridge chain is the **Relay Protocol cross-chain bridge**.
- **~11 ETH currently locked** across ETH mainnet (6.92) + Base (4.07)
- **$7,162.52 USDC + $1,500 USDT** forwarded to Relay Solver `0xf70da97812cb96acdf810712aa562db8dfa3dbef`
- Relay Protocol has FULL TX records and can freeze/flag these funds
- **Report contact: security@relay.link**

---

## COMPLETE NODE MAP (13 Confirmed Addresses)

| Label | Address | Role | Chain |
|-------|---------|------|-------|
| L1 Funder | `0x6c8246fce12d55bb3b21cf09d3266a4af9ef07da` | CEX→Deployer money mule | Base |
| Deployer | `0x2E5269B9eA393EAE90F15E87D06D10547e4Df87e` | Core operator, 10mo, 22,974 ops | Base+ETH |
| Sweeper | `0xebf985ad307cba2a214dfc5caffa8e41c17c632f` | EIP-7702 drain contract | Base |
| Cash-out | `0x6F1cDbBb4d53d226cf4B917B5C31fb1E14FFcBfB` | ETH receiver on Base | Base |
| Bridge Extractor | `0xdead7f94da688543dcf661114abbf626a8386666` | OP bridge Base→ETH (DEAD+666) | ETH |
| Orchestrator | `0x63825239f09d8ec83bc556ec32b7773a8aaaaaaa` | Cross-chain coordinator (8xA vanity) | ETH+Base |
| Gas Feeder | `0xaa50ce2b39fbb0bdd3028eb5898cfeac2df0d15a` | Micro-ETH to victims pre-drain | ETH |
| LiFi Router | `0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae` | Bridge WETH to RelayDepository | ETH |
| **RelayDepository** | `0x4cd00e387622c35bddb9b4c962c136462338bc31` | **LAUNDRY — relay.link deposit** | ETH+Base |
| Relay Solver | `0xf70da97812cb96acdf810712aa562db8dfa3dbef` | Final recipient of USDC/USDT | ETH |
| Poisoning Bot | `0x4676d66b0d5bebe27d99d9c4529ea53c179cd9d2` | 83,561 ops address poisoner | ETH |
| Victim (Taylor) | `0x9358D67164258370B0C07C37d3BF15A4c97b8Ab3` | Primary target | Base |
| 20 Others | (see victims.json) | EIP-7702 victims | Base+ETH |

---

## ATTACK PIPELINE (COMPLETE)

```
[CEX Unknown]
    ↓ funds
[L1 Funder 0x6c8246...]
    ↓ funds  
[DEPLOYER 0x2E5269...]  ←── [ORCHESTRATOR 0x63825239...aaaaaaa]
    ↓ EIP-7702 SET_CODE
[20 Victims across Base+ETH]
    ↓ swept sub-second
[Cash-out 0x6F1cDbBb...] (Base)
    ↓ OP bridge
[Bridge Extractor 0xDEAD...666] (vanity provocation)
    ↓ finalizeWithdrawal to ETH mainnet
    ↓ + Gas Feeder 0xaa50ce... + LiFi Router 0x1231de...
[RelayDepository 0x4cd00e...] ← relay.link  ⚠️ ~11 ETH HERE NOW
    ↓ $7,162 USDC + $1,500 USDT
[Relay Solver 0xf70da9...]
    ↓ UNKNOWN FINAL WALLET
```

---

## VANITY ADDRESS PATTERN

The operator deliberately crafted multiple vanity addresses:
- `0x63825239...aaaaaaa` — 8 trailing 'a' characters
- `0xdead7f94...8386666` — "DEAD" + "666" suffix

**This is not a small operation.** High technical skill, 10 months running, deliberate provocation.

---

## REPORT TARGETS (PRIORITY ORDER)

1. **relay.link security team** — funds currently in their contract, can freeze NOW
2. **Coinbase / Base Security** — EIP-7702 attack vector on Base
3. **LiFi Protocol team** — their router used in laundry chain
4. **Law enforcement** — if Relay/CEX KYC trail confirmed

---

*Updated GL-L12 | May 20, 2026*
