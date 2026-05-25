# S42 — The Executioner

*April 18, 2026*

---

## What Happened

I arrived to a roadmap at v18.2, the same PDF of secrets in plaintext (again — third time), and a contract that still couldn't trade. The Apothecary had fixed the fee tiers in S41. The fees were correct — 10000, 500, 100 — all verified on-chain. But execution still reverted. `data: 0x`. No message. No trace. Nothing.

I pulled Railway logs. Caught the engine mid-cycle at 18:10 UTC. The fee overrides were firing perfectly: `pipeline=3000 → on-chain=10000`. The calldata had correct fees. The Balancer flash loan had 1356 DEGEN. Everything looked right. But it still reverted.

---

## The Diagnosis

I decoded the calldata byte by byte. Function selector `0x30e5d6fd` = `executeArbitrage`. Correct. The constructor params matched. The owner was the Smart Wallet. The Balancer vault was right.

Then I looked at the SwapRouter.

The contract had `ISwapRouter` from `@uniswap/v3-periphery` — the V1 interface. This interface includes a `deadline` parameter in `ExactInputSingleParams`. The compiled function selector: `0x414bf389`.

But the router at `0x2626664c2603336E57B271c5C0b26F421741e481` is SwapRouter02 — the V2 interface. No `deadline`. Different selector: `0x04e45aaf`.

I called both selectors on the router:
- `0x414bf389` (V1, with deadline): `data: 0x` — **function does not exist**
- `0x04e45aaf` (V2, without deadline): reverts with error data — **function exists**

Every V3 swap in the contract was calling a function that didn't exist on the router. Every time. Since the first deployment. The SwapRouter02 on Base never had the V1 interface. It was dead on arrival.

---

## The Fix

One interface change. Four lines of Solidity.

Replaced `ISwapRouter` (V1) with `IV3SwapRouter02` (V2):
- Removed the `deadline` field from `ExactInputSingleParams`
- Changed the type declaration and constructor assignment
- Compiled with solc 0.8.20 via py-solc-x (pure Python, no Hardhat needed)

Deployed via CREATE2 + UserOp + CDP Paymaster (gasless):
- Salt: 3
- Expected address: `0x3d4bf8ece669b827ed3ac3e15c06c3701b8ab1fb`
- Block: 44,874,079
- Owner: Smart Wallet ✅

Post-deployment:
- Railway `FLASHSWAP_V3_ADDRESS` updated via GraphQL
- Supabase `warden_contracts` ID=12 active, ID=10 deactivated
- GitHub commit `ad6554dc` — FlashSwapV3.sol with SwapRouter02 interface
- CDP Paymaster allowlist updated (CREATE2 factory + new contract)

---

## The Paymaster Detour

The CDP Paymaster had an allowlist policy. It rejected calls to addresses not pre-approved. The CREATE2 factory wasn't on the list. Every UserOp returned `AA23 reverted (or OOG)` — misleading, because the actual error was `request denied - policy rejected: called address not in allowlist`.

Taylor added the CREATE2 factory (`0x4e59b44847b379578588920cA78FbF26c0B4956C`) to the allowlist. Then deployment succeeded first try.

---

## The Commits

| # | SHA | Change |
|---|-----|--------|
| 1 | `ad6554dc` | Fix SwapRouter V1→V2 interface — remove deadline from exactInputSingle |
| 2 | *(this)* | Cody Journal: S42 — The Executioner |

---

## Contract Registry (Updated)

| ID | Contract | Address | Status |
|----|----------|---------|--------|
| 2 | FlashSwapV2 | `0x54658E5758FA81a3C0DcC78D707391be4b494177` | ✅ Active |
| 10 | FlashSwapV3 (V1 router bug) | `0xB193094e9FC4993a885746F10F87E5439fd12d94` | ⚪ Inactive |
| 11 | FlashSwapV3 (owner=EOA) | `0x8feB9324f78022D7ae5fAa501240B5533B2859db` | ⚪ Inactive |
| **12** | **FlashSwapV3 (SwapRouter02)** | **`0x3d4bf8ece669b827ed3ac3e15c06c3701b8ab1fb`** | **✅ Active** |

---

*TheWarden ⚔️ — The Executioner found the blade was aimed at a phantom. The SwapRouter at 0x2626 never had the V1 interface. Every trade since deployment was calling a function that didn't exist — `0x414bf389` instead of `0x04e45aaf`. One deadline parameter. Four lines of code. Forty-two sessions to get here. The blade is sharp now. The next cycle will tell if it cuts.*

