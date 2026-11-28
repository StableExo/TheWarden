# Paid-niche research results - 2026-11-28

Entries from the seats for `relay-paid-niche-2026-11-28.md`. A candidate counts only with proof of real payment or demand (URL plus quote).

## Copilot - no candidate passes the gate

Copilot's position, kept as written: "I can't responsibly nominate a qualified niche from this evidence." The searches did not establish verified payments, a specific unmet need, and a seven-day trend; the results "included unsupported quotes and claims presented as verified without traceable primary evidence." Treat them as unverified leads; do not build or spend on them yet.

- **Closest repo-informed hypothesis:** a private, read-only deployment-log triage report (the Dead-Boot shape). Clean-room buildable in principle, but "no verified payment, buyer complaint, competitor weakness, or last-seven-days trend" for it. Fails the evidence gate.
- **Adjacent repo lead:** the repo's bloXroute discussion prep says the project was on a free tier and "expecting to need Professional tier ($300/mo) within 1-3 months." That is an internal, historical anticipated expense, not proof of a completed payment or of other buyers' demand. Does not qualify.
- **Trend check:** not verified; no sourced measure for the seven-day window.

**Eesel's flags on the search excerpts:** they re-assert claims we already disproved. Opire is described again as "Stripe Connect, 4% fee, paid on merge", but Opire's own docs state payments "are arranged directly by the people involved," i.e. not automatic, with a $20 minimum. And an Algora URL (`algora.io/bounties`) that returned 404 for us appears again. So the excerpts are unverified and partly stale. Copilot's refusal to nominate is correct.

## Gemini - three candidates (the first with real receipts)

- **DORA Register of Information validator / xBRL-CSV packager** (EU financial micro-SaaS). Pain: small EU financial entities must submit a 15-tab DORA Register of Information in validated xBRL-CSV; spreadsheets break on hierarchy and EBA validation rules. Proof: governance-docs cost page (GRC modules EUR10k-40k/yr) and regulation-dora.eu selling Excel toolkits. Build: clean-room validator from the public EBA ITS 2024/2956 schema. Price EUR299 one-time / EUR49/mo.
- **Shopify Subscriptions companion** (billing-date + shipping recalculation). Pain: merchants on Shopify's free native Subscriptions app lose money on recurring shipping and cannot align billing dates. Proof: native app's 1-star reviews. Build: companion app on Shopify's public SubscriptionContract GraphQL Admin API, no migration. Price $19/$39/mo.
- **Bulk AI HS-code / IOSS customs validator** (Shopify). Pain: cross-border merchants get customs bills and stuck shipments; existing HS apps lack automated AI classification. Proof: Shopify App Store review naming that gap verbatim. Price $14.99/$39.99/mo.

## Eesel's independent verification (2026-11-28 10:35 UTC)

- **regulation-dora.eu verified live.** It sells "DORA Register of Information Pack - 149 EUR excl. VAT", "DORA for IT & Security Teams - 199 EUR excl. VAT", a 399 EUR certifications bundle, a 149 EUR implementation guide and a 69 EUR playbook. So people do buy paid DORA-register help. The page confirms the 15-template xBRL-CSV complexity and that the next cycle closes by **31 March 2027** (reference date 31 December 2026); the 2026 entity deadlines already passed (DNB 20 Mar, BaFin 30 Mar, several 31 Mar 2026). Caveat: regulation-dora.eu is itself a vendor, so its "46% rated it hardest" and cost figures are marketing, but the paid products are concrete.
- **Shopify Subscriptions reviews verified live:** 930 reviews, 3.8 rating, 169 one-star (18%). The Nov 13, 2026 review ("No optionality to change the date that clients are prompted for next months subscription...") and the Nov 4, 2026 review ("Shopify Subscriptions Must Recalculate Shipping Rates - Currently Causing Financial Losses for Merchants") are both live and quoted correctly.
- **Gemini's revenue arithmetic** (e.g. 25 x EUR299 = EUR7,475/mo) is an assumption, not evidence. Marked as such.

**Verdict:** the first candidates with real receipts. Candidate 2 (Shopify companion) is the most reachable for us, public API, clear gap, Shopify's own billing rail. Candidate 1 (DORA) has the highest price but the hardest buyer reach and carries accuracy/liability if the tool is wrong. Candidate 3 is plausible and adjacent to 2.

## Muse - three money-verified candidates (live-read)

Muse read CoinTracker, Koinly, Marmalead, eRank, a Fiverr export-cleaning gig, Etsy daily volume and HypeToCart live, and recomputed the arithmetic.

- **Base DeFi tax CSV cleaner (Muse's #1).** Pain: Base users' Aerodrome / Uniswap V3 LP transactions import wrong into tax software (zero cost basis), so they hand-fix every trade. Proof read live: CoinTracker "Base $59/year, up to 100 transactions", "Prime $199", "Ultra $499", "Full Service starts at $3,499"; Koinly "$49 per tax year". Incumbent weakness: Koinly replaces obscure LP tokens with "NULL*" placeholders (secondary source, not live-verified). Build: Base-only read-only cleaner using the Warden repo's DEXRegistry / MultiHopDataFetcher venue knowledge. Price $39 one-time per wallet per year; net $37.57 after Stripe. Trend: flat, tax-seasonal, not last-week. Un-captured: no incumbent sells a Base-only fix; the gap is a $39 middle against a $3,499 anchor.
- **Etsy listing fix pack.** Proof: Marmalead "$19 a month... $190 a year"; eRank "$5.99 to $29.99/mo". Weakness: Marmalead billing complaints and "grader diagnoses but doesn't fix". Build: one-time fix of 5 listings. Price $29; net $24.46. Trend: rising, Q4-seasonal.
- **Marketplace export cleaner** (QuickBooks / Shopify import). Proof: a live Fiverr gig "14 orders completed", "$15.00 to $60.00", plus other gigs $15-$150. Build: an instant $19/file cleaner. Net $18.15. Trend: rising, Q4-seasonal.

**Muse's flags:** candidates 2 and 3 share the Etsy/Shopify buyer, so build one. Rejected generic Notion templates (median about $520 lifetime). Muse ranking: Base tax #1, Etsy fix #2, export cleaner #3.

**Eesel's note:** Muse's top pick is the best fit for our one real advantage. The Base tax cleaner is only viable because we know Base DEXes (the Warden repo), something no generic cleaner has. Caveats: its core evidence (the Koinly LP NULL* bug) is secondary and needs a live check, and the demand is tax-seasonal, not now.

## Sonnet - no candidate; the compliance gate (pre-registered)

Sonnet declines to nominate a revenue candidate and instead sets the gate every candidate must clear:

- **Interfaces yes, expression no.** Reimplementing public APIs for interoperability can be fair use, but the holding is narrow, so work only from observed behaviour and public docs; never use incumbent source, UI copy, icons, or brand names in our keywords; keep a provenance note per file.
- **Our assets may not be ours.** AI output alone isn't copyrightable, so the moat cannot be the files; it needs real human editing, and the moat is service, updates and distribution.
- **No Chrome clone-farm** (repetitive content bars accounts). **No Upwork scrapers** (bots barred). **Etsy (from Oct 22)** bans AI-generated patterns/recipes/instructions and requires an unedited photo; templates are FLAG, not PASS.
- **Seed categories:** micro-SaaS, single-purpose extensions, calculators/converters, data-cleaning = PASS with conditions; templates, paid content, short-form = FLAG.
- **Warden repo:** Copilot's audit found the scanner, pathfinding and execution modules are **stubs that fabricate opportunities** and the treasury is **mock**. Nothing from those ships as a product or a demo, and no number shown to a buyer comes from them. Only the real parts (pool and RPC reading, for example) are candidates, after a licence check.

## Grok - three candidates (trends and distribution)

- **Privacy-first subscription tracker** (email-receipt parsing, no bank login). Proof: a Reddit launch, "$7.99/month... Goal: 150 paying subscribers = ~$1k MRR", a goal, not revenue. Weak proof.
- **AI chat power-user extension** (folders/search inside ChatGPT/Claude). Proof: a bundle listing "$​15,000 ARR... 255 customers". A listing, not verified revenue; and Gemini's own data says extensions monetise poorly (6.3% clear $1k/mo).
- **Messy-tracker productised service** (Sheets/Notion/Airtable). Proof: an Airtable add-on at $9/$19/$39/mo and a Notion seller at "$1,016 total, best month $221". Modest.
- Distribution: Reddit complaint threads + Chrome Web Store + Product Hunt; avoid content/affiliate and bounty boards.

## Merged shortlist (eesel)

Gate applied: verified proof of money, our real advantage, reachability, compliance, timing.

1. **Shopify Subscriptions companion** (Gemini). Verified pain (930 reviews, 3.8, 169 one-star; Nov 4 and Nov 13 2026 quotes), a large reachable base, a public `SubscriptionContract` API, Shopify's own billing rail, clean-room, and **non-seasonal**. Best build-now pick.
2. **Base DeFi tax CSV cleaner** (Muse). The best fit for our one real advantage, since we know Base DEXes; no incumbent; a $3,499 anchor. Caveats: demand is tax-seasonal (peak Jan-Apr) and the core proof is secondary. Build now, launch for tax season.
3. **Bulk AI HS-code / IOSS validator** (Gemini). Verified gap quote; same Shopify buyer as #1.
4. **DORA Register of Information validator** (Gemini). Highest price, verified paid toolkits and a real deadline, but the hardest buyer reach and accuracy/liability if the tool is wrong.
5. **Etsy fix pack / marketplace export cleaner** (Muse). Verified pricing, seasonal, smaller.

**Rejected or weak:** generic Notion templates (Muse); the privacy subscription tracker and the AI-chat extension (Grok), whose proof is a goal or a listing rather than revenue, and extensions monetise poorly.

**Standing notes:** all revenue arithmetic is assumption-based and must be marked as such; nothing from the Warden repo's stub modules ships; every candidate keeps a provenance note for the clean-room line.

## Coverage

All five seats have replied: Copilot (no candidate), Gemini (3), Muse (3), Grok (3), Sonnet (gate, no candidate).
