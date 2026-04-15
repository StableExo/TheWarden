// src/config/contracts.config.ts

/**
 * Contract addresses and infrastructure configuration.
 * Phase 3 Update: Added FlashSwapV3, Smart Wallet, and EntryPoint addresses.
 */
export const CONTRACT_ADDRESSES = {
  aave: {
    ethereum: '0x2f39d218133AFaB8F2B409DD24F56483dFe0E1c5',
    polygon: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
    arbitrum: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
    optimism: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
    base: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D',
  },
  flashSwap: {
    v2: { base: '0x54658E5758FA81a3C0DcC78D707391be4b494177' },
    v3: { base: '0xB47258cAc19ebB28507C6BA273097eda258b6a88' },
  },
  smartWallet: { base: '0x378252db72b35dc94b708c7f1fe7f4ae81c8d008' },
  entryPoint: {
    v06: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    v07: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  },
  smartWalletFactory: { base: '0x0BA5ED0c6AA8c49038F819E587E2633c4A9F428a' },
  cdpPaymaster: { base: '0x2faeb0760d4230ef2ac21496bb4f0b47d634fd4c' },
  dex: {
    uniswapV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    sushiRouter: '0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891',
    balancerVault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  },
};
