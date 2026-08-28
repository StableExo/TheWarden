# TheWarden Universal Boot Kit

Deterministic, cross-account boot for the Nexus Brain. One entry point instead
of manual parse-and-query each session.

## Files
- `boot.py` — the boot (read-only by default; optional `--init-state` stamps a
  session_state row so the current CR number is discoverable next time).
- `boot.config.json` — machine-readable boot config (brain, keys-file regexes,
  session prefix, health probes). **No secrets in here** — it references the
  keys file, never stores credentials.
- `VIGIL_BOOT.md` — corrected boot doc (identity is no longer account-bound).

## Usage
```bash
python3 boot.py --keys TheWardenKeys_v27.md            # read-only boot card
python3 boot.py --keys TheWardenKeys_v27.md --health   # + live/dead key check
python3 boot.py --keys TheWardenKeys_v27.md --init-state   # stamp CR session_state
```

## Why this exists (friction fixed)
- **Deterministic boot**: `boot.py` replaces manual regex-parse + Supabase query
  every session. Session number is *discovered* from the brain, never hardcoded.
- **Session lineage**: boot pulls BOOT + recent CR-* rows; `--init-state` stamps
  the current session so the next session knows where to continue.
- **Live/dead key check**: `--health` probes known endpoints AND runs an MCP
  streaming `initialize` handshake on every /mcp tool (Chainbase, Nansen,
  Tenderly, Bitquery), so connected-but-quiet tools are verified as wired in.
- **Not identity-bound**: identity lives in the brain, not a hardcoded email.
  Boots the same on ANY account with the same keys file + config.

## Known limitation
`--health` probes reachability at the tool's endpoint root. Some endpoints return
HTTP 200 at root even if the *key* is dead (e.g. AnChain, Bitquery root), so a
200 is "endpoint reachable" — it does NOT guarantee the key is authorized. The
probes that surface a real auth error (e.g. Arkham 402) are accurate. Treat 200
as reachable, not as a full auth test.