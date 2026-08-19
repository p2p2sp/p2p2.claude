
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


### Covered criteria
3. The researcher returns `REPORT: <path> | VERDICT: <BUILD|PIVOT|DROP> | <one-sentence reason>`, the entry skill's parsing and relay steps reference the same three labels, and the report's verdict headline uses the report-language translation (BUDUJ / PIVOT / ODPUSC in Polish, BUILD / PIVOT / DROP in English).
8. Both skills carry an explicit anti-sycophancy rule: the researcher ties every concern and every positive claim to a cited research finding, and the entry skill never compliments or endorses the idea during the interview.
9. The entry skill's intake asks for acceptable maintenance hours per month and the target supplementary income, and the validator capture format carries both as headings; both inputs feed the scoring, not just narrative: autopilot operability is scored against the user's stated acceptable hours (an estimated maintenance load clearly above that budget yields a gate-breaking score), and the monetization vs CAC dimension assesses whether the researched niche can plausibly deliver the stated income target on autopilot.
10. The entry skill's restate-and-confirm step states the side-income autopilot premise before dispatch, so a user whose ambition is venture-scale learns what lens the verdict uses and can stop or reframe there; the council capture's `# Question` frames the decision around the same premise while still never stating the researcher's verdict.
11. The validator's frontmatter `description:` keeps the existing broad idea-validation triggers and do-not-use exclusions (it remains the plugin's only validator), adds side-income phrasing triggers (side project, passive income, product alongside a day job, "dodatkowe źródło dochodu"), and states the side-income autopilot profile so routing conveys what the verdict means; the validator paragraphs in `superbiz/CLAUDE.md`, root `CLAUDE.md`, and `README.md` describe the same profile - with the edited sentences no longer claiming the researcher or chairman is "an opus fork".
12. The chain mechanics are unchanged: same capture paths and `capture:` labeled-line dispatch, mandatory council round after a successful report, roadmap offer as the final step, and artifacts still at `docs/business/<idea-slug>/`.
