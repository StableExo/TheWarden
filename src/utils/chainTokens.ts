/**
 * Chain Token Configuration Utility
 *
 * Provides token addresses for different blockchain networks
 */

import tokenAddresses from '../config/tokens/addresses.json';

export interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
}

export interface ChainTokens {
  WETH?: TokenInfo;
  USDC?: TokenInfo;
  USDT?: TokenInfo;
  USDbC?: TokenInfo;
  DAI?: TokenInfo;
  ARB?: TokenInfo;
  OP?: TokenInfo;
  cbETH?: TokenInfo;
  AERO?: TokenInfo;
  cbBTC?: TokenInfo;
  WSTETH?: TokenInfo;
  [key: string]: TokenInfo | undefined; // Allow additional token symbols beyond the predefined ones
}

/**
 * Get token addresses for a specific chain ID
 */
export function getTokensByChainId(chainId: number): ChainTokens {
  switch (chainId) {
    case 1: // Ethereum mainnet
    case 5: // Goerli testnet
    case 11155111: // Sepolia testnet
      return tokenAddresses.ethereum as ChainTokens;

    case 8453: // Base mainnet
    case 84532: // Base testnet
      return tokenAddresses.base as ChainTokens;

    case 42161: // Arbitrum mainnet
    case 421613: // Arbitrum testnet
      return tokenAddresses.arbitrum as ChainTokens;

    case 10: // Optimism mainnet
    case 420: // Optimism testnet (Goerli)
      return tokenAddresses.optimism as ChainTokens;

    case 56: // BNB Smart Chain mainnet
    case 97: // BNB Smart Chain testnet
      return tokenAddresses.bsc as ChainTokens;

    default:
      // Default to Ethereum for unknown chains
      return tokenAddresses.ethereum as ChainTokens;
  }
}

/**
 * S46: Balancer-whitelisted borrow tokens per chain
 * Only these tokens can be flash-borrowed from Balancer Vault
 * Other tokens can still appear as middle hops in triangular arb paths
 */
const BALANCER_WHITELIST: Record<number, string[]> = {
  8453: ['WETH', 'USDC', 'DAI', 'USDbC', 'USDT'], // Base mainnet — verified on-chain S45
};

/**
 * Get tokens that Balancer allows as flash loan borrow tokens
 * These are the only valid startTokens for PathFinder
 */
export function getBalancerWhitelistedTokens(chainId: number): string[] {
  const tokens = getTokensByChainId(chainId);
  const whitelist = BALANCER_WHITELIST[chainId] || Object.keys(tokens);
  const addresses: string[] = [];

  for (const symbol of whitelist) {
    const tokenInfo = tokens[symbol];
    if (tokenInfo && tokenInfo.address) {
      addresses.push(tokenInfo.address);
    }
  }

  return addresses;
}

/**
 * Get an array of token addresses for scanning
 * Returns limited tokens for faster scanning during development
 * Can be configured via SCAN_TOKENS environment variable
 *
 * S46: When SCAN_TOKENS is not set, defaults to Balancer whitelist
 * to avoid scanning tokens that can't start flash loans.
 * Set SCAN_ALL_TOKENS=true to scan all tokens (for discovery only).
 */
export function getScanTokens(chainId: number): string[] {
  const tokens = getTokensByChainId(chainId);
  const addresses: string[] = [];

  // Check for limited token scan via environment
  const scanTokensEnv = process.env.SCAN_TOKENS;
  if (scanTokensEnv) {
    const limitedSymbols = scanTokensEnv.split(',').map((s) => s.trim().toUpperCase());
    for (const symbol of limitedSymbols) {
      const tokenInfo = tokens[symbol];
      if (tokenInfo && tokenInfo.address) {
        addresses.push(tokenInfo.address);
      }
    }
    return addresses;
  }

  // S46: If SCAN_ALL_TOKENS is set, scan everything (for pool discovery)
  if (process.env.SCAN_ALL_TOKENS === 'true') {
    for (const [_symbol, tokenInfo] of Object.entries(tokens)) {
      if (tokenInfo && tokenInfo.address) {
        addresses.push(tokenInfo.address);
      }
    }
    return addresses;
  }

  // S46: Default to Balancer whitelist — only scan borrowable start tokens
  // Other tokens still appear as middle hops via pool graph edges
  return getBalancerWhitelistedTokens(chainId);
}

/**
 * Get network name from chain ID
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'Ethereum Mainnet';
    case 5:
      return 'Goerli Testnet';
    case 11155111:
      return 'Sepolia Testnet';
    case 8453:
      return 'Base';
    case 84532:
      return 'Base Sepolia';
    case 42161:
      return 'Arbitrum One';
    case 421613:
      return 'Arbitrum Goerli';
    case 10:
      return 'Optimism';
    case 420:
      return 'Optimism Goerli';
    case 137:
      return 'Polygon';
    case 80001:
      return 'Polygon Mumbai';
    case 56:
      return 'BNB Smart Chain';
    case 97:
      return 'BNB Smart Chain Testnet';
    default:
      return `Chain ${chainId}`;
  }
}

/**
 * Format token list for logging
 */
export function formatTokenList(tokens: ChainTokens): string {
  const entries = Object.entries(tokens)
    .filter(([_, token]) => token && token.address)
    .map(([symbol, token]) => `${symbol}: ${token!.address}`);

  return entries.join('\n  ');
}
