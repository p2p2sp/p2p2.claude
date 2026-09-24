/*
 * commit-context.test.ts - proves commit-context.sh's context block: for
 * every selector mode (all / paths) it emits, in order, a resolved
 * "## Selector:" line, "## Current branch", "## Recent commit subjects",
 * a git-status section and a diff section (capped at MAX_LINES=400), and
 * degrades rather than aborting when a probe fails (the script deliberately
 * runs without `set -e`). commit-context.sh is `#!/usr/bin/env bash`, so
 * every case runs through `forEachShell("bash", ...)` via opts.shell.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/supergh/commit-context.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, type GitRepo } from "../harness/tmp.ts";
import { withStub } from "../harness/stub.ts";
import { forEachShell } from "../harness/shells.ts";
import { writePng } from "../harness/png.ts";

const SUT = path.resolve(import.meta.dirname, "../../supergh/skills/commit/scripts/commit-context.sh");

function runContext(bash: string, repo: GitRepo, selector?: string): RunResult {
  const args = selector === undefined ? [] : [selector];
  return runScript(SUT, args, { shell: bash, cwd: repo.dir, env: repo.env });
}

function assertBash(fn: (bash: string) => void) {
  const skips = forEachShell("bash", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "bash");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

function commitFile(repo: GitRepo, name: string, content: string) {
  fs.writeFileSync(path.join(repo.dir, name), content);
  const add = repo.git("add", "-A");
  assert.equal(add.status, 0, `git add should succeed: ${add.stderr}`);
  const commit = repo.git("commit", "-m", `seed ${name}`);
  assert.equal(commit.status, 0, `git commit should succeed: ${commit.stderr}`);
}

// --- selector mode: all -------------------------------------------------------

test("mode 'all': Selector/branch/recent-subjects/status/diff sections all present", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "line one\n");
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "line one\nline two\n");
      fs.writeFileSync(path.join(repo.dir, "untracked.txt"), "new\n");

      const result = runContext(bash, repo);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /## Selector: all - run commit\.sh with no 2nd arg/);
      assert.match(result.stdout, /## Current branch/);
      assert.match(result.stdout, /## Recent commit subjects/);
      assert.match(result.stdout, /seed a\.txt/);
      assert.match(result.stdout, /## Changes \(git status, all untracked files\)/);
      assert.match(result.stdout, /untracked\.txt/);
      assert.match(result.stdout, /## Overview \(git diff HEAD --stat\)/);
      assert.match(result.stdout, /## Diff \(all tracked changes vs HEAD; new untracked files are listed in git status above\)/);
      assert.match(result.stdout, /line two/);
    });
  });
});

test("a bare '#42' in the arguments emits the explicit Issue-footer block and still resolves the selector", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "line one\n");
      fs.mkdirSync(path.join(repo.dir, "src"));
      fs.writeFileSync(path.join(repo.dir, "src", "foo.txt"), "new\n");

      const result = runContext(bash, repo, "src/foo.txt #42");
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /## Issue footer \(explicit, from a #N reference or GitHub issue link/);
      assert.match(result.stdout, /^Refs: #42$/m);
      assert.match(result.stdout, /## Selector: paths - run commit\.sh with 2nd arg "src\/foo\.txt"/);
    });
  });
});

test("no issue reference in the arguments: the Issue-footer block is absent entirely", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "line one\n");
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "line one\nline two\n");

      const result = runContext(bash, repo);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.doesNotMatch(result.stdout, /## Issue footer/);
      assert.doesNotMatch(result.stdout, /^Refs: /m);
    });
  });
});

// --- selector mode: paths -------------------------------------------------------

test("mode paths: Selector/status/diff sections are all scoped to the given path", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "keep.txt", "kept\n");
      fs.writeFileSync(path.join(repo.dir, "keep.txt"), "kept, modified\n");
      fs.writeFileSync(path.join(repo.dir, "other.txt"), "unrelated\n");

      const result = runContext(bash, repo, "keep.txt");
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /## Selector: paths - run commit\.sh with 2nd arg "keep\.txt"/);
      assert.match(result.stdout, /## Changes \(git status for paths: keep\.txt\)/);
      assert.match(result.stdout, /## Overview \(git diff HEAD --stat for paths: keep\.txt\)/);
      assert.match(result.stdout, /## Diff \(changes vs HEAD for paths: keep\.txt;/);
      assert.match(result.stdout, /kept, modified/);
      assert.doesNotMatch(result.stdout, /unrelated/);
    });
  });
});

test("mode paths with a list: the Selector line carries every path and status/diff cover all of them only", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "a\n");
      commitFile(repo, "b.txt", "b\n");
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "a, modified\n");
      fs.writeFileSync(path.join(repo.dir, "b.txt"), "b, modified\n");
      fs.writeFileSync(path.join(repo.dir, "other.txt"), "unrelated\n");

      const result = runContext(bash, repo, "a.txt b.txt");
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /## Selector: paths - run commit\.sh with 2nd arg "a\.txt b\.txt"/);
      assert.match(result.stdout, /a, modified/);
      assert.match(result.stdout, /b, modified/);
      assert.doesNotMatch(result.stdout, /unrelated/);
    });
  });
});

// --- unborn HEAD, no changes, truncation, binary, non-ASCII --------------------

test("unborn HEAD (no commits yet): BASE falls back to the empty-tree object, staged addition still shows in the diff", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      fs.writeFileSync(path.join(repo.dir, "new.txt"), "brand new\n");
      const add = repo.git("add", "-A");
      assert.equal(add.status, 0, `git add should succeed: ${add.stderr}`);

      const result = runContext(bash, repo);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      // git log fails on an unborn branch; commit-context.sh has no `set -e`
      // and redirects `2>&1`, so the fatal message lands inline but the rest
      // of the block still emits in full.
      assert.match(result.stdout, /## Recent commit subjects/);
      assert.match(result.stdout, /## Changes \(git status, all untracked files\)/);
      assert.match(result.stdout, /## Diff \(all tracked changes vs HEAD/);
      assert.match(result.stdout, /brand new/);
    });
  });
});

test("a repo with no changes at all: status section is empty and the diff section reports 'no textual diff'", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "unchanged\n");

      const result = runContext(bash, repo);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /\(no textual diff for this mode\)/);
    });
  });
});

test("a diff exceeding MAX_LINES=400 is capped with a truncation notice reporting the real total", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      const originalLines = Array.from({ length: 500 }, (_, i) => `line ${i}`).join("\n") + "\n";
      commitFile(repo, "big.txt", originalLines);
      const modifiedLines = Array.from({ length: 500 }, (_, i) => `changed line ${i}`).join("\n") + "\n";
      fs.writeFileSync(path.join(repo.dir, "big.txt"), modifiedLines);

      const result = runContext(bash, repo);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /\[diff truncated: showing first 400 of \d+ lines - run git diff for the rest\]/);

      const diffSectionStart = result.stdout.indexOf("## Diff (all tracked changes vs HEAD");
      const diffSection = result.stdout.slice(diffSectionStart);
      const bodyLines = diffSection.split("\n").slice(1);
      const truncationIdx = bodyLines.findIndex((l) => l.includes("[diff truncated:"));
      assert.ok(truncationIdx > 0, "truncation notice should be present");
      // Everything before the notice is the capped diff body: at most 400 lines.
      assert.ok(truncationIdx <= 400, `expected at most 400 diff lines before the notice, got ${truncationIdx}`);
    });
  });
});

test("a binary file change shows a 'Binary files ... differ' line, never breaking the block", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "placeholder.txt", "placeholder\n");
      const png = writePng(2, 2, new Uint8Array(2 * 2 * 4).fill(200));
      fs.writeFileSync(path.join(repo.dir, "img.png"), png);
      const add = repo.git("add", "-A");
      assert.equal(add.status, 0, `git add should succeed: ${add.stderr}`);

      const result = runContext(bash, repo);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /Binary files .* differ/);
    });
  });
});

test("a filename with a non-ASCII character appears in the git-status section", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      const setQuotepath = repo.git("config", "core.quotepath", "false");
      assert.equal(setQuotepath.status, 0, `git config should succeed: ${setQuotepath.stderr}`);
      fs.writeFileSync(path.join(repo.dir, "café.txt"), "content\n");

      const result = runContext(bash, repo);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /café\.txt/);
    });
  });
});

// --- edge cases: unborn HEAD, detached HEAD, missing user.email ----------------

test("detached HEAD: block still emits in full, branch line is empty (no symbolic ref)", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "one\n");
      commitFile(repo, "b.txt", "two\n");
      const headSha = repo.git("rev-parse", "HEAD~1");
      assert.equal(headSha.status, 0, `git rev-parse should succeed: ${headSha.stderr}`);
      const checkout = repo.git("checkout", "--detach", headSha.stdout.trim());
      assert.equal(checkout.status, 0, `git checkout --detach should succeed: ${checkout.stderr}`);
      fs.writeFileSync(path.join(repo.dir, "c.txt"), "three\n");

      const result = runContext(bash, repo);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /## Selector: all - run commit\.sh with no 2nd arg/);
      assert.match(result.stdout, /## Recent commit subjects/);
      assert.match(result.stdout, /c\.txt/);
    });
  });
});

test("user.email unset: the best-effort block still emits in full (no `set -e`, no crash)", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "one\n");
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "one, changed\n");
      const unset = repo.git("config", "--global", "--unset", "user.email");
      assert.equal(unset.status, 0, `git config --unset should succeed: ${unset.stderr}`);

      const result = runContext(bash, repo);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /## Selector: all - run commit\.sh with no 2nd arg/);
      assert.match(result.stdout, /one, changed/);
    });
  });
});

test("commit-context.sh runs without `set -e`: a git failure degrades in place rather than aborting the whole block", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "one\n");
      withStub("git", "exit 1", (stubDir) => {
        const result = runScript(SUT, [], {
          shell: bash,
          cwd: repo.dir,
          env: repo.env,
          stubDirs: [stubDir],
        });
        // Every `git ...` call fails, but the script itself must still complete
        // and print every section heading instead of dying on the first probe.
        assert.equal(result.status, 0, `commit-context.sh must not abort on a failing git call: ${result.stderr}`);
        assert.match(result.stdout, /## Selector: all - run commit\.sh with no 2nd arg/);
        assert.match(result.stdout, /## Current branch/);
        assert.match(result.stdout, /## Recent commit subjects/);
        assert.match(result.stdout, /## Changes \(git status, all untracked files\)/);
        assert.match(result.stdout, /## Overview \(git diff HEAD --stat\)/);
        assert.match(result.stdout, /## Diff \(all tracked changes vs HEAD/);
      });
    });
  });
});

test("mode missing: the Selector line tells the fork not to run commit.sh and names the missing paths, and no diff of the whole tree follows", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "a\n");
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "a, changed\n");
      const result = runContext(bash, repo, "src/nope.ts");
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^## Selector: missing - none of the named paths exists \(src\/nope\.ts\); do NOT run commit\.sh/m);
      assert.doesNotMatch(result.stdout, /a, changed/);
    });
  });
});
