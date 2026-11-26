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
