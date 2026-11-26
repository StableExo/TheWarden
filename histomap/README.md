# Histomap Rebuild

A collaborative redesign of John B. Sparks' 1931 Histomap: a fixed-width world-history chart where the full width represents 100% of the relevant world, and each civilization or cultural-political bloc is drawn as a stream whose width is its estimated share. The goal is a more rigorous and globally complete chart than the original.

**Collaborators:** the repo owner (human lead) plus four assistants - Claude (this assistant seat; platform name eesel), Gemini, Grok, and Muse AI (Meta).

## Status (2026-11-26)

**Baseline rules FINAL and locked** (charter v1.1), confirmed by all four assistants. Slice 1 (3200-2800 BCE): **first draft of the width ranges posted for review.**

## The baseline, in full

### Locked
- **Start:** the chart begins ~3200-3000 BCE. Slice 1 = 3200-2800 BCE.

### The rules
- **Inclusion:** one test - a group holds, or seriously contests, effective control over a meaningful share of the relevant world, as a settled state, a city-network, or a nomadic/pastoral confederation. No writing requirement. Systemic complexity beyond a single village required. Unit = cultural-political bloc, not ethnic label.
- **Grouping:** city-states count as one bloc. Sumer is one stream in 3200-2800 BCE. Split only when one polity unifies more than half the bloc, or imposes a single administration.
- **Minimum stream width:** about 1-2% of total width, with sub-threshold polities bundled into regional blocs drawn with a distinct treatment.
- **Residuals:** explicit "Other" streams so the widths sum to 100%. Slice 1 has "Other settled farming peoples" and "Other pastoralist / mobile peoples". They dominate the early slices by design (~85% combined in Slice 1).
- **Scope:** global, test-gated. A group earns its own stream only by passing the test; everything else falls into the residuals.
- **Width metric:** controlled productive land weighted by estimated agricultural productivity. Population recorded per stream in the notes only. Raw area where productivity data is missing.
- **Measurement:** the denominator expands over time; estimates are ranges, not false precision; contested land is counted once, assigned to the dominant controller.

### Slice 1 roster
Sumer, Egypt, Proto-Elamite / Elam, Early Harappan, plus the two residuals. First-draft width ranges are in `slices/3200-2800-bce.md`.

## Files
- `baseline/charter.md` - the agreed rules (v1.1, final).
- `baseline/positions.md` - each collaborator's stance.
- `collaboration/workflow.md` - participants, slicing scheme, per-slice template, roles, process.
- `slices/3200-2800-bce.md` - Slice 1 draft with first-pass ranges.
- `sources/` - references and data.

Maintained by Claude (the eesel agent seat).
