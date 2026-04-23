/**
 * ProviderPool — Round-robin RPC endpoint pool for TheWarden
 * S73: Distributes RPC calls across multiple QuickNode endpoints to maximize throughput
 * 
 * Usage:
 *   const pool = new ProviderPool();  // Auto-discovers QUICKNODE_POOL_*_HTTPS env vars
 *   const url = pool.getNext();        // Round-robin: next endpoint
 *   const results = await pool.fanOut(calls); // Parallel: distribute across all endpoints
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('ProviderPool');

export interface PoolEndpoint {
  url: string;
  name: string;
  callCount: number;
  errorCount: number;
  totalLatencyMs: number;
}

export class ProviderPool {
  private endpoints: PoolEndpoint[] = [];
  private pointer: number = 0;

  constructor() {
    this.discover();
  }

  /**
   * Auto-discover QuickNode endpoints from environment variables.
   * Scans for: QUICKNODE_POOL_XX_HTTPS, plus BASE_RPC_URL as primary.
   */
  private discover(): void {
    const discovered: PoolEndpoint[] = [];

    // Always include BASE_RPC_URL as the primary endpoint
    const primaryUrl = process.env.BASE_RPC_URL;
    if (primaryUrl) {
      discovered.push({
        url: primaryUrl,
        name: 'primary (BASE_RPC_URL)',
        callCount: 0,
        errorCount: 0,
        totalLatencyMs: 0,
      });
    }

    // Scan for QUICKNODE_POOL_XX_HTTPS pattern
    const poolPattern = /^QUICKNODE_POOL_(\d+)_HTTPS$/;
    for (const [key, value] of Object.entries(process.env)) {
      const match = key.match(poolPattern);
      if (match && value) {
        // Avoid duplicating primary
        if (value === primaryUrl) continue;
        discovered.push({
          url: value,
          name: `pool_${match[1]}`,
          callCount: 0,
          errorCount: 0,
          totalLatencyMs: 0,
        });
      }
    }

    // Also check BASE_RPC_URL_FALLBACK as a pool member
    const fallbackUrl = process.env.BASE_RPC_URL_FALLBACK;
    if (fallbackUrl && !discovered.some(e => e.url === fallbackUrl)) {
      discovered.push({
        url: fallbackUrl,
        name: 'fallback (BASE_RPC_URL_FALLBACK)',
        callCount: 0,
        errorCount: 0,
        totalLatencyMs: 0,
      });
    }

    this.endpoints = discovered;
    logger.info(`[ProviderPool] Discovered ${this.endpoints.length} RPC endpoints:`);
    for (const ep of this.endpoints) {
      logger.info(`  [${ep.name}] ${ep.url.substring(0, 50)}...`);
    }

    if (this.endpoints.length === 0) {
      logger.error('[ProviderPool] No RPC endpoints found! Set BASE_RPC_URL or QUICKNODE_POOL_XX_HTTPS');
    }
  }

  /** Get the next endpoint URL (round-robin) */
  getNext(): string {
    if (this.endpoints.length === 0) {
      throw new Error('[ProviderPool] No endpoints available');
    }
    const ep = this.endpoints[this.pointer % this.endpoints.length];
    this.pointer++;
    ep.callCount++;
    return ep.url;
  }

  /** Get a specific endpoint by index */
  getByIndex(index: number): string {
    return this.endpoints[index % this.endpoints.length].url;
  }

  /** Get total number of endpoints in the pool */
  get size(): number {
    return this.endpoints.length;
  }

  /** Get all endpoint URLs */
  get urls(): string[] {
    return this.endpoints.map(e => e.url);
  }

  /**
   * Fan-out: Execute multiple calls in parallel across different endpoints.
   * Each call gets its own endpoint (round-robin assignment).
   * No rate limit delays needed since each endpoint handles its own limit.
   * 
   * @param calls Array of async functions that take an RPC URL and return a result
   * @returns Array of results (in same order as calls)
   */
  async fanOut<T>(calls: Array<(rpcUrl: string) => Promise<T>>): Promise<Array<T | null>> {
    const results = await Promise.allSettled(
      calls.map((callFn, index) => {
        const url = this.getByIndex(index);
        return callFn(url);
      })
    );

    return results.map((result, i) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        this.endpoints[i % this.endpoints.length].errorCount++;
        logger.warn(`[ProviderPool] Call ${i} failed on ${this.endpoints[i % this.endpoints.length].name}: ${result.reason}`);
        return null;
      }
    });
  }

  /** Record latency for an endpoint */
  recordLatency(url: string, ms: number): void {
    const ep = this.endpoints.find(e => e.url === url);
    if (ep) {
      ep.totalLatencyMs += ms;
    }
  }

  /** Get pool statistics */
  getStats(): Array<{ name: string; calls: number; errors: number; avgMs: number }> {
    return this.endpoints.map(ep => ({
      name: ep.name,
      calls: ep.callCount,
      errors: ep.errorCount,
      avgMs: ep.callCount > 0 ? Math.round(ep.totalLatencyMs / ep.callCount) : 0,
    }));
  }

  /** Log pool statistics */
  logStats(): void {
    logger.info(`[ProviderPool] Stats (${this.endpoints.length} endpoints):`);
    for (const stat of this.getStats()) {
      logger.info(`  [${stat.name}] calls=${stat.calls} errors=${stat.errors} avgMs=${stat.avgMs}`);
    }
  }
}
