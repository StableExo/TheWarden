/**
 * BLSSigner — TheWarden AEV Block Builder
 *
 * GL-L47 FIX 24: @noble/curves bls12-381 with explicit PopScheme DST
 *
 * ROOT CAUSE DISCOVERED:
 *   @noble/bls12-381 (old pkg) and gnark-crypto (relay) produce DIFFERENT
 *   G2 point bytes for the same input due to hash-to-curve expansion differences.
 *   py_ecc (gnark-compatible) and @noble/bls12-381 do NOT interoperate.
 *
 *   @noble/curves bls12-381 IS gnark-compatible (same RFC 9380 hash-to-curve).
 *   DST must be specified manually: BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_
 */

import { createHash } from 'crypto';
import { bls12_381 } from '@noble/curves/bls12-381';
import type { BidTrace } from './BlockBuilder';

// Explicit PopScheme DST — MUST match gnark-crypto relay
const ETH2_DST = 'BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_';

// ── Domain ───────────────────────────────────────────────────────────────────
const FORK_VERSION_CHUNK = Buffer.concat([Buffer.from('00000000', 'hex'), Buffer.alloc(28)]);
const FORK_DATA_ROOT = createHash('sha256').update(FORK_VERSION_CHUNK).update(Buffer.alloc(32)).digest();
const BUILDER_DOMAIN = Buffer.concat([Buffer.from('00000001', 'hex'), FORK_DATA_ROOT.subarray(0, 28)]);

// ── SSZ helpers ──────────────────────────────────────────────────────────────
const toU8 = (b: Buffer): Uint8Array => new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
const merkle2 = (a: Buffer, b: Buffer): Buffer => createHash('sha256').update(a).update(b).digest();
const ZERO_HASH = Buffer.alloc(32);

function uint64LE(n: number | bigint | string): Buffer {
  const buf = Buffer.alloc(32); const tmp = Buffer.alloc(8);
  tmp.writeBigUInt64LE(BigInt(n)); tmp.copy(buf); return buf;
}
function bytes32(hex: string): Buffer {
  return Buffer.from(hex.replace('0x', '').padStart(64, '0'), 'hex');
}
function bytes20(hex: string): Buffer {
  const b = Buffer.alloc(32);
  Buffer.from(hex.replace('0x', '').padStart(40, '0'), 'hex').copy(b); return b;
}
function bytes48HTR(hex: string): Buffer {
  const b = Buffer.from(hex.replace('0x', '').padStart(96, '0'), 'hex');
  return merkle2(b.subarray(0, 32), Buffer.concat([b.subarray(32, 48), Buffer.alloc(16)]));
}
function uint256LE(val: string | bigint): Buffer {
  // Always convert via BigInt to ensure decimal string → correct hex (not decimal-as-hex)
  const hex = BigInt(val).toString(16).padStart(64, '0');
  const be = Buffer.from(hex, 'hex'); const le = Buffer.allocUnsafe(32);
  for (let i = 0; i < 32; i++) le[i] = be[31 - i]; return le;
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

// ── BLSSigner ────────────────────────────────────────────────────────────────
export class BLSSigner {
  private readonly skBytes: Uint8Array;
  readonly pubkey: string;

  constructor(privateKeyHex: string) {
    if (!privateKeyHex || privateKeyHex === '0x' || privateKeyHex === '') {
      throw new Error('BLSSigner: BUILDER_BLS_SK is empty — set env var');
    }
    const hex = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;
    this.skBytes = new Uint8Array(Buffer.from(hex, 'hex'));
    const pubBytes = bls12_381.getPublicKey(this.skBytes);
    this.pubkey = '0x' + Buffer.from(pubBytes).toString('hex');
    console.log('[BLSSigner] ✅ Initialised | pubkey=' + this.pubkey.slice(0, 22) + '...');
    console.log('[BLSSigner] 🔑 Domain=' + BUILDER_DOMAIN.toString('hex'));
    console.log('[BLSSigner] 📚 @noble/curves bls12-381 | PopScheme DST | gnark-compatible');
  }

  async signBid(bid: BidTrace): Promise<string> {
    const bidRoot     = sszHashBidTrace(bid);
    const signingRoot = createHash('sha256').update(bidRoot).update(BUILDER_DOMAIN).digest();
    // Use explicit ETH2 PopScheme DST — gnark-crypto compatible
    const sigBytes    = await bls12_381.sign(toU8(signingRoot), this.skBytes, { DST: ETH2_DST });
    // Self-verify to confirm correctness
    const pubBytes    = bls12_381.getPublicKey(this.skBytes);
    const valid       = await bls12_381.verify(sigBytes, toU8(signingRoot), pubBytes, { DST: ETH2_DST });
    const sig = '0x' + Buffer.from(sigBytes).toString('hex');
    console.log('[BLSSigner] ✍️  sig=' + sig.slice(0, 24) + '... selfVerify=' + valid);
    return sig;
  }

  async verifyBid(bid: BidTrace, signature: string): Promise<boolean> {
    try {
      const bidRoot     = sszHashBidTrace(bid);
      const signingRoot = createHash('sha256').update(bidRoot).update(BUILDER_DOMAIN).digest();
      const pubBytes    = bls12_381.getPublicKey(this.skBytes);
      const sigBytes    = new Uint8Array(Buffer.from(signature.replace('0x', ''), 'hex'));
      return await bls12_381.verify(sigBytes, toU8(signingRoot), pubBytes, { DST: ETH2_DST });
    } catch { return false; }
  }
}
