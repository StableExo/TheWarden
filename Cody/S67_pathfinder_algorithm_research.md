# Pathfinder Algorithm Research — S67 Intel
## Saved April 22, 2026 | For future optimization (S68-S70+)

---

## Current State
- TheWarden uses cross-DEX 2-hop spread detection (SwapMonitor → PriceTracker → Pipeline)
- Bellman-Ford exists in `src/arbitrage/AdvancedPathFinder.ts` but NOT wired to live pipeline
- Graph size: ~51 pools, ~15 unique tokens, 7 DEXes (tiny graph)

## Better-Than-Bellman-Ford Algorithms

### 1. SPFA (Shortest Path Faster Algorithm) ⭐⭐⭐
- Queue-based Bellman-Ford improvement
- Only updates nodes whose neighbors changed
- O(E) average time vs O(VE) for standard BF
- **Best drop-in replacement** for AdvancedPathFinder.ts
- Refs: konaeakira.github.io, geeksforgeeks.org/dsa/shortest-path-faster-algorithm

### 2. Tarjan's Cycle Detection ⭐⭐⭐
- Detects negative cycles DURING search, not after
- Early termination = critical milliseconds saved
- **Combine with SPFA** for "find first profitable cycle ASAP"
- Ref: imada.sdu.dk/u/jbj/DM817/Negativicyclefinding.pdf

### 3. Johnson's Algorithm (All-Pairs) ⭐
- BF once to reweight → Dijkstra for pathfinding
- Overkill for 15 tokens, useful if scaling to 100+ tokens
- Ref: brilliant.org/wiki/johnsons-algorithm

### 4. Modified Moore-Bellman-Ford (MMBF)
- Combines line graphs with BF for non-loop arb paths
- Higher profit than standard BF in research
- Ref: clavichord-nectarine.squarespace.com

### 5. GNN / LSTM (Future)
- Graph Neural Networks for predictive strategy
- LSTM for trend detection + cointegration
- Needs training data, research-stage
- Refs: arxiv.org/html/2406.16573v1, pmc.ncbi.nlm.nih.gov/articles/PMC11323094

## Recommendation for TheWarden
**Phase 1 (S68-69):** Implement SPFA + Tarjan early termination in AdvancedPathFinder.ts
**Phase 2 (S70+):** Wire to live pipeline alongside 2-hop detector
**Phase 3 (Future):** GNN-based predictive layer

*Saved as intel — revisit after first blood.*
