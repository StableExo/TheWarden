/**
 * QuasarSubmitter — Submit bundles to Quasar Builder
 *
 * https://rpc.quasar.win — ~16% ETH mainnet market share (May 2026)
 * Covers gas via LackOfFundForGasLimit sponsorship.
 *
 * GL-L40 | TheWarden
 */

import { ETH_MAINNET } from '../config/network';
import type { BundlePayload, BundleResult } from './QuasarComposer';

export class QuasarSubmitter {
  private readonly rpc = ETH_MAINNET.quasar.rpc;

  async submit(payload: BundlePayload): Promise<BundleResult> {
    const res = await fetch(this.rpc, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id:      1,
        method:  'eth_sendBundle',
        params:  [payload],
      }),
    });

    const data = await res.json() as any;

    if (data.error) {
      return { bundleHash: '', blockNumber: parseInt(payload.blockNumber, 16), submitted: false, error: data.error.message };
    }

    return { bundleHash: data.result?.bundleHash ?? '', blockNumber: parseInt(payload.blockNumber, 16), submitted: true };
  }

  async simulate(payload: BundlePayload): Promise<any> {
    const res = await fetch(this.rpc, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id:      1,
        method:  'eth_callBundle',
        params:  [{ txs: payload.txs, blockNumber: payload.blockNumber, stateBlockNumber: 'latest' }],
      }),
    });
    return res.json();
  }
}
