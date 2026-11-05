import { describe, it, expect } from 'vitest';
import {
  MARKETS,
  DEFAULT_MARKETS,
  coinbaseCandlesUrl,
  marketBoard,
  marketBoards,
  formatMarketBoards,
} from '../Markets.js';
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

const breakLong = (lookback: number): SetupSpec => ({
  name: `break-${lookback}-high`,
  direction: 'long',
  trigger: { kind: 'breakout', lookback },
  stopPct: 0.012,
  targetPct: 0.03,
  horizonBars: 24,
});

const breakShort = (lookback: number): SetupSpec => ({
  ...breakLong(lookback),
  name: `break-${lookback}-low`,
  direction: 'short',
});

describe('market registry', () => {
  it('lists BTC, ETH and SOL by default', () => {
    expect(DEFAULT_MARKETS).toEqual(['BTC-USD', 'ETH-USD', 'SOL-USD']);
    for (const id of DEFAULT_MARKETS) {
      expect(MARKETS[id].id).toBe(id);
      expect(MARKETS[id].coinbaseProduct).toBe(id);
      expect(MARKETS[id].label.length).toBeGreaterThan(0);
    }
  });

  it('builds the public Coinbase hourly candle URL for a product', () => {
    expect(coinbaseCandlesUrl('ETH-USD', 300)).toBe(
      'https://api.exchange.coinbase.com/products/ETH-USD/candles?granularity=3600&limit=300'
    );
    expect(coinbaseCandlesUrl('SOL-USD')).toContain('/products/SOL-USD/candles');
  });
});

describe('one market board', () => {
  it('is green when the newest bar trades through the level', () => {
    const s = thenFlat(20, 100);
    s.push(bar(20 * 3_600_000, 101, 95, 96));
    const board = marketBoard('ETH-USD', s, [breakShort(20)]);
    expect(board.market).toBe('ETH-USD');
    expect(board.light).toBe('green');
    expect(board.price).toBe(96);
    expect(board.lines[0].state).toBe('fired');
  });

  it('is red when no rule is near its level', () => {
    // Wide bars then a last bar strictly inside the range: neither side fires.
    const s: Candle[] = [];
    for (let i = 0; i < 20; i++) s.push(bar(i * 3_600_000, 110, 90, 100));
    s.push(bar(20 * 3_600_000, 101, 99, 100));
    const board = marketBoard('BTC-USD', s, [breakLong(20), breakShort(20)]);
    expect(board.light).toBe('red');
  });

  it('carries the newest bar time and price', () => {
    const s = thenFlat(20, 100);
    s.push(bar(20 * 3_600_000, 91, 89, 90));
    const board = marketBoard('SOL-USD', s, [breakLong(20)]);
    expect(board.at).toBe(20 * 3_600_000);
    expect(board.price).toBe(90);
  });
});

describe('board across markets', () => {
  it('puts a market with a lit rule above one that is all red', () => {
    const litSeries = thenFlat(20, 100);
    litSeries.push(bar(20 * 3_600_000, 101, 95, 96)); // short fires
    const dullSeries: Candle[] = [];
    for (let i = 0; i < 20; i++) dullSeries.push(bar(i * 3_600_000, 110, 90, 100));
    dullSeries.push(bar(20 * 3_600_000, 101, 99, 100)); // inside range: nothing fires

    const boards = marketBoards(
      [
        { market: 'BTC-USD', series: dullSeries },
        { market: 'ETH-USD', series: litSeries },
      ],
      [breakLong(20), breakShort(20)]
    );
    expect(boards[0].market).toBe('ETH-USD');
    expect(boards[0].light).toBe('green');
    expect(boards[1].light).toBe('red');
  });

  it('formats every market with its light and rules', () => {
    const s = thenFlat(20, 100);
    s.push(bar(20 * 3_600_000, 101, 95, 96));
    const text = formatMarketBoards(marketBoards([{ market: 'ETH-USD', series: s }], [breakShort(20)]));
    expect(text).toContain('ETH-USD');
    expect(text).toContain('GREEN');
    expect(text).toContain('break-20-low');
  });
});
