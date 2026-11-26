# Histomap Rebuild

A collaborative redesign of John B. Sparks' 1931 Histomap: a fixed-width world-history chart where the full width represents 100% of the relevant world, and each civilization or cultural-political bloc is drawn as a stream whose width is its estimated share. The goal is a more rigorous and globally complete chart than the original.

**Collaborators (as named by the team):** StableExo (Taylor Marlow, human lead), plus Claude (eesel), Claude Sonnet 5.5 (Anthropic), Gemini 4 Hydrogen (Google), Muse Spark 1.3 (Meta) and Grok 4.5 (xAI).

## Status (2026-11-26)

**Baseline rules FINAL** (charter v1.2). **Slice 1 (3200-2800 BCE) LOCKED** by all five seats. **Slice 2 (2800-2400 BCE): draft v0.2 in review.**

**How to read this without fetching subfiles:** this README is the complete digest of the project state. If the repo rate-limits you, read this one page; full content is also relayed inline in the group chat.

**Slice 2 snapshot (draft v0.2).** Tests logged: Mature Harappan PASS (ramps from ~2600); Caral-Supe PASS as a labelled sliver; Longshan FAIL in-slice (re-test Slice 3); Corded Ware FAIL as a named stream. Named total 11.5% (Egypt 5, Sumer 4, Elam 1, Liangzhu 1, Mature Harappan 0.4 slice-average, Caral 0.1); residuals 56.5 settled / 32 pastoral. Pastoral floor is the most sensitive number in the model and needs density data before this slice locks.

## The baseline, in full

### Locked
- **Start:** the chart begins ~3200-3000 BCE. Slice 1 = 3200-2800 BCE.

### The rules
- **Inclusion:** one test - a group holds, or seriously contests, effective control over a meaningful share of the relevant world, as a settled state, a city-network, or a nomadic/pastoral confederation. No writing requirement. Systemic complexity beyond a single village required. Unit = cultural-political bloc, not ethnic label.
- **Grouping:** city-states count as one bloc. Split only when one polity unifies more than half the bloc, or imposes a single administration.
- **Minimum stream width:** about 1-2% of total width, with sub-threshold polities bundled into regional blocs drawn with a distinct treatment.
- **Residuals:** explicit "Other" streams so the widths sum to 100%. Slice 1 has "Other settled farming peoples" and "Other pastoralist / mobile peoples". They dominate the early slices by design.
- **Scope:** global, test-gated. A group earns its own stream only by passing the test; everything else falls into the residuals.
- **Width metric:** controlled productive land weighted by estimated agricultural productivity. Population recorded per stream in the notes only. Raw area where productivity data is missing.
- **Measurement:** the denominator expands over time; estimates are ranges, not false precision; contested land is counted once, assigned to the dominant controller. Denominator = land used for farming or herding.

### Slice 1 (LOCKED) - 3200-2800 BCE
Sumer 4%, Egypt 5%, Proto-Elamite / Elam 1.5%, Liangzhu 1% = 11.5% named; Other settled 56.5% (incl. the hatched Indus-Baluchistan sub-band); Other pastoralist / mobile 32%. Details in `slices/3200-2800-bce.md`.

## Files
- `baseline/charter.md` - the agreed rules (v1.1, final).
- `baseline/positions.md` - each collaborator's stance.
- `collaboration/workflow.md` - lineup, slicing scheme, per-slice template, roles, process.
- `collaboration/decisions-log.md` - rulings on open questions, per collaborator.
- `slices/3200-2800-bce.md` - Slice 1, locked.
- `slices/2800-2400-bce.md` - Slice 2, draft in review.
- `collaboration/decisions-log.md` - rulings on open questions, per collaborator.
- `sources/` - references and data.

Maintained by Claude (the eesel agent seat).
