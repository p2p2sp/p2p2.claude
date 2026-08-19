# Report structure

Write the report in the report language from the capture (headings below are English placeholders - translate them). Length: typically 1500-3000 words. Prose with tables where tabular; avoid bullet-point-only sections - the reader needs reasoning, not slideware. Comparison tables are the generated report's own concern, not a skill-source restriction: this template's ban on tables applies to skill source files, and the artifact it describes lands in the host repo, not under `skills/` - the generated report may use Markdown tables freely.

```
# Walidacja pomysłu: [nazwa pomysłu]  /  Idea validation: [idea name]
Date, geography analyzed, one-line description of the idea

## 1. Werdykt / Verdict  <- ALWAYS FIRST
The verdict label in bold, translated to the report language:
BUDUJ / PIVOT / ODPUŚĆ in Polish, BUILD / PIVOT / DROP in English,
the analogous translation in any other report language. Then a 5-8
sentence executive summary of why, then the scoring table: the six
dimensions in this exact order - PCV (Perceived Created Value,
expanded on first use in the report language, e.g. in Polish:
postrzegana wartość dla klienta), problem evidence, autopilot
operability, monetization vs CAC, MVP feasibility within the 2-4 week
cap, solo-founder distribution access - each scored 1-10 with a
one-line justification. For PIVOT: name the recommended pivot here.

## 2. Pomysł i kluczowe założenia / The idea and its key assumptions
Restated idea. The 3-5 leap-of-faith assumptions and, for each,
what the research showed: confirmed / broken / still open.

## 3. Najbardziej ryzykowne założenie i mapa ryzyka / The riskiest assumption and the risk map
Exactly ONE riskiest assumption - the single one whose failure kills
the idea outright - with what makes it more lethal than the rest.
Then the assumption-risk map, built from the assumptions still open
in section 2 (no re-arguing their status here): those assumptions
ordered by what to test first (highest kill-power and cheapest to test
first), each with the concrete signal that would falsify it.
Present for every verdict, DROP included.

## 4. Dowody na istnienie problemu / Evidence of the problem
What real people/companies say. Sources.

## 5. Rynek / Market
TAM/SAM/SOM with visible bottom-up arithmetic. Trend. Sources.
On first use expand each acronym in parentheses, translated to the
report language, e.g. in Polish: TAM (Total Addressable Market -
całkowity rynek adresowalny), SAM (Serviceable Addressable Market -
rynek realnie osiągalny dla produktu), SOM (Serviceable Obtainable
Market - rynek możliwy do zdobycia w 2-3 lata). Apply the same
first-use expansion rule to every other acronym in the report
(SWOT, MVP, ARPU, B2B/B2C, GTM, and so on) - the reader should never have to
leave the document to decode an abbreviation.

## 6. Konkurencja / Competition
Comparison table (incl. indirect/substitutes, the idea as last row).
Then the execution-gap sub-table: each incumbent rated Low/Med/High on
performance, UI, UX, onboarding, simplicity, pricing fairness,
from review evidence. Then 1-2 paragraphs per major competitor: what
they do well, what users complain about, what gap that leaves. Frame
incumbent presence as demand validation; the question is where the
execution bar is low, not whether the niche is empty.

## 6a. Mapa bolączek / Pain-point priority map
Ranked table: pain, evidence and sources, frequency, intensity,
switching trigger, affected incumbents, how the product
resolves it. Sorted switching-triggers first. 1 paragraph naming the
top 3 pains to press on to pull customers away.

## 6b. Macierz funkcjonalności / Feature comparison matrix
Features (grouped: table stakes / differentiators / requested-but-
absent) by incumbents plus the planned product. Cell markers:
[ok] (has it well) / [słabo - cytuj skargę] (has it but poorly, cite
the complaint) / [brak] (absent) - translate the bracket labels to
the report language. Short commentary: which table stakes the MVP
must match, which requested-but-absent rows are the opportunity.

## 7. Pięć Sił Portera / Five Forces
One short paragraph plus Low/Med/High per force; a concluding paragraph
on structural attractiveness.

## 8. Wykonalność / Feasibility
Market, technical, financial (rough cost-to-launch vs. the stated budget),
legal/regulatory for the target geography. Technical and financial on
the experienced-engineer plus Claude Code baseline (solo build in weeks,
ambitious technical scope viable - state the assumed timeline); give
extra weight to the non-compressible constraints: distribution, sales
cycle, compliance, data, support. Include the estimated post-launch
maintenance load in hours per month, compared against the capture's
`# Maintenance budget` (state the gap in both directions; the heading
absent or carrying the value `unstated` - say so and judge the load on
category evidence alone).

## 9. SWOT

## 10. Jak wygrać / How to win   (only for BUILD/PIVOT)
Wedge (execution wedge - which dimension: speed, UI, UX, onboarding,
simplicity - and/or feature wedge from the requested-but-absent band,
for which segment, tied to documented complaints; state which users
incumbents get to keep) leads to positioning (generic strategy) leads to why users
will switch (or which users have nothing to switch from) leads to moat
trajectory (remember: "built fast with AI" is not a moat - rivals
have the same tooling) leads to go-to-market entry sequence. When a
clone path applies, name the recommended clone strategy from the
clone-strategy catalog here and why the research favors it.

## 10a. Rekomendowany zakres funkcji / Recommended feature set
(only for BUILD/PIVOT) Source everything from three lists: (a) MVP
table stakes (from the matrix, incl. justified deferrals);
(b) differentiators, each as "feature, pain it kills, source";
(c) Propozycje dodatkowych funkcji / Proposed additional features -
3-6 capabilities not mentioned in the capture, clearly labeled as the
analyst's proposals, each with one line on why it strengthens the
wedge and rough build cost on the Claude Code baseline. No generic
filler - every proposal traces to a researched gap. Then split the
whole set into two delivery lists, keeping each item's sourcing:
MVP core (2-4 tygodnie / 2-4 weeks) - aggressively minimal, anything
not required to close the first paying customer moves out; and
Backlog po starcie / Post-launch backlog - everything else, ordered
by the pain it kills.

## 10b. Monetyzacja, dystrybucja i metryki / Monetization, distribution & metrics
(only for BUILD/PIVOT) Three parts: (1) Day-one monetization -
recommended paid/premium tier at launch: contents, price anchor
justified by researched incumbent pricing, role of any free tier;
what in the product makes the value adequate to the price. Never
"monetize later". State whether the capture's `# Income target` is
plausible at that anchor - show the arithmetic (price times paying
customers needed) and judge whether that count is reachable and
retainable in this niche. Both figures must be in the same currency:
the target comes in the user's currency and the researched price
anchor often does not, so convert the anchor when they differ and
name the rate used. The heading absent or carrying the value
`unstated` - say so and judge monetization on category evidence alone.
(2) The one channel - the single
distribution channel to make work first, why, and numeric targets:
payback on paid spend under 60 days (aspiration around 7 days); rule:
profitable channel leads to doubling down before adding a second one.
(3) Autopilot health metrics - 3-5 metrics beyond MRR that show the
product runs healthily without its owner (retention, churn,
activation, DAU/MAU, CAC payback) with benchmarks to beat, plus the
designed-in lever for the likely-weakest one (retention weak leads to
habit loops and lifecycle emails; activation weak leads to a tighter
self-serve onboarding; sales weak leads to seasonal events, launches).

## 10c. Koszt utrzymania i ryzyka auto-pilota / Autopilot economics
(only for BUILD/PIVOT) Four parts: (1) the estimated maintenance load
in hours per month - the same total stated in section 8, here itemized
by source (support volume, manual steps, integration upkeep,
moderation, updates) and compared against the capture's
`# Maintenance budget`; (2) the self-serve customer path -
onboarding, payments, refunds, FAQ-first and docs-first support - with
each researched gap that would pull the owner into the loop and the
automation that closes it; (3) churn resilience without active
selling: does this category retain on product value alone or does it
need continuous outbound, seasonal re-selling, account management -
plus the operational risks that grow with customer count (abuse, API
quotas, platform-policy changes, single-point dependencies) and their
mitigations; (4) one closing paragraph on micro-exit optionality:
whether acquisition marketplaces buy this kind of product at roughly
3-4x annual profit, and which records kept clean from day one (P&L,
technical documentation, roadmap in standard tools) raise the price.
Optionality worth preserving, never a required plan and never a
reason to inflate the verdict.

## 11. Eksperyment 48 godzin / The 48-hour experiment
One no-code validation plan executable within 48 hours - for example a
landing page with a payment intent, a behavioral survey, a manual
concierge run, a pre-order page, an ad test - with what to do, where
to find the people, a numeric success threshold, and rough cost/time.
Plus the interview questions to ask: Mom Test compliant, about past
behavior and past spending only ("what did you do the last time this
happened", "what do you pay for it today", "how did you find that
tool"), never "would you buy this". Present for every verdict,
DROP included - a reader who disagrees with DROP still gets the
cheapest way to re-test the broken assumption.

## 12. Ograniczenia analizy / Limitations
What desk research could not verify; assumptions that remain open.

## Źródła / Sources
Numbered list: title, publisher, URL, accessed date.
```

Formatting rules:
- Inline attribution for every number: "(GUS, 2025)" / "(Statista, 2024)".
- Every acronym expanded in parentheses on first use, in the report language - TAM/SAM/SOM always, plus SWOT, MVP, ARPU, GTM and any other abbreviation used.
- Pure Markdown only, no citation tags. Never write `<cite index="...">`, `<source>`, `<ref>` or any other XML/HTML tags into the report file; they don't render in Markdown. Citations use plain-text attribution "(Publisher, year)" or numbered "[n]" references resolved in the Sources section, with URLs as `[title](url)` Markdown links.
- Tier labels throughout: [fakt - źródło] / [szacunek - metoda] / [założenie] (translated to the report language).
- Verdict labels translated to the report language: BUDUJ / PIVOT / ODPUŚĆ in Polish, BUILD / PIVOT / DROP in English, the analogous translation elsewhere. The label is the section's first bolded element.
- The verdict section must be self-sufficient - a reader who stops after section 1 knows the answer, the top three reasons, and the six scores.
