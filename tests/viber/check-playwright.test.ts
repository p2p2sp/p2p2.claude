/*
 * check-playwright.test.ts - proves viber/scripts/check-playwright.sh's fixed
 * two-line report ("playwright-cli: ...", "@playwright/test: ..."), exit 0
 * always, across presence/absence of each tool independently.
 *
 * Exit 0 is the whole point: the script is the `e2e` skill's `!` preload, and a
 * non-zero exit there aborts the skill load, so a host missing both tools would
 * lose the skill instead of being offered the install.
 *
 * PATH isolation: `stubDirs` only PREPENDS to the real PATH, so on a host that
 * already has a real `playwright-cli` on PATH the "not found" cases would flip.
 * Every case therefore pins `opts.env.PATH` to the harness's minimal PATH
 * (`coreUtilsPath` in tests/harness/stub.ts, which carries the full rationale,
 * `git` included), and the found cases prepend one `withStub` dir on top of it.
 *
 * Repo reality: no build, no lint, no npm, no package.json (for THIS repo) -
 * this file is run directly by Node's native test runner + TypeScript type
 * stripping:
 *   node --test tests/viber/check-playwright.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { coreUtilsPath, withStub } from "../harness/stub.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/check-playwright.sh");

const STUB_VERSION_1_2_3 = 'echo "1.2.3"';
const STUB_VERSION_FAILS = "exit 1";

function run(dir: string, stubDirs: string[] = []) {
  return runScript(SUT, [], { cwd: dir, env: { PATH: coreUtilsPath() }, stubDirs });
}

test("no playwright-cli on PATH and no package.json: both lines report not found, and the exit is still 0", () => {
  withTempDir("p2p2-viber-playwright-", (dir) => {
    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "playwright-cli: not found\n@playwright/test: not found\n");
  });
});

test("playwright-cli resolving and --version printing a line reports found with that version", () => {
  withStub("playwright-cli", STUB_VERSION_1_2_3, (stubDir) => {
    withTempDir("p2p2-viber-playwright-", (dir) => {
      const result = run(dir, [stubDir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "playwright-cli: found 1.2.3\n@playwright/test: not found\n");
    });
  });
});

test("playwright-cli present but --version exiting 1 reports found (version unknown) rather than not found", () => {
  withStub("playwright-cli", STUB_VERSION_FAILS, (stubDir) => {
    withTempDir("p2p2-viber-playwright-", (dir) => {
      const result = run(dir, [stubDir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "playwright-cli: found (version unknown)\n@playwright/test: not found\n");
    });
  });
});

test("a root package.json naming @playwright/test under devDependencies reports it found", () => {
  withTempDir("p2p2-viber-playwright-", (dir) => {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "fixture", devDependencies: { "@playwright/test": "^1.40.0" } }, null, 2),
    );
    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "playwright-cli: not found\n@playwright/test: found\n");
  });
});

test("a package.json that does not name @playwright/test reports it not found (the two dimensions are independent)", () => {
  withStub("playwright-cli", STUB_VERSION_1_2_3, (stubDir) => {
    withTempDir("p2p2-viber-playwright-", (dir) => {
      fs.writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify({ name: "fixture", devDependencies: { vitest: "^1.0.0" } }, null, 2),
      );
      const result = run(dir, [stubDir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "playwright-cli: found 1.2.3\n@playwright/test: not found\n");
    });
  });
});
