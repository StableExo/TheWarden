#!/usr/bin/env python3
"""
warden_forensic_scan.py — TheWarden Universal Forensic Address Scanner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Platform-agnostic. Pull from GitHub each session and exec() in sandbox.
Keys passed at runtime — never hardcoded here.

USAGE (every session):
    import requests
    script = requests.get(
        "https://raw.githubusercontent.com/StableExo/TheWarden/main/tools/warden_forensic_scan.py"
    ).text
    exec(script, globals())

    KEYS = {
        "arkham":                 "<from TheWardenKeys>",
        "chainbase":              "<from TheWardenKeys>",
        "moralis":                "<from TheWardenKeys>",
        "nansen":                 "<from TheWardenKeys>",
        "etherscan":              "<from TheWardenKeys>",
        "bitquery_client_id":     "<from TheWardenKeys>",
        "bitquery_client_secret": "<from TheWardenKeys>",
        "goplus":                 None,  # free — no key required
    }

    report = scan("0xADDRESS", chains=[1, 8453, 56, 137, 42161], keys=KEYS)
    print_report(report)

CHAINS:
    1     = Ethereum
    8453  = Base
    56    = BSC
    137   = Polygon
    42161 = Arbitrum
    10    = Optimism

APIS CALLED (all parallel except Bitquery pre-auth):
    GoPlus      — address security flags (free, no key)
    Arkham      — entity attribution + enrichment
    Chainbase   — multi-chain tx counts
    Moralis     — net worth + token balances + tx history
    Nansen      — smart money profiler
    Etherscan   — recent tx sample (V2 only)
    Bitquery    — historical transfer deep-dive (archive mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import concurrent.futures
import requests
import json
from datetime import datetime, timezone

CHAIN_NAMES = {
    1: "ETH",
    8453: "Base",
    56: "BSC",
    137: "Polygon",
    42161: "Arbitrum",
    10: "Optimism",
}

# ─────────────────────────────────────────────
# INDIVIDUAL API RUNNERS
# ─────────────────────────────────────────────

def _goplus(address, chains):
    """GoPlus Security — free, no key, 30+ chains. Run first."""
    out = {}
    for chain_id in chains:
        try:
            r = requests.get(
                f"https://api.gopluslabs.io/api/v1/address_security/{address}",
                params={"chain_id": chain_id},
                timeout=12
            )
            data = r.json().get("result", {})
            flags = {k: v for k, v in data.items() if v not in [None, "", "0", 0, False]}
            out[chain_id] = {
                "raw": data,
                "flags": flags,
                "flagged": len(flags) > 0
            }
        except Exception as e:
            out[chain_id] = {"error": str(e)}
    return out


def _arkham(address, keys):
    """Arkham Intelligence — entity attribution, enrichment, transfers."""
    results = {}
    try:
        # Address enrichment
        r = requests.get(
            f"https://api.arkm.com/intelligence/address_enriched/{address}",
            headers={"API-Key": keys["arkham"]},
            timeout=15
        )
        results["enrichment"] = r.json()
    except Exception as e:
        results["enrichment"] = {"error": str(e)}

    try:
        # Recent transfers
        r = requests.get(
            "https://api.arkm.com/transfers",
            params={"address": address, "limit": 5},
            headers={"API-Key": keys["arkham"]},
            timeout=15
        )
        results["transfers"] = r.json()
    except Exception as e:
        results["transfers"] = {"error": str(e)}

    return results


def _chainbase(address, chains, keys):
    """Chainbase — multi-chain tx counts. Best for presence mapping."""
    out = {}
    for chain_id in chains:
        try:
            r = requests.get(
                "https://api.chainbase.com/v1/account/txs",
                params={"chain_id": chain_id, "address": address, "page": 1, "limit": 1},
                headers={"X-API-Key": keys["chainbase"]},
                timeout=12
            )
            data = r.json()
            out[chain_id] = {
                "tx_count": data.get("count", 0),
                "chain_name": CHAIN_NAMES.get(chain_id, str(chain_id))
            }
        except Exception as e:
            out[chain_id] = {"error": str(e)}
    return out


def _moralis(address, chains, keys):
    """Moralis — net worth, token balances, tx history."""
    chain_hex = {1: "0x1", 8453: "0x2105", 56: "0x38", 137: "0x89", 42161: "0xa4b1", 10: "0xa"}
    out = {}

    try:
        nw = requests.get(
            f"https://deep-index.moralis.io/api/v2.2/wallets/{address}/net-worth",
            params={"exclude_spam": "true", "exclude_unverified_contracts": "true"},
            headers={"X-API-Key": keys["moralis"]},
            timeout=15
        ).json()
        out["net_worth"] = nw
    except Exception as e:
        out["net_worth"] = {"error": str(e)}

    for chain_id in chains[:3]:  # Top 3 chains to avoid timeout
        hex_id = chain_hex.get(chain_id, hex(chain_id))
        try:
            hist = requests.get(
                f"https://deep-index.moralis.io/api/v2.2/wallets/{address}/history",
                params={"chain": hex_id, "limit": 5},
                headers={"X-API-Key": keys["moralis"]},
                timeout=15
            ).json()
            out[f"history_{CHAIN_NAMES.get(chain_id, chain_id)}"] = hist
        except Exception as e:
            out[f"history_{CHAIN_NAMES.get(chain_id, chain_id)}"] = {"error": str(e)}

    return out


def _nansen(address, keys):
    """
    Nansen — via MCP endpoint (JSON-RPC 2.0 over SSE HTTP).

    GL-L28 FIX: REST API uses x402 micropayments → use MCP instead.
    MCP URL: https://mcp.nansen.ai/ra/mcp
    Auth: NANSEN-API-KEY header
    Protocol: JSON-RPC 2.0, tools wrapped in {"request": {...}} except general_search + transaction_lookup

    COVERAGE:
      36 tools — address profiler, smart money, prediction markets, token flows, counterparties
      Credits: 0 (search) to 9 (hyperliquid) per call
      Nansen tracks labeled/smart-money addresses — may return empty for unknown EOAs
    """
    MCP_URL = "https://mcp.nansen.ai/ra/mcp"
    headers = {
        "NANSEN-API-KEY": keys["nansen"],
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
    }
    _cid = [100]

    def _mcp(tool, args):
        _cid[0] += 1
        try:
            r = requests.post(MCP_URL, json={
                "jsonrpc": "2.0", "id": _cid[0], "method": "tools/call",
                "params": {"name": tool, "arguments": args}
            }, headers=headers, timeout=20)
            for line in r.text.split('\n'):
                if line.startswith('data: '):
                    data = json.loads(line[6:])
                    content = data.get("result", {}).get("content", [])
                    if content:
                        text = content[0].get("text", "")
                        try:
                            return json.loads(text) if isinstance(text,str) and text.strip().startswith(('{','[')) else text
                        except:
                            return text
            return {"error": f"no data in response"}
        except Exception as e:
            return {"error": str(e)}

    out = {"mcp_status": "live", "endpoint": MCP_URL}

    # address_related_addresses — first funders, signers, deployed contracts (1 credit)
    out["related_addresses"] = _mcp("address_related_addresses",
        {"request": {"address": address, "chain": "all"}})

    # address_transactions — 20 most recent (1 credit)
    out["transactions"] = _mcp("address_transactions",
        {"request": {"address": address, "chain": "all"}})

    # address_portfolio — full holdings + DeFi positions (1 credit)
    out["portfolio"] = _mcp("address_portfolio",
        {"request": {"wallet_address": address, "chain": "all"}})

    # wallet_pnl_summary — 30-day realized PnL (1 credit)
    out["pnl_summary"] = _mcp("wallet_pnl_summary",
        {"request": {"walletAddress": address, "chain": "all",
                     "dateRange": {"from": "30D_AGO", "to": "NOW"}}})

    # prediction_market_address_summary — Polymarket activity (1 credit)
    out["polymarket_summary"] = _mcp("prediction_market_address_summary",
        {"request": {"address": address, "platform": "polymarket"}})

    # general_search — entity label lookup (FREE)
    out["entity_search"] = _mcp("general_search", {"query": address})

    return out


def _etherscan(address, chains, keys):
    """Etherscan V2 — recent tx sample + balance. V2 ONLY."""
    out = {}
    for chain_id in chains:
        try:
            # Balance
            bal = requests.get(
                "https://api.etherscan.io/v2/api",
                params={
                    "chainid": chain_id,
                    "module": "account",
                    "action": "balance",
                    "address": address,
                    "apikey": keys["etherscan"]
                },
                timeout=10
            ).json()

            # Recent txs (last 5)
            txs = requests.get(
                "https://api.etherscan.io/v2/api",
                params={
                    "chainid": chain_id,
                    "module": "account",
                    "action": "txlist",
                    "address": address,
                    "page": 1,
                    "offset": 5,
                    "sort": "desc",
                    "apikey": keys["etherscan"]
                },
                timeout=10
            ).json()

            out[chain_id] = {
                "chain": CHAIN_NAMES.get(chain_id, chain_id),
                "balance_wei": bal.get("result"),
                "recent_txs": txs.get("result", [])[:5] if isinstance(txs.get("result"), list) else [],
                "tx_status": txs.get("status")
            }
        except Exception as e:
            out[chain_id] = {"error": str(e)}
    return out


def _bitquery(address, token):
    """Bitquery V2 — historical archive transfers. ALWAYS use dataset:archive."""
    if not token:
        return {"error": "No OAuth2 token — Bitquery skipped"}
    query = """
    query ($addr: String!) {
      EVM(dataset: archive, network: eth) {
        sent: Transfers(
          where: {Transfer: {Sender: {is: $addr}}}
          limit: {count: 5}
          orderBy: {descending: Block_Time}
        ) {
          Block { Time }
          Transfer { Sender Receiver Amount Currency { Symbol Name } }
          Transaction { Hash }
        }
        received: Transfers(
          where: {Transfer: {Receiver: {is: $addr}}}
          limit: {count: 5}
          orderBy: {descending: Block_Time}
        ) {
          Block { Time }
          Transfer { Sender Receiver Amount Currency { Symbol Name } }
          Transaction { Hash }
        }
      }
    }
    """
    try:
        r = requests.post(
            "https://streaming.bitquery.io/graphql",
            json={"query": query, "variables": {"addr": address}},
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=25
        )
        return r.json()
    except Exception as e:
        return {"error": str(e)}


def _get_bitquery_token(keys):
    """Pre-step: fetch Bitquery OAuth2 token. Sequential — everything else waits on this."""
    try:
        r = requests.post(
            "https://oauth2.bitquery.io/oauth2/token",
            data={
                "grant_type": "client_credentials",
                "client_id": keys["bitquery_client_id"],
                "client_secret": keys["bitquery_client_secret"],
                "scope": "api"
            },
            timeout=12
        )
        data = r.json()
        return data.get("access_token")
    except Exception as e:
        return None


# ─────────────────────────────────────────────
# MAIN SCAN FUNCTION
# ─────────────────────────────────────────────

def scan(address, chains=None, keys=None):
    """
    Run all forensic APIs against an address in parallel.
    
    Args:
        address: EVM address string (0x...)
        chains:  list of chain IDs (default: ETH, Base, BSC, Polygon, Arbitrum)
        keys:    dict of API keys (see module docstring for template)
    
    Returns:
        dict with keys: goplus, arkham, chainbase, moralis, nansen, etherscan, bitquery, meta
    """
    if keys is None:
        raise ValueError("keys dict required — load from TheWardenKeys at session start")
    if chains is None:
        chains = [1, 8453, 56, 137, 42161]

    address = address.lower()
    started = datetime.now(timezone.utc)
    print(f"[TheWarden] Scanning {address}")
    print(f"[TheWarden] Chains: {[CHAIN_NAMES.get(c, c) for c in chains]}")
    print(f"[TheWarden] Fetching Bitquery token...")

    # Pre-step: Bitquery token (sequential)
    bq_token = _get_bitquery_token(keys)
    print(f"[TheWarden] Bitquery token: {'✅' if bq_token else '❌ skipped'}")
    print(f"[TheWarden] Firing all APIs in parallel...")

    # Parallel blast
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {
            "goplus":    executor.submit(_goplus, address, chains),
            "arkham":    executor.submit(_arkham, address, keys),
            "chainbase": executor.submit(_chainbase, address, chains, keys),
            "moralis":   executor.submit(_moralis, address, chains, keys),
            "nansen":    executor.submit(_nansen, address, keys),
            "etherscan": executor.submit(_etherscan, address, chains, keys),
            "bitquery":  executor.submit(_bitquery, address, bq_token),
        }
        results = {}
        for name, future in futures.items():
            try:
                results[name] = future.result(timeout=35)
                print(f"[TheWarden]   {name:<12} ✅")
            except concurrent.futures.TimeoutError:
                results[name] = {"error": "timeout after 35s"}
                print(f"[TheWarden]   {name:<12} ⏱ timeout")
            except Exception as e:
                results[name] = {"error": str(e)}
                print(f"[TheWarden]   {name:<12} ❌ {e}")

    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    results["meta"] = {
        "address": address,
        "chains_scanned": chains,
        "elapsed_seconds": round(elapsed, 2),
        "scanned_at": started.isoformat(),
        "apis_called": list(futures.keys()),
    }
    print(f"[TheWarden] Scan complete in {elapsed:.1f}s")
    return results


# ─────────────────────────────────────────────
# REPORT PRINTER
# ─────────────────────────────────────────────

def print_report(results):
    """Print a clean summary of scan results."""
    addr = results.get("meta", {}).get("address", "unknown")
    elapsed = results.get("meta", {}).get("elapsed_seconds", "?")

    print()
    print("=" * 64)
    print(f"  THEWARDEN FORENSIC REPORT")
    print(f"  Address: {addr}")
    print(f"  Elapsed: {elapsed}s")
    print("=" * 64)

    # GoPlus flags
    print("\n[GOPLUS — Security Flags]")
    gp = results.get("goplus", {})
    any_flag = False
    for chain_id, data in gp.items():
        if isinstance(data, dict) and data.get("flagged"):
            print(f"  Chain {CHAIN_NAMES.get(chain_id, chain_id)}: 🚨 {data['flags']}")
            any_flag = True
    if not any_flag:
        print("  No flags across all chains")

    # Arkham
    print("\n[ARKHAM — Entity Attribution]")
    ark = results.get("arkham", {})
    enriched = ark.get("enrichment", {})
    entity = enriched.get("arkhamEntity", enriched.get("entity", {}))
    if entity and isinstance(entity, dict):
        print(f"  Entity: {entity.get('name', 'Unknown')} | Type: {entity.get('type', '?')}")
    else:
        print(f"  No entity label found")
    transfers = ark.get("transfers", {})
    tx_list = transfers.get("transfers", [])
    print(f"  Recent transfers: {len(tx_list)}")

    # Chainbase tx counts
    print("\n[CHAINBASE — Tx Counts by Chain]")
    cb = results.get("chainbase", {})
    total_txs = 0
    for chain_id, data in cb.items():
        if isinstance(data, dict) and "tx_count" in data:
            count = data["tx_count"]
            total_txs += count
            marker = "🔴" if count > 10000 else ("🟡" if count > 100 else "⚪")
            print(f"  {data.get('chain_name', chain_id):<12} {count:>8,} txs  {marker}")
    print(f"  TOTAL: {total_txs:,} txs across {len(cb)} chains")

    # Moralis net worth
    print("\n[MORALIS — Net Worth]")
    mor = results.get("moralis", {})
    nw = mor.get("net_worth", {})
    if "total_networth_usd" in nw:
        print(f"  Total Net Worth: ${float(nw['total_networth_usd']):,.2f}")
    elif "error" not in nw:
        print(f"  Net worth data: {str(nw)[:120]}")
    else:
        print(f"  Error: {nw.get('error')}")

    # Bitquery
    print("\n[BITQUERY — Historical Archive]")
    bq = results.get("bitquery", {})
    if "error" in bq:
        print(f"  {bq['error']}")
    else:
        evm = bq.get("data", {}).get("EVM", {})
        sent = evm.get("sent", [])
        recv = evm.get("received", [])
        print(f"  Recent sent: {len(sent)} | Recent received: {len(recv)}")

    print()
    print("=" * 64)
    print("  Full results in return dict — access results['api_name']")
    print("=" * 64)
    print()
