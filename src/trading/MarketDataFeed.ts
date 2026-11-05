// src/trading/MarketDataFeed.ts
//
// Merges several exchanges into one aligned series and reports whether they
// actually agree. This is the gate the tester sits behind: never test a setup
// against a feed you have not shown is the same tape as the others.
//
// Measured 2026-11-05 over 11 hourly bars: Coinbase and Kraken (both USD spot)
// tracked within ~$7 average, and OKX (USDT perp) floated a steady ~$82 (0.10%)
// above spot. Return correlation was 0.99+ on all pairs.

import type { Candle, ExchangeId, AlignmentReport } from './types.js';
import { fetchCandles } from './exchanges.js';

export interface AlignedBar {
  time: number;
  byExchange: Partial<Record<ExchangeId, Candle>>;
}

export interface FeedOptions {
  exchanges?: ExchangeId[];
  hours?: number;
  /** Reference feed for the basis/correlation comparison. */
  reference?: ExchangeId;
  /** Mean basis, as a fraction of price, under which the feeds are "ok". */
  tolerancePct?: number;
}

export const DEFAULT_EXCHANGES: ExchangeId[] = ['okx', 'coinbase', 'kraken'];

/** Group one candle set by hour. */
function byHour(candles: Candle[], out: Map<number, Candle>): void {
  for (const c of candles) out.set(c.time, c);
}

/** Align several candle sets on their common hourly timestamps. */
export function alignByHour(
  seriesByExchange: Partial<Record<ExchangeId, Candle[]>>
): AlignedBar[] {
  const maps: Partial<Record<ExchangeId, Map<number, Candle>>> = {};
  const allHours = new Set<number>();
  for (const [ex, series] of Object.entries(seriesByExchange) as [ExchangeId, Candle[]][]) {
    const m = new Map<number, Candle>();
    byHour(series, m);
    maps[ex] = m;
    for (const t of m.keys()) allHours.add(t);
  }
  const hours = [...allHours].sort((a, b) => a - b);
  const exchanges = Object.keys(maps) as ExchangeId[];
  return hours
    .map((time) => {
      const bar: AlignedBar = { time, byExchange: {} };
      let present = 0;
      for (const ex of exchanges) {
        const c = maps[ex]!.get(time);
        if (c) {
          bar.byExchange[ex] = c;
          present++;
        }
      }
      return present === exchanges.length ? bar : null;
    })
    .filter((b): b is AlignedBar => b !== null);
}

/** Pearson correlation. */
export function correlation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += x[i];
    my += y[i];
  }
  mx /= n;
  my /= n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

function returns(aligned: AlignedBar[], ex: ExchangeId): number[] {
  const closes: number[] = [];
  for (const bar of aligned) {
    const c = bar.byExchange[ex];
    if (c) closes.push(c.close);
  }
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) out.push(closes[i] / closes[i - 1] - 1);
  return out;
}

function closes(aligned: AlignedBar[], ex: ExchangeId): number[] {
  const out: number[] = [];
  for (const bar of aligned) {
    const c = bar.byExchange[ex];
    if (c) out.push(c.close);
  }
  return out;
}

/** Compare every feed to a reference: basis, return correlation, direction. */
export function validateAlignment(
  aligned: AlignedBar[],
  reference: ExchangeId = 'coinbase',
  tolerancePct = 0.002
): AlignmentReport {
  const report: AlignmentReport = {
    hoursCompared: aligned.length,
    reference,
    meanBasis: {},
    returnCorrelation: {},
    directionAgreement: {},
    ok: true,
  };
  const refCloses = closes(aligned, reference);
  const refReturns = returns(aligned, reference);
  for (const ex of Object.keys(
    aligned[0]?.byExchange ?? {}
  ) as ExchangeId[]) {
    if (ex === reference) continue;
    const exCloses = closes(aligned, ex);
    const exReturns = returns(aligned, ex);
    if (exCloses.length === 0 || refCloses.length === 0) continue;
    let basis = 0;
    for (let i = 0; i < Math.min(exCloses.length, refCloses.length); i++) {
      basis += exCloses[i] - refCloses[i];
    }
    basis /= Math.min(exCloses.length, refCloses.length);
    const meanRef = refCloses.reduce((a, b) => a + b, 0) / refCloses.length;
    report.meanBasis[ex] = basis;
    report.returnCorrelation[ex] = correlation(refReturns, exReturns);
    let agree = 0;
    const n = Math.min(refReturns.length, exReturns.length);
    for (let i = 0; i < n; i++) {
      if (Math.sign(refReturns[i]) === Math.sign(exReturns[i])) agree++;
    }
    report.directionAgreement[ex] = n ? agree / n : 0;
    if (Math.abs(basis) / meanRef > tolerancePct) report.ok = false;
  }
  return report;
}

export class MarketDataFeed {
  readonly exchanges: ExchangeId[];
  readonly reference: ExchangeId;
  private readonly hours: number;
  private readonly tolerancePct: number;

  constructor(opts: FeedOptions = {}) {
    this.exchanges = opts.exchanges ?? DEFAULT_EXCHANGES;
    this.reference = opts.reference ?? 'coinbase';
    this.hours = opts.hours ?? 200;
    this.tolerancePct = opts.tolerancePct ?? 0.002;
  }

  /** Fetch every exchange, align, and validate. */
  async load(): Promise<{ aligned: AlignedBar[]; report: AlignmentReport }> {
    const series: Partial<Record<ExchangeId, Candle[]>> = {};
    const results = await Promise.allSettled(
      this.exchanges.map((ex) => fetchCandles(ex, this.hours))
    );
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') series[this.exchanges[i]] = r.value;
    });
    const aligned = alignByHour(series);
    const report = validateAlignment(aligned, this.reference, this.tolerancePct);
    return { aligned, report };
  }

  /** The reference feed's candles from an aligned series. */
  referenceSeries(aligned: AlignedBar[]): Candle[] {
    const out: Candle[] = [];
    for (const bar of aligned) {
      const c = bar.byExchange[this.reference];
      if (c) out.push(c);
    }
    return out;
  }
}
