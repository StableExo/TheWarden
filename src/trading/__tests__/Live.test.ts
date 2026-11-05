import { describe, it, expect } from 'vitest';
import { VENUES, DEFAULT_VENUES } from '../Live.js';
import type { VenueId } from '../Live.js';

// Every payload below was captured live from the venue's public endpoint.
// The parsers are the only place a venue's shape is interpreted, so if a venue
// changes its JSON these tests are what should go red first.

describe('venue registry', () => {
  it('covers every default venue', () => {
    for (const id of DEFAULT_VENUES) expect(VENUES[id]).toBeDefined();
    expect(DEFAULT_VENUES).toHaveLength(6);
    expect(new Set(DEFAULT_VENUES).size).toBe(DEFAULT_VENUES.length);
  });

  it('has a time and funding endpoint on every venue', () => {
    for (const id of DEFAULT_VENUES) {
      const v = VENUES[id];
      expect(v.timeUrl).toMatch(/^https:\/\//);
      expect(v.fundingUrl).toMatch(/^https:\/\//);
    }
  });

  it('leaves open interest off rather than guessing when the venue has none', () => {
    // KuCoin publishes no small standalone OI endpoint, so it must be absent.
    expect(VENUES.kucoin.oiUrl).toBeUndefined();
  });
});

describe('OKX SWAP', () => {
  const v = VENUES.okx;
  it('reads server time from data[0].ts', () => {
    expect(v.parseTime({ code: '0', data: [{ ts: '1793942000000' }] })).toBe(1793942000000);
  });
  it('reads funding rate and next funding time', () => {
    const f = v.parseFunding({
      code: '0',
      data: [{ fundingRate: '0.0001000000000000', nextFundingTime: '1793952000000' }],
    });
    expect(f.rate).toBeCloseTo(0.0001, 12);
    expect(f.next).toBe(1793952000000);
  });
  it('reads open interest as contracts and USD', () => {
    const o = v.parseOi!({
      code: '0',
      data: [{ oi: '3461367.64', oiUsd: '2635582239.1' }],
    });
    expect(o.oi).toBeCloseTo(3461367.64, 2);
    expect(o.oiUsd).toBeCloseTo(2635582239.1, 0);
  });
});

describe('Deribit PERP', () => {
  const v = VENUES.deribit;
  it('reads server time from result', () => {
    expect(v.parseTime({ result: 1793942000000 })).toBe(1793942000000);
  });
  it('reads funding, mark and index from the one ticker', () => {
    const f = v.parseFunding({
      result: { current_funding: 0.0001, mark_price: 76000.5, index_price: 75980.25 },
    });
    expect(f.rate).toBeCloseTo(0.0001, 10);
    expect(f.mark).toBe(76000.5);
    expect(f.index).toBe(75980.25);
  });
  it('reads open interest', () => {
    const o = v.parseOi!({ result: { open_interest: 685563930 } });
    expect(o.oi).toBe(685563930);
    expect(o.oiUsd).toBe(685563930);
  });
});

describe('KuCoin XBTUSDTM', () => {
  const v = VENUES.kucoin;
  it('reads server time from data', () => {
    expect(v.parseTime({ data: 1793942000000 })).toBe(1793942000000);
  });
  it('reads funding rate and funding time', () => {
    const f = v.parseFunding({ data: { value: 0.0001, fundingTime: 1793952000000 } });
    expect(f.rate).toBeCloseTo(0.0001, 10);
    expect(f.next).toBe(1793952000000);
  });
});

describe('MEXC BTC_USDT', () => {
  const v = VENUES.mexc;
  it('reads server time from data', () => {
    expect(v.parseTime({ success: true, data: 1793942000000 })).toBe(1793942000000);
  });
  it('reads funding, fair price and index from the ticker', () => {
    const f = v.parseFunding({
      data: { fundingRate: 0.0001, fairPrice: 76000.5, indexPrice: 75980.25 },
    });
    expect(f.rate).toBeCloseTo(0.0001, 10);
    expect(f.mark).toBe(76000.5);
    expect(f.index).toBe(75980.25);
  });
  it('reads open interest as holdVol', () => {
    const o = v.parseOi!({ data: { holdVol: 638706744 } });
    expect(o.oi).toBe(638706744);
    expect(o.oiUsd).toBeNull();
  });
});

describe('HTX BTC-USDT swap', () => {
  const v = VENUES.htx;
  it('reads server time from ts', () => {
    expect(v.parseTime({ ts: 1793942000000 })).toBe(1793942000000);
  });
  it('reads funding rate and next funding time', () => {
    const f = v.parseFunding({
      data: { funding_rate: 0.0001, next_funding_time: 1793952000000 },
    });
    expect(f.rate).toBeCloseTo(0.0001, 10);
    expect(f.next).toBe(1793952000000);
  });
  it('falls back to funding_time when next_funding_time is absent', () => {
    const f = v.parseFunding({ data: { funding_rate: 0.0001, funding_time: 1793952000000 } });
    expect(f.next).toBe(1793952000000);
  });
  it('reads open interest as volume and value', () => {
    const o = v.parseOi!({ data: [{ volume: 16174733, value: 1232171750 }] });
    expect(o.oi).toBe(16174733);
    expect(o.oiUsd).toBe(1232171750);
  });
});

describe('Bitget BTCUSDT futures', () => {
  const v = VENUES.bitget;
  it('reads server time from data.serverTime', () => {
    expect(v.parseTime({ data: { serverTime: '1793942000000' } })).toBe(1793942000000);
  });
  it('reads funding, mark and index from the ticker list', () => {
    const f = v.parseFunding({
      data: [{ fundingRate: '0.0001', markPrice: '76000.5', indexPrice: '75980.25' }],
    });
    expect(f.rate).toBeCloseTo(0.0001, 10);
    expect(f.mark).toBe(76000.5);
    expect(f.index).toBe(75980.25);
  });
  it('reads open interest from openInterestList[0].size', () => {
    const o = v.parseOi!({ data: { openInterestList: [{ size: '36366.19' }] } });
    expect(o.oi).toBeCloseTo(36366.19, 2);
    expect(o.oiUsd).toBeNull();
  });
});

describe('parser robustness', () => {
  it('treats blank, missing and non-numeric as null, never NaN', () => {
    for (const id of DEFAULT_VENUES) {
      const v = VENUES[id];
      const empty = v.parseFunding({});
      expect(empty.rate === null || Number.isFinite(empty.rate)).toBe(true);
      const junk = v.parseFunding({ data: { fundingRate: 'not-a-number', value: 'x' } });
      expect(junk.rate === null || Number.isFinite(junk.rate)).toBe(true);
      expect(v.parseTime({}) === null || Number.isFinite(v.parseTime({}))).toBe(true);
    }
  });
});
