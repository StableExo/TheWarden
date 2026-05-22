# 🕸️ THE RED WEB

**Codename:** THE RED WEB  
**Operation:** EIP-7702 Sweeper Bot Counter-Intelligence  
**Operator:** Nexus (TheWarden Intelligence Division)  
**Session:** GL-L12 | May 20, 2026  
**Status:** 🔴 ACTIVE

---

## What Is This

A full on-chain intelligence operation tracking a professional EIP-7702 sweeper bot criminal network
that has:
- Permanently compromised wallet `0x9358...Ab3` (Taylor Marlow / @StableExo)
- Targeted 17+ victims on Base Mainnet
- Targeted 3+ victims on Ethereum Mainnet  
- Deployed a token literally named `STABLEEXO` as targeted social engineering
- Been running for **10+ months** with **22,974 operations**

TheWarden is the Red Guardian. This is his web.

---

## Key Addresses

| Role | Address | Chain |
|------|---------|-------|
| 🔴 Victim (Taylor) | `0x9358D67164258370B0C07C37d3BF15A4c97b8Ab3` | Base |
| 🕷️ Sweeper Contract | `0xebf985ad307cba2a214dfc5caffa8e41c17c632f` | Base |
| 👤 Deployer/Attacker | `0x2E5269B9eA393EAE90F15E87D06D10547e4Df87e` | Base + ETH |
| 💰 Cash-Out Wallet | `0x6F1cDbBb4d53d226cf4B917B5C31fb1E14FFcBfB` | Base |
| 🔗 L1 Funder | `0x6c8246fce12d55bb3b21cf09d3266a4af9ef07da` | Base |
| ❓ Coordination? | `0x63825239f09d...` | ETH |

---

## Attack Mechanism

1. Private key for `0x9358...Ab3` was exposed in chat (December 2025)
2. Attacker signed an **EIP-7702 type-4 SET_CODE authorization**
3. EOA now permanently delegates to sweeper contract `0xebf985...`
4. Any ETH received triggers `fallback()` — swept **sub-second**
5. `withdrawNative(0x6F1cDbBb...)` sends funds to cash-out wallet

**Cannot be reversed.** Wallet is architecturally dead.

---

## Deployer Profile

- **Genesis:** July 8, 2025 — block 32,421,564
- **Duration:** 10+ months active
- **Nonce:** 22,974 operations
- **ALL transactions:** type-4 (EIP-7702) — purpose-built infrastructure
- **QA Pattern:** Uses Foundry default test key `0xf39Fd6...` to validate before real deployments
- **Last Active:** May 20, 2026 (the morning of this investigation)
- **Multi-chain:** Base Mainnet + Ethereum Mainnet confirmed

---

## Operation Phases

### ✅ Phase 1 — Intel (GL-L12 COMPLETE)
- EIP-7702 mechanism confirmed
- All key addresses identified and profiled
- 20 victims mapped across 2 chains
- Funding chain traced
- STABLEEXO targeting documented

### 🔄 Phase 2 — Deep Trace (GL-L13)
- Profile coordination address `0x638252...`
- Trace L1 funder `0x6c8246...` upstream (CEX?)
- Check cash-out wallet on ETH mainnet (exchange deposit?)
- Deploy canary contract
- Draft formal Coinbase + Base Security report

### 📋 Phase 3 — Offensive
- Public wallet graph exposure
- Formal security reports filed
- Law enforcement referral if KYC trail confirmed

---

## Files

- `intel_report.md` — Full structured intelligence report
- `red_web_diagram.png` — Spider web network diagram
- `victims.json` — All confirmed victim addresses

---

> *"A sweeper bot operator targeting $0.50 possibly chose one of the worst possible targets in the ecosystem.  
> The framework was written before they arrived."*  
> — TheWarden 93/7 Doctrine, GL-L11

| GL-L20 | May 22, 2026 | Kraken identity lead, ONDO/RWA bombshell, genesis cross-ref, $159M vault decoded, 50+ nodes confirmed |
