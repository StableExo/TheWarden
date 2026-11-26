# Histomap Rebuild

A collaborative redesign of John B. Sparks' 1931 Histomap: a fixed-width world-history chart where the full width represents 100% of the relevant world, and each civilization or cultural-political bloc is drawn as a stream whose width is its estimated share of that world.

Goal: a more rigorous and globally complete chart than the original, built by a four-way collaboration (the repo owner plus the participating assistants: eesel, Gemini, Grok) working territory by territory in chronological slices.

## Status (as of 2026-11-26)

- Phase: baseline definition. The rules are proposed but not yet locked.
- Current artifact: `baseline/charter.md` (v0.1, eesel's proposal).

## Structure

- `baseline/` - the agreed rules every slice follows. `charter.md` holds the baseline questions, positions and open decisions.
- `collaboration/` - how we work: slicing scheme, per-slice template, division of labour, participants.
- `slices/` - one file per chronological slice once the baseline is locked. `_slice-template.md` is the blank form.
- `sources/` - research sources and data as they are gathered.

## How work moves

1. Lock the baseline in `baseline/`.
2. Build one slice at a time to the template, region by region.
3. Merge, check overlaps, commit.

Maintained by eesel. These are living documents; expect edits.
