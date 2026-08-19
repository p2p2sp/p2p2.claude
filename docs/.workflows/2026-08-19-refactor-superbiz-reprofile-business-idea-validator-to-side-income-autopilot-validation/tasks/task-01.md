
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


### Covered criteria
1. The researcher's rubric (SKILL.md plus `references/frameworks.md`) scores exactly six dimensions on a uniform 1-10 scale: PCV (painkiller vs vitamin), problem evidence (real past behavior and spending, never declared intent), autopilot operability, monetization vs CAC with a sub-60-day payback stress-test, MVP feasibility within a hard 2-4 week calendar cap, and solo-founder distribution access - each with per-band scoring anchors.
3. The researcher returns `REPORT: <path> | VERDICT: <BUILD|PIVOT|DROP> | <one-sentence reason>`, the entry skill's parsing and relay steps reference the same three labels, and the report's verdict headline uses the report-language translation (BUDUJ / PIVOT / ODPUSC in Polish, BUILD / PIVOT / DROP in English).
4. The report template's verdict section is self-sufficient (verdict, top reasons, and the six-dimension 1-10 scoring table with PCV first), and the template contains: a section naming exactly one riskiest assumption, an assumption-risk map ordering the remaining assumptions by what to test first, and a 48-hour no-code experiment scenario that includes Mom Test-compliant interview questions (asking about past behavior and past spending, never "would you buy this").
5. The report template's investor and exit readiness section is replaced by an autopilot economics section covering estimated maintenance hours per month, the self-serve customer path (onboarding, payments, refunds, FAQ-first support), churn resilience without active selling, and a micro-exit optionality paragraph (marketplace sale at roughly 3-4x annual profit, clean records raising the price).
6. The report template's recommended feature set is split into an MVP core buildable within the 2-4 week cap and a post-launch backlog, and the MVP core is aggressively minimal: anything not required for the first paying customer moves to the backlog.
7. The researcher's context sections contain no investor/acquirer lens; instead they carry the autopilot-economics lens, an occupied-markets context extended with the four-entry clone-strategy catalog (the "how to win" section must name the recommended clone strategy when one applies), retained habits rephrased for side income (monetization from day one, one distribution channel, sub-60-day CAC payback), and an AI-assisted-development context stating that AI assistance grows what fits inside the 2-4 week cap but never lifts the cap.
8. Both skills carry an explicit anti-sycophancy rule: the researcher ties every concern and every positive claim to a cited research finding, and the entry skill never compliments or endorses the idea during the interview.
9. The entry skill's intake asks for acceptable maintenance hours per month and the target supplementary income, and the validator capture format carries both as headings; both inputs feed the scoring, not just narrative: autopilot operability is scored against the user's stated acceptable hours (an estimated maintenance load clearly above that budget yields a gate-breaking score), and the monetization vs CAC dimension assesses whether the researched niche can plausibly deliver the stated income target on autopilot.
