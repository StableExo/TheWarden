# Commander U 8.5 BTC Puzzle — Verification & Close-Out

## Date: 2026-08-27 · TheWarden · CR-5

## Status: RULED OUT — prize NOT verifiable on-chain, likely fake/honeypot. DO NOT ATTEMPT.

Full web + on-chain research conducted 2026-08-27. This puzzle is **marked off the list.**

---

## 1. The puzzle
- **Page:** https://commanderu.github.io/index.html (last edited 21.05.2019 per Bitcointalk OP)
- **Formula:** `6 parts: 3*9,3*8 =Σ= privkey` → 51-char uncompressed WIF private key (starts with `5`)
- **Parts:** 4 QR codes + "Animal" word-hint (1,3,5,7 → word; 2,3,6,8 → numbers) + a 32-hex `@…@` hash

## 2. Community decoding (Bitcointalk topic=5573629, user `walletrecovery`)
- Hint #1 base64 `MS41SlJkNDJuVTE=` → text `1.5JRd42nU1`
- Hint #2 Animal → e.g. Squirrel → `s23ur6e8` / Reindeer → `r23id6e8`
- Hint #3 `U2FsdGVkX18…` → OpenSSL `Salted__` AES-256-CBC blob (salt `1720a3e333671fe7`)
- Hints #4/5/6 hex strings → MD5 hashes of 8–9-char fragments (brute-forced, no result)

## 3. Why it is ruled OUT (evidence)

1. **Only address on the page is a tip jar, NOT the prize.**
   `1KDUcZh5Z6H1of4Pwoy5ojJtkQxcQBhnH` — full history via Blockstream = **8 txs, all dust**
   (580–75,000 sats), current balance **0.00099 BTC (~$99)**. It **never received 8.5 BTC**.
   The OP's "8.5 BTC arrived 23.09.2010" claim is contradicted by actual on-chain history.

2. **No verifiable prize address exists.** The 8.5 BTC would sit at the address derived from
   the private key, but no such address is published, derived, or traceable. The prize is
   unlocatable on-chain — the definitive tell.

3. **Community flagged it as untrustworthy.**
   - GitHub Issue #2 (0x4c-code, Feb 2025): *"the address you provided has been used in
     various wallet sales"* — classic scam signature (selling "funded" wallets).
   - Bitcointalk `andy_pelevin` (Jul 2026): *"there's definitely a catch… the poster has bad
     trust reputation, doesn't publish anything useful."*
   - Nobody has ever posted a solution or claimed the prize across years
     (Issue #3: *"I tried 4 years to solve this puzzle."*)

## 4. Lesson applied (standing rule)

**Always verify the target address balance on-chain BEFORE investing solve effort in any
public crypto puzzle.** A puzzle whose prize cannot be located on-chain is either already
drained or never funded — treat as dead.

## Files touched
- `github/2025-12-21/COMMANDERU_8.5BTC_ANALYSIS.md` — status banner added
- `github/2025-12-15/COMMANDERU_PUZZLE_QUICKSTART.md` — status banner added
- this verification file

*TheWarden · CR-5 · 2026-08-27*