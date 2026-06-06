/**
 * ETH Mainnet Pool Configuration
 * GL-L45 FIX: SushiV3 pool addresses factory-verified on-chain
 * 36 pools total | GL-L42 | TheWarden
 */

import { ADDRESSES } from './addresses';

export interface PoolConfig {
  address:  string;
  protocol: 'uniswap-v3' | 'sushi-v3' | 'balancer' | 'curve' | 'uniswap-v2';
  token0:   string;
  token1:   string;
  fee?:     number;
  poolId?:  string;
  label:    string;
}

// ── UniV3 pools — factory-verified GL-L42
export const UNISWAP_V3_POOLS: PoolConfig[] = [
  { address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.USDC,  token1: ADDRESSES.tokens.WETH,  fee: 500,   label: 'USDC/WETH 0.05%' },
  { address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.USDC,  token1: ADDRESSES.tokens.WETH,  fee: 3000,  label: 'USDC/WETH 0.30%' },
  { address: '0x7bea39867e4169dbe237d55c8242a8f2fcDcc387', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.USDC,  token1: ADDRESSES.tokens.WETH,  fee: 10000, label: 'USDC/WETH 1.00%' },
  { address: '0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.WETH,  token1: ADDRESSES.tokens.USDT,  fee: 3000,  label: 'USDT/WETH 0.30%' },
  { address: '0x4585FE77225b41b697C938B018E2Ac67Ac5a20c0', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.WBTC,  token1: ADDRESSES.tokens.WETH,  fee: 500,   label: 'WBTC/WETH 0.05%' },
  { address: '0xCBCdF9626bC03E24f779434178A73a0B4bad62eD', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.WBTC,  token1: ADDRESSES.tokens.WETH,  fee: 3000,  label: 'WBTC/WETH 0.30%' },
  { address: '0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.WBTC,  token1: ADDRESSES.tokens.USDC,  fee: 3000,  label: 'WBTC/USDC 0.30%' },
  { address: '0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.DAI,   token1: ADDRESSES.tokens.WETH,  fee: 3000,  label: 'DAI/WETH 0.30%' },
  { address: '0x3416cF6C708Da44DB2624D63ea0AAef7113527C6', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.USDC,  token1: ADDRESSES.tokens.USDT,  fee: 100,   label: 'USDC/USDT 0.01%' },
  { address: '0x7858E59e0C01EA06Df3aF3D20aC7B0003275D4Bf', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.USDC,  token1: ADDRESSES.tokens.USDT,  fee: 500,   label: 'USDT/USDC 0.05%' },
  { address: '0x6c6Bc977E13Df9b0de53b251522280BB72383700', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.DAI,   token1: ADDRESSES.tokens.USDC,  fee: 500,   label: 'DAI/USDC 0.05%' },
  { address: '0x48DA0965ab2d2CBF1C17C09CFB5cbe67AD5B1406', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.DAI,   token1: ADDRESSES.tokens.USDT,  fee: 100,   label: 'DAI/USDT 0.01%' },
  { address: '0xc63B0708E2F7e69CB8A1df0e1389A98C35A76D52', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.FRAX,  token1: ADDRESSES.tokens.USDC,  fee: 500,   label: 'FRAX/USDC 0.05%' },
  { address: '0x8f8EAaf88448BA31BDfFF6ad8c42830c032C6392', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.WETH,  token1: ADDRESSES.tokens.stETH, fee: 100,   label: 'stETH/WETH 0.01%' },
  { address: '0x840DEEef2f115Cf50DA625F7368C24AF6Fe74410', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.cbETH, token1: ADDRESSES.tokens.WETH,  fee: 500,   label: 'cbETH/WETH 0.05%' },
  { address: '0x177622E79Acece98C39F6E12fa78Ac7FC8a8BF62', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.cbETH, token1: ADDRESSES.tokens.WETH,  fee: 100,   label: 'cbETH/WETH 0.01%' },
  { address: '0xa6Cc3C2531FdaA6Ae1A3CA84c2855806728693e8', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.LINK,  token1: ADDRESSES.tokens.WETH,  fee: 3000,  label: 'LINK/WETH 0.30%' },
  { address: '0x5d4f3c6FA16908609bAC31FF148bd002aA6B8C83', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.LINK,  token1: ADDRESSES.tokens.WETH,  fee: 500,   label: 'LINK/WETH 0.05%' },
  { address: '0x1d42064Fc4beb5F8aAF85F4617AE8b3b5B8Bd801', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.UNI,   token1: ADDRESSES.tokens.WETH,  fee: 3000,  label: 'UNI/WETH 0.30%' },
  { address: '0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.AAVE,  token1: ADDRESSES.tokens.WETH,  fee: 3000,  label: 'AAVE/WETH 0.30%' },
  { address: '0x4674AbC5796E1334B5075326b39B748bee9EAa34', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.AAVE,  token1: ADDRESSES.tokens.WETH,  fee: 500,   label: 'AAVE/WETH 0.05%' },
  { address: '0xe8c6c9227491C0a8156A0106A0204d881BB7E531', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.MKR,   token1: ADDRESSES.tokens.WETH,  fee: 3000,  label: 'MKR/WETH 0.30%' },
  { address: '0xa3f558AebaEcaF0e11cA4b2199Cc5Ed341edFD74', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.LDO,   token1: ADDRESSES.tokens.WETH,  fee: 3000,  label: 'LDO/WETH 0.30%' },
  { address: '0xcFECC1C9F3CB6190Cb1fF7F65a130BFBe5107D38', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.LDO,   token1: ADDRESSES.tokens.WETH,  fee: 500,   label: 'LDO/WETH 0.05%' },
  { address: '0xe42318EA3b998E8355a3dA364eb9D48ec725eB45', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.RPL,   token1: ADDRESSES.tokens.WETH,  fee: 3000,  label: 'RPL/WETH 0.30%' },
  { address: '0x919Fa96e88d67499339577Fa202345436bcDaf79', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.WETH,  token1: ADDRESSES.tokens.CRV,   fee: 3000,  label: 'CRV/WETH 0.30%' },
  { address: '0xede8DD046586d22625Ae7fF2708F879eF7bdb8cF', protocol: 'uniswap-v3', token0: ADDRESSES.tokens.SNX,   token1: ADDRESSES.tokens.WETH,  fee: 3000,  label: 'SNX/WETH 0.30%' },
];

// ── SushiSwap V3 pools — GL-L45 FIX | factory-verified on-chain
// Factory: 0xbACEB8eC6b9355Dfc0269C18bac9d6E2Bdc29C4f | same slot0+liquidity ABI as UniV3
export const SUSHIV3_POOLS: PoolConfig[] = [
  { address: '0x35644Fb61afbc458Bf92B15Add6ABc1996Be5014', protocol: 'sushi-v3', token0: ADDRESSES.tokens.USDC, token1: ADDRESSES.tokens.WETH, fee: 500,  label: '[S3] USDC/WETH 0.05%' },
  { address: '0x763D3b7296E7C9718aD5b058Ac2692A19E5b3638', protocol: 'sushi-v3', token0: ADDRESSES.tokens.USDC, token1: ADDRESSES.tokens.WETH, fee: 3000, label: '[S3] USDC/WETH 0.30%' },
  { address: '0x72c2178e082fEDb13246877b5aa42ebCe1b72218', protocol: 'sushi-v3', token0: ADDRESSES.tokens.WETH, token1: ADDRESSES.tokens.USDT, fee: 500,  label: '[S3] WETH/USDT 0.05%' },
  { address: '0x6A11Ed98b1a3aC36a768EBBBba36ded101dA5a3f', protocol: 'sushi-v3', token0: ADDRESSES.tokens.WETH, token1: ADDRESSES.tokens.USDT, fee: 3000, label: '[S3] WETH/USDT 0.30%' },
  { address: '0x801cCfae9D2C77893B545E8d0E4637C055CD26cB', protocol: 'sushi-v3', token0: ADDRESSES.tokens.WBTC, token1: ADDRESSES.tokens.WETH, fee: 500,  label: '[S3] WBTC/WETH 0.05%' },
  { address: '0x7486ff76f69872D27b22DaDa4078bD55B36a5324', protocol: 'sushi-v3', token0: ADDRESSES.tokens.WBTC, token1: ADDRESSES.tokens.WETH, fee: 3000, label: '[S3] WBTC/WETH 0.30%' },
  { address: '0x31Ac258b911AF9A0d2669EbdFc4E39d92E96b772', protocol: 'sushi-v3', token0: ADDRESSES.tokens.DAI,  token1: ADDRESSES.tokens.USDC, fee: 100,  label: '[S3] DAI/USDC 0.01%' },
  { address: '0xA5f43b0eBaEfBeD5B1F1bfc809AF15254eA1E9C4', protocol: 'sushi-v3', token0: ADDRESSES.tokens.LINK, token1: ADDRESSES.tokens.WETH, fee: 3000, label: '[S3] LINK/WETH 0.30%' },
  { address: '0x769Db46F39c42Ee7AD5f71f4167c47EDd281E767', protocol: 'sushi-v3', token0: ADDRESSES.tokens.DAI,  token1: ADDRESSES.tokens.WETH, fee: 3000, label: '[S3] DAI/WETH 0.30%' },
];

export const BALANCER_POOLS: PoolConfig[] = [
  { address: '0x32296969Ef14EB0c6d29669C550D4a0449130230', protocol: 'balancer', token0: ADDRESSES.tokens.WETH, token1: ADDRESSES.tokens.stETH, poolId: '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080', label: 'wstETH/WETH Balancer' },
  // GL-L53: BAL#500 disabled — pool ID stale
  //
  // GL-L53: Balancer pool 0x5c6ee304... removed (BAL#500 stale)
  //
  // GL-L53: Balancer pool 0x5c6ee304... removed (BAL#500 stale)  // BAL#500 stale
  // ];
  // 
  // export const CURVE_POOLS: PoolConfig[] = [
  //   { address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7', protocol: 'curve', token0: ADDRESSES.tokens.DAI,  token1: ADDRESSES.tokens.USDC,  label: '3pool (DAI/USDC/USDT)' },
  //   // stETH/ETH Curve pool removed GL-L45: get_dy(0,1,1e6) wrong scale for ETH (18dec) → phantom 2399bps arb vs Balancer
  // ];
  // 
  // export const ALL_POOLS: PoolConfig[] = [
  //   ...UNISWAP_V3_POOLS,
  //   // SushiV3 pools excluded from arb until router address verified — GL-L45
  //   // ...SUSHIV3_POOLS,
  //   ...BALANCER_POOLS,
  //   ...CURVE_POOLS,
  // ];
  // 
  // export const ARB_PAIRS = [
  //   { tokenA: ADDRESSES.tokens.USDC,  tokenB: ADDRESSES.tokens.WETH,  label: 'USDC/WETH' },
  //   { tokenA: ADDRESSES.tokens.WBTC,  tokenB: ADDRESSES.tokens.WETH,  label: 'WBTC/WETH' },
  //   { tokenA: ADDRESSES.tokens.LINK,  tokenB: ADDRESSES.tokens.WETH,  label: 'LINK/WETH' },
  //   { tokenA: ADDRESSES.tokens.AAVE,  tokenB: ADDRESSES.tokens.WETH,  label: 'AAVE/WETH' },
  //   { tokenA: ADDRESSES.tokens.LDO,   tokenB: ADDRESSES.tokens.WETH,  label: 'LDO/WETH' },
  //   { tokenA: ADDRESSES.tokens.cbETH, tokenB: ADDRESSES.tokens.WETH,  label: 'cbETH/WETH' },
  //   { tokenA: ADDRESSES.tokens.DAI,   tokenB: ADDRESSES.tokens.USDC,  label: 'DAI/USDC' },
  //   { tokenA: ADDRESSES.tokens.USDC,  tokenB: ADDRESSES.tokens.USDT,  label: 'USDC/USDT' },
  //   { tokenA: ADDRESSES.tokens.DAI,   tokenB: ADDRESSES.tokens.USDT,  label: 'DAI/USDT' },
  //   { tokenA: ADDRESSES.tokens.USDT,  tokenB: ADDRESSES.tokens.WETH,  label: 'USDT/WETH' },
  //   { tokenA: ADDRESSES.tokens.DAI,   tokenB: ADDRESSES.tokens.WETH,  label: 'DAI/WETH' },
  //   { tokenA: ADDRESSES.tokens.stETH, tokenB: ADDRESSES.tokens.WETH,  label: 'stETH/ETH' },
  //   { tokenA: ADDRESSES.tokens.MKR,   tokenB: ADDRESSES.tokens.WETH,  label: 'MKR/WETH' },
  //   { tokenA: ADDRESSES.tokens.UNI,   tokenB: ADDRESSES.tokens.WETH,  label: 'UNI/WETH' },
  //   { tokenA: ADDRESSES.tokens.RPL,   tokenB: ADDRESSES.tokens.WETH,  label: 'RPL/WETH' },
  //   { tokenA: ADDRESSES.tokens.CRV,   tokenB: ADDRESSES.tokens.WETH,  label: 'CRV/WETH' },
  //   { tokenA: ADDRESSES.tokens.SNX,   tokenB: ADDRESSES.tokens.WETH,  label: 'SNX/WETH' },
  //   { tokenA: ADDRESSES.tokens.FRAX,  tokenB: ADDRESSES.tokens.USDC,  label: 'FRAX/USDC' },
  //   { tokenA: ADDRESSES.tokens.WBTC,  tokenB: ADDRESSES.tokens.USDC,  label: 'WBTC/USDC' },
  // ];
  // 