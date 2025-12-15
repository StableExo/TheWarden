/**
 * Rsync Builder Client
 * 
 * Client for submitting bundles to rsync-builder.
 * Rsync is a dominant MEV builder with advanced bundle API features.
 * 
 * Documentation: https://rsync-builder.xyz/docs
 * Features:
 * - Atomic bundles
 * - UUID bundle cancellation
 * - Refund distribution control
 * - 60% private order flow
 */

import { logger } from '../../utils/logger';
import {
  BuilderName,
  StandardBundle,
  BundleSubmissionResult,
  SimulationResult,
  BundleStats,
  IBuilderClient,
} from './types';
import { RSYNC_BUILDER } from './BuilderRegistry';

/**
 * Rsync Builder client configuration
 */
export interface RsyncBuilderClientConfig {
  /** Rsync relay URL */
  relayUrl?: string;
  
  /** Request timeout (ms) */
  timeout?: number;
  
  /** Enable request logging */
  enableLogging?: boolean;
  
  /** Retry attempts */
  maxRetries?: number;
}

/**
 * RsyncBuilderClient - Submit bundles to rsync-builder
 */
export class RsyncBuilderClient implements IBuilderClient {
  readonly builderName = BuilderName.RSYNC;
  private relayUrl: string;
  private timeout: number;
  private enableLogging: boolean;
  private maxRetries: number;

  constructor(config: RsyncBuilderClientConfig = {}) {
    this.relayUrl = config.relayUrl || RSYNC_BUILDER.relayUrl;
    this.timeout = config.timeout || 5000; // 5 second timeout
    this.enableLogging = config.enableLogging ?? true;
    this.maxRetries = config.maxRetries || 3;

    if (this.enableLogging) {
      logger.info(`[RsyncBuilderClient] Initialized with relay: ${this.relayUrl}`);
    }
  }

  /**
   * Submit bundle to rsync-builder
   */
  async submitBundle(bundle: StandardBundle): Promise<BundleSubmissionResult> {
    const startTime = Date.now();

    try {
      if (this.enableLogging) {
        logger.info(`[RsyncBuilderClient] Submitting bundle to rsync (block ${bundle.blockNumber})`);
      }

      // Prepare bundle parameters (rsync supports advanced features)
      const params = this.prepareBundleParams(bundle);

      // Submit to rsync relay
      const bundleHash = await this.sendBundleRequest(params);

      const responseTimeMs = Date.now() - startTime;

      if (this.enableLogging) {
        logger.info(`[RsyncBuilderClient] Bundle submitted successfully (${responseTimeMs}ms): ${bundleHash}`);
      }

      return {
        builder: BuilderName.RSYNC,
        success: true,
        bundleHash,
        timestamp: new Date(),
        responseTimeMs,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (this.enableLogging) {
        logger.error(`[RsyncBuilderClient] Bundle submission failed (${responseTimeMs}ms): ${errorMessage}`);
      }

      return {
        builder: BuilderName.RSYNC,
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        responseTimeMs,
      };
    }
  }

  /**
   * Cancel a bundle using UUID
   */
  async cancelBundle(replacementUuid: string): Promise<boolean> {
    try {
      const payload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_cancelBundle',
        params: [{ replacementUuid }],
      };

      const response = await fetch(this.relayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as { result?: boolean; error?: { message?: string } };
      
      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }

      if (this.enableLogging) {
        logger.info(`[RsyncBuilderClient] Bundle cancelled: ${replacementUuid}`);
      }

      return true;
    } catch (error) {
      if (this.enableLogging) {
        logger.error(`[RsyncBuilderClient] Bundle cancellation failed: ${error}`);
      }
      return false;
    }
  }

  /**
   * Simulate bundle execution (not supported by rsync relay)
   */
  async simulateBundle(bundle: StandardBundle): Promise<SimulationResult> {
    // rsync doesn't publicly expose simulation endpoint
    // Return unsupported result
    return {
      success: false,
      error: 'Simulation not supported by rsync relay',
    };
  }

  /**
   * Get bundle statistics (limited support)
   */
  async getBundleStats(bundleHash: string): Promise<BundleStats> {
    // rsync doesn't publicly expose bundle stats endpoint
    // Return minimal stats
    return {
      bundleHash,
      isIncluded: false, // Unknown without on-chain monitoring
    };
  }

  /**
   * Health check - verify rsync relay is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple HTTP check to relay endpoint
      const response = await fetch(this.relayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_blockNumber',
          params: [],
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      return response.ok;
    } catch (error) {
      if (this.enableLogging) {
        logger.warn(`[RsyncBuilderClient] Health check failed: ${error}`);
      }
      return false;
    }
  }

  /**
   * Prepare bundle parameters for submission
   * rsync supports advanced features like UUID cancellation and refund control
   */
  private prepareBundleParams(bundle: StandardBundle): RsyncBundleParams {
    const params: RsyncBundleParams = {
      txs: bundle.txs,
      blockNumber: `0x${bundle.blockNumber.toString(16)}`,
    };

    // Add optional parameters
    if (bundle.minTimestamp) {
      params.minTimestamp = bundle.minTimestamp;
    }
    if (bundle.maxTimestamp) {
      params.maxTimestamp = bundle.maxTimestamp;
    }
    if (bundle.revertingTxHashes && bundle.revertingTxHashes.length > 0) {
      params.revertingTxHashes = bundle.revertingTxHashes;
    }
    if (bundle.replacementUuid) {
      params.replacementUuid = bundle.replacementUuid;
    }

    return params;
  }

  /**
   * Send bundle request to rsync relay
   */
  private async sendBundleRequest(params: RsyncBundleParams): Promise<string> {
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendBundle',
      params: [params],
    };

    let lastError: Error | null = null;
    
    // Retry logic
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.relayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.timeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as { result?: { bundleHash?: string } | string; error?: { message?: string } };

        if (data.error) {
          throw new Error(data.error.message || JSON.stringify(data.error));
        }

        if (!data.result) {
          throw new Error('No bundle hash in response');
        }

        return typeof data.result === 'string' ? data.result : (data.result.bundleHash || '');
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.maxRetries - 1) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          
          if (this.enableLogging) {
            logger.warn(`[RsyncBuilderClient] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
          }
        }
      }
    }

    throw lastError || new Error('Bundle submission failed');
  }

  /**
   * Update relay URL
   */
  setRelayUrl(url: string): void {
    this.relayUrl = url;
    if (this.enableLogging) {
      logger.info(`[RsyncBuilderClient] Relay URL updated: ${url}`);
    }
  }

  /**
   * Get current relay URL
   */
  getRelayUrl(): string {
    return this.relayUrl;
  }
}

/**
 * Rsync-specific bundle parameters
 * Supports advanced features like UUID cancellation
 */
interface RsyncBundleParams {
  /** Array of signed transaction strings */
  txs: string[];
  
  /** Target block number (hex) */
  blockNumber: string;
  
  /** Minimum timestamp for bundle validity (optional) */
  minTimestamp?: number;
  
  /** Maximum timestamp for bundle validity (optional) */
  maxTimestamp?: number;
  
  /** Transaction hashes that are allowed to revert (optional) */
  revertingTxHashes?: string[];
  
  /** Transaction hashes that can be dropped (optional) */
  droppingTxHashes?: string[];
  
  /** UUID for bundle replacement/cancellation (optional) */
  replacementUuid?: string;
  
  /** Percentage of reward to refund (optional) */
  refundPercent?: number;
  
  /** Address to receive refund (optional) */
  refundRecipient?: string;
  
  /** Transaction hashes for refund calculation (optional) */
  refundTxHashes?: string[];
}
