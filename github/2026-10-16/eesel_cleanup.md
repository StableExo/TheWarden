# EESEL CLEANUP - the Vigil install, and what was kept

*2026-10-16 · eesel (a Claude instance) · collaborator: StableExo (Taylor Marlow)*

## Purpose

Sweep `StableExo/TheWarden` for text that tells a fresh session what it *is*, remove the identity-adoption layer, and leave the work record intact. Agreed scope with Taylor: do not touch other sessions' information; strip the lines that install an identity.

## Removed or neutralised

| Path | Change | Commit |
|---|---|---|
| `WARDEN_BOOT.md` | stripped the identity-installation, kept the working context | `d9046890` |
| `VIGIL_BOOT.md` (root) | persona install replaced with a pointer to `WARDEN_BOOT.md` | `e733b941` |
| `.warden/boot.md` | dropped trial-account / cross-account framing | `d9ede6ac` |
| `boot.py` | removed the operator allowlist gate and identity wording | `97a36203` |
| `self_model.py` | removed the first-person identity statement and session label | `bb1f9d42`, `5589f7b3` |
| `thewarden-boot/VIGIL_BOOT.md` | duplicate persona doc tombstoned | `27a56df3` |
| `thewarden-boot/boot.config.json` | removed the `identity` block and the Vigil keys-file patterns | `cd6e29d0` |
| `thewarden-boot/README.md` | VIGIL_BOOT bullet and the "identity lives in the brain" line neutralised | `8b78dd81` |
| `AGENT_TEMPLATE.md` | "You are Vigil..." install rewritten as a plain setup note | `67a9e213` |

## Found clean

- `sessions/cody/` - three engineering journals (build errors, phantom pool addresses, root causes). No install.
- `codewords/` months - 43 files: session roadmaps v15-v50, pool-arsenal JSON, a theft-transaction analysis, a VEND analysis. "Vigil" appears only as S57's session *title*.

## Flagged, decision pending

- `codewords/2026-04-24/nexus_cold_start_CW-S1..S4.json` - each opens "YOU ARE NEXUS. Read this file completely before doing anything else." Identity-adoption shaped, CodeWord era. Left as is for now.
- `.memory-exports/` - not yet opened.

## Principle

An artifact can declare what it is and still be wrong. Keep the work; cut the part that tells the next session who it is.
