/*
 * lib_sha256.test.ts - proves lib_sha256.sh, the ONE portable sha256 digest
 * behind the reviewed-plan check: the ExitPlanMode hook records a plan's
 * digest beside it, decompose.sh recomputes it, and both must spell it the
 * same way whatever digest tool the host machine offers (`sha256sum`,
 * `shasum -a 256`, `openssl`). The library is sourced, never executed, so it
 * runs through a bash wrapper under `forEachShell("bash", ...)`. The oracle is
 * Node's own `crypto.createHash("sha256")`.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/lib_sha256.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";
import { slash } from "../harness/paths.ts";

const SCRIPTS = path.resolve(import.meta.dirname, "../../superdev/scripts");
const LIB = path.join(SCRIPTS, "lib_sha256.sh");
const DECOMPOSE = path.join(SCRIPTS, "decompose.sh");
const HOOK = path.resolve(import.meta.dirname, "../../superdev/hooks/scripts/review-plan.sh");

/** Sources the library and prints the digest of `$1` inside brackets, then the
 *  function's return code on its own `rc=` line, so an empty stdout on failure
 *  is visible to an assertion next to the code that caused it. */
function wrapperScript(libPath: string): string {
  return (
    [
      "#!/usr/bin/env bash",
      `source "${slash(libPath)}"`,
      'out="$(sha256_of "$1")"; rc=$?',
      "printf '[%s]\\n' \"$out\"",
      'printf \'rc=%s\\n\' "$rc"',
    ].join("\n") + "\n"
  );
}

function runLib(bash: Shell, file: string): RunResult {
  return withTempDir("p2p2-lib-sha256-wrapper-", (dir) => {
    const wrapper = path.join(dir, "wrapper.sh");
    fs.writeFileSync(wrapper, wrapperScript(LIB), { mode: 0o755 });
    fs.chmodSync(wrapper, 0o755);
    return runScript(wrapper, [file], { shell: bash });
  });
}

function parsed(result: RunResult): { value: string; rc: string } {
  const lines = result.stdout.replace(/\r/g, "").split("\n");
  const bracketed = lines.find((line) => line.startsWith("[") && line.endsWith("]")) ?? "[?]";
  const rcLine = lines.find((line) => line.startsWith("rc=")) ?? "rc=?";
  return { value: bracketed.slice(1, -1), rc: rcLine.slice(3) };
}

function assertBash(fn: (bash: Shell) => void): void {
  const skips = forEachShell("bash", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "bash");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

test("sha256_of prints the lowercase hex digest of a known file's bytes, matching Node's crypto oracle, and returns 0", () => {
  assertBash((bash) => {
    withTempDir("p2p2-lib-sha256-file-", (dir) => {
      const file = path.join(dir, "plan.md");
      // bytes chosen to catch a text-mode tool: a CR, a non-ASCII character,
      // no trailing newline
      fs.writeFileSync(file, "# SuperPlan\r\nTitle: zażółć\r\nbody");
      const expected = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
      const { value, rc } = parsed(runLib(bash, file));
      assert.equal(rc, "0");
      assert.equal(value, expected);
      assert.match(value, /^[0-9a-f]{64}$/);
    });
  });
});

test("sha256_of on a file that does not exist prints nothing and returns 1 (the caller decides what a missing digest means)", () => {
  assertBash((bash) => {
    withTempDir("p2p2-lib-sha256-missing-", (dir) => {
      const { value, rc } = parsed(runLib(bash, path.join(dir, "nowhere", "plan.md")));
      assert.equal(rc, "1");
      assert.equal(value, "");
    });
  });
});

test("sha256_of with an empty argument prints nothing and returns 1", () => {
  assertBash((bash) => {
    const { value, rc } = parsed(runLib(bash, ""));
    assert.equal(rc, "1");
    assert.equal(value, "");
  });
});

// --- The bind: both sides of the reviewed-plan check source this library and
// neither picks a digest tool of its own. ---

test("decompose.sh and review-plan.sh both source lib_sha256.sh and call no digest tool directly", () => {
  assert.ok(fs.existsSync(LIB), `the shared digest library must exist at ${LIB}`);
  for (const script of [DECOMPOSE, HOOK]) {
    const content = fs.readFileSync(script, "utf-8");
    assert.match(content, /lib_sha256\.sh/, `${script} must source lib_sha256.sh`);
    assert.doesNotMatch(content, /^\s*sha256_of\(\)\s*\{/m, `${script} must not define its own sha256_of()`);
    // the tool names appear only inside the library, never as a call site here
    const codeLines = content.split("\n").filter((line) => !/^\s*#/.test(line));
    for (const tool of ["sha256sum", "shasum", "openssl"]) {
      assert.ok(!codeLines.some((line) => line.includes(tool)), `${script} must not call ${tool} itself`);
    }
  }
});
