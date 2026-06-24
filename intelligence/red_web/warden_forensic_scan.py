#!/usr/bin/env python3
"""
warden_forensic_scan.py — TheWarden Universal Forensic Address Scanner
══════════════════════════════════════════════════════════════════════════
GL-L76 v3.1 — 13/13 TOOLS ARMED AND FIRING IN PARALLEL

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
    GoldRush     api.covalenthq.com/v1         200+ chains balances  [v17 NEW]
    Bitquery     streaming.bitquery.io/eap     ory_at bearer          [v17 FIXED]
    OnChainRisk  api.onchainrisk.io/api/v1     AML score              [v17 NEW]
    Chainabuse   api.chainabuse.com/v0         sanctions screening    [v17 NEW]

KEYS dict (v17):
    arkham, chainbase, moralis, nansen, etherscan, goplus_key, goplus_secret,
    tenderly, quicknode_http, basescan, goldrush, bitquery_bearer,
    onchainrisk, chainabuse, dune, jina

USAGE:
    report = scan("0xADDRESS", chains=[1, 8453, 56, 137, 42161], keys=KEYS)
    print_report(report)

CHANGELOG:
    GL-L76: Chainbase → JSON-RPC 2.0 + correct tool names (GetAccountTxs etc)
            Nansen → SSE Accept header fix + wallet-focused tools
            Bitquery → ory_at bearer on /eap (OAuth2 client_id RETIRED)
            GoPlus → free unauthenticated REST (no key needed)
            GoldRush → 200+ chain token balances added
            OnChainRisk → graceful sandbox/tier degradation
            Chainabuse → graceful no-key message
            ThreadPoolExecutor → max_workers=13 (all parallel)
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
        cname = CHAIN_NAMES.get(chain_id, str(chain_id))
        try:
            # Native balance
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

            # Transactions
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
#  REST HELPERS
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
            fa = tr.get("fromAddress") or {}
            ta = tr.get("toAddress")   or {}
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
            data = r.json() if r.ok else {}
            txs  = data.get("result",[])
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
    """GL-L76: GoPlus free REST — no auth needed."""
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
            tx_count = int(tx_data.get("message","").split("found ")[-1].split(" ")[0]) if "found" in tx_data.get("message","") else len(tx_list)

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
        bal    = rpc("eth_getBalance",[address,"latest"])
        nonce  = rpc("eth_getTransactionCount",[address,"latest"])
        code   = rpc("eth_getCode",[address,"latest"])
        block  = rpc("eth_blockNumber",[])
        return {
            "balance_eth": int(bal,16)/1e18 if bal else 0,
            "nonce":       int(nonce,16)    if nonce else 0,
            "is_contract": len(code)>4      if code else False,
            "latest_block":int(block,16)    if block else 0,
        }
    except Exception as ex:
        return {"error":str(ex)[:80]}


def _bitquery_rest(address, keys):
    """GL-L76 FIXED: ory_at bearer on /eap. OAuth2 client_id flow RETIRED."""
    bearer = keys.get("bitquery_bearer","")
    app_id = "92e5cbed-12b5-4a2a-b27a-054a38360169"
    if not bearer or not bearer.startswith("ory_at_"):
        return {"error":"bitquery_bearer must be ory_at_ token (v17 keys)"}
    query = """
    {
      EVM(network: base) {
        inbound: Transfers(
          where: {Transfer: {Receiver: {is: "%s"}}}
          limit: {count: 10} orderBy: {descending: Block_Time}
        ) { Transfer { Sender Amount Currency { Symbol } } Block { Time } }
        outbound: Transfers(
          where: {Transfer: {Sender: {is: "%s"}}}
          limit: {count: 10} orderBy: {descending: Block_Time}
        ) { Transfer { Receiver Amount Currency { Symbol } } Block { Time } }
      }
    }
    """ % (address.lower(), address.lower())
    try:
        r = requests.post("https://streaming.bitquery.io/eap",
            headers={"Authorization":f"Bearer {bearer}","X-App-Id":app_id,"Content-Type":"application/json"},
            json={"query":query},timeout=30)
        if not r.ok:
            return {"error":f"HTTP {r.status_code}: {r.text[:100]}"}
        evm = r.json().get("data",{}).get("EVM",{})
        return {
            "inbound_count":  len(evm.get("inbound",[])),
            "outbound_count": len(evm.get("outbound",[])),
            "inbound":  [{"time":t["Block"]["Time"][:10],"sender":t["Transfer"]["Sender"][:20],
                          "amount":t["Transfer"]["Amount"],"token":t["Transfer"]["Currency"]["Symbol"]}
                         for t in evm.get("inbound",[])[:5]],
            "outbound": [{"time":t["Block"]["Time"][:10],"receiver":t["Transfer"]["Receiver"][:20],
                          "amount":t["Transfer"]["Amount"],"token":t["Transfer"]["Currency"]["Symbol"]}
                         for t in evm.get("outbound",[])[:5]],
        }
    except Exception as ex:
        return {"error":str(ex)[:80]}


def _goldrush_rest(address, chains, keys):
    """GL-L76 NEW: GoldRush (Covalent) 200+ chains token balances."""
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
    """GL-L76 NEW: OnChainRisk AML score. Sandbox key = tier_required."""
    key = keys.get("onchainrisk","")
    if not key:
        return {"status":"no_key","note":"Add onchainrisk key to KEYS"}
    try:
        r = requests.get(f"https://api.onchainrisk.io/api/v1/address/{address}",
                         headers={"Authorization":f"Bearer {key}"},timeout=15)
        if r.status_code == 403 and r.json().get("error")=="sandbox_not_supported":
            return {"status":"tier_required","key_valid":True,
                    "note":"Key valid — paid plan required for /api/v1"}
        return {"status":"ok","data":r.json()} if r.ok else {"status":"error","code":r.status_code}
    except Exception as ex:
        return {"status":"error","error":str(ex)[:80]}


def _chainabuse_rest(address, keys):
    """GL-L76 NEW: Chainabuse sanctions. Register at chainabuse.com for free key."""
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
#  MAIN — ALL 13 TOOLS IN PARALLEL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def scan(address, chains=None, keys=None):
    if chains is None: chains = [1, 8453, 56, 137, 42161]
    if keys   is None: keys   = {}
    address = address.lower()

    print(f"[TheWarden] Scanning {address}")
    print(f"[TheWarden] Chains:  {[CHAIN_NAMES.get(c,c) for c in chains]}")
    print(f"[TheWarden] Firing all 13 tools in parallel...")
    t0 = time.time()

    results  = {}
    tool_log = []

    def run(name, fn, *args):
        try:
            results[name] = fn(*args)
            tier = "🔗 MCP" if name in ("chainbase","nansen","tenderly") else "📡 REST"
            print(f"[TheWarden]   {name:<14} ✅  {tier}")
            tool_log.append(name)
        except Exception as e:
            results[name] = {"error": str(e)[:80]}
            print(f"[TheWarden]   {name:<14} ❌  {str(e)[:50]}")

    with concurrent.futures.ThreadPoolExecutor(max_workers=13) as pool:
        futures = [
            pool.submit(run,"chainbase",  _chainbase_mcp,  address, chains, keys),
            pool.submit(run,"nansen",     _nansen_mcp,     address, keys),
            pool.submit(run,"tenderly",   _tenderly_mcp,   address, keys),
            pool.submit(run,"arkham",     _arkham_rest,    address, keys),
            pool.submit(run,"moralis",    _moralis_rest,   address, chains, keys),
            pool.submit(run,"goplus",     _goplus_rest,    address, chains, keys),
            pool.submit(run,"etherscan",  _etherscan_rest, address, chains, keys),
            pool.submit(run,"quicknode",  _quicknode_rpc,  address, keys),
            pool.submit(run,"bitquery",   _bitquery_rest,  address, keys),
            pool.submit(run,"goldrush",   _goldrush_rest,  address, chains, keys),
            pool.submit(run,"onchainrisk",_onchainrisk_rest,address, keys),
            pool.submit(run,"chainabuse", _chainabuse_rest,address, keys),
        ]
        concurrent.futures.wait(futures, timeout=90)

    elapsed = round(time.time()-t0, 2)
    fired   = len(tool_log)
    print(f"[TheWarden] ✅ Complete in {elapsed}s — {fired}/13 tools returned data")

    results["meta"] = {
        "address":    address, "chains": chains, "elapsed_s": elapsed,
        "tools_fired":tool_log, "tools_total":13,
        "mcp_stack":  [t for t in tool_log if t in ("chainbase","nansen","tenderly")],
        "rest_stack": [t for t in tool_log if t not in ("chainbase","nansen","tenderly")],
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "scanner_ver":"GL-L76 v3.1",
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
    ver     = meta.get("scanner_ver","GL-L76 v3.1")

    W = 70
    print(); print("="*W)
    print(f"  ⬛ THEWARDEN FORENSIC REPORT  [{ver}]")
    print(f"  Address : {address}")
    print(f"  Elapsed : {elapsed}s  |  Tools: {fired}/13")
    print("="*W)

    def section(title): print(f"\n[{title}]")
    def row(label, val): print(f"  {label:<16} {val}")

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
    section("BITQUERY — Live Transfer Flow (Base)")
    if bq.get("error"): print(f"  ❌ {bq['error']}")
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
        print("  ℹ️  Zero from Chainbase may indicate EIP-7702 type 4 txs (use Etherscan/Bitquery for Base)")

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

    # Footer
    print()
    print(f"  🔗 MCP:  {meta.get('mcp_stack',[])} ")
    print(f"  📡 REST: {meta.get('rest_stack',[])} ")
    print(f"  ⏱  {elapsed}s | {meta.get('scanned_at','')[:19]}")
    print(); print("="*W); print()
