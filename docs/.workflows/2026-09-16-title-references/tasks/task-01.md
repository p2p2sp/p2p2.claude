
## Task 1 - Add the naming contract and titled finding shapes to review-contract
- Covers: `Naming contract` (#1), `Titled findings` (#2)
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none

### Files
- modify - superdev/references/review-contract.md (`## Finding IDs`, `## Report skeleton`, `## Debt file`, `## Decisions file`, new `## Naming`)
- modify - superdev/agents/superbuild-task-reviewer.md (`## Output format` finding bullet shape)
- modify - superdev/skills/superbuild-reviewer-spec/SKILL.md (`## Report` coverage line, `## Calibration` needs-decision bullet)
- modify - superdev/skills/simplebuild-reviewer/SKILL.md (needs-decision bullet)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-reviewer.md

#### Tests
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild-reviewer-spec
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild-reviewer
- node --test "tests/**/*.test.ts"

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below; it owns the editing discipline for skill, agent and reference files.
2. In `superdev/references/review-contract.md` add a `## Naming` section after `## Labels`: (a) every item a human is pointed at has a title and a pointer - decision = the question of its `### <n>.` heading, phase = its `### NN.` heading title, task = the title of `## Task <N> - <title>`, acceptance criterion = the `<short name>` of `<n>. <short name> - <condition>`, finding = the `<title>` of its report bullet, checklist class or rule = the name after `B<n> -` / `R<n> -`; (b) the reference form, identical in chat and in files: `` `<title>` (<pointer>) `` with pointers `decision 3`, `phase 01`, `Task 3`, `criterion 3`, `C2`, `B3`, and `#3` inside a `Covers:` line; a bare pointer never appears in anything a human reads, while headings keep their own form; (c) title rules: a few words, no `#`, no backticks inside, unchanged for the item's life; (d) legacy fallback: an item written before this contract with no title is cited by the first clause of its own text - for a finding bullet that is its "what is wrong" clause, never the `file:line`; (e) machine contracts untouched: `Covers:` is parsed for `#<n>` tokens, `task: NN`, `tasks/task-NN.md`, `phases/NN-<slug>` and finding-ID stability stay as they are.
3. Update `## Finding IDs` (a title is assigned with the ID and kept across rounds), `## Report skeleton` (finding bullet `- <ID> - <title> - file:line - what is wrong - why it matters - how to fix`; prior-findings table `| ID | Title | Verdict | Evidence |`; a `### Needs decision` bullet names its finding as `` `<title>` (<ID>) `` and its criterion or task in the reference form), `## Debt file` (`- <ID> - <title> - <round report basename> - file:line - <what>`) and `## Decisions file` (the `<criterion or task>` field is written in the reference form; the line shape itself is unchanged).
4. Mirror the finding bullet shape with the title in `superdev/agents/superbuild-task-reviewer.md`, as the contract's opening paragraph requires; change the coverage line of `superdev/skills/superbuild-reviewer-spec/SKILL.md` to `` `<title>` (#N) - met | not met | partial | blocked - evidence ``; make the needs-decision sentences of that file and of `superdev/skills/simplebuild-reviewer/SKILL.md` say the bullet names the finding and the criterion in the contract's reference form.

### Failure modes
- when input is invalid (a prior report whose findings carry no title) -> response: the reviewer treats it like a prior report without IDs - the contract's existing rule - and cites the finding's "what is wrong" clause as its title in the verdict table, log: one line in the report's `## Notes`, test: none - contract text, covered by the reviewer reading the contract.

### Contracts
- `## Naming` section of `superdev/references/review-contract.md` - the reference form `` `<title>` (<pointer>) `` and the per-kind title sources; consumed by Task 2, Task 3, Task 5, Task 6, Task 7, Task 9.
- Finding bullet `- <ID> - <title> - file:line - what is wrong - why it matters - how to fix` and the `Title` column of the prior-findings table - read by the fix-mode implementors (their work list stays keyed on the ID); consumed by Task 7.

### DoD
The contract has the `## Naming` section and the titled shapes; the task reviewer, spec reviewer and simplebuild reviewer carry the mirrored shapes; every lint run prints `FAIL=0`; the test suite is green.


### Covered criteria
1. Naming contract - `superdev/references/review-contract.md` has a `## Naming` section that defines the reference form `` `<title>` (<pointer>) ``, where each item kind takes its title from, the title rules (a few words, no `#`, no backticks, stable for the item's life), and the fallback for a legacy item with no title (cite its first clause verbatim).
2. Titled findings - the contract's report skeleton, the task reviewer's inline copy and the debt-file line carry a short title after the finding ID (`- <ID> - <title> - file:line - ...`), the prior-findings table has a `Title` column, and the spec reviewer's coverage line reads `` `<title>` (#N) - met | ... ``.
