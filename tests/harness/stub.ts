/*
 * stub.ts - a fake `gh`/`node`/whatever binary on its own PATH-prependable
 * dir, so a test never lets a script under test shell out to the real
 * network-facing tool.
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
