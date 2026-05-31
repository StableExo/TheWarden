/**
 * ETH Mainnet Network Configuration
 * GL-L42 | TheWarden
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

  /**
   * Bundle builders — fan-out to ALL on every submission
   * Order = priority (highest first)
   *
   * Quasar:  ~16% ETH market share | refundPercent=90 | confirmed GL-L36
   * Titan:   sponsored bundles (fronts gas like Quasar) | confirmed GL-L42
   * bloXroute: eth_sendBundle compatible | GL-L42
   */
  builders: [
    {
      name:          'Quasar',
      rpc:           'https://rpc.quasar.win',
      coinbase:      '0x396343362be2A4dA1cE0C1C210945346fb82Aa49',
      refundPercent: 90,
      method:        'eth_sendBundle',
      sponsorsGas:   true,
      confirmed:     'GL-L36',
    },
    {
      name:          'Titan',
      rpc:           'https://rpc.titanbuilder.xyz',
      coinbase:      '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97',
      refundPercent: 90,
      method:        'eth_sendBundle',
      sponsorsGas:   true,
      confirmed:     'GL-L42',
      note:          'Titan fronts gas from bundle profit — same model as Quasar',
    },
    {
      name:          'bloXroute',
      rpc:           'https://mev.api.blxrbdn.com',
      coinbase:      '0x199D5ED7F45F4eE35960cF22EAde2076e95B253F',
      refundPercent: 80,
      method:        'eth_sendBundle',
      sponsorsGas:   false,
      confirmed:     'GL-L42',
    },
  ],

  // Legacy single-builder (kept for backward compat)
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
    eoa:    '0x1Aa04F01106Aa53bc7A112C502A934a6d72062d4',  // stableexo.base.eth — profit dest GL-L44,
    cbw:    '0x1Aa04F01106Aa53bc7A112C502A934a6d72062d4',
    cbwEns: 'stableexo.base.eth',
  },

  // Flash loan sources (priority order)
  flashLoan: {
    balancer: {
      vault:   '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
      fee:     0,          // 0% — always use first
      source:  0,          // FlashLoanSource.BALANCER
    },
    dydx: {
      soloMargin: '0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e',
      fee:        0,       // 0% — ETH-only (WETH/USDC/DAI)
      source:     1,       // FlashLoanSource.DYDX
    },
    aave: {
      pool:    '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      fee:     0.0009,     // 0.09%
      source:  3,          // FlashLoanSource.AAVE
    },
  },

  // CEX-DEX monitor thresholds (GL-L42)
  monitor: {
    cexDexFireBps:   15,   // Trigger bundle when DEX diverges >15 bps from CEX
    poolFireBps:     10,   // Trigger on inter-pool spread >10 bps (after-fee)
    quoteAmountUsdc: 10_000_000_000,  // 10K USDC for low-slippage QuoterV2 price
    blockInterval:   1,    // Check every block via WSS newHeads
  },

  // Profit routing doctrine (GL-L40)
  profitRouting: {
    quasarRefundRecipient: '0x92d1d44C37Eb5a6996968FE4F2907f403757E611',
    finalDestination:      '0x1Aa04F01106Aa53bc7A112C502A934a6d72062d4',
    finalDestinationEns:   'stableexo.base.eth',
    usDebtPercent:         70,
    operationsPercent:     30,
  },
} as const;

export type EthMainnetConfig = typeof ETH_MAINNET;
