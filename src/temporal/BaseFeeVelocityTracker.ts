/**
 * BaseFeeVelocityTracker - Dynamic Min-Profit Threshold Adjuster
 *
 * Tier S Feature #1: Dynamic min-profit thresholds tied to base-fee velocity
 *
 * This module tracks base-fee changes across blocks and dynamically adjusts
 * minimum profit thresholds to capture more opportunities during favorable
 * conditions while protecting against unfavorable ones.
 *
 * Thresholds (Denim: velocity is Mwei per SECOND; see DEFAULT_CONFIG note):
 * - Base fee velocity < -1.5 Mwei/s: Lower threshold to 0.04-0.06% (liquidity explosion)
 * - Base fee velocity -1.5 to +1.0 Mwei/s: Default 0.08% (normal conditions)
 * - Base fee velocity > +1.0 Mwei/s: Raise threshold to 0.12-0.15% (congestion)
 *
 * Integration: Wired into OpportunityValidator and ProfitabilityCalculator
 */

import { Provider } from 'ethers';
import { EventEmitter } from 'events';

export interface BaseFeeData {
  blockNumber: number;
  baseFee: bigint;
  timestamp: number;
  /** Wall-clock ms this sample was observed (for cadence-independent velocity) */
  receivedAt: number;
}

export interface BaseFeeVelocityConfig {
  /** Number of blocks to track */
  windowSize: number;
  /** Threshold for "dropping fast" in Mwei per second */
  dropThreshold: number;
  /** Threshold for "rising fast" in Mwei per second */
  riseThreshold: number;
  /** Min profit % when base fee drops fast */
  minProfitLow: number;
  /** Min profit % in normal conditions */
  minProfitNormal: number;
  /** Min profit % when base fee rises fast */
  minProfitHigh: number;
}

const DEFAULT_CONFIG: BaseFeeVelocityConfig = {
  windowSize: 10,
  // Denim note: these fields were originally calibrated per BLOCK at Base's
  // pre-Denim 2s cadence. Velocity is now computed per SECOND so it stays
  // correct at the 200ms (~5/sec) Denim cadence. The old per-block values are
  // divided by the old 2s block time: -3/2 = -1.5 and +2/2 = +1.0 (Mwei/sec).
  dropThreshold: -1.5, // Mwei per second
  riseThreshold: 1.0, // Mwei per second
  minProfitLow: 0.05, // 0.05% when dropping
  minProfitNormal: 0.08, // 0.08% normal
  minProfitHigh: 0.135, // 0.135% when rising
};

/**
 * Tracks base fee velocity and adjusts min-profit thresholds
 */
export class BaseFeeVelocityTracker extends EventEmitter {
  private provider: Provider;
  private config: BaseFeeVelocityConfig;
  private baseFeeHistory: BaseFeeData[] = [];
  private currentVelocity: number = 0; // Mwei per second
  private lastBlockNumber: number = 0;

  constructor(provider: Provider, config?: Partial<BaseFeeVelocityConfig>) {
    super();
    this.provider = provider;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update with new block data
   * Call this on each new block
   */
  async updateFromBlock(blockNumber?: number): Promise<void> {
    try {
      const block = await this.provider.getBlock(blockNumber || 'latest');
      if (!block || !block.baseFeePerGas) {
        return;
      }

      // Skip if we've already processed this block
      if (block.number <= this.lastBlockNumber) {
        return;
      }

      const baseFeeData: BaseFeeData = {
        blockNumber: block.number,
        baseFee: block.baseFeePerGas,
        timestamp: block.timestamp * 1000, // Convert to ms
        receivedAt: Date.now(),
      };

      // Add to history
      this.baseFeeHistory.push(baseFeeData);

      // Maintain window size
      if (this.baseFeeHistory.length > this.config.windowSize) {
        this.baseFeeHistory.shift();
      }

      // Calculate velocity if we have enough data
      if (this.baseFeeHistory.length >= 2) {
        this.calculateVelocity();
      }

      this.lastBlockNumber = block.number;

      // Emit event for logging/monitoring
      this.emit('velocityUpdate', {
        velocity: this.currentVelocity,
        threshold: this.getAdjustedMinProfit(),
        blockNumber: block.number,
      });
    } catch (error) {
      console.error('[BaseFeeVelocityTracker] Error updating from block:', error);
    }
  }

  /**
   * Calculate base fee velocity in Mwei per second
   * Uses recent sample comparison with light smoothing
   */
  private calculateVelocity(): void {
    if (this.baseFeeHistory.length < 2) {
      this.currentVelocity = 0;
      return;
    }

    // Convert to Mwei (divide by 1e6) for reasonable numeric range
    const recentFee = Number(
      this.baseFeeHistory[this.baseFeeHistory.length - 1].baseFee / BigInt(1e6)
    );
    const previousFee = Number(
      this.baseFeeHistory[this.baseFeeHistory.length - 2].baseFee / BigInt(1e6)
    );

    // Calculate delta in Mwei
    const delta = recentFee - previousFee;

    // Denim: normalise by elapsed wall-clock time so velocity is per SECOND,
    // not per block. At 200ms blocks (~5/sec) a per-block figure would be ~5x
    // smaller than the calibrated thresholds and would stop triggering.
    const last = this.baseFeeHistory[this.baseFeeHistory.length - 1];
    const prev = this.baseFeeHistory[this.baseFeeHistory.length - 2];
    const dtSeconds = Math.max((last.receivedAt - prev.receivedAt) / 1000, 0.001);
    const deltaPerSecond = delta / dtSeconds;

    // Use exponential moving average for smoothing (lighter weight to respond faster)
    const alpha = 0.7; // Higher alpha = more responsive
    this.currentVelocity = alpha * deltaPerSecond + (1 - alpha) * this.currentVelocity;
  }

  /**
   * Get current base fee velocity in Mwei per second
   */
  getVelocity(): number {
    return this.currentVelocity;
  }

  /**
   * Get dynamically adjusted minimum profit threshold (0.0 to 1.0)
   * This is the main API used by OpportunityValidator
   */
  getAdjustedMinProfit(): number {
    const velocity = this.currentVelocity;

    // Base fee dropping fast (liquidity explosion)
    if (velocity < this.config.dropThreshold) {
      // Scale between minProfitLow and minProfitNormal based on how fast it's dropping
      const scale = Math.min(Math.abs(velocity / this.config.dropThreshold), 2); // Cap at 2x threshold
      return Math.max(
        this.config.minProfitLow,
        this.config.minProfitNormal -
          (this.config.minProfitNormal - this.config.minProfitLow) * Math.min(scale, 1)
      );
    }

    // Base fee rising fast (congestion)
    if (velocity > this.config.riseThreshold) {
      // Scale between minProfitNormal and minProfitHigh based on how fast it's rising
      const scale = Math.min(velocity / this.config.riseThreshold, 2); // Cap at 2x threshold
      return Math.min(
        this.config.minProfitHigh,
        this.config.minProfitNormal +
          (this.config.minProfitHigh - this.config.minProfitNormal) * Math.min(scale, 1)
      );
    }

    // Normal conditions
    return this.config.minProfitNormal;
  }

  /**
   * Get current base fee in Mwei
   */
  getCurrentBaseFee(): number | null {
    if (this.baseFeeHistory.length === 0) {
      return null;
    }
    // Convert bigint to Mwei safely
    return Number(this.baseFeeHistory[this.baseFeeHistory.length - 1].baseFee / BigInt(1e6));
  }

  /**
   * Get statistics for monitoring/debugging
   */
  getStats() {
    return {
      velocity: this.currentVelocity,
      adjustedMinProfit: this.getAdjustedMinProfit(),
      currentBaseFee: this.getCurrentBaseFee(),
      historySize: this.baseFeeHistory.length,
      lastBlockNumber: this.lastBlockNumber,
    };
  }

  /**
   * Get recent history for analysis
   */
  getHistory(): BaseFeeData[] {
    return [...this.baseFeeHistory];
  }

  /**
   * Clear history (useful for testing)
   */
  clear(): void {
    this.baseFeeHistory = [];
    this.currentVelocity = 0;
    this.lastBlockNumber = 0;
  }
}

