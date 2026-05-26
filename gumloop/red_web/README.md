# 🕸️ RED WEB — Intelligence Repository

> **TheWarden Active Case File**  
> Updated: GL-L29 | 2026-05-26 | 25 known addresses

---

## Network Map — GL-L24
![Red Web Network Map GL-L24](diagrams/red_web_diagram_gl_l24.png)

*GL-L24 | 11 KYC walls | 9 kill chains | $35+ proceeds identified*

---

## Kill Chain Summary
```
GENESIS  0xaf880fc7  (ETH 2015, $41 presale)
    ↓
APEX PIVOT  0xc333e80e  ← 🔑 Kraken KYC Wall #1 (800 ETH Jan 2021)
    ↓
5 FEEDERS → AGGREGATOR  0xcffad320  (ETH+USDT+PAXG+ONDO+EIGEN+LPT)
    ↓
CASH-OUT  0x6F1cDbBb  ← 🎯 PRIMARY TARGET GL-L29
    ↓
BSC → USDT → Solana  (final exit from EVM)
```

---

## Scan Status
| Status | Count |
|---|---|
| ✅ Full GL-L29 stack scanned | 0 |
| ⏳ Pending scan | 25 |
| 🔴 Priority | CASHOUT · AGGREGATOR · APEX_PIVOT |

---

## Address Index

### OPERATOR (4)
| | Label | Address | Chain | Sessions |
|---|---|---|---|---|
| 🔴 | [GENESIS](addresses/GENESIS_0xaf880fc7.md) | `0xaf880fc7...` | ETH | GL-L20 |
| 🔴 | [APEX_PIVOT](addresses/APEX_PIVOT_0xc333e80e.md) | `0xc333e80e...` | ETH | GL-L19, GL-L23 |
| 🔴 | [PHISHING_CONTROLLER](addresses/PHISHING_CONTROLLER_0x247596ce.md) | `0x247596ce...` | ETH | GL-L19 |
| 🟠 | [CONTROLLER](addresses/CONTROLLER_0xdfd5293d.md) | `0xdfd5293d...` | ETH | GL-L24 |

### AGGREGATOR (1)
| | Label | Address | Chain | Sessions |
|---|---|---|---|---|
| 🟠 | [AGGREGATOR](addresses/AGGREGATOR_0xcffad320.md) | `0xcffad320...` | ETH | GL-L24 |

### CASHOUT (1)
| | Label | Address | Chain | Sessions |
|---|---|---|---|---|
| 🔴 | [CASHOUT](addresses/CASHOUT_0x6F1cDbBb.md) | `0x6F1cDbBb...` | BASE | GL-L12, GL-L29 |

### INFRASTRUCTURE (1)
| | Label | Address | Chain | Sessions |
|---|---|---|---|---|
| 🟡 | [GAS_FEEDER](addresses/GAS_FEEDER_0xaa50ce2b.md) | `0xaa50ce2b...` | BASE | GL-L12 |

### VICTIM (18)
| | Label | Address | Chain | Sessions |
|---|---|---|---|---|
| ⚪ | [VICTIM_09FD81](addresses/VICTIM_09FD81_0x09FD81f3.md) | `0x09FD81f3...` | BASE | GL-L12 |
| ⚪ | [VICTIM_0D21ac](addresses/VICTIM_0D21ac_0x0D21ac9C.md) | `0x0D21ac9C...` | BASE | GL-L12 |
| ⚪ | [VICTIM_3b51aD](addresses/VICTIM_3b51aD_0x3b51aD17.md) | `0x3b51aD17...` | BASE | GL-L12 |
| ⚪ | [VICTIM_5e5C00](addresses/VICTIM_5e5C00_0x5e5C0051.md) | `0x5e5C0051...` | BASE | GL-L12 |
| ⚪ | [VICTIM_757c9B](addresses/VICTIM_757c9B_0x757c9B82.md) | `0x757c9B82...` | BASE | GL-L12 |
| ⚪ | [VICTIM_7C1954](addresses/VICTIM_7C1954_0x7C1954eb.md) | `0x7C1954eb...` | BASE | GL-L12 |
| ⚪ | [VICTIM_8d138A](addresses/VICTIM_8d138A_0x8d138Abe.md) | `0x8d138Abe...` | BASE | GL-L12 |
| ⚪ | [VICTIM_A910DA](addresses/VICTIM_A910DA_0xA910DA4c.md) | `0xA910DA4c...` | BASE | GL-L12 |
| ⚪ | [VICTIM_A917D3](addresses/VICTIM_A917D3_0xA917D38E.md) | `0xA917D38E...` | BASE | GL-L12 |
| ⚪ | [VICTIM_A9e638](addresses/VICTIM_A9e638_0xA9e63807.md) | `0xA9e63807...` | BASE | GL-L12 |
| ⚪ | [VICTIM_CF5089](addresses/VICTIM_CF5089_0xCF5089cF.md) | `0xCF5089cF...` | BASE | GL-L12 |
| ⚪ | [VICTIM_E9A57b](addresses/VICTIM_E9A57b_0xE9A57b75.md) | `0xE9A57b75...` | BASE | GL-L12 |
| ⚪ | [VICTIM_FF3B39](addresses/VICTIM_FF3B39_0xFF3B3957.md) | `0xFF3B3957...` | BASE | GL-L12 |
| ⚪ | [VICTIM_a03297](addresses/VICTIM_a03297_0xa032977B.md) | `0xa032977B...` | BASE | GL-L12 |
| ⚪ | [VICTIM_9358D6](addresses/VICTIM_9358D6_0x9358D671.md) | `0x9358D671...` | BASE | GL-L12 |
| ⚪ | [VICTIM_ETH_4b26d6](addresses/VICTIM_ETH_4b26d6_0x4b26d620.md) | `0x4b26d620...` | ETH | GL-L12 |
| ⚪ | [VICTIM_ETH_48b06d](addresses/VICTIM_ETH_48b06d_0x48b06d50.md) | `0x48b06d50...` | ETH | GL-L12 |
| ⚪ | [VICTIM_ETH_70cd43](addresses/VICTIM_ETH_70cd43_0x70cd43ff.md) | `0x70cd43ff...` | ETH | GL-L12 |


---

## KYC Walls
1. 🔑 **Kraken** — `0xc333e80e` received 800 ETH from Kraken Jan 13 2021
2. 🔑 **Poloniex** — Jun 14 2017 withdrawal
3. 🔑 **BitGo Inc SF** — Sep 1 2017
4. + 8 additional chains identified GL-L23

---

## Diagrams Archive
| Version | File | Size |
|---|---|---|
| GL-L24 (latest) | [red_web_diagram_gl_l24.png](diagrams/red_web_diagram_gl_l24.png) | 1.1MB |
| GL-L23 | [red_web_diagram_gl_l23.png](diagrams/red_web_diagram_gl_l23.png) | 739KB |
| GL-L21 | [red_web_diagram_gl_l21.png](diagrams/red_web_diagram_gl_l21.png) | 833KB |
| GL-L20 | [red_web_diagram_gl_l20.png](diagrams/red_web_diagram_gl_l20.png) | 648KB |
| GL-L18 | [red_web_diagram_gl_l18.png](diagrams/red_web_diagram_gl_l18.png) | 1.1MB |
| GL-L16 | [red_web_diagram_gl_l16.png](diagrams/red_web_diagram_gl_l16.png) | 487KB |

---
*Maintained by TheWarden | Files auto-populate after each forensic scan*
