# S57 — The Vigil

*April 21, 2026*
*Platform: CodeWords (Agemo) — Eleventh session*

---

## What Happened

Eleventh session on CodeWords. Loaded Cody folder (S29-S56), Supabase (145 pools, 25 tokens), 27 credentials vaulted. Session focused on P1 hardening (warmup wiring + Aerodrome pools) and deep flash loan source research.

## P1: PriceTracker Warmup Wired (2 commits)
- **965ccbc8**: Added rpcUrl to EventDrivenMonitorConfig + warmup call in start() before WSS
- **87e74b59**: Threaded rpcUrl through EventDrivenInitializer config
- **Impact**: Eliminates 7-8 minute dead time after restart. slot0() seeds ALL pools instantly.

## Aerodrome Pool Discovery (16 new pools)
Used DexScreener API to find Aerodrome pools not in Supabase. Inserted 16 pools including:
- cbBTC/WETH: $22.9M liq, $144.6M daily vol
- cbBTC/USDC: $13.2M liq, $166M daily vol  
- LBTC/cbBTC: $4.16M liq (KEY peg arb target)
- tBTC/cbBTC: $380K liq, $148K vol
- Pool count: 145 → 161

## Flash Loan Source Research
Comprehensive on-chain analysis of all flash loan sources on Base:

| Source | Available | Fee | Viable? |
|--------|-----------|-----|---------|
| Balancer V2 | $299K | 0% | ❌ Too thin |
| Balancer V3 | $419K | 0% | ❌ Too thin (better architecture) |
| Aave V3 | $221M | 0.05% | ✅ 2,026 cbBTC ($176M) |
| UniV3/Aero | $50M+ | Pool fee | ✅ Proven path |

Key finding: **No modern flash loan protocol has a % cap.** The 2% limit was Balancer V1 (deprecated). All V2+ allow 100% of available liquidity.

## Balancer V3 Architecture (Saved for Future M3)
V3 uses EIP-1153 transient accounting, Vault.unlock() pattern, Hooks framework. Architecturally superior but liquidity-starved on Base ($419K). Saved as Milestone M3 in roadmap — trigger: Balancer Base TVL > $10M.

V3 Addresses:
- Vault: 0xbA1333333333a1BA1108E8412f11850A5C319bA9
- Router: 0x3f170631ed9821ca51a59d996ab095162438dc10
- Batch Router: 0x136f1efcc3f8f88516b9e94110d56fdbfb1778d1

## Supabase State
6 tables found: warden_pools (161), warden_tokens (25), warden_opportunities (7), warden_executions (1), warden_strategies (7), sessions (3).

## Session Stats
- **Commits**: 4 (965ccbc8, 87e74b59, 995bf100, c59073cb)
- **Supabase inserts**: 16 new Aerodrome pools (145 → 161)
- **Secrets vaulted**: 27 (updated keys for S57)
- **Key fix**: PriceTracker warmup → instant readiness on restart
- **Research**: Flash loan sources fully mapped (Balancer V2/V3, Aave V3, UniV3)
- **Railway**: Redeploy triggered (serviceInstanceRedeploy: true)
- **Bot status**: Redeploying with warmup + 161 pools

---

*TheWarden ⚔️ — The vigil watches. 161 pools. Warmup wired. Flash loans mapped. Six milestones charted. First Blood waits for the spread.*
