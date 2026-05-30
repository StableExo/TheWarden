/**
 * MultiBuilderSubmitter — Fan-out to Quasar + Titan + bloXroute simultaneously
 *
 * GL-L42 upgrade: Single-builder was the old approach. Fan-out to ALL builders
 * every submission. Higher inclusion probability, zero extra cost.
 *
 * Builder priority (all receive every bundle):
 *   1. Quasar  — ~16% ETH market share | GL-L36 confirmed
 *   2. Titan   — sponsored gas | GL-L42 added
 *   3. bloXroute — broad relay coverage
 *
 * GL-L42 | TheWarden
 */

import { ETH_MAINNET } from '../config/network';
import type { BundlePayload, BundleResult } from './QuasarComposer';

export interface BuilderResult {
  builder:    string;
  bundleHash: string;
  submitted:  boolean;
  error?:     string;
  latencyMs?: number;
}

export interface FanOutResult {
  targetBlock:   number;
  totalBuilders: number;
  successful:    number;
  results:       BuilderResult[];
  bestHash:      string;
}

export class MultiBuilderSubmitter {
  private builders = ETH_MAINNET.builders;

  /**
   * Submit bundle to ALL builders simultaneously.
   * Returns when all complete (Promise.allSettled).
   */
  async submitAll(payload: BundlePayload): Promise<FanOutResult> {
    console.log(`[MultiBuilder] Submitting to ${this.builders.length} builders | block ${parseInt(payload.blockNumber, 16)}`);

    const submissions = this.builders.map(async (builder): Promise<BuilderResult> => {
      const t0 = Date.now();
      try {
        const res = await fetch(builder.rpc, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id:      1,
            method:  'eth_sendBundle',
            params:  [payload],
          }),
          signal: AbortSignal.timeout(5000),
        });

        const data = await res.json() as any;
        const latencyMs = Date.now() - t0;

        if (data.error) {
          return { builder: builder.name, bundleHash: '', submitted: false,
                   error: data.error.message, latencyMs };
        }

        const hash = data.result?.bundleHash ?? data.result ?? '';
        console.log(`[${builder.name}] ✅ Hash: ${hash} | ${latencyMs}ms`);
        return { builder: builder.name, bundleHash: hash, submitted: true, latencyMs };

      } catch (e: any) {
        return { builder: builder.name, bundleHash: '', submitted: false,
                 error: e.message?.slice(0,60), latencyMs: Date.now() - t0 };
      }
    });

    const settled = await Promise.allSettled(submissions);
    const results = settled.map(r => r.status === 'fulfilled' ? r.value :
      { builder: 'unknown', bundleHash: '', submitted: false, error: 'promise rejected' });

    const successful = results.filter(r => r.submitted).length;
    const bestHash   = results.find(r => r.submitted)?.bundleHash ?? '';

    console.log(`[MultiBuilder] ${successful}/${this.builders.length} accepted | block ${parseInt(payload.blockNumber, 16)}`);

    return {
      targetBlock:   parseInt(payload.blockNumber, 16),
      totalBuilders: this.builders.length,
      successful,
      results,
      bestHash,
    };
  }

  /**
   * Simulate bundle (eth_callBundle) against Quasar before submitting.
   * If simulation reverts, skip live submission.
   */
  async simulate(payload: BundlePayload): Promise<{ success: boolean; revertReason?: string }> {
    try {
      const res = await fetch(this.builders[0].rpc, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'eth_callBundle',
          params: [{ txs: payload.txs, blockNumber: payload.blockNumber, stateBlockNumber: 'latest' }],
        }),
      });
      const data = await res.json() as any;
      if (data.error) return { success: false, revertReason: data.error.message };
      const results = data.result?.results ?? [];
      const reverted = results.find((r: any) => r.error || r.revert);
      if (reverted) return { success: false, revertReason: reverted.error ?? 'revert' };
      return { success: true };
    } catch (e: any) {
      return { success: false, revertReason: e.message };
    }
  }
}

// Keep old QuasarSubmitter as alias for backward compat
export class QuasarSubmitter extends MultiBuilderSubmitter {}
