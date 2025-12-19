# Quick Fix Reference for BaseScan Verification ParserError

## 🚨 Got a ParserError?

If you see this error:
```
ParserError: Expected pragma, import directive or contract/interface/library/struct/enum/constant/function/error definition.
    --> myc:1478:1:
```

## ✅ The Fix (One Command)

```bash
cd verification
for file in *.sol; do
  tr -d '\r' < "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done
```

## 🧪 Verify It Worked

```bash
npm run verify:validate
```

You should see: `✅ All validation checks passed!`

## 📋 Now Verify on BaseScan

### Option 1: Use Gist (Easiest)

```bash
npm run verify:upload-gist
```

Then follow the instructions in `verification/GIST_URLS.md`

### Option 2: Manual Upload

1. Go to BaseScan verification page
2. Copy content of `FlashSwapV3_flattened.sol` → paste into **source code field**
3. Copy content of `FlashSwapV3_constructor_args.txt` → paste into **constructor arguments field**
4. Compiler: `v0.8.20+commit.a1b79de6`
5. Optimization: Yes, 200 runs
6. EVM: shanghai
7. Click "Verify and Publish"

## 🔍 What Was Wrong?

The files had mixed line endings (CRLF + LF), which confused the Solidity parser.

## 📚 More Details

- Technical: `LINE_ENDINGS_FIX.md`
- Complete Summary: `PARSER_ERROR_FIX_COMPLETE.md`
- User Guide: `IMPORTANT_READ_FIRST.md`

## 🎯 Prevention

Always run before uploading:
```bash
npm run verify:validate
```

This will catch line ending issues and other problems.

---

**Quick Help:**
- 💬 Issue with source code? Check you're using `*_flattened.sol`, not `*_constructor_args.txt`
- 💬 Issue with line endings? Run the fix command above
- 💬 Still having issues? See `IMPORTANT_READ_FIRST.md`
