# Build monitor - the function-hook module

`monitor/register.tsx` is the one module in `hooks.json` `modules`: a read-only status line, a
`viber-build` pane (command `/viber-build`) and toasts for a running build, on only when
`config.sh` resolves `build.monitor: true` (key absent = off, schema 2 files included). It needs
Claude Code 2.1.287 or later, which `README.md`, `help.html` and the template comment name; keep
the `hooks.json` description in step with the register.tsx header.

## Files

- `monitor/monitor.ts` - pure logic (parse script stdout and a dispatch prompt, pick the run, status
  text, panel rows, events, toast texts). It imports nothing from the engine, so `node --test`
  loads it (`tests/viber/monitor.test.ts`); keep it that way.
- `monitor/register.tsx` - the engine layer, proven only by `claude plugin test`
  (`tests/viber/monitor/register.test.tsx`, run on a copy by `tests/viber/monitor-engine.test.ts`).
- `monitor/state.d.ts` - the session state contract, named by `plugin.json` `types`. It is
  self-contained and its types are `Viber*`: inside `declare module 'claude-code'` a bare `Tier`
  binds to the engine's plugin tier. A new `$.state` key changes it, `monitor.ts` and the test world.

## Contracts

- Run state is read only through `config.sh`, `plan-path.sh` and `plan-index.sh`, never parsed from
  `viber.yml`, the plan or `status.md`; `plan-index.sh` runs WITHOUT `--split` (that form writes and
  commits) and every call carries `GIT_OPTIONAL_LOCKS=0`. Their stdout labels are the monitor's
  input: renaming one breaks it silently.
- Every hook returns `next(e)` unchanged and never waits on a refresh (work runs in the background).
  The engine rejects a module that shadows `on` or `$`: helpers take `$` as a parameter.
- Tracked: `viber:task-coder` and `viber:task-reviewer` spawns, matched by their prompt's `task:`
  path as written (repo-relative; backslashes normalized), against `RunIndex.plan`. Another agent
  or the repair coder names no task and counts for nothing.
- `attempts` and `tiers` are keyed `<plan>#<id>`. An in-flight task overrides its index state in
  the panel; flights of another plan drop out.
- `pickRun` drops a settled run, so when another unsettled run exists the view switches and
  `diffEvents` across two plans yields nothing: no build-end toast. `refresh` therefore diffs the
  observed run's own previous index against its settled index (archived run: against none).
- Toasts fire only while `observed`; a run that settles in one refresh toasts its last task-done,
  then the build end. `AskUserQuestion` toasts only once a build is observed: a question before the session's
  first dispatch raises none.
- The layout is a closure variable fed by a matcher-less `ui.render` recorder registered first, not
  an atom; only a literal `isFullscreen: true` opens the pane, and the first coder dispatch
  consumes `autoOpened` whatever the layout was.
- The 30 s clock starts on the first dispatch and stops once a refresh finds no view; a hot reload
  drops it and `session.start` restarts it while `observed`.

## Tests

- Every `$` call the module makes needs a hook beneath it in the test world's `worldOf`: add the
  matching `on(...)` with the call. Background work settles on `world.clock.settle()`.
- The pane test finds rows by `{ type: 'Text', text: /regex/ }`: a `key` is not kept in the tree.
- Without a `claude` of 2.1.287 or later the engine layer is one skipped test, so a green CI proves
  `monitor.ts` only.
