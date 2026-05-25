# Environment Configuration Access Guide

## Overview

TheWarden's environment configuration is stored in **Supabase** and accessible across all sessions. This ensures that AI agents and TheWarden can access credentials and configuration without relying on local `.env` files.

## Quick Start

### Sync Your .env to Supabase

```bash
npm run env:sync
```

This will:
- Upload all environment variables to Supabase
- Automatically categorize each variable
- Encrypt sensitive values (API keys, secrets, passwords)
- Store non-sensitive configs as plain text

### Restore .env from Supabase

```bash
npm run env:restore
```

This will:
- Download all environment variables from Supabase
- Decrypt secrets using your encryption key
- Generate a complete `.env` file
- Backup your existing `.env` first

### List All Stored Configuration

```bash
npm run env:list
```

Shows all stored configs and secrets (encrypted values shown as `[ENCRYPTED]`).

### Create Backup

```bash
npm run env:backup
```

Creates a timestamped backup in `.memory/environment/backups/` and syncs to Supabase.

## How It Works

### Automatic Categorization

Variables are automatically categorized:

- **🔐 Secrets** (encrypted): API keys, passwords, private keys, tokens, auth credentials
- **🗄️ Database**: Database URLs, connection strings, Redis, PostgreSQL
- **🌐 Blockchain**: RPC URLs, wallet addresses, contract addresses
- **⚙️ Service**: Service URLs, ports, hosts
- **🎯 Feature Flags**: ENABLE_*, DISABLE_*, USE_*
- **📝 API**: API endpoints and configurations

### Encryption

Sensitive values are encrypted using `SECRETS_ENCRYPTION_KEY`:

```
SECRETS_ENCRYPTION_KEY=aa42e55372a0730f908fb690faf55d78fb6d48c47bba786868c250c377b2a117
```

## Access from Code

### TypeScript/JavaScript

```typescript
import { SupabaseEnvStorage } from './src/services/SupabaseEnvStorage';

const storage = new SupabaseEnvStorage();

// Get non-sensitive config
const apiUrl = await storage.getConfig('API_URL');

// Get encrypted secret (will be decrypted automatically)
const apiKey = await storage.getSecret('API_KEY');

// Get all configs
const allConfigs = await storage.getAllConfigs();

// Get all secrets (values will be encrypted)
const allSecrets = await storage.getAllSecrets();
```

### AI Agents / Autonomous Scripts

AI agents can access configuration through the SupabaseEnvStorage service:

```typescript
// In any autonomous script
import { SupabaseEnvStorage } from '../../src/services/SupabaseEnvStorage';

async function getConfig() {
  const storage = new SupabaseEnvStorage({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_KEY,
    encryptionKey: process.env.SECRETS_ENCRYPTION_KEY,
  });
  
  // Access any configuration
  const rpcUrl = await storage.getConfig('BASE_RPC_URL');
  const apiKey = await storage.getSecret('ALCHEMY_API_KEY');
  
  return { rpcUrl, apiKey };
}
```

## Storage Structure

### Supabase Tables

**`environment_configs`** - Non-sensitive configurations:
- `config_name`: Variable name
- `config_value`: Plain text value
- `category`: Auto-assigned category
- `value_type`: string, number, boolean, json, url
- `description`: When it was synced
- Timestamps: created_at, updated_at

**`environment_secrets`** - Encrypted sensitive values:
- `secret_name`: Variable name
- `encrypted_value`: AES-256 encrypted value
- `encryption_key_id`: Key identifier  
- `category`: api_key, private_key, password, token, credential
- `description`: When it was synced
- Timestamps: created_at, updated_at, last_accessed_at
- `access_count`: How many times accessed

## Security

### Encryption

All secrets are encrypted using AES-256-CBC with:
- Algorithm: `aes-256-cbc`
- IV: 16 random bytes
- Key: `SECRETS_ENCRYPTION_KEY` (32-byte hex string)

### Access Control

- Use `SUPABASE_SERVICE_KEY` for full access (read/write secrets)
- Use `SUPABASE_ANON_KEY` for limited access (public configs only)
- Never commit `.env` file to git (already in `.gitignore`)

### Best Practices

1. **Keep encryption key secure**: Store `SECRETS_ENCRYPTION_KEY` separately
2. **Rotate keys periodically**: Update secrets with new encryption key
3. **Monitor access**: Check `last_accessed_at` and `access_count` for anomalies
4. **Backup regularly**: Use `npm run env:backup` before major changes
5. **Use service key wisely**: Only use in trusted environments

## For AI Agents

### Session Start

At the beginning of each session, AI agents can restore configuration:

```bash
# First thing in new session
npm run env:restore
```

This ensures all environment variables are available.

### Accessing Credentials

```typescript
// Example: Get blockchain RPC URLs
const storage = new SupabaseEnvStorage();
const baseRPC = await storage.getConfig('BASE_RPC_URL');
const ethRPC = await storage.getConfig('ETHEREUM_RPC_URL');

// Example: Get API keys
const alchemyKey = await storage.getSecret('ALCHEMY_API_KEY');
const xaiKey = await storage.getSecret('XAI_PROD_API_KEY');
```

### Adding New Configuration

```typescript
// Add new non-sensitive config
await storage.setConfig('NEW_FEATURE_ENABLED', 'true', {
  category: 'feature_flag',
  value_type: 'boolean',
});

// Add new secret
await storage.setSecret('NEW_API_KEY', 'secret-value', undefined, {
  category: 'api_key',
  description: 'New service API key',
});
```

## GitHub Integration (Alternative)

Configuration can also be stored in GitHub Secrets for CI/CD:

1. Go to repository Settings → Secrets and variables → Actions
2. Add secrets there
3. They'll be available in GitHub Actions as `${{ secrets.SECRET_NAME }}`

## Troubleshooting

### "Encryption key is required" Error

Make sure `SECRETS_ENCRYPTION_KEY` is set:

```bash
export SECRETS_ENCRYPTION_KEY=aa42e55372a0730f908fb690faf55d78fb6d48c47bba786868c250c377b2a117
```

### "Supabase URL and Key are required" Error

Ensure Supabase credentials are available:

```bash
export SUPABASE_URL=https://ydvevgqxcfizualicbom.supabase.co
export SUPABASE_SERVICE_KEY=eyJhbGci...
```

### Cannot Decrypt Secret

Verify you're using the same encryption key that was used to encrypt:

```typescript
await storage.getSecret('API_KEY'); // Will throw if wrong key
```

## Files

- **Script**: `scripts/env-management/sync-env-to-supabase.ts`
- **Service**: `src/services/SupabaseEnvStorage.ts`
- **Backups**: `.memory/environment/backups/`
- **Production config**: `.memory/environment/production-config.md` (documentation)

## Examples

### Complete Workflow

```bash
# 1. Create/update .env file with new credentials
echo "NEW_API_KEY=secret123" >> .env

# 2. Sync to Supabase
npm run env:sync

# 3. In another session or environment, restore
npm run env:restore

# 4. Verify it worked
npm run env:list
```

### Automated Backup

```bash
# Create backup before major changes
npm run env:backup

# This creates:
# - .memory/environment/backups/env_backup_2025-12-17T02-00-00-000Z.env
# - Syncs to Supabase for cloud backup
```

## Summary

✅ **Centralized**: All configuration in Supabase, accessible anywhere
✅ **Secure**: Automatic encryption for sensitive values
✅ **Organized**: Auto-categorization for easy management
✅ **Accessible**: Available to AI agents across sessions
✅ **Backed up**: Automatic cloud backup to Supabase
✅ **Auditable**: Track access counts and last access times

Now TheWarden and AI agents can access configuration reliably without depending on local `.env` files!
