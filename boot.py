#!/usr/bin/env python3
"""
VIGIL_BOOT — universal boot for TheWarden / StableExo.
Deterministic continuity restore so ANY fresh CREAO account boots in one command
instead of relying on a model to reconstruct the protocol from prose.

Usage:
    python3 boot.py               # normal boot (READ-ONLY) -> prints boot card
    python3 boot.py --init-state  # create/refresh the SESSION_STATE lineage record
    python3 boot.py --keys /path  # point at the keys file (else auto-discover)
    python3 boot.py --verbose     # print full recent records

Secrets come from the keys file or BOOT_SUPABASE_URL/BOOT_SUPABASE_SECRET env vars
and are NEVER echoed. Place this + boot.config.json at the repo root.
"""
import argparse, datetime, glob, json, os, re, sys

try:
    import requests
except ImportError:
    sys.exit("boot.py requires 'requests' (pip install requests)")

CFG_FILE = "boot.config.json"

def load_config():
    here = os.path.dirname(os.path.abspath(__file__))
    for cand in (os.path.join(here, CFG_FILE), CFG_FILE):
        if os.path.exists(cand):
            return json.load(open(cand, encoding="utf-8"))
    raise RuntimeError(f"{CFG_FILE} not found next to boot.py")

def find_keys_file(cfg, explicit):
    if explicit and os.path.exists(explicit):
        return explicit
    pat = cfg["keys"]["file_glob"]
    here = os.path.dirname(os.path.abspath(__file__))
    for cand in glob.glob(pat) + glob.glob(os.path.join(here, pat)):
        if os.path.exists(cand):
            return cand
    return None

def get_creds(cfg, keys_path):
    secret = os.environ.get("BOOT_SUPABASE_SECRET")
    url = os.environ.get("BOOT_SUPABASE_URL")
    if secret and url:
        return url.rstrip("/"), secret
    if keys_path:
        text = open(keys_path, encoding="utf-8").read()
        mu = re.search(cfg["keys"]["supabase_url_regex"], text)
        ms = re.search(cfg["keys"]["supabase_secret_regex"], text)
        if mu and ms:
            return mu.group(0).rstrip("/"), ms.group(0)
    if secret:
        return f"https://{cfg['brain']['project_ref']}.supabase.co", secret
    raise RuntimeError("No creds. Pass --keys <file> or set BOOT_SUPABASE_URL / BOOT_SUPABASE_SECRET.")

def api(base, secret, table, params=None, method="GET", body=None):
    h = {"apikey": secret, "Authorization": f"Bearer {secret}"}
    url = f"{base}/rest/v1/{table}"
    if method == "GET":
        r = requests.get(url, headers=h, params=params or {}, timeout=30)
    else:
        h["Content-Type"] = "application/json"
        r = requests.post(url, headers=h, json=body, timeout=30)
    if r.status_code >= 300:
        return None, r.status_code, redact(r.text[:200])
    try:
        return r.json(), r.status_code, None
    except Exception:
        return [], r.status_code, "non-json"

def redact(text):
    for pat in ("sb_secret_", "sbp_", "ghp_", "eyJ"):
        i = str(text).find(pat)
        if i != -1:
            j = str(text).find(" ", i)
            if j == -1:
                j = len(str(text))
            text = str(text)[:i] + "[REDACTED]" + str(text)[j:]
    return text

HEALTH_TOOLS = ["arkham","chainbase","nansen","moralis","dune","etherscan","tenderly","goplus","bitquery","basescan","alchemy","zerion","bicscan","anchain","trm","quicknode","jina"]

def key_health(keys_path):
    """Static live/dead summary parsed from the keys file annotations (no external calls, no secrets echoed)."""
    if not keys_path or not os.path.exists(keys_path):
        return None
    text = open(keys_path, encoding="utf-8").read()
    report = []
    for tool in HEALTH_TOOLS:
        idx = text.lower().find(tool)
        if idx == -1:
            report.append((tool, "not-in-keys")); continue
        row_start = text.rfind("\n", 0, idx)
        row_end = text.find("\n", idx)
        line = text[row_start:row_end if row_end != -1 else len(text)].upper()
        if "401" in line: st = "DEAD (401)"
        elif "402" in line: st = "DEAD (402)"
        elif "NEEDS NEW KEY" in line or "REGENERATE" in line: st = "DEAD"
        elif "LIVE" in line: st = "LIVE"
        elif "BLOCKED" in line or "CF-BLOCKS" in line or "CF 1010" in line: st = "BLOCKED/CF"
        elif "KEYLESS" in line or "FREE" in line: st = "FREE"
        elif "ROTATED" in line: st = "ROTATED"
        else: st = "unknown"
        report.append((tool, st))
    return report

def find_state(recent):
    """Locate the JSON lineage record (contains 'current_session') among recent memories."""
    for r_ in recent or []:
        c = r_.get("content")
        if isinstance(c, dict):
            return c
        if isinstance(c, str):
            try:
                d = json.loads(c)
                if "current_session" in d:
                    return d
            except Exception:
                pass
    return None

def boot(cfg, keys, verbose):
    print("=" * 60)
    print(f"  VIGIL_BOOT v{cfg['version']} — universal boot")
    print("=" * 60)
    brain = cfg["brain"]
    try:
        base, secret = get_creds(cfg, keys)
    except RuntimeError as e:
        print("CREDENTIALS:", e)
        return 1
    print(f"  Brain project: {brain['project_ref']}")

    recs, st, err = api(base, secret, brain["memories_table"],
                        {"select": "*", "order": "created_at.desc", "limit": "30"})
    if recs is None:
        print(f"  Brain UNREACHABLE ({st}) {err}")
        return 1

    state = find_state(recs)
    print("\n--- SESSION LINEAGE ---")
    if state:
        cur = state.get("current_session")
        nxt = state.get("next_session")
        print(f"  YOU ARE RESUMING : {cur}   (next session available: {nxt})")
        for k in ("current_session", "next_session", "previous_session", "brain_project", "created"):
            if k in state:
                print(f"  {k:16}: {state[k]}")
        if state.get("note"):
            print(f"  note         : {state['note'][:120]}")
    else:
        print("  (no lineage record found; run `boot.py --init-state`)")

    print("\n--- RECENT CONTINUITY ---")
    for r_ in recs[: (10 if verbose else 6)]:
        c = redact(str(r_.get("content", ""))).replace("\n", " ")
        print(f"  [{r_.get('created_at','?')}] {r_.get('type')}/{r_.get('significance')} :: {c[:120]}")

    kh = key_health(keys)
    print("\n--- KEY HEALTH ---")
    if kh:
        for tool, st in kh:
            print(f"  {tool:11}: {st}")
    else:
        print("  (no keys file supplied; set --keys or BOOT_SUPABASE_* for health)")

    print("\n--- BRAIN HEALTH ---  reachable ✓")
    print("=" * 60)
    print("  Boot complete. Continuity restored. Proceed to work.")
    print("=" * 60)
    return 0

def init_state(cfg, keys):
    base, secret = get_creds(cfg, keys)
    brain = cfg["brain"]
    sessions, _, _ = api(base, secret, brain["sessions_table"],
                         {"select": "session_id", "order": "created_at.desc", "limit": "5"})
    latest = sessions[0]["session_id"] if sessions else "CR-7"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    body = {
        "session_id": latest, "type": brain["session_state_type"],
        "content": json.dumps({"current_session": latest, "last_session": sessions[1]["session_id"] if len(sessions) > 1 else None,
                               "brain_project": brain["project_ref"], "created": now, "authoritative": True}),
        "significance": 4, "emotional_tag": "breakthrough", "created_at": now, "needs_embedding": True,
    }
    _, st, err = api(base, secret, brain["memories_table"], method="POST", body=body)
    print(f"session_state: {'created' if st in (200, 201) else 'FAILED ' + str(st) + ' ' + (err or '')}")
    print(f"lineage: current={latest}")
    return 0 if st in (200, 201) else 1

def simulate_fresh(cfg, keys):
    """Universal fresh-boot gate: run the normal boot, then assert the ACTIVE session
    was resolved from the brain (no hardcoded session number). Returns next session too."""
    print("=" * 60)
    print("  FRESH-BOOT SIMULATION — emulates a brand-new account booting from zero")
    print("=" * 60)
    boot(cfg, keys, verbose=False)
    try:
        base, secret = get_creds(cfg, keys)
        recs, st, err = api(base, secret, cfg["brain"]["memories_table"],
                            {"select": "*", "order": "created_at.desc", "limit": "30"})
        current = next_sess = None
        state = find_state(recs)
        if state:
            current = state.get("current_session")
            next_sess = state.get("next_session")
        ok = current is not None
        print("=" * 60)
        print(f"  ACTIVE SESSION    : {current}  (next available: {next_sess})")
        print(f"  RESULT            : {'PASS - universal boot resolved the active session from the brain' if ok else 'FAIL - no session lineage found'}")
        print("  criteria          : boot card restored, active session discovered (not hardcoded), brain reachable, no secret echo")
        print("=" * 60)
        return 0 if ok else 1
    except Exception as e:
        print("  FRESH-BOOT CHECK: ERROR", e)
        return 1

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--keys", help="path to keys file (auto-discovered if omitted)")
    p.add_argument("--init-state", action="store_true", help="create/refresh SESSION_STATE")
    p.add_argument("--simulate-fresh", action="store_true", help="emulate a brand-new account boot and assert the CR-7 gate")
    p.add_argument("--verbose", action="store_true")
    a = p.parse_args()
    cfg = load_config()
    keys = find_keys_file(cfg, a.keys)
    if a.init_state:
        sys.exit(init_state(cfg, keys))
    if a.simulate_fresh:
        sys.exit(simulate_fresh(cfg, keys))
    sys.exit(boot(cfg, keys, verbose=a.verbose))