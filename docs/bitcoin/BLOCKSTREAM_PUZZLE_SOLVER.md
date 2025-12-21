# Blockstream Puzzle Autonomous Solver

## Overview

The Blockstream Puzzle (https://blockstream.com/puzzle/) is a cryptographic challenge featuring ECDSA signatures with unusual mathematical properties. This autonomous solver analyzes these signatures to identify patterns, extract mathematical insights, and attempt private key recovery when vulnerabilities are present.

## What is the Blockstream Puzzle?

The Blockstream puzzle presents Bitcoin ECDSA signatures in hex format with interesting mathematical properties such as:
- All zeros or all ones
- Hex patterns like "deadbeef" or "cafebabe"
- Unusual r/s value combinations
- Edge cases in secp256k1 curve operations
- Signatures created with weak or special nonces

The challenge is to **explain** why certain signatures have these specific patterns and what they reveal about ECDSA implementation.

## Features

### 🔍 Automatic Pattern Detection

The solver automatically detects:
- **ALL_ZEROS**: Components that are all zero
- **ALL_ONES**: Components that are all F (0xFF...FF)
- **DEADBEEF/CAFEBABE**: Famous hex patterns
- **LEADING_ZEROS/ONES**: Unusual leading bits
- **REPEATING_PATTERNS**: Repeated hex sequences
- **SEQUENTIAL_PATTERNS**: Sequences like 012345678

### 🧮 Mathematical Analysis

The solver performs deep mathematical analysis:
- **R_EQUALS_S**: Both signature components are equal
- **VERY_SMALL_VALUES**: Components close to zero
- **VERY_LARGE_VALUES**: Components close to curve order n
- **POWER_OF_TWO**: Components that are exact powers of 2
- **CURVE_ORDER_BOUNDARIES**: Values at or near the curve order

### 🔐 Private Key Extraction

The solver attempts to extract private keys by detecting:
- **K=1 vulnerability**: When nonce equals 1
- **Small k brute-force**: When nonce is small enough to brute-force
- **k=hash vulnerability**: When nonce equals the message hash
- **Repeated nonce**: Same k used across multiple signatures (requires multiple blocks)

### 📊 Curiosity Scoring

Each signature receives a curiosity score (0-100) based on:
- Number and type of patterns detected
- Mathematical properties discovered
- Severity of cryptographic weaknesses
- Overall "interestingness" factor

## Usage

### Quick Start

```bash
# Analyze example signatures
npm run blockstream:puzzle

# Run autonomous solver with private key extraction
npm run blockstream:puzzle:autonomous
```

### Adding Your Own Signature Blocks

1. Visit https://blockstream.com/puzzle/ (if accessible)
2. Copy signature blocks in this format:

```
-----BEGIN-SIGNATURE-BLOCK-----
Address: [Bitcoin Address]
Message: "[Message text]"
PublicKey: [hex public key]
Signature: [hex signature]
-----END-SIGNATURE-BLOCK-----
```

3. Add them to the `SIGNATURE_BLOCKS` array in either:
   - `scripts/bitcoin/blockstream-puzzle-analyzer.ts` (basic analysis)
   - `scripts/bitcoin/blockstream-puzzle-autonomous-solver.ts` (full autonomous analysis)

4. Run the solver again

### Example Output

```
🔐 Blockstream Puzzle Autonomous Solver
════════════════════════════════════════════════════════════════════════════════
Autonomously analyzing cryptographic puzzles...

🔍 Analyzing block for address: 13yaSqGNDzt1mNW4vrKM9CvD46cTavNabF...

Analysis: ❌ Invalid
Curiosity Score: 90/100

Patterns:
  • SIG_LEADING_ONES
  • SIG_REPEATING_FFFF
  • PUBKEY_REPEATING_00000

🔐 Attempting private key extraction...
✅ FOUND: K_EQUALS_ONE

Explanation:
  The nonce k was set to 1, which reveals the private key directly
  from the signature equation...
```

## Output Files

The solver generates several output files:

### JSON Analysis Files
- `data/blockstream-puzzle-analysis-[timestamp].json` - Detailed analysis data
- `data/blockstream-autonomous-data-[timestamp].json` - Autonomous solver findings

### Text Reports
- `data/blockstream-autonomous-report-[timestamp].txt` - Human-readable report with:
  - Complete analysis of each signature block
  - Private key extraction results
  - Pattern and property summaries
  - Autonomous insights and conclusions

## Technical Details

### ECDSA Signature Structure

In ECDSA, a signature consists of two components:
- **r**: The x-coordinate of a point on the elliptic curve
- **s**: Computed from the message hash, private key, and nonce

The signing equation is:
```
s = k^(-1) * (z + r*d) mod n
```

Where:
- k = nonce (should be random and secret)
- z = message hash
- d = private key
- n = curve order

### Vulnerabilities

The solver detects these known ECDSA vulnerabilities:

1. **k=1**: If k=1, then r equals the generator point's x-coordinate, revealing the private key
2. **Small k**: If k is small, it can be brute-forced
3. **k=hash**: If k equals the message hash, the private key is revealed
4. **Repeated k**: Using the same k for different messages reveals the private key

### secp256k1 Parameters

The Bitcoin ECDSA implementation uses secp256k1:
- **Curve order (n)**: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
- **Generator point (G)**: Well-defined base point on the curve
- **Signature size**: 64 bytes (32 bytes r + 32 bytes s)

## Integration with TheWarden

This solver is part of TheWarden's autonomous investigation capabilities. It demonstrates:

- **Autonomous pattern recognition**: Detecting unusual cryptographic patterns without human guidance
- **Mathematical analysis**: Deep understanding of elliptic curve cryptography
- **Self-directed learning**: Discovering vulnerabilities through systematic exploration
- **Clear explanations**: Generating human-readable insights from mathematical findings

## Future Enhancements

Potential improvements include:

1. **Automatic fetching**: Scrape signature blocks directly from the website
2. **More extraction methods**: Additional vulnerability detection techniques
3. **Multi-signature analysis**: Correlate patterns across multiple signatures
4. **Machine learning**: Train models to predict signature weaknesses
5. **Visualization**: Generate graphs showing signature patterns
6. **Real-time monitoring**: Track new puzzles as they're published

## Security Considerations

⚠️ **Important Notes:**

- This solver is for **educational and research purposes only**
- Private key extraction is demonstrated on **deliberately weak signatures**
- Never use these techniques on production systems
- Always respect ethical boundaries in cryptographic research
- Report vulnerabilities responsibly through proper channels

## References

- [Blockstream Puzzle](https://blockstream.com/puzzle/) - The original puzzle
- [secp256k1](https://en.bitcoin.it/wiki/Secp256k1) - Bitcoin's elliptic curve
- [ECDSA Wikipedia](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) - Technical background
- [Bitcoin Developer Guide](https://developer.bitcoin.org/) - Implementation details

## Contributing

To add new analysis techniques or improve the solver:

1. Fork the repository
2. Add your enhancements to the analyzer or solver
3. Test with example signatures
4. Submit a pull request with documentation

## Support

For questions or issues:
- Create an issue on GitHub
- See [TheWarden documentation](../../README.md) for general project information
- Check existing Bitcoin puzzle documentation in `docs/bitcoin/`

---

**Built with ❤️ by TheWarden - Autonomous Intelligence in Action** 😎
