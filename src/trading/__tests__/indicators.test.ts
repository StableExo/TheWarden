import { describe, it, expect } from 'vitest';
import { ema, sma, rsi, atr, priorSwingLow, priorSwingHigh } from '../indicators.js';
import type { Candle } from '../types.js';

const bar = (time: number, o: number, h: number, l: number, c: number, v = 1): Candle => ({
  time,
  open: o,
  high: h,
  low: l,
  close: c,
  volume: v,
});

describe('ema', () => {
  it('seeds with the SMA then smooths', () => {
    const e = ema([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
    expect(e[0]).toBeNull();
    expect(e[1]).toBeNull();
    expect(e[2]).toBeCloseTo(2, 10); // SMA of 1,2,3
    expect(e[9]).toBeCloseTo(9, 10);
  });
  it('returns all null when history is short', () => {
    expect(ema([1, 2], 5).every((x) => x === null)).toBe(true);
  });
});

describe('sma', () => {
  it('averages the trailing window', () => {
    const s = sma([1, 2, 3, 4, 5], 3);
    expect(s[2]).toBeCloseTo(2, 10);
    expect(s[3]).toBeCloseTo(3, 10);
    expect(s[4]).toBeCloseTo(4, 10);
  });
});

describe('rsi', () => {
  it('is 100 for a strictly rising series', () => {
    const r = rsi(Array.from({ length: 20 }, (_, i) => i + 1), 14);
    expect(r[19]).toBeCloseTo(100, 6);
  });
  it('is near 0 for a strictly falling series', () => {
    const r = rsi(Array.from({ length: 20 }, (_, i) => 100 - i), 14);
    expect(r[19]!).toBeLessThan(1);
  });
  it('is null before it has enough history', () => {
    const r = rsi([1, 2, 3], 14);
    expect(r.every((x) => x === null)).toBe(true);
  });
});

describe('atr', () => {
  it('measures the trading range', () => {
    const candles = Array.from({ length: 20 }, (_, i) => bar(i, 100, 102, 98, 100));
    const a = atr(candles, 14);
    expect(a[13]).toBeCloseTo(4, 6); // high - low, no gaps
  });
});

describe('swing levels', () => {
  const candles = [
    bar(0, 100, 105, 95, 100),
    bar(1, 100, 110, 99, 105),
    bar(2, 105, 108, 97, 100),
    bar(3, 100, 101, 100, 100),
  ];
  it('finds the lowest low before the current bar', () => {
    expect(priorSwingLow(candles, 3, 3)).toBe(95);
  });
  it('finds the highest high before the current bar', () => {
    expect(priorSwingHigh(candles, 3, 3)).toBe(110);
  });
  it('returns null without enough history', () => {
    expect(priorSwingLow(candles, 1, 3)).toBeNull();
  });
});
