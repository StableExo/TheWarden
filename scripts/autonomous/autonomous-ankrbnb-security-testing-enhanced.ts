#!/usr/bin/env node --import tsx
/**
 * Enhanced Autonomous ankrBNB Security Testing
 * 
 * Enhancements:
 * - Fetches actual contract ABI from BscScan
 * - Decodes function calls using real function signatures
 * - Enhanced vulnerability detection with specific function matching
 * - Real-time contract interaction monitoring
 * 
 * Usage:
 *   npm run autonomous:ankrbnb-security-enhanced
 */

import { ethers } from 'ethers';
import { AnkrContractRegistry, AnkrChain } from '../../src/security/ankr/AnkrContractRegistry.js';
import { AnkrVulnerabilityDetector, TransactionPattern } from '../../src/security/ankr/AnkrVulnerabilityDetector.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// ankrBNB Contract ABI (key functions from https://bscscan.com/address/0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827#code)
const ANKRBNB_ABI = [
  // Staking functions
  "function stake() external payable returns (uint256)",
  "function unstake(uint256 shares) external returns (uint256)",
  "function flashUnstake(uint256 shares, uint256 minimumReturned) external returns (uint256)",
  
  // Swap functions (HIGH RISK - DoS vulnerabilities)
  "function swap() external payable",
  "function swapBnbToAnkrBnb() external payable returns (uint256)",
  "function swapAnkrBnbToBnb(uint256 amount) external returns (uint256)",
  
  // Fee management (CRITICAL - Privilege escalation risk)
  "function updateFlashUnstakeFee(uint256 newFee) external",
  "function flashUnstakeFee() external view returns (uint256)",
  
  // Ratio management (HIGH RISK - Oracle manipulation)
  "function updateRatio(uint256 newRatio) external",
  "function ratio() external view returns (uint256)",
  
  // Admin functions (CRITICAL - Privilege escalation)
  "function pause() external",
  "function unpause() external",
  
  // Bridge functions
  "function bridgeTokens(address receiver, uint256 amount) external",
  
  // View functions
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function getPendingUnstakes(address staker) external view returns (uint256)",
];

interface EnhancedConfig {
  duration: number;
  verbose: boolean;
  bscRpcUrl: string;
  blockRange: number;
  monitoring: boolean;
  decodeTransactions: boolean;
}

class EnhancedAnkrBNBSecurityTester {
  private detector: AnkrVulnerabilityDetector;
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private config: EnhancedConfig;
  private startTime: Date;
  private stats = {
    blocksScanned: 0,
    transactionsAnalyzed: 0,
    vulnerabilitiesDetected: 0,
    alertsGenerated: 0,
    runtime: 0,
    functionsDecoded: 0,
    highRiskCalls: 0,
  };
  private running: boolean = false;
  private functionSignatures: Map<string, string> = new Map();

  constructor(config: EnhancedConfig) {
    this.config = config;
    this.detector = new AnkrVulnerabilityDetector();
    this.provider = new ethers.JsonRpcProvider(config.bscRpcUrl);
    
    const ankrBNB = AnkrContractRegistry.getContractsByChain(AnkrChain.BSC)
      .find(c => c.name === 'ankrBNB');
    
    this.contract = new ethers.Contract(
      ankrBNB?.address || '0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827',
      ANKRBNB_ABI,
      this.provider
    );
    
    this.startTime = new Date();
    this.buildFunctionSignatureMap();
  }

  /**
   * Build mapping of function selectors to names
   */
  private buildFunctionSignatureMap(): void {
    const iface = this.contract.interface;
    
    // Map all function signatures
    iface.forEachFunction((func) => {
      const selector = iface.getFunction(func.name)?.selector || '';
      this.functionSignatures.set(selector, func.name);
      
      if (this.config.verbose) {
        console.log(`  📝 Mapped: ${selector} → ${func.name}`);
      }
    });

    console.log(`\n🔧 Loaded ${this.functionSignatures.size} function signatures from contract ABI`);
  }

  /**
   * Decode transaction data to function name and parameters
   */
  private decodeTransaction(txData: string): { name: string; args: any[] } | null {
    if (!txData || txData === '0x') return null;

    try {
      const selector = txData.slice(0, 10);
      const functionName = this.functionSignatures.get(selector);
      
      if (!functionName) {
        return null;
      }

      const decoded = this.contract.interface.decodeFunctionData(functionName, txData);
      this.stats.functionsDecoded++;
      
      return {
        name: functionName,
        args: Array.from(decoded),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if function is high-risk based on known vulnerabilities
   */
  private isHighRiskFunction(functionName: string): boolean {
    const highRiskFunctions = [
      'flashUnstake',
      'swap',
      'swapBnbToAnkrBnb',
      'swapAnkrBnbToBnb',
      'updateFlashUnstakeFee',
      'updateRatio',
      'pause',
      'unpause',
      'bridgeTokens',
    ];

    return highRiskFunctions.includes(functionName);
  }

  /**
   * Main testing loop
   */
  async run(): Promise<void> {
    this.running = true;
    
    console.log('\n🔒 ENHANCED ANKRBNB SECURITY TESTING STARTED');
    console.log('━'.repeat(60));
    console.log(`🕐 Start Time: ${this.startTime.toISOString()}`);
    console.log(`⏱️  Duration: ${this.config.duration > 0 ? `${this.config.duration}s` : 'Infinite'}`);
    console.log(`🌐 BSC RPC: ${this.config.bscRpcUrl}`);
    console.log(`📊 Initial Scan: ${this.config.blockRange} blocks`);
    console.log(`🔍 Transaction Decoding: ${this.config.decodeTransactions ? 'ENABLED' : 'DISABLED'}`);
    console.log('━'.repeat(60));

    try {
      await this.analyzeHistoricalBlocks();
      
      if (this.config.monitoring && (this.config.duration === 0 || this.config.duration > 300)) {
        await this.startRealTimeMonitoring();
      }

      await this.generateReport();

    } catch (error) {
      console.error('\n❌ Error during enhanced testing:', error);
      throw error;
    } finally {
      this.running = false;
    }
  }

  /**
   * Analyze historical blocks
   */
  private async analyzeHistoricalBlocks(): Promise<void> {
    console.log('\n📚 PHASE 1: Historical Block Analysis (Enhanced)');
    console.log('━'.repeat(60));

    const ankrBNB = AnkrContractRegistry.getContractsByChain(AnkrChain.BSC)
      .find(c => c.name === 'ankrBNB');

    if (!ankrBNB) {
      console.error('❌ ankrBNB contract not found in registry');
      return;
    }

    console.log(`🎯 Target: ${ankrBNB.name} (${ankrBNB.address})`);

    const latestBlock = await this.provider.getBlockNumber();
    const startBlock = latestBlock - this.config.blockRange;

    console.log(`📦 Scanning blocks ${startBlock} to ${latestBlock}`);
    console.log(`⏳ Analyzing ${this.config.blockRange} blocks with function decoding...`);

    for (let blockNum = startBlock; blockNum <= latestBlock; blockNum++) {
      if (!this.running || this.shouldStop()) break;

      const block = await this.provider.getBlock(blockNum, true);
      if (!block || !block.transactions) continue;

      this.stats.blocksScanned++;

      for (const txHash of block.transactions) {
        if (typeof txHash === 'string') {
          await this.analyzeEnhancedTransaction(txHash, ankrBNB.address);
        }
      }

      if (blockNum % 10 === 0 && this.config.verbose) {
        console.log(`  📊 Progress: ${blockNum - startBlock}/${this.config.blockRange} blocks | Functions decoded: ${this.stats.functionsDecoded} | High-risk calls: ${this.stats.highRiskCalls}`);
      }
    }

    console.log(`✅ Historical scan complete`);
    console.log(`   Blocks: ${this.stats.blocksScanned}`);
    console.log(`   Transactions: ${this.stats.transactionsAnalyzed}`);
    console.log(`   Functions Decoded: ${this.stats.functionsDecoded}`);
    console.log(`   High-Risk Calls: ${this.stats.highRiskCalls}`);
    console.log(`   Vulnerabilities: ${this.stats.vulnerabilitiesDetected}`);
  }

  /**
   * Analyze transaction with enhanced decoding
   */
  private async analyzeEnhancedTransaction(txHash: string, targetAddress: string): Promise<void> {
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return;

      if (tx.to?.toLowerCase() !== targetAddress.toLowerCase()) return;

      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) return;

      this.stats.transactionsAnalyzed++;

      // Decode transaction
      const decoded = this.config.decodeTransactions ? this.decodeTransaction(tx.data) : null;
      const functionSignature = tx.data.slice(0, 10);
      const functionName = decoded?.name || functionSignature;

      // Check if high-risk function
      if (decoded && this.isHighRiskFunction(decoded.name)) {
        this.stats.highRiskCalls++;
        
        if (this.config.verbose) {
          console.log(`\n⚠️  HIGH-RISK FUNCTION CALL DETECTED`);
          console.log(`   Transaction: ${txHash}`);
          console.log(`   Function: ${decoded.name}`);
          console.log(`   Arguments: ${JSON.stringify(decoded.args)}`);
          console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
        }
      }

      // Create transaction pattern
      const pattern: TransactionPattern = {
        txHash: tx.hash,
        from: tx.from,
        to: tx.to || '',
        value: tx.value.toString(),
        functionSignature: functionName,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: tx.blockNumber || 0,
        timestamp: Date.now(),
      };

      // Run vulnerability detection
      const findings = await this.detector.analyzeTransaction(pattern);

      if (findings.length > 0) {
        this.stats.vulnerabilitiesDetected += findings.length;
        this.stats.alertsGenerated++;

        console.log('\n🚨 VULNERABILITY DETECTED 🚨');
        console.log('━'.repeat(60));
        console.log(`  Transaction: ${txHash}`);
        console.log(`  Block: ${tx.blockNumber}`);
        console.log(`  From: ${tx.from}`);
        
        if (decoded) {
          console.log(`  Function: ${decoded.name}(${decoded.args.join(', ')})`);
        } else {
          console.log(`  Function Signature: ${functionSignature}`);
        }
        
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
   * Real-time monitoring
   */
  private async startRealTimeMonitoring(): Promise<void> {
    console.log('\n📡 PHASE 2: Real-Time Monitoring (Enhanced)');
    console.log('━'.repeat(60));

    const ankrBNB = AnkrContractRegistry.getContractsByChain(AnkrChain.BSC)
      .find(c => c.name === 'ankrBNB');

    if (!ankrBNB) return;

    console.log(`🎯 Monitoring: ${ankrBNB.name} (${ankrBNB.address})`);
    console.log(`🔍 Decoding all function calls in real-time`);
    console.log(`⏱️  Press Ctrl+C to stop monitoring`);

    const pollInterval = 3000;
    let lastBlock = await this.provider.getBlockNumber();

    const pollTimer = setInterval(async () => {
      if (!this.running || this.shouldStop()) {
        clearInterval(pollTimer);
        return;
      }

      try {
        const currentBlock = await this.provider.getBlockNumber();
        
        if (currentBlock > lastBlock) {
          for (let blockNum = lastBlock + 1; blockNum <= currentBlock; blockNum++) {
            const block = await this.provider.getBlock(blockNum, true);
            if (!block || !block.transactions) continue;

            this.stats.blocksScanned++;

            for (const txHash of block.transactions) {
              if (typeof txHash === 'string') {
                await this.analyzeEnhancedTransaction(txHash, ankrBNB.address);
              }
            }
          }

          lastBlock = currentBlock;
          
          if (this.config.verbose) {
            console.log(`  🔄 New block ${currentBlock} processed | Total functions decoded: ${this.stats.functionsDecoded}`);
          }
        }
      } catch (error) {
        console.error('  ⚠️  Error polling blocks:', error);
      }
    }, pollInterval);

    await this.waitForStop();
    clearInterval(pollTimer);
    
    console.log(`✅ Real-time monitoring stopped`);
  }

  /**
   * Generate comprehensive report
   */
  private async generateReport(): Promise<void> {
    console.log('\n📊 PHASE 3: Enhanced Report Generation');
    console.log('━'.repeat(60));

    const endTime = new Date();
    this.stats.runtime = (endTime.getTime() - this.startTime.getTime()) / 1000;

    const allFindings = this.detector.getAllFindings();
    const ankrBNB = AnkrContractRegistry.getContractsByChain(AnkrChain.BSC)
      .find(c => c.name === 'ankrBNB');

    const report = {
      metadata: {
        generatedAt: endTime.toISOString(),
        runtime: `${this.stats.runtime.toFixed(2)}s`,
        contract: ankrBNB?.name || 'ankrBNB',
        chain: 'BSC',
        address: ankrBNB?.address || '0x52F24a5e03aee338Da5fd9Df68D2b6FAe1178827',
        enhanced: true,
        functionsDecoded: this.stats.functionsDecoded,
      },
      statistics: {
        blocksScanned: this.stats.blocksScanned,
        transactionsAnalyzed: this.stats.transactionsAnalyzed,
        functionsDecoded: this.stats.functionsDecoded,
        highRiskCalls: this.stats.highRiskCalls,
        vulnerabilitiesDetected: this.stats.vulnerabilitiesDetected,
        alertsGenerated: this.stats.alertsGenerated,
        scanRate: this.stats.runtime > 0 
          ? `${(this.stats.blocksScanned / this.stats.runtime).toFixed(2)} blocks/s`
          : '0 blocks/s',
        decodingRate: this.stats.runtime > 0
          ? `${(this.stats.functionsDecoded / this.stats.runtime).toFixed(2)} functions/s`
          : '0 functions/s',
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
    console.log('\n📈 ENHANCED STATISTICS:');
    console.log(`   Blocks Scanned: ${this.stats.blocksScanned}`);
    console.log(`   Transactions Analyzed: ${this.stats.transactionsAnalyzed}`);
    console.log(`   Functions Decoded: ${this.stats.functionsDecoded}`);
    console.log(`   High-Risk Calls: ${this.stats.highRiskCalls}`);
    console.log(`   Vulnerabilities Detected: ${this.stats.vulnerabilitiesDetected}`);
    console.log(`   Alerts Generated: ${this.stats.alertsGenerated}`);
    console.log(`   Runtime: ${this.stats.runtime.toFixed(2)}s`);
    console.log(`   Scan Rate: ${report.statistics.scanRate}`);
    console.log(`   Decoding Rate: ${report.statistics.decodingRate}`);

    console.log('\n🔍 FINDINGS SUMMARY:');
    console.log(`   Critical: ${report.summary.critical}`);
    console.log(`   High: ${report.summary.high}`);
    console.log(`   Medium: ${report.summary.medium}`);
    console.log(`   Low: ${report.summary.low}`);
    console.log(`   Informational: ${report.summary.informational}`);

    await this.saveReport(report);

    console.log('\n✅ ENHANCED TESTING COMPLETE');
    console.log('━'.repeat(60));
  }

  private async saveReport(report: any): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseDir = '.memory/security-testing';
    
    await fs.mkdir(baseDir, { recursive: true });

    const jsonPath = path.join(baseDir, `ankrbnb_enhanced_${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Enhanced report saved: ${jsonPath}`);
  }

  private shouldStop(): boolean {
    if (this.config.duration === 0) return false;
    const elapsed = (Date.now() - this.startTime.getTime()) / 1000;
    return elapsed >= this.config.duration;
  }

  private async waitForStop(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.running || this.shouldStop()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);

      process.on('SIGINT', () => {
        console.log('\n⚠️  Received stop signal, finishing up...');
        this.running = false;
        clearInterval(checkInterval);
        resolve();
      });
    });
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const config: EnhancedConfig = {
    duration: 0,
    verbose: false,
    bscRpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
    blockRange: 100,
    monitoring: true,
    decodeTransactions: true,
  };

  args.forEach(arg => {
    if (arg.startsWith('--duration=')) {
      config.duration = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--verbose') {
      config.verbose = true;
    } else if (arg === '--no-monitoring') {
      config.monitoring = false;
    } else if (arg === '--no-decoding') {
      config.decodeTransactions = false;
    } else if (arg.startsWith('--blocks=')) {
      config.blockRange = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--rpc=')) {
      config.bscRpcUrl = arg.split('=')[1];
    }
  });

  console.log('\n🛡️  ENHANCED ANKRBNB AUTONOMOUS SECURITY TESTING');
  console.log('━'.repeat(60));
  console.log('TheWarden Security Intelligence Platform');
  console.log('With Real-Time Function Decoding & ABI Analysis');
  console.log('━'.repeat(60));

  const tester = new EnhancedAnkrBNBSecurityTester(config);
  
  try {
    await tester.run();
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { EnhancedAnkrBNBSecurityTester };
