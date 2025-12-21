import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validateSecretsEncryptionKey,
  formatValidationResult,
  requireValidEncryptionKey,
} from '../../../src/utils/validateEncryptionKey.js';

describe('validateEncryptionKey', () => {
  const originalEnv = process.env.SECRETS_ENCRYPTION_KEY;
  
  beforeEach(() => {
    delete process.env.SECRETS_ENCRYPTION_KEY;
  });
  
  afterEach(() => {
    if (originalEnv) {
      process.env.SECRETS_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.SECRETS_ENCRYPTION_KEY;
    }
  });

  describe('validateSecretsEncryptionKey', () => {
    it('should fail when key is not set', () => {
      const result = validateSecretsEncryptionKey();
      
      expect(result.isValid).toBe(false);
      expect(result.exists).toBe(false);
      expect(result.errors).toContain('SECRETS_ENCRYPTION_KEY is not set in environment');
    });

    it('should fail when key is empty string', () => {
      const result = validateSecretsEncryptionKey('');
      
      expect(result.isValid).toBe(false);
      expect(result.exists).toBe(false);
    });

    it('should fail when key is too short', () => {
      const result = validateSecretsEncryptionKey('a'.repeat(32));
      
      expect(result.isValid).toBe(false);
      expect(result.exists).toBe(true);
      expect(result.hasCorrectLength).toBe(false);
      expect(result.errors.some(e => e.includes('must be exactly 64 hex characters'))).toBe(true);
    });

    it('should fail when key is too long', () => {
      const result = validateSecretsEncryptionKey('a'.repeat(128));
      
      expect(result.isValid).toBe(false);
      expect(result.hasCorrectLength).toBe(false);
    });

    it('should fail when key contains non-hex characters', () => {
      const result = validateSecretsEncryptionKey('z'.repeat(64));
      
      expect(result.isValid).toBe(false);
      expect(result.isHexString).toBe(false);
      expect(result.errors.some(e => e.includes('must contain only hexadecimal characters'))).toBe(true);
    });

    it('should pass with valid 64-character hex key', () => {
      const validKey = 'a'.repeat(64);
      const result = validateSecretsEncryptionKey(validKey);
      
      expect(result.isValid).toBe(true);
      expect(result.exists).toBe(true);
      expect(result.hasCorrectLength).toBe(true);
      expect(result.isHexString).toBe(true);
      expect(result.canEncryptDecrypt).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass with valid mixed-case hex key', () => {
      const validKey = 'aAbBcCdDeEfF0123456789'.repeat(3).substring(0, 64);
      const result = validateSecretsEncryptionKey(validKey);
      
      expect(result.isValid).toBe(true);
      expect(result.isHexString).toBe(true);
    });

    it('should test encryption/decryption with valid key', () => {
      const validKey = 'aa42e55372a0730f908fb690faf55d78fb6d48c47bba786868c250c377b2a117';
      const result = validateSecretsEncryptionKey(validKey);
      
      expect(result.isValid).toBe(true);
      expect(result.canEncryptDecrypt).toBe(true);
    });

    it('should read key from environment if not provided', () => {
      const validKey = 'b'.repeat(64);
      process.env.SECRETS_ENCRYPTION_KEY = validKey;
      
      const result = validateSecretsEncryptionKey();
      
      expect(result.isValid).toBe(true);
      expect(result.exists).toBe(true);
    });

    it('should prefer provided key over environment', () => {
      process.env.SECRETS_ENCRYPTION_KEY = 'invalid';
      const validKey = 'c'.repeat(64);
      
      const result = validateSecretsEncryptionKey(validKey);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('formatValidationResult', () => {
    it('should format valid result', () => {
      const validKey = 'd'.repeat(64);
      const result = validateSecretsEncryptionKey(validKey);
      const formatted = formatValidationResult(result);
      
      expect(formatted).toContain('✅ VALID');
      expect(formatted).toContain('Key exists');
      expect(formatted).toContain('Correct length');
    });

    it('should format invalid result with errors', () => {
      const result = validateSecretsEncryptionKey('invalid');
      const formatted = formatValidationResult(result);
      
      expect(formatted).toContain('❌ INVALID');
      expect(formatted).toContain('❌ Errors:');
    });

    it('should include warnings when present', () => {
      const result = validateSecretsEncryptionKey('short');
      const formatted = formatValidationResult(result);
      
      expect(formatted).toContain('⚠️  Warnings:');
      expect(formatted).toContain('Generate a valid key');
    });
  });

  describe('requireValidEncryptionKey', () => {
    it('should throw error for invalid key', () => {
      expect(() => requireValidEncryptionKey('invalid')).toThrow('Invalid SECRETS_ENCRYPTION_KEY');
    });

    it('should not throw for valid key', () => {
      const validKey = 'e'.repeat(64);
      expect(() => requireValidEncryptionKey(validKey)).not.toThrow();
    });

    it('should throw with helpful message', () => {
      try {
        requireValidEncryptionKey('');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('To generate a valid key');
        expect((error as Error).message).toContain('crypto');
      }
    });
  });
});
