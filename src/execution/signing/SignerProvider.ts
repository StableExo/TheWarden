/**
 * SignerProvider - the single seam for signing in the Warden.
 *
 * Two consumers want different shapes today:
 *   - the direct EOA path (NonceManager extends AbstractSigner, TransactionExecutor)
 *     needs an ethers v6 signer
 *   - the ERC-4337 path (FlashSwapV3Executor -> toCoinbaseSmartAccount) needs a
 *     viem account to act as the smart account owner
 *
 * Both are answered here. SIGNER_MODE decides where the key lives, and no caller
 * has to know about it:
 *
 *   SIGNER_MODE=local  (default) key held locally, sourced from the AES-encrypted
 *                      Supabase environment_secrets store when USE_SUPABASE=true
 *   SIGNER_MODE=cdp    key generated and used inside the Coinbase CDP enclave,
 *                      with spend policies enforced at the enclave layer
 *
 * Nothing else in the codebase should read WALLET_PRIVATE_KEY / DEPLOYER_PRIVATE_KEY.
 */
import { JsonRpcProvider, type AbstractSigner } from 'ethers';
import type { Account } from 'viem';

export type SignerMode = 'local' | 'cdp';

export interface SignerProvider {
  readonly mode: SignerMode;

  /** Resolve the address (and any remote credentials) once, at boot. */
  init(): Promise<void>;

  /** The address transactions are sent from. Valid after init(). */
  getAddress(): string;

  /** ethers v6 signer, for NonceManager / TransactionExecutor / contract calls. */
  getEthersSigner(): AbstractSigner;

  /**
   * viem account used as the ERC-4337 Coinbase Smart Account owner.
   * LocalAccount in local mode, a Custom Account over the CDP account in cdp mode.
   */
  getViemOwner(): Promise<Account>;
}

export function resolveSignerMode(raw: string | undefined = process.env.SIGNER_MODE): SignerMode {
  const mode = (raw ?? 'local').trim().toLowerCase();
  if (mode !== 'local' && mode !== 'cdp') {
    throw new Error(`SIGNER_MODE must be 'local' or 'cdp', got '${raw}'`);
  }
  return mode;
}

/**
 * Build the provider the rest of the app should use, based on SIGNER_MODE.
 * Modules are imported lazily, so a local deployment never loads the CDP SDK
 * and a cdp deployment never loads the local-key path.
 */
export async function createSignerProvider(provider: JsonRpcProvider): Promise<SignerProvider> {
  const mode = resolveSignerMode();

  if (mode === 'cdp') {
    const { CdpEnclaveSigner } = await import('./CdpEnclaveSigner');
    const signer = await CdpEnclaveSigner.create(provider);
    await signer.init();
    return signer;
  }

  const { LocalKeySigner } = await import('./LocalKeySigner');
  const signer = await LocalKeySigner.create(provider);
  await signer.init();
  return signer;
}
