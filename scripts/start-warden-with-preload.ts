#!/usr/bin/env node
/**
 * TheWarden Startup Script with Auto Pool Preload
 * 
 * This script automatically preloads pool data before starting TheWarden,
 * ensuring fast startup times and immediate opportunity detection.
 * 
 * Usage:
 *   node --import tsx scripts/start-warden-with-preload.ts
 *   npm run start:warden:preload
 */

import 'dotenv/config';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'pools');
const CACHE_MAX_AGE_MS = 3600000; // 1 hour

console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 TheWarden Startup with Auto Pool Preload');
console.log('═══════════════════════════════════════════════════════════\n');

/**
 * Check if pool cache exists and is fresh
 */
function isCacheFresh(chainId: number): boolean {
  const cacheFile = path.join(CACHE_DIR, `pools-${chainId}.json`);
  
  if (!fs.existsSync(cacheFile)) {
    console.log(`📦 No cache found for chain ${chainId}`);
    return false;
  }
  
  const stats = fs.statSync(cacheFile);
  const age = Date.now() - stats.mtimeMs;
  const ageMinutes = Math.floor(age / 60000);
  
  if (age > CACHE_MAX_AGE_MS) {
    console.log(`⏰ Cache for chain ${chainId} is ${ageMinutes} minutes old (stale)`);
    return false;
  }
  
  console.log(`✅ Fresh cache found for chain ${chainId} (${ageMinutes} minutes old)`);
  return true;
}

/**
 * Preload pools for a specific chain
 */
function preloadPools(chainId: number, force: boolean = false): void {
  console.log(`\n📡 Preloading pools for chain ${chainId}...`);
  console.log('   This may take 60-90 seconds...\n');
  
  const args = ['--import', 'tsx', 'scripts/utilities/preload-pools.ts', '--chain', chainId.toString()];
  if (force) {
    args.push('--force');
  }
  
  try {
    execSync(`node ${args.join(' ')}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(`\n✅ Pool preload complete for chain ${chainId}\n`);
  } catch (error) {
    console.error(`\n❌ Pool preload failed for chain ${chainId}:`);
    console.error(error);
    console.log('\n⚠️  Continuing anyway - TheWarden will fetch pools on-demand\n');
  }
}

/**
 * Get chain IDs to preload
 */
function getChainsToPreload(): number[] {
  const primaryChainId = parseInt(process.env.CHAIN_ID || '8453');
  
  if (process.env.SCAN_CHAINS) {
    return process.env.SCAN_CHAINS.split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id) && id > 0);
  }
  
  return [primaryChainId];
}

/**
 * Main execution
 */
async function main() {
  const forcePreload = process.argv.includes('--force');
  const skipPreload = process.argv.includes('--skip-preload');
  
  if (skipPreload) {
    console.log('⏭️  Skipping pool preload (--skip-preload flag)\n');
  } else {
    const chains = getChainsToPreload();
    console.log(`📋 Chains configured: ${chains.join(', ')}\n`);
    
    // Check cache freshness and preload if needed
    for (const chainId of chains) {
      const needsPreload = forcePreload || !isCacheFresh(chainId);
      
      if (needsPreload) {
        preloadPools(chainId, forcePreload);
      }
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Pool preload complete - cache is fresh!');
    console.log('═══════════════════════════════════════════════════════════\n');
  }
  
  // Start TheWarden
  console.log('🎯 Starting TheWarden...\n');
  
  const wardenProcess = spawn('node', ['--import', 'tsx', 'src/main.ts'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, USE_PRELOADED_POOLS: 'true' }
  });
  
  // Handle process signals
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Received SIGINT, shutting down TheWarden...');
    wardenProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n\n⚠️  Received SIGTERM, shutting down TheWarden...');
    wardenProcess.kill('SIGTERM');
  });
  
  wardenProcess.on('exit', (code) => {
    console.log(`\n🛑 TheWarden exited with code ${code}`);
    process.exit(code || 0);
  });
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
