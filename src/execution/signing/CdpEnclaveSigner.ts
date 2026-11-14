/**
 * CdpEnclaveSigner - SIGNER_MODE=cdp.
 *
 * The key is generated inside Coinbase's enclave and never enters this process.
 * Signing is an API call; spend policies are enforced at the enclave layer, so a
 * leaked API credential still cannot move funds past the cap.
 *
 * Credentials (three, not a private key):
 *   CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 *
 * The wallet is named (CDP_WALLET_NAME, default "warden-signer") and fetched with
 * getOrCreateAccount, so it is the same wallet across redeploys.
 *
 * Two consumers, as with the local provider:
 *   getEthersSigner()  an AbstractSigner whose signTransaction goes to the enclave,
 *                      and whose sendTransaction broadcasts through our own RPC, so
 *                      NonceManager keeps managing nonces exactly as before
 *   getViemOwner()     the CDP account wrapped with viem's toAccount, for use as an
 *                      ERC-4337 smart account owner
 */
import {
  AbstractSigner,
  TransactionRequest,
  TransactionResponse,
  TypedDataDomain,
  TypedDataField,
  hexlify,
  type JsonRpcProvider,
  type Provider,
} from 'ethers';
import { serializeTransaction } from 'viem';
import { toAccount } from 'viem/accounts';
import type { Account } from 'viem';

import { logger } from '../../utils/logger';

import type { SignerMode, SignerProvider } from './SignerProvider';

const REQUIRED_ENV = ['CDP_API_KEY_ID', 'CDP_API_KEY_SECRET', 'CDP_WALLET_SECRET'] as const;
const DEFAULT_WALLET_NAME = 'warden-signer';

/** ethers TransactionRequest -> the serializable shape viem's serializeTransaction wants. */
function toSerializable(input: Record<string, unknown>): Record<string, unknown> {
  const isEip1559 = input.maxFeePerGas !== undefined && input.maxFeePerGas !== null;
  const base: Record<string, unknown> = {
    chainId: Number(input.chainId),
    nonce: Number(input.nonce),
    to: (input.to as string) ?? undefined,
    value: (input.value as bigint) ?? 0n,
    data: (input.data as string) ?? '0x',
    gas: (input.gasLimit as bigint) ?? undefined,
  };
  if (isEip1559) {
    return {
      ...base,
      type: 'eip1559',
      maxFeePerGas: input.maxFeePerGas as bigint,
      maxPriorityFeePerGas: (input.maxPriorityFeePerGas as bigint) ?? 0n,
    };
  }
  return { ...base, type: 'legacy', gasPrice: (input.gasPrice as bigint) ?? 0n };
}

/**
 * ethers Signer backed by the CDP enclave. Signing is remote; broadcasting stays
 * with our RPC so nothing else about the send path changes.
 */
class CdpEthersSigner extends AbstractSigner {
  constructor(
    provider: Provider,
    private readonly cdp: any,
    private readonly address: string
  ) {
    super(provider);
  }

  connect(provider: Provider): CdpEthersSigner {
    return new CdpEthersSigner(provider, this.cdp, this.address);
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    if (!this.provider) {
      throw new Error('CdpEthersSigner needs a provider to populate and broadcast transactions');
    }

    const populated = await this.populateTransaction(tx);
    const withNonce = {
      ...populated,
      nonce:
        populated.nonce ??
        (await this.provider.getTransactionCount(this.address, 'pending')),
    };

    const serialized = serializeTransaction(toSerializable(withNonce as Record<string, unknown>) as any);

    const result = await this.cdp.evm.signTransaction({
      address: this.address,
      transaction: serialized,
    });

    // The REST endpoint returns `signedTransaction`; some SDK samples name the
    // local variable `signature`. Accept either and fail loudly if neither.
    const signed =
      typeof result === 'string'
        ? result
        : (result?.signedTransaction ?? result?.signature);
    if (typeof signed !== 'string' || !signed.startsWith('0x')) {
      throw new Error('CDP signTransaction did not return a signed transaction');
    }
    return signed;
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    if (!this.provider) {
      throw new Error('CdpEthersSigner needs a provider to broadcast transactions');
    }
    const signed = await this.signTransaction(tx);
    return this.provider.broadcastTransaction(signed);
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const payload = typeof message === 'string' ? message : hexlify(message);
    return this.cdp.evm.signMessage({ address: this.address, message: payload });
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>
  ): Promise<string> {
    const primaryType = Object.keys(types).find((key) => key !== 'EIP712Domain');
    if (!primaryType) {
      throw new Error('signTypedData needs a primary type besides EIP712Domain');
    }

    const domainFields: TypedDataField[] = [];
    if (domain.name !== undefined) domainFields.push({ name: 'name', type: 'string' });
    if (domain.version !== undefined) domainFields.push({ name: 'version', type: 'string' });
    if (domain.chainId !== undefined) domainFields.push({ name: 'chainId', type: 'uint256' });
    if (domain.verifyingContract !== undefined) {
      domainFields.push({ name: 'verifyingContract', type: 'address' });
    }
    if (domain.salt !== undefined) domainFields.push({ name: 'salt', type: 'bytes32' });

    return this.cdp.evm.signTypedData({
      address: this.address,
      domain,
      types: { EIP712Domain: domainFields, ...types },
      primaryType,
      message: value,
    });
  }
}

export class CdpEnclaveSigner implements SignerProvider {
  readonly mode: SignerMode = 'cdp';

  private address!: string;
  private account: any;
  private ethersSigner!: AbstractSigner;

  private constructor(
    private readonly provider: JsonRpcProvider,
    private readonly cdp: any,
    private readonly walletName: string
  ) {}

  static async create(provider: JsonRpcProvider): Promise<CdpEnclaveSigner> {
    const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`SIGNER_MODE=cdp is missing credentials: ${missing.join(', ')}`);
    }

    const { CdpClient } = await import('@coinbase/cdp-sdk');
    const cdp = new CdpClient();
    const walletName = process.env.CDP_WALLET_NAME || DEFAULT_WALLET_NAME;

    return new CdpEnclaveSigner(provider, cdp, walletName);
  }

  async init(): Promise<void> {
    if (this.address) return;

    // Deterministic: same wallet across redeploys, no key material anywhere.
    this.account = await this.cdp.evm.getOrCreateAccount({ name: this.walletName });
    this.address = this.account.address;
    this.ethersSigner = new CdpEthersSigner(this.provider, this.cdp, this.address);

    logger.info(
      `[SignerProvider] cdp mode: ${this.address} (enclave wallet "${this.walletName}", key never leaves the enclave)`
    );
  }

  getAddress(): string {
    return this.address;
  }

  getEthersSigner(): AbstractSigner {
    return this.ethersSigner;
  }

  async getViemOwner(): Promise<Account> {
    await this.init();
    if (typeof this.account.signTransaction !== 'function') {
      throw new Error(
        'This CDP account does not expose signTransaction, so it cannot be a viem smart-account ' +
          'owner. Use cdp.evm.getOrCreateSmartAccount + sendUserOperation instead (see PR notes).'
      );
    }
    // viem's own toAccount wraps the CDP account; the CDP SDK has no toAccount of its own.
    return toAccount(this.account as any) as unknown as Account;
  }
}
