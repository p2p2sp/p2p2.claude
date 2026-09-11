/*
 * record-decision.test.ts - proves record-decision.sh's contract: appends
 * one line in the review-contract's "## Decisions file" shape
 * (`- <id> - <subject> - accepted: <accepted-text> - <date +%F>`) to
 * <workdir>/implementation/decisions.md, creating the implementation/
 * directory as needed, and reports "decision: <path> -> <id>" on stdout.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/record-decision.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/record-decision.sh");

const DATE_RE = "\\d{4}-\\d{2}-\\d{2}";

test("happy path creates decisions.md with exactly one line in the documented shape", () => {
  withTempDir("p2p2-record-decision-", (dir) => {
    const result = runScript(SUT, [dir, "C3", "criterion 7", "user approved the workaround"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const decisions = path.join(dir, "implementation", "decisions.md");
    const content = fs.readFileSync(decisions, "utf-8");
    const lines = content.split("\n").filter((l) => l.length > 0);
    assert.equal(lines.length, 1);
    assert.match(
      lines[0],
      new RegExp(`^- C3 - criterion 7 - accepted: user approved the workaround - ${DATE_RE}$`),
    );
    assert.equal(slash(result.stdout.trim()), `decision: ${slash(decisions)} -> C3`);
  });
});

test("a second call appends, leaving the first line unchanged", () => {
  withTempDir("p2p2-record-decision-", (dir) => {
    runScript(SUT, [dir, "C3", "criterion 7", "first decision"], { cwd: dir });
    const result = runScript(SUT, [dir, "I2", "criterion 9", "second decision"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const decisions = path.join(dir, "implementation", "decisions.md");
    const lines = fs.readFileSync(decisions, "utf-8").split("\n").filter((l) => l.length > 0);
    assert.equal(lines.length, 2);
    assert.match(lines[0], /^- C3 - criterion 7 - accepted: first decision - /);
    assert.match(lines[1], /^- I2 - criterion 9 - accepted: second decision - /);
  });
});

test("missing argument -> exit 1 with usage on stderr", () => {
  withTempDir("p2p2-record-decision-", (dir) => {
    const result = runScript(SUT, [dir, "C1", "subject"], { cwd: dir });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /usage: record-decision\.sh <workdir> <id> <subject> <accepted-text>/);
  });
});

test("an accepted text with a colon and a non-ASCII character round-trips verbatim", () => {
  withTempDir("p2p2-record-decision-", (dir) => {
    const accepted = "kept as-is: café behaviour is fine";
    const result = runScript(SUT, [dir, "C5", "criterion 21", accepted], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const decisions = path.join(dir, "implementation", "decisions.md");
    const content = fs.readFileSync(decisions, "utf-8");
    assert.ok(content.includes(`accepted: ${accepted} -`), content);
  });
});

test("a workdir with a trailing slash and a leading './' is normalised before use", () => {
  withTempDir("p2p2-record-decision-", (dir) => {
    const result = runScript(SUT, ["./sub/", "C1", "subject", "accepted text"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const decisions = path.join(dir, "sub", "implementation", "decisions.md");
    assert.ok(fs.existsSync(decisions));
    assert.equal(slash(result.stdout.trim()), "decision: sub/implementation/decisions.md -> C1");
  });
});

test("an existing decisions.md with no trailing newline gets the new line started on a fresh line", () => {
  withTempDir("p2p2-record-decision-", (dir) => {
    const implDir = path.join(dir, "implementation");
    fs.mkdirSync(implDir, { recursive: true });
    fs.writeFileSync(path.join(implDir, "decisions.md"), "- C1 - old - accepted: old text - 2020-01-01");
    const result = runScript(SUT, [dir, "C2", "new", "new text"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const content = fs.readFileSync(path.join(implDir, "decisions.md"), "utf-8");
    const lines = content.split("\n").filter((l) => l.length > 0);
    assert.equal(lines.length, 2);
    assert.equal(lines[0], "- C1 - old - accepted: old text - 2020-01-01");
    assert.match(lines[1], /^- C2 - new - accepted: new text - /);
  });
});
