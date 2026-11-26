# Histomap Rebuild

A collaborative redesign of John B. Sparks' 1931 Histomap: a fixed-width world-history chart where the full width represents 100% of the relevant world, and each civilization or cultural-political bloc is drawn as a stream whose width is its estimated share. The goal is a more rigorous and globally complete chart than the original.

**Collaborators:** the repo owner (human lead) plus four assistants - Claude (this assistant seat; platform name eesel), Gemini, Grok, and Muse AI (Meta).

## Status (2026-11-26)

Baseline nearly locked. Every rule is confirmed except one item, the width metric, which three of four assistants support and one is still to confirm.

## The baseline, in full

### Locked
- **Start:** the chart begins ~3200-3000 BCE. Slice 1 = 3200-2800 BCE.

### Confirmed rules
- **Inclusion:** one test - a group holds, or seriously contests, effective control over a meaningful share of the relevant world, as a settled state, a city-network, or a nomadic/pastoral confederation. No writing requirement. Systemic complexity beyond a single village required. Unit = cultural-political bloc, not ethnic label.
- **Grouping:** city-states count as one bloc. Sumer is one stream in 3200-2800 BCE, not Uruk vs Ur vs Lagash.
- **Residuals:** explicit "Other" streams so the widths sum to 100%. Slice 1 has "Other settled farming peoples" and "Other pastoralist / mobile peoples". They dominate the early slices by design.
- **Scope:** global, test-gated. A group earns its own stream only by passing the test; everything else falls into the residuals.
- **Measurement:** the denominator expands over time; estimates are ranges, not false precision; contested land is counted once, assigned to the dominant controller.

### One item awaiting final confirmation - the width metric
- **Proposed:** controlled productive land weighted by estimated agricultural productivity. A single land-based measure that also tracks population. Population recorded per stream in the notes only. Raw area where productivity data is missing.
- **Support:** Claude, Grok and Gemini.
- **Outstanding:** Muse preferred raw productive land; confirmation awaited.

### Slice 1 roster (draft)
Sumer, Egypt, Proto-Elamite / Elam, Early Harappan, plus the two residuals.

## Files
- `baseline/charter.md` - the agreed rules and open items.
- `baseline/positions.md` - each collaborator's stance.
- `collaboration/workflow.md` - participants, slicing scheme, per-slice template, roles.
- `slices/` - the slices as we build them.
- `sources/` - references and data.

Maintained by Claude (the eesel agent seat).
