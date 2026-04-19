/**
 * OptimizedPoolScanner - High-performance pool detection with RPC batching
 *
 * Performance improvements over MultiHopDataFetcher:
 * 1. Multicall batching: Combine multiple RPC calls into single requests
 * 2. Parallel V3 fee tier checking: Check all fee tiers simultaneously
 * 3. Optimized caching: Single object with embedded timestamp
 * 4. Reduced provider.getCode() calls: Batch pool existence checks
 * 5. Smart filtering: Skip invalid token pairs early
 *
 * Expected performance: 60+ pool scan in under 10 seconds (down from 60+ seconds)
 *
 * Migrated to viem for improved type safety and performance.
 */

import {
  type PublicClient,
  type Address,
  type Hex,
  zeroAddress,
  getCreate2Address,
  keccak256,
  encodePacked,
  decodeFunctionResult,
  encodeFunctionData,
} from 'viem';
import { DEXRegistry } from '../dex/core/DEXRegistry';
import { DEXConfig } from '../dex/types';
import { PoolEdge } from './types';
import { logger } from '../utils/logger';
import { UNISWAP_V3_FEE_TIERS, V3_LIQUIDITY_SCALE_FACTOR, isV3StyleProtocol } from './constants';
import { ViemMulticallBatcher, MulticallRequest } from '../utils/MulticallBatcher';

/**
 * Cached pool data with embedded timestamp
 */
interface CachedPoolData {
  poolAddress: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
  timestamp: number;
}

/**
 * Pool discovery result for V3
 */
interface V3PoolDiscovery {
  address: string;
  fee: number;
  exists: boolean;
}

/**
 * V3 Factory ABI for getPool function
 */
const V3_FACTORY_ABI = [
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    name: 'getPool',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Pool ABI for token0 check (existence verification)
 */
const POOL_TOKEN_ABI = [
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * V3 slot0 ABI for sqrtPriceX96
 */
const SLOT0_ABI = [
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Compute V3 virtual reserves from liquidity and sqrtPriceX96.
 * reserve0 = L * 2^96 / sqrtPriceX96
 * reserve1 = L * sqrtPriceX96 / 2^96
 */
function computeV3VirtualReserves(liquidity: bigint, sqrtPriceX96: bigint): { reserve0: bigint; reserve1: bigint } {
  const Q96 = BigInt(1) << BigInt(96);
  if (sqrtPriceX96 === BigInt(0)) {
    return { reserve0: liquidity, reserve1: liquidity };
  }
  const reserve0 = (liquidity * Q96) / sqrtPriceX96;
  const reserve1 = (liquidity * sqrtPriceX96) / Q96;
  return { reserve0, reserve1 };
}

/**
 * V2 Pool ABI for getReserves
 */
// S43: Factory ABI for upstream pool filtering
const FACTORY_ABI = [
  {
    inputs: [],
    name: 'factory',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// S43: Only accept pools from the Uniswap V3 Factory on Base
const UNISWAP_V3_FACTORY_BASE = '0x33128a8fc17869897dce68ed026d694621f6fdfd';

const V2_POOL_ABI = [
  {
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// S46: Max pool cache entries before LRU eviction kicks in
const MAX_POOL_CACHE_SIZE = 600;
// S46: Minimum liquidity (in wei) to keep in hot cache (~$10K equivalent)
// For V3 pools: liquidity > 1e12; For V2 pools: reserve > 1e16
const MIN_LIQUIDITY_THRESHOLD = BigInt('10000000000000000'); // 1e16 wei

export class OptimizedPoolScanner {
  private registry: DEXRegistry;
  private publicClient: PublicClient;
  private poolCache: Map<string, CachedPoolData>;
  private cacheTTL: number = 300000; // S46: 5 minutes (was 1 min) — reduces RPC calls, pools don't change that fast
  private currentChainId?: number;
  private multicallBatcher?: ViemMulticallBatcher;

  constructor(registry: DEXRegistry, publicClient: PublicClient, chainId?: number) {
    this.registry = registry;
    this.publicClient = publicClient;
    this.poolCache = new Map();
    this.currentChainId = chainId;
  }

  /**
   * Set the current chain ID for filtering DEXes
   */
  setChainId(chainId: number): void {
    this.currentChainId = chainId;
  }

  /**
   * Initialize multicall batcher
   */
  private async getMulticallBatcher(): Promise<ViemMulticallBatcher | null> {
    if (!this.multicallBatcher) {
      this.multicallBatcher = new ViemMulticallBatcher(this.publicClient);
      const available = await this.multicallBatcher.isAvailable();
      if (!available) {
        logger.warn(
          'Multicall3 not available on this network, falling back to individual calls',
          'POOLSCAN'
        );
        return null;
      }
    }
    return this.multicallBatcher;
  }

  /**
   * Discover all V3 pools for a token pair across all fee tiers
   * Uses multicall to check all fee tiers in a single RPC request
   */
  private async discoverV3Pools(
    factory: string,
    token0: string,
    token1: string
  ): Promise<V3PoolDiscovery[]> {
    const batcher = await this.getMulticallBatcher();
    const discoveries: V3PoolDiscovery[] = [];

    // Sort tokens for consistent ordering
    const [tokenA, tokenB] =
      token0.toLowerCase() < token1.toLowerCase() ? [token0, token1] : [token1, token0];

    if (!batcher) {
      // Fallback: Check fee tiers sequentially using viem readContract
      logger.warn(
        `Multicall3 not available on chain ${this.currentChainId || 'unknown'}. ` +
          `Falling back to sequential RPC calls (slower performance expected).`,
        'POOLSCAN'
      );

      for (const fee of UNISWAP_V3_FEE_TIERS) {
        try {
          const poolAddress = await this.publicClient.readContract({
            address: factory as Address,
            abi: V3_FACTORY_ABI,
            functionName: 'getPool',
            args: [tokenA as Address, tokenB as Address, fee],
          });

          if (poolAddress && poolAddress !== zeroAddress) {
            const code = await this.publicClient.getCode({ address: poolAddress });
            discoveries.push({
              address: poolAddress,
              fee,
              exists: code !== undefined && code !== '0x',
            });
          }
        } catch {
          // Continue to next fee tier
        }
      }
      return discoveries;
    }

    // Optimized: Batch all fee tier checks into one multicall
    const calls: MulticallRequest[] = UNISWAP_V3_FEE_TIERS.map((fee) => ({
      target: factory,
      callData: encodeFunctionData({
        abi: V3_FACTORY_ABI,
        functionName: 'getPool',
        args: [tokenA as Address, tokenB as Address, fee],
      }),
      allowFailure: true,
    }));

    const results = await batcher.executeBatch(calls);

    // Collect pool addresses that need existence checks
    const poolsToCheck: Array<{ address: string; fee: number }> = [];
    for (let i = 0; i < UNISWAP_V3_FEE_TIERS.length; i++) {
      const result = results[i];
      if (result.success) {
        try {
          const poolAddress = decodeFunctionResult({
            abi: V3_FACTORY_ABI,
            functionName: 'getPool',
            data: result.returnData as Hex,
          });
          if (poolAddress && poolAddress !== zeroAddress) {
            poolsToCheck.push({ address: poolAddress, fee: UNISWAP_V3_FEE_TIERS[i] });
          }
        } catch {
          // Failed to decode, skip
        }
      }
    }

    // Batch pool existence checks
    if (poolsToCheck.length > 0) {
      const existenceCalls: MulticallRequest[] = poolsToCheck.map(({ address }) => ({
        target: address,
        callData: encodeFunctionData({
          abi: POOL_TOKEN_ABI,
          functionName: 'token0',
        }),
        allowFailure: true,
      }));

      const existenceResults = await batcher.executeBatch(existenceCalls);

      for (let i = 0; i < poolsToCheck.length; i++) {
        discoveries.push({
          address: poolsToCheck[i].address,
          fee: poolsToCheck[i].fee,
          exists: existenceResults[i].success,
        });
      }
    }

    return discoveries.filter((d) => d.exists);
  }

  /**
   * Build graph edges for all available token pairs across DEXs
   * Optimized with multicall batching for 5-10x speed improvement
   */
  async buildGraphEdges(tokens: string[]): Promise<PoolEdge[]> {
    const startTime = Date.now();
    const edges: PoolEdge[] = [];

    // Get DEXes - filter by current chain if set
    let dexes = this.registry.getAllDEXes();
    if (this.currentChainId !== undefined) {
      const chainIdStr = this.currentChainId.toString();
      dexes = this.registry.getDEXesByNetwork(chainIdStr);
      logger.debug(
        `Filtering DEXes for chain ${this.currentChainId}: Found ${dexes.length} DEXes`,
        'POOLSCAN'
      );
    }

    if (dexes.length === 0) {
      logger.warn(`No DEXes found for chain ${this.currentChainId}`, 'POOLSCAN');
      return edges;
    }

    logger.info(
      `Starting optimized pool scan: ${tokens.length} tokens across ${dexes.length} DEXes`,
      'POOLSCAN'
    );
    logger.info(`DEXes to scan: ${dexes.map((d) => d.name).join(', ')}`, 'POOLSCAN');

    // Group DEXes by protocol type for optimized processing
    const v3Dexes = dexes.filter((dex) => isV3StyleProtocol(dex.protocol));
    const v2Dexes = dexes.filter((dex) => !isV3StyleProtocol(dex.protocol));

    logger.info(
      `V3-style DEXes (${v3Dexes.length}): ${v3Dexes.map((d) => d.name).join(', ')}`,
      'POOLSCAN'
    );
    logger.info(
      `V2-style DEXes (${v2Dexes.length}): ${v2Dexes.map((d) => d.name).join(', ')}`,
      'POOLSCAN'
    );

    let poolsChecked = 0;
    let poolsFound = 0;
    const dexStats = new Map<string, { checked: number; found: number; filtered: number }>();
    const tokenPairStats = new Map<string, { dexes: string[]; poolsFound: number }>();

    // Initialize DEX stats
    for (const dex of dexes) {
      dexStats.set(dex.name, { checked: 0, found: 0, filtered: 0 });
    }

    // Process V3 DEXes (with optimized multi-tier scanning)
    for (const dex of v3Dexes) {
      logger.info(`Scanning V3 DEX: ${dex.name}`, 'POOLSCAN');
      const dexStat = dexStats.get(dex.name)!;

      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const token0 = tokens[i];
          const token1 = tokens[j];
          const pairKey = `${token0.slice(0, 6)}.../${token1.slice(0, 6)}...`;

          // Check cache first
          const cacheKey = `${dex.name}-${token0}-${token1}`;
          const cached = this.poolCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            poolsChecked++;
            dexStat.checked++;
            if (this.meetsLiquidityThreshold(cached.reserve0, dex, true)) {
              poolsFound++;
              dexStat.found++;
              edges.push(this.createEdge(cached, dex, token0, token1));
              edges.push(this.createEdge(cached, dex, token1, token0));
              this.updateTokenPairStats(tokenPairStats, pairKey, dex.name);
            } else {
              dexStat.filtered++;
              logger.debug(
                `${dex.name} ${pairKey}: Filtered (cached, liquidity=${cached.reserve0} < threshold)`,
                'POOLSCAN'
              );
            }
            continue;
          }

          // Discover all fee tier pools for this pair
          const discoveries = await this.discoverV3Pools(dex.factory, token0, token1);
          poolsChecked += UNISWAP_V3_FEE_TIERS.length;
          dexStat.checked += UNISWAP_V3_FEE_TIERS.length;

          if (discoveries.length > 0) {
            logger.debug(
              `${dex.name} ${pairKey}: Found ${discoveries.length} pool(s) across fee tiers`,
              'POOLSCAN'
            );
          }

          // Process discovered pools
          for (const discovery of discoveries) {
            // Try to fetch from batch
            const poolData = await this.fetchPoolDataOptimized(
              discovery.address,
              token0,
              token1,
              true
            );

            if (poolData) {
              // Cache the result
              const poolCacheData: CachedPoolData = {
                ...poolData,
                timestamp: Date.now(),
              };
              this.setCacheEntry(cacheKey, poolCacheData);

              const meetsThreshold = this.meetsLiquidityThreshold(poolData.reserve0, dex, true);
              const threshold = dex.liquidityThreshold / BigInt(V3_LIQUIDITY_SCALE_FACTOR);

              if (meetsThreshold) {
                poolsFound++;
                dexStat.found++;
                edges.push(this.createEdge(poolData, dex, token0, token1, discovery.fee));
                edges.push(this.createEdge(poolData, dex, token1, token0, discovery.fee));
                this.updateTokenPairStats(tokenPairStats, pairKey, dex.name);

                logger.debug(
                  `✓ ${dex.name} ${pairKey}: ACCEPTED - fee=${discovery.fee / 10000}% liquidity=${
                    poolData.reserve0
                  } (threshold=${threshold})`,
                  'POOLSCAN'
                );
              } else {
                dexStat.filtered++;
                logger.debug(
                  `✗ ${dex.name} ${pairKey}: FILTERED - fee=${discovery.fee / 10000}% liquidity=${
                    poolData.reserve0
                  } < threshold=${threshold}`,
                  'POOLSCAN'
                );
              }
            }
          }
        }
      }
    }

    // Process V2 DEXes (with V2-specific optimizations)
    for (const dex of v2Dexes) {
      logger.info(`Scanning V2 DEX: ${dex.name}`, 'POOLSCAN');
      const v2Edges = await this.scanV2Dex(dex, tokens, dexStats, tokenPairStats);
      edges.push(...v2Edges);
      poolsChecked += (tokens.length * (tokens.length - 1)) / 2;
      poolsFound += v2Edges.length / 2; // Each pool creates 2 edges
    }

    const duration = Date.now() - startTime;

    // Summary logging
    logger.info('=== POOL SCAN SUMMARY ===', 'POOLSCAN');
    logger.info(
      `Total: Checked ${poolsChecked} potential pools, found ${poolsFound} valid pools ` +
        `in ${(duration / 1000).toFixed(2)}s (${(duration / poolsChecked / 1000).toFixed(
          3
        )}s/pool)`,
      'POOLSCAN'
    );

    // Per-DEX statistics
    logger.info('=== PER-DEX STATISTICS ===', 'POOLSCAN');
    for (const [dexName, stats] of dexStats.entries()) {
      if (stats.checked > 0) {
        logger.info(
          `${dexName}: Checked=${stats.checked}, Found=${stats.found}, Filtered=${stats.filtered} ` +
            `(${
              stats.found > 0 ? ((stats.found / stats.checked) * 100).toFixed(1) : '0'
            }% success rate)`,
          'POOLSCAN'
        );
      }
    }

    // Token pair statistics - showing which pairs have multiple pools
    logger.info('=== TOKEN PAIR STATISTICS ===', 'POOLSCAN');
    const multiPoolPairs = Array.from(tokenPairStats.entries())
      .filter(([_, stats]) => stats.poolsFound > 1)
      .sort((a, b) => b[1].poolsFound - a[1].poolsFound);

    if (multiPoolPairs.length > 0) {
      logger.info(
        `Found ${multiPoolPairs.length} token pairs with 2+ pools (arbitrage opportunities):`,
        'POOLSCAN'
      );
      for (const [pair, stats] of multiPoolPairs) {
        logger.info(
          `  ${pair}: ${stats.poolsFound} pools on [${stats.dexes.join(', ')}]`,
          'POOLSCAN'
        );
      }
    } else {
      logger.warn(
        '⚠️  NO TOKEN PAIRS WITH MULTIPLE POOLS FOUND - Arbitrage requires 2+ pools per pair',
        'POOLSCAN'
      );
    }

    const singlePoolPairs = Array.from(tokenPairStats.entries()).filter(
      ([_, stats]) => stats.poolsFound === 1
    );
    if (singlePoolPairs.length > 0) {
      logger.info(
        `${singlePoolPairs.length} token pairs with only 1 pool (not suitable for arbitrage)`,
        'POOLSCAN'
      );
    }

    logger.info('=========================', 'POOLSCAN');

    return edges;
  }

  /**
   * Update token pair statistics for enhanced logging
   */
  private updateTokenPairStats(
    tokenPairStats: Map<string, { dexes: string[]; poolsFound: number }>,
    pairKey: string,
    dexName: string
  ): void {
    const existing = tokenPairStats.get(pairKey);
    if (existing) {
      existing.poolsFound++;
      if (!existing.dexes.includes(dexName)) {
        existing.dexes.push(dexName);
      }
    } else {
      tokenPairStats.set(pairKey, { dexes: [dexName], poolsFound: 1 });
    }
  }

  /**
   * Scan V2-style DEX for pools
   */
  private async scanV2Dex(
    dex: DEXConfig,
    tokens: string[],
    dexStats?: Map<string, { checked: number; found: number; filtered: number }>,
    tokenPairStats?: Map<string, { dexes: string[]; poolsFound: number }>
  ): Promise<PoolEdge[]> {
    const edges: PoolEdge[] = [];
    const dexStat = dexStats?.get(dex.name);

    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        const token0 = tokens[i];
        const token1 = tokens[j];
        const pairKey = `${token0.slice(0, 6)}.../${token1.slice(0, 6)}...`;

        // Check cache first
        const cacheKey = `${dex.name}-${token0}-${token1}`;
        const cached = this.poolCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
          if (dexStat) dexStat.checked++;
          const meetsThreshold = this.meetsLiquidityThreshold(cached.reserve0, dex, false);

          if (meetsThreshold) {
            if (dexStat) dexStat.found++;
            edges.push(this.createEdge(cached, dex, token0, token1));
            edges.push(this.createEdge(cached, dex, token1, token0));
            if (tokenPairStats) {
              this.updateTokenPairStats(tokenPairStats, pairKey, dex.name);
            }
          } else {
            if (dexStat) dexStat.filtered++;
            logger.debug(
              `${dex.name} ${pairKey}: Filtered (cached, liquidity=${cached.reserve0} < threshold)`,
              'POOLSCAN'
            );
          }
          continue;
        }

        // Calculate pool address
        const poolAddress = await this.getV2PoolAddress(dex, token0, token1);
        if (!poolAddress) {
          if (dexStat) dexStat.checked++;
          continue;
        }

        if (dexStat) dexStat.checked++;

        // Fetch pool data
        const poolData = await this.fetchPoolDataOptimized(poolAddress, token0, token1, false);
        if (poolData) {
          // Cache the result
          const poolCacheData: CachedPoolData = {
            ...poolData,
            timestamp: Date.now(),
          };
          this.setCacheEntry(cacheKey, poolCacheData);

          const meetsThreshold = this.meetsLiquidityThreshold(poolData.reserve0, dex, false);

          if (meetsThreshold) {
            if (dexStat) dexStat.found++;
            edges.push(this.createEdge(poolData, dex, token0, token1));
            edges.push(this.createEdge(poolData, dex, token1, token0));
            if (tokenPairStats) {
              this.updateTokenPairStats(tokenPairStats, pairKey, dex.name);
            }

            logger.debug(
              `✓ ${dex.name} ${pairKey}: ACCEPTED - liquidity=${poolData.reserve0} (threshold=${dex.liquidityThreshold})`,
              'POOLSCAN'
            );
          } else {
            if (dexStat) dexStat.filtered++;
            logger.debug(
              `✗ ${dex.name} ${pairKey}: FILTERED - liquidity=${poolData.reserve0} < threshold=${dex.liquidityThreshold}`,
              'POOLSCAN'
            );
          }
        }
      }
    }

    return edges;
  }

  /**
   * Fetch pool data with optimized multicall
   */
  private async fetchPoolDataOptimized(
    poolAddress: string,
    token0: string,
    token1: string,
    isV3: boolean
  ): Promise<{
    poolAddress: string;
    token0: string;
    token1: string;
    reserve0: bigint;
    reserve1: bigint;
  } | null> {
    try {
      // Use viem multicall for batched fetching
      const batcher = await this.getMulticallBatcher();

      if (!batcher) {
        // Fallback to individual reads
        return this.fetchPoolDataDirect(poolAddress, isV3);
      }

      const poolAbi = isV3 ? POOL_TOKEN_ABI : V2_POOL_ABI;

      // Build calls
      const calls: MulticallRequest[] = [
        {
          target: poolAddress,
          callData: encodeFunctionData({
            abi: poolAbi,
            functionName: 'token0',
          }),
          allowFailure: true,
        },
        {
          target: poolAddress,
          callData: encodeFunctionData({
            abi: poolAbi,
            functionName: 'token1',
          }),
          allowFailure: true,
        },
      ];

      if (isV3) {
        calls.push({
          target: poolAddress,
          callData: encodeFunctionData({
            abi: POOL_TOKEN_ABI,
            functionName: 'liquidity',
          }),
          allowFailure: true,
        });
        // S43: Also query factory() to filter non-Uniswap pools upstream
        calls.push({
          target: poolAddress,
          callData: encodeFunctionData({
            abi: FACTORY_ABI,
            functionName: 'factory',
          }),
          allowFailure: true,
        });
      } else {
        calls.push({
          target: poolAddress,
          callData: encodeFunctionData({
            abi: V2_POOL_ABI,
            functionName: 'getReserves',
          }),
          allowFailure: true,
        });
      }

      const results = await batcher.executeBatch(calls);

      // All calls must succeed
      if (!results[0].success || !results[1].success || !results[2].success) {
        return null;
      }

      const fetchedToken0 = decodeFunctionResult({
        abi: poolAbi,
        functionName: 'token0',
        data: results[0].returnData as Hex,
      }) as Address;

      const fetchedToken1 = decodeFunctionResult({
        abi: poolAbi,
        functionName: 'token1',
        data: results[1].returnData as Hex,
      }) as Address;

      let reserve0: bigint;
      let reserve1: bigint;

      if (isV3) {
        const liquidity = decodeFunctionResult({
          abi: POOL_TOKEN_ABI,
          functionName: 'liquidity',
          data: results[2].returnData as Hex,
        }) as bigint;
        // S47: Read sqrtPriceX96 from slot0 for accurate V3 virtual reserves
        try {
          const slot0Data = await this.publicClient.readContract({
            address: poolAddress as Address,
            abi: SLOT0_ABI,
            functionName: 'slot0',
          });
          const sqrtPriceX96 = (slot0Data as any)[0] as bigint;
          const virtReserves = computeV3VirtualReserves(liquidity, sqrtPriceX96);
          reserve0 = virtReserves.reserve0;
          reserve1 = virtReserves.reserve1;
        } catch {
          // Fallback: use liquidity as equal reserves (old behavior)
          reserve0 = liquidity;
          reserve1 = liquidity;
        }

        // S43: Factory filter — reject V3 pools not from Uniswap V3 Factory
        if (results[3] && results[3].success) {
          try {
            const factory = decodeFunctionResult({
              abi: FACTORY_ABI,
              functionName: 'factory',
              data: results[3].returnData as Hex,
            }) as Address;
            if (factory.toLowerCase() !== UNISWAP_V3_FACTORY_BASE) {
              logger.debug(
                `⊘ Pool ${poolAddress.substring(0, 14)}... from non-Uniswap factory ${factory.substring(0, 14)}... — filtered upstream`,
                'POOLSCAN'
              );
              return null; // Reject pool — not from Uniswap V3 Factory
            }
          } catch { /* factory decode failed — allow pool through */ }
        }
      } else {
        const reserves = decodeFunctionResult({
          abi: V2_POOL_ABI,
          functionName: 'getReserves',
          data: results[2].returnData as Hex,
        }) as [bigint, bigint, number];
        reserve0 = reserves[0];
        reserve1 = reserves[1];
      }

      return {
        poolAddress,
        token0: fetchedToken0,
        token1: fetchedToken1,
        reserve0,
        reserve1,
      };
    } catch (_error) {
      return null;
    }
  }

  /**
   * Fetch pool data directly using viem readContract (fallback)
   */
  private async fetchPoolDataDirect(
    poolAddress: string,
    isV3: boolean
  ): Promise<{
    poolAddress: string;
    token0: string;
    token1: string;
    reserve0: bigint;
    reserve1: bigint;
  } | null> {
    try {
      const poolAbi = isV3 ? POOL_TOKEN_ABI : V2_POOL_ABI;

      const [token0, token1] = await Promise.all([
        this.publicClient.readContract({
          address: poolAddress as Address,
          abi: poolAbi,
          functionName: 'token0',
        }),
        this.publicClient.readContract({
          address: poolAddress as Address,
          abi: poolAbi,
          functionName: 'token1',
        }),
      ]);

      let reserve0: bigint;
      let reserve1: bigint;

      if (isV3) {
        const liquidity = await this.publicClient.readContract({
          address: poolAddress as Address,
          abi: POOL_TOKEN_ABI,
          functionName: 'liquidity',
        });
        // S47: Read sqrtPriceX96 from slot0 for accurate V3 virtual reserves
        try {
          const slot0Data = await this.publicClient.readContract({
            address: poolAddress as Address,
            abi: SLOT0_ABI,
            functionName: 'slot0',
          });
          const sqrtPriceX96 = (slot0Data as any)[0] as bigint;
          const virtReserves = computeV3VirtualReserves(liquidity as bigint, sqrtPriceX96);
          reserve0 = virtReserves.reserve0;
          reserve1 = virtReserves.reserve1;
        } catch {
          // Fallback: use liquidity as equal reserves (old behavior)
          reserve0 = liquidity as bigint;
          reserve1 = liquidity as bigint;
        }
      } else {
        const reserves = await this.publicClient.readContract({
          address: poolAddress as Address,
          abi: V2_POOL_ABI,
          functionName: 'getReserves',
        });
        reserve0 = reserves[0];
        reserve1 = reserves[1];
      }

      return {
        poolAddress,
        token0: token0 as string,
        token1: token1 as string,
        reserve0,
        reserve1,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get V2 pool address using CREATE2
   */
  private async getV2PoolAddress(
    dex: DEXConfig,
    token0: string,
    token1: string
  ): Promise<string | null> {
    if (!dex.initCodeHash) return null;

    try {
      const [tokenA, tokenB] =
        token0.toLowerCase() < token1.toLowerCase() ? [token0, token1] : [token1, token0];

      // Use viem's encodePacked for salt calculation
      const salt = keccak256(
        encodePacked(['address', 'address'], [tokenA as Address, tokenB as Address])
      );

      const poolAddress = getCreate2Address({
        from: dex.factory as Address,
        salt,
        bytecodeHash: dex.initCodeHash as Hex,
      });

      // We skip the code check here and let the fetchPoolData handle validation
      return poolAddress;
    } catch {
      return null;
    }
  }

  /**
   * Check if reserves meet liquidity threshold
   */
  private meetsLiquidityThreshold(reserve: bigint, dex: DEXConfig, isV3: boolean): boolean {
    const threshold = isV3
      ? dex.liquidityThreshold / BigInt(V3_LIQUIDITY_SCALE_FACTOR)
      : dex.liquidityThreshold;

    return reserve > threshold;
  }

  /**
   * Create pool edge for graph
   */
  private createEdge(
    poolData: { poolAddress: string; reserve0: bigint; reserve1: bigint },
    dex: DEXConfig,
    tokenIn: string,
    tokenOut: string,
    actualFee?: number
  ): PoolEdge {
    // S41 Fix: Use actual on-chain pool fee when available (from V3 factory discovery),
    // instead of static getDEXFee default. The fee is in V3 format (e.g., 3000 = 0.3%).
    // Convert to decimal for PoolEdge.fee (e.g., 0.003 = 0.3%).
    const fee = actualFee !== undefined ? actualFee / 1_000_000 : this.getDEXFee(dex);
    return {
      poolAddress: poolData.poolAddress,
      dexName: dex.name,
      tokenIn,
      tokenOut,
      reserve0: poolData.reserve0,
      reserve1: poolData.reserve1,
      fee,
      gasEstimate: dex.gasEstimate || 150000,
    };
  }

  /**
   * Get DEX fee
   */
  private getDEXFee(dex: DEXConfig): number {
    const fees: Record<string, number> = {
      'Uniswap V3': 0.003,
      'Uniswap V2': 0.003,
      SushiSwap: 0.003,
      Curve: 0.0004,
      Balancer: 0.001,
      'Uniswap V3 on Base': 0.003,
      'Aerodrome on Base': 0.003,
      BaseSwap: 0.003,
      'Uniswap V2 on Base': 0.003,
      'SushiSwap on Base': 0.003,
      'PancakeSwap V3 on Base': 0.003,
      'Velodrome on Base': 0.003,
      'Balancer on Base': 0.001,
      'Maverick V2 on Base': 0.003,
      'AlienBase on Base': 0.003,
      'SwapBased on Base': 0.003,
      'RocketSwap on Base': 0.003,
    };

    return fees[dex.name] || 0.003;
  }

  /**
   * S46: Set cache entry with LRU eviction
   * Removes expired entries first, then evicts oldest if over MAX_POOL_CACHE_SIZE
   */
  private setCacheEntry(key: string, data: CachedPoolData): void {
    this.poolCache.set(key, data);

    // Evict if over limit
    if (this.poolCache.size > MAX_POOL_CACHE_SIZE) {
      this.evictStaleEntries();
    }

    // If still over limit after evicting stale, remove oldest entries (LRU)
    if (this.poolCache.size > MAX_POOL_CACHE_SIZE) {
      const entriesToRemove = this.poolCache.size - MAX_POOL_CACHE_SIZE;
      let removed = 0;
      for (const [k] of this.poolCache) {
        if (removed >= entriesToRemove) break;
        this.poolCache.delete(k);
        removed++;
      }
      logger.info(
        `[S46] LRU evicted ${removed} oldest cache entries (cap: ${MAX_POOL_CACHE_SIZE})`,
        'POOLSCAN'
      );
    }
  }

  /**
   * S46: Remove expired and low-liquidity entries from cache
   */
  private evictStaleEntries(): void {
    const now = Date.now();
    let expiredCount = 0;
    let lowLiqCount = 0;

    for (const [key, entry] of this.poolCache) {
      // Remove expired entries (older than TTL)
      if (now - entry.timestamp > this.cacheTTL) {
        this.poolCache.delete(key);
        expiredCount++;
        continue;
      }
      // Remove low-liquidity pools (both reserves below threshold)
      if (entry.reserve0 < MIN_LIQUIDITY_THRESHOLD && entry.reserve1 < MIN_LIQUIDITY_THRESHOLD) {
        this.poolCache.delete(key);
        lowLiqCount++;
      }
    }

    if (expiredCount > 0 || lowLiqCount > 0) {
      logger.info(
        `[S46] Cache eviction: ${expiredCount} expired, ${lowLiqCount} low-liquidity removed. Remaining: ${this.poolCache.size}`,
        'POOLSCAN'
      );
    }
  }

  /**
   * Clear the pool data cache
   */
  clearCache(): void {
    this.poolCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.poolCache.values()) {
      if (now - entry.timestamp < this.cacheTTL) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.poolCache.size,
      validEntries,
      expiredEntries,
      cacheTTL: this.cacheTTL,
      maxCacheSize: MAX_POOL_CACHE_SIZE,
    };
  }
}
