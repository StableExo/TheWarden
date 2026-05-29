/**
 * ETH Mainnet Network Configuration
 * GL-L40 | TheWarden
 */

export const ETH_MAINNET = {
  chainId: 1,
  name: 'Ethereum Mainnet',

  // QuickNode RPC (GL-L40 — confirmed live)
  rpc: {
    http: 'https://dry-delicate-hill.ethereum-mainnet.quiknode.pro/bf439b3d22b12a2626fb538b3f942f4d3f86c169/',
    wss:  'wss://dry-delicate-hill.ethereum-mainnet.quiknode.pro/bf439b3d22b12a2626fb538b3f942f4d3f86c169/',
  },

  // Block settings
  blockTime: 12,           // seconds
  confirmations: 1,
  gasBuffer: 1.15,         // 15% gas estimate buffer

  // Gas (ultra-low as of GL-L40: 0.15–0.19 gwei)
  maxGasPrice: 5_000_000_000n,   // 5 gwei max (safety cap)
  priorityFee: 100_000_000n,     // 0.1 gwei priority

  // Quasar Builder (GL-L40 — confirmed alive)
  quasar: {
    rpc:           'https://rpc.quasar.win',
    coinbase:      '0x396343362be2A4dA1cE0C1C210945346fb82Aa49', // quasarbuilder.eth
    refundPercent: 90,
    method:        'eth_sendBundle',
    docs:          'https://docs.quasar.win',
  },

  // Pimlico paymaster (backup gas path)
  pimlico: {
    rpc:       'https://api.pimlico.io/v2/ethereum/rpc?apikey=pim_FrLy7ab9HvvjQkTWXcBEmx',
    paymaster: '0x777777777777AeC03fd955926DbF81597e66834C',
  },

  // Our wallet (new ops EOA, nonce=0)
  wallet: {
    eoa: '0x92d1d44C37Eb5a6996968FE4F2907f403757E611',
  },
} as const;

export type EthMainnetConfig = typeof ETH_MAINNET;
