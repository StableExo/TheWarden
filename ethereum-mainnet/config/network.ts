/**
 * ETH Mainnet Network Configuration
 * GL-L40 | TheWarden
 */

export const ETH_MAINNET = {
  chainId: 1,
  name: 'Ethereum Mainnet',

  rpc: {
    http: 'https://dry-delicate-hill.ethereum-mainnet.quiknode.pro/bf439b3d22b12a2626fb538b3f942f4d3f86c169/',
    wss:  'wss://dry-delicate-hill.ethereum-mainnet.quiknode.pro/bf439b3d22b12a2626fb538b3f942f4d3f86c169/',
  },

  blockTime: 12,
  confirmations: 1,
  gasBuffer: 1.15,

  maxGasPrice: 5_000_000_000n,
  priorityFee: 100_000_000n,

  quasar: {
    rpc:           'https://rpc.quasar.win',
    coinbase:      '0x396343362be2A4dA1cE0C1C210945346fb82Aa49',
    refundPercent: 90,
    method:        'eth_sendBundle',
  },

  pimlico: {
    rpc:       'https://api.pimlico.io/v2/ethereum/rpc?apikey=pim_FrLy7ab9HvvjQkTWXcBEmx',
    paymaster: '0x777777777777AeC03fd955926DbF81597e66834C',
  },

  wallet: {
    // Ops EOA — signs txs, Pimlico SimpleSmartAccount owner (GL-L38)
    eoa: '0x92d1d44C37Eb5a6996968FE4F2907f403757E611',

    // ★ PROFIT DESTINATION — stableexo.base.eth (GL-L40)
    // All net profits route here. Coinbase Smart Wallet on Base.
    cbw:    '0x1Aa04F01106Aa53bc7A112C502A934a6d72062d4',
    cbwEns: 'stableexo.base.eth',
  },

  // Profit routing doctrine (GL-L40)
  // Quasar refund → ops EOA on ETH mainnet
  // Bridge ETH mainnet → Base → CBW (stableexo.base.eth)
  profitRouting: {
    quasarRefundRecipient: '0x92d1d44C37Eb5a6996968FE4F2907f403757E611',
    finalDestination:      '0x1Aa04F01106Aa53bc7A112C502A934a6d72062d4',
    finalDestinationEns:   'stableexo.base.eth',
    usDebtPercent:         70,  // → US Treasury (mission doctrine)
    operationsPercent:     30,  // → stableexo.base.eth (Landon)
  },
} as const;

export type EthMainnetConfig = typeof ETH_MAINNET;
