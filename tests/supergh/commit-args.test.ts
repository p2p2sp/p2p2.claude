/*
 * commit-args.test.ts - proves commit-args.sh's `resolve_commit_selector <raw>`
 * contract: it is a library meant to be SOURCED (not executed), so every case
 * here drives it through a tiny bash wrapper that sources it, calls
 * `resolve_commit_selector "$1"` and prints COMMIT_MODE / COMMIT_PATH /
 * COMMIT_ISSUE_REFS, one per line. commit-args.sh is `#!/usr/bin/env bash`
 * and uses bash-only constructs (BASH_REMATCH, [[ ]]), so every case runs
 * under `forEachShell("bash", ...)` - never a POSIX shell.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/supergh/commit-args.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { forEachShell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../supergh/skills/commit/scripts/commit-args.sh");

function wrapperScript(libPath: string): string {
  return [
    "#!/usr/bin/env bash",
    `source "${libPath}"`,
    'resolve_commit_selector "$1"',
    "printf '%s\\n' \"$COMMIT_MODE\"",
    "printf '%s\\n' \"$COMMIT_PATH\"",
    "printf '%s\\n' \"$COMMIT_ISSUE_REFS\"",
  ].join("\n") + "\n";
}

interface Selector {
  mode: string;
  path: string;
  issueRefs: string;
}

/** Sources commit-args.sh into a fresh bash wrapper, calls
 *  `resolve_commit_selector <raw>` with `cwd` as the working directory
 *  (so relative-path existence checks resolve against it), and returns the
 *  three resulting variables. */
function resolve(bash: string, cwd: string, raw: string): Selector {
  return withTempDir("p2p2-commit-args-wrapper-", (wrapperDir) => {
    const wrapper = path.join(wrapperDir, "wrapper.sh");
    fs.writeFileSync(wrapper, wrapperScript(SUT), { mode: 0o755 });
    fs.chmodSync(wrapper, 0o755);
    const result: RunResult = runScript(wrapper, [raw], { shell: bash, cwd });
    assert.equal(result.status, 0, `wrapper should succeed: ${result.stderr}`);
    const lines = result.stdout.split("\n");
    return { mode: lines[0], path: lines[1], issueRefs: lines[2] };
  });
}

function assertBash(fn: (bash: string) => void) {
  const skips = forEachShell("bash", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "bash");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

// --- selector resolution ------------------------------------------------------

test("empty input resolves to mode 'all' with no path", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const sel = resolve(bash, dir, "");
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "" });
    });
  });
});

test("'staged' resolves to mode 'staged' with no path", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const sel = resolve(bash, dir, "staged");
      assert.deepEqual(sel, { mode: "staged", path: "", issueRefs: "" });
    });
  });
});

test("an existing path resolves to mode 'path' with the path passed verbatim", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.writeFileSync(path.join(dir, "foo.txt"), "content\n");
      const sel = resolve(bash, dir, "foo.txt");
      assert.deepEqual(sel, { mode: "path", path: "foo.txt", issueRefs: "" });
    });
  });
});

test("a path that does not exist falls back to mode 'all' (avoids a silent no-op commit against a typo'd path)", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const sel = resolve(bash, dir, "does/not/exist.txt");
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "" });
    });
  });
});

test("an existing path named 'staged' resolves to mode 'path' - existing path wins over the keyword", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.writeFileSync(path.join(dir, "staged"), "content\n");
      const sel = resolve(bash, dir, "staged");
      assert.deepEqual(sel, { mode: "path", path: "staged", issueRefs: "" });
    });
  });
});

test("an existing path named 'all' resolves to mode 'path' - existing path wins over the keyword", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.writeFileSync(path.join(dir, "all"), "content\n");
      const sel = resolve(bash, dir, "all");
      assert.deepEqual(sel, { mode: "path", path: "all", issueRefs: "" });
    });
  });
});

test("a single issue URL is stripped before selector resolution, leaving mode 'all'", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const sel = resolve(bash, dir, "https://github.com/owner/repo/issues/42");
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "42" });
    });
  });
});

test("several issue URLs are all stripped, unique and in order of appearance", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const raw = "https://github.com/owner/repo/issues/42 https://github.com/owner/repo/issues/7";
      const sel = resolve(bash, dir, raw);
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "42 7" });
    });
  });
});

test("a repeated issue URL is deduplicated to one reference", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const raw = "https://github.com/owner/repo/issues/42 https://github.com/owner/repo/issues/42";
      const sel = resolve(bash, dir, raw);
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "42" });
    });
  });
});

test("an issue URL plus an existing path resolves to mode 'path' with the issue ref captured separately", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.mkdirSync(path.join(dir, "src"));
      fs.writeFileSync(path.join(dir, "src", "foo"), "content\n");
      const raw = "src/foo https://github.com/owner/repo/issues/42";
      const sel = resolve(bash, dir, raw);
      assert.deepEqual(sel, { mode: "path", path: "src/foo", issueRefs: "42" });
    });
  });
});

test("a path containing a space resolves to mode 'path' with the space preserved verbatim", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.writeFileSync(path.join(dir, "my file.txt"), "content\n");
      const sel = resolve(bash, dir, "my file.txt");
      assert.deepEqual(sel, { mode: "path", path: "my file.txt", issueRefs: "" });
    });
  });
});
