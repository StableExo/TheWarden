/**
 * SwapEventMonitor — Real-time WebSocket monitoring for DEX Swap events
 * 
 * S67: Flashblocks migration + V2 Swap event support
 * 
 * Changes from S54/S62:
 * - REMOVED: pendingLogs WSS subscription (wss://mainnet-preconf.base.org deprecated, returns 405)
 * - ADDED: V2 Swap event topic + parser (P1-B complete)
 * - CHANGED: Primary WSS → Alchemy (now Flashblocks-enabled provider)
 * - CHANGED: Flashblocks pre-confirmation via HTTP pending block polling (not WSS)
 * - Base recommendation: Use standard eth_subscribe("logs") + HTTP eth_getBlockByNumber("pending")
 * 
 * Subscribes to BOTH V2 and V3 Swap events on monitored pools via WSS (eth_subscribe).
 * Parses Uniswap V3/V2/SushiSwap/Aerodrome Swap logs into typed events.
 * Emits events for the PriceTracker to consume.
 * 
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Heartbeat detection (stale connection kill)
 * - Multi-pool subscription in a single WSS connection
 * - Fallback WSS endpoint support
 * - V2 + V3 dual-topic subscription (S67)
 * - HTTP Flashblocks polling for 200ms pre-confirmations (S67)
 * - Structured logging for monitoring
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { AbiCoder } from 'ethers';
import { logger } from '../utils/logger';

// ============================================================
// Types
// ============================================================

/** Uniswap V3 / SushiSwap V3 Swap event data */
export interface SwapEvent {
  pool: string;
  txHash: string;
  blockNumber: number;
  logIndex: number;
  sender: string;
  recipient: string;
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
  receivedAt: number;
  /** S67: AMM type that emitted this event */
  ammType?: 'v2' | 'v3';
  /** S67: Source of this event */
  source?: 'wss' | 'flashblock-http';
}

/** Pool to monitor */
export interface MonitoredPool {
  address: string;
  dex: string;
  token0: string;
  token1: string;
  fee: number;
  dexType?: 'v2' | 'v3';
}

/** Monitor configuration */
export interface SwapEventMonitorConfig {
  wssUrl: string;
  wssUrlBackup?: string;
  pools: MonitoredPool[];
  maxReconnectAttempts?: number;
  reconnectBaseDelay?: number;
  reconnectMaxDelay?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  /** S67: Enable HTTP Flashblocks polling via eth_getBlockByNumber("pending") */
  useFlashblocks?: boolean;
  /** S67: HTTP RPC URL for Flashblocks polling (Alchemy HTTPS) */
  flashblocksHttpUrl?: string;
  /** S67: Flashblocks poll interval (ms). Default: 200 */
  flashblocksPollInterval?: number;
}

/** Monitor statistics */
export interface MonitorStats {
  isConnected: boolean;
  eventsReceived: number;
  v2EventsReceived: number;
  v3EventsReceived: number;
  flashblockEvents: number;
  reconnections: number;
  lastEventAt: number | null;
  uptime: number;
  poolCount: number;
  subscriptionId: string | null;
}

// ============================================================
// Constants
// ============================================================

/** Uniswap V3 Swap event topic (also used by SushiSwap V3, Aerodrome CL) */
const SWAP_TOPIC_V3 = '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';

/** S67 P1-B: Uniswap V2 Swap event topic */
const SWAP_TOPIC_V2 = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';

const abiCoder = AbiCoder.defaultAbiCoder();
const Q96 = 2n ** 96n;

// ============================================================
// SwapEventMonitor
// ============================================================

export class SwapEventMonitor extends EventEmitter {
  private config: Required<SwapEventMonitorConfig>;
  private ws: WebSocket | null = null;
  private subscriptionId: string | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private flashblockTimer: NodeJS.Timeout | null = null;
  private lastMessageAt = 0;
  private startedAt = 0;
  private usingBackup = false;
  private lastFlashblockHash = '';

  private stats = {
    eventsReceived: 0,
    v2EventsReceived: 0,
    v3EventsReceived: 0,
    flashblockEvents: 0,
    reconnections: 0,
    lastEventAt: null as number | null,
  };

  constructor(config: SwapEventMonitorConfig) {
    super();
    this.config = {
      wssUrlBackup: config.wssUrlBackup || config.wssUrl,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 50,
      reconnectBaseDelay: config.reconnectBaseDelay ?? 1000,
      reconnectMaxDelay: config.reconnectMaxDelay ?? 30000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      heartbeatTimeout: config.heartbeatTimeout ?? 60000,
      flashblocksHttpUrl: config.flashblocksHttpUrl ?? '',
      flashblocksPollInterval: config.flashblocksPollInterval ?? 200,
      ...config,
    };
  }

  async start(): Promise<void> {
    this.startedAt = Date.now();
    const v2Count = this.config.pools.filter(p => p.dexType === 'v2').length;
    const v3Count = this.config.pools.length - v2Count;
    logger.info(`[SwapMonitor] S67: Starting with ${this.config.pools.length} pools (${v3Count} V3 + ${v2Count} V2)`);
    await this.connect();
    if (this.config.useFlashblocks && this.config.flashblocksHttpUrl) {
      this.startFlashblockPolling();
    }
  }

  stop(): void {
    logger.info('[SwapMonitor] Stopping...');
    this.clearHeartbeat();
    this.stopFlashblockPolling();
    if (this.ws) { this.ws.removeAllListeners(); this.ws.close(); this.ws = null; }
    this.subscriptionId = null;
    logger.info('[SwapMonitor] Stopped');
  }

  getStats(): MonitorStats {
    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN,
      eventsReceived: this.stats.eventsReceived,
      v2EventsReceived: this.stats.v2EventsReceived,
      v3EventsReceived: this.stats.v3EventsReceived,
      flashblockEvents: this.stats.flashblockEvents,
      reconnections: this.stats.reconnections,
      lastEventAt: this.stats.lastEventAt,
      uptime: this.startedAt ? Date.now() - this.startedAt : 0,
      poolCount: this.config.pools.length,
      subscriptionId: this.subscriptionId,
    };
  }

  // ============================================================
  // Connection Management
  // ============================================================

  private async connect(): Promise<void> {
    const url = this.usingBackup ? this.config.wssUrlBackup : this.config.wssUrl;
    logger.info(`[SwapMonitor] Connecting to ${url.substring(0, 40)}... (${this.usingBackup ? 'backup' : 'primary'})`);
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        this.ws.on('open', async () => {
          logger.info('[SwapMonitor] WebSocket connected');
          this.reconnectAttempts = 0;
          this.lastMessageAt = Date.now();
          this.startHeartbeat();
          try { await this.subscribe(); resolve(); } catch (err) { reject(err); }
        });
        this.ws.on('message', (data: WebSocket.Data) => { this.lastMessageAt = Date.now(); this.handleMessage(data); });
        this.ws.on('close', (code: number, reason: Buffer) => {
          logger.warn(`[SwapMonitor] WebSocket closed: code=${code}, reason=${reason.toString()}`);
          this.clearHeartbeat(); this.subscriptionId = null; this.scheduleReconnect();
        });
        this.ws.on('error', (err: Error) => { logger.error(`[SwapMonitor] WebSocket error: ${err.message}`); });
      } catch (err: any) { logger.error(`[SwapMonitor] Connection failed: ${err.message}`); this.scheduleReconnect(); reject(err); }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error(`[SwapMonitor] Max reconnect attempts reached. Giving up.`);
      this.emit('fatal', new Error('Max reconnect attempts reached'));
      return;
    }
    this.reconnectAttempts++;
    this.stats.reconnections++;
    const delay = Math.min(this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 1000, this.config.reconnectMaxDelay);
    if (this.reconnectAttempts === 3 && !this.usingBackup) { this.usingBackup = true; logger.info('[SwapMonitor] Switching to backup WSS endpoint'); }
    else if (this.reconnectAttempts === 6 && this.usingBackup) { this.usingBackup = false; logger.info('[SwapMonitor] Switching back to primary WSS endpoint'); }
    logger.info(`[SwapMonitor] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect().catch(() => {}), delay);
  }

  // ============================================================
  // Subscription — S67: Standard 'logs' + dual V2/V3 topics
  // ============================================================

  private async subscribe(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error('WebSocket not connected');
    const poolAddresses = this.config.pools.map(p => p.address.toLowerCase());

    // S67: Always use standard 'logs' (pendingLogs deprecated on Base)
    logger.info(`[SwapMonitor] S67: Standard 'logs' subscription with dual V2+V3 topics`);
    // RC#59: Subscribe topic-only — QuickNode's eth_subscribe silently drops ALL events
    // when the 'address' filter is present (tested: 0 events with address vs 92/16s without).
    // Client-side filtering in parseV3SwapLog/parseV2SwapLog already discards non-monitored pools.
    const subscribeMsg = {
      jsonrpc: '2.0', id: 1, method: 'eth_subscribe',
      params: ['logs', { topics: [[SWAP_TOPIC_V3, SWAP_TOPIC_V2]] }],
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 10000);
      const handler = (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.id === 1 && msg.result) {
            clearTimeout(timeout);
            this.subscriptionId = msg.result;
            logger.info(`[SwapMonitor] Subscribed: id=${this.subscriptionId}, pools=${poolAddresses.length}`);
            for (const pool of this.config.pools) {
              logger.info(`  [Pool] ${pool.address.substring(0, 14)}... | ${pool.dex} | fee=${pool.fee} | ${pool.dexType || 'v3'}`);
            }
            resolve();
          } else if (msg.id === 1 && msg.error) { clearTimeout(timeout); reject(new Error(`Subscription failed: ${msg.error.message}`)); }
        } catch (err) { /* Not JSON */ }
      };
      this.ws!.once('message', handler);
      this.ws!.send(JSON.stringify(subscribeMsg));
    });
  }

  // ============================================================
  // Message Handling — S67: Route V2 vs V3 by topic
  // ============================================================

  // RC#59: Fast-path address set for O(1) client-side filtering (since we now receive all swap events)
  private poolAddressSet: Set<string> | null = null;
  
  private getPoolAddressSet(): Set<string> {
    if (!this.poolAddressSet) {
      this.poolAddressSet = new Set(this.config.pools.map(p => p.address.toLowerCase()));
    }
    return this.poolAddressSet;
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'eth_subscription' && msg.params?.subscription === this.subscriptionId) {
        const log = msg.params.result;
        
        // RC#59: Fast-path — skip events from pools we don't monitor
        const logAddress = log.address?.toLowerCase();
        if (!logAddress || !this.getPoolAddressSet().has(logAddress)) return;
        
        const topic0 = log.topics?.[0];
        let swapEvent: SwapEvent | null = null;
        if (topic0 === SWAP_TOPIC_V3) { swapEvent = this.parseV3SwapLog(log); if (swapEvent) this.stats.v3EventsReceived++; }
        else if (topic0 === SWAP_TOPIC_V2) { swapEvent = this.parseV2SwapLog(log); if (swapEvent) this.stats.v2EventsReceived++; }
        if (swapEvent) {
          swapEvent.source = 'wss';
          this.stats.eventsReceived++;
          this.stats.lastEventAt = Date.now();
          this.emit('swap', swapEvent);
        }
      }
    } catch (err: any) { /* Ignore non-JSON */ }
  }

  // ============================================================
  // V3 Swap Log Parser
  // ============================================================

  private parseV3SwapLog(log: any): SwapEvent | null {
    try {
      const poolAddress = log.address?.toLowerCase();
      const pool = this.config.pools.find(p => p.address.toLowerCase() === poolAddress);
      if (!pool) return null;
      const decoded = abiCoder.decode(['int256', 'int256', 'uint160', 'uint128', 'int24'], log.data);
      const sender = '0x' + log.topics[1].slice(26);
      const recipient = '0x' + log.topics[2].slice(26);
      return {
        pool: poolAddress, txHash: log.transactionHash, blockNumber: parseInt(log.blockNumber, 16),
        logIndex: parseInt(log.logIndex, 16), sender, recipient,
        amount0: decoded[0], amount1: decoded[1], sqrtPriceX96: decoded[2],
        liquidity: decoded[3], tick: Number(decoded[4]), receivedAt: Date.now(), ammType: 'v3',
      };
    } catch (err: any) { logger.warn(`[SwapMonitor] Failed to parse V3 swap log: ${err.message}`); return null; }
  }

  // ============================================================
  // S67 P1-B: V2 Swap Log Parser (NEW)
  // ============================================================

  private parseV2SwapLog(log: any): SwapEvent | null {
    try {
      const poolAddress = log.address?.toLowerCase();
      const pool = this.config.pools.find(p => p.address.toLowerCase() === poolAddress);
      if (!pool) return null;
      // V2: Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)
      const decoded = abiCoder.decode(['uint256', 'uint256', 'uint256', 'uint256'], log.data);
      const amount0In = decoded[0] as bigint;
      const amount1In = decoded[1] as bigint;
      const amount0Out = decoded[2] as bigint;
      const amount1Out = decoded[3] as bigint;
      const sender = '0x' + log.topics[1].slice(26);
      const recipient = '0x' + log.topics[2].slice(26);

      // Derive synthetic sqrtPriceX96 from swap amounts for PriceTracker compatibility
      const netAmount0 = amount0In - amount0Out;
      const netAmount1 = amount1In - amount1Out;
      let sqrtPriceX96 = 0n;
      const absA0 = netAmount0 < 0n ? -netAmount0 : netAmount0;
      const absA1 = netAmount1 < 0n ? -netAmount1 : netAmount1;
      if (absA0 > 0n && absA1 > 0n) {
        const ratio = Number(absA1) / Number(absA0);
        sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(ratio) * Number(Q96)));
      }

      return {
        pool: poolAddress, txHash: log.transactionHash, blockNumber: parseInt(log.blockNumber, 16),
        logIndex: parseInt(log.logIndex, 16), sender, recipient,
        amount0: netAmount0, amount1: netAmount1, sqrtPriceX96,
        liquidity: 0n, tick: 0, receivedAt: Date.now(), ammType: 'v2',
      };
    } catch (err: any) { logger.warn(`[SwapMonitor] Failed to parse V2 swap log: ${err.message}`); return null; }
  }

  // ============================================================
  // S67: Flashblocks HTTP Polling
  // ============================================================

  private startFlashblockPolling(): void {
    if (!this.config.flashblocksHttpUrl) return;
    logger.info(`[SwapMonitor] S67: Flashblocks HTTP polling every ${this.config.flashblocksPollInterval}ms`);
    this.flashblockTimer = setInterval(async () => {
      try { await this.pollPendingBlock(); }
      catch (err: any) { logger.debug(`[SwapMonitor] Flashblock poll error: ${err.message}`); }
    }, this.config.flashblocksPollInterval);
  }

  private stopFlashblockPolling(): void {
    if (this.flashblockTimer) { clearInterval(this.flashblockTimer); this.flashblockTimer = null; }
  }

  private async pollPendingBlock(): Promise<void> {
    const response = await fetch(this.config.flashblocksHttpUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByNumber', params: ['pending', true] }),
    });
    const data = await response.json();
    if (!data.result) return;
    const blockHash = data.result.hash || data.result.parentHash;
    if (blockHash === this.lastFlashblockHash) return;
    this.lastFlashblockHash = blockHash;
    const poolSet = new Set(this.config.pools.map(p => p.address.toLowerCase()));
    for (const tx of (data.result.transactions || [])) {
      if (tx.to && poolSet.has(tx.to.toLowerCase())) this.stats.flashblockEvents++;
    }
  }

  // ============================================================
  // Heartbeat
  // ============================================================

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      const timeSinceLastMessage = Date.now() - this.lastMessageAt;
      if (timeSinceLastMessage > this.config.heartbeatTimeout) {
        logger.warn(`[SwapMonitor] Heartbeat timeout (${Math.round(timeSinceLastMessage / 1000)}s). Reconnecting...`);
        this.ws?.close(); return;
      }
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.ping();
    }, this.config.heartbeatInterval);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }
}

/** Helper: Calculate price from sqrtPriceX96 */
export function sqrtPriceX96ToPrice(sqrtPriceX96: bigint, token0Decimals: number, token1Decimals: number): number {
  const sqrtPrice = Number(sqrtPriceX96) / Number(2n ** 96n);
  const price = sqrtPrice * sqrtPrice;
  return price * (10 ** (token0Decimals - token1Decimals));
}

/**
 * S67: Create monitor config from environment + Supabase pools
 * Primary WSS = Alchemy (Flashblocks-enabled), backup = ChainStack/Tenderly
 * Flashblocks via HTTP pending block polling (not WSS pendingLogs)
 */
export function createMonitorConfigFromEnv(pools: MonitoredPool[]): SwapEventMonitorConfig {
  const useFlashblocks = process.env.ENABLE_FLASHBLOCKS === 'true';
  return {
    wssUrl: process.env.BASE_WSS_URL || process.env.ALCHEMY_WSS_ENDPOINT || 'wss://base-mainnet.g.alchemy.com/v2/demo', // CW-S2: BASE_WSS_URL first (Alchemy deleted S73)
    wssUrlBackup: process.env.BASE_WSS_URL_FALLBACK || process.env.CHAINSTACK_WSS_ENDPOINT || process.env.TENDERLY_NODE_WSS || process.env.BASE_WSS_URL_BACKUP, // CW-S2: Added FALLBACK variant
    pools,
    maxReconnectAttempts: parseInt(process.env.WS_MAX_RECONNECT || '50'),
    reconnectBaseDelay: parseInt(process.env.WS_RECONNECT_BASE_DELAY || '1000'),
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000'),
    heartbeatTimeout: parseInt(process.env.WS_HEARTBEAT_TIMEOUT || '60000'),
    useFlashblocks,
    flashblocksHttpUrl: useFlashblocks ? (process.env.BASE_RPC_URL || process.env.ALCHEMY_HTTPS_ENDPOINT || '') : '', // CW-S2: Use BASE_RPC_URL (Alchemy deleted S73)
    flashblocksPollInterval: parseInt(process.env.FLASHBLOCKS_POLL_INTERVAL || '200'),
  };
}
