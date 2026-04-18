# MASTER INTEGRATION ROADMAP

## Comprehensive Analysis of Axion Citadel Repository

### Overview
The Axion Citadel repository contains a wide range of components and functionalities that can be beneficial if integrated with other systems or projects. The analysis below details salvageable components along with an integration timeline and strategic recommendations.

### Salvageable Components
1. **Core Algorithms**: The repository includes several core algorithms that have been designed to optimize performance.
2. **User Interface Modules**: UI components are modular and can be reused in various applications.
3. **APIs**: Robust APIs that allow for easy integration with other systems.
4. **Documentation**: Comprehensive documentation that provides guidance on utilizations.

### Integration Timeline
- **Phase 1 (Q1 2026)**: Initial assessment and preparation of the environment.
- **Phase 2 (Q2 2026)**: Integration of core algorithms and testing.
- **Phase 3 (Q3 2026)**: Integration of UI modules with front-end applications.
- **Phase 4 (Q4 2026)**: Final testing and deployment of integrated systems.

### Strategic Recommendations
- **Prioritize Integration of Core Algorithms**: Focus on algorithms that have the highest impact on performance first.
- **Leverage Existing APIs**: Utilize the APIs to expedite integration processes and reduce redundancy.
- **Maintain Documentation**: Continuously update documentation to reflect changes and facilitate easier onboarding.

## Conclusion
The Axion Citadel repository offers valuable components for integration. By following the proposed timeline and strategic recommendations, we can achieve a successful integration process.

---

## ✅ S41 — The Apothecary (COMPLETE)

### Theme: Fix the fee tier mismatch preventing on-chain execution

### What Was Fixed
- 🔲→✅ **"Execution reverted" (data: 0x)** — Root cause: fee tier mismatch
  - ALL swap steps sent fee=3000 regardless of actual pool fee (10000, 500, 100)
  - SwapRouter uses `Factory.getPool(tokenIn, tokenOut, fee)` — wrong fee = address(0) = revert
  - Fixed across 4 layers of the data pipeline + on-chain fee query as nuclear fallback

### 4 Commits
| # | SHA | Change |
|---|-----|--------|
| 1 | `993e5668` | feeBps * 100 conversion in FlashSwapV3Executor |
| 2 | `15d0b88f` | Pass actual V3 pool fee from factory discovery to graph edges |
| 3 | `bf62954a` | On-chain fee query in executor (backup code path) |
| 4 | `3eeba865` | On-chain fee query in IntegratedArbitrageOrchestrator (actual code path) |

### What Remains for S42
- 🔲 Verify first successful on-chain swap execution
- 🔲 Propagate fee through full PoolEdge→PoolState pipeline (remove on-chain query dependency)
- 🔲 Profit validation accuracy — cached ~0.087 ETH drops 95% to ~0.004 ETH after JIT
- 🔲 Memory at ~86% — stable but tight
- 🔲 Profit withdrawal mechanism (UserOp to sweep Smart Wallet → EOA)

---

