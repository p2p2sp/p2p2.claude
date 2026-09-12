/*
 * profiler.test.ts - proves the one Bash call superfix/agents/profiler.md
 * tells the profiler agent to run is a command git actually executes: the
 * fenced `git -C <target-root> log --since=... -i --grep=fix --grep=hotfix
 * --grep=revert --stat --format='%h %s' -- <scope or .>` block is lifted from
 * the agent file verbatim, its placeholders substituted the way the agent is
 * told to substitute them, and run against a throwaway repo whose fix history
 * straddles the window.
 *
 * Why a markdown file has a test: git's approxidate parser answers an
 * unrecognised `--since` value with the current time and exit 0, so a bad date
 * expression there is invisible - an empty log reads as "no fix history in
 * window", the profile is still written and the run still passes its gates.
 * Only running the documented command proves the window is real.
 *
 * The block is run as a script through forEachShell("bash", ...), because the
 * agent's Bash tool hands it to a shell rather than to execve.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superfix/profiler.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";

const AGENT = path.resolve(import.meta.dirname, "../../superfix/agents/profiler.md");
const WINDOW_DAYS = 30;

function assertBash(fn: (shell: Shell) => void) {
  const skips = forEachShell("bash", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "bash");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

/** The single ```bash block of profiler.md - the agent is told to run this
 *  command and no other, so exactly one such block must exist. */
function historyCommand(): string {
  const text = fs.readFileSync(AGENT, "utf-8");
  const blocks = [...text.matchAll(/```bash\n([\s\S]*?)```/g)].map((m) => m[1].trim());
  assert.equal(blocks.length, 1, `profiler.md must carry exactly one bash block, found ${blocks.length}`);
  assert.match(blocks[0], /^git -C .* log .*--since=/, `unexpected history command:\n${blocks[0]}`);
  return blocks[0];
}

/** Substitutes the brief's values into the block exactly as the agent is told
 *  to: the target root and the pathspec are the repo the command runs in, and
 *  `<window>` is the bare number the brief's `Window:` line carries. */
function substituted(): string {
  return historyCommand()
    .replaceAll("<target-root>", ".")
    .replaceAll("<scope or .>", ".")
    .replaceAll("<window>", String(WINDOW_DAYS));
}

/** Commits whatever is staged `daysAgo` days in the past (author == committer
 *  date), so the window boundary is exercised regardless of when the suite
 *  happens to run. */
function commitAt(repo: GitRepo, daysAgo: number, message: string): void {
  const date = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
  const env = { ...repo.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
  const add = runScript("git", ["add", "-A"], { cwd: repo.dir, env });
  assert.equal(add.status, 0, `git add failed: ${add.stderr}`);
  const commit = runScript("git", ["commit", "-m", message], { cwd: repo.dir, env });
  assert.equal(commit.status, 0, `git commit failed: ${commit.stderr}`);
}

/** Four commits straddling the 30-day window: one fix inside it, one fix well
 *  outside it, one non-fix inside it, plus the root commit. */
function buildHistory(repo: GitRepo): void {
  fs.writeFileSync(path.join(repo.dir, "root.txt"), "root\n");
  commitAt(repo, 90, "chore: seed the tree");

  fs.writeFileSync(path.join(repo.dir, "ancient.txt"), "old\n");
  commitAt(repo, 45, "fix: ancient crash outside the window");

  fs.writeFileSync(path.join(repo.dir, "quiet.txt"), "quiet\n");
  commitAt(repo, 5, "chore: bump a dependency");

  fs.writeFileSync(path.join(repo.dir, "recent.txt"), "new\n");
  commitAt(repo, 5, "fix: recent crash inside the window");
}

function runCommand(shell: Shell, repo: GitRepo): RunResult {
  return withTempDir("p2p2-profiler-", (dir) => {
    const script = path.join(dir, "history.sh");
    fs.writeFileSync(script, `#!/usr/bin/env bash\n${substituted()}\n`);
    return runScript(script, [], { shell, cwd: repo.dir, env: repo.env });
  });
}

test("the profiler's documented git log call returns the fix commits inside the window", () => {
  assertBash((shell) => {
    withGitRepo((repo) => {
      buildHistory(repo);
      const result = runCommand(shell, repo);
      assert.equal(result.status, 0, `the documented command must succeed: stderr=${result.stderr}`);
      assert.match(
        result.stdout,
        /fix: recent crash inside the window/,
        `a --since expression git cannot parse silently yields an empty log:\n${substituted()}\n${result.stdout}`,
      );
      assert.match(result.stdout, /recent\.txt/, "--stat must name the files each commit touched");
    });
  });
});

test("the profiler's documented git log call drops commits older than the window and non-fix subjects", () => {
  assertBash((shell) => {
    withGitRepo((repo) => {
      buildHistory(repo);
      const result = runCommand(shell, repo);
      assert.equal(result.status, 0, `the documented command must succeed: stderr=${result.stderr}`);
      assert.doesNotMatch(result.stdout, /ancient crash/, "a fix older than the window is out of the profile");
      assert.doesNotMatch(result.stdout, /bump a dependency/, "a non-fix subject is out of the profile");
    });
  });
});
