import { describe, it, expect } from 'vitest';
import {
  parseOkxCandles,
  parseCoinbaseCandles,
  parseKrakenCandles,
  parseOkxBook,
  parseCoinbaseBook,
  parseKrakenBook,
  hourFloor,
} from '../exchanges.js';

describe('candle parsers', () => {
  it('reads OKX (newest first) and sorts ascending', () => {
    const raw = {
      code: '0',
      data: [
        ['1793901600000', '75904', '75904', '75789.4', '75796.5', '4303.87', '43', '3263592', '0'],
        ['1793898000000', '76350', '76353.7', '75771.4', '75904.1', '622127', '6221', '47', '1'],
      ],
    };
    const c = parseOkxCandles(raw);
    expect(c).toHaveLength(2);
    expect(c[0].time).toBe(1793898000000);
    expect(c[1].time).toBe(1793901600000);
    expect(c[1].open).toBe(75904);
    expect(c[1].low).toBe(75789.4);
    expect(c[1].close).toBe(75796.5);
    expect(c[1].volume).toBe(4303.87);
  });

  it('reads Coinbase [time, low, high, open, close, volume]', () => {
    const raw = [[1793898000, 75680.06, 76291.99, 76270.12, 75800.01, 1093.96]];
    const c = parseCoinbaseCandles(raw);
    expect(c[0].time).toBe(1793898000000);
    expect(c[0].low).toBe(75680.06);
    expect(c[0].high).toBe(76291.99);
    expect(c[0].open).toBe(76270.12);
    expect(c[0].close).toBe(75800.01);
  });

  it('reads Kraken (oldest first, strings)', () => {
    const raw = {
      result: {
        XXBTZUSD: [[1793898000, '76301.7', '76301.8', '75706.8', '75836.7', '75800.0', '1200.5', 42]],
        last: 1793901600,
      },
    };
    const c = parseKrakenCandles(raw);
    expect(c[0].time).toBe(1793898000000);
    expect(c[0].open).toBe(76301.7);
    expect(c[0].close).toBe(75836.7);
    expect(c[0].volume).toBe(1200.5);
  });
});

describe('order book parsers', () => {
  it('reads OKX bids/asks', () => {
    const raw = { data: [[['75900', '2', '0', '3']], [['75910', '1.5', '0', '2']]] };
    const { bids, asks } = parseOkxBook(raw);
    expect(bids[0]).toEqual({ price: 75900, size: 2 });
    expect(asks[0]).toEqual({ price: 75910, size: 1.5 });
  });
  it('reads Coinbase bids/asks', () => {
    const raw = { bids: [['75900', '2', 3]], asks: [['75910', '1.5', 2]] };
    const { bids, asks } = parseCoinbaseBook(raw);
    expect(bids[0]).toEqual({ price: 75900, size: 2 });
    expect(asks[0]).toEqual({ price: 75910, size: 1.5 });
  });
  it('reads Kraken depth', () => {
    const raw = { result: { XXBTZUSD: { bids: [['75900', '2', 1]], asks: [['75910', '1.5', 1]] } } };
    const { bids, asks } = parseKrakenBook(raw);
    expect(bids[0]).toEqual({ price: 75900, size: 2 });
    expect(asks[0]).toEqual({ price: 75910, size: 1.5 });
  });
});

describe('hourFloor', () => {
  it('floors to the UTC hour', () => {
    expect(hourFloor(1793901600000 + 1234567)).toBe(1793901600000);
  });
});
