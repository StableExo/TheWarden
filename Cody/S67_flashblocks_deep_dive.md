# Flashblocks Deep Dive — The 200ms Advantage
## S67 Intel | April 22, 2026 | TheWarden ⚔️

---

## The Core Mechanic: 200ms vs 2000ms

Normal Base: 2-second blocks. You wait for block seal, fire arb into NEXT block.
Flashblocks: Sequencer streams partial blocks every ~200ms.

**Impact:** When whale dumps cbBTC on Aerodrome, Flashblock emits in 200ms.
Your bot detects dislocation and fires arb 1.8 SECONDS before block seals.
You get executed in the SAME 2-second block window, behind the whale.

## API Architecture

### ❌ WRONG (What we had)
```
setInterval → eth_getBlockByNumber("pending") → 200ms polling
```

### ✅ RIGHT (What we need)
```
eth_subscribe → WSS stream → Flashblock partial blocks → state diffs
```

Flashblocks exposed via:
- **WebSockets (WSS)** — eth_subscribe for logs/new heads at sub-second level
- **Server-Sent Events (SSE)** — alternative streaming method
- Need provider with op-reth Flashblock streaming (Alchemy, QuickNode, own Reth node)

## Preconfirmation Specs (FCFS)

- **No reordering** — sequencer does NOT reorder by tip size
- **Preconfirmations** — cryptographically backed guarantee of inclusion order
- **Latency is God** — whoever hits sequencer first, wins
- **No gas bribes needed** — just need packet to arrive faster
- **No Flashbots/MEV-Boost** — Base has no public mempool, no external builders
- Everything goes direct to Coinbase sequencer

## Builder Strategy = Networking

- No `sendPrivateTransaction` on Base
- No block builder marketplace
- Your "builder strategy" = geographic proximity
- **AWS us-east** is the battleground (closest to Base sequencer)
- Railway hosting location matters!

## The "Killshot" Architecture

1. **LISTENER**: WSS connection → stream Swap events on:
   - Aerodrome cbBTC/USDC pool
   - UniV3 cbBTC/USDC pool

2. **TRIGGER**: 200ms Flashblock comes through → swap detected

3. **MATH**: Calculate spread LOCALLY from state diff
   - Do NOT ask chain for price
   - Use sqrtPriceX96 from Flashblock state diff

4. **EXECUTION**: If spread > gas + 0% Balancer fee → FIRE immediately
   - Competitive maxPriorityFeePerGas (not insane)
   - FCFS = first packet wins

## Competitor Edge

The $950/trade bots are likely:
- Running own Reth nodes
- Streaming Flashblocks
- Calculating state locally (not polling)
- Beating the 2-second block time

## What This Means for TheWarden

Our SwapEventMonitor ALREADY uses eth_subscribe("logs") on Alchemy WSS.
Alchemy is now Flashblock-enabled → we're already getting sub-second events!

BUT we need:
1. Verify Alchemy WSS is delivering Flashblock-speed events (not batched)
2. Calculate state locally from swap events (PriceTracker already does this)
3. Remove HTTP polling approach (unnecessary if WSS is Flashblock-enabled)
4. Ensure Railway container is in us-east (close to sequencer)

## Railway Container Location
- Check: Is "Cody's World" deployed in us-east?
- If not, redeploy to us-east-1 for minimum latency to Base sequencer

*200ms is the edge. The other bots know this. Now we do too. ⚔️*
