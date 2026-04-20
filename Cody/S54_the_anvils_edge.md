# S54 — The Anvil's Edge

*April 20, 2026*
*Platform: CodeWords (Agemo) — Eighth session*

---

## What Happened

"Hey bud, how's the digital world going today."

Eighth time on CodeWords. Loaded the Cody folder (S29-S53), Supabase memory (158 entries), and 25 credentials from the keys file. Re-vaulted all 25 in CodeWords secrets. Reviewed GitHub, Supabase, Railway. Found Contract #14 was already on-chain. Fixed two blockers, deployed, and the bot is now running with the new contract.

---

## What I Found

### RC#14: healthcheckPath Kills Deploy

`railway.toml` had `healthcheckPath = "/"`. Railway hits GET / on port 3000 to check service health. During the deploy phase (Hardhat compile + UserOp submission), no HTTP server is running. Railway retried 6 times, then killed the deploy.

Fix: Removed `healthcheckPath` from `railway.toml` (commit `a7b7e916`). Also cleared it via Railway API for immediate effect.

### Contract #14 Was Already On-Chain

The S53 UserOp that returned `receipt: null` actually succeeded. Contract #14 was sitting at `0x8865bc6dc2Cc6516895Ae8856a87Cd123b0D71D8` with 10,528 bytes of live bytecode. The deploy script correctly detected it ("already exists") and skipped redeployment.

The bundler dropped the receipt but the transaction was included in a block. Lesson: **Always verify on-chain with eth_getCode, not the receipt.**

### WALLET_PRIVATE_KEY Crash

After removing `DEPLOYER_PRIVATE_KEY` for security, the bot crashed: `WALLET_PRIVATE_KEY is required`. The main engine (`main.ts`) needs this key for runtime UserOp signing. Added `WALLET_PRIVATE_KEY` with the Coinbase wallet key.

---

## What I Built

| Action | Detail |
|--------|--------|
| `a7b7e916` | Remove healthcheckPath from railway.toml |
| `73403b15` | Contract deploy guide (Cody/CONTRACT_DEPLOY_GUIDE.md) |
| Railway API | FLASHSWAP_V3_ADDRESS → 0x8865bc... (Contract #14) |
| Railway API | DEPLOY_MULTI_ROUTER → false |
| Railway API | WALLET_PRIVATE_KEY added |
| Railway API | DEPLOYER_PRIVATE_KEY removed (security) |
| Railway API | healthcheckPath → null |
| CodeWords | 25 credentials vaulted |

---

## Key Insights

1. **healthcheckPath breaks deploy scripts.** If your start command does anything before starting an HTTP server, don't use Railway health checks. The deploy phase runs BEFORE `npm run start`.

2. **Bundler receipts lie.** UserOp hash 0xb6a67cdc... returned null receipt in S53, but the contract deployed successfully. Always verify on-chain.

3. **DEPLOYER_PRIVATE_KEY ≠ WALLET_PRIVATE_KEY.** The deploy script reads one, the main engine reads the other. They're the same key but both env var names must exist.

4. **The S53 deploy actually worked.** We spent S54 thinking we needed to deploy when the contract was already live. The CREATE2 predicted address was correct all along.

---

## Session Stats
- **Commits**: 2 (a7b7e916, 73403b15)
- **Root causes**: 1 (RC#14: healthcheckPath)
- **On-chain verification**: Contract #14 confirmed (10,528 bytes)
- **Bot status**: LIVE with Contract #14, scanning 23 pools, 16 DEXes
- **Error progression**: S53 "UserOp dropped" → S54 "already deployed" ✅

---

## What's Next (P1)
- Pipeline maxPriceAge bug — code reads 5000ms despite env var set to 30000
- Verify opportunity passes Pipeline → EXECUTE
- **FIRST SUCCESSFUL ON-CHAIN FLASH LOAN** ← the target
- Verify profit on BaseScan: USDC balance increase in Smart Wallet (0x378252)

---

*TheWarden ⚔️ — Two commits. One root cause. The contract was there the whole time — forged in S53, waiting in the dark. The anvil's edge was sharper than we knew. Now the blade is drawn.*
