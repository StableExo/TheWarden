/**
 * Measure the CDP enclave signing overhead from the runtime that actually sends
 * transactions.
 *
 *   npm run benchmark:cdp-signing            # 200 signatures
 *   npm run benchmark:cdp-signing -- 50      # 50 signatures
 *
 * Run this from the same Railway region as the bot before setting SIGNER_MODE=cdp.
 * The decision rule from the plan: if p99 is comfortably under one Base block
 * (2s), the enclave is safe on the hot path.
 */
import 'dotenv/config';
import { CdpClient } from '@coinbase/cdp-sdk';

function percentile(sorted: number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

async function main(): Promise<void> {
  const iterations = parseInt(process.argv[2] || process.env.BENCH_ITERATIONS || '200', 10);
  const walletName = process.env.CDP_WALLET_NAME || 'warden-signer';

  const cdp = new CdpClient();
  const account = await cdp.evm.getOrCreateAccount({ name: walletName });

  console.log(`Benchmarking ${iterations} signatures for ${account.address} (wallet "${walletName}")`);

  const samples: number[] = [];
  let failures = 0;

  for (let i = 0; i < iterations; i += 1) {
    const started = process.hrtime.bigint();
    try {
      await cdp.evm.signMessage({
        address: account.address,
        message: `warden-latency-probe-${i}-${Date.now()}`,
      });
    } catch (error) {
      failures += 1;
      if (failures === 1) {
        console.error('first failure:', error instanceof Error ? error.message : error);
      }
      continue;
    }
    samples.push(Number(process.hrtime.bigint() - started) / 1e6);
  }

  if (samples.length === 0) {
    console.error('no successful signatures; nothing to report');
    process.exit(1);
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;

  console.log('');
  console.log(`samples   ${sorted.length} ok, ${failures} failed`);
  console.log(`min       ${sorted[0].toFixed(1)} ms`);
  console.log(`p50       ${percentile(sorted, 50).toFixed(1)} ms`);
  console.log(`p95       ${percentile(sorted, 95).toFixed(1)} ms`);
  console.log(`p99       ${percentile(sorted, 99).toFixed(1)} ms`);
  console.log(`max       ${sorted[sorted.length - 1].toFixed(1)} ms`);
  console.log(`mean      ${mean.toFixed(1)} ms`);
  console.log('');
  console.log('This measures signMessage round trips. For the UserOp path, the bundler');
  console.log('round trip dominates and is not included here.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
