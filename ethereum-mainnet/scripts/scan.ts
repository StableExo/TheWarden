/**
 * scan.ts — Read-only ETH Mainnet Pool Scanner
 * Usage: npx tsx ethereum-mainnet/scripts/scan.ts
 * GL-L40 | TheWarden
 */
import { EthPoolScanner } from '../scanner/EthPoolScanner';

async function main() {
  console.log('\n⚡ ETH MAINNET — Pool Scanner | GL-L40');
  console.log('='.repeat(52));
  const s = new EthPoolScanner();
  const [block, gas] = await Promise.all([s.getCurrentBlock(), s.getGasPrice()]);
  console.log(`  Block: ${block.toLocaleString()} | Gas: ${gas}\n`);
  console.log('🔍 Scanning pools...');
  const prices = await s.scanAll();
  for (const p of prices)
    console.log(`  ${p.pool.label.padEnd(30)} ${p.pool.protocol.padEnd(12)} ${p.price.toFixed(8)}`);
  console.log('\n🎯 Arb opportunities:');
  const opps = await s.findOpportunities();
  if (opps.length === 0) { console.log('  None above threshold.'); }
  else for (const o of opps)
    console.log(`  ${o.label.padEnd(12)} ${o.buyPool.protocol} → ${o.sellPool.protocol}  ${o.profitable ? `✅ ~${o.estimatedProfitBps}bps` : `⚠️  ${Math.round(o.spread * 10000)}bps spread`}`);
  console.log('\nDone ✅');
}
main().catch(console.error);
