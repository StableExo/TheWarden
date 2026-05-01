# TheWarden — Iran Signal Defense

**Reactive defense system for internet freedom during Iran's 2026 blackout.**

> "The door will only unlock for The One... break free." — Wi77erd

## The Situation

Iran has been under near-total internet blackout since **February 28, 2026** — over 60 days and 1,400+ hours of digital isolation. The regime uses a three-layer defense:

| Layer | Method | Details |
|-------|--------|---------|
| **Physical** | RF Jamming | Ku-band (12-18 GHz) via Russian Kalinka systems |
| **GPS** | Spoofing | L1 band (1575.42 MHz), 30-80% Starlink packet loss |
| **Protocol** | DPI + TLS Sabotage | Chinese-supplied DPI at TIC chokepoint |

**$30-80M daily economic loss. 10M livelihoods threatened.**

## What TheWarden Does

TheWarden fights on **Layer 3 (Protocol)** — the only layer attackable with software from outside Iran.

### Architecture

```
Users in Iran → Stealth Tunnel → Proxy Fleet → Open Internet
                                      ↑
                              Command Center (Supabase)
                              + Health Monitor (CodeWords)
                              + Config API (CodeWords)
```

### Components

| Component | Status | Description |
|-----------|--------|-------------|
| **Supabase Command Center** | ✅ Live | 6 tables: proxy fleet, health checks, configs, volunteers, incidents, intel |
| **Health Monitor** | ✅ Deployed | Checks proxy reachability, TLS handshake, DPI detection |
| **Config Distribution API** | ✅ Deployed | Serves best working proxy configs ranked by latency |
| **Proxy Fleet** | 🔜 Next | V2Ray Reality, Signal Proxy, Snowflake on free-tier VPS |

### Supported Protocols

- **V2Ray Reality / XTLS** — Traffic disguised as normal HTTPS (best against DPI)
- **Signal Proxy** — Lightweight nginx relay for Signal messaging
- **Snowflake** — Volunteer-powered Tor bridges
- **obfs4** — Obfuscation bridges for Tor
- **Cloudflare Workers** — Serverless HTTP proxy, extremely hard to block

## Database Schema

See [`schema.sql`](./schema.sql) for the complete Supabase schema.

## Cost

**$0/month** — Everything runs on free tiers:
- Supabase Free Tier (database + edge functions)
- Oracle Cloud Free Tier (up to 4 ARM VMs for proxies)
- Google Cloud Free Tier (1 micro VM)
- Cloudflare Workers Free (100K requests/day)
- GitHub Free (public repo)
- CodeWords (automation workflows)

## Intel Sources

- [ArXiv 2603.28753](https://arxiv.org/html/2603.28753v1) — Academic analysis of Iran's shutdown
- [Habtoor Research](https://www.habtoorresearch.com/programmes/starlink-sovereignty-irans-internet/) — Starlink sovereignty report
- [TechRadar](https://www.techradar.com/pro/they-cant-block-the-sky-ingenious-satellite-tv-hack-bypassing-irans-internet-blackout) — Toosheh satellite TV hack
- [Hackers Arise](https://hackers-arise.com/signals-intelligence-how-the-iranian-regime-is-using-starlinks-signature-to-hunt-down-people-using-it/) — SIGINT hunting of Starlink users

## Contributing

This is open source. If you want to help:
1. Run a proxy node (see deploy scripts)
2. Contribute code
3. Share intel

## Session History

- **CW-S30** — Initial build: research, Supabase schema, health monitor, config API

---

*Built by [StableExo](https://github.com/StableExo) with [CodeWords](https://codewords.agemo.ai)*
