/**
 * SimplePriceOracle — VL-15 LIVE PRICE FIX
 *
 * Bug 2 fix: ETH price is no longer hardcoded at $3,000.
 * Fetches live price from Kraken REST API on construction,
 * refreshes every `priceRefreshMs` (default: 60s).
 * Falls back to last known price if Kraken is unreachable.
 *
 * VL-15 | TheWarden | @StableExo
 */

import { PriceOracle, TokenPrice } from './types';

interface PriceCacheEntry {
  price: bigint;
  decimals: number;
  timestamp: number;
}

export class SimplePriceOracle implements PriceOracle {
  private priceCache: Map<string, PriceCacheEntry>;
  private cacheTTL: number;
  private liveEthPriceUsd: number = 0;
  private priceRefreshMs: number;
  private refreshTimer?: ReturnType<typeof setInterval>;

  // Static prices for stablecoins — only ETH/WETH is live-fetched
  private readonly STATIC_PRICES: Map<string, { price: bigint; decimals: number }>;

  constructor(cacheTTL: number = 60000, priceRefreshMs: number = 60000) {
    this.cacheTTL = cacheTTL;
    this.priceRefreshMs = priceRefreshMs;
    this.priceCache = new Map();

    // Stablecoins: hardcoded $1 (these don't need a live feed)
    // ETH/WETH: dynamically populated from Kraken
    this.STATIC_PRICES = new Map([
      ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', { price: BigInt('1000000000000000000'), decimals: 6  }],  // USDC
      ['0xdac17f958d2ee523a2206206994597c13d831ec7', { price: BigInt('1000000000000000000'), decimals: 6  }],  // USDT
      ['0x6b175474e89094c44da98b954eedeac495271d0f', { price: BigInt('1000000000000000000'), decimals: 18 }],  // DAI
      ['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', { price: BigInt('60000000000000000000000'), decimals: 8 }],  // WBTC approx
    ]);

    // Kick off live ETH price immediately
    this.refreshEthPrice().then(() => {
      this.refreshTimer = setInterval(() => this.refreshEthPrice(), this.priceRefreshMs);
    });
  }

  /**
   * Fetch live ETH price from Kraken and update cache
   */
  async refreshEthPrice(): Promise<void> {
    try {
      const res = await fetch('https://api.kraken.com/0/public/Ticker?pair=ETHUSD', {
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json() as any;
      const price = parseFloat(data?.result?.XETHZUSD?.c?.[0] ?? '0');
      if (price > 100) {
        this.liveEthPriceUsd = price;
        // price in 18-decimal bigint: price * 10^18
        const priceBigInt = BigInt(Math.round(price * 1e18));
        const entry: PriceCacheEntry = { price: priceBigInt, decimals: 18, timestamp: Date.now() };
        // Update both WETH and native ETH
        this.priceCache.set('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', entry);
        this.priceCache.set('eth', entry);
        console.log(`[ORACLE] ETH live price updated: $${price.toFixed(2)}`);
      } else {
        console.warn(`[ORACLE] Kraken returned implausible ETH price: ${price} — keeping previous`);
      }
    } catch (e: any) {
      console.warn(`[ORACLE] Kraken price fetch failed: ${e?.message} — keeping $${this.liveEthPriceUsd || '?'}`);
      // If we never had a price, set a conservative fallback so we don't divide by zero
      if (this.liveEthPriceUsd === 0) {
        this.liveEthPriceUsd = 1800;  // conservative fallback — real bot will log a warning
        const fallback = BigInt(Math.round(this.liveEthPriceUsd * 1e18));
        const entry: PriceCacheEntry = { price: fallback, decimals: 18, timestamp: Date.now() };
        this.priceCache.set('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', entry);
        this.priceCache.set('eth', entry);
        console.warn(`[ORACLE] Using conservative fallback: $${this.liveEthPriceUsd} — check Kraken connectivity`);
      }
    }
  }

  /**
   * Get live ETH price in USD (float)
   */
  getLiveEthPrice(): number {
    return this.liveEthPriceUsd;
  }

  /**
   * Stop the background refresh timer (call on shutdown)
   */
  destroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  async getTokenPriceUSD(tokenAddress: string): Promise<bigint> {
    const addr = tokenAddress.toLowerCase();

    // Check live cache first (ETH/WETH land here after first refresh)
    const cached = this.priceCache.get(addr);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.price;
    }

    // Check static prices (stablecoins, WBTC)
    const staticPrice = this.STATIC_PRICES.get(addr);
    if (staticPrice) {
      this.priceCache.set(addr, { ...staticPrice, timestamp: Date.now() });
      return staticPrice.price;
    }

    // ETH/WETH: if cache is stale, trigger a refresh and return current
    if (addr === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' || addr === 'eth') {
      await this.refreshEthPrice();
      const freshCached = this.priceCache.get(addr);
      if (freshCached) return freshCached.price;
    }

    return BigInt(0);
  }

  async convertTokenAmount(
    fromToken: string,
    toToken: string,
    amount: bigint,
    fromDecimals: number,
    toDecimals: number
  ): Promise<bigint> {
    const fromPriceUSD = await this.getTokenPriceUSD(fromToken);
    const toPriceUSD   = await this.getTokenPriceUSD(toToken);
    if (fromPriceUSD === BigInt(0) || toPriceUSD === BigInt(0)) return BigInt(0);
    const amountUSD = (amount * fromPriceUSD) / BigInt(10 ** fromDecimals);
    return (amountUSD * BigInt(10 ** toDecimals)) / toPriceUSD;
  }

  async getETHPriceUSD(): Promise<bigint> {
    return this.getTokenPriceUSD('eth');
  }

  updatePrice(tokenAddress: string, priceUSD: bigint, decimals: number): void {
    const addr = tokenAddress.toLowerCase();
    this.priceCache.set(addr, { price: priceUSD, decimals, timestamp: Date.now() });
    this.STATIC_PRICES.set(addr, { price: priceUSD, decimals });
  }

  clearCache(): void {
    this.priceCache.clear();
  }

  getCachedPrices(): TokenPrice[] {
    const prices: TokenPrice[] = [];
    this.priceCache.forEach((entry, address) => {
      prices.push({
        tokenAddress: address,
        symbol: this.getTokenSymbol(address),
        priceUSD: entry.price,
        decimals: entry.decimals,
        timestamp: entry.timestamp,
      });
    });
    return prices;
  }

  private getTokenSymbol(address: string): string {
    const symbolMap: { [key: string]: string } = {
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
      '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
      '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
      eth: 'ETH',
    };
    return symbolMap[address.toLowerCase()] || address;
  }

  isCached(tokenAddress: string): boolean {
    const cached = this.priceCache.get(tokenAddress.toLowerCase());
    return cached !== undefined && Date.now() - cached.timestamp < this.cacheTTL;
  }

  getCacheTTL(): number { return this.cacheTTL; }
  setCacheTTL(ttl: number): void { this.cacheTTL = ttl; }
}

export function createCustomPriceOracle(
  customPrices: Map<string, bigint>,
  decimalsMap: Map<string, number>,
  cacheTTL: number = 60000
): SimplePriceOracle {
  const oracle = new SimplePriceOracle(cacheTTL);
  customPrices.forEach((price, address) => {
    const decimals = decimalsMap.get(address) || 18;
    oracle.updatePrice(address, price, decimals);
  });
  return oracle;
}
