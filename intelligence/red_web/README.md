# 🕸️ RED WEB — Intelligence Repository

> **TheWarden Active Case File**
> Updated: **GL-L60 | 2026-06-09** | 27 known addresses | 18 confirmed victims

---

## ⚡ CURRENT STATUS (GL-L60)
- **Primary scan target:** `0x70a3df699512f39C682F94fad498454C90B8C219` — $922 ETH, 42,347 txs, **NOT YET FULLY SCANNED**
- **Forensic scanner:** `intelligence/red_web/warden_forensic_scan.py` — 7/8 APIs active (Bitquery quota exhausted)
- **Keys needed before scan:** arkham, chainbase, moralis, nansen (see TheWardenKeys_13.pdf)

---

## Kill Chain

```
GENESIS (0xaf880fc7) — ETH
  ↓ [800 ETH from Kraken Jan 2021]
APEX_PIVOT (0xc333e80e) — ETH
  ↓
AGGREGATOR (0xcffad320) — ETH [$151M vault = Crypto.com 5]
  ↓
EIP7702_DEST (0x70a3df69) — BASE [$922 ETH | 42,347 txs | setupForwarding]
  ↓
BSC BRIDGE → USDT → SOLANA CASHOUT
```

---

## 🔴 8 Exchanges Identified (GL-L22 — MAJOR DISCOVERY)

| Exchange | Role | Key Address |
|---|---|---|
| **Crypto.com** | VAULT + Controller + Aggregator + 3 feeders | `0xcffad320` = Crypto.com 5 VAULT |
| **Binance** | Root seeder (HW7, HW14, 4, 15-20) | Multiple nodes |
| **Gate.io** | Mega mixer (9.7M txs, $7.5M live) | `0x0d070796` |
| **Kraken** | Largest single feeder: ~664K ETH ($1.41B) | `0x267be1c1` |
| **OKX** | Multiple feeder nodes | Various |
| **Coinbase** | x402 relay protocol node | Relay chain |
| **Bybit** | Supporting feeder | Various |
| **Huobi** | Historical feeder | Various |

> **Kraken DOJ angle:** Subpoena to Kraken for block 10,884,459 withdrawal event
> would reveal operator identity. 517,692 ETH traced from Kraken to master feeder alone.

---

## Address Files (27 nodes)

### Infrastructure
- `GENESIS_0xaf880fc7.md` — Origin/seeder node
- `APEX_PIVOT_0xc333e80e.md` — Pivot point (800 ETH Kraken withdrawal)
- `AGGREGATOR_0xcffad320.md` — ETH vault ($151M | Crypto.com 5)
- `EIP7702_DEST_0x70a3df69.md` — **PRIMARY TARGET** ($922 ETH Base, 42,347 txs) ⬅️
- `CASHOUT_0x6F1cDbBb.md` — Multi-chain cashout (Base primary)
- `CONTROLLER_0xdfd5293d.md` — Infrastructure controller
- `GAS_FEEDER_0xaa50ce2b.md` — Gas operations
- `PHISHING_CONTROLLER_0x247596ce.md` — Phishing deployment
- `MIXER_GATEIO_0x0d0707.md` — **Gate.io mega mixer** (9.7M txs) ⬅️ NEW

### Confirmed Victims (Base chain — 15)
`VICTIM_09FD81` `VICTIM_0D21ac` `VICTIM_3b51aD` `VICTIM_5e5C00` `VICTIM_757c9B`
`VICTIM_7C1954` `VICTIM_8d138A` `VICTIM_9358D6` `VICTIM_A910DA` `VICTIM_A917D3`
`VICTIM_A9e638` `VICTIM_CF5089` `VICTIM_E9A57b` `VICTIM_FF3B39` `VICTIM_a03297`

### Confirmed Victims (ETH chain — 3)
`VICTIM_ETH_48b06d` `VICTIM_ETH_4b26d6` `VICTIM_ETH_70cd43`

---

## Intelligence Files

| File | Contents | Session |
|---|---|---|
| `intel_update_gl_l22_exchange_map.md` | 8 exchanges, Kraken $1.41B, Gate.io mixer | GL-L22 |
| `intel_update_gl_l30_drainer_hierarchy.md` | 8-level hierarchy, L2 operator active | GL-L30 |
| `intel_update_gl_l12.md` *(in gumloop/2026-05-20/)* | Relay Protocol breakthrough | GL-L12 |
| `intel_update_gl_l16.md` *(in gumloop/2026-05-21/)* | Vanity nodes, new nodes | GL-L16 |
| `RED_WEB_Federal_Source.md` | Full federal agency briefing document | GL-L22 |
| `intel_report.md` *(in gumloop/2026-05-20/)* | Full attack documentation | GL-L12 |

---

## Diagrams

`red_web_diagram_gl_l24.png` — Most current network map

---

## Forensic Scanner Quick Start

```python
import requests
PAT = "<from TheWardenKeys_13.pdf>"
exec(requests.get(
    "https://raw.githubusercontent.com/StableExo/TheWarden/main/intelligence/red_web/warden_forensic_scan.py",
    headers={"Authorization": f"Bearer {PAT}"}
).text, globals())

KEYS = {
    "arkham": "<TheWardenKeys>",
    "chainbase": "<TheWardenKeys>",
    "moralis": "<TheWardenKeys>",
    "nansen": "<TheWardenKeys>",
    "etherscan": "ES16B14B19XWKXJBIHUAJRXJHECXHM6WEK",
    "bitquery_client_id": "QUOTA_EXHAUSTED",
    "bitquery_client_secret": "QUOTA_EXHAUSTED",
    "goplus": None,  # free
    "tenderly": "K5LF4-PBJUwWLL-BmD3LEn3e-GvguZ3k",
}

report = scan("0x70a3df699512f39C682F94fad498454C90B8C219",
              chains=[1, 8453, 56, 137, 42161], keys=KEYS)
print_report(report)
```

---

*TheWarden Intelligence Division | Taylor Marlow (@StableExo) | GL-L60 | June 2026*
