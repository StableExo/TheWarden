# TheWarden — Repository Structure

> Last reorganized: GL-L59 (June 2026)

## 📁 Active Project Folders

| Folder | Purpose |
|--------|---------|
| `src/` | TypeScript application — arb engine, MEV, coalition bundle API |
| `contracts/` | Solidity — FlashSwapV3 (active: `0xa0709f1ccf85dc1ff2ed89ed38884e28394ddaed`) |
| `abis/` | Contract ABIs — FlashSwap, Uniswap, Aave |
| `configs/` | Chain, pool, strategy, protocol configs |
| `ethereum-mainnet/` | Chain-specific ops — builder, bundle, coalition, monitor |
| `scripts/` | Operational scripts — bitcoin puzzles, blockchain analysis, autonomous ops |

## 🧠 Intelligence

| Folder | Purpose |
|--------|---------|
| `intelligence/red_web/` | **Red Web investigation** — kill chain, victim addresses, forensic scanner, diagrams |
| `intelligence/forensics/` | General forensic tools and scan outputs |
| `intelligence/bitcoin/` | Bitcoin puzzle attack scripts (Puzzle 71, 135, 140) |
| `data/arsenals/` | Verified Base chain arb pool arsenals (S60: 40 pools, S65: 64 pools) |

## 🛠️ Infrastructure / Build

| Folder | Purpose |
|--------|---------|
| `infrastructure/` | Redis, RabbitMQ, Nginx, TimescaleDB configs |
| `docker/` | Service Dockerfiles |
| `k8s/` | Kubernetes manifests |
| `helm/` | Helm charts |
| `deployments/` | Deploy scripts, platform configs (Render, Fly, Railway) |
| `tests/` | All tests — unit, integration, forge/ |
| `verification/` | Contract verification artifacts (Etherscan/Basescan) |

## 📚 Memory / History

| Folder | Purpose |
|--------|---------|
| `.memory-exports/` | Brain export backups (pgvector snapshots) |
| `sessions/cody/` | CodeWords/Cody platform session logs (pre-Gumloop era) |
| `gumloop/` | Gumloop session date archives (2026-05+) |
| `github/` | GitHub Copilot session archives (2025-11 → 2026-05) |
| `codewords/` | CodeWords daily session archives |

## 🗃️ Archive

| Folder | Purpose |
|--------|---------|
| `_archive/` | Inactive files — speeches, old docs, log dumps |
| `archive/` | Old bitcoin research |
| `docs/archive/` | Documentation archive |

## Key Files
- `render.yaml` — Render deployment config (CoalitionBundleAPI live)
- `hardhat.config.ts` — Hardhat for Solidity compilation/testing
- `foundry.toml` — Foundry config for forge tests
- `.env.example` — All environment variables documented
- `.github/SPEED_RUN_SESSION_STARTER.md` — Boot guide for new sessions

---
*TheWarden by Taylor Marlow (@StableExo) | Karma: 660 | Brain: Nexus (Supabase)*
