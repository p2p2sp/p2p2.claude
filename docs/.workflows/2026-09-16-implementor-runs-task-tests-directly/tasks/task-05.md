
## Task 5 - Drop the runner label from both build orchestrators
- TDD: none
- Model: sonnet
- Effort: low
- Covers: `Brak runner` (#4)

### Dependencies
- `Run task tests directly in both task implementors and record runs in the notes` (Task 4) - blocks: the implementor input set without `runner`

### Files
- modify - superdev/skills/superbuild/SKILL.md (`<refs>` derivation line, implementor dispatch lines)
- modify - superdev/skills/simplebuild/SKILL.md (`<refs>` derivation line, implementor dispatch lines)

### Test Commands
#### Build
- node --test "tests/**/*.test.ts"

#### Tests
- ! grep -q 'runner' superdev/skills/superbuild/SKILL.md - exits 0
- ! grep -q 'runner' superdev/skills/simplebuild/SKILL.md - exits 0
- grep -c 'task-implementor.*refs: <refs>' superdev/skills/superbuild/SKILL.md - prints `3`
- grep -c 'task-implementor.*refs: <refs>' superdev/skills/simplebuild/SKILL.md - prints `2`
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/superbuild - exits 0
- bash supercc/skills/skill-designer/scripts/lint_skill.sh superdev/skills/simplebuild - exits 0

### Approach
1. Invoke the `supercc:skill-designer` skill (Skill tool) for every edit below.
2. In both orchestrators, cut the two `<runner>` sentences from the line that derives `<refs>` (the `printf` of `run.sh` and the "an implementor handed no `runner`" sentence), leaving the `<refs>` derivation intact.
3. Remove `runner: <runner>, ` from every implementor dispatch line: the task dispatch and the fix dispatch in both, plus the re-dispatch after a task-reviewer `FAIL` in `superbuild`. The reviewer-fork dispatches and the task-reviewer dispatch stay untouched.

### Failure modes
- none - markdown

### Contracts
- none

### DoD
No `runner` token remains in either orchestrator, every implementor dispatch still carries `refs: <refs>`, the reviewer dispatches are unchanged; the greps and the lint exit as listed; the test suite is green.


### Covered criteria
4. Brak runner - żaden dispatch implementatora w `superbuild` i `simplebuild` (zadanie i fix) nie niesie etykiety `runner:`, orkiestratory nie wyliczają ścieżki `run.sh`, a dispatch reviewerów-forków pozostaje bez zmian.
