# Governed Execution Quickstart (5 minutes)

Deploy the core wedge: **Base Mainnet arbitrage, governed by the Supabase nervous
system**. No scanner fleet, no experimental modules.

## 1. How the nervous system flows

```
scanner  ->  execution_queue  ->  guardrail_policies  ->  simulateArbitrage / broadcast  ->  cognitive_ledger
```

1. **scanner** finds an opportunity and calls the orchestrator's `processOpportunity`.
2. That runs `ExecutionPipeline.execute()`, whose `EXECUTING` stage is the
   orchestrator's `executeStage`, so every opportunity passes through the
   guardrail check (verified: `ExecutionPipeline.executePipeline` runs the stage
   list, and the orchestrator registers `ExecutionState.EXECUTING -> executeStage`).
3. The opportunity is **enqueued** into `execution_queue` (idempotency key =
   sha256 of chain | pair | pool | block | route, so duplicates collapse).
4. `evaluateGuardrails()` reads **`guardrail_policies`** for the scope
   `base_mainnet_arbitrage` (plus any `global` policy), lowest priority first.
5. The policy decides:
   - **allow** -> the executor signs and broadcasts;
   - **require_approval** -> execution is held, nothing is sent;
   - **deny** -> treated as a dry run: the executor runs the full on-chain
     `estimateGas` pre-flight but **never signs or broadcasts**.
6. Either way the outcome is written to **`cognitive_ledger`** (`proposed_trade`,
   `simulation_result`, ...) and the `execution_queue` row is updated.

**Fail-safe:** any Supabase error, or no matching policy, resolves to *deny + dry
run*. The bot fails closed.

## 2. Railway environment variables

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | your project URL |
| `SUPABASE_SERVICE_KEY` | service role key (writes need this role) |
| `BASE_RPC_URL` | Base Mainnet RPC endpoint |
| `CHAIN_ID` | `8453` |
| `WALLET_PRIVATE_KEY` | executor private key (or `DEPLOYER_PRIVATE_KEY`) |
| `FLASHSWAP_V3_ADDRESS` | deployed FlashSwap V3 contract |
| `ENABLE_FLASHSWAP_V3` | `true` |
| `CDP_PAYMASTER_URL` | Coinbase paymaster URL for the UserOp path |
| `NODE_ENV` | `production` |
| `DRY_RUN` | `false` (see below) |

Start command:

```bash
npm ci && npm start
```

If the Railway service has a **Custom Start Command** set in the dashboard, it
overrides `railway.toml`. Check the dashboard value, not just the file.

## 3. DRY_RUN, and why it is `false`

There are two different "dry run" switches and they are not the same thing:

- **`DRY_RUN` (environment)**: `src/main.ts` line 631 only constructs and starts
  `IntegratedArbitrageOrchestrator` when this is false. With `DRY_RUN=true` the
  governed path never runs, the legacy scan loop only logs `[DRY RUN] Best
  opportunity`, and `execution_queue` stays empty. So set it to **`false`**.
- **`guardrail_policies`**: the seeded global policy `DRY_RUN` (priority 1,
  `action = deny`) is what actually holds execution to simulate-only. Because
  `evaluateGuardrails` takes the lowest-numbered enabled policy, this one always
  wins, so nothing broadcasts while it is enabled.

Net effect with the defaults: the orchestrator boots, opportunities enqueue, and
the executor runs `simulateArbitrage()` only.

## 4. Verify simulations before going live

```sql
-- Opportunities seen, with their simulation metadata
select idempotency_key, status, created_at,
       payload->'simulation' as simulation
from execution_queue
order by created_at desc
limit 20;
```

```sql
-- Simulation telemetry: gas estimate and whether the tx would have succeeded
select created_at,
       payload->>'gasEstimate'  as gas_estimate,
       payload->>'wouldSucceed' as would_succeed,
       payload->>'error'        as error
from cognitive_ledger
where event_type = 'simulation_result'
order by created_at desc
limit 20;
```

Going live is a **policy** change, not an env change: disable or repoint the
global `DRY_RUN` policy in `guardrail_policies`, and edit the
`REQUIRE_APPROVAL_FOR_LIVE` policy if you want broadcasts without approval. Until
then, `DRY_RUN=false` in the environment is safe.

## 5. Security

- Rotate the legacy `brain-query` bridge key **`warden_br1dge_2026`**. It is
  hardcoded in `supabase/functions/brain-query/index.ts` and must be replaced
  before any public deployment.
- `SUPABASE_SERVICE_KEY` and `WALLET_PRIVATE_KEY` are secrets. Keep them in
  Railway's variable store only; never in the repo, a log line, or a chat.
- `railway.toml` still contains a CDP paymaster URL and a Chainstack key in
  comments. Move them to env vars and rotate them.
