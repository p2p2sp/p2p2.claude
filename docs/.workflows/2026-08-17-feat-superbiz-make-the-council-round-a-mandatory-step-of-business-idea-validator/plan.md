# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "feat(superbiz): make the council round a mandatory step of business-idea-validator"

---
<!-- HEADER -->

## Goal
`business-idea-validator` always pressure-tests the finished validation report through the council: after the researcher fork returns its `REPORT:` line, the validator writes a second capture in the council format and dispatches the existing `council-this-chairman` fork with the report as context file, then relays BOTH tagged lines to the user - surfacing any researcher-vs-council clash - before the unchanged roadmap offer. The chairman's caller guard names both entry skills, and both CLAUDE.md files document the new in-plugin chain.

## Context
Today the validator's single researcher fork gathers the data AND grades its own analysis (GO/PIVOT/NO-GO) - one model, one angle, single-analyst bias. superbiz already ships the fix as a mechanism: `council-this-chairman` convenes five persona agents in parallel and synthesizes a verdict, grounded by context files. Reusing that fork after the research keeps analyst work (frameworks, matrices, sourced report) with the researcher and hands judgment to five independent angles plus a chairman synthesis. The council round is mandatory (user decision - no opt-in), dispatched directly to the chairman fork (the validator is itself the entry with everything resolved, so the interactive `council-this` entry would only duplicate intake). No new skills, no agent changes, no plugin.json changes.

## Acceptance criteria
1. `superbiz/skills/business-idea-validator/SKILL.md` workflow contains, after the researcher's `REPORT:` line is received, a council-capture step that writes `.temp/superbiz/council/capture-<RUN_ID>.md` (same `<RUN_ID>`) with: a neutral `# Question` derived from the restated idea ("should the user build this idea, and if so in what shape") that never states the researcher's verdict; `# Slug` equal to the same `<idea-slug>`; `# Language` unchanged from the validator capture; `# Context files` carrying the REPORT path; `# Constraints` carrying the resources from intake; `# Extra context`.
2. That workflow then dispatches `council-this-chairman` via the Skill tool with the labeled-line args block `capture: .temp/superbiz/council/capture-<RUN_ID>.md`, and the SKILL.md carries a `## Council capture file format` fenced block with exactly the six sections `# Question`, `# Slug`, `# Language`, `# Context files`, `# Constraints`, `# Extra context`.
3. The relay step summarizes both tagged lines (`REPORT: … | VERDICT: …` and `COUNCIL: … | RECOMMENDATION: … | FIRST-STEP: …`) in one 4-6 sentence answer, explicitly instructs naming a researcher-vs-council disagreement instead of smoothing it, handles a chairman `ERROR:` line by relaying the researcher's result and stating the council round failed (never fabricating a council verdict), and keeps the roadmap offer as the final step with unchanged content.
4. `superbiz/skills/council-this-chairman/SKILL.md` frontmatter `description:` reads "Invoked only by the council-this and business-idea-validator skills, never directly." and nothing else in that file changes.
5. `superbiz/CLAUDE.md` documents the chain: the validator bullet describes the mandatory council round (second capture + chairman dispatch on the finished report, combined relay), the chairman bullet says dispatched only by `council-this` and `business-idea-validator`, and the closing chain paragraph states the validator chains in-plugin into `council-this-chairman` while the `council-this` entry itself is not chained from either.
6. Root `CLAUDE.md` superbiz bullet mentions the validator's mandatory council round via `council-this-chairman`; `superbiz/.claude-plugin/plugin.json` is byte-identical to before the change.

<!-- /HEADER -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - docs(superbiz): document the validator-to-chairman council chain
- Covers: criteria #5, #6
- TDD: none

### Dependencies
- Task 1 - blocks: this task (docs describe the changed behavior)

### Files
- modify - superbiz/CLAUDE.md (layout comment, validator bullet, chairman bullet, closing chain paragraph)
- modify - CLAUDE.md (superbiz bullet in "What this repo is")

### Test Commands
#### Build
- none

#### Tests
- `grep -l 'dispatched only by .council-this. and .business-idea-validator.' superbiz/CLAUDE.md` - expected output: the file path
- `grep -c 'council round' superbiz/CLAUDE.md` - expected: >= 1
- `grep -c 'council round' CLAUDE.md` - expected: >= 1
- `grep -RE '—|–|✅|⚠️|❌' superbiz/CLAUDE.md CLAUDE.md; test $? -eq 1` - expected: exit 0

### Approach
1. In `superbiz/CLAUDE.md`: update the layout comment for `business-idea-validator/` to "Entry - interactive intake, dispatches the researcher then the chairman fork"; extend the `business-idea-validator` skill bullet - after the researcher returns the report, the entry writes a council capture to `.temp/superbiz/council/capture-<RUN_ID>.md` and dispatches `council-this-chairman` on the finished report (a mandatory council round), then relays both tagged lines, surfacing any researcher-vs-council clash, before offering the roadmap chain.
2. In the same file: change the `council-this-chairman` bullet's parenthetical to "dispatched only by `council-this` and `business-idea-validator`, never directly".
3. In the same file: rewrite the closing paragraph - superbiz still declares no cross-plugin chains; in-plugin, the validator chains into `product-phase-roadmap` (offered) and into `council-this-chairman` (mandatory council round on the finished report); the `council-this` entry itself is not chained from either.
3a. In the same file: adjust the paragraph after the skills list ("All three entries ... all three forks carry ... a 'invoked only by the entry skill, never directly' description guard") so the guard clause covers the chairman's two callers - e.g. "a description guard naming its allowed caller(s), never directly".
4. In root `CLAUDE.md`, superbiz bullet: extend the `business-idea-validator` sentence with one clause - after the report is written, it mandatorily convenes the council on it via `council-this-chairman` (a mandatory council round writing `rada.md` next to the report). Touch nothing else in the root file; `superbiz/.claude-plugin/plugin.json` stays untouched.

### Edge cases
none

### Contracts
none

### DoD
Both CLAUDE.md files describe the mandatory council round and the widened chairman guard, all test commands pass, and `git status` shows no change to `superbiz/.claude-plugin/plugin.json`.

<!-- /TASK -->
