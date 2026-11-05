// src/trading/Markets.ts
//
// The watched-market registry, and the multi-market live board: the same six
// rules from LiveTest, run across several symbols at once, each symbol's board
// reduced to its own traffic light.
//
// This is still a monitor. There is no order path, no key handling and no
// sizing anywhere in this file. Adding a market only adds another light to
// read; the decision to act is a person's, on every trade, always.

import type { Candle, SetupSpec } from './types.js';
import { parseCoinbaseCandles } from './exchanges.js';
import { firingBoard, boardLight, type FireLine, type Light } from './LiveTest.js';

/** The symbols watched by default. Add one here to put it on the board. */
export type MarketId = 'BTC-USD' | 'ETH-USD' | 'SOL-USD';

export interface Market {
  id: MarketId;
  base: string;
  quote: string;
  /** Coinbase product id: the spot candle source used for the board. */
  coinbaseProduct: string;
  label: string;
}

export const MARKETS: Record<MarketId, Market> = {
  'BTC-USD': {
    id: 'BTC-USD', base: 'BTC', quote: 'USD', coinbaseProduct: 'BTC-USD', label: 'Bitcoin',
  },
  'ETH-USD': {
    id: 'ETH-USD', base: 'ETH', quote: 'USD', coinbaseProduct: 'ETH-USD', label: 'Ethereum',
  },
  'SOL-USD': {
    id: 'SOL-USD', base: 'SOL', quote: 'USD', coinbaseProduct: 'SOL-USD', label: 'Solana',
  },
};

export const DEFAULT_MARKETS: MarketId[] = ['BTC-USD', 'ETH-USD', 'SOL-USD'];

/** Public Coinbase hourly candle endpoint for a product (rows newest-first). */
export function coinbaseCandlesUrl(product: string, limit = 300): string {
  return `https://api.exchange.coinbase.com/products/${product}/candles?granularity=3600&limit=${limit}`;
}

/** Fetch one market's hourly candles, ascending by time. Read-only. */
export async function fetchMarketCandles(market: MarketId, limit = 300): Promise<Candle[]> {
  const url = coinbaseCandlesUrl(MARKETS[market].coinbaseProduct, limit);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${market} candles: HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  return parseCoinbaseCandles(json);
}

/** One market's board: its rules plus the single light for the market. */
export interface MarketBoard {
  market: MarketId;
  at: number;
  price: number;
  lines: FireLine[];
  light: Light;
}

/** Build the board for one market from its candle series. */
export function marketBoard(market: MarketId, series: Candle[], specs: SetupSpec[]): MarketBoard {
  const lines = firingBoard(series, specs);
  const last = series[series.length - 1];
  return {
    market,
    at: last?.time ?? Date.now(),
    price: last?.close ?? NaN,
    lines,
    light: boardLight(lines),
  };
}

const LIGHT_RANK: Record<Light, number> = { green: 0, yellow: 1, red: 2 };

/**
 * Boards across several markets, most urgent light first, then the market whose
 * nearest rule is closest to firing. A market with one green rule sorts above
 * a market that is all red, whatever the rest of each board looks like.
 */
export function marketBoards(
  inputs: { market: MarketId; series: Candle[] }[],
  specs: SetupSpec[]
): MarketBoard[] {
  return inputs
    .map((i) => marketBoard(i.market, i.series, specs))
    .sort((a, b) => {
      const byLight = LIGHT_RANK[a.light] - LIGHT_RANK[b.light];
      if (byLight !== 0) return byLight;
      const da = a.lines[0]?.distancePct ?? Infinity;
      const db = b.lines[0]?.distancePct ?? Infinity;
      return da - db;
    });
}

/** One block per market, each rule on a line under its light, for logs. */
export function formatMarketBoards(boards: MarketBoard[]): string {
  const label: Record<Light, string> = { green: 'GREEN ', yellow: 'YELLOW', red: 'RED   ' };
  const dist = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(2)}%`);
  return boards
    .map((b) => {
      const head = `${label[b.light]}  ${b.market.padEnd(8)} ${b.price.toFixed(2)}`;
      const rows = b.lines.map(
        (l) => `      ${l.direction.padEnd(5)} ${l.name.padEnd(20)} dist ${dist(l.distancePct).padEnd(8)}`
      );
      return [head, ...rows].join('\n');
    })
    .join('\n');
}
