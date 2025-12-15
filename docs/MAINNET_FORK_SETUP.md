# Mainnet Fork Setup for Live Execution

This document explains how to set up and run TheWarden with a mainnet fork for safe testing of live execution strategies against the ankrBNB contract.

## 🎯 Purpose

Enable safe testing of vulnerability exploitation and bug bounty PoC development against the ankrBNB contract (`0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827`) without risking real funds or affecting the live network.

## 🔧 Configuration

### Environment Setup

The `.env` file has been configured with:

```bash
# Mainnet Fork Enabled
HARDHAT_FORK_ENABLED=true
HARDHAT_FORK_BLOCK_NUMBER=228000000
FORKING=true

# Target Network: BSC (Binance Smart Chain)
BSC_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# Fallback RPCs available
BSC_RPC_URL_BACKUP=https://bsc-dataseed.binance.org/
```

### Key Features Enabled

1. **Hardhat Fork Mode** - Local blockchain that mirrors BSC mainnet
2. **Historical State** - Fork from block 228M (recent state)
3. **Safety Systems** - Circuit breakers and emergency stops active
4. **DRY_RUN Mode** - Initially enabled for testing
5. **Full Monitoring** - All logs, metrics, and alerts enabled

## 📋 Prerequisites

1. Node.js 22+ installed (already set up)
2. Dependencies installed (`npm install` - already done)
3. `.env` file configured (already created)
4. Hardhat installed (part of dependencies)

## 🚀 Quick Start

### 1. Verify Environment

```bash
# Check Node version
node --version  # Should be v22.x.x

# Verify .env exists
ls -la .env

# Test environment variables
node -e "require('dotenv').config(); console.log('BSC_RPC_URL:', process.env.BSC_RPC_URL)"
```

### 2. Start Hardhat Fork (BSC Mainnet)

```bash
# Option A: Using npx hardhat with environment variable
npx hardhat node --fork $BSC_RPC_URL

# Option B: Using default from hardhat.config
npx hardhat node
```

This will:
- Fork BSC mainnet at block 228M
- Create local network at `http://127.0.0.1:8545`
- Mirror all contract state including ankrBNB

### 3. Deploy/Test Against Fork

```bash
# Run TheWarden in fork mode
npm run start

# Or for specific testing
npm run dev

# Run tests against fork
npm run test:integration
```

## 🎯 Testing ankrBNB Vulnerabilities

### Scenario 1: Monitor ankrBNB Contract

```bash
# Set up monitoring for ankrBNB
node --import tsx scripts/autonomous/autonomous-bscscan-contract-explorer.ts

# Check if contract is accessible on fork
npx hardhat console --network localhost
> const ankrBNB = await ethers.getContractAt("ERC20", "0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827")
> await ankrBNB.totalSupply()
```

### Scenario 2: Test Flash Unstake DoS

Create a test script:

```typescript
// scripts/test-ankrbnb-dos.ts
import { ethers } from 'hardhat';

async function main() {
  const ankrBNBAddress = '0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827';
  const ankrBNB = await ethers.getContractAt('IAkrBNB', ankrBNBAddress);
  
  // Monitor flash unstake fee
  const fee = await ankrBNB.flashUnstakeFee();
  console.log('Current flash unstake fee:', fee.toString());
  
  // Test swap function
  // ... PoC code here
}

main().catch(console.error);
```

Run with:
```bash
npx hardhat run scripts/test-ankrbnb-dos.ts --network localhost
```

### Scenario 3: Simulate Transactions

```bash
# Impersonate a whale holder
npx hardhat console --network localhost
> await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: ["0x...whale_address"]
  })
> const signer = await ethers.getSigner("0x...whale_address")
> const ankrBNB = await ethers.getContractAt("ERC20", "0x52F24...", signer)
> await ankrBNB.transfer("your_address", ethers.parseEther("1000"))
```

## 🔒 Security Considerations

### Safe Testing

1. **Fork is Isolated** - No connection to real mainnet
2. **No Real Funds** - Test with forked state only
3. **Reset Anytime** - Can restart fork to reset state
4. **DRY_RUN Mode** - Prevents accidental real transactions

### Configuration Flags

```bash
# Safety flags in .env
DRY_RUN=true                      # Simulate only, no real txns
CIRCUIT_BREAKER_ENABLED=true      # Auto-stop on issues
EMERGENCY_STOP_ENABLED=true       # Manual emergency stop
LEARNING_MODE=false               # Not in learning mode
```

## 📊 Monitoring & Debugging

### View Fork Activity

```bash
# Hardhat console shows all transactions
# Enable detailed logging
LOG_LEVEL=debug npm run dev
```

### Reset Fork State

```bash
# Stop hardhat node (Ctrl+C)
# Restart to get fresh fork
npx hardhat node
```

### Debug Transactions

```bash
# Use Hardhat's console.log in contracts
# View transaction traces
npx hardhat test --logs
```

## 🎯 Next Session Workflow

For the next session when running live execution tests:

### 1. Session Initialization

```bash
# Start fresh
cd /home/runner/work/TheWarden/TheWarden

# Load Node 22
export NVM_DIR="$HOME/.nvm" && \
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
  nvm use 22

# Verify environment
node --version
cat .env | grep HARDHAT_FORK_ENABLED
```

### 2. Start Fork

```bash
# Terminal 1: Start Hardhat fork (BSC mainnet)
npx hardhat node --fork $BSC_RPC_URL
```

### 3. Run Tests

```bash
# Terminal 2: Run TheWarden or tests
npm run dev

# Or run specific vulnerability tests
npx hardhat run scripts/test-ankrbnb-vulnerabilities.ts --network localhost
```

### 4. Monitor Results

```bash
# Watch logs
tail -f logs/arbitrage.log

# Check dashboard (if enabled)
open http://localhost:3000
```

## 🚨 Troubleshooting

### Fork Won't Start

```bash
# Check RPC URL is valid
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $BSC_RPC_URL

# Try backup RPC
npx hardhat node --fork https://bsc-dataseed.binance.org/
```

### Contract Not Found

```bash
# Verify contract exists at fork block
npx hardhat console --network localhost
> await ethers.provider.getCode("0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827")
# Should return bytecode, not 0x
```

### Out of Gas

```bash
# Increase gas limit in hardhat.config.ts
networks: {
  hardhat: {
    gas: 30000000,
    blockGasLimit: 30000000
  }
}
```

## 📚 Resources

- Hardhat Forking: https://hardhat.org/hardhat-network/docs/guides/forking-other-networks
- ankrBNB Contract: https://bscscan.com/address/0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827
- Veridise Audit: [Reference in AnkrContractRegistry]
- BscScan Exploration Report: `.memory/research/bscscan_ankrbnb_exploration_2025-12-15.md`

## ✅ Pre-Flight Checklist

Before next session, verify:

- [x] `.env` file created with full configuration
- [x] `HARDHAT_FORK_ENABLED=true` set
- [x] BSC RPC URLs configured (primary + backups)
- [x] DRY_RUN=true for safety
- [x] Circuit breakers enabled
- [ ] Hardhat node started successfully
- [ ] ankrBNB contract accessible on fork
- [ ] Test transaction can be submitted
- [ ] Monitoring systems operational

## 🎯 Ready for Live Execution Testing

The environment is now configured for:
1. ✅ Safe mainnet fork testing
2. ✅ ankrBNB contract vulnerability analysis
3. ✅ PoC development for bug bounty submission
4. ✅ Transaction simulation without real funds
5. ✅ Full monitoring and safety systems

**Next Steps**: Start Hardhat fork and begin vulnerability testing!
