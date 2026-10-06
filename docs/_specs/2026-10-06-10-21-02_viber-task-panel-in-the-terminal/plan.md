---
source: C:/Projects/p2p2.claude/docs/_specs/2026-10-06-10-21-02_viber-task-panel-in-the-terminal/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# viber task panel in the terminal

## Goal

Give a person running a viber build a compact, always-at-hand view of the active run: a button in
the band above the prompt that opens a closable pane listing every task of the run's plan with its
status and the run's progress. It ships inside the viber plugin as a Claude Code hooks module and
costs no model tokens.

## Problem

Today the progress of a viber build is visible only by scrolling the transcript: which tasks are
done, which are being built right now, which were skipped and what was deferred has to be pieced
together from agent returns and commit lines. A build runs unattended for a long time, so a person
coming back to the terminal has no quick way to see where it stands.

## Current behaviour

viber ships four command hooks in `viber/hooks/hooks.json` (manifest injection at session start,
plan hints, the plan gate and the kill guard) and no hooks module. The state of a run lives in its
run directory `docs/<runs>/<stamp>_<slug>/`: `plan.md` holds the tasks as `<!-- TASK -->` blocks
under `## Tasks`, each opening on `### T<n> - <title>`; `status.md` holds `progress:`, `done:`,
`skipped:`, `deferred:` and `closed:` lines written by `commit-task.sh` alone. Nothing draws that
state outside the transcript.

### Must not change

- The four command hooks of `viber/hooks/hooks.json` keep their exact `hooks` block: manifest injection, plan hints, plan gate and kill guard behave as today, on Claude Code versions with and without hooks-module support.
- The `description` of `viber/hooks/hooks.json` keeps the phrases `schema note` and `planning.plain-plan-review`, which `tests/viber/session-start.test.ts` and `tests/viber/plan-gate.test.ts` assert.
- `viber/.claude-plugin/plugin.json` is not changed: no `types` field, no `hooks` field.
- The module never writes a file and never changes a tool call: every hook it adds on `tool.call` passes the call through unchanged.

## Behaviour

### S1 - Button appears for an active run [NEW]

A run whose plan carries tasks is open in the project, so viber offers its task panel above the prompt.

Given `docs/<runs>/` holds a run directory whose `plan.md` carries at least one task block
When the session starts or the run's state is refreshed
Then the band above the prompt shows a button `viber tasks <done>/<total>`

### S2 - The pane lists the run's tasks [NEW]

Pressing the button opens a pane listing the run's tasks with their states, closed by Claude Code's own close mark, Esc or ctrl+x x.

Given an active run with tasks T1 to T4, `status.md` reading `done: T1`, `skipped: T3`, `deferred: T4:src/a.ts`
When the person presses the button
Then a pane titled `viber tasks` opens, showing the progress `1/4` and one row per task in plan order: T1 done, T2 pending, T3 skipped, T4 pending with `src/a.ts` named as deferred

### S3 - A task being built shows as running [NEW]

The build dispatches a task's coder or reviewer in this session, and the panel shows that task as running until it is recorded.

Given an active run whose task T2 is pending
When the session dispatches `viber:task-coder` or `viber:task-reviewer` with the line `task: <run>/tasks/T2.md`
Then T2 shows as running, and once `status.md` lists T2 as done it shows as done

### S4 - The panel follows the run [NEW]

The panel's state is read again after every viber run script call, every task dispatch, at session start and every 15 seconds, so a commit, an archive or a change from another terminal reaches it.

Given the button shows `viber tasks 1/4`
When `commit-task.sh` records T2 done, or 15 seconds pass after another session did so
Then the button reads `viber tasks 2/4` and the pane, when open, shows T2 done

### S5 - No button without an active run [NEW]

Given no run directory with tasks exists, or (with `build.cleanup` off) every task of the newest run is done or skipped, or (with `build.cleanup` on) the run was archived
When the band above the prompt is drawn
Then viber draws nothing there

### Edge cases

- `docs/<runs>/` missing or unreadable, or `.claude/viber.yml` missing -> runs directory `_specs`, `build.cleanup` off; no run found means no button.
- Only drafts (a `plan.md` with no task block) -> no button.
- Several runs carry tasks -> only the one whose directory name sorts last is shown.
- `status.md` missing or empty -> every task pending.
- `build.cleanup` on and every task done or skipped while the run directory is still present (its close is running) -> the button stays.
- `### S<n> - ` scenario headings and `### C<n> - ` contract headings in `plan.md` -> never read as tasks.
- A dispatch of another agent type, or one with no `task:` line -> ignored.
- A running task later recorded as skipped -> shows skipped.
- A `deferred:` entry whose path holds a colon -> split at the first colon only.
- The pane is open when the run disappears -> the pane shows `No active viber run.`
- `status.md` lists several tasks on one line, or `none` -> each id counts, `none` counts as no task.

## Glossary

- Active run - the run directory under `docs/<runs>/` whose name sorts last among those whose `plan.md` carries at least one task block, as long as it is not finished; finished means, with `build.cleanup` off, every task done or skipped. With `build.cleanup` on a run is active until it is archived.
- Running task - a task of the active run whose coder or reviewer was dispatched in this session and that `status.md` does not yet list as done or skipped (skipped ends it too, deliberately: a skipped task is no longer being built). Not recorded in any file.
- Task panel - the button above the prompt plus the pane it opens.

## Acceptance criteria

1. With an active run, the band above the prompt shows a button labelled `viber tasks <done>/<total>`, and pressing it opens a pane titled `viber tasks`, closed by Claude Code's own close mark, Esc or ctrl+x x.
2. With no active run, viber draws nothing in the band above the prompt.
3. The active run is chosen from the directory named by `directories.runs` in `.claude/viber.yml` (default `_specs`), parsed with the same grammar as `viber/scripts/config.sh`, and is the newest one by directory name whose `plan.md` carries a task block.
4. With `build.cleanup` off, a run whose every task is done or skipped is not active; with `build.cleanup` on, it stays active while its directory exists.
5. The pane lists every task of the active run in plan order with its id, title and one state of done, skipped, running or pending, names each deferred path under its task, and shows the progress `<done>/<total>`.
6. A task whose `viber:task-coder` or `viber:task-reviewer` dispatch carried its `task:` line in this session shows as running until `status.md` lists it as done or skipped.
7. The panel's state is read again at session start, after every Bash call naming `plan-path.sh`, `plan-index.sh`, `commit-task.sh` or `archive-run.sh`, after every task dispatch, and every 15 seconds.
8. viber's command hooks are unchanged, the hooks module is declared in `viber/hooks/hooks.json` under `modules`, and that file's `description` names the task panel module.
9. viber's help page describes the task panel in English and Polish.

## Scope

### File map

- add - viber/hooks/panel/run-state.ts - reads `viber.yml` text, `plan.md` text and `status.md` text into the active run and the panel's rows and progress; pure functions, no imports
- add - viber/hooks/panel/run-events.ts - recognises a task dispatch and a viber run script call from a tool call's input; pure functions, no imports
- add - viber/hooks/register.tsx - the hooks module: reads the run's files, holds the running set, draws the button and the pane, refreshes on events and on the clock
- modify - viber/hooks/hooks.json - declares the module under `modules` and names it in `description`
- add - tests/viber/panel-run-state.unit.test.ts - unit tests of run-state.ts
- add - tests/viber/panel-run-events.unit.test.ts - unit tests of run-events.ts
- modify - viber/skills/setup/assets/help.html - describes the task panel, English and Polish

### Out of scope

- `status.md`, its format and every script reading or writing it (`commit-task.sh`, `plan-index.sh`, `plan-path.sh`, `archive-run.sh`): the panel only reads it.
- `implementor` and every viber agent: the panel only observes their dispatches.
- `viber/.claude-plugin/plugin.json`: no state contract, no new field.
- `viber/CLAUDE.md` and `viber/hooks/CLAUDE.md`: updated by the build's memory close (`build.memory` on), never by a task.
- A `.claude/viber.yml` switch to turn the panel off, persisting the running set across a plugin reload, archived runs, runs other than the newest one.
- A `claude plugin test` suite: CI installs no `claude` CLI and every dev-time test lives under `tests/`.
- End-to-end tests.
- `viber/README.md`.
- A session whose working directory is not the repository root: the panel looks for runs relative to that directory only.

## Solution requirements

- The panel calls no model, uses no network and writes no file.
- The panel's decision logic is proven by the repository's own unit tier, which CI runs; the drawing code is not loaded by it.
- Which tasks are running is known to this session only and is forgotten on a plugin reload; this is accepted.
- The runs directory and the cleanup switch resolve exactly as `viber/scripts/config.sh` resolves them; `viber.local.yml` overrides neither.
- A Claude Code version without hooks-module support (2.1.0, checked) keeps every viber command hook working; the current version (2.1.291, checked) shows the panel with no opt-in setting.
- Task verification may use the `claude` CLI of the developer machine; CI has none.
- Every user-visible string in the module is English; the help page carries both languages.

## Tasks

<!-- TASK -->
### T1 - Pick the active run from a project's runs
- TDD: required
- Covers: #2, #3, #4
- Uses: C1, C5, C6
- Depends-on: none
- Files: viber/hooks/panel/run-state.ts, tests/viber/panel-run-state.unit.test.ts
- Delivers: the run-state functions that read `viber.yml` text into the runs directory name and the cleanup switch, read `plan.md` text into its tasks, read `status.md` text into its done, skipped and deferred entries, and pick the active run from candidate runs.
- Verification: node --test tests/viber/panel-run-state.unit.test.ts -> every test passes
- DoD: `runsDirectory` returns `_specs` for null text, for a value outside `[A-Za-z0-9._-]+`, for `.` or `..` and for a `runs:` key outside the `directories:` group, and the configured name otherwise; `runsDirectory` reads a `runs:` line at any indentation inside the `directories:` group; `isCleanupOn` is true only for the first indented `cleanup:` line inside `build:` reading `true` in any letter case, and false for a `cleanup:` line inside the `build:` group's `extensions:` map or outside `build:`; `planTasks` returns the tasks of the task blocks under `## Tasks` in plan order and ignores `### S<n> - ` and `### C<n> - ` headings; `runStatus` returns empty lists for null or empty text, reads every space-separated id of one `done:` or `skipped:` line, treats `none` as no entry, ignores every other key, and splits a `deferred:` entry at its first colon; `activeRun` returns null for no candidate or only candidates without tasks, picks the candidate whose key sorts last among those with tasks, returns null with cleanup off when every task is done or skipped, and keeps that run with cleanup on
<!-- /TASK -->

<!-- TASK -->
### T2 - Build the panel's rows and progress
- TDD: required
- Covers: #5, #6
- Uses: C1, C5
- Depends-on: T1
- Files: viber/hooks/panel/run-state.ts, tests/viber/panel-run-state.unit.test.ts
- Delivers: the run-state function that turns the active run and the running set into one row per task with its state and deferred paths, plus the done and total counts.
- Verification: node --test tests/viber/panel-run-state.unit.test.ts -> every test passes
- DoD: `panelOf` returns one row per task in plan order carrying its id and title; a task on the done list is `done` and on the skipped list `skipped`, even when it is in the running set; a task in the running set and on neither list is `running`; every other task is `pending`; each row carries the deferred paths of its own task only; `done` counts the tasks on the done list and `total` counts every task
<!-- /TASK -->

<!-- TASK -->
### T3 - Recognise task dispatches and run script calls
- TDD: required
- Covers: #6, #7
- Uses: C2
- Depends-on: none
- Files: viber/hooks/panel/run-events.ts, tests/viber/panel-run-events.unit.test.ts
- Delivers: the run-events functions that read a task id out of a task agent dispatch and tell whether a Bash command calls one of viber's run scripts.
- Verification: node --test tests/viber/panel-run-events.unit.test.ts -> every test passes
- DoD: `dispatchedTaskId` returns the id from a `task: <path>/tasks/<id>.md` line for subagent type `viber:task-coder` or `viber:task-reviewer`; it returns null for any other subagent type, an absent subagent type, an absent prompt or a prompt with no such line; `isRunScriptCall` is true for a command naming `plan-path.sh`, `plan-index.sh`, `commit-task.sh` or `archive-run.sh` and false for any other command
<!-- /TASK -->

<!-- TASK -->
### T4 - Draw the task panel from viber's hooks module
- TDD: none
- Covers: #1, #2, #5, #6, #7, #8
- Uses: C1, C2, C3, C4, C5, C6
- Depends-on: T2, T3
- Files: viber/hooks/register.tsx, viber/hooks/hooks.json
- Delivers: the hooks module that refreshes the active run from disk at session start, after viber run script calls, after task dispatches and on a 15 second clock, records running tasks, draws the button above the prompt only while a run is active and opens the pane listing the panel's rows; and its declaration in `viber/hooks/hooks.json`.
- Verification: claude plugin validate viber && grep -c -E "export function (activeRun|panelOf|dispatchedTaskId|isRunScriptCall)" viber/hooks/panel/run-state.ts viber/hooks/panel/run-events.ts && grep -c -E "activeRun|panelOf|dispatchedTaskId|isRunScriptCall" viber/hooks/register.tsx && grep -c -F -e "No active viber run." -e "viber-tasks" -e "closeOnEscape: true" -e "next(e)" viber/hooks/register.tsx && node -e "const h=require('./viber/hooks/hooks.json');const o=JSON.parse(require('child_process').execSync('git show 9883f8fc:viber/hooks/hooks.json'));console.log(JSON.stringify(h.hooks)===JSON.stringify(o.hooks), JSON.stringify(h.modules), /schema note/.test(h.description), /planning\.plain-plan-review/.test(h.description), /task panel/.test(h.description) && /register\.tsx/.test(h.description))" -> "Validation passed", with the `./register.tsx` lines naming the hooks `session.start`, `tool.call` on `Agent` and on `Bash`, `ui.render{component=AbovePrompt}` and `ui.render{component=Pane, requestId=viber-tasks}` and the calls `$.fs.read`, `$.fs.list`, `$.ui.open`, `$.ui.invalidate`, `$.clock.every`; the first grep counting 2 in each helper, the second at least 4, the third at least 4; the last line `true ["./register.tsx"] true true true`
- DoD: `claude plugin validate viber` passes and lists the five hooks and five calls named in Verification; `register.tsx` imports `activeRun`, `panelOf`, `dispatchedTaskId` and `isRunScriptCall` from the two panel helpers; the band hook returns `next(e)` when no run is active; the button opens the pane with the open call of the panel identifiers block, `closeOnEscape: true` included; the pane id, the labels and the no-run text match the panel identifiers block; the `Agent` hook adds the id `dispatchedTaskId` returns to the running set and redraws before it awaits `next(e)`, and refreshes the run after that call returns; the `Bash` hook refreshes the run after `next(e)` returns when `isRunScriptCall` is true; both `tool.call` hooks return the result of `next(e)` unchanged; a failed list of `docs/<runs>/` counts as no candidate, so the band hook returns `next(e)`; a failed read of `.claude/viber.yml` or of a run's `status.md` is passed on as `null`; a run directory whose `plan.md` cannot be read is skipped; no file error escapes a hook; the clock refresh runs every 15000 ms; the pane draws `No active viber run.` when no run is active; `viber/hooks/hooks.json` declares `modules` as `["./register.tsx"]` with its `hooks` block identical to commit 9883f8fc; its `description` still holds `schema note` and `planning.plain-plan-review`; its `description` names the task panel module `register.tsx`
<!-- /TASK -->

<!-- TASK -->
### T5 - Describe the task panel on viber's help page
- TDD: none
- Covers: #9
- Uses: C3
- Depends-on: T4
- Files: viber/skills/setup/assets/help.html
- Delivers: an English and Polish description of the task panel on viber's help page.
- Verification: grep -c "viber tasks" viber/hooks/register.tsx viber/skills/setup/assets/help.html && node --test tests/viber/help.unit.test.ts -> every grep count at least 1 and every test passes
- DoD: `help.html` names the `viber tasks` button and pane in an English block and its Polish pair; `tests/viber/help.unit.test.ts` passes
<!-- /TASK -->

## Contracts

### C1 - Run state

File: viber/hooks/panel/run-state.ts

```ts
export type PlanTask = { id: string; title: string }
export type Deferral = { id: string; path: string }
export type RunStatus = { done: string[]; skipped: string[]; deferred: Deferral[] }
export type RunCandidate = { key: string; plan: string; status: string | null }
export type ActiveRun = { key: string; tasks: PlanTask[]; status: RunStatus }
export type TaskState = 'done' | 'skipped' | 'running' | 'pending'
export type PanelRow = { id: string; title: string; state: TaskState; deferred: string[] }
export type Panel = { key: string; rows: PanelRow[]; done: number; total: number }

export function runsDirectory(viberYml: string | null): string
export function isCleanupOn(viberYml: string | null): boolean
export function planTasks(plan: string): PlanTask[]
export function runStatus(status: string | null): RunStatus
export function activeRun(candidates: RunCandidate[], cleanup: boolean): ActiveRun | null
export function panelOf(run: ActiveRun, running: string[]): Panel
```

### C2 - Run events

File: viber/hooks/panel/run-events.ts

```ts
export function dispatchedTaskId(subagentType: string | undefined, prompt: string | undefined): string | null
export function isRunScriptCall(command: string): boolean
```

### C3 - Panel identifiers

File: viber/hooks/register.tsx

- pane id: `viber-tasks`
- pane title: `viber tasks`
- the button opens the pane with `$.ui.open({ id: 'viber-tasks', title: 'viber tasks', focus: true, closeOnEscape: true })`
- button label: `viber tasks <done>/<total>`
- pane text with no active run: `No active viber run.`
- pane row: `<id> - <title>  <state>`, `<state>` one of `done`, `skipped`, `running`, `pending`, then one line `deferred: <path>` per deferred path
- files read, relative to the session's working directory: `.claude/viber.yml`, the entries of `docs/<runs>/`, and `docs/<runs>/<key>/plan.md` and `docs/<runs>/<key>/status.md` of each run directory
- refresh period: 15000 ms

### C4 - Hooks module declaration

File: viber/hooks/hooks.json

```json
"modules": ["./register.tsx"]
```

A top-level key beside `description` and `hooks`; the path is relative to `hooks.json`.

### C5 - status.md lines the panel reads

File: none

```
done: <id> <id> ...        | done: none
skipped: <id> <id> ...     | skipped: none
deferred: <id>:<path> ...  | deferred: none
```

Entries are separated by single spaces; `none` means the list is empty; a `deferred:` entry splits at its first colon into task id and path. Every other line (`# status`, `progress:`, `unreviewed:`, `closed:`, `decision:`, blank) is ignored. Written by `viber/scripts/commit-task.sh` only.

### C6 - viber.yml keys the panel reads

File: none

```yaml
directories:
  runs: <name>       # default _specs
build:
  cleanup: true      # on only for true, any letter case
```

A group is a column-0 `<group>:` line and runs up to the next column-0 key (a blank line or a column-0 comment keeps it open). Any indented key line inside the group, at any depth, is a key of that group, except the lines of `build:`'s `extensions:` map; the first assignment wins; a value is cut at the first space or `#`; a CR is never part of a value. A key outside its group is not that key. `cleanup` is on only when its value is `true` in any letter case. `runs` must match `[A-Za-z0-9._-]+` and be neither `.` nor `..`, otherwise `_specs`. An absent file means `_specs` and cleanup off. This mirrors `viber/scripts/config.sh` (`group_value` and the switch reader) for the main file; `viber.local.yml` sets neither key.
