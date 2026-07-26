/*
 * check_node.test.ts - proves check_node.sh's single-line contract across
 * every documented Node version threshold: `NODE_OK <cmd>` (node, or node
 * --experimental-strip-types) below the type-stripping cutover, or
 * `NODE_MISSING` when node is absent, unparsable, or too old - always
 * exiting 0 (fail-open).
 *
 * check_node.sh is `#!/bin/sh`, so every case runs through
 * forEachShell("posix", ...) via opts.shell, never executed directly.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superfix/check_node.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withStub } from "../harness/stub.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../superfix/skills/code-auditor/scripts/check_node.sh");

/** The real PATH, minus every directory that resolves a real `node` - so
 *  "no node on PATH" is genuine even on a dev machine that has node
 *  installed, on every OS. */
function pathWithoutNode(): string {
  const nodeNames = process.platform === "win32" ? ["node.exe", "node.cmd", "node.bat", "node"] : ["node"];
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const kept = dirs.filter((dir) => !nodeNames.some((name) => fs.existsSync(path.join(dir, name))));
  return kept.join(path.delimiter);
}

function assertPosix(fn: (shell: Shell) => void) {
  const skips = forEachShell("posix", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "posix");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

function assertOneLine(result: RunResult, expected: string) {
  assert.equal(result.status, 0, `check_node.sh must always exit 0 (fail-open): stderr=${result.stderr}`);
  assert.equal(result.stdout, `${expected}\n`);
}

const NODE_OK_VERSIONS = ["v26.0.0", "v24.0.0", "v23.6.0"];
const NODE_OK_STRIP_VERSIONS = ["v23.5.0", "v22.6.0"];
const NODE_MISSING_VERSIONS = ["v22.5.0", "v20.0.0"];

test("node >= 23.6 (type stripping on by default) -> NODE_OK node", () => {
  assertPosix((shell) => {
    for (const version of NODE_OK_VERSIONS) {
      withStub("node", `echo '${version}'`, (stubDir) => {
        const result = runScript(SUT, [], { shell, stubDirs: [stubDir] });
        assertOneLine(result, "NODE_OK node");
      });
    }
  });
});

test("22.6 <= node < 23.6 -> NODE_OK node --experimental-strip-types", () => {
  assertPosix((shell) => {
    for (const version of NODE_OK_STRIP_VERSIONS) {
      withStub("node", `echo '${version}'`, (stubDir) => {
        const result = runScript(SUT, [], { shell, stubDirs: [stubDir] });
        assertOneLine(result, "NODE_OK node --experimental-strip-types");
      });
    }
  });
});

test("node < 22.6 -> NODE_MISSING", () => {
  assertPosix((shell) => {
    for (const version of NODE_MISSING_VERSIONS) {
      withStub("node", `echo '${version}'`, (stubDir) => {
        const result = runScript(SUT, [], { shell, stubDirs: [stubDir] });
        assertOneLine(result, "NODE_MISSING");
      });
    }
  });
});

test("no node on PATH -> NODE_MISSING", () => {
  assertPosix((shell) => {
    const result = runScript(SUT, [], { shell, env: { PATH: pathWithoutNode() } });
    assertOneLine(result, "NODE_MISSING");
  });
});

test("node present but `node -v` exits non-zero -> NODE_MISSING", () => {
  assertPosix((shell) => {
    withStub("node", "exit 3", (stubDir) => {
      const result = runScript(SUT, [], { shell, stubDirs: [stubDir] });
      assertOneLine(result, "NODE_MISSING");
    });
  });
});

test("a malformed version string -> NODE_MISSING", () => {
  assertPosix((shell) => {
    withStub("node", "echo 'not-a-version'", (stubDir) => {
      const result = runScript(SUT, [], { shell, stubDirs: [stubDir] });
      assertOneLine(result, "NODE_MISSING");
    });
  });
});
