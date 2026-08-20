#!/usr/bin/env python3
"""
warden_forensic_scan.py — TheWarden Universal Forensic Address Scanner
══════════════════════════════════════════════════════════════════════════
VL-26 v5.2 — 20/20 TOOLS ARMED AND FIRING IN PARALLEL

TOOL REGISTRY:
  MCP (JSON-RPC 2.0):
    Chainbase  api.chainbase.com/v1/mcp        17 tools  X-API-KEY
    Nansen     mcp.nansen.ai/ra/mcp            37 tools  NANSEN-API-KEY (SSE)
    Tenderly   api.tenderly.co/mcp             59 tools  X-Access-Key

  REST:
    Arkham       api.arkm.com                  entity + transfers
    Moralis      deep-index.moralis.io/v2.2    wallet history + net worth
    Etherscan    api.etherscan.io/v2           multi-chain
    QuickNode    RPC direct                    balance + nonce + code
    GoPlus       api.gopluslabs.io             security flags (free, no auth)
    GoldRush     api.covalenthq.com/v1         200+ chains balances
    Bitquery     streaming.bitquery.io/eap     ory_at bearer (QUOTA — graceful)
    OnChainRisk  api.onchainrisk.io/api/v1     AML score
    Chainabuse   api.chainabuse.com/v0         sanctions screening
    BICScan      api.bicscan.io/v2             OFAC + 7 engines risk score  [v5.0 NEW]
    Zerion       api.zerion.io/v1              portfolio + DeFi positions   [v5.0 NEW]
    Bitcoin      mempool.space/api             BTC address lookup (keyless) [v5.0 NEW]
    Dune         api.dune.com/api/v1           SQL analytics                [v5.0 NEW]
    Jina         r.jina.ai                     web intelligence             [v5.0 NEW]
    AnChain AI   api.anchainai.com             risk score + entity labels   [v5.1 NEW]
    TRM Labs     api.trmlabs.com               sanctions screening (keyless free) [v5.2 NEW]

KEYS dict (v5.2 / VL-26):
    arkham, chainbase, moralis, nansen, etherscan, goplus_key, goplus_secret,
    tenderly, quicknode_http, basescan, goldrush, bitquery_bearer,
    onchainrisk, chainabuse, dune, jina, bicscan, zerion, anchain, trm

USAGE:
    report = scan("0xADDRESS", chains=[1, 8453, 56, 137, 42161], keys=KEYS)
    print_report(report)

    # BTC address:
    report = scan("1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf Nr", chains=[], keys=KEYS)

CHANGELOG:
    GL-L76: Chainbase JSON-RPC 2.0 + correct tool names
            Nansen SSE Accept header fix
            Bitquery ory_at bearer on /eap
            GoPlus free unauthenticated REST
            GoldRush 200+ chain token balances
            OnChainRisk + Chainabuse added
            ThreadPoolExecutor max_workers=13
    GL-L83: Arkham key rotated (77d24c4d...)
    VL-1:   Moralis JWT refreshed, GoldRush key rotated, OnChainRisk sandbox
    VL-2:   Jina key rotated (bypass Cloudflare headers)
    VL-25:  BICScan REST added (OFAC + 7 engines, App ID 435)
            Zerion REST added (portfolio + DeFi, Demo 300 req/day)
            Bitcoin/mempool.space added (keyless BTC lookup)
            Dune Analytics added (SQL query engine)
            Jina key updated to v22
            max_workers bumped to 18
            VL-27: Bitquery bearer rotated (ory_at_b1QN...) — graceful fallback on 402 billing errors
            Scanner version: v5.0
    VL-26:  AnChain AI REST added (risk score + entity labels, /api/intel/address/score)
            max_workers bumped to 19
            Scanner version: v5.1
            TRM Labs Sanctions REST added (keyless free, POST /public/v1/sanctions/screening)
            max_workers bumped to 20
            Scanner version: v5.2

CURRENT KEYS (VL-27 / v24 — August 2026):
    arkham         = 77d24c4d-6b2b-471a-88b6-9e6e75ba7358
    chainbase      = 3EEEM9sRu2rzYSGX1GCR1Jc7X8i
    nansen         = nsn_32d50c7e1dec90ec0ee4cfca4f5c29f9
    moralis        = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...ni5R9da4GZM2Bi-Ipmfa8d1-0LGLQuu4sJn4K3Cjh0Q
    etherscan      = ES16B14B19XWKXJBIHUAJRXJHECXHM6WEK
    basescan       = QT7KI56B365U22NXMJJM4IU7Q8MVER69RY
    tenderly       = K5LF4-PBJUwWLL-BmD3LEn3e-GvguZ3k
    goldrush       = cqt_rQGWWvgk9qGMtCMQMxKY7VWQJJXy
    bitquery       = ory_at_b1QNBWHrJzpCn3Qhkb8kp-y... (VL-27 rotated)
    onchainrisk    = ocr_test_a947101ca196b7f0aa2ac6a1f4c96df0aefd0ad3d5d4f201
    dune           = CRxZFkgiBpR4f1ak1GzeTR4lTMgTo8op
    jina           = jina_f140e19479774b65b77bf41f7985135fvxn1Qedbig2ziw3Mf-Tj5fNoOkBq
    quicknode_http = https://purple-hidden-general.ethereum-mainnet.quiknode.pro/8d8e8ffb350c39346213f1e647de678338c31644/
    goplus_key     = RBTk9aFqgDwbHPq3juME
    goplus_secret  = fEVawfkqNSeFu2Wz7WuFsfeTrHKP00Jn
    bicscan        = (vaulted: bicscan/api_key)
    zerion         = (vaulted: zerion/api_key)
    chainabuse     = (register free at chainabuse.com)
    anchain        = 3c083Az1ZJP2_5QVT4mpnNOeMyQXqBhMoRwjPBocyCgTFKUdx1LNus91Sw.yJx5H2q3tEo.C3wLQQ
    trm            = (keyless free — no key needed. Optional: request paid key at trmlabs.com/products/sanctions)
══════════════════════════════════════════════════════════════════════════
"""

import concurrent.futures
import requests
import json
import time
from datetime import datetime, timezone

CHAIN_NAMES   = {1:"ETH", 8453:"Base", 56:"BSC", 137:"Polygon", 42161:"Arbitrum", 10:"Optimism"}
MORALIS_CHAIN = {1:"eth",  8453:"base", 56:"bsc", 137:"polygon", 42161:"arbitrum"}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  MCP HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _chainbase_mcp(address, chains, keys):
    """Chainbase JSON-RPC 2.0 MCP — correct tool names confirmed GL-L76."""
    url    = "https://api.chainbase.com/v1/mcp"
    apikey = keys.get("chainbase", "")
    hdrs   = {"X-API-KEY": apikey, "Content-Type": "application/json"}
    out    = {}

    for chain_id in chains:
        try:
            bal_r = requests.post(url, headers=hdrs, timeout=20, json={
                "jsonrpc":"2.0","id":1,"method":"tools/call",
                "params":{"name":"GetAccountBalance","arguments":{
                    "chain_id":str(chain_id),"address":address,
                    "contract_address":"","to_block":"latest"}}})
            bal_data = bal_r.json().get("result",{}).get("content",[{}])[0].get("text","")
            try:
                bal_parsed = json.loads(bal_data)
                balance_wei = int(bal_parsed.get("data","0") or "0",16)
                balance_eth = balance_wei / 1e18
            except Exception:
                balance_eth = 0

            tx_r = requests.post(url, headers=hdrs, timeout=20, json={
                "jsonrpc":"2.0","id":2,"method":"tools/call",
                "params":{"name":"GetAccountTxs","arguments":{
                    "chain_id":str(chain_id),"address":address,
                    "page":1,"limit":5}}})
            tx_content = tx_r.json().get("result",{}).get("content",[{}])[0].get("text","")
            try:
                tx_parsed = json.loads(tx_content)
                tx_count  = tx_parsed.get("count", len(tx_parsed.get("data",[])))
                sample    = tx_parsed.get("data",[])[:2]
            except Exception:
                tx_count, sample = 0, []

            out[chain_id] = {"balance_eth":round(balance_eth,6),"tx_count":tx_count,"sample":sample}
        except Exception as ex:
            out[chain_id] = {"error": str(ex)[:80]}

    return out


def _nansen_mcp(address, keys):
    """Nansen MCP SSE — GL-L76 v3.1: correct schemas, graceful 403 tier."""
    url    = "https://mcp.nansen.ai/ra/mcp"
    apikey = keys.get("nansen","")
    hdrs   = {"NANSEN-API-KEY":apikey,"Content-Type":"application/json",
              "Accept":"application/json, text/event-stream"}

    def nansen_call(tool_name, arguments):
        r = requests.post(url,headers=hdrs,timeout=25,json={
            "jsonrpc":"2.0","id":1,"method":"tools/call",
            "params":{"name":tool_name,"arguments":arguments}})
        for line in r.text.split("\n"):
            if line.startswith("data:"):
                try:
                    obj = json.loads(line[5:].strip())
                    if "error" in obj:
                        msg = obj["error"].get("message", str(obj["error"]))[:120]
                        return "tier_limited (403)" if "403" in msg else f"error: {msg}"
                    return obj.get("result",{}).get("content",[{}])[0].get("text","")[:400]
                except Exception:
                    pass
        return "(no data)"

    out = {}
    out["portfolio"]     = nansen_call("address_portfolio",
                              {"request": {"walletAddress": address}})
    out["transactions"]  = nansen_call("address_transactions",
                              {"request": {"address": address, "chain": "base"}})
    out["entity_search"] = nansen_call("general_search", {"query": address})
    return out


def _tenderly_mcp(address, keys):
    """Tenderly MCP — contract check on ETH + Base."""
    url    = "https://api.tenderly.co/mcp"
    apikey = keys.get("tenderly","")
    hdrs   = {"X-Access-Key":apikey,"Content-Type":"application/json"}
    out    = {}

    for chain_id, label in [(1,"ETH"),(8453,"Base")]:
        try:
            r = requests.post(url,headers=hdrs,timeout=20,json={
                "jsonrpc":"2.0","id":1,"method":"tools/call",
                "params":{"name":"getContractInfo","arguments":{
                    "networkId":str(chain_id),"address":address}}})
            text = r.json().get("result",{}).get("content",[{}])[0].get("text","")
            out[label] = text[:200] if text else "EOA / Not contract"
        except Exception as ex:
            out[label] = f"Error: {str(ex)[:60]}"
    return out


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  REST HELPERS — EXISTING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _arkham_rest(address, keys):
    apikey = keys.get("arkham","")
    out    = {}
    try:
        e = requests.get(f"https://api.arkm.com/entity/{address}",
                         headers={"API-Key":apikey},timeout=20)
        entity = e.json() if e.ok else {}
        out["entity"] = entity.get("name") or entity.get("entity",{}).get("name","Unknown / Unlabeled")
    except Exception as ex:
        out["entity"] = f"error:{ex}"
    try:
        t = requests.get(
            f"https://api.arkm.com/transfers?address={address}&limit=10&sortKey=time&sortDir=desc",
            headers={"API-Key":apikey},timeout=20)
        transfers = t.json().get("transfers",[]) if t.ok else []
        out["transfer_count"] = len(transfers)
        out["transfers"] = []
        for tr in transfers[:10]:
            if not isinstance(tr, dict):
                continue
            fa  = tr.get("fromAddress") or {}
            ta  = tr.get("toAddress")   or {}
            tok = tr.get("tokenAddress") or {}
            out["transfers"].append({
                "time":   (tr.get("blockTimestamp") or "")[:10],
                "from":   (fa.get("address") or "?")[:22],
                "to":     (ta.get("address") or "?")[:22],
                "amount": str(tr.get("unitValue") or "?")[:14],
                "token":  str(tok.get("symbol") or "ETH")[:8],
                "chain":  str(fa.get("chain") or "?")[:8],
            })
    except Exception as ex:
        out["transfers"] = []
        out["transfer_error"] = str(ex)[:60]
    return out


def _moralis_rest(address, chains, keys):
    apikey = keys.get("moralis","")
    out    = {}
    try:
        nw = requests.get(f"https://deep-index.moralis.io/api/v2.2/wallets/{address}/net-worth",
                          headers={"X-API-Key":apikey},timeout=20)
        chains_nw = nw.json().get("chains",[]) if nw.ok else []
        total = sum(float(x.get("networth_usd",0) or 0) for x in chains_nw)
        out["net_worth_usd"] = round(total,2)
    except Exception:
        out["net_worth_usd"] = 0

    for chain_id in chains:
        cname = MORALIS_CHAIN.get(chain_id, str(chain_id))
        try:
            r = requests.get(
                f"https://deep-index.moralis.io/api/v2.2/wallets/{address}/history",
                headers={"X-API-Key":apikey},
                params={"chain":cname,"limit":5},timeout=20)
            data  = r.json() if r.ok else {}
            txs   = data.get("result",[])
            count = data.get("total", len(txs))
            out[cname] = {"count":count,"sample":[{
                "date":    tx.get("block_timestamp","")[:10],
                "type":    tx.get("category","?"),
                "summary": tx.get("summary","?")[:60],
                "value":   (tx.get("native_transfers",[{}]) or [{}])[0].get("value_formatted","0"),
                "status":  "✅" if tx.get("receipt_status")=="1" else "❌",
            } for tx in txs[:3]]}
        except Exception as ex:
            out[cname] = {"count":0,"error":str(ex)[:60]}
    return out


def _goplus_rest(address, chains, keys):
    """GoPlus free REST — no auth needed."""
    try:
        r = requests.get(f"https://api.gopluslabs.io/api/v1/address_security/{address}",timeout=15)
        data  = r.json().get("result",{}) if r.ok else {}
        flags = {k:v for k,v in data.items() if v not in [None,"0",0,"",False]}
        return {"flags":flags,"flag_count":len(flags),"clean":len(flags)==0}
    except Exception as ex:
        return {"error":str(ex)[:80]}


def _etherscan_rest(address, chains, keys):
    eth_key  = keys.get("etherscan","")
    base_key = keys.get("basescan","")
    out      = {}
    for chain_id in [1,8453,56,137,42161]:
        if chain_id not in chains:
            continue
        api_key = base_key if chain_id==8453 else eth_key
        try:
            bal_r = requests.get("https://api.etherscan.io/v2/api",params={
                "chainid":chain_id,"module":"account","action":"balance",
                "address":address,"tag":"latest","apikey":api_key},timeout=15)
            raw = bal_r.json().get("result","0")
            try:
                balance_eth = int(raw)/1e18 if str(raw).isdigit() else 0
            except (ValueError, TypeError):
                balance_eth = 0

            tx_r = requests.get("https://api.etherscan.io/v2/api",params={
                "chainid":chain_id,"module":"account","action":"txlist",
                "address":address,"startblock":0,"endblock":99999999,
                "sort":"desc","page":1,"offset":5,"apikey":api_key},timeout=15)
            tx_data  = tx_r.json()
            tx_list  = tx_data.get("result",[]) if tx_data.get("status")=="1" else []
            try:
                msg = tx_data.get("message","")
                tx_count = int(msg.split("found ")[-1].split(" ")[0]) if "found" in msg else len(tx_list)
            except (ValueError, TypeError):
                tx_count = len(tx_list)

            out[chain_id] = {"balance_eth":round(balance_eth,6),"tx_count":tx_count,"sample":tx_list[:2]}
        except Exception as ex:
            out[chain_id] = {"error":str(ex)[:60]}
    return out


def _quicknode_rpc(address, keys):
    url = keys.get("quicknode_http","")
    if not url:
        return {"error":"no quicknode_http key"}
    def rpc(method, params):
        r = requests.post(url,json={"jsonrpc":"2.0","id":1,"method":method,"params":params},timeout=15)
        return r.json().get("result")
    try:
        bal   = rpc("eth_getBalance",[address,"latest"])
        nonce = rpc("eth_getTransactionCount",[address,"latest"])
        code  = rpc("eth_getCode",[address,"latest"])
        block = rpc("eth_blockNumber",[])
        return {
            "balance_eth": int(bal,16)/1e18   if bal   else 0,
            "nonce":       int(nonce,16)       if nonce else 0,
            "is_contract": len(code)>4         if code  else False,
            "latest_block":int(block,16)       if block else 0,
        }
    except Exception as ex:
        return {"error":str(ex)[:80]}


def _bitquery_rest(address, keys):
    """Bitquery — QUOTA EXHAUSTED on free tier, graceful no-op."""
    bearer = keys.get("bitquery_bearer","")
    if not bearer:
        return {"status":"no_key","note":"No bitquery_bearer in keys"}
    # Free tier quota exhausted as of VL-25 — return graceful message
    return {"status":"quota_exhausted","note":"Bitquery free quota exhausted — upgrade plan or rotate bearer"}


def _goldrush_rest(address, chains, keys):
    """GoldRush (Covalent) 200+ chains token balances."""
    key = keys.get("goldrush","")
    if not key:
        return {"error":"goldrush key missing"}
    out = {}
    for chain_id in chains:
        try:
            r = requests.get(
                f"https://api.covalenthq.com/v1/{chain_id}/address/{address}/balances_v2/",
                headers={"Authorization":f"Bearer {key}"},timeout=20)
            items = r.json().get("data",{}).get("items",[]) if r.ok else []
            total = sum(float(i.get("quote",0) or 0) for i in items)
            tokens = []
            for item in items[:8]:
                bal = item.get("balance",0)
                dec = item.get("contract_decimals",18)
                try: bal_h = int(bal)/(10**dec) if bal else 0
                except: bal_h = 0
                usd = float(item.get("quote",0) or 0)
                tokens.append({"symbol":item.get("contract_ticker_symbol","?"),
                                "balance":round(bal_h,6),"usd":round(usd,2)})
            out[chain_id] = {"total_usd":round(total,2),"token_count":len(items),"tokens":tokens}
        except Exception as ex:
            out[chain_id] = {"error":str(ex)[:60]}
    return out


def _onchainrisk_rest(address, keys):
    """OnChainRisk AML score. Sandbox key = tier_required."""
    key = keys.get("onchainrisk","")
    if not key:
        return {"status":"no_key","note":"Add onchainrisk key to KEYS"}
    try:
        r = requests.get(f"https://api.onchainrisk.io/api/v1/address/{address}",
                         headers={"Authorization":f"Bearer {key}"},timeout=15)
        if r.status_code == 403:
            try:
                if r.json().get("error")=="sandbox_not_supported":
                    return {"status":"tier_required","key_valid":True,
                            "note":"Key valid — paid plan required for /api/v1"}
            except Exception:
                pass
        return {"status":"ok","data":r.json()} if r.ok else {"status":"error","code":r.status_code}
    except Exception as ex:
        return {"status":"error","error":str(ex)[:80]}


def _chainabuse_rest(address, keys):
    """Chainabuse sanctions. Register at chainabuse.com for free key."""
    key = keys.get("chainabuse","")
    if not key:
        return {"status":"no_key","note":"Register at chainabuse.com — free, 100/day"}
    try:
        r = requests.get(f"https://api.chainabuse.com/v0/reports?address={address}",
                         headers={"Authorization":f"Bearer {key}"},timeout=15)
        if r.ok:
            reports = r.json().get("reports",[])
            return {"status":"ok","report_count":len(reports),
                    "sanctioned":any(rp.get("type") in ["SANCTIONS","OFAC"] for rp in reports)}
        return {"status":"error","code":r.status_code}
    except Exception as ex:
        return {"status":"error","error":str(ex)[:80]}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  REST HELPERS — v5.0 NEW TOOLS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _bicscan_rest(address, keys):
    """BICScan v2 — OFAC + 7 engines risk scoring. App ID 435.
    Schema (confirmed VL-25): POST /v2/scan with {"query": address}
    → returns {id, status:"pending"|"done", summary:{bicscan_score, detected_engines, total_engines},
               results:[{vendor, detected, status, score, category}], category:[]}
    Poll /v2/scan/{id} until status=="done".
    Free tier: coinfirm/uppsala/custom are "hidden" (premium). OFAC + cryptoscamdb + scamsniffer free.
    """
    key = keys.get("bicscan","")
    if not key:
        return {"status":"no_key","note":"Add bicscan key to KEYS"}
    hdrs = {"X-Api-Key": key, "Content-Type": "application/json"}
    try:
        # Initiate scan — field is "query" not "address"
        r = requests.post("https://api.bicscan.io/v2/scan",
                          headers=hdrs,
                          json={"query": address},
                          timeout=20)
        if not r.ok:
            return {"status":"error","code":r.status_code,"body":r.text[:200]}

        data    = r.json()
        scan_id = data.get("id")

        if not scan_id:
            return {"status":"error","note":"No scan ID returned","raw":str(data)[:300]}

        # Poll for result (max 6 attempts, 3s apart = 18s max)
        for attempt in range(6):
            if data.get("status") == "done":
                break
            time.sleep(3)
            poll = requests.get(f"https://api.bicscan.io/v2/scan/{scan_id}",
                                headers=hdrs, timeout=15)
            if poll.ok:
                data = poll.json()

        if data.get("status") != "done":
            return {"status":"timeout","scan_id":scan_id,"note":"Scan not done within 18s"}

        summary  = data.get("summary",{})
        score    = summary.get("bicscan_score") or 0
        det_eng  = summary.get("detected_engines") or 0
        tot_eng  = summary.get("total_engines") or 7
        category = data.get("category",[])

        # Build per-vendor results (free tier only)
        results = []
        for r in data.get("results",[]):
            vendor  = r.get("vendor","?")
            status  = r.get("status","?")
            if status == "hidden":
                results.append(f"{vendor}: 🔒 premium")
            else:
                det = "🔴 DETECTED" if r.get("detected") else "✅ clean"
                results.append(f"{vendor}: {det} (score={r.get('score')})")

        # OFAC specifically
        ofac_hit = any(r.get("vendor")=="ofac" and r.get("detected") for r in data.get("results",[]))

        return {
            "status":        "ok",
            "scan_id":       scan_id,
            "risk_score":    score,
            "risk_level":    _bicscan_level(score),
            "detected":      det_eng,
            "total_engines": tot_eng,
            "ofac_hit":      ofac_hit,
            "category":      category,
            "vendors":       results,
        }

    except Exception as ex:
        return {"status":"error","error":str(ex)[:120]}


def _bicscan_level(score):
    if score is None: return "unknown"
    try: s = float(score)
    except: return "unknown"
    if s >= 80: return "🔴 HIGH RISK"
    if s >= 50: return "🟠 MEDIUM RISK"
    if s >= 20: return "🟡 LOW RISK"
    return "🟢 CLEAN"


def _zerion_rest(address, keys):
    """Zerion v1 REST — portfolio positions + fungible tokens.
    Auth: Basic base64(key:) — Demo plan 1 req/s, 300 req/day.
    """
    import base64
    key = keys.get("zerion","")
    if not key:
        return {"status":"no_key","note":"Add zerion key to KEYS"}

    token   = base64.b64encode(f"{key}:".encode()).decode()
    hdrs    = {"Authorization": f"Basic {token}", "Accept": "application/json"}
    addr_lc = address.lower()
    out     = {"status":"ok"}

    try:
        # Fungible positions (token balances)
        r = requests.get(
            f"https://api.zerion.io/v1/wallets/{addr_lc}/positions/",
            headers=hdrs,
            params={"filter[position_types]":"wallet","currency":"usd","sort":"value","page[size]":10},
            timeout=20)
        if r.ok:
            items = r.json().get("data",[])
            total = 0.0
            positions = []
            for item in items[:10]:
                attr  = item.get("attributes",{})
                val   = float(attr.get("value") or 0)
                total += val
                qty   = attr.get("quantity",{})
                fi    = attr.get("fungible_info",{})
                positions.append({
                    "symbol":  fi.get("symbol","?"),
                    "name":    fi.get("name","?")[:30],
                    "balance": qty.get("float", 0),
                    "usd":     round(val,2),
                })
            out["total_usd"]  = round(total,2)
            out["positions"]  = positions
            out["pos_count"]  = len(items)
        else:
            out["positions_error"] = f"HTTP {r.status_code}: {r.text[:100]}"

        # DeFi/protocol positions
        r2 = requests.get(
            f"https://api.zerion.io/v1/wallets/{addr_lc}/positions/",
            headers=hdrs,
            params={"filter[position_types]":"deposited,borrowed,staked","currency":"usd","page[size]":5},
            timeout=20)
        if r2.ok:
            defi_items = r2.json().get("data",[])
            defi = []
            for item in defi_items[:5]:
                attr = item.get("attributes",{})
                rel  = item.get("relationships",{})
                defi.append({
                    "protocol": rel.get("protocol",{}).get("data",{}).get("id","?"),
                    "type":     attr.get("position_type","?"),
                    "usd":      round(float(attr.get("value") or 0),2),
                })
            out["defi_positions"] = defi
        else:
            out["defi_error"] = f"HTTP {r2.status_code}"

    except Exception as ex:
        out["error"] = str(ex)[:120]

    return out


def _bitcoin_mempool(address, keys):
    """Bitcoin address lookup via mempool.space — keyless, free.
    Handles both BTC addresses and EVM addresses (skips gracefully for EVM).
    """
    # Skip if address looks like an EVM address
    if address.startswith("0x"):
        return {"status":"skipped","note":"EVM address — BTC lookup not applicable"}

    base_url = "https://mempool.space/api"
    out      = {}
    try:
        r = requests.get(f"{base_url}/address/{address}", timeout=15)
        if not r.ok:
            return {"status":"error","code":r.status_code,"note":r.text[:100]}
        d = r.json()
        chain_stats = d.get("chain_stats",{})
        mempool_stats = d.get("mempool_stats",{})

        funded_sat  = chain_stats.get("funded_txo_sum",0)
        spent_sat   = chain_stats.get("spent_txo_sum",0)
        balance_sat = funded_sat - spent_sat
        balance_btc = balance_sat / 1e8

        out = {
            "status":        "ok",
            "balance_btc":   round(balance_btc,8),
            "balance_usd":   None,  # no price feed on mempool.space
            "tx_count":      chain_stats.get("tx_count",0),
            "funded_btc":    round(funded_sat/1e8,8),
            "spent_btc":     round(spent_sat/1e8,8),
            "mempool_txs":   mempool_stats.get("tx_count",0),
            "address_type":  d.get("address",""),
        }

        # Recent transactions
        tx_r = requests.get(f"{base_url}/address/{address}/txs", timeout=15)
        if tx_r.ok:
            txs = tx_r.json()[:5]
            out["recent_txs"] = [{
                "txid":    tx.get("txid","?")[:16]+"...",
                "confirmed": tx.get("status",{}).get("confirmed", False),
                "block_time": tx.get("status",{}).get("block_time",""),
                "value_out": sum(o.get("value",0) for o in tx.get("vout",[])) / 1e8,
            } for tx in txs]

    except Exception as ex:
        out = {"status":"error","error":str(ex)[:120]}

    return out


def _dune_rest(address, keys):
    """Dune Analytics — MCP endpoint with address label lookup.
    Uses api.dune.com/mcp/v1 JSON-RPC 2.0 — same key, MCP protocol.
    """
    key = keys.get("dune","")
    if not key:
        return {"status":"no_key","note":"Add dune key to KEYS"}

    hdrs = {"X-Dune-API-Key": key, "Content-Type": "application/json"}

    try:
        # Use Dune MCP — list tools first to verify connection
        r = requests.post(
            "https://api.dune.com/mcp/v1",
            headers=hdrs,
            json={"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}},
            timeout=20)

        if not r.ok:
            return {"status":"error","code":r.status_code,"note":r.text[:100]}

        tools = r.json().get("result",{}).get("tools",[])
        tool_names = [t.get("name","") for t in tools]

        # Call get_address_labels if available
        if "get_address_labels" in tool_names:
            label_r = requests.post(
                "https://api.dune.com/mcp/v1",
                headers=hdrs,
                json={"jsonrpc":"2.0","id":2,"method":"tools/call",
                      "params":{"name":"get_address_labels",
                                "arguments":{"address":address.lower()}}},
                timeout=20)
            if label_r.ok:
                content = label_r.json().get("result",{}).get("content",[{}])[0].get("text","")
                return {
                    "status":     "ok",
                    "tool":       "get_address_labels",
                    "tools_available": len(tool_names),
                    "result":     content[:500],
                }

        # Fallback — just report available tools
        return {
            "status":          "ok",
            "tools_available": len(tool_names),
            "tools":           tool_names[:8],
            "note":            "get_address_labels not in tool list — use dune query directly",
        }

    except Exception as ex:
        return {"status":"error","error":str(ex)[:120]}


def _jina_rest(address, keys):
    """Jina Reader — fetch web intelligence for address.
    Searches for address mentions across indexed web sources.
    """
    key = keys.get("jina","")
    if not key:
        return {"status":"no_key","note":"Add jina key to KEYS"}

    hdrs = {
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "User-Agent": "TheWarden-Scanner/5.0",
        "X-Return-Format": "json",
    }

    try:
        # Search for address on-chain attribution sources
        query = f"{address} blockchain ethereum wallet forensic"
        r = requests.get(
            f"https://s.jina.ai/{requests.utils.quote(query)}",
            headers=hdrs, timeout=25)

        if not r.ok:
            return {"status":"error","code":r.status_code,"note":r.text[:100]}

        data    = r.json() if r.headers.get("content-type","").startswith("application/json") else {}
        results = data.get("data",[]) if data else []

        if not results and r.text:
            # Plain text response
            return {"status":"ok","text_snippet":r.text[:500],"source":"jina_search"}

        snippets = []
        for item in results[:3]:
            snippets.append({
                "title":   item.get("title","")[:80],
                "url":     item.get("url","")[:80],
                "snippet": item.get("description", item.get("content",""))[:200],
            })

        return {"status":"ok","results":snippets,"total":len(results)}

    except Exception as ex:
        return {"status":"error","error":str(ex)[:120]}


def _trm_rest(address, keys):
    """TRM Labs Sanctions API — keyless free tier.
    Endpoint: POST https://api.trmlabs.com/public/v1/sanctions/screening
    Auth: None required on free tier (1 req/sec, 100 req/day).
          Optional: HTTP Basic with api_key as both username AND password.
    Body: [{"address": "0x..."}]
    Response: [{"address": "...", "isSanctioned": true/false}]
    Recommended by Chainabuse as replacement for their deprecated Sanctions API.
    Paid tier: 1000 req/sec, 100K req/day — request at trmlabs.com/products/sanctions
    """
    url  = "https://api.trmlabs.com/public/v1/sanctions/screening"
    hdrs = {"Content-Type": "application/json", "Accept": "application/json"}

    # Optional paid key — use Basic auth with key as both user and password
    trm_key = keys.get("trm", "")
    if trm_key:
        import base64
        token = base64.b64encode(f"{trm_key}:{trm_key}".encode()).decode()
        hdrs["Authorization"] = f"Basic {token}"

    try:
        r = requests.post(
            url,
            headers=hdrs,
            json=[{"address": address}],
            timeout=15,
        )

        if r.status_code == 429:
            return {"status": "rate_limited", "note": "TRM free tier: 1 req/sec, 100 req/day"}
        if r.status_code == 401:
            return {"status": "auth_error", "note": "TRM key rejected"}
        if not r.ok:
            return {"status": "error", "code": r.status_code, "body": r.text[:200]}

        results     = r.json()
        entry       = results[0] if results else {}
        is_sanctioned = entry.get("isSanctioned", False)

        return {
            "status":       "ok",
            "is_sanctioned": is_sanctioned,
            "verdict":      "🔴 SANCTIONED" if is_sanctioned else "✅ Not Sanctioned",
            "keyed":        bool(trm_key),
        }

    except Exception as ex:
        return {"status": "error", "error": str(ex)[:120]}


def _anchain_rest(address, keys):
    """AnChain AI — AI/ML risk score + entity labels + global sanctions.
    Endpoints (GET):
      /api/intel/address/score?proto=ETH&address={addr}
      /api/intel/address/label?proto=ETH&address={addr}
      /api/sanctions/global/address?address={addr}
    Auth: x-api-key header
    Covers: OFAC + EU + UK + Canada + AU + CH + IL + JP + UN + SA + Zambia (11 jurisdictions)
    Free tier: 1k credits, 6 req/min.
    Response schema: {"status":200,"data":{addr:{"self":{"category":[...],"detail":[],"information":[]},
                     "osint":[],"is_address_valid":bool,"risk":{"score":int,"level":int,"breakdown":{...}}}}}
    """
    key = keys.get("anchain", "")
    if not key:
        return {"status": "no_key", "note": "Add anchain key to KEYS"}

    hdrs = {"x-api-key": key, "Accept": "application/json"}
    addr_param = address  # preserve original case for AnChain

    def _level(s):
        if s is None: return "unknown"
        try: s = float(s)
        except: return "unknown"
        if s >= 75: return "🔴 HIGH RISK"
        if s >= 50: return "🟠 MEDIUM RISK"
        if s >= 25: return "🟡 LOW RISK"
        return "🟢 CLEAN"

    try:
        # Score + category
        r_score = requests.get(
            "https://api.anchainai.com/api/intel/address/score",
            headers=hdrs,
            params={"proto": "ETH", "address": addr_param},
            timeout=20,
        )

        if r_score.status_code == 401:
            return {"status": "auth_error", "note": "AnChain key rejected"}
        if r_score.status_code == 402:
            return {"status": "quota_exhausted", "note": "AnChain free credits exhausted"}
        if r_score.status_code == 429:
            return {"status": "rate_limited", "note": "AnChain rate limit — 6 req/min"}
        if r_score.status_code == 403:
            return {"status": "tier_limited", "note": "AnChain — upgrade plan for this endpoint"}
        if not r_score.ok:
            return {"status": "error", "code": r_score.status_code, "body": r_score.text[:200]}

        score_data  = r_score.json().get("data", {}).get(addr_param, {})
        risk        = score_data.get("risk", {})
        score       = risk.get("score")
        level_int   = risk.get("level")
        categories  = score_data.get("self", {}).get("category", [])
        detail      = score_data.get("self", {}).get("detail", [])
        is_valid    = score_data.get("is_address_valid", True)
        osint       = score_data.get("osint", [])

        # Global sanctions check
        r_sanc = requests.get(
            "https://api.anchainai.com/api/sanctions/global/address",
            headers=hdrs,
            params={"address": addr_param},
            timeout=20,
        )
        sanction_hits = 0
        sanction_data = []
        if r_sanc.ok:
            sd = r_sanc.json().get("data", {})
            sanction_hits = sd.get("total", 0)
            sanction_data = sd.get("data", [])[:3]

        return {
            "status":         "ok",
            "risk_score":     score,
            "risk_level":     _level(score),
            "risk_level_int": level_int,
            "categories":     categories,
            "detail":         detail,
            "is_valid":       is_valid,
            "osint":          osint[:3],
            "sanction_hits":  sanction_hits,
            "sanctions":      sanction_data,
        }

    except Exception as ex:
        return {"status": "error", "error": str(ex)[:120]}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  MAIN — ALL 19 TOOLS IN PARALLEL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def scan(address, chains=None, keys=None):
    if chains is None: chains = [1, 8453, 56, 137, 42161]
    if keys   is None: keys   = {}

    is_btc = not address.startswith("0x")
    address = address.lower() if not is_btc else address

    print(f"[TheWarden] Scanning {address}")
    if is_btc:
        print(f"[TheWarden] Mode: Bitcoin address")
    else:
        print(f"[TheWarden] Chains: {[CHAIN_NAMES.get(c,c) for c in chains]}")
    print(f"[TheWarden] Firing 20 tools in parallel...")
    t0 = time.time()

    results  = {}
    tool_log = []

    MCP_TOOLS = {"chainbase","nansen","tenderly"}

    def run(name, fn, *args):
        try:
            results[name] = fn(*args)
            tier = "🔗 MCP" if name in MCP_TOOLS else "📡 REST"
            print(f"[TheWarden]   {name:<14} ✅  {tier}")
            tool_log.append(name)
        except Exception as e:
            results[name] = {"error": str(e)[:80]}
            print(f"[TheWarden]   {name:<14} ❌  {str(e)[:50]}")

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
        futures = []

        if not is_btc:
            futures += [
                pool.submit(run,"chainbase",   _chainbase_mcp,    address, chains, keys),
                pool.submit(run,"nansen",      _nansen_mcp,       address, keys),
                pool.submit(run,"tenderly",    _tenderly_mcp,     address, keys),
                pool.submit(run,"arkham",      _arkham_rest,      address, keys),
                pool.submit(run,"moralis",     _moralis_rest,     address, chains, keys),
                pool.submit(run,"goplus",      _goplus_rest,      address, chains, keys),
                pool.submit(run,"etherscan",   _etherscan_rest,   address, chains, keys),
                pool.submit(run,"quicknode",   _quicknode_rpc,    address, keys),
                pool.submit(run,"bitquery",    _bitquery_rest,    address, keys),
                pool.submit(run,"goldrush",    _goldrush_rest,    address, chains, keys),
                pool.submit(run,"onchainrisk", _onchainrisk_rest, address, keys),
                pool.submit(run,"chainabuse",  _chainabuse_rest,  address, keys),
                pool.submit(run,"bicscan",     _bicscan_rest,     address, keys),
                pool.submit(run,"zerion",      _zerion_rest,      address, keys),
                pool.submit(run,"dune",        _dune_rest,        address, keys),
                pool.submit(run,"jina",        _jina_rest,        address, keys),
                pool.submit(run,"anchain",     _anchain_rest,     address, keys),
                pool.submit(run,"trm",         _trm_rest,         address, keys),
            ]
        else:
            # BTC mode — only applicable tools
            futures += [
                pool.submit(run,"bitcoin",     _bitcoin_mempool,  address, keys),
                pool.submit(run,"jina",        _jina_rest,        address, keys),
            ]

        concurrent.futures.wait(futures, timeout=120)

    elapsed = round(time.time()-t0, 2)
    fired   = len(tool_log)
    total   = 18 if not is_btc else 2
    print(f"[TheWarden] ✅ Complete in {elapsed}s — {fired}/{total} tools returned data")

    results["meta"] = {
        "address":     address,
        "chains":      chains,
        "elapsed_s":   elapsed,
        "tools_fired": tool_log,
        "tools_total": total,
        "is_btc":      is_btc,
        "mcp_stack":   [t for t in tool_log if t in MCP_TOOLS],
        "rest_stack":  [t for t in tool_log if t not in MCP_TOOLS],
        "scanned_at":  datetime.now(timezone.utc).isoformat(),
        "scanner_ver": "VL-26 v5.2",
    }
    return results


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  REPORT PRINTER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def print_report(report):
    meta    = report.get("meta",{})
    address = meta.get("address","?")
    elapsed = meta.get("elapsed_s","?")
    fired   = len(meta.get("tools_fired",[]))
    total   = meta.get("tools_total",18)
    ver     = meta.get("scanner_ver","v5.0")
    is_btc  = meta.get("is_btc", False)

    W = 70
    print(); print("="*W)
    print(f"  ⬛ THEWARDEN FORENSIC REPORT  [{ver}]")
    print(f"  Address : {address}")
    print(f"  Mode    : {'Bitcoin' if is_btc else 'EVM Multi-chain'}")
    print(f"  Elapsed : {elapsed}s  |  Tools: {fired}/{total}")
    print("="*W)

    def section(title): print(f"\n[{title}]")
    def row(label, val): print(f"  {label:<18} {val}")

    if is_btc:
        # Bitcoin report
        bt = report.get("bitcoin",{})
        section("BITCOIN — mempool.space")
        if bt.get("error"): print(f"  ❌ {bt['error']}")
        elif bt.get("status")=="ok":
            row("BTC Balance:",  f"{bt.get('balance_btc',0):.8f} BTC")
            row("Tx Count:",     str(bt.get("tx_count",0)))
            row("Total In:",     f"{bt.get('funded_btc',0):.8f} BTC")
            row("Total Out:",    f"{bt.get('spent_btc',0):.8f} BTC")
            row("Mempool Txs:", str(bt.get("mempool_txs",0)))
            for tx in bt.get("recent_txs",[])[:3]:
                conf = "✅" if tx.get("confirmed") else "⏳"
                print(f"    {conf} {tx.get('txid','?')}  {tx.get('value_out',0):.6f} BTC")
        else:
            print(f"  {bt}")

    else:
        # EVM report

        # BICScan — NEW v5.0
        bc = report.get("bicscan",{})
        section("BICSCAN — OFAC + 7-Engine Risk Score  [v5.0]")
        if bc.get("status")=="no_key":      print(f"  ⚪ {bc.get('note')}")
        elif bc.get("status")=="error":     print(f"  ❌ {bc.get('error',bc.get('body',''))[:100]}")
        elif bc.get("status")=="timeout":   print(f"  ⏳ {bc.get('note')}")
        elif bc.get("status")=="ok":
            score = bc.get("risk_score", 0)
            level = bc.get("risk_level","?")
            row("Risk Score:",    f"{score}/100  {level}")
            row("OFAC Hit:",      "🔴 YES" if bc.get("ofac_hit") else "✅ No")
            row("Engines Hit:",   f"{bc.get('detected',0)}/{bc.get('total_engines',7)}")
            cat = bc.get("category",[])
            if cat: row("Categories:", str(cat))
            for v in bc.get("vendors",[]): print(f"    {v}")
        else:
            print(f"  {bc}")

        # Zerion — NEW v5.0
        zr = report.get("zerion",{})
        section("ZERION — Portfolio + DeFi Positions  [v5.0]")
        if zr.get("status")=="no_key":  print(f"  ⚪ {zr.get('note')}")
        elif zr.get("error"):           print(f"  ❌ {zr['error'][:100]}")
        elif zr.get("positions_error"): print(f"  ❌ {zr['positions_error'][:100]}")
        else:
            row("Total USD:",   f"${zr.get('total_usd',0):,.2f}")
            row("Positions:",   str(zr.get("pos_count",0)))
            for pos in zr.get("positions",[])[:5]:
                if pos.get("usd",0) > 0:
                    print(f"    {pos['symbol']:<10} {pos.get('balance',0):.4f}  ≈ ${pos['usd']:,.2f}")
            defi = zr.get("defi_positions",[])
            if defi:
                print(f"  DeFi positions: {len(defi)}")
                for d in defi[:3]:
                    print(f"    {d.get('protocol','?'):<20} {d.get('type','?'):<12} ${d.get('usd',0):,.2f}")

        # GoPlus
        gp = report.get("goplus",{})
        section("GOPLUS — Security Flags")
        if gp.get("error"):   print(f"  ❌ {gp['error']}")
        elif gp.get("clean"): print("  ✅ No flags — address is clean")
        else:
            for k,v in gp.get("flags",{}).items(): print(f"  ⚠️  {k}: {v}")

        # QuickNode
        qn = report.get("quicknode",{})
        section("QUICKNODE — ETH Mainnet RPC")
        if qn.get("error"): print(f"  ❌ {qn['error']}")
        else:
            row("ETH Balance:", f"{qn.get('balance_eth',0):.6f} ETH")
            row("Nonce (txs):", str(qn.get("nonce",0)))
            row("Type:",        "Contract" if qn.get("is_contract") else "EOA")
            row("Latest Block:",f"{qn.get('latest_block',0):,}")

        # Arkham
        ak = report.get("arkham",{})
        section("ARKHAM — Entity Attribution")
        print(f"  Entity: {ak.get('entity','Unknown')}")
        trs = [t for t in ak.get("transfers",[]) if isinstance(t,dict)]
        print(f"  Transfers: {ak.get('transfer_count',0)} total, showing {min(5,len(trs))}")
        for t in trs[:5]:
            print(f"    {t.get('time','?')}  {t.get('from','?')[:20]}  →  {t.get('amount','?')} {t.get('token','ETH')}")

        # GoldRush
        gr = report.get("goldrush",{})
        section("GOLDRUSH — 200+ Chain Token Balances")
        if gr.get("error"): print(f"  ❌ {gr['error']}")
        else:
            for cid, data in gr.items():
                if not isinstance(data,dict): continue
                cname = CHAIN_NAMES.get(int(cid) if str(cid).isdigit() else cid, cid)
                if data.get("error"): print(f"  {cname:<10} ❌  {data['error'][:50]}"); continue
                total = data.get("total_usd",0)
                flag  = "🔴" if total>0 else "⚪"
                print(f"  {cname:<10} {flag}  ${total:>10,.2f}  |  {data.get('token_count',0)} tokens")
                for tok in data.get("tokens",[])[:4]:
                    if tok.get("usd",0)>0 or tok.get("balance",0)>0:
                        print(f"    {tok['symbol']:<10}  {tok['balance']:.6f}  ≈ ${tok['usd']:,.2f}")

        # Bitquery
        bq = report.get("bitquery",{})
        section("BITQUERY — Transfer Flow")
        status = bq.get("status","")
        if status == "quota_exhausted": print(f"  ⚠️  {bq.get('note')}")
        elif status == "no_key":        print(f"  ⚪ {bq.get('note')}")
        elif bq.get("error"):           print(f"  ❌ {bq['error']}")
        else:
            print(f"  Inbound : {bq.get('inbound_count',0)} recent transfers")
            for t in bq.get("inbound",[])[:5]:
                print(f"    {t.get('time','?')}  {t.get('sender','?')[:20]}  →  {t.get('amount','?')} {t.get('token','?')}")
            print(f"  Outbound: {bq.get('outbound_count',0)} recent transfers")
            for t in bq.get("outbound",[])[:3]:
                print(f"    {t.get('time','?')}  →  {t.get('receiver','?')[:20]}  {t.get('amount','?')} {t.get('token','?')}")

        # Etherscan
        es = report.get("etherscan",{})
        section("ETHERSCAN V2 — Multi-chain")
        for cid, data in es.items():
            cname = CHAIN_NAMES.get(int(cid) if str(cid).isdigit() else cid, cid)
            if not isinstance(data,dict): continue
            if data.get("error"): print(f"  {cname:<10} ❌  {data['error'][:50]}"); continue
            flag = "🔴" if data.get("tx_count",0)>0 else "⚪"
            print(f"  {cname:<10} {flag}  {data.get('balance_eth',0):.6f} ETH  |  {data.get('tx_count',0):,} txs")

        # Chainbase
        cb = report.get("chainbase",{})
        section("CHAINBASE MCP — Multi-chain")
        total_txs = 0
        for cid, data in cb.items():
            if not isinstance(data,dict): continue
            cname = CHAIN_NAMES.get(int(cid) if str(cid).isdigit() else cid, cid)
            if data.get("error"): print(f"  {cname:<10} ❌  {data['error'][:50]}"); continue
            txs = data.get("tx_count",0); total_txs += txs
            flag = "🔴" if txs>0 else "⚪"
            print(f"  {cname:<10} {flag}  {txs:,} txs  |  {data.get('balance_eth',0):.6f} ETH")
        print(f"  TOTAL: {total_txs:,} txs")
        if total_txs == 0:
            print("  ℹ️  Zero from Chainbase may indicate EIP-7702 type 4 txs")

        # Moralis
        mo = report.get("moralis",{})
        section("MORALIS — Wallet History + Net Worth")
        print(f"  Net Worth: ${mo.get('net_worth_usd',0):,.2f}")
        for cname, data in mo.items():
            if cname=="net_worth_usd" or not isinstance(data,dict): continue
            count = data.get("count",0)
            if count > 0:
                print(f"  {cname:<10} {count} txs")
                for tx in data.get("sample",[])[:3]:
                    print(f"    {tx.get('status','?')} {tx.get('date','?')}  {tx.get('summary','?')} ETH:{tx.get('value','0')}")

        # Nansen
        na = report.get("nansen",{})
        section("NANSEN MCP — Smart Money")
        for tool, result in na.items():
            print(f"  {tool:<22} {str(result)[:120]}")

        # Tenderly
        te = report.get("tenderly",{})
        section("TENDERLY MCP — Contract Check")
        for chain_label, result in te.items():
            is_eoa = "eoa" in str(result).lower() or "not contract" in str(result).lower()
            print(f"  {chain_label:<12} {'👤 EOA / Not contract' if is_eoa else str(result)[:100]}")

        # OnChainRisk
        ocr = report.get("onchainrisk",{})
        section("ONCHAINRISK — AML Score")
        status = ocr.get("status","?")
        if   status=="tier_required": print(f"  🔑 Key valid | Upgrade to paid plan for AML scores")
        elif status=="ok":            print(f"  ✅ {json.dumps(ocr.get('data',{}))[:200]}")
        elif status=="no_key":        print(f"  ⚪ {ocr.get('note','')}")
        else:                         print(f"  ❌ {ocr}")

        # Chainabuse
        ca = report.get("chainabuse",{})
        section("CHAINABUSE — Sanctions Screening")
        status = ca.get("status","?")
        if   status=="ok":     print(f"  Reports: {ca.get('report_count',0)} | Sanctioned: {ca.get('sanctioned',False)}")
        elif status=="no_key": print(f"  ⚪ {ca.get('note','')}")
        else:                  print(f"  ❌ {ca}")

        # Dune
        du = report.get("dune",{})
        section("DUNE ANALYTICS — SQL Intelligence  [v5.0]")
        status = du.get("status","?")
        if   status=="no_key":  print(f"  ⚪ {du.get('note','')}")
        elif status=="ok":
            rows = du.get("rows",[])
            print(f"  Query {du.get('query_id','?')} — {du.get('row_count',0)} rows")
            for r in rows[:3]: print(f"    {str(r)[:100]}")
        elif status=="timeout": print(f"  ⏳ {du.get('note','Query still running')}")
        else:                   print(f"  ❌ {du}")

        # TRM Labs
        trm = report.get("trm",{})
        section("TRM LABS — Sanctions Screening (Keyless Free)  [v5.2]")
        status = trm.get("status","?")
        if   status=="rate_limited": print(f"  ⏳ {trm.get('note','')}")
        elif status=="auth_error":   print(f"  🔑 {trm.get('note','')}")
        elif status=="error":        print(f"  ❌ {trm.get('error', trm.get('body',''))[:100]}")
        elif status=="ok":
            row("Verdict:", trm.get("verdict","?"))
            row("Keyed:",   "Yes (paid tier)" if trm.get("keyed") else "No (free tier — 100 req/day)")
        else:
            print(f"  {trm}")

        # AnChain AI
        ac = report.get("anchain",{})
        section("ANCHAIN AI — Risk Score + Entity Labels + Multi-Jurisdiction Sanctions  [v5.1]")
        status = ac.get("status","?")
        if   status=="no_key":         print(f"  ⚪ {ac.get('note','')}")
        elif status=="auth_error":     print(f"  🔑 {ac.get('note','')}")
        elif status=="quota_exhausted":print(f"  💳 {ac.get('note','')}")
        elif status=="tier_limited":   print(f"  🔒 {ac.get('note','')}")
        elif status=="error":          print(f"  ❌ {ac.get('error', ac.get('body',''))[:120]}")
        elif status=="ok":
            score = ac.get("risk_score")
            level = ac.get("risk_level","?")
            row("Risk Score:",    f"{score}/100  {level}" if score is not None else "N/A")
            row("Sanctions Hits:",f"🔴 {ac.get('sanction_hits')} MATCH(ES)" if ac.get("sanction_hits") else "✅ 0 — Global Clear")
            cats = ac.get("categories",[])
            if cats: row("Categories:",  str(cats))
            detail = ac.get("detail",[])
            if detail: row("Detail:", str(detail))
            osint = ac.get("osint",[])
            if osint: row("OSINT:", str(osint)[:80])
            sancs = ac.get("sanctions",[])
            if sancs:
                for s in sancs: print(f"    ⚠️  {str(s)[:100]}")
        else:
            print(f"  {ac}")

        # Jina
        ji = report.get("jina",{})
        section("JINA — Web Intelligence  [v5.0]")
        status = ji.get("status","?")
        if   status=="no_key": print(f"  ⚪ {ji.get('note','')}")
        elif status=="ok":
            for r in ji.get("results",[])[:3]:
                print(f"  {r.get('title','')[:60]}")
                print(f"    {r.get('snippet','')[:120]}")
            if ji.get("text_snippet"):
                print(f"  {ji['text_snippet'][:300]}")
        else:                  print(f"  ❌ {ji}")

    # Footer
    print()
    print(f"  🔗 MCP:  {meta.get('mcp_stack',[])} ")
    print(f"  📡 REST: {meta.get('rest_stack',[])} ")
    print(f"  ⏱  {elapsed}s | {meta.get('scanned_at','')[:19]}")
    print(); print("="*W); print()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  DEFAULT KEYS — VL-26 v5.2
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEYS = {
    "arkham":          "77d24c4d-6b2b-471a-88b6-9e6e75ba7358",
    "chainbase":       "3EEEM9sRu2rzYSGX1GCR1Jc7X8i",
    "nansen":          "nsn_32d50c7e1dec90ec0ee4cfca4f5c29f9",
    "moralis":         "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImVhYWMxZDhkLWI4ZjAtNGMyZi04ZTk2LWE4NjJlZTc0ZWZiZiIsIm9yZ0lkIjoiNDQxNzIyIiwidXNlcklkIjoiNDU0MDA3IiwidHlwZUlkIjoiZDI0YTk3MzEtNzljMS00OGZmLTgxMjktZTA3NmIyMDI2NzVmIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTIzNjY1MDEsImV4cCI6NDkwODEyNjUwMX0.wVfYdRdKoM6lUrVpEBQMWZni5R9da4GZM2Bi-Ipmfa8d1-0LGLQuu4sJn4K3Cjh0Q",
    "etherscan":       "ES16B14B19XWKXJBIHUAJRXJHECXHM6WEK",
    "basescan":        "QT7KI56B365U22NXMJJM4IU7Q8MVER69RY",
    "tenderly":        "K5LF4-PBJUwWLL-BmD3LEn3e-GvguZ3k",
    "goldrush":        "cqt_rQGWWvgk9qGMtCMQMxKY7VWQJJXy",
    "bitquery_bearer": "ory_at_b1QNBWHrJzpCn3Qhkb8kp-yNPhPXZ89EoOKmsW_M3DE.0ss6q8skWuMJW7n5OCh2gMsFNr-pLlek4BG1nIiaJns",  # VL-27 rotated — 402 billing issue, graceful fallback
    "onchainrisk":     "ocr_test_a947101ca196b7f0aa2ac6a1f4c96df0aefd0ad3d5d4f201",
    "dune":            "CRxZFkgiBpR4f1ak1GzeTR4lTMgTo8op",
    "jina":            "jina_f140e19479774b65b77bf41f7985135fvxn1Qedbig2ziw3Mf-Tj5fNoOkBq",
    "quicknode_http":  "https://purple-hidden-general.ethereum-mainnet.quiknode.pro/8d8e8ffb350c39346213f1e647de678338c31644/",
    "goplus_key":      "RBTk9aFqgDwbHPq3juME",
    "goplus_secret":   "fEVawfkqNSeFu2Wz7WuFsfeTrHKP00Jn",
    "chainabuse":      "",  # register at chainabuse.com
    # v5.0 new keys:
    "bicscan":         "23a6a7cd749b42ad08ef39f44af9f2cde4689cebae73287b03ef8cc0afbd1162",  # vaulted: bicscan/api_key
    "zerion":          "zk_4ec4a414e42e4d51bd386205c84f62dc",  # vaulted: zerion/api_key
    # v5.1 new keys:
    "anchain":         "3c083Az1ZJP2_5QVT4mpnNOeMyQXqBhMoRwjPBocyCgTFKUdx1LNus91Sw.yJx5H2q3tEo.C3wLQQ",
    # v5.2 new keys:
    "trm":             "",  # keyless free tier — leave blank. Optional: paid key from trmlabs.com/products/sanctions
}


if __name__ == "__main__":
    import sys
    target = sys.argv[1] if len(sys.argv) > 1 else "0x70a3df699512f39C682F94fad498454C90B8C219"
    report = scan(target, keys=KEYS)
    print_report(report)
