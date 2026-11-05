// src/trading/LiveTest.ts
//
// The live firing board: the backtest rules from SetupTester, watched against
// the newest tape, each with the price it is waiting for and how far away that
// is RIGHT NOW, plus the live funding / open-interest / latency context from
// Live.ts.
//
// This is a monitor, not an executor. It reads a candle series and prints which
// rules are firing, which are nearly firing, and what holding a position would
// cost. It has no order path, no key handling, and never places, sizes or
// cancels anything. The decision to act is a person's, on every trade, always.

import type { Candle, SetupSpec, SetupStats } from './types.js';
import { triggerLevel, testSetup, type TesterOptions } from './SetupTester.js';
import { venueStats, probeLatency, type VenueId, type VenueStats, type LatencySample } from './Live.js';

/** How close a rule is to firing, from nearest to furthest. */
export type FireState = 'fired' | 'at-level' | 'approaching' | 'far' | 'waiting';

const STATE_RANK: Record<FireState, number> = {
  fired: 0,
  'at-level': 1,
  approaching: 2,
  far: 3,
  waiting: 4,
};

export interface FireLine {
  name: string;
  direction: 'long' | 'short';
  /** The price the market must trade through to fire this rule from here. */
  triggerPrice: number | null;
  lastPrice: number;
  /**
   * Signed percentage the market still has to move for the trigger to fire.
   * Positive means "not yet", zero or below means "it is through the level".
   * Null while the rule lacks enough history.
   */
  distancePct: number | null;
  state: FireState;
  /** Historical frequency, from replay. Evidence, not a forecast. */
  probability: number;
  samples: number;
  expectancyR: number;
  stats: SetupStats;
}

export interface LiveContext {
  venue: VenueId;
  fundingRate: number | null;
  openInterestUsd: number | null;
  /** Round-trip upper bound between this host and the venue, ms. */
  ageMs: number | null;
}

export interface FiringReport {
  at: number;
  price: number;
  lines: FireLine[];
  context: LiveContext[];
  /** Rules that cross a line on the newest bar, in board order. */
  firing: FireLine[];
}

/**
 * Resolve a rule's live state from the newest bars. The trigger level is taken
 * from bars strictly before the last one, so "fired" means the market has just
 * traded through a level that was set before it.
 */
export function fireState(
  series: Candle[],
  spec: SetupSpec
): { state: FireState; distancePct: number | null } {
  if (series.length < 2) return { state: 'waiting', distancePct: null };
  const i = series.length - 1;
  const level = triggerLevel(series, i, spec);
  const c = series[i];
  if (level === null || !isFinite(level)) return { state: 'waiting', distancePct: null };

  const price = c.close;
  const long = spec.direction === 'long';

  if (spec.trigger.kind === 'reclaim') {
    // A reclaim fires on a cross, not a touch: the prior close must be on the
    // other side of the EMA.
    const prev = series[i - 1];
    const crossed = long
      ? c.close > level && prev.close <= level
      : c.close < level && prev.close >= level;
    if (crossed) return { state: 'fired', distancePct: 0 };
    const dist = long ? (level - price) / price : (price - level) / price;
    return { state: band(dist), distancePct: dist };
  }

  // breakout and touch: the market just has to trade through the level.
  const through = long ? c.high >= level : c.low <= level;
  const dist = long ? (level - price) / price : (price - level) / price;
  if (through || dist <= 0) return { state: 'fired', distancePct: dist };
  return { state: band(dist), distancePct: dist };
}

function band(distancePct: number): FireState {
  const d = Math.abs(distancePct);
  if (d <= 0.001) return 'at-level';
  if (d <= 0.01) return 'approaching';
  return 'far';
}

/** One rule, scored on history and placed on the live board. */
export function fireLine(series: Candle[], spec: SetupSpec, opts: TesterOptions = {}): FireLine {
  const stats = testSetup(series, spec, opts);
  const { state, distancePct } = fireState(series, spec);
  return {
    name: spec.name,
    direction: spec.direction,
    triggerPrice: stats.triggerPrice,
    lastPrice: series[series.length - 1]?.close ?? NaN,
    distancePct,
    state,
    probability: stats.probability,
    samples: stats.samples,
    expectancyR: stats.expectancyR,
    stats,
  };
}

/** Every rule on one live board, nearest to firing first. */
export function firingBoard(series: Candle[], specs: SetupSpec[], opts: TesterOptions = {}): FireLine[] {
  return specs
    .map((s) => fireLine(series, s, opts))
    .sort((a, b) => {
      const byState = STATE_RANK[a.state] - STATE_RANK[b.state];
      if (byState !== 0) return byState;
      // Within a state, the closer one first.
      const da = a.distancePct ?? Infinity;
      const db = b.distancePct ?? Infinity;
      return da - db;
    });
}

/**
 * Live context for a set of venues: funding, open interest and latency, read
 * from public endpoints. Failures are returned as nulls, never thrown.
 */
export async function liveContext(venues: VenueId[]): Promise<LiveContext[]> {
  const [stats, latency] = await Promise.all([
    Promise.all(venues.map((v) => venueStats(v).catch(() => null))),
    Promise.all(venues.map((v) => probeLatency(v).catch(() => null))),
  ]);
  const byVenue = new Map<VenueId, LatencySample>();
  for (const s of latency) if (s) byVenue.set(s.venue, s);
  return venues.map((venue, k) => {
    const s: VenueStats | null = stats[k];
    return {
      venue,
      fundingRate: s?.fundingRate ?? null,
      openInterestUsd: s?.openInterestUsd ?? null,
      ageMs: byVenue.get(venue)?.ageMs ?? null,
    };
  });
}

/** Assemble a full report: the board plus live context. */
export async function firingReport(
  series: Candle[],
  specs: SetupSpec[],
  venues: VenueId[] = [],
  opts: TesterOptions = {}
): Promise<FiringReport> {
  const lines = firingBoard(series, specs, opts);
  const context = venues.length ? await liveContext(venues) : [];
  const last = series[series.length - 1];
  return {
    at: last?.time ?? Date.now(),
    price: last?.close ?? NaN,
    lines,
    context,
    firing: lines.filter((l) => l.state === 'fired'),
  };
}

/** One line per rule, for logs and the console. */
export function formatBoard(lines: FireLine[]): string {
  const pct = (x: number | null, dp = 2) => (x === null ? '—' : `${(x * 100).toFixed(dp)}%`);
  return lines
    .map((l) => {
      const trig = l.triggerPrice === null ? '—' : l.triggerPrice.toFixed(2);
      const prob = `${(l.probability * 100).toFixed(1)}% (n=${l.samples})`;
      return [
        l.state.padEnd(12),
        l.direction.padEnd(5),
        l.name.padEnd(22),
        `trigger ${trig}`.padEnd(20),
        `dist ${pct(l.distancePct)}`.padEnd(16),
        `prob ${prob}`,
      ].join('');
    })
    .join('\n');
}
