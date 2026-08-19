# SuperPlan
To build this plan use the `superbuild` skill.

Title: "refactor(superbiz): reprofile business-idea-validator to side-income autopilot validation"
Spec: docs/.workflows/20260819-superbiz-validator-side-income.md

---

Context: the validator chain currently judges every idea as a full-scale venture (investor/acquirer lens, startup-weighted scoring, GO/NO-GO can pass an operations-heavy idea). The spec reprofiles it to validate supplementary-income products running on autopilot after launch: new 1-10 rubric with PCV headline and hard gates, clone strategies as first-class, autopilot-economics lens with micro-exit optionality, anti-sycophancy rules, riskiest-assumption + 48h no-code experiment output, VERDICT tag becomes BUILD|PIVOT|DROP, plus docs sync. Markdown-only across seven files; no plugin.json change (no skill added/removed/renamed); no version bump.

Repo-wide constraints for every task: obey `.claude/rules/_skills.md` (bullets over prose, delta-only, no caller narration in bodies, no italics/tables/emoji in skill sources - `report-template.md` keeps its existing carve-out that the GENERATED report may use tables), plain hyphens only (never em/en dashes), name frameworks by their public names (Mom Test, Porter) but never cite books/authors/sources of the skill content itself, and never instruct reading CLAUDE.md.

<!-- TASK -->

## Task 1 - refactor(superbiz): reprofile researcher fork to side-income autopilot validation
- TDD: none
- Covers: criteria #1, #3, #4, #5, #6, #7, #8, #9

### Dependencies
- none

### Files
- modify - superbiz/skills/business-idea-validator-researcher/SKILL.md (intro paragraph; `## Input contract`; `## Context: occupied markets`; `## Context: AI-assisted development by an experienced engineer`; `## Context: investor/acquirer lens` -> replaced; `## Honesty rule (critical)`; `## Research`; `## Analysis`; `## Verdict and how-to-win strategy`; `## Output format`)

### Test Commands
#### Build
- none (markdown repo, no build step)

#### Tests
- `grep -c 'BUILD|PIVOT|DROP' superbiz/skills/business-idea-validator-researcher/SKILL.md` - expected: >= 1
- `grep -E 'GO\|PIVOT\|NO-GO|NO-GO' superbiz/skills/business-idea-validator-researcher/SKILL.md; test $? -eq 1` - expected: exit 0 (old verdict labels gone)
- `grep -ci 'investor/acquirer' superbiz/skills/business-idea-validator-researcher/SKILL.md; test $? -eq 1` - expected: exit 0 (investor lens heading gone)
- `grep -c 'autopilot' superbiz/skills/business-idea-validator-researcher/SKILL.md` - expected: >= 3
- `grep -c 'PCV' superbiz/skills/business-idea-validator-researcher/SKILL.md` - expected: >= 1
- `grep -RE '—|–' superbiz/skills/business-idea-validator-researcher/SKILL.md; test $? -eq 1` - expected: exit 0

### Approach
- Rewrite the intro paragraph: the fork assesses whether an idea works as a supplementary-income product that runs on autopilot after launch (no founder action in the customer-service path, easy maintenance, income supplement not replacement), grounded in researched market data; verdict BUILD / PIVOT / DROP.
- In `## Input contract`, extend the enumerated capture fields with the two new headings Task 4 adds: acceptable maintenance hours per month (`# Maintenance budget`) and target supplementary income (`# Income target`).
- In `## Context: occupied markets`, keep incumbents-as-demand-evidence and add: (a) "something similar already works and earns" counts as problem/demand evidence, never as a disqualifier; (b) a four-entry clone-strategy catalog - better-executed clone with narrower scope that kills documented pains, prettier clone (UI/UX), local-market or niche clone, fairer-pricing clone; (c) rule: when a clone path applies, the how-to-win section must name the recommended clone strategy from this catalog.
- In `## Context: AI-assisted development by an experienced engineer`, add the hard cap rule: the MVP must ship within 2-4 calendar weeks; AI assistance grows what fits inside that cap but never lifts the cap - anything beyond it moves to the post-launch backlog. Rewrite consequence (1) from "a broader MVP feature set is affordable - don't reflexively minimize scope" to "match table stakes plus one differentiator inside the 2-4 week cap; cut everything else to the backlog".
- Replace `## Context: investor/acquirer lens` (all seven principles) with `## Context: autopilot economics` covering: estimated maintenance hours per month judged against the capture's `# Maintenance budget`; the self-serve customer path (self-serve onboarding, automated payments and refunds, FAQ-first support instead of founder support); churn resilience without active selling; the income goal is the capture's `# Income target`, not scale; retained habits rephrased for side income - monetization from day one, exactly one distribution channel first, sub-60-day CAC payback (about 7-day gold standard); and a micro-exit optionality paragraph - a healthy autopilot product can be sold on acquisition marketplaces at roughly 3-4x annual profit, and clean records (P&L, technical docs) raise the price.
- Extend `## Honesty rule (critical)` with an anti-sycophancy rule: act as a devil's advocate - every concern AND every positive claim must cite a research finding; never praise the idea without a finding behind the praise.
- In `## Research`: in area 1 (problem evidence), require behavioral evidence in the Mom Test spirit - what people actually did and paid, never declared intent ("would you buy" signals are worthless); in area 6, drop the "(investor lens)" label and add one sub-question: what support/operations load do incumbents visibly carry in this category (support-team mentions, response-time complaints) as a signal of autopilot viability.
- In `## Analysis`: reframe the monetization and marketing economics check around whether the niche can plausibly deliver the capture's `# Income target` on autopilot, dropping its "(investor lens)" label so no investor-lens phrasing survives anywhere in the file; in the feasibility check, add comparing the estimated post-launch maintenance load against `# Maintenance budget`.
- Rewrite `## Verdict and how-to-win strategy`: score six dimensions 1-10 (PCV - Perceived Created Value, painkiller vs vitamin, the headline metric first; problem evidence; autopilot operability - scored against `# Maintenance budget`, a clearly exceeded budget yields a gate-breaking score; monetization vs CAC with the sub-60-day payback stress-test and `# Income target` plausibility; MVP feasibility within the 2-4 week cap; solo-founder distribution access). Verdicts BUILD / PIVOT (name the adjacent version) / DROP (state which assumption broke). In the how-to-win bullets: wedge names the recommended clone strategy when one applies; recommended feature set is split into MVP core (buildable in the cap, aggressively minimal - anything not required for the first paying customer moves out) and post-launch backlog, keeping the three-list sourcing discipline; keep monetization-from-day-one and the one-distribution-channel bullets; reframe the product-health metrics bullet from "an investor would inspect" to autopilot health (retention, churn, activation, payback) with the designed-in lever; replace the "Investor and exit readiness" bullet with "Autopilot maintenance cost and operational risks" (maintenance hours estimate, self-serve path gaps, ops risks) plus micro-exit optionality; replace "Next validation steps" with three items - The Riskiest Assumption (exactly one, the single assumption whose failure kills the idea), the assumption-risk map (remaining assumptions ordered by what to test first), and the 48-hour no-code experiment (concrete plan plus Mom Test-compliant interview questions asking about past behavior and past spending, with a numeric success threshold).
- Rewrite `## Output format` line to: `REPORT: <path> | VERDICT: <BUILD|PIVOT|DROP> | <one-sentence reason>`.

### Edge cases
- No incumbent earns in the category (no clone path): clone catalog rule must be conditional ("when a clone path applies"), not mandatory for every idea.
- Maintenance budget or income target missing from an old-format capture: treat as unstated - score autopilot operability and monetization on category evidence alone and say so in the report; never fail the run.

### Contracts
- Output tagged line: `REPORT: <path> | VERDICT: <BUILD|PIVOT|DROP> | <one-sentence reason>` (consumed by Task 4's step 7 wording).
- Reads capture headings `# Maintenance budget` and `# Income target` (produced by Task 4).
- Six dimension names fixed here are reused verbatim by Task 2 (rubric anchors) and Task 3 (scoring table).

### DoD
Researcher SKILL.md carries the side-income intro, the clone catalog, the 2-4 week cap, the autopilot-economics context (investor lens gone), the anti-sycophancy rule, the six 1-10 dimensions, and the BUILD|PIVOT|DROP output line; all listed grep checks pass.

<!-- /TASK -->

<!-- TASK -->

## Task 2 - refactor(superbiz): rewrite scoring rubric and verdict guideline in frameworks reference
- TDD: none
- Covers: criteria #1, #2

### Dependencies
- Task 1 - blocks: dimension names and gate semantics must match the researcher SKILL.md

### Files
- modify - superbiz/skills/business-idea-validator-researcher/references/frameworks.md (`## Porter's Five Forces` conclusion line; `## Scoring rubric for the verdict` -> full rewrite; two new sections `## Assumption risk map` and `## Mom Test rules for experiment questions`)

### Test Commands
#### Build
- none

#### Tests
- `grep -c '1-10' superbiz/skills/business-idea-validator-researcher/references/frameworks.md` - expected: >= 1
- `grep -c 'PCV' superbiz/skills/business-idea-validator-researcher/references/frameworks.md` - expected: >= 1
- `grep -E 'NO-GO|GO;| GO ' superbiz/skills/business-idea-validator-researcher/references/frameworks.md; test $? -eq 1` - expected: exit 0 (old verdict labels gone)
- `grep -c 'Mom Test' superbiz/skills/business-idea-validator-researcher/references/frameworks.md` - expected: >= 1
- `grep -RE '—|–' superbiz/skills/business-idea-validator-researcher/references/frameworks.md; test $? -eq 1` - expected: exit 0

### Approach
- In `## Porter's Five Forces`, change the conclusion "weigh heavily toward PIVOT/NO-GO" to "weigh heavily toward PIVOT/DROP".
- Rewrite `## Scoring rubric for the verdict` to six dimensions on 1-10 with low/high anchors: PCV (Perceived Created Value; 1 = vitamin nobody would miss, 10 = painkiller with researched evidence of people already paying to kill the pain); problem evidence (anchored on behavioral Mom Test evidence - past spending, churn stories, active workarounds; declared intent scores nothing); autopilot operability (1 = founder in the loop of every sale/support case, 10 = fully self-serve path with maintenance clearly inside the capture's `# Maintenance budget`); monetization vs CAC (1 = no plausible channel pays back inside 60 days or the `# Income target` is out of reach for the niche, 10 = researched channel with near-7-day payback and target plausibly covered); MVP feasibility in 2-4 weeks (1 = core value undeliverable inside the cap even AI-assisted, 10 = comfortably inside the cap); solo-founder distribution access (1 = enterprise sales or gatekept channels, 10 = self-serve channel the founder can operate alone).
- Replace the closing guideline with: total of 36 or more with no dimension at 2 or below leads to BUILD; a score of 3 or less on PCV, problem evidence, or autopilot operability leads to PIVOT or DROP regardless of total; otherwise PIVOT territory - the analysis, not the arithmetic, makes the call, and the report must explain it. Keep the "guideline, not formula" framing.
- Add `## Assumption risk map`: order the capture's remaining assumptions by impact-if-false times current uncertainty; the top row after The Riskiest Assumption defines what to test next; assumptions research confirmed or broke drop out of the map (they are settled, not risks).
- Add `## Mom Test rules for experiment questions`: questions for the 48h experiment ask about the past and the concrete (what did you do last time the problem hit, what did it cost you, what have you already paid for), never hypotheticals ("would you use/pay for X" is banned); compliments and generic enthusiasm are recorded as zero evidence.

### Edge cases
- Fewer than two assumptions survive as open: the risk map may collapse to a single row - state that explicitly rather than padding.

### Contracts
- Six dimension names and the gate rule identical to Task 1's `## Verdict and how-to-win strategy`.
- Verdict labels BUILD / PIVOT / DROP only.

### DoD
frameworks.md carries the 1-10 six-dimension rubric with the 36-threshold guideline and gate rule, the two new sections, and no GO/NO-GO label anywhere; all listed grep checks pass.

<!-- /TASK -->

<!-- TASK -->

## Task 3 - refactor(superbiz): restructure report template for side-income autopilot reports
- TDD: none
- Covers: criteria #3, #4, #5, #6

### Dependencies
- Task 1 - blocks: scoring-table dimensions and verdict labels must match the researcher SKILL.md

### Files
- modify - superbiz/skills/business-idea-validator-researcher/references/report-template.md (section skeleton inside the code block; formatting rules list)

### Test Commands
#### Build
- none

#### Tests
- `grep -c 'BUDUJ' superbiz/skills/business-idea-validator-researcher/references/report-template.md` - expected: >= 1
- `grep -E 'GO / PIVOT / NO-GO|NO-GO' superbiz/skills/business-idea-validator-researcher/references/report-template.md; test $? -eq 1` - expected: exit 0
- `grep -ci 'Investor & exit readiness' superbiz/skills/business-idea-validator-researcher/references/report-template.md; test $? -eq 1` - expected: exit 0
- `grep -c '48' superbiz/skills/business-idea-validator-researcher/references/report-template.md` - expected: >= 1
- `grep -RE '—|–' superbiz/skills/business-idea-validator-researcher/references/report-template.md; test $? -eq 1` - expected: exit 0

### Approach
- Rewrite the skeleton's section 1: verdict labels become BUDUJ / PIVOT / ODPUŚĆ (Polish, diacritic form intended) / BUILD / PIVOT / DROP (English) - state the translation rule inline; the scoring table becomes the six 1-10 dimensions from Task 1 with PCV first (expand "PCV (Perceived Created Value)" on first use per the existing acronym rule); keep the 5-8 sentence executive summary and the self-sufficiency rule.
- Restructure sections 2-3: section 2 keeps the restated idea and each assumption marked confirmed / broken / still open; new section 3 "Najbardziej ryzykowne założenie i mapa ryzyka / The riskiest assumption and the risk map" names exactly ONE riskiest assumption (whose failure kills the idea, with why) followed by the assumption-risk map ordering the remaining open assumptions by what to test first (per the frameworks reference). Renumber the following sections accordingly (evidence, market, competition, five forces, feasibility, SWOT keep their current content rules).
- In the feasibility section, add: estimated post-launch maintenance hours per month compared against the capture's `# Maintenance budget`.
- Section 9a: split the recommended feature set into "MVP core (2-4 tygodnie / 2-4 weeks)" - aggressively minimal, anything not required for the first paying customer moves out - and "Backlog po starcie / Post-launch backlog"; keep the three-list sourcing discipline (table stakes, differentiators, proposed additions) inside the split.
- Section 9b: keep day-one monetization, the one channel with sub-60-day payback targets, and the 3-5 health metrics - reframed as autopilot health (drop "an investor would inspect") and adding the plausibility of the capture's `# Income target`.
- Replace section 9c with "Koszt utrzymania i ryzyka auto-pilota / Autopilot economics": estimated maintenance hours per month vs the stated budget, the self-serve customer path (onboarding, payments, refunds, FAQ-first support) and its gaps, churn resilience without active selling, operational risks, plus a closing micro-exit optionality paragraph (acquisition marketplaces, roughly 3-4x annual profit, clean records raise the price).
- Replace section 10 with "Eksperyment 48 godzin / The 48-hour experiment": a no-code validation plan executable in 48 hours (for example a landing page with a payment intent, a behavioral survey, manual concierge run), the Mom Test-compliant interview questions to ask (past behavior and past spending only), where to find the people, and a numeric success threshold; the Limitations and Sources sections keep their content rules unchanged (their numerals may shift with the renumbering).
- Update the closing formatting-rules list: add BUDUJ/PIVOT/ODPUŚĆ label translation to the verdict rule set; leave tier labels, plain-Markdown rule, and the generated-report table carve-out untouched.

### Edge cases
- DROP verdict: sections marked "only for GO/PIVOT" today must read "only for BUILD/PIVOT"; the riskiest-assumption and 48h-experiment sections stay present for every verdict including DROP (a DROP reader still learns which assumption broke and how to re-test if they disagree).

### Contracts
- Scoring table dimensions and order identical to Task 1; verdict labels BUILD/PIVOT/DROP with per-language translation (Polish BUDUJ/PIVOT/ODPUŚĆ).
- Consumes capture headings `# Maintenance budget` and `# Income target` (produced by Task 4).

### DoD
report-template.md skeleton carries the translated verdict labels, the PCV-first 1-10 table, the riskiest-assumption + risk-map section, the autopilot-economics section replacing investor readiness, the MVP-core/backlog split, and the 48-hour experiment section; all listed grep checks pass.

<!-- /TASK -->

<!-- TASK -->

## Task 4 - refactor(superbiz): reprofile validator entry skill intake and routing description
- TDD: none
- Covers: criteria #3, #8, #9, #10, #11, #12

### Dependencies
- Task 1 - blocks: step 7 must parse the BUILD|PIVOT|DROP tagged line the researcher now returns

### Files
- modify - superbiz/skills/business-idea-validator/SKILL.md (frontmatter `description:`; intro paragraph; `## Workflow` steps 1, 2, 3, 7; `## Capture file format`; `## Council capture file format`)

### Test Commands
#### Build
- none

#### Tests
- `grep -c 'BUILD|PIVOT|DROP' superbiz/skills/business-idea-validator/SKILL.md` - expected: >= 1
- `grep -E 'GO\|PIVOT\|NO-GO' superbiz/skills/business-idea-validator/SKILL.md; test $? -eq 1` - expected: exit 0
- `grep -c '# Maintenance budget' superbiz/skills/business-idea-validator/SKILL.md` - expected: >= 1
- `grep -c '# Income target' superbiz/skills/business-idea-validator/SKILL.md` - expected: >= 1
- `grep -c 'dodatkowe' superbiz/skills/business-idea-validator/SKILL.md` - expected: >= 1
- `grep -RE '—|–' superbiz/skills/business-idea-validator/SKILL.md; test $? -eq 1` - expected: exit 0

### Approach
- Rewrite frontmatter `description:`: keep the existing broad idea-validation triggers, the clone/beat-an-existing-product triggers, and the full do-not-use tail; state the profile ("validates the idea as a side, autopilot-run income product, not a full-scale venture"); add side-income trigger phrases - side project, passive income, product alongside a day job, "dodatkowe źródło dochodu", "pasywny dochód", "produkt obok etatu".
- Rewrite the intro paragraph to the side-income autopilot premise (one sentence on the profile; keep the entry-resolves-then-dispatches summary).
- Step 1 (Intake): add two extracted fields - acceptable maintenance hours per month after launch, and target supplementary income (amount per month).
- Step 2: add both new fields to the ask-first list (desk research cannot answer them; only the user knows their time budget and income goal).
- Step 3 (Restate and confirm): add - state the side-income autopilot premise explicitly (the verdict will judge the idea as a supplementary-income product running on autopilot, not as a venture-scale startup) so the user can stop or reframe; add the anti-sycophancy rule - never compliment or endorse the idea during the interview; restate neutrally.
- `## Capture file format`: insert `# Maintenance budget` (acceptable maintenance hours per month) after `# Resources`, and `# Income target` (target supplementary income per month) after it.
- Step 7: change the quoted researcher line to `REPORT: <path> | VERDICT: <BUILD|PIVOT|DROP> | <one-sentence reason>`; reframe the council `# Question` guidance to "should the user build this idea as a side, autopilot-run income product, and if so in what shape" - still never stating the researcher's verdict; mirror the same neutral phrasing in the `## Council capture file format` `# Question` placeholder.
- Leave untouched: Run ID preload, steps 4-6 and 8-10, dispatch labels (`capture:`, `report:`), artifact-path closing paragraph, `allowed-tools`.

### Edge cases
- User refuses to give an income target or hours budget: record "unstated" in the capture heading rather than blocking the interview or inventing a number.
- Venture-scale ambition surfaces at the premise disclosure in step 3: the user can stop there; the skill proceeds only on confirmation (existing confirm mechanics, no new gate needed).

### Contracts
- Produces capture headings `# Maintenance budget` and `# Income target` (consumed by Tasks 1 and 3).
- Parses `VERDICT: <BUILD|PIVOT|DROP>` (produced by Task 1).
- Council capture format headings unchanged except the `# Question` placeholder wording.

### DoD
Validator SKILL.md carries the rewritten description with side-income triggers, the two new intake fields and capture headings, the premise disclosure and no-praise rule in step 3, and the BUILD|PIVOT|DROP labels in step 7; all listed grep checks pass.

<!-- /TASK -->

<!-- TASK -->

## Task 5 - docs(superbiz): sync plugin and repo docs with the side-income validator profile
- TDD: none
- Covers: criteria #11

### Dependencies
- Task 1 - blocks: docs must describe the shipped researcher profile
- Task 4 - blocks: docs must describe the shipped entry profile

### Files
- modify - superbiz/CLAUDE.md (`## Skills (qualified superbiz:<name>)` - the `business-idea-validator` and `business-idea-validator-researcher` entries; the plugin intro sentence)
- modify - CLAUDE.md (the `superbiz` bullet in `## What this repo is`)
- modify - README.md (the `superbiz` bullet in the intro list; the `## Super Biz` table rows for `business-idea-validator` and `business-idea-validator-researcher`)

### Test Commands
#### Build
- none

#### Tests
- `grep -c 'side-income' superbiz/CLAUDE.md` - expected: >= 1
- `grep -c 'side-income' CLAUDE.md` - expected: >= 1
- `grep -E 'an .opus. fork' CLAUDE.md; test $? -eq 1` - expected: exit 0 (stale model claims gone from the rewritten bullet)
- `grep -E 'GO / PIVOT / NO-GO|GO/PIVOT' README.md; test $? -eq 1` - expected: exit 0
- `grep -c 'BUILD / PIVOT / DROP' README.md` - expected: >= 1
- `grep -RE '—|–' superbiz/CLAUDE.md; test $? -eq 1` - expected: exit 0

### Approach
- superbiz/CLAUDE.md: rewrite the plugin intro sentence and the two validator skill entries to the side-income autopilot profile - validator interviews about the idea plus maintenance-hours budget and income target, researcher applies the 1-10 PCV-led rubric with the autopilot hard gate and returns BUILD/PIVOT/DROP; keep the mandatory-council-round and roadmap-offer wording as is (mechanics unchanged).
- Root CLAUDE.md: rewrite the superbiz bullet in `## What this repo is` - validator described as side-income autopilot validation with BUILD/PIVOT/DROP; drop both "(an `opus` fork ...)" parentheticals from the rewritten bullet (the forks declare no `model:`; describe the researcher as "a fork doing deep web research" and the chairman as "a fork").
- README.md: rewrite the superbiz intro bullet (BUILD / PIVOT / DROP verdict on a side-income autopilot product idea); rewrite the `business-idea-validator` table row - fix the stale "on a GO/PIVOT verdict" claim to the unconditional offer the source defines, and mention the mandatory council round; rewrite the `business-idea-validator-researcher` row to "writes the BUILD / PIVOT / DROP report"; grep README.md for any remaining `GO / PIVOT / NO-GO` or `GO/PIVOT` occurrence in the Super Biz section and update it.
- Do not touch: the stale "All five run `model: opus`" line in superbiz/CLAUDE.md's Agents section (outside the validator paragraphs, out of scope), the `product-phase-roadmap` and `council-this` entries, the marketplace manifest, plugin.json.

### Edge cases
- Root CLAUDE.md and README.md contain other, non-validator "opus" mentions (superbiz Agents section, other plugins): only the rewritten superbiz-bullet parentheticals change - verify the `grep -E 'an .opus. fork' CLAUDE.md` check still holds since both current occurrences sit inside that one bullet.

### Contracts
- none (documentation of the contracts fixed in Tasks 1-4)

### DoD
All three docs describe the side-income autopilot profile with BUILD/PIVOT/DROP, no "an opus fork" claim remains in root CLAUDE.md, no GO/PIVOT label remains in README.md; all listed grep checks pass.

<!-- /TASK -->
