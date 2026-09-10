
## Task 3 - docs(superdev): document the task reviewer agent in README and CLAUDE.md
- Covers: criteria #6, #7
- TDD: none
- Model: sonnet
- Effort: medium

### Dependencies
- Task 2 - blocks: the documented dispatch must match the orchestrator text

### Files
- modify - superdev/README.md (flow step 5 paragraph; Super track table row `superbuild-task-reviewer`)
- modify - CLAUDE.md (superdev overview paragraph, `superdev/` line of the directory map, Self-documentation invariant `agents[]` enumeration)

### Test Commands
#### Build
- `node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))"` - exits 0 (no JSON touched by this task; guards the repo stays consistent)

#### Tests
- `grep -c 'superdev:superbuild-task-reviewer' superdev/README.md` - prints `1`
- `! grep -q '^| `superbuild-task-reviewer` |' superdev/README.md && echo NO_FORK_ROW` - prints `NO_FORK_ROW`
- `grep -q 'one task reviewer' CLAUDE.md && echo MAP` - prints `MAP`
- `grep -c 'superbuild-task-reviewer' CLAUDE.md` - prints a number `>= 1`
- `node --test --test-concurrency=4 "tests/**/*.test.ts"` - all tests pass (proves the docs-only change left every script suite green)

### Approach
Every anchor phrase quoted below spans a hard line-wrap in the repo (`superdev/README.md` lines 45-46, `CLAUDE.md` lines 60-61, 155-156 and 315-316): match it across the wrap, then re-wrap the edited paragraph at the file's existing ~100-column width, keeping the phrase `one task reviewer` unbroken on one line.
1. `superdev/README.md` flow step 5: after "runs an implementor agent per task at the model and effort the plan assigned to that task (`Model:` / `Effort:` markers)" add ", on the Super track gates each task with a reviewer agent dispatched at that same strength".
2. `superdev/README.md` Super track table: replace the row keyed `` `superbuild-task-reviewer` `` with `` | `superdev:superbuild-task-reviewer` | Agent - reviews every single task; `FAIL` sends the implementor back (max 3 rounds per task); dispatched with the `Agent` tool at the task's `Model:` / `Effort:`, the same values as the implementor (frontmatter default `opus` / `high`). | ``.
3. `CLAUDE.md` superdev overview: change "the build orchestrator dispatches the implementor agent at exactly those values" to "the build orchestrator dispatches the implementor agent - and, on the Super track, the per-task reviewer agent - at exactly those values".
4. `CLAUDE.md` directory map `superdev/` line: change "carries agents/ for its two task implementors and four closeout writers" to "carries agents/ for its two task implementors, one task reviewer and four closeout writers".
5. `CLAUDE.md` Self-documentation invariant: after the implementors clause "(the `Agent` tool's per-call `model` is honored; ... fallback for both)" insert ", superdev's per-task reviewer - `superbuild-task-reviewer` - lives there too, dispatched by `superbuild` after each implementor run at that task's same `Model:` / `Effort:`" before ", and superdev's four closeout writers".

### Edge cases
- none

### Contracts
- none

### DoD
Both documents describe the reviewer as an agent dispatched at the task's strength, no stale "Fork" row remains for it, and every Test Command above prints its expected output.


### Covered criteria
6. `superdev/README.md` Super track table keys the row as `superdev:superbuild-task-reviewer` with an `Agent - ...` role naming the `Agent` tool dispatch at the task's `Model:` / `Effort:` and the `opus` / `high` frontmatter default; flow step 5 mentions the per-task reviewer agent running at the same strength as the implementor on the Super track.
7. Root `CLAUDE.md` directory map describes `superdev/agents/` as holding two task implementors, one task reviewer and four closeout writers; the Self-documentation invariant's `agents[]` enumeration names `superbuild-task-reviewer` as dispatched by `superbuild` at the task's `Model:` / `Effort:`; the superdev overview sentence about `decompose.sh` columns says the orchestrator dispatches both the implementor agent and (on the Super track) the task reviewer agent at those values.
