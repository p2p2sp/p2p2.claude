# tests/superfix/ - suites for superfix's code-auditor scripts and profiler agent

Every file drives a script under `superfix/skills/code-auditor/scripts/` (or the `git log` block of
`superfix/agents/profiler.md`) as a real subprocess through `runScript`. Each file's header states
the CLI contract it pins: change the header with the contract.

## How each script is run

- The skill calls every script through an interpreter, so the tests do too, through `opts.shell`,
  never executing the file directly: `collect_signals.sh` ships mode `100644`.
  - `check_node.sh`, `worktree.sh` (`#!/bin/sh`): `forEachShell("posix", ...)`.
  - `collect_signals.sh`, `collect_edges.sh` and the profiler block (`#!/usr/bin/env bash`):
    `forEachShell("bash", ...)`.
  - Each file wraps this in its own `assertPosix`/`assertBash`, asserting every `ShellSkip` carries
    the expected kind and a reason.
- `rank.ts` and `rank_edges.ts` call `main()` at module load with no CLI guard: never `import`
  them, run them only through `runScript`, inside `withTempDir`.

## Fixture conventions

- History-dependent cases (`collect_signals`, `collect_edges`, `profiler`) back-date commits with a
  per-file `commitAt(repo, daysAgo, message)` that sets `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` over
  `repo.env`, so window boundaries never depend on when the suite runs. It is copied per file, not
  a harness export.
- `--scope` cases pin that scoping narrows the record/pair set only: `dependents`, the counting
  literal and `fanout` stay the repo-wide values. The scope fixture carries a prefix-sharing
  sibling (`srcx/` beside `src/`) to catch a prefix match.
- `collect_edges.sh` with no pairs, and either collector over an empty scope, exit 0 with empty
  stdout: a valid result, never an error.
- `rank.test.ts` asserts stderr warnings in Python repr form (`{'path': 'no-impact.ts', ...}`)
  because `rank.ts` reproduces Python output byte for byte.
- `check_node.test.ts` builds its "no node" PATH by dropping every real directory holding a `node`
  binary (`node.exe`/`.cmd`/`.bat` on win32), so the case holds on a machine with Node installed.
  Its version thresholds are 22.6 (strip-types flag) and 23.6 (plain `node`).
- `worktree.test.ts` passes the target root re-spelled through `slash()` as the worktree path: the
  script must reject it whatever the separator, or `remove` deletes the repo it anchors to.

## Cross-suite reach

`superfix/skills/code-auditor/scripts/check_node.sh` also reaches
`tests/superui/check_node.test.ts`, which runs it beside superui's copy and asserts identical output.
