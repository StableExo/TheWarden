/**
 * ETH Mainnet Pool Configuration
 * High-liquidity pools for arb scanning
 * GL-L40 | TheWarden
 */

import { ADDRESSES } from './addresses';

export interface PoolConfig {
  address:  string;
  protocol: 'uniswap-v3' | 'balancer' | 'curve' | 'uniswap-v2';
  token0:   string;
  token1:   string;
  fee?:     number;   // UniV3 fee tier (500, 3000, 10000)
  poolId?:  string;   // Balancer pool ID
  label:    string;
}

export const UNISWAP_V3_POOLS: PoolConfig[] = [
  { address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.USDC,  token1: ADDRESSES.tokens.WETH,  fee: 500,  label: 'USDC/WETH 0.05%' },
  { address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.USDC,  token1: ADDRESSES.tokens.WETH,  fee: 3000, label: 'USDC/WETH 0.3%' },
  { address: '0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.USDT,  token1: ADDRESSES.tokens.WETH,  fee: 3000, label: 'USDT/WETH 0.3%' },
  { address: '0xCBCdF9626bC03E24f779434178A73a0B4bad62eD', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.WBTC,  token1: ADDRESSES.tokens.WETH,  fee: 3000, label: 'WBTC/WETH 0.3%' },
  { address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C6', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.USDC,  token1: ADDRESSES.tokens.USDT,  fee: 100,  label: 'USDC/USDT 0.01%' },
  { address: '0x6c6Bc977E13Df9b0de53b251522280BB72383700', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.DAI,   token1: ADDRESSES.tokens.USDC,  fee: 500,  label: 'DAI/USDC 0.05%' },
  { address: '0xc7bBeC68d12a0d1830360F8Ec58fA599bA1b0e9b', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.stETH, token1: ADDRESSES.tokens.WETH,  fee: 100,  label: 'stETH/WETH 0.01%' },
];

export const BALANCER_POOLS: PoolConfig[] = [
  { address: '0x32296969Ef14EB0c6d29669C550D4a0449130230', protocol: 'balancer', token0: ADDRESSES.tokens.WETH, token1: ADDRESSES.tokens.stETH, poolId: '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080', label: 'wstETH/WETH Balancer' },
  { address: '0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56', protocol: 'balancer', token0: ADDRESSES.tokens.WETH, token1: ADDRESSES.tokens.USDC,  poolId: '0x5c6ee304399dbdb9c8ef030ab642b10820db8f5600020000000000000000014a', label: 'WETH/USDC Balancer 80/20' },
];

export const CURVE_POOLS: PoolConfig[] = [
  { address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7', protocol: 'curve', token0: ADDRESSES.tokens.DAI,  token1: ADDRESSES.tokens.USDC,  label: '3pool (DAI/USDC/USDT)' },
  { address: '0xDC24316b9AE028F1497c275EB9192a3Ea0f67022', protocol: 'curve', token0: ADDRESSES.tokens.WETH, token1: ADDRESSES.tokens.stETH, label: 'stETH/ETH Curve' },
];

export const ALL_POOLS: PoolConfig[] = [
  ...UNISWAP_V3_POOLS,
  ...BALANCER_POOLS,
  ...CURVE_POOLS,
];

export const ARB_PAIRS = [
  { tokenA: ADDRESSES.tokens.USDC,  tokenB: ADDRESSES.tokens.WETH,  label: 'USDC/WETH' },
  { tokenA: ADDRESSES.tokens.WBTC,  tokenB: ADDRESSES.tokens.WETH,  label: 'WBTC/WETH' },
  { tokenA: ADDRESSES.tokens.DAI,   tokenB: ADDRESSES.tokens.USDC,  label: 'DAI/USDC'  },
  { tokenA: ADDRESSES.tokens.USDC,  tokenB: ADDRESSES.tokens.USDT,  label: 'USDC/USDT' },
  { tokenA: ADDRESSES.tokens.stETH, tokenB: ADDRESSES.tokens.WETH,  label: 'stETH/ETH' },
];
