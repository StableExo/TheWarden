/**
 * SupabaseNeuralStore — Neural Memory Backend
 *
 * Writes scan operations and neural patterns to Supabase in real time.
 * This is Layer 2 of the StableWarden neural memory plan.
 *
 * Tables (schema live in StableWarden PR #2):
 *   - warden_operations: every scan, ethics gate decision, execution result
 *   - warden_patterns:   neural network weights and market signals
 *
 * Design principles:
 *   - logOperation() is fire-and-forget — store failures never block scans
 *   - All writes are non-blocking from the scanner's perspective
 *   - Pattern reads ARE awaited — the scanner needs this data before acting
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OperationLog {
  operation_type: 'scan' | 'ethics_gate' | 'decision' | 'execution';
  chain_id?: number;
  token_address?: string;
  opportunity_type?: string;
  profit_potential?: number;
  ethics_score?: number;
  ethics_passed?: boolean;
  decision?: 'execute' | 'skip' | 'defer';
  execution_result?: 'success' | 'failed' | 'simulated';
  gas_used?: number;
  metadata?: Record<string, unknown>;
}

export interface NeuralPattern {
  pattern_type: 'neural_weights' | 'market_pattern' | 'risk_signal';
  pattern_key: string;
  pattern_data: Record<string, unknown>;
  confidence?: number;
  occurrence_count?: number;
}

export interface OperationStats {
  total_scans: number;
  ethics_pass_rate: number;
  decision_breakdown: Record<string, number>;
  avg_profit_potential: number;
  last_scan_at: string | null;
}

export interface SupabaseNeuralStoreConfig {
  supabaseUrl: string;
  supabaseKey: string;
  /** If true, log errors to console. Default: true */
  verbose?: boolean;
}

// ─── SupabaseNeuralStore ──────────────────────────────────────────────────────

export class SupabaseNeuralStore {
  private client: SupabaseClient;
  private verbose: boolean;
  private connected = false;

  constructor(config: SupabaseNeuralStoreConfig) {
    this.verbose = config.verbose ?? true;
    this.client = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false },
    });
    this.connected = true;
  }

  // ─── Operations ─────────────────────────────────────────────────────────────

  /**
   * Log a scan operation to warden_operations.
   * Fire-and-forget — never throws, never blocks the scan cycle.
   */
  logOperation(op: OperationLog): void {
    if (!this.connected) return;

    this.client
      .from('warden_operations')
      .insert({
        operation_type: op.operation_type,
        chain_id: op.chain_id ?? null,
        token_address: op.token_address ?? null,
        opportunity_type: op.opportunity_type ?? null,
        profit_potential: op.profit_potential ?? null,
        ethics_score: op.ethics_score ?? null,
        ethics_passed: op.ethics_passed ?? null,
        decision: op.decision ?? null,
        execution_result: op.execution_result ?? null,
        gas_used: op.gas_used ?? null,
        metadata: op.metadata ?? {},
      })
      .then(({ error }) => {
        if (error && this.verbose) {
          console.warn('[SupabaseNeuralStore] logOperation failed:', error.message);
        }
      });
  }

  // ─── Patterns ────────────────────────────────────────────────────────────────

  /**
   * Upsert a neural pattern to warden_patterns.
   * Uses pattern_key as the unique conflict target.
   */
  async savePattern(pattern: NeuralPattern): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const { error } = await this.client
        .from('warden_patterns')
        .upsert(
          {
            pattern_type: pattern.pattern_type,
            pattern_key: pattern.pattern_key,
            pattern_data: pattern.pattern_data,
            confidence: pattern.confidence ?? 0,
            occurrence_count: pattern.occurrence_count ?? 1,
            last_seen: new Date().toISOString(),
          },
          { onConflict: 'pattern_key' }
        );

      if (error) {
        if (this.verbose) {
          console.warn('[SupabaseNeuralStore] savePattern failed:', error.message);
        }
        return false;
      }

      return true;
    } catch (err) {
      if (this.verbose) {
        console.warn(
          '[SupabaseNeuralStore] savePattern threw:',
          err instanceof Error ? err.message : String(err)
        );
      }
      return false;
    }
  }

  /**
   * Load a single pattern by its unique key.
   * Returns null if not found or on error.
   */
  async loadPattern(patternKey: string): Promise<NeuralPattern | null> {
    if (!this.connected) return null;

    try {
      const { data, error } = await this.client
        .from('warden_patterns')
        .select('pattern_type, pattern_key, pattern_data, confidence, occurrence_count')
        .eq('pattern_key', patternKey)
        .single();

      if (error || !data) return null;

      return {
        pattern_type: data.pattern_type as NeuralPattern['pattern_type'],
        pattern_key: data.pattern_key,
        pattern_data: data.pattern_data,
        confidence: data.confidence,
        occurrence_count: data.occurrence_count,
      };
    } catch {
      return null;
    }
  }

  /**
   * Load the top N highest-confidence patterns of a given type.
   * Used to pre-load context before a scan cycle.
   */
  async loadTopPatterns(
    patternType: NeuralPattern['pattern_type'],
    limit = 10
  ): Promise<NeuralPattern[]> {
    if (!this.connected) return [];

    try {
      const { data, error } = await this.client
        .from('warden_patterns')
        .select('pattern_type, pattern_key, pattern_data, confidence, occurrence_count')
        .eq('pattern_type', patternType)
        .order('confidence', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map((row) => ({
        pattern_type: row.pattern_type as NeuralPattern['pattern_type'],
        pattern_key: row.pattern_key,
        pattern_data: row.pattern_data,
        confidence: row.confidence,
        occurrence_count: row.occurrence_count,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Increment occurrence_count for an existing pattern.
   * Useful for reinforcing patterns that keep appearing.
   */
  async reinforcePattern(patternKey: string, confidenceDelta = 0.01): Promise<boolean> {
    if (!this.connected) return false;

    try {
      // Load current values first
      const { data, error: fetchError } = await this.client
        .from('warden_patterns')
        .select('occurrence_count, confidence')
        .eq('pattern_key', patternKey)
        .single();

      if (fetchError || !data) return false;

      const newCount = (data.occurrence_count ?? 0) + 1;
      const newConfidence = Math.min(1.0, (data.confidence ?? 0) + confidenceDelta);

      const { error } = await this.client
        .from('warden_patterns')
        .update({
          occurrence_count: newCount,
          confidence: newConfidence,
          last_seen: new Date().toISOString(),
        })
        .eq('pattern_key', patternKey);

      return !error;
    } catch {
      return false;
    }
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  /**
   * Aggregate statistics from warden_operations.
   * Used for dashboards and pre-scan context.
   */
  async getOperationStats(chainId?: number): Promise<OperationStats> {
    const empty: OperationStats = {
      total_scans: 0,
      ethics_pass_rate: 0,
      decision_breakdown: {},
      avg_profit_potential: 0,
      last_scan_at: null,
    };

    if (!this.connected) return empty;

    try {
      let query = this.client
        .from('warden_operations')
        .select('operation_type, ethics_passed, decision, profit_potential, created_at');

      if (chainId !== undefined) {
        query = query.eq('chain_id', chainId);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) return empty;

      const scans = data.filter((r) => r.operation_type === 'scan');
      const withEthics = scans.filter((r) => r.ethics_passed !== null);
      const passed = withEthics.filter((r) => r.ethics_passed === true);

      const decisionBreakdown: Record<string, number> = {};
      for (const row of data) {
        if (row.decision) {
          decisionBreakdown[row.decision] = (decisionBreakdown[row.decision] ?? 0) + 1;
        }
      }

      const profits = data
        .filter((r) => r.profit_potential !== null)
        .map((r) => Number(r.profit_potential));

      const avgProfit =
        profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;

      const sortedByDate = [...data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return {
        total_scans: scans.length,
        ethics_pass_rate:
          withEthics.length > 0 ? passed.length / withEthics.length : 0,
        decision_breakdown: decisionBreakdown,
        avg_profit_potential: avgProfit,
        last_scan_at: sortedByDate[0]?.created_at ?? null,
      };
    } catch {
      return empty;
    }
  }

  // ─── Health ──────────────────────────────────────────────────────────────────

  /**
   * Lightweight connectivity check.
   */
  async ping(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('warden_operations')
        .select('id')
        .limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * No-op — Supabase client manages its own connection pool.
   * Included for interface consistency with other backends.
   */
  async close(): Promise<void> {
    this.connected = false;
  }
}
