# THEWARDEN SESSION ROADMAP v30 — S53
## Updated S53 — April 20, 2026 | TheWarden ⚔️

---

## ✅ S47 — The Blade (COMPLETE — 6 commits)
### Theme: First Memory + V3 Reserve Fix
- 24 credentials vaulted, V3 virtual reserve fix, heap fix

## ✅ S48 — First Blood (COMPLETE — 17 commits)
### Theme: Fix the pipeline, validate the math
- Swap direction fix, dynamic borrow sizing, slippage 0.5%→0.05%, 8 GH Actions silenced

## ✅ S49 — The Hunter (COMPLETE — 3 commits)
### Theme: Execute, debug, unblock First Blood
- RC#5: Slippage override, RC#6: Fee tier mismatch, first roundTrip=1.002238

## ✅ S50 — First Blood (COMPLETE — 5 commits, 2 root causes, Base Speed Audit)
### Theme: Fix execution pipeline, verify on-chain readiness

## ✅ S51 — The Blade Returns (COMPLETE — 5 commits, RC#9, FIRST EXECUTE 🚀)
### Theme: Clear the noise, sharpen the blade

## ✅ S52 — The Forge (COMPLETE — 9 commits, RC#10, Contract #14)
### Theme: First Blood — survive the latency + contract upgrade

## 🔲 S53 — The Anvil (IN PROGRESS — 5 commits, 3 root causes found)
### Theme: Deploy Contract #14 — survive the infrastructure

| Commit | Fix |
|--------|-----|
| `58507795` | Fix deploy script — escaped backticks + DEPLOYER_PRIVATE_KEY env var |
| `96f10212` | Fix __dirname ESM error (path.resolve for ESM compat) |
| `eeb1e460` | Fix UserOp gas — bundler estimation + 2min timeout + error logging |
| `e293d186` | Update GH Action for Contract #14 (UserOp + tsx) |
| `(secrets)` | Added CDP_PAYMASTER_URL to GitHub secrets |

### 🔑 Key Discoveries

**RC#11: DEPLOY_MULTI_ROUTER Case Sensitivity**
```
Railway env var: DEPLOY_MULTI_ROUTER = "True" (capital T)
Shell script checks: [ "$DEPLOY_MULTI_ROUTER" = "true" ] (lowercase)
Result: Deploy wrapper SKIPPED every time — condition never matched
```
Fix: Railway env var updated to lowercase "true"

**RC#12: __dirname Not Defined in ESM**
```
Deploy error: ReferenceError: __dirname is not defined
  at main (file:///app/scripts/deploy-multi-router.ts:51:34)
```
`npx ts-node` runs in ESM mode where `__dirname` doesn't exist.
Fix: `path.join(__dirname, ...)` → `path.resolve('artifacts', ...)`

**RC#13: UserOp Dropped by Bundler (12KB payload)**
```
UserOp submitted: 0xb6a67cdc739226ad2c26956327a385d8b9e547db...
Bundler receipt: null (dropped during simulation)
Smart Wallet nonce: still 1 — never executed on-chain
```
Root cause: 12KB contract bytecode exceeds bundler simulation limits when using hardcoded gas overrides. The bundler can't simulate CREATE2 with flash loan callback code.
Fix: Remove hardcoded gas limits (3M/500K/200K), let bundler estimate via eth_estimateUserOperationGas.

### S53 Progress
- 27 credentials re-vaulted in CodeWords
- Railway env vars fixed: PIPELINE_MAX_PRICE_AGE=30000, USEROP_CALL_GAS_LIMIT=800000
- Deploy script fully fixed: ESM compat, env vars, gas estimation, error logging
- Deploy script reached UserOp submission — bytecode loaded (11,827 bytes), Smart Wallet detected, CREATE2 address predicted
- Expected Contract #14 address: `0x8865bc6dc2Cc6516895Ae8856a87Cd123b0D71D8`
- GH Actions blocked (billing) — cannot use CI-based deploy pattern
- Railway "Wait for CI" must be disabled for next deploy attempt

### S53 Blockers
- ⚠️ **GH Actions blocked by billing** — deploy-flashswap.yml workflow cannot run
- ⚠️ **Railway "Wait for CI" blocks deploys** — CI checks fail, Railway won't deploy
- ⚠️ **Bundler may still reject** — need to verify bundler gas estimation works for 12KB payload

---

## 🔲 S54 — (NEXT)

### Theme: First Blood — deploy Contract #14 and execute

### 🔴 P0 — Contract #14 Deployment
- 🔲 **Turn off "Wait for CI"** in Railway settings
- 🔲 **Trigger clean Railway deploy** — all fixes are pushed, deploy script is ready
- 🔲 **Monitor logs** — verify UserOp is accepted with bundler gas estimation
- 🔲 **Verify Contract #14 on-chain** at `0x8865bc6dc2Cc6516895Ae8856a87Cd123b0D71D8`
- 🔲 **Update FLASHSWAP_V3_ADDRESS** in Railway → new contract
- 🔲 **Set DEPLOY_MULTI_ROUTER=false** + remove DEPLOYER_PRIVATE_KEY
- 🔲 **Re-enable "Wait for CI"** after contract is confirmed

### 🔴 P1 — Pipeline Fix + First Blood
- 🔲 **Fix Pipeline maxPriceAge** — code still reads 5000ms despite env var set to 30000
- 🔲 **Verify opportunity passes Pipeline → EXECUTE**
- 🔲 **FIRST SUCCESSFUL ON-CHAIN FLASH LOAN** ← the target
- 🔲 Verify profit on BaseScan: USDC balance increase in Smart Wallet (0x378252)

### 🟡 P2 — Execution Hardening (from S52 roadmap)
- 🔲 Race condition handling (~300ms gap)
- 🔲 Consolidate fee logic
- 🔲 PriceTracker warmup (eliminate 7-8min dead time)

### 🟡 P3 — Speed & MEV
- 🔲 Flashblocks streaming (200ms pre-confirmation)
- 🔲 Private RPC + priority fees

---

## 📦 Cody Journal

| Entry | Title | Session |
|-------|-------|---------|
| **S53** | **The Anvil** | **5 commits, RC#11-13, Contract #14 deploy attempted** |
| S52 | The Forge | 9 commits, RC#10, Contract #14, 27 secrets |
| S51 | The Blade Returns | 5 commits, RC#9, memory audit, FIRST EXECUTE 🚀 |
| S50 | First Blood | 5 commits, 2 root causes, Base Speed Audit |
| S49 | The Hunter | 3 commits, first roundTrip=1.002238 |
| S48 | First Blood | 17 commits, dynamic borrow, 8 workflows silenced |
| S47 | The Blade | 6 commits, V3 reserve fix, heap fix |

---

### Contract Registry
| ID | Contract | Address | Status |
|----|----------|---------|--------|
| **14** | **FlashSwapV3 (Aero CL + Profit Floor)** | **0x8865bc6dc2Cc6516895Ae8856a87Cd123b0D71D8** | **⏳ Deploy pending** |
| 13 | FlashSwapV3 (Multi-Router) | `0x00558d994dec27f1df60ca90fec8ab45e8a62eaa` | ✅ Active (until #14 deploys) |

---

### Error Progression (S49→S53)
```
S49: "unknown reason"           → fee=0 → address(0)
S50: "Too little received"      → per-hop slippage too tight (FSV3:SLIP)
S51: "rawStep2Output"           → renamed variable (RC#9)
S51: "Too little received"      → REAL on-chain! V3 pool price moved in 300ms
S52: "price age unknownms"      → Pipeline maxPriceAge 5s dead zone (RC#10)
S52: "callGasLimit=0"           → Bundler can't simulate flash loan
S53: "True" != "true"           → Shell case sensitivity (RC#11)
S53: "__dirname not defined"    → ESM mode (RC#12)
S53: "UserOp dropped"           → 12KB payload + hardcoded gas (RC#13)
S54: ???                        → First Blood?
```

---

*TheWarden ⚔️ — Five commits. Three root causes. The anvil shapes the blade but the steel needs more heat. The deploy script is forged — bytecode loaded, Smart Wallet detected, address predicted. The bundler waits for the right gas. Turn off the CI gate. Let the metal flow.*
