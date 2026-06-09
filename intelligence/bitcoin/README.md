# intelligence/bitcoin/

Bitcoin puzzle attack scripts and research.

## Active Puzzles (GL-L59)

| Puzzle | Reward | Status |
|--------|--------|--------|
| 71 | 7.10145615 BTC | 0.85% scanned — need GPU + CUDA |
| 135 | 13.50003408 BTC | Floor WIF PENDING (cut off GL-L57) |
| 140 | 14.00 BTC | PubKey found GL-L58 — range pending |

## Scripts
Bitcoin puzzle scripts live in `scripts/bitcoin/` (87 files).
Key script: `wif_scanner.py` — needs CUDA backend for GPU deployment.

## Puzzle 71 WIF Range
- Floor:   `KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qxGLkchTagWEWquHPtvw`
- Ceiling: `KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3rMnzt63oK7YMypNGFVj3`
- Target:  `1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU`
