/**
 * CdpEnclaveSigner - SIGNER_MODE=cdp.
 *
 * Phase 2 replaces this stub with the @coinbase/cdp-sdk implementation: the key is
 * generated and used inside the Coinbase enclave, so nothing in this process can
 * read or export it, and spend policies are enforced at the enclave layer.
 *
 * The stub exists so `SIGNER_MODE=cdp` fails loudly instead of silently falling
 * back to a local key.
 */
import type { AbstractSigner, JsonRpcProvider } from 'ethers';
import type { LocalAccount } from 'viem';

import type { SignerMode, SignerProvider } from './SignerProvider';

export class CdpEnclaveSigner implements SignerProvider {
  readonly mode: SignerMode = 'cdp';

  private constructor(private readonly provider: JsonRpcProvider) {}

  static async create(provider: JsonRpcProvider): Promise<CdpEnclaveSigner> {
    return new CdpEnclaveSigner(provider);
  }

  async init(): Promise<void> {
    throw new Error('SIGNER_MODE=cdp is not implemented yet (Phase 2: @coinbase/cdp-sdk)');
  }

  getAddress(): string {
    throw new Error('SIGNER_MODE=cdp is not implemented yet (Phase 2: @coinbase/cdp-sdk)');
  }

  getEthersSigner(): AbstractSigner {
    throw new Error('SIGNER_MODE=cdp is not implemented yet (Phase 2: @coinbase/cdp-sdk)');
  }

  async getViemOwner(): Promise<LocalAccount> {
    throw new Error('SIGNER_MODE=cdp is not implemented yet (Phase 2: @coinbase/cdp-sdk)');
  }
}
