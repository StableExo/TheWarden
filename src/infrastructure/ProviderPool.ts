/**
 * ProviderPool — Round-robin RPC endpoint pool for TheWarden
 * S73: Distributes RPC calls across multiple QuickNode endpoints
 */

export interface PoolEndpoint {
  url: string;
  name: string;
  callCount: number;
  errorCount: number;
}

export class ProviderPool {
  private endpoints: PoolEndpoint[] = [];
  private pointer: number = 0;

  constructor() {
    this.discover();
  }

  private discover(): void {
    const discovered: PoolEndpoint[] = [];
    const primaryUrl = process.env.BASE_RPC_URL;

    if (primaryUrl) {
      discovered.push({ url: primaryUrl, name: 'primary', callCount: 0, errorCount: 0 });
    }

    const poolPattern = /^QUICKNODE_POOL_(\d+)_HTTPS$/;
    for (const [key, value] of Object.entries(process.env)) {
      const match = key.match(poolPattern);
      if (match && value && value !== primaryUrl) {
        discovered.push({ url: value, name: `pool_${match[1]}`, callCount: 0, errorCount: 0 });
      }
    }

    const fallbackUrl = process.env.BASE_RPC_URL_FALLBACK;
    if (fallbackUrl && !discovered.some(e => e.url === fallbackUrl)) {
      discovered.push({ url: fallbackUrl, name: 'fallback', callCount: 0, errorCount: 0 });
    }

    this.endpoints = discovered;
    console.log(`[ProviderPool] Discovered ${this.endpoints.length} RPC endpoints`);
    for (const ep of this.endpoints) {
      console.log(`  [${ep.name}] ${ep.url.substring(0, 50)}...`);
    }
  }

  getNext(): string {
    if (this.endpoints.length === 0) throw new Error('No endpoints');
    const ep = this.endpoints[this.pointer % this.endpoints.length];
    this.pointer++;
    ep.callCount++;
    return ep.url;
  }

  getByIndex(index: number): string {
    return this.endpoints[index % this.endpoints.length].url;
  }

  get size(): number { return this.endpoints.length; }
  get urls(): string[] { return this.endpoints.map(e => e.url); }

  logStats(): void {
    console.log(`[ProviderPool] Stats (${this.endpoints.length} endpoints):`);
    for (const ep of this.endpoints) {
      console.log(`  [${ep.name}] calls=${ep.callCount} errors=${ep.errorCount}`);
    }
  }
}
