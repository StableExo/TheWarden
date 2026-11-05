# src/trading/

Market data and setup testing for directional price (BTCUSD), as opposed to
the on-chain arbitrage stack in `src/arbitrage` and `src/mev`.

Two jobs:

1. **Know the feed is honest.** Pull candles from several exchanges, prove they
   are the same tape, and use the one you trust.
2. **Score a rule.** Replay a setup over history and report how often it paid,
   and the price the market must trade to fire it right now.

## What `probability` means here

It is a **frequency over the sample it was given**: wins / (wins + losses) for
every past instance of the rule in that history. It is evidence, not a forecast.
A rule that reads 80% over 120 bars read 80% because those 120 bars trended one
way. The tester prints `samples` next to `probability` so it is never read as a
prediction, and the sample is only as good as the history you hand it.

## Feed alignment (measured 2026-11-05)

Eleven hourly bars, closes compared:

| pair | mean gap | return correlation | direction agreement |
|---|---|---|---|
| Coinbase vs Kraken (both USD spot) | ~$7 | 0.99+ | 10/10 |
| OKX (USDT perp) vs spot | +$82 (0.10%) | 0.99+ | 10/11 |

Coinbase and Kraken are the same tape. OKX floats a steady ~10bp above spot:
that is perp premium plus USDT/USD basis, a constant, not noise. So a perp feed
can be used, but its basis is a feature to record, not an error to ignore.

Binance and Bybit are not wired in: they geo-block requests from some regions.
Add them where the host is allowed.

## Liquidity heat map: what is real and what is a proxy

- **`bucketsFromOrderBook`** reads a **live** top-of-book snapshot. This is real
  resting liquidity, but only for the instant you call it. There is no free
  historical order book, so it cannot be replayed backwards.
- **`volumeProfile`** is a **proxy**, built from traded volume over the candle
  history. It is the thing we can actually backtest against.

Both produce `LiquidityBucket[]`, so the live view and the backtest speak one
language. `findWalls` marks the price bands where size is an outlier; those are
the levels price tends to react at, and what a setup's trigger is measured near.

To get a real historical heat map you would need to record depth snapshots going
forward. The module is shaped so that dropping those in later is additive.

## Usage

```ts
import { MarketDataFeed, testSetup, volumeProfile, findWalls } from './trading';

const feed = new MarketDataFeed({ exchanges: ['okx', 'coinbase', 'kraken'], hours: 500 });
const { aligned, report } = await feed.load();
if (!report.ok) throw new Error('feeds disagree; do not test against this');

const series = feed.referenceSeries(aligned);
const liquidity = volumeProfile(series, 80);      // historical proxy
const walls = findWalls(liquidity, 2);            // price bands that matter

const stats = testSetup(
  series,
  {
    name: 'break-20-low',
    direction: 'short',
    trigger: { kind: 'breakout', lookback: 20 },
    stopPct: 0.012,
    targetPct: 0.03,
    horizonBars: 24,
  },
  { liquidity }        // optional: gate instances on resting size near the level
);

console.log(stats.probability, stats.samples, stats.triggerPrice, stats.expectancyR);
```

`stats.triggerPrice` is the answer to "what number are we looking for": the level
the market must trade through to fire the rule from here.

## Rules available

| trigger | fires when | level |
|---|---|---|
| `{ kind: 'breakout', lookback }` | price trades through the prior N-bar extreme | the extreme |
| `{ kind: 'reclaim', period }` | close crosses back over an EMA | that EMA |
| `{ kind: 'touch', level }` | price trades at a fixed level | that level |

## Live context: funding, open interest, latency (read-only)

`Live.ts` reads the two numbers that decide what *holding* a perp costs, plus how
fresh each venue's clock is. It is **data-in only**: there is no order, cancel,
position or key handling in the file, and there should never be. It reads public
endpoints and nothing else.

```ts
import { allVenueStats, probeAll } from './trading/Live';

const stats = await allVenueStats();   // funding + OI, failures skipped
const latency = await probeAll();      // fastest first, unreachable last

for (const s of stats) console.log(s.venue, s.fundingRate, s.openInterestUsd);
console.log('fastest right now:', latency[0].venue, latency[0].ageMs, 'ms');
```

`fundingRate` is a fraction of notional per interval (`1e-4` = 1bp).
`ageMs` is the gap between the venue's own clock and our receive time: a
**round-trip upper bound**, not a one-way figure (it includes request travel, the
venue's processing and the reply travel).

Venues wired in: OKX, Deribit, KuCoin, MEXC, HTX, Bitget. All six are
derivative venues, so each can express both directions (a perp is long/short);
the spot feeds in `exchanges.ts` are long-only.

### Latency measured from this host (2026-11-05, one sample each)

| venue | ageMs (round-trip upper bound) |
|---|---|
| Coinbase | ~90 |
| Deribit | ~91 |
| MEXC | ~121 |
| KuCoin | ~140 |
| Bitget | ~146 |
| OKX | ~150 |
| HTX | ~233 |
| Kraken | ~1500 (whole-second clock, coarse) |

One sample is a hint, not a ranking. Route choice should be made on a repeated
probe (see next steps), not a single reading. Kraken's number is coarse because
its public time endpoint resolves to the whole second.

## Live firing board (read-only)

`LiveTest.ts` puts the backtest rules on the newest tape: each rule gets the
price it is waiting for, how far away that is right now, and its historical
frequency, sorted nearest-to-firing first, with the live funding / OI / latency
context attached.

```ts
import { firingBoard, firingReport, formatBoard } from './trading/LiveTest';

const board = firingBoard(series, specs);       // series = newest bars, last = now
console.log(formatBoard(board));
//   fired        short break-20-low     trigger 75431.20  dist -0.42%  prob 25.0% (n=32)
//   approaching  long  break-20-high    trigger 80900.00  dist  0.65%  prob 48.6% (n=37)

const report = await firingReport(series, specs, ['okx', 'deribit']);
for (const s of report.context) console.log(s.venue, s.fundingRate, s.openInterestUsd, s.ageMs);
```

States: `fired` (the market just traded through the level), `at-level` (within
0.1%), `approaching` (within 1%), `far`, `waiting` (not enough history). The
level comes from bars *before* the last one, so "fired" means the newest bar
crossed a line that was already set.

**This is a monitor, not an executor.** `LiveTest.ts` reads a candle series and
prints what is firing. There is no order, cancel, size or key handling in it, and
there should never be. Every decision to act is a person's.

Sample board on BTC hourly bars (2026-11-05, last close 75,925.79):

```
approaching  short  break-20-low     0.65%
approaching  short  break-50-low     0.65%
far          short  lose-EMA20      -3.81%
far          long   reclaim-EMA20    3.81%
far          long   break-20-high    6.53%
far          long   break-50-high    6.86%
```

### Traffic lights

Each rule carries a light derived from its state, and `boardLight` gives one for
the whole board:

| light | state | meaning |
|---|---|---|
| green | `fired` | the newest bar traded through the level |
| yellow | `at-level`, `approaching` | at the level or within ~1% |
| red | `far`, `waiting` | far away, or not enough history |

```ts
import { boardLight, formatLights } from './trading/LiveTest';

console.log(boardLight(board));     // 'yellow' — the most urgent light present
console.log(formatLights(board));
// YELLOW  short break-20-low       dist 0.65%   prob 25.0% (n=32)
// YELLOW  short break-50-low       dist 0.65%   prob 15.8% (n=19)
// RED     long  break-20-high      dist 6.53%   prob 48.6% (n=37)
```

The light reports how close the **rule's own stated trigger** is. It is not a
view on direction, and green is not a promise: it says the level was crossed,
nothing about what comes next. The historical frequency rides on the same line
so a green light is never read on its own.

## Honest limitations

- Probability is in-sample frequency. It does not walk forward, and it does not
  know about regime change.
- The stop is assumed to fill first when a bar spans both stop and target
  (conservative, but a stop can still slip in reality).
- Fees, funding and the perp basis are not yet modelled in the R multiple.
- The liquidity proxy is built from candles, not recorded depth.

## Next steps this enables

1. **Walk-forward**: split the history, fit on the first part, score on the
   second, so `probability` stops being in-sample.
2. **Record depth**: snapshot order books on a timer so a real historical heat
   map exists.
3. **Basis model**: fold the perp-spot basis into the R multiple.
