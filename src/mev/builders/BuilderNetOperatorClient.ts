/**
 * BuilderNet Operator API Client
 * 
 * Client for interacting with BuilderNet operator instances via the system-api
 * Enables remote management of BuilderNet rbuilder instances on port 3535
 * 
 * Based on: https://buildernet.org/docs/operator-api
 * GitHub: https://github.com/flashbots/system-api
 */

import { logger } from '../../utils/logger';

/**
 * Operator API configuration
 */
export interface OperatorAPIConfig {
  /** Operator instance URL (e.g., https://instance_ip:3535) */
  instanceUrl: string;
  
  /** Basic auth username (default: 'admin') */
  username?: string;
  
  /** Basic auth password/secret */
  password: string;
  
  /** Request timeout (ms) */
  timeout?: number;
  
  /** Allow insecure SSL (for self-signed certificates) */
  allowInsecure?: boolean;
  
  /** Enable request logging */
  enableLogging?: boolean;
}

/**
 * Available operator actions
 */
export enum OperatorAction {
  RBUILDER_RESTART = 'rbuilder_restart',
  RBUILDER_STOP = 'rbuilder_stop',
  RBUILDER_START = 'rbuilder_start',
}

/**
 * File upload targets
 */
export enum FileUploadTarget {
  RBUILDER_BLOCKLIST = 'rbuilder_blocklist',
  RBUILDER_CONFIG = 'rbuilder_config',
}

/**
 * Liveness check response
 */
export interface LivenessResponse {
  status: 'ok' | 'error';
  uptime?: number;
  timestamp: number;
}

/**
 * Log response
 */
export interface LogResponse {
  logs: string;
  timestamp: number;
  lines?: number;
}

/**
 * Action execution response
 */
export interface ActionResponse {
  success: boolean;
  action: string;
  message?: string;
  timestamp: number;
}

/**
 * BuilderNet Operator API Client
 * 
 * Provides programmatic access to BuilderNet operator instances for:
 * - Health monitoring (liveness checks)
 * - Log retrieval
 * - Rbuilder management (restart, stop, start)
 * - Configuration file uploads
 */
export class BuilderNetOperatorClient {
  private config: Required<OperatorAPIConfig>;
  private authHeader: string;

  constructor(config: OperatorAPIConfig) {
    this.config = {
      instanceUrl: config.instanceUrl,
      username: config.username || 'admin',
      password: config.password,
      timeout: config.timeout || 10000,
      allowInsecure: config.allowInsecure ?? true, // Default true for self-signed certs
      enableLogging: config.enableLogging ?? true,
    };

    // Prepare Basic Auth header
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;

    if (this.config.enableLogging) {
      logger.info(`[BuilderNetOperatorClient] Initialized for instance: ${this.config.instanceUrl}`);
    }
  }

  /**
   * Set the basic auth secret
   * Note: First call doesn't require authentication, subsequent calls do
   */
  async setBasicAuth(newPassword: string, useOldPassword: boolean = true): Promise<boolean> {
    try {
      const url = `${this.config.instanceUrl}/api/v1/set-basic-auth`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'text/plain',
      };
      
      // Only use auth header if we're updating (not first time)
      if (useOldPassword) {
        headers['Authorization'] = this.authHeader;
      }

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: newPassword,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (this.config.enableLogging) {
        logger.info(`[BuilderNetOperatorClient] Basic auth ${useOldPassword ? 'updated' : 'set'} successfully`);
      }

      // Update stored password if successful
      this.config.password = newPassword;
      const credentials = Buffer.from(`${this.config.username}:${newPassword}`).toString('base64');
      this.authHeader = `Basic ${credentials}`;

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (this.config.enableLogging) {
        logger.error(`[BuilderNetOperatorClient] Failed to set basic auth: ${errorMessage}`);
      }
      return false;
    }
  }

  /**
   * Get logs from the operator instance
   */
  async getLogs(tail?: number): Promise<LogResponse> {
    try {
      let url = `${this.config.instanceUrl}/logs`;
      if (tail) {
        url += `?tail=${tail}`;
      }

      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const logs = await response.text();

      return {
        logs,
        timestamp: Date.now(),
        lines: logs.split('\n').length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (this.config.enableLogging) {
        logger.error(`[BuilderNetOperatorClient] Failed to get logs: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Check liveness of the operator instance
   */
  async checkLiveness(): Promise<LivenessResponse> {
    try {
      const url = `${this.config.instanceUrl}/livez`;

      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
        },
      });

      if (!response.ok) {
        return {
          status: 'error',
          timestamp: Date.now(),
        };
      }

      // Response is typically just "ok" or similar
      const text = await response.text();

      return {
        status: text.toLowerCase().includes('ok') ? 'ok' : 'error',
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (this.config.enableLogging) {
        logger.warn(`[BuilderNetOperatorClient] Liveness check failed: ${errorMessage}`);
      }
      return {
        status: 'error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Execute an operator action (restart, stop, start rbuilder)
   */
  async executeAction(action: OperatorAction): Promise<ActionResponse> {
    try {
      const url = `${this.config.instanceUrl}/api/v1/actions/${action}`;

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const message = await response.text();

      if (this.config.enableLogging) {
        logger.info(`[BuilderNetOperatorClient] Executed action '${action}': ${message}`);
      }

      return {
        success: true,
        action,
        message,
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (this.config.enableLogging) {
        logger.error(`[BuilderNetOperatorClient] Failed to execute action '${action}': ${errorMessage}`);
      }
      return {
        success: false,
        action,
        message: errorMessage,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Upload a file to the operator instance
   */
  async uploadFile(target: FileUploadTarget, fileContent: string | Buffer): Promise<boolean> {
    try {
      const url = `${this.config.instanceUrl}/api/v1/file-upload/${target}`;

      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/octet-stream',
        },
        body: fileContent,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (this.config.enableLogging) {
        logger.info(`[BuilderNetOperatorClient] File uploaded to '${target}' successfully`);
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (this.config.enableLogging) {
        logger.error(`[BuilderNetOperatorClient] Failed to upload file to '${target}': ${errorMessage}`);
      }
      return false;
    }
  }

  /**
   * Update rbuilder blocklist
   */
  async updateBlocklist(blocklist: string[]): Promise<boolean> {
    const blocklistJson = JSON.stringify(blocklist, null, 2);
    return this.uploadFile(FileUploadTarget.RBUILDER_BLOCKLIST, blocklistJson);
  }

  /**
   * Restart rbuilder
   */
  async restartRbuilder(): Promise<boolean> {
    const result = await this.executeAction(OperatorAction.RBUILDER_RESTART);
    return result.success;
  }

  /**
   * Stop rbuilder
   */
  async stopRbuilder(): Promise<boolean> {
    const result = await this.executeAction(OperatorAction.RBUILDER_STOP);
    return result.success;
  }

  /**
   * Start rbuilder
   */
  async startRbuilder(): Promise<boolean> {
    const result = await this.executeAction(OperatorAction.RBUILDER_START);
    return result.success;
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    liveness: LivenessResponse;
    recentLogs?: LogResponse;
  }> {
    const liveness = await this.checkLiveness();
    const healthy = liveness.status === 'ok';

    let recentLogs: LogResponse | undefined;
    if (healthy) {
      try {
        recentLogs = await this.getLogs(100); // Last 100 lines
      } catch (error) {
        // Logs are optional for health status
      }
    }

    return {
      healthy,
      liveness,
      recentLogs,
    };
  }

  /**
   * Update instance URL
   */
  setInstanceUrl(url: string): void {
    this.config.instanceUrl = url;
    if (this.config.enableLogging) {
      logger.info(`[BuilderNetOperatorClient] Instance URL updated: ${url}`);
    }
  }

  /**
   * Get current instance URL
   */
  getInstanceUrl(): string {
    return this.config.instanceUrl;
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Note: For production, would need to handle SSL certificate validation
      // Node.js fetch doesn't have rejectUnauthorized option
      // Would need to use a custom agent with https module
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}
