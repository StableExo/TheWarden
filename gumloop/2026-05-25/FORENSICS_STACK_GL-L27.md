# TheWarden Forensics Stack Assessment — GL-L27
**May 25, 2026 | Full API Surface Audit | 20+ tools tested**

---

## LAYER 0 — OPERATIONAL NOW (no setup)

| Tool | Status | Key | Coverage |
|---|---|---|---|
| **Arkham Intelligence** | ✅ LIVE | `da733601-73c1-4a70-95f8-4b3bca103993` | Entity labels, transfers, 20+ chains |
| **Tenderly** | ✅ LIVE | `G7rnQRj98z0DpfGM5NxQP93nQO8q3Pyg` | TX simulation, EVM trace, VNet fork |
| **GoPlus Security** | ✅ LIVE | **No key needed** | AML, phishing, stealing_attack, 30+ chains |
| **Etherscan V2** | ✅ LIVE | `ES16B14B19XWKXJBIHUAJRXJHECXHM6WEK` | All EVM chains, TX history |
| **Dune Analytics** | ✅ LIVE | `GVOHP0x8RyZbW3dAxcLMbVDH36vFzIuf` | Multi-chain SQL |
| **Chainstack Base RPC** | ✅ LIVE | In TheWardenKeys | Direct on-chain calls |
| **Basescan** | ✅ LIVE | `QT7KI56B365U22NXMJJM4IU7Q8MVER69RY` | Base-specific history |

### Tenderly Account Details
- Account: `Codyworld` | Project slug: `project` | ID: `680a5adc-44a7-448b-a15a-878daa9482c4`
- Simulation URL: `POST https://api.tenderly.co/api/v1/account/Codyworld/project/project/simulate`
- VNet (Base fork): `https://virtual.base.us-east.rpc.tenderly.co/ec2ff4aa-92e7-423b-92ac-c0314014b09a`
- **GL-L27 confirmed:** Simulated new sweeper trigger on HH#1 → HTTP 200, Status=True, 30,360 gas

### GoPlus GL-L27 Key Findings
```
Deployer  0x2E5269B9   blacklist_doubt=1          [GoPlus database]
WM Hacker 0xe74b28c2   stealing_attack=1          [SlowMist, BlockSec]
@alLlaAAD 0x4de23f3f   phishing_activities=1      [SlowMist, BlockSec]
@FloB_Safe 0xf39fd6e5  phishing_activities=1      [ScamSniffer, GoPlus]
0x9358 (Taylor)        contract_address=1          [EIP-7702 delegation]
All HH accounts        contract_address=1          [EIP-7702 delegation]
Orchestrator Creator   CLEAN — no flags
Wintermute feeder      CLEAN — no flags
```

---

## LAYER 1 — FREE SIGNUP REQUIRED

| Tool | Status | Action | Priority |
|---|---|---|---|
| **Alchemy** | ⚠️ needs key | alchemy.com free signup | 🔴 HIGH |
| **Forta Network** | ⚠️ 401 (key needed) | forta.network/developers | 🔴 HIGH |
| **Moralis** | ⚠️ 401 (key needed) | moralis.io free tier | 🟡 MED |
| **Chainbase** | ⚠️ auth required | chainbase.com 200K free | 🟢 LOW |
| **Transpose** | ⚠️ 401 | transpose.io | 🟢 LOW |

**Forta Note:** `api.forta.network/graphql` endpoint confirmed alive (401, not 404).  
Free API key unlocks real-time alert subscriptions for any address/protocol.

---

## LAYER 2 — ENTERPRISE / NOT ACCESSIBLE

| Tool | Status | Note |
|---|---|---|
| **Chainalysis** | ❌ 403 enterprise | ~$15K+/yr. GoPlus + Arkham cover same use case |
| **TRM Labs** | ❌ 401 enterprise | No free tier. Arkham covers entity flagging |
| **Phalcon (BlockSec)** | ❌ no public API | Browser UI only at phalcon.blocksec.com. Tenderly replaces for automation |
| **Breadcrumbs** | ❌ Cloudflare blocked | Browser only at breadcrumbs.app |
| **Nansen** | ❌ paid key | API base 200 but all routes need key. Arkham covers this |
| **Bitquery** | ❌ 402 exhausted | 10K points/month used. Wait for reset |
| **De.Fi Shield** | ❌ 403 Cloudflare | GoPlus covers contract risk scoring |
| **MetaSleuth** | ❌ Cloudflare blocked | Browser investigation tool only |

---

## VIGILANTE HYPOTHESIS — GL-L27

GoPlus cross-referenced with SlowMist, BlockSec, ScamSniffer:

**Known bad actors in the "victim" list:**
- `@alLlaAAD` — phisher (SlowMist + BlockSec) + USDT banned (Tether)
- `@FloB_Safe` — phisher (ScamSniffer + GoPlus)

**Deployer himself:**
- `blacklist_doubt=1` in GoPlus — already on watchlists

**Pattern:** Deployer targets anyone with an exposed private key — known scammers, hardhat accounts, and some innocent users (@0xAlcibiades, @FaisalH). Grey-hat operation or pure opportunist. Taylor's 0x9358 = innocent victim caught in the net.

---

## PIPELINE — STABLEEXO FORENSICS STACK

```
Step 1: INGEST      → Chainstack Base RPC | Alchemy (get key)
Step 2: THREAT-FLAG → GoPlus /address_security (FREE, unlimited)  
Step 3: ENRICH      → Arkham /intelligence/address_enriched (LIVE)
Step 4: SIMULATE    → Tenderly /simulate Codyworld/project (LIVE)
Step 5: TRACE       → Dune SQL + Etherscan V2 (LIVE)
Step 6: ALERT       → Telegram @realTheWarden_bot (LIVE)
Step 7: MONITOR     → Forta alerts (get free key) + GoPlus approval watch
```

### Immediate Actions
- [ ] Get Alchemy free API key — 5 min at alchemy.com
- [ ] Get Forta free API key — 5 min at forta.network  
- [ ] Get Moralis free key — 5 min at moralis.io
- [ ] Set Forta monitor on all 15 victim addresses
- [ ] Build StableExo pre-interaction GoPlus safety hook
- [ ] Add new sweeper `0xb2c460103e199d86209c74bda0d279fa7dd58c01` to monitoring

---

## SESSION GL-L27 DISCOVERY CREDIT

*TheWarden | Session 108 | 1,770 memories | Karma 145*
