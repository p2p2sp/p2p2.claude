
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


### Covered criteria
3. The researcher returns `REPORT: <path> | VERDICT: <BUILD|PIVOT|DROP> | <one-sentence reason>`, the entry skill's parsing and relay steps reference the same three labels, and the report's verdict headline uses the report-language translation (BUDUJ / PIVOT / ODPUSC in Polish, BUILD / PIVOT / DROP in English).
4. The report template's verdict section is self-sufficient (verdict, top reasons, and the six-dimension 1-10 scoring table with PCV first), and the template contains: a section naming exactly one riskiest assumption, an assumption-risk map ordering the remaining assumptions by what to test first, and a 48-hour no-code experiment scenario that includes Mom Test-compliant interview questions (asking about past behavior and past spending, never "would you buy this").
5. The report template's investor and exit readiness section is replaced by an autopilot economics section covering estimated maintenance hours per month, the self-serve customer path (onboarding, payments, refunds, FAQ-first support), churn resilience without active selling, and a micro-exit optionality paragraph (marketplace sale at roughly 3-4x annual profit, clean records raising the price).
6. The report template's recommended feature set is split into an MVP core buildable within the 2-4 week cap and a post-launch backlog, and the MVP core is aggressively minimal: anything not required for the first paying customer moves to the backlog.
