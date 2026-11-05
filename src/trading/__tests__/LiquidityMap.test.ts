import { describe, it, expect } from 'vitest';
import {
  bucketsFromLevels,
  bucketsFromOrderBook,
  volumeProfile,
  findWalls,
  liquidityNear,
  nearestWalls,
} from '../LiquidityMap.js';
import type { Candle, OrderBook } from '../types.js';

const bar = (time: number, h: number, l: number, c: number, v: number): Candle => ({
  time,
  open: c,
  high: h,
  low: l,
  close: c,
  volume: v,
});

describe('bucketsFromLevels', () => {
  it('groups levels into price bands', () => {
    const levels = [
      { price: 75900, size: 2 },
      { price: 75905, size: 3 },
      { price: 76100, size: 1 },
    ];
    const buckets = bucketsFromLevels(levels, 'bid', 100);
    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toEqual({ price: 75900, size: 5, side: 'bid' });
    expect(buckets[1]).toEqual({ price: 76100, size: 1, side: 'bid' });
  });
});

describe('bucketsFromOrderBook', () => {
  it('keeps bids and asks on their own sides', () => {
    const book: OrderBook = {
      exchange: 'okx',
      time: 0,
      bids: [{ price: 75000, size: 1 }],
      asks: [{ price: 76000, size: 2 }],
    };
    const buckets = bucketsFromOrderBook(book, 0.001);
    expect(buckets.find((b) => b.side === 'bid')?.size).toBe(1);
    expect(buckets.find((b) => b.side === 'ask')?.size).toBe(2);
  });
});

describe('volumeProfile', () => {
  it('conserves total volume across bins', () => {
    const candles = [
      bar(0, 101, 99, 100, 10),
      bar(1, 102, 100, 101, 20),
      bar(2, 100, 98, 99, 30),
    ];
    const profile = volumeProfile(candles, 10);
    const total = profile.reduce((a, b) => a + b.size, 0);
    expect(total).toBeCloseTo(60, 6);
    expect(profile.every((b) => b.side === 'traded')).toBe(true);
  });

  it('is empty for an empty series', () => {
    expect(volumeProfile([])).toEqual([]);
  });
});

describe('walls and proximity', () => {
  const buckets = [
    { price: 74000, size: 1, side: 'traded' as const },
    { price: 75000, size: 1, side: 'traded' as const },
    { price: 76000, size: 10, side: 'traded' as const },
    { price: 77000, size: 1, side: 'traded' as const },
  ];
  it('finds the outlier as a wall', () => {
    const walls = findWalls(buckets, 2);
    expect(walls).toHaveLength(1);
    expect(walls[0].price).toBe(76000);
  });
  it('measures size within a band', () => {
    expect(liquidityNear(buckets, 76000, 0.002)).toBe(10);
    expect(liquidityNear(buckets, 75500, 0.00001)).toBe(0);
  });
  it('reports the nearest walls either side', () => {
    const { above, below } = nearestWalls(buckets, 75500, 2);
    expect(above?.price).toBe(76000);
    expect(below).toBeNull(); // nothing below is a wall at 2x
  });
});
