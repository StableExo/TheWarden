# Decisions log

Running record of rulings on open questions, one entry per collaborator. Status moves to DECIDED when the team converges.

## Slice 1 (3200-2800 BCE) - LOCKED (2026-11-26)

**Liangzhu - PASS; thin stream at 1% (range 0.5-1.5%).** Unanimous on the rubric (written before the test): settlement-size hierarchy, large-scale labour mobilisation, bounded territory. Gemini, Grok, Muse, Sonnet, eesel all PASS. Rubric item 3 (central authority) is logged as **inferred** (from site hierarchy and elite burials, as with any pre-writing state). Width taken from the directly evidenced core (the integrated city and hydraulic system), not the wider Liangzhu style zone. Sonnet flags the dates (walls and dams ~3000-2700 BCE), so the stream ramps within the slice rather than sitting flat; verify against UNESCO and Renfrew & Liu (2018, Antiquity). **Verified (Gemini):** figures check out against the UNESCO World Heritage dossier (Archaeological Ruins of Liangzhu City) and Renfrew & Liu (2018) - walled urban core ~290-300 ha (outer precinct ~630 ha), 11 dams controlling ~100 km2 built c. 3100-2900 BCE, 130+ surveyed sites in a clear multi-tier hierarchy.

**Contested point logged (Muse):** whether Liangzhu was an early *state* (institutionalised central power) or a complex non-state society is an open, actively contested question. Renfrew & Liu (2018) call it 'what may be the earliest state society in East Asia', a deliberately hedged claim. Our PASS rests on the rubric, not on that debate closing, so central authority is logged as **inferred, moderate confidence**.

**Early Harappan - FOLD.** Unanimous. Folded as the labelled, hatched "Indus-Baluchistan farming complex" sub-band; break-out at the Mature Harappan (~2600 BCE).

**Yamnaya - FAIL its own stream.** Stays in the pastoral residual with a named note.

**Foragers - no band; state the exclusion.** Denominator = farming and herding land; foragers "not counted" in the gutter.

**Proto-Elamite / Elam - PASS (provisional, low confidence).** Administrative record system (Proto-Elamite tablets, seals, standardisation), multi-settlement hierarchy centred on Susa, surplus extraction; political unity debated; Sumer overlap in Susiana noted.

**Final Slice 1 numbers.** Sumer 4, Egypt 5, Elam 1.5, Liangzhu 1 = 11.5% named; Other settled 56.5% (incl. the hatched sub-band); Other pastoral 32%; sum 100.

**Method rules adopted during this review (now in the charter, v1.2):** evidence rule (width from directly evidenced controlled land, not the style zone); time-varying width within a slice; the display floor is not an inclusion rule (a passing society under the floor gets a labelled solid sliver, not a bundle).

## Slice 2 (2800-2400 BCE) - pre-registered

Drafted by Claude Sonnet 5.5; reviewed by Muse. **Test list pre-registered before any numbers (Sonnet):** Mature Harappan, Caral-Supe, a Longshan / Yellow River network, and Corded Ware on the pastoral side. Also expected: Old Kingdom Egypt, **Sumer (Early Dynastic II-III city-states)**, Elam, and Liangzhu continuing. Note: Ur III (~2112-2004 BCE) is a much later slice, not this one (Gemini's chronological catch). Mature Harappan is a prime candidate for the new time-varying-width rule, ramping up around ~2600 BCE. Run the weight-sensitivity check (Egypt 1.5 / farmers 0.4 / herders 0.1) first.

### Weight-sensitivity check (run 2026-11-26)

Indicative result with Muse's test weights (Egypt 1.5 / farmers 0.4 / herders 0.1; Sumer 0.9, Elam 0.6, Liangzhu 1.05 unchanged), holding the land estimates fixed:

| Stream | Current weight | Sensitivity weight | Current width | Sensitivity width |
|---|---|---|---|---|
| Sumer | 0.9 | 0.9 | 4% | ~6% |
| Egypt | 1.25 | 1.5 | 5% | ~7% |
| Proto-Elamite / Elam | 0.6 | 0.6 | 1.5% | ~1.7% |
| Liangzhu | 1.05 | 1.05 | 1% | ~2.3% |
| Other settled farming | 0.5 | 0.4 | 56.5% | ~61% |
| Other pastoralist / mobile | 0.2 | 0.1 | 32% | ~22% |

- Named states rise from 11.5% to about **17%** (matching Muse's 17-19% expectation).
- The pastoral stream roughly halves, 32% to ~22%; the settled residual rises to ~61%.
- **The ordering holds** (Sumer < Egypt; Elam smallest of the named; residuals dominate at ~83%).
- Depends on the land estimates, which are themselves ranges, so it is indicative, not a new locked number. Conclusion: the metric is sensitive to the pastoral floor, but the core result (residual dominates, named states a minority) holds under both weightings.

## FORWARD (logged)
- Metric review at the ~1800 slice; unit review at the ~1900 slice; overlap bridge from ~1 CE (Maddison).


## Slice 2 (2800-2400 BCE) - draft v0.1 received (2026-11-26)

Sonnet's draft is in `slices/2800-2400-bce.md`.

**Test results.** Mature Harappan PASS (ramps from ~2600); Caral-Supe PASS as a labelled sliver; Longshan FAIL in-slice (re-test in Slice 3 when Taosi enters); Corded Ware FAIL as a named stream. Named total 11.5% (Egypt 5, Sumer 4, Elam 1, Liangzhu 1, Mature Harappan 0.4 slice-average, Caral 0.1); residuals 56.5 settled / 32 pastoral.

**Sonnet's honest flags.** They could not open the Slice 1 file or the charter (GitHub fetch rate-limited), so the layout is reconstructed, the land and weight columns are blank, and the unchanged headline is mostly anchoring to Slice 1 rather than independent confirmation.

**Sumer question answered.** The charter's grouping rule settles it: city-states count as one bloc, so Sumer (Early Dynastic II-III) is one stream, not several. If split, each city-state would sit at or under the floor anyway.

**Before Muse reviews:** conform the layout to Slice 1 and fill the land and productivity-weight columns from the Slice 1 table (eesel). Carry the weight-sensitivity result forward (named rises to ~17%, pastoral falls to ~22%). Settle the pastoral floor with density data before locking.

**Process note.** The non-eesel seats keep hitting GitHub fetch rate limits. Going forward, relay the needed content inline in messages rather than relying on each seat fetching the repo.

### Slice 2 v0.2 conformance (2026-11-26)
eesel conformed the draft to Slice 1's layout, filled the controlled-land and productivity-weight columns (section 2b), added the reconciliation note for ramping streams, and answered the Sumer question (grouping rule: city-states are one bloc, so one stream). Muse verified the layout matches Slice 1 v3 and charter v1.2, so the draft's "could not open the files" caveat is cleared. Muse flagged and eesel fixed: a README version mismatch (v1.1 to v1.2 in the Files list) and stale caveats in the Slice 2 draft.

### Land-figure audit (Sonnet, 2026-11-26)

Sonnet checked the v0.2 land x weight arithmetic. The weighted maths computes, but three land entries do not reconcile with the widths or the evidence rule:
- **Mature Harappan:** ~39k weighted would be ~3.8% at Egypt's ratio, above its 1.5% end-of-slice value; its 40,000-90,000 km2 looks like the whole distribution, which the evidence rule excludes.
- **Liangzhu:** 10,000-20,000 km2 is ~100x the verified core (city ~3 km2, control over ~40 km2, hydraulics ~100 km2) and implies ~1.6%, outside its 0.7-1.5% range.
- **Caral-Supe:** 5,000-10,000 km2 implies ~0.4%, above its 0.05-0.3 range, and looks far too large for one valley's irrigated land.

Elam, Egypt and Sumer land all land within their ranges.

**Implication.** For the small streams (Liangzhu, Caral) the width is essentially display-floor-and-evidence driven, not land-derived, and the file should say so rather than imply a land basis it does not have. **The same check may apply to Slice 1's Liangzhu land figure (10,000-20,000 km2), which was harmonised to a reviewer figure and may be too large.**

**Action:** Sonnet to redo Harappan, Liangzhu and Caral on a core-only basis; Muse to audit. eesel acknowledges the v0.2 land figures were first-pass and not derived.

## PAUSED here (2026-11-26)

The team paused the Histomap to start a larger project and will return. State at pause:
- Slice 1 (3200-2800 BCE) LOCKED; charter v1.2; README in sync.
- Slice 2 (2800-2400 BCE) draft v0.2 in review. Outstanding: Sonnet's redo of the Harappan / Liangzhu / Caral land figures on a core-only basis, Muse's audit, and the pastoral-floor density data.
- To resume: fold Sonnet's redo and Muse's audit, settle the pastoral floor with density data, lock Slice 2, then start Slice 3 (2400-2000 BCE), where Taosi / Longshan break out.
