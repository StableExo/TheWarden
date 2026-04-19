/**
 * FlashSwap ABI definitions for V2 and V3 contracts.
 * Phase 3 Update: Added V3 ABI with executeArbitrage and events.
 */

export const FLASHSWAP_V2_ABI = [
  'function initiateUniswapV3FlashLoan(tuple(address tokenIntermediate, uint24 feeA, uint24 feeB, uint256 amountOutMinimum1, uint256 amountOutMinimum2, address titheRecipient) params)',
  'function initiateTriangularFlashSwap(tuple(address tokenA, address tokenB, address tokenC, uint24 fee1, uint24 fee2, uint24 fee3, uint256 amountOutMinimumFinal, address titheRecipient) params)',
  'function initiateAaveFlashLoan(tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType)[] path, address initiator, address titheRecipient) params)',
];

export const FLASHSWAP_ABI = FLASHSWAP_V2_ABI;

export const FLASHSWAP_V3_ABI = [
  'function executeArbitrage(address borrowToken, uint256 borrowAmount, tuple(tuple(address pool, address tokenIn, address tokenOut, uint24 fee, uint256 minOut, uint8 dexType, address router, bool useDeadline)[] steps, uint256 borrowAmount, uint256 minFinalAmount) path) external',
  'function selectOptimalSource(address token, uint256 amount) external view returns (uint8)',
  'function isBalancerSupported(address token, uint256 amount) external view returns (bool)',
  'function isDydxSupported(address token, uint256 amount) external view returns (bool)',
  'function owner() external view returns (address)',
  'function titheRecipient() external view returns (address)',
  'function titheBps() external view returns (uint16)',
  'function emergencyWithdraw(address token, uint256 amount) external',
  'event FlashLoanInitiated(uint8 indexed source, address indexed token, uint256 amount, address indexed initiator)',
  'event FlashLoanExecuted(uint8 indexed source, address indexed token, uint256 amountBorrowed, uint256 feePaid, uint256 grossProfit, uint256 netProfit)',
  'event SwapExecuted(uint256 indexed stepIndex, uint8 dexType, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)',
  'event TitheDistributed(address indexed token, address indexed titheRecipient, uint256 titheAmount, address indexed owner, uint256 ownerAmount)',
];

export const FLASHSWAP_V3_ABI_JSON = [
  {
    name: 'executeArbitrage',
    type: 'function',
    inputs: [
      { name: 'borrowToken', type: 'address' },
      { name: 'borrowAmount', type: 'uint256' },
      {
        name: 'path',
        type: 'tuple',
        components: [
          {
            name: 'steps',
            type: 'tuple[]',
            components: [
              { name: 'pool', type: 'address' },
              { name: 'tokenIn', type: 'address' },
              { name: 'tokenOut', type: 'address' },
              { name: 'fee', type: 'uint24' },
              { name: 'minOut', type: 'uint256' },
              { name: 'dexType', type: 'uint8' },
              { name: 'router', type: 'address' },
              { name: 'useDeadline', type: 'bool' },
            ],
          },
          { name: 'borrowAmount', type: 'uint256' },
          { name: 'minFinalAmount', type: 'uint256' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;
