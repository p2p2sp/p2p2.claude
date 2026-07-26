/*
 * collect_edges.test.ts - proves collect_edges.sh's
 * `collect_edges.sh [repo_root] [--max-fanout K]` contract: one JSONL
 * record per candidate pair with keys a/b/via/vias/fanout/shared,
 * --max-fanout capping a linking literal as ambient once its fanout exceeds
 * it, exit 1 with no stdout on an unborn HEAD, and exit 0 with EMPTY stdout
 * (not an error) when no pairs are found.
 *
 * collect_edges.sh is `#!/usr/bin/env bash` and the skill invokes it
 * explicitly as `bash "${CLAUDE_SKILL_DIR}/scripts/collect_edges.sh" ...`,
 * so every case here runs through forEachShell("bash", ...) via opts.shell.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superfix/collect_edges.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";
import { forEachShell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../superfix/skills/code-auditor/scripts/collect_edges.sh");

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

function recordsOf(result: RunResult): Record<string, any>[] {
  return result.stdout
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

/** Commits whatever is currently staged/modified, `daysAgo` days in the
 *  past - collect_edges.sh itself never reads commit history, but keeping
 *  the same builder shape as collect_signals.sh's fixtures documents that
 *  both sweeps share the same universe. */
function commitAt(repo: GitRepo, daysAgo: number, message: string): void {
  const date = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
  const env = { ...repo.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
  const add = runScript("git", ["add", "-A"], { cwd: repo.dir, env });
  assert.equal(add.status, 0, `git add failed: ${add.stderr}`);
  const commit = runScript("git", ["commit", "-m", message], { cwd: repo.dir, env });
  assert.equal(commit.status, 0, `git commit failed: ${commit.stderr}`);
}

/** shared.md is a real tracked file mentioned by 3 other files, so it links
 *  all 3 into a clique of 3 pairs at fanout 3 - enough to exercise --max-
 *  fanout capping in both directions. */
function buildPairFixture(repo: GitRepo): void {
  fs.writeFileSync(path.join(repo.dir, "shared.md"), "shared config\n");
  fs.writeFileSync(path.join(repo.dir, "a.ts"), "// reads shared.md at startup\n");
  fs.writeFileSync(path.join(repo.dir, "b.ts"), "// also reads shared.md at startup\n");
  fs.writeFileSync(path.join(repo.dir, "c.ts"), "// depends on shared.md too\n");
  commitAt(repo, 0, "seed pair fixture");
}

// --- record shape ----------------------------------------------------------

test("JSONL records carry a, b, via, vias, fanout, shared - a always < b", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      buildPairFixture(repo);
      const result = run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const records = recordsOf(result);
      assert.equal(records.length, 3, "3 files sharing one literal must form exactly 3 pairs");
      for (const record of records) {
        assert.deepEqual(Object.keys(record).sort(), ["a", "b", "fanout", "shared", "via", "vias"]);
        assert.ok(record.a < record.b, `expected a < b, got a=${record.a} b=${record.b}`);
      }
      const pairKeys = records.map((r) => [r.a, r.b].join("|")).sort();
      assert.deepEqual(pairKeys, ["a.ts|b.ts", "a.ts|c.ts", "b.ts|c.ts"]);

      const abRecord = records.find((r) => r.a === "a.ts" && r.b === "b.ts")!;
      assert.equal(abRecord.via, "shared.md");
      assert.equal(abRecord.fanout, 3);
      assert.equal(abRecord.shared, 1);
      assert.deepEqual(abRecord.vias, ["shared.md"]);
    });
  });
});

// --- --max-fanout capping ---------------------------------------------------

test("--max-fanout caps as documented: a literal exceeding it is dropped as ambient", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      buildPairFixture(repo);

      const capped = run(bash, repo, ["--max-fanout", "2"]);
      assert.equal(capped.status, 0, `stderr: ${capped.stderr}`);
      assert.equal(capped.stdout, "", "fanout 3 must exceed --max-fanout 2, dropping every pair");

      const uncapped = run(bash, repo, ["--max-fanout", "3"]);
      assert.equal(uncapped.status, 0, `stderr: ${uncapped.stderr}`);
      assert.equal(recordsOf(uncapped).length, 3, "raising --max-fanout to 3 restores every pair");
    });
  });
});

test("[repo_root] may differ from cwd, and --max-fanout may appear before or after it", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      buildPairFixture(repo);
      withTempDir("p2p2-collect-edges-cwd-", (cwd) => {
        const before = runScript(SUT, ["--max-fanout", "8", repo.dir], { shell: bash, cwd, env: repo.env });
        assert.equal(before.status, 0, `stderr: ${before.stderr}`);
        assert.equal(recordsOf(before).length, 3);

        const after = runScript(SUT, [repo.dir, "--max-fanout", "8"], { shell: bash, cwd, env: repo.env });
        assert.equal(after.status, 0, `stderr: ${after.stderr}`);
        assert.equal(recordsOf(after).length, 3);
      });
    });
  });
});

// --- exit codes / degenerate repos ------------------------------------------

test("unborn HEAD -> exit 1, no stdout", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      const result = run(bash, repo, []);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /HEAD has no commits yet \(unborn HEAD\) - nothing to sweep/);
    });
  });
});

test("no pairs found -> exit 0 with EMPTY stdout (a valid result, not an error)", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      fs.writeFileSync(path.join(repo.dir, "lonely.md"), "nothing references anything else\n");
      commitAt(repo, 0, "seed lonely file");
      const result = run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "");
    });
  });
});

test("a repo whose only commit is empty -> exit 0, empty stdout", () => {
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

// --- edge cases --------------------------------------------------------------

test("a pair endpoint with a space and a non-ASCII character comes through unquoted", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      const name = "café notes.md";
      fs.writeFileSync(path.join(repo.dir, "shared.md"), "shared config\n");
      fs.writeFileSync(path.join(repo.dir, name), "reads shared.md at startup\n");
      fs.writeFileSync(path.join(repo.dir, "other.ts"), "// also reads shared.md\n");
      commitAt(repo, 0, "seed unicode pair fixture");
      const result = run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const records = recordsOf(result);
      const record = records.find((r) => r.a === name || r.b === name);
      assert.ok(record, `expected a pair containing ${name}, got:\n${result.stdout}`);
    });
  });
});

test("a file deleted in a later commit never appears as a pair endpoint", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      fs.writeFileSync(path.join(repo.dir, "shared.md"), "shared config\n");
      fs.writeFileSync(path.join(repo.dir, "temp.ts"), "// reads shared.md\n");
      fs.writeFileSync(path.join(repo.dir, "keep.ts"), "// also reads shared.md\n");
      fs.writeFileSync(path.join(repo.dir, "keep2.ts"), "// depends on shared.md\n");
      commitAt(repo, 2, "add temp + keep + keep2");
      fs.rmSync(path.join(repo.dir, "temp.ts"));
      commitAt(repo, 1, "remove temp");

      const result = run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const records = recordsOf(result);
      assert.ok(!records.some((r) => r.a === "temp.ts" || r.b === "temp.ts"));
      assert.equal(records.length, 1);
      assert.deepEqual([records[0].a, records[0].b], ["keep.ts", "keep2.ts"]);
    });
  });
});

test(
  "an unreadable tracked file warns on stderr only and is skipped from stdout",
  { skip: skipUnreadableTest ? "requires non-root POSIX file permissions" : false },
  () => {
    assertBash((bash) => {
      withGitRepo((repo) => {
        fs.writeFileSync(path.join(repo.dir, "shared.md"), "shared config\n");
        fs.writeFileSync(path.join(repo.dir, "locked.ts"), "// reads shared.md\n");
        fs.writeFileSync(path.join(repo.dir, "open.ts"), "// also reads shared.md\n");
        commitAt(repo, 0, "seed unreadable fixture");
        fs.chmodSync(path.join(repo.dir, "locked.ts"), 0o000);
        try {
          const result = run(bash, repo, []);
          assert.equal(result.status, 0, `stderr: ${result.stderr}`);
          assert.match(result.stderr, /warning: skipping locked\.ts \(unreadable\)/);
          const records = recordsOf(result);
          assert.ok(!records.some((r) => r.a === "locked.ts" || r.b === "locked.ts"));
        } finally {
          fs.chmodSync(path.join(repo.dir, "locked.ts"), 0o644);
        }
      });
    });
  },
);

test("a shallow clone still produces the same pairs (collect_edges.sh reads content, not history)", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      buildPairFixture(repo);
      withTempDir("p2p2-collect-edges-shallow-", (parentDir) => {
        const shallowDir = path.join(parentDir, "shallow");
        const clone = runScript("git", ["clone", "--depth", "1", repo.dir, shallowDir], { env: repo.env });
        assert.equal(clone.status, 0, `git clone --depth 1 failed: ${clone.stderr}`);
        const result = runScript(SUT, [shallowDir], { shell: bash, env: repo.env });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.equal(recordsOf(result).length, 3);
      });
    });
  });
});
