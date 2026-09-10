# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "superbuild-task-reviewer as an agent dispatched at the task's build strength"
Intent: docs/.workflows/2026-09-10-task-reviewer-agent/intent.md
Plan: C:\Users\dariu\.claude-p2p2\plans\drifting-moseying-milner.md

---
<!-- HEADER -->

## Goal
`superbuild` reviews every task with an agent, `superdev:superbuild-task-reviewer`, dispatched through the `Agent` tool at the same `model:` / `effort:` the task's implementor received, both on the first review and on every re-review after a `FAIL`. The reviewer lives in `superdev/agents/`, has no `!` preloads, reads its labeled inputs itself, falls back to `opus` / `high` when the index column is `-`, and answers a missing required input with `VERDICT: FAIL` + `REASON: missing input <label>`, which `superbuild` escalates instead of re-dispatching the implementor.

## Context
Commit `01e8a14` moved the two task implementors from `Skill` forks to agents so `superbuild` / `simplebuild` can dispatch them per task at the plan's `Model:` / `Effort:` markers. The per-task reviewer stayed a `Skill` fork with a static `model: sonnet` / `effort: medium`, so a task implemented on `opus` / `xhigh` is gated by sonnet at medium. The `Skill` tool has no `model` / `effort` parameter, so the reviewer must take the same road as the implementors. The `decompose.sh` index already prints the `<model>` / `<effort>` columns; no script or test changes are needed. The repo has no build step and no lint; the deliverables are markdown + JSON, verified with `node` and `grep`.

## Out of scope
- `simplebuild-reviewer`, `superbuild-reviewer-spec`, `superbuild-reviewer-change` stay `Skill` forks with a static model.
- `superdev/scripts/decompose.sh` and every suite under `tests/superdev/`.
- The final-review fix dispatch of the implementor (no `model:` / `effort:` parameters) in `superbuild` Step 3.
- `superdev/hooks/content/manifest.md`.

## Acceptance criteria
1. `superdev/agents/superbuild-task-reviewer.md` exists with frontmatter `name: superbuild-task-reviewer`, a full-sentence `description:` ending with an "invoked only by the superbuild skill through the Agent tool" clause, `tools: Read, Write, Grep, Glob, Bash`, `model: opus`, `effort: high`, and no `context:`, `background:`, `allowed-tools:` or `user-invocable:` keys; `superdev/skills/superbuild-task-reviewer/` no longer exists.
2. The agent body contains no `` !` `` preload; it carries the implementors' `## Input` paragraph (labeled `label: value` lines, read each file-valued label, missing required label or unreadable file -> `VERDICT: FAIL` + `REASON: missing input <label>`, change nothing), lists `plan-header` (required), `task` (required), `notes` (optional, read as the implementor's deviation claims) and `report` (required, the path written on FAIL), instructs running `git status --short` with `Bash` to bound the review to the uncommitted work, and keeps the existing `## Scope`, `## Check`, `## Calibration` and `## Output format` content (`VERDICT: PASS` alone on PASS; `VERDICT: FAIL` + `REVIEW: <report path>` on FAIL, report written only then).
3. `superdev/.claude-plugin/plugin.json` parses as JSON, its `skills[]` has no `superbuild-task-reviewer` entry, and its `agents[]` lists `./agents/superbuild-task-reviewer.md` directly after `./agents/simplebuild-task-implementor.md`; no worker appears in both arrays.
4. In `superdev/skills/superbuild/SKILL.md` Step 2 item 3 dispatches the reviewer with `Agent`, `subagent_type: superdev:superbuild-task-reviewer`, `model:` / `effort:` equal to this task's step 2 values (parameter omitted when the column is `-`), and a labeled-line prompt (`plan-header`, `task`, `notes`, `report`); the re-review after a `FAIL` says it re-dispatches the reviewer the same way with the next `R`; the string "`superbuild-task-reviewer` (Skill)" no longer appears in the file.
5. `superdev/skills/superbuild/SKILL.md` Step 2 item 3 states that a reviewer `VERDICT: FAIL` carrying `REASON:` instead of `REVIEW:` escalates via `AskUserQuestion` (retry / abort) and never re-dispatches the implementor; the frontmatter `description:` names the reviewer agent dispatched at the task's Model and Effort.
6. `superdev/README.md` Super track table keys the row as `superdev:superbuild-task-reviewer` with an `Agent - ...` role naming the `Agent` tool dispatch at the task's `Model:` / `Effort:` and the `opus` / `high` frontmatter default; flow step 5 mentions the per-task reviewer agent running at the same strength as the implementor on the Super track.
7. Root `CLAUDE.md` directory map describes `superdev/agents/` as holding two task implementors, one task reviewer and four closeout writers; the Self-documentation invariant's `agents[]` enumeration names `superbuild-task-reviewer` as dispatched by `superbuild` at the task's `Model:` / `Effort:`; the superdev overview sentence about `decompose.sh` columns says the orchestrator dispatches both the implementor agent and (on the Super track) the task reviewer agent at those values.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - refactor(superbuild-task-reviewer): move from skill to agent with labeled-path input
- Covers: criteria #1, #2, #3
- TDD: none
- Model: opus
- Effort: high

### Dependencies
- none

### Files
- add - superdev/agents/superbuild-task-reviewer.md (agent frontmatter + body; content derived from the current skill)
- delete - superdev/skills/superbuild-task-reviewer/SKILL.md (the whole `superdev/skills/superbuild-task-reviewer/` directory goes with it)
- modify - superdev/.claude-plugin/plugin.json (`skills[]`, `agents[]`)

### Test Commands
#### Build
- `node -e "JSON.parse(require('fs').readFileSync('superdev/.claude-plugin/plugin.json','utf8'))"` - exits 0 (valid JSON)

#### Tests
- `test -f superdev/agents/superbuild-task-reviewer.md && test ! -e superdev/skills/superbuild-task-reviewer && echo MOVED` - prints `MOVED`
- `` ! grep -q -F '!`' superdev/agents/superbuild-task-reviewer.md && echo NO_PRELOAD `` - prints `NO_PRELOAD` (no preload anywhere in the body, inline ones included)
- `grep -c -E '^(tools: Read, Write, Grep, Glob, Bash|model: opus|effort: high|name: superbuild-task-reviewer)$' superdev/agents/superbuild-task-reviewer.md` - prints `4`
- `! grep -q -E '^(context|background|allowed-tools|user-invocable):' superdev/agents/superbuild-task-reviewer.md && echo CLEAN_FM` - prints `CLEAN_FM`
- `grep -c -E 'REASON: missing input <label>|git status --short|VERDICT: PASS|REVIEW: <report path>' superdev/agents/superbuild-task-reviewer.md` - prints a number `>= 4`
- `grep -c 'superbuild-task-reviewer' superdev/.claude-plugin/plugin.json` - prints `1`
- `grep -n -A1 'simplebuild-task-implementor.md' superdev/.claude-plugin/plugin.json | grep -q 'agents/superbuild-task-reviewer.md' && echo ORDERED` - prints `ORDERED`

### Approach
1. Use `git mv superdev/skills/superbuild-task-reviewer/SKILL.md superdev/agents/superbuild-task-reviewer.md`, then remove the now-empty `superdev/skills/superbuild-task-reviewer/` directory.
2. Rewrite the frontmatter to the agent shape of `superdev/agents/superbuild-task-implementor.md`: keep `name: superbuild-task-reviewer`; replace `description:` with one full-sentence description (a fast per-task gate that judges the uncommitted work of one plan task against its task file and the plan header, writes a findings report on FAIL, input is a labeled block of file paths: plan-header, task, optional notes, a report path to write; invoked only by the superbuild skill through the Agent tool, never directly and never on its own initiative); set `tools: Read, Write, Grep, Glob, Bash`, `model: opus`, `effort: high`, `color: purple` (the implementors carry `color: orange` / `color: blue`); drop `context`, `background`, `allowed-tools`, `user-invocable`.
3. Replace the `## Prerequisites` + `## Input` preload block (lines with `` !` `` and the two `<!-- no Bash pattern here ... -->` comments) with a `## Input` section: the verbatim first paragraph of the implementor's `## Input` (labeled `label: value` lines; read each file-valued label now and treat it as the `## <label>` block; a required label absent or file unreadable -> `VERDICT: FAIL` with `REASON: missing input <label>` and change nothing), then a bullet list: `plan-header` (required) - the change's global boundaries; `task` (required) - the task whose implementation is reviewed; `notes` (optional) - when set, Read it as the implementor's recorded plan->code deviations, claims to verify not truth; `report` (required) - the path the findings are WRITTEN to on FAIL, may not exist yet, never read as input.
4. Add a `## Prerequisites` section after `## Input` instructing: run `git status --short` with `Bash` and treat its output as the uncommitted work under review (working tree vs HEAD plus untracked files); read the changed files in full before judging.
5. Keep `## Scope`, `## Check`, `## Calibration` and `## Output format` verbatim except: `## Output format` refers to the `report` label path instead of "the Report path", and gains one bullet: a missing required input -> line 1 `VERDICT: FAIL`, line 2 `REASON: missing input <label>`, no report written.
6. In `superdev/.claude-plugin/plugin.json` delete `"./skills/superbuild-task-reviewer/",` from `skills[]` and insert `"./agents/superbuild-task-reviewer.md",` into `agents[]` directly after `"./agents/simplebuild-task-implementor.md",`.

### Edge cases
- A `notes` path that does not exist is not an error: the label is optional and the reviewer simply has no deviation claims to check.
- The sections the agent body inherits from the skill (`## Scope`, `## Check`, `## Calibration`) stay verbatim - the move changes how inputs arrive, not what is judged.

### Contracts
- Agent prompt contract (labeled lines, all values are paths): `plan-header: <path>` (required), `task: <path>` (required), `notes: <path>` (optional), `report: <path>` (required on FAIL).
- Return contract: `VERDICT: PASS` alone; or `VERDICT: FAIL` + `REVIEW: <report path>` (findings written); or `VERDICT: FAIL` + `REASON: missing input <label>` (nothing written).
- Frontmatter fallback when the orchestrator omits a parameter: `model: opus`, `effort: high`.

### DoD
The agent file exists with the frontmatter and sections above, the old skill directory is gone, `plugin.json` is valid JSON listing the reviewer once under `agents[]`, and every Test Command above prints its expected output.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---
