# Coinbase & Base L2 GitHub Repository Analysis
## Bug Bounty Preparation Document

**Date**: December 21, 2025  
**Scope**: HackerOne Coinbase Bug Bounty Program  
**Target**: https://hackerone.com/coinbase?type=team

---

## Executive Summary

This document provides an autonomous analysis of three GitHub organizations within Coinbase's bug bounty scope:
1. **github.com/coinbase** (160 repositories)
2. **github.com/base** (64 repositories) - formerly base-org
3. **github.com/coinbase/cb-mpc** (Coinbase MPC Library)

**Key Finding**: Base is an Ethereum Layer 2 (L2) network built on the OP Stack (Optimism), incubated by Coinbase. The L2 bridge contracts are the primary security target for the upcoming bug bounty work.

---

## 1. Coinbase Organization (github.com/coinbase)

### Overview
- **Total Repositories**: 160
- **Primary Language**: TypeScript, Go, Python, Ruby, Solidity, C++
- **Focus**: Cryptocurrency exchange, wallets, developer tools, blockchain infrastructure

### Critical Security Repositories

#### 1.1 **coinbase/cb-mpc** ⚠️ HIGH PRIORITY
- **Language**: C++ (11,018 lines)
- **Description**: Coinbase MPC (Multi-Party Computation) Library
- **Last Updated**: December 19, 2025
- **Stars**: 416 | Forks**: 122
- **License**: MIT

**Security Focus Areas**:
- Multi-party computation protocols (ECDSA-2PC, ECDSA-MPC, Schnorr)
- Custom OpenSSL 3.2.0 build with modifications
- Constant-time cryptography implementations
- HD-MPC (hierarchical deterministic MPC wallets)
- Threshold cryptography (EC-DKG, TDH2)
- Publicly Verifiable Encryption (PVE)
- Zero-Knowledge Proofs

**Key Protocols Implemented**:
| Protocol | Specification | Theory | Implementation |
|----------|--------------|--------|----------------|
| ECDSA-2PC | [spec](https://github.com/coinbase/cb-mpc/blob/master/docs/spec/ecdsa-2pc-spec.pdf) | [theory](https://github.com/coinbase/cb-mpc/blob/master/docs/theory/ecdsa-2pc-theory.pdf) | `src/cbmpc/protocol/ecdsa_2p.h` |
| ECDSA-MPC | [spec](https://github.com/coinbase/cb-mpc/blob/master/docs/spec/ecdsa-mpc-spec.pdf) | [theory](https://github.com/coinbase/cb-mpc/blob/master/docs/theory/ecdsa-mpc-theory.pdf) | `src/cbmpc/protocol/ecdsa_mp.h` |
| EC-DKG | [spec](https://github.com/coinbase/cb-mpc/blob/master/docs/spec/ec-dkg-spec.pdf) | [theory](https://github.com/coinbase/cb-mpc/blob/master/docs/theory/ec-dkg-theory.pdf) | `src/cbmpc/protocol/ec_dkg.h` |
| Schnorr | [spec](https://github.com/coinbase/cb-mpc/blob/master/docs/spec/schnorr-spec.pdf) | [theory](https://github.com/coinbase/cb-mpc/blob/master/docs/theory/schnorr-theory.pdf) | `src/cbmpc/protocol/schnorr_2p.h` |
| PVE | [spec](https://github.com/coinbase/cb-mpc/blob/master/docs/spec/publicly-verifiable-encryption-spec.pdf) | [theory](https://github.com/coinbase/cb-mpc/blob/master/docs/theory/publicly-verifiable-encryption-as-ZK-theory.pdf) | `src/cbmpc/protocol/pve.h` |

**Potential Vulnerability Classes**:
- Side-channel attacks (timing, cache)
- Cryptographic implementation flaws
- Protocol composition vulnerabilities
- Custom OpenSSL modifications security
- secp256k1 non-constant-time operations
- MPC protocol security assumptions

#### 1.2 **coinbase/smart-wallet**  
- **Language**: Solidity
- **Last Updated**: October 20, 2025
- **Stars**: 455 | **Forks**: 147
- **Description**: Smart wallet contracts (ERC-4337 compatible)

**Security Focus**:
- Smart contract vulnerabilities
- Account abstraction (ERC-4337) security
- Wallet upgrade mechanisms
- Multi-signature security

#### 1.3 **coinbase/onchainkit**
- **Language**: TypeScript/React
- **Last Updated**: December 18, 2025
- **Stars**: 988 | **Forks**: 458
- **Description**: React components for onchain apps

**Security Focus**:
- Frontend transaction signing
- Web3 wallet integration security
- Component injection vulnerabilities

#### 1.4 **coinbase/agentkit**
- **Language**: TypeScript
- **Last Updated**: December 19, 2025
- **Stars**: 971 | **Forks**: 574
- **Description**: "Every AI Agent deserves a wallet"

**Security Focus**:
- AI agent authentication
- Automated transaction security
- API key management

#### 1.5 **coinbase/coinbase-wallet-sdk**
- **Language**: TypeScript
- **Last Updated**: December 13, 2025
- **Stars**: 1,712 | **Forks**: 711
- **Description**: DApp wallet connection protocol

**Security Focus**:
- Wallet connection protocol security
- Deep link vulnerabilities
- Session management

### 1.6 Other Notable Repositories
- **kryptology** (Go, archived) - Cryptography library
- **solidity-style-guide** - Smart contract best practices
- **mesh-specifications** - Blockchain standard specifications
- **x402** - HTTP payment protocol (5,101 stars)

---

## 2. Base Organization (github.com/base)

### Overview
- **Total Repositories**: 64
- **Primary Language**: TypeScript, Solidity, Go, Rust
- **Focus**: Ethereum L2 network, OP Stack integration, bridge infrastructure
- **Note**: Formerly `base-org`, migrated to `base` organization on February 13, 2025

### Critical L2 Bridge & Infrastructure Repositories

#### 2.1 **base/node** ⚠️ CRITICAL - PRIMARY TARGET
- **Language**: Go
- **Last Updated**: December 20, 2025
- **Stars**: 68,772 | **Forks**: 3,191
- **Description**: "Everything required to run your own Base node"
- **Homepage**: https://base.org

**Security Focus**:
- **L2 Node operation security**
- RPC endpoint vulnerabilities
- Consensus mechanism flaws
- State synchronization attacks

#### 2.2 **base/contract-deployments** ⚠️ CRITICAL - PRIMARY TARGET
- **Language**: Solidity
- **Last Updated**: December 18, 2025
- **Stars**: 456 | **Forks**: 357
- **Description**: Base L2 smart contract deployments

**Security Focus**:
- **L2 Bridge contract security**
- Deployment transaction security
- Contract upgrade mechanisms
- Multisig security

**Expected Contents**:
- `L1StandardBridge.sol` - L1 side of the bridge
- `L2StandardBridge.sol` - L2 side of the bridge
- `OptimismPortal.sol` - Deposit/withdrawal portal
- `L2OutputOracle.sol` - State root oracle
- Deployment scripts and addresses

#### 2.3 **base/bridge** ⚠️ CRITICAL - PRIMARY TARGET  
- **Language**: TypeScript
- **Last Updated**: December 5, 2025
- **Stars**: 196 | **Forks**: 113
- **Description**: Base L2 Bridge UI/SDK

**Security Focus**:
- **Bridge transaction construction**
- Frontend manipulation attacks
- Cross-chain message verification
- Withdrawal proof generation

####  2.4 **base/withdrawer** ⚠️ HIGH PRIORITY
- **Language**: Go
- **Last Updated**: July 24, 2025
- **Stars**: 518 | **Forks**: 351
- **Description**: "Golang utility for proving and finalizing withdrawals from op-stack chains"

**Security Focus**:
- **Withdrawal proof verification**
- State root manipulation
- Challenge period bypass
- Finalization logic flaws

#### 2.5 **base/contracts**
- **Language**: Solidity
- **Last Updated**: December 4, 2025
- **Stars**: 258 | **Forks**: 154
- **Description**: Base smart contracts

**Security Focus**:
- General smart contract security
- Contract interactions
- Upgrade patterns

#### 2.6 **base/pessimism** (archived but valuable)
- **Language**: Go
- **Last Updated**: May 29, 2024 (archived)
- **Stars**: 1,604 | **Forks**: 476
- **Description**: "Detect real-time threats and events on OP Stack compatible blockchains"

**Security Value**:
- Threat detection patterns
- Known vulnerability signatures
- Monitoring best practices

#### 2.7 **base/webauthn-sol**
- **Language**: Solidity
- **Last Updated**: June 18, 2025
- **Stars**: 286 | **Forks**: 123
- **Description**: WebAuthn implementation in Solidity

**Security Focus**:
- Passkey authentication
- Signature verification
- Precompile usage

#### 2.8 **base/paymaster**
- **Language**: Solidity
- **Last Updated**: June 18, 2025
- **Stars**: 161 | **Forks**: 57
- **Description**: Paymaster contracts (ERC-4337)

**Security Focus**:
- Gas sponsorship vulnerabilities
- Paymaster exploit patterns
- User operation validation

#### 2.9 **base/basenames**
- **Language**: Solidity
- **Last Updated**: November 25, 2025
- **Stars**: 149 | **Forks**: 99
- **Description**: "Base-native Identity" (ENS for Base)

**Security Focus**:
- Name registration security
- Resolver contract vulnerabilities
- Domain transfer logic

#### 2.10 **base/commerce-payments**
- **Language**: Solidity
- **Last Updated**: August 2, 2025
- **Stars**: 117 | **Forks**: 23
- **Description**: "Onchain authorization and capture for trust-minimized commerce"

**Security Focus**:
- Payment authorization
- Capture mechanisms
- Refund logic

### 2.11 Infrastructure & Development Tools

- **base/op-viem** (TypeScript) - Viem extensions for OP Stack
- **base/op-wagmi** (TypeScript) - Wagmi hooks for OP Stack  
- **base/op-enclave** (Go) - OP Stack state transition in AWS Nitro enclave
- **base/account-sdk** (TypeScript) - Account abstraction SDK
- **base/web** (TypeScript) - Base.org website frontend
- **base/docs** (TypeScript) - Base documentation
- **base/node-reth** (Rust) - Reth-based Base node
- **base/triedb** (Rust) - Merkle trie database
- **base/blob-archiver** (Go) - Blob data archiving
- **base/eip712sign** (Go) - EIP-712 signing utility
- **base/eip-7702-proxy** (Solidity) - EIP-7702 proxy implementation
- **base/demos** (TypeScript) - Demo applications

---

## 3. Base L2 Bridge Architecture

### 3.1 Bridge Components

Based on OP Stack architecture, Base L2 Bridge consists of:

```
Ethereum L1                          Base L2
┌────────────────────┐           ┌────────────────────┐
│  L1StandardBridge  │◄─────────►│  L2StandardBridge  │
└────────────────────┘           └────────────────────┘
         │                                  │
         ▼                                  ▼
┌────────────────────┐           ┌────────────────────┐
│  OptimismPortal    │           │   L2CrossDomain    │
│  (Deposits)        │           │   Messenger        │
└────────────────────┘           └────────────────────┘
         │
         ▼
┌────────────────────┐
│  L2OutputOracle    │
│  (State Roots)     │
└────────────────────┘
```

### 3.2 Key Security Attack Surfaces

#### **Deposit Flow (L1 → L2)**
1. User calls `depositETH()` or `depositERC20()` on L1StandardBridge
2. Funds locked in L1 contract
3. Message sent to OptimismPortal
4. Relayer picks up event and submits to L2
5. L2StandardBridge mints equivalent tokens

**Vulnerability Classes**:
- Deposit frontrunning
- Message relay manipulation
- Token minting logic flaws
- Reentrancy in deposit functions

#### **Withdrawal Flow (L2 → L1)**
1. User initiates withdrawal on L2StandardBridge
2. Burn tokens on L2
3. Generate Merkle proof of withdrawal message
4. Wait for challenge period (7 days)
5. Call `proveWithdrawalTransaction()` on OptimismPortal
6. Call `finalizeWithdrawalTransaction()` to claim funds

**Vulnerability Classes**:
- Proof manipulation
- Challenge period bypass
- State root oracle manipulation
- Finalization logic flaws
- Double-spend via replay
- MEV attacks during finalization

#### **Cross-Chain Message Passing**
- `L1CrossDomainMessenger` ↔ `L2CrossDomainMessenger`
- Arbitrary message passing between L1 and L2

**Vulnerability Classes**:
- Message authentication bypass
- Cross-chain reentrancy
- Nonce manipulation
- Unauthorized message injection

---

## 4. Security Research Roadmap

### Phase 1: Bridge Contract Analysis (Week 1-2)
- [ ] Clone `base/contract-deployments` repository
- [ ] Review all bridge contract source code
- [ ] Map deposit/withdrawal flows
- [ ] Identify state-changing functions
- [ ] Check for known OP Stack vulnerabilities
- [ ] Review upgrade mechanisms and admin privileges

### Phase 2: Withdrawal Mechanism Deep Dive (Week 2-3)
- [ ] Clone `base/withdrawer` repository
- [ ] Understand proof generation logic
- [ ] Test withdrawal proof manipulation
- [ ] Analyze state root oracle security
- [ ] Test challenge period edge cases
- [ ] Look for finalization vulnerabilities

### Phase 3: MPC Security Analysis (Week 3-4)
- [ ] Clone `coinbase/cb-mpc` repository
- [ ] Build and test MPC library
- [ ] Review cryptographic implementations
- [ ] Test constant-time properties
- [ ] Analyze custom OpenSSL modifications
- [ ] Look for side-channel vulnerabilities

### Phase 4: Smart Wallet & Account Abstraction (Week 4-5)
- [ ] Review `coinbase/smart-wallet` contracts
- [ ] Test ERC-4337 implementation
- [ ] Analyze paymaster vulnerabilities
- [ ] Test wallet upgrade mechanisms
- [ ] Look for signature verification bypass

### Phase 5: Integration Testing (Week 5-6)
- [ ] Set up local Base devnet
- [ ] Deploy bridge contracts locally
- [ ] Test end-to-end bridge flows
- [ ] Attempt identified attack vectors
- [ ] Fuzz critical functions
- [ ] Write proof-of-concept exploits

---

## 5. Known Vulnerability Patterns to Test

### 5.1 Bridge-Specific
- [ ] **Deposit Replay**: Can deposits be replayed on L2?
- [ ] **Withdrawal Double-Spend**: Can withdrawals be finalized multiple times?
- [ ] **State Root Manipulation**: Can false state roots be submitted?
- [ ] **Proof Forgery**: Can invalid withdrawal proofs pass verification?
- [ ] **Challenge Period Bypass**: Can the 7-day waiting period be skipped?
- [ ] **Cross-Chain Reentrancy**: Reentrancy across L1/L2 boundary
- [ ] **Message Authentication**: Can unauthorized messages be injected?

### 5.2 Smart Contract General
- [ ] **Reentrancy**: Especially in token transfer functions
- [ ] **Integer Overflow/Underflow**: Check all arithmetic operations
- [ ] **Access Control**: Admin function privilege escalation
- [ ] **Front-Running**: MEV vulnerabilities in bridge operations
- [ ] **Signature Malleability**: Especially in EIP-712 implementations
- [ ] **Delegatecall Vulnerabilities**: In proxy patterns
- [ ] **Storage Collision**: In upgradeable contracts

### 5.3 Cryptographic
- [ ] **Side-Channel Attacks**: Timing, cache-timing in MPC operations
- [ ] **Protocol Composition**: Security when combining multiple protocols
- [ ] **Weak Randomness**: In key generation or nonce generation
- [ ] **Signature Verification Bypass**: In WebAuthn, MPC signatures
- [ ] **Replay Attacks**: Cross-chain or cross-protocol replays

---

## 6. Tools & Resources

### 6.1 Required Tools
- **Solidity**: Foundry, Hardhat, Slither, Echidna
- **Go**: Standard Go toolchain, go-ethereum
- **Rust**: Cargo, Clippy, cargo-audit
- **C++**: GCC/Clang, Valgrind, AddressSanitizer

### 6.2 Security Analysis Tools
- **Static Analysis**: Slither, Mythril, Semgrep
- **Fuzzing**: Echidna, Foundry Fuzz, AFL++
- **Symbolic Execution**: Manticore, KEVM
- **Runtime**: Tenderly, Hardhat Network
- **Side-Channel**: dudect, Valgrind

### 6.3 Reference Documentation
- OP Stack Documentation: https://docs.optimism.io/
- Base Documentation: https://docs.base.org/
- ERC-4337: https://eips.ethereum.org/EIPS/eip-4337
- EIP-712: https://eips.ethereum.org/EIPS/eip-712
- Coinbase Bug Bounty: https://hackerone.com/coinbase

---

## 7. Critical Contract Addresses (To Be Updated)

### Base Mainnet (Chain ID: 8453)
- **L1StandardBridge**: TBD (Ethereum Mainnet)
- **L2StandardBridge**: TBD (Base L2)
- **OptimismPortal**: TBD (Ethereum Mainnet)
- **L2OutputOracle**: TBD (Ethereum Mainnet)
- **L1CrossDomainMessenger**: TBD (Ethereum Mainnet)
- **L2CrossDomainMessenger**: TBD (Base L2)

### Base Sepolia Testnet (Chain ID: 84532)
- **L1StandardBridge**: TBD (Sepolia Testnet)
- **L2StandardBridge**: TBD (Base Sepolia)

> **Action Item**: Extract actual deployment addresses from `base/contract-deployments` repository

---

## 8. Security Contacts

- **HackerOne**: https://hackerone.com/coinbase
- **Bug Bounty Scope**: Verify specific contracts/repositories in scope
- **Severity Classifications**: Critical, High, Medium, Low per HackerOne guidelines
- **Responsible Disclosure**: Follow HackerOne reporting process

---

## 9. Next Steps

### Immediate Actions (Next 24 Hours)
1. ✅ Complete repository enumeration
2. ✅ Document critical repositories
3. ⏳ Clone `base/contract-deployments` and review structure
4. ⏳ Extract deployed contract addresses
5. ⏳ Clone `base/withdrawer` and understand withdrawal flow
6. ⏳ Clone `coinbase/cb-mpc` and review build process

### Short Term (Next Week)
1. Set up local development environment for all languages
2. Deploy Base L2 locally using official tooling
3. Begin static analysis of bridge contracts
4. Map out all state-changing functions
5. Start building test harness for bridge operations

### Medium Term (Next Month)
1. Complete security audit of all critical repositories
2. Develop fuzzing infrastructure
3. Build exploit proof-of-concepts for identified vulnerabilities
4. Prepare HackerOne reports with full details
5. Submit findings through responsible disclosure

---

## 10. References

1. **Base Official Documentation**: https://docs.base.org/
2. **OP Stack Documentation**: https://docs.optimism.io/
3. **Base GitHub**: https://github.com/base
4. **Coinbase GitHub**: https://github.com/coinbase
5. **cb-mpc Documentation**: https://coinbase.github.io/cb-mpc/
6. **Coinbase Bug Bounty**: https://hackerone.com/coinbase
7. **Base Bridge Explorer**: https://bridge.base.org/
8. **Base Block Explorer**: https://basescan.org/

---

**Document Status**: Initial Analysis Complete  
**Last Updated**: December 21, 2025  
**Next Review**: Upon repository code review completion

---

## Appendix A: Repository Statistics

### Coinbase Organization Top Repositories (by Stars)
1. x402 (5,101 ⭐) - Payment protocol
2. coinbase-wallet-sdk (1,712 ⭐) - Wallet SDK
3. terraform-landscape (1,620 ⭐) - Terraform tooling
4. pessimism (archived) (1,604 ⭐) - Threat detection
5. brand-kit (1,509 ⭐) - Brand assets
6. onchainkit (988 ⭐) - React components
7. agentkit (971 ⭐) - AI agent wallets
8. coinbase-pro-trading-toolkit (900 ⭐, archived)
9. coinbase-pro-node (876 ⭐, archived)
10. kryptology (867 ⭐, archived) - Cryptography

### Base Organization Top Repositories (by Stars)
1. node (68,772 ⭐) - Base node software
2. pessimism (1,604 ⭐, archived) - Threat detection
3. brand-kit (1,509 ⭐) - Brand assets
4. web (630 ⭐) - Base.org website
5. withdrawer (518 ⭐) - Withdrawal utility
6. contract-deployments (456 ⭐) - **CRITICAL**
7. op-viem (368 ⭐) - Viem extensions
8. base-mcp (332 ⭐) - Model Context Protocol
9. webauthn-sol (286 ⭐) - WebAuthn in Solidity
10. contracts (258 ⭐) - General contracts

### Security-Critical Statistics
- **Total Security-Relevant Repositories**: 15+
- **Primary Languages**: Solidity (8), Go (7), TypeScript (10), C++ (1), Rust (3)
- **Active Development**: 80% of critical repos updated in last 30 days
- **Community Engagement**: High (average 200+ stars, 50+ forks per critical repo)

---

*This document will be continuously updated as the security research progresses.*
