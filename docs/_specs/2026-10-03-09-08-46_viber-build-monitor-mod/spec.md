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
