
## Task 1 - feat(superbiz): route the validator verdict through a mandatory council round
- Covers: criteria #1, #2, #3, #4
- TDD: none

### Dependencies
- none

### Files
- modify - superbiz/skills/business-idea-validator/SKILL.md (Workflow steps 7-10, new `## Council capture file format` section, closing artifact line, intro paragraph)
- modify - superbiz/skills/council-this-chairman/SKILL.md (frontmatter `description:` only)

### Test Commands
#### Build
- none

#### Tests
- `grep -l 'capture: .temp/superbiz/council/capture-<RUN_ID>.md' superbiz/skills/business-idea-validator/SKILL.md` - expected output: the file path
- `grep -l '## Council capture file format' superbiz/skills/business-idea-validator/SKILL.md` - expected output: the file path
- `grep -c 'FIRST-STEP' superbiz/skills/business-idea-validator/SKILL.md` - expected: >= 1
- `grep -l 'Invoked only by the council-this and business-idea-validator skills, never directly.' superbiz/skills/council-this-chairman/SKILL.md` - expected output: the file path
- `grep -RE '—|–|✅|⚠️|❌' superbiz/skills/business-idea-validator/ superbiz/skills/council-this-chairman/; test $? -eq 1` - expected: exit 0

### Approach
1. In `superbiz/skills/business-idea-validator/SKILL.md`, extend the intro paragraph's last sentence: the skill hands one capture file to the researcher fork, then convenes the council on the finished report through the `council-this-chairman` fork.
2. Rewrite Workflow steps 7-8 into steps 7-10:
   - Step 7 "Council capture": the researcher fork returns exactly one line `REPORT: <path> | VERDICT: <GO|PIVOT|NO-GO> | <one-sentence reason>`; write `.temp/superbiz/council/capture-<RUN_ID>.md` (same `<RUN_ID>`) in the council capture format below - `# Question` framed neutrally from the restated idea as "should the user build this idea, and if so in what shape", never mentioning the researcher's verdict (the report as context carries it; the council must not be steered); `# Slug` = the same `<idea-slug>`; `# Language` = same as the validator capture; `# Context files` = one line: the REPORT path - the researched validation report; `# Constraints` = the resources from intake; `# Extra context` = anything else the user settled (or "none").
   - Step 8 "Council dispatch": invoke `council-this-chairman` (Skill) with a labeled-line args block `capture: .temp/superbiz/council/capture-<RUN_ID>.md`; the fork returns exactly one line `COUNCIL: <path> | RECOMMENDATION: <one sentence> | FIRST-STEP: <one concrete action>`.
   - Step 9 "Relay": summarize BOTH tagged lines in 4-6 sentences - the researcher's verdict with its reason, then the council's recommendation and first step; when the two disagree, name the clash explicitly, never smooth it into consensus; the user should not have to open either file; do not re-verify or rewrite either artifact.
   - Step 10 "Offer the roadmap chain": keep the current step 8 content verbatim (AskUserQuestion, on yes invoke `product-phase-roadmap` with `report: <the REPORT path>`, on no end).
3. Add a `## Council capture file format` section after the existing `## Capture file format`, with a fenced block holding the six sections `# Question`, `# Slug`, `# Language`, `# Context files`, `# Constraints`, `# Extra context` and the same one-line placeholder style as the existing block.
4. Extend the closing line: the report lands at `docs/business/<idea-slug>/walidacja.md` (`validation.md` in English) and the council verdict at `docs/business/<idea-slug>/rada.md` (`council.md` in English) - both written by the forks, never by this skill. Leave the frontmatter (description, allowed-tools) untouched - `Skill` is already allowed and the routing triggers do not change.
5. In `superbiz/skills/council-this-chairman/SKILL.md`, change only the frontmatter `description:` to "Invoked only by the council-this and business-idea-validator skills, never directly." - no body change (the fork's body is input-driven and caller-agnostic).

### Edge cases
- Chairman returns `ERROR: capture unreadable at <path>` or fails: the relay step must say the council round failed and still deliver the researcher's result - never fabricate a council verdict, never retry in a loop (add this as one line in step 9).
- Researcher returns its own `ERROR:` line: no council capture, no dispatch - the existing failure behavior (relay the error) stands; the council round only runs on a real `REPORT:` line.

### Contracts
- Council capture sections: `# Question`, `# Slug`, `# Language`, `# Context files`, `# Constraints`, `# Extra context` - identical to the chairman's input contract, unchanged on the chairman side.
- Dispatch args block: `capture: .temp/superbiz/council/capture-<RUN_ID>.md`.
- Consumed fork lines: `REPORT: <path> | VERDICT: <GO|PIVOT|NO-GO> | <reason>` and `COUNCIL: <path> | RECOMMENDATION: <one sentence> | FIRST-STEP: <one concrete action>`.

### DoD
Both SKILL.md files carry the changes above, all test commands pass, and `superbiz/skills/council-this-chairman/SKILL.md` differs from HEAD only in its `description:` line.


### Covered criteria
1. `superbiz/skills/business-idea-validator/SKILL.md` workflow contains, after the researcher's `REPORT:` line is received, a council-capture step that writes `.temp/superbiz/council/capture-<RUN_ID>.md` (same `<RUN_ID>`) with: a neutral `# Question` derived from the restated idea ("should the user build this idea, and if so in what shape") that never states the researcher's verdict; `# Slug` equal to the same `<idea-slug>`; `# Language` unchanged from the validator capture; `# Context files` carrying the REPORT path; `# Constraints` carrying the resources from intake; `# Extra context`.
2. That workflow then dispatches `council-this-chairman` via the Skill tool with the labeled-line args block `capture: .temp/superbiz/council/capture-<RUN_ID>.md`, and the SKILL.md carries a `## Council capture file format` fenced block with exactly the six sections `# Question`, `# Slug`, `# Language`, `# Context files`, `# Constraints`, `# Extra context`.
3. The relay step summarizes both tagged lines (`REPORT: … | VERDICT: …` and `COUNCIL: … | RECOMMENDATION: … | FIRST-STEP: …`) in one 4-6 sentence answer, explicitly instructs naming a researcher-vs-council disagreement instead of smoothing it, handles a chairman `ERROR:` line by relaying the researcher's result and stating the council round failed (never fabricating a council verdict), and keeps the roadmap offer as the final step with unchanged content.
4. `superbiz/skills/council-this-chairman/SKILL.md` frontmatter `description:` reads "Invoked only by the council-this and business-idea-validator skills, never directly." and nothing else in that file changes.
