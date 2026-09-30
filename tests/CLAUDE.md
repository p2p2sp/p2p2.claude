# tests/ - dev-time regression suites for the plugin scripts

Node's native `node:test` runner over `.ts` files (type stripping), run by `.github/workflows/ci.yml`:
Linux only on push/PR, the macOS + Windows legs only on a manual `workflow_dispatch`. A test that
passes locally on one OS is not proven on the other two until that dispatch runs. How to run and how
a file is shaped live in `.claude/rules/tests-running.md` and `tests-structure.md`.

## Layout

- `tests/<plugin>/` (and `tests/github/` for `.github/scripts/`) - one file per tested script,
  named after the script's basename. Three files test no script: `tests/superui/import-safety.test.ts`
  (`check_contrast.ts` imports without firing its guarded `main()`), `tests/superfix/profiler.test.ts`
  (runs the fenced git command lifted verbatim from `superfix/agents/profiler.md`) and
  `tests/viber/help.test.ts` (checks `skills/setup/assets/help.html` against `plugin.json`, the
  `SKILL.md` frontmatter and the `viber.yml` template).
- `tests/harness/` - the shared helpers every script test uses; `tests/harness.test.ts` asserts
  `runScript`, `withTempDir`, `withGitRepo`, `withStub`, `forEachShell("posix")`,
  `denyRead`/`restoreRead` and `writePng`; `slash`, `canSymlinkDir`, `coreUtilsPath` and `test` (which every file runs through) have no
  test there.
- `tests/portability.test.ts`, `tests/orphan-tags.test.ts` - static sweeps over the whole repo.
  Each rule is a pure function with a self-check test proving it fires on a synthetic bad sample;
  a new rule gets its self-check too, or its green run proves nothing.

## Which suite a change runs

Run only what the change reaches, each line with
`node --test --test-concurrency=12 --test-reporter=dot <files>`, the files quoted when a glob:

- Always: `tests/orphan-tags.test.ts tests/portability.test.ts`. Prose in an agent, a reference, a
  `CLAUDE.md`, a README or `.claude/rules/` reaches nothing else, except
  `superfix/agents/profiler.md`, which reaches `tests/superfix/profiler.test.ts`.
- A plugin's script, a `SKILL.md`, its `plugin.json`, or viber's `hooks/content/`,
  `skills/setup/assets/help.html` or `skills/setup/templates/viber.yml`: plus
  `"tests/<plugin>/*.test.ts"`. superui's `check_contrast.ts` also reaches
  `tests/viber/help.test.ts`, which imports `contrastRatio`/`parseColor` from it. `supercc` and
  `superbiz` have no suite, and `viber/scripts/run-branch.sh` no test file.
- `.github/scripts/`: plus `tests/github/release.test.ts`.
- `tests/harness/`, and every handover: the whole `"tests/**/*.test.ts"`.

## Harness contract

- `test(name, [options], fn)` (`harness/test.ts`) replaces node:test's: a file's cases run inside
  one suite named after the file, up to 4 at once (`P2P2_TEST_CONCURRENCY`), each still reported,
  skipped and matched by `--test-name-pattern` under its own name. Every helper below that
  spawns or wraps a fixture is async and awaited.
- `runScript(script, args, opts)` (`harness/run.ts`) runs a shipped script as a real subprocess
  (a `.ts`/`.js` one through `process.execPath`) and resolves when it exits. The child env is sanitised to a fixed base list (PATH, HOME, TEMP, ...): every
  variable a script reads must be passed through `opts.env`. On win32 the script's shebang is read
  and its interpreter resolved from PATH; an argument holding `\n`/`\r` travels through the
  environment (`P2P2_ARGV<n>`) because no CreateProcess command line survives it - only for a
  bash/sh script, so such a case skips for any other interpreter. Default timeout 60 s on purpose
  (CI over-subscribes cores with `--test-concurrency=12`).
- `forEachShell("bash" | "posix", fn)` (`harness/shells.ts`) runs a case under the first shell
  present locally, and under every shell present only when `CI` is `true`/`1` (`FULL_SHELL_MATRIX`;
  `ci.yml` sets it, `CI=true node --test ...` runs it locally): each distinct bash major (macOS 3.2
  vs 5.x) for a `#!/usr/bin/env bash` script; `/bin/sh`, `dash`, `busybox sh`, `bash --posix` for a
  `#!/bin/sh` one. An absent or unrun shell is returned as a `ShellSkip`, never a failure. A
  bash-only script is never run under `"posix"`.
- `withTempDir` / `withGitRepo` (`harness/tmp.ts`) - every filesystem or git fixture lives in a temp
  dir removed on return or throw. `withGitRepo` copies a per-process template made by one real
  `git init` (no spawn per repo) and pins HOME/USERPROFILE, its own `GIT_CONFIG_GLOBAL`,
  `GIT_CONFIG_NOSYSTEM=1` and fixed author/committer/date: pass its `env` to every call so nothing
  reads the developer's real `~/.gitconfig`. Never run git against this repo: the commit and
  release scripts under test really commit, tag and push.
- `withStub(name, body, fn)` + `opts.stubDirs` (`harness/stub.ts`) puts a fake `gh`/`npm`/... first
  on PATH; a test never lets a script reach a real network-facing tool. `stubDirs` only prepends,
  so asserting a tool is ABSENT needs `opts.env.PATH = coreUtilsPath()` first (grep's dir plus
  bash's) - it still carries `git` on POSIX, so a git-branching script must hold either way.
- `writePng` (`harness/png.ts`) synthesises RGBA PNG fixtures; no image library.

## Cross-platform traps

- Compare a path a script printed through `slash()` (`harness/paths.ts`) on both sides: on Windows
  its stdout mixes native `\` with the script's own `/`.
- Make a file unreadable with `denyRead()` / `restoreRead()` (`harness/perms.ts`), never `chmod`:
  mode bits gate nothing on Windows (it uses an `icacls /deny` ACE) and root ignores them on POSIX.
  Gate the case with `{ skip: canDenyRead() ? false : "<reason>" }` and restore in `finally`.
- Gate any directory-symlink case on `canSymlinkDir()` (`harness/symlinks.ts`): a plain Windows
  account gets EPERM.
- Capability is always probed by doing the real thing, never by reading `process.platform`; a
  platform check is only for a case whose meaning differs by OS (a backslash is a legal filename
  character off Windows), and it skips with a reason string.
- A test depending on an optional tool (`jq` for `release.sh`) registers one skipped `test()` naming
  the reason instead of failing.
- The static sweeps and the exec-bit checks read the git index (`git ls-files -s`), not the working
  tree: a new script is invisible to them, and its `100755` mode unchecked, until it is staged.
- `portability.test.ts`'s `bashismViolations` sweep is text matching, not syntax-aware: an awk
  `function name(...)` definition, or any bare `((` not preceded by `$` (even from nested parens
  in an `if`), reads as bash-only under a `#!/bin/sh` shebang. A POSIX-sh script embedding an awk
  block must avoid both.
- `tests/viber/config.test.ts` reads `config.sh`'s dotted stdout by trailing slice
  (`printed.slice(-5, -1)`, `stdout.split("\n").slice(-2)`), not by key name: a group appended
  after `branching` shifts every such offset, and its own assertions must move with it.
