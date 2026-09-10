
## Task 2 - refactor(superbuild): dispatch the task reviewer agent at the task's model and effort
- Covers: criteria #4, #5
- TDD: none
- Model: sonnet
- Effort: medium

### Dependencies
- Task 1 - blocks: the `subagent_type` the orchestrator names must exist in `agents[]` first

### Files
- modify - superdev/skills/superbuild/SKILL.md (frontmatter `description:`; Step 2 `### Loop` item 3 and its `VERDICT: FAIL` branch)

### Test Commands
#### Build
- `node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))"` - exits 0 (no JSON touched by this task; guards the repo stays consistent)

#### Tests
- `! grep -q 'superbuild-task-reviewer. (Skill)' superdev/skills/superbuild/SKILL.md && echo NO_SKILL_CALL` - prints `NO_SKILL_CALL`
- `grep -c 'subagent_type: superdev:superbuild-task-reviewer' superdev/skills/superbuild/SKILL.md` - prints `1`
- `grep -q 'never re-dispatch the implementor' superdev/skills/superbuild/SKILL.md && echo ESCALATION` - prints `ESCALATION` (the reviewer `REASON:` branch exists)
- `grep -q 'reviewer agent' superdev/skills/superbuild/SKILL.md && echo DESC` - prints `DESC` (frontmatter description names the reviewer agent)
- `grep -c 'subagent_type: superdev:superbuild-task-implementor' superdev/skills/superbuild/SKILL.md` - prints `1` (the implementor dispatch is untouched)

### Approach
1. Frontmatter `description:`: replace "gates every task through a reviewer and a commit" with "gates every task through the superbuild-task-reviewer agent, dispatched at that same Model and Effort, and a commit".
2. Step 2 `### Loop` item 3: rewrite as "Dispatch the reviewer: `Agent` with `subagent_type: superdev:superbuild-task-reviewer`, the same `model:` / `effort:` as in step 2 for this task (omit a parameter whose column is `-`), and a labeled-line prompt - `plan-header: <path>`, `task: <task-file path>`, `notes: <workdir>/implementation/task-NN-notes.md`, and `report: <workdir>/implementation/task-NN-review-R.md` on separate lines (R = review round for this task, starting `1`, +1 on each reviewer dispatch). Await it. It returns `VERDICT: PASS`, `VERDICT: FAIL` + `REVIEW: <path>`, or `VERDICT: FAIL` + `REASON: <line>`."
3. Item 3 branches: keep `VERDICT: PASS -> continue to commit`; keep the `VERDICT: FAIL` + `REVIEW:` branch as is but end it with "then dispatch the reviewer again the same way with the next `R`"; add a third branch "`VERDICT: FAIL` + `REASON:` (no `REVIEW:` line) -> a missing reviewer input is an orchestration fault, not the implementor's: escalate via `AskUserQuestion` (retry / abort) and never re-dispatch the implementor for it; `retry` re-dispatches the reviewer with the same `R` (no report was written) and does not count as a review round"; keep the "Max 3 review rounds per task" line.
4. Leave Step 3 (final review) and every implementor dispatch untouched.

### Edge cases
- The reviewer's `REASON:` branch does not count toward the 3-round cap - it is an escalation, not a review round.
- `model:` / `effort:` for the reviewer are copied from the task's index columns, never from the reviewer's own frontmatter, so a task with `-` columns lets both agents fall back to their own frontmatter (`opus` / `high` on both).

### Contracts
- Consumes Task 1's prompt and return contract; the labeled prompt lines are unchanged from the current `Skill` `args` block (`plan-header`, `task`, `notes`, `report`).

### DoD
`superdev/skills/superbuild/SKILL.md` dispatches the reviewer via `Agent` at the task's strength on both review sites, defines the `REASON:` escalation, names the reviewer agent in its `description:`, and every Test Command above prints its expected output.


### Covered criteria
4. In `superdev/skills/superbuild/SKILL.md` Step 2 item 3 dispatches the reviewer with `Agent`, `subagent_type: superdev:superbuild-task-reviewer`, `model:` / `effort:` equal to this task's step 2 values (parameter omitted when the column is `-`), and a labeled-line prompt (`plan-header`, `task`, `notes`, `report`); the re-review after a `FAIL` says it re-dispatches the reviewer the same way with the next `R`; the string "`superbuild-task-reviewer` (Skill)" no longer appears in the file.
5. `superdev/skills/superbuild/SKILL.md` Step 2 item 3 states that a reviewer `VERDICT: FAIL` carrying `REASON:` instead of `REVIEW:` escalates via `AskUserQuestion` (retry / abort) and never re-dispatches the implementor; the frontmatter `description:` names the reviewer agent dispatched at the task's Model and Effort.
