---
source: /Users/dario/Projects/p2p2.claude/docs/_specs/2026-10-03-09-08-46_viber-build-monitor-mod/plan.md
---

To build this plan you must invoke skill `viber:implementor` with `source:` path as its only argument.

# viber build monitor mod

## Goal

Give the person running a viber build a live, read-only view of it inside Claude Code: a status line, a build panel and toasts, drawn by a function-hook mod shipped in the viber plugin. The view costs no model tokens, because the mod reads the run's files and watches the build's dispatches itself, without any model reading them.

## Problem

A viber build runs unattended. Its state (progress, the tasks in flight, the tier each one runs at, attempts, rulings, deferred proofs, a question waiting for the person) exists only in the implementor's own context or in `status.md`, `rulings.md` and the task files, which the person has to open by hand. Someone who looks away from the terminal cannot tell whether the build is moving, stalled on a question, or finished. Asking the model for the state costs tokens against the person's usage limits.

## Current behaviour

viber ships four command hooks in `viber/hooks/hooks.json` (session-start manifest, plan gate, plan hints, kill guard) and no function-hook module. A build shows only the implementor's one status line per event in the transcript. `config.sh` prints every switch of `.claude/viber.yml`, and the template is at `schema: 2`.

### Must not change

- The four command hooks in `viber/hooks/hooks.json` keep loading and behaving exactly as before.
- The mod never refuses, rewrites or delays a tool call, a subagent spawn or a prompt: every hook it adds passes its event on unchanged.
- The mod writes no file and no git state; `status.md`, `rulings.md`, the plan, the implementor's dispatch lines and the stdout of `config.sh`, `plan-path.sh` and `plan-index.sh` keep their present format (only the new `build.monitor` line is added to `config.sh`).

## Behaviour

### S1 - Status line during a build [NEW]

While a build runs, the person sees one line under the prompt with the active run's progress and every task now in flight, with its role and tier.

Given `build.monitor: true` and a run with tasks neither done nor skipped
When the implementor dispatches a coder for T5 at `opus` and a reviewer for T6 at `sonnet`
Then the status line reads the run's done count over its total and names T5 coding at opus and T6 reviewing at sonnet, and a task leaves it once its subagent finishes

### S2 - Which run is shown [NEW]

Given several runs under the runs directory
When the monitor refreshes
Then it shows a run holding tasks neither done nor skipped; among several such runs the one the latest observed dispatch named, otherwise the most recently changed one; with no such run it shows nothing

### S3 - The status line follows the build [NEW]

Given a build observed in this session
When a task commit lands, or time passes while subagents work
Then the status line and the panel show the new progress without the person doing anything

### S4 - Build panel on demand [NEW]

Given `build.monitor: true`
When the person types `/viber-build`, at any terminal width, also while a build turn is running
Then a pane opens listing every task of the active run with its title, state (done, skipped, todo, coding, reviewing), last coder tier, attempts this session and deferred paths, followed by the run's decisions and rulings

### S5 - Panel opens by itself only as a sidebar [NEW]

Given a session in which no coder dispatch was seen yet
When the first coder dispatch of the session arrives
Then in a fullscreen terminal the panel is opened on its own as an unasked pane, which Claude Code draws beside the transcript from 144 columns (narrower, it waits undrawn until the terminal widens); in a non-fullscreen layout nothing opens and only the status line shows

### S6 - Toasts [NEW]

Given a build observed in this session
When a task commit lands, the arbiter's ruling is recorded, the run becomes fully settled or is archived, or the build asks the person a question
Then a toast names the event: the task id with the new progress, the ruling's subject, the build's final count, or that the build is waiting for an answer

### S7 - Switch on by default, off on request [NEW]

Given a project set up with the new `viber.yml` template
When the person reads the template, help page or README
Then `build.monitor` is on, explained in English and Polish, together with the Claude Code version the monitor needs; and with `build.monitor: false`, or the key absent, no status line, no panel, no `/viber-build` command and no toast appear

### S8 - The monitor never interferes [NEW]

Given the monitor loaded beside viber's command hooks
When a build, the plan gate and the kill guard run
Then each behaves as without the monitor, and the monitor changes no file

### Edge cases

- The active run's plan is malformed -> the monitor shows nothing for that run and no error appears in the transcript.
- A dispatch of any other agent, or the repair coder's dispatch, which names no task -> it does not count as in flight or as an attempt.
- A session resumed in the middle of a build -> attempts start at zero and nothing is shown in flight until the next dispatch, as the implementor's own attempt count does.
- No runs directory, no plan in it, or a session outside a git repository -> nothing is shown and nothing fails.
- viber's scripts cannot be started on the machine -> nothing is shown and nothing fails.
- A run already settled when the session starts -> no build-end toast for it.
- A question asked before the first dispatch of the session (the implementor's landing questions) or with no build observed -> no question toast.
- A `.claude/viber.yml` at `schema: 2`, which has no `build.monitor` key -> the monitor is off until `/viber:setup` merges the new key in, prompted by the existing schema note.

## Glossary

- Monitor - the read-only mod this plan adds; not a hook that gates or changes anything.
- Active run - the one run the monitor shows, chosen by S2; not necessarily the run the implementor builds when the person runs two at once.
- In flight - a coder or reviewer subagent spawned in this session whose run has not ended yet.
- Attempt - one coder spawn for a task in this session, as the monitor counts it; it does not follow the implementor's own exceptions to attempt counting.
- Observed - at least one coder or reviewer dispatch for the active run was seen in this session and the run is not yet settled.
- Settled - every task of a run is done or skipped.

## Acceptance criteria

1. With `build.monitor: true`, during a build the status line shows the active run's done count over its total and every in-flight task with its role and tier; with no active run it shows nothing.
2. The active run is chosen as S2 states: a run with unsettled tasks, the latest observed dispatch's run first, otherwise the most recently changed one.
3. The view refreshes by itself after every task commit and periodically while a build is observed.
4. `/viber-build` opens the build panel at any width, also during a running turn, listing every task with title, state, last coder tier, attempts and deferred paths, then the run's decisions and rulings.
5. On the first coder dispatch of a session the panel is opened by itself only in a fullscreen layout, as an unasked pane that Claude Code draws from 144 columns; in a non-fullscreen layout it is not opened.
6. A toast appears when a task commit lands, when a ruling is recorded, when the run settles or is archived, and when the build asks the person a question; no toast appears with no build observed.
7. With `build.monitor` false or absent there is no status line, no panel, no `/viber-build` command and no toast.
8. The `viber.yml` template ships `build.monitor: true` at `schema: 3`, the switch is documented in `help.html` (English and Polish, enforced by its test) and in `viber/README.md`, and the README names the Claude Code version the monitor needs.
9. The monitor writes nothing, passes every event it hooks on unchanged, and the four command hooks in `hooks.json` still load beside it.
10. Every edge case above shows nothing and raises no error where it says so.
11. The monitor's logic is proven by `node --test` in CI; its engine layer is proven by `claude plugin validate` and `claude plugin test` on a copy under `.temp/` where a `claude` binary of version 2.1.287 or later exists, and is reported as one skipped test otherwise.

## Scope

### File map

- modify - viber/scripts/config.sh - parses and prints the new `build.monitor` switch
- modify - viber/skills/setup/templates/viber.yml - ships `build.monitor: true` with its comment, `schema: 3`
- modify - viber/skills/setup/assets/help.html - documents the switch, the panel command and the toasts, English and Polish
- modify - viber/README.md - switch table row and the Claude Code version the monitor needs
- modify - tests/viber/config.test.ts - the new key in every full config block it asserts, plus its own cases
- modify - tests/viber/bootstrap.test.ts - the schema 3 key set
- add - viber/hooks/monitor/monitor.ts - the monitor's pure logic: parsing script output and dispatch prompts, choosing the run, the status text, the panel rows, the events and toast texts
- add - tests/viber/monitor.test.ts - unit tests of monitor.ts under `node --test`
- add - viber/hooks/monitor/register.tsx - the engine layer: hooks, refresh, status line, pane, command, toasts
- add - viber/hooks/monitor/state.d.ts - the self-contained type contract of the monitor's session state
- modify - viber/hooks/hooks.json - names the module beside the command hooks and describes it
- modify - viber/.claude-plugin/plugin.json - names the state type contract
- add - tests/viber/monitor/register.test.tsx - engine tests run by `claude plugin test` (not matched by the `node --test` glob)
- add - tests/viber/monitor-engine.test.ts - copies the plugin and the engine tests under `.temp/viber/monitor-engine/`, runs `claude plugin validate` and `claude plugin test` there, removes the copy, skips with a note without a `claude` of 2.1.287 or later

### Out of scope

- The plan gate state, sound, and moving the plan gate or the kill guard onto the mod.
- Any change to the implementor, its dispatch lines, `status.md`, `rulings.md`, `plan-path.sh`, `plan-index.sh` or `commit-task.sh`.
- `viber/scripts/switch-text.sh` and `tests/portability.test.ts` `SWITCH_VALUES`: no skill preloads a fragment for `build.monitor`.
- `viber.local.yml` overrides: `build.monitor` is not one of its overridable keys.
- `tests/viber/help.test.ts`, `bootstrap.sh`, `session-start.sh`: they derive keys and schema numbers generically and keep working unchanged; the help test already enforces a `key-build-monitor` entry once the template holds the key.
- Windows: the monitor is not verified there; the person checks it by hand after the build.

## Solution requirements

- Claude Code 2.1.287 or later runs the monitor (the documented minimum for mods). No safeguard is added for older builds: the hooks reference documents unknown keys as ignored, 2.1.285 validated the mixed `hooks.json`, and 2.1.288 fired a command hook and a module from one file; builds below 2.1.285 stay untested, and the README names the minimum.
- Loading the monitor from a marketplace install is verified by hand after the build: a local marketplace install of this repository's viber, then a session showing the status line; the build's final summary names it as pending.
- The monitor reads run state only through viber's own scripts, the subagent lifecycle and the change times of each candidate run's `plan.md` and `status.md` (C3, C4): it never parses `viber.yml`, the plan or `status.md` itself.
- The monitor never holds up the build: it never takes a git lock a task commit could collide with, and no hook waits for a refresh before passing its event on.
- `monitor.ts` stays loadable by `node --test` directly, with no engine import.
- Every bash script stays compatible with Git Bash and macOS bash 3.2; no new bash script is added.

## Tasks

<!-- TASK -->
### T1 - Add the build.monitor switch
- TDD: required
- Covers: #7, #8
- Uses: C1
- Depends-on: none
- Files: viber/scripts/config.sh, viber/skills/setup/templates/viber.yml, viber/skills/setup/assets/help.html, viber/README.md, tests/viber/config.test.ts, tests/viber/bootstrap.test.ts
- Delivers: the `build.monitor` switch: printed by `config.sh`, shipped on in the template at schema 3, documented for people in help.html (whose test already demands a `key-build-monitor` entry for every template key) and the README with the monitor's status line, `/viber-build` panel, toasts and its minimum Claude Code version.
- Verification: node --test tests/viber/config.test.ts tests/viber/bootstrap.test.ts tests/viber/help.test.ts && grep -n "monitor" viber/skills/setup/templates/viber.yml viber/README.md && grep -n "2.1.287" viber/README.md -> every test passes, including the new `build.monitor` cases, and both greps print a line from each named file
- DoD: `config.sh` prints `build.monitor: true` for a config holding `build.monitor: true`, proven by a case in tests/viber/config.test.ts; `config.sh` prints `build.monitor: false` when the key is absent or the file is missing, proven by a case in tests/viber/config.test.ts; the template holds `schema: 3` and `build.monitor: true` under `build:`, proven by tests/viber/bootstrap.test.ts; help.html carries the `key-build-monitor` entry in English and Polish, proven by tests/viber/help.test.ts passing; viber/README.md names `build.monitor` in its switch table, proven by the grep matching both the template and the README; viber/README.md names the Claude Code version 2.1.287, proven by the second grep
<!-- /TASK -->

<!-- TASK -->
### T2 - Compute the monitor view from script output and dispatches
- TDD: required
- Covers: #1, #2, #4, #6
- Uses: C2, C3, C4
- Depends-on: none
- Files: viber/hooks/monitor/monitor.ts, tests/viber/monitor.test.ts
- Delivers: the monitor's pure logic: reading the stdout of `plan-path.sh` and `plan-index.sh`, reading a coder or reviewer dispatch, choosing the active run, the status line text, the panel rows, the events between two views and their toast texts.
- Verification: node --test tests/viber/monitor.test.ts -> every test passes
- DoD: `parseIndex` returns the title, progress, every task row with id, state and title, the skipped, deferred, decision and ruling lines from a `plan-index.sh` sample, and `undefined` for empty input; `parseRunList` returns the `path:` plan and every `open:` plan from a `plan-path.sh` sample, and an empty list for empty input; `parseDispatch` returns plan, task id, role and tier for a `viber:task-coder` and a `viber:task-reviewer` prompt, and `undefined` for another subagent type or a prompt with no `task:` line; `pickRun` returns the latest dispatch's run when it is unsettled, otherwise the unsettled candidate with the newest change time, otherwise `undefined`; `statusLine` renders progress and every in-flight task with role and tier, and returns `undefined` with no index; `panelRows` marks an in-flight task coding or reviewing and carries its last coder tier, attempts and deferred paths; `diffEvents` yields `task-done` for each newly done id, `ruling` for each new ruling, `build-end` when the run turns settled or disappears, and nothing when the previous view is absent or already settled; `toastText` returns one line for each event kind, `question` included; tests/viber/monitor.test.ts imports monitor.ts directly and the file carries no engine import
<!-- /TASK -->

<!-- TASK -->
### T3 - Show the build status line from the live build
- TDD: required
- Covers: #1, #2, #3, #7, #9, #10, #11
- Uses: C1, C2, C3, C4, C5
- Depends-on: T1, T2
- Files: viber/hooks/monitor/register.tsx, viber/hooks/monitor/state.d.ts, viber/hooks/hooks.json, viber/.claude-plugin/plugin.json, tests/viber/monitor/register.test.tsx, tests/viber/monitor-engine.test.ts
- Delivers: the loaded mod: on session start it reads `build.monitor` through `config.sh` and stays silent unless it is `true`; otherwise it tracks coder and reviewer spawns and their completion, refreshes the active run at session start, at every such spawn and completion, after every Bash call running `commit-task.sh` and periodically while a build is observed, keeps the view in session state and pins the status line; plus the test runner proving it under `claude plugin test`.
- Verification: node --test tests/viber/monitor-engine.test.ts -> passes; where `claude --version` is 2.1.287 or later it reports `claude plugin validate` and `claude plugin test` passing on the copy under `.temp/viber/monitor-engine/`, otherwise exactly one skipped test naming the reason
- DoD: with `build.monitor: true` a coder spawn for an unsettled run pins a status line naming that task, its role and tier, proven in tests/viber/monitor/register.test.tsx; the task leaves the status line when its subagent's run completes, proven in tests/viber/monitor/register.test.tsx; a Bash call whose command runs `commit-task.sh` triggers a refresh once its result returns and the status line shows the new progress, proven in tests/viber/monitor/register.test.tsx; while a build is observed the view refreshes on the clock, proven on the test kit's mocked clock in tests/viber/monitor/register.test.tsx; with `build.monitor: false` no status line is pinned, proven in tests/viber/monitor/register.test.tsx; `git rev-parse` failing (outside a repository), `plan-path.sh` exiting 3, `plan-index.sh` exiting non-zero and a script failing to start each leave no status line and no failed hook, proven in tests/viber/monitor/register.test.tsx; a session start with no spawn seen shows no in-flight task, proven in tests/viber/monitor/register.test.tsx; with no dispatch seen and two unsettled runs the one whose `plan.md` or `status.md` changed last is shown, proven in tests/viber/monitor/register.test.tsx; every script run carries `GIT_OPTIONAL_LOCKS=0` in its environment, proven in tests/viber/monitor/register.test.tsx; the spawn and completion hooks return what `next` returned without waiting for the refresh they start, proven in tests/viber/monitor/register.test.tsx; every hook the mod adds resolves to what `next` returned for the unchanged event, proven in tests/viber/monitor/register.test.tsx; `claude plugin validate` on the copy passes and reports no `fs.write` call, proven by tests/viber/monitor-engine.test.ts; hooks.json still holds the four command hooks beside `modules`, proven by tests/viber/monitor-engine.test.ts; the copy under `.temp/viber/monitor-engine/` is removed after the run, proven by tests/viber/monitor-engine.test.ts; the runner's version gate gives a skip reason for `2.1.285` and for a missing binary and none for `2.1.288`, proven by a case in tests/viber/monitor-engine.test.ts
<!-- /TASK -->

<!-- TASK -->
### T4 - Open the build panel by command
- TDD: required
- Covers: #4, #7
- Uses: C2, C5, C6
- Depends-on: T3
- Files: viber/hooks/monitor/register.tsx, tests/viber/monitor/register.test.tsx
- Delivers: the `/viber-build` command, runnable during a turn, opening the build panel that draws the panel rows, decisions and rulings of the active run on every surface.
- Verification: node --test tests/viber/monitor-engine.test.ts -> passes; where `claude --version` is 2.1.287 or later `claude plugin test` reports the panel cases passing on `terminal` and `desktop`
- DoD: `/viber-build` is registered with `build.monitor: true` and not registered with it false, proven in tests/viber/monitor/register.test.tsx; it is registered as `immediate`, proven in tests/viber/monitor/register.test.tsx; running it opens the `viber-build` pane, proven in tests/viber/monitor/register.test.tsx; the pane draws every task row with state, tier, attempts and deferred paths, then decisions and rulings, on `terminal` and `desktop`, proven in tests/viber/monitor/register.test.tsx
<!-- /TASK -->

<!-- TASK -->
### T5 - Open the build panel as a sidebar at build start
- TDD: required
- Covers: #5, #7, #9
- Uses: C5, C6
- Depends-on: T4
- Files: viber/hooks/monitor/register.tsx, tests/viber/monitor/register.test.tsx
- Delivers: the panel opening by itself, once per session, on the session's first coder dispatch, as an unasked pane and only when the layout the surface last reported while drawing is fullscreen; none with the switch off.
- Verification: node --test tests/viber/monitor-engine.test.ts -> passes; where `claude --version` is 2.1.287 or later `claude plugin test` reports the sidebar cases passing
- DoD: the first coder dispatch opens the `viber-build` pane as an unasked open when the surface last reported a fullscreen layout, proven in tests/viber/monitor/register.test.tsx; it opens nothing when the surface reported a non-fullscreen layout or none, proven in tests/viber/monitor/register.test.tsx; a later coder dispatch in the same session opens nothing again, proven in tests/viber/monitor/register.test.tsx; with `build.monitor: false` a first coder dispatch on a fullscreen layout opens no pane, proven in tests/viber/monitor/register.test.tsx; the drawing hook that learns the layout returns what `next` returned for every drawing it sees, proven in tests/viber/monitor/register.test.tsx
<!-- /TASK -->

<!-- TASK -->
### T6 - Toast the build's events
- TDD: required
- Covers: #6, #7
- Uses: C2, C5
- Depends-on: T5
- Files: viber/hooks/monitor/register.tsx, tests/viber/monitor/register.test.tsx
- Delivers: a toast for every event between two refreshes of an observed build (task done, ruling, build end) and for every `AskUserQuestion` call made while a build is observed; none with no build observed or with the switch off.
- Verification: node --test tests/viber/monitor-engine.test.ts -> passes; where `claude --version` is 2.1.287 or later `claude plugin test` reports the toast cases passing
- DoD: a refresh showing a newly done task raises a toast with its id and the new progress, proven in tests/viber/monitor/register.test.tsx; a new ruling raises a toast naming its subject, proven in tests/viber/monitor/register.test.tsx; the run turning settled or disappearing raises one build-end toast, proven in tests/viber/monitor/register.test.tsx; an `AskUserQuestion` call during an observed build raises the question toast and the call itself passes unchanged, proven in tests/viber/monitor/register.test.tsx; an `AskUserQuestion` call before any dispatch of the session raises no toast, proven in tests/viber/monitor/register.test.tsx; with `build.monitor: false` none of these raises a toast, proven in tests/viber/monitor/register.test.tsx
<!-- /TASK -->

## Contracts

### C1 - build.monitor switch

File: viber/scripts/config.sh, viber/skills/setup/templates/viber.yml

```yaml
schema: 3
build:
  monitor: true   # true | false
```

`config.sh` stdout line, among the `build.` lines:

```
build.monitor: true | false     # true only for an explicit `true`; absent key or missing file -> false
```

### C2 - monitor.ts API

File: viber/hooks/monitor/monitor.ts

```ts
export type TaskState = 'done' | 'skipped' | 'todo';
export type Role = 'coder' | 'reviewer';
export type Tier = 'haiku' | 'sonnet' | 'opus' | 'fable';

export interface IndexTask { id: string; state: TaskState; title: string }
export interface RunIndex {
  plan: string;            // repo-relative plan.md path, as plan-index.sh prints it
  title: string;
  done: number;
  total: number;
  skipped: string[];       // task ids
  deferred: string[];      // "<id>:<path>" as printed
  decisions: string[];     // text after "decision: "
  rulings: string[];       // text after "ruling: "
  tasks: IndexTask[];
}
export interface RunList { newest?: string; open: string[] }     // plan.md paths
export interface Candidate { plan: string; changedMs: number; settled: boolean }
export interface Dispatch { plan: string; taskId: string; role: Role; tier?: Tier }
export interface Flight { agentId: string; dispatch: Dispatch }
export interface PanelRow {
  id: string;
  title: string;
  state: TaskState | 'coding' | 'reviewing';
  tier?: Tier;             // the last coder spawn's tier this session
  attempts: number;        // coder spawns this session
  deferred: string[];      // paths owed by this task
}
export type MonitorEvent =
  | { kind: 'task-done'; id: string; done: number; total: number }
  | { kind: 'ruling'; text: string }
  | { kind: 'build-end'; done: number; total: number }
  | { kind: 'question' };

export function parseIndex(stdout: string): RunIndex | undefined;
export function parseRunList(stdout: string): RunList;
export function parseDispatch(subagentType: string, prompt: string, model?: string): Dispatch | undefined;
export function isSettled(index: RunIndex): boolean;
export function pickRun(candidates: Candidate[], lastDispatchPlan?: string): string | undefined;
export function statusLine(index: RunIndex | undefined, flights: Flight[]): string | undefined;
export function panelRows(index: RunIndex, flights: Flight[], attempts: Record<string, number>, tiers: Record<string, Tier>): PanelRow[];
export function diffEvents(prev: RunIndex | undefined, next: RunIndex | undefined): MonitorEvent[];
export function toastText(event: MonitorEvent): string;
```

`diffEvents(prev, undefined)` with a `prev` that was not settled means the run's plan no longer exists (archived) and yields `build-end`.

### C3 - Coder and reviewer dispatch, as read

File: none

The `agent.spawn` event's `subagentType`, `model` and `prompt`, as the implementor sends them today; the subagent's run ends at the `turn.complete` carrying the `agentId` the spawn resolved:

```
subagentType: viber:task-coder | viber:task-reviewer
model:        haiku | sonnet | opus | fable
prompt line:  task: <run dir>/tasks/<id>.md
```

The run's plan is `<run dir>/plan.md`. Any other subagent type, or a prompt with no `task:` line (the repair coder's `spec:` form), is not a dispatch.

### C4 - Script output, as read

File: none

Run as `bash <plugin root>/scripts/<name>.sh` from the repository root (`git rev-parse --show-toplevel`), every run with `GIT_OPTIONAL_LOCKS=0` added to its environment so its `git status` never takes the index lock a task commit needs:

```
scripts/config.sh            -> "build.monitor: true|false" line (C1)
scripts/plan-path.sh         -> "path: <plan>", "open: <plan> | <done>/<total>" lines; exit 3 = no plan
scripts/plan-index.sh <plan> -> "title:", "progress: <done>/<total>", "skipped:", "deferred:",
                                "decision:", "ruling:" lines, then
                                "tasks: id | state | tdd | excl | deps | feeds | files | title"
                                and one "T<n> | <state> | ... | <title>" row per task;
                                without --split it writes nothing; non-zero exit = no view
```

A script that exits non-zero, cannot start, or a repository root that does not resolve means no view.

A candidate's `changedMs` is the later of the modification times of its `plan.md` and of the `status.md` beside it (absent: the plan's alone), as `plan-path.sh` judges "most recently worked on".

### C5 - Monitor session state

File: viber/hooks/monitor/state.d.ts

Self-contained: the file imports nothing and declares the shapes it needs structurally, matching C2's `RunIndex`, `Flight` and `Tier`.

```ts
interface PluginState {
  viber: {
    enabled: boolean;                    // build.monitor resolved at session start
    index: RunIndex | null;              // the active run's last refresh
    flights: Flight[];                   // in flight now
    attempts: Record<string, number>;    // "<plan>#<id>" -> coder spawns this session
    tiers: Record<string, Tier>;         // "<plan>#<id>" -> last coder tier
    lastDispatchPlan: string | null;
    observed: boolean;                   // glossary: observed
    autoOpened: boolean;                 // the panel already opened itself this session
  };
}
```

### C6 - Build panel command and pane

File: viber/hooks/monitor/register.tsx

```
command: /viber-build   description "Show the viber build panel"   immediate: true
pane id: viber-build    title "viber build"
```
