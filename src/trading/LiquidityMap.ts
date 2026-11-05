// src/trading/LiquidityMap.ts
//
// A liquidity heat map: where size is resting, and where volume has traded.
//
// Two honest sources, because the ideal one is not freely available:
//
//  1. `bucketsFromOrderBook` reads a LIVE top-of-book snapshot. This is real
//     resting liquidity, but only for the moment you call it. There is no free
//     historical order book, so this cannot be replayed backwards.
//  2. `volumeProfile` is a PROXY for where liquidity sat, built from traded
//     volume over the candle history. It is what we can actually backtest on.
//
// Both reduce to the same `LiquidityBucket[]`, so the tester and the live view
// speak one language. Where a wall of size sits is where price often reacts.

import type { Candle, DepthLevel, LiquidityBucket, OrderBook } from './types.js';

export interface HeatMapOptions {
  /** Price band width as a fraction of price (0.001 = 0.1%). */
  bandPct?: number;
  /** A bucket is a "wall" when its size exceeds this multiple of the mean. */
  wallMultiple?: number;
}

const DEFAULT_BAND = 0.001;

function bandIndex(price: number, band: number): number {
  return Math.round(price / band);
}

/** Aggregate resting size into price bands. */
export function bucketsFromLevels(levels: DepthLevel[], side: 'bid' | 'ask', band: number): LiquidityBucket[] {
  const acc = new Map<number, number>();
  for (const l of levels) {
    const idx = bandIndex(l.price, band);
    acc.set(idx, (acc.get(idx) ?? 0) + l.size);
  }
  return [...acc.entries()]
    .map(([idx, size]) => ({ price: idx * band, size, side }))
    .sort((a, b) => a.price - b.price);
}

/** Live resting liquidity, both sides, as heat-map buckets. */
export function bucketsFromOrderBook(book: OrderBook, bandPct = DEFAULT_BAND): LiquidityBucket[] {
  const band = Math.max(1e-9, bandPct);
  const mid =
    book.bids[0] && book.asks[0]
      ? (book.bids[0].price + book.asks[0].price) / 2
      : book.bids[0]?.price ?? book.asks[0]?.price ?? 0;
  const width = mid * band || band;
  return [
    ...bucketsFromLevels(book.bids, 'bid', width),
    ...bucketsFromLevels(book.asks, 'ask', width),
  ].sort((a, b) => a.price - b.price);
}

/**
 * Volume profile: distribute each bar's volume across the price band of its
 * typical price (HLC/3). A proxy for where liquidity sat over the history.
 */
export function volumeProfile(candles: Candle[], bands = 60): LiquidityBucket[] {
  if (candles.length === 0) return [];
  let lo = Infinity;
  let hi = -Infinity;
  for (const c of candles) {
    if (c.low < lo) lo = c.low;
    if (c.high > hi) hi = c.high;
  }
  if (!isFinite(lo) || !isFinite(hi) || hi <= lo) return [];
  const width = (hi - lo) / bands;
  const acc = new Map<number, number>();
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3;
    const idx = Math.min(bands - 1, Math.max(0, Math.floor((typical - lo) / width)));
    acc.set(idx, (acc.get(idx) ?? 0) + c.volume);
  }
  return [...acc.entries()]
    .map(([idx, size]) => ({ price: lo + (idx + 0.5) * width, size, side: 'traded' as const }))
    .sort((a, b) => a.price - b.price);
}

/** Buckets whose size is at least `multiple` times the mean size. */
export function findWalls(buckets: LiquidityBucket[], multiple = 2): LiquidityBucket[] {
  if (buckets.length === 0) return [];
  const mean = buckets.reduce((a, b) => a + b.size, 0) / buckets.length;
  if (mean <= 0) return [];
  return buckets.filter((b) => b.size >= mean * multiple);
}

/** Total resting size within `bandPct` of `price`. */
export function liquidityNear(
  buckets: LiquidityBucket[],
  price: number,
  bandPct = 0.002
): number {
  const tol = Math.abs(price) * bandPct;
  return buckets
    .filter((b) => Math.abs(b.price - price) <= tol)
    .reduce((a, b) => a + b.size, 0);
}

/**
 * The nearest wall above and below a price, which is what a trader watches for
 * "is the market being pulled to a level".
 */
export function nearestWalls(
  buckets: LiquidityBucket[],
  price: number,
  multiple = 2
): { above: LiquidityBucket | null; below: LiquidityBucket | null } {
  const walls = findWalls(buckets, multiple);
  const above = walls.filter((w) => w.price > price).sort((a, b) => a.price - b.price)[0] ?? null;
  const below = walls.filter((w) => w.price < price).sort((a, b) => b.price - a.price)[0] ?? null;
  return { above, below };
}
