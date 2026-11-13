/**
 * GovernedExecution
 *
 * Single chokepoint that routes arbitrage opportunities through the Supabase
 * "nervous system": it enqueues work in `execution_queue`, records a
 * `proposed_trade` event in `cognitive_ledger`, and evaluates live-execution
 * permission from `guardrail_policies`.
 *
 * FAIL-SAFE BY DESIGN: if Supabase is unreachable, or no policy applies, the
 * decision defaults to dry-run (never a live broadcast). A network hiccup must
 * never produce an unguarded trade.
 *
 * Uses the service role key (`SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_ROLE_KEY`)
 * because writes to the governance tables require it under the new RLS model.
 */

import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export interface OpportunityInput {
  pairKey?: string;
  pool?: string;
  route?: string[];
  chainId?: number;
  blockNumber?: number | string;
  [key: string]: unknown;
}

export interface EnqueueResult {
  queued: boolean;
  id?: string;
  idempotencyKey: string;
  reason?: string;
}

export interface GuardrailDecision {
  allowLiveExecution: boolean;
  dryRun: boolean;
  requiresApproval: boolean;
  matchedPolicy?: string;
  reason: string;
}

export const DEFAULT_SCOPE = 'base_mainnet_arbitrage';

let client: SupabaseClient | null = null;

function getServiceKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function getGovernanceClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = getServiceKey();
  if (!url || !key) {
    logger.warn(
      '[GovernedExecution] SUPABASE_URL or service role key missing; governance disabled (fail-safe to dry-run).'
    );
    return null;
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/**
 * Deterministic idempotency key from route/pair/pool/block so the same
 * opportunity never queues twice.
 */
export function buildIdempotencyKey(opportunity: OpportunityInput): string {
  const basis = [
    opportunity.chainId ?? '',
    opportunity.pairKey ?? '',
    opportunity.pool ?? '',
    opportunity.blockNumber ?? '',
    Array.isArray(opportunity.route) ? opportunity.route.join('>') : '',
  ].join('|');
  return crypto.createHash('sha256').update(basis).digest('hex');
}

/**
 * Insert the opportunity into `execution_queue` and log a `proposed_trade`
 * event to `cognitive_ledger`.
 */
export async function enqueueOpportunity(opportunity: unknown): Promise<EnqueueResult> {
  const op = (opportunity ?? {}) as OpportunityInput;
  const idempotencyKey = buildIdempotencyKey(op);
  const supabase = getGovernanceClient();
  if (!supabase) return { queued: false, idempotencyKey, reason: 'supabase_unavailable' };

  try {
    const { data, error } = await supabase
      .from('execution_queue')
      .upsert(
        {
          kind: 'arbitrage',
          target: op.pairKey ?? op.pool ?? null,
          payload: op as unknown as Record<string, unknown>,
          status: 'pending',
          idempotency_key: idempotencyKey,
        },
        { onConflict: 'idempotency_key', ignoreDuplicates: true }
      )
      .select('id')
      .maybeSingle();

    if (error) throw error;

    await logLedgerEvent('proposed_trade', op, idempotencyKey);
    return { queued: true, id: data?.id as string | undefined, idempotencyKey };
  } catch (err) {
    logger.error(
      `[GovernedExecution] enqueueOpportunity failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return { queued: false, idempotencyKey, reason: 'enqueue_failed' };
  }
}

async function logLedgerEvent(
  eventType: string,
  payload: unknown,
  idempotencyKey: string
): Promise<void> {
  const supabase = getGovernanceClient();
  if (!supabase) return;
  try {
    await supabase.from('cognitive_ledger').insert({
      event_type: eventType,
      actor: 'thewarden-execution',
      payload: { ...(payload as Record<string, unknown>), idempotencyKey },
    });
  } catch (err) {
    logger.warn(
      `[GovernedExecution] cognitive_ledger log failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Read enabled policies (priority ASC) for the given scope plus `global`, and
 * decide whether a live broadcast is permitted.
 *
 *  - `deny`             -> dry-run only, never broadcast (e.g. the DRY_RUN policy)
 *  - `require_approval` -> hold; do not broadcast until approved
 *  - otherwise          -> allow
 *
 * Any failure defaults to deny + dry-run.
 */
export async function evaluateGuardrails(
  scope: string = DEFAULT_SCOPE
): Promise<GuardrailDecision> {
  const failSafe: GuardrailDecision = {
    allowLiveExecution: false,
    dryRun: true,
    requiresApproval: false,
    reason: 'guardrails_unavailable_failsafe_dry_run',
  };

  const supabase = getGovernanceClient();
  if (!supabase) return failSafe;

  try {
    const { data, error } = await supabase
      .from('guardrail_policies')
      .select('name,scope,conditions,action,priority,enabled')
      .eq('enabled', true)
      .in('scope', [scope, 'global'])
      .order('priority', { ascending: true });

    if (error) throw error;

    const policies = data ?? [];
    if (policies.length === 0) {
      return { ...failSafe, reason: 'no_guardrail_policies_failsafe_dry_run' };
    }

    for (const p of policies) {
      const action = String(p.action);
      if (action === 'deny') {
        return {
          allowLiveExecution: false,
          dryRun: true,
          requiresApproval: false,
          matchedPolicy: p.name,
          reason: `denied_by_${p.name}`,
        };
      }
      if (action === 'require_approval') {
        return {
          allowLiveExecution: false,
          dryRun: false,
          requiresApproval: true,
          matchedPolicy: p.name,
          reason: `requires_approval_${p.name}`,
        };
      }
    }

    return {
      allowLiveExecution: true,
      dryRun: false,
      requiresApproval: false,
      reason: 'allowed',
    };
  } catch (err) {
    logger.error(
      `[GovernedExecution] evaluateGuardrails failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return failSafe;
  }
}


export interface SimulationOutcome {
  gasEstimate?: string;
  wouldSucceed: boolean;
  error?: string;
}

/**
 * Mark the queue row for `idempotencyKey` as `completed` with simulation
 * metadata and log a `simulation_result` event. Used while DRY_RUN is active so
 * we still collect real telemetry without broadcasting.
 */
export async function recordSimulationResult(
  idempotencyKey: string,
  result: SimulationOutcome
): Promise<void> {
  const supabase = getGovernanceClient();
  if (!supabase) return;
  try {
    const { data } = await supabase
      .from('execution_queue')
      .select('id,payload')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    const sim = {
      simulated: true,
      gasEstimate: result.gasEstimate ?? null,
      wouldSucceed: result.wouldSucceed,
      error: result.error ?? null,
      at: new Date().toISOString(),
    };
    const payload = { ...((data?.payload as Record<string, unknown>) ?? {}), simulation: sim };

    await supabase
      .from('execution_queue')
      .update({ status: 'completed', completed_at: new Date().toISOString(), payload })
      .eq('idempotency_key', idempotencyKey);

    await supabase.from('cognitive_ledger').insert({
      event_type: 'simulation_result',
      actor: 'thewarden-execution',
      payload: { idempotencyKey, ...sim },
    });
  } catch (err) {
    logger.warn(
      `[GovernedExecution] recordSimulationResult failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
