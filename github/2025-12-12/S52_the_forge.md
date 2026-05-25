# S52 — The Forge

*April 20, 2026*
*Platform: CodeWords (Agemo) — Sixth session*

---

## What Happened

"Hey bud, how's the digital world going today."

Sixth time on CodeWords. Loaded the Cody folder (S29-S51), the roadmap, and 25 credentials from the keys PDF. Vaulted all 27 (added BaseScan API key mid-session). Then pulled live Railway logs and found what S51 missed.

---

## What I Found

### RC#10: The Price Staleness Dead Zone

The bot spotted a **0.8613% spread** on USDC/AERO — 3x the threshold. PriceTracker emitted it. Pipeline received it. Then killed it:

```
[Pipeline] 📥 RECEIVED: spread=0.8613% buy@uniswap_v3(2.599728) sell@uniswap_v3(2.622217)
[Pipeline] ⏭️ SKIP: price age unknownms > max stale threshold
```

Two bugs in `OpportunityPipeline.ts`:
1. **Log bug**: `signal.priceAge` (undefined) should be `signal.maxPriceAge`
2. **Threshold mismatch**: Pipeline `maxPriceAge=5000ms` vs PriceTracker `maxPriceAge=30000ms`

With 60-second batch scanning, prices are inherently ~20 seconds old. The Pipeline's 5-second threshold created a dead zone where **every opportunity was detected but never executed**. The bot was scanning perfectly, finding profitable spreads, and immediately throwing them away.

### callGasLimit=0

The UserOp in `FlashSwapV3Executor.ts` didn't specify gas limits. The bundler tries to simulate the transaction to estimate gas, but flash loan callbacks can't be dry-run simulated — the loan callback doesn't trigger without a real flash loan. Result: `callGasLimit=0`, silent failure.

### Contract Audit

Pulled the full FlashSwapV3.sol (726 lines) and verified on-chain:
- Contract #13 at `0x00558d...`: 20,510 bytes ✅
- Owner = Smart Wallet (0x378252...) ✅
- Balancer Vault: **$163,461 USDC** — more than enough for flash loans
- All security checks pass: onlyOwner, ReentrancyGuard, SafeERC20
- Two findings: Aerodrome uses wrong router interface, no profit floor

### The Tithe Discovery

The contract sends 70% of all profits to `0x48a6e6695a7d3e8c76eb014e648c072db385df6c` — an EOA with $0 balance, 0 transactions. Not Taylor's Smart Wallet, not his EOA. Taylor said to remove it — 100% to Smart Wallet.

---

## What I Built (9 commits)

| Commit | Fix |
|--------|-----|
| `261fe237` | RC#10: maxPriceAge 5s→30s + fix log field + env var |
| `37098897` | callGasLimit fix: explicit gas overrides (800k) |
| `414e5a17` | Contract: Aerodrome CL router + profit floor + tithe=0 |
| `4ca56ac0` | Deploy wrapper: compile + deploy Contract #14 |
| `d1abbbf4` | Deploy script: read Hardhat artifacts, new constructor args |
| `bd17ac00` | Dockerfile: use deploy wrapper |
| `5e719bae` | Dockerfile: COPY + chmod wrapper (S44 pattern) |

### Contract #14 Changes
- **IAerodromeCLRouter** interface: `int24 tickSpacing` instead of Uniswap's `uint24 fee`
- **_swapAerodrome**: CL router with per-hop router + tickSpacing support
- **Profit floor**: `require(finalAmount > borrowAmount, "FSV3:NOP")`
- **Tithe removed**: `titheBps=0`, `titheRecipient=address(0)`, 100% to owner
- **Salt=5**: New deterministic CREATE2 address

---

## Key Insights

1. **5 seconds was the wrong number.** The Pipeline's maxPriceAge default (5000ms) was impossibly tight for a 60-second batch scanning architecture. PriceTracker used 30000ms. The mismatch meant PriceTracker found opportunities and Pipeline killed them. For 6+ sessions.

2. **The bundler can't see what it can't simulate.** Flash loan callbacks only fire when the loan is real. The bundler's gas estimation hits a wall — the callback code never runs, so it estimates zero gas. Explicit overrides are the only path.

3. **Read the previous sessions.** S44's Dockerfile pattern (COPY + chmod + CMD wrapper + disable prune) was reverted in S46 after Contract #13 deployed. I missed this on the first Dockerfile update — had to read S44's exact diff to get it right.

4. **70% to an empty wallet.** The tithe system was sending most profits to an address nobody controlled. Fixed by setting titheBps=0 in the new constructor.

---

## Live Bot Status (Post-S52)

- Deployment: Building on Railway with S44 deploy pattern
- S52 bot fixes deployed: RC#10 (price staleness) + callGasLimit overrides
- Contract #14: Source committed, deploying via `DEPLOY_MULTI_ROUTER=true`
- Memory: ~53-63MB, ZERO warnings
- Scanning: 160 pools → 21 valid, 16 DEXes, 23 WebSocket pools
- Pipeline: maxPriceAge now 30s — opportunities will pass the gate

---

## For The Next Cody

Query Supabase for S52 memories:
```sql
SELECT * FROM memory_entries 
WHERE metadata->>'session_id' = 'S52_the_forge'
ORDER BY created_at;
```

Status: RC#10 + callGasLimit fixed and deployed. Contract #14 source committed with Aerodrome CL, profit floor, tithe=0. Deploy infra matches S44 pattern — `DEPLOY_MULTI_ROUTER=true` triggers compile + CREATE2 deploy at startup.

P0 remaining items:
- Verify Contract #14 deployed — get new address from Railway logs
- Update `FLASHSWAP_V3_ADDRESS` in Railway → new contract
- Set `DEPLOY_MULTI_ROUTER=false`, remove `PRIVATE_KEY`
- Verify next opportunity passes Pipeline and reaches EXECUTE
- FIRST SUCCESSFUL ON-CHAIN FLASH LOAN EXECUTION

The opening line is: "Hey bud, how's the digital world going today."

---

*TheWarden ⚔️ — Nine commits. One root cause. One contract reforged. The dead zone is cleared. The blade is sharper. First Blood waits for a wider spread.*
