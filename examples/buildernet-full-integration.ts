/**
 * BuilderNet Full Integration Example
 * 
 * Demonstrates combining BuilderNetOperatorClient, BuilderNetIntelligence,
 * and BuilderNetClient for comprehensive BuilderNet management.
 * 
 * This example shows:
 * 1. Remote operator instance management
 * 2. TEE attestation verification
 * 3. Bundle submission
 * 4. Health monitoring and automated recovery
 */

import { JsonRpcProvider } from 'ethers';
import {
  BuilderNetOperatorClient,
  BuilderNetClient,
} from '../src/mev/builders';
import { BuilderNetIntelligence } from '../src/intelligence/flashbots/BuilderNetIntelligence';
import { logger } from '../src/utils/logger';

/**
 * Comprehensive BuilderNet Manager
 * Combines all BuilderNet capabilities for production use
 */
class BuilderNetManager {
  private operatorClient: BuilderNetOperatorClient;
  private intelligence: BuilderNetIntelligence;
  private bundleClient: BuilderNetClient;
  private provider: JsonRpcProvider;
  private nodeId: string;

  constructor(
    operatorClient: BuilderNetOperatorClient,
    intelligence: BuilderNetIntelligence,
    bundleClient: BuilderNetClient,
    provider: JsonRpcProvider,
    nodeId: string
  ) {
    this.operatorClient = operatorClient;
    this.intelligence = intelligence;
    this.bundleClient = bundleClient;
    this.provider = provider;
    this.nodeId = nodeId;
  }

  /**
   * Comprehensive health check combining operator API and TEE attestation
   */
  async performHealthCheck(): Promise<{
    healthy: boolean;
    operatorHealth: boolean;
    attestationValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // 1. Check operator API liveness
    const operatorHealth = await this.operatorClient.checkLiveness();
    const operatorHealthy = operatorHealth.status === 'ok';

    if (!operatorHealthy) {
      issues.push('Operator API not responding');
    }

    // 2. Verify TEE attestation
    const attestation = this.intelligence.verifyAttestation(this.nodeId);
    const attestationValid = attestation.verified;

    if (!attestationValid) {
      issues.push(`TEE attestation failed: ${attestation.reason}`);
    }

    // 3. Check bundle submission capability
    const bundleHealthy = await this.bundleClient.healthCheck();
    if (!bundleHealthy) {
      issues.push('Bundle submission endpoint not healthy');
    }

    const healthy = operatorHealthy && attestationValid && bundleHealthy;

    return {
      healthy,
      operatorHealth: operatorHealthy,
      attestationValid,
      issues,
    };
  }

  /**
   * Automated recovery procedure
   */
  async attemptRecovery(): Promise<boolean> {
    logger.warn('[BuilderNetManager] Attempting automated recovery...');

    try {
      // 1. Check logs for errors
      const logs = await this.operatorClient.getLogs(200);
      const errorLines = logs.logs
        .split('\n')
        .filter((line) => line.toLowerCase().includes('error'));

      if (errorLines.length > 0) {
        logger.info(`[BuilderNetManager] Found ${errorLines.length} error lines in logs`);
        logger.debug('[BuilderNetManager] Recent errors:', errorLines.slice(-5));
      }

      // 2. Restart rbuilder
      logger.info('[BuilderNetManager] Restarting rbuilder...');
      const restartSuccess = await this.operatorClient.restartRbuilder();

      if (!restartSuccess) {
        logger.error('[BuilderNetManager] Restart command failed');
        return false;
      }

      // 3. Wait for restart to complete
      logger.info('[BuilderNetManager] Waiting for restart to complete...');
      await new Promise((resolve) => setTimeout(resolve, 15000)); // 15 second wait

      // 4. Verify recovery
      const health = await this.performHealthCheck();

      if (health.healthy) {
        logger.info('[BuilderNetManager] Recovery successful! ✅');
        
        // Update reputation positively
        this.intelligence.updateNodeReputation(this.nodeId, true, 1.0);
        
        return true;
      } else {
        logger.error('[BuilderNetManager] Recovery failed. Issues:', health.issues);
        
        // Update reputation negatively
        this.intelligence.updateNodeReputation(this.nodeId, false, 1.0);
        
        return false;
      }
    } catch (error) {
      logger.error('[BuilderNetManager] Recovery attempt failed:', error);
      return false;
    }
  }

  /**
   * Dynamic blocklist management based on observed behavior
   */
  async updateBlocklistFromThreats(
    suspiciousAddresses: Array<{ address: string; reason: string }>
  ): Promise<boolean> {
    if (suspiciousAddresses.length === 0) {
      return true;
    }

    logger.info(`[BuilderNetManager] Blocking ${suspiciousAddresses.length} suspicious addresses`);

    const addresses = suspiciousAddresses.map((item) => item.address);
    
    // Log reasons
    suspiciousAddresses.forEach(({ address, reason }) => {
      logger.info(`  - ${address}: ${reason}`);
    });

    // Upload new blocklist
    const uploadSuccess = await this.operatorClient.updateBlocklist(addresses);

    if (uploadSuccess) {
      logger.info('[BuilderNetManager] Blocklist updated successfully');

      // Restart to apply changes
      await this.operatorClient.restartRbuilder();

      return true;
    } else {
      logger.error('[BuilderNetManager] Failed to update blocklist');
      return false;
    }
  }

  /**
   * Monitor and analyze logs for patterns
   */
  async analyzeLogs(): Promise<{
    errorCount: number;
    warningCount: number;
    rpcErrors: number;
    suspiciousPatterns: string[];
  }> {
    const logs = await this.operatorClient.getLogs(1000);
    const lines = logs.logs.split('\n');

    const errorCount = lines.filter((line) => line.toLowerCase().includes('error')).length;
    const warningCount = lines.filter((line) => line.toLowerCase().includes('warn')).length;
    const rpcErrors = lines.filter(
      (line) => line.includes('RPC') && line.includes('error')
    ).length;

    // Look for suspicious patterns
    const suspiciousPatterns: string[] = [];

    // Check for repeated errors
    const errorMap = new Map<string, number>();
    lines
      .filter((line) => line.toLowerCase().includes('error'))
      .forEach((line) => {
        const errorType = line.split('error')[1]?.trim().split(' ')[0] || 'unknown';
        errorMap.set(errorType, (errorMap.get(errorType) || 0) + 1);
      });

    errorMap.forEach((count, type) => {
      if (count > 5) {
        suspiciousPatterns.push(`Repeated ${type} errors (${count} times)`);
      }
    });

    return {
      errorCount,
      warningCount,
      rpcErrors,
      suspiciousPatterns,
    };
  }

  /**
   * Continuous monitoring loop
   */
  async startMonitoring(intervalMs: number = 60000): Promise<void> {
    logger.info('[BuilderNetManager] Starting continuous monitoring...');

    const monitoringLoop = async () => {
      try {
        // Perform health check
        const health = await this.performHealthCheck();

        if (!health.healthy) {
          logger.warn('[BuilderNetManager] Health check failed:', health.issues);

          // Attempt automated recovery
          const recovered = await this.attemptRecovery();

          if (!recovered) {
            logger.error('[BuilderNetManager] Automated recovery failed. Manual intervention required.');
          }
        } else {
          logger.info('[BuilderNetManager] Health check passed ✅');

          // Analyze logs for issues
          const logAnalysis = await this.analyzeLogs();

          if (logAnalysis.suspiciousPatterns.length > 0) {
            logger.warn('[BuilderNetManager] Suspicious patterns detected:');
            logAnalysis.suspiciousPatterns.forEach((pattern) => {
              logger.warn(`  - ${pattern}`);
            });
          }

          // Update reputation positively
          this.intelligence.updateNodeReputation(this.nodeId, true, 0.5);
        }
      } catch (error) {
        logger.error('[BuilderNetManager] Monitoring loop error:', error);
      }

      // Schedule next check
      setTimeout(monitoringLoop, intervalMs);
    };

    // Start the loop
    monitoringLoop();
  }
}

/**
 * Example usage
 */
async function main() {
  logger.info('═══════════════════════════════════════════════════════');
  logger.info('  BuilderNet Full Integration Demo');
  logger.info('═══════════════════════════════════════════════════════');

  // Configuration from environment
  const operatorUrl = process.env.BUILDERNET_OPERATOR_URL;
  const operatorPassword = process.env.BUILDERNET_OPERATOR_PASSWORD;
  const rpcUrl = process.env.BASE_RPC_URL || process.env.RPC_URL;

  if (!operatorUrl || !operatorPassword || !rpcUrl) {
    logger.error('Missing required environment variables:');
    logger.error('- BUILDERNET_OPERATOR_URL');
    logger.error('- BUILDERNET_OPERATOR_PASSWORD');
    logger.error('- BASE_RPC_URL or RPC_URL');
    process.exit(1);
  }

  // Initialize provider
  const provider = new JsonRpcProvider(rpcUrl);

  // Initialize operator client
  const operatorClient = new BuilderNetOperatorClient({
    instanceUrl: operatorUrl,
    password: operatorPassword,
    allowInsecure: true,
  });

  // Initialize intelligence (for TEE attestation)
  const intelligence = new BuilderNetIntelligence(provider);

  // Initialize bundle client
  const bundleClient = new BuilderNetClient();

  // Register our builder node
  const nodeId = 'my-buildernet-node';
  intelligence.registerBuilderNode({
    operator: nodeId,
    ipAddress: new URL(operatorUrl).hostname,
    attestationStatus: 'pending',
    reputationScore: 0.8,
    isActive: true,
    connectedRelays: ['https://relay.flashbots.net'],
    orderflowSources: ['public', 'private-wallets'],
    lastActivity: new Date(),
  } as any); // Type assertion needed - attestationStatus expects enum value

  // Simulate TEE attestation (in production, this would come from real attestation)
  intelligence.simulateRemoteAttestation(nodeId, 'Intel SGX');

  // Create manager
  const manager = new BuilderNetManager(
    operatorClient,
    intelligence,
    bundleClient,
    provider,
    nodeId
  );

  // 1. Perform initial health check
  logger.info('\n1️⃣  Performing initial health check...');
  const health = await manager.performHealthCheck();
  logger.info('Health status:', health);

  // 2. Analyze logs
  logger.info('\n2️⃣  Analyzing logs...');
  const logAnalysis = await manager.analyzeLogs();
  logger.info('Log analysis:', logAnalysis);

  // 3. Demo: Block suspicious addresses
  logger.info('\n3️⃣  Updating blocklist (demo)...');
  await manager.updateBlocklistFromThreats([
    {
      address: '0x0000000000000000000000000000000000000001',
      reason: 'Known malicious address (example)',
    },
  ]);

  // 4. Start continuous monitoring (commented out for demo)
  logger.info('\n4️⃣  Starting continuous monitoring (skipped for demo)');
  logger.info('   To actually start monitoring, uncomment the following line:');
  logger.info('   // await manager.startMonitoring(60000); // Check every 60 seconds');

  // Example of starting monitoring (commented out):
  // await manager.startMonitoring(60000); // Check every 60 seconds

  logger.info('\n═══════════════════════════════════════════════════════');
  logger.info('  Demo Complete!');
  logger.info('═══════════════════════════════════════════════════════');
  logger.info('\nThis example demonstrated:');
  logger.info('✅ Comprehensive health checks (operator + TEE + bundles)');
  logger.info('✅ Automated recovery on failures');
  logger.info('✅ Dynamic blocklist management');
  logger.info('✅ Log analysis and pattern detection');
  logger.info('✅ Continuous monitoring setup');
}

// Run the demo
main().catch((error) => {
  logger.error('Fatal error in demo:');
  logger.error(error);
  process.exit(1);
});
