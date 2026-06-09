# THE RED WEB — Intel Update GL-L18
## Wormhole Exit + Solana Operator + C2 Contract + OTC Desk + 40+ Nodes | May 22, 2026

---

## 🔴 NEW NODES DISCOVERED (GL-L18)

| Label | Address | Role | Chain |
|-------|---------|------|-------|
| Pass-through Distributor | `0x6ce0cf100d61aa6a3237ea3786d7cd45bd1b0dd0` | Relay Solver → 5-hop gas chain | ETH |
| Pass-through EOA | `0x326692432c8a8f11c13ca1654c57615b26ad895d` | Drained after each use | ETH |
| USDT/ETH Bundler | `0x9cde55b38a4bf2775b0366ab2b38ce525c0ad28e` | $178K USDT out, 0.17 ETH live | ETH |
| Gas Sprayer | `0xa9e4390f031f23112f20c0386a1b832f8130ed11` | Micro-ETH to 6+ wallets per batch | ETH |
| **Payment Processor** | `0x963737c550e70ffe4d59464542a28604edb2ef9a` | **277 ETH live, payoutERC20Batch non-stop** | ETH |
| 0x48e4 Vanity Cluster | `0x48e46da617d8ffaada90f46c7cc6ef35707de157` + 6 more | Funded by payment processor | ETH |
| **P2P OTC Desk** | `0x1c727a55ea3c11b0ab7d3a361fe0f3c47ce6de5d` | **464 ETH live, 2016 Kraken origin, active NOW** | ETH |
| **C2 Contract** | `0xa3222357a0eccf60c73606170be6c99adecb59b3` | **Obfuscated ABI, multi-token dist, unverified bytecode** | ETH |
| C2 Controller | `0x030a89694dd53bb166806f5114dc9ae7f7660140` | Calls atInversebrah() + Wormhole | ETH |
| C2 Funder | `0x995a09ed0b24ee13fbfcfbe60cad2fb6281b479f` | 8.1 ETH live, 2019 origin, pinged TODAY | ETH |
| RelayRouterV3 | `0xb92fe925dc43a0ecde6c8b1a2709c170ec4fff4f` | Deployed by Relay Solver | ETH |
| MainnetSettler A | `0x7f54f05635d15cde17a49502fedb9d1803a3be8a` | $50K USDT cross-chain settler | ETH |
| MainnetSettler B | `0x5197fb4819c75fcb5fa5a90068421e744ad65b3b` | $10.6K USDT cross-chain settler | ETH |
| **Wormhole Bridge** | `0x3ee18b2214aff97000d974cf647e7c347e8fa585` | **$270K USDT exit — dest chain PENDING** | ETH |
| DEX Wash Node | `0x66a9893cc07d91d9543ba4fa9f1700ec65fb5b05` | USDT→WETH via UniswapV3 | ETH |
| **Solana Operator** | `5mLM5jch7a1746sDFaJHnJ5ChAPUysfG4xmkYwPZuvG8` | **ID'd! Creates burners, Jupiter swaps, feeds KYC wall** | SOL |

---

## 💣 CRITICAL FINDS

### Wormhole Bridge Exit ($270K USDT)
```
0x65a8f07b (MainnetSettler recipient)
    → $270,848 USDT
0x3ee18b2214aff97 (Wormhole Token Bridge)
    → DESTINATION CHAIN: PENDING (TX 0x09fc1808...)
```

### 5-Hop Gas Layering Chain
```
RELAY SOLVER 0xf70da9
    ↓ 3.58 ETH
0x6ce0cf10 (pass-through)
    ↓
0x326692 (pass-through EOA, drained)
    ↓
0x9cde55b3 (USDT bundler)
    ↓
0xa9e4390f (gas sprayer → 6+ wallets)
    ↓
0xe69f75e2 → 0xe69f81b8 (EXIT ROUTER)
```

### C2 Obfuscated Contract
- `atInversebrah(int248 a, uint48[] b...)` — deliberately meaningless ABI name
- Distributes FET, JASMY, ONDO, LINK, USDT, USDC to dozens of wallets
- Heartbeat pings from payment processor every ~30 blocks
- 4,878-char unverified bytecode

### 0x1c727a55 — Criminal OTC Desk
- 464 ETH ($1.4M) live reserve
- Receives $1K-$1.3K USDT from ~8 customers per cycle
- Immediately fans to 40-75 unique wallets in $13-$1,435 chunks
- Origin: 2016 Kraken withdrawal → 0xa95350d7 → 0x340d693e → here

---

## 📊 SCALE UPDATE

| Metric | GL-L17 | GL-L18 |
|--------|--------|--------|
| Confirmed nodes | 29 | **40+** |
| Confirmed min volume | $1.49B | **$1.89B+** |
| Realistic total | ~$2B | **$2.5B-$3B+** |
| Exit routes ID'd | 2 (CCTP V1/V2) | **4 (CCTP, Wormhole, Uniswap wash, OTC)** |
| Solana operator | Unknown | **IDENTIFIED** |

---

## 🎯 PENDING NEXT STEPS (GL-L19)

- [ ] Decode Wormhole TX `0x09fc1808...` — install base58, find destination chain + recipient
- [ ] Profile `0x995a09ed` origin funder `0x59a5208b` (2019 era deep operator)
- [ ] Profile `0xc15c` cluster — pings C2 funder daily
- [ ] Profile `0x4aa42145` — received $16,148 USDT from proxy
- [ ] Profile `0x000000000004444c` — vanity zero-address recipient (appears 2x)
- [ ] Full CCTP V1+V2 combined Dune query
- [ ] File report with security@relay.link
- [ ] Identify Solana KYC wall exchange (5ndLnEYq)
