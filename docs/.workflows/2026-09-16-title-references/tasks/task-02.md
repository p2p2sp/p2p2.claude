
## Task 2 - Give acceptance criteria a short name in the spec template and checklist
- Covers: `Titled criteria` (#3)
- TDD: none
- Model: opus
- Effort: medium

### Dependencies
- `Add the naming contract and titled finding shapes to review-contract` (Task 1) - blocks: the criterion title rule this task applies

### Files
- modify - superdev/skills/superspec/templates/spec.md (`## Acceptance criteria` example lines)
- modify - superdev/skills/superspec/references/checklist.md (Blocking list)
- modify - superdev/skills/superspec/SKILL.md (the "Acceptance criteria =" bullet)
- modify - superdev/skills/simpleplan/templates/plan.md (`## Acceptance criteria` in the header)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superspec

#### Tests
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan
- node --test tests/superdev/decompose.test.ts

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for the edits.
2. In `superdev/skills/superspec/templates/spec.md` rewrite the four example criteria as `<n>. <short name> - <condition>` (e.g. `1. Add a task - A signed-in user can add a task with a title and an optional due date.`) and state in the placeholder line that the short name is the criterion's title, a few words, no `#`.
3. In `superdev/skills/superspec/references/checklist.md` add one Blocking item: an acceptance criterion with no short name before its ` - ` separator, or a short name containing `#`.
4. In `superdev/skills/superspec/SKILL.md` extend the "Acceptance criteria =" bullet with the short-name form and one example.
5. In `superdev/skills/simpleplan/templates/plan.md` change the header's `## Acceptance criteria` placeholder to `1. <short name> - <numbered, testable, observable true/false condition>`.

### Failure modes
- none - templates.

### Contracts
- Criterion line shape `<n>. <short name> - <condition>` - the whole line is still what `decompose.sh`'s `criterion_of` copies verbatim into `### Covered criteria`; consumed by Task 3, Task 8.

### DoD
Both templates and the spec checklist carry the short-name form; the two lint runs print `FAIL=0`; `decompose.test.ts` is green.


### Covered criteria
3. Titled criteria - the spec template and the simpleplan plan template write each acceptance criterion as `<n>. <short name> - <condition>`, and the superspec checklist blocks a criterion with no short name.
