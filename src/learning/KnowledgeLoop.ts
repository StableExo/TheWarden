/**
 * KnowledgeLoop - Conscious Learning System
 *
 * Integrated from AxionCitadel's "Conscious Knowledge Loop" architecture.
 * Orchestrates the complete learning cycle: observe → learn → adapt → execute.
 *
 * This is the central nervous system of the consciousness learning framework,
 * connecting operational logging, memory formation, calibration, and strategy adaptation.
 */

import { BlackBoxLogger } from '../memory/strategic-logger/BlackBoxLogger';
import { CalibrationEngine, CalibrationResult } from '../memory/strategic-logger/CalibrationEngine';
import { MemoryFormation, StrategicMemory } from '../memory/strategic-logger/MemoryFormation';
import { AdaptiveStrategies, Strategy, StrategySelection } from './AdaptiveStrategies';
import { MetaLearningEngine, LearningMetrics, MetaLearningInsight } from './MetaLearningEngine';

export interface LearningCycleResult {
  memoriesFormed: number;
  calibrationsPerformed: number;
  strategiesUpdated: number;
  insights: string[];
  timestamp: number;
  metaLearning?: {
    learningMetrics: LearningMetrics[];
    metaInsights: MetaLearningInsight[];
    currentGeneration: number;
    bestStrategyName: string;
  };
}

export class KnowledgeLoop {
  private logger: BlackBoxLogger;
  private calibrationEngine: CalibrationEngine;
  private memoryFormation: MemoryFormation;
  private adaptiveStrategies: AdaptiveStrategies;
  private metaLearningEngine: MetaLearningEngine;
  private learningInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private cycleCount: number = 0;
  private lastPerformance: number = 0.5;

  constructor(logDirectory: string = '.memory/strategic-logger', autoStart: boolean = false) {
    // Initialize components
    this.logger = new BlackBoxLogger(logDirectory);
    this.calibrationEngine = new CalibrationEngine(this.logger);
    this.memoryFormation = new MemoryFormation(this.logger, logDirectory);
    this.adaptiveStrategies = new AdaptiveStrategies(this.calibrationEngine, this.memoryFormation);
    this.metaLearningEngine = new MetaLearningEngine();

    if (autoStart) {
      this.start();
    }
  }

  /**
   * Start the knowledge loop
   */
  start(intervalMs: number = 300000): void {
    // Default: 5 minutes
    if (this.isRunning) {
      console.warn('Knowledge loop is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Knowledge loop started (interval: ${intervalMs}ms)`);

    // Run immediately
    this.runLearningCycle().catch((err) => console.error('Error in initial learning cycle:', err));

    // Then run periodically
    this.learningInterval = setInterval(() => {
      this.runLearningCycle().catch((err) => console.error('Error in learning cycle:', err));
    }, intervalMs);
  }

  /**
   * Stop the knowledge loop
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('Knowledge loop is not running');
      return;
    }

    this.isRunning = false;

    if (this.learningInterval) {
      clearInterval(this.learningInterval);
      this.learningInterval = null;
    }

    // Cleanup
    await this.logger.stop();
    console.log('Knowledge loop stopped');
  }

  /**
   * Run a complete learning cycle with meta-learning
   */
  async runLearningCycle(): Promise<LearningCycleResult> {
    const insights: string[] = [];
    this.cycleCount++;

    // 1. Form memories from recent operations
    const memories = await this.memoryFormation.formMemories({}, 5);
    insights.push(`Formed ${memories.length} new strategic memories`);

    // 2. Calibrate parameters based on performance
    const calibrations = await this.calibrationEngine.autoCalibrate();
    insights.push(`Calibrated ${calibrations.length} parameters`);

    // 3. Extract insights from calibrations
    for (const calibration of calibrations) {
      if (Math.abs(calibration.newValue - calibration.oldValue) > 0.01) {
        insights.push(
          `Adjusted ${calibration.parameter}: ${calibration.oldValue.toFixed(
            3
          )} → ${calibration.newValue.toFixed(3)} (confidence: ${(
            calibration.confidence * 100
          ).toFixed(1)}%)`
        );
      }
    }

    // 4. META-LEARNING: Track learning effectiveness
    const currentPerformance = await this.calculateCurrentPerformance();
    const learningMetrics = this.metaLearningEngine.trackLearningEffectiveness(
      'knowledge_loop',
      0.1, // Current learning rate (could be dynamic)
      this.lastPerformance,
      currentPerformance,
      memories.length + calibrations.length
    );
    this.lastPerformance = currentPerformance;
    
    insights.push(
      `Meta-learning: Effectiveness ${(learningMetrics.effectiveness * 100).toFixed(1)}%, ` +
      `Convergence ${(learningMetrics.convergenceSpeed * 100).toFixed(1)}%`
    );

    // 5. META-LEARNING: Adjust learning parameters automatically
    const adjustment = this.metaLearningEngine.adjustLearningParameters('knowledge_loop');
    if (adjustment.confidence > 0.6) {
      insights.push(`Meta-learning: ${adjustment.reasoning}`);
    }

    // 6. META-LEARNING: Evolve learning strategies (every 10 cycles)
    let metaInsights: MetaLearningInsight[] = [];
    if (this.cycleCount % 10 === 0) {
      const evolution = this.metaLearningEngine.evolveLearningStrategies();
      insights.push(
        `Meta-learning: Generation ${evolution.generation}, ` +
        `Best: ${evolution.bestStrategy.name} ` +
        `(${(evolution.bestStrategy.successRate * 100).toFixed(1)}% success)`
      );
      
      // Detect emergent patterns
      const patterns = this.metaLearningEngine.detectEmergentPatterns();
      metaInsights = patterns;
      if (patterns.length > 0) {
        insights.push(`Meta-learning: Detected ${patterns.length} emergent patterns`);
      }
    }

    // 7. Log cycle completion with meta-learning data
    await this.logger.log({
      eventType: 'learning_cycle',
      context: {
        memoriesFormed: memories.length,
        calibrationsPerformed: calibrations.length,
        cycleNumber: this.cycleCount,
        metaLearningEffectiveness: learningMetrics.effectiveness,
      },
      decision: 'Learning cycle completed with meta-learning',
      outcome: 'success',
      metrics: {
        totalMemories: this.memoryFormation.getMemoryCount(),
        totalParams: this.calibrationEngine.getAllParams().length,
        learningEffectiveness: learningMetrics.effectiveness,
        convergenceSpeed: learningMetrics.convergenceSpeed,
      },
    });

    const metaStats = this.metaLearningEngine.getStatistics();

    return {
      memoriesFormed: memories.length,
      calibrationsPerformed: calibrations.length,
      strategiesUpdated: 0,
      insights,
      timestamp: Date.now(),
      metaLearning: {
        learningMetrics: [learningMetrics],
        metaInsights,
        currentGeneration: metaStats.currentGeneration,
        bestStrategyName: metaStats.bestStrategy?.name || 'none',
      },
    };
  }

  /**
   * Calculate current performance for meta-learning
   */
  private async calculateCurrentPerformance(): Promise<number> {
    const summary = await this.logger.getSummary();
    const totalOps = summary.successCount + summary.failureCount + summary.pendingCount;
    
    if (totalOps === 0) return 0.5;
    
    return summary.successCount / totalOps;
  }

  /**
   * Log an operational event
   */
  async logOperation(
    eventType: string,
    context: Record<string, any>,
    decision: string,
    outcome: 'success' | 'failure' | 'pending',
    metrics?: Record<string, number>
  ): Promise<void> {
    await this.logger.log({
      eventType,
      context,
      decision,
      outcome,
      metrics,
    });
  }

  /**
   * Register a calibration parameter
   */
  registerCalibrationParam(
    name: string,
    value: number,
    min: number,
    max: number,
    step: number
  ): void {
    this.calibrationEngine.registerParam({
      name,
      value,
      min,
      max,
      step,
    });
  }

  /**
   * Register a strategy
   */
  registerStrategy(
    id: string,
    name: string,
    description: string,
    parameters: Record<string, number>,
    conditions: Record<string, any>
  ): void {
    this.adaptiveStrategies.registerStrategy({
      id,
      name,
      description,
      parameters,
      conditions,
    });
  }

  /**
   * Select optimal strategy for current conditions
   */
  async selectStrategy(currentConditions: Record<string, any>): Promise<StrategySelection | null> {
    return this.adaptiveStrategies.selectStrategy(currentConditions);
  }

  /**
   * Update strategy performance after execution
   */
  updateStrategyPerformance(strategyId: string, success: boolean): void {
    this.adaptiveStrategies.updateStrategyPerformance(strategyId, success);
  }

  /**
   * Get learning statistics
   */
  async getStatistics(): Promise<{
    totalOperations: number;
    successRate: number;
    totalMemories: number;
    totalStrategies: number;
    topStrategies: Strategy[];
  }> {
    const summary = await this.logger.getSummary();
    const totalOps = summary.successCount + summary.failureCount + summary.pendingCount;
    const successRate = totalOps > 0 ? summary.successCount / totalOps : 0;

    return {
      totalOperations: totalOps,
      successRate,
      totalMemories: this.memoryFormation.getMemoryCount(),
      totalStrategies: this.adaptiveStrategies.getAllStrategies().length,
      topStrategies: this.adaptiveStrategies.getTopStrategies(3),
    };
  }

  /**
   * Get recent insights
   */
  async getRecentInsights(limit: number = 10): Promise<StrategicMemory[]> {
    return this.memoryFormation.query({
      type: 'insight',
      limit,
    });
  }

  /**
   * Get calibration history
   */
  getCalibrationHistory(): CalibrationResult[] {
    return this.calibrationEngine.getCalibrationHistory();
  }

  /**
   * Check if knowledge loop is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get all components for advanced usage
   */
  getComponents() {
    return {
      logger: this.logger,
      calibrationEngine: this.calibrationEngine,
      memoryFormation: this.memoryFormation,
      adaptiveStrategies: this.adaptiveStrategies,
      metaLearningEngine: this.metaLearningEngine,
    };
  }

  /**
   * Get meta-learning statistics
   */
  getMetaLearningStats() {
    return this.metaLearningEngine.getStatistics();
  }

  /**
   * Get recent meta-learning insights
   */
  getMetaLearningInsights(limit: number = 10) {
    return this.metaLearningEngine.getRecentInsights(limit);
  }

  /**
   * Get learning strategy evolution history
   */
  getLearningEvolution() {
    return this.metaLearningEngine.getEvolutionHistory();
  }

  /**
   * Manually trigger learning strategy evolution
   */
  evolveLearningStrategies() {
    return this.metaLearningEngine.evolveLearningStrategies();
  }

  /**
   * Detect emergent patterns in meta-learning
   */
  detectEmergentPatterns() {
    return this.metaLearningEngine.detectEmergentPatterns();
  }
}
