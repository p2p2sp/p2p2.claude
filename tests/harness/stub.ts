/*
 * stub.ts - PATH control for a script under test: a fake `gh`/`node`/whatever
 * binary on its own PATH-prependable dir (`withStub`), so a test never lets a
 * script shell out to the real network-facing tool, and a minimal PATH holding
 * core utilities only (`coreUtilsPath`), so a tool a developer happens to have
 * installed cannot answer a "not found" case. The two compose: pin
 * `opts.env.PATH` to `coreUtilsPath()` and prepend one `withStub` dir through
 * `opts.stubDirs` to put exactly one tool back.
 */

import fs from "node:fs";
import path from "node:path";

import { withTempDir } from "./tmp.ts";

/** Writes an executable `#!/bin/sh` stub named `name` (body appended after
 *  the shebang) into a fresh temp dir, and - on win32, where a shebang alone
 *  would not resolve - a matching `name.cmd` shim that shells out to it via
 *  bash, so the stub is found whichever way the OS resolves an unqualified
 *  command name (a shell under test resolves the extensionless file itself;
 *  a spawn straight from the test goes through `runScript`'s stubDirs
 *  lookup). The dir is meant to be prepended to `PATH` (see
 *  `RunOpts.stubDirs`). Cleaned up whether `fn` returns or throws. */
export function withStub<T>(name: string, body: string, fn: (stubDir: string) => T): T {
  return withTempDir("p2p2-stub-", (dir) => {
    const scriptPath = path.join(dir, name);
    fs.writeFileSync(scriptPath, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
    fs.chmodSync(scriptPath, 0o755);
    if (process.platform === "win32") {
      const cmdPath = path.join(dir, `${name}.cmd`);
      fs.writeFileSync(cmdPath, `@echo off\r\nbash "%~dp0${name}" %*\r\n`);
    }
    return fn(dir);
  });
}

/** A PATH value holding exactly one directory: the first on the current PATH
 *  that resolves `grep` - `/usr/bin` on a POSIX box, Git-for-Windows'
 *  `usr/bin` on win32. That directory ships the utilities a shell script under
 *  test needs to run at all (bash, grep, head, printf) and nothing a developer
 *  installed on top of them, so a host that happens to carry a real
 *  `playwright-cli`, `gh` or `npm` cannot answer - and flip - a "not found"
 *  case. `RunOpts.stubDirs` only PREPENDS to the inherited PATH, which is why
 *  starving it first is the only way to assert absence.
 *
 *  It is not a coreutils-only guarantee: that same directory ships `git` on a
 *  POSIX box (the CI ubuntu leg included), so a script whose behaviour branches
 *  on `git` must hold either way. check-playwright.sh does - its cwd is a temp
 *  dir, which is no repository, so `git rev-parse --show-toplevel` fails there
 *  whether or not `git` resolves and `root` lands on the cwd through either
 *  branch. */
export function coreUtilsPath(): string {
  const names = process.platform === "win32" ? ["grep.exe", "grep"] : ["grep"];
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    if (names.some((name) => fs.existsSync(path.join(dir, name)))) return dir;
  }
  throw new Error("tests/harness/stub.ts: no directory on PATH resolves grep");
}
