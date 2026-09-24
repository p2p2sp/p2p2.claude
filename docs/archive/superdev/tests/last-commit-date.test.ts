/*
 * last-commit-date.test.ts - proves last-commit-date.sh's one contract: ONE
 * line on stdout, either HEAD's committer date as `YYYY-MM-DD` or the single
 * word `none`, and ALWAYS exit 0.
 *
 * The exit code is the load-bearing half. The script runs as an `!` preload in
 * the `intent` skill, where a non-zero exit aborts the whole skill load and the
 * skill never sees any of its input - and `intent` runs in any host project,
 * including one that is not a git repository and one where git is not
 * installed. Every degraded case below therefore asserts exit 0 as hard as it
 * asserts the `none`.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/last-commit-date.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir, withGitRepo } from "../harness/tmp.ts";
import { withStub } from "../harness/stub.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/last-commit-date.sh");

/** Every case shares the same shape check: exit 0, and stdout is exactly one
 *  line with a trailing newline. Returns that line. */
function onlyLine(result: RunResult): string {
  assert.equal(result.status, 0, `must always exit 0 (a preload abort kills the skill load): stderr=${result.stderr}`);
  assert.ok(result.stdout.endsWith("\n"), `stdout must end with a newline, got ${JSON.stringify(result.stdout)}`);
  const lines = result.stdout.split("\n").slice(0, -1);
  assert.equal(lines.length, 1, `stdout must be exactly ONE line, got ${JSON.stringify(result.stdout)}`);
  return lines[0];
}

test("a repo with one commit prints that commit's date", () => {
  withGitRepo((repo) => {
    fs.writeFileSync(path.join(repo.dir, "a.txt"), "a\n");
    repo.git("add", "a.txt");
    repo.git("commit", "-m", "first");

    // The harness pins GIT_COMMITTER_DATE to 2020-01-01T00:00:00Z.
    assert.equal(onlyLine(runScript(SUT, [], { cwd: repo.dir, env: repo.env })), "2020-01-01");
  });
});

test("HEAD wins, and it is the COMMITTER date, not the author date", () => {
  withGitRepo((repo) => {
    fs.writeFileSync(path.join(repo.dir, "a.txt"), "a\n");
    repo.git("add", "a.txt");
    repo.git("commit", "-m", "first");

    // Second commit: authored long ago, committed later - the shape a rebase or
    // a cherry-pick produces. "Has the repo moved" asks when the commit LANDED,
    // so the committer date is the answer and the author date is not.
    fs.writeFileSync(path.join(repo.dir, "b.txt"), "b\n");
    repo.git("add", "b.txt");
    runScript("git", ["commit", "-m", "second"], {
      cwd: repo.dir,
      env: { ...repo.env, GIT_AUTHOR_DATE: "2015-06-30T00:00:00Z", GIT_COMMITTER_DATE: "2024-03-05T00:00:00Z" },
    });

    assert.equal(onlyLine(runScript(SUT, [], { cwd: repo.dir, env: repo.env })), "2024-03-05");
  });
});

test("a directory that is not a git repository prints none", () => {
  withTempDir("p2p2-nonrepo-", (dir) => {
    // GIT_CEILING_DIRECTORIES stops git's upward .git search at the temp dir's
    // parent, so the case stays "not a repository" even on a host whose TMPDIR
    // happens to sit inside one.
    const result = runScript(SUT, [], { cwd: dir, env: { GIT_CEILING_DIRECTORIES: path.dirname(dir) } });
    assert.equal(onlyLine(result), "none");
  });
});

test("a repository with no commit yet prints none", () => {
  withGitRepo((repo) => {
    assert.equal(onlyLine(runScript(SUT, [], { cwd: repo.dir, env: repo.env })), "none");
  });
});

test("git absent prints none and still exits 0", () => {
  // Exit 127 with empty stdout is exactly what the script sees when the shell
  // cannot resolve `git` at all. Stubbed rather than stripped out of PATH,
  // because the directory that holds git often holds the shell too - removing
  // it would make the case unrunnable on some hosts instead of meaningful.
  withStub("git", "exit 127", (stubDir) => {
    withTempDir("p2p2-nogit-", (dir) => {
      assert.equal(onlyLine(runScript(SUT, [], { cwd: dir, stubDirs: [stubDir] })), "none");
    });
  });
});

test("output that is not a YYYY-MM-DD date prints none", () => {
  // A git too old to understand the format would echo it back literally. Any
  // unparseable output is an unknown repo state, never a date.
  withStub("git", 'printf "%s\\n" "%cd"', (stubDir) => {
    withTempDir("p2p2-oldgit-", (dir) => {
      assert.equal(onlyLine(runScript(SUT, [], { cwd: dir, stubDirs: [stubDir] })), "none");
    });
  });
});
