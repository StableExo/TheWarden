/**
 * BLSSigner — TheWarden AEV Block Builder
 *
 * GL-L47 FIX 21: createRequire — load CJS @noble/bls12-381 from ESM "type":"module" project
 *
 * @noble/bls12-381 is CommonJS-only. In a "type":"module" package:
 *   import * as bls → .signSync undefined (namespace wraps default)
 *   import bls      → SyntaxError: no export named 'default'
 *   createRequire() → ✅ loads CJS module correctly, exposes all functions
 */

import { createHash } from 'crypto';
import { createRequire } from 'module';
import type { BidTrace } from './BlockBuilder';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bls = require('@noble/bls12-381') as {
  getPublicKey: (sk: Uint8Array) => Uint8Array;
  sign:     (msg: Uint8Array, sk: Uint8Array) => Promise<Uint8Array>;
  signSync: (msg: Uint8Array, sk: Uint8Array) => Uint8Array;
  verify:     (sig: Uint8Array, msg: Uint8Array, pk: Uint8Array) => Promise<boolean>;
  verifySync: (sig: Uint8Array, msg: Uint8Array, pk: Uint8Array) => boolean;
};

// ── Domain ───────────────────────────────────────────────────────────────────
const FORK_VERSION_CHUNK = Buffer.concat([Buffer.from('00000000', 'hex'), Buffer.alloc(28)]);
const FORK_DATA_ROOT = createHash('sha256').update(FORK_VERSION_CHUNK).update(Buffer.alloc(32)).digest();
const BUILDER_DOMAIN = Buffer.concat([Buffer.from('00000001', 'hex'), FORK_DATA_ROOT.subarray(0, 28)]);

// ── SSZ helpers ──────────────────────────────────────────────────────────────
const toU8 = (b: Buffer): Uint8Array => new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
const merkle2 = (a: Buffer, b: Buffer): Buffer =>
  createHash('sha256').update(a).update(b).digest();
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
  const hex = (typeof val === 'bigint' ? val.toString(16) : String(val).replace('0x', '')).padStart(64, '0');
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
    const pubBytes = bls.getPublicKey(this.skBytes);
    this.pubkey = '0x' + Buffer.from(pubBytes).toString('hex');
    console.log('[BLSSigner] ✅ Initialised | pubkey=' + this.pubkey.slice(0, 22) + '...');
    console.log('[BLSSigner] 🔑 Domain=' + BUILDER_DOMAIN.toString('hex'));
    console.log('[BLSSigner] 📚 @noble/bls12-381 via createRequire | PopScheme | signSync');
  }

  signBid(bid: BidTrace): string {
    const bidRoot     = sszHashBidTrace(bid);
    const signingRoot = createHash('sha256').update(bidRoot).update(BUILDER_DOMAIN).digest();
    const sigBytes    = bls.signSync(toU8(signingRoot), this.skBytes);
    const sig = '0x' + Buffer.from(sigBytes).toString('hex');
    console.log('[BLSSigner] ✍️  sig=' + sig.slice(0, 24) + '...');
    return sig;
  }

  verifyBid(bid: BidTrace, signature: string): boolean {
    try {
      const bidRoot     = sszHashBidTrace(bid);
      const signingRoot = createHash('sha256').update(bidRoot).update(BUILDER_DOMAIN).digest();
      const pubBytes    = bls.getPublicKey(this.skBytes);
      const sigBytes    = new Uint8Array(Buffer.from(signature.replace('0x', ''), 'hex'));
      return bls.verifySync(sigBytes, toU8(signingRoot), pubBytes);
    } catch { return false; }
  }

  signRegistration(feeRecipient: string, gasLimit: number, timestamp: number): {
    message: object; signature: string;
  } {
    const msgBuffer = Buffer.concat([
      Buffer.from(feeRecipient.replace('0x', ''), 'hex'),
      Buffer.alloc(8), Buffer.alloc(8),
      Buffer.from(this.pubkey.replace('0x', ''), 'hex'),
    ]);
    msgBuffer.writeBigUInt64LE(BigInt(gasLimit), 20);
    msgBuffer.writeBigUInt64LE(BigInt(timestamp), 28);
    const msgRoot     = createHash('sha256').update(msgBuffer).digest();
    const signingRoot = createHash('sha256').update(msgRoot).update(BUILDER_DOMAIN).digest();
    const sigBytes    = bls.signSync(toU8(signingRoot), this.skBytes);
    return {
      message: { fee_recipient: feeRecipient, gas_limit: String(gasLimit), timestamp: String(timestamp), pubkey: this.pubkey },
      signature: '0x' + Buffer.from(sigBytes).toString('hex'),
    };
  }
}
