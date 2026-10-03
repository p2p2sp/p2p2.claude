# tests/harness/ - the shared helpers behind every script test

Plain `.ts` modules imported by the test files, never run on their own. Each helper that changes
behaviour keeps (or gains) its one assertion in `tests/harness.test.ts`.

## Invariants

- No harness module depends on a plugin's own code: `harness.test.ts` decodes `writePng` output
  itself for that reason. Imports run one way only: `tmp.ts` uses `run.ts`, `stub.ts` uses
  `tmp.ts`; `run.ts` and `test.ts` import no other helper.
- Nothing a case calls blocks the event loop: `runScript` spawns asynchronously, and the fixture
  wrappers (`withTempDir`, `withGitRepo`, `withStub`, `forEachShell`) await their callback, so the
  concurrent cases `test.ts` schedules really overlap. Only once-per-process probes stay
  synchronous (`bash --version`, `icacls`).
- Process creation is the suite's dominant cost, above all on Windows. A helper called once per
  case spawns nothing it can avoid: `shells.ts` memoises PATH scans and `bash --version` probes
  per PATH value and, outside CI, stops at the first working bash; `withGitRepo` copies a
  template repo `git init`ed once per process and writes its global gitconfig as a file instead
  of calling `git config`; `canDenyRead`/`canSymlinkDir` probe once per process.
- The full shell matrix is CI-only: `FULL_SHELL_MATRIX` (`CI` = `true`/`1`) is the one switch, and
  a local `forEachShell` runs the first shell present and reports the rest as skips.
- A capability helper answers `false` (a skip), never throws, and verifies by doing the real thing:
  `denyRead` re-reads the file and restores it when the read still works (root, FAT, a dropped
  ACE). `restoreRead` never throws, since it runs in a failing test's `finally`.
- `BASE_ENV_KEYS` in `run.ts` stays minimal: a key added there reaches every script under test,
  and a test's `opts.env` stops being the only source of script configuration.
- `runScript` reports `status: null` for a signal kill (the timeout included) and puts the spawn
  error message in `stderr` when the child never started.

## Windows mechanics

- CreateProcess ignores a shebang and only appends `.exe`, so on win32 `runScript` looks a bare
  command up in `opts.stubDirs` first, then invokes the file's shebang interpreter by name.
  `withStub` writes an extensionless `#!/bin/sh` stub (its body must be POSIX sh) plus a
  `name.cmd` shim calling it through `bash`.
- The `P2P2_ARGV<n>` preamble passes the shell and script paths slash-separated: dash resolves an
  `exec` target through execve and rejects `C:\...`. Its prefix tokens (`--posix`, `sh`) are the
  harness's own, never test data.
- A resolved `Shell` is an argv (`[bash, "--posix"]`, `[busybox, "sh"]`), never a generated
  wrapper script: an extensionless shim is not spawnable on Windows, where `bash --posix` is the
  only POSIX shell. `bash --posix` uses the first bash `bashShells()` finds; `/bin/bash` is always
  a candidate beside PATH.
- `perms.ts` spawns `icacls` directly, never through a shell (Git-Bash would rewrite `/deny` into a
  path), naming the account as `USERDOMAIN\USERNAME`; no `USERNAME` means incapable.
