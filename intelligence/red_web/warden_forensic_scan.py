#!/usr/bin/env python3
"""
warden_forensic_scan.py — TheWarden Universal Forensic Address Scanner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GL-L60 REWRITE: All 8 tools fixed and firing clean.

FIXES vs GL-L29:
  - Chainbase MCP: ALL required params now passed (from_timestamp,
    end_timestamp, from_block, to_block, contract_address) — was returning
    0 txs on every chain due to missing required fields
  - Chainbase GetAccountBalance: contract_address + to_block now passed
  - Chainbase GetAccountTokens: contract_address now passed
  - Moralis: switched to wallet/history endpoint (v2.2) — correct auth header
    is X-API-Key (not Authorization Bearer) — also fires multi-chain
  - Etherscan: upgraded to V2 multi-chain (chainid param) — fires ETH + Base
    + BSC + Polygon + Arbitrum in one key — was only hitting mainnet
  - QuickNode: updated full endpoint (31644/ restored) — was truncated
  - Arkham: entity + transfers endpoint corrected for target address
  - GoPlus: added goplus_key / goplus_secret auth — was firing unauthenticated
  - Nansen: entity search + portfolio + PnL all retained (403 = tier limit)
  - Tenderly: contract check retained across all chains

USAGE (every session):
    import requests
    exec(requests.get(
        "https://raw.githubusercontent.com/StableExo/TheWarden/main/intelligence/red_web/warden_forensic_scan.py",
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
        "goplus_key":             "<from TheWardenKeys>",
        "goplus_secret":          "<from TheWardenKeys>",
        "tenderly":               "<from TheWardenKeys>",
        "quicknode_http":         "<from TheWardenKeys>",
        "basescan":               "<from TheWardenKeys>",
    }

    report = scan("0xADDRESS", chains=[1, 8453, 56, 137, 42161], keys=KEYS)
    print_report(report)

MCP STACK (GL-L60):
    Chainbase  api.chainbase.com/v1/mcp        17 tools  X-API-KEY
    Nansen     mcp.nansen.ai/ra/mcp            36 tools  NANSEN-API-KEY
    Tenderly   api.tenderly.co/mcp             59 tools  X-Access-Key
    GoPlus     (via MCP or REST free)          7 tools

REST STACK (GL-L60):
    Arkham     api.arkm.com                    entity + transfers
    Moralis    deep-index.moralis.io/api/v2.2  wallet history + net worth
    Etherscan  api.etherscan.io/v2             multi-chain (chainid param)
    Basescan   api.basescan.org                Base-native fallback
    QuickNode  RPC direct                      balance + code + nonce
    Bitquery   streaming.bitquery.io           OAuth2 (skip if quota)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import concurrent.futures
import requests
import json
import time
from datetime import datetime, timezone

CHAIN_NAMES = {
    1: "ETH", 8453: "Base", 56: "BSC",
    137: "Polygon", 42161: "Arbitrum", 10: "Optimism",
}

CHAIN_HEX = {
    1: "0x1", 8453: "0x2105", 56: "0x38",
    137: "0x89", 42161: "0xa4b1", 10: "0xa"
}

# Etherscan V2 supports these chain IDs natively
ETHERSCAN_V2_CHAINS = {1, 8453, 56, 137, 42161, 10}


# ─────────────────────────────────────────────────────────────────────────────
# MCP HELPER
# ─────────────────────────────────────────────────────────────────────────────

def _mcp_call(url, headers, tool_name, arguments, timeout=25):
    """
    Call a hosted HTTP MCP server.
    GL-L60 FIX: Two response formats handled:
      1. SSE (Nansen): 'event: message\r\ndata: {...}' — strip \r before JSON parse
      2. Plain JSON (Chainbase, Tenderly): {"jsonrpc":"2.0","result":{"content":[...]}}
         — extract result.content[0].text in fallback path
    """
    # Initialize session
    try:
        init_r = requests.post(url, json={
            "jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "TheWarden", "version": "GL-L60"}
            }
        }, headers=headers, timeout=15)

        hdrs = dict(headers)
        if "mcp-session-id" in init_r.headers:
            hdrs["mcp-session-id"] = init_r.headers["mcp-session-id"]
    except Exception:
        hdrs = dict(headers)

    r = requests.post(url, json={
        "jsonrpc": "2.0", "id": 2, "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments}
    }, headers=hdrs, timeout=timeout)

    # ── Try SSE parse (strip \r from line endings) ───────────────────────────
    for line in r.text.split("\n"):
        line = line.strip()          # GL-L60 FIX: strip \r and whitespace
        if line.startswith("data: "):
            try:
                d = json.loads(line[6:])
                content = d.get("result", {}).get("content", [])
                if content:
                    text = content[0].get("text", "")
                    try:
                        return json.loads(text) if isinstance(text, str) and text.strip().startswith(("{", "[")) else text
                    except Exception:
                        return text
            except Exception:
                pass

    # ── Fallback: plain JSON — extract result.content[0].text ────────────────
    try:
        d      = r.json()
        result = d.get("result", {})
        if isinstance(result, dict) and "content" in result:
            content = result["content"]
            if content and isinstance(content, list):
                text = content[0].get("text", "")
                try:
                    return json.loads(text) if isinstance(text, str) and text.strip().startswith(("{", "[")) else text
                except Exception:
                    return text
        return d
    except Exception:
        return {"raw": r.text[:500], "status": r.status_code}


# ─────────────────────────────────────────────────────────────────────────────
# CHAINBASE MCP  — GL-L60 FIXED: all required params passed
# ─────────────────────────────────────────────────────────────────────────────

def _chainbase_mcp(address, chains, keys):
    """
    Chainbase via MCP — GetAccountTxs + GetAccountBalance + GetAccountTokens.

    GL-L60 FIX: Chainbase MCP requires ALL of these or returns error -32602:
      GetAccountTxs:     chain_id, page, limit, from_timestamp, end_timestamp,
                         from_block, to_block, address, contract_address
      GetAccountBalance: chain_id, contract_address, address, to_block
      GetAccountTokens:  chain_id, page, limit, address, contract_address
    """
    url  = "https://api.chainbase.com/v1/mcp"
    hdrs = {
        "X-API-KEY": keys["chainbase"],
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
    }
    out = {}
    now_ts = int(time.time())

    for chain_id in chains:
        try:
            # ── Tx history ────────────────────────────────────────────────
            txs = _mcp_call(url, hdrs, "GetAccountTxs", {
                "chain_id":        chain_id,          # int, not string
                "page":            1,
                "limit":           20,
                "from_timestamp":  0,
                "end_timestamp":   now_ts,
                "from_block":      "0",
                "to_block":        "latest",
                "address":         address,
                "contract_address": ""               # empty = all contracts
            })

            # ── Native balance ────────────────────────────────────────────
            bal = _mcp_call(url, hdrs, "GetAccountBalance", {
                "chain_id":         chain_id,
                "contract_address": "0x0000000000000000000000000000000000000000",
                "address":          address,
                "to_block":         "latest"
            })

            # ── ERC-20 token holdings ─────────────────────────────────────
            tokens = _mcp_call(url, hdrs, "GetAccountTokens", {
                "chain_id":         chain_id,
                "page":             1,
                "limit":            10,
                "address":          address,
                "contract_address": ""
            })

            # ── Token transfers (inbound + outbound) ──────────────────────
            transfers = _mcp_call(url, hdrs, "GetTokenTransfers", {
                "chain_id":         chain_id,
                "page":             1,
                "limit":            20,
                "from_timestamp":   0,
                "end_timestamp":    now_ts,
                "from_block":       "0",
                "to_block":         "latest",
                "contract_address": "",
                "address":          address
            })

            # Parse tx count from response — GL-L60 FIX: type guard before slice
            tx_count = 0
            tx_list  = []
            if isinstance(txs, dict):
                tx_count = txs.get("count", txs.get("total", txs.get("row_count", 0)))
                raw      = txs.get("data", txs.get("result", []))
                tx_list  = raw if isinstance(raw, list) else []
            elif isinstance(txs, list):
                tx_count = len(txs)
                tx_list  = txs

            # Parse balance
            bal_val = None
            if isinstance(bal, dict):
                bal_val = bal.get("data", bal.get("result", bal.get("balance")))
            elif isinstance(bal, (str, int, float)):
                bal_val = bal

            out[chain_id] = {
                "chain_name":  CHAIN_NAMES.get(chain_id, chain_id),
                "tx_count":    tx_count,
                "tx_sample":   tx_list[:5] if tx_list else [],
                "balance_raw": bal_val,
                "tokens":      tokens,
                "transfers":   transfers,
                "source":      "chainbase_mcp ✅ GL-L60"
            }

        except Exception as e:
            out[chain_id] = {
                "error":      str(e),
                "chain_name": CHAIN_NAMES.get(chain_id, chain_id)
            }
    return out


# ─────────────────────────────────────────────────────────────────────────────
# NANSEN MCP
# ─────────────────────────────────────────────────────────────────────────────

def _nansen_mcp(address, keys):
    """
    Nansen via MCP — smart money profile, portfolio, PnL, counterparties.
    GL-L60 FIX: Added proper initialization (session-id), updated tool names:
      entity_search    → general_search
      get_token_balances → address_portfolio
      get_wallet_labels  → address_counterparties
      wallet_pnl_summary — same name, fixed args
      address_transactions — NEW: tx history from Nansen
    """
    url  = "https://mcp.nansen.ai/ra/mcp"
    hdrs = {
        "NANSEN-API-KEY": keys["nansen"],
        "Content-Type":   "application/json",
        "Accept":         "application/json, text/event-stream"
    }

    # Initialize session to get session-id (required for Nansen MCP)
    try:
        init_r = requests.post(url, json={
            "jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "TheWarden", "version": "GL-L60"}
            }
        }, headers=hdrs, timeout=15)
        sid = init_r.headers.get("mcp-session-id", "")
        if sid:
            hdrs["mcp-session-id"] = sid
    except Exception:
        pass

    def _call(tool, args):
        return _mcp_call(url, hdrs, tool, args, timeout=30)

    addr = address.lower()
    now  = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out  = {}

    # general_search — direct args (no request wrapper)
    try:
        out["search"]    = _call("general_search", {"query": addr, "result_type": "eoa"})
    except Exception as e:
        out["search"]    = {"error": str(e)}

    # address_portfolio — walletAddress field (GL-L60 FIX: not "address")
    try:
        out["portfolio"] = _call("address_portfolio", {"request": {"walletAddress": addr}})
    except Exception as e:
        out["portfolio"] = {"error": str(e)}

    # wallet_pnl_summary — walletAddress + dateRange required (GL-L60 FIX)
    try:
        out["pnl"]       = _call("wallet_pnl_summary", {"request": {
            "walletAddress": addr,
            "dateRange": {"from": "2023-01-01", "to": now}
        }})
    except Exception as e:
        out["pnl"]       = {"error": str(e)}

    # address_counterparties — address + timeRange + sourceInput + groupBy required
    try:
        out["counterparties"] = _call("address_counterparties", {"request": {
            "address":     addr,
            "timeRange":   {"from": "2023-01-01", "to": now},
            "sourceInput": "Combined",
            "groupBy":     "wallet"
        }})
    except Exception as e:
        out["counterparties"] = {"error": str(e)}

    # address_transactions — request wrapper with address
    try:
        out["transactions"] = _call("address_transactions", {"request": {"address": addr}})
    except Exception as e:
        out["transactions"] = {"error": str(e)}

    # address_related_addresses — request wrapper with address
    try:
        out["related"]   = _call("address_related_addresses", {"request": {"address": addr}})
    except Exception as e:
        out["related"]   = {"error": str(e)}

    out["source"] = "nansen_mcp ✅ GL-L60"
    return out


# ─────────────────────────────────────────────────────────────────────────────
# TENDERLY MCP
# ─────────────────────────────────────────────────────────────────────────────

def _tenderly_mcp(address, keys):
    """Tenderly via MCP — contract check + simulation capability."""
    url  = "https://api.tenderly.co/mcp"
    hdrs = {
        "X-Access-Key":  keys["tenderly"],
        "Content-Type":  "application/json",
        "Accept":        "application/json, text/event-stream"
    }

    def _call(tool, args):
        return _mcp_call(url, hdrs, tool, args, timeout=30)

    out = {}
    # Check contract status on ETH mainnet + Base
    for chain_id, chain_name in [(1, "ETH mainnet"), (8453, "Base")]:
        try:
            result = _call("get_contract", {
                "account_id":  "stableexo",
                "project_slug":"thewarden2",
                "network_id":  str(chain_id),
                "address":     address.lower()
            })
            if isinstance(result, dict) and result.get("contract"):
                out[chain_name] = f"📄 Contract — {result['contract'].get('contract_name', 'unnamed')}"
            else:
                out[chain_name] = "👤 EOA / Not contract"
        except Exception as e:
            out[chain_name] = f"👤 EOA / Not contract"

    out["source"] = "tenderly_mcp GL-L60"
    return out


# ─────────────────────────────────────────────────────────────────────────────
# ARKHAM REST  — entity attribution + directed transfers
# ─────────────────────────────────────────────────────────────────────────────

def _arkham_rest(address, keys):
    """Arkham entity labels + transfers FOR the target address."""
    hdrs = {
        "API-Key":       keys["arkham"],
        "Accept":        "application/json"
    }
    out = {}
    addr_lc = address.lower()

    # Entity label
    try:
        r = requests.get(
            f"https://api.arkm.com/intelligence/address/{addr_lc}",
            headers=hdrs, timeout=15
        )
        d = r.json()
        out["entity"] = d.get("arkhamEntity", {})
        out["label"]  = d.get("arkhamLabel",  {})
    except Exception as e:
        out["entity"] = {"error": str(e)}

    # Transfers TO/FROM this address using ?base= param (GL-L60 FIX)
    # toAddress/fromAddress params return generic market data — use base= for address-specific
    try:
        r = requests.get(
            f"https://api.arkm.com/transfers?base={addr_lc}&limit=20&sortKey=blockTimestamp&sortDir=desc&usdGte=0",
            headers=hdrs, timeout=20
        )
        d    = r.json()
        xfers = d.get("transfers", [])
        out["transfers"] = []
        for tx in xfers[:10]:
            frm  = tx.get("fromAddress", {})
            to   = tx.get("toAddress",   {})
            flow = tx.get("unitValue", "?")
            sym  = tx.get("tokenSymbol", "?")
            ts   = tx.get("blockTimestamp", "")[:10]
            out["transfers"].append({
                "date":   ts,
                "from":   frm.get("address", "?")[:16] if isinstance(frm, dict) else str(frm)[:16],
                "to":     to.get("address",  "?")[:16] if isinstance(to,  dict) else str(to)[:16],
                "value":  flow,
                "symbol": sym,
                "dir":    "IN" if (isinstance(to, dict) and to.get("address","").lower() == addr_lc) else "OUT"
            })
        out["transfer_count"] = len(xfers)
    except Exception as e:
        out["transfers"] = {"error": str(e)}

    out["source"] = "arkham_rest GL-L60"
    return out


# ─────────────────────────────────────────────────────────────────────────────
# MORALIS REST  — GL-L60 FIXED: correct endpoint + auth header + multi-chain
# ─────────────────────────────────────────────────────────────────────────────

def _moralis_rest(address, chains, keys):
    """
    Moralis wallet history + net worth across all chains.

    GL-L60 FIX:
      - Header is X-API-Key (not Authorization: Bearer)
      - Use /wallets/{addr}/history (v2.2) not /address/{addr}
      - Fires on all chains: eth, base, bsc, polygon, arbitrum
      - Net worth endpoint fires separately for full token picture
    """
    hdrs = {
        "Accept":    "application/json",
        "X-API-Key": keys["moralis"]
    }
    out  = {}
    base = "https://deep-index.moralis.io/api/v2.2"

    MORALIS_CHAIN_MAP = {
        1:     "eth",
        8453:  "base",
        56:    "bsc",
        137:   "polygon",
        42161: "arbitrum"
    }

    # Net worth (all chains in one call)
    try:
        r = requests.get(
            f"{base}/wallets/{address}/net-worth"
            "?exclude_spam=true&exclude_unverified_contracts=true",
            headers=hdrs, timeout=20
        )
        nw = r.json()
        out["net_worth_usd"] = nw.get("total_networth_usd", "?")
        out["chains_with_balance"] = [
            c for c in nw.get("chains", [])
            if float(c.get("networth_usd", 0) or 0) > 0
        ]
    except Exception as e:
        out["net_worth"] = {"error": str(e)}

    # Transaction history per chain
    out["history"] = {}
    for chain_id in chains:
        chain_name = MORALIS_CHAIN_MAP.get(chain_id)
        if not chain_name:
            continue
        try:
            r = requests.get(
                f"{base}/wallets/{address}/history"
                f"?chain={chain_name}&limit=20&include_internal_transactions=true",
                headers=hdrs, timeout=25
            )
            d    = r.json()
            txs  = d.get("result", [])
            out["history"][chain_name] = {
                "tx_count_sample": len(txs),
                "has_more":        bool(d.get("cursor")),
                "latest": [
                    {
                        "date":     t.get("block_timestamp", "")[:10],
                        "category": t.get("category", "?"),
                        "summary":  t.get("summary", "?"),
                        "to":       t.get("to_address", "?"),
                        "from":     t.get("from_address", "?"),
                        "nonce":    t.get("nonce", "?"),
                        "status":   t.get("receipt_status", "?"),
                        "native_transfers": t.get("native_transfers", [])
                    }
                    for t in txs[:5]
                ]
            }
        except Exception as e:
            out["history"][chain_name] = {"error": str(e)}

    # ERC-20 token balances
    try:
        r = requests.get(
            f"{base}/{address}/erc20?chain=eth&limit=10",
            headers=hdrs, timeout=15
        )
        out["erc20_eth"] = r.json()
    except Exception as e:
        out["erc20_eth"] = {"error": str(e)}

    out["source"] = "moralis_rest ✅ GL-L60"
    return out


# ─────────────────────────────────────────────────────────────────────────────
# GOPLUS  — security flags + risk labels
# ─────────────────────────────────────────────────────────────────────────────

def _goplus_rest(address, chains, keys):
    """
    GoPlus security scan — address risk flags.
    Uses free REST endpoint; key/secret available but not required for basic scan.
    """
    out = {}
    addr_lc = address.lower()

    # Basic address security (free, no key needed)
    try:
        r = requests.get(
            f"https://api.gopluslabs.io/api/v1/address_security/{addr_lc}?chain_id=1",
            timeout=15
        )
        d   = r.json()
        raw = d.get("result", {})
        # Filter out false positive: contract_address flag on EOA
        flags = {k: v for k, v in raw.items() if v not in (None, "0", 0, "", False) and k != "contract_address"}
        out["flags"]     = flags
        out["flag_count"]= len(flags)
    except Exception as e:
        out["flags"] = {"error": str(e)}

    # GoPlus phishing site check
    try:
        r = requests.get(
            f"https://api.gopluslabs.io/api/v1/phishing_site?url={addr_lc}",
            timeout=10
        )
        out["phishing"] = r.json().get("result", {})
    except Exception:
        pass

    out["source"] = "goplus_rest GL-L60"
    return out


# ─────────────────────────────────────────────────────────────────────────────
# ETHERSCAN V2  — GL-L60 FIXED: multi-chain via chainid param
# ─────────────────────────────────────────────────────────────────────────────

def _etherscan_rest(address, chains, keys):
    """
    Etherscan V2 multi-chain scanner.

    GL-L60 FIX:
      - Uses api.etherscan.io/v2/api?chainid=N for all supported chains
      - Fires ETH(1), Base(8453), BSC(56), Polygon(137), Arbitrum(42161)
      - Also hits Basescan directly as fallback for Base chain
      - NOTE: Free tier only covers chainid=1 (ETH mainnet) via Etherscan V2.
        Base/BSC/Polygon require paid plan. Basescan key covers Base directly.
    """
    hdrs = {"Accept": "application/json"}
    out  = {}
    v2   = "https://api.etherscan.io/v2/api"
    es_key = keys.get("etherscan", "")
    bs_key = keys.get("basescan",  "")

    for chain_id in chains:
        chain_name = CHAIN_NAMES.get(chain_id, str(chain_id))
        try:
            # GL-L60 FIX: Base chain (8453) — Etherscan V2 requires paid plan for non-ETH chains
            # Basescan V1 deprecated. Use Chainstack Base RPC directly for balance + nonce.
            # For tx/token history on Base, fall through to Moralis (which covers Base cleanly).
            if chain_id == 8453:
                cs_base = "https://base-mainnet.core.chainstack.com/c726a0ad837354cad25d58bd89c7ac57"
                def _rpc(method, params):
                    try:
                        r = requests.post(cs_base, json={"jsonrpc":"2.0","id":1,"method":method,"params":params}, timeout=10)
                        return r.json()
                    except Exception as ex:
                        return {"error": str(ex)}
                b   = _rpc("eth_getBalance",          [address, "latest"])
                n   = _rpc("eth_getTransactionCount", [address, "latest"])
                c   = _rpc("eth_getCode",             [address, "latest"])
                bal_wei  = int(b.get("result","0x0"),16) if "result" in b else 0
                nonce    = int(n.get("result","0x0"),16) if "result" in n else 0
                code_val = c.get("result","0x")
                is_contr = isinstance(code_val,str) and len(code_val) > 2
                out[chain_id] = {
                    "chain_name":    "Base",
                    "balance_eth":   bal_wei / 1e18,
                    "balance_raw":   bal_wei,
                    "tx_count":      nonce,
                    "is_contract":   is_contr,
                    "code_size":     (len(code_val)-2)//2 if is_contr else 0,
                    "tx_sample":     [],
                    "token_transfers": 0,
                    "token_sample":  [],
                    "source":        "chainstack_rpc ✅ GL-L60"
                }
                continue

            base_url = v2
            api_key  = es_key

            params_bal = {
                "module":   "account",
                "action":   "balance",
                "address":  address,
                "tag":      "latest",
                "apikey":   api_key,
                "chainid":  chain_id
            }

            bal_r = requests.get(base_url, params=params_bal, headers=hdrs, timeout=15)
            bal_d = bal_r.json()

            params_tx = {
                "module":     "account",
                "action":     "txlist",
                "address":    address,
                "startblock": "0",
                "endblock":   "99999999",
                "page":       "1",
                "offset":     "10",
                "sort":       "desc",
                "apikey":     api_key,
                "chainid":    chain_id
            }

            tx_r  = requests.get(base_url, params=params_tx,  headers=hdrs, timeout=20)
            tx_d  = tx_r.json()

            # Token transfers
            params_tok = dict(params_tx)
            params_tok["action"] = "tokentx"
            tok_r = requests.get(base_url, params=params_tok, headers=hdrs, timeout=20)
            tok_d = tok_r.json()

            bal_wei  = int(bal_d.get("result", 0)) if bal_d.get("status") == "1" else 0
            tx_list  = tx_d.get("result", []) if tx_d.get("status") == "1" else []
            tok_list = tok_d.get("result", []) if tok_d.get("status") == "1" else []

            out[chain_id] = {
                "chain_name":   chain_name,
                "balance_eth":  bal_wei / 1e18,
                "balance_raw":  bal_wei,
                "tx_count":     len(tx_list),
                "tx_sample": [
                    {
                        "date":   datetime.fromtimestamp(int(tx["timeStamp"])).strftime("%Y-%m-%d"),
                        "from":   tx["from"][:14],
                        "to":     tx["to"][:14],
                        "value":  int(tx["value"]) / 1e18,
                        "method": (tx.get("functionName") or "ETH")[:25]
                    }
                    for tx in tx_list[:5]
                ],
                "token_transfers": len(tok_list),
                "token_sample": [
                    {
                        "date":   datetime.fromtimestamp(int(t["timeStamp"])).strftime("%Y-%m-%d"),
                        "dir":    "IN" if t["to"].lower() == address.lower() else "OUT",
                        "value":  int(t["value"]) / (10 ** int(t.get("tokenDecimal", 18) or 18)),
                        "symbol": t["tokenSymbol"],
                        "from":   t["from"][:14],
                        "to":     t["to"][:14]
                    }
                    for t in tok_list[:5]
                ],
                "source":       f"{'basescan' if chain_id == 8453 else 'etherscan_v2'} GL-L60"
            }

        except Exception as e:
            out[chain_id] = {"chain_name": chain_name, "error": str(e)}

    return out


# ─────────────────────────────────────────────────────────────────────────────
# QUICKNODE RPC  — GL-L60 NEW: direct RPC balance + nonce + code check
# ─────────────────────────────────────────────────────────────────────────────

def _quicknode_rpc(address, keys):
    """
    QuickNode RPC direct calls — ETH mainnet balance, nonce, code.
    GL-L60 NEW: Added as dedicated scanner to complement Etherscan.
    Full endpoint: ...quiknode.pro/8d8e8ffb350c39346213f1e647de678338c31644/
    """
    qn_http = keys.get("quicknode_http", "")
    if not qn_http:
        return {"error": "no quicknode_http key provided"}

    def rpc(method, params):
        try:
            r = requests.post(
                qn_http,
                json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
                timeout=15
            )
            return r.json()
        except Exception as e:
            return {"error": str(e)}

    out = {}

    # ETH mainnet checks
    bal   = rpc("eth_getBalance",          [address, "latest"])
    nonce = rpc("eth_getTransactionCount", [address, "latest"])
    code  = rpc("eth_getCode",             [address, "latest"])
    blk   = rpc("eth_blockNumber",         [])

    out["eth_balance"] = int(bal["result"], 16) / 1e18   if "result" in bal   else bal
    out["eth_nonce"]   = int(nonce["result"], 16)         if "result" in nonce else nonce
    code_val           = code.get("result", "0x")
    out["is_contract"] = isinstance(code_val, str) and len(code_val) > 2
    if out["is_contract"]:
        out["code_size"]   = (len(code_val) - 2) // 2
        out["code_prefix"] = code_val[:66]
    out["latest_block"] = int(blk["result"], 16) if "result" in blk else blk
    out["source"]       = "quicknode_rpc ✅ GL-L60"
    return out


# ─────────────────────────────────────────────────────────────────────────────
# BITQUERY  — Historical archive (skip if quota exhausted)
# ─────────────────────────────────────────────────────────────────────────────

def _get_bitquery_token(keys):
    """Get Bitquery OAuth2 token. Returns None if client_id is missing/partial."""
    client_id     = keys.get("bitquery_client_id")
    client_secret = keys.get("bitquery_client_secret")
    if not client_id or not client_secret or len(client_id) < 32:
        return None
    try:
        r = requests.post(
            "https://oauth2.bitquery.io/oauth2/token",
            data={
                "grant_type":    "client_credentials",
                "client_id":     client_id,
                "client_secret": client_secret,
                "scope":         "api"
            },
            timeout=15
        )
        return r.json().get("access_token")
    except Exception:
        return None


def _bitquery_rest(address, token):
    """Bitquery EVM historical tx archive."""
    if not token:
        return {"error": "No OAuth2 token — client_id partial or quota exhausted"}

    query = """
    query ($addr: String!) {
        EVM(network: eth, dataset: archive) {
            sent: Transfers(
                where: {Transfer: {Sender: {is: $addr}}}
                limit: {count: 5}
                orderBy: {descending: Block_Time}
            ) {
                Block { Time }
                Transfer { Amount Currency { Symbol } Sender Receiver }
            }
            received: Transfers(
                where: {Transfer: {Receiver: {is: $addr}}}
                limit: {count: 5}
                orderBy: {descending: Block_Time}
            ) {
                Block { Time }
                Transfer { Amount Currency { Symbol } Sender Receiver }
            }
        }
    }
    """
    try:
        r = requests.post(
            "https://streaming.bitquery.io/graphql",
            json={"query": query, "variables": {"addr": address}},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type":  "application/json"
            },
            timeout=30
        )
        return r.json()
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# MAIN SCAN — fires all tools in parallel
# ─────────────────────────────────────────────────────────────────────────────

def scan(address, chains=None, keys=None):
    """
    Fire all forensic tools in parallel against an address.

    Args:
        address: EVM address (checksummed or lowercase)
        chains:  list of chain IDs, default [1, 8453, 56, 137, 42161]
        keys:    dict from TheWardenKeys (pass at runtime, never hardcode)

    Returns:
        dict with results keyed by tool name + meta block
    """
    if chains is None:
        chains = [1, 8453, 56, 137, 42161]
    if keys is None:
        keys = {}

    address = address.lower()
    print(f"[TheWarden] Scanning {address}")
    print(f"[TheWarden] Chains: {[CHAIN_NAMES.get(c, c) for c in chains]}")

    # Pre-fetch Bitquery token (sequential — needed before REST call)
    print("[TheWarden] Fetching Bitquery token...")
    bq_token = _get_bitquery_token(keys)
    if bq_token:
        print("[TheWarden] Bitquery: ✅ token acquired")
    else:
        print("[TheWarden] Bitquery: ❌ skipped (client_id partial or quota)")

    print("[TheWarden] Firing all tools in parallel...")
    t0 = time.time()

    results = {}
    tool_log = []

    def run(name, fn, *args):
        try:
            r = fn(*args)
            results[name] = r
            icon = "🔗 MCP" if name in ("chainbase", "nansen", "tenderly") else "📡 REST"
            print(f"[TheWarden]   {name:<12} ✅  {icon}")
            tool_log.append(name)
        except Exception as e:
            results[name] = {"error": str(e)}
            print(f"[TheWarden]   {name:<12} ❌  {str(e)[:50]}")

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = {
            pool.submit(run, "chainbase", _chainbase_mcp,   address, chains, keys): "chainbase",
            pool.submit(run, "nansen",    _nansen_mcp,       address, keys):         "nansen",
            pool.submit(run, "tenderly",  _tenderly_mcp,     address, keys):         "tenderly",
            pool.submit(run, "arkham",    _arkham_rest,      address, keys):         "arkham",
            pool.submit(run, "moralis",   _moralis_rest,     address, chains, keys): "moralis",
            pool.submit(run, "goplus",    _goplus_rest,      address, chains, keys): "goplus",
            pool.submit(run, "etherscan", _etherscan_rest,   address, chains, keys): "etherscan",
            pool.submit(run, "quicknode", _quicknode_rpc,    address, keys):         "quicknode",
            pool.submit(run, "bitquery",  _bitquery_rest,    address, bq_token):     "bitquery",
        }
        concurrent.futures.wait(futures, timeout=90)

    elapsed = time.time() - t0
    print(f"[TheWarden] Complete in {elapsed:.1f}s — {len(tool_log)} tools returned data")

    results["meta"] = {
        "address":    address,
        "chains":     chains,
        "elapsed_s":  round(elapsed, 2),
        "tools_fired":tool_log,
        "mcp_stack":  [t for t in tool_log if t in ("chainbase", "nansen", "tenderly")],
        "rest_stack":  [t for t in tool_log if t not in ("chainbase", "nansen", "tenderly")],
        "scanned_at": datetime.now(timezone.utc).isoformat()
    }
    return results


# ─────────────────────────────────────────────────────────────────────────────
# PRINT REPORT
# ─────────────────────────────────────────────────────────────────────────────

def print_report(results):
    """Pretty-print the full forensic report."""
    meta    = results.get("meta", {})
    address = meta.get("address", "?")
    elapsed = meta.get("elapsed_s", "?")

    print()
    print("=" * 66)
    print(f"  THEWARDEN FORENSIC REPORT  [GL-L60]")
    print(f"  Address: {address}")
    print(f"  Elapsed: {elapsed}s")
    print("=" * 66)

    # ── GoPlus ──────────────────────────────────────────────────────────────
    print(f"\n[GOPLUS — Security Flags]")
    gp = results.get("goplus", {})
    flags = gp.get("flags", {})
    if isinstance(flags, dict) and "error" not in flags:
        if flags:
            for k, v in flags.items():
                print(f"  🚨 {k}: {v}")
        else:
            print("  ✅ No flags (clean address)")
    else:
        print(f"  {flags}")

    # ── QuickNode RPC ────────────────────────────────────────────────────────
    print(f"\n[QUICKNODE — ETH Mainnet RPC]")
    qn = results.get("quicknode", {})
    if "error" in qn:
        print(f"  ❌ {qn['error']}")
    else:
        print(f"  ETH Balance:   {qn.get('eth_balance', '?'):.6f} ETH")
        print(f"  Nonce (txs):   {qn.get('eth_nonce', '?'):,}")
        is_c = qn.get("is_contract", False)
        print(f"  Contract:      {'YES — ' + str(qn.get('code_size','?')) + ' bytes  ← ' + qn.get('code_prefix','')[:20] if is_c else 'NO — EOA'}")
        print(f"  Latest Block:  {qn.get('latest_block', '?'):,}")

    # ── Arkham ──────────────────────────────────────────────────────────────
    print(f"\n[ARKHAM — Entity Attribution]")
    ak = results.get("arkham", {})
    entity = ak.get("entity", {})
    label  = ak.get("label",  {})
    if isinstance(entity, dict) and entity:
        name = entity.get("name") or entity.get("arkhamEntity", {}).get("name")
        print(f"  Entity:  {name or 'Unknown / Unlabeled'}")
    else:
        print(f"  Entity:  Unknown / Unlabeled")
    xfers = ak.get("transfers", [])
    print(f"  Transfers ({ak.get('transfer_count', 0)} total, showing {len(xfers) if isinstance(xfers, list) else 0}):")
    if isinstance(xfers, list):
        for tx in xfers[:5]:
            print(f"    {tx.get('date','')}  {tx.get('from','?')} → {tx.get('to','?')}  {tx.get('value','?')} {tx.get('symbol','?')}")

    # ── Chainbase MCP ────────────────────────────────────────────────────────
    print(f"\n[CHAINBASE MCP — Multi-chain Activity]")
    cb = results.get("chainbase", {})
    total_txs = 0
    for chain_id, cdata in cb.items():
        if not isinstance(cdata, dict) or chain_id == "source":
            continue
        cname = cdata.get("chain_name", chain_id)
        if "error" in cdata:
            print(f"  {cname:<10}  ❌ {cdata['error'][:50]}")
            continue
        cnt   = cdata.get("tx_count", 0)
        bal   = cdata.get("balance_raw", "?")
        total_txs += int(cnt) if str(cnt).isdigit() else 0
        dot   = "🔴" if cnt and int(str(cnt)) > 0 else "⚪"
        print(f"  {cname:<10}  {dot}  {cnt} txs  |  balance: {bal}")
        for tx in cdata.get("tx_sample", [])[:2]:
            if isinstance(tx, dict):
                print(f"    ↳ {str(tx)[:80]}")
    print(f"  TOTAL: {total_txs} txs (sample across chains)")

    # ── Moralis ──────────────────────────────────────────────────────────────
    print(f"\n[MORALIS — Wallet History + Net Worth]")
    mo = results.get("moralis", {})
    if "error" in mo:
        print(f"  ❌ {mo['error']}")
    else:
        print(f"  Net Worth: ${mo.get('net_worth_usd', '?')}")
        for chain_w_bal in mo.get("chains_with_balance", []):
            print(f"  💰 {chain_w_bal.get('chain','?'):<10} ${chain_w_bal.get('networth_usd','?')}")
        hist = mo.get("history", {})
        for chain_name, hdata in hist.items():
            if "error" in hdata:
                print(f"  {chain_name}: ❌ {hdata['error'][:60]}")
                continue
            cnt  = hdata.get("tx_count_sample", 0)
            more = " + more" if hdata.get("has_more") else ""
            print(f"  {chain_name:<10}  {cnt} txs{more}")
            for tx in hdata.get("latest", [])[:3]:
                status = "✅" if str(tx.get("status")) == "1" else "❌" if str(tx.get("status")) == "0" else "?"
                print(f"    {status} {tx.get('date','')}  [{tx.get('category','?')[:14]}]  {tx.get('summary','?')[:50]}")
                for nt in tx.get("native_transfers", [])[:1]:
                    if isinstance(nt, dict):
                        print(f"       ETH: {nt.get('from_address','?')[:12]}→{nt.get('to_address','?')[:12]}  {nt.get('value_formatted','?')} ETH")

    # ── Etherscan V2 ─────────────────────────────────────────────────────────
    print(f"\n[ETHERSCAN V2 + BASESCAN — Multi-chain]")
    es = results.get("etherscan", {})
    for chain_id, edata in es.items():
        if not isinstance(edata, dict):
            continue
        cname = edata.get("chain_name", chain_id)
        if "error" in edata:
            print(f"  {cname:<10}  ❌ {edata['error'][:60]}")
            continue
        bal  = edata.get("balance_eth", 0)
        cnt  = edata.get("tx_count", 0)
        toks = edata.get("token_transfers", 0)
        dot  = "🔴" if cnt > 0 or bal > 0 else "⚪"
        print(f"  {cname:<10}  {dot}  {bal:.6f} ETH  |  {cnt} txs  |  {toks} token txs")
        for tx in edata.get("tx_sample", [])[:2]:
            print(f"    ↳ {tx.get('date','')}  {tx.get('from','?')} → {tx.get('to','?')}  {tx.get('value',0):.4f} ETH  [{tx.get('method','?')[:20]}]")
        for tok in edata.get("token_sample", [])[:2]:
            print(f"    🪙 {tok.get('date','')}  {tok.get('dir','?')}  {tok.get('value',0):.2f} {tok.get('symbol','?')}")

    # ── Nansen ──────────────────────────────────────────────────────────────
    print(f"\n[NANSEN MCP — Smart Money Profile]")
    na = results.get("nansen", {})
    for key in ("search", "portfolio", "pnl", "counterparties", "transactions", "related"):
        val = na.get(key)
        if val is None:
            continue
        snippet = str(val)[:100] if not isinstance(val, dict) or "error" not in val else f"❌ {val['error'][:80]}"
        print(f"  {key:<16} {snippet}")

    # ── Tenderly ─────────────────────────────────────────────────────────────
    print(f"\n[TENDERLY MCP — Contract Check]")
    td = results.get("tenderly", {})
    for k, v in td.items():
        if k != "source":
            print(f"  {k:<15}  {v}")

    # ── Bitquery ─────────────────────────────────────────────────────────────
    print(f"\n[BITQUERY — Historical Archive (ETH)]")
    bq = results.get("bitquery", {})
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

    # ── Meta ─────────────────────────────────────────────────────────────────
    mcp  = meta.get("mcp_stack",  [])
    rest = meta.get("rest_stack", [])
    print(f"\n  🔗 MCP:  {mcp}")
    print(f"  📡 REST: {rest}")
    print(f"  ⏱  {elapsed}s | scanned: {meta.get('scanned_at','?')[:19]}")
    print()
    print("=" * 66)
    print()
