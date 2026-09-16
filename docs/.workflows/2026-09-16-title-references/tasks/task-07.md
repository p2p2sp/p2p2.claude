
## Task 7 - Name tasks and findings by title in the build orchestrators
- Covers: `Titled build escalations` (#8)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- `Add the naming contract and titled finding shapes to review-contract` (Task 1) - blocks: the titled finding bullet the orchestrator reads

### Files
- modify - superdev/skills/superbuild/SKILL.md (`## Harness pre-check` state line, `### Loop` steps 2-3, `### Fix loop` BLOCKED and FAIL branches)
- modify - superdev/skills/simplebuild/SKILL.md (`## Harness pre-check` state line, `### Loop` step 2, `### Fix loop` BLOCKED and FAIL branches)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild

#### Tests
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild
- node --test tests/superdev/record-decision.test.ts tests/superdev/status-update.test.ts

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for the edits.
2. Add one sentence under `## Mandatory rules` of each orchestrator: every task, criterion or finding named to the user is written as `` `<title>` (<pointer>) `` per the contract's `## Naming` - the task title from the decompose index's title column, the finding title from the report bullet.
3. State line: `` last completed task `<title from the index>` (Task NN) ``. Loop escalations (implementor FAIL, reviewer FAIL after three rounds, missing reviewer input): the `AskUserQuestion` text names the task in that form.
4. Fix loop: the BLOCKED branch's per-bullet question names the finding as `` `<title>` (<ID>) `` and passes `record-decision.sh`'s `<criterion or task>` argument in the reference form; the post-re-review question lists each still-open finding as `` `<title>` (<ID>) `` instead of the bare IDs.

### Failure modes
- when input is invalid (a report bullet with no title - written by a reviewer from before Task 1) -> response: the orchestrator names the finding by its "what is wrong" clause plus the ID, log: none, test: none - skill prose.

### Contracts
- none

### DoD
Both orchestrators carry the rule and the titled escalations; both lint runs print `FAIL=0`; the named test files are green.


### Covered criteria
8. Titled build escalations - `superbuild` and `simplebuild` name a task by `` `<title>` (Task NN) `` in every escalation and in the harness-failure state line, list still-open findings as `` `<title>` (<ID>) `` in the post-re-review question, and pass the criterion or task to `record-decision.sh` in the reference form.
