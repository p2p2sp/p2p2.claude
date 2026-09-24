# tests

## Purpose

Dev-time regression suites for plugin scripts. Lives at the repo root, OUTSIDE every plugin
directory - no `plugin.json` and no marketplace entry references it; it ships with no plugin.

## Entry points

- Run from the repo root: `node --test "tests/**/*.test.ts"` - a QUOTED glob. A bare directory
  argument such as `tests/superui/` does NOT work: `node --test` resolves it as a module path,
  not a glob.
- Subdirectories mirror the plugins: `tests/superfix/`, `tests/supergh/`,
  `tests/superui/`, `tests/viber/`, `tests/github/`, plus `tests/harness/` and root-level suites
  (`harness.test.ts`, `portability.test.ts`, `orphan-tags.test.ts`). Verify the current tree
  from the directory if this drifts.
- `tests/harness/` - the shared mechanism module, exposing only cross-cutting capability, never
  per-script knowledge:
  - `paths.ts` - `slash(value)`, normalizes a script-printed path for comparison (a shell script
    joins with `/` whatever native path it was handed).
  - `perms.ts` - `denyRead(file)`, `restoreRead(file)`, `canDenyRead()` - read-denial via ACL
    where the platform honours it; gate a case on `canDenyRead()`.
  - `png.ts` - `writePng(width, height, rgba, opts?)` - binary PNG fixtures.
  - `run.ts` - `runScript(script, args?, opts?)` - subprocess execution returning a
    `RunResult`.
  - `shells.ts` - `shellBin(shell)`, `bashShells()`, `posixShells()`,
    `forEachShell(kind, fn)` - shell discovery across bash/posix variants.
  - `stub.ts` - `withStub(name, body, fn)`, `coreUtilsPath()` - PATH stubs for external tools.
  - `symlinks.ts` - `canSymlinkDir()` - directory-symlink capability gate.
  - `tmp.ts` - `withTempDir(prefix, fn)`, `withGitRepo(fn, opts?)` - temp dirs and throwaway git
    repos.

## Contracts & invariants

- Fixtures, expected outputs and stub scenarios stay FILE-LOCAL to each `*.test.ts`.
  `tests/harness/` is the single exception and never carries per-script knowledge.
- A test that passes locally and fails on Git-Bash is the top trap (confirmed by the user). CI
  runs the suite on ubuntu for `push`/`pull_request`, and on the full ubuntu/macos/windows
  matrix on manual `workflow_dispatch` - every test must hold under Git-Bash too.
- Compare script-printed paths with `slash()`, never raw.
- Enumerate the tree with `git ls-files -z` and split on `\0`. Without `-z` a path carrying a
  non-ASCII character comes back C-quoted and octal-escaped, which breaks the read AND hides the
  real prefix behind the opening quote, so a path filter silently lets it through. The repo has
  such a path under `docs/misc/`; `orphan-tags.test.ts` was written against it.
- Make a file unreadable with `denyRead()`, NEVER with `chmod` - Windows ignores its mode bits
  and root overrides them.
- Gate any case that creates a symlink on `canSymlinkDir()` - a plain Windows account gets
  EPERM from `fs.symlinkSync`, so the case must skip with a reason rather than fail before
  asserting.

## Anti-patterns

- Adding shared per-script fixtures/expectations into `tests/harness/` instead of keeping them
  file-local to the one `*.test.ts` that needs them.
- Asserting on a raw (non-`slash()`-normalized) path, or denying read access with `chmod`.

## Related context

- Root cross-plugin invariants: `../CLAUDE.md`
- Each plugin's own node for what its scripts are supposed to do:
  `../superui/CLAUDE.md`, `../supergh/CLAUDE.md`,
  `../superfix/CLAUDE.md`, `../superbiz/CLAUDE.md`, `../supercc/CLAUDE.md`,
  `../viber/CLAUDE.md`
