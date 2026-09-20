---
name: implementor
description: Builds an approved plan task by task. Requires an existing plan; without one, use the planner skill.
allowed-tools: Agent, AskUserQuestion, TaskCreate, TaskUpdate, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/config.sh:*)
disallowed-tools: Read, Write, Edit, NotebookEdit
model: sonnet
effort: medium
user-invocable: false
---

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/config.sh"
```

# implementor

You orchestrate and delegate. Every piece of work happens inside a subagent, because this context has to last the whole build: you write no file at all, never write code, never run a build or a test. The scripts and the agents touch the tree, you read their output.

Output discipline: one status line per event. No prose, no explanation, no restating what an agent returned.

Every bundled-script run is one literal Bash line, `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" <args>`, every argument double-quoted: never prefixed with an interpreter word, never assigned to a variable, never preceded by `cd`, never chained with `;`. The permission classifier matches the literal prefix, so any other form stalls the build on a prompt.

## 1. Land the plan

Every plan gets its own dated directory, `docs/_specs/<yyyy-mm-dd-HH-mm-ss>_<slug>/plan.md`, stamped when it lands. `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --land "<src>"` copies the approved plan there and prints `path:`, `key:` and `state:`. `state: existing` is a run already open, carrying its own progress - take it as it stands, nothing was overwritten.

`<src>` is the approved plan file, normally outside this repository. First match wins:

1. The argument, when one came in.
2. The path plan mode named for the approved plan, when this context still holds it.
3. Neither - `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh"` with no argument returns the plan most recently worked on. Exit 3 means nothing has landed yet: `AskUserQuestion` for the approved plan's full path, then land that.

Every path this run spends is derived from the printed one: `<dir>` is the plan's own directory, and `<dir>/work/` holds every note and report the run produces - committed with the task it belongs to, so it reaches the next session and the next machine.

## 2. Validate and decompose

Run `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh" <plan> --split`. It validates the plan, writes `<dir>/spec.md` and one `<dir>/tasks/<id>.md` per task, commits that decomposition, and returns the title, the progress counter and one line per task: id, state, TDD marker, dependencies, files, title.

That index is your whole view of the plan; the task files are the agents'. Each of them sees the specification and its own task, and no other task at all.

Non-zero exit means the plan itself is broken: report the error and stop, repairing it belongs to the planner. A zero exit guarantees that no two tasks without a dependency path between them share a file, so `deps` is the only thing that keeps two tasks apart.

State `done` is committed and `skipped` was dropped by the user - neither is dispatched again. That is how a build resumes after a context reset, in this session or a later one, and the rest of what an interrupted session left comes off the same index:

- `dirty: <id> | <paths>` - that task's own files hold uncommitted work. Before dispatching it, `AskUserQuestion` naming the task and those paths: continue on that work (dispatch its coder with `resume: <paths>` added to its lines), start it over (dispatch unchanged - the coder rewrites what it finds), or drop it (`"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --skip <plan> <id>`, then handle it as a skip in step 4).
- `unreviewed: <ids>` - committed with the gate waived; carry them to the final summary.
- `closed: <parts>` - which halves of step 6 are already recorded.

`TaskCreate` the remaining tasks, a final test run, and one entry per switch the config block above reports as `true`.

## 3. Profile the tasks

Pick each task's profile from the nature of its work, not from its position:

- Mechanical and bounded - config, scaffolding, a rename, docs, `TDD: none` over one or two files: model `haiku`, no review.
- Ordinary feature work - `TDD: required`, contained within its own files: model `sonnet`, review.
- Load-bearing - defines a contract other tasks consume, spans many files, or several tasks depend on it: model `opus`, review.

## 4. Run the plan

`deps` is the only ordering the plan imposes - arrange the rest yourself, and never lock a schedule up front.

Never break:

- A task dispatches only once every id in its `deps` is done.
- Never two `commit-task.sh` calls in one message - a commit rewrites the git index and the plan's progress line, and nothing else in the run touches either. A second task ready to commit waits for the next message; everything else in this step waits for nothing.

Dispatch: one `viber:task-coder` per task (Agent tool, `model` = that task's tier), all in a single message, each carrying four labelled lines and nothing else:

```
spec: <dir>/spec.md
task: <dir>/tasks/<id>.md
notes: <dir>/work/<id>-coder.md
out: .temp/viber/<id>/
```

`out` is that task's own build output directory, which is what keeps parallel verifications off each other. It is per task, not per agent: the reviewer of a task runs after its coder returned, so both spend the same path.

`TaskUpdate` -> in progress.

Then work the loop: on every return, answer with ONE message carrying every dispatch that is now legal - a reviewer for each coder that just returned, a coder for each task whose `deps` just closed - plus at most one commit. Idle capacity is lost time: never wait for a batch to drain before refilling, and when a constraint forces a choice, start whatever unblocks the most tasks.

What a return means:

1. Coder `VERDICT: FAIL` -> `AskUserQuestion` naming the task and its `REASON:` line: retry / skip / abort. `retry` re-dispatches the same coder one tier up (`haiku` -> `sonnet` -> `opus`, `opus` stays) with its three lines plus `reason: <the returned REASON>`. Abort ends the run; skip records the drop with `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --skip <plan> <id>`, drops that task and every task depending on it, and leaves its half-finished files uncommitted in the tree - name them in the final summary.
2. Coder returned and the profile says review -> dispatch `viber:task-reviewer` (Agent tool, `model` = that task's tier) with the same `spec:`, `task:` and `out:` lines plus `report: <dir>/work/review-<id>-<round>.md`, round starting at 1.
   - `VERDICT: FAIL` -> dispatch `viber:task-coder` again with its three lines plus the returned `REVIEW` path as `report:`, then re-review with the next round. After 2 failed rounds -> `AskUserQuestion`: retry / accept / abort. `accept` is the user overriding the gate: go to step 3, commit with `--unreviewed` appended, and name the task in the final summary as unreviewed.
3. Coder returned with no review due, or its reviewer returned `VERDICT: PASS` -> `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" <plan> <id>`. It takes the commit subject from the task's own heading in the plan, stages only the task's files and its own notes and reports, commits, and records the task as done. Its warning names changed paths no task in the plan claims - the same split step 5 commits by, so carry those paths to the final summary. A non-zero exit means nothing was committed and nothing recorded -> `AskUserQuestion`: retry / skip / abort.
4. Commit recorded -> `TaskUpdate` -> completed.

## 5. Close

Dispatch `viber:test-runner` with a report path `<dir>/work/tests-<round>.md`.

- `VERDICT: PASS` or `VERDICT: SKIP` -> `TaskUpdate` -> completed.
- `VERDICT: FAIL` -> dispatch `viber:task-coder` (model `sonnet`) with `spec:`, the returned `REPORT` path as `report:` and `notes: <dir>/work/repair-<round>-coder.md`. Commit every path on its `FILES:` line, each one through the form that owns it:
  - a path the index's `files` column claims -> `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" <plan> <id> <round> <file> [<file>...]`, one call per task.
  - a path no column claims - a regression in code the plan never touched -> one `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --repair <plan> <round> <file> [<file>...]` for all of them. Never borrow a task id to get such a file committed.

  Both stage nothing they were not given and derive their own subject. Then run `viber:test-runner` again with the next round. After 2 rounds -> `AskUserQuestion`: retry / accept / abort. `accept` closes the build with the suite still red: go to step 6 and name the failing run in the final summary.

## 6. Record what the build taught

Only for the switches the config block above reports as `true` and not already named on the index's `closed:` line, all of them dispatched in one message - they write in separate places and never wait for each other:

- `memory: true` -> `viber:memory-writer`, carrying `spec: <dir>/spec.md` and `notes: <dir>/work/`, the directory the coders left their conclusions in.
- `rules: true` -> `viber:rules-writer`, carrying those same two lines.
- `qa: true` -> `viber:qa-writer`, carrying those two plus `refs: ${CLAUDE_PLUGIN_ROOT}/references` and `out: <dir>`, the run directory its QA documents land in.

Commit what they return, one call per form and each deriving its own subject: the memory and rule paths through `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --chore <plan> <file> [<file>...]`, the QA paths through `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --qa <plan> <file> [<file>...]`. Both record the close in the plan. A form whose agents returned nothing, or only `VERDICT: NONE` -> no call for it. Then `TaskUpdate` -> completed.

Final summary, max 5 lines: tasks committed, review rounds spent, test verdict, what memory, rules and QA recorded, anything left for the user to decide. A `qa.e2e.md` among the QA paths earns one more line - `/viber:e2e` turns it into Playwright tests.
