# tests/viber/ - viber's script suite

One file per viber script (the six under `skills/code-auditor/scripts/` included), plus
`help.test.ts` and `profiler.test.ts` (no script). Every fixture helper is local to its
file: plan, status and run-directory builders (`planBody`, `seed`, `sourcePlan`, `seedRun`,
`withBranchRepo`) are hand-built per file, so a plan or `status.md` format change moves the
builders of `plan-index`, `plan-path`, `commit-task` and `archive-run` together.

## How each script is run

- The six `#!/bin/sh` scripts (`issue-create`, `issue-facts`, `issue-templates`,
  `post-comment`, `pr-facts`, `pr-create`) run every case under `forEachShell("posix")` through `opts.shell`, never
  executed directly. `commit`, `commit-args`, `commit-context`, `commit-selfcheck` and one
  `switch-text` case run under `forEachShell("bash")`; every other file runs its bash script once (the code-auditor suites: below).
- `commit-args.sh` is a sourced library: its test drives it through a generated bash wrapper
  printing `COMMIT_MODE` / `COMMIT_PATHS` (joined with `|`) / `COMMIT_ISSUE_REFS`.
- Every `!` preload script's test (`config`, `bootstrap`, `check-playwright`, `handoff-path`,
  `memory-map`, `rules-map`, `run-clock`, `switch-text`) expects exit 0 from the preload mode
  on every data condition; `plan-gate`, `plan-hints` and `kill-guard` assert exit 0 on every case.

## Reach beyond a file's own script

- `run-branch.sh` has no file of its own: `plan-path.sh` sources it, and `plan-path.test.ts`'s
  branching cases exercise it. `config.sh` is also run by `switch-text.sh`, `issue-templates.sh`,
  `pr-facts.sh`, `run-branch.sh` (`--branching`) and, for one case, `bootstrap.test.ts`.
- `bootstrap.test.ts` binds the template's key list to its `schema:` number (`SCHEMA_KEYS`): a
  key added to `templates/viber.yml` without a new number and a recorded list fails it.
- `plan-index.test.ts` reads `skills/planner/templates/`: `spec-lite.md` and `spec-full.md` must
  each carry the four anchor lines `## Goal`, `## Acceptance criteria`, `### File map`,
  `### Out of scope`, and no `plan.md` sits there beside `tasks.md`.
- `merge-settings.test.ts` asserts the shape of `skills/setup/templates/settings.json`;
  `bootstrap.test.ts` reads `templates/gitignore.txt` and `templates/viber.yml`.
- `commit-context.test.ts` lifts the fenced `!` block out of `skills/commit/SKILL.md`,
  substitutes `$ARGUMENTS` and `${CLAUDE_PLUGIN_ROOT}` as Claude Code does, and asserts it is one
  literal line calling `commit-context.sh`.
- `session-start.test.ts` and `plan-hints.test.ts` derive their expectation from the shipped
  `hooks/content/manifest.md` / `plan-hints.md`, so filling or emptying either stays green.

## code-auditor suites

`check_node`, `collect_signals`, `collect_edges`, `rank`, `rank_edges`, `worktree` and
`profiler` (the `git log` block of `viber/agents/profiler.md`, lifted verbatim) drive
`skills/code-auditor/scripts/` as real subprocesses. Each file's header states the CLI contract it
pins: change the header with the contract.

- The skill calls every script through an interpreter, so the tests do too, through `opts.shell`,
  never executing the file directly: `collect_signals.sh` ships mode `100644`. `check_node.sh`,
  `worktree.sh` (`#!/bin/sh`): `forEachShell("posix", ...)`; `collect_signals.sh`,
  `collect_edges.sh` and the profiler block (bash): `forEachShell("bash", ...)`. Each file wraps
  this in its own `assertPosix`/`assertBash`, asserting every `ShellSkip` carries the expected kind
  and a reason.
- `rank.ts` and `rank_edges.ts` call `main()` at module load with no CLI guard: never `import`
  them, run them only through `runScript`, inside `withTempDir`.
- History-dependent cases (`collect_signals`, `collect_edges`, `profiler`) back-date commits with a
  per-file `commitAt(repo, daysAgo, message)` setting `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` over
  `repo.env`, so window boundaries never depend on when the suite runs. It is copied per file.
- `--scope` cases pin that scoping narrows the record/pair set only: `dependents`, the counting
  literal and `fanout` stay the repo-wide values. The scope fixture carries a prefix-sharing
  sibling (`srcx/` beside `src/`) to catch a prefix match. `collect_edges.sh` with no pairs, and
  either collector over an empty scope, exit 0 with empty stdout: a valid result.
- `rank.test.ts` asserts stderr warnings in Python repr form (`{'path': 'no-impact.ts', ...}`)
  because `rank.ts` reproduces Python output byte for byte.
- `check_node.test.ts` builds its "no node" PATH by dropping every real directory holding a `node`
  binary (`node.exe`/`.cmd`/`.bat` on win32). Its version thresholds are 22.6 (strip-types flag)
  and 23.6 (plain `node`). `tests/superui/check_node.test.ts` also runs this script beside
  superui's copy and asserts identical output.
- `worktree.test.ts` passes the target root re-spelled through `slash()` as the worktree path: the
  script must reject it whatever the separator, or `remove` deletes the repo it anchors to.

## Fixture traps

- `plan-gate` and `plan-hints` build transcript lines as JS objects through `JSON.stringify`,
  never hand-escaped: both scripts read raw text with grep/sed/awk. `plan-hints.sh` copies the
  episode window and Skill grep of `plan-gate.sh`, so both files share line shapes
  (`"type":"permission-mode"`, `"name":"Skill","input":{"skill":`, `"subagent_type":`).
- A repository root a script printed is compared as a real path (`fs.realpathSync.native`, as
  `sameFile` / `repoRoot` in `handoff-path`, `plan-path`, `bootstrap`): git prints
  `/private/var/...` on macOS and a `C:/` or 8.3 short form on Windows, which `slash()` alone
  does not reconcile.
- `kill-guard` builds each payload as a JS object through `JSON.stringify`, its `agent_type` and
  `tool_input.command` set per case, and its last case reads the registration out of `hooks.json`.
- `run-clock` cases accept both N and N+1 seconds: the clock ticks during the run. The leading-zero
  case takes seconds 03-09, a loaded machine delaying the spawn; the exact `2h 14m` prefix still
  separates decimal from octal.
- `gh` is always a `withStub` or absent; `open-page` also stubs `uname` and the opener on
  `coreUtilsPath()`, so no real browser opens.

## help.test.ts contract

Every rule is a pure function with a self-check on a synthetic bad sample; a new rule gets one
too. The page `skills/setup/assets/help.html` must carry:

- `id="skill-<name>"` per `plugin.json` skill, `id="agent-<name>"` per agent, and
  `id="key-<key>"` / `id="key-<group>-<child>"` per uncommented `viber.yml` template key at
  indent 0 or 2, plus `key-branching-issue-type-mappings` (shipped commented out).
- `<span class="tag auto">` holding one `lang="en"` and one `lang="pl"` element on exactly the
  cards of `user-invocable: false` skills.
- Inside `<body>`, `lang` attributes alternating en, pl on the same tag name; every
  `/viber:<x>` naming a skill; every `href="#x"` its id; no en or em dash; no external load; each
  `id="guide-<slug>"` section carrying `class="guide"` alone; the inline script's hooks
  (`help-search`, `data-search`, `help-no-results`, `data-copy`, `beforeprint`); no orphan
  closing tag.
- Every `--fg-*` / `--bg-*` token declared as a hex color in both the light `:root` and the
  `prefers-color-scheme: dark` one, each fg on each bg at 4.5:1 or more.
