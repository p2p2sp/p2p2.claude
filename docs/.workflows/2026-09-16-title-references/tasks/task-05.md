
## Task 5 - Name phases by title in the phases skill, template, checklist and reviewer
- Covers: `Titled phases` (#6)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Add the naming contract and titled finding shapes to review-contract` (Task 1) - blocks: the reference form
- `Print the phase title as a third column in phases-status.sh` (Task 4) - blocks: the resume table columns

### Files
- modify - superdev/skills/phases/SKILL.md (`## Fresh` step 3, `## Phase intents` constraint bullet, `## Handoff [GATE]`, `## Resume` steps 2 and 4)
- modify - superdev/skills/phases/references/phases-template.md (`Covers:` and `Depends on:` rules and template lines)
- modify - superdev/skills/phases/references/checklist.md (`### Severity classes`)
- modify - superdev/skills/phases-reviewer/SKILL.md (`R1-R5` bucket text, `FINDINGS:` output line)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/phases

#### Tests
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/phases-reviewer
- node --test tests/superdev/phases-status.test.ts

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for the edits.
2. Template: `` - Covers: `<decision question>` (decision <n>)[, ...] `` and `` - Depends on: `<phase title>` (phase 01) `` | `none`; the content rules say the title is copied from the intent's `### <n>.` heading (the question) or the phase's own `###` heading, and that a decision number stays the master's.
3. Checklist: add `**R6 - reference with a bare number.** A `Covers:` or `Depends on:` entry naming a decision or phase by number alone, or whose title differs from the heading it points at, is Blocking.` and change `R1-R5` to `R1-R6` where the range is named; in `phases-reviewer/SKILL.md` do the same and make the `FINDINGS:` line read "violated rule name and ID, e.g. `` `decision coverage` (R1) ``".
4. Skill: the `## Fresh` proposal lists `Covers` as titled decisions; the `Phase <NN> of` bullet becomes `` `<phase title>` (phase <NN>) of <phases file path> ``; the handoff option label reads `` Start `<phase 01 title>` (phase 01) ``; `## Resume` step 2 relays the three columns (`<dir>`, `<status>`, `<title>`) and step 4's option label reads `` Start `<title>` (phase <NN>) `` from the `next:` line, a `-` title falling back to the dir name.

### Failure modes
- when input is invalid (`phases-status.sh` prints `-` as the title of a legacy phases file) -> response: the gate label uses the phase's dir name in place of the title, log: none, test: none - skill prose.

### Contracts
- none

### DoD
Template, checklist, both skills carry the form and rule R6; both lint runs print `FAIL=0`; `phases-status.test.ts` is green.


### Covered criteria
6. Titled phases - the phases template writes `Covers:` and `Depends on:` in the reference form, the phases checklist has blocking rule R6 for a bare-number reference, the `phases` skill names phases by title in its proposal, handoff and resume gates and in the `Phase <NN> of` constraint bullet, and `phases-reviewer` reports a rule by its name plus ID.
