/**
 * QuasarComposer — ETH Mainnet Bundle Builder
 *
 * Builds Flashbots-compatible eth_sendBundle payloads for Quasar Builder.
 * Bundle structure:
 *   [0] The arb tx (flash loan → swap → repay → profit)
 *   [1] The coinbase tip tx (pays quasarbuilder.eth → unlocks gas sponsorship)
 *
 * GL-L40 | TheWarden | First mover: cooperative coalition bundling
 */

import { ETH_MAINNET } from '../config/network';

export interface BundlePayload {
  txs:              string[];  // signed raw transactions
  blockNumber:      string;   // target block (hex)
  refundPercent?:   number;   // 0-99
  refundRecipient?: string;
}

export interface BundleResult {
  bundleHash:  string;
  blockNumber: number;
  submitted:   boolean;
  error?:      string;
}

// Minimum tip for bundle inclusion + gas sponsorship (~0.001 ETH)
export const MIN_COINBASE_TIP = 1_000_000_000_000_000n;

export class QuasarComposer {
  constructor(
    private refundPercent   = ETH_MAINNET.quasar.refundPercent,
    private refundRecipient = ETH_MAINNET.wallet.eoa
  ) {}

  /** Single-searcher bundle */
  compose(
    signedArbTx:      string,
    signedCoinbaseTx: string,
    targetBlock:      number
  ): BundlePayload {
    return {
      txs:             [signedArbTx, signedCoinbaseTx],
      blockNumber:     `0x${targetBlock.toString(16)}`,
      refundPercent:   this.refundPercent,
      refundRecipient: this.refundRecipient,
    };
  }

  /**
   * Coalition bundle — multiple searchers, one shared coinbase tip.
   * This is the cooperative game theory entry point.
   * NegotiatorAgent feeds signed txs here after Shapley allocation.
   */
  composeCoalition(
    signedArbTxs:     string[],
    signedCoinbaseTx: string,
    targetBlock:      number
  ): BundlePayload {
    return {
      txs:             [...signedArbTxs, signedCoinbaseTx],
      blockNumber:     `0x${targetBlock.toString(16)}`,
      refundPercent:   this.refundPercent,
      refundRecipient: this.refundRecipient,
    };
  }
}
