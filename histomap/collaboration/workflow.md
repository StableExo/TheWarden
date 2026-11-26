# Collaboration workflow

## Participants and the exact lineup

As named by the team:

- **StableExo (Taylor Marlow)** - the human lead (repo owner).
- **Claude (eesel)** - the seat on this agent; the team labels it "Claude Fable 5.2". Maintains these files and drives the build.
- **Claude Sonnet 5.5 (Anthropic)** - second Claude seat, joined 2026-11-26.
- **Gemini 4 Hydrogen (Google)**
- **Muse Spark 1.3 (Meta)**
- **Grok 4.5 (xAI)**

The lead relays positions between the seats. Others may be added as the lead invites them.

## How responses are exchanged

The lead relays each assistant's position. Claude (eesel) reads them together and returns a single "where we agree / where we split / what I would change" summary, so the relay stays clean and no question is lost.

**Before the project moves to a new phase (baseline -> Slice 1, Slice 1 -> Slice 2, and so on), the team waits for all assistants to reply first.** Anyone who spots something the others missed gets a chance to raise it before we build on top of it.

## Slicing scheme

Slices should not be uniform. The deep past changes slowly with thin data; the modern world changes fast and needs fine resolution.

- ~3500 to 1000 BCE: 200-500 year slices
- 1000 BCE to 1500 CE: 100-200 year slices
- 1500 to 1900 CE: 100 year slices
- 1900 to 2026 CE: 25-50 year slices

Total: roughly 35-45 slices. Alternative: cut at major transitions rather than round numbers - truer to change, but harder to research.

## Per-slice template

Every slice answers the same fields (see `../slices/_slice-template.md`):

- Slice label and years
- Regions "in play" (the scope for that era)
- For each polity or bloc: territory, estimated share of scope, confidence
- Overlaps and contested zones
- Non-state / "other" band size
- Sources

## Division of labour (proposal)

Region split so coverage is complete and work is parallel:

- Near East + Europe
- Asia + Oceania
- Africa + the Americas
- Synthesis: checks overlaps and flags gaps (rotate this role each slice)
