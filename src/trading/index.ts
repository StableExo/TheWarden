// src/trading/index.ts
//
// Market data + setup testing, in one place.
//
//   import { MarketDataFeed, testSetup, volumeProfile, findWalls } from './trading';
//
//   const feed = new MarketDataFeed({ exchanges: ['okx', 'coinbase', 'kraken'] });
//   const { aligned, report } = await feed.load();
//   if (!report.ok) throw new Error('feeds disagree; do not test against this');
//
//   const series = feed.referenceSeries(aligned);
//   const stats = testSetup(series, {
//     name: 'break-20-low', direction: 'short',
//     trigger: { kind: 'breakout', lookback: 20 },
//     stopPct: 0.012, targetPct: 0.03, horizonBars: 24,
//   });
//   // stats.probability, stats.triggerPrice

export * from './types.js';
export * from './indicators.js';
export * from './exchanges.js';
export * from './MarketDataFeed.js';
export * from './LiquidityMap.js';
export * from './SetupTester.js';
