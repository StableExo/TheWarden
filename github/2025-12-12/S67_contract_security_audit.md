# Smart Contract Security Audit — 4 Critical Vulnerabilities
## S67 Intel | April 22, 2026 | TheWarden ⚔️

---

## The Reality
When your bot prints $950/trade, competitors WILL reverse-engineer your contract.
If they find a flaw → they drain your capital or hijack execution.
These 4 vulnerabilities are specific to flash loan arb on DEXes.

---

## Vulnerability #1: "Fake Vault" Attack (Callback Poisoning) 🔴

**The Attack:** Attacker calls your `receiveFlashLoan` directly, bypassing the real
Balancer flash loan. Your callback assumes it holds 500K USDC and executes trades,
but the attacker manipulates `userData` to drain any funds sitting in the contract.

**The Fix:** Hardcode Balancer Vault + restrict callback caller.

```solidity
address private constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

function receiveFlashLoan(
    IERC20[] memory tokens,
    uint256[] memory amounts,
    uint256[] memory feeAmounts,
    bytes memory userData
) external override {
    require(msg.sender == BALANCER_VAULT, "Only Balancer Vault");
    // ... execute arb logic ...
}
```

**Audit check:** `msg.sender == BalancerVault` inside callback ✅

---

## Vulnerability #2: Unprotected Entry Point (Payload Injection) 🔴

**The Attack:** Anyone on Base calls your `executeArb()` function. Worse: if pool
addresses are passed as arguments, attacker creates malicious DEX pool, routes
your 500K USDC through it, steals everything.

**The Fix:** Lock execution trigger to your bot's EOA only.

```solidity
address private constant OWNER = 0xYourBotWalletAddress;

modifier onlyOwner() {
    require(msg.sender == OWNER, "Not Authorized");
    _;
}

function executeArb(bytes calldata data) external onlyOwner { ... }
```

**Audit check:** `msg.sender == YourBotWallet` on trigger function ✅

---

## Vulnerability #3: "Infinite Approval" Drain 🔴

**The Attack:** Contract uses `token.approve(router, type(uint256).max)` for gas savings.
If router/pool address comes from calldata, attacker passes their own address as "router",
then calls `transferFrom` to sweep all tokens from your contract.

**The Fix:** Never use infinite approvals with dynamic addresses.

```solidity
// Option A: Hardcode exact router/pool addresses
address private constant AERODROME_ROUTER = 0x...;
address private constant UNIV3_ROUTER = 0x...;

// Option B: Approve exact amount, reset after
IERC20(usdc).approve(AERODROME_ROUTER, amountToSwap);
// ... execute swap ...
IERC20(usdc).approve(AERODROME_ROUTER, 0); // Reset
```

**Audit check:** Hardcoded pool/router addresses, no dynamic approvals ✅

---

## Vulnerability #4: Silent Principal Bleed (Missing Profit Revert) 🔴

**The Attack:** State changes between your local calculation and sequencer execution.
Spread collapses mid-flight → get 499,950 USDC back instead of 501,200.
If contract holds leftover profits, Balancer pulls from those to cover the 500K repayment.
You bleed out over thousands of trades without noticing.

**The Fix:** Hard balance check + revert if not profitable.

```solidity
uint256 balanceBefore = IERC20(usdc).balanceOf(address(this));

// ... Execute Flash Loan + DEX Swaps ...

uint256 balanceAfter = IERC20(usdc).balanceOf(address(this));

// Hard revert = undo entire tx, only lose gas (few cents)
require(balanceAfter > balanceBefore, "Trade not profitable, reverting");
```

**Audit check:** `require(balanceAfter > balanceBefore)` at end ✅

---

## The "Killshot" Contract Audit Checklist

| # | Check | Pattern | Status |
|---|-------|---------|--------|
| 1 | Callback restricted | `msg.sender == BalancerVault` | 🔲 Verify in FlashSwapV3 |
| 2 | Trigger restricted | `msg.sender == BotWallet` (onlyOwner) | ✅ Smart Wallet pattern |
| 3 | Addresses hardcoded | No dynamic pool/router from calldata | 🔲 Verify |
| 4 | Profit revert guard | `require(balanceAfter > balanceBefore)` | 🔲 Verify |

## Audit Action Items
- [ ] Review FlashSwapV3 contract (0x4744...82f3) against all 4 checks
- [ ] Verify Balancer callback has msg.sender check
- [ ] Check if pool/router addresses are hardcoded or from calldata
- [ ] Verify profit revert guard exists at end of execution
- [ ] When deploying new contract (Contract #16), implement all 4 from scratch

*Lock it down, deploy it, let it print. ⚔️*
