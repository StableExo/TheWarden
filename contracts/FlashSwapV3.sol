// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
pragma abicoder v2;

/**
 * @title FlashSwapV3 - Multi-Source Flash Loan Arbitrage Contract (Contract #15)
 * @notice S58 upgrade: Real Balancer balance check + UniV3 flash source + sourceOverride
 * @dev Supports: Aave V3, Balancer V2, Uniswap V3 flash, dYdX Solo Margin (Eth only)
 * 
 * Contract #15 Changes (S58):
 * - isBalancerSupported() now checks actual vault ERC20 balance (fixes RC#19)
 * - executeArbitrage() accepts sourceOverride (255=auto, 0-4=force) + flashPool
 * - UniV3 flash loans fully implemented (unlocks $50M+ liquidity)
 * - Updated source priority: Balancer(0%) → UniV3(0.05-1%) → Aave(0.05%)
 * 
 * Version: 6.0.0 (FlashSwapV3 — Contract #15)
 * Network: Base, Ethereum, Arbitrum, Optimism
 * Tithe System: 70% US debt reduction, 30% operator share
 */

// --- Core Imports ---
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// --- Uniswap Imports ---
// S42: SwapRouter02 Interface (V2 — no deadline)
interface IV3SwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

// S43: V1 SwapRouter Interface (WITH deadline) — PancakeSwap V3, SushiSwap V3
interface IV3SwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

// S52: Aerodrome Slipstream CL Router Interface (tickSpacing instead of fee)
interface IAerodromeCLRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        int24 tickSpacing;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";

// --- Local Imports ---
import "./libraries/PoolAddress.sol";
import "./libraries/CallbackValidation.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IDODOV1V2Pool.sol";
import "./interfaces/IBalancerVault.sol";
import "./interfaces/ISoloMargin.sol";

// --- Aave V3 Interfaces ---
interface IPool {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external;
    
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanReceiver {
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool);
    
    function addressesProvider() external view returns (address);
    function pool() external view returns (address);
}

/**
 * @title FlashSwapV3 (Contract #15)
 * @notice Multi-source flash loan arbitrage with UniV3 flash support + sourceOverride
 */
contract FlashSwapV3 is 
    IUniswapV3FlashCallback, 
    IFlashLoanReceiver, 
    IFlashLoanRecipient,
    ICallee,
    ReentrancyGuard 
{
    using SafeERC20 for IERC20;

    // --- Flash Loan Source Types ---
    enum FlashLoanSource {
        BALANCER,       // 0: 0% fee - preferred when vault has liquidity
        DYDX,           // 1: 0% fee - Ethereum-only (ETH/USDC/DAI)
        HYBRID_AAVE_V4, // 2: 0.09% Aave + V4 swaps - future
        AAVE,           // 3: 0.05% fee - universal fallback
        UNISWAP_V3      // 4: 0.05-1% fee - $50M+ liquidity on Base (NEW S58)
    }

    // --- Source Override Constants ---
    uint8 constant SOURCE_AUTO = 255; // Auto-select optimal source

    // --- DEX Type Constants ---
    uint8 constant DEX_TYPE_UNISWAP_V3 = 0;
    uint8 constant DEX_TYPE_SUSHISWAP = 1;
    uint8 constant DEX_TYPE_DODO = 2;
    uint8 constant DEX_TYPE_AERODROME = 3;
    uint8 constant DEX_TYPE_BALANCER = 4;
    uint8 constant DEX_TYPE_CURVE = 5;
    uint8 constant DEX_TYPE_UNISWAP_V4 = 6;

    // --- State Variables ---
    IV3SwapRouter02 public immutable swapRouter;
    IUniswapV2Router02 public immutable sushiRouter;
    IBalancerVault public immutable balancerVault;
    ISoloMargin public immutable dydxSoloMargin;
    IPool public immutable aavePool;
    
    address payable public immutable owner;
    address payable public immutable titheRecipient;
    uint16 public immutable titheBps;
    
    address public immutable v3Factory;
    address public immutable aaveAddressesProvider;
    
    uint constant DEADLINE_OFFSET = 60;
    uint16 constant MAX_TITHE_BPS = 9000;
    
    // Hybrid mode threshold ($50M)
    uint256 constant HYBRID_MODE_THRESHOLD = 50_000_000e6;

    // --- Structs ---
    struct SwapStep {
        address pool;
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint256 minOut;
        uint8 dexType;
        address router;
        bool useDeadline;
    }

    struct UniversalSwapPath {
        SwapStep[] steps;
        uint256 borrowAmount;
        uint256 minFinalAmount;
    }

    struct FlashLoanParams {
        FlashLoanSource source;
        address borrowToken;
        uint256 borrowAmount;
        UniversalSwapPath path;
        address initiator;
    }

    struct BalancerCallbackData {
        UniversalSwapPath path;
        address initiator;
    }

    struct DydxCallbackData {
        UniversalSwapPath path;
        address initiator;
        uint256 repayAmount;
    }

    // S58: UniV3 flash callback data
    struct UniV3FlashCallbackData {
        UniversalSwapPath path;
        address borrowToken;
        uint256 borrowAmount;
        bool borrowIsToken0;  // true if borrowToken is token0 of the flash pool
    }

    // --- Events ---
    event FlashLoanInitiated(
        FlashLoanSource indexed source,
        address indexed token,
        uint256 amount,
        address indexed initiator
    );
    
    event FlashLoanExecuted(
        FlashLoanSource indexed source,
        address indexed token,
        uint256 amountBorrowed,
        uint256 feePaid,
        uint256 grossProfit,
        uint256 netProfit
    );
    
    event SwapExecuted(
        uint256 indexed stepIndex,
        uint8 dexType,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    event TitheDistributed(
        address indexed token,
        address indexed titheRecipient,
        uint256 titheAmount,
        address indexed owner,
        uint256 ownerAmount
    );
    
    event HybridModeActivated(
        address indexed token,
        uint256 borrowAmount,
        uint256 estimatedProfit
    );

    // S58: Source override event
    event SourceOverrideUsed(
        FlashLoanSource indexed overriddenSource,
        FlashLoanSource indexed autoSelectedSource,
        address indexed token,
        uint256 amount
    );

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "FSV3:NA");
        _;
    }

    // --- Constructor (same as Contract #14 — no new dependencies) ---
    constructor(
        address _uniswapV3Router,
        address _sushiRouter,
        address _balancerVault,
        address _dydxSoloMargin,
        address _aavePoolAddress,
        address _aaveAddressesProvider,
        address _v3Factory,
        address payable _titheRecipient,
        uint16 _titheBps,
        address payable _owner
    ) {
        require(_uniswapV3Router != address(0), "FSV3:IUR");
        require(_sushiRouter != address(0), "FSV3:ISR");
        require(_balancerVault != address(0), "FSV3:IBV");
        require(_aavePoolAddress != address(0), "FSV3:IAP");
        require(_aaveAddressesProvider != address(0), "FSV3:IAAP");
        require(_v3Factory != address(0), "FSV3:IVF");
        require(_titheBps <= MAX_TITHE_BPS, "FSV3:TBT");
        
        if (_titheBps > 0) {
            require(_titheRecipient != address(0), "FSV3:ITR");
        }

        swapRouter = IV3SwapRouter02(_uniswapV3Router);
        sushiRouter = IUniswapV2Router02(_sushiRouter);
        balancerVault = IBalancerVault(_balancerVault);
        dydxSoloMargin = ISoloMargin(_dydxSoloMargin);
        aavePool = IPool(_aavePoolAddress);
        
        v3Factory = _v3Factory;
        aaveAddressesProvider = _aaveAddressesProvider;
        require(_owner != address(0), "FSV3:IOW");
        owner = _owner;
        titheRecipient = _titheRecipient;
        titheBps = _titheBps;
    }

    // --- Aave Interface Implementations ---
    function addressesProvider() external view override returns (address) {
        return aaveAddressesProvider;
    }

    function pool() external view override returns (address) {
        return address(aavePool);
    }

    // --- Main Entry Point (S58: UPDATED with sourceOverride + flashPool) ---
    /**
     * @notice Execute arbitrage with source override capability
     * @param borrowToken Token to borrow
     * @param borrowAmount Amount to borrow
     * @param path Swap path to execute
     * @param sourceOverride 255=auto-select, 0-4=force FlashLoanSource enum value
     * @param flashPool UniV3 pool address for flash source (only used when source=UNISWAP_V3)
     */
    function executeArbitrage(
        address borrowToken,
        uint256 borrowAmount,
        UniversalSwapPath memory path,
        uint8 sourceOverride,
        address flashPool
    ) external onlyOwner {
        FlashLoanSource source;

        if (sourceOverride == SOURCE_AUTO) {
            // Auto-select optimal source
            source = selectOptimalSource(borrowToken, borrowAmount);
        } else {
            // Manual override — bot TypeScript knows best
            require(sourceOverride <= uint8(FlashLoanSource.UNISWAP_V3), "FSV3:ISO"); // Invalid source override
            FlashLoanSource autoSource = selectOptimalSource(borrowToken, borrowAmount);
            source = FlashLoanSource(sourceOverride);
            emit SourceOverrideUsed(source, autoSource, borrowToken, borrowAmount);
        }

        emit FlashLoanInitiated(source, borrowToken, borrowAmount, msg.sender);

        // Execute based on source
        if (source == FlashLoanSource.BALANCER) {
            _executeBalancerFlashLoan(borrowToken, borrowAmount, path);
        } else if (source == FlashLoanSource.DYDX) {
            _executeDydxFlashLoan(borrowToken, borrowAmount, path);
        } else if (source == FlashLoanSource.HYBRID_AAVE_V4) {
            emit HybridModeActivated(borrowToken, borrowAmount, 0);
            _executeHybridFlashLoan(borrowToken, borrowAmount, path);
        } else if (source == FlashLoanSource.AAVE) {
            _executeAaveFlashLoan(borrowToken, borrowAmount, path);
        } else if (source == FlashLoanSource.UNISWAP_V3) {
            require(flashPool != address(0), "FSV3:NFP"); // No flash pool specified
            _executeUniswapV3FlashLoan(borrowToken, borrowAmount, path, flashPool);
        } else {
            revert("FSV3:USO"); // Unsupported source
        }
    }

    // --- Source Selection Logic (S58: UPDATED priority) ---
    /**
     * @notice Select optimal flash loan source based on token and amount
     * @dev Priority: Balancer(0%) → UniV3(0.05-1%) → Aave(0.05%)
     * @param token Token to borrow
     * @param amount Amount to borrow
     * @return source Optimal flash loan source
     */
    function selectOptimalSource(
        address token,
        uint256 amount
    ) public view returns (FlashLoanSource) {
        // Priority 1: Balancer (0% fee) — only if vault has sufficient balance
        if (isBalancerSupported(token, amount)) {
            return FlashLoanSource.BALANCER;
        }
        
        // Priority 2: dYdX (0% fee, ETH/USDC/DAI only, Ethereum-only)
        if (isDydxSupported(token, amount)) {
            return FlashLoanSource.DYDX;
        }

        // Priority 3: UniV3 — $50M+ liquidity, but requires flashPool from caller
        // Auto-select can't pick UniV3 (needs pool address), so fall through to Aave
        // Bot should use sourceOverride=4 with flashPool when Balancer is thin
        
        // Fallback: Aave (0.05% fee, universal support)
        return FlashLoanSource.AAVE;
    }

    /**
     * @notice Check if Balancer supports the token/amount
     * @dev S58 FIX: Now checks actual vault ERC20 balance instead of returning true
     *      This fixes RC#19 (BAL#528 vault too thin) and RC#20 (wrong flash source)
     */
    function isBalancerSupported(
        address token,
        uint256 amount
    ) public view returns (bool) {
        // S58: Check actual Balancer vault balance for this token
        // The Balancer V2 vault holds all pool tokens as ERC20 balances
        uint256 vaultBalance = IERC20(token).balanceOf(address(balancerVault));
        return vaultBalance >= amount;
    }

    /**
     * @notice Check if dYdX supports the token/amount
     */
    function isDydxSupported(
        address /* token */,
        uint256 /* amount */
    ) public view returns (bool) {
        if (block.chainid != 1) {
            return false;
        }
        return false; // Disabled for Base deployment
    }

    // --- Balancer Flash Loan ---
    function _executeBalancerFlashLoan(
        address token,
        uint256 amount,
        UniversalSwapPath memory path
    ) internal {
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(token);
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        
        bytes memory userData = abi.encode(BalancerCallbackData({
            path: path,
            initiator: msg.sender
        }));
        
        balancerVault.flashLoan(
            IFlashLoanRecipient(address(this)),
            tokens,
            amounts,
            userData
        );
    }

    /**
     * @notice Balancer flash loan callback
     */
    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override nonReentrant {
        require(msg.sender == address(balancerVault), "FSV3:CBV");
        require(tokens.length == 1, "FSV3:MTK");
        
        BalancerCallbackData memory data = abi.decode(userData, (BalancerCallbackData));
        
        address tokenBorrowed = address(tokens[0]);
        uint256 amountBorrowed = amounts[0];
        uint256 feePaid = feeAmounts[0];
        
        uint256 finalAmount = _executeUniversalPath(data.path);
        
        uint256 totalRepay = amountBorrowed + feePaid;
        require(finalAmount >= totalRepay, "FSV3:IFR");
        
        uint256 grossProfit = finalAmount > amountBorrowed ? finalAmount - amountBorrowed : 0;
        uint256 netProfit = finalAmount > totalRepay ? finalAmount - totalRepay : 0;
        
        IERC20(tokenBorrowed).safeTransfer(address(balancerVault), totalRepay);
        
        emit FlashLoanExecuted(FlashLoanSource.BALANCER, tokenBorrowed, amountBorrowed, feePaid, grossProfit, netProfit);
        _distributeProfits(tokenBorrowed, netProfit);
    }

    // --- dYdX Flash Loan ---
    function _executeDydxFlashLoan(
        address /* token */,
        uint256 /* amount */,
        UniversalSwapPath memory /* path */
    ) internal pure {
        revert("FSV3:DNI");
    }

    function callFunction(
        address /* sender */,
        ISoloMargin.Account memory /* accountInfo */,
        bytes memory /* data */
    ) external pure override {
        revert("FSV3:DNI");
    }

    // --- Aave Flash Loan ---
    function _executeAaveFlashLoan(
        address token,
        uint256 amount,
        UniversalSwapPath memory path
    ) internal {
        address[] memory assets = new address[](1);
        assets[0] = token;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;
        
        bytes memory params = abi.encode(path, msg.sender);
        
        aavePool.flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            params,
            0
        );
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override nonReentrant returns (bool) {
        require(msg.sender == address(aavePool), "FSV3:CBA");
        require(initiator == address(this), "FSV3:IFI");
        require(assets.length == 1, "FSV3:MA");
        
        (UniversalSwapPath memory path, ) = abi.decode(params, (UniversalSwapPath, address));
        
        address tokenBorrowed = assets[0];
        uint256 amountBorrowed = amounts[0];
        uint256 feePaid = premiums[0];
        
        uint256 finalAmount = _executeUniversalPath(path);
        
        uint256 totalRepay = amountBorrowed + feePaid;
        require(finalAmount >= totalRepay, "FSV3:IFR");
        
        uint256 grossProfit = finalAmount > amountBorrowed ? finalAmount - amountBorrowed : 0;
        uint256 netProfit = finalAmount > totalRepay ? finalAmount - totalRepay : 0;
        
        IERC20(tokenBorrowed).approve(address(aavePool), totalRepay);
        
        emit FlashLoanExecuted(FlashLoanSource.AAVE, tokenBorrowed, amountBorrowed, feePaid, grossProfit, netProfit);
        _distributeProfits(tokenBorrowed, netProfit);
        
        return true;
    }

    // --- Hybrid Mode (Aave + Uniswap V4) ---
    function _executeHybridFlashLoan(
        address token,
        uint256 amount,
        UniversalSwapPath memory path
    ) internal {
        _executeAaveFlashLoan(token, amount, path);
    }

    // --- S58 NEW: Uniswap V3 Flash Loan Source ---
    /**
     * @notice Execute a flash loan using a Uniswap V3 pool
     * @dev Uses IUniswapV3Pool.flash() — borrows from pool liquidity
     *      Fee is determined by pool fee tier (500=0.05%, 3000=0.3%, 10000=1%)
     * @param borrowToken Token to borrow
     * @param borrowAmount Amount to borrow
     * @param path Swap path to execute during flash
     * @param flashPool Address of the V3 pool to flash from
     */
    function _executeUniswapV3FlashLoan(
        address borrowToken,
        uint256 borrowAmount,
        UniversalSwapPath memory path,
        address flashPool
    ) internal {
        IUniswapV3Pool v3Pool = IUniswapV3Pool(flashPool);
        
        // Determine if borrowToken is token0 or token1
        address token0 = v3Pool.token0();
        address token1 = v3Pool.token1();
        
        bool borrowIsToken0 = (borrowToken == token0);
        require(borrowIsToken0 || borrowToken == token1, "FSV3:TNP"); // Token not in pool
        
        // Encode callback data
        bytes memory data = abi.encode(UniV3FlashCallbackData({
            path: path,
            borrowToken: borrowToken,
            borrowAmount: borrowAmount,
            borrowIsToken0: borrowIsToken0
        }));
        
        // Flash: borrow from the pool
        uint256 amount0 = borrowIsToken0 ? borrowAmount : 0;
        uint256 amount1 = borrowIsToken0 ? 0 : borrowAmount;
        
        v3Pool.flash(address(this), amount0, amount1, data);
    }

    /**
     * @notice Uniswap V3 flash callback (S58: FULLY IMPLEMENTED)
     * @dev Called by V3 pool after flash() sends tokens. Must repay borrow + fee.
     *      Security: Validates callback sender via CallbackValidation library.
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external override nonReentrant {
        // Decode callback data
        UniV3FlashCallbackData memory cbData = abi.decode(data, (UniV3FlashCallbackData));
        
        // Security: Verify msg.sender is a legitimate V3 pool from our factory
        IUniswapV3Pool callerPool = IUniswapV3Pool(msg.sender);
        address token0 = callerPool.token0();
        address token1 = callerPool.token1();
        uint24 poolFee = callerPool.fee();
        CallbackValidation.verifyCallback(v3Factory, token0, token1, poolFee);
        
        // Calculate fee
        uint256 feePaid = cbData.borrowIsToken0 ? fee0 : fee1;
        
        // Execute arbitrage path
        uint256 finalAmount = _executeUniversalPath(cbData.path);
        
        // Calculate repayment and profit
        uint256 totalRepay = cbData.borrowAmount + feePaid;
        require(finalAmount >= totalRepay, "FSV3:IFR");
        
        uint256 grossProfit = finalAmount > cbData.borrowAmount ? finalAmount - cbData.borrowAmount : 0;
        uint256 netProfit = finalAmount > totalRepay ? finalAmount - totalRepay : 0;
        
        // Repay the V3 pool (transfer, not approve — V3 pools pull via transfer)
        IERC20(cbData.borrowToken).safeTransfer(msg.sender, totalRepay);
        
        emit FlashLoanExecuted(
            FlashLoanSource.UNISWAP_V3,
            cbData.borrowToken,
            cbData.borrowAmount,
            feePaid,
            grossProfit,
            netProfit
        );
        
        // Distribute profits
        _distributeProfits(cbData.borrowToken, netProfit);
    }

    // --- Universal Path Execution ---
    function _executeUniversalPath(
        UniversalSwapPath memory path
    ) internal returns (uint256 finalAmount) {
        uint256 currentAmount = path.borrowAmount;
        
        for (uint i = 0; i < path.steps.length; i++) {
            SwapStep memory step = path.steps[i];
            
            if (step.dexType == DEX_TYPE_UNISWAP_V3) {
                currentAmount = _swapUniswapV3(
                    step.tokenIn, step.tokenOut, currentAmount, step.minOut,
                    step.fee, step.router, step.useDeadline
                );
            } else if (step.dexType == DEX_TYPE_SUSHISWAP) {
                currentAmount = _swapSushiSwap(
                    step.tokenIn, step.tokenOut, currentAmount, step.minOut
                );
            } else if (step.dexType == DEX_TYPE_AERODROME) {
                currentAmount = _swapAerodrome(
                    step.tokenIn, step.tokenOut, currentAmount, step.minOut,
                    step.fee, step.router
                );
            } else {
                revert("FSV3:UDT");
            }
            
            require(currentAmount >= step.minOut, "FSV3:SLIP");
            emit SwapExecuted(i, step.dexType, step.tokenIn, step.tokenOut, path.borrowAmount, currentAmount);
        }
        
        require(currentAmount >= path.minFinalAmount, "FSV3:FIN");
        require(currentAmount > path.borrowAmount, "FSV3:NOP");
        return currentAmount;
    }

    // --- DEX Swap Functions ---
    function _swapUniswapV3(
        address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut,
        uint24 fee, address router, bool useDeadline
    ) internal returns (uint256 amountOut) {
        address hopRouter = router != address(0) ? router : address(swapRouter);
        IERC20(tokenIn).approve(hopRouter, amountIn);
        
        if (useDeadline) {
            IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn, tokenOut: tokenOut, fee: fee,
                recipient: address(this), deadline: block.timestamp + DEADLINE_OFFSET,
                amountIn: amountIn, amountOutMinimum: minAmountOut, sqrtPriceLimitX96: 0
            });
            return IV3SwapRouter(hopRouter).exactInputSingle(params);
        } else {
            IV3SwapRouter02.ExactInputSingleParams memory params = IV3SwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn, tokenOut: tokenOut, fee: fee,
                recipient: address(this), amountIn: amountIn,
                amountOutMinimum: minAmountOut, sqrtPriceLimitX96: 0
            });
            return IV3SwapRouter02(hopRouter).exactInputSingle(params);
        }
    }

    function _swapSushiSwap(
        address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut
    ) internal returns (uint256 amountOut) {
        IERC20(tokenIn).approve(address(sushiRouter), amountIn);
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        uint256[] memory amounts = sushiRouter.swapExactTokensForTokens(
            amountIn, minAmountOut, path, address(this), block.timestamp + DEADLINE_OFFSET
        );
        return amounts[amounts.length - 1];
    }

    function _swapAerodrome(
        address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut,
        uint24 tickSpacingOrFee, address router
    ) internal returns (uint256 amountOut) {
        address hopRouter = router != address(0) ? router : address(swapRouter);
        IERC20(tokenIn).approve(hopRouter, amountIn);
        IAerodromeCLRouter.ExactInputSingleParams memory params = IAerodromeCLRouter.ExactInputSingleParams({
            tokenIn: tokenIn, tokenOut: tokenOut,
            tickSpacing: int24(uint24(tickSpacingOrFee)),
            recipient: address(this), deadline: block.timestamp + DEADLINE_OFFSET,
            amountIn: amountIn, amountOutMinimum: minAmountOut, sqrtPriceLimitX96: 0
        });
        return IAerodromeCLRouter(hopRouter).exactInputSingle(params);
    }

    // --- Profit Distribution ---
    function _distributeProfits(address token, uint256 netProfit) internal {
        if (netProfit == 0) return;
        
        uint256 titheAmount = (netProfit * titheBps) / 10000;
        uint256 ownerAmount = netProfit - titheAmount;
        
        if (titheAmount > 0 && titheRecipient != address(0)) {
            IERC20(token).safeTransfer(titheRecipient, titheAmount);
        }
        
        if (ownerAmount > 0) {
            IERC20(token).safeTransfer(owner, ownerAmount);
        }
        
        emit TitheDistributed(token, titheRecipient, titheAmount, owner, ownerAmount);
    }

    // --- Emergency Functions ---
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner, amount);
    }

    receive() external payable {}
}
