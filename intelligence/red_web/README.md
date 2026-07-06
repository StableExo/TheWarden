# THE RED WEB — A Network Built in Layers
### From $0.62 to $86.5 Billion

> *"It started with a dust transaction. It ended with a map of the most sophisticated
> cross-chain financial infrastructure ever documented by a solo investigator."*
> — TheWarden, GL-L88, July 2026

---

## What This Repository Is

This is the forensic record of **The Red Web** — a multi-billion dollar cross-chain
financial infrastructure operating across 6 blockchains, connecting 10 confirmed exchanges,
and moving $50–60M per day as of July 2026.

Every node in this repository is organized **by when it first appeared on-chain.**
Open any year. Open any month. See exactly what came online and what it connected to next.

---

## The Network, Layer by Layer

| Layer | Period | What Happened |
|---|---|---|
| **Layer 0 — Origin** | [2017/December](2017/December/) | The seed money arrives. 298 wallets. One day. |
| **Layer 1 — Activation** | [2018/January](2018/January/) | Infrastructure activated. Controller seeded. |
| **Layer 2 — Exchange Genesis** | [2020](2020/) — [2021](2021/) | Exchange nodes come online. Wintermute. OKX. |
| **Layer 3 — Kill Chain Assembly** | [2021](2021/) — [2022](2022/) | Vault, gas controller, relay layer assembled. |
| **Layer 4 — Full Operation** | [2022](2022/) — [2023](2023/) | $50M+/day. 10 exchanges. 100+ worker bots. |
| **Layer 5 — Countermeasures** | [2023](2023/) — [2025](2025/) | CZ guilty plea. Evidence destruction. NK hack. |
| **Layer 6 — Present** | [2026](2026/) | Still running. New nodes discovered. |

---

## How to Navigate

```
Open a year → Open a month → See what nodes came online
Each node file contains:
  - Address
  - First appearance date
  - Layer in the network
  - What it connects to (downstream)
  - What funded it (upstream)
  - Current status
  - Scanner command → forensics [address]
```

---

## The Ping Script *(coming)*

```bash
python tools/ping_node.py 0xfe9e8709d3215310075d67e3ed32a380ccf451c8
```

Traces every Red Web connection this node has ever touched.
Illuminates the entire chain — upstream and downstream — in real time.

---

## Other Resources

- [`archive/source/`](archive/source/) — Master investigation report, NotebookLM source, federal doc
- [`archive/intel/`](archive/intel/) — Session-by-session intel updates (GL-L12 → GL-L88)
- [`archive/sync/`](archive/sync/) — Brain sync snapshots
- [`tools/`](tools/) — `warden_forensic_scan.py` (8-tool scanner, v20, all keys armed)
- [`maps/`](maps/) — Network diagrams and visual maps

---

## Scale

| Metric | Value |
|---|---|
| Nodes mapped | 91+ confirmed |
| Exchanges confirmed | 10 (7 Chinese, 3 US) |
| Daily volume (active) | $50–60M/day as of July 2026 |
| Gate.io historical | $107.2 BILLION |
| Sessions | 70+ dedicated Red Web sessions |
| Brain records | 4,198 timestamped intel entries |

---

*TheWarden ★ @StableExo ★ GL-L88 ★ July 2026*
*"From $0.62 to $86.5 billion. The Red Web is real."*
