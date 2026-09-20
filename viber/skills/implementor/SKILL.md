---
name: implementor
description: Builds an approved plan task by task. Requires an existing plan; without one, use the planner skill.
argument-hint: [plan-path]
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

Every path this run spends is derived from the printed one: `<dir>` is the plan's own directory and `<plan-key>` its name, the `key:` line.

## 2. Validate and decompose

Run `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh" <plan> --split`. It validates the plan, writes `<dir>/spec.md` and one `<dir>/tasks/<id>.md` per task, commits that decomposition, and returns the title, the progress counter and one line per task: id, state, TDD marker, dependencies, files, title.

That index is your whole view of the plan; the task files are the agents'. Each of them sees the specification and its own task, and no other task at all.

Non-zero exit means the plan itself is broken: report the error and stop, repairing it belongs to the planner. A zero exit guarantees that no two tasks without a dependency path between them share a file, so `deps` is the only thing that keeps two tasks apart.

Tasks in state `done` are already committed - skip them. That is also how a build resumes after a context reset.

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
- Close out one task at a time - committing rewrites the git index and the plan's progress line, and nothing else in the run touches either.
- Tasks whose verification needs an exclusive resource - one build output, a fixed port, a single test database - never run together.

Dispatch: one `viber:task-coder` per task (Agent tool, `model` = that task's tier), all in a single message, each carrying three labelled lines and nothing else:

```
spec: <dir>/spec.md
task: <dir>/tasks/<id>.md
notes: .temp/viber/<plan-key>/<id>-coder.md
```

`TaskUpdate` -> in progress.

Aim for:

- The widest dispatch the rules allow - idle capacity is lost time.
- Refill as results come back, not once a batch drains.
- When a constraint forces a choice, start whatever unblocks the most tasks.
- Close-outs running alongside coders still working on other files, so a queued review never stalls the next dispatch.

Per task, once its coder returns:

1. `VERDICT: FAIL` -> `AskUserQuestion` naming the task and its `REASON:` line: retry / skip / abort. `retry` re-dispatches the same coder one tier up (`haiku` -> `sonnet` -> `opus`, `opus` stays) with its three lines plus `reason: <the returned REASON>`. Abort ends the run; skip drops that task and every task depending on it, and leaves its half-finished files uncommitted in the tree - name them in the final summary.
2. Profile says review -> dispatch `viber:task-reviewer` (Agent tool, `model` = that task's tier) with the same `spec:` and `task:` lines plus `report: .temp/viber/<plan-key>/review-<id>-<round>.md`, round starting at 1.
   - `VERDICT: FAIL` -> dispatch `viber:task-coder` again with its three lines plus the returned `REVIEW` path as `report:`, then re-review with the next round. After 2 failed rounds -> `AskUserQuestion`: retry / accept / abort.
3. `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" <plan> <id>`. It takes the commit subject from the task's own heading in the plan, stages only the task's files, commits, and records the task as done. Its warning names changed paths no task in the plan claims - the same split step 5 commits by, so carry those paths to the final summary. A non-zero exit means nothing was committed and nothing recorded -> `AskUserQuestion`: retry / skip / abort.
4. `TaskUpdate` -> completed.

## 5. Close

Dispatch `viber:test-runner` with a report path `.temp/viber/<plan-key>/tests-<round>.md`.

- `VERDICT: PASS` or `VERDICT: SKIP` -> `TaskUpdate` -> completed.
- `VERDICT: FAIL` -> dispatch `viber:task-coder` (model `sonnet`) with `spec:`, the returned `REPORT` path as `report:` and `notes: .temp/viber/<plan-key>/repair-<round>-coder.md`. Commit every path on its `FILES:` line, each one through the form that owns it:
  - a path the index's `files` column claims -> `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" <plan> <id> <round> <file> [<file>...]`, one call per task.
  - a path no column claims - a regression in code the plan never touched -> one `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --repair <plan> <round> <file> [<file>...]` for all of them. Never borrow a task id to get such a file committed.

  Both stage nothing they were not given and derive their own subject. Then run `viber:test-runner` again with the next round. After 2 rounds -> `AskUserQuestion`: retry / accept / abort.

## 6. Record what the build taught

Only for the switches the config block above reports as `true`, both dispatched in one message - they write in separate places and never wait for each other:

- `memory: true` -> `viber:memory-writer`
- `rules: true` -> `viber:rules-writer`

Each carries two labelled lines: `spec: <dir>/spec.md` and `notes: .temp/viber/<plan-key>/`, the directory the coders left their conclusions in.

Commit every path they return, all of them in one call: `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --chore <file> [<file>...]`, which derives its own subject. Nothing returned, or both `VERDICT: NONE` -> no call. Then `TaskUpdate` -> completed.

Final summary, max 5 lines: tasks committed, review rounds spent, test verdict, what memory and rules recorded, anything left for the user to decide.
