# ankrBNB Contract - Quick Reference

**Contract Address**: `0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827`  
**Chain**: Binance Smart Chain (BSC)  
**BscScan**: https://bscscan.com/address/0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827

---

## 🚨 Critical Vulnerabilities

### 1. Flash Unstake Fee DoS [HIGH]
- **Source**: Veridise Apr 2024
- **Impact**: Locks user funds in swap mechanism
- **Bounty**: $50k-$500k
- **Functions**: `swap()`, `flashUnstakeFee()`, `updateFlashUnstakeFee()`

### 2. Swap Function DoS [HIGH]
- **Source**: Veridise Apr 2024
- **Impact**: Complete halt of swap functionality
- **Bounty**: $50k-$500k
- **Functions**: `swap()`, `swapBnbToAnkrBnb()`, `swapAnkrBnbToBnb()`

---

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| Total Transactions | 487,532 |
| Daily Average | ~1,250 |
| Unique Addresses | 12,483 |
| Volume | $45M+ |
| Top Holders Control | 52.3% |
| Concentration Risk | MEDIUM |

---

## 🎯 High-Risk Functions

1. `flashUnstakeFee()` - CRITICAL
2. `swap()` - CRITICAL
3. `stake()` - HIGH
4. `unstake()` - HIGH
5. `updateRatio()` - HIGH
6. `bridgeTokens()` - HIGH

---

## 🔧 Usage

### Run Autonomous Explorer
```bash
npm run autonomous:bscscan-ankrbnb
```

### View Reports
- Markdown: `.memory/research/bscscan_ankrbnb_exploration_2025-12-15.md`
- JSON: `.memory/research/bscscan_ankrbnb_exploration_2025-12-15.json`

---

## 📋 Integration Checklist

- [x] Contract added to AnkrContractRegistry
- [x] Vulnerabilities documented
- [x] Autonomous explorer created
- [x] Reports generated
- [ ] Deploy TheWarden monitoring
- [ ] Develop PoC for DoS vulnerabilities
- [ ] Submit bug bounty to Immunefi
- [ ] Set up real-time alerts

---

## 💰 Bug Bounty Info

- **Platform**: Immunefi
- **Program**: https://immunefi.com/bug-bounty/ankr/scope/
- **Rewards**: Up to $500,000 (5% of at-risk funds)
- **Min Reward**: $1,000
- **Payment**: ANKR, USDT, USDC (on ETH or Base)

---

## 🔗 Related Files

- `src/security/ankr/AnkrContractRegistry.ts` - Contract registry
- `src/security/ankr/AnkrVulnerabilityDetector.ts` - Vulnerability detector
- `scripts/autonomous/autonomous-bscscan-contract-explorer.ts` - Explorer script
- `IMMUNEFI_ANKR_EXPLORATION_SESSION.md` - Previous session
