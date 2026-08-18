# YYYY-MM-DD — [EVENT TITLE]

> **Completion:** 🔴 INCOMPLETE / 🟡 PARTIAL / 🟢 COMPLETE
> **Scan Depth:** 🔴 UNSEARCHED / 🟡 SURFACE / 🟢 DEEP
> **Verified On-Chain:** YES / NO / PARTIAL

---

## 1. Event Summary
> One or two sentences. What happened this day and why it matters to the case.

```
[FILL IN]
```

---

## 2. Date & Chain

| Field | Value |
|-------|-------|
| Date | YYYY-MM-DD |
| Time (UTC) | HH:MM — HH:MM (or UNKNOWN) |
| Block Range | #XXXXXXX — #XXXXXXX (or UNKNOWN) |
| Primary Chain | Ethereum / Base / Arbitrum / BSC / Polygon / Multi |
| Secondary Chains | [list or NONE] |

---

## 3. Addresses Involved

| Address | Label / Node | Role This Day | Direction |
|---------|-------------|---------------|-----------|
| `0x...` | NODE_XXX — [name] | Sender / Receiver / Contract | IN / OUT / BOTH |
| `0x...` | [UNKNOWN] | [role] | [direction] |

> Add rows as needed. UNKNOWN is acceptable — flag it for future scan.

---

## 4. What Moved

| Asset | Amount | USD Value (day-of) | USD Value (2026) | From | To |
|-------|--------|-------------------|-----------------|------|----|
| ETH | X.XX | $X,XXX | $X,XXX | `0x...` | `0x...` |
| USDT | X,XXX | $X,XXX | $X,XXX | `0x...` | `0x...` |
| [token] | — | — | — | — | — |

> If exact amounts unknown, enter ESTIMATE or UNKNOWN and note the source of uncertainty.

---

## 5. Entities & Organizations Involved

| Entity | Type | Role | Known? |
|--------|------|------|--------|
| [e.g. Wintermute Trading] | Market Maker / Exchange / Unknown | Sender / Receiver / Facilitator | YES — labeled by Arkham |
| [e.g. Gate.io] | Exchange (Chinese) | Mixer / Exit | YES — exchange deposit |
| [UNKNOWN] | — | — | Pending scan |

---

## 6. Network Role — How This Fits the Machine

> Describe where this event sits in the broader Red Web operation.
> Options: Funding → Layering → Integration → Exit → Control → Unknown

```
[FILL IN — e.g. "Layering event. Funds received from Jump Crypto genesis funder routed through 
Gate.io HW1 before splitting to 4 downstream wallets. Consistent with obfuscation layer 2."]
```

---

## 7. Behavior Pattern

- [ ] Large single transfer (>100 ETH or >$1M)
- [ ] Batch/disperse pattern (one → many)
- [ ] Consolidation pattern (many → one)
- [ ] Round-number amounts (laundering signal)
- [ ] Bridge activity (cross-chain)
- [ ] Tornado Cash / mixer interaction
- [ ] CEX deposit/withdrawal
- [ ] Contract deployment
- [ ] Dormancy break (wallet inactive >30 days then reactivates)
- [ ] Coordinated multi-wallet timing (<1 hr window)
- [ ] Other: _______________

---

## 8. On-Chain Proof

| Source | Link | Verified |
|--------|------|---------|
| Etherscan | https://etherscan.io/tx/0x... | YES / NO |
| Basescan | https://basescan.org/tx/0x... | YES / NO |
| Arkham | https://platform.arkhamintelligence.com/explorer/address/0x... | YES / NO |
| Dune Query | https://dune.com/queries/... | YES / NO |
| Other | — | — |

---

## 9. Legal Significance

> How does this event support the case? Check all that apply:

- [ ] Money laundering (18 USC §1956) — layering / integration
- [ ] Wire fraud (18 USC §1343) — interstate electronic transfer
- [ ] Bank Secrecy Act violation — structuring / failure to report
- [ ] False Claims Act nexus — federal contractor / government program involvement
- [ ] Securities fraud — unregistered tokens / market manipulation
- [ ] RICO pattern — part of ongoing criminal enterprise
- [ ] Sanctions evasion (OFAC)
- [ ] Tax evasion — unreported proceeds

> Notes:
```
[FILL IN — specific legal argument this event supports]
```

---

## 10. Open Questions / Next Scan Targets

> What do we NOT know yet that we need to find?

- [ ] [e.g. Who funded the sender wallet before this tx?]
- [ ] [e.g. Where did the funds go after the Gate.io deposit?]
- [ ] [e.g. Exact block number — Etherscan pull needed]

---

## 11. Connected Events

| Date | File | Relationship |
|------|------|-------------|
| [YYYY-MM-DD] | [link] | Upstream — funds originated here |
| [YYYY-MM-DD] | [link] | Downstream — funds next appeared here |
| [YYYY-MM-DD] | [link] | Parallel — same operator, same day |

---

*Last updated: YYYY-MM-DD | Session: VL-XX | Scan depth: [level]*
