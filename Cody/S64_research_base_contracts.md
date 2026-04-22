# S64 Research: Base Contract Addresses
## Collected: April 22, 2026 | Source: docs.base.org/base-chain/network-information/base-contracts

---

> *L2 contract addresses are the same on both mainnet and testnet.*

## L2 Contract Addresses (Base Mainnet & Sepolia)

| Name | Address |
|------|---------|
| **WETH9** | `0x4200000000000000000000000000000000000006` |
| L2CrossDomainMessenger | `0x4200000000000000000000000000000000000007` |
| L2StandardBridge | `0x4200000000000000000000000000000000000010` |
| SequencerFeeVault | `0x4200000000000000000000000000000000000011` |
| OptimismMintableERC20Factory | `0xF10122D428B4bc8A9d050D06a2037259b4c4B83B` |
| **GasPriceOracle** | `0x420000000000000000000000000000000000000F` |
| **L1Block** | `0x4200000000000000000000000000000000000015` |
| L2ToL1MessagePasser | `0x4200000000000000000000000000000000000016` |
| L2ERC721Bridge | `0x4200000000000000000000000000000000000014` |
| OptimismMintableERC721Factory | `0x4200000000000000000000000000000000000017` |
| ProxyAdmin | `0x4200000000000000000000000000000000000018` |
| BaseFeeVault | `0x4200000000000000000000000000000000000019` |
| L1FeeVault | `0x420000000000000000000000000000000000001a` |
| EAS | `0x4200000000000000000000000000000000000021` |
| EASSchemaRegistry | `0x4200000000000000000000000000000000000020` |
| LegacyERC20ETH | `0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000` |

## L1 Contract Addresses (Ethereum Mainnet)

| Name | Address |
|------|---------|
| AddressManager | `0x8EfB6B5c4767B09Dc9AA6Af4eAA89F749522BaE2` |
| AnchorStateRegistryProxy | `0x909f6cf47ed12f010A796527f562bFc26C7F4E72` |
| DelayedWETHProxy (FDG) | `0x2453c1216e49704d84ea98a4dacd95738f2fc8ec` |
| DelayedWETHProxy (PDG) | `0x64ae5250958cdeb83f6b61f913b5ac6ebe8efd4d` |
| DisputeGameFactoryProxy | `0x43edB88C4B80fDD2AdFF2412A7BebF9dF42cB40e` |
| FaultDisputeGame | `0x6dDBa09bc4cCB0D6Ca9Fc5350580f74165707499` |
| L1CrossDomainMessenger | `0x866E82a600A1414e583f7F13623F1aC5d58b0Afa` |
| L1ERC721Bridge | `0x608d94945A64503E642E6370Ec598e519a2C1E53` |
| **L1StandardBridge** | `0x3154Cf16ccdb4C6d922629664174b904d80F2C35` |
| MIPS | `0x6463dEE3828677F6270d83d45408044fc5eDB908` |
| OptimismMintableERC20Factory | `0x05cc379EBD9B30BbA19C6fA282AB29218EC61D84` |
| **OptimismPortal** | `0x49048044D57e1C92A77f79988d21Fa8fAF74E97e` |
| PermissionedDisputeGame | `0x58bf355C5d4EdFc723eF89d99582ECCfd143266A` |
| PreimageOracle | `0x1fb8cdFc6831fc866Ed9C51aF8817Da5c287aDD3` |
| ProxyAdmin | `0x0475cBCAebd9CE8AfA5025828d5b98DFb67E059E` |
| **SystemConfig** | `0x73a79Fab69143498Ed3712e519A88a918e1f4072` |
| SystemDictator | `0x1fE3fdd1F0193Dd657C0a9AAC37314D6B479E557` |

## Base Admin Addresses (Mainnet)

| Admin Role | Address | Type |
|-----------|---------|------|
| **Batch Sender** | `0x5050f69a9786f081509234f1a7f4684b5e5b76c9` | EOA (Coinbase) |
| Batch Inbox | `0xff00000000000000000000000000000000008453` | EOA (no known key) |
| Output Proposer | `0x642229f238fb9de03374be34b0ed8d9de80752c5` | EOA (Coinbase) |
| Proxy Admin Owner (L1) | `0x7bB41C3008B3f03FE483B28b8DB90e19Cf07595c` | Gnosis Safe |
| Challenger | `0x8Ca1E12404d16373Aef756179B185F27b2994F3a` | EOA (Coinbase) |
| SystemConfig owner | `0x14536667Cd30e52C0b458BaACcB9faDA7046E056` | Gnosis Safe |
| Guardian | `0x09f7150D8c019BeF34450d6920f6B3608ceFdAf2` | Gnosis Safe |

## Contracts Relevant to TheWarden

| Contract | Address | Why It Matters |
|----------|---------|---------------|
| **WETH9** | `0x4200...0006` | Wrapped ETH — primary trading token |
| **GasPriceOracle** | `0x4200...000F` | Query L1 fee on-chain for profit calc |
| **L1Block** | `0x4200...0015` | Get latest L1 block info (for L1 fee estimation) |
| **L1StandardBridge** | `0x3154...2C35` | Bridge assets between L1↔L2 |
| **OptimismPortal** | `0x4904...E97e` | L1→L2 deposits, L2→L1 withdrawals |
| **SystemConfig** | `0x73a7...4072` | Network configuration (gas limit, etc.) |
| **Batch Sender** | `0x5050...76c9` | Coinbase sequencer — posts batches to L1 |

---
*TheWarden ⚔️ — S64 Research collected by Cody*
