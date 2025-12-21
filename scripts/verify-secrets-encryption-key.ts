#!/usr/bin/env node
/**
 * Verify SECRETS_ENCRYPTION_KEY from Repository Environment
 * 
 * This script checks if the SECRETS_ENCRYPTION_KEY in the repository environment:
 * - Exists and is accessible
 * - Has the correct format (64 hex characters)
 * - Can successfully encrypt and decrypt data
 * 
 * The key should be available in the repository environment via GitHub Secrets
 * or other environment configuration.
 */

import { 
  validateSecretsEncryptionKey, 
  formatValidationResult,
  type EncryptionKeyValidationResult 
} from '../src/utils/validateEncryptionKey.js';

async function verifySecretsEncryptionKey(): Promise<void> {
  console.log('🔐 Verifying SECRETS_ENCRYPTION_KEY from Repository Environment\n');
  console.log('='.repeat(80));
  console.log('');

  // Check if key is in environment
  const keyExists = !!process.env.SECRETS_ENCRYPTION_KEY;
  const keyValue = process.env.SECRETS_ENCRYPTION_KEY;

  if (!keyExists) {
    console.log('❌ SECRETS_ENCRYPTION_KEY is NOT set in environment');
    console.log('');
    console.log('The key should be available in your repository environment via:');
    console.log('  • GitHub Secrets (for GitHub Actions)');
    console.log('  • Environment variables (for local development)');
    console.log('  • .env file (for local development)');
    console.log('');
    console.log('To set up the key:');
    console.log('  1. Generate a key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.log('  2. Add it to GitHub Secrets: Settings → Secrets → Actions → New repository secret');
    console.log('  3. Or add it to your .env file: SECRETS_ENCRYPTION_KEY=<generated-key>');
    console.log('');
    process.exit(1);
  }

  console.log('✅ SECRETS_ENCRYPTION_KEY is set in environment');
  console.log(`   First 10 characters: ${keyValue?.substring(0, 10)}...`);
  console.log(`   Length: ${keyValue?.length} characters`);
  console.log('');

  // Validate the key
  console.log('Running validation checks...\n');
  const result: EncryptionKeyValidationResult = validateSecretsEncryptionKey(keyValue);

  // Display results
  console.log(formatValidationResult(result));
  console.log('');

  if (result.isValid) {
    console.log('✅ SUCCESS! SECRETS_ENCRYPTION_KEY is valid and working correctly.');
    console.log('');
    console.log('The key can:');
    console.log('  ✓ Encrypt sensitive data');
    console.log('  ✓ Decrypt encrypted secrets');
    console.log('  ✓ Be used with Supabase environment storage');
    console.log('');
    process.exit(0);
  } else {
    console.log('❌ FAILURE! SECRETS_ENCRYPTION_KEY is invalid or not working correctly.');
    console.log('');
    console.log('Action Required:');
    
    if (!result.hasCorrectLength) {
      console.log('  1. Generate a new 64-character hex key:');
      console.log('     node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    
    if (!result.isHexString) {
      console.log('  2. Ensure the key contains only hexadecimal characters (0-9, a-f)');
    }
    
    if (!result.canEncryptDecrypt) {
      console.log('  3. The key format appears incorrect - regenerate it');
    }
    
    console.log('');
    console.log('Then update your repository environment:');
    console.log('  • GitHub Actions: Update the secret in repository settings');
    console.log('  • Local: Update SECRETS_ENCRYPTION_KEY in your .env file');
    console.log('');
    process.exit(1);
  }
}

// Run the verification
verifySecretsEncryptionKey().catch((error) => {
  console.error('');
  console.error('❌ Error during verification:');
  console.error(`   ${error instanceof Error ? error.message : String(error)}`);
  console.error('');
  process.exit(1);
});
