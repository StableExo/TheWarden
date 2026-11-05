import { describe, it, expect } from 'vitest';
import { testSetup, testSetups, triggerLevel, entryPrice, simulateTrade } from '../SetupTester.js';
import type { Candle, SetupSpec } from '../types.js';

const bar = (time: number, o: number, h: number, l: number, c: number, v = 1): Candle => ({
  time,
  open: o,
  high: h,
  low: l,
  close: c,
  volume: v,
});

/**
 * A clean breakdown: three bars ranging above 99, then a bar that trades
 * through 99 (short entry at 99), then a bar that reaches the 2% target.
 */
function breakdownSeries(): Candle[] {
  return [
    bar(0, 100.0, 100.5, 99.0, 99.8),
    bar(1, 99.8, 100.6, 99.5, 100.2),
    bar(2, 100.2, 100.4, 99.8, 100.1),
    bar(3, 100.1, 100.2, 98.5, 99.0),
    bar(4, 99.0, 99.2, 97.0, 97.2),
  ];
}

const shortSpec: SetupSpec = {
  name: 'break-3-low',
  direction: 'short',
  trigger: { kind: 'breakout', lookback: 3 },
  stopPct: 0.01,
  targetPct: 0.02,
  horizonBars: 5,
};

describe('triggerLevel', () => {
  it('is the prior swing low for a short breakout', () => {
    const s = breakdownSeries();
    expect(triggerLevel(s, 3, shortSpec)).toBe(99);
  });
  it('is null without enough history', () => {
    const s = breakdownSeries();
    expect(triggerLevel(s, 1, shortSpec)).toBeNull();
  });
});

describe('entryPrice', () => {
  it('fires when the bar trades through the level', () => {
    const s = breakdownSeries();
    expect(entryPrice(s, 3, shortSpec, 99)).toBe(99);
  });
  it('does not fire when the bar holds above the level', () => {
    const s = breakdownSeries();
    expect(entryPrice(s, 2, shortSpec, 99)).toBeNull();
  });
});

describe('simulateTrade', () => {
  it('scores a target exit in R multiples', () => {
    const s = breakdownSeries();
    const t = simulateTrade(s, 3, 99, shortSpec);
    expect(t.exit).toBe('target');
    expect(t.rMultiple).toBeCloseTo(2, 6); // 2% target / 1% stop
    expect(t.outcome).toBe('win');
  });
  it('scores a stop exit at -1R', () => {
    const s = [
      bar(0, 100, 100, 99, 100),
      bar(1, 100, 100.1, 99, 100),
      bar(2, 100, 100, 99, 100),
      bar(3, 100, 100, 98.5, 99),
      bar(4, 99, 100.5, 99, 100.4), // runs back above the 99.99 stop
    ];
    const t = simulateTrade(s, 3, 99, shortSpec);
    expect(t.exit).toBe('stop');
    expect(t.rMultiple).toBe(-1);
    expect(t.outcome).toBe('loss');
  });
});

describe('testSetup', () => {
  it('reports probability, samples and the current trigger', () => {
    const stats = testSetup(breakdownSeries(), shortSpec);
    expect(stats.samples).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.probability).toBe(1);
    expect(stats.expectancyR).toBeCloseTo(2, 6);
    expect(stats.maxDrawdownR).toBe(0);
    // the level to watch now: the lowest low of the last three bars
    expect(stats.triggerPrice).toBe(98.5);
  });

  it('is never a certainty on a mixed series', () => {
    // alternate breakdowns and recoveries so wins and losses both occur
    const s: Candle[] = [];
    let p = 100;
    for (let i = 0; i < 60; i++) {
      const up = i % 20 < 10;
      const o = p;
      const c = p + (up ? 0.4 : -0.4);
      s.push(bar(i, o, Math.max(o, c) + 0.3, Math.min(o, c) - 0.3, c));
      p = c;
    }
    const stats = testSetup(s, shortSpec);
    expect(stats.samples).toBeGreaterThan(0);
    expect(stats.probability).toBeGreaterThanOrEqual(0);
    expect(stats.probability).toBeLessThanOrEqual(1);
  });

  it('ranks rules by probability', () => {
    const longSpec: SetupSpec = {
      ...shortSpec,
      name: 'break-3-high-long',
      direction: 'long',
      trigger: { kind: 'breakout', lookback: 3 },
    };
    const ranked = testSetups(breakdownSeries(), [longSpec, shortSpec]);
    expect(ranked[0].probability).toBeGreaterThanOrEqual(ranked[1].probability);
  });
});
