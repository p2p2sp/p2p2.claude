/*
 * resolve-input.test.ts - proves resolve-input.sh's label-parsing and
 * fail-soft/fail-hard contract: `resolve-input.sh <args-block> <label|?label>...`
 * emits `## <label> (<path>)` + file body per resolved label, or - the moment
 * any REQUIRED label/file cannot be resolved - a sole `## INPUT ERROR` block
 * with zero partial file content (exit 0 either way); calling it with no
 * labels at all is a wiring bug and exits 1 with a usage line on stderr.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/resolve-input.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/resolve-input.sh");

function isInputError(stdout: string): boolean {
  return stdout.startsWith("## INPUT ERROR\n");
}

test("happy path with two labels injects both files' content in order", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.writeFileSync(path.join(dir, "plan.md"), "hello\n");
    fs.writeFileSync(path.join(dir, "spec.md"), "world\n");
    const block = "plan: plan.md\nspec: spec.md\n";
    const result = runScript(SUT, [block, "plan", "spec"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "## plan (plan.md)\n\nhello\n\n## spec (spec.md)\n\nworld\n\n");
  });
});

test("an optional '?plan' label absent from the args block is silently skipped, no error", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.writeFileSync(path.join(dir, "spec.md"), "world\n");
    const block = "spec: spec.md\n";
    const result = runScript(SUT, [block, "?plan", "spec"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "## spec (spec.md)\n\nworld\n\n");
  });
});

test("an optional label present but its file missing is also silently skipped, no error", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.writeFileSync(path.join(dir, "spec.md"), "world\n");
    const block = "plan: missing.md\nspec: spec.md\n";
    const result = runScript(SUT, [block, "?plan", "spec"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "## spec (spec.md)\n\nworld\n\n");
  });
});

test("a required label missing from the args block -> sole INPUT ERROR block, exit 0", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.writeFileSync(path.join(dir, "spec.md"), "world\n");
    const block = "spec: spec.md\n";
    const result = runScript(SUT, [block, "plan", "spec"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.ok(isInputError(result.stdout), `expected an INPUT ERROR block, got: ${result.stdout}`);
    assert.ok(result.stdout.includes("missing required label 'plan:' in fork arguments"));
    assert.ok(!result.stdout.includes("world"), "no partial file content may leak into an error response");
  });
});

test("a required label present but its file missing -> sole INPUT ERROR block, zero file content, exit 0", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.writeFileSync(path.join(dir, "spec.md"), "world\n");
    const block = "plan: missing.md\nspec: spec.md\n";
    const result = runScript(SUT, [block, "plan", "spec"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.ok(isInputError(result.stdout), `expected an INPUT ERROR block, got: ${result.stdout}`);
    assert.ok(result.stdout.includes("file for 'plan:' not found: missing.md"));
    assert.ok(!result.stdout.includes("world"), "no partial file content may leak into an error response");
  });
});

test("no labels at all -> exit 1 with the usage line on stderr, nothing on stdout", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    const result = runScript(SUT, ["block"], { cwd: dir });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /usage: resolve-input\.sh <args-block> <label> \[label \.\.\.\]/);
  });
});

test("leading/trailing spaces around a label's value are trimmed", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.writeFileSync(path.join(dir, "plan.md"), "hello\n");
    const block = "plan:   plan.md   \n";
    const result = runScript(SUT, [block, "plan"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "## plan (plan.md)\n\nhello\n\n");
  });
});

test("a CRLF args block resolves identically to an LF one", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.writeFileSync(path.join(dir, "plan.md"), "hello\n");
    const block = "plan: plan.md\r\n";
    const result = runScript(SUT, [block, "plan"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "## plan (plan.md)\n\nhello\n\n");
  });
});

test("the same label appearing twice in the args block - the first occurrence wins", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.writeFileSync(path.join(dir, "plan.md"), "hello\n");
    fs.writeFileSync(path.join(dir, "spec.md"), "world\n");
    const block = "plan: plan.md\nplan: spec.md\n";
    const result = runScript(SUT, [block, "plan"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "## plan (plan.md)\n\nhello\n\n");
  });
});

test("a label value containing a space resolves the full path", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.mkdirSync(path.join(dir, "with space"));
    fs.writeFileSync(path.join(dir, "with space", "file.md"), "spaced content\n");
    const block = "plan: with space/file.md\n";
    const result = runScript(SUT, [block, "plan"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "## plan (with space/file.md)\n\nspaced content\n\n");
  });
});

test("an empty args block with a required label -> INPUT ERROR, missing required label", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    const result = runScript(SUT, ["", "plan"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.ok(isInputError(result.stdout));
    assert.ok(result.stdout.includes("missing required label 'plan:' in fork arguments"));
  });
});

test("a label whose value is a directory, not a file -> treated as not found", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.mkdirSync(path.join(dir, "adir"));
    const block = "plan: adir\n";
    const result = runScript(SUT, [block, "plan"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.ok(isInputError(result.stdout));
    assert.ok(result.stdout.includes("file for 'plan:' not found: adir"));
  });
});

test("a file with no trailing newline still gets exactly one newline appended after its content", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.writeFileSync(path.join(dir, "noeol.md"), "no newline");
    const block = "plan: noeol.md\n";
    const result = runScript(SUT, [block, "plan"], { cwd: dir });
    assert.equal(result.status, 0);
    // cat emits the file's bytes verbatim (no trailing \n of its own), then
    // the script's own `printf '\n'` supplies exactly one - unlike a file
    // that already ends in \n, there is no second, blank-line-separator \n.
    assert.equal(result.stdout, "## plan (noeol.md)\n\nno newline\n");
  });
});

test("a UTF-8 path resolves and injects its content", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.writeFileSync(path.join(dir, "café.md"), "utf8 body\n");
    const block = "plan: café.md\n";
    const result = runScript(SUT, [block, "plan"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "## plan (café.md)\n\nutf8 body\n\n");
  });
});

test("a label containing '/' breaks value_of's sed delimiter - observed failure, not silent success", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    const block = "a/b: x.md\n";
    const result = runScript(SUT, [block, "a/b"], { cwd: dir });
    // value_of interpolates the label straight into a sed s/// expression;
    // a label containing the delimiter character breaks the sed command
    // itself (not a graceful "missing label" fail-soft path).
    assert.notEqual(result.status, 0, `expected a hard failure, got status ${result.status}, stdout: ${result.stdout}`);
    assert.ok(result.stderr.length > 0, "sed's error should surface on stderr");
  });
});

test("a label containing '&' resolves normally - '&' is only special in a sed replacement, not the pattern", () => {
  withTempDir("p2p2-resolve-input-", (dir) => {
    fs.writeFileSync(path.join(dir, "x.md"), "x content\n");
    const block = "a&b: x.md\n";
    const result = runScript(SUT, [block, "a&b"], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "## a&b (x.md)\n\nx content\n\n");
  });
});
