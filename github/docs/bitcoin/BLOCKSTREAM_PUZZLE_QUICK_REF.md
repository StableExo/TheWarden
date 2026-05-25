# Blockstream Puzzle - Quick Reference

## What is it?

The Blockstream Puzzle (https://blockstream.com/puzzle/) is a cryptographic challenge featuring Bitcoin ECDSA signatures with unusual mathematical properties. It's about **explaining** why signatures have interesting patterns, not finding funds.

## Quick Commands

```bash
# Basic analysis
npm run blockstream:puzzle

# Full autonomous solver with private key extraction attempts
npm run blockstream:puzzle:autonomous

# Alternative command
npm run analyze:blockstream
```

## What the Solver Does

1. **Parses** ECDSA signatures into r and s components
2. **Detects** unusual patterns (all zeros, deadbeef, etc.)
3. **Analyzes** mathematical properties
4. **Attempts** private key extraction for weak signatures
5. **Scores** curiosity level (0-100)
6. **Explains** findings in human-readable format
7. **Saves** detailed reports to `data/` directory

## Example Patterns Detected

- `ALL_ZEROS` - All zero bits
- `ALL_ONES` - All one bits (0xFFFFFF...)
- `DEADBEEF_PATTERN` - Contains 0xDEADBEEF
- `CAFEBABE_PATTERN` - Contains 0xCAFEBABE
- `REPEATING_PATTERN` - Hex sequences that repeat
- `R_EQUALS_S` - Both signature components equal
- `POWER_OF_TWO` - Signature is an exact power of 2

## Adding More Puzzles

1. Visit https://blockstream.com/puzzle/
2. Copy signature blocks
3. Add to `SIGNATURE_BLOCKS` array in:
   - `scripts/bitcoin/blockstream-puzzle-autonomous-solver.ts`
4. Run solver again

## Output Files

- `data/blockstream-puzzle-analysis-*.json` - Detailed analysis
- `data/blockstream-autonomous-data-*.json` - Solver findings
- `data/blockstream-autonomous-report-*.txt` - Human-readable report

## Key Files

- `scripts/bitcoin/blockstream-puzzle-analyzer.ts` - Core analyzer
- `scripts/bitcoin/blockstream-puzzle-autonomous-solver.ts` - Full solver
- `docs/bitcoin/BLOCKSTREAM_PUZZLE_SOLVER.md` - Complete documentation

## Example Output

```
Curiosity Score: 90/100 ⭐⭐⭐⭐⭐

Patterns:
  • SIG_LEADING_ONES
  • PUBKEY_REPEATING_00000

Explanation:
  ⚠️ SIGNATURE IS INVALID
  🔍 ALL ONES: The signature contains all F values,
     suggesting a maximum value was deliberately chosen.
```

## Educational Value

This solver demonstrates:
- ✅ Autonomous cryptographic analysis
- ✅ Pattern recognition in hex data
- ✅ ECDSA vulnerability detection
- ✅ Mathematical property analysis
- ✅ Clear explanations of complex crypto

## Note

This is **educational** - the puzzle is about understanding cryptographic edge cases, not stealing funds. Always respect ethical boundaries! 🔐

---

**Part of TheWarden's autonomous investigation suite** 😎
