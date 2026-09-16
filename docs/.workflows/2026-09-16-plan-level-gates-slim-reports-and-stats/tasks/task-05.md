
## Task 5 - Run only the task checks in both task implementors and keep the notes lean
- TDD: none
- Model: opus
- Effort: high
- Covers: `Implementator tylko Task Checks` (#9), `Notes bez duplikatów` (#16)

### Dependencies
- `Move the gate into the plan header and rename the per-task section to Task Checks` (Task 1) - blocks: the section the implementors run
- `Rewrite the review contract for plan-level gates, slim reports and dispatch strength` (Task 4) - blocks: the notes line formats these agents write

### Files
- modify - superdev/agents/superbuild-task-implementor.md (`## Input`, `## 1. Implement`, `## 2. Build + Test`, `## 3. Record notes`)
- modify - superdev/agents/simplebuild-task-implementor.md (`## Input`, `## 1. Implement`, `## 3. Run Build & Tests`, `## 4. Record notes`)

### Test Commands
#### Build
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/superbuild-task-implementor.md - exits 0

#### Tests
- grep -c '### Task Checks' superdev/agents/superbuild-task-implementor.md - prints at least `1`
- grep -c '### Task Checks' superdev/agents/simplebuild-task-implementor.md - prints at least `1`
- ! grep -Eq 'Test Commands|Task Tests|#### Build' superdev/agents/superbuild-task-implementor.md - exits 0
- ! grep -Eq 'Test Commands|Task Tests|#### Build' superdev/agents/simplebuild-task-implementor.md - exits 0
- grep -c '## Runs' superdev/agents/superbuild-task-implementor.md - prints at least `1`
- grep -c '## Runs' superdev/agents/simplebuild-task-implementor.md - prints at least `1`
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/agents/simplebuild-task-implementor.md - exits 0

### Task Tests
- none - agent text only, no test file changes

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below, and apply every step to both agent files - their wording differs only in the step numbering and the reviewer singular/plural.
2. In `## Input`, describe the plan task's shape with `Task Checks` in place of `Test Commands` / `Task Tests`, and narrow the optional `plan` label to what it still sources: the `### Task Checks` lines of other tasks in fix mode.
3. In the build-and-test step, replace the whole command list with the task's `### Task Checks` lines alone - one direct `Bash` call per line, the command verbatim, its output read in place; a section reading `none - <reason>` means nothing runs and the step is green; a line opening with a test file path runs the command after that path's ` - `. State that neither the plan header's own gate block nor the host's integration or e2e command ever runs here - both belong to the build reviewers - and write that sentence without naming any plan section these agents must not reference, so the gate greps above stay green. Keep the command-cannot-start rule, the explicit-timeout rule and the 5-round fix loop unchanged.
4. Rewrite the fix-mode clause of that step: run the `### Task Checks` lines of every plan task in `## plan` whose `### Files` names a path that prefix-matches a file the fix touched, and when no task matches, run nothing - the round's gate belongs to the re-review.
5. In the TDD clause of the implement step, bind VERIFY RED and VERIFY GREEN to the `### Task Checks` line whose path matches the test file the cycle is writing, and make the stop condition that section carrying no such line. In the record-notes step, keep `## Runs` first - one line per command of the last green pass, `none - <reason>` when none ran - and add the lean rule from the contract: notes never restate the task or a report, an `### Approach` step is cited by its number and a finding by its ID, and fix-mode notes carry `## Runs`, one status line per ID and the `touched:` lines and nothing else.

### Failure modes
- none - agent text

### Contracts
- none

### DoD
Both implementors run the task's `### Task Checks` and nothing else, name no removed plan section and no `#### Build` block, carry the fix-mode scope rule with its run-nothing fallback, and carry the lean-notes rule; the greps and the two lints exit as listed.


### Covered criteria
9. Implementator tylko Task Checks - oba implementatory uruchamiają na koniec zadania każdą linię `### Task Checks` (przy `none` nic) jako bezpośrednie wywołania Bash, cykl TDD zadania `TDD: required` biegnie jego jedyną linią z plikiem testowym, tryb fix uruchamia `### Task Checks` zadań, których `### Files` pokrywa plik dotknięty poprawką, a gdy żadne zadanie nie pasuje, nic (gate rundy należy do re-review); żaden z dwóch agentów nie uruchamia bloku z `## Gate commands` ani nie odwołuje się do `#### Build`.
16. Notes bez duplikatów - oba implementatory niosą regułę: notes nigdy nie przepisują treści zadania ani raportu, odwołują się do kroku `Approach` lub findingu numerem / ID, są pisane LLM dla LLM (konkret bez tłumaczeń); notes fix-mode to `## Runs` plus jedna linia statusu per ID i `touched:` linie, nic więcej; `review-contract.md ## Notes line formats` odzwierciedla to samo.
