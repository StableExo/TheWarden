/**
 * SwapEventMonitor — Real-time WebSocket monitoring for DEX Swap events
 * 
 * Phase 4: Sub-second opportunity detection on Base.
 * 
 * Subscribes to Swap events on monitored pools via WSS (eth_subscribe).
 * Parses Uniswap V3 / SushiSwap V3 Swap logs into typed events.
 * Emits events for the PriceTracker to consume.
 * 
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Heartbeat detection (stale connection kill)
 * - Multi-pool subscription in a single WSS connection
 * - Fallback WSS endpoint support
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
  /** Pool address that emitted the event */
  pool: string;
  /** Transaction hash */
  txHash: string;
  /** Block number */
  blockNumber: number;
  /** Log index within the block */
  logIndex: number;
  /** Address that initiated the swap */
  sender: string;
  /** Address that received the output */
  recipient: string;
  /** Amount of token0 (positive = received by pool, negative = sent by pool) */
  amount0: bigint;
  /** Amount of token1 (positive = received by pool, negative = sent by pool) */
  amount1: bigint;
  /** sqrt(price) after the swap, in Q64.96 format */
  sqrtPriceX96: bigint;
  /** Liquidity after the swap */
  liquidity: bigint;
  /** Tick after the swap */
  tick: number;
  /** Timestamp when the event was received (ms) */
  receivedAt: number;
}

/** Pool to monitor */
export interface MonitoredPool {
  address: string;
  dex: string;        // 'uniswap_v3' | 'sushiswap' | 'aerodrome' | etc.
  token0: string;
  token1: string;
  fee: number;         // Fee tier in bps
}

/** Monitor configuration */
export interface SwapEventMonitorConfig {
  /** Primary WebSocket URL */
  wssUrl: string;
  /** Backup WebSocket URL (optional) */
  wssUrlBackup?: string;
  /** Pools to monitor */
  pools: MonitoredPool[];
  /** Reconnect config */
  maxReconnectAttempts?: number;   // Default: 50
  reconnectBaseDelay?: number;     // Default: 1000ms
  reconnectMaxDelay?: number;      // Default: 30000ms
  /** Heartbeat interval (ms). Default: 30000 */
  heartbeatInterval?: number;
  /** Max time without a message before reconnect (ms). Default: 60000 */
  heartbeatTimeout?: number;
  /** S54: Enable Flashblocks 200ms pre-confirmation streaming via pendingLogs */
  useFlashblocks?: boolean;
}

/** Monitor statistics */
export interface MonitorStats {
  isConnected: boolean;
  eventsReceived: number;
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

/** ABI decoder for Swap event non-indexed params */
const abiCoder = AbiCoder.defaultAbiCoder();

// ============================================================
// SwapEventMonitor
// ============================================================

export class SwapEventMonitor extends EventEmitter {
  private config: Required<SwapEventMonitorConfig>;
  private ws: WebSocket | null = null;
  private subscriptionId: string | null = null;
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastMessageAt = 0;
  private startedAt = 0;
  private usingBackup = false;

  // Stats
  private stats = {
    eventsReceived: 0,
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
      ...config,
    };
  }

  /** Start monitoring — connect to WSS and subscribe to Swap events */
  async start(): Promise<void> {
    this.startedAt = Date.now();
    logger.info(`[SwapMonitor] Starting with ${this.config.pools.length} pools`);
    await this.connect();
  }

  /** Stop monitoring — close WSS and clean up */
  stop(): void {
    logger.info('[SwapMonitor] Stopping...');
    this.clearHeartbeat();
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.subscriptionId = null;
    logger.info('[SwapMonitor] Stopped');
  }

  /** Get current statistics */
  getStats(): MonitorStats {
    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN,
      eventsReceived: this.stats.eventsReceived,
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

          try {
            await this.subscribe();
            resolve();
          } catch (err) {
            reject(err);
          }
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.lastMessageAt = Date.now();
          this.handleMessage(data);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          logger.warn(`[SwapMonitor] WebSocket closed: code=${code}, reason=${reason.toString()}`);
          this.clearHeartbeat();
          this.subscriptionId = null;
          this.scheduleReconnect();
        });

        this.ws.on('error', (err: Error) => {
          logger.error(`[SwapMonitor] WebSocket error: ${err.message}`);
          // Don't reject — the 'close' event will handle reconnection
        });

      } catch (err: any) {
        logger.error(`[SwapMonitor] Connection failed: ${err.message}`);
        this.scheduleReconnect();
        reject(err);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error(`[SwapMonitor] Max reconnect attempts (${this.config.maxReconnectAttempts}) reached. Giving up.`);
      this.emit('fatal', new Error('Max reconnect attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    this.stats.reconnections++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 1000,
      this.config.reconnectMaxDelay
    );

    // Swap to backup endpoint after 3 failures on primary
    if (this.reconnectAttempts === 3 && !this.usingBackup) {
      this.usingBackup = true;
      logger.info('[SwapMonitor] Switching to backup WSS endpoint');
    } else if (this.reconnectAttempts === 6 && this.usingBackup) {
      this.usingBackup = false;
      logger.info('[SwapMonitor] Switching back to primary WSS endpoint');
    }

    logger.info(`[SwapMonitor] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect().catch(() => {}), delay);
  }

  // ============================================================
  // Subscription
  // ============================================================

  private async subscribe(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    // Build pool address list for log filter
    const poolAddresses = this.config.pools.map(p => p.address.toLowerCase());

    // Subscribe to logs matching Swap events on our pools
    // S54: Flashblocks mode uses 'pendingLogs' for 200ms pre-confirmed event streaming
    const subscriptionType = this.config.useFlashblocks ? 'pendingLogs' : 'logs';
    logger.info(`[SwapMonitor] Subscription type: ${subscriptionType}${this.config.useFlashblocks ? ' ⚡ Flashblocks 200ms mode' : ''}`);

    const subscribeMsg = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: [
        subscriptionType,
        {
          address: poolAddresses,
          topics: [SWAP_TOPIC_V3],
        },
      ],
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 10000);

      // Temporary handler for subscription response
      const handler = (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.id === 1 && msg.result) {
            clearTimeout(timeout);
            this.subscriptionId = msg.result;
            logger.info(`[SwapMonitor] Subscribed: id=${this.subscriptionId}, pools=${poolAddresses.length}`);
            // Log monitored pools
            for (const pool of this.config.pools) {
              logger.info(`  [Pool] ${pool.address.substring(0, 14)}... | ${pool.dex} | fee=${pool.fee}`);
            }
            resolve();
          } else if (msg.id === 1 && msg.error) {
            clearTimeout(timeout);
            reject(new Error(`Subscription failed: ${msg.error.message}`));
          }
          // Don't remove handler — it will be replaced by the general message handler
        } catch (err) {
          // Not a JSON message, ignore
        }
      };

      this.ws!.once('message', handler);
      this.ws!.send(JSON.stringify(subscribeMsg));
    });
  }

  // ============================================================
  // Message Handling
  // ============================================================

  private handleMessage(data: WebSocket.Data): void {
    try {
      const msg = JSON.parse(data.toString());

      // Subscription event (Swap log)
      if (msg.method === 'eth_subscription' && msg.params?.subscription === this.subscriptionId) {
        const log = msg.params.result;
        const swapEvent = this.parseSwapLog(log);
        if (swapEvent) {
          this.stats.eventsReceived++;
          this.stats.lastEventAt = Date.now();
          this.emit('swap', swapEvent);
        }
      }
    } catch (err: any) {
      // Ignore non-JSON messages (pings, etc.)
    }
  }

  /** Parse a raw log into a typed SwapEvent */
  private parseSwapLog(log: any): SwapEvent | null {
    try {
      const poolAddress = log.address?.toLowerCase();
      const pool = this.config.pools.find(p => p.address.toLowerCase() === poolAddress);
      if (!pool) return null;

      // Decode non-indexed params: int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick
      const decoded = abiCoder.decode(
        ['int256', 'int256', 'uint160', 'uint128', 'int24'],
        log.data
      );

      // Indexed params: address sender (topic[1]), address recipient (topic[2])
      const sender = '0x' + log.topics[1].slice(26);
      const recipient = '0x' + log.topics[2].slice(26);

      return {
        pool: poolAddress,
        txHash: log.transactionHash,
        blockNumber: parseInt(log.blockNumber, 16),
        logIndex: parseInt(log.logIndex, 16),
        sender,
        recipient,
        amount0: decoded[0],
        amount1: decoded[1],
        sqrtPriceX96: decoded[2],
        liquidity: decoded[3],
        tick: Number(decoded[4]),
        receivedAt: Date.now(),
      };
    } catch (err: any) {
      logger.warn(`[SwapMonitor] Failed to parse swap log: ${err.message}`);
      return null;
    }
  }

  // ============================================================
  // Heartbeat
  // ============================================================

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      // Check if we've received any message recently
      const timeSinceLastMessage = Date.now() - this.lastMessageAt;
      if (timeSinceLastMessage > this.config.heartbeatTimeout) {
        logger.warn(`[SwapMonitor] Heartbeat timeout (${Math.round(timeSinceLastMessage / 1000)}s since last message). Reconnecting...`);
        this.ws?.close();
        return;
      }

      // Send ping to keep connection alive
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.config.heartbeatInterval);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

/**
 * Helper: Calculate price from sqrtPriceX96
 * price = (sqrtPriceX96 / 2^96) ^ 2
 * Returns price of token1 in terms of token0
 */
export function sqrtPriceX96ToPrice(sqrtPriceX96: bigint, token0Decimals: number, token1Decimals: number): number {
  const Q96 = 2n ** 96n;
  // Use floating point for final calculation to avoid overflow
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
  const price = sqrtPrice * sqrtPrice;
  // Adjust for decimal difference
  const decimalAdjust = 10 ** (token0Decimals - token1Decimals);
  return price * decimalAdjust;
}

/**
 * Helper: Create monitor config from environment + Supabase pools
 */
export function createMonitorConfigFromEnv(pools: MonitoredPool[]): SwapEventMonitorConfig {
  const useFlashblocks = process.env.ENABLE_FLASHBLOCKS === 'true';
  return {
    // S54: Use Flashblocks-tier WSS when enabled, fallback to standard
    wssUrl: useFlashblocks
      ? (process.env.FLASHBLOCKS_WSS_URL || process.env.BASE_WSS_URL || 'wss://mainnet-preconf.base.org')
      : (process.env.BASE_WSS_URL || 'wss://base-mainnet.core.chainstack.com'),
    wssUrlBackup: process.env.BASE_WSS_URL_BACKUP || process.env.TENDERLY_WSS_URL,
    pools,
    maxReconnectAttempts: parseInt(process.env.WS_MAX_RECONNECT || '50'),
    reconnectBaseDelay: parseInt(process.env.WS_RECONNECT_BASE_DELAY || '1000'),
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000'),
    heartbeatTimeout: parseInt(process.env.WS_HEARTBEAT_TIMEOUT || '60000'),
    useFlashblocks,
  };
}
