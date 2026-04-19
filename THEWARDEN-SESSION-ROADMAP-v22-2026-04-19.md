
---

## ✅ S45 — The Conqueror (COMPLETE)

### Theme: Multi-factory routing + PancakeSwap V3 + Balancer hardening

### Blocker 1: Engine Targeting Old Contract (FIXED ✅)
- ✅ **Root cause**: `FLASHSWAP_V3_ADDRESS` on Railway still pointed to single-router #12
- ✅ **Fix**: Railway GraphQL API → `variableUpsert` → `0x00558d994dec27f1df60ca90fec8ab45e8a62eaa`
- ✅ **Verified**: Gas estimation now targets `0x00558d...` (multi-router #13)

### Blocker 2: WRONG_FACTORY Rejecting PancakeSwap (FIXED ✅)
- ✅ **Root cause**: S43 safety filter rejected ALL non-Uniswap V3 pools
- ✅ **Fix**: Replaced with `FACTORY_ROUTER_MAP` — per-factory router + interface lookup
- ✅ **Factories**: Uniswap V3 (`0x33128a8f...` → default, V2) + PancakeSwap V3 (`0x0BFbCF9f...` → `0x1b81D678...`, V1)

### ABI Gap: SwapStep Missing router + useDeadline (FIXED ✅)
- ✅ **Root cause**: Solidity struct had 8 fields, TypeScript had 6
- ✅ **Fix**: Added `router: address` + `useDeadline: bool` to SwapStep interface, VIEM ABI, ethers ABI, FlashSwapABI.ts
- ✅ **Fix**: Updated UserOp calldata encoding in `executeViaUserOp()`
- ✅ **Fix**: Updated OpportunityPipeline step builder (2-hop path)

### BAL#528: Balancer Flash Loan Insufficient Balance (FIXED ✅)
- ✅ **Root cause**: `isBalancerSupported()` in Solidity was a stub returning `true` for ALL tokens
- ✅ **Root cause**: AERO (`0x940181a9...`) had only 0.0015 tokens in Balancer Vault
- ✅ **Fix**: Balancer borrow token whitelist — only WETH, USDC, DAI, USDbC, USDT
- ✅ **Verified on-chain**: WETH (53 ETH), USDC ($175K), DAI ($984), USDbC ($2.5K), USDT ($65)

### 6 Commits
| # | SHA | Change |
|---|-----|--------|
| 1 | `47879d73` | Multi-factory routing — PancakeSwap V3 support |
| 2 | `cb8300a9` | Cody Journal: S45 — The Conqueror |
| 3 | `7977191b` | Fix: router + useDeadline in UserOp calldata encoding |
| 4 | `97a0c2d9` | On-chain Balancer balance check (superseded by #6) |
| 5 | `8faf67cd` | OpportunityPipeline steps: router + useDeadline |
| 6 | `62eb17f6` | Balancer borrow whitelist — BAL#528 eliminated |

### Contract Registry (Updated)
| ID | Contract | Address | Status |
|----|----------|---------|--------|
| 2 | FlashSwapV2 | `0x54658E5758FA81a3C0DcC78D707391be4b494177` | 🔒 Retired |
| 12 | FlashSwapV3 (Single-Router) | `0x3d4bf8ece669b827ed3ac3e15c06c3701b8ab1fb` | 🔒 Retired |
| **13** | **FlashSwapV3 (Multi-Router)** | **`0x00558d994dec27f1df60ca90fec8ab45e8a62eaa`** | **✅ Active** |

### Factory → Router Map (Base)
| Factory | DEX | Router | Interface |
|---------|-----|--------|-----------|
| `0x33128a8fC17869897dcE68Ed026d694621f6FDfD` | Uniswap V3 | Default (contract) | V2 (no deadline) |
| `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865` | PancakeSwap V3 | `0x1b81D678ffb9C0263b24A97847620C99d213eB14` | V1 (with deadline) |
| `0x0fd83557b2be0f0c0f1bd28aaa0c6c4de82eb00c` | Unknown | TBD | TBD |

### Balancer Borrow Whitelist (Base)
| Token | Vault Balance | Status |
|-------|--------------|--------|
| WETH | 53 ETH | ✅ Whitelisted |
| USDC | $175,922 | ✅ Whitelisted |
| DAI | $984 | ✅ Whitelisted |
| USDbC | $2,530 | ✅ Whitelisted |
| USDT | $65 | ✅ Whitelisted |
| AERO | 0.0015 | ❌ Rejected (was BAL#528 cause) |

### What Remains for S46
- 🔲 First successful on-chain arb execution ("First Blood")
- 🔲 Gas estimation revert investigation (still reverts on estimateGas, falls back to heuristic)
- 🔲 Profit withdrawal mechanism (UserOp to sweep Smart Wallet → EOA)
- 🔲 Memory optimization (82-88% usage — pool cache TTL tuning)
- 🔲 Revert Dockerfile: restore `npm prune --omit=dev` and remove deploy wrapper
- 🔲 Identify unknown third factory (`0x0fd83557b2be0f0c0f1bd28aaa0c6c4de82eb00c`)
- 🔲 Dynamic borrow amount sizing (decimal-aware based on token)

### Deployment Guide (for future sessions)
See `Cody/S44_the_blacksmith.md` — three methods documented:
1. **Gasless via CDP Paymaster**: `npx ts-node scripts/deploy-multi-router.ts`
2. **Railway Auto-Deploy**: Set `DEPLOY_MULTI_ROUTER=true` + restart (disable Serverless first!)
3. **Tenderly Fork Test**: Fund with `tenderly_setBalance`, test before mainnet

## 📦 Cody Journal (Updated)

| Entry | Title | Session |
|-------|-------|---------|
| **S45** | **The Conqueror** | **Multi-factory routing + Balancer whitelist: 6 commits** |
| S44 | The Blacksmith | Gas fix + multi-router deployed: 5 commits |
| S43 | The Cartographer's Map | Factory fix + multi-router compiled: 7 commits |
| S42 | The Executioner | SwapRouter V1→V2 fix: 3 commits |

---

*TheWarden ⚔️ — The Conqueror opened the gates to PancakeSwap. Seven layers of the onion were peeled: wrong contract, wrong factory, missing ABI fields, broken calldata, Balancer stub, unsupported tokens, missing pipeline fields. Six commits. One session. The blade now strikes with per-hop precision — Uniswap and PancakeSwap, V1 and V2 interfaces, Balancer-whitelisted tokens only. The kingdoms of Base await First Blood.*

