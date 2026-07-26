/*
 * collect_signals.test.ts - proves collect_signals.sh's
 * `collect_signals.sh [window_days] [repo_root] [--with-dependents]`
 * contract: one JSONL record per tracked file with keys path/churn/
 * fix_commits/recency_days/loc/dependents, --with-dependents position-
 * agnostic, the kept-extension list + per-file warnings on stderr only,
 * and exit 1 with no stdout on an unborn HEAD.
 *
 * collect_signals.sh ships mode 100644 (git ls-files) - the skill invokes it
 * explicitly as `bash "${CLAUDE_SKILL_DIR}/scripts/collect_signals.sh" ...`,
 * never bare - and it is `#!/usr/bin/env bash`, so every case here runs
 * through forEachShell("bash", ...) via opts.shell.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superfix/collect_signals.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";
import { forEachShell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../superfix/skills/code-auditor/scripts/collect_signals.sh");

const skipUnreadableTest =
  process.platform === "win32" || (typeof process.getuid === "function" && process.getuid() === 0);

function assertBash(fn: (bash: string) => void) {
  const skips = forEachShell("bash", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "bash");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

function run(bash: string, repo: GitRepo, args: string[]): RunResult {
  return runScript(SUT, args, { shell: bash, cwd: repo.dir, env: repo.env });
}

function recordsOf(result: RunResult): Record<string, unknown>[] {
  return result.stdout
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

function recordFor(result: RunResult, filePath: string): Record<string, any> {
  const record = recordsOf(result).find((r) => r.path === filePath);
  assert.ok(record, `expected a record for ${filePath} in:\n${result.stdout}`);
  return record as Record<string, any>;
}

/** Commits whatever is currently staged/modified, `daysAgo` days in the past
 *  (author == committer date), so churn/fix_commits/recency_days windows can
 *  be tested deterministically regardless of when the suite happens to run. */
function commitAt(repo: GitRepo, daysAgo: number, message: string): void {
  const date = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
  const env = { ...repo.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
  const add = runScript("git", ["add", "-A"], { cwd: repo.dir, env });
  assert.equal(add.status, 0, `git add failed: ${add.stderr}`);
  const commit = runScript("git", ["commit", "-m", message], { cwd: repo.dir, env });
  assert.equal(commit.status, 0, `git commit failed: ${commit.stderr}`);
}

/** old.txt: 3 commits (day 45, day 10, day 5 - the last one a "fix:"), plus a
 *  single fresh new.txt (day 1) - enough spread to exercise the --since
 *  window boundary and recency_days without depending on wall-clock timing
 *  beyond a few days' margin either side. */
function buildChurnFixture(repo: GitRepo): void {
  fs.writeFileSync(path.join(repo.dir, "old.txt"), "line1\nline2\n");
  commitAt(repo, 45, "add old file");

  fs.writeFileSync(path.join(repo.dir, "old.txt"), "line1\nline2\nline3\n");
  commitAt(repo, 10, "update old file");

  fs.writeFileSync(path.join(repo.dir, "old.txt"), "line1\nline2\nline3\nline4\n");
  commitAt(repo, 5, "fix: correct off-by-one bug");

  fs.writeFileSync(path.join(repo.dir, "new.txt"), "a\nb\nc\nd\ne\n");
  commitAt(repo, 1, "add new feature file");
}

function buildDependentsFixture(repo: GitRepo): void {
  fs.writeFileSync(path.join(repo.dir, "widget.ts"), "export const widget = 1;\n");
  fs.writeFileSync(path.join(repo.dir, "consumer.md"), "See widget.ts for the implementation.\n");
  commitAt(repo, 0, "seed dependents fixture");
}

// --- record shape --------------------------------------------------------

test("one JSONL record per tracked file, with exactly the documented keys", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "one\ntwo\n");
      fs.writeFileSync(path.join(repo.dir, "b.md"), "hello\n");
      commitAt(repo, 0, "seed two files");

      const result = run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const records = recordsOf(result);
      assert.equal(records.length, 2);
      for (const record of records) {
        assert.deepEqual(Object.keys(record).sort(), [
          "churn",
          "dependents",
          "fix_commits",
          "loc",
          "path",
          "recency_days",
        ]);
      }
      const byPath = Object.fromEntries(records.map((r) => [r.path as string, r]));
      assert.equal((byPath["a.txt"] as any).loc, 2);
      assert.equal((byPath["b.md"] as any).loc, 1);
      // no --with-dependents -> the field is always -1
      assert.equal((byPath["a.txt"] as any).dependents, -1);
    });
  });
});

// --- window_days / repo_root positionals ---------------------------------

test("[window_days] controls the --since cutoff for churn/fix_commits", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      buildChurnFixture(repo);

      const narrow = run(bash, repo, ["30"]);
      assert.equal(narrow.status, 0, `stderr: ${narrow.stderr}`);
      const narrowOld = recordFor(narrow, "old.txt");
      assert.equal(narrowOld.churn, 2, "the day-45 commit must fall outside a 30-day window");
      assert.equal(narrowOld.fix_commits, 1);

      const wide = run(bash, repo, ["55"]);
      assert.equal(wide.status, 0, `stderr: ${wide.stderr}`);
      const wideOld = recordFor(wide, "old.txt");
      assert.equal(wideOld.churn, 3, "a 55-day window must include the day-45 commit too");
      assert.equal(wideOld.fix_commits, 1);
    });
  });
});

test("recency_days reflects days since the file's last commit, loc reflects its current line count", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      buildChurnFixture(repo);
      const result = run(bash, repo, ["55"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const old = recordFor(result, "old.txt");
      assert.ok(old.recency_days >= 4 && old.recency_days <= 6, `expected ~5, got ${old.recency_days}`);
      assert.equal(old.loc, 4);

      const fresh = recordFor(result, "new.txt");
      assert.ok(fresh.recency_days >= 0 && fresh.recency_days <= 2, `expected ~1, got ${fresh.recency_days}`);
      assert.equal(fresh.loc, 5);
    });
  });
});

test("[repo_root] may be a directory other than the caller's cwd", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      buildChurnFixture(repo);
      withTempDir("p2p2-collect-signals-cwd-", (cwd) => {
        const result = runScript(SUT, ["55", repo.dir], { shell: bash, cwd, env: repo.env });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.equal(recordFor(result, "old.txt").churn, 3);
      });
    });
  });
});

// --- --with-dependents, any argument position -----------------------------

test("--with-dependents may appear in any argument position and still binds window_days/repo_root correctly", () => {
  assertBash((bash) => {
    const positions: string[][] = [
      ["--with-dependents"],
      ["30", "--with-dependents"],
      ["--with-dependents", "30"],
      ["30", ".", "--with-dependents"],
    ];
    for (const args of positions) {
      withGitRepo((repo) => {
        buildDependentsFixture(repo);
        const result = run(bash, repo, args);
        assert.equal(result.status, 0, `args=${args.join(" ")} stderr: ${result.stderr}`);
        assert.equal(recordFor(result, "widget.ts").dependents, 1, `args=${args.join(" ")}`);
        assert.equal(recordFor(result, "consumer.md").dependents, 0, `args=${args.join(" ")}`);
      });
    }
  });
});

// --- stderr: extension list + warnings only -------------------------------

test("stderr carries the kept-extension list and nothing else on a clean run", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "one\n");
      commitAt(repo, 0, "seed");
      const result = run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stderr, /^sweep extensions:.*\btxt\b.*$/m);
      assert.doesNotMatch(result.stderr, /warning:/);
      assert.doesNotMatch(result.stdout, /sweep extensions:/);
    });
  });
});

test(
  "a per-file probe failure (unreadable tracked file) warns on stderr only and is skipped from stdout",
  { skip: skipUnreadableTest ? "requires non-root POSIX file permissions" : false },
  () => {
    assertBash((bash) => {
      withGitRepo((repo) => {
        fs.writeFileSync(path.join(repo.dir, "locked.txt"), "secret\n");
        fs.writeFileSync(path.join(repo.dir, "open.txt"), "visible\n");
        commitAt(repo, 0, "seed");
        fs.chmodSync(path.join(repo.dir, "locked.txt"), 0o000);
        try {
          const result = run(bash, repo, []);
          assert.equal(result.status, 0, `stderr: ${result.stderr}`);
          assert.match(result.stderr, /warning: skipping locked\.txt \(loc probe failed\)/);
          const records = recordsOf(result);
          assert.ok(
            !records.some((r) => r.path === "locked.txt"),
            "locked.txt must be skipped from stdout, not merely warned about",
          );
          assert.ok(records.some((r) => r.path === "open.txt"));
        } finally {
          fs.chmodSync(path.join(repo.dir, "locked.txt"), 0o644);
        }
      });
    });
  },
);

// --- exit codes / degenerate repos ----------------------------------------

test("unborn HEAD -> non-zero exit, one stderr line, zero stdout", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      const result = run(bash, repo, []);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      const stderrLines = result.stderr.split("\n").filter((line) => line.length > 0);
      assert.equal(stderrLines.length, 1);
      assert.match(result.stderr, /HEAD has no commits yet \(unborn HEAD\) - nothing to sweep/);
    });
  });
});

test("a repo whose only commit is empty -> exit 0, empty stdout (nothing tracked to sweep)", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      const commit = runScript("git", ["commit", "--allow-empty", "-m", "empty init"], {
        cwd: repo.dir,
        env: repo.env,
      });
      assert.equal(commit.status, 0, `stderr: ${commit.stderr}`);
      const result = run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "");
    });
  });
});

// --- edge cases ------------------------------------------------------------

test("a tracked filename with a space and a non-ASCII character comes through unquoted", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      const name = "café notes.md";
      fs.writeFileSync(path.join(repo.dir, name), "notes\n");
      commitAt(repo, 0, "add unicode filename");
      const result = run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(recordFor(result, name).path, name);
    });
  });
});

test("a file deleted in a later commit does not appear in the output", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      fs.writeFileSync(path.join(repo.dir, "temp.txt"), "temp\n");
      commitAt(repo, 2, "add temp file");
      fs.rmSync(path.join(repo.dir, "temp.txt"));
      commitAt(repo, 1, "remove temp file");
      const result = run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.ok(!recordsOf(result).some((r) => r.path === "temp.txt"));
    });
  });
});

test("a shallow clone still produces valid JSONL output without crashing", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      buildChurnFixture(repo);
      withTempDir("p2p2-collect-signals-shallow-", (parentDir) => {
        const shallowDir = path.join(parentDir, "shallow");
        const clone = runScript("git", ["clone", "--depth", "1", repo.dir, shallowDir], { env: repo.env });
        assert.equal(clone.status, 0, `git clone --depth 1 failed: ${clone.stderr}`);
        const result = runScript(SUT, ["55", shallowDir], { shell: bash, env: repo.env });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        const records = recordsOf(result);
        assert.ok(records.length > 0, "a shallow clone should still yield records");
        for (const record of records) {
          assert.equal(typeof record.churn, "number");
          assert.equal(typeof record.loc, "number");
        }
      });
    });
  });
});
