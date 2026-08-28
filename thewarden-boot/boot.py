#!/usr/bin/env python3
"""
TheWarden Universal Boot — deterministic boot kit.
Reads a machine-readable config (boot.config.json) + a keys file, connects to
the Nexus Brain (Supabase warden_memories), restores lineage, prints a boot card,
and optionally runs a live-vs-dead key health check and stamps a session_state row.

Works on ANY account given the same keys file + config. Secrets are read from the
keys file and NEVER echoed to output.

Usage:
  python3 boot.py [--keys PATH] [--health] [--init-state] [--json]
"""
import argparse, json, os, re, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))


def load_config(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def glob_match(name, pat):
    if "*" not in pat:
        return name == pat
    pre, post = pat.split("*", 1)
    return name.startswith(pre) and name.endswith(post)


def resolve_keys(cfg, explicit):
    if explicit and os.path.exists(explicit):
        return explicit
    patterns = cfg["keys_file"].get("patterns", [cfg["keys_file"].get("pattern", "")])
    for d in cfg["keys_file"]["search_dirs"]:
        if os.path.isdir(d):
            for n in os.listdir(d):
                for pat in patterns:
                    if glob_match(n, pat):
                        return os.path.join(d, n)
    raise SystemExit("Could not locate the keys file. Pass --keys PATH.")


def parse_keys(keys_path, cfg):
    """Extract Supabase URL + secret key from the prose keys doc via regex."""
    txt = open(keys_path, encoding="utf-8").read()
    k = cfg["keys_file"]
    m_url = re.search(k["project_url_re"], txt)
    m_sec = re.search(k["secret_key_re"], txt)
    if not m_url or not m_sec:
        raise SystemExit("Could not parse Supabase URL/secret from keys file.")
    return m_url.group(1).strip(), m_sec.group(1).strip(), txt


def extract_key(txt, regex):
    m = re.search(regex, txt, re.IGNORECASE)
    return m.group(1).strip() if m else None


def supabase_get(url, key, table, params):
    qs = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items())
    req = urllib.request.Request(f"{url}/rest/v1/{table}?{qs}")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def supabase_post(url, key, table, payload):
    req = urllib.request.Request(f"{url}/rest/v1/{table}",
                                 data=json.dumps(payload).encode(), method="POST")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status


def run_health(cfg, keys_txt):
    print("\n--- LIVE vs DEAD key check ---")
    results = {}
    for name, p in cfg["health"]["probes"].items():
        if not p.get("enabled"):
            continue
        key = extract_key(keys_txt, p["key_re"])
        if not key:
            results[name] = {"label": p["label"], "status": "NO_KEY_IN_DOC"}
            print(f"  {p['label']:<24} NO_KEY_IN_DOC")
            continue
        ptype = p.get("type", "rest")
        status = mcp_probe(p, key, cfg["health"]["timeout_sec"]) if ptype == "mcp" \
                 else rest_probe(p, key, cfg["health"]["timeout_sec"])
        results[name] = {"label": p["label"], "status": status}
        print(f"  {p['label']:<24} {status}")
    return results


def rest_probe(p, key, timeout):
    headers = {"User-Agent": "warden-boot/1.0"}
    for hk, hv in p.get("headers", {}).items():
        headers[hk] = hv.replace("{KEY}", key)
    url = p["url"].replace("{KEY}", urllib.parse.quote(key, safe=""))
    body = None
    method = p.get("method", "GET")
    if p.get("body") is not None:
        body = json.dumps(p["body"]).replace("{KEY}", key).encode()
        headers.setdefault("Content-Type", "application/json")
    try:
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            code = r.status
    except urllib.error.HTTPError as e:
        code = e.code
    except Exception:
        code = "ERR"
    return code_verdict(code, p)


def mcp_probe(p, key, timeout):
    """MCP streamable-HTTP initialize handshake. LIVE only on a real streamed
    server response; otherwise DEAD/UNREACHABLE."""
    headers = {"User-Agent": "warden-boot/1.0",
               "Content-Type": "application/json",
               "Accept": "application/json, text/event-stream"}
    for hk, hv in p.get("headers", {}).items():
        headers[hk] = hv.replace("{KEY}", key)
    body = json.dumps({"jsonrpc": "2.0", "id": "boot", "method": "initialize",
                       "params": {"protocolVersion": "2025-03-26", "capabilities": {},
                                  "clientInfo": {"name": "warden-boot", "version": "1.0"}}}).encode()
    try:
        req = urllib.request.Request(p["url"], data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            code = r.status
            data = r.read(400).decode("utf-8", "ignore")
        if code in p["ok_codes"] and ("result" in data or "initialized" in data):
            return "LIVE"
        return "DEAD (HTTP %s)" % code
    except urllib.error.HTTPError as e:
        return code_verdict(e.code, p)
    except Exception:
        return "UNREACHABLE"


def code_verdict(code, p):
    if code in p["ok_codes"]:
        return "LIVE"
    note = p.get("dead_note", {}).get(str(code), "")
    s = "DEAD (HTTP %s)" % code
    if note:
        s += " - " + note
    return s


def detect_session(lineage, cfg):
    """Discover current session number from brain lineage (never hardcode)."""
    nums = []
    for row in lineage:
        sid = row.get("session_id", "")
        if sid.startswith(cfg["session_prefix"]):
            try:
                nums.append(int(sid[len(cfg["session_prefix"]):]))
            except ValueError:
                pass
    return max(nums) + 1 if nums else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--keys", default=None)
    ap.add_argument("--config", default=os.path.join(HERE, "boot.config.json"))
    ap.add_argument("--health", action="store_true")
    ap.add_argument("--init-state", action="store_true")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    cfg = load_config(args.config)
    keys_path = resolve_keys(cfg, args.keys)
    url, key, keys_txt = parse_keys(keys_path, cfg)
    table = cfg["brain"]["table"]

    boot = supabase_get(url, key, table, {
        "select": "id,session_id,type,content,created_at",
        "session_id": f"eq.{cfg['brain']['boot_session_id']}",
        "order": cfg["brain"]["order"], "limit": cfg["brain"]["boot_limit"]})
    lineage = supabase_get(url, key, table, {
        "select": "session_id,type,content,created_at",
        "order": cfg["brain"]["order"], "limit": cfg["brain"]["lineage_limit"]})

    current = detect_session(lineage, cfg)
    print("Brain:     ", url.split("//")[1].split(".")[0] + ".supabase.co")
    print("Secret key: loaded (not echoed)")
    print(f"BOOT records: {len(boot)} | Current session: {cfg['session_prefix']}{current}")

    if args.health:
        run_health(cfg, keys_txt)

    if args.init_state:
        payload = {
            "session_id": f"{cfg['session_prefix']}{current}",
            "type": "context",
            "content": json.dumps({
                "current_session": f"{cfg['session_prefix']}{current}",
                "boot_protocol": "universal",
                "created": time_now(),
                "authoritative": True}),
            "significance": 8,
            "emotional_tag": "operational",
            "created_at": time_now(),
        }
        code = supabase_post(url, key, table, payload)
        print(f"[init-state] stamped {cfg['session_prefix']}{current} (HTTP {code})")

    print("Boot complete. No secrets echoed.")


def time_now():
    import time
    return time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime())


if __name__ == "__main__":
    main()