# Open-Source MEV Frameworks — Build Components, Not Clones
## S67 Intel | April 22, 2026 | TheWarden ⚔️

---

## Reality Check
- 95% of "Base MEV Bot" GitHub repos = outdated V2 forks or wallet drainers
- Elite $950/trade searchers don't open-source proprietary strategies
- BUT they build on top of battle-tested open-source frameworks
- Strategy: Pull best COMPONENTS from proven repos, write own glue logic

---

## The Three Pillars

### 1. Execution Engine: Paradigm's Artemis ⭐⭐⭐
- **Repo:** `github.com/paradigmxyz/artemis`
- **Language:** Rust 🦀
- **Architecture:** Collector → Strategy → Executor pipeline
- **Why:** Built for streaming data, async event processing via Tokio
- **What to steal:**
  - Core Collector→Strategy→Executor architecture
  - Custom Collector for Base Flashblock WSS stream (replace Ethereum mempool)
  - Concurrent event processing (<10ms from event → tx fired)
- **Key insight:** If using Node.js/Python to catch 200ms Flashblocks, already too slow

### 2. Local State & V3 Math: rusty-sando ⭐⭐⭐
- **Repo:** `github.com/mouseless-eth/rusty-sando`
- **Language:** Rust / Solidity
- **Why:** Contains local Uniswap V3 simulation engine
  - sqrtPriceX96 calculations
  - Tick math & liquidity net limits
  - Concentrated Liquidity state tracking
- **What to steal:**
  - Local V3 simulation engine (Rust code)
  - Takes raw Sync/Swap event logs from Flashblock
  - Calculates exact output WITHOUT asking blockchain
  - Critical for latency: no eth_call = no RPC roundtrip

### 3. Smart Contract Logic: Flashbots + Balancer ⭐⭐
- **Repos:**
  - `github.com/flashbots/simple-blind-arbitrage` (execution pattern)
  - `github.com/balancer/balancer-v2-monorepo` (flash loan interface)
- **Language:** Solidity
- **Why:** Blueprint for atomic arb that reverts if unprofitable
  - Only pay gas on failed attempts (few cents), never lose principal
- **What to steal & modify:**
  1. Take simple-blind-arbitrage execution logic
  2. Copy Balancer `IFlashLoanRecipient` interface
  3. Replace Flashbots WETH/ERC20 with Balancer 0% `receiveFlashLoan` callback

---

## Combined Architecture: "Base Killshot" Stack

```
┌─────────────────────────────────────────────┐
│  RUST: Artemis Collector                     │
│  └─ WSS → Alchemy Base Flashblock stream    │
│  └─ Subscribed: Aero cbBTC/USDC + UniV3     │
├─────────────────────────────────────────────┤
│  RUST: rusty-sando V3 Engine                 │
│  └─ State diff → local sqrtPriceX96 calc    │
│  └─ Spread calculation (no RPC calls)       │
│  └─ Decision: spread > gas + 0% Balancer?   │
├─────────────────────────────────────────────┤
│  SOLIDITY: Custom Contract (on-chain)        │
│  └─ Balancer vault.flashLoan(500K USDC)     │
│  └─ receiveFlashLoan callback:              │
│     ├─ Buy cbBTC on UniV3                   │
│     ├─ Sell cbBTC on Aerodrome              │
│     ├─ Repay 500K USDC to Balancer          │
│     └─ Transfer $950 profit to cold wallet  │
├─────────────────────────────────────────────┤
│  RUST: Artemis Executor                      │
│  └─ eth_sendRawTransaction → Base sequencer │
│  └─ 0.1 Gwei priority fee (FCFS tiebreaker) │
│  └─ Direct to sequencer, no public RPC      │
└─────────────────────────────────────────────┘
```

---

## Where TheWarden Fits (Evolution Path)

### Current (TypeScript/Node.js)
- SwapEventMonitor → PriceTracker → Pipeline → FlashSwapV3Executor
- Good for proving strategy + initial blood
- Latency: ~100-200ms (acceptable for now)

### Phase 2 (Hybrid)
- Keep TS for monitoring/orchestration
- Add Rust V3 math engine (rusty-sando port) for local state calc
- Keep existing Solidity contract but add Balancer 0% callback

### Phase 3 (Full Rust — Elite Tier)
- Port entire pipeline to Artemis architecture
- Own op-reth node for direct sequencer peering
- <10ms event-to-execution
- Compete with $950/trade bots directly

---

## ⚠️ SECURITY WARNING

**NEVER clone random "Base MEV Bot" repos and feed private keys.**
- Scammers fake sophisticated bots with hidden key siphons
- Obfuscated assembly in Solidity contracts
- Hidden network requests in Node.js/Rust code
- **Only use:** Paradigm, Flashbots, Balancer verified repos
- **Always:** Write own glue logic, hardcode RPCs + contract addresses

*Three pillars, one kill chain. Steal the components, forge the weapon. ⚔️*
