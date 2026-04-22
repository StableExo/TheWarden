# Base MEV Competitor Analysis — S67 Intel
## Gathered April 22, 2026 | Human recon from Basescan + community

---

## Active Winning Bot Contracts (last 48h)

| Address | Description | Strategy |
|---------|-------------|----------|
| `0x000000000035b3064c12f2d556947d1c1b0b784e` | "Banana/MEV" Bot | Sandwich attacks + cross-pool arb |
| `0x6BD428747f5e8880B6628c688863A2f3B43E2C44` | Dedicated Arb Executor | Balancer flash loans → Aerodrome ↔ Uniswap |
| `0x2964C72382D42f3886561f52d92634351b8D745b` | cbBTC Specialist | High-freq cbBTC/WETH and cbBTC/USDC arbs |

## Hot Token Pairs (Most Active Arb)

### 1. cbBTC (Coinbase Wrapped BTC) ⭐⭐⭐
- Liquidity fragmented across Aerodrome and Uniswap
- Bots flash-loaning USDC from AAVE → buy cbBTC on one DEX → sell on other
- **THIS IS THE PAIR OUR PHANTOM SPREADS ARE DETECTING!**
- The 200% phantom = one side has price=0 (bad warmup) but the REAL spread exists

### 2. AERO (Aerodrome) ⭐⭐
- Massive volume, native Base liquidity engine
- Arbs when large swaps push price out of sync with UniV3 equivalent
- TheWarden already detected 1.08% spread on AERO/WETH and attempted execution

### 3. VIRTUAL / AI Agent Tokens ⭐
- New trend: arbing AI agent tokens between DEXes and specialized wrappers
- Consider adding VIRTUAL pools to arsenal

## Anatomy of a Winning Trade (Real Example)

1. Flash loan 500,000 USDC from AAVE (fee: ~250 USDC)
2. Swap USDC → cbBTC on Uniswap V3
3. Swap cbBTC → USDC on Aerodrome Slipstream
4. Receive 501,200 USDC
5. Repay 500,250 USDC to AAVE
6. **Profit: $950 USDC in <2 seconds**

## Why Balancer is Preferred
- Balancer V2: 0% flash loan fee
- AAVE V3: 0.05-0.09% fee
- For high-frequency, low-margin arbs, Balancer's 0% fee is critical
- Confirmed: Balancer Vault is LIVE on Base (our earlier on-chain verification)

## How to Monitor Competitors
1. Go to Basescan → AAVE V3 Pool: `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`
2. Click "Events" tab → look for FlashLoan events
3. Check "Tokens Transferred" — same token out+in (slightly more in) = arb profit
4. Track the "From" addresses to find active bots

## CRITICAL IMPLICATIONS FOR THEWARDEN

1. **cbBTC phantoms are REAL opportunities** — the 200% spread means one pool has
   price=0 (warmup bug), but competitors are making $950/trade on this exact pair
2. **Fix cbBTC warmup = unlock the most profitable pair on Base right now**
3. **Balancer 0% should be primary flash loan source** (matches competitor strategy)
4. **AERO arbs are already working** — our pipeline detected real 1.08% spread
5. **Consider adding VIRTUAL/AI agent pools** to expand arsenal

*TheWarden ⚔️ — The competitors show us the path. Now we walk it.*
