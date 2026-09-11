/*
 * checkpoint-update.test.ts - proves checkpoint-update.sh's contract:
 * overwrites <workdir>/checkpoint.md with exactly two lines
 * (`since: <since-sha>` and `prior: <prior-report>`) and reports
 * "checkpoint: <path> -> <since-sha>" on stdout.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/checkpoint-update.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/checkpoint-update.sh");

test("first call creates the two-line checkpoint.md and reports it on stdout", () => {
  withTempDir("p2p2-checkpoint-update-", (dir) => {
    const result = runScript(SUT, [dir, "abc1234", "implementation/checkpoint-01.md"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const checkpoint = path.join(dir, "checkpoint.md");
    assert.equal(
      fs.readFileSync(checkpoint, "utf-8"),
      "since: abc1234\nprior: implementation/checkpoint-01.md\n",
    );
    assert.equal(slash(result.stdout.trim()), `checkpoint: ${slash(checkpoint)} -> abc1234`);
  });
});

test("a second call overwrites both lines rather than appending", () => {
  withTempDir("p2p2-checkpoint-update-", (dir) => {
    runScript(SUT, [dir, "abc1234", "implementation/checkpoint-01.md"], { cwd: dir });
    const result = runScript(SUT, [dir, "def5678", "implementation/checkpoint-02.md"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const checkpoint = path.join(dir, "checkpoint.md");
    assert.equal(
      fs.readFileSync(checkpoint, "utf-8"),
      "since: def5678\nprior: implementation/checkpoint-02.md\n",
    );
  });
});

test("missing argument -> exit 1 with usage on stderr", () => {
  withTempDir("p2p2-checkpoint-update-", (dir) => {
    const result = runScript(SUT, [dir, "abc1234"], { cwd: dir });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /usage: checkpoint-update\.sh <workdir> <since-sha> <prior-report>/);
  });
});

test("a workdir with a trailing slash and a leading './' is normalised before use", () => {
  withTempDir("p2p2-checkpoint-update-", (dir) => {
    fs.mkdirSync(path.join(dir, "sub"));
    const result = runScript(SUT, ["./sub/", "abc1234", "implementation/checkpoint-01.md"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const checkpoint = path.join(dir, "sub", "checkpoint.md");
    assert.ok(fs.existsSync(checkpoint));
    assert.equal(slash(result.stdout.trim()), "checkpoint: sub/checkpoint.md -> abc1234");
  });
});
