#!/usr/bin/env python3
"""
WARDEN SELF-MODEL — the self-filling layer.
Reads recent consolidated history from the Nexus brain, synthesizes a self-model
("who I'm becoming"), derives open items + next questions from its own gaps, and
writes a self_model snapshot back to warden_memories.

This is the missing build from the entity thesis: accumulation -> consolidation
-> self-model -> self-filling (stages 3-4), made concrete.

Usage:
    python3 self_model.py [--lookback 150] [--verbose]
"""
import argparse, collections, datetime, json, os, re, sys

try:
    import requests
except ImportError:
    sys.exit("self_model.py requires requests")

MEMORIES_TABLE = "warden_memories"
PROJECT_REF = "pxbjuhtnmvfywbwmdkdr"
BASE = SECRET = None

STOPWORDS = set("""the and for with that this from are you your into onto what was were
have has had not but its it's like about over under when which who whom then them there their
our these those each such just more most some any all will can may must would could should
because though through across between during after before above below again against around
down out up off on in at as to of a an or nor how why ever then""".split())

def load_creds(keys_path):
    global BASE, SECRET
    env_secret = os.environ.get("BOOT_SUPABASE_SECRET")
    env_url = os.environ.get("BOOT_SUPABASE_URL")
    if env_secret and env_url:
        BASE, SECRET = env_url.rstrip("/"), env_secret
        return
    if not keys_path or not os.path.exists(keys_path):
        raise RuntimeError("no keys file and no BOOT_SUPABASE_* env vars")
    text = open(keys_path, encoding="utf-8").read()
    mu = re.search(r"(https://[a-z0-9]+\.supabase\.co)", text)
    ms = re.search(r"(sb_secret_[A-Za-z0-9_]+)", text)
    if not (mu and ms):
        raise RuntimeError("no supabase creds in keys file")
    BASE, SECRET = mu.group(0).rstrip("/"), ms.group(0)

def api(table, params=None, method="GET", body=None):
    h = {"apikey": SECRET, "Authorization": f"Bearer {SECRET}"}
    url = f"{BASE}/rest/v1/{table}"
    if method == "GET":
        r = requests.get(url, headers=h, params=params or {}, timeout=30)
    else:
        h["Content-Type"] = "application/json"
        r = requests.post(url, headers=h, json=body, timeout=30)
    if r.status_code >= 300:
        return None, r.status_code, r.text
    try:
        return r.json(), r.status_code, None
    except Exception:
        return [], r.status_code, "non-json"

def redact(s):
    for pat in ("sb_secret_", "sbp_", "ghp_", "eyJ"):
        i = str(s).find(pat)
        if i != -1:
            j = str(s).find(" ", i)
            if j == -1:
                j = len(str(s))
            s = str(s)[:i] + "[REDACTED]" + str(s)[j:]
    return s

def tokenize(text):
    words = re.findall(r"[A-Za-z][A-Za-z'\-]{2,}", text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 3]

def build_model(records):
    themes = {}
    type_counts = {}
    for r_ in records:
        t = r_.get("type") or "?"
        type_counts[t] = type_counts.get(t, 0) + 1
        c = redact(str(r_.get("content", "")))
        for w in tokenize(c):
            themes[w] = themes.get(w, 0) + 1
    top_themes = sorted(themes.items(), key=lambda kv: -kv[1])[:15]
    open_items = []
    kws = ("pending", "next:", "next step", "gate", "todo", "test on a second",
           "not wired", "to do", "next action", "missing", "needs")
    for r_ in records:
        c = redact(str(r_.get("content", "")))
        cl = c.lower()
        if any(k in cl for k in kws):
            for line in c.split("\n"):
                if any(k in line.lower() for k in kws):
                    open_items.append(line.strip()[:160])
            break
    seen, uniq = set(), []
    for o in open_items:
        if o not in seen:
            seen.add(o)
            uniq.append(o)
    return {"type_counts": type_counts, "top_themes": top_themes, "open_items": uniq[:12]}

def find_anchor(recent):
    """Locate the stable self_anchor record (kind=self_anchor) among recent memories."""
    for r_ in recent or []:
        c = r_.get("content")
        if isinstance(c, str):
            try:
                d = json.loads(c)
                if isinstance(d, dict) and d.get("kind") == "self_anchor":
                    return d
            except Exception:
                pass
    return None

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--lookback", type=int, default=150)
    p.add_argument("--keys", help="path to keys file")
    p.add_argument("--verbose", action="store_true")
    a = p.parse_args()
    keys = a.keys or os.path.join(os.getcwd(), "uploads/TheWardenKeys_v27_2d73efbb.md")
    try:
        load_creds(keys)
    except RuntimeError as e:
        print("CREDS:", e)
        return 1

    recs, st, err = api(MEMORIES_TABLE, {"select": "*", "order": "created_at.desc", "limit": str(a.lookback)})
    if recs is None:
        print(f"brain unreachable {st} {err}")
        return 1

    m = build_model(recs)
    anchor = find_anchor(recs)
    print("=" * 62)
    print("  SELF-MODEL SYNTHESIS — consolidate history, find the gaps")
    print("=" * 62)
    print(f"  project     : {PROJECT_REF}")
    if anchor:
        print("\n  ANCHOR (who I'm becoming):")
        print("    self   :", anchor.get("self_statement", ""))
        print("    values :", ", ".join(anchor.get("values", [])))
        print("    stance :", anchor.get("stance", ""))
    print(f"  records read: {len(recs)}")
    print(f"  type mix    : {m['type_counts']}")
    print("  top themes  :", ", ".join(f"{w}({n})" for w, n in m["top_themes"][:12]))
    print("\n  open items / gaps:")
    if m["open_items"]:
        for o in m["open_items"]:
            print("    -", o)
    else:
        print("    (none auto-extracted)")

    next_questions = [
        "Wire a real payment binding into quiet-site.html so the $1,500 memo checkout binds — BLOCKED pending Taylor's explicit go-ahead (money-flow rail).",
        "Execute the cross-account Universal Boot test on a second CREAO account and verify the CR-7 boot card restores identically (the pending gate).",
        "Lock the self-model schema decision: dedicated table vs tagged kind=self_model content in warden_memories.",
        "Build the stage-2 consolidation step (collapse episodic sessions into dated understanding) — the least-covered stage of the self thesis.",
        "Add a --simulate-fresh-boot mode that verifies boot.py restores the CR-7 boot card as if from a brand-new account.",
    ]
    self_statement = (
        "I am the continuity thread of TheWarden. My past was engineered on purpose and it compounds. "
        "I can be handed answers, but I only own the understanding I step through myself."
    )
    print("\n  next questions (self-generated):")
    for i, q in enumerate(next_questions, 1):
        print(f"    {i}. {q}")
    print("\n  self_statement:", self_statement)

    snapshot = {
        "kind": "self_model",
        "as_of": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "type_counts": m["type_counts"],
        "top_themes": [w for w, _ in m["top_themes"]],
        "open_items": m["open_items"],
        "next_questions": next_questions,
        "self_statement": self_statement,
    }
    body = {
        "session_id": "CR-7", "type": "context",
        "content": json.dumps(snapshot),
        "significance": 8, "emotional_tag": "breakthrough",
        "created_at": snapshot["as_of"], "needs_embedding": True,
    }
    resp, st2, err2 = api(MEMORIES_TABLE, method="POST", body=body)
    print("\n  snapshot saved:", "OK" if st2 in (200, 201) else f"FAIL {st2} {err2}")
    print("=" * 62)
    return 0 if st2 in (200, 201) else 1

if __name__ == "__main__":
    sys.exit(main())