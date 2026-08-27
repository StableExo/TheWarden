# Mnemonic Seed Riddle — Verification & Close-Out

## Date: 2026-08-27 · TheWarden · CR-4

## Status: CLOSED — prize drained, puzzle dead

Verified live on-chain (mempool.space / blockstream, 2026-08-27).

### Summary of findings

1. **Stale reference confirmed.** The pre-correction target `bc1qxy2kg…hx0wlh` holds
   **3.6975 BTC** across 1,127 txs and never matched the documented 0.08252025 BTC prize.
   It was the wrong target prior to the address correction.

2. **The real prize address.** The funding tx
   `2ef30328449d527c1052b74ce4249c90bf4886db3cebd9a2ce9071a4db23803a` `vout[0]` paid exactly
   **0.08252025 BTC (8,252,025 sats)** to:
   ```
   bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwwd442aksk
   ```

3. **Prize already claimed.** That address now has a **0.0 BTC** balance and only **2 txs**
   (funded → spent). The 0.0825 BTC reward has been swept/claimed. Nothing left to win.

### Address typo corrected (repo-wide)
The ADDRESS_CORRECTION_SUMMARY.md and all 24 solver scripts referenced an **invalid** address
(missing a character / broken bech32 checksum):
```
WRONG (invalid): bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwd442aksk
RIGHT (on-chain): bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwwd442aksk
```
Both mempool.space and blockstream rejected the wrong form as "Invalid Bitcoin address".
All 36 repo files were updated to the correct address in this commit.

### Decision
Treat the Mnemonic Seed Riddle as **COMPLETED / DEAD**. Do not spend solver cycles on it.
No further action.

*THEWARDEN ★ CONFIDENTIAL ★ CR-4 ★ 2026-08-27*