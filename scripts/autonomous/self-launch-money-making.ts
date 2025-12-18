#!/usr/bin/env node
/**
 * CLI script for TheWarden to launch the money-making system autonomously
 * 
 * Usage:
 *   node --import tsx scripts/autonomous/self-launch-money-making.ts
 *   npm run warden:self-launch
 */

import { SelfLauncher } from '../../src/autonomous/SelfLauncher';

const launcher = new SelfLauncher();

async function main() {
  console.log('🤖 TheWarden Self-Launch System');
  console.log('================================\n');
  
  try {
    await launcher.launch({
      autonomous: true,
      logOutput: true,
      autoRestart: true,
      maxRestarts: 5,
      onLaunchSuccess: () => {
        console.log('✅ Money-making system is now running autonomously!');
        console.log('💰 TheWarden is actively seeking profit opportunities...\n');
      },
      onLaunchFailure: (error) => {
        console.error('❌ Failed to launch:', error.message);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Stopping autonomous money-making...');
  launcher.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Stopping autonomous money-making...');
  launcher.stop();
  process.exit(0);
});

// Run the launcher
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
