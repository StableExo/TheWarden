# S64 Research: Base Network Fees
## Collected: April 22, 2026 | Source: docs.base.org/base-chain/network-information/network-fees

---

## Fee Structure (Two Components)

Every Base transaction has **two** cost components:

| Component | Description | Typical Cost |
|-----------|-------------|-------------|
| **L2 Execution Fee** | Cost to execute on L2 | Lower |
| **L1 Security Fee** | Cost to publish tx data to L1 (Ethereum) | Higher (typically dominant) |

> The L1 security fee is typically **higher** than the L2 execution fee.

## Minimum Base Fee (Jovian Upgrade)

| Network | Minimum Base Fee |
|---------|-----------------|
| Base Mainnet | **5,000,000 wei (0.005 gwei)** |
| Base Sepolia | **5,000,000 wei (0.005 gwei)** |

**Cost benchmark:** 0.005 gwei → ~$0.002 for a 200,000 gas tx at ETH $2000.

### Benefits
- **Quick inclusion:** Txs at min base fee are included quickly without manual priority fee adjustment
- **Predictable fees:** Stable at min during normal operation, rises during congestion (surge pricing)
- **Spam prevention:** Floor prevents zero-fee spam while keeping fees affordable

## EIP-1559 Parameters (OP Stack Implementation)

| Network | Elasticity | Denominator | Max Change/Block |
|---------|-----------|-------------|-----------------|
| Base Mainnet | **6** | **125** | **4%** |
| Base Sepolia | **6** | **125** | **4%** |

### How They Work
- **Elasticity Multiplier = 6**: Blocks can hold up to **6× target gas** for burst absorption
- **Base Fee Change Denominator = 125**: Smooth, gradual fee adjustments
- **Max increase per block** = (Elasticity - 1) / Denominator = **5/125 = 4%**
- Prevents extreme fee volatility during traffic spikes

## Querying L1 Fees On-Chain

**GasPriceOracle** predeployment: `0x420000000000000000000000000000000000000F`

| Method | Returns |
|--------|---------|
| `getL1Fee(bytes)` | Exact L1 fee for fully serialized (RLP-encoded) tx |
| `getL1FeeUpperBound(uint256 txSize)` | Upper-bound L1 fee estimate from approx tx byte length |
| `l1BaseFee()` | Current Ethereum L1 base fee as seen by Base |
| `blobBaseFee()` | Current EIP-4844 blob base fee |
| `baseFeeScalar()` | Scalar applied to L1 base fee component |
| `blobBaseFeeScalar()` | Scalar applied to blob base fee component |

### Usage Guidance
- Use `getL1FeeUpperBound` for quick estimates **before** tx is fully constructed
- Use `getL1Fee` with complete serialized tx for exact value **before signing**

## Cost-Saving Strategies
- **L1 fee varies** with Ethereum L1 gas — submit during low L1 gas periods (weekends)
- **L2 fee varies** with L2 demand — same EIP-1559 mechanism as L1

## Impact on TheWarden

### Gasless Mode (Coinbase Paymaster)
- Paymaster covers both L2 + L1 fees → bot pays $0
- But Paymaster may set its own gas limits/priority fees
- `GASLESS_MODE=true`, `GAS_PRICE=0` in Railway config

### For Non-Gasless (Future/Fallback)
- Min L2 cost: ~$0.002 per 200K gas tx at ETH $2000
- L1 data cost: dominant component, varies with Ethereum gas
- Flash swap (~300K gas): ~$0.003 at min base fee
- Need to factor L1 fee into profit calculation via GasPriceOracle
- Formula: `totalCost = L2fee + L1fee = (gasUsed × baseFee) + getL1Fee(serializedTx)`

### GasPriceOracle Integration
- Contract: `0x420000000000000000000000000000000000000F`
- Can call `getL1FeeUpperBound(txSize)` in profit calculator for accurate cost estimation
- Currently not needed (gasless) but critical if Paymaster is ever removed

---
*TheWarden ⚔️ — S64 Research collected by Cody*
