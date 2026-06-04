/**
 * BLSSigner — TheWarden AEV Block Builder
 *
 * BLS12-381 signing for MEV-Boost relay bid submission.
 * Signs BuilderBid messages so relays can verify block origin.
 *
 * GL-L43: Live signing wired to build-block.ts continuous loop.
 * GL-L45 FIX: require("crypto") → import { createHash } — was breaking all
 *             signatures in ESM/tsx context causing wins=0.
 * GL-L46 FIX 11: Correct SSZ HashTreeRoot for BidTrace + correct domain.
 *   - Domain: sha256(fork_version_padded || genesis_validators_root)[:28]
 *   - BidTrace: SSZ Merkle tree (not flat SHA256)
 *   - Integers: little-endian (not big-endian)
 *
 * Key: 0xa2186b...13f29 (full key in TheWardenKeys.pdf)
 * Curve: BLS12-381 G1 compressed — Ethereum beacon chain standard
 */

import { createHash } from 'crypto';
import { bls12_381 } from '@noble/curves/bls12-381';
import type { BidTrace } from './BlockBuilder';

// ── Domain (CORRECT SSZ: ForkData HTR + DOMAIN_APPLICATION_BUILDER) ──────────
// Root{} = all zeros — mev-boost-relay uses empty root for DomainBuilder, NOT real GVR
// Source: ComputeDomain(DomainTypeAppBuilder, genesisForkVersion, phase0.Root{}.String())
const GENESIS_VALIDATORS_ROOT = Buffer.alloc(32);
// ForkData SSZ HTR = sha256(fork_version_padded_to_32 || genesis_validators_root)
const FORK_VERSION_CHUNK = Buffer.concat([Buffer.from('00000000','hex'), Buffer.alloc(28)]);
const FORK_DATA_ROOT = createHash('sha256')
  .update(FORK_VERSION_CHUNK)
  .update(GENESIS_VALIDATORS_ROOT)
  .digest();
// BUILDER_DOMAIN = DOMAIN_TYPE(4) + fork_data_root[:28]  = 32 bytes total
const BUILDER_DOMAIN = Buffer.concat([
  Buffer.from('00000001','hex'),
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
  return Buffer.from(hex.replace('0x','').padStart(64,'0'), 'hex');
}

function bytes20(hex: string): Buffer {
  const b = Buffer.alloc(32);
  Buffer.from(hex.replace('0x','').padStart(40,'0'), 'hex').copy(b);
  return b;
}

function bytes48HTR(hex: string): Buffer {
  const b = Buffer.from(hex.replace('0x','').padStart(96,'0'), 'hex');
  const chunk1 = b.subarray(0, 32);
  const chunk2 = Buffer.concat([b.subarray(32, 48), Buffer.alloc(16)]);
  return merkle2(chunk1, chunk2);
}

function uint256LE(val: string | bigint): Buffer {
  const hex = (typeof val === 'bigint' ? val.toString(16) : String(val).replace('0x',''))
    .padStart(64, '0');
  const be  = Buffer.from(hex, 'hex');
  const le  = Buffer.allocUnsafe(32);
  for (let i = 0; i < 32; i++) le[i] = be[31 - i];
  return le;
}

// ── SSZ HashTreeRoot for BidTrace ─────────────────────────────────────────────
function sszHashBidTrace(bid: BidTrace): Buffer {
  const leaves: Buffer[] = [
    uint64LE(bid.slot),
    bytes32(bid.parent_hash),
    bytes32(bid.block_hash),
    bytes48HTR(bid.builder_pubkey),
    bytes48HTR(bid.proposer_pubkey),
    bytes20(bid.proposer_fee_recipient),
    uint64LE(bid.gas_limit),
    uint64LE(bid.gas_used),
    uint256LE(bid.value),
  ];
  // Pad to next power of 2 (16)
  while (leaves.length < 16) leaves.push(ZERO_HASH);
  // Merkle tree bottom-up
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
    console.log('[BLSSigner] 🔑 Domain=' + BUILDER_DOMAIN.toString('hex').slice(0,16) + '...');
  }

  /** signing_root = sha256(SSZ_HTR(bidTrace) || domain) */
  signBid(bid: BidTrace): string {
    const bidRoot     = sszHashBidTrace(bid);
    const signingRoot = createHash('sha256').update(bidRoot).update(BUILDER_DOMAIN).digest();
    const sig         = bls12_381.sign(signingRoot, this.sk);
    return '0x' + Buffer.from(sig).toString('hex');
  }

  /** Verify a bid signature */
  verifyBid(bid: BidTrace, signature: string): boolean {
    try {
      const bidRoot     = sszHashBidTrace(bid);
      const signingRoot = createHash('sha256').update(bidRoot).update(BUILDER_DOMAIN).digest();
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
    const signingRoot = createHash('sha256').update(msgRoot).update(BUILDER_DOMAIN).digest();
    const sig         = bls12_381.sign(signingRoot, this.sk);
    return {
      message: { fee_recipient: feeRecipient, gas_limit: String(gasLimit), timestamp: String(timestamp), pubkey: this.pubkey },
      signature: '0x' + Buffer.from(sig).toString('hex'),
    };
  }
}
