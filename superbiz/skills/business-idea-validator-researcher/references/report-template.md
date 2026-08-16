# Report structure

Write the report in the report language from the capture (headings below are English placeholders - translate them). Length: typically 1500-3000 words. Prose with tables where tabular; avoid bullet-point-only sections - the reader needs reasoning, not slideware. Comparison tables are the generated report's own concern, not a skill-source restriction: this template's ban on tables applies to skill source files, and the artifact it describes lands in the host repo, not under `skills/` - the generated report may use Markdown tables freely.

```
# Walidacja pomysłu: [nazwa pomysłu]  /  Idea validation: [idea name]
Date, geography analyzed, one-line description of the idea

## 1. Werdykt / Verdict  <- ALWAYS FIRST
GO / PIVOT / NO-GO in bold, followed by a 5-8 sentence executive
summary of why, and the scoring table (6 dimensions incl.
monetization potential, 1-5, one-line justifications). For PIVOT: name the recommended pivot here.

## 2. Pomysł i kluczowe założenia / The idea and its riskiest assumptions
Restated idea. The 3-5 leap-of-faith assumptions and, for each,
what the research showed: confirmed / broken / still open.

## 3. Dowody na istnienie problemu / Evidence of the problem
What real people/companies say. Sources.

## 4. Rynek / Market
TAM/SAM/SOM with visible bottom-up arithmetic. Trend. Sources.
On first use expand each acronym in parentheses, translated to the
report language, e.g. in Polish: TAM (Total Addressable Market -
całkowity rynek adresowalny), SAM (Serviceable Addressable Market -
rynek realnie osiągalny dla produktu), SOM (Serviceable Obtainable
Market - rynek możliwy do zdobycia w 2-3 lata). Apply the same
first-use expansion rule to every other acronym in the report
(SWOT, MVP, ARPU, B2B/B2C, GTM, and so on) - the reader should never have to
leave the document to decode an abbreviation.

## 5. Konkurencja / Competition
Comparison table (incl. indirect/substitutes, the idea as last row).
Then the execution-gap sub-table: each incumbent rated Low/Med/High on
performance, UI, UX, onboarding, simplicity, pricing fairness,
from review evidence. Then 1-2 paragraphs per major competitor: what
they do well, what users complain about, what gap that leaves. Frame
incumbent presence as demand validation; the question is where the
execution bar is low, not whether the niche is empty.

## 5a. Mapa bolączek / Pain-point priority map
Ranked table: pain, evidence and sources, frequency, intensity,
switching trigger, affected incumbents, how the product
resolves it. Sorted switching-triggers first. 1 paragraph naming the
top 3 pains to press on to pull customers away.

## 5b. Macierz funkcjonalności / Feature comparison matrix
Features (grouped: table stakes / differentiators / requested-but-
absent) by incumbents plus the planned product. Cell markers:
[ok] (has it well) / [słabo - cytuj skargę] (has it but poorly, cite
the complaint) / [brak] (absent) - translate the bracket labels to
the report language. Short commentary: which table stakes the MVP
must match, which requested-but-absent rows are the opportunity.

## 6. Pięć Sił Portera / Five Forces
One short paragraph plus Low/Med/High per force; a concluding paragraph
on structural attractiveness.

## 7. Wykonalność / Feasibility
Market, technical, financial (rough cost-to-launch vs. the stated budget),
legal/regulatory for the target geography. Technical and financial on
the experienced-engineer plus Claude Code baseline (solo build in weeks,
ambitious technical scope viable - state the assumed timeline); give
extra weight to the non-compressible constraints: distribution, sales
cycle, compliance, data, support.

## 8. SWOT

## 9. Jak wygrać / How to win   (only for GO/PIVOT)
Wedge (execution wedge - which dimension: speed, UI, UX, onboarding,
simplicity - and/or feature wedge from the requested-but-absent band,
for which segment, tied to documented complaints; state which users
incumbents get to keep) leads to positioning (generic strategy) leads to why users
will switch (or which users have nothing to switch from) leads to moat
trajectory (remember: "built fast with AI" is not a moat - rivals
have the same tooling) leads to go-to-market entry sequence.

## 9a. Rekomendowany zakres funkcji / Recommended feature set
(only for GO/PIVOT) Three lists: (a) MVP table stakes (from the
matrix, incl. justified deferrals); (b) differentiators, each as
"feature, pain it kills, source"; (c) Propozycje dodatkowych
funkcji / Proposed additional features - 3-6 capabilities not
mentioned in the capture, clearly labeled as the analyst's proposals, each
with one line on why it strengthens the wedge and rough build cost
on the Claude Code baseline. No generic filler - every proposal
traces to a researched gap.

## 9b. Monetyzacja, dystrybucja i metryki / Monetization, distribution & metrics
(only for GO/PIVOT) Three parts: (1) Day-one monetization -
recommended paid/premium tier at launch: contents, price anchor
justified by researched incumbent pricing, role of any free tier;
what in the product makes the value adequate to the price. Never
"monetize later". (2) The one channel - the single distribution
channel to make work first, why, and numeric targets: payback on
paid spend under 60 days (aspiration around 7 days); rule: profitable channel
leads to doubling down before adding a second one. (3) Product-health metrics -
3-5 metrics beyond MRR an investor would inspect (retention, churn,
activation, DAU/MAU, payback) with benchmarks to beat, plus the
designed-in lever for the likely-weakest one (retention weak leads to
gamification/habit loops; sales weak leads to seasonal events, launches).

## 9c. Perspektywa inwestora / Investor & exit readiness
Full section when an exit/fundraise is mentioned or the category
typically sells (micro-SaaS, app marketplaces); otherwise one short
paragraph. Cover: clean house (P&L, technical docs, roadmap in
standard market tools from day one - the buyer takes over your
risk); early relationships (likely buyer types, share progress
months-to-years before a sale - trust closes deals); honesty about
flaws (state the idea's genuine weak points plainly here - due
diligence finds them anyway; early candor builds trust).

## 10. Następne kroki walidacyjne / Next validation steps
2-3 cheap experiments, each with: what to do, where to find the
people, numeric success threshold, rough cost/time.

## 11. Ograniczenia analizy / Limitations
What desk research could not verify; assumptions that remain open.

## Źródła / Sources
Numbered list: title, publisher, URL, accessed date.
```

Formatting rules:
- Inline attribution for every number: "(GUS, 2025)" / "(Statista, 2024)".
- Every acronym expanded in parentheses on first use, in the report language - TAM/SAM/SOM always, plus SWOT, MVP, ARPU, GTM and any other abbreviation used.
- Pure Markdown only, no citation tags. Never write `<cite index="...">`, `<source>`, `<ref>` or any other XML/HTML tags into the report file; they don't render in Markdown. Citations use plain-text attribution "(Publisher, year)" or numbered "[n]" references resolved in the Sources section, with URLs as `[title](url)` Markdown links.
- Tier labels throughout: [fakt - źródło] / [szacunek - metoda] / [założenie] (translated to the report language).
- The verdict section must be self-sufficient - a reader who stops after section 1 knows the answer and the top three reasons.
