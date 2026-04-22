# Base L2 Execution Reality — No Bribes, Only Speed
## S67 Intel | April 22, 2026 | TheWarden ⚔️

---

## CRITICAL: Forget L1 Thinking

| Ethereum L1 | Base L2 |
|-------------|---------|
| Public mempool → sandwich risk | **NO public mempool** — all txs go to Coinbase sequencer |
| Flashbots Protect / Titan / Rsync bundles | **None exist on Base** — no sendPrivateTransaction |
| MEV-Boost auction → bribe builders | **FCFS sequencer** — no reordering, no bribes |
| Win by $$$ (gas tips) | **Win by ms (latency)** |

## 1. Base IS the Private Mempool

- Every tx → Coinbase's private sequencer pool
- No public mempool = no sandwich attacks structurally possible
- No need to "hide" transactions
- Just need to reach sequencer FIRST

## 2. Flashbots Role on Base

- Flashbots built the sequencer infrastructure (Rollup-Boost, op-rbuilder)
- But Coinbase is sole operator — no external builder marketplace
- No BuilderNet, no MEV-Boost auction on Base
- **Flashbots = engine, Coinbase = driver**

## 3. FCFS + Priority Fees (NOT PBA)

- Sequencer orders by **timestamp received** + nonce ordering
- **Cannot bribe** sequencer to reorder
- Two bots spot same cbBTC arb → winner = whose packets arrive first
- Priority fees are tiebreakers, not auction bids
- The playing field is FLAT — no one can out-bribe you, only out-ping you

## 4. Execution Strategy: Networking > Bribing

### ❌ DON'T
- Use public RPCs for tx submission (adds 100s of ms)
- Look for Flashbots relay / Titan endpoint
- Try sendPrivateTransaction or eth_sendBundle

### ✅ DO
- **Colocation**: Container as close to Base Sequencer as possible
  - AWS **us-east-1** or **us-east-2** (historical battleground)
- **Direct peering**: Elite searchers run own op-geth/node-reth
  - Maintain direct p2p connections to sequencer mempool
- **Standard eth_sendRawTransaction** via locally peered node
  - Small maxPriorityFeePerGas (tiebreaker, not bribe)

## 5. The Full Kill Chain

1. **INGEST**: 200ms Flashblock WSS stream (Alchemy or own node)
2. **CALCULATE**: cbBTC spread locally (no chain queries)
3. **FIRE**: eth_sendRawTransaction via closest node to sequencer
4. **WIN**: First packet to Proxyd (sequencer load balancer) wins

## Railway Container Location — ACTION NEEDED

**Must verify:** Is Railway "Cody's World" in us-east?
- If yes: ✅ good position
- If no: **Redeploy to us-east-1** for minimum latency to Base sequencer
- Long-term: Consider dedicated node (op-geth/reth) for direct peering

## Competitive Advantage Tiers

| Tier | Strategy | Latency | Cost |
|------|----------|---------|------|
| 1 (Elite) | Own Reth node, direct sequencer peering | <10ms | $$$$ |
| 2 (Strong) | Alchemy dedicated + us-east-1 container | ~50ms | $$ |
| 3 (Current) | Alchemy shared + Railway (unknown region) | ~100-200ms | $ |

**Our target: Tier 2** — Alchemy WSS + Railway us-east container
**Future: Tier 1** — Own node + direct peering (when profitable enough)

*No one can out-bribe you. They can only out-ping you. Optimize latency and print. ⚔️*
