// src/trading/SetupTester.ts
//
// The backtester. Give it a rule and a candle history; it replays every past
// instance of the rule and reports:
//   - `probability`: the share of instances that paid (wins / resolved)
//   - `triggerPrice`: the price the market must trade to fire the rule NOW
//
// What `probability` is and is not: it is a frequency over the sample it was
// given. A rule that paid 80% over the last 120 bars did so because the sample
// trended one way. It is evidence, not a forecast, and the sample size is
// printed beside it so nobody reads it as one.

import type { Candle, Direction, SetupSpec, SetupStats, TradeResult, Trigger } from './types.js';
import { ema, priorSwingHigh, priorSwingLow } from './indicators.js';
import { liquidityNear, type LiquidityBucket } from './LiquidityMap.js';

/** Warm-up bars a trigger needs before it can be evaluated. */
function warmup(trigger: Trigger): number {
  switch (trigger.kind) {
    case 'breakout':
      return trigger.lookback;
    case 'reclaim':
      return trigger.period;
    case 'touch':
      return 0;
  }
}

/**
 * The price the trigger resolves to at bar `i`, using only bars before `i`.
 * Returns null while there is not enough history.
 */
export function triggerLevel(series: Candle[], i: number, spec: SetupSpec): number | null {
  const t = spec.trigger;
  if (t.kind === 'breakout') {
    return spec.direction === 'long'
      ? priorSwingHigh(series, i, t.lookback)
      : priorSwingLow(series, i, t.lookback);
  }
  if (t.kind === 'reclaim') {
    const e = ema(series.map((c) => c.close), t.period);
    return e[i - 1] ?? null;
  }
  return t.level;
}

/** If the rule fires on bar `i`, the fill price; otherwise null. */
export function entryPrice(series: Candle[], i: number, spec: SetupSpec, level: number | null): number | null {
  if (level === null || !isFinite(level)) return null;
  const c = series[i];
  const prev = series[i - 1];
  if (spec.trigger.kind === 'breakout') {
    if (spec.direction === 'short') return c.low <= level ? level : null;
    return c.high >= level ? level : null;
  }
  if (spec.trigger.kind === 'reclaim') {
    if (!prev) return null;
    if (spec.direction === 'long') return c.close > level && prev.close <= level ? c.close : null;
    return c.close < level && prev.close >= level ? c.close : null;
  }
  // touch
  if (spec.direction === 'short') return c.high >= level ? level : null;
  return c.low <= level ? level : null;
}

/** Walk forward from an entry to stop, target or horizon. */
export function simulateTrade(
  series: Candle[],
  i: number,
  entry: number,
  spec: SetupSpec
): TradeResult {
  const risk = entry * spec.stopPct;
  const sign = spec.direction === 'short' ? -1 : 1;
  const stop = entry - sign * risk;
  const target = spec.targetPct ? entry + sign * entry * spec.targetPct : null;
  const entryTime = series[i].time;
  const last = Math.min(i + spec.horizonBars, series.length - 1);
  for (let j = i + 1; j <= last; j++) {
    const b = series[j];
    // Conservative: if a bar spans both, the stop is assumed to fill first.
    if (spec.direction === 'short') {
      if (b.high >= stop) return done(entryTime, entry, b, stop, -1, 'stop');
      if (target !== null && b.low <= target) {
        return done(entryTime, entry, b, target, (entry - target) / risk, 'target');
      }
    } else {
      if (b.low <= stop) return done(entryTime, entry, b, stop, -1, 'stop');
      if (target !== null && b.high >= target) {
        return done(entryTime, entry, b, target, (target - entry) / risk, 'target');
      }
    }
  }
  const b = series[last];
  const r = (sign * (b.close - entry)) / risk;
  return {
    entryTime,
    entryPrice: entry,
    exitTime: b.time,
    exitPrice: b.close,
    rMultiple: r,
    outcome: r > 0 ? 'win' : r < 0 ? 'loss' : 'flat',
    exit: 'time',
  };
}

function done(
  entryTime: number,
  entryPrice: number,
  bar: Candle,
  exitPrice: number,
  r: number,
  exit: 'stop' | 'target'
): TradeResult {
  return {
    entryTime,
    entryPrice,
    exitTime: bar.time,
    exitPrice,
    rMultiple: r,
    outcome: r > 0 ? 'win' : r < 0 ? 'loss' : 'flat',
    exit,
  };
}

function maxDrawdown(rMultiples: number[]): number {
  let equity = 0;
  let peak = 0;
  let dd = 0;
  for (const r of rMultiples) {
    equity += r;
    if (equity > peak) peak = equity;
    const drop = peak - equity;
    if (drop > dd) dd = drop;
  }
  return dd;
}

export interface TesterOptions {
  /** Resting-liquidity buckets used to gate or annotate instances. */
  liquidity?: LiquidityBucket[];
  /** Band, as a fraction of price, within which liquidity counts as "near". */
  liquidityBandPct?: number;
}

/**
 * Replay a rule over a candle series and summarise it. The last bar is treated
 * as "now": the summary's `triggerPrice` is the level to watch from here.
 */
export function testSetup(series: Candle[], spec: SetupSpec, opts: TesterOptions = {}): SetupStats {
  const trades: TradeResult[] = [];
  const start = Math.max(1, warmup(spec.trigger));
  for (let i = start; i < series.length - 1; i++) {
    const level = triggerLevel(series, i, spec);
    if (
      spec.minLiquidityNearLevel !== undefined &&
      level !== null &&
      opts.liquidity &&
      liquidityNear(opts.liquidity, level, opts.liquidityBandPct ?? 0.002) < spec.minLiquidityNearLevel
    ) {
      continue;
    }
    const entry = entryPrice(series, i, spec, level);
    if (entry === null) continue;
    trades.push(simulateTrade(series, i, entry, spec));
  }

  const wins = trades.filter((t) => t.outcome === 'win');
  const losses = trades.filter((t) => t.outcome === 'loss');
  const resolved = wins.length + losses.length;
  const rs = trades.map((t) => t.rMultiple);
  const winRs = wins.map((t) => t.rMultiple);
  const lossRs = losses.map((t) => t.rMultiple);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  const lastIndex = series.length - 1;
  return {
    name: spec.name,
    direction: spec.direction,
    triggerPrice: triggerLevel(series, lastIndex, spec),
    probability: resolved ? wins.length / resolved : 0,
    samples: trades.length,
    wins: wins.length,
    losses: losses.length,
    winsLosses: resolved,
    winRate: resolved ? wins.length / resolved : 0,
    expectancyR: mean(rs),
    avgWinR: mean(winRs),
    avgLossR: mean(lossRs),
    maxDrawdownR: maxDrawdown(rs),
    trades,
  };
}

/** Run several rules over one series, best probability first. */
export function testSetups(series: Candle[], specs: SetupSpec[], opts: TesterOptions = {}): SetupStats[] {
  return specs
    .map((s) => testSetup(series, s, opts))
    .sort((a, b) => b.probability - a.probability);
}

/** Describe a rule in one line, for logs. */
export function describe(spec: SetupSpec): string {
  const t = spec.trigger;
  const trig =
    t.kind === 'breakout' ? `break ${t.lookback}-bar ${spec.direction === 'long' ? 'high' : 'low'}`
      : t.kind === 'reclaim' ? `reclaim EMA${t.period}`
        : `touch ${t.level}`;
  return `${spec.name}: ${spec.direction} on ${trig}, stop ${(spec.stopPct * 100).toFixed(1)}%`;
}

export type { Direction };
