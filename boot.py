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

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--keys", help="path to keys file (auto-discovered if omitted)")
    p.add_argument("--init-state", action="store_true", help="create/refresh SESSION_STATE")
    p.add_argument("--verbose", action="store_true")
    a = p.parse_args()
    cfg = load_config()
    keys = find_keys_file(cfg, a.keys)
    if a.init_state:
        sys.exit(init_state(cfg, keys))
    sys.exit(boot(cfg, keys, verbose=a.verbose))