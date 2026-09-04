/*
 * commit-task.test.ts - proves commit-task.sh's contract: `commit-task.sh
 * <message> [task-file]` delegates to status-update.sh first (so a bumped
 * status.md rides IN the same commit as the task's work), then stages
 * everything and commits with <message>, or reports "Nothing to commit."
 * on a clean index; skips the commit outside a git repository; exits 1 on a
 * missing message.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/commit-task.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withGitRepo, withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/commit-task.sh");

// commit-task.sh ships mode 100644 (git ls-files) - every SKILL.md invokes it
// explicitly as `bash "${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" ...`,
// never bare, so the portability sweep does not require an exec bit here;
// the harness must invoke it the same way.
function run(dir: string, env: Record<string, string>, args: string[]) {
  return runScript(SUT, args, { cwd: dir, env, shell: "bash" });
}

test("message-only commit stages and commits a pending change", () => {
  withGitRepo((repo) => {
    fs.writeFileSync(path.join(repo.dir, "a.txt"), "content\n");
    const result = run(repo.dir, repo.env, ["add a.txt"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    // commit-task.sh does not redirect `git commit`'s own summary output, so
    // it lands on commit-task.sh's stdout (unlike decompose.sh, which does).
    assert.match(result.stdout, /add a\.txt/);
    const subject = repo.git("log", "-1", "--format=%s");
    assert.equal(subject.stdout.trim(), "add a.txt");
  });
});

test("message + task file: the status.md bump lands in the SAME commit as the task's work", () => {
  withGitRepo((repo) => {
    // Pre-existing baseline: the task file is already committed, unchanged by this run.
    const tasksDir = path.join(repo.dir, "tasks");
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, "task-01.md"), "## a task\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "seed task file");

    // The task's actual work: a new file.
    fs.writeFileSync(path.join(repo.dir, "work.txt"), "done\n");

    const result = run(repo.dir, repo.env, ["finish task 1", "tasks/task-01.md"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const statusPath = path.join(repo.dir, "status.md");
    assert.equal(fs.readFileSync(statusPath, "utf-8"), "task: 01\n");

    const subject = repo.git("log", "-1", "--format=%s");
    assert.equal(subject.stdout.trim(), "finish task 1");

    const nameOnly = repo.git("show", "--name-only", "--format=", "HEAD");
    const files = nameOnly.stdout.trim().split("\n").sort();
    // status.md is NEW (only produced by this run's status-update bump) and rides
    // in the same commit as work.txt - proving the bump happened BEFORE `git add -A`.
    assert.deepEqual(files, ["status.md", "work.txt"]);
  });
});

test("clean index, no changes -> 'Nothing to commit.' on stdout, exit 0", () => {
  withGitRepo((repo) => {
    fs.writeFileSync(path.join(repo.dir, "a.txt"), "content\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "seed");

    const result = run(repo.dir, repo.env, ["no-op message"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "Nothing to commit.\n");
  });
});

test("outside a git repository -> skips the commit, exit 0, and the status bump still lands", () => {
  // no withGitRepo here on purpose: a bare temp dir is not a git repository, so
  // `git rev-parse --git-dir` fails and the commit section must bail out rather
  // than kill the caller's implementation loop.
  withTempDir("p2p2-commit-task-nonrepo-", (dir) => {
    const tasksDir = path.join(dir, "tasks");
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, "task-03.md"), "## a task\n");

    const result = run(dir, {}, ["finish task 3", "tasks/task-03.md"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    // the status-update.sh delegation runs BEFORE the git guard (its own line
    // comes first), so the resume marker is written even when nothing can be
    // committed.
    assert.equal(result.stdout, "status: ./status.md -> task: 03\nNot a git repository - skipping commit.\n");
    assert.equal(fs.readFileSync(path.join(dir, "status.md"), "utf-8"), "task: 03\n");
  });
});

test("missing message -> exit 1 with usage on stderr", () => {
  withGitRepo((repo) => {
    const result = run(repo.dir, repo.env, []);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /missing required parameter 'message'/);
    assert.match(result.stderr, /usage: commit-task\.sh <message> \[task-file\]/);
  });
});

test("a message containing a newline, a quote and a non-ASCII character round-trips verbatim", () => {
  withGitRepo((repo) => {
    fs.writeFileSync(path.join(repo.dir, "a.txt"), "content\n");
    const message = 'first line\nsecond line with a "quote" and café';
    const result = run(repo.dir, repo.env, [message]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const body = repo.git("log", "-1", "--format=%B");
    // git normalizes a commit message to end in exactly one \n, and `git log
    // --format=%B` appends its own trailing record-separator \n on top.
    assert.equal(body.stdout.replace(/\n+$/, ""), message);
  });
});
