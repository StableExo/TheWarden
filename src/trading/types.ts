// src/trading/types.ts
//
// Shared types for the market-data and setup-testing layer.
//
// The layer answers one question honestly: given a rule and a moment in time,
// what fraction of the time has this rule paid, and what price are we waiting
// for to take it. It does not predict. "probability" below is a historical
// frequency from replay, nothing more, and it is labelled as such everywhere.

export type ExchangeId = 'okx' | 'coinbase' | 'kraken';

/** One OHLC bar. `time` is the bar's open time in ms UTC (hour-aligned). */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DepthLevel {
  price: number;
  size: number;
}

/** Top-of-book snapshot at a moment in time. */
export interface OrderBook {
  exchange: ExchangeId;
  time: number;
  bids: DepthLevel[];
  asks: DepthLevel[];
}

export type LiquiditySide = 'bid' | 'ask' | 'traded';

/** A price band with an aggregate size: one cell of a liquidity heat map. */
export interface LiquidityBucket {
  price: number;
  size: number;
  side: LiquiditySide;
}

export type Direction = 'long' | 'short';

/**
 * How an entry fires. Every trigger resolves to a single price the market must
 * trade through, so the tester can always answer "what number are we looking
 * for" at the current bar.
 */
export type Trigger =
  /** Trade through the extreme of the previous `lookback` bars. */
  | { kind: 'breakout'; lookback: number }
  /** Close back across an EMA of `period` bars. */
  | { kind: 'reclaim'; period: number }
  /** Trade at a fixed level. */
  | { kind: 'touch'; level: number };

export interface SetupSpec {
  name: string;
  direction: Direction;
  trigger: Trigger;
  /** Stop distance as a fraction of entry price (0.012 = 1.2%). */
  stopPct: number;
  /** Target distance as a fraction of entry; omit for a time-based exit. */
  targetPct?: number;
  /** Bars to hold before an exit at the close. */
  horizonBars: number;
  /**
   * Optional liquidity factor: when set, only instances whose trigger level has
   * at least this much resting size near it are counted.
   */
  minLiquidityNearLevel?: number;
}

export interface TradeResult {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  /** Profit divided by risk, signed. -1 is a full stop. */
  rMultiple: number;
  outcome: 'win' | 'loss' | 'flat';
  exit: 'stop' | 'target' | 'time';
}

export interface SetupStats {
  name: string;
  direction: Direction;
  /** The price the market must trade to fire the setup right now, if armed. */
  triggerPrice: number | null;
  /**
   * Historical frequency the setup resolved in favour, over the sample:
   * wins / (wins + losses). A description of the past, not a forecast.
   */
  probability: number;
  samples: number;
  wins: number;
  losses: number;
  winsLosses: number;
  winRate: number;
  expectancyR: number;
  avgWinR: number;
  avgLossR: number;
  maxDrawdownR: number;
  trades: TradeResult[];
}

export interface AlignmentReport {
  hoursCompared: number;
  reference: ExchangeId;
  /** Mean price gap between the reference feed and each other feed. */
  meanBasis: Partial<Record<ExchangeId, number>>;
  /** Pearson correlation of hourly returns against the reference feed. */
  returnCorrelation: Partial<Record<ExchangeId, number>>;
  /** Share of bars whose direction agrees with the reference feed (0..1). */
  directionAgreement: Partial<Record<ExchangeId, number>>;
  /** True when every compared feed is within `tolerancePct` mean basis. */
  ok: boolean;
}
