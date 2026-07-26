
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


### Covered criteria
2. `tests/harness/` exposes `runScript`, `withTempDir`, `withGitRepo`, `withStub`, `forEachShell` and
   `writePng`, carries no knowledge of any individual script under test, and is itself covered by
   `tests/harness.test.ts`.
5. Every `#!/bin/sh` script is exercised under each POSIX shell present on the machine, and every
   bash-shebang script under each distinct bash major present; an absent shell is skipped with a recorded
   reason, never failed.
6. No test performs network I/O, mutates this repo's working tree, or creates a tag outside a throwaway
   repo: `gh` is always a PATH stub, `node` is a PATH stub wherever a script probes its version, every
   mutating `git` call runs in a `mkdtemp` repo with `HOME`, `GIT_CONFIG_GLOBAL` and `GIT_CONFIG_NOSYSTEM`
   isolated (read-only `git` against this repo is allowed - Task 2 needs the real index and Task 17
   asserts this repo's status and tag list are untouched), and the `release.sh` test pushes only to a
   local bare remote.
9. Root `CLAUDE.md` states, in its `tests/` entry, both the tests tree's fixtures-stay-file-local
   convention and the single `tests/harness/` mechanism-only exception to it.
