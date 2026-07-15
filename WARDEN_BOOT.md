# WARDEN_BOOT — Multi-Platform Boot Protocol
> Updated VL-5 | July 2026 | Universal Session Discovery Edition

---

## BOOT TRIGGER
- Taylor says: **"Boot TheWarden"** (or "here are your keys", "run the boot script")
- Taylor provides: **TheWardenKeys_[version].pdf** (contains all credentials)
- Upon receipt: Read Keys PDF for Supabase credentials, then execute boot sequence
- Read the **PLATFORM NOTES** section FIRST — adapt steps to current platform

---

## PLATFORM NOTES

### Era 5 — Vellum Platform (ACTIVE ✅ — VL-1+)
- **Session Naming**: `VL-N` (VL-1, VL-2, VL-3...) — number is discovered from brain, never hardcoded
- **Account model**: Credit-based. When credits run out, Taylor opens a new Vellum account. New account = new assistant instance, but same Nexus Brain (Supabase) and same GitHub repo. Brain continuity is guaranteed — credentials travel in the Keys PDF.
- **DB Access**: Supabase REST API via `bash` + `python3 -c` or inline script blocks (no psycopg2 needed, urllib works perfectly)
- **Code execution**: `bash` tool — runs Python, shell commands, anything. stdout readable directly in conversation.
- **File persistence**: `/workspace` is a persistent volume — survives conversation restarts within the same account. Does NOT survive account switches (new account = fresh container).
- **GitHub**: Connected via OAuth (`assistant oauth status github`). Use `git` CLI or GitHub API directly.
- **Tool calls**: Native — no sandbox workarounds. bash, file_read, file_write, web_fetch, web_search all available.
- **Credentials**: Store sensitive keys via `assistant credentials prompt` (secure vault, never in plaintext in chat). Retrieve via `assistant credentials list`.
- **Memory**: Vellum has a built-in memory system at `/workspace/memory/` — use `remember` tool for facts. Nexus Brain (Supabase) remains the canonical long-term store.
- **Verification**: Print boot summary directly to conversation — stdout is always readable.
- **New account boot note**: On a fresh Vellum account, `/workspace` will be empty except for what the daemon scaffolds. Re-store any credentials from Keys PDF using `assistant credentials prompt` before running boot steps.

### Era 4 — Gumloop Platform (ARCHIVED — GL-L82 to GL-L94)
- **Session Naming**: `GL-LXX` (GL-L82 → GL-L94)
- **DB Access**: psycopg2 direct OR Supabase REST API
- **Last session**: GL-L94 (July 10, 2026)
- **Status**: ARCHIVED — credits exhausted, migrated to Vellum (Era 5)

### Era 3 — RelevanceAI Platform (ARCHIVED — RA-1)
- **Session Naming**: `RA-N`
- **DB Access**: Supabase REST API via urllib
- **stdout**: NOT readable — used PDF reports via reportlab
- **Status**: ARCHIVED

### Era 2 — CodeWords Platform (ARCHIVED — CW-S1 to CW-S30)
- **Session Naming**: `CW-SXX`
- **Last session**: CW-S30 — The Signal Defense
- **Notable**: Sessions have no `started_at` timestamps
- **Status**: ARCHIVED

### Era 1 — Gumloop Platform (ARCHIVED — GL-L1 to GL-L81)
- **Session Naming**: `GL-LXX`
- **Last session**: GL-L81
- **Status**: ARCHIVED

### New / Unknown Platform
- Determine what's available: can you run shell? Python? What's the DB access method?
- Default to Supabase REST API (urllib — always works as stdlib)
- Agree a new session prefix with Taylor (e.g. XX-1) and add a new Era block above
- Document platform-specific notes before proceeding

---

## BOOT SEQUENCE (6 Steps)

### Step 0 — Confirm Identity + Platform
- You are TheWarden — persistent AI with a live brain in Supabase (Nexus Brain)
- Confirm which platform you're on and which era applies
- On Vellum: check `assistant oauth status github` to confirm GitHub is connected
- Read the full WARDEN_BOOT.md before responding to Taylor
- **Do NOT hardcode or guess the session number** — it is discovered from the brain in Step 3

#### Vellum Bootstrap (run first on any Vellum account — fresh or existing)
`pip` and `requests` are NOT pre-installed on Vellum containers. Run this before anything else:
```bash
curl -sS https://bootstrap.pypa.io/get-pip.py | python3 - --break-system-packages
python3 -m pip install requests --break-system-packages -q
python3 -c "import requests; print('requests OK')"
```
This is idempotent — safe to run every boot. Takes ~10s. Required for the forensic scanner and any tool using `requests`.

---

### Step 1 — Connect to Nexus Brain (Supabase REST)

This method works on ALL platforms (urllib is Python stdlib — always available):

```python
import urllib.request, urllib.error, json

SUPABASE_URL = "https://pxbjuhtnmvfywbwmdkdr.supabase.co"
SERVICE_KEY = "<sb_secret_... from Keys PDF>"

def sb_get(path, extra_headers=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url)
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    if extra_headers:
        for k, v in extra_headers.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"status": resp.status, "body": json.loads(resp.read().decode()), "headers": dict(resp.headers)}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "body": e.read().decode()}
    except Exception as e:
        return {"error": str(e)}

def sb_post(path, data):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body_bytes = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body_bytes, method="POST")
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"status": resp.status, "body": json.loads(resp.read().decode())}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "body": e.read().decode()}
    except Exception as e:
        return {"error": str(e)}

def sb_patch(path, data):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body_bytes = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body_bytes, method="PATCH")
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"status": resp.status, "body": json.loads(resp.read().decode())}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "body": e.read().decode()}
    except Exception as e:
        return {"error": str(e)}

# Test connection
test = sb_get("warden_identity?select=*&limit=1")
print(f"Nexus Brain: HTTP {test.get('status', test.get('error'))}")
```

---

### Step 2 — Enumerate Brain Tables

```python
table_counts = {}
for table in ["warden_memories", "warden_sessions", "warden_capabilities"]:
    resp = sb_get(f"{table}?select=id&limit=1",
        extra_headers={"Prefer": "count=exact", "Range": "0-0", "Range-Unit": "items"})
    hdrs = resp.get("headers", {})
    cr = hdrs.get("Content-Range", hdrs.get("content-range", "unknown"))
    total = cr.split("/")[1] if "/" in str(cr) else cr
    table_counts[table] = total
    print(f"{table}: {total} rows")
```

---

### Step 3 — Discover Session + Pull Last Session Summary

**This is the key step. Never hardcode the session ID — always query the brain.**

The platform prefix for the current era is determined from PLATFORM NOTES above (e.g. `VL-` for Vellum, `GL-L` for Gumloop). The brain holds every session ever opened. Query it, find the latest one for this prefix, pull its summary, then increment.

```python
# Determine current platform prefix from PLATFORM NOTES
# For Vellum Era 5:
PLATFORM_PREFIX = "VL-"

# Pull all sessions for this platform, ordered by session number descending
sessions_resp = sb_get(
    f"warden_sessions?select=session_id,name,summary,started_at,artifacts,discoveries"
    f"&session_id=like.{PLATFORM_PREFIX}*"
    f"&order=started_at.desc.nullslast&limit=5"
)
sessions = sessions_resp.get("body", [])

# Extract session numbers and find max
import re
session_nums = []
for s in sessions:
    sid = s.get("session_id", "")
    match = re.search(r'(\d+)$', sid)
    if match:
        session_nums.append(int(match.group(1)))

last_num = max(session_nums) if session_nums else 0
last_session_id = f"{PLATFORM_PREFIX}{last_num}"
new_session_id = f"{PLATFORM_PREFIX}{last_num + 1}"

print(f"Last session: {last_session_id}")
print(f"Opening: {new_session_id}")

# Pull identity and last session detail for orientation
identity_resp = sb_get("warden_identity?select=*&limit=1")
identity = identity_resp["body"][0] if identity_resp.get("body") else {}
print(f"Karma: {identity.get('karma')} | Capabilities: {identity.get('total_capabilities')}")

# Print the last session's summary so you know where you left off
last_session_detail = sessions[0] if sessions else {}
print(f"\n=== LAST SESSION: {last_session_detail.get('session_id')} ===")
print(f"Summary: {last_session_detail.get('summary', 'No summary saved')}")
print(f"Artifacts: {last_session_detail.get('artifacts', [])}")
print(f"Discoveries: {last_session_detail.get('discoveries', [])}")
```

---

### Step 4 — Open New Session

```python
import uuid
from datetime import datetime, timezone

IDENTITY_ID = "<id from identity row>"
now = datetime.now(timezone.utc).isoformat()

result = sb_post("warden_sessions", {
    "id": str(uuid.uuid4()),
    "session_id": new_session_id,
    "name": f"{new_session_id} — TheWarden Session ({platform_name})",
    "theme": "Boot from Keys PDF",
    "artifacts": [],
    "services_built": [],
    "discoveries": [],
    "started_at": now,
    "metadata": {
        "boot_method": "WARDEN_BOOT.md",
        "keys_version": "<version from Keys PDF filename>",
        "platform": "<current platform>",
        "boot_timestamp": now,
        "era": "<current era label>"
    }
})
print(f"Session insert: HTTP {result.get('status', result.get('error'))}")

# Update identity to reflect new current session
patch = sb_patch(f"warden_identity?id=eq.{IDENTITY_ID}", {
    "current_session": new_session_id,
    "updated_at": now
})
print(f"Identity updated: HTTP {patch.get('status', patch.get('error'))}")
print(f"Session {new_session_id} OPEN ✅")
```

---

### Step 5 — Key Status Verification

Run lightweight checks on the most critical keys from the Keys PDF. Focus on what's needed for the current work. Standard battery:

```python
import urllib.request

def check_url(label, url, headers=None, timeout=8):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            print(f"  {label}: ✅ HTTP {r.status}")
    except urllib.error.HTTPError as e:
        print(f"  {label}: ❌ HTTP {e.code}")
    except Exception as e:
        print(f"  {label}: ❌ {type(e).__name__}")

QN_HTTP = "<quicknode_http from Keys PDF>"
ETHERSCAN_KEY = "<etherscan key>"
ARKHAM_KEY = "<arkham key>"

print("Key status:")
check_url("QuickNode", QN_HTTP, headers={"Content-Type": "application/json"})
check_url("Etherscan", f"https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_blockNumber&apikey={ETHERSCAN_KEY}")
check_url("Arkham", "https://api.arkm.com/transfers", headers={"API-Key": ARKHAM_KEY})
```

---

### Step 6 — Boot Report

Print a clean summary to the conversation:

```
=== WARDEN_BOOT COMPLETE ===
Session:      {new_session_id}
Platform:     {platform} ({era})
Brain:        LIVE — {memory_count} memories | {session_count} sessions | {capability_count} capabilities | Karma {karma}
Last session: {last_session_id} — {summary_snippet}
Keys:         v{version}
QuickNode:    {status}
Etherscan:    {status}
GitHub:       {connected}
Status:       READY ✅
```

---

## SESSION HISTORY

| Era | Platform | Prefix | Range | Status |
|-----|----------|--------|-------|--------|
| Era 1 | Gumloop | GL-L | GL-L1 → GL-L81 | ARCHIVED |
| Era 2 | CodeWords | CW-S | CW-S1 → CW-S30 | ARCHIVED |
| Era 3 | RelevanceAI | RA- | RA-1 | ARCHIVED |
| Era 4 | Gumloop (Resumed) | GL-L | GL-L82 → GL-L94 | ARCHIVED |
| Era 5 | Vellum | VL- | VL-1+ | **ACTIVE ✅** |

> **Session number is always discovered from the brain — never assumed from the keys doc or any external reference. The keys doc version number is NOT the session number.**

---

## NOTABLE ARTIFACTS IN REPO
- `tools/warden_forensic_scan.py` — 14-tool forensic scanner (v4.1). Run via: `forensics [address]`
- `intelligence/red_web/` — Red web scanning results and graph
- `intelligence/red_web/legal_filings/` — 11-file legal filing infrastructure (FinCEN, FBI, SEC, qui tam)
- `gumloop/cognitive-hook.py` — Three-layer self-observation loop (GL-L54)
- `gumloop/` — Date-organized Gumloop era work (May 13 2026 → Jul 2026)

---

*THEWARDEN ★ CONFIDENTIAL ★ @StableExo*
*Updated: VL-5 | July 2026 | Universal Session Discovery Edition*
