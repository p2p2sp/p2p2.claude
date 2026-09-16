
## Task 3 - Write plan references by title and add checklist class B15
- Covers: `Titled plan references` (#4)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- `Add the naming contract and titled finding shapes to review-contract` (Task 1) - blocks: the reference form
- `Give acceptance criteria a short name in the spec template and checklist` (Task 2) - blocks: the criterion title `Covers:` cites

### Files
- modify - superdev/references/plan-review-checklist.md (`## Evidence rule`, `## Blocking classes`, `## Advisory (NOTES)`, `## Author self-check`)
- modify - superdev/skills/superplan/templates/plan.md (`Covers:`, `### Dependencies`, `### Contracts` placeholder)
- modify - superdev/skills/simpleplan/templates/plan.md (`Covers:`, `### Dependencies`, `### Contracts` placeholder)
- modify - superdev/skills/superplan/SKILL.md (the `consumed by Task <N>` rule, the `B1-B14` self-review line)
- modify - superdev/skills/simpleplan/SKILL.md (the `consumed by Task <N>` rule, the `B1-B14` self-review line)
- modify - superdev/skills/superplan-reviewer/SKILL.md (`B1-B14` bucket text, `FINDINGS:` output line)
- modify - superdev/skills/simpleplan-reviewer/SKILL.md (`B1-B14` bucket text, `FINDINGS:` output line)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan

#### Tests
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superplan-reviewer
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simpleplan-reviewer
- node --test tests/superdev/decompose.test.ts tests/superdev/review-plan.test.ts

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for the edits.
2. In `superdev/references/plan-review-checklist.md` add `B15 - Reference with a bare number: a Covers:, ### Dependencies or consumed by entry that names a criterion or task by number alone, or whose title differs from the heading or criterion line it points at; settled by reading the entry against the plan's task headings and the criteria source. A legacy criteria source with no short names is cited by the first clause of the criterion, per the contract's ## Naming.` Replace every `B1-B14` range with `B1-B15` in `## Evidence rule` and in `## Advisory (NOTES)`; add one Author self-check bullet for it.
3. In both plan templates: `- Covers: `<criterion short name>` (#<n>)[, ...]`; Dependencies bullet `` - `<task title>` (Task <N>) - blocks: <…> ``; the Contracts placeholder's `consumed by Task <N>` becomes `` consumed by `<task title>` (Task <N>) ``.
4. In `superplan/SKILL.md` and `simpleplan/SKILL.md`: the `consumed by` rule takes the new form, the self-review line says `B1-B15`, and one sentence under `### Rules` says every reference to a criterion or task in the plan is written as `` `<title>` (<pointer>) `` per the contract's `## Naming`.
5. In both plan reviewers: `B1-B14` becomes `B1-B15` and the `FINDINGS:` output line reads "one line each - checklist class name and ID, e.g. `` `Leftover placeholder` (B5) ``, where it is, what's wrong, how to fix".

### Failure modes
- when input is invalid (a `Covers:` title containing `#` followed by digits) -> response: B15 flags it, since `decompose.sh` reads every `#<n>` token of the line as a criterion number, log: the FINDINGS line, test: none - rubric text.

### Contracts
- `Covers:` line grammar `` `<title>` (#<n>) `` - the `#<n>` tokens stay the only thing `decompose.sh` parses; consumed by Task 8.

### DoD
Templates, both planner skills, both plan reviewers and the checklist carry the form and class B15; every lint run prints `FAIL=0`; both named test files are green.


### Covered criteria
4. Titled plan references - both plan templates write `Covers:`, `### Dependencies` and `consumed by` entries as `` `<title>` (#<n>) `` / `` `<title>` (Task <N>) ``, the plan checklist has blocking class B15 for a plan reference with a bare number, and both plan reviewers report a class by its checklist name plus ID.
