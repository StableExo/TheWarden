/**
 * Test "track" mnemonic with exhaustive derivation paths
 * Based on Grok's findings that Log2*Multiply(80.18) produces "track"
 * 
 * Even though BIP39 validation says it's invalid, Grok claims it's valid
 * So we'll test derivation anyway and try many paths
 */

import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';

const bip32 = BIP32Factory(ecc);

const MNEMONIC = 'focus economy expand destroy craft chimney bulk beef anxiety abandon goddess hotel joke liquid middle north park price refuse salmon silent sponsor symbol track';
const TARGET_ADDRESS = 'bc1qkf6trv39epu4n0wfzw4mk58zf5hrvwwd442aksk';

console.log('🔍 Testing "track" Mnemonic with Exhaustive Paths');
console.log('='.repeat(70));
console.log('');
console.log('Mnemonic:', MNEMONIC);
console.log('');
console.log('BIP39 Valid:', bip39.validateMnemonic(MNEMONIC));
console.log('Target:', TARGET_ADDRESS);
console.log('');
console.log('🔒 Note: Testing derivation even if BIP39 shows invalid');
console.log('         Grok says this should be valid');
console.log('');

// Try to generate seed anyway (bypass validation)
let seed;
try {
  seed = bip39.mnemonicToSeedSync(MNEMONIC);
  console.log('✅ Seed generated successfully');
} catch (e) {
  console.log('❌ Cannot generate seed:', e.message);
  process.exit(1);
}

const network = bitcoin.networks.bitcoin;
const root = bip32.fromSeed(seed, network);

console.log('');
console.log('🔑 Testing Derivation Paths...');
console.log('='.repeat(70));
console.log('');

let found = false;
let tested = 0;

// Test standard paths first
const standardPaths = [
  "m/84'/0'/0'/0/0",
  "m/84'/0'/0'/0/1", 
  "m/84'/0'/0'/0/2",
  "m/84'/0'/0'/1/0",
  "m/49'/0'/0'/0/0",
  "m/44'/0'/0'/0/0",
  // Grok's suggestions
  "m/84'/0'/0'/0/1844",  // track index
  "m/84'/0'/130'/0/0",   // magic constant
  "m/84'/0'/0'/0/130",
  "m/84'/0'/0'/0/23",    // 2^23
];

console.log('Standard & suggested paths:');
for (const path of standardPaths) {
  try {
    const child = root.derivePath(path);
    if (child.publicKey) {
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network
      });
      
      tested++;
      const match = address === TARGET_ADDRESS;
      
      if (match || tested <= 10) {
        console.log(`${match ? '🎉' : '  '} ${path}: ${address}`);
      }
      
      if (match) {
        found = true;
        console.log('');
        console.log('='.repeat(70));
        console.log('🎉🎉🎉 PUZZLE SOLVED! 🎉🎉🎉');
        console.log('='.repeat(70));
        console.log('');
        console.log('✅ Mnemonic with "track" works!');
        console.log(`✅ Path: ${path}`);
        console.log('💰 Reward: 0.08252025 BTC');
        console.log('');
        console.log('🔒 SOLUTION (terminal only):');
        console.log('   ' + MNEMONIC);
        console.log('');
        process.exit(0);
      }
    }
  } catch (e) {
    // Skip invalid paths
  }
}

if (!found) {
  console.log('');
  console.log('Testing extended paths (0-1000)...');
  
  // Test many indices
  for (let i = 0; i < 1000; i++) {
    const path = `m/84'/0'/0'/0/${i}`;
    try {
      const child = root.derivePath(path);
      if (child.publicKey) {
        const { address } = bitcoin.payments.p2wpkh({
          pubkey: child.publicKey,
          network
        });
        
        tested++;
        if (address === TARGET_ADDRESS) {
          console.log(`🎉 FOUND at index ${i}!`);
          console.log(`   Path: ${path}`);
          console.log(`   Address: ${address}`);
          found = true;
          break;
        }
        
        if (i % 100 === 0) {
          console.log(`  Tested ${i} paths...`);
        }
      }
    } catch (e) {}
  }
}

if (!found) {
  console.log('');
  console.log('Testing account variations...');
  
  // Test different accounts
  for (let account = 0; account < 10; account++) {
    for (let index = 0; index < 10; index++) {
      const path = `m/84'/0'/${account}'/0/${index}`;
      try {
        const child = root.derivePath(path);
        if (child.publicKey) {
          const { address } = bitcoin.payments.p2wpkh({
            pubkey: child.publicKey,
            network
          });
          
          tested++;
          if (address === TARGET_ADDRESS) {
            console.log(`🎉 FOUND!`);
            console.log(`   Path: ${path}`);
            console.log(`   Address: ${address}`);
            found = true;
            break;
          }
        }
      } catch (e) {}
    }
    if (found) break;
  }
}

console.log('');
console.log('='.repeat(70));
console.log(`Total paths tested: ${tested}`);

if (found) {
  console.log('✅ Solution found!');
  console.log('');
  console.log('🔒 CRITICAL: Mnemonic shown above - write it down!');
  console.log('   Clear terminal after viewing.');
} else {
  console.log('❌ No match found');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Test with passphrase (BIP39 supports it)');
  console.log('  2. Try pi-shift transformation as Grok suggested');
  console.log('  3. Test other address types (P2SH, etc.)');
}
console.log('='.repeat(70));
