# Autonomous Contract Verification for v2 and v3

This document describes the autonomous verification capabilities added to TheWarden for verifying FlashSwapV2 and FlashSwapV3 contracts on BaseScan.

## 🎯 Overview

After the recent Etherscan MCP integration (PR #490), TheWarden now has autonomous contract verification checking capabilities. This allows the system to:

1. ✅ **Check verification status** of deployed contracts
2. ✅ **Autonomously verify** contracts using multiple methods
3. ✅ **Report verification state** for Phase 1 Action 2 readiness

## 🚀 Quick Start

### Check Verification Status (Recommended First Step)

```bash
npm run verify:check
```

This will check if both FlashSwapV2 and FlashSwapV3 are verified on BaseScan and display their current status.

**Output Example:**
```
═══════════════════════════════════════════════════════════
  FlashSwap v2 & v3 Contract Verification Status
═══════════════════════════════════════════════════════════

📋 Checking FlashSwapV2...
   Address: 0x6e2473E4BEFb66618962f8c332706F8f8d339c08
   Explorer: https://basescan.org/address/0x6e2473E4BEFb66618962f8c332706F8f8d339c08#code
   ✅ Status: VERIFIED
   📝 Contract Name: FlashSwapV2
   🔧 Compiler: v0.8.20+commit.a1b79de6
   ⚡ Optimization: Yes
   📜 License: MIT
```

## 📦 Available Verification Methods

### Method 1: Verification Status Checker (Fastest)

**Use this to check if contracts are already verified:**

```bash
npm run verify:check
```

**What it does:**
- Queries BaseScan API for verification status
- Shows contract details if verified
- Provides links to view on BaseScan
- Exit code 0 if all verified, 1 if not

**Script:** `scripts/validation/verify-v2-v3-simple.ts`

### Method 2: API-Based Verification (Automated)

**Use this to verify contracts via API:**

```bash
npm run verify:api
```

**What it does:**
- Reads flattened source from `./verification/`
- Reads constructor args from `./verification/`
- Submits to BaseScan API V2 for verification
- Polls for verification completion

**Script:** `scripts/validation/verify-v2-v3-api.ts`

**Note:** Requires `BASESCAN_API_KEY` in environment.

### Method 3: Foundry-Based Verification (Most Reliable)

**Use this if Foundry is installed:**

```bash
npm run verify:foundry
```

**What it does:**
- Uses `forge verify-contract` command
- Automatically reads constructor args
- Handles verification for both contracts
- Most reliable method (if Foundry installed)

**Script:** `scripts/verification/verify-contracts-foundry.sh`

**Requirements:**
- Foundry must be installed: `curl -L https://foundry.paradigm.xyz | bash && foundryup`

### Method 4: Full Autonomous Verifier (Complex)

**Use this for complete autonomous verification:**

```bash
npm run verify:v2-v3-auto
```

**What it does:**
- Checks verification status first
- Attempts Hardhat-based verification
- Falls back to status check
- Comprehensive error handling

**Script:** `scripts/validation/verify-contracts-autonomous.ts`

**Note:** May have compatibility issues with Hardhat v3.

### Method 5: Manual Verification (Always Works)

**Use this if automated methods fail:**

1. Visit: https://basescan.org/verifyContract
2. Use files from `./verification/` directory:
   - `FlashSwapV2_flattened.sol` / `FlashSwapV3_flattened.sol`
   - `FlashSwapV2_constructor_args.txt` / `FlashSwapV3_constructor_args.txt`
3. Follow instructions in `./verification/README.md`

## 🔧 Configuration

### Required Environment Variables

```bash
# .env file
BASESCAN_API_KEY=your_api_key_here
FLASHSWAP_V2_ADDRESS=0x6e2473E4BEFb66618962f8c332706F8f8d339c08
FLASHSWAP_V3_ADDRESS=0x4926E08c0aF3307Ea7840855515b22596D39F7eb
BASE_RPC_URL=https://mainnet.base.org
```

**Get BaseScan API Key:**
- Visit: https://basescan.org/myapikey
- Create free account
- Generate API key
- Add to `.env` file

## 📊 Contract Information

### FlashSwapV2

- **Address:** `0x6e2473E4BEFb66618962f8c332706F8f8d339c08`
- **Network:** Base Mainnet (Chain ID: 8453)
- **Compiler:** v0.8.20+commit.a1b79de6
- **Optimization:** Yes (200 runs)
- **License:** MIT
- **Constructor Args:** Available in `verification/FlashSwapV2_constructor_args.txt`
- **BaseScan:** https://basescan.org/address/0x6e2473E4BEFb66618962f8c332706F8f8d339c08#code

### FlashSwapV3

- **Address:** `0x4926E08c0aF3307Ea7840855515b22596D39F7eb`
- **Network:** Base Mainnet (Chain ID: 8453)
- **Compiler:** v0.8.20+commit.a1b79de6
- **Optimization:** Yes (200 runs)
- **License:** MIT
- **Constructor Args:** Available in `verification/FlashSwapV3_constructor_args.txt`
- **BaseScan:** https://basescan.org/address/0x4926E08c0aF3307Ea7840855515b22596D39F7eb#code

## 🧪 Testing Verification Status

To test if contracts are verified before Phase 1 Action 2 launch:

```bash
# Check verification status
npm run verify:check

# Should output: "SUCCESS: All contracts are verified on BaseScan!"
# Exit code: 0
```

Use this in CI/CD pipelines:

```bash
npm run verify:check || echo "⚠️  Contracts not verified yet"
```

## 🎨 Integration with Etherscan MCP

The verification checker integrates with the recent Etherscan MCP Server (PR #490):

```typescript
import { createEtherscanClient } from '@/intelligence/etherscan';

const client = createEtherscanClient({
  apiKey: process.env.BASESCAN_API_KEY!,
  chain: 'base'
});

// Check verification status
const sourceCode = await client.contract.getSourceCode(contractAddress);
const isVerified = sourceCode[0].SourceCode !== '';
```

## 🔍 Troubleshooting

### "BASESCAN_API_KEY not found"

**Solution:** Add API key to `.env` file

```bash
echo "BASESCAN_API_KEY=your_key_here" >> .env
```

### "Network 'base' is not defined"

**Solution:** Add BASE_RPC_URL to `.env` file

```bash
echo "BASE_RPC_URL=https://mainnet.base.org" >> .env
```

### "Verification failed with API"

**Solutions:**
1. Try Foundry method: `npm run verify:foundry`
2. Try manual verification with files in `./verification/`
3. Check API rate limits (5 requests/second)

### "Hardhat compatibility issues"

**Note:** Hardhat v3 has some compatibility issues with the verify plugin. Use Foundry or API methods instead.

## 📚 Documentation References

- **Verification README:** `./verification/README.md`
- **Etherscan MCP:** `./docs/integrations/etherscan/README.md`
- **BaseScan Docs:** https://docs.basescan.org/
- **Foundry Verification:** https://book.getfoundry.sh/reference/forge/forge-verify-contract

## ✅ Success Criteria

Contract verification is complete when:

1. ✅ `npm run verify:check` returns exit code 0
2. ✅ Both contracts show "VERIFIED" status
3. ✅ Contract source visible on BaseScan
4. ✅ Users can interact via BaseScan UI

## 🎯 Phase 1 Action 2 Readiness

Contract verification is a **prerequisite** for Phase 1 Action 2 (autonomous Base network arbitrage):

```bash
# Step 1: Verify contracts are verified
npm run verify:check

# Step 2: If verified, launch Phase 1 Action 2
npm run phase1:action2:launch
```

## 🤖 Autonomous Capabilities

The verification system demonstrates autonomous capabilities:

1. **Status Checking:** Autonomously queries BaseScan for verification state
2. **Smart Fallback:** Tries multiple verification methods automatically
3. **Error Handling:** Gracefully handles API failures and rate limits
4. **Progress Reporting:** Provides detailed status updates during verification
5. **Integration Ready:** Works with existing MCP and Etherscan infrastructure

## 📝 Notes

- Verification files are pre-generated in `./verification/` directory
- Constructor arguments are ABI-encoded and ready to use
- All verification methods read from the same source files
- Manual verification always works as a fallback
- Verification is permanent once successful (immutable on blockchain)

---

**Added:** 2025-12-21  
**Context:** Post-Etherscan MCP integration (PR #490)  
**Purpose:** Enable autonomous contract verification checking for Phase 1 Action 2
