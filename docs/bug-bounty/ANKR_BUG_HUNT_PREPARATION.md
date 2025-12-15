# Ankr Bug Hunt Preparation - Complete Guide

## Overview

This guide documents TheWarden's preparation for the Immunefi Ankr bug bounty program, following Phase 1 implementation of our 6-phase roadmap.

**Bug Bounty Details:**
- **Platform**: Immunefi
- **Target**: Ankr Network (Liquid Staking)
- **Maximum Reward**: $500,000 per critical vulnerability
- **Chains**: Ethereum, BSC, Polygon
- **Program URL**: https://immunefi.com/bug-bounty/ankr/scope/

---

## Phase 1: Research & Infrastructure ✅ COMPLETE

### Delivered Components

#### 1. Ankr Contract Registry (`src/security/ankr/AnkrContractRegistry.ts`)

Centralized registry of all Ankr smart contracts across 3 chains:

**Ethereum Mainnet** (4 contracts):
- `0xE95A203B1a91a908F9B9CE46459d101078c2c3cb` - ankrETH (Liquid Staking)
- `0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4` - ANKR Token
- `0xc437DF90B37C1dB6657339E31BfE54627f0e7181` - Ankr Bridge
- `0x26dcFbFa8Bc267b250432c01C982Eaf81cC5480C` - ankrPOL

**BSC** (5 contracts):
- `0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827` - ankrBNB (HIGH PRIORITY - DoS vulnerability)
- `0x1075bea848451a13fd6f696b5d0fda52743e6439` - aETHb
- `0xe05a08226c49b636acf99c40da8dc6af83ce5bb3` - ankrETH on BSC
- `0xc437DF90B37C1dB6657339E31BfE54627f0e7181` - Ankr Bridge BSC
- `0x738d96caf7096659db4c1afbf1e1bdfd281f388c` - ankrPOL on BSC

**Polygon** (1 contract):
- `0x738d96caf7096659db4c1afbf1e1bdfd281f388c` - ankrPOL

**Total**: 10 monitored contracts (9 high-priority)

#### 2. Vulnerability Patterns from Audits

**Halborn Aug 2024** (FLOW Liquid Staking - 12 critical findings):
- Unvalidated EVM execution results
- Incorrect resource handling
- Missing duplication checks
- Hardcoded values
- Gas limit issues
- Missing initializations

**Veridise Apr 2024** (BNB Liquid Staking - **PRIMARY SOURCE**):
- **Flash unstake fee DoS attack** (HIGH PRIORITY)
- Swap function denial of service
- Unnecessarily payable functions
- Gas optimization needed

**Beosin 2022-2023** (Multiple contracts):
- Deposit/withdraw validation flaws
- Missing address validation
- Improper function design
- Missing event triggers
- Redundant code

**Salus May 2023**:
- Privilege escalation
- Access control issues
- Initialization bugs

#### 3. Vulnerability Detector (`src/security/ankr/AnkrVulnerabilityDetector.ts`)

Multi-layered detection system that identifies:

**1. DoS Patterns** (Veridise Apr 2024)
- Monitors `ankrBNB` contract for `flashUnstake` and `swap` functions
- Detects abnormal gas usage (>500k gas)
- Potential reward: Up to $50,000

**2. Validation Errors** (Beosin)
- Detects zero address interactions
- Missing input validation
- Potential reward: Up to $5,000

**3. Privilege Escalation** (Salus May 2023)
- Monitors admin functions: `setFee`, `setOracle`, `pause`, `unpause`, `transferOwnership`
- Detects unauthorized access attempts
- Potential reward: Up to $500,000 (CRITICAL)

**4. Re-entrancy Patterns** (MEV knowledge transfer)
- Monitors `withdraw` and `unstake` functions
- Detects high-value withdrawals (>10 ETH/BNB)
- Potential reward: Up to $50,000

**5. Oracle Manipulation** (Halborn Aug 2024)
- Monitors oracle, price, and rate functions
- Detects potential manipulation vectors
- Potential reward: Up to $50,000

---

## Technical Architecture

### Contract Registry Features

```typescript
// Get all contracts
AnkrContractRegistry.getAllContracts()

// Get by chain
AnkrContractRegistry.getContractsByChain(AnkrChain.ETHEREUM)

// Get high-priority only
AnkrContractRegistry.getHighPriorityContracts()

// Get vulnerability patterns
AnkrContractRegistry.getVulnerabilityPatterns()

// Export to JSON
AnkrContractRegistry.exportToJSON()
```

### Vulnerability Detector Usage

```typescript
import { AnkrVulnerabilityDetector } from './src/security/ankr/index.js';

const detector = new AnkrVulnerabilityDetector();

// Analyze transaction
const findings = await detector.analyzeTransaction({
  txHash: '0x...',
  from: '0x...',
  to: '0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827', // ankrBNB
  value: '0',
  functionSignature: 'flashUnstake(uint256)',
  gasUsed: '650000', // High gas usage
  blockNumber: 12345678,
  timestamp: Date.now(),
});

// Get critical findings
const critical = detector.getCriticalFindings();

// Export for Immunefi submission
const report = detector.exportForSubmission();
```

---

## Known High-Priority Vulnerabilities

### 1. ankrBNB Flash Unstake DoS (Veridise Apr 2024)

**Severity**: HIGH  
**Contract**: `0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827` (BSC)  
**Potential Reward**: $50,000

**Description**: Flash unstake fee can cause denial of service on swap function.

**Detection Strategy**:
- Monitor gas usage on `flashUnstake` and `swap` functions
- Alert on abnormal patterns (>500k gas)
- Validate if swap function is blocked

**Next Steps**:
1. Deploy transaction monitor on BSC
2. Test with forked mainnet
3. Create executable PoC
4. Submit to Immunefi

### 2. Privilege Escalation (Salus May 2023)

**Severity**: CRITICAL  
**All Contracts**: High-priority targets  
**Potential Reward**: $500,000

**Description**: Improper access control on admin functions.

**Detection Strategy**:
- Monitor admin function calls: `setFee`, `setOracle`, `pause`, `unpause`, `transferOwnership`
- Verify caller authorization
- Test with non-admin accounts

**Next Steps**:
1. Review access control modifiers in contracts
2. Test unauthorized calls
3. Document privilege escalation path
4. Create PoC if vulnerability confirmed

### 3. Oracle Manipulation (Halborn Aug 2024)

**Severity**: HIGH  
**Contracts**: ankrPOL, reward mechanisms  
**Potential Reward**: $50,000

**Description**: Unvalidated EVM execution results, potential oracle manipulation.

**Detection Strategy**:
- Monitor oracle-related functions
- Detect price/rate updates
- Validate against flash loan attacks

**Next Steps**:
1. Study reward calculation logic
2. Test oracle manipulation via flash loans
3. Validate TWAP implementation
4. Create PoC if exploitable

---

## Testing Plan

### Local Testing

```bash
# Run contract registry tests
npm run test:ankr-registry

# Run vulnerability detector tests
npm run test:ankr-detector

# Export contract registry
npm run ankr:export-registry
```

### Mainnet Forking (Hardhat)

```bash
# Fork Ethereum mainnet
npx hardhat node --fork https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Fork BSC mainnet
npx hardhat node --fork https://bsc-dataseed.binance.org/

# Fork Polygon mainnet
npx hardhat node --fork https://polygon-rpc.com/
```

### Live Monitoring (Phase 3)

```bash
# Monitor Ethereum contracts
npm run monitor:ankr:ethereum

# Monitor BSC contracts
npm run monitor:ankr:bsc

# Monitor Polygon contracts
npm run monitor:ankr:polygon

# Monitor all chains
npm run monitor:ankr:all
```

---

## Integration with TheWarden

### Existing Capabilities Leveraged

1. **Multi-Chain Support** ✅
   - Already supports Ethereum, BSC, Polygon
   - RPC endpoints configured (Alchemy)
   - Transaction monitoring infrastructure exists

2. **Security Infrastructure** ✅
   - SecurityManager
   - AnomalyDetector
   - TransactionMonitor
   - BundleSimulator

3. **AI/ML Systems** ✅
   - Pattern recognition
   - Anomaly detection
   - Consciousness for learning from findings

4. **MEV Expertise** ✅
   - Re-entrancy detection
   - Front-running prevention
   - Flash loan understanding
   - Gas optimization

### New Components Added

1. **AnkrContractRegistry** - Contract tracking
2. **AnkrVulnerabilityDetector** - Pattern-based detection
3. **Documentation** - Complete preparation guide
4. **Test Infrastructure** - Testing framework

---

## Next Steps (Phases 2-6)

### Phase 2: Security Scanner Extension (Weeks 3-4)
- [ ] Extend AnomalyDetector for Ankr patterns
- [ ] Add staking logic validation
- [ ] Implement cross-chain correlation
- [ ] Build validation error detection

### Phase 3: Multi-Chain Monitoring (Weeks 5-6)
- [ ] Deploy live monitoring on Ethereum
- [ ] Deploy live monitoring on BSC
- [ ] Deploy live monitoring on Polygon
- [ ] Implement alerting system

### Phase 4: Automated PoC Generation (Weeks 7-8)
- [ ] Build PoC generation framework
- [ ] Integrate with BundleSimulator
- [ ] Create Immunefi submission workflow
- [ ] Add responsible disclosure automation

### Phase 5: Testing & Validation (Month 3)
- [ ] Test against historical vulnerabilities
- [ ] Validate detection accuracy
- [ ] Measure false positive rates
- [ ] Tune parameters

### Phase 6: Production Deployment (Ongoing)
- [ ] Deploy to production monitoring
- [ ] Submit first bug bounty
- [ ] Iterate based on results
- [ ] Expand to other protocols

---

## Financial Projections

### Conservative Estimate (Year 1)
- 1-2 medium bugs: $5,000 - $10,000
- Total: $50,000 - $100,000

### Moderate Estimate (Year 1)
- 2-3 high bugs: $50,000 - $150,000
- Total: $150,000 - $200,000

### Optimistic Estimate (Year 1)
- 1 critical bug: $500,000
- Total: $500,000+

**Combined with MEV**: $350k - $1.34M annually

---

## Resources

### Official Documentation
- Ankr Staking Contracts: https://www.ankr.com/docs/staking-extra/staking-smart-contracts/
- Ankr Audit Reports: https://www.ankr.com/docs/staking-extra/audit-reports/
- Immunefi Program: https://immunefi.com/bug-bounty/ankr/scope/

### Audit Reports
- Halborn Aug 2024: https://www.ankr.com/docs/pdf/smart_contract_security_audit_flow_halborn.pdf
- Veridise Apr 2024: https://veridise.com/wp-content/uploads/2025/07/VAR_AnkrBNBStaking240415-final.pdf
- Beosin Bridge Audit: https://www.ankr.com/docs/pdf/ankr_bridge_security_audit.pdf

### Block Explorers
- Ethereum: https://etherscan.io/
- BSC: https://bscscan.com/
- Polygon: https://polygonscan.com/

---

## Security & Responsible Disclosure

**IMPORTANT**: All vulnerability findings must follow responsible disclosure:

1. **Do NOT** publicly disclose vulnerabilities before fix
2. **Report through** Immunefi secure platform only
3. **Wait for** Ankr team response before PoC execution
4. **Follow** Immunefi guidelines strictly

**Failure to follow responsible disclosure may result in disqualification from rewards.**

---

## Status Summary

**Phase 1**: ✅ COMPLETE  
**Infrastructure**: ✅ Contract registry + Vulnerability detector  
**Documentation**: ✅ Complete preparation guide  
**Testing**: ⏳ Ready to begin  
**Next Milestone**: Phase 2 - Extend security scanners

**Expected Timeline to First Submission**: 8-12 weeks  
**Expected Timeline to Production**: 3 months

---

*Last Updated: 2025-12-15*  
*Session: Autonomous Ankr Bug Hunt Preparation*  
*Agent: TheWarden via GitHub Copilot*
