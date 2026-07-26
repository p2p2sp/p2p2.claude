/*
 * preflight.test.ts - proves supergh/shared/scripts/preflight.sh's five-line
 * KEY=VALUE contract (always in order GH_PRESENT / GH_AUTH / BRANCH /
 * UPSTREAM / REPO, always exit 0 - fail-open on every probe) across the six
 * documented scenarios: no gh on PATH; gh present but `gh auth status`
 * failing; not a git repo; a repo with no upstream; a repo with no origin
 * remote; the fully happy path.
 *
 * preflight.sh is `#!/bin/sh`, so every case runs through forEachShell
 * ("posix", ...) via opts.shell, never executed directly.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/supergh/preflight.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir } from "../harness/tmp.ts";
import { withStub } from "../harness/stub.ts";
import { forEachShell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../supergh/shared/scripts/preflight.sh");

const GH_AUTH_OK = 'case "$1" in\n  auth) exit 0 ;;\n  *) exit 0 ;;\nesac\n';
const GH_AUTH_FAIL = 'case "$1" in\n  auth) exit 1 ;;\n  *) exit 0 ;;\nesac\n';

/** The real PATH, minus every directory that resolves a real `gh` - keeps
 *  `git`/coreutils reachable (the script and the posix interpreters both need
 *  them) while making "no gh on PATH" genuine even on a dev machine that has
 *  gh installed, on every OS. */
function pathWithoutGh(): string {
  const ghNames = process.platform === "win32" ? ["gh.exe", "gh.cmd", "gh.bat", "gh"] : ["gh"];
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const kept = dirs.filter((dir) => !ghNames.some((name) => fs.existsSync(path.join(dir, name))));
  return kept.join(path.delimiter);
}

function assertPosix(fn: (shell: string) => void) {
  const skips = forEachShell("posix", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "posix");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

/** Every case shares the same five-key-in-order shape check. */
function assertFixedShape(result: RunResult, expected: { GH_PRESENT: string; GH_AUTH: string; BRANCH: string; UPSTREAM: string; REPO: string }) {
  assert.equal(result.status, 0, `preflight.sh must always exit 0 (fail-open): stderr=${result.stderr}`);
  const lines = result.stdout.split("\n").filter((line) => line.length > 0);
  assert.deepEqual(
    lines,
    [
      `GH_PRESENT=${expected.GH_PRESENT}`,
      `GH_AUTH=${expected.GH_AUTH}`,
      `BRANCH=${expected.BRANCH}`,
      `UPSTREAM=${expected.UPSTREAM}`,
      `REPO=${expected.REPO}`,
    ],
    `unexpected preflight.sh output:\n${result.stdout}`,
  );
}

test("no gh on PATH -> GH_PRESENT=0, GH_AUTH=fail, git facts empty (not a git repo)", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-preflight-", (cwd) => {
      const result = runScript(SUT, [], { shell, cwd, env: { PATH: pathWithoutGh() } });
      assertFixedShape(result, { GH_PRESENT: "0", GH_AUTH: "fail", BRANCH: "", UPSTREAM: "", REPO: "" });
    });
  });
});

test("gh present but `gh auth status` failing -> GH_PRESENT=1, GH_AUTH=fail", () => {
  assertPosix((shell) => {
    withStub("gh", GH_AUTH_FAIL, (stubDir) => {
      withGitRepo((repo) => {
        const commit = runScript("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo.dir, env: repo.env });
        assert.equal(commit.status, 0, `git commit should succeed: ${commit.stderr}`);
        const result = runScript(SUT, [], { shell, cwd: repo.dir, env: repo.env, stubDirs: [stubDir] });
        assertFixedShape(result, { GH_PRESENT: "1", GH_AUTH: "fail", BRANCH: "main", UPSTREAM: "", REPO: "" });
      });
    });
  });
});

test("not a git repo -> BRANCH/UPSTREAM/REPO all empty, exit 0", () => {
  assertPosix((shell) => {
    withStub("gh", GH_AUTH_OK, (stubDir) => {
      withTempDir("p2p2-preflight-", (cwd) => {
        const result = runScript(SUT, [], { shell, cwd, stubDirs: [stubDir] });
        assertFixedShape(result, { GH_PRESENT: "1", GH_AUTH: "ok", BRANCH: "", UPSTREAM: "", REPO: "" });
      });
    });
  });
});

test("repo with no upstream (no push, no tracking config) -> BRANCH set, UPSTREAM/REPO empty", () => {
  assertPosix((shell) => {
    withStub("gh", GH_AUTH_OK, (stubDir) => {
      withGitRepo((repo) => {
        const write = runScript("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo.dir, env: repo.env });
        assert.equal(write.status, 0, `git commit should succeed: ${write.stderr}`);
        const result = runScript(SUT, [], { shell, cwd: repo.dir, env: repo.env, stubDirs: [stubDir] });
        assertFixedShape(result, { GH_PRESENT: "1", GH_AUTH: "ok", BRANCH: "main", UPSTREAM: "", REPO: "" });
      });
    });
  });
});

test("repo with a remote that is not named origin -> REPO empty even though a remote exists", () => {
  assertPosix((shell) => {
    withStub("gh", GH_AUTH_OK, (stubDir) => {
      withGitRepo((repo) => {
        const commit = runScript("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo.dir, env: repo.env });
        assert.equal(commit.status, 0, `git commit should succeed: ${commit.stderr}`);
        const addRemote = runScript(
          "git",
          ["remote", "add", "upstream-remote", "git@github.com:some-owner/some-repo.git"],
          { cwd: repo.dir, env: repo.env },
        );
        assert.equal(addRemote.status, 0, `git remote add should succeed: ${addRemote.stderr}`);
        const result = runScript(SUT, [], { shell, cwd: repo.dir, env: repo.env, stubDirs: [stubDir] });
        assertFixedShape(result, { GH_PRESENT: "1", GH_AUTH: "ok", BRANCH: "main", UPSTREAM: "", REPO: "" });
      });
    });
  });
});

test("fully happy path: gh present + authed, branch pushed with upstream tracking, origin a github.com URL -> all five facts populated", () => {
  assertPosix((shell) => {
    withStub("gh", GH_AUTH_OK, (stubDir) => {
      withGitRepo((bareRemote) => {
        withGitRepo((repo) => {
          const addRemote = runScript("git", ["remote", "add", "origin", bareRemote.dir], {
            cwd: repo.dir,
            env: repo.env,
          });
          assert.equal(addRemote.status, 0, `git remote add should succeed: ${addRemote.stderr}`);
          const commit = runScript("git", ["commit", "--allow-empty", "-m", "init"], {
            cwd: repo.dir,
            env: repo.env,
          });
          assert.equal(commit.status, 0, `git commit should succeed: ${commit.stderr}`);
          const push = runScript("git", ["push", "-u", "origin", "main"], { cwd: repo.dir, env: repo.env });
          assert.equal(push.status, 0, `git push -u should succeed: ${push.stderr}`);
          // Re-point origin at a github.com URL AFTER the tracking ref already
          // exists locally, so REPO parses without any real network call.
          const setUrl = runScript("git", ["remote", "set-url", "origin", "git@github.com:some-owner/some-repo.git"], {
            cwd: repo.dir,
            env: repo.env,
          });
          assert.equal(setUrl.status, 0, `git remote set-url should succeed: ${setUrl.stderr}`);

          const result = runScript(SUT, [], { shell, cwd: repo.dir, env: repo.env, stubDirs: [stubDir] });
          assertFixedShape(result, {
            GH_PRESENT: "1",
            GH_AUTH: "ok",
            BRANCH: "main",
            UPSTREAM: "origin/main",
            REPO: "some-owner/some-repo",
          });
        });
      }, { bare: true });
    });
  });
});
