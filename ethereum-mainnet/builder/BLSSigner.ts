/**
 * BLSSigner — TheWarden AEV Block Builder
 *
 * BLS12-381 signing for MEV-Boost relay bid submission.
 * Signs BuilderBid messages so relays can verify block origin.
 *
 * GL-L43: Live signing wired to build-block.ts continuous loop.
 * GL-L45 FIX: require("crypto") → import { createHash } — was breaking all
 *             signatures in ESM/tsx context causing wins=0.
 *
 * Key: 0xa2186b...13f29 (full key in TheWardenKeys.pdf)
 * Curve: BLS12-381 G1 compressed — Ethereum beacon chain standard
 */

import { createHash } from 'crypto';
import { bls12_381 } from '@noble/curves/bls12-381';
import type { BidTrace } from './BlockBuilder';

// ── Domain constants ────────────────────────────────────────────────────────
// DOMAIN_APPLICATION_BUILDER = 0x00000001 per EIP-4399 / builder specs
const BUILDER_DOMAIN = Buffer.concat([
  Buffer.from('00000001', 'hex'),  // domain type
  Buffer.from('00000000', 'hex'),  // fork version (mainnet genesis)
  Buffer.alloc(28),                // padding
]);

// ── BLSSigner ────────────────────────────────────────────────────────────────
export class BLSSigner {
  private readonly sk: bigint;
  readonly pubkey: string;

  constructor(privateKeyHex: string) {
    if (!privateKeyHex || privateKeyHex === '0x' || privateKeyHex === '') {
      throw new Error('BLSSigner: BUILDER_BLS_SK is empty — set env var');
    }
    const skHex   = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;
    const skBytes = Buffer.from(skHex, 'hex');
    if (skBytes.length === 0) throw new Error('BLSSigner: empty key bytes');
    this.sk = BigInt('0x' + skBytes.toString('hex'));

    const pkBytes = bls12_381.getPublicKey(this.sk);
    this.pubkey = '0x' + Buffer.from(pkBytes).toString('hex');
    console.log('[BLSSigner] ✅ Initialised | pubkey=' + this.pubkey.slice(0, 22) + '...');
  }

  /** SSZ hash of BidTrace fields for signing */
  private hashBidTrace(bid: BidTrace): Buffer {
    const encode = (hex: string, len = 32) =>
      Buffer.from(hex.replace('0x', '').padStart(len * 2, '0'), 'hex');

    const data = Buffer.concat([
      encode(bid.slot.toString(16), 8),
      encode(bid.parent_hash),
      encode(bid.block_hash),
      encode(bid.builder_pubkey,         48),
      encode(bid.proposer_pubkey,        48),
      encode(bid.proposer_fee_recipient, 20),
      encode(bid.gas_limit.toString(16),  8),
      encode(bid.gas_used.toString(16),   8),
      encode(bid.value.toString(16),     32),
    ]);

    return createHash('sha256').update(data).digest();
  }

  /** signing_root = sha256(object_root || domain) */
  private computeSigningRoot(objectRoot: Buffer): Buffer {
    return createHash('sha256').update(objectRoot).update(BUILDER_DOMAIN).digest();
  }

  /** Signs a BidTrace → hex signature (0x-prefixed, 96 bytes) */
  signBid(bid: BidTrace): string {
    const bidRoot     = this.hashBidTrace(bid);
    const signingRoot = this.computeSigningRoot(bidRoot);
    const sig         = bls12_381.sign(signingRoot, this.sk);
    return '0x' + Buffer.from(sig).toString('hex');
  }

  /** Verify a bid signature */
  verifyBid(bid: BidTrace, signature: string): boolean {
    try {
      const bidRoot     = this.hashBidTrace(bid);
      const signingRoot = this.computeSigningRoot(bidRoot);
      const sigBytes    = Buffer.from(signature.replace('0x', ''), 'hex');
      const pkBytes     = Buffer.from(this.pubkey.replace('0x', ''), 'hex');
      return bls12_381.verify(sigBytes, signingRoot, pkBytes);
    } catch { return false; }
  }

  /** Sign a builder registration message */
  signRegistration(feeRecipient: string, gasLimit: number, timestamp: number): {
    message: object; signature: string;
  } {
    const msgBuffer = Buffer.concat([
      Buffer.from(feeRecipient.replace('0x', ''), 'hex'),
      Buffer.alloc(8).fill(0),
      Buffer.alloc(8).fill(0),
      Buffer.from(this.pubkey.replace('0x', ''), 'hex'),
    ]);
    msgBuffer.writeBigUInt64LE(BigInt(gasLimit),   20);
    msgBuffer.writeBigUInt64LE(BigInt(timestamp),  28);
    const msgRoot     = createHash('sha256').update(msgBuffer).digest();
    const signingRoot = this.computeSigningRoot(msgRoot);
    const sig         = bls12_381.sign(signingRoot, this.sk);
    return {
      message: { fee_recipient: feeRecipient, gas_limit: String(gasLimit), timestamp: String(timestamp), pubkey: this.pubkey },
      signature: '0x' + Buffer.from(sig).toString('hex'),
    };
  }
}
// Singleton removed GL-L44 — instantiate directly in build-block.ts
