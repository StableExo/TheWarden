// src/trading/exchanges.ts
//
// Public market-data adapters. OKX, Coinbase and Kraken are reachable from a
// normal host; Binance and Bybit geo-block some regions, so they are not wired
// in. Each exchange has a pure parser (unit-testable offline) and a thin fetch
// wrapper over the global `fetch`.
//
// The parsers normalise to `Candle[]` ascending by time and to a common
// `OrderBook` shape. Coinbase returns candles as [time, low, high, open, close,
// volume]; OKX as [time, open, high, low, close, volume, ...]; Kraken as
// [time, open, high, low, close, vwap, volume, count] and oldest-first.

import type { Candle, DepthLevel, ExchangeId, OrderBook } from './types.js';

interface Endpoint {
  candles: (hours: number) => string;
  book: string;
}

export const ENDPOINTS: Record<ExchangeId, Endpoint> = {
  okx: {
    candles: (h) =>
      `https://www.okx.com/api/v5/market/candles?instId=BTC-USDT-SWAP&bar=1H&limit=${Math.min(h, 300)}`,
    book: 'https://www.okx.com/api/v5/market/books?instId=BTC-USDT-SWAP&sz=400',
  },
  coinbase: {
    candles: (h) =>
      `https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=3600&limit=${h}`,
    book: 'https://api.exchange.coinbase.com/products/BTC-USD/book?level=2',
  },
  kraken: {
    candles: () => 'https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=60',
    book: 'https://api.kraken.com/0/public/Depth?pair=XBTUSD&count=500',
  },
};

const HOUR = 3_600_000;

function ascending(candles: Candle[]): Candle[] {
  return candles.sort((a, b) => a.time - b.time);
}

/** OKX: { data: [[ts, o, h, l, c, vol, ...], ...] }, newest first. */
export function parseOkxCandles(raw: unknown): Candle[] {
  const data = (raw as { data?: unknown[][] }).data ?? [];
  const out: Candle[] = data.map((r) => ({
    time: Number(r[0]),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
  }));
  return ascending(out);
}

/** Coinbase: [[ts_s, low, high, open, close, volume], ...], newest first. */
export function parseCoinbaseCandles(raw: unknown): Candle[] {
  const data = (raw as unknown[][]) ?? [];
  const out: Candle[] = data.map((r) => ({
    time: Number(r[0]) * 1000,
    low: Number(r[1]),
    high: Number(r[2]),
    open: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
  }));
  return ascending(out);
}

/** Kraken: { result: { XXBTZUSD: [[ts, o, h, l, c, vwap, vol, count], ...] } }. */
export function parseKrakenCandles(raw: unknown): Candle[] {
  const result = (raw as { result?: Record<string, unknown> }).result ?? {};
  const key = Object.keys(result).find((k) => k !== 'last');
  const rows = (key ? (result[key] as unknown[][]) : []) ?? [];
  const out: Candle[] = rows.map((r) => ({
    time: Number(r[0]) * 1000,
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[6]),
  }));
  return ascending(out);
}

export const CANDLE_PARSERS: Record<ExchangeId, (raw: unknown) => Candle[]> = {
  okx: parseOkxCandles,
  coinbase: parseCoinbaseCandles,
  kraken: parseKrakenCandles,
};

function pairs(rows: unknown[][]): DepthLevel[] {
  return rows.map((r) => ({ price: Number(r[0]), size: Number(r[1]) }));
}

export function parseOkxBook(raw: unknown): { bids: DepthLevel[]; asks: DepthLevel[] } {
  const d = ((raw as { data?: unknown[][] }).data ?? [])[0] as unknown[] | undefined;
  const levels = (d ?? []) as unknown[][];
  const bids = levels[0] as unknown[][] | undefined;
  const asks = levels[1] as unknown[][] | undefined;
  return { bids: pairs(bids ?? []), asks: pairs(asks ?? []) };
}

export function parseCoinbaseBook(raw: unknown): { bids: DepthLevel[]; asks: DepthLevel[] } {
  const r = raw as { bids?: unknown[][]; asks?: unknown[][] };
  return { bids: pairs(r.bids ?? []), asks: pairs(r.asks ?? []) };
}

export function parseKrakenBook(raw: unknown): { bids: DepthLevel[]; asks: DepthLevel[] } {
  const result = (raw as { result?: Record<string, unknown> }).result ?? {};
  const key = Object.keys(result)[0];
  const r = (key ? (result[key] as { bids?: unknown[][]; asks?: unknown[][] }) : {}) ?? {};
  return { bids: pairs(r.bids ?? []), asks: pairs(r.asks ?? []) };
}

/** Fetch hour candles, newest-last, trimming to at most `hours` bars. */
export async function fetchCandles(exchange: ExchangeId, hours = 200): Promise<Candle[]> {
  const res = await fetch(ENDPOINTS[exchange].candles(hours));
  if (!res.ok) throw new Error(`${exchange} candles: HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  return CANDLE_PARSERS[exchange](json).slice(-hours);
}

/** Fetch a top-of-book snapshot. */
export async function fetchOrderBook(exchange: ExchangeId): Promise<OrderBook> {
  const res = await fetch(ENDPOINTS[exchange].book);
  if (!res.ok) throw new Error(`${exchange} book: HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  const { bids, asks } =
    exchange === 'okx' ? parseOkxBook(json)
      : exchange === 'coinbase' ? parseCoinbaseBook(json)
        : parseKrakenBook(json);
  return { exchange, time: Date.now(), bids, asks };
}

/** Hour-align a timestamp (floor to the hour, UTC). */
export function hourFloor(ms: number): number {
  return Math.floor(ms / HOUR) * HOUR;
}
