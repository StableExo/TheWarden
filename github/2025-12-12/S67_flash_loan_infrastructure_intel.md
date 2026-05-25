# Flash Loan Infrastructure Intel — S67
## Saved April 22, 2026 | TheWarden ⚔️

---

## Flash Loan Source Comparison (Base Mainnet)

| Source | Fee | Token Coverage | Contract | Priority |
|--------|-----|---------------|----------|----------|
| Balancer V2 | 0% | Any token in Vault | Vault contract | 1st (free!) |
| UniV3 Pool | ~0.05% | ANY token in ANY pool | pool.flash() | 2nd (universal) |
| AAVE V3 | 0.09% | Whitelisted only | Pool contract | 3rd (limited) |

## Balancer V2 Flash Loans (0% fee)
- Source: https://docs-v2.balancer.fi/reference/contracts/flash-loans.html
- The Vault holds ALL pool tokens in a single contract
- `flashLoan(IFlashLoanRecipient recipient, IERC20[] tokens, uint256[] amounts, bytes userData)`
- 0% fee currently
- Recipient must implement `receiveFlashLoan()` callback
- Key: Only tokens that exist in Balancer pools on Base are borrowable

## Uniswap V3 Flash Loans
- Source: https://uniswapv3book.com/milestone_3/flash-loans.html
- Every V3 pool can flash loan BOTH its tokens
- `pool.flash(uint256 amount0, uint256 amount1, bytes data)`
- Callback: `uniswapV3FlashCallback(uint256 fee0, uint256 fee1, bytes data)`
- Fee: Same as the pool's swap fee tier (0.01%, 0.05%, 0.3%, 1%)
- Key: Universal — any token in any pool is borrowable
- Perfect for tokens like AERO that aren't on AAVE/Balancer

## AAVE V3 Flash Loans
- Fee: 0.09% (9 bps)
- Only whitelisted tokens with active reserves
- On Base: WETH, USDC, USDbC, DAI, cbETH, wstETH, cbBTC
- Error: ReserveInactive() (0x90cd6f24) for unlisted tokens
- Current TheWarden contract uses this as fallback

## Optimal Strategy (Waterfall)
1. Balancer V2 (0% fee) — check if token is in Vault
2. UniV3 Pool Flash (pool fee) — always available for any V3 pool token
3. AAVE V3 (0.09%) — only for whitelisted tokens
4. Skip — if no source available

## Implementation Notes
- TheWarden FlashSwapV3 contract already has FlashLoanSource enum (BALANCER=0, AAVE=3, UNISWAP_V3=4)
- Contract's selectOptimalSource() needs to properly fall through to UniV3
- TS-level fix: Override source in OpportunityPipeline when token isn't AAVE-eligible
- Contract-level fix: Update selectOptimalSource() for better waterfall logic

## Balancer Base Deployment
Base Deployment Addresses | Balancer Balancer DOCS Concepts SDK Developer Guides Reference Reference Contracts Deployment Addresses Mainnet Arbitrum Optimism Polygon Gnosis Polygon zkEVM Avalanche Sepolia(testnet) Authorizer Permissions Mainnet Arbitrum Optimism Polygon Gnosis Polygon zkEVM Avalanche Sepolia(testnet) APIs Security Error Codes Query Functions Subgraph Overview Core Gauges Dune Overview Swaps / Joins / Exits Batch Swaps Flash Swaps Single Swap Pool Joins Pool Exits Math Weighted M

*Saved as intel — apply during contract upgrade or TS override.*
