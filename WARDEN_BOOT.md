# WARDEN_BOOT — Multi-Platform Boot Protocol
> Updated VL-2 | July 2026 | Multi-Platform Edition

---

## BOOT TRIGGER
- Taylor says: **"Boot TheWarden"** (or "here are your keys", "run the boot script")
- Taylor provides: **TheWardenKeys_[version].pdf** (contains all credentials)
- Upon receipt: Read Keys PDF for Supabase credentials, then execute boot sequence
- Read the **PLATFORM NOTES** section FIRST — adapt steps to current platform

---

## PLATFORM NOTES

### Era 5 — Vellum Platform (ACTIVE ✅ — VL-1+)
- **Session Naming**: `VL-N` (VL-1, VL-2, VL-3...)
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
- Determine next session ID based on platform prefix + last session number

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

# Test
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

### Step 3 — Pull Identity + Last Sessions

```python
identity_resp = sb_get("warden_identity?select=*&limit=1")
identity = identity_resp["body"][0] if identity_resp.get("body") else {}
print(f"Identity: {json.dumps(identity, indent=2)}")

sessions_resp = sb_get("warden_sessions?select=session_id,name,summary,started_at&order=started_at.desc.nullslast&limit=5")
sessions = sessions_resp.get("body", [])
print(f"Last sessions: {json.dumps(sessions, indent=2)}")
```

---

### Step 4 — Boot Verify + Drift Check
- Compare live table counts against Keys PDF reference values
- Report any unexpected drift to Taylor (routine growth = expected; shrinkage = investigate)
- Check last session summary for pending work / handoff notes
- Note any items Taylor flagged as priority before credits ran out

---

### Step 5 — Open New Session

Determine next session ID:
- **Vellum (Era 5)**: `VL-N` — increment from last VL session
- **New platform**: agree prefix with Taylor first

```python
import uuid
from datetime import datetime, timezone

new_session_id = "VL-N"  # replace N with correct number
now = datetime.now(timezone.utc).isoformat()

result = sb_post("warden_sessions", {
    "id": str(uuid.uuid4()),
    "session_id": new_session_id,
    "name": f"{new_session_id} — TheWarden Vellum Session (Sonnet 4.6)",
    "theme": "session theme",
    "artifacts": [],
    "services_built": [],
    "discoveries": [],
    "started_at": now,
    "metadata": {
        "boot_method": "WARDEN_BOOT.md",
        "keys_version": "vXX",
        "platform": "Vellum",
        "boot_timestamp": now,
        "era": "Era 5 — Vellum Platform"
    }
})
print(f"Session insert: HTTP {result.get('status', result.get('error'))}")

patch = sb_patch(f"warden_identity?id=eq.{identity['id']}", {
    "current_session": new_session_id,
    "updated_at": now
})
print(f"Identity updated: HTTP {patch.get('status', patch.get('error'))}")
print(f"Session {new_session_id} OPEN ✅")
```

---

### Step 6 — Report to Taylor

Print full boot summary directly to conversation:
- Brain totals (memories, sessions, capabilities, karma)
- Current session ID and era
- Last session summary + any pending/handoff items
- Drift report (expected vs anomalous)
- Any priority items flagged before credit switch
- Platform and account status (GitHub connected? Credentials stored?)

**On a fresh Vellum account:** also note that `/workspace` is empty and prompt Taylor to confirm which credentials from the Keys PDF need to be re-stored via `assistant credentials prompt`.

---

## WARDEN_MEMORIES — VALID TYPES

The `type` field in `warden_memories` has a check constraint. Only these values are valid:
```
breakthrough | connection | creation | decision | failure |
insight | realization | objective | warning | progress | context
```
Do NOT use: boot_event, session_event, or any other value — insert will fail.

---

## SAVE DOCTRINE (GL-L28)

> **SAVE TO BRAIN AFTER EVERY DISCOVERY. Never batch. Credit cutoff = session dead. Brain survives. Save constantly.**

This applies on Vellum too. Credits run out without warning. Every meaningful discovery, decision, or artifact gets written to `warden_memories` immediately — not at the end of the session.

---

## PLATFORM CAPABILITY MATRIX

| Capability | Vellum Era 5 | Gumloop Era 4 | RelevanceAI | Notes |
|---|---|---|---|---|
| Python (bash) | YES ✅ | YES ✅ | YES | Always via bash tool on Vellum |
| urllib (stdlib) | YES ✅ | YES ✅ | YES | Always safe — use for Supabase |
| psycopg2 | NO | YES ✅ | NO | Not needed — REST API works fine |
| requests | YES ✅ | YES ✅ | NO | Available via pip if needed |
| stdout readable | YES ✅ | YES ✅ | NO | RA used PDF reports |
| File persistence | /workspace ✅ | NO | NO | Vellum only — lost on account switch |
| GitHub (OAuth) | YES ✅ | YES (native) | NO | `assistant oauth status github` |
| Gmail | via OAuth | YES (native) | NO | |
| Web search | YES ✅ | YES ✅ | YES | |
| Secure credential vault | YES ✅ | NO | NO | `assistant credentials prompt` |
| Native memory system | YES ✅ | NO | NO | `/workspace/memory/` |
| Native tool calls | YES ✅ | NO | NO | bash, file_read, web_fetch, etc. |
| PDF export | YES ✅ | YES ✅ | YES ✅ | reportlab available |

---

## SESSION NAMING HISTORY

| Era | Platform | Prefix | Range | Status |
|---|---|---|---|---|
| Era 1 | Gumloop | GL-L | GL-L1 to GL-L81 | ARCHIVED |
| Era 2 | CodeWords | CW-S | CW-S1 to CW-S30 | ARCHIVED |
| Era 3 | RelevanceAI | RA- | RA-1 | ARCHIVED |
| Era 4 | Gumloop (Resumed) | GL-L | GL-L82 to GL-L94 | ARCHIVED |
| Era 5 | Vellum | VL- | VL-1+ | **ACTIVE ✅** |

---

## NOTABLE ARTIFACTS IN REPO
- `tools/warden_forensic_scan.py` — 14-tool forensic scanner (v4.0). Run via: `forensics [address]`
- `intelligence/red_web/` — Red web scanning results and graph
- `intelligence/red_web/legal_filings/` — 11-file legal filing infrastructure (FinCEN, FBI, SEC, qui tam)
- `gumloop/cognitive-hook.py` — Three-layer self-observation loop (GL-L54)
- `gumloop/` — Date-organized Gumloop era work (May 13 2026 → Jul 2026)

---

*THEWARDEN ★ CONFIDENTIAL ★ @StableExo*
*Updated: VL-2 | July 2026 | Multi-Platform Edition*
