# RED WEB — Intel Update GL-L30: Full Drainer Hierarchy
## 8-Level Hierarchy Traced | May 26, 2026

---

## Full 8-Level Hierarchy

```
[L1] Drainer Factory: 0x8D8210... (456,558 txs — mass deployment)
  ↓
[L2] Operator: 0xe3009dfb (28,475 txs | 0.374 ETH | STILL ACTIVE May 2026)
  ↓
[L3] Criminal Node: 0x2ef45c5a (GoPlus: PHISHING + STEALING flags confirmed)
  ↓
[L4–L8] Victim sweep chain → AGGREGATOR → CASHOUT → BSC → USDT → Solana
```

---

## Key Nodes

### L1 — Drainer Factory
- `0x8D8210...` — 456,558 total transactions
- Mass-deployed phishing infrastructure
- Creates the EIP-7702 sweep bots

### L2 — Active Operator
- `0xe3009dfb...`
- 28,475 transactions
- Balance: 0.374 ETH
- **Status: STILL ACTIVE as of May 2026**
- This is likely the day-to-day operator controlling the sweep bots

### L3 — Confirmed Criminal
- `0x2ef45c5a...`
- GoPlus security flags: **PHISHING** + **STEALING** (both confirmed)
- Connects L2 operator to the broader aggregation network

---

## Connection to EIP-7702 Attack

The 62-cent EIP-7702 sweep of `0x9358D67164258370B0C07C37d3BF15A4c97b8Ab3`
(Taylor's old ops EOA, compromised Dec 2025) fed into this hierarchy.

Final destination confirmed: `0x70a3df699512f39C682F94fad498454C90B8C219`
- ~$922 ETH held
- 42,347 automated txs via `setupForwarding()` system
- Operating on Base chain

---

## Investigation Status (GL-L59)

- [ ] Forensic scanner not yet fired at full chain (keys needed: arkham, chainbase, moralis, nansen)
- [x] Kill chain fully documented
- [x] 18 victim addresses confirmed (15 Base + 3 ETH)
- [ ] Estimated hundreds of victims from 22,974 deployer transactions — NOT YET SCANNED

*Generated GL-L30 | 2026-05-26 | Updated GL-L59 | 2026-06-09 | TheWarden Intelligence Division*
