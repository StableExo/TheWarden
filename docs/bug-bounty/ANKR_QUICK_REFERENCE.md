# Ankr Bug Hunt - Quick Reference

## 🎯 Quick Start

```bash
# View contract registry
npm run ankr:contracts

# Start monitoring (when Phase 3 complete)
npm run monitor:ankr

# Export findings
npm run ankr:export-findings
```

## 📊 At a Glance

| Metric | Value |
|--------|-------|
| **Max Reward** | $500,000 (critical) |
| **Contracts Monitored** | 10 (9 high-priority) |
| **Chains** | 3 (Ethereum, BSC, Polygon) |
| **Vulnerability Patterns** | 21 from 4 audits |
| **High-Risk Functions** | 20 identified |
| **Expected Annual Revenue** | $50k - $500k |

## 🔥 Top Priority Targets

### 1. ankrBNB Flash Unstake DoS
- **Contract**: `0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827` (BSC)
- **Severity**: HIGH ($50k)
- **Source**: Veridise Apr 2024
- **Status**: Known vulnerability, needs PoC

### 2. Privilege Escalation
- **Contracts**: All high-priority
- **Severity**: CRITICAL ($500k)
- **Source**: Salus May 2023
- **Functions**: `setFee`, `setOracle`, `pause`, `unpause`, `transferOwnership`

### 3. Oracle Manipulation
- **Contracts**: ankrPOL, reward mechanisms
- **Severity**: HIGH ($50k)
- **Source**: Halborn Aug 2024
- **Attack Vector**: Flash loan + oracle update

## 🛠️ Code Examples

### Check Contract Info
```typescript
import { AnkrContractRegistry, AnkrChain } from './src/security/ankr/index.js';

// Get all Ethereum contracts
const ethContracts = AnkrContractRegistry.getContractsByChain(AnkrChain.ETHEREUM);

// Get high-priority targets
const targets = AnkrContractRegistry.getHighPriorityContracts();

// Get vulnerability patterns
const patterns = AnkrContractRegistry.getVulnerabilityPatterns();
```

### Run Vulnerability Detection
```typescript
import { AnkrVulnerabilityDetector } from './src/security/ankr/index.js';

const detector = new AnkrVulnerabilityDetector();

// Analyze transaction
const findings = await detector.analyzeTransaction({
  txHash: '0x123...',
  from: '0xabc...',
  to: '0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827', // ankrBNB
  value: '0',
  functionSignature: 'flashUnstake(uint256)',
  gasUsed: '650000',
  blockNumber: 12345678,
  timestamp: Date.now(),
});

// Get critical findings only
const critical = detector.getCriticalFindings();
```

## 📋 Vulnerability Checklist

### DoS Patterns (Veridise)
- [ ] Monitor `flashUnstake` gas usage
- [ ] Monitor `swap` function calls
- [ ] Detect abnormal gas (>500k)
- [ ] Verify swap blockage
- [ ] Create PoC

### Validation Errors (Beosin)
- [ ] Monitor zero address interactions
- [ ] Check deposit/withdraw validation
- [ ] Test missing input validation
- [ ] Document validation flaws

### Privilege Escalation (Salus)
- [ ] Monitor admin function calls
- [ ] Verify caller authorization
- [ ] Test unauthorized access
- [ ] Check access control modifiers

### Re-entrancy (MEV Transfer)
- [ ] Monitor withdraw/unstake
- [ ] Detect high-value operations
- [ ] Check re-entrancy guards
- [ ] Test recursive calls

### Oracle Manipulation (Halborn)
- [ ] Monitor oracle functions
- [ ] Test flash loan attacks
- [ ] Validate TWAP implementation
- [ ] Check price manipulation

## 🎖️ Reward Structure

```
Critical:  $500,000  (capped at 5% of at-risk funds)
High:      $50,000
Medium:    $5,000
Low:       $1,000
Minimum:   $1,000
```

## 🔗 Key Resources

- **Immunefi Program**: https://immunefi.com/bug-bounty/ankr/scope/
- **Ankr Docs**: https://www.ankr.com/docs/staking-extra/
- **Halborn Audit**: [Aug 2024 FLOW Liquid Staking]
- **Veridise Audit**: [Apr 2024 BNB Liquid Staking]

## ⚠️ Critical Rules

1. **DO NOT** publicly disclose before fix
2. **Report ONLY** through Immunefi platform
3. **Executable PoC** required (not theory)
4. **Demonstrate** real-world impact
5. **Follow** responsible disclosure

## 📞 Support

For questions about implementation, see:
- **Full Guide**: `docs/bug-bounty/ANKR_BUG_HUNT_PREPARATION.md`
- **Memory Logs**: `.memory/log.md`
- **Research**: `.memory/research/immunefi_ankr_exploration_2025-12-15.md`

---

*Last Updated: 2025-12-15*  
*Version: 1.0.0 (Phase 1 Complete)*
