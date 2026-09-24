/*
 * check-playwright.test.ts - proves check-playwright.sh's fixed two-line
 * report ("playwright-cli: ...", "@playwright/test: ..."), exit 0 always,
 * across presence/absence of each tool independently.
 *
 * PATH isolation: `stubDirs` only PREPENDS to the real PATH, so on a host
 * that already has a real `playwright-cli` on PATH the "not found" cases
 * would flip. Every case therefore pins `opts.env.PATH` to the harness's
 * minimal PATH (`coreUtilsPath` in tests/harness/stub.ts, which carries the
 * full rationale, `git` included), and the found cases prepend one `withStub`
 * dir on top of it.
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
import { coreUtilsPath, withStub } from "../harness/stub.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/check-playwright.sh");

const STUB_VERSION_1_2_3 = 'echo "1.2.3"';
const STUB_VERSION_FAILS = "exit 1";

function run(dir: string, stubDirs: string[] = []) {
  return runScript(SUT, [], { cwd: dir, env: { PATH: coreUtilsPath() }, stubDirs });
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
