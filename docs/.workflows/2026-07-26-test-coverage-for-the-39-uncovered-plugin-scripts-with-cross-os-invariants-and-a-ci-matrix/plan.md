# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "Test coverage for the 39 uncovered plugin scripts, with cross-OS invariants and a CI matrix"

---
<!-- HEADER -->

## Goal
Every script this repo ships - 39 currently uncovered, on top of the 5 already covered - has a regression
test under `tests/`, driven by one runner and one command, exercising each documented output line, each
documented exit code and the edge cases that only show up on another OS or another shell. A new CI workflow
proves the suite green on Linux, macOS and Windows. No test reaches the network, mutates this repo's working
tree, or can push a tag.

## Context
The repo ships 44 scripts (`git ls-files` over `*.sh`/`*.ts` outside `tests/`, minus the 3 in-plugin bash
harnesses). `tests/` today covers 5 of them with a dedicated file each - all superui TypeScript modules,
imported in-process - leaving 39 uncovered (30 shell + 9 TS, `superui/scripts/inventory-format.ts` counted
as uncovered because it is only exercised incidentally through `validate_bundle.test.ts`). The 3 ad-hoc bash
harnesses live *inside* plugin dirs, so they are installed to end users. Nothing runs any of it in CI, so the plugins' cross-OS promise (bash / zsh /
Git-Bash on macOS / Linux / Windows) is unverified. This plan extends the existing `node --test` convention
with a subprocess harness, adds a static portability sweep for invariants a green run cannot catch (exec bit,
shebang, CRLF, unquoted globs in `!` preloads, bashisms under `#!/bin/sh`), and wires a 3-OS matrix on Node
24. Multi-shell execution is scoped where it proves something: a `#!/usr/bin/env bash` script always runs
under bash whatever the user's login shell is, so it is exercised under every bash *major* present (macOS
ships 3.2, Linux and Git-Bash ship 5.x - that is where the real divergence lives), while `#!/bin/sh`
scripts go through every POSIX shell present (dash, bash-as-sh, MSYS sh) and the zsh dimension is covered
statically, on the `!` preload lines the host shell actually parses. Verified against the repo, not
assumed: `node --test tests/superui/` FAILS (a directory argument is resolved as a module path),
`node --test "tests/**/*.test.ts"` passes 31/31, a zero-match glob exits 0 with no tests run, and helper
modules under `tests/` are not collected as test files.

## Acceptance criteria
1. `node --test "tests/**/*.test.ts"` runs the whole suite from the repo root and is green; that command is
   documented in root `CLAUDE.md`.
2. `tests/harness/` exposes `runScript`, `withTempDir`, `withGitRepo`, `withStub`, `forEachShell` and
   `writePng`, carries no knowledge of any individual script under test, and is itself covered by
   `tests/harness.test.ts`.
3. Every one of the 39 uncovered scripts has coverage under `tests/` - `tests/<plugin>/` for the four
   plugins, `tests/github/` for `.github/scripts/release.sh`; for the 36 full-coverage scripts (all but
   `vendor/jpeg-decode.ts`, `sample_colors.ts` and `release.sh`, which are scoped to their boundary),
   every documented stdout marker line and every documented exit code is asserted.
4. `tests/portability.test.ts` fails if any shipped script loses its exec bit in the git index, loses its
   shebang, gains a CRLF line ending, gains a bashism under a `#!/bin/sh` shebang, or if any SKILL.md `!`
   preload passes an unquoted argument containing `?`, `*` or `[`.
5. Every `#!/bin/sh` script is exercised under each POSIX shell present on the machine, and every
   bash-shebang script under each distinct bash major present; an absent shell is skipped with a recorded
   reason, never failed.
6. No test performs network I/O, mutates this repo's working tree, or creates a tag outside a throwaway
   repo: `gh` is always a PATH stub, `node` is a PATH stub wherever a script probes its version, every
   mutating `git` call runs in a `mkdtemp` repo with `HOME`, `GIT_CONFIG_GLOBAL` and `GIT_CONFIG_NOSYSTEM`
   isolated (read-only `git` against this repo is allowed - Task 2 needs the real index and Task 17
   asserts this repo's status and tag list are untouched), and the `release.sh` test pushes only to a
   local bare remote.
7. `superdev/hooks/scripts/review-plan.test.sh`, `superdev/scripts/read-config.test.sh` and
   `superdev/skills/setup/scripts/bootstrap.test.sh` are deleted, and every case they asserted is asserted
   in `tests/superdev/`.
8. `.github/workflows/tests.yml` runs the suite on `ubuntu-latest`, `macos-latest` and `windows-latest` with
   Node 24, on push and pull_request; `.github/workflows/release-version.yml` is unchanged.
9. Root `CLAUDE.md` states, in its `tests/` entry, both the tests tree's fixtures-stay-file-local
   convention and the single `tests/harness/` mechanism-only exception to it.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - test(harness): add the shared subprocess/git/stub harness for shell-script tests
- Covers: criteria #2, #5, #6, #9
- TDD: none

### Dependencies
- none - blocks: Tasks 2-17

### Files
- add - `tests/harness/run.ts` (new dir `tests/harness/`; `RunResult`, `RunOpts`, `runScript`)
- add - `tests/harness/tmp.ts` (`withTempDir`, `withGitRepo`, `GitRepo`)
- add - `tests/harness/stub.ts` (`withStub`)
- add - `tests/harness/shells.ts` (`bashShells`, `posixShells`, `forEachShell`, `ShellSkip`)
- add - `tests/harness/png.ts` (`writePng`)
- add - `tests/harness.test.ts` (harness self-test)
- modify - `CLAUDE.md` (the `tests/` entry in "Repository layout (top level)")

### Test Commands
*Build*
- none - the repo has no build step, no lint, no package.json

*Tests*
- `node --test tests/harness.test.ts`
- `node --test "tests/**/*.test.ts"`

### Approach
1. Write `runScript(script, args = [], opts = {})` in `tests/harness/run.ts` over `spawnSync`, returning
   `{ stdout, stderr, status }` with `encoding: "utf-8"`. `opts`: `shell` (absolute interpreter path -
   when set, invoke `shell script ...args` instead of executing the script directly), `cwd`, `env`
   (merged over a sanitised base), `input` (stdin), `stubDirs` (prepended to `PATH` with
   `path.delimiter`), `timeout` (default 30000). Always invoke through an explicit interpreter on
   `process.platform === "win32"`, where a shebang is not honoured.
2. Write `withTempDir(prefix, fn)` and `withGitRepo(fn, opts)` in `tests/harness/tmp.ts`: `mkdtempSync`
   under `tmpdir()`, `try/finally` + `rmSync(dir, { recursive: true, force: true })`. `withGitRepo` runs
   `git init` (plus `--bare` when `opts.bare`) and hands back `{ dir, env, git(...args) }`, where `env`
   pins `HOME`/`USERPROFILE` to the temp dir, `GIT_CONFIG_GLOBAL` to a temp file, `GIT_CONFIG_NOSYSTEM=1`,
   `GIT_AUTHOR_*`/`GIT_COMMITTER_*` names, dates and `commit.gpgsign=false`, `init.defaultBranch=main`.
3. Write `withStub(name, body, fn)` in `tests/harness/stub.ts`: create a temp dir, write an executable
   `#!/bin/sh` file named `name` with `mode: 0o755`, and on Windows additionally write a `name.cmd`
   shim so a stub invoked by Node itself resolves; pass the dir to `fn`, clean up in `finally`.
4. Write `tests/harness/shells.ts`: `posixShells()` probes `/bin/sh`, `dash`, `busybox sh` and
   `bash --posix`; `bashShells()` probes every `bash` on `PATH` plus `/bin/bash`, deduplicating by
   reported `--version` major. `forEachShell(kind, fn)` calls `fn(shellPath)` for each hit and records a
   `ShellSkip` for each miss rather than throwing.
5. Write `writePng(width, height, rgba, opts)` in `tests/harness/png.ts` - a dependency-free encoder over
   `node:zlib` emitting IHDR/IDAT/IEND with a CRC32 table, so image-consuming scripts get real fixtures.
6. Write `tests/harness.test.ts` proving each of the six: a script echoing to both streams round-trips
   through `runScript`; `withTempDir` removes its dir; `withGitRepo` produces a repo whose `git config
   user.email` is the pinned value and whose `HOME` is not the developer's; a `withStub` binary shadows
   the real one; `forEachShell("posix", …)` yields at least one shell and never throws when one is
   absent; `writePng` output round-trips through `superui/scripts/vendor/png-decode.ts`.
7. Append two sentences to the `tests/` entry in `CLAUDE.md` (leave the existing lines intact, Task 3
   edits the same entry): fixtures, expected outputs and stub scenarios stay file-local in each
   `*.test.ts`, and `tests/harness/` is the single exception - shared *mechanism* only (subprocess, temp
   dirs, throwaway git repos, PATH stubs, shell discovery, PNG fixtures), never per-script knowledge.

### Edge cases
Script path containing a space; stdout and stderr both non-empty; a script that never exits (timeout);
`status === null` on signal kill; an empty `PATH` entry on Windows; a stub name colliding with a real
binary; `withGitRepo` must not inherit the developer's `~/.gitconfig`; `rmSync` on a read-only file created
by a script under test.

### Contracts
`RunResult = { stdout: string; stderr: string; status: number | null }`.
`RunOpts = { shell?: string; cwd?: string; env?: Record<string,string>; input?: string; stubDirs?: string[]; timeout?: number }`.
`GitRepo = { dir: string; env: Record<string,string>; git(...args: string[]): RunResult }`.
`forEachShell(kind: "bash" | "posix", fn: (shell: string) => void): ShellSkip[]`.

### DoD
`node --test tests/harness.test.ts` is green, `tests/harness/*.ts` are not collected as test files by
`node --test "tests/**/*.test.ts"`, and `CLAUDE.md` states the exception.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - test(portability): add the static cross-OS invariant sweep over every shipped script
- Covers: criterion #4
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/portability.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/portability.test.ts`

### Approach
1. Enumerate shipped scripts from the git index via `runScript("git", ["ls-files", "-s", …])` over `*.sh`
   and `*.ts` outside `tests/`, parsing mode + path.
2. Assert per script: a shebang on line 1; no `\r\n` anywhere in the file; the exec bit `100755` for every
   script the repo invokes without an interpreter, derived by grepping every `SKILL.md` and
   `superdev/hooks/hooks.json` for the invocation and classifying it as bare vs `bash …`/`sh …`/`node …`.
3. Assert on every `` ! `…` `` preload line and every ` ```! ` block found in `**/SKILL.md`: any argument
   token containing `?`, `*` or `[` is single-quoted (the zsh `nomatch` class that aborts a whole fork
   load), and `${CLAUDE_PLUGIN_ROOT}`/`${CLAUDE_SKILL_DIR}` are double-quoted.
4. Assert no bashism in any `#!/bin/sh` script: `[[`, `((`, arrays `=(`, `local -`, `<<<`, `${var//`,
   `${BASH_`, `function ` - matched line-wise with comment lines stripped.
5. Report every violation as one assertion message naming file and line, so one broken script does not
   mask the rest.
6. Make each detector a local pure function taking file text (or a mode + path pair) and returning
   violations, and add a self-check test per detector that feeds it a synthetic bad sample - a CRLF line,
   a missing shebang, a `100644` mode on a bare-invoked path, an unquoted `'?plan'`, a `[[` under
   `#!/bin/sh` - and asserts it fires. That keeps the red side proven without a manual `chmod`.

### Edge cases
A script with a shebang but no trailing newline; a `.ts` module with no shebang (allowed - it is imported,
never executed); `superui/scripts/vendor/*.ts` excluded from the bashism and shebang rules; a `!` preload
argument legitimately containing `*` inside a double-quoted string; `git ls-files` run from a subdirectory.

### Contracts
none

### DoD
`node --test tests/portability.test.ts` is green on the current tree, and every detector has a paired
self-check case proving it fires on a synthetic violation.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - ci: run the test suite on Linux, macOS and Windows with Node 24
- Covers: criteria #1, #8
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `.github/workflows/tests.yml`
- modify - `CLAUDE.md` (the `tests/` entry in "Repository layout (top level)")

### Test Commands
*Build*
- none

*Tests*
- `node --test "tests/**/*.test.ts"`

### Approach
1. Add `.github/workflows/tests.yml`: triggers `push` and `pull_request`, job `Tests` with
   `strategy.fail-fast: false`, `matrix.os: [ubuntu-latest, macos-latest, windows-latest]`,
   `runs-on: ${{ matrix.os }}`, `defaults.run.shell: bash` so the quoted glob is passed to Node
   unexpanded on every OS.
2. Steps: `actions/checkout@v6` with `fetch-depth: 0` (the `release.sh` and `collect_signals.sh` tests
   need real history), `actions/setup-node@v5` with `node-version: 24`, then a guard step
   `count=$(git ls-files 'tests/**/*.test.ts' | wc -l); [ "$count" -gt 0 ]`, then
   `run: node --test "tests/**/*.test.ts"`.
3. The guard step is mandatory, not defensive dressing: verified in this repo, a glob matching zero files
   makes `node --test` report 0 tests and exit 0, so a mistyped path would turn the whole matrix green
   while running nothing.
4. Do not touch `.github/workflows/release-version.yml`; the new workflow runs on GitHub-hosted runners,
   not the `self-hosted` runner that workflow pins.
5. In the `tests/` entry of `CLAUDE.md`, replace only the bare `` `node --test` `` command string with the
   verified whole-suite form `` `node --test "tests/**/*.test.ts"` `` and add that a bare directory
   argument does not work. Targeted string replacement, not a rewrite of the entry - Task 1 step 7 has
   already appended the harness-convention sentences to the same entry and they must survive.

### Edge cases
Windows checkout converting LF to CRLF - Task 2's line-ending invariant runs inside the matrix and is what
catches it. A shell other than bash on Windows would expand the glob before Node sees it, hence the pinned
`defaults.run.shell: bash`.

### Contracts
none

### DoD
The workflow file parses as valid YAML, names exactly the three OSes and Node 24, and running
`node --test "tests/**/*.test.ts"` locally reproduces the CI command verbatim.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - test(superdev): cover read-config.sh and resolve-input.sh, retiring the in-plugin harness
- Covers: criteria #3, #7
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superdev/read-config.test.ts` (new dir `tests/superdev/`)
- add - `tests/superdev/resolve-input.test.ts`
- delete - `superdev/scripts/read-config.test.sh`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superdev/read-config.test.ts`
- `node --test tests/superdev/resolve-input.test.ts`

### Approach
1. Port all 5 cases of `superdev/scripts/read-config.test.sh` into `read-config.test.ts` via `runScript`
   with `cwd` set to a `withTempDir` project root, then delete the `.sh` file.
2. Extend `read-config.test.ts`: absent `.claude/superdev.yml`; every key false; keys in a different order
   than the fixed output order; `adr:true` without a space; `adr : true`; `adr: TRUE`; a commented
   `# adr: true`; a CRLF-authored yml; a key appearing twice; output order is always
   `adr`, `rules`, `memory`, `docs`; exit is always 0.
3. Write `resolve-input.test.ts` against `superdev/scripts/resolve-input.sh`: happy path with two labels;
   an optional `'?plan'` label absent; an optional label present but its file missing; a required label
   missing; a required label present but its file missing - asserting stdout is *only* the `## INPUT ERROR`
   block with zero file content and exit 0; no labels at all - exit 1 with the usage line on stderr.
4. Add the label-parsing edge cases: a label value with leading/trailing spaces; a CRLF args block; the
   same label twice (first wins); a value containing a space; an empty args block with a required label;
   a label whose value is a directory, not a file.

### Edge cases
`value_of` interpolates the label into a `sed` expression, so a label containing `/` or `&` is a real risk -
assert the observed behaviour rather than assuming it is safe. Empty `$ARGUMENTS`. A file with no trailing
newline (the script appends one). A UTF-8 path.

### Contracts
`resolve-input.sh <args-block> <label|?label>...` → stdout `## <label> (<path>)` + file body per label, or
a sole `## INPUT ERROR` block; exit 0 always except exit 1 when called with no labels.

### DoD
Both test files green; `superdev/scripts/read-config.test.sh` no longer exists; `git grep -c` finds no
reference to it.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - test(superdev): cover the review-plan and session-start hooks, retiring the in-plugin harness
- Covers: criteria #3, #7
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superdev/review-plan.test.ts`
- add - `tests/superdev/session-start.test.ts`
- delete - `superdev/hooks/scripts/review-plan.test.sh`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superdev/review-plan.test.ts`
- `node --test tests/superdev/session-start.test.ts`

### Approach
1. Port every case of `superdev/hooks/scripts/review-plan.test.sh` into `review-plan.test.ts`: build the
   JSONL transcript fixture in a `withTempDir`, feed the PreToolUse JSON on `input`, parse stdout as JSON
   and assert `hookSpecificOutput.permissionDecision`. Delete the `.sh` file.
2. Extend with the fail-open matrix: transcript path absent; transcript unreadable; transcript not valid
   JSONL; no `VERDICT:` line anywhere; `VERDICT: FAIL`; `VERDICT: PASS` but no SimplePlan/SuperPlan format
   declaration in the plan; both present; `.claude/plans/` empty; multiple plan files. Every case must
   exit 0 and emit parseable JSON - a hook that exits non-zero or prints non-JSON is the failure mode
   under test.
3. Write `session-start.test.ts`: manifest present → `additionalContext` equals the manifest bytes
   verbatim and `systemMessage` carries the version; manifest unreadable (point `CLAUDE_PLUGIN_ROOT` at an
   empty temp dir) → `additionalContext` absent but `systemMessage` still present, exit 0; `source:
   "resume"` on stdin; malformed stdin JSON; empty stdin.

### Edge cases
A manifest containing characters that must survive JSON encoding (backslash, quote, newline, a non-ASCII
character). A transcript with CRLF lines. A very long transcript (the hook has a 10 s timeout in
`hooks.json`). stdin closed immediately.

### Contracts
PreToolUse stdout: `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"|"deny","permissionDecisionReason":string}}`.
SessionStart stdout: `{"systemMessage":string,"hookSpecificOutput":{...,"additionalContext"?:string}}`.

### DoD
Both test files green; `superdev/hooks/scripts/review-plan.test.sh` no longer exists.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - test(superdev): cover setup/bootstrap.sh, retiring the in-plugin harness
- Covers: criteria #3, #7
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superdev/bootstrap.test.ts`
- delete - `superdev/skills/setup/scripts/bootstrap.test.sh`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superdev/bootstrap.test.ts`

### Approach
1. Port the existing cases of `superdev/skills/setup/scripts/bootstrap.test.sh` (the `superdev.yml` and
   `.gitattributes` seeding matrix) into `bootstrap.test.ts`, running the script with `cwd` set to a
   `withTempDir` project root. Delete the `.sh` file.
2. Assert the stdout result lines verbatim - `superdev/skills/setup/SKILL.md` asserts them verbatim, so
   the wording is a contract, not cosmetics.
3. Add idempotence: run twice, assert the second run reports "already present" for every item and leaves
   file bytes unchanged.
4. Add the seeding edge cases: pre-existing `.gitignore` without a trailing newline; pre-existing
   `.gitattributes` that already carries the linguist rule; a `.claude/settings.json` that is invalid
   JSON; a read-only project root; `.temp/` already existing as a file rather than a directory.

### Edge cases
The append-if-absent rule must not duplicate on a file lacking a final newline. A CRLF-authored existing
`.gitignore`. Exit is 0 in every case, including the failure ones.

### Contracts
`bootstrap.sh` → one result line per seeded item on stdout, exit 0 always.

### DoD
Test file green; `superdev/skills/setup/scripts/bootstrap.test.sh` no longer exists.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - test(superdev): cover the workflow scripts - decompose, commit-task, status-update, lib_find_excludes
- Covers: criterion #3
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superdev/decompose.test.ts`
- add - `tests/superdev/commit-task.test.ts`
- add - `tests/superdev/status-update.test.ts`
- add - `tests/superdev/lib_find_excludes.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superdev/decompose.test.ts`
- `node --test tests/superdev/commit-task.test.ts`
- `node --test tests/superdev/status-update.test.ts`
- `node --test tests/superdev/lib_find_excludes.test.ts`

### Approach
1. `decompose.test.ts`: run `superdev/scripts/decompose.sh` inside a `withGitRepo`. Assert the created
   tree `docs/.workflows/<date>-<slug>/{plan-header.md,plan.md,status.md,base.md,tasks/task-NN.md,implementation/}`,
   the clean stdout index (`workdir:`, `status:`, `base:`, `plan-header:`, `plan:`, `spec:`, then
   `<task-path>\t<title>` rows), that all git noise landed on stderr, and that a commit was created with
   the `chore(<prefix>): decompose plan <slug>` subject for both the default and an explicit prefix.
2. Assert each documented exit: 1 for a missing argument and a nonexistent plan file, 4 for a referenced
   spec file that does not exist, 5 for a `Covers:` criterion absent from the source.
3. `status-update.test.ts`: valid `tasks/task-NN.md` updates `<workdir>/status.md`; exit 1 on a missing
   argument and on a nonexistent file; a path not matching `tasks/task-NN.md`; `task-07` vs `task-7`.
4. `commit-task.test.ts`: message-only commit; message + task file (asserting the `status.md` bump
   happened *before* the commit); `Nothing to commit.` with exit 0 on a clean index; exit 1 on a missing
   message; a message containing a newline, a quote and a non-ASCII character.
5. `lib_find_excludes.test.ts`: the library is sourced, not executed, so drive it through a temp bash
   wrapper that sources it, calls `load_find_excludes "$1"` and prints one array element per line. Assert
   the safety floor (`.git`, `node_modules`) is always present, the array is never empty, diagnostics go
   to stderr and stdout stays clean, and the return code is always 0.
6. Cover the parser rules: a trailing-slash directory entry; a bare name; a `*.log` file pattern skipped;
   a `!negation` skipped; a `/root-anchored` entry; a `.idea` dot-dir rescued as a directory; `**`
   normalisation; the all-glob guard (`*`, `**`, `*/`) dropped; a CRLF `.gitignore`; a duplicate entry
   deduplicated; no `.gitignore` anywhere → the bundled
   `superdev/skills/setup/assets/gitignore.txt` fallback; neither present → the stderr warning and the
   safety floor alone.

### Edge cases
`decompose.sh` in a repo with an unborn HEAD. A plan title that slugifies to an empty string. Two runs on
the same day producing the same `<date>-<slug>` dir. A plan file with CRLF. A task title containing a tab
(it would break the `\t`-separated index rows). `lib_find_excludes.sh` requires bash arrays and
`BASH_SOURCE`, so it is bash-only - exercise it under `forEachShell("bash", …)`, never under a POSIX shell.

### Contracts
`decompose.sh <plan-file> [commit-prefix]` → index on stdout, git noise on stderr; exits 0/1/4/5.
`load_find_excludes <start-path>` → sets the global `FIND_EXCLUDES` array, always returns 0.

### DoD
All four test files green under every bash major found on the machine.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - test(superdev): cover the memory and rules reporter scripts
- Covers: criterion #3
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superdev/memory-scripts.test.ts` (covers `detect_state.sh`, `analyze_structure.sh`, `estimate_tokens.sh`)
- add - `tests/superdev/rules-scripts.test.ts` (covers `detect_state.sh`, `scan_conventions.sh`)

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superdev/memory-scripts.test.ts`
- `node --test tests/superdev/rules-scripts.test.ts`

### Approach
1. `memory-scripts.test.ts` for `superdev/skills/superdev-memory/scripts/detect_state.sh`: assert the
   `root_file:` / `has_Memory_section:` / `child_nodes:` / `state:` / `action:` lines across the three
   states - no `CLAUDE.md`, a root `CLAUDE.md` without a Memory section, and a root plus child nodes -
   plus the default `[path=.]` argument and an explicit path.
2. Same file for `analyze_structure.sh` (a fixture tree three levels deep, existing `CLAUDE.md`s, a large
   dir) and `estimate_tokens.sh` (`Total tokens:` / `File count:` / `Threshold:` / `Recommendation:` on a
   fixture of known byte size; exit 1 with `Error: Path not found:` on a nonexistent path; an empty dir;
   a dir holding only ignored files).
3. `rules-scripts.test.ts` for `superdev/skills/superdev-rules/scripts/detect_state.sh`: no `.claude/rules`;
   rules present with `paths:` frontmatter; a rule missing `paths:` reported `MISSING`; `_frozen.md`
   listed under `frozen_files:` and excluded from `state:`; only frozen files present.
4. Same file for `scan_conventions.sh`: assert the section headers and that counts are integers, on a
   fixture with two languages, two naming styles and a tool config - counts only, no interpretation.

### Edge cases
A path argument containing a space and a non-ASCII character. A `.gitignore`-excluded directory must not be
counted (all four scripts source `lib_find_excludes.sh`). A `CLAUDE.md` that is an empty file. A symlinked
subdirectory. These are bash scripts - run under `forEachShell("bash", …)`.

### Contracts
none

### DoD
Both test files green; every documented stdout key of the five scripts is asserted at least once.

<!-- /TASK -->

---

<!-- TASK -->

## Task 9 - test(supergh): cover preflight.sh and body-path.sh
- Covers: criteria #3, #5
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/supergh/preflight.test.ts` (new dir `tests/supergh/`)
- add - `tests/supergh/body-path.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/supergh/preflight.test.ts`
- `node --test tests/supergh/body-path.test.ts`

### Approach
1. `preflight.test.ts`: drive `supergh/shared/scripts/preflight.sh` with a `withStub("gh", …)` whose body
   branches on `$1`. Assert the five lines always appear in the documented order -
   `GH_PRESENT`, `GH_AUTH`, `BRANCH`, `UPSTREAM`, `REPO` - and exit is always 0, across: no `gh` on PATH;
   `gh` present but `gh auth status` failing; not a git repo; a repo with no upstream; a repo with no
   `origin` remote; the fully happy path.
2. `body-path.test.ts`: assert the single stdout line matches
   `^\.temp/<prefix>/\d{8}-\d{6}-<slug>\.md$` (the timestamp comes from `date`, so match a pattern, never
   a literal) and that `.temp/<prefix>/` exists *before* the line is read.
3. Cover the slugify contract step by step: uppercase input; each Polish diacritic in both cases;
   punctuation collapsed to `-`; runs of `-` collapsed; leading and trailing `-` trimmed; a title longer
   than 40 chars cutting mid-word (back off to the last `-`) and cutting exactly on a boundary; a title of
   only punctuation → `untitled`; an empty title; an embedded newline and CR collapsed to a space so the
   one-line contract holds; a 4-byte emoji (the `LC_ALL=C` byte-semantics guard).
4. Assert exit 2 on missing arguments (`no args`, prefix only) and exit 1 when `.temp/<prefix>` cannot be
   created (pre-create `.temp/<prefix>` as a regular file).
5. Both scripts are `#!/bin/sh`, so run every case through `forEachShell("posix", …)`.

### Edge cases
A prefix containing a slash. A title of exactly 40 and exactly 41 characters. Two invocations within the
same second producing the same path. A read-only `cwd`.

### Contracts
`body-path.sh <prefix> <title>` → exactly one stdout line `.temp/<prefix>/<YYYYmmdd-HHMMSS>-<slug>.md`;
exit 0 / 2 missing args / 1 dir not creatable.

### DoD
Both test files green under every POSIX shell present, with a recorded skip for each absent one.

<!-- /TASK -->

---

<!-- TASK -->

## Task 10 - test(supergh): cover the commit chain - commit-args, commit-context, commit, commit-selfcheck
- Covers: criterion #3
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/supergh/commit-args.test.ts`
- add - `tests/supergh/commit-context.test.ts`
- add - `tests/supergh/commit.test.ts`
- add - `tests/supergh/commit-selfcheck.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test "tests/supergh/commit*.test.ts"`

### Approach
1. `commit-args.test.ts`: `commit-args.sh` is sourced, so drive `resolve_commit_selector "<raw>"` through a
   temp bash wrapper that sources it and prints `COMMIT_MODE`, `COMMIT_PATH`, `COMMIT_ISSUE_REFS`. Cover:
   empty input → `all`; `staged`; a path that exists → `path` and the path passed verbatim; a path that
   does not exist; an existing path *named* `staged` (the documented "existing path wins over keyword"
   rule); one and several issue URLs stripped before selector resolution; an issue URL plus a path; a path
   containing a space.
2. `commit-context.test.ts`: inside a `withGitRepo`, assert the emitted block carries the resolved
   `Selector` line, recent commit subjects, `git status` and a diff, for each selector mode. Cover the
   unborn-HEAD branch (empty-tree object) explicitly, a repo with no changes, a diff exceeding
   `MAX_LINES=400` (assert it is capped), a binary file change, and a filename with a non-ASCII character.
3. `commit.test.ts`: assert a commit lands for `all`, `staged` and a path selector; that the path selector
   leaves *other* staged changes uncommitted; exit 1 on a missing message; a multi-line message; a message
   with a leading `-`; committing when nothing is staged.
4. `commit-selfcheck.test.ts`: `VERIFIED` when HEAD moved, `FAILED` when it did not, exit 1 on a missing
   argument, and a `before_sha` that is not a valid object.

### Edge cases
`commit-context.sh` deliberately runs without `set -e`, so a failing probe must degrade rather than abort -
assert the block is still emitted. An unborn HEAD for all four scripts. A detached HEAD. A repo where
`user.email` is unset (the harness pins it, so also assert behaviour with it explicitly unset).

### Contracts
`resolve_commit_selector <raw>` → sets `COMMIT_MODE` ∈ {`all`,`staged`,`path`}, `COMMIT_PATH`, `COMMIT_ISSUE_REFS`.
`commit-selfcheck.sh <before_sha>` → one word `VERIFIED`|`FAILED`; exit 1 on a missing argument.

### DoD
All four test files green; no test mutates the working repo (every git call runs inside `withGitRepo`).

<!-- /TASK -->

---

<!-- TASK -->

## Task 11 - test(supergh): cover the issue and PR scripts against a stubbed gh
- Covers: criteria #3, #5
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/supergh/create-issue.test.ts`
- add - `tests/supergh/create-pr.test.ts` (covers `check-base.sh`, `pr-facts.sh`, `create-pr/scripts/create.sh`)

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/supergh/create-issue.test.ts`
- `node --test tests/supergh/create-pr.test.ts`

### Approach
1. `create-issue.test.ts` against `supergh/skills/create-issue/scripts/create.sh` with a `withStub("gh", …)`:
   assert `ISSUE_URL=`, `ISSUE_NUMBER=` and `TYPE=` across all four type outcomes - `applied`, `dropped`
   (with `TYPE_ERROR=`), `error`, `none` - plus repeated `--label`, `--assignee` and `--project` flags,
   an unknown flag, exit 2 on missing arguments, and exit 1 with a single `ERROR` line on stderr and
   nothing created when `gh issue create` fails.
2. `create-pr.test.ts` for `check-base.sh`: `BASE_EXISTS=1` then `OPEN_PR=<url>`; `BASE_EXISTS=1` then
   `OPEN_PR=` empty; `BASE_EXISTS=0` then `REMOTE_BRANCHES=a,b`; exit 2 on missing arguments.
3. Same file for `pr-facts.sh`: with and without an issue number; `ISSUE_ERROR=` when the issue lookup
   fails; the `COMMITS:` marker followed by raw `git log`; empty `CHANGED_FILES=`; each probe failing
   independently (fail-soft) while the block still emits; exit 2 on missing arguments.
4. Same file for `create-pr/scripts/create.sh`: `PR_URL=`/`PR_NUMBER=` parsed from the stub; assert the
   invocation carried `--draft` and `--body-file` (have the stub echo its argv into a file the test
   reads); exit 1 with an `ERROR` line when creation fails; exit 2 on missing arguments.
5. All four are `#!/bin/sh` - run through `forEachShell("posix", …)`.

### Edge cases
A title containing a quote and a non-ASCII character. A `gh` stub emitting a URL with a trailing newline or
CRLF. A `gh` stub writing to stderr and exiting 0. An issue number that is not numeric. A body path that
does not exist.

### Contracts
`create-issue/scripts/create.sh <body-path> <title> [--type X] [--label L]... ` → `ISSUE_URL=`,
`ISSUE_NUMBER=`, `TYPE=applied|dropped|error|none`, optional `TYPE_ERROR=`; exit 0/1/2.

### DoD
Both test files green under every POSIX shell present; no test invokes the real `gh` (assert by pointing
`PATH` at the stub dir only).

<!-- /TASK -->

---

<!-- TASK -->

## Task 12 - test(superfix): cover check_node.sh, collect_signals.sh and collect_edges.sh
- Covers: criteria #3, #5
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superfix/check_node.test.ts` (new dir `tests/superfix/`)
- add - `tests/superfix/collect_signals.test.ts`
- add - `tests/superfix/collect_edges.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test "tests/superfix/*.test.ts"`

### Approach
1. `check_node.test.ts`: with a `withStub("node", …)` reporting a chosen `--version`, assert the single
   output line across every threshold - `v26.0.0`, `v24.0.0`, `v23.6.0` → `NODE_OK node`; `v23.5.0`,
   `v22.6.0` → `NODE_OK node --experimental-strip-types`; `v22.5.0`, `v20.0.0` → `NODE_MISSING`; no `node`
   on PATH → `NODE_MISSING`; `node` present but exiting non-zero; a malformed version string. Exit is
   always 0 and stdout is always exactly one line.
2. `collect_signals.test.ts`: inside a `withGitRepo` with a scripted history, assert one JSONL record per
   tracked file with the keys `path`, `churn`, `fix_commits`, `recency_days`, `loc`, `dependents`; that
   `--with-dependents` works in any argument position; the `[window_days]` and `[repo_root]` positionals;
   the kept-extension list and per-file warnings on stderr only; and a non-zero exit with one stderr line
   and zero stdout on an unborn HEAD.
3. `collect_edges.test.ts`: assert JSONL records with `a`, `b`, `via`, `vias`, `fanout`, `shared`; that
   `--max-fanout` caps as documented; exit 1 on an unborn HEAD; and exit 0 with *empty* stdout when no
   pairs exist - the documented empty case that must not be an error.
4. Reuse the same fixture-repo builder shape in both collector tests but keep it file-local, per the
   fixtures-stay-local convention.

### Edge cases
A tracked filename containing a space and a non-ASCII character (both scripts set `core.quotePath=false`,
so the path must come through unquoted). A file deleted in a later commit. A repo whose only commit is
empty. A shallow clone. `check_node.sh` is `#!/bin/sh` → `forEachShell("posix", …)`; the two collectors are
bash → `forEachShell("bash", …)`.

### Contracts
`check_node.sh` → exactly one of `NODE_OK node` | `NODE_OK node --experimental-strip-types` | `NODE_MISSING`; exit 0 always.
`collect_signals.sh [window_days] [repo_root] [--with-dependents]` → JSONL `{path,churn,fix_commits,recency_days,loc,dependents}`.

### DoD
All three test files green; every JSONL line emitted in the tests parses with `JSON.parse`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 13 - test(superfix): cover rank.ts and rank_edges.ts
- Covers: criterion #3
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superfix/rank.test.ts`
- add - `tests/superfix/rank_edges.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superfix/rank.test.ts`
- `node --test tests/superfix/rank_edges.test.ts`

### Approach
1. Drive both scripts as subprocesses via `runScript("node", [script, …flags])`, not as imports: neither
   carries the repo's CLI guard idiom (`superui/scripts/check_contrast.ts:251`) and neither exports a
   single symbol, so importing them would run their CLI. Adding a guard would change plugin source, which
   this plan does not do; the written `--out-json` file exposes everything the ranking logic decides.
2. `rank.test.ts`: over a temp `--scores` JSONL, assert `hotlist.json` + `hotlist.md` contents encode
   `score = impact × opportunity` and the 2×2 quadrant cut, and that `--min-impact`, `--min-opportunity`,
   `--top`, `--job`, `--run-id` and `--signals` each change the output as documented.
3. `rank_edges.test.ts`: assert `MATCH` verdicts are dropped, the remaining pairs rank and cap at
   `--top-edges`, `edges.json` + `edges.md` are written, the per-path structural degree is reported, and
   `USAGE` is printed on bad arguments.
4. Cover the boundary inputs: an empty `--scores` file; a JSONL line that is not valid JSON; a record
   missing a required key; ties in the score (assert deterministic ordering); a `--top` of 0; a `--top`
   larger than the input; `--out-json` pointing at an unwritable path.

### Edge cases
A path in the input containing a Windows-style backslash. An input file with CRLF line endings. A score of
exactly the `--min-impact` threshold (inclusive vs exclusive). An `--out-md` in a directory that does not
exist.

### Contracts
`rank.ts --scores <jsonl> [--signals] [--min-impact N] [--min-opportunity N] [--top N] [--job] [--run-id] --out-json <p> --out-md <p>`.
`rank_edges.ts --edges <p> --verdicts <p> [--signals] [--top-edges N] [--job] [--run-id] --out-json <p> --out-md <p>`.

### DoD
Both test files green; `hotlist.json` and `edges.json` produced in the tests parse with `JSON.parse` and
their ordering is stable across two identical runs.

<!-- /TASK -->

---

<!-- TASK -->

## Task 14 - test(superui): cover check_node.sh and setup/check_env.sh
- Covers: criteria #3, #5
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superui/check_node.test.ts`
- add - `tests/superui/check_env.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superui/check_node.test.ts`
- `node --test tests/superui/check_env.test.ts`

### Approach
1. `check_node.test.ts`: the same threshold matrix as Task 12 applied to `superui/scripts/check_node.sh`,
   asserting the two copies have identical observable behaviour on identical input - the contract they are
   documented to share.
2. `check_env.test.ts` against `superui/skills/setup/scripts/check_env.sh`: with `CLAUDE_PLUGIN_ROOT` set,
   assert it delegates to that root's `check_node.sh`; with it unset, assert the
   `../../../scripts/check_node.sh` relative fallback resolves; assert `NODE <cmd>` + `VERSION <v>` when
   node exists and `NODE MISSING` when it does not; exit 0 in every case.
3. Both are `#!/bin/sh` → `forEachShell("posix", …)`.

### Edge cases
`CLAUDE_PLUGIN_ROOT` pointing at a nonexistent dir; pointing at a dir with no `check_node.sh`; a value
containing a space. Invoking the script from a different `cwd` than its own directory (the fallback is
resolved from `$0`, not `cwd`).

### Contracts
`check_env.sh` → `NODE <cmd>` | `NODE MISSING`, plus `VERSION <v>` when node exists; exit 0 always.

### DoD
Both test files green; the two `check_node.sh` copies are asserted equivalent on the same input matrix.

<!-- /TASK -->

---

<!-- TASK -->

## Task 15 - test(superui): cover section-model, inventory-format, assemble_specs, copy_screens and sample_colors
- Covers: criterion #3
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superui/section-model.test.ts`
- add - `tests/superui/inventory-format.test.ts`
- add - `tests/superui/assemble_specs.test.ts`
- add - `tests/superui/copy_screens.test.ts`
- add - `tests/superui/sample_colors.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test "tests/superui/*.test.ts"`

### Approach
1. `section-model.test.ts`: assert `SECTION_IDS` holds no duplicates, `SECTION_TITLES` has an entry for
   every id in `SECTION_IDS` and no extra keys, `TOKEN_BACKED_SECTIONS` is a subset of `SECTION_IDS`,
   `isTokenSection()` agrees with that set for every id, and `TOKEN_SECTION_RE` / `UNKNOWN_SECTION_RE`
   match every id they should and reject `3.11`, `4.1` and a bare `3`.
2. `inventory-format.test.ts` gives the module its own file (today it is only covered incidentally through
   `validate_bundle.test.ts`): `INVENTORY_DELIMITER` is U+00B7; `parseInventoryEntries` handles a
   well-formed entry, an entry with surrounding whitespace, a missing field, an empty line, a line using a
   look-alike middle dot, a CRLF line, and a delimiter inside a value; `canonicalRefs` deduplicates and
   preserves order; `CANONICAL_LINE_RE` tolerates the documented markdown decoration.
3. `assemble_specs.test.ts`: `SPECS_OK entries=<N> -> <OUTPUT_MD>` on stdout; the h1-shift warning on
   stderr, one line per offender; an empty specs dir producing the documented stub with exit 0; exit 1 on
   an unreadable dir, an unreadable spec, an unwritable output and a self-verify mismatch.
4. `copy_screens.test.ts`: `SCREENS_OK copied=<N> skipped=<M> -> <OUT_DIR>/screens`; deduplication of a
   screen cited twice; zero entries with exit 0; exit 1 on an unreadable inventory, a missing source dir,
   and a canonical name that is absolute or carries a path separator (both directions: `/` and `\`);
   exit 2 on usage errors.
5. `sample_colors.test.ts` at module-boundary depth per the agreed scope: argument parsing and mode
   selection (`--k`, `--points`, `--crop`, `--regions`, `--json`), mutually exclusive modes, exit 2 on
   usage errors, exit 1 on an unreadable image and on out-of-range mode arguments, and determinism -
   the same input yields byte-identical output across two runs. Feed it a real PNG built with
   `writePng` from the harness. Do not assert cluster quality.

### Edge cases
A canonical screen name with a non-ASCII character. An inventory with no entries at all. An output path
whose parent does not exist. A `--regions` value with a malformed rect. A 1×1 image. An image with an alpha
channel.

### Contracts
`assemble_specs.ts SPECS_DIR OUTPUT_MD`; `copy_screens.ts INVENTORY_MD SOURCE_DIR OUT_DIR`;
`sample_colors.ts IMAGE [--k N] [--points …] [--crop …] [--regions …] [--json]`.

### DoD
All five test files green; `inventory-format.ts` is covered by its own file rather than only through
`validate_bundle.test.ts`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 16 - test(superui): cover the vendored decoders - png-decode deeply, jpeg-decode at its boundary
- Covers: criterion #3
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/superui/png-decode.test.ts`
- add - `tests/superui/jpeg-decode.test.ts`

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/superui/png-decode.test.ts`
- `node --test tests/superui/jpeg-decode.test.ts`

### Approach
1. `png-decode.test.ts`: using `writePng` from the harness, assert `decodePng` round-trips the colour-type
   × bit-depth matrix the module claims - types 0, 2, 3, 4 and 6 at depths 1, 2, 4, 8 and 16 where the
   spec allows the combination - comparing decoded RGB against the constructed ground truth.
2. Assert all five filter types (None, Sub, Up, Average, Paeth) by emitting each filter explicitly on a
   fixture whose expected output is computed independently in the test.
3. Assert the error contract: `isPng` rejects a non-PNG buffer; an interlaced image raises
   `PngUnsupportedError` explicitly rather than decoding wrongly; a truncated IDAT, a bad CRC, a zero-width
   IHDR and an unknown critical chunk each raise `PngDecodeError`.
4. `jpeg-decode.test.ts` at boundary depth only: embed a small base64 baseline JPEG of known dimensions and
   solid colour, assert `decode(buf, { useTArray: true, formatAsRGBA: false })` returns the expected
   `width`, `height` and pixel bytes, and that the ESM conversion exposes `decode` as a function. Do not
   re-test the upstream jpeg-js suite.

### Edge cases
A palette image whose `tRNS` chunk adds transparency. A 16-bit image (byte order). A 1×1 image. A grayscale
image with an odd width at depth 1 (sub-byte row padding). An empty buffer.

### Contracts
`decodePng(buf) → { width, height, data }`; `isPng(buf) → boolean`; `PngDecodeError`, `PngUnsupportedError`.
`decode(buf, opts) → { width, height, data }`.

### DoD
Both test files green; the png matrix covers every colour type the module claims to support.

<!-- /TASK -->

---

<!-- TASK -->

## Task 17 - test(ci): cover release.sh version computation against a throwaway repo and a stubbed gh
- Covers: criteria #3, #6
- TDD: none

### Dependencies
- Task 1 - blocks: none

### Files
- add - `tests/github/release.test.ts` (new dir `tests/github/`)

### Test Commands
*Build*
- none

*Tests*
- `node --test tests/github/release.test.ts`

### Approach
1. Build the fixture with `withGitRepo`: a work repo whose `origin` is a second, `--bare` temp repo, four
   `<plugin>/.claude-plugin/plugin.json` files each carrying a `version`, and a `withStub("gh", …)`
   recording its argv to a file. Every push therefore targets the local bare remote - the test can never
   reach GitHub.
2. Assert version computation: no tags → the `0.1.0` seed taken as-is; `1.2.3` + `patch` → `1.2.4`;
   `+ minor` → `1.3.0`; `+ major` → `2.0.0`; non-semver tags (`v1.0.0`, `1.0`, `release-2`) ignored when
   picking the highest; a gap in numbering; an invalid part → exit 2; a target tag that already exists →
   exit 3.
3. Assert all four manifests receive the new `version` and nothing else in them changes, and that the bump
   commit subject is `chore(bump): bump version to <v>`.
4. Assert the re-run recovery branch: run twice with the same target version and confirm the second run
   emits `already committed; re-tagging existing release commit` on stderr rather than fabricating an
   empty commit.
5. Assert the outputs: the new version on stdout and `version=<v>` appended to the file named by
   `GITHUB_OUTPUT`. Assert from the stub's argv log that `gh release create` was called once, and not at
   all when `gh release view` reports the release already exists.
6. Skip the whole file with a recorded reason when `jq` is not on `PATH` - the script requires it and
   Git-Bash does not ship it.

### Edge cases
A tag list of 200 entries (sort order). A manifest with a trailing newline that `jq` must preserve. A
`GITHUB_REF_NAME` other than `main`. `GITHUB_OUTPUT` unset (the script falls back to `/dev/null`). A
detached HEAD.

### Contracts
`release.sh <major|minor|patch>` → new version on stdout, `version=<v>` to `$GITHUB_OUTPUT`;
exit 0 / 2 invalid part / 3 tag exists.

### DoD
Test file green; no tag, commit or release is created outside the temp repos - assert the real repo's
`git status` and tag list are untouched by running the suite.

<!-- /TASK -->
