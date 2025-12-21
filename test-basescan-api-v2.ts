#!/usr/bin/env node
/**
 * Test script to verify BaseScan API v2 migration
 * 
 * This script tests that the new unified Etherscan API v2 endpoint works correctly
 * for Base network (chainid=8453)
 */

// Use the API key from memory
const BASESCAN_API_KEY = 'QT7KI56B365U22NXMJJM4IU7Q8MVER69RY';
// Test with a known verified contract on Base - Uniswap V3 Router
const TEST_CONTRACT = '0x2626664c2603336E57B271c5C0b26F421741e481';

async function testOldEndpoint() {
  console.log('\n🔍 Testing OLD endpoint (deprecated)...');
  console.log('URL: https://api.basescan.org/api');
  
  try {
    const response = await fetch(
      `https://api.basescan.org/api?module=contract&action=getabi&address=${TEST_CONTRACT}&apikey=${BASESCAN_API_KEY}`
    );
    const data = await response.json();
    console.log('Status:', data.status);
    console.log('Message:', data.message);
    console.log('Result:', data.result);
    console.log('Result length:', typeof data.result === 'string' ? data.result.length : 'N/A');
    return data.status === '1';
  } catch (err) {
    console.error('❌ Error:', err);
    return false;
  }
}

async function testNewEndpoint() {
  console.log('\n🔍 Testing NEW endpoint (v2 with chainid)...');
  console.log('URL: https://api.etherscan.io/v2/api?chainid=8453');
  
  try {
    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=8453&module=contract&action=getabi&address=${TEST_CONTRACT}&apikey=${BASESCAN_API_KEY}`
    );
    const data = await response.json();
    console.log('Status:', data.status);
    console.log('Message:', data.message);
    console.log('Result:', data.result);
    console.log('Result length:', typeof data.result === 'string' ? data.result.length : 'N/A');
    return data.status === '1';
  } catch (err) {
    console.error('❌ Error:', err);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  BaseScan API v2 Migration Test');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\nTest Contract: ${TEST_CONTRACT} (Uniswap V3 Router on Base - known verified contract)`);
  console.log(`Chain: Base (chainid=8453)`);
  
  const oldWorks = await testOldEndpoint();
  const newWorks = await testNewEndpoint();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Results');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Old endpoint (api.basescan.org): ${oldWorks ? '✅ WORKS' : '❌ FAILED'}`);
  console.log(`New endpoint (api.etherscan.io/v2): ${newWorks ? '✅ WORKS' : '❌ FAILED'}`);
  
  if (newWorks) {
    console.log('\n✅ SUCCESS: API v2 migration successful!');
    console.log('The new unified Etherscan endpoint is working correctly.');
  } else {
    console.log('\n❌ FAILED: API v2 endpoint not working as expected.');
    console.log('May need to check API key or endpoint configuration.');
  }
  
  console.log('\n');
}

main().catch(console.error);
