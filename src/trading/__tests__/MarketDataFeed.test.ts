import { describe, it, expect } from 'vitest';
import { alignByHour, validateAlignment, correlation } from '../MarketDataFeed.js';
import type { Candle } from '../types.js';

const bar = (time: number, close: number): Candle => ({
  time,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
});

const H = 3_600_000;

describe('alignByHour', () => {
  it('keeps only hours every feed has', () => {
    const a = [bar(0, 100), bar(H, 101), bar(2 * H, 102)];
    const b = [bar(H, 100.5), bar(2 * H, 101.5)];
    const aligned = alignByHour({ coinbase: a, kraken: b });
    expect(aligned).toHaveLength(2);
    expect(aligned[0].time).toBe(H);
    expect(aligned[0].byExchange.coinbase?.close).toBe(101);
    expect(aligned[0].byExchange.kraken?.close).toBe(100.5);
  });
});

describe('correlation', () => {
  it('is 1 for identical series and -1 for opposite', () => {
    expect(correlation([1, 2, 3, 4], [1, 2, 3, 4])).toBeCloseTo(1, 10);
    expect(correlation([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 10);
  });
});

describe('validateAlignment', () => {
  it('reports a small constant basis as ok', () => {
    const ref = [bar(0, 80000), bar(H, 80100), bar(2 * H, 80050)];
    const other = ref.map((c) => bar(c.time, c.close + 80)); // ~0.1% premium
    const aligned = alignByHour({ coinbase: ref, okx: other });
    const report = validateAlignment(aligned, 'coinbase', 0.002);
    expect(report.hoursCompared).toBe(3);
    expect(report.meanBasis.okx).toBeCloseTo(80, 6);
    expect(report.returnCorrelation.okx).toBeCloseTo(1, 6);
    expect(report.directionAgreement.okx).toBe(1);
    expect(report.ok).toBe(true);
  });

  it('flags a feed that drifts outside tolerance', () => {
    const ref = [bar(0, 80000), bar(H, 80100), bar(2 * H, 80050)];
    const other = ref.map((c) => bar(c.time, c.close * 1.05)); // 5% off
    const aligned = alignByHour({ coinbase: ref, okx: other });
    const report = validateAlignment(aligned, 'coinbase', 0.002);
    expect(report.ok).toBe(false);
  });
});
