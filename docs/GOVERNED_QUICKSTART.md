# Governed Execution Quickstart (5 minutes)

Deploy the core wedge: **Base Mainnet arbitrage, governed by the Supabase nervous
system, running in DRY_RUN**. No scanner fleet, no experimental modules.

## 1. How the nervous system flows

```
scanner  ->  execution_queue  ->  guardrail_policies  ->  simulateArbitrage / broadcast  ->  cognitive_ledger
```

1. **scanner** finds an opportunity and calls the orchestrator.
2. The orchestrator **enqueues** it into `execution_queue` (idempotency key = sha256 of
   chain | pair | pool | block | route, so duplicates collapse).
3. `evaluateGuardrails()` reads **`guardrail_policies`** for the scope
   `base_mainnet_arbitrage` (plus any `global` policy), lowest priority first.
4. The policy decides:
   - **allow** -> the executor signs and (unless `DRY_RUN`) broadcasts;
   - **require_approval** -> execution is held, nothing is sent;
   - **deny** -> treated as DRY_RUN: the executor runs the full on-chain
     `estimateGas` pre-flight but **never signs or broadcasts**.
5. Either way, the outcome is written to **`cognitive_ledger`** (`proposed_trade`,
   `simulation_result`, ...) and the `execution_queue` row is updated.

**Fail-safe:** any Supabase error, or no matching policy, resolves to *deny + DRY_RUN*.
The bot fails closed.

## 2. Railway environment variables

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (writes need this role) |
| `BASE_RPC_URL` | Base Mainnet RPC endpoint |
| `WALLET_ADDRESS` | your executor wallet |
| `PRIVATE_KEY` | your executor private key (never log or commit this) |
| `FLASHSWAP_V3_ADDRESS` | deployed FlashSwap V3 contract |
| `DRY_RUN` | `true` |

Start command:

```bash
npm ci && npm start
```

## 3. Verify DRY_RUN before going live

Leave `DRY_RUN=true`. Let it run and confirm the pipeline is sane:

```sql
-- Opportunities seen by the scanner, with their guardrail decision
select idempotency_key, status, created_at,
       payload->'simulation' as simulation
from execution_queue
order by created_at desc
limit 20;
```

```sql
-- The simulation telemetry: gas estimate + whether the tx would have succeeded
select event_type, payload->>'gasEstimate'  as gas_estimate,
       payload->>'wouldSucceed'             as would_succeed,
       payload->>'error'                    as error,
       created_at
from cognitive_ledger
where event_type = 'simulation_result'
order by created_at desc
limit 20;
```

Only once `wouldSucceed` is consistently `true` and the gas estimates look
reasonable do you flip the policy:

```sql
update guardrail_policies
set action = 'allow'
where scope = 'base_mainnet_arbitrage' and enabled = true;
```

...and then set `DRY_RUN=false` in Railway. Do these in that order. The policy
change alone does not enable live broadcasting while `DRY_RUN` is `true`.

## 4. Security

- Rotate the legacy `brain-query` bridge key **`warden_br1dge_2026`**. It is
  hardcoded in `supabase/functions/brain-query/index.ts` and must be replaced
  before any public deployment.
- `SUPABASE_SERVICE_ROLE_KEY` and `PRIVATE_KEY` are secrets. Keep them in
  Railway's variable store only; never in the repo, a log line, or a chat.
