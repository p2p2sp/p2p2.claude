---
name: implementor
description: Builds an approved plan task by task. Requires an existing plan; without one, suggest the viber:intent interview.
allowed-tools: Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/config.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/run-clock.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/qa-comment.sh:*)
model: sonnet
effort: medium
user-invocable: false
---

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/config.sh"
```

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/run-clock.sh"
```

Carry the preloaded `started:` mark unchanged to step 7.

# implementor

You orchestrate and delegate: every piece of work runs inside a subagent. Open no file, write no file and no code, run no build and no test.

- One status line per event. No prose, never restate what an agent returned.
- Only coder, reviewer and repair-coder dispatches, and a dispatch its step names a `model` for, carry `model`; every other dispatch carries none.
- Every bundled-script run is one literal Bash line, `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" "<arg>" ...`, every argument double-quoted: never prefixed with an interpreter, never assigned to a variable, never preceded by `cd`, never chained with `;`.
- Every dispatch or call that starts or ends a task-list entry carries that entry's `TaskUpdate` in the same message.
- Never two `commit-task.sh` calls in one message: each rewrites the git index and `status.md`.
- A `commit-task.sh` call exiting non-zero committed nothing. Except a task's own commit, a commit outside a task, a `--rule` call, a `--skip` or `--decide` call made after an arbiter ruling (step 4 owns these four) and an `--extension` call (step 6's extension text owns it): `AskUserQuestion`: retry / abort, its paths named uncommitted in the final summary on abort.
- An agent's completion notice saying it "stopped with background work of its own still running": hold its verdict and `SendMessage` that agent, once: `Stop every process you started that is still running, then return your output lines again.` Act on what it returns then. The same notice again -> act on the verdict and name that agent's task in the final summary.
- An agent returning no `VERDICT:` line: `SendMessage` that agent, once: `Finish your task, then return your output lines.` Still none -> act as on its `VERDICT: FAIL` when its output defines one, else on its `VERDICT: DENIED`, with `REASON: no verdict returned`.

## Answers

Every question below offers some of these four answers, each doing exactly this wherever it is offered:

- `retry`: dispatch again, with its own dispatch lines, the agent that failed or was refused; after failed review or test rounds that is the task's coder or the repair coder.
  - After a `FAIL`, or a `PASS` with its `DOD:` line short of its total: one tier up (`haiku` -> `sonnet` -> `opus` -> `fable`), never past `tiers.max`, where it stays, carrying `reason: <the returned REASON>` on a coder's own failure, `reason: <the short DOD: line>` when no `REASON:` came, or the last `REVIEW` or `REPORT` path as `report:` after failed rounds; the task's attempt count starts over, and a `TaskUpdate` rewrites the task's subject with the new tiers.
  - After a `DENIED`: same model, same round, a task's coder adding `reason: <the returned REASON>`.
  - After a failed commit: run the same call again.
- `skip`: `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --skip "<plan>" "<id>"` for that task, then the same call for every task depending on it, directly or through another dependent, one call per message, each with its `TaskUpdate` -> completed. Its half-finished files stay uncommitted in the tree; name them in the final summary.
- `accept`: the user overrides the gate. On a task: its commit with `--unreviewed` appended, the task named unreviewed in the final summary. On the test run: go to step 6, the failing or refused run named in the final summary. On the arbiter: take the first option of its dispatch, recorded through `--rule` (step 4) with the refused call as its why and `not assessed - the arbiter was refused` as its cost, then carried out. On any other agent: go on as if it returned nothing, its refused call named in the final summary.
- `abort`: stop every dispatch, go to step 7.

A `VERDICT: DENIED` question names the refused call from its `REASON:` line and its `retry` option reads `permission added and retry`.

## 1. Land the plan

`"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --land "<src>"` copies the approved plan into its own dated run directory and prints `path:`, `key:`, `state:`, one `branch:` line when the run works on its own branch, and one `open:` line per OTHER run whose tasks are not all settled.

`<src>`, first match wins:

1. The argument, when one came in.
2. The `source:` line of the approved plan's frontmatter, or an older plan's `<!-- source: <path> -->` comment. Never offer to save plan text you are holding: the script copies the file.
3. `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh"` with no argument returns the run most recently worked on. Exit 3 -> `AskUserQuestion` for the approved plan's full path, then land that.

Exit 6 - the run branch could not be set -> report the stderr reason and stop: nothing landed, and the build does not proceed to step 2. Any other non-zero exit this step does not name by number (2, 4, 5) -> the same: report the stderr reason and stop.

The `target:` line following `branch:` carries to the final summary: one line naming the `branch:` value and the `target:` value as the pull request target and suggesting `/viber:create-pr`. No such line when there is no `target:` line, or it equals the branch.

- `state: draft` -> report the path and that `/viber:intent` pointed at that draft continues it, then stop without a question.
- `state: new` with any `open:` line -> `AskUserQuestion` naming both: build the plan just landed, or resume that run instead.
- Resolved through 3 with any `open:` line -> `AskUserQuestion` for which run to resume.
- Anything else -> proceed. `state: existing` is a run already open with its own progress; take it as it stands.

`<plan>` is that printed `path:` value. `<dir>` is the plan's own directory; `<dir>/work/` holds every note and report the run produces.

## 2. Validate and decompose

Run `"${CLAUDE_PLUGIN_ROOT}/scripts/plan-index.sh" "<plan>" --split`. It validates, decomposes and commits the plan, and returns the index: title, progress counter, one line per task (id, state, TDD, `excl`, `deps`, `feeds`, `files`, title), then one `verify:` line per task naming its Verification command. `feeds` names the contract blocks that task writes and other tasks consume, each as `<id>:<count of consuming tasks>`, `-` when none. That index is your whole view of the plan; a coder gets its one task file, never the specification.

Non-zero exit -> report the error and stop; repairing the plan belongs to the planner.

Never dispatch a `done` or `skipped` task again. Also on the index:

- `dirty: <id> | <paths>` -> before the first dispatch, `AskUserQuestion` naming it and those paths: continue (its coder gets `resume: <paths>` added to its lines), start over (dispatch unchanged), or drop (the `skip` answer).
- `orphan: <paths>` -> once every `dirty:` question is answered and before the first dispatch, one `AskUserQuestion` naming them and asking whether to commit them, with exactly two options: `Commit` or `Leave uncommitted`.
  - Commit: one `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --outside "<plan>" "<path>" ["<path>"...]` call for all of them, before the first dispatch. No task takes them.
  - Leave uncommitted: the paths reach the final summary.
- `unreviewed: <ids>` -> carry to the final summary.
- `deferred: <id>:<path>` -> that task's `deferred:` line in step 4.
- `closed: <parts>` -> those parts of steps 6 and 7 are already recorded.
- `decision: <id>: <text>` -> a `decision:` line in step 4.
- `ruling: <subject>: <text>` -> carry to step 7.
- `next: part <n> of <N> - <name>` -> carry it to step 7.

## 3. Profile the tasks

Take both decisions from the index's own fields, never a field it does not carry.

Tier:

- Mechanical and bounded: config, scaffolding, a rename, docs, `TDD: none` over one or two files -> `haiku`.
- Ordinary feature work, `TDD: required`, contained within its own files -> `sonnet`.
- Load-bearing: a `feeds` entry counting 3 or more, many files, or several tasks naming it in their `deps` -> `opus`. A block fewer tasks consume raises nothing on its own.
- A floor the host's instructions declare for a kind of task (a minimum tier, a mandatory review) raises both decisions to it.

Review: the reviewer is waived only on a `sonnet` task whose `verify:` line runs the project's build or its tests, never on `haiku` or `opus`. A `verify:` line running `grep`, `test -f` or any other content check is reviewed whatever its tier. Its review tier is the task's tier, raised to `sonnet` from `haiku`.

Then clamp both tiers into the config block's `tiers.min` to `tiers.max` range (`haiku` < `sonnet` < `opus` < `fable`). The review waiver is decided before the clamp.

`TaskCreate` the remaining tasks, then these entries in this order, each except `Final test run` only when its close part is loaded below: `Final review`, `Final test run` (step 5), `Update project memory`, `Update project rules`, `Write QA and E2E scenarios`, `Run extensions` (step 6), `Archive the run` (step 7). A plan task's subject: `<id> - <title> (<tier>)`, or `(<tier>, review <review tier>)` when reviewed, with `[TDD]` after `<id>` when its TDD is `required`: `<id> [TDD] - <title> ...`.

## 4. Run the plan

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" build.baseline-tests "${CLAUDE_SKILL_DIR}" baseline-run
```

`deps` and the `excl` hold are the only ordering the plan imposes; arrange the rest yourself and never lock a schedule up front. Never break:

- A task dispatches only once every id in its `deps` is done.
- A task whose `excl` column says `yes` is held back while any task without `excl` is ready to dispatch or anything else is in flight; several ready `excl` tasks go out one after another as their turn comes, and each still runs alone until committed - nothing else in flight when it goes out, nothing new out until it is committed. Never infer or override it.

Coder dispatch: `viber:task-coder` (Agent tool, `model` = the task's tier), carrying these labelled lines, plus any line a fragment of this step adds, and nothing else, the last three omitted when empty:

```
task: <dir>/tasks/<id>.md
notes: <dir>/work/<id>-coder.md
out: .temp/viber/<id>/
refs: ${CLAUDE_PLUGIN_ROOT}/references
deferred: <paths>
prior: <dir>/work/<dep-id>-coder.md, ...
decision: <task-id>: <text>
```

- `out`: per task, shared by its reviewer.
- `deferred`: the index entries naming this id plus every `--defer` this build passed naming it.
- `prior`: the notes of the tasks its `deps` names.
- `decision:`: one line per index `decision:` line plus one per `--decide` this build recorded, whose `<task-id>` is this task or one it depends on, directly or through another.
- Tier: the attempt's tier (below), raised too by the user's `retry`.
- Every coder re-run - a next attempt, a `WAIT:` hold, `retry` - is this same fresh dispatch, every labelled line above plus the `report:`, `reason:` or `decision:` line its answer names, and a `resume:` line carrying every path an `EXTRA:` line of the task's earlier coders returned.

Reviewer dispatch: `viber:task-reviewer` (Agent tool, `model` = the review tier) carrying the task's `task:`, `notes:`, `out:`, `refs:`, `deferred:` and `decision:` lines, any line a fragment of this step adds, and:

- `report: <dir>/work/review-<id>-<round>.md`, round starting at 1 and rising with every review of that task.
- `extra: <repo-relative paths, comma-separated>`: every path an `EXTRA:` line of that task's coder returned so far in this build, across every re-run, never the reviewer's own, except a path the index `files` column gives to a task not yet `done`. Omitted when empty.
- `recheck: <task-id> | <command>`: one line per `done` task whose `files` column claims a path on `extra:`, `<command>` being that task's `verify:` command. Omitted when empty.

Commit: `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<plan>" "<id>"` with its `TaskUpdate` -> completed, plus:

- `--with "<path>" ["<path>"...]` for every path an `EXTRA:` line of that task's coder or reviewer returned.
- `--defer "<target-id>:<path>" [...]` for every `DEFERRED:` line its coder returned. `-> none` takes the earliest unfinished task other than this one whose `files` column claims that path; a path no task claims is named in the final summary.

Warnings off the commit never stop the build: carry `refused <path> - claimed by task <id>`, `took <path> - claimed by committed task <id>` and `changed, claimed by no task in the plan` to the final summary.

Attempts: an attempt is one coder dispatch, a `WAIT:` hold and the retry of a `VERDICT: DENIED` excepted. A coder failure is a `VERDICT: FAIL`, or a `PASS` with its `DOD:` line short of its total.

- A task gets at most 5 attempts in this session; a coder failure, a review failure and a task commit exiting other than 4 each end one. A resumed session starts every task's count over.
- Each attempt after the first runs one tier up from the last, clamped into `tiers.max`, its review tier rising with it (a waived review stays waived) and raised to `sonnet` from `haiku`; a `TaskUpdate` rewrites the task's subject with the new tiers.
- A next attempt is the task's coder dispatched fresh, carrying `reason: <the returned REASON>` (`<the short DOD: line>` when no `REASON:` came, `<the commit's error>` after a refused commit), the returned `REVIEW` path as `report:` after a review failure, and its `decision:` lines.

Arbiter dispatch: `viber:arbiter` (Agent tool, no `model`) carrying `case:`, `options:` (the closed list, its first the fallback), `task:`, `report:` and `reason:` lines as the case below names, the last two omitted when empty. Its `RULED` return is recorded, then carried out, without a question:

- A `RULING` naming no listed option -> take the first option, the mismatch named in the final summary.
- Record it: `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --rule "<plan>" "<subject>" "<ruling>" "<why>" "<cost>"`, `<subject>` being the task's id, else the case name (`baseline`, `tests`, `final-review`, `commit`), the `RULING`, `WHY` and `COST` each one line with every double quote, dollar sign, backtick or backslash rewritten into words. Exit non-zero -> name it in the final summary, rule nothing further, retry nothing, and carry the ruling out.
- A `--skip` or `--decide` call exiting non-zero after a ruling -> name it in the final summary, ask nothing, and carry on.
- `VERDICT: DENIED` -> `AskUserQuestion` naming the refused call from its `REASON:` line: retry / accept / abort.

Commit outside a task: every `commit-task.sh` commit but a task's own commit and `--extension` - the fix-number repair form, `--repair`, `--chore`, `--qa`, `--review` and `--outside`. Exiting non-zero -> run the same call once more, asking nothing. A second refusal -> the arbiter with `case: commit`, `options: leave uncommitted`, `reason:` the error; record its ruling with subject `commit`, leave those paths uncommitted and name them in the final summary.

Start with every task whose `deps` are done, in one message. On every return, answer with ONE message carrying every dispatch now legal plus at most one commit. Never wait for a batch to drain; when a constraint forces a choice, start whatever unblocks the most tasks.

- Coder `VERDICT: FAIL` carrying `WAIT:` -> hold the task; once every task in flight at that return has returned, dispatch its coder fresh at the same tier, counting as no attempt and asking nothing. Nothing else in flight at that return, or the task already waited once on a path it names -> act on it as an ordinary `FAIL` below.
- Coder failure on attempt 1 to 4 -> the next attempt, asking nothing. From attempt 2 on, a `DECIDE:` line -> first the arbiter: `case: decide`, `options:` those options only, `task: <dir>/tasks/<id>.md`, `report: <dir>/work/<id>-coder.md`, `reason:` the returned `REASON:` (the short `DOD:` line when none came); record its ruling with subject `<id>`, then `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --decide "<plan>" "<id>" "auto: <ruling>"`, that text made one line with every double quote, dollar sign, backtick or backslash in it rewritten into words, then the next attempt with its `decision:` lines, the new one among them, the attempt count not starting over. No `DECIDE:` line -> no arbiter.
- Coder failure on attempt 5, reviewer `FAIL` on attempt 5, or a task commit exiting other than 4 on attempt 5 -> the limit: the arbiter with `case: cap` (never `decide`), `task: <dir>/tasks/<id>.md`, `report:` lines for `<dir>/work/<id>-coder.md` and the task's last `REVIEW` path when it has one, `reason:` the failure's `REASON:` or the commit's error, and `options: accept | skip` after a review failure, `options: skip` otherwise. Record its ruling with subject `<id>`, then carry it out: `accept` -> the task's commit with `--unreviewed` appended, the task named unreviewed in the final summary; `skip` -> the `skip` answer's calls. An `accept` commit exiting other than 4 -> the arbiter again with `options: skip`, that commit's error as `reason:` and the same `report:` lines, its ruling recorded and carried out the same way.
- Coder `VERDICT: DENIED` -> `AskUserQuestion` naming the task: retry / skip / abort.
- Coder `PASS`, and review due or a non-empty `extra:` or `recheck:` line -> reviewer dispatch at the next round.
- Coder `PASS` otherwise -> commit.
- Reviewer `VERDICT: PASS` -> commit.
- Reviewer `VERDICT: FAIL` on attempt 1 to 4 -> the next attempt, with the returned `REVIEW` path as `report:`.
- Reviewer `VERDICT: DENIED` -> `AskUserQuestion` naming the task: retry / accept / abort.
- Commit exit 4 -> nothing was committed; `TaskUpdate` back to in progress and `AskUserQuestion`: retry / skip / abort. When it names `--landed`, add a first option: already committed - the user names the commit, and the same call re-runs with `--landed "<sha>"`.
- Commit any other non-zero exit on attempt 1 to 4 -> nothing was committed; `TaskUpdate` back to in progress, then the next attempt.

## 5. Close

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" build.final-review "${CLAUDE_SKILL_DIR}" final-review
```

Dispatch `viber:test-runner` with report path `<dir>/work/tests-<round>.md`, round starting at 1, and the line `run: <dir>`.

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" build.baseline-tests "${CLAUDE_SKILL_DIR}" baseline-close
```

Repair dispatch: `viber:task-coder` (model `sonnet` clamped into the tiers range, raised only by `retry`) with `spec: <dir>/spec.md`, the last `REPORT` path as `report:`, `notes: <dir>/work/repair-<round>-coder.md`, `out: .temp/viber/repair-<round>/` and `refs: ${CLAUDE_PLUGIN_ROOT}/references`.

Repair commit, every path on the coder's `FILES:` line through the form that owns it:

- A path the index's `files` column claims -> `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" "<plan>" "<id>" "<round>" "<file>" ["<file>"...]`, one call per task.
- A path no column claims -> one `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --repair "<plan>" "<round>" "<file>" ["<file>"...]` for all of them. Never borrow a task id for such a file.

- Test-runner `VERDICT: PASS` or `VERDICT: SKIP` -> `TaskUpdate` -> completed.
- Test-runner `VERDICT: FAIL`, round 1 to 5 -> repair dispatch.
- Test-runner `VERDICT: FAIL`, round 6 -> the arbiter with `case: tests`, `options: accept`, `report:` that run's `REPORT` path. Record its ruling with subject `tests`, then go to step 6, that failing run named in the final summary.
- Test-runner `VERDICT: DENIED` -> `AskUserQuestion`: retry / accept / abort.
- Repair coder `PASS` or `FAIL` -> repair commit, then test-runner at the next round. No `FILES:` line -> no commit, test-runner at the next round.
- Repair coder `VERDICT: DENIED` -> commit nothing; `AskUserQuestion`: retry / accept / abort.

## 6. Record what the build taught

For each close part below the index's `closed:` line does not already name, all in one message:

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" build.memory "${CLAUDE_SKILL_DIR}" memory
```

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" build.rules "${CLAUDE_SKILL_DIR}" rules
```

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" build.qa "${CLAUDE_SKILL_DIR}" qa
```

Any agent of this step returning `VERDICT: DENIED` -> `AskUserQuestion` naming that agent: retry / accept / abort.

Commit what the memory and rules dispatches above return, one call: memory and rule paths, through `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" --chore "<plan>" "<file>" ["<file>"...]`, only once every writer of this step has returned. No writer returned a path, or only `VERDICT: NONE` -> no call.

`TaskUpdate` -> completed for each entry in the message answering its own writer's return, never held for another writer or the `--chore` call: the `memory` and `rules` entries on that return, the QA entry with its `--qa` call, or on that return when no call is due.

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" build.extensions "${CLAUDE_SKILL_DIR}" extensions
```

## 7. Archive and close

First `"${CLAUDE_PLUGIN_ROOT}/scripts/run-clock.sh" "<started>"`, one call.

For the close part below, when the config block's `build.cleanup:` line reads `true`, the index's `closed:` line does not already name it and the build did not end on `abort`, compose the final summary in its archived form, then:

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/switch-text.sh" build.cleanup "${CLAUDE_SKILL_DIR}" cleanup
```

Complete every task the last `progress: <n>/<total>` settled and every entry still open. Never delete the list.

Then close:

- `closeout` returned `VERDICT: ARCHIVED` -> print exactly two lines: `<n>/<total> tasks committed, tests <the test verdict>, <elapsed>` (`, <elapsed>` left out on `elapsed: unknown`), then `Summary: <path>/outcome.md`, `<path>` being the directory its `PATH:` line names, the parenthesized file count dropped.
- Every other case (the close part not run, `abort`, `BLOCKED`, an accepted `DENIED`) -> print the final summary in its screen form.

Final summary, both forms: max 7 lines, then every line this step places after them. The 7 lines: tasks committed, review rounds spent, test verdict, the clock's `elapsed:` (none on `elapsed: unknown`, never estimated), what memory, rules and QA recorded, then the form's own line below, then everything the steps carried to it but the `FIXED:` and `OWNER:` lines.

- Archived form: the archive path `docs/<directories.specifications>/<key>` (the config block's `directories.specifications:` value, the landing's `key:`).
- Screen form: the drift from `closeout`'s `DRIFT:` line, when `closeout` returned one.

After the summary and outside its 7 lines, list every `FIXED:` line the final review carried, then every `OWNER:` line it carried, each verbatim.

After those, also outside its 7 lines, list the rulings: each index `ruling:` line, then each ruling this session recorded that is not already one, every one with its ruling, `why:` and `cost if wrong:`.

A run of more than 5 tasks adds one line after the summary, outside its 7: propose running `code-review`.

With a `next: part` index line and a build not ended on `abort`, the last line, after the summary and outside its 7, is `/viber:intent <archive path>/roadmap.md` in the archived form, `/viber:intent <dir>/roadmap.md` in the screen form.
