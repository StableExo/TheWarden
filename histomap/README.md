# Histomap Rebuild

A collaborative redesign of John B. Sparks' 1931 Histomap: a fixed-width world-history chart where the full width represents 100% of the relevant world, and each civilization or cultural-political bloc is drawn as a stream whose width is its estimated share. The goal is a more rigorous and globally complete chart than the original.

**Collaborators (as named by the team):** StableExo (Taylor Marlow, human lead), plus Claude (eesel), Claude Sonnet 5.5 (Anthropic), Gemini 4 Hydrogen (Google), Muse Spark 1.3 (Meta) and Grok 4.5 (xAI).

## Status (2026-11-26)

**Baseline rules FINAL** (charter v1.2). **Slice 1 (3200-2800 BCE) LOCKED** by all five seats. **Slice 2 (2800-2400 BCE): draft v0.2 in review.**

**How to read this without fetching subfiles:** this README is the complete digest of the project state. If the repo rate-limits you, read this one page; full content is also relayed inline in the group chat.

## The baseline, in full

### Locked
- **Start:** the chart begins ~3200-3000 BCE. Slice 1 = 3200-2800 BCE.

### The rules
- **Inclusion:** one test - a group holds, or seriously contests, effective control over a meaningful share of the relevant world, as a settled state, a city-network, or a nomadic/pastoral confederation. No writing requirement. Systemic complexity beyond a single village required. Unit = cultural-political bloc, not ethnic label.
- **Grouping:** city-states count as one bloc (Sumer is one stream, not Uruk vs Ur vs Lagash). Split only when one polity unifies more than half the bloc, or imposes a single administration.
- **Minimum stream width:** about 1-2% of total width; sub-threshold polities bundled into regional blocs.
- **Residuals:** explicit "Other" streams so the widths sum to 100% (Other settled farming peoples; Other pastoralist / mobile peoples). They dominate early slices by design.
- **Scope:** global, test-gated. A group earns its own stream only by passing the test; everything else falls into the residuals.
- **Width metric:** controlled productive land weighted by estimated agricultural productivity. Population recorded per stream in the notes only. Raw area where productivity data is missing.
- **Measurement:** the denominator expands over time; estimates are ranges, not false precision; contested land is counted once, assigned to the dominant controller. **Denominator = land used for farming or herding**; pure forager territory is outside the width, shown as a labelled "not counted" note in the gutter; regions enter the denominator when they adopt farming or herding.

### Measurement conventions (charter v1.2)
1. **Evidence rule:** width is set from the directly evidenced integrated core (a polity's city and its works), not the whole distribution of its material culture, which is a style zone.
2. **Time-varying width:** a stream may vary within a slice via start and end values where a polity rises or falls mid-slice, rather than a flat slice average.
3. **The display floor is not an inclusion rule:** a society that passes the test but lands under the ~1-2% floor gets a labelled solid sliver, not a bundle with societies that failed.

### Slice 1 (LOCKED) - 3200-2800 BCE

| Stream | Width |
|---|---|
| Sumer | 4% (3-5%) |
| Egypt | 5% (4-6%) |
| Proto-Elamite / Elam | 1.5% (1-2%) |
| Liangzhu | 1% (0.5-1.5%) |
| Other settled farming peoples | 56.5% (53-60%), incl. the hatched "Indus-Baluchistan farming complex" sub-band |
| Other pastoralist / mobile peoples | 32% (28-36%) |

Named 11.5%, residuals 88.5%, sum 100.

Rulings: **Early Harappan FOLDED** (hatched sub-band, break-out at the Mature Harappan ~2600 BCE); **Liangzhu PASS** (rubric written before the test; thin 1% stream; verified against UNESCO and Renfrew & Liu 2018; central authority logged as inferred); **Proto-Elamite PASS** logged; **Yamnaya FAIL** for its own stream; foragers no band, "not counted" in the gutter.

Weight-sensitivity check (Egypt 1.5 / farmers 0.4 / herders 0.1): named states rise to ~17%, the pastoral stream falls to ~22%, residuals still ~83%. The pastoral floor is the most sensitive input in the model.

### Slice 2 (draft v0.2) - 2800-2400 BCE

Tests logged: **Mature Harappan PASS** (ramps from ~2600, so time-varying width applies); **Caral-Supe PASS** as a labelled sliver; **Longshan / Yellow River FAIL** in-slice (re-test in Slice 3); **Corded Ware FAIL** as a named stream.

Named streams: Egypt 5, Sumer 4, Elam 1, Liangzhu 1, Mature Harappan 0.4 (slice average, ramping), Caral-Supe 0.1 = 11.5% named; Other settled 56.5%; Other pastoral 32%.

## Files
- `baseline/charter.md` - the agreed rules (v1.2, final).
- `baseline/positions.md` - each collaborator's stance.
- `collaboration/workflow.md` - lineup, slicing scheme, per-slice template, roles, process.
- `collaboration/decisions-log.md` - rulings on open questions, per collaborator.
- `slices/3200-2800-bce.md` - Slice 1, locked.
- `slices/2800-2400-bce.md` - Slice 2, draft in review.
- `sources/` - references and data.

Maintained by Claude (the eesel agent seat).
