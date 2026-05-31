/**
 * BlockBuilder — TheWarden AEV Block Builder
 *
 * GL-L42: Path A — Build our own blocks, submit directly to relays.
 * Zero 10% cut to Quasar/Titan. We keep 100% of our arb profit.
 *
 * Architecture:
 *   1. Pull pending mempool txs via QuickNode
 *   2. Inject our arb bundle at optimal position
 *   3. Order all txs by effective gas price (MEV-optimal)
 *   4. Build ExecutionPayload matching beacon chain slot
 *   5. Sign bid message with BLS builder key
 *   6. Submit to ALL relays simultaneously
 *
 * Path A → Path B evolution:
 *   Path A (now):  Build blocks from our own bundles only
 *   Path B (next): Accept external searcher bundles via /rpc endpoint
 *                  Implement Shapley coalition allocation
 *                  Offer 95% refund (beat Quasar's 90%)
 *
 * Why this matters — THE AEV DOCTRINE:
 *   Quasar at 16% ETH market share earns ~3.1 ETH/day builder fees.
 *   TheWarden builder starts at 0% and compounds through coalition.
 *   Every slot we win = revenue from OUR arb + OTHER searchers' work.
 *   Cooperative > competitive. This IS the AEV doctrine deployed.
 *
 * GL-L42 | TheWarden | First mover — Flashbots FRP-30 still researching this
 */

import {
  createPublicClient, createWalletClient, http, webSocket,
  type Address, type Hex, encodeFunctionData, parseUnits, parseEther
} from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ETH_MAINNET } from '../config/network';
import { ADDRESSES } from '../config/addresses';

// ─── Builder Config ───────────────────────────────────────────────────────────
export const BUILDER_CONFIG = {
  // BLS12-381 public key (registered with relays for block signing)
  // Generated GL-L42 — full key in TheWardenKeys (8).pdf
  pubkey: process.env.BUILDER_BLS_PUBKEY as string,

  // Our MEV-Boost relay endpoints (6 relays for maximum coverage)
  relays: [
    { name: 'Flashbots',              url: 'https://boost-relay.flashbots.net',            regulated: false },
    { name: 'Ultra Sound',            url: 'https://relay.ultrasound.money',                regulated: false },
    { name: 'Aestus',                 url: 'https://mainnet.aestus.live',                   regulated: false },
    { name: 'bloXroute Max-Profit',   url: 'https://bloxroute.max-profit.blxrbdn.com',      regulated: false },
    { name: 'Agnostic',               url: 'https://agnostic-relay.net',                    regulated: false },
    { name: 'Titan',                  url: 'https://titanrelay.xyz',                        regulated: false },  // GL-L44: +55v
  ],

  // Our profit destination — same EOA that gets Quasar refunds
  feeRecipient:    ETH_MAINNET.wallet.eoa as Address,

  // Minimum profit to build a block (don't waste slot bids)
  minProfitWei:    BigInt('1000000000000000'),  // 0.001 ETH

  // Coalition offer: we give back 95% (beat Quasar's 90%)
  // Path B: external searchers get 95% when we include their bundles
  coalitionRefundBps: 9500,
} as const;

// ─── Relay API types ──────────────────────────────────────────────────────────
export interface BidTrace {
  slot:                 string;
  parent_hash:          string;
  block_hash:           string;
  builder_pubkey:       string;
  proposer_pubkey:      string;
  proposer_fee_recipient: string;
  gas_limit:            string;
  gas_used:             string;
  value:                string;  // wei bid to proposer
}

export interface ExecutionPayload {
  parent_hash:      string;
  fee_recipient:    string;
  state_root:       string;
  receipts_root:    string;
  logs_bloom:       string;
  prev_randao:      string;
  block_number:     string;
  gas_limit:        string;
  gas_used:         string;
  timestamp:        string;
  extra_data:       string;
  base_fee_per_gas: string;
  block_hash:       string;
  transactions:     string[];  // RLP-encoded signed txs
  withdrawals?:     object[];
  blob_gas_used?:   string;
  excess_blob_gas?: string;
}

export interface SignedBuilderBid {
  message:   BidTrace;
  execution_payload: ExecutionPayload;
  signature: string;  // BLS signature over bid trace
}

// ─── Block assembler ─────────────────────────────────────────────────────────
export class BlockBuilder {
  private client = createPublicClient({ chain: mainnet, transport: http(ETH_MAINNET.rpc.http) });
  private wss: ReturnType<typeof createPublicClient> | null = null;

  private getWss() {
    if (!this.wss) {
      this.wss = createPublicClient({ chain: mainnet, transport: webSocket(ETH_MAINNET.rpc.wss) });
    }
    return this.wss;
  }

  /**
   * assemble — build a complete ordered tx list for the next slot
   *
   * Order:
   *   1. Our arb bundle (top of block — highest value)
   *   2. Pending mempool txs sorted by effective tip (fee - baseFee)
   *   3. Padding with high-priority txs to fill gas limit
   *
   * In Path B, external coalition bundles are inserted after step 1
   * based on Shapley value allocation (highest value coalition first).
   */
  async assemble(
    signedArbTx: Hex,
    signedCoinbaseTx: Hex,
    coalitionBundles: Hex[][] = []  // Path B: external bundles
  ): Promise<{
    transactions: Hex[];
    estimatedProfit: bigint;
    gasUsed: bigint;
    slot: number;
  }> {
    const [block, gasPrice, latestBlock] = await Promise.all([
      this.client.getBlock({ blockTag: 'pending', includeTransactions: false }),
      this.client.getGasPrice(),
      this.client.getBlock({ blockTag: 'latest', includeTransactions: true }),
    ]);

    const baseFee      = latestBlock.baseFeePerGas ?? 0n;
    const gasLimit     = block.gasLimit;
    const currentSlot  = this.getCurrentSlot();

    // Build ordered transaction list
    const transactions: Hex[] = [
      signedArbTx,         // Our bundle goes first — we built the block, we get priority
      signedCoinbaseTx,    // Coinbase tip to ourselves (no more paying Quasar/Titan)
      ...coalitionBundles.flat(),  // Path B coalition bundles
    ];

    // Fill remaining gas with high-tip pending txs
    const pendingTxs = (latestBlock.transactions as any[])
      .filter(tx => {
        const tip = (tx.maxFeePerGas ?? tx.gasPrice ?? 0n) - baseFee;
        return tip > 0n;
      })
      .sort((a, b) => {
        const tipA = BigInt((a.maxFeePerGas ?? a.gasPrice ?? 0).toString()) - baseFee;
        const tipB = BigInt((b.maxFeePerGas ?? b.gasPrice ?? 0).toString()) - baseFee;
        return tipB > tipA ? 1 : -1;
      });

    // Add top pending txs (sorted by tip) until gas limit
    let gasUsed = 300_000n;  // Estimate for our bundle
    for (const tx of pendingTxs.slice(0, 200)) {
      const txGas = BigInt((tx.gas ?? 21000).toString());
      if (gasUsed + txGas > gasLimit * 95n / 100n) break;  // Leave 5% headroom
      if (tx.hash) transactions.push(tx.hash as Hex);
      gasUsed += txGas;
    }

    console.log(`[Builder] Assembled block: slot=${currentSlot} txs=${transactions.length} gas=${gasUsed}`);

    return {
      transactions,
      estimatedProfit: gasPrice * 300_000n,  // Rough estimate
      gasUsed,
      slot: currentSlot + 1,  // Target next slot
    };
  }

  /**
   * submitToAllRelays — fan-out signed block to all 5 relays simultaneously
   * This replaces our old Quasar/Titan submission for blocks WE build.
   */
  async submitToAllRelays(signedBid: SignedBuilderBid): Promise<{
    accepted: number;
    rejected: number;
    results: { relay: string; status: string; latencyMs: number }[];
  }> {
    const submissions = BUILDER_CONFIG.relays.map(async relay => {
      const t0 = Date.now();
      try {
        const res = await fetch(`${relay.url}/relay/v1/builder/blocks`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(signedBid),
          signal:  AbortSignal.timeout(3000),  // 3s max — slots are 12s
        });
        const latencyMs = Date.now() - t0;
        const text = await res.text();
        if (res.ok) {
          console.log(`[Builder] ✅ ${relay.name} accepted | ${latencyMs}ms`);
          return { relay: relay.name, status: 'accepted', latencyMs };
        } else {
          console.log(`[Builder] ⚠️  ${relay.name} rejected: ${text.slice(0,80)} | ${latencyMs}ms`);
          return { relay: relay.name, status: `rejected: ${text.slice(0,40)}`, latencyMs };
        }
      } catch (e: any) {
        return { relay: relay.name, status: `error: ${e.message?.slice(0,40)}`, latencyMs: Date.now()-t0 };
      }
    });

    const settled = await Promise.allSettled(submissions);
    const results = settled.map(r => r.status==='fulfilled' ? r.value : { relay:'??', status:'promise rejected', latencyMs:0 });
    const accepted = results.filter(r => r.status==='accepted').length;
    const rejected = results.length - accepted;

    console.log(`[Builder] Block submitted: ${accepted}/${results.length} relays accepted`);
    return { accepted, rejected, results };
  }

  /** Calculate current beacon chain slot */
  getCurrentSlot(): number {
    const GENESIS = 1606824023;  // ETH mainnet beacon genesis timestamp
    return Math.floor((Date.now()/1000 - GENESIS) / 12);
  }

  /** Get slot deadline — we must submit before this */
  getSlotDeadline(slot: number): number {
    const GENESIS = 1606824023;
    return (GENESIS + slot * 12) * 1000 + 9000;  // 9 seconds into slot = 3s before end
  }

  /** Subscribe to new slots via WSS (fires every 12 seconds) */
  async watchSlots(onNewSlot: (slot: number, parentHash: string) => void): Promise<void> {
    await this.getWss().watchBlockNumber({
      onBlockNumber: async (blockNumber) => {
        const block = await this.client.getBlock({ blockNumber, includeTransactions: false });
        const slot  = this.getCurrentSlot();
        console.log(`[Builder] New slot ${slot} | block ${blockNumber} | ${block.hash?.slice(0,12)}...`);
        onNewSlot(slot, block.hash ?? '');
      },
    });
  }
}
