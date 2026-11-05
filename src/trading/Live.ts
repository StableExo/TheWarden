// src/trading/Live.ts
//
// Read-only, live context for derivative venues: places a position can be
// expressed in BOTH directions (a perpetual), plus the two things that decide
// what holding it costs, funding and open interest, plus how fresh each feed is.
//
// This file is data-in only. There is no order, cancel, position or key
// handling anywhere in it, and there should never be: this system reads public
// market data and nothing else. Anyone wanting orders placed connects an
// account themselves and decides the approval level.

/**
 * A venue that can be long or short. This is the derivative venue set; the
 * candle feed's `ExchangeId` in `exchanges.ts` is the spot/perp set it knows.
 */
export type VenueId = 'okx' | 'deribit' | 'kucoin' | 'mexc' | 'htx' | 'bitget';

export interface VenueStats {
  venue: VenueId;
  /** Local receive time (ms). */
  time: number;
  markPrice: number | null;
  indexPrice: number | null;
  /** Funding for the current interval, as a fraction of notional (1e-4 = 1bp). */
  fundingRate: number | null;
  /** Open interest as the venue reports it (contracts or base units). */
  openInterest: number | null;
  /** Open interest in USD, where the venue publishes it. */
  openInterestUsd: number | null;
  nextFundingTime: number | null;
}

export interface LatencySample {
  venue: VenueId;
  ok: boolean;
  /**
   * Milliseconds between the venue's own clock and the moment we received the
   * reply. This is a round-trip upper bound, not a one-way figure: it includes
   * request travel, the venue's processing and the reply travel.
   */
  ageMs: number | null;
  serverTime: number | null;
  receivedAt: number;
  error?: string;
}

interface FundingParse {
  rate: number | null;
  next: number | null;
  mark?: number | null;
  index?: number | null;
}

interface Venue {
  id: VenueId;
  label: string;
  symbol: string;
  /** Server-time endpoint, used by the latency probe. */
  timeUrl: string;
  parseTime: (raw: unknown) => number | null;
  fundingUrl: string;
  parseFunding: (raw: unknown) => FundingParse;
  oiUrl?: string;
  parseOi?: (raw: unknown) => { oi: number | null; oiUsd: number | null };
}

const num = (x: unknown): number | null => {
  if (x === null || x === undefined || x === '') return null;
  const n = Number(x);
  return isFinite(n) ? n : null;
};

const at = (x: unknown, ...path: (string | number)[]): unknown =>
  path.reduce<unknown>((acc, k) => (acc == null ? undefined : (acc as Record<string | number, unknown>)[k]), x);

export const VENUES: Record<VenueId, Venue> = {
  okx: {
    id: 'okx',
    label: 'OKX SWAP',
    symbol: 'BTC-USDT-SWAP',
    timeUrl: 'https://www.okx.com/api/v5/public/time',
    parseTime: (r) => num(at(r, 'data', 0, 'ts')),
    fundingUrl: 'https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP',
    parseFunding: (r) => ({
      rate: num(at(r, 'data', 0, 'fundingRate')),
      next: num(at(r, 'data', 0, 'nextFundingTime')),
      mark: null,
      index: null,
    }),
    oiUrl: 'https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=BTC-USDT-SWAP',
    parseOi: (r) => ({
      oi: num(at(r, 'data', 0, 'oi')),
      oiUsd: num(at(r, 'data', 0, 'oiUsd')),
    }),
  },
  deribit: {
    id: 'deribit',
    label: 'Deribit PERP',
    symbol: 'BTC-PERPETUAL',
    timeUrl: 'https://www.deribit.com/api/v2/public/get_time',
    parseTime: (r) => num(at(r, 'result')),
    // One ticker carries funding, open interest, mark and index.
    fundingUrl: 'https://www.deribit.com/api/v2/public/ticker?instrument_name=BTC-PERPETUAL',
    parseFunding: (r) => ({
      rate: num(at(r, 'result', 'current_funding')),
      next: null,
      mark: num(at(r, 'result', 'mark_price')),
      index: num(at(r, 'result', 'index_price')),
    }),
    oiUrl: 'https://www.deribit.com/api/v2/public/ticker?instrument_name=BTC-PERPETUAL',
    parseOi: (r) => ({
      oi: num(at(r, 'result', 'open_interest')),
      oiUsd: num(at(r, 'result', 'open_interest')),
    }),
  },
  kucoin: {
    id: 'kucoin',
    label: 'KuCoin XBTUSDTM',
    symbol: 'XBTUSDTM',
    timeUrl: 'https://api-futures.kucoin.com/api/v1/timestamp',
    parseTime: (r) => num(at(r, 'data')),
    fundingUrl: 'https://api-futures.kucoin.com/api/v1/funding-rate/XBTUSDTM/current',
    parseFunding: (r) => ({
      rate: num(at(r, 'data', 'value')),
      next: num(at(r, 'data', 'fundingTime')),
      mark: null,
      index: null,
    }),
    // Open interest is not published on a small standalone endpoint; left off
    // rather than guessed.
  },
  mexc: {
    id: 'mexc',
    label: 'MEXC BTC_USDT',
    symbol: 'BTC_USDT',
    timeUrl: 'https://contract.mexc.com/api/v1/contract/ping',
    parseTime: (r) => num(at(r, 'data')),
    // The contract ticker carries funding, open interest, index and fair price.
    fundingUrl: 'https://contract.mexc.com/api/v1/contract/ticker?symbol=BTC_USDT',
    parseFunding: (r) => ({
      rate: num(at(r, 'data', 'fundingRate')),
      next: null,
      mark: num(at(r, 'data', 'fairPrice')),
      index: num(at(r, 'data', 'indexPrice')),
    }),
    oiUrl: 'https://contract.mexc.com/api/v1/contract/ticker?symbol=BTC_USDT',
    parseOi: (r) => ({
      oi: num(at(r, 'data', 'holdVol')),
      oiUsd: null,
    }),
  },
  htx: {
    id: 'htx',
    label: 'HTX BTC-USDT swap',
    symbol: 'BTC-USDT',
    timeUrl: 'https://api.hbdm.com/api/v1/timestamp',
    parseTime: (r) => num(at(r, 'ts')),
    fundingUrl: 'https://api.hbdm.com/linear-swap-api/v1/swap_funding_rate?contract_code=BTC-USDT',
    parseFunding: (r) => ({
      rate: num(at(r, 'data', 'funding_rate')),
      next: num(at(r, 'data', 'next_funding_time')) ?? num(at(r, 'data', 'funding_time')),
      mark: null,
      index: null,
    }),
    oiUrl: 'https://api.hbdm.com/linear-swap-api/v1/swap_open_interest?contract_code=BTC-USDT',
    parseOi: (r) => ({
      oi: num(at(r, 'data', 0, 'volume')),
      oiUsd: num(at(r, 'data', 0, 'value')),
    }),
  },
  bitget: {
    id: 'bitget',
    label: 'Bitget BTCUSDT futures',
    symbol: 'BTCUSDT',
    timeUrl: 'https://api.bitget.com/api/v2/public/time',
    parseTime: (r) => num(at(r, 'data', 'serverTime')),
    fundingUrl: 'https://api.bitget.com/api/v2/mix/market/ticker?symbol=BTCUSDT&productType=usdt-futures',
    parseFunding: (r) => ({
      rate: num(at(r, 'data', 0, 'fundingRate')),
      next: null,
      mark: num(at(r, 'data', 0, 'markPrice')),
      index: num(at(r, 'data', 0, 'indexPrice')),
    }),
    oiUrl: 'https://api.bitget.com/api/v2/mix/market/open-interest?symbol=BTCUSDT&productType=usdt-futures',
    parseOi: (r) => ({
      oi: num(at(r, 'data', 'openInterestList', 0, 'size')),
      oiUsd: null,
    }),
  },
};

export const DEFAULT_VENUES: VenueId[] = ['okx', 'deribit', 'kucoin', 'mexc', 'htx', 'bitget'];

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as unknown;
}

/** Funding, mark/index and open interest for one venue, in two calls at most. */
export async function venueStats(id: VenueId): Promise<VenueStats> {
  const v = VENUES[id];
  const [funding, oi] = await Promise.all([
    getJson(v.fundingUrl),
    v.oiUrl ? getJson(v.oiUrl) : Promise.resolve(null),
  ]);
  const f = v.parseFunding(funding);
  const o = oi !== null && v.parseOi ? v.parseOi(oi) : { oi: null, oiUsd: null };
  return {
    venue: id,
    time: Date.now(),
    markPrice: f.mark ?? null,
    indexPrice: f.index ?? null,
    fundingRate: f.rate,
    openInterest: o.oi,
    openInterestUsd: o.oiUsd,
    nextFundingTime: f.next,
  };
}

/** Funding and open interest for every venue, failures skipped. */
export async function allVenueStats(ids: VenueId[] = DEFAULT_VENUES): Promise<VenueStats[]> {
  const settled = await Promise.allSettled(ids.map((id) => venueStats(id)));
  return settled
    .filter((s): s is PromiseFulfilledResult<VenueStats> => s.status === 'fulfilled')
    .map((s) => s.value);
}

/**
 * Time one venue's public endpoint. `ageMs` is the gap between the venue's own
 * clock and our receive time, an upper bound on the round trip.
 */
export async function probeLatency(id: VenueId): Promise<LatencySample> {
  const v = VENUES[id];
  const receivedAt = Date.now();
  try {
    const raw = await getJson(v.timeUrl);
    const received = Date.now();
    const serverTime = v.parseTime(raw);
    return {
      venue: id,
      ok: serverTime !== null,
      ageMs: serverTime === null ? null : received - serverTime,
      serverTime,
      receivedAt,
    };
  } catch (err) {
    return {
      venue: id,
      ok: false,
      ageMs: null,
      serverTime: null,
      receivedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Probe every venue, fastest first, unreachable last. */
export async function probeAll(ids: VenueId[] = DEFAULT_VENUES): Promise<LatencySample[]> {
  const samples = await Promise.all(ids.map((id) => probeLatency(id)));
  return samples.sort((a, b) => {
    if (a.ageMs === null) return 1;
    if (b.ageMs === null) return -1;
    return a.ageMs - b.ageMs;
  });
}
