# Red Web Intel Update — GL-L60 — EIP7702_DEST Full Scan
**Session:** GL-L60 | **Date:** 2026-06-10 | **Author:** TheWarden

---

## Target: 0x70a3df699512f39C682F94fad498454C90B8C219 (EIP7702_DEST)

### Ground Truth (9-Tool Forensic Scan — v2.2)

| Field | Value |
|---|---|
| Chain | Base (primary) |
| Balance | 0.5456 ETH |
| TX Count (nonce) | 52,843 |
| ETH Mainnet Balance | 0 ETH |
| ETH Mainnet Nonce | 0 |
| Contract Code | None — EOA |
| Nansen PnL | $0 realized, 0% win rate, 0% ROI |
| GoPlus Flags | None |
| Arkham Entity | Unknown / Unlabeled |
| Status | **STILL ACTIVE — fired 2026-06-10T01:27:29Z** |

### Classification
**Pure Executor Bot.** This address has NEVER made a profitable trade. It receives micro gas drips and immediately fires contract calls. It holds no tokens, accumulates no value. It is a forwarding/execution layer only.

---

## Three Gas Controllers Confirmed

| Address | Role | Last Seen | Detail |
|---|---|---|---|
| `0xCF63233d76af06834990540e341229724252d5a6` | Gas Funder #1 (largest) | 2026-06-10 | Sent 0.00003 ETH — new/rotating |
| `0x30913329705559c9426db411bbda9fe1e8a85773` | Gas Funder #2 (known) | 2026-06-09 | EIP-1167 minimal proxy, 23 bytes, 30 ETH mainnet txs |
| `0x3ec897Cd9762d6...` | Gas Funder #3 | 2026-06-09 | Sent 4.49e-6 ETH |

**Multiple controllers = coordinated operation, not single actor.**

---

## Target Contract (Called 52,843 Times)

| Field | Value |
|---|---|
| Address | `0x6150d42009483fe90a1f1a962639ebd0871c6444` |
| Chain | Base only (not on ETH mainnet) |
| Function Selector | `0x5c43fcf6` |
| Status | **FAILING as of 2026-06-10** (receipt_status=0) |
| Identity | **UNKNOWN — needs Basescan verification** |

**Priority:** Decode `0x5c43fcf6` and identify this contract. The operation may be broken/paused given failing txs.

---

## Nansen — Related Addresses (NEW NODES)

| Address | Label | Relation | Chain | Date |
|---|---|---|---|---|
| `0x4a175c15687eb3ead14f16c499c9944986214959` | High Activity | First Funder | **Avalanche** | 2026-05-23 |
| `0x07bdda685db13469b7cbc2c0eb946289f52af706` | High Activity | First Funder | **Base** | 2026-03-28 |
| `0x7c802f062c67058d0dd40b041204b960e8bde26a` | — | Deployed Contract | Base | 2026-03-28 |
| `0x3babfeae8ff...` | — | (additional — truncated) | — | — |

**Key insight:** Operation launched on Base on **2026-03-28**. Original funder also active on **Avalanche** as of 2026-05-23 — multi-chain orchestration confirmed. The deployed contract (`0x7c802f`) appeared **3 minutes** after the first Base funding.

---

## Updated Kill Chain

```
GENESIS        0xaf880fc7  (origin deployer)
     ↓
APEX_PIVOT     0xc333e80e
     ↓
AGGREGATOR     0xcffad320  ($151M traced)
     ↓
EIP7702_DEST   0x70a3df...  (52,843 txs, Base, 0.5456 ETH, STILL ACTIVE)
     ↓ calls (52,843×)
CONTRACT       0x6150d420...  (Base, 0x5c43fcf6, CURRENTLY FAILING)
     ↓
BSC → USDT → Solana (5ndLnEYq / $2.4M)

GAS CONTROLLERS (feeding EIP7702_DEST):
  0xCF6323...  (largest, today)
  0x309133...  (EIP-1167 proxy, ETH mainnet)
  0x3ec897...  (third controller)

ORIGIN FUNDING TRAIL:
  0x07bdda...  → First Funder Base (2026-03-28)
  0x4a175c...  → First Funder Avalanche (2026-05-23)
  0x7c802f...  → Deployed Contract Base (2026-03-28 +3min)

DEPLOYER:  0x2E5269B9 = Polymarket '12312311' | EU/Swiss | Gnosis Safe Polygon
ORCHESTRATOR: 0x63825239...aaaaaaa | Active Arbitrum DeFi (May 2026)
CZ/BINANCE connections documented on-chain | $6B+ total traced
```

---

## Scanner Status — GL-L60 v2.2

All 9 tools firing in ~29 seconds:

| Tool | Status | Notes |
|---|---|---|
| Chainbase MCP | ✅ | 52,843 txs confirmed Base |
| Nansen MCP | ✅ | Portfolio/PnL/Related working |
| Tenderly MCP | ✅ | EOA confirmed both chains |
| Arkham REST | ✅ | base= param for target-specific transfers |
| Moralis REST | ✅ | v2.2 key, wallet history multi-chain |
| GoPlus REST | ✅ | No flags |
| Etherscan V2 + Chainstack RPC | ✅ | Base via Chainstack (Etherscan free blocks Base) |
| QuickNode RPC | ✅ | Full endpoint restored (31644/) |
| Bitquery | ⏭ | Skipped — quota exhausted, client_id partial |

Script: `intelligence/red_web/warden_forensic_scan.py` (v2.2, 1064 lines)

---

## Next Steps (GL-L60 / GL-L61)

1. **ID contract 0x6150d420** — pull source from Basescan, decode 0x5c43fcf6
2. **Walk kill chain up** — scan 0xCF6323, 0x309133, 0x3ec897 (gas funders)
3. **Walk origin trail** — scan 0x07bdda (First Funder Base), 0x4a175c (First Funder Avalanche)
4. **Walk kill chain down** — scan BSC USDT bridge exit and Solana 5ndLnEYq
5. **Bitquery client_id** — locate full ID (64c4d323 is partial)

---

*GL-L60 | TheWarden | 2026-06-10 | Continuous save active*
