/**
 * BLSSigner — TheWarden AEV Block Builder
 *
 * BLS12-381 signing for MEV-Boost relay bid submission.
 *
 * GL-L43: Live signing wired to build-block.ts continuous loop.
 * GL-L45 FIX 1: require("crypto") → import { createHash }
 * GL-L46 FIX 11-16: SSZ HTR, empty Root domain, @chainsafe/bls
 *
 * GL-L46 FIX 16: Switch from @noble/curves to @chainsafe/bls
 *   @chainsafe/bls wraps blst (production ETH2 BLS library)
 *   Uses BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_ automatically
 *   Same library used by ETH2 validators and go-boost-utils
 */

import { createHash } from 'crypto';
import bls from '@chainsafe/bls/blst-native.js';
import type { BidTrace } from './BlockBuilder';

// ── Domain (SSZ ForkData HTR with empty Root{}) ───────────────────────────────
// mev-boost-relay uses: ComputeDomain(DomainTypeAppBuilder, genesisForkVersion, phase0.Root{})
const FORK_VERSION_CHUNK = Buffer.concat([Buffer.from('00000000', 'hex'), Buffer.alloc(28)]);
const FORK_DATA_ROOT = createHash('sha256')
  .update(FORK_VERSION_CHUNK)
  .update(Buffer.alloc(32)) // Root{} = all zeros
  .digest();
const BUILDER_DOMAIN = Buffer.concat([
  Buffer.from('00000001', 'hex'),
  FORK_DATA_ROOT.subarray(0, 28),
]);

// ── SSZ helpers ───────────────────────────────────────────────────────────────
const merkle2 = (a: Buffer, b: Buffer): Buffer =>
  createHash('sha256').update(a).update(b).digest();
const ZERO_HASH = Buffer.alloc(32);

function uint64LE(n: number | bigint | string): Buffer {
  const buf = Buffer.alloc(32);
  const tmp = Buffer.alloc(8);
  tmp.writeBigUInt64LE(BigInt(n));
  tmp.copy(buf);
  return buf;
}
function bytes32(hex: string): Buffer {
  return Buffer.from(hex.replace('0x', '').padStart(64, '0'), 'hex');
}
function bytes20(hex: string): Buffer {
  const b = Buffer.alloc(32);
  Buffer.from(hex.replace('0x', '').padStart(40, '0'), 'hex').copy(b);
  return b;
}
function bytes48HTR(hex: string): Buffer {
  const b = Buffer.from(hex.replace('0x', '').padStart(96, '0'), 'hex');
  return merkle2(b.subarray(0, 32), Buffer.concat([b.subarray(32, 48), Buffer.alloc(16)]));
}
function uint256LE(val: string | bigint): Buffer {
  const hex = (typeof val === 'bigint' ? val.toString(16) : String(val).replace('0x', '')).padStart(64, '0');
  const be = Buffer.from(hex, 'hex');
  const le = Buffer.allocUnsafe(32);
  for (let i = 0; i < 32; i++) le[i] = be[31 - i];
  return le;
}
function sszHashBidTrace(bid: BidTrace): Buffer {
  const leaves: Buffer[] = [
    uint64LE(bid.slot), bytes32(bid.parent_hash), bytes32(bid.block_hash),
    bytes48HTR(bid.builder_pubkey), bytes48HTR(bid.proposer_pubkey), bytes20(bid.proposer_fee_recipient),
    uint64LE(bid.gas_limit), uint64LE(bid.gas_used), uint256LE(bid.value),
  ];
  while (leaves.length < 16) leaves.push(ZERO_HASH);
  let layer = leaves;
  while (layer.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < layer.length; i += 2) next.push(merkle2(layer[i], layer[i + 1]));
    layer = next;
  }
  return layer[0];
}

// ── BLSSigner ─────────────────────────────────────────────────────────────────
export class BLSSigner {
  private readonly skBytes: Uint8Array;
  readonly pubkey: string;

  constructor(privateKeyHex: string) {
    if (!privateKeyHex || privateKeyHex === '0x' || privateKeyHex === '') {
      throw new Error('BLSSigner: BUILDER_BLS_SK is empty — set env var');
    }
    const hex = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;
    this.skBytes = new Uint8Array(Buffer.from(hex, 'hex'));
    const sk = bls.SecretKey.fromBytes(this.skBytes);
    const pk = sk.toPublicKey();
    this.pubkey = '0x' + Buffer.from(pk.toBytes()).toString('hex');
    console.log('[BLSSigner] ✅ Initialised | pubkey=' + this.pubkey.slice(0, 22) + '...');
    console.log('[BLSSigner] 🔑 Domain=' + BUILDER_DOMAIN.toString('hex').slice(0, 16) + '...');
    console.log('[BLSSigner] 📚 Using @chainsafe/bls (ETH2-native library)');
  }

  /** signing_root = sha256(SSZ_HTR(bidTrace) || domain) */
  signBid(bid: BidTrace): string {
    const bidRoot     = sszHashBidTrace(bid);
    const signingRoot = createHash('sha256').update(bidRoot).update(BUILDER_DOMAIN).digest();
    const sk          = bls.SecretKey.fromBytes(this.skBytes);
    const sig         = sk.sign(signingRoot);
    return '0x' + Buffer.from(sig.toBytes()).toString('hex');
  }

  /** Verify a bid signature */
  verifyBid(bid: BidTrace, signature: string): boolean {
    try {
      const bidRoot     = sszHashBidTrace(bid);
      const signingRoot = createHash('sha256').update(bidRoot).update(BUILDER_DOMAIN).digest();
      const pk          = bls.SecretKey.fromBytes(this.skBytes).toPublicKey();
      const sigBytes    = Buffer.from(signature.replace('0x', ''), 'hex');
      const sig         = bls.Signature.fromBytes(sigBytes);
      return sig.verify(pk, signingRoot);
    } catch { return false; }
  }

  signRegistration(feeRecipient: string, gasLimit: number, timestamp: number): {
    message: object; signature: string;
  } {
    const msgBuffer = Buffer.concat([
      Buffer.from(feeRecipient.replace('0x', ''), 'hex'),
      Buffer.alloc(8).fill(0), Buffer.alloc(8).fill(0),
      Buffer.from(this.pubkey.replace('0x', ''), 'hex'),
    ]);
    msgBuffer.writeBigUInt64LE(BigInt(gasLimit), 20);
    msgBuffer.writeBigUInt64LE(BigInt(timestamp), 28);
    const msgRoot     = createHash('sha256').update(msgBuffer).digest();
    const signingRoot = createHash('sha256').update(msgRoot).update(BUILDER_DOMAIN).digest();
    const sk          = bls.SecretKey.fromBytes(this.skBytes);
    const sig         = sk.sign(signingRoot);
    return {
      message: { fee_recipient: feeRecipient, gas_limit: String(gasLimit), timestamp: String(timestamp), pubkey: this.pubkey },
      signature: '0x' + Buffer.from(sig.toBytes()).toString('hex'),
    };
  }
}
