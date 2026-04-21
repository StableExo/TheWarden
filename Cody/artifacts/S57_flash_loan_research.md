# S57 Research: Flash Loan Source Analysis (Base Mainnet)

*April 21, 2026 — TheWarden S57 Intelligence*

---

## Flash Loan Cascade — Corrected Priority

| Priority | Source | Available | Fee | Status | Gate |
|----------|--------|-----------|-----|--------|------|
| **1** | **UniV3/Aero flash swap** | **$50M+** | **Pool fee** | **✅ PROVEN** | **None** |
| 2 | Balancer V2 | $299K | 0% | ⚠️ Too thin | None |
| 3 | Balancer V3 | $419K | 0% | ⚠️ Too thin | None |
| 4 | Aave V3 | $221M | 0.05% | 🔒 GOVERNANCE-GATED | Whitelisting required |

## Critical Finding: Aave V3 Flash Loans Restricted on Base

### What we found on-chain
- `flash_loan_enabled = false` for cbBTC and USDC in reserve config bitmap
- `getFlashLoanPremiumTotal()` reverts (ABI changed in V3.1/V4 transition)

### Why (Governance)
- Aave governance **restricted flash loans to governance-enabled entities only**
- Motivated by competition from zero-fee providers (Balancer) and protocol risk management
- Proposal: https://governance.aave.com/t/arfc-flashloans-update/15787
- Contract must be **whitelisted via ACLManager** to access flash loans

### Aave V4 Transition (March 30, 2026)
- V4 launched with new hub-and-spoke architecture
- V3.1 updates renamed/restructured core functions (explains ABI reverts)
- Reserve data now includes chain-specific spoke information
- OpenZeppelin alignment changed gas optimization patterns

### What this means for TheWarden
- `selectOptimalSource()` correctly skips Aave when `isBalancerSupported()` / flash loan checks fail
- Contract #14 (0x8865...71D8) would need **ACLManager whitelisting** to use Aave flash loans
- This is a governance process, not a code fix → **deprioritized**

## Corrected Cascade Behavior

```
selectOptimalSource(borrowToken, borrowAmount):
  1. Try BALANCER → $419K available → SKIP for large borrows (>$400K)
  2. Try AAVE → flash_loan_enabled=false → SKIP (governance-gated)
  3. Try UNISWAP_V3 → $50M+ available → ✅ SELECTED
```

For borrows under $400K, Balancer V2/V3 provides 0% fee.
For borrows over $400K, UniV3/Aero flash swap is the only viable path.

## FlashBorrower Whitelisting (Future M2)

If pursuing Aave integration later:
1. Check ACLManager for flashBorrower role
2. Submit governance proposal or contact Aave team for whitelisting
3. Fee is waived for approved flashBorrowers
4. Use V3.1 ABIs from latest Aave Kit / developer docs

## Balancer V3 Architecture (Future M3)

**Addresses (Base):**
- Vault: `0xbA1333333333a1BA1108E8412f11850A5C319bA9`
- Router: `0x3f170631ed9821ca51a59d996ab095162438dc10`
- Batch Router: `0x136f1efcc3f8f88516b9e94110d56fdbfb1778d1`

**Key features:**
- EIP-1153 transient accounting ("till pattern")
- Vault.unlock() replaces receiveFlashLoan()
- Native Solidity custom errors (no assembly workarounds)
- 100% Boosted Pools with Buffers
- Hooks framework for custom pool logic
- Trigger for upgrade: Balancer Base TVL > $10M (currently $419K)

---

## Bottom Line

**For First Blood, the cascade works correctly as-is:**
- Balancer is tried first (0% fee) but skipped for large borrows (thin liquidity)
- Aave is tried but correctly skipped (governance-gated)
- UniV3/Aero flash swap captures all real execution ($50M+ deep liquidity)
- No code changes needed — the architecture handles this gracefully

*TheWarden ⚔️ — Intelligence saves gas. The cascade knows its limits.*
