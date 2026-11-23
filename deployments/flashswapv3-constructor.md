# FlashSwapV3 constructor: eight arguments, no tithe

`contracts/FlashSwapV3.sol` is the source of truth. It is Contract #15, version
6.0.0, pragma 0.8.20. Its constructor takes **exactly eight arguments**:

```solidity
constructor(
    address _uniswapV3Router,
    address _sushiRouter,
    address _balancerVault,
    address _dydxSoloMargin,
    address _aavePoolAddress,
    address _aaveAddressesProvider,
    address _v3Factory,
    address payable _owner
)
```

There is **no tithe**. GL-L52 routes 100% of arbitrage profit to `owner`.

## The owner is immutable

```solidity
address payable public immutable owner;
```

Set in the constructor, and there is no `transferOwnership`. `owner` is forever:

- the only address that can call `executeArbitrage()` or `emergencyWithdraw()`
  (`modifier onlyOwner`, `require(msg.sender == owner, "FSV3:NA")`)
- the address that receives 100% of arbitrage profit

There is no recovery path if the wrong address is passed, so
`scripts/deployFlashSwapV3.ts` refuses to guess and requires
`FLASHSWAP_V3_OWNER`. Pass the Coinbase Smart Wallet, or a fresh
hardware-backed address. Never a key that has ever been pasted into a chat or
committed to a repository.

## Scripts that are now correct

| Script | Path | Mechanism |
| --- | --- | --- |
| Canonical | `scripts/deployFlashSwapV3.ts` | `hardhat run`, deployer pays gas |
| Gasless | `scripts/deploy-v3-s40.ts` | CREATE2 via Smart Wallet UserOp + CDP Paymaster |
| Compatibility shim | `scripts/deployment/deployFlashSwapV3.ts` | Imports the canonical script |

## What was wrong before

Three scripts each had their own copy of the arguments, and all three had
drifted from the contract:

| Script | Arguments passed | Included |
| --- | --- | --- |
| `scripts/deployFlashSwapV3.ts` | 9 | `TITHE_BPS` (default 7000, i.e. 70%) |
| `scripts/deployment/deployFlashSwapV3.ts` | 9 | duplicate of the above |
| `scripts/deploy-v3-s40.ts` | 10 | `titheRecipient`, `titheBps` |

An argument-count mismatch reverts the deploy transaction before anything
reaches the chain, so none of them could deploy the current contract.

## A predicted CREATE2 address depends on the arguments

For `scripts/deploy-v3-s40.ts`, the predicted address is derived from the salt
**and** the init code, and the init code contains the encoded constructor
arguments. Changing the arguments changes the init code hash, so the predicted
address changes too. Any address predicted by the old ten-argument script is
stale; do not reuse it.

## Paymaster costs

Gasless execution goes through the CDP Paymaster. Base Sepolia (testnet) is
free. Base Mainnet is sponsored gas **plus a 7% fee**, invoiced monthly, and
mainnet sponsorship is capped per month across every project on the same
account. Allowlist the deployed contract with the paymaster before expecting a
UserOp to be sponsored.
