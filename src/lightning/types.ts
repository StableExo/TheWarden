/**
 * Lightning Network Types
 * Type definitions for Core Lightning integration
 */

export interface LightningNodeInfo {
  id: string;
  alias: string;
  color: string;
  num_peers: number;
  num_pending_channels: number;
  num_active_channels: number;
  num_inactive_channels: number;
  address: Array<{
    type: string;
    address: string;
    port: number;
  }>;
  binding: Array<{
    type: string;
    address: string;
    port: number;
  }>;
  version: string;
  blockheight: number;
  network: 'bitcoin' | 'testnet' | 'signet' | 'regtest';
  fees_collected_msat: number;
  lightning_dir: string;
}

export interface LightningInvoice {
  label: string;
  bolt11: string;
  payment_hash: string;
  msatoshi?: number;
  amount_msat?: string;
  status: 'unpaid' | 'paid' | 'expired';
  description?: string;
  expires_at: number;
  paid_at?: number;
  payment_preimage?: string;
}

export interface LightningPayment {
  id: number;
  payment_hash: string;
  destination: string;
  msatoshi: number;
  amount_msat: string;
  msatoshi_sent: number;
  amount_sent_msat: string;
  created_at: number;
  status: 'pending' | 'complete' | 'failed';
  payment_preimage?: string;
  bolt11?: string;
}

export interface LightningChannel {
  peer_id: string;
  peer_connected: boolean;
  state: string;
  short_channel_id?: string;
  channel_id: string;
  funding_txid: string;
  funding_output: number;
  msatoshi_to_us: number;
  amount_msat: string;
  msatoshi_to_them: number;
  msatoshi_total: number;
  dust_limit_satoshis: number;
  max_htlc_value_in_flight_msat: number;
  their_channel_reserve_satoshis: number;
  our_channel_reserve_satoshis: number;
  spendable_msatoshi: number;
  htlc_minimum_msat: number;
  their_to_self_delay: number;
  our_to_self_delay: number;
  max_accepted_htlcs: number;
  status: string[];
  in_payments_offered: number;
  in_msatoshi_offered: number;
  in_payments_fulfilled: number;
  in_msatoshi_fulfilled: number;
  out_payments_offered: number;
  out_msatoshi_offered: number;
  out_payments_fulfilled: number;
  out_msatoshi_fulfilled: number;
}

export interface CreateInvoiceParams {
  amountSats: number;
  label: string;
  description: string;
  expiry?: number; // seconds, default 3600 (1 hour)
}

export interface PayInvoiceParams {
  bolt11: string;
  msatoshi?: number; // optional override
  label?: string;
  maxfeepercent?: number;
  retry_for?: number; // seconds to retry
  maxdelay?: number; // max delay in blocks
}

export interface OpenChannelParams {
  peerId: string;
  amountSats: number;
  pushMsat?: number;
  feeratePerkw?: number;
  announce?: boolean;
  minconf?: number;
}

export interface LightningConfig {
  network: 'bitcoin' | 'testnet' | 'signet' | 'regtest';
  rpcPath?: string;
  lightningDir?: string;
  bitcoinRpcUrl?: string;
  bitcoinRpcUser?: string;
  bitcoinRpcPassword?: string;
}

export interface PaymentReceivedEvent {
  label: string;
  preimage: string;
  msatoshi: number;
  amount_msat: string;
}

export interface ChannelOpenedEvent {
  id: string;
  funding_txid: string;
  funding_locked: boolean;
}

export interface ForwardSucceededEvent {
  in_channel: string;
  out_channel: string;
  msatoshi: number;
  fee: number;
  status: string;
}

/**
 * Revenue allocation for Lightning payments
 */
export interface RevenueAllocation {
  totalSats: number;
  debtAllocationSats: number; // 70%
  operationalSats: number; // 30%
  timestamp: number;
  source: 'lightning-invoice' | 'lightning-routing-fees' | 'lightning-service';
  serviceType?: string;
}

/**
 * Lightning service pricing
 */
export interface ServicePricing {
  serviceId: string;
  serviceName: string;
  pricePerQuery?: number; // sats
  pricePerMinute?: number; // sats for streaming
  subscriptionDaily?: number; // sats per day
  volumeDiscount?: {
    threshold: number;
    discountPercent: number;
  }[];
}

/**
 * Micropayment transaction record
 */
export interface MicropaymentTransaction {
  id: string;
  timestamp: number;
  paymentHash: string;
  amountSats: number;
  serviceType: string;
  userId?: string;
  status: 'pending' | 'completed' | 'failed';
  revenueAllocation: RevenueAllocation;
}

export interface LightningStats {
  totalInvoicesCreated: number;
  totalInvoicesPaid: number;
  totalAmountReceivedSats: number;
  totalAmountSentSats: number;
  totalRoutingFeesSats: number;
  averagePaymentTimeSec: number;
  successRate: number;
  activeChannels: number;
  totalLiquidity: number;
  debtAllocationTotal: number;
}
