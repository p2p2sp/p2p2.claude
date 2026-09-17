/*
 * check-playwright.test.ts - proves check-playwright.sh's fixed two-line
 * report ("playwright-cli: ...", "@playwright/test: ..."), exit 0 always,
 * across presence/absence of each tool independently.
 *
 * PATH isolation: `stubDirs` only PREPENDS to the real PATH, so on a host
 * that already has a real `playwright-cli` on PATH the "not found" cases
 * would flip. Every case therefore pins `opts.env.PATH` to the single real
 * PATH directory that resolves `grep` (or `grep.exe`) - the one directory
 * Git-for-Windows' `usr/bin` (or a POSIX box's `/usr/bin`) ships every
 * coreutil bootstrap.sh/check-playwright.sh need (bash, grep, head, printf)
 * alongside `bash` itself, which the harness needs to invoke the SUT's
 * `#!/usr/bin/env bash` shebang by name on win32 - while still starving out
 * `playwright-cli` and `git`. Losing `git` is fine: check-playwright.sh
 * falls back to `pwd` for `root` exactly per its own contract.
 *
 * Repo reality: no build, no lint, no npm, no package.json (for THIS repo) -
 * this file is run directly by Node's native test runner + TypeScript type
 * stripping:
 *   node --test tests/superdev/check-playwright.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { withStub } from "../harness/stub.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/check-playwright.sh");

const STUB_VERSION_1_2_3 = 'echo "1.2.3"';
const STUB_VERSION_FAILS = "exit 1";

/** The one real PATH directory that resolves `grep` - core utilities only,
 *  no `playwright-cli`, no `git`. See file header. */
function grepOnlyPath(): string {
  const names = process.platform === "win32" ? ["grep.exe", "grep"] : ["grep"];
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    if (names.some((name) => fs.existsSync(path.join(dir, name)))) return dir;
  }
  throw new Error("check-playwright.test.ts: no directory on PATH resolves grep");
}

function run(dir: string, stubDirs: string[] = []) {
  return runScript(SUT, [], { cwd: dir, env: { PATH: grepOnlyPath() }, stubDirs });
}

test("not found: no playwright-cli on PATH, no package.json -> both lines not found, exit 0", () => {
  withTempDir("p2p2-check-playwright-", (dir) => {
    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "playwright-cli: not found\n@playwright/test: not found\n");
  });
});

test("found with version: playwright-cli resolves and --version prints a line -> found <version>", () => {
  withStub("playwright-cli", STUB_VERSION_1_2_3, (stubDir) => {
    withTempDir("p2p2-check-playwright-", (dir) => {
      const result = run(dir, [stubDir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "playwright-cli: found 1.2.3\n@playwright/test: not found\n");
    });
  });
});

test("found with --version exiting 1: no output -> found (version unknown)", () => {
  withStub("playwright-cli", STUB_VERSION_FAILS, (stubDir) => {
    withTempDir("p2p2-check-playwright-", (dir) => {
      const result = run(dir, [stubDir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "playwright-cli: found (version unknown)\n@playwright/test: not found\n");
    });
  });
});

test("@playwright/test: found when root package.json names it under devDependencies", () => {
  withTempDir("p2p2-check-playwright-", (dir) => {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "fixture", devDependencies: { "@playwright/test": "^1.40.0" } }, null, 2),
    );
    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "playwright-cli: not found\n@playwright/test: found\n");
  });
});

test("@playwright/test: not found without a package.json, independent of the playwright-cli dimension", () => {
  withStub("playwright-cli", STUB_VERSION_1_2_3, (stubDir) => {
    withTempDir("p2p2-check-playwright-", (dir) => {
      const result = run(dir, [stubDir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "playwright-cli: found 1.2.3\n@playwright/test: not found\n");
    });
  });
});
