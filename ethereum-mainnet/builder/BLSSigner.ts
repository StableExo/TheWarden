/**
 * BLSSigner — TheWarden AEV Block Builder
 *
 * BLS12-381 signing for MEV-Boost relay bid submission.
 * Signs BuilderBid messages so relays can verify block origin.
 *
 * GL-L43: Live signing wired to build-block.ts continuous loop.
 *
 * Key: 0xa2186b...13f29 (full key in TheWardenKeys.pdf)
 * Curve: BLS12-381 G1 compressed — Ethereum beacon chain standard
 */

import { bls12_381 } from '@noble/curves/bls12-381';
import type { BidTrace } from './BlockBuilder';

// ── Domain constants ─────────────────────────────────────────────────────────
// DOMAIN_APPLICATION_BUILDER = 0x00000001 per EIP-4399 / builder specs
const BUILDER_DOMAIN = Buffer.concat([
  Buffer.from('00000001', 'hex'),  // domain type
  Buffer.from('00000000', 'hex'),  // fork version (mainnet genesis)
  Buffer.alloc(28),                // padding
]);

// ── BLSSigner class ──────────────────────────────────────────────────────────
export class BLSSigner {
  private readonly sk: bigint;
  readonly pubkey: string;

  constructor(privateKeyHex: string) {
    const skBytes = Buffer.from(privateKeyHex.replace('0x', ''), 'hex');
    this.sk = BigInt('0x' + skBytes.toString('hex'));

    // Derive pubkey
    const pkBytes = bls12_381.getPublicKey(this.sk);
    this.pubkey = '0x' + Buffer.from(pkBytes).toString('hex');
  }

  /**
   * hashTreeRoot — SSZ hash of BidTrace for signing
   * Simplified SSZ: sha256 of concatenated fixed-width fields
   */
  private hashBidTrace(bid: BidTrace): Buffer {
    const { createHash } = require('crypto');

    // Pad all fields to 32 bytes for consistent hashing
    const encode = (hex: string, len = 32) =>
      Buffer.from(hex.replace('0x', '').padStart(len * 2, '0'), 'hex');

    const data = Buffer.concat([
      encode(bid.slot.toString(16), 8),
      encode(bid.parent_hash),
      encode(bid.block_hash),
      encode(bid.builder_pubkey, 48),
      encode(bid.proposer_pubkey, 48),
      encode(bid.proposer_fee_recipient, 20),
      encode(bid.gas_limit.toString(16), 8),
      encode(bid.gas_used.toString(16), 8),
      encode(bid.value.toString(16), 32),
    ]);

    return createHash('sha256').update(data).digest();
  }

  /**
   * computeSigningRoot — SSZ signing root per beacon chain spec
   * signing_root = sha256(object_root || domain)
   */
  private computeSigningRoot(objectRoot: Buffer): Buffer {
    const { createHash } = require('crypto');
    return createHash('sha256')
      .update(objectRoot)
      .update(BUILDER_DOMAIN)
      .digest();
  }

  /**
   * signBid — signs a BidTrace for relay submission
   * Returns hex signature string (0x-prefixed, 96 bytes)
   */
  signBid(bid: BidTrace): string {
    const bidRoot    = this.hashBidTrace(bid);
    const signingRoot = this.computeSigningRoot(bidRoot);
    const sig        = bls12_381.sign(signingRoot, this.sk);
    return '0x' + Buffer.from(sig).toString('hex');
  }

  /**
   * verifyBid — verify a bid signature (sanity check before submission)
   */
  verifyBid(bid: BidTrace, signature: string): boolean {
    try {
      const bidRoot     = this.hashBidTrace(bid);
      const signingRoot = this.computeSigningRoot(bidRoot);
      const sigBytes    = Buffer.from(signature.replace('0x', ''), 'hex');
      const pkBytes     = Buffer.from(this.pubkey.replace('0x', ''), 'hex');
      return bls12_381.verify(sigBytes, signingRoot, pkBytes);
    } catch {
      return false;
    }
  }

  /**
   * signRegistration — sign a builder registration message
   * Used for relay-specific whitelisting flows
   */
  signRegistration(feeRecipient: string, gasLimit: number, timestamp: number): {
    message: object;
    signature: string;
  } {
    const { createHash } = require('crypto');

    const msgBuffer = Buffer.concat([
      Buffer.from(feeRecipient.replace('0x', ''), 'hex'),  // 20 bytes
      Buffer.alloc(8).fill(0),                              // gas_limit placeholder
      Buffer.alloc(8).fill(0),                              // timestamp placeholder
      Buffer.from(this.pubkey.replace('0x', ''), 'hex'),   // 48 bytes pubkey
    ]);

    // Write gas_limit and timestamp as LE uint64
    msgBuffer.writeBigUInt64LE(BigInt(gasLimit), 20);
    msgBuffer.writeBigUInt64LE(BigInt(timestamp), 28);

    const msgRoot     = createHash('sha256').update(msgBuffer).digest();
    const signingRoot = this.computeSigningRoot(msgRoot);
    const sig         = bls12_381.sign(signingRoot, this.sk);

    return {
      message: {
        fee_recipient: feeRecipient,
        gas_limit:     String(gasLimit),
        timestamp:     String(timestamp),
        pubkey:        this.pubkey,
      },
      signature: '0x' + Buffer.from(sig).toString('hex'),
    };
  }
}

// ── Singleton export ─────────────────────────────────────────────────────────
export const signer = new BLSSigner(
  process.env.BUILDER_BLS_SK ?? ''
);
