/**
 * BuilderNet Operator API Demo
 * 
 * Demonstrates how to use the BuilderNetOperatorClient to manage
 * a BuilderNet instance via the operator API on port 3535.
 * 
 * Prerequisites:
 * 1. BuilderNet instance running with operator API on port 3535
 * 2. Port 3535 open and accessible
 * 3. Basic auth configured
 * 
 * Environment variables required:
 * - BUILDERNET_OPERATOR_URL: Instance URL (e.g., https://your-ip:3535)
 * - BUILDERNET_OPERATOR_PASSWORD: Basic auth password
 */

import { BuilderNetOperatorClient, OperatorAction, FileUploadTarget } from '../src/mev/builders';
import { logger } from '../src/utils/logger';

async function main() {
  // Configuration from environment
  const operatorUrl = process.env.BUILDERNET_OPERATOR_URL;
  const operatorPassword = process.env.BUILDERNET_OPERATOR_PASSWORD;
  const allowInsecure = process.env.BUILDERNET_OPERATOR_ALLOW_INSECURE !== 'false';

  if (!operatorUrl || !operatorPassword) {
    logger.error('Missing required environment variables:');
    logger.error('- BUILDERNET_OPERATOR_URL');
    logger.error('- BUILDERNET_OPERATOR_PASSWORD');
    logger.error('');
    logger.error('Example:');
    logger.error('export BUILDERNET_OPERATOR_URL=https://192.168.1.100:3535');
    logger.error('export BUILDERNET_OPERATOR_PASSWORD=my_secret_password');
    process.exit(1);
  }

  logger.info('═══════════════════════════════════════════════════════');
  logger.info('  BuilderNet Operator API Demo');
  logger.info('═══════════════════════════════════════════════════════');
  logger.info('');
  logger.info(`Instance URL: ${operatorUrl}`);
  logger.info(`Allow Insecure SSL: ${allowInsecure}`);
  logger.info('');

  // Initialize client
  const client = new BuilderNetOperatorClient({
    instanceUrl: operatorUrl,
    password: operatorPassword,
    allowInsecure,
    enableLogging: true,
  });

  try {
    // 1. Check liveness
    logger.info('1️⃣  Checking instance liveness...');
    const liveness = await client.checkLiveness();
    logger.info(`   Status: ${liveness.status}`);
    logger.info('');

    if (liveness.status !== 'ok') {
      logger.warn('   Instance is not responding properly. Some operations may fail.');
      logger.info('');
    }

    // 2. Get recent logs
    logger.info('2️⃣  Fetching recent logs (last 50 lines)...');
    try {
      const logs = await client.getLogs(50);
      logger.info(`   Retrieved ${logs.lines} lines`);
      logger.info('   Last 10 lines:');
      const logLines = logs.logs.split('\n').slice(-10);
      logLines.forEach(line => {
        if (line.trim()) {
          logger.info(`   ${line}`);
        }
      });
    } catch (error) {
      logger.error(`   Failed to fetch logs: ${error}`);
    }
    logger.info('');

    // 3. Get health status (combines liveness + logs)
    logger.info('3️⃣  Getting comprehensive health status...');
    const health = await client.getHealthStatus();
    logger.info(`   Healthy: ${health.healthy}`);
    logger.info(`   Liveness Status: ${health.liveness.status}`);
    if (health.recentLogs) {
      logger.info(`   Recent Logs Available: ${health.recentLogs.lines} lines`);
    }
    logger.info('');

    // 4. Upload a sample blocklist (demonstration only)
    logger.info('4️⃣  Uploading sample blocklist...');
    const sampleBlocklist = [
      '0x0000000000000000000000000000000000000001', // Example blocked address
      '0x0000000000000000000000000000000000000002',
    ];
    const uploadSuccess = await client.updateBlocklist(sampleBlocklist);
    logger.info(`   Upload Status: ${uploadSuccess ? 'Success' : 'Failed'}`);
    logger.info('');

    // 5. Optional: Restart rbuilder (commented out for safety)
    // Uncomment to actually restart the builder
    logger.info('5️⃣  Rbuilder restart (skipped for safety)');
    logger.info('   To actually restart, uncomment the code below:');
    logger.info('   // const restartSuccess = await client.restartRbuilder();');
    logger.info('   // logger.info(`   Restart Status: ${restartSuccess ? "Success" : "Failed"}`);');
    logger.info('');

    // Example of how to restart (commented out):
    // logger.info('5️⃣  Restarting rbuilder...');
    // const restartSuccess = await client.restartRbuilder();
    // logger.info(`   Restart Status: ${restartSuccess ? 'Success' : 'Failed'}`);
    // logger.info('');

    // 6. Execute custom action (demonstration)
    logger.info('6️⃣  Example of executing custom actions:');
    logger.info('   Available actions:');
    logger.info(`   - ${OperatorAction.RBUILDER_RESTART}: Restart the rbuilder instance`);
    logger.info(`   - ${OperatorAction.RBUILDER_STOP}: Stop the rbuilder instance`);
    logger.info(`   - ${OperatorAction.RBUILDER_START}: Start the rbuilder instance`);
    logger.info('');

    // Summary
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('  Demo Complete!');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');
    logger.info('Key Capabilities Demonstrated:');
    logger.info('✅ Liveness monitoring');
    logger.info('✅ Log retrieval');
    logger.info('✅ Health status checks');
    logger.info('✅ File uploads (blocklist)');
    logger.info('✅ Action execution (rbuilder control)');
    logger.info('');
    logger.info('Integration Tips:');
    logger.info('1. Use checkLiveness() for monitoring dashboards');
    logger.info('2. Use getLogs() for debugging and alerts');
    logger.info('3. Use updateBlocklist() to dynamically block addresses');
    logger.info('4. Use restartRbuilder() for automated recovery');
    logger.info('5. Combine with BuilderNetIntelligence for TEE attestation tracking');
    logger.info('');

  } catch (error) {
    logger.error('Demo encountered an error:');
    logger.error(error);
    process.exit(1);
  }
}

// Run the demo
main().catch(error => {
  logger.error('Fatal error in demo:');
  logger.error(error);
  process.exit(1);
});
