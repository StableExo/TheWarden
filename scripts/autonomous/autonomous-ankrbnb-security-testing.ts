#!/usr/bin/env node --import tsx
/**
 * Autonomous ankrBNB Security Testing
 * 
 * Autonomously monitors and tests ankrBNB contract security on BSC:
 * - Real-time transaction monitoring
 * - Automated vulnerability detection
 * - Pattern analysis for known exploits
 * - Comprehensive security reporting
 * - Alert generation for suspicious activity
 * 
 * Usage:
 *   npm run autonomous:ankrbnb-security
 *   npm run autonomous:ankrbnb-security -- --duration=3600
 *   npm run autonomous:ankrbnb-security -- --verbose
 */

import { ethers } from 'ethers';
import { AnkrContractRegistry, AnkrChain } from '../../src/security/ankr/AnkrContractRegistry.js';
import { AnkrVulnerabilityDetector, TransactionPattern } from '../../src/security/ankr/AnkrVulnerabilityDetector.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface SecurityTestingConfig {
  duration: number;        // seconds to run (0 = infinite)
  verbose: boolean;        // detailed logging
  bscRpcUrl: string;      // BSC RPC endpoint
  blockRange: number;     // blocks to scan initially
  monitoring: boolean;    // enable live monitoring
}

const DEFAULT_CONFIG: SecurityTestingConfig = {
  duration: 0,
  verbose: false,
  bscRpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
  blockRange: 100,
  monitoring: true,
};

// ============================================================================
// AUTONOMOUS SECURITY TESTER
// ============================================================================

class AutonomousAnkrBNBSecurityTester {
  private detector: AnkrVulnerabilityDetector;
  private provider: ethers.JsonRpcProvider;
  private config: SecurityTestingConfig;
  private startTime: Date;
  private stats = {
    blocksScanned: 0,
    transactionsAnalyzed: 0,
    vulnerabilitiesDetected: 0,
    alertsGenerated: 0,
    runtime: 0,
  };
  private running: boolean = false;
  
  constructor(config: SecurityTestingConfig) {
    this.config = config;
    this.detector = new AnkrVulnerabilityDetector();
    this.provider = new ethers.JsonRpcProvider(config.bscRpcUrl);
    this.startTime = new Date();
  }

  /**
   * Main autonomous testing loop
   */
  async run(): Promise<void> {
    this.running = true;
    
    console.log('\n🔒 AUTONOMOUS ANKRBNB SECURITY TESTING STARTED');
    console.log('━'.repeat(60));
    console.log(`🕐 Start Time: ${this.startTime.toISOString()}`);
    console.log(`⏱️  Duration: ${this.config.duration > 0 ? `${this.config.duration}s` : 'Infinite'}`);
    console.log(`🌐 BSC RPC: ${this.config.bscRpcUrl}`);
    console.log(`📊 Initial Scan: ${this.config.blockRange} blocks`);
    console.log('━'.repeat(60));

    try {
      // Phase 1: Historical block analysis
      await this.analyzeHistoricalBlocks();

      // Phase 2: Real-time monitoring (if enabled and duration permits)
      if (this.config.monitoring && (this.config.duration === 0 || this.config.duration > 300)) {
        await this.startRealTimeMonitoring();
      }

      // Phase 3: Generate final report
      await this.generateReport();

    } catch (error) {
      console.error('\n❌ Error during autonomous testing:', error);
      throw error;
    } finally {
      this.running = false;
    }
  }

  /**
   * Phase 1: Analyze recent historical blocks
   */
  private async analyzeHistoricalBlocks(): Promise<void> {
    console.log('\n📚 PHASE 1: Historical Block Analysis');
    console.log('━'.repeat(60));

    const ankrBNB = AnkrContractRegistry.getContractsByChain(AnkrChain.BSC)
      .find(c => c.name === 'ankrBNB');

    if (!ankrBNB) {
      console.error('❌ ankrBNB contract not found in registry');
      return;
    }

    console.log(`🎯 Target: ${ankrBNB.name} (${ankrBNB.address})`);

    // Get latest block
    const latestBlock = await this.provider.getBlockNumber();
    const startBlock = latestBlock - this.config.blockRange;

    console.log(`📦 Scanning blocks ${startBlock} to ${latestBlock}`);
    console.log(`⏳ Analyzing ${this.config.blockRange} blocks...`);

    for (let blockNum = startBlock; blockNum <= latestBlock; blockNum++) {
      if (!this.running || this.shouldStop()) break;

      const block = await this.provider.getBlock(blockNum, true);
      if (!block || !block.transactions) continue;

      this.stats.blocksScanned++;

      // Analyze transactions in block
      for (const txHash of block.transactions) {
        if (typeof txHash === 'string') {
          await this.analyzeTransaction(txHash, ankrBNB.address);
        }
      }

      // Progress update every 10 blocks
      if (blockNum % 10 === 0 && this.config.verbose) {
        console.log(`  📊 Progress: ${blockNum - startBlock}/${this.config.blockRange} blocks`);
      }
    }

    console.log(`✅ Historical scan complete`);
    console.log(`   Blocks: ${this.stats.blocksScanned}`);
    console.log(`   Transactions: ${this.stats.transactionsAnalyzed}`);
    console.log(`   Vulnerabilities: ${this.stats.vulnerabilitiesDetected}`);
  }

  /**
   * Phase 2: Real-time transaction monitoring
   */
  private async startRealTimeMonitoring(): Promise<void> {
    console.log('\n📡 PHASE 2: Real-Time Monitoring');
    console.log('━'.repeat(60));

    const ankrBNB = AnkrContractRegistry.getContractsByChain(AnkrChain.BSC)
      .find(c => c.name === 'ankrBNB');

    if (!ankrBNB) return;

    console.log(`🎯 Monitoring: ${ankrBNB.name} (${ankrBNB.address})`);
    console.log(`⏱️  Press Ctrl+C to stop monitoring`);

    // Subscribe to pending transactions (BSC may not support this)
    // Fallback to polling new blocks
    const pollInterval = 3000; // 3 seconds (BSC block time)
    let lastBlock = await this.provider.getBlockNumber();

    const pollTimer = setInterval(async () => {
      if (!this.running || this.shouldStop()) {
        clearInterval(pollTimer);
        return;
      }

      try {
        const currentBlock = await this.provider.getBlockNumber();
        
        if (currentBlock > lastBlock) {
          // Process new blocks
          for (let blockNum = lastBlock + 1; blockNum <= currentBlock; blockNum++) {
            const block = await this.provider.getBlock(blockNum, true);
            if (!block || !block.transactions) continue;

            this.stats.blocksScanned++;

            for (const txHash of block.transactions) {
              if (typeof txHash === 'string') {
                await this.analyzeTransaction(txHash, ankrBNB.address);
              }
            }
          }

          lastBlock = currentBlock;
          
          if (this.config.verbose) {
            console.log(`  🔄 New block ${currentBlock} processed`);
          }
        }
      } catch (error) {
        console.error('  ⚠️  Error polling blocks:', error);
      }
    }, pollInterval);

    // Wait for duration or manual stop
    await this.waitForStop();
    clearInterval(pollTimer);
    
    console.log(`✅ Real-time monitoring stopped`);
  }

  /**
   * Analyze individual transaction
   */
  private async analyzeTransaction(txHash: string, targetAddress: string): Promise<void> {
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return;

      // Filter: Only analyze transactions to ankrBNB contract
      if (tx.to?.toLowerCase() !== targetAddress.toLowerCase()) return;

      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) return;

      this.stats.transactionsAnalyzed++;

      // Extract function signature from tx.data
      const functionSignature = tx.data.slice(0, 10); // First 4 bytes (8 hex chars + '0x')

      // Create transaction pattern for detector
      const pattern: TransactionPattern = {
        txHash: tx.hash,
        from: tx.from,
        to: tx.to || '',
        value: tx.value.toString(),
        functionSignature: functionSignature,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: tx.blockNumber || 0,
        timestamp: Date.now(), // We'd need to fetch block for actual timestamp
      };

      // Detect vulnerabilities
      const findings = await this.detector.analyzeTransaction(pattern);

      if (findings.length > 0) {
        this.stats.vulnerabilitiesDetected += findings.length;
        this.stats.alertsGenerated++;

        // Generate alert
        console.log('\n🚨 VULNERABILITY DETECTED 🚨');
        console.log('━'.repeat(60));
        console.log(`  Transaction: ${txHash}`);
        console.log(`  Block: ${tx.blockNumber}`);
        console.log(`  From: ${tx.from}`);
        console.log(`  Function: ${functionSignature}`);
        console.log(`  Gas Used: ${receipt.gasUsed.toString()}`);
        
        findings.forEach((finding, i) => {
          console.log(`\n  Finding ${i + 1}:`);
          console.log(`    Severity: ${finding.severity.toUpperCase()}`);
          console.log(`    Type: ${finding.type}`);
          console.log(`    Description: ${finding.description}`);
          console.log(`    Potential Reward: ${finding.potentialReward}`);
          if (finding.relatedAudit) {
            console.log(`    Related Audit: ${finding.relatedAudit}`);
          }
        });
        console.log('━'.repeat(60));
      }

    } catch (error) {
      if (this.config.verbose) {
        console.error(`  ⚠️  Error analyzing tx ${txHash}:`, error);
      }
    }
  }

  /**
   * Generate comprehensive security report
   */
  private async generateReport(): Promise<void> {
    console.log('\n📊 PHASE 3: Final Report Generation');
    console.log('━'.repeat(60));

    const endTime = new Date();
    this.stats.runtime = (endTime.getTime() - this.startTime.getTime()) / 1000;

    // Get all findings from detector
    const allFindings = this.detector.getAllFindings();

    const report = {
      metadata: {
        generatedAt: endTime.toISOString(),
        runtime: `${this.stats.runtime.toFixed(2)}s`,
        contract: 'ankrBNB',
        chain: 'BSC',
        address: '0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827',
      },
      statistics: {
        blocksScanned: this.stats.blocksScanned,
        transactionsAnalyzed: this.stats.transactionsAnalyzed,
        vulnerabilitiesDetected: this.stats.vulnerabilitiesDetected,
        alertsGenerated: this.stats.alertsGenerated,
        scanRate: this.stats.runtime > 0 
          ? `${(this.stats.blocksScanned / this.stats.runtime).toFixed(2)} blocks/s`
          : '0 blocks/s',
      },
      findings: allFindings.map(f => ({
        severity: f.severity,
        type: f.type,
        description: f.description,
        potentialReward: f.potentialReward,
        detectionMethod: f.detectionMethod,
        relatedAudit: f.relatedAudit,
        timestamp: f.timestamp.toISOString(),
      })),
      summary: {
        critical: allFindings.filter(f => f.severity === 'critical').length,
        high: allFindings.filter(f => f.severity === 'high').length,
        medium: allFindings.filter(f => f.severity === 'medium').length,
        low: allFindings.filter(f => f.severity === 'low').length,
        informational: allFindings.filter(f => f.severity === 'informational').length,
      },
    };

    // Print summary
    console.log('\n📈 STATISTICS:');
    console.log(`   Blocks Scanned: ${this.stats.blocksScanned}`);
    console.log(`   Transactions Analyzed: ${this.stats.transactionsAnalyzed}`);
    console.log(`   Vulnerabilities Detected: ${this.stats.vulnerabilitiesDetected}`);
    console.log(`   Alerts Generated: ${this.stats.alertsGenerated}`);
    console.log(`   Runtime: ${this.stats.runtime.toFixed(2)}s`);
    console.log(`   Scan Rate: ${report.statistics.scanRate}`);

    console.log('\n🔍 FINDINGS SUMMARY:');
    console.log(`   Critical: ${report.summary.critical}`);
    console.log(`   High: ${report.summary.high}`);
    console.log(`   Medium: ${report.summary.medium}`);
    console.log(`   Low: ${report.summary.low}`);
    console.log(`   Informational: ${report.summary.informational}`);

    // Save report
    await this.saveReport(report);

    console.log('\n✅ AUTONOMOUS TESTING COMPLETE');
    console.log('━'.repeat(60));
  }

  /**
   * Save report to files
   */
  private async saveReport(report: any): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseDir = '.memory/security-testing';
    
    // Ensure directory exists
    await fs.mkdir(baseDir, { recursive: true });

    // Save JSON report
    const jsonPath = path.join(baseDir, `ankrbnb_security_test_${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved: ${jsonPath}`);

    // Save markdown summary
    const mdPath = path.join(baseDir, `ankrbnb_security_test_${timestamp}.md`);
    const markdown = this.generateMarkdownReport(report);
    await fs.writeFile(mdPath, markdown);
    console.log(`💾 Summary saved: ${mdPath}`);
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(report: any): string {
    const lines: string[] = [];
    
    lines.push('# ankrBNB Autonomous Security Testing Report\n');
    lines.push(`**Generated**: ${report.metadata.generatedAt}`);
    lines.push(`**Contract**: ${report.metadata.contract}`);
    lines.push(`**Chain**: ${report.metadata.chain}`);
    lines.push(`**Address**: ${report.metadata.address}`);
    lines.push(`**Runtime**: ${report.metadata.runtime}\n`);
    
    lines.push('---\n');
    lines.push('## Statistics\n');
    lines.push(`- **Blocks Scanned**: ${report.statistics.blocksScanned}`);
    lines.push(`- **Transactions Analyzed**: ${report.statistics.transactionsAnalyzed}`);
    lines.push(`- **Vulnerabilities Detected**: ${report.statistics.vulnerabilitiesDetected}`);
    lines.push(`- **Alerts Generated**: ${report.statistics.alertsGenerated}`);
    lines.push(`- **Scan Rate**: ${report.statistics.scanRate}\n`);
    
    lines.push('---\n');
    lines.push('## Findings Summary\n');
    lines.push(`- 🔴 **Critical**: ${report.summary.critical}`);
    lines.push(`- 🟠 **High**: ${report.summary.high}`);
    lines.push(`- 🟡 **Medium**: ${report.summary.medium}`);
    lines.push(`- 🟢 **Low**: ${report.summary.low}`);
    lines.push(`- ℹ️  **Informational**: ${report.summary.informational}\n`);
    
    if (report.findings.length > 0) {
      lines.push('---\n');
      lines.push('## Detailed Findings\n');
      
      report.findings.forEach((finding: any, i: number) => {
        lines.push(`### Finding ${i + 1}: ${finding.type}\n`);
        lines.push(`- **Severity**: ${finding.severity.toUpperCase()}`);
        lines.push(`- **Description**: ${finding.description}`);
        lines.push(`- **Potential Reward**: ${finding.potentialReward}`);
        lines.push(`- **Detection Method**: ${finding.detectionMethod}`);
        if (finding.relatedAudit) {
          lines.push(`- **Related Audit**: ${finding.relatedAudit}`);
        }
        lines.push(`- **Detected At**: ${finding.timestamp}\n`);
      });
    } else {
      lines.push('---\n');
      lines.push('## No Vulnerabilities Detected\n');
      lines.push('No suspicious activity or known vulnerability patterns were detected during this testing session.\n');
    }
    
    lines.push('---\n');
    lines.push('*Generated by TheWarden Autonomous Security Testing System*\n');
    
    return lines.join('\n');
  }

  /**
   * Check if testing should stop
   */
  private shouldStop(): boolean {
    if (this.config.duration === 0) return false;
    
    const elapsed = (Date.now() - this.startTime.getTime()) / 1000;
    return elapsed >= this.config.duration;
  }

  /**
   * Wait for stop signal
   */
  private async waitForStop(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.running || this.shouldStop()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);

      // Handle Ctrl+C gracefully
      process.on('SIGINT', () => {
        console.log('\n⚠️  Received stop signal, finishing up...');
        this.running = false;
        clearInterval(checkInterval);
        resolve();
      });
    });
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  args.forEach(arg => {
    if (arg.startsWith('--duration=')) {
      config.duration = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--verbose') {
      config.verbose = true;
    } else if (arg === '--no-monitoring') {
      config.monitoring = false;
    } else if (arg.startsWith('--blocks=')) {
      config.blockRange = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--rpc=')) {
      config.bscRpcUrl = arg.split('=')[1];
    }
  });

  console.log('\n🛡️  ANKRBNB AUTONOMOUS SECURITY TESTING SYSTEM');
  console.log('━'.repeat(60));
  console.log('TheWarden Security Intelligence Platform');
  console.log('━'.repeat(60));

  const tester = new AutonomousAnkrBNBSecurityTester(config);
  
  try {
    await tester.run();
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { AutonomousAnkrBNBSecurityTester };
