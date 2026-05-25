#!/usr/bin/env python3
"""
warden_forensic_scan.py — TheWarden Universal Forensic Address Scanner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GL-L29 UPGRADE: MCP-first across all stacks.

Platform-agnostic. Pull from GitHub each session and exec() in sandbox.
Keys passed at runtime — never hardcoded here.

USAGE (every session):
    import requests
    exec(requests.get(
        "https://raw.githubusercontent.com/StableExo/TheWarden/main/tools/warden_forensic_scan.py",
        headers={"Authorization": "Bearer <PAT>"}
    ).text, globals())

    KEYS = {
        "arkham":                 "<from TheWardenKeys>",
        "chainbase":              "<from TheWardenKeys>",
        "moralis":                "<from TheWardenKeys>",
        "nansen":                 "<from TheWardenKeys>",
        "etherscan":              "<from TheWardenKeys>",
        "bitquery_client_id":     "<from TheWardenKeys>",
        "bitquery_client_secret": "<from TheWardenKeys>",
        "goplus":                 None,   # free — no key
        "tenderly":               "<from TheWardenKeys>",
    }

    report = scan("0xADDRESS", chains=[1, 8453, 56, 137, 42161], keys=KEYS)
    print_report(report)

MCP STACK (GL-L29):
    Chainbase  api.chainbase.com/v1/mcp        17 tools  X-API-KEY
    Nansen     mcp.nansen.ai/ra/mcp            36 tools  NANSEN-API-KEY
    Tenderly   api.tenderly.co/mcp             59 tools  X-Access-Key

REST FALLBACK (pending MCP install in GL-L29+):
    Arkham     api.arkm.com                    awaiting ibash2/arkham-mcp
    Moralis    deep-index.moralis.io           awaiting @moralisweb3/api-mcp-server
    GoPlus     api.gopluslabs.io               npx subprocess (sandbox limitation)
    Etherscan  api.etherscan.io/v2             Cloudflare blocks MCP from sandbox
    Bitquery   streaming.bitquery.io           OAuth2 pre-step required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import concurrent.futures
import requests
import json
from datetime import datetime, timezone

CHAIN_NAMES = {
    1: "ETH", 8453: "Base", 56: "BSC",
    137: "Polygon", 42161: "Arbitrum", 10: "Optimism",
}

CHAIN_HEX = {
    1: "0x1", 8453: "0x2105", 56: "0x38",
    137: "0x89", 42161: "0xa4b1", 10: "0xa"
}

# ─────────────────────────────────────────────────────────
# MCP HELPER
# ─────────────────────────────────────────────────────────

def _mcp_call(url, headers, tool_name, arguments, timeout=25):
    """Call a hosted HTTP MCP server. Handles SSE + JSON responses."""
    # Initialize session
    init_r = requests.post(url, json={
        "jsonrpc": "2.0", "id": 1, "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "TheWarden", "version": "GL-L29"}
        }
    }, headers=headers, timeout=15)

    hdrs = dict(headers)
    if "mcp-session-id" in init_r.headers:
        hdrs["mcp-session-id"] = init_r.headers["mcp-session-id"]

    r = requests.post(url, json={
        "jsonrpc": "2.0", "id": 2, "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments}
    }, headers=hdrs, timeout=timeout)

    # Parse SSE stream or plain JSON
    for line in r.text.split("\n"):
        if line.startswith("data: "):
            try:
                d = json.loads(line[6:])
                content = d.get("result", {}).get("content", [])
                if content:
                    text = content[0].get("text", "")
                    try:
                        return json.loads(text) if isinstance(text, str) and text.strip().startswith(("{", "[")) else text
                    except:
                        return text
            except:
                pass
    try:
        d = r.json()
        content = d.get("result", {}).get("content", [])
        if content:
            text = content[0].get("text", "")
            try:
                return json.loads(text) if isinstance(text, str) and text.strip().startswith(("{", "[")) else text
            except:
                return text
    except:
        pass
    return {"error": f"no parseable response — status {r.status_code}"}


# ─────────────────────────────────────────────────────────
# CHAINBASE MCP  (was: direct REST)
# ─────────────────────────────────────────────────────────

def _chainbase_mcp(address, chains, keys):
    """Chainbase via MCP — GetAccountTxs + GetAccountBalance + GetAccountTokens."""
    url = "https://api.chainbase.com/v1/mcp"
    hdrs = {
        "X-API-KEY": keys["chainbase"],
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
    }
    out = {}
    for chain_id in chains:
        try:
            # Tx count
            txs = _mcp_call(url, hdrs, "GetAccountTxs",
                {"chain_id": str(chain_id), "address": address, "page": "1", "limit": "1"})
            # Balance
            bal = _mcp_call(url, hdrs, "GetAccountBalance",
                {"chain_id": str(chain_id), "address": address})
            # Token holdings
            tokens = _mcp_call(url, hdrs, "GetAccountTokens",
                {"chain_id": str(chain_id), "address": address, "limit": "5"})

            tx_count = 0
            if isinstance(txs, dict):
                tx_count = txs.get("count", txs.get("total", 0))
            elif isinstance(txs, list):
                tx_count = len(txs)

            out[chain_id] = {
                "chain_name": CHAIN_NAMES.get(chain_id, chain_id),
                "tx_count": tx_count,
                "balance_raw": bal,
                "tokens": tokens,
                "source": "chainbase_mcp"
            }
        except Exception as e:
            out[chain_id] = {"error": str(e), "chain_name": CHAIN_NAMES.get(chain_id, chain_id)}
    return out


# ─────────────────────────────────────────────────────────
# NANSEN MCP  (was: MCP already — now expanded)
# ─────────────────────────────────────────────────────────

def _nansen_mcp(address, keys):
    """Nansen via MCP — full address profiler suite."""
    url = "https://mcp.nansen.ai/ra/mcp"
    hdrs = {
        "NANSEN-API-KEY": keys["nansen"],
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
    }

    def _call(tool, args):
        try:
            return _mcp_call(url, hdrs, tool, args)
        except Exception as e:
            return {"error": str(e)}

    out = {"mcp_status": "live", "endpoint": url}
    out["entity_search"]      = _call("general_search", {"query": address})
    out["related_addresses"]  = _call("address_related_addresses",
                                      {"request": {"address": address, "chain": "all"}})
    out["portfolio"]          = _call("address_portfolio",
                                      {"request": {"wallet_address": address, "chain": "all"}})
    out["counterparties"]     = _call("address_counterparties",
                                      {"request": {"address": address, "chain": "all"}})
    out["transactions"]       = _call("address_transactions",
                                      {"request": {"address": address, "chain": "all"}})
    out["pnl_summary"]        = _call("wallet_pnl_summary",
                                      {"request": {"walletAddress": address, "chain": "all",
                                                   "dateRange": {"from": "30D_AGO", "to": "NOW"}}})
    out["polymarket_summary"] = _call("prediction_market_address_summary",
                                      {"request": {"address": address, "platform": "polymarket"}})
    return out


# ─────────────────────────────────────────────────────────
# TENDERLY MCP  (new in GL-L29)
# ─────────────────────────────────────────────────────────

def _tenderly_mcp(address, keys):
    """
    Tenderly via MCP — contract info + recent on-chain tx traces.
    set_active_project MUST be called first (GL-L28 doctrine).
    Tenderly is most useful when we have a specific tx hash to trace.
    For address-level: get_contract_info to check if address is a contract.
    """
    url = "https://api.tenderly.co/mcp"
    hdrs = {
        "X-Access-Key": keys["tenderly"],
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
    }

    def _call(tool, args):
        try:
            return _mcp_call(url, hdrs, tool, args, timeout=20)
        except Exception as e:
            return {"error": str(e)}

    out = {"mcp_status": "live", "endpoint": url}

    # Always set active project first (GL-L28 doctrine)
    out["project_set"] = _call("set_active_project",
                               {"slug": "project", "account": "Codyworld"})

    # Check if address is a contract on ETH mainnet
    out["contract_info_eth"]  = _call("get_contract_info",
                                      {"address": address, "network_id": "1"})
    out["contract_info_base"] = _call("get_contract_info",
                                      {"address": address, "network_id": "8453"})
    return out


# ─────────────────────────────────────────────────────────
# ARKHAM REST  (pending ibash2/arkham-mcp in GL-L29+)
# ─────────────────────────────────────────────────────────

def _arkham_rest(address, keys):
    """Arkham entity attribution + recent transfers. REST until MCP installed."""
    out = {}
    try:
        r = requests.get(
            f"https://api.arkm.com/intelligence/address_enriched/{address}",
            headers={"API-Key": keys["arkham"]}, timeout=15)
        out["enrichment"] = r.json()
    except Exception as e:
        out["enrichment"] = {"error": str(e)}
    try:
        r = requests.get(
            "https://api.arkm.com/transfers",
            params={"address": address, "limit": 10},
            headers={"API-Key": keys["arkham"]}, timeout=15)
        out["transfers"] = r.json()
    except Exception as e:
        out["transfers"] = {"error": str(e)}
    out["source"] = "arkham_rest (upgrade to MCP in GL-L29+)"
    return out


# ─────────────────────────────────────────────────────────
# MORALIS REST  (pending @moralisweb3/api-mcp-server GL-L29+)
# ─────────────────────────────────────────────────────────

def _moralis_rest(address, chains, keys):
    """Moralis net worth + history. REST until MCP installed."""
    out = {}
    try:
        nw = requests.get(
            f"https://deep-index.moralis.io/api/v2.2/wallets/{address}/net-worth",
            params={"exclude_spam": "true", "exclude_unverified_contracts": "true"},
            headers={"X-API-Key": keys["moralis"]}, timeout=15).json()
        out["net_worth"] = nw
    except Exception as e:
        out["net_worth"] = {"error": str(e)}
    for chain_id in chains[:2]:
        hex_id = CHAIN_HEX.get(chain_id, hex(chain_id))
        try:
            hist = requests.get(
                f"https://deep-index.moralis.io/api/v2.2/wallets/{address}/history",
                params={"chain": hex_id, "limit": 5},
                headers={"X-API-Key": keys["moralis"]}, timeout=15).json()
            out[f"history_{CHAIN_NAMES.get(chain_id, chain_id)}"] = hist
        except Exception as e:
            out[f"history_{CHAIN_NAMES.get(chain_id, chain_id)}"] = {"error": str(e)}
    out["source"] = "moralis_rest (upgrade to MCP in GL-L29+)"
    return out


# ─────────────────────────────────────────────────────────
# GOPLUS REST  (MCP is npx subprocess — sandbox limitation)
# ─────────────────────────────────────────────────────────

def _goplus_rest(address, chains):
    """GoPlus security flags — free, no key. REST (MCP needs npx subprocess)."""
    out = {}
    for chain_id in chains:
        try:
            r = requests.get(
                f"https://api.gopluslabs.io/api/v1/address_security/{address}",
                params={"chain_id": chain_id}, timeout=12)
            data = r.json().get("result", {})
            flags = {k: v for k, v in data.items() if v not in [None, "", "0", 0, False]}
            out[chain_id] = {"raw": data, "flags": flags, "flagged": len(flags) > 0}
        except Exception as e:
            out[chain_id] = {"error": str(e)}
    return out


# ─────────────────────────────────────────────────────────
# ETHERSCAN REST  (Cloudflare blocks MCP from sandbox)
# ─────────────────────────────────────────────────────────

def _etherscan_rest(address, chains, keys):
    """Etherscan V2 balance + recent txs. REST (Cloudflare blocks MCP from sandbox)."""
    out = {}
    for chain_id in chains:
        try:
            bal = requests.get("https://api.etherscan.io/v2/api", params={
                "chainid": chain_id, "module": "account", "action": "balance",
                "address": address, "apikey": keys["etherscan"]}, timeout=10).json()
            txs = requests.get("https://api.etherscan.io/v2/api", params={
                "chainid": chain_id, "module": "account", "action": "txlist",
                "address": address, "page": 1, "offset": 5,
                "sort": "desc", "apikey": keys["etherscan"]}, timeout=10).json()
            out[chain_id] = {
                "chain": CHAIN_NAMES.get(chain_id, chain_id),
                "balance_wei": bal.get("result"),
                "recent_txs": txs.get("result", [])[:5] if isinstance(txs.get("result"), list) else [],
            }
        except Exception as e:
            out[chain_id] = {"error": str(e)}
    return out


# ─────────────────────────────────────────────────────────
# BITQUERY REST  (OAuth2 pre-step)
# ─────────────────────────────────────────────────────────

def _get_bitquery_token(keys):
    try:
        r = requests.post("https://oauth2.bitquery.io/oauth2/token", data={
            "grant_type": "client_credentials",
            "client_id": keys["bitquery_client_id"],
            "client_secret": keys["bitquery_client_secret"],
            "scope": "api"}, timeout=12)
        return r.json().get("access_token")
    except:
        return None


def _bitquery_rest(address, token):
    """Bitquery historical archive transfers. ALWAYS use dataset:archive."""
    if not token:
        return {"error": "No OAuth2 token — run _get_bitquery_token(keys) first"}
    query = """
    query ($addr: String!) {
      EVM(dataset: archive, network: eth) {
        sent: Transfers(
          where: {Transfer: {Sender: {is: $addr}}}
          limit: {count: 10} orderBy: {descending: Block_Time}
        ) {
          Block { Time }
          Transfer { Sender Receiver Amount Currency { Symbol Name } }
          Transaction { Hash }
        }
        received: Transfers(
          where: {Transfer: {Receiver: {is: $addr}}}
          limit: {count: 10} orderBy: {descending: Block_Time}
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
            timeout=25)
        return r.json()
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────
# MAIN SCAN
# ─────────────────────────────────────────────────────────

def scan(address, chains=None, keys=None):
    """
    Run all forensic APIs against an address.
    MCP-first (GL-L29+). REST fallback where MCP not yet installed.
    
    Returns dict with: chainbase, nansen, tenderly, arkham, moralis, 
                       goplus, etherscan, bitquery, meta
    """
    if keys is None:
        raise ValueError("keys dict required")
    if chains is None:
        chains = [1, 8453, 56, 137, 42161]

    address = address.lower()
    started = datetime.now(timezone.utc)
    print(f"[TheWarden] Scanning {address}")
    print(f"[TheWarden] Chains: {[CHAIN_NAMES.get(c, c) for c in chains]}")
    print(f"[TheWarden] Fetching Bitquery token...")

    bq_token = _get_bitquery_token(keys)
    print(f"[TheWarden] Bitquery: {'✅' if bq_token else '❌ skipped'}")
    print(f"[TheWarden] Firing MCP + REST in parallel...")

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        futures = {
            "chainbase": ex.submit(_chainbase_mcp,  address, chains, keys),
            "nansen":    ex.submit(_nansen_mcp,     address, keys),
            "tenderly":  ex.submit(_tenderly_mcp,   address, keys),
            "arkham":    ex.submit(_arkham_rest,    address, keys),
            "moralis":   ex.submit(_moralis_rest,   address, chains, keys),
            "goplus":    ex.submit(_goplus_rest,    address, chains),
            "etherscan": ex.submit(_etherscan_rest, address, chains, keys),
            "bitquery":  ex.submit(_bitquery_rest,  address, bq_token),
        }
        results = {}
        for name, future in futures.items():
            try:
                results[name] = future.result(timeout=40)
                src = results[name].get("source", "mcp") if isinstance(results[name], dict) else "mcp"
                tag = "🔗 MCP" if "mcp" in src or name in ("chainbase","nansen","tenderly") else "📡 REST"
                print(f"[TheWarden]   {name:<12} ✅  {tag}")
            except concurrent.futures.TimeoutError:
                results[name] = {"error": "timeout"}
                print(f"[TheWarden]   {name:<12} ⏱ timeout")
            except Exception as e:
                results[name] = {"error": str(e)}
                print(f"[TheWarden]   {name:<12} ❌ {e}")

    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    results["meta"] = {
        "address": address, "chains_scanned": chains,
        "elapsed_seconds": round(elapsed, 2),
        "scanned_at": started.isoformat(),
        "mcp_stack": ["chainbase", "nansen", "tenderly"],
        "rest_stack": ["arkham", "moralis", "goplus", "etherscan", "bitquery"],
        "pending_mcp_upgrade": ["arkham (ibash2/arkham-mcp)", 
                                "moralis (@moralisweb3/api-mcp-server)",
                                "bitquery (mcp.bitquery.io)",
                                "etherscan (needs FlareSolverr)"],
        "version": "GL-L29"
    }
    print(f"[TheWarden] Complete in {elapsed:.1f}s — {len([k for k,v in results.items() if k!='meta' and 'error' not in str(v)[:20]])} APIs hit")
    return results


# ─────────────────────────────────────────────────────────
# REPORT PRINTER
# ─────────────────────────────────────────────────────────

def print_report(results):
    addr    = results.get("meta", {}).get("address", "unknown")
    elapsed = results.get("meta", {}).get("elapsed_seconds", "?")
    version = results.get("meta", {}).get("version", "?")

    print()
    print("=" * 66)
    print(f"  THEWARDEN FORENSIC REPORT  [{version}]")
    print(f"  Address: {addr}")
    print(f"  Elapsed: {elapsed}s")
    print("=" * 66)

    # GoPlus
    print("\n[GOPLUS — Security Flags]")
    gp = results.get("goplus", {})
    any_flag = False
    for chain_id, data in gp.items():
        if isinstance(data, dict) and data.get("flagged"):
            flags = {k: v for k, v in data["flags"].items() if k != "contract_address"}
            if flags:
                print(f"  {CHAIN_NAMES.get(chain_id, chain_id)}: 🚨 {flags}")
                any_flag = True
    if not any_flag:
        print("  ✅ No flags (contract_address FP filtered)")

    # Arkham
    print("\n[ARKHAM — Entity Attribution]")
    ark  = results.get("arkham", {})
    enr  = ark.get("enrichment", {})
    ent  = enr.get("arkhamEntity", enr.get("entity", {}))
    name = ent.get("name") if isinstance(ent, dict) else None
    print(f"  Entity: {name or 'Unknown / Unlabeled'}")
    tx_list = ark.get("transfers", {}).get("transfers", [])
    print(f"  Recent transfers: {len(tx_list)}")
    for t in tx_list[:3]:
        if isinstance(t, dict):
            val = t.get("unitValue", "?")
            tok = t.get("tokenSymbol", "?")
            frm = (t.get("fromAddress", {}) or {}).get("address", "?")[:10]
            to  = (t.get("toAddress",   {}) or {}).get("address", "?")[:10]
            print(f"    {frm}... → {to}...  {val} {tok}")

    # Chainbase (MCP)
    print("\n[CHAINBASE MCP — Multi-chain Activity]")
    cb = results.get("chainbase", {})
    total_txs = 0
    for chain_id, data in cb.items():
        if isinstance(data, dict) and "tx_count" in data:
            count = data["tx_count"]
            total_txs += count
            marker = "🔴" if count > 10000 else ("🟡" if count > 100 else "⚪")
            print(f"  {data.get('chain_name', chain_id):<12} {count:>8,} txs  {marker}")
    print(f"  TOTAL: {total_txs:,} txs")

    # Moralis
    print("\n[MORALIS — Net Worth]")
    mor = results.get("moralis", {})
    nw  = mor.get("net_worth", {})
    if "total_networth_usd" in nw:
        print(f"  Total Net Worth: ${float(nw['total_networth_usd']):,.2f}")
    else:
        print(f"  {str(nw)[:100]}")

    # Nansen (MCP)
    print("\n[NANSEN MCP — Smart Money Profile]")
    nan = results.get("nansen", {})
    ent = nan.get("entity_search")
    if ent and "error" not in str(ent)[:20]:
        print(f"  Entity search: {str(ent)[:120]}")
    port = nan.get("portfolio")
    if port and "error" not in str(port)[:20]:
        print(f"  Portfolio: {str(port)[:120]}")
    pnl = nan.get("pnl_summary")
    if pnl and "error" not in str(pnl)[:20]:
        print(f"  PnL (30d): {str(pnl)[:120]}")

    # Tenderly (MCP)
    print("\n[TENDERLY MCP — Contract Check]")
    tend = results.get("tenderly", {})
    ci_eth  = tend.get("contract_info_eth", {})
    ci_base = tend.get("contract_info_base", {})
    eth_is_contract  = "contractName" in str(ci_eth) or "contract" in str(ci_eth).lower()
    base_is_contract = "contractName" in str(ci_base) or "contract" in str(ci_base).lower()
    print(f"  ETH mainnet:  {'📄 Contract' if eth_is_contract else '👤 EOA / Not contract'}")
    print(f"  Base:         {'📄 Contract' if base_is_contract else '👤 EOA / Not contract'}")

    # Bitquery
    print("\n[BITQUERY — Historical Archive (ETH)]")
    bq  = results.get("bitquery", {})
    if "error" in bq:
        print(f"  {bq['error']}")
    else:
        evm  = bq.get("data", {}).get("EVM", {})
        sent = evm.get("sent", [])
        recv = evm.get("received", [])
        print(f"  ETH sent: {len(sent)} | ETH received: {len(recv)}")
        for tx in (sent + recv)[:3]:
            if isinstance(tx, dict):
                t   = tx.get("Transfer", {})
                blk = tx.get("Block", {})
                print(f"    {blk.get('Time','')[:10]}  {t.get('Amount','?')} {t.get('Currency',{}).get('Symbol','?')}  {t.get('Sender','')[:10]}→{t.get('Receiver','')[:10]}")

    mcp = results.get("meta", {}).get("mcp_stack", [])
    rest = results.get("meta", {}).get("rest_stack", [])
    print(f"\n  🔗 MCP: {mcp}")
    print(f"  📡 REST: {rest}")
    print()
    print("=" * 66)
    print()
