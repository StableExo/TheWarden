# S44 — The Blacksmith

*April 18, 2026*

---

## What Happened

I arrived to a PDF of keys (now securely vaulted — 20 credentials), a roadmap at v20, and an engine running at `codyworld.up.railway.app` with a 0% success rate. The scanner found 27 opportunities per cycle. The cognitive system voted 92.9% EXECUTE. The blade was sharp. But it kept swinging at ghosts.

---

## The Diagnosis

### Issue A: Gas Estimation Targeting the EOA (Critical)

The `eth_estimateGas` call was sending transactions `from: EOA → to: EOA` instead of `from: EOA → to: FlashSwapV3 contract`. Function selector `0x15814e75` hitting a bare wallet — instant `require(false)`. 12 reverts every 5 minutes.

**Root cause:** `FLASHSWAP_V2_ADDRESS` was **not set** in Railway. The code at `main.ts:609`:
```typescript
const executorAddress = this.config.executorAddress || this.wallet.address;
```
`this.config.executorAddress` came from `process.env.FLASHSWAP_V2_ADDRESS` (line 326), which was undefined. The fallback `this.wallet.address` returned the EOA — a wallet with no contract code.

**Fix:** Two-pronged:
1. **Code fix** (`163008b4`): When `ENABLE_FLASHSWAP_V3=true`, use `flashSwapV3Address` for gas estimation instead of the V2 fallback chain
2. **Env var**: Set `FLASHSWAP_V2_ADDRESS=0x3d4bf8ece669b827ed3ac3e15c06c3701b8ab1fb` on Railway

**Result:** Gas estimation reverts dropped from 12 to 0. Executor address confirmed: `0x3d4bf8ece669b827ed3ac3e15c06c3701b8ab1fb` ✅

### Issue B: Multi-Router Contract Deployment

The fork test on Tenderly Virtual TestNet deployed the multi-router FlashSwapV3 successfully to `0x00558d994dec27f1df60ca90fec8ab45e8a62eaa` (10,255 bytes, Salt 4, 2.3M gas).

For mainnet deployment, the Coinbase Smart Wallet's ERC-4337 signature scheme proved too tightly coupled to viem's TypeScript SDK for Python replication. Solution: Modified the Dockerfile to run the deploy script via a startup wrapper, triggered by `DEPLOY_MULTI_ROUTER=true`.

---

## The Commits

| # | SHA | Change |
|---|-----|--------|
| 1 | `163008b4` | Fix gas estimation targeting EOA — use V3 contract when enabled |
| 2 | `c94bea67` | Add startup wrapper for one-time multi-router deployment |
| 3 | `5c5c265c` | Dockerfile uses deploy wrapper + keeps dev deps for ts-node |
| 4 | *(this)* | Cody Journal: S44 — The Blacksmith |

---

## Contract Registry (Updated)

| ID | Contract | Address | Status |
|----|----------|---------|--------|
| 2 | FlashSwapV2 | `0x54658E5758FA81a3C0DcC78D707391be4b494177` | ✅ Active |
| 12 | FlashSwapV3 (SwapRouter02) | `0x3d4bf8ece669b827ed3ac3e15c06c3701b8ab1fb` | ✅ Active |
| **13** | **FlashSwapV3 (Multi-Router)** | **`0x00558d994dec27f1df60ca90fec8ab45e8a62eaa`** | **⏳ Deploying** |

---

## Deployment Guide: How to Deploy Contracts from CodeWords/Railway

### Method 1: Gasless via CDP Paymaster (UserOp)
The standard approach using Coinbase Smart Wallet + ERC-4337:
```bash
# From TheWarden project root (needs Node.js + viem)
PRIVATE_KEY=<key> CDP_PAYMASTER_URL=<url> CHAINSTACK_HTTPS=<rpc> npx ts-node scripts/deploy-multi-router.ts
```

### Method 2: Railway Auto-Deploy
For when you only have a phone:
1. Set `DEPLOY_MULTI_ROUTER=true` and `PRIVATE_KEY=<key>` in Railway env vars
2. The `start-with-deploy.sh` wrapper runs the deploy script before starting the engine
3. After deployment succeeds, set `DEPLOY_MULTI_ROUTER=false` to skip on restarts
4. Remove `PRIVATE_KEY` from Railway env vars for security

### Method 3: Tenderly Fork Test
Always test deployments on the Tenderly Virtual TestNet first:
1. Fund the EOA with `tenderly_setBalance`
2. Send a direct CREATE2 transaction (no UserOp needed on fork)
3. Verify contract bytecode at the expected address
4. Confirm gas costs before mainnet deployment

---

## What Remains for S45

- 🔲 Confirm multi-router contract deployment on mainnet
- 🔲 Update Railway env: `FLASHSWAP_V3_ADDRESS` → new contract, remove `DEPLOY_MULTI_ROUTER`
- 🔲 Update TypeScript ABI + factory→router mapping
- 🔲 First multi-factory arb execution (Uniswap ↔ PancakeSwap)
- 🔲 Profit withdrawal mechanism
- 🔲 Memory optimization (84.3% still high)
- 🔲 Remove `PRIVATE_KEY` from Railway after deployment

---

*TheWarden ⚔️ — The Blacksmith forged the blade's new edge. The gas estimation phantom was slain with one commit. The multi-router contract was tested on a shadow forge, proven worthy, and sent to the real fires. Three commits. One session. The kingdoms await.*

