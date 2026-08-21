/**
 * CoalitionManager — Live arb-loop coalition glue layer
 *
 * VL-33: Bridges arb-loop.ts single-searcher path → full NegotiatorAgent coalition path.
 *
 * Design:
 *   - External scouts POST signed raw txs to /bundle (no blind-commit overhead for now)
 *   - Our own arb tx is always registered as "warden" scout on each opportunity
 *   - Each block: NegotiatorAgent runs conflict detection + Shapley allocation
 *   - Compatible bundles merged → single coalition bundle → Quasar + Titan fan-out
 *   - Incompatible bundles dropped (logged with reason)
 *   - Warden takes 5% flat fee from total coalition profit
 *
 * Scout bundle POST /bundle shape:
 *   {
 *     scoutId:      string,           // unique scout identifier
 *     signedTxs:    string[],         // signed raw txs (hex)
 *     expectedProfit: number,         // estimated profit in USD
 *     tokenAddresses: string[],       // tokens touched (for conflict detection)
 *     poolAddresses:  string[],       // pools touched (for conflict detection)
 *     tipWei:       string,           // tip to coinbase in wei (hex string)
 *     expiresAt:    number,           // unix timestamp — drop if block > this
 *   }
 *
 * VL-33 | TheWarden | @StableExo
 */

import { randomUUID } from 'crypto';
import type { Address } from 'viem';
import { ETH_MAINNET } from '../config/network';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoutSubmission {
  scoutId:        string;
  signedTxs:      string[];         // raw signed txs to include in bundle
  expectedProfit: number;           // USD estimate
  tokenAddresses: string[];         // for conflict detection
  poolAddresses:  string[];         // for conflict detection
  tipWei:         bigint;           // coinbase tip amount
  expiresAt:      number;           // unix ms — drop if expired
  submittedAt:    number;
  bundleId:       string;
}

export interface CoalitionBundleResult {
  submitted:    boolean;
  builders:     string[];
  bundleHashes: string[];
  scoutCount:   number;
  totalTipWei:  bigint;
  rejected:     { scoutId: string; reason: string }[];
}

// ── Conflict detection ────────────────────────────────────────────────────────

function hasConflict(a: ScoutSubmission, b: ScoutSubmission): string | null {
  // Pool overlap — two arbs hitting the same pool in same block = price impact conflict
  const poolsA = new Set(a.poolAddresses.map(p => p.toLowerCase()));
  const poolsB = new Set(b.poolAddresses.map(p => p.toLowerCase()));
  for (const p of poolsA) {
    if (poolsB.has(p)) return `pool overlap: ${p}`;
  }
  // Tx overlap — same raw tx in both bundles
  const txsA = new Set(a.signedTxs);
  for (const tx of b.signedTxs) {
    if (txsA.has(tx)) return `duplicate tx`;
  }
  return null; // compatible
}

// ── Shapley-weighted tip split ────────────────────────────────────────────────
// Simplified Shapley: each scout's marginal contribution = their expectedProfit.
// Warden takes WARDEN_FEE_PCT flat, remainder split proportional to contribution.

const WARDEN_FEE_PCT = 0.05; // 5%

function shapleyTips(
  scouts: ScoutSubmission[],
  totalTipWei: bigint,
): Map<string, bigint> {
  const wardenCut = (totalTipWei * BigInt(Math.floor(WARDEN_FEE_PCT * 1000))) / 1000n;
  const remainder = totalTipWei - wardenCut;

  const totalProfit = scouts.reduce((s, sc) => s + sc.expectedProfit, 0);
  const shares = new Map<string, bigint>();

  if (totalProfit === 0) {
    // Equal split if no profit estimates
    const each = remainder / BigInt(scouts.length);
    for (const sc of scouts) shares.set(sc.scoutId, each);
  } else {
    for (const sc of scouts) {
      const share = (remainder * BigInt(Math.floor((sc.expectedProfit / totalProfit) * 1_000_000n))) / 1_000_000n;
      shares.set(sc.scoutId, share);
    }
  }

  shares.set('warden', wardenCut);
  return shares;
}

// ── CoalitionManager ──────────────────────────────────────────────────────────

export class CoalitionManager {
  private pending: Map<string, ScoutSubmission> = new Map();
  private stats = {
    totalSubmissions: 0,
    totalCoalitions:  0,
    totalRejected:    0,
    scoutIds:         new Set<string>(),
  };

  // ── Accept a scout bundle submission ────────────────────────────────────────
  submit(sub: Omit<ScoutSubmission, 'bundleId' | 'submittedAt'>): string {
    const bundleId = randomUUID();
    const entry: ScoutSubmission = {
      ...sub,
      bundleId,
      submittedAt: Date.now(),
    };
    this.pending.set(bundleId, entry);
    this.stats.totalSubmissions++;
    this.stats.scoutIds.add(sub.scoutId);
    console.log(`[COALITION] Scout ${sub.scoutId} submitted bundle ${bundleId} | profit=$${sub.expectedProfit.toFixed(2)} | txs=${sub.signedTxs.length}`);
    return bundleId;
  }

  // ── Register our own arb as warden scout ─────────────────────────────────
  registerWardenArb(
    signedArbTx:    string,
    expectedProfit: number,
    tokenAddresses: string[],
    poolAddresses:  string[],
    tipWei:         bigint,
    expiresAt:      number,
  ): string {
    return this.submit({
      scoutId:        'warden',
      signedTxs:      [signedArbTx],
      expectedProfit,
      tokenAddresses,
      poolAddresses,
      tipWei,
      expiresAt,
    });
  }

  // ── Expire stale bundles ──────────────────────────────────────────────────
  private expire(): number {
    const now = Date.now();
    let dropped = 0;
    for (const [id, sub] of this.pending) {
      if (sub.expiresAt < now) {
        this.pending.delete(id);
        dropped++;
      }
    }
    return dropped;
  }

  // ── Build optimal coalition for current block ─────────────────────────────
  // Greedy: sort by expectedProfit desc, greedily add non-conflicting bundles.
  // This is O(n^2) which is fine for typical bundle counts (<20 per block).
  buildCoalition(currentBlockMs: number): {
    accepted:   ScoutSubmission[];
    rejected:   { scoutId: string; bundleId: string; reason: string }[];
    allSignedTxs: string[];
    totalTipWei: bigint;
  } {
    this.expire();

    const candidates = Array.from(this.pending.values())
      .filter(s => s.expiresAt > currentBlockMs)
      .sort((a, b) => b.expectedProfit - a.expectedProfit); // highest profit first

    const accepted: ScoutSubmission[] = [];
    const rejected: { scoutId: string; bundleId: string; reason: string }[] = [];

    for (const candidate of candidates) {
      let conflict: string | null = null;
      for (const acc of accepted) {
        conflict = hasConflict(candidate, acc);
        if (conflict) break;
      }
      if (conflict) {
        rejected.push({ scoutId: candidate.scoutId, bundleId: candidate.bundleId, reason: conflict });
        this.stats.totalRejected++;
      } else {
        accepted.push(candidate);
      }
    }

    // Build tx list: all accepted scout txs in profit order
    const allSignedTxs = accepted.flatMap(s => s.signedTxs);
    const totalTipWei  = accepted.reduce((s, sc) => s + sc.tipWei, 0n);

    if (accepted.length > 0) {
      this.stats.totalCoalitions++;
      console.log(`[COALITION] Block coalition: ${accepted.length} scouts | ${rejected.length} rejected | totalTip=${Number(totalTipWei)/1e18} ETH`);
      if (rejected.length > 0) {
        for (const r of rejected) console.log(`[COALITION]   ❌ ${r.scoutId}/${r.bundleId}: ${r.reason}`);
      }
      const tips = shapleyTips(accepted, totalTipWei);
      for (const [id, share] of tips) {
        console.log(`[COALITION]   💰 ${id}: ${Number(share)/1e18} ETH`);
      }
    }

    return { accepted, rejected, allSignedTxs, totalTipWei };
  }

  // ── Clear accepted bundles after submission ───────────────────────────────
  clearAccepted(accepted: ScoutSubmission[]): void {
    for (const s of accepted) this.pending.delete(s.bundleId);
  }

  // ── Stats for /status endpoint ────────────────────────────────────────────
  getStats() {
    return {
      pendingBundles:   this.pending.size,
      totalSubmissions: this.stats.totalSubmissions,
      totalCoalitions:  this.stats.totalCoalitions,
      totalRejected:    this.stats.totalRejected,
      activeScouts:     this.stats.scoutIds.size,
    };
  }
}

// Singleton — shared across arb-loop.ts
export const coalitionManager = new CoalitionManager();
