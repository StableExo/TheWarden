# ⚠️ IMPORTANT: Read This First Before Verifying!

## 🚨 Common Verification Error

If you see this error on BaseScan:
```
ParserError: Expected pragma, import directive or contract/interface/library/struct/enum/constant/function/error definition.
 --> myc:1:1:
  |
1 | 0000000000000000000000002626664c2603 ...
```

**You've put the CONSTRUCTOR ARGUMENTS in the SOURCE CODE field!**

## ✅ Correct Verification Process

### What Goes Where

```
┌─────────────────────────────────────────────────────────────┐
│  BaseScan Verification Form                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1️⃣  Compiler Type: Solidity (Single file)                  │
│  2️⃣  Compiler Version: v0.8.20+commit.a1b79de6              │
│  3️⃣  License Type: MIT License (MIT)                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 4️⃣  Enter the Solidity Contract Code below:            │ │
│  │                                                         │ │
│  │ ❌ DO NOT PASTE CONSTRUCTOR ARGS HERE!                 │ │
│  │ ✅ PASTE FROM: FlashSwapV3_flattened.sol               │ │
│  │                                                         │ │
│  │ Should start with:                                     │ │
│  │ // Sources flattened with hardhat...                   │ │
│  │ pragma solidity...                                     │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  5️⃣  Optimization: Yes                                      │
│  6️⃣  Runs: 200                                              │
│  7️⃣  EVM Version: shanghai                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 8️⃣  Constructor Arguments (ABI-encoded):               │ │
│  │                                                         │ │
│  │ ✅ PASTE FROM: FlashSwapV3_constructor_args.txt        │ │
│  │                                                         │ │
│  │ Should start with:                                     │ │
│  │ 0000000000000000000000002626664c2603...                │ │
│  │                                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Verify and Publish]                                        │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Step-by-Step Checklist

### Before You Start

- [ ] **Read this entire document**
- [ ] **Have both files ready:**
  - `FlashSwapV3_flattened.sol` (2,313 lines, starts with `// Sources flattened`)
  - `FlashSwapV3_constructor_args.txt` (1 line, starts with `0000000000`)

### During Verification

1. [ ] Go to BaseScan verification page
2. [ ] Select **Solidity (Single file)** as compiler type
3. [ ] Select compiler version `v0.8.20+commit.a1b79de6`
4. [ ] **In the SOURCE CODE field:**
   - [ ] **Copy ALL contents** from `FlashSwapV3_flattened.sol`
   - [ ] **Verify it starts with:** `// Sources flattened with hardhat`
   - [ ] **NEVER paste the constructor args here!**
5. [ ] Set Optimization to **Yes**
6. [ ] Set Runs to **200**
7. [ ] Set EVM Version to **shanghai**
8. [ ] **In the CONSTRUCTOR ARGUMENTS field:**
   - [ ] **Copy the hex string** from `FlashSwapV3_constructor_args.txt`
   - [ ] **Verify it starts with:** `0000000000000000`
   - [ ] **Remove any newlines or spaces**
9. [ ] Click "Verify and Publish"

## 🔍 Quick Visual Check

### ✅ Source Code Field Should Look Like:
```solidity
// Sources flattened with hardhat v3.0.16 https://hardhat.org

// SPDX-License-Identifier: GPL-2.0-or-later AND MIT AND UNLICENSED

pragma abicoder v2;

// File npm/@openzeppelin/contracts@5.4.0/token/ERC20/IERC20.sol
...
```

### ✅ Constructor Arguments Field Should Look Like:
```
0000000000000000000000002626664c2603336e57b271c5c0b26f421741e4810000000000000000000000006bded42c6da8fbf0d2ba55b2fa120c5e0c8d7891000000000000000000000000ba12222222228d8ba445958a75a0704d566bf2c80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a238dd80c259a72e81d7e4664a9801593f98d1c5000000000000000000000000e20fcbdbffc4dd138ce8b2e6fbb6cb49777ad64d00000000000000000000000033128a8fc17869897dce68ed026d694621f6fdfd00000000000000000000000048a6e6695a7d3e8c76eb014e648c072db385df6c0000000000000000000000000000000000000000000000000000000000001b58
```

### ❌ WRONG - Source Code Field Should NEVER Look Like:
```
0000000000000000000000002626664c2603 ...
```
**This will cause the parser error!**

## 🎯 Alternative: Use Gist (Easier!)

If this seems complicated, use the **Gist method** instead:

```bash
npm run verify:upload-gist
```

Then follow the simpler instructions in `GIST_URLS.md`.

## 📚 More Help

- **Gist Method:** See `README.md` in this directory
- **Common Errors:** See `BASESCAN_VERIFICATION_FIX.md`
- **Full Guide:** See `docs/CONTRACT_VERIFICATION_GUIDE.md`

## 🆘 Still Having Issues?

1. **Double-check you're pasting from the correct files**
2. **Make sure constructor args are on a single line (no newlines)**
3. **Try the Gist method instead** - it's easier and less error-prone
4. **Check that your files exist** - run `npm run verify:autonomous` to regenerate them

---

**Remember:** The hex string starting with `0000000000` goes in the CONSTRUCTOR ARGUMENTS field, NOT the source code field!
