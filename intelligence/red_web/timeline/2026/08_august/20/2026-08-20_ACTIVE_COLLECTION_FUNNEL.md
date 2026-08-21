# 2026-08-20 — ACTIVE COLLECTION FUNNEL: 0x70a3df LIVE + ANCESTRY FULLY MAPPED

> **Completion:** 🔴 ONGOING — multiple addresses actively operational
> **Scan Depth:** 🟢 FULL — VL-29 + VL-30 combined, 20-tool scanner + deep Etherscan trace
> **Verified On-Chain:** YES — Nansen, Zerion, Etherscan, direct tx hash confirmed
> **Updated:** VL-30 2026-08-21

---

## CRITICAL STATUS: ACTIVE MULTI-LAYER OPERATION

The investigation has now confirmed **two simultaneous active operations** running in parallel:

**Operation A — EIP-7702 Collection Funnel (discovered VL-12)**
Target `0x70a3df699512f39C682F94fad498454C90B8C219` collecting phishing/drainer proceeds via EIP-7702. 20 inbound txs in 72h, $3,624 live, 21 evasion confirmations.

**Operation B — Weekly ETH Laundering Cycle (discovered VL-30)**
ROOT `0xaf1931` → `0x416299aa` → ghost `0x3a5cc8` — 18,344 ETH (~$43M) moved in 14 weekly cycles (May–Aug 2026). Standard on-chain txs, NOT EIP-7702.

---

## Operation B — Weekly Cycle Details

### Active Relay Chain
```
0xaf1931c20ee0c11bea17a41bfbbad299b2763bc0  ← ROOT ($765K live, 322 ETH)
        ↓ every ~7 days (Wednesday ~10:00 UTC)
0x416299aade6443e6f6e8ab67126e65a7f606eef5  ← SECOND HOP (reactivated May 2026)
        ↓ same day, hours later
0x3a5cc8689d1b0cef2c317bc5c0ad6ce88b27d597  ← GHOST DESTINATION (0 visible txs)
```

### Confirmed Weekly Cycles (May–Aug 2026)

| Date | ETH to 0x416299 | ETH to 0x3a5cc8 | USD Value |
|------|-----------------|-----------------|-----------|
| 2026-05-21 | 1,720 | 1,700 | ~$4.0M |
| 2026-05-27 | 1,051 | 1,000 | ~$2.5M |
| 2026-06-03 | 1,447 | 1,540 | ~$3.4M |
| 2026-06-11 | 2,953 | 2,950 | ~$6.9M |
| 2026-06-17 | 1,047 | 1,050 | ~$2.5M |
| 2026-06-25 | 1,849 | 1,850 | ~$4.3M |
| 2026-07-02 | 1,598 | 1,600 | ~$3.7M |
| 2026-07-08 | 987 | 990 | ~$2.3M |
| 2026-07-16 | 1,218 | 1,220 | ~$2.9M |
| 2026-07-23 | 609 | 610 | ~$1.4M |
| 2026-07-30 | 1,031 | 1,000 | ~$2.4M |
| 2026-08-05 | 805 | ? | ~$1.9M |
| 2026-08-12 | 1,200 | 2,037 | ~$2.8M |
| 2026-08-19 | 829 | 830 | ~$1.9M |
| **TOTAL** | **18,344 ETH** | **~18,377 ETH** | **~$43M** |

**Sample tx hashes:**
- `0x318a29a5...` — 829.14 ETH from ROOT to 0x416299aa, Aug 19 2026 10:16 UTC, Block 25788499
- `0x53c9e4ee...` — 830 ETH from 0x416299aa to 0x3a5cc8, Aug 19 2026 12:13 UTC, Block 25789079

---

## 0x416299aa — Three-Phase Operating Profile

### Phase 1: Nov 2017 (Distribution Engine)
- Received 861 ETH from ROOT in 39 txs over 29 days
- Distributed ~860 ETH to 50+ addresses across 900 external txs
- All secondary recipients now drained to 0

### Phase 2: Dec 2017 – Apr 2026 (Dormant — 8.5 years)
- 544 internal txs — all 0 ETH phantom pings
- No meaningful external activity

### Phase 3: May 2026 – Present (ACTIVE LAUNDERING)
- Reactivated as a relay for ROOT's ETH flows
- Takes in 600-2950 ETH weekly, forwards same day
- Difference between received and forwarded = operational costs/slippage

---

## Surveillance Infrastructure on ROOT

| Address | Role | Pattern |
|---------|------|---------|
| `0x4162aad4e739...` | Heartbeat pinger | Sends 0 ETH dust to ROOT every ~7 days |
| `0xaf19ee4745907b...` | Address spoof | Starts with `0xaf19` — mimics ROOT's `0xaf1931` prefix |
| `0xaf194d3a6156f8...` | Address spoof | Same — both send weekly dust to ROOT |

**Both spoof addresses hold tiny ETH (~0.00002) and send weekly.** They poison block explorer displays to make the ROOT address harder to identify at a glance.

---

## Ghost Destination: 0x3a5cc8689d1b0cef2c317bc5c0ad6ce88b27d597

- **Received:** ~18,377 ETH ($43M) across 14 txs
- **External txs:** 0
- **Internal txs:** 0
- **Token transfers:** 0
- **Nonce:** 0
- **Source code:** Not verified
- **Zerion:** Error 403
- **Scanner run:** ❌ NOT YET — PRIORITY VL-31

> ⚠️ This address is the most important unscanned address in the investigation. It received $43M in 2026 and has zero on-chain visibility via any standard tool.

---

## Operation A — EIP-7702 Funnel (VL-29 findings preserved)

Target: `0x70a3df699512f39C682F94fad498454C90B8C219`

| Tool | Result |
|------|--------|
| Zerion | $3,624.38 live — 1.5494 ETH + dust |
| Nansen | 20 inbound txs in 72h — all Base/Optimism |
| Dune | 0 ETH txs — EIP-7702 evasion (21st confirmation) |
| BICScan | 0/100 risk |
| TRM | Not sanctioned |

20 feeder addresses active, "Thief1" Nansen label on `0xa17b82`. Full table in VL-29 file.

---

## VL-30 Next Priorities

1. **SCAN `0x3a5cc8689d1b0cef2c317bc5c0ad6ce88b27d597`** — $43M ghost destination
2. **Trace 0x3a5cc8 outflows** — requires Render/QuickNode (RPC parent tx lookup, container TLS blocked)
3. **Map Nov 2017 distribution** — 0x416299aa sent to 50+ addresses of 5-20 ETH each. Where did those go?
4. **Recharge AnChain credits**
5. **Scan 0xdd8424bb92d9** — mystery second sender to 0x416299aa (4.21 ETH, 0 standard txs)

→ [ROOT 2017-10-13](../../../2017/10_october/13/) | [Thief1 2019-08-31](../../../2019/08_august/31/) | [Legal Filings](../../../legal_filings/)
