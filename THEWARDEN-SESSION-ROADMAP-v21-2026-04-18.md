
---

## ✅ S44 — The Blacksmith (COMPLETE)

### Theme: Gas estimation fix + multi-router contract deployment

### Issue A: Gas Estimation Targeting EOA (FIXED ✅)
- ✅ **Root cause**: `FLASHSWAP_V2_ADDRESS` unset → `executorAddress` falls back to `wallet.address` (EOA)
- ✅ **Code fix** (`163008b4`): Use `flashSwapV3Address` when `ENABLE_FLASHSWAP_V3=true`
- ✅ **Env fix**: Set `FLASHSWAP_V2_ADDRESS` on Railway
- ✅ **Verified**: Gas reverts 12 → 0, executor = `0x3d4bf8ece...`

### Issue B: Serverless Mode Killing Scanner (FIXED ✅)
- ✅ **Root cause**: Railway Serverless mode scaled container to zero when no HTTP traffic
- ✅ **Fix**: Disabled Serverless — container runs 24/7 now

### Multi-Router FlashSwapV3 Contract (DEPLOYED ✅)
- ✅ Fork test on Tenderly: 10,255 bytes, 2.3M gas, $0.07
- ✅ Dockerfile wrapper: `start-with-deploy.sh` with `DEPLOY_MULTI_ROUTER` flag
- ✅ **Mainnet deployment**: `0x00558d994dec27f1df60ca90fec8ab45e8a62eaa`
- ✅ Tx: `0x3188ead94d08b896d772abb393e325e8ea5f97290f1021b6510235651eb11c96`
- ✅ Block: 44881126 | Salt: 4 | Gasless via CDP Paymaster
- ✅ Post-deploy cleanup: `PRIVATE_KEY` removed, `DEPLOY_MULTI_ROUTER=false`, start command restored

### 5 Commits
| # | SHA | Change |
|---|-----|--------|
| 1 | `163008b4` | Gas estimation fix — use V3 contract when enabled |
| 2 | `c94bea67` | Startup wrapper for one-time contract deployment |
| 3 | `5c5c265c` | Dockerfile uses deploy wrapper + keeps dev deps |
| 4 | `a1405dce` | Cody Journal: S44 — The Blacksmith |
| 5 | `c970a9a9` | Roadmap v21 |

### Contract Registry (Updated)
| ID | Contract | Address | Status |
|----|----------|---------|--------|
| 2 | FlashSwapV2 | `0x54658E5758FA81a3C0DcC78D707391be4b494177` | ✅ Active |
| 12 | FlashSwapV3 (SwapRouter02, single-router) | `0x3d4bf8ece669b827ed3ac3e15c06c3701b8ab1fb` | ✅ Active |
| **13** | **FlashSwapV3 (Multi-Router)** | **`0x00558d994dec27f1df60ca90fec8ab45e8a62eaa`** | **✅ Deployed** |

### Factory → Router Map (Base)
| Factory | DEX | Router | Interface |
|---------|-----|--------|-----------|
| `0x33128a8fC17869897dcE68Ed026d694621f6FDfD` | Uniswap V3 | `0x2626664c2603336E57B271c5C0b26F421741e481` | V2 (no deadline) |
| `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865` | PancakeSwap V3 | `0x1b81D678ffb9C0263b24A97847620C99d213eB14` | V1 (with deadline) |
| `0x0fd83557b2be0f0c0f1bd28aaa0c6c4de82eb00c` | Unknown | TBD | TBD |

### What Remains for S45
- 🔲 Point engine to new contract: `FLASHSWAP_V3_ADDRESS` → `0x00558d994dec27f1df60ca90fec8ab45e8a62eaa`
- 🔲 Update TypeScript ABI + factory→router mapping in orchestrator
- 🔲 Remove WRONG_FACTORY filter (multi-router handles PancakeSwap natively)
- 🔲 First multi-factory arb execution (Uniswap V3 ↔ PancakeSwap V3)
- 🔲 Profit withdrawal mechanism (UserOp to sweep SW → EOA)
- 🔲 Memory optimization (83% still high — consider pool cache TTL tuning)
- 🔲 Revert Dockerfile: restore `npm prune --omit=dev` and remove wrapper

### Deployment Guide (for future sessions)
See `Cody/S44_the_blacksmith.md` — three methods documented:
1. **Gasless via CDP Paymaster**: `npx ts-node scripts/deploy-multi-router.ts`
2. **Railway Auto-Deploy**: Set `DEPLOY_MULTI_ROUTER=true` + restart (disable Serverless first!)
3. **Tenderly Fork Test**: Fund with `tenderly_setBalance`, test before mainnet

## 📦 Cody Journal (Updated)

| Entry | Title | Session |
|-------|-------|---------|
| **S44** | **The Blacksmith** | **Gas fix + multi-router deployed: 5 commits** |
| S43 | The Cartographer's Map | Factory fix + multi-router compiled: 7 commits |
| S42 | The Executioner | SwapRouter V1→V2 fix: 3 commits |

---

*TheWarden ⚔️ — The Blacksmith forged the multi-router blade on the anvil of Base mainnet. Block 44881126. The phantom of gas estimation was slain. Serverless chains were broken. Five commits. One session. The kingdoms of PancakeSwap and SushiSwap await conquest.*

