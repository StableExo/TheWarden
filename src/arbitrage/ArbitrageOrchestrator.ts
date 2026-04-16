/**
 * ArbitrageOrchestrator - Main orchestrator for multi-hop arbitrage
 *
 * Coordinates pathfinding, data fetching, and profitability calculations
 * Supports single-chain arbitrage on Base
 * 
 * [S35] Restored from git history with gas/cross-chain imports removed
 * (those modules were deleted in S31-S33 dead code cleanup)
 */

import { DEXRegistry } from '../dex/core/DEXRegistry';
import { PathFinder } from './PathFinder';
import { ProfitabilityCalculator } from './ProfitabilityCalculator';
import { MultiHopDataFetcher } from './MultiHopDataFetcher';
import { ArbitragePath, PathfindingConfig } from './types';
import { MLOrchestrator, OrchestratorStats as MLOrchestratorStats } from '../ml/MLOrchestrator';
import { EnhancedArbitragePath } from '../ml/types';

/**
 * Orchestrator mode - polling, event-driven, or cross-chain
 */
export type OrchestratorMode = 'polling' | 'event-driven' | 'hybrid' | 'cross-chain';

export interface Stats {
  tokenCount: number;
  edgeCount: number;
  cachedPools: number;
  mode: OrchestratorMode;
  gasFilterEnabled: boolean;
  advancedGasEstimatorEnabled: boolean;
  queuedOpportunities: number;
  missedOpportunities: number;
  totalOpportunitiesFound: number;
  profitableBeforeGas: number;
  profitableAfterGas: number;
  blockedByGasValidation: number;
  blockedByMLFilter: number;
  mlEnabled: boolean;
  mlStats?: MLOrchestratorStats;
}

export class ArbitrageOrchestrator {
  private registry: DEXRegistry;
  private pathFinder: PathFinder;
  private profitCalculator: ProfitabilityCalculator;
  private dataFetcher: MultiHopDataFetcher;
  private config: PathfindingConfig;
  private mode: OrchestratorMode = 'polling';
  private mlOrchestrator?: MLOrchestrator;
  private mlEnabled: boolean = false;

  // Statistics for monitoring
  private stats = {
    totalOpportunitiesFound: 0,
    profitableBeforeGas: 0,
    profitableAfterGas: 0,
    blockedByGasValidation: 0,
    blockedByMLFilter: 0,
  };

  constructor(
    registry: DEXRegistry,
    config: PathfindingConfig,
    gasPrice: bigint,
    _gasFilter?: any,         // S35: GasFilterService removed (deleted in S31-S33)
    _bridgeManager?: any,     // S35: BridgeManager removed (deleted in S31-S33)
    _crossChainConfig?: any,  // S35: cross-chain.config removed (deleted in S31-S33)
    mlOrchestrator?: MLOrchestrator,
    _advancedGasEstimator?: any // S35: AdvancedGasEstimator removed (deleted in S31-S33)
  ) {
    this.registry = registry;
    this.config = config;
    this.pathFinder = new PathFinder(config);
    this.profitCalculator = new ProfitabilityCalculator(gasPrice);
    this.dataFetcher = new MultiHopDataFetcher(registry);
    this.mlOrchestrator = mlOrchestrator;
    this.mlEnabled = !!mlOrchestrator;
  }

  /**
   * Find profitable arbitrage opportunities for given tokens
   */
  async findOpportunities(
    tokens: string[],
    startAmount: bigint
  ): Promise<ArbitragePath[] | EnhancedArbitragePath[]> {
    // 1. Fetch pool data and build graph
    const edges = await this.dataFetcher.buildGraphEdges(tokens);

    // 2. Clear previous graph and add new edges
    this.pathFinder.clear();
    for (const edge of edges) {
      this.pathFinder.addPoolEdge(edge);
    }

    // 3. Find arbitrage paths for each token
    const allPaths: ArbitragePath[] = [];

    for (const token of tokens) {
      const paths = this.pathFinder.findArbitragePaths(token, startAmount);
      allPaths.push(...paths);
    }

    this.stats.totalOpportunitiesFound += allPaths.length;

    // 4. Filter paths by profitability
    let profitablePaths = allPaths.filter((path) =>
      this.profitCalculator.isProfitable(path, this.config.minProfitThreshold)
    );

    this.stats.profitableBeforeGas += profitablePaths.length;
    this.stats.profitableAfterGas += profitablePaths.length;

    // 5. Enhance with ML predictions if enabled
    if (this.mlEnabled && this.mlOrchestrator) {
      const enhancedPaths = await Promise.all(
        profitablePaths.map((path) => this.mlOrchestrator!.enhanceOpportunity(path))
      );

      // Filter by ML confidence
      const mlFilteredPaths = enhancedPaths.filter((path) => {
        if (!path.mlPredictions) return true;
        const shouldSkip = path.mlPredictions.recommendation === 'SKIP';
        if (shouldSkip) {
          this.stats.blockedByMLFilter++;
        }
        return !shouldSkip;
      });

      // Sort by ML confidence and net profit
      return mlFilteredPaths.sort((a, b) => {
        const aConfidence = a.mlPredictions?.confidence || 0;
        const bConfidence = b.mlPredictions?.confidence || 0;

        if (Math.abs(aConfidence - bConfidence) > 0.1) {
          return bConfidence - aConfidence;
        }

        if (a.netProfit > b.netProfit) return -1;
        if (a.netProfit < b.netProfit) return 1;
        return 0;
      });
    }

    // 6. Sort by net profit (no ML)
    return profitablePaths.sort((a, b) => {
      if (a.netProfit > b.netProfit) return -1;
      if (a.netProfit < b.netProfit) return 1;
      return 0;
    });
  }

  evaluatePath(path: ArbitragePath) {
    return this.profitCalculator.calculateProfitability(path);
  }

  getConfig(): PathfindingConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<PathfindingConfig>): void {
    this.config = { ...this.config, ...config };
    this.pathFinder = new PathFinder(this.config);
  }

  updateGasPrice(gasPrice: bigint): void {
    this.profitCalculator.updateGasPrice(gasPrice);
    this.config.gasPrice = gasPrice;
  }

  clearCache(): void {
    this.dataFetcher.clearCache();
    this.pathFinder.clear();
  }

  getStats(): Stats {
    return {
      tokenCount: this.pathFinder.getTokens().length,
      edgeCount: this.pathFinder.getEdgeCount(),
      cachedPools: this.dataFetcher.getCachedPoolCount(),
      mode: this.mode,
      gasFilterEnabled: false,
      advancedGasEstimatorEnabled: false,
      queuedOpportunities: 0,
      missedOpportunities: 0,
      totalOpportunitiesFound: this.stats.totalOpportunitiesFound,
      profitableBeforeGas: this.stats.profitableBeforeGas,
      profitableAfterGas: this.stats.profitableAfterGas,
      blockedByGasValidation: this.stats.blockedByGasValidation,
      blockedByMLFilter: this.stats.blockedByMLFilter,
      mlEnabled: this.mlEnabled,
      mlStats: this.mlOrchestrator?.getStats(),
    };
  }

  setMode(mode: OrchestratorMode): void {
    this.mode = mode;
  }

  getMode(): OrchestratorMode {
    return this.mode;
  }

  async handleRealtimeEvent(
    tokens: string[],
    startAmount: bigint,
    _poolAddress?: string
  ): Promise<ArbitragePath[]> {
    return this.findOpportunities(tokens, startAmount);
  }

  enableML(mlOrchestrator: MLOrchestrator): void {
    this.mlOrchestrator = mlOrchestrator;
    this.mlEnabled = true;
  }

  disableML(): void {
    this.mlEnabled = false;
  }

  isMLEnabled(): boolean {
    return this.mlEnabled;
  }

  resetStats(): void {
    this.stats = {
      totalOpportunitiesFound: 0,
      profitableBeforeGas: 0,
      profitableAfterGas: 0,
      blockedByGasValidation: 0,
      blockedByMLFilter: 0,
    };
  }
}
