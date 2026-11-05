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
