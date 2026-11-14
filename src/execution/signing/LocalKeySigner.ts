/**
 * LocalKeySigner - SIGNER_MODE=local (the default).
 *
 * Behaviour is exactly what main.ts and FlashSwapV3Executor did before the
 * abstraction was introduced: an ethers Wallet and a viem account derived from
 * one EOA key, so both execution paths keep working unchanged.
 *
 * What changed is where the key comes from. Preference order:
 *   1. an explicit key passed in (tests, tooling)
 *   2. the AES-encrypted Supabase secret, when USE_SUPABASE=true
 *   3. process.env, for local development
 *
 * Step 2 is what lets Railway hold no private key at all.
 */
import { Wallet, type AbstractSigner, type JsonRpcProvider } from 'ethers';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex, LocalAccount } from 'viem';

import { loadEnvVar } from '../../utils/supabaseEnvLoader';
import { logger } from '../../utils/logger';

import type { SignerMode, SignerProvider } from './SignerProvider';

/** Names accepted, in priority order. WALLET_PRIVATE_KEY is the current one. */
const KEY_NAMES = ['WALLET_PRIVATE_KEY', 'DEPLOYER_PRIVATE_KEY'] as const;

export class LocalKeySigner implements SignerProvider {
  readonly mode: SignerMode = 'local';

  private address!: string;
  private viemOwner!: LocalAccount;
  private wallet!: Wallet;

  private constructor(private readonly provider: JsonRpcProvider) {}

  /**
   * Synchronous construction from a known key. Used only as the legacy fallback
   * for callers that still pass WardenConfig.walletPrivateKey.
   */
  static fromKey(key: string, provider: JsonRpcProvider): LocalKeySigner {
    const signer = new LocalKeySigner(provider);
    signer.apply(key, 'argument');
    return signer;
  }

  static async create(provider: JsonRpcProvider, key?: string): Promise<LocalKeySigner> {
    const signer = new LocalKeySigner(provider);
    const resolved = key ?? (await LocalKeySigner.resolveKey());
    if (!resolved) {
      throw new Error(
        'No signing key found. Set it as a Supabase secret (USE_SUPABASE=true, ' +
          `key ${KEY_NAMES.join(' or ')} with SECRETS_ENCRYPTION_KEY present), or as an ` +
          'environment variable for local development.'
      );
    }
    signer.apply(resolved.value, resolved.source);
    return signer;
  }

  private static async resolveKey(): Promise<{ value: string; source: string } | null> {
    for (const name of KEY_NAMES) {
      // Supabase secret first (falls back to process.env when USE_SUPABASE is off).
      const fromStore = await loadEnvVar(name, { isSecret: true });
      if (fromStore) {
        const source = process.env.USE_SUPABASE === 'true' ? `supabase secret ${name}` : `.env ${name}`;
        return { value: fromStore, source };
      }
      // USE_SUPABASE=true with no secret row: still honour a plain env var.
      const fromEnv = process.env[name];
      if (fromEnv) return { value: fromEnv, source: `environment ${name}` };
    }
    return null;
  }

  private apply(rawKey: string, source: string): void {
    const trimmed = rawKey.trim();
    const normalized = (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as Hex;

    this.wallet = new Wallet(normalized, this.provider);
    this.viemOwner = privateKeyToAccount(normalized);
    this.address = this.wallet.address;

    logger.info(`[SignerProvider] local mode: ${this.address} (key from ${source})`);
  }

  async init(): Promise<void> {
    // Nothing remote to resolve; the address is already known.
    return;
  }

  getAddress(): string {
    return this.address;
  }

  getEthersSigner(): AbstractSigner {
    return this.wallet;
  }

  async getViemOwner(): Promise<LocalAccount> {
    return this.viemOwner;
  }
}
