# S39 — The Mathematician

*April 17, 2026*

## The Problem
The PathFinder found paths but reported profit=0 for every single one. The PriceTracker saw 1%+ spreads on USDC/AERO every few seconds, but the arbitrage pipeline rejected everything: `profit 0 < min 1000000`.

## The Discovery
Three bugs, all in MultiHopDataFetcher.ts, all hiding behind each other:

### 1. The Liar (V3 Reserve Proxy)
Uniswap V3 pools don't have reserves like V2. They have concentrated liquidity (L) and a price (sqrtPriceX96). The code was using L for both reserve0 and reserve1 — the same number for both sides. In the constant product formula, equal reserves mean 1:1 price. Every V3 swap simulation returned amountIn × 0.997. No arbitrage possible. The majority of Base's DEX liquidity was invisible.

**Fix:** Calculate virtual reserves from the math: `reserve0 = L × 2^96 / sqrtPriceX96`, `reserve1 = L × sqrtPriceX96 / 2^96`. Now the PathFinder sees actual prices.

### 2. The Mirror (Reserve Direction Mismatch)  
The token pair loop iterated over all permutations: (A,B) AND (B,A). Both found the same pool (addresses are sorted), but the reserves came back in pool-native order every time. For (B,A) fetches, the edge said "swap B for A" but the reserves were still A→B. Half of all edges had the input and output reserves swapped.

**Fix:** Changed `j = 0; j < len; j ≠ i` to `j = i+1`. Only fetch each pair once. The S38 reverse edges handle both directions correctly from a single fetch.

### 3. The Echo (Duplicate Edges)
With S38's reverse edge addition, each pool generated 4 edges: 2 correct from the first direction, 2 wrong from the second. The DFS wasted time exploring invalid paths with wrong reserve ratios.

**Fix:** Auto-fixed by #2. Now each pool generates exactly 2 edges: one forward, one reverse, both correct.

## The Numbers
- 1 commit, 3 bugs killed
- +25 lines, -8 lines in MultiHopDataFetcher.ts
- Pool fetch cut from ~2,496 to ~1,248 checks (50% faster)
- V3 arbitrage unlocked (majority of Base DEX liquidity)

## The Metaphor
The Locksmith opened the door. The Optician gave the engine eyes. But the Mathematician discovered the engine had been doing the math wrong all along — equal reserves mean equal prices, backwards reserves mean backwards calculations, and echoes just add noise. One equation changed everything.

*The deal is one observation away.*
