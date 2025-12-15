/**
 * Quasar Builder Client
 * 
 * Client for submitting bundles to Quasar Builder via MEV-Boost relay.
 * Quasar is a neutral, non-censoring builder with 16%+ market share.
 * 
 * Documentation: https://docs.quasar.win
 * Endpoint: https://rpc.quasar.win
 * Coinbase: 0x396343362be2A4dA1cE0C1C210945346fb82Aa49 (quasarbuilder.eth)
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
import { QUASAR_BUILDER } from './BuilderRegistry';

/**
 * Quasar Builder client configuration
 */
export interface QuasarBuilderClientConfig {
  /** Quasar relay URL */
  relayUrl?: string;
  
  /** Request timeout (ms) */
  timeout?: number;
  
  /** Enable request logging */
  enableLogging?: boolean;
  
  /** Retry attempts */
  maxRetries?: number;
}

/**
 * QuasarBuilderClient - Submit bundles to Quasar Builder
 */
export class QuasarBuilderClient implements IBuilderClient {
  readonly builderName = BuilderName.QUASAR;
  private relayUrl: string;
  private timeout: number;
  private enableLogging: boolean;
  private maxRetries: number;

  constructor(config: QuasarBuilderClientConfig = {}) {
    this.relayUrl = config.relayUrl || QUASAR_BUILDER.relayUrl;
    this.timeout = config.timeout || 5000; // 5 second timeout
    this.enableLogging = config.enableLogging ?? true;
    this.maxRetries = config.maxRetries || 3;

    if (this.enableLogging) {
      logger.info(`[QuasarBuilderClient] Initialized with relay: ${this.relayUrl}`);
    }
  }

  /**
   * Submit bundle to Quasar Builder
   */
  async submitBundle(bundle: StandardBundle): Promise<BundleSubmissionResult> {
    const startTime = Date.now();

    try {
      if (this.enableLogging) {
        logger.info(`[QuasarBuilderClient] Submitting bundle to Quasar (block ${bundle.blockNumber})`);
      }

      // Prepare bundle parameters
      const params = this.prepareBundleParams(bundle);

      // Submit to Quasar relay
      const bundleHash = await this.sendBundleRequest(params);

      const responseTimeMs = Date.now() - startTime;

      if (this.enableLogging) {
        logger.info(`[QuasarBuilderClient] Bundle submitted successfully (${responseTimeMs}ms): ${bundleHash}`);
      }

      return {
        builder: BuilderName.QUASAR,
        success: true,
        bundleHash,
        timestamp: new Date(),
        responseTimeMs,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (this.enableLogging) {
        logger.error(`[QuasarBuilderClient] Bundle submission failed (${responseTimeMs}ms): ${errorMessage}`);
      }

      return {
        builder: BuilderName.QUASAR,
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        responseTimeMs,
      };
    }
  }

  /**
   * Simulate bundle execution (not supported by Quasar relay)
   */
  async simulateBundle(bundle: StandardBundle): Promise<SimulationResult> {
    // Quasar doesn't publicly expose simulation endpoint
    // Return unsupported result
    return {
      success: false,
      error: 'Simulation not supported by Quasar relay',
    };
  }

  /**
   * Get bundle statistics (limited support)
   */
  async getBundleStats(bundleHash: string): Promise<BundleStats> {
    // Quasar doesn't publicly expose bundle stats endpoint
    // Return minimal stats
    return {
      bundleHash,
      isIncluded: false, // Unknown without on-chain monitoring
    };
  }

  /**
   * Health check - verify Quasar relay is reachable
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
        logger.warn(`[QuasarBuilderClient] Health check failed: ${error}`);
      }
      return false;
    }
  }

  /**
   * Prepare bundle parameters for submission
   * Quasar uses standard MEV-Boost Builder API
   */
  private prepareBundleParams(bundle: StandardBundle): BundleSubmissionParams {
    return {
      version: 'v0.1',
      inclusion: {
        block: bundle.blockNumber,
        maxBlock: bundle.blockNumber + 1, // Submit for this block only
      },
      body: {
        tx: bundle.txs,
        canRevert: bundle.revertingTxHashes
          ? bundle.txs.map((tx) => bundle.revertingTxHashes?.includes(tx) || false)
          : bundle.txs.map(() => false),
      },
      privacy: bundle.privacy,
    };
  }

  /**
   * Send bundle request to Quasar relay
   */
  private async sendBundleRequest(params: BundleSubmissionParams): Promise<string> {
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
            logger.warn(`[QuasarBuilderClient] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
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
      logger.info(`[QuasarBuilderClient] Relay URL updated: ${url}`);
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
 * Bundle submission parameters (internal type)
 */
interface BundleSubmissionParams {
  version: string;
  inclusion: {
    block: number;
    maxBlock?: number;
  };
  body: {
    tx: string[];
    canRevert: boolean[];
  };
  privacy?: {
    hints?: string[];
    builders?: string[];
  };
}
