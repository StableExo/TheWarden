/**
 * Lightning Network Integration Demo
 * Demonstrates Core Lightning client and payment processor
 */

import { CoreLightningClient, LightningPaymentProcessor } from '../src/lightning/index.js';

async function main() {
  console.log('⚡ Lightning Network Integration Demo\n');
  console.log('=====================================\n');

  // Initialize Core Lightning client
  console.log('1. Initializing Core Lightning client...');
  const client = new CoreLightningClient({
    network: 'testnet',
    lightningDir: process.env.LIGHTNING_DIR,
  });

  // Health check
  console.log('\n2. Performing health check...');
  const health = await client.healthCheck();
  
  if (!health.healthy) {
    console.error('❌ Lightning node not healthy:', health.error);
    console.log('\nPlease ensure:');
    console.log('  1. Bitcoin Core testnet is running: bitcoind -testnet -daemon');
    console.log('  2. Core Lightning testnet is running: lightningd --network=testnet --daemon');
    console.log('  3. Run setup script: ./scripts/lightning/setup-testnet.sh');
    process.exit(1);
  }

  console.log('✅ Lightning node is healthy!');
  
  if (health.nodeInfo) {
    console.log(`   Node ID: ${health.nodeInfo.id}`);
    console.log(`   Alias: ${health.nodeInfo.alias || 'N/A'}`);
    console.log(`   Network: ${health.nodeInfo.network}`);
    console.log(`   Block height: ${health.nodeInfo.blockheight}`);
    console.log(`   Active channels: ${health.nodeInfo.num_active_channels}`);
    console.log(`   Peers: ${health.nodeInfo.num_peers}`);
  }

  // Initialize payment processor
  console.log('\n3. Initializing payment processor...');
  const processor = new LightningPaymentProcessor({
    lightningClient: client,
    debtAllocationPercent: 70,
    consciousnessIntegration: true,
  });
  console.log('✅ Payment processor initialized');

  // Demo: Create invoice
  console.log('\n4. Creating test invoice for AI query service...');
  try {
    const { invoice, transactionId } = await processor.createServiceInvoice(
      'ai-query-demo',
      100, // 100 sats
      'Demo AI query payment',
      'demo-user'
    );

    console.log('✅ Invoice created successfully!');
    console.log(`   Transaction ID: ${transactionId}`);
    console.log(`   Payment Hash: ${invoice.payment_hash}`);
    console.log(`   Amount: 100 sats`);
    console.log(`   Expires: ${new Date(invoice.expires_at * 1000).toISOString()}`);
    console.log(`\n   BOLT11 Invoice:\n   ${invoice.bolt11}`);
    console.log('\n   💡 Pay this invoice with any Lightning wallet to test!');

    // Demo: Get stats
    console.log('\n5. Payment processor statistics...');
    const stats = processor.getStats();
    console.log(`   Total invoices created: ${stats.totalInvoicesCreated}`);
    console.log(`   Total invoices paid: ${stats.totalInvoicesPaid}`);
    console.log(`   Total revenue: ${stats.totalRevenueSats} sats`);
    console.log(`   Debt allocation: ${stats.totalDebtAllocationSats} sats (${stats.debtAllocationPercent}%)`);

    // Demo: List recent invoices
    console.log('\n6. Recent invoices...');
    const invoices = await client.listInvoices();
    console.log(`   Total invoices: ${invoices.invoices.length}`);
    
    const recent = invoices.invoices.slice(0, 5);
    for (const inv of recent) {
      const amountSats = inv.msatoshi ? inv.msatoshi / 1000 : 0;
      console.log(`   - ${inv.label}: ${amountSats} sats [${inv.status}]`);
    }

    // Demo: Check balance
    console.log('\n7. Wallet balance...');
    const balance = await client.getBalance();
    console.log(`   Outputs: ${balance.outputs?.length || 0}`);
    let totalSats = 0;
    if (balance.outputs) {
      for (const output of balance.outputs) {
        totalSats += output.amount_msat / 1000;
      }
    }
    console.log(`   Total: ${totalSats} sats`);

    // Demo: List channels
    console.log('\n8. Lightning channels...');
    const channels = await client.listChannels();
    console.log(`   Total channels: ${channels.channels.length}`);
    
    for (const channel of channels.channels) {
      const ourSats = channel.msatoshi_to_us / 1000;
      const theirSats = channel.msatoshi_to_them / 1000;
      console.log(`   - ${channel.short_channel_id || channel.channel_id.slice(0, 16)}...`);
      console.log(`     State: ${channel.state}`);
      console.log(`     Our balance: ${ourSats} sats`);
      console.log(`     Their balance: ${theirSats} sats`);
    }

  } catch (error) {
    console.error('\n❌ Error during demo:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  }

  console.log('\n=====================================');
  console.log('✅ Demo complete!\n');
  console.log('Next steps:');
  console.log('  1. Pay the invoice with a Lightning wallet');
  console.log('  2. Watch for payment confirmation');
  console.log('  3. Verify revenue allocation (70% debt, 30% operational)');
  console.log('  4. Check consciousness system for recorded events');
  console.log('\nFor testnet Bitcoin:');
  console.log('  - https://testnet-faucet.com/btc-testnet/');
  console.log('  - https://coinfaucet.eu/en/btc-testnet/');
  console.log('');
}

// Run demo
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
