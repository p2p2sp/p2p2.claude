/*
 * commit-args.test.ts - proves commit-args.sh's `resolve_commit_selector <raw>`
 * contract: it is a library meant to be SOURCED (not executed), so every case
 * here drives it through a tiny bash wrapper that sources it, calls
 * `resolve_commit_selector "$1"` and prints COMMIT_MODE / COMMIT_PATHS (joined
 * with "|") / COMMIT_ISSUE_REFS, one per line. commit-args.sh is `#!/usr/bin/env bash`
 * and uses bash-only constructs (BASH_REMATCH, [[ ]]), so every case runs
 * under `forEachShell("bash", ...)` - never a POSIX shell.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/commit-args.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir } from "../harness/tmp.ts";
import { forEachShell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/commit/scripts/commit-args.sh");

function wrapperScript(libPath: string): string {
  return [
    "#!/usr/bin/env bash",
    `source "${libPath}"`,
    'resolve_commit_selector "$1"',
    "printf '%s\\n' \"$COMMIT_MODE\"",
    "IFS='|'; printf '%s\\n' \"${COMMIT_PATHS[*]}\"",
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

test("'staged' is no longer a keyword: with no such path it falls back to mode 'all'", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const sel = resolve(bash, dir, "staged");
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "" });
    });
  });
});

test("an existing path resolves to mode 'paths' with the path passed verbatim", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.writeFileSync(path.join(dir, "foo.txt"), "content\n");
      const sel = resolve(bash, dir, "foo.txt");
      assert.deepEqual(sel, { mode: "paths", path: "foo.txt", issueRefs: "" });
    });
  });
});

test("a path that does not exist resolves to mode 'missing', never 'all' (a typo'd or stale path must not widen the commit to every change)", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const sel = resolve(bash, dir, "does/not/exist.txt");
      assert.deepEqual(sel, { mode: "missing", path: "", issueRefs: "" });
    });
  });
});

test("a list of backslashed Windows paths none of which exists resolves to mode 'missing'", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const sel = resolve(bash, dir, "src\\gone.ts lib\\old.ts");
      assert.equal(sel.mode, "missing");
    });
  });
});

test("prose that happens to hold no path-shaped token still falls back to mode 'all', while one existing path among missing ones stays mode 'paths'", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.writeFileSync(path.join(dir, "a.txt"), "a\n");
      assert.equal(resolve(bash, dir, "update the docs").mode, "all");
      assert.deepEqual(resolve(bash, dir, "a.txt src/gone.ts"), { mode: "paths", path: "a.txt", issueRefs: "" });
    });
  });
});

test("a path already removed with git rm (gone from disk and index, still in HEAD) resolves to mode 'paths' (it used to be dropped, narrowing or widening the commit)", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      fs.mkdirSync(path.join(repo.dir, "gone"));
      fs.writeFileSync(path.join(repo.dir, "gone", "f.txt"), "f\n");
      fs.writeFileSync(path.join(repo.dir, "kept.txt"), "k\n");
      repo.git("add", "-A");
      repo.git("commit", "-m", "seed");
      repo.git("rm", "-rq", "gone");
      const sel = resolve(bash, repo.dir, "kept.txt gone");
      assert.deepEqual(sel, { mode: "paths", path: "kept.txt|gone", issueRefs: "" });
    });
  });
});

test("an existing path named 'all' resolves to mode 'paths' - existing path wins over the keyword", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.writeFileSync(path.join(dir, "all"), "content\n");
      const sel = resolve(bash, dir, "all");
      assert.deepEqual(sel, { mode: "paths", path: "all", issueRefs: "" });
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

test("an issue URL plus an existing path resolves to mode 'paths' with the issue ref captured separately", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.mkdirSync(path.join(dir, "src"));
      fs.writeFileSync(path.join(dir, "src", "foo"), "content\n");
      const raw = "src/foo https://github.com/owner/repo/issues/42";
      const sel = resolve(bash, dir, raw);
      assert.deepEqual(sel, { mode: "paths", path: "src/foo", issueRefs: "42" });
    });
  });
});

test("a bare '#42' reference is stripped before selector resolution, leaving mode 'all'", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const sel = resolve(bash, dir, "#42");
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "42" });
    });
  });
});

test("several bare references are all stripped, unique and in order of appearance", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const sel = resolve(bash, dir, "#42 #7 #42");
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "42 7" });
    });
  });
});

test("a bare reference next to punctuation is still recognised", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const sel = resolve(bash, dir, "(#42,#7)");
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "42 7" });
    });
  });
});

test("a bare reference plus an existing path resolves to mode 'paths' with the ref captured separately", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.mkdirSync(path.join(dir, "src"));
      fs.writeFileSync(path.join(dir, "src", "foo"), "content\n");
      const sel = resolve(bash, dir, "src/foo #42");
      assert.deepEqual(sel, { mode: "paths", path: "src/foo", issueRefs: "42" });
    });
  });
});

test("an issue URL and a bare reference combine into one deduplicated ref list", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const raw = "https://github.com/owner/repo/issues/42 #7 #42";
      const sel = resolve(bash, dir, raw);
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "42 7" });
    });
  });
});

test("a '#' token that is not a bare issue number yields no reference", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      // hex colour, alnum suffix and a bare '#' - none of them is an issue number
      const sel = resolve(bash, dir, "#1a2b3c #42abc #");
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "" });
    });
  });
});

test("a URL fragment after the issue number does not leak a second reference", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const raw = "https://github.com/owner/repo/issues/42#issuecomment-99";
      const sel = resolve(bash, dir, raw);
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "42" });
    });
  });
});

test("a path containing a space resolves to mode 'paths' with the space preserved verbatim", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.writeFileSync(path.join(dir, "my file.txt"), "content\n");
      const sel = resolve(bash, dir, "my file.txt");
      assert.deepEqual(sel, { mode: "paths", path: "my file.txt", issueRefs: "" });
    });
  });
});

test("several space-separated existing paths resolve to mode 'paths' with every path kept in order", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.writeFileSync(path.join(dir, "a.txt"), "a\n");
      fs.mkdirSync(path.join(dir, "src"));
      const sel = resolve(bash, dir, "a.txt src");
      assert.deepEqual(sel, { mode: "paths", path: "a.txt|src", issueRefs: "" });
    });
  });
});

test("a comma-separated list is split like a space-separated one", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.writeFileSync(path.join(dir, "a.txt"), "a\n");
      fs.writeFileSync(path.join(dir, "b.txt"), "b\n");
      const sel = resolve(bash, dir, "a.txt, b.txt");
      assert.deepEqual(sel, { mode: "paths", path: "a.txt|b.txt", issueRefs: "" });
    });
  });
});

test("a list mixing existing and missing paths keeps only the existing ones", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.writeFileSync(path.join(dir, "a.txt"), "a\n");
      const sel = resolve(bash, dir, "a.txt missing.txt #7");
      assert.deepEqual(sel, { mode: "paths", path: "a.txt", issueRefs: "7" });
    });
  });
});

test("a list with no existing path falls back to mode 'all' (a prose description is not a selector)", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      const sel = resolve(bash, dir, "fix the manifest wording");
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "" });
    });
  });
});

test("a glob token in a list is never expanded by the shell (only a literal existing path counts)", () => {
  assertBash((bash) => {
    withTempDir("p2p2-commit-args-", (dir) => {
      fs.writeFileSync(path.join(dir, "a.txt"), "a\n");
      const sel = resolve(bash, dir, "*.txt nothing");
      assert.deepEqual(sel, { mode: "all", path: "", issueRefs: "" });
    });
  });
});
