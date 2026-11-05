import { describe, it, expect } from 'vitest';
import { fireState, fireLine, firingBoard, formatBoard } from '../LiveTest.js';
import type { Candle, SetupSpec } from '../types.js';

function bar(time: number, high: number, low: number, close: number, open = close): Candle {
  return { time, open, high, low, close, volume: 1 };
}

/** `n` flat bars at exactly `p`, so the prior swing level is `p`. */
function thenFlat(n: number, p: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) out.push(bar(i * 3_600_000, p, p, p));
  return out;
}

const breakoutLong = (lookback: number): SetupSpec => ({
  name: `break-${lookback}-high`,
  direction: 'long',
  trigger: { kind: 'breakout', lookback },
  stopPct: 0.012,
  targetPct: 0.03,
  horizonBars: 24,
});

describe('breakout on the newest bar', () => {
  it('is "fired" when the last bar trades through the prior swing high', () => {
    const s = thenFlat(20, 100);
    s.push(bar(20 * 3_600_000, 105, 99, 104));
    const r = fireState(s, breakoutLong(20));
    expect(r.state).toBe('fired');
    expect(r.distancePct).not.toBeNull();
    expect(r.distancePct!).toBeLessThanOrEqual(0);
  });

  it('is "far" when the last close is well below the level', () => {
    const s = thenFlat(20, 100);
    s.push(bar(20 * 3_600_000, 91, 89, 90));
    const r = fireState(s, breakoutLong(20));
    expect(r.state).toBe('far');
    expect(r.distancePct!).toBeCloseTo((100 - 90) / 90, 6);
  });

  it('is "approaching" within 1% and "at-level" within 0.1%', () => {
    const near = thenFlat(20, 100);
    near.push(bar(20 * 3_600_000, 99.6, 98, 99.5)); // ~0.50% away
    expect(fireState(near, breakoutLong(20)).state).toBe('approaching');

    const at = thenFlat(20, 100);
    at.push(bar(20 * 3_600_000, 99.99, 99.9, 99.99)); // ~0.01% away, not through
    expect(fireState(at, breakoutLong(20)).state).toBe('at-level');
  });

  it('mirrors for a short below the prior swing low', () => {
    const s = thenFlat(20, 100);
    s.push(bar(20 * 3_600_000, 101, 95, 96));
    const spec: SetupSpec = { ...breakoutLong(20), name: 'break-20-low', direction: 'short' };
    const r = fireState(s, spec);
    expect(r.state).toBe('fired');
  });
});

describe('reclaim fires on a cross, not a touch', () => {
  const reclaim = (period: number): SetupSpec => ({
    name: `reclaim-EMA${period}`,
    direction: 'long',
    trigger: { kind: 'reclaim', period },
    stopPct: 0.012,
    horizonBars: 24,
  });

  it('fires when the close crosses back over the EMA', () => {
    const s = [bar(0, 11, 9, 10), bar(1, 11, 9, 10), bar(2, 10, 8, 9), bar(3, 12, 10, 11)];
    expect(fireState(s, reclaim(3)).state).toBe('fired');
  });

  it('stays far when the close is already above the EMA but did not just cross', () => {
    // closes well above the EMA for the last two bars: no fresh cross.
    const s = [bar(0, 11, 9, 10), bar(1, 11, 9, 10), bar(2, 21, 19, 20), bar(3, 22, 20, 21)];
    const r = fireState(s, reclaim(3));
    expect(r.state).not.toBe('fired');
  });
});

describe('board and formatting', () => {
  it('sorts the nearest-to-firing rule first', () => {
    const s = thenFlat(20, 100);
    s.push(bar(20 * 3_600_000, 91, 89, 90)); // long: far (high 91 < 100); short: fired (low 89 < 100)
    const specs: SetupSpec[] = [
      breakoutLong(20),
      { ...breakoutLong(20), name: 'break-20-low', direction: 'short' },
    ];
    const board = firingBoard(s, specs);
    expect(board[0].name).toBe('break-20-low');
    expect(board[0].state).toBe('fired');
  });

  it('reports "waiting" with too little history', () => {
    const s = [bar(0, 101, 99, 100)];
    expect(fireState(s, breakoutLong(20)).state).toBe('waiting');
    expect(fireState(s, breakoutLong(20)).distancePct).toBeNull();
  });

  it('carries the historical stats onto each line', () => {
    const s = thenFlat(40, 100);
    s.push(bar(40 * 3_600_000, 105, 99, 104));
    const line = fireLine(s, breakoutLong(20));
    expect(line.probability).toBeGreaterThanOrEqual(0);
    expect(line.probability).toBeLessThanOrEqual(1);
    expect(line.stats.samples).toBeGreaterThanOrEqual(0);
    expect(line.triggerPrice).toBeCloseTo(100, 6);
  });

  it('formats a board without throwing', () => {
    const s = thenFlat(20, 100);
    s.push(bar(20 * 3_600_000, 105, 99, 104));
    const text = formatBoard(firingBoard(s, [breakoutLong(20)]));
    expect(text).toContain('break-20-high');
    expect(text).toContain('fired');
  });
});
