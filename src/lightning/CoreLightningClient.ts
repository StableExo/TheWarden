/**
 * Core Lightning Client
 * TypeScript wrapper for Core Lightning JSON-RPC API
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  LightningNodeInfo,
  LightningInvoice,
  LightningPayment,
  LightningChannel,
  CreateInvoiceParams,
  PayInvoiceParams,
  OpenChannelParams,
  LightningConfig,
} from './types.js';

const execAsync = promisify(exec);

export class CoreLightningClient {
  private config: LightningConfig;
  private lightningCliPath: string;
  private networkFlag: string;

  constructor(config: LightningConfig) {
    this.config = config;
    this.lightningCliPath = 'lightning-cli';
    this.networkFlag = config.network === 'testnet' ? '--testnet' : 
                       config.network === 'signet' ? '--signet' :
                       config.network === 'regtest' ? '--regtest' : '';
  }

  /**
   * Execute lightning-cli command
   */
  private async execute<T>(command: string, ...args: any[]): Promise<T> {
    const argsStr = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    const cmd = [
      this.lightningCliPath,
      this.networkFlag,
      this.config.lightningDir ? `--lightning-dir=${this.config.lightningDir}` : '',
      command,
      argsStr
    ].filter(Boolean).join(' ');

    try {
      const { stdout, stderr } = await execAsync(cmd);
      
      if (stderr && !stderr.includes('WARNING')) {
        console.warn('Lightning CLI stderr:', stderr);
      }

      return JSON.parse(stdout);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Lightning CLI error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get node information
   */
  async getInfo(): Promise<LightningNodeInfo> {
    return this.execute<LightningNodeInfo>('getinfo');
  }

  /**
   * Create a new invoice
   */
  async createInvoice(params: CreateInvoiceParams): Promise<LightningInvoice> {
    const { amountSats, label, description, expiry = 3600 } = params;
    const msatoshi = amountSats * 1000;

    return this.execute<LightningInvoice>(
      'invoice',
      msatoshi,
      label,
      description,
      expiry
    );
  }

  /**
   * List all invoices
   */
  async listInvoices(label?: string): Promise<{ invoices: LightningInvoice[] }> {
    if (label) {
      return this.execute('listinvoices', label);
    }
    return this.execute('listinvoices');
  }

  /**
   * Wait for an invoice to be paid
   */
  async waitInvoice(label: string, timeout?: number): Promise<LightningInvoice> {
    const args: any[] = [label];
    if (timeout) {
      args.push(timeout);
    }
    return this.execute('waitinvoice', ...args);
  }

  /**
   * Pay a Lightning invoice
   */
  async pay(params: PayInvoiceParams): Promise<LightningPayment> {
    const { bolt11, msatoshi, label, maxfeepercent = 0.5, retry_for = 60, maxdelay = 500 } = params;
    
    const args: any = { bolt11 };
    if (msatoshi) args.msatoshi = msatoshi;
    if (label) args.label = label;
    args.maxfeepercent = maxfeepercent;
    args.retry_for = retry_for;
    args.maxdelay = maxdelay;

    return this.execute('pay', args);
  }

  /**
   * Get payment status
   */
  async listPayments(bolt11?: string): Promise<{ payments: LightningPayment[] }> {
    if (bolt11) {
      return this.execute('listpays', bolt11);
    }
    return this.execute('listpays');
  }

  /**
   * List all channels
   */
  async listChannels(): Promise<{ channels: LightningChannel[] }> {
    return this.execute('listpeerchannels');
  }

  /**
   * Get channel by peer ID
   */
  async getChannel(peerId: string): Promise<LightningChannel | null> {
    const result = await this.listChannels();
    return result.channels.find(ch => ch.peer_id === peerId) || null;
  }

  /**
   * Open a new channel
   */
  async openChannel(params: OpenChannelParams): Promise<any> {
    const { peerId, amountSats, pushMsat = 0, announce = true, minconf = 1 } = params;
    
    return this.execute(
      'fundchannel',
      peerId,
      amountSats,
      {
        push_msat: pushMsat,
        announce,
        minconf
      }
    );
  }

  /**
   * Close a channel
   */
  async closeChannel(peerId: string, force: boolean = false): Promise<any> {
    const args: any = [peerId];
    if (force) {
      args.push('unilateraltimeout', 0);
    }
    return this.execute('close', ...args);
  }

  /**
   * Connect to a peer
   */
  async connectPeer(nodeId: string, host: string, port: number = 9735): Promise<any> {
    return this.execute('connect', `${nodeId}@${host}:${port}`);
  }

  /**
   * Disconnect from a peer
   */
  async disconnectPeer(peerId: string, force: boolean = false): Promise<any> {
    return this.execute('disconnect', peerId, force);
  }

  /**
   * List peers
   */
  async listPeers(): Promise<{ peers: any[] }> {
    return this.execute('listpeers');
  }

  /**
   * Get new Bitcoin address
   */
  async newAddress(type: 'bech32' | 'p2sh-segwit' = 'bech32'): Promise<{ address: string }> {
    return this.execute('newaddr', type);
  }

  /**
   * Get node balance
   */
  async getBalance(): Promise<any> {
    return this.execute('listfunds');
  }

  /**
   * Decode a BOLT11 invoice
   */
  async decodeInvoice(bolt11: string): Promise<any> {
    return this.execute('decode', bolt11);
  }

  /**
   * Get route to a node
   */
  async getRoute(
    nodeId: string,
    msatoshi: number,
    riskfactor: number = 1
  ): Promise<any> {
    return this.execute('getroute', nodeId, msatoshi, riskfactor);
  }

  /**
   * Send payment to a route
   */
  async sendPay(route: any, paymentHash: string): Promise<any> {
    return this.execute('sendpay', route, paymentHash);
  }

  /**
   * List forwards (routing events)
   */
  async listForwards(): Promise<{ forwards: any[] }> {
    return this.execute('listforwards');
  }

  /**
   * Check if node is ready
   */
  async isReady(): Promise<boolean> {
    try {
      const info = await this.getInfo();
      return info.blockheight > 0 && info.num_peers > 0;
    } catch {
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    nodeInfo?: LightningNodeInfo;
    error?: string;
  }> {
    try {
      const info = await this.getInfo();
      return {
        healthy: true,
        nodeInfo: info
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
