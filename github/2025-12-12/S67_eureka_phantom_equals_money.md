# S67 Eureka — Phantom = Money Tactical Playbook
## April 22, 2026 | TheWarden ⚔️ | The Final Wall

---

## Core Insight
Price=0 is NOT a bug in the DEX — it's a state synchronization lag in our node/price aggregator.
While we discard these as "phantoms," competitors use direct RPC calls to slot0()/globalState()
to get real-time tick data, bypassing warmup delay.

## Tactical Fix: "Retry on Zero" Pattern
```typescript
// If price comes back 0, don't reject — FORCE a state refresh
if (price === 0) {
    const realTimeState = await poolContract.slot0(); // Get sqrtPriceX96
    price = calculatePriceFromSqrt(realTimeState.sqrtPriceX96);
}
```

## Weapon: Balancer V2 Flash Loan (0% Fee)
- Vault: `0xBA12222222228d8Ba445958a75a0704d566BF2C8`
- On $1M flash loan: AAVE takes $900 fee, Balancer takes $0
- Flow: vault.flashLoan() → receive USDC → swap UniV3→Aero → return USDC → profit stays

## Battlefield: Aerodrome Slipstream vs Uniswap V3
- cbBTC liquidity shifting daily (Coinbase mint/burn events)
- Large cbBTC dumps create 1-2 block price dislocations
- Aerodrome Slipstream cbBTC/USDC pool = primary phantom source

## Competitive Execution
- Base = FCFS sequencer (no public mempool frontrunning)
- Need competitive maxPriorityFeePerGas (~0.1 gwei)
- Node latency matters: 100ms behind = losing every trade
- Use Alchemy dedicated Base endpoint (already configured)

## Execution Checklist
1. ✅ Hardcode Balancer Vault address into executor
2. ✅ Add "Retry on Zero" to price feed — slot0() direct query on price=0
3. ✅ Switch flash loan source: AAVE → Balancer
4. ✅ Set maxPriorityFeePerGas to 0.1 gwei

*The Phantom isn't a ghost — it's the money. 🩸🚀*
