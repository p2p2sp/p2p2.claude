/*
 * commit.test.ts - proves commit.sh's `commit.sh <message> [selector]`
 * contract: stages according to the selector (all/paths) then commits,
 * reports "Nothing to commit." on a clean scope, and exits 1 on a missing
 * message. commit.sh is `#!/usr/bin/env bash`, so every case runs through
 * `forEachShell("bash", ...)` via opts.shell.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/supergh/commit.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, type GitRepo } from "../harness/tmp.ts";
import { forEachShell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../supergh/skills/commit/scripts/commit.sh");

function runCommit(bash: string, repo: GitRepo, args: string[]): RunResult {
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

// --- a commit lands for each mode ------------------------------------------------

test("mode 'all' (no selector): stages and commits every pending change, including untracked", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "content\n");
      const result = runCommit(bash, repo, ["commit all"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const subject = repo.git("log", "-1", "--format=%s");
      assert.equal(subject.stdout.trim(), "commit all");
      const status = repo.git("status", "--porcelain");
      assert.equal(status.stdout.trim(), "");
    });
  });
});

test("mode 'all' (no selector): a deleted tracked file is committed as a deletion", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "gone.txt", "gone\n");
      fs.rmSync(path.join(repo.dir, "gone.txt"));
      const result = runCommit(bash, repo, ["drop gone"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const nameStatus = repo.git("show", "--name-status", "--format=", "HEAD");
      assert.equal(nameStatus.stdout.trim(), "D\tgone.txt");
    });
  });
});

test("mode paths: commits only the given path, other changes are left uncommitted", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "a\n");
      commitFile(repo, "b.txt", "b\n");
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "a, changed\n");
      fs.writeFileSync(path.join(repo.dir, "b.txt"), "b, changed\n");

      const result = runCommit(bash, repo, ["only a.txt", "a.txt"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const subject = repo.git("log", "-1", "--format=%s");
      assert.equal(subject.stdout.trim(), "only a.txt");
      const nameOnly = repo.git("show", "--name-only", "--format=", "HEAD");
      assert.equal(nameOnly.stdout.trim(), "a.txt");

      // b.txt's change is neither staged nor committed - the path selector
      // must isolate it from the rest of the working tree. (Do not
      // `.trim()` - porcelain status lines carry a meaningful leading space.)
      const status = repo.git("status", "--porcelain", "--", "b.txt");      assert.equal(status.stdout.replace(/\n$/, ""), " M b.txt");
    });
  });
});

test("mode paths with a list: commits a modified, a new and a deleted path together and nothing else", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "a\n");
      commitFile(repo, "gone.txt", "gone\n");
      commitFile(repo, "c.txt", "c\n");
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "a, changed\n");
      fs.writeFileSync(path.join(repo.dir, "new.txt"), "new\n");
      fs.rmSync(path.join(repo.dir, "gone.txt"));
      fs.writeFileSync(path.join(repo.dir, "c.txt"), "c, changed\n");

      const result = runCommit(bash, repo, ["three paths", "a.txt new.txt gone.txt"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const nameStatus = repo.git("show", "--name-status", "--format=", "HEAD");
      assert.deepEqual(nameStatus.stdout.trim().split("\n").sort(), ["A\tnew.txt", "D\tgone.txt", "M\ta.txt"]);
      const status = repo.git("status", "--porcelain");
      assert.equal(status.stdout.replace(/\n$/, ""), " M c.txt");
    });
  });
});

test("mode paths with the list split across several argv entries: same result as one space-joined string", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "a\n");
      commitFile(repo, "b.txt", "b\n");
      commitFile(repo, "c.txt", "c\n");
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "a, changed\n");
      fs.writeFileSync(path.join(repo.dir, "b.txt"), "b, changed\n");
      fs.writeFileSync(path.join(repo.dir, "c.txt"), "c, changed\n");

      const result = runCommit(bash, repo, ["two paths", "a.txt", "b.txt"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const nameOnly = repo.git("show", "--name-only", "--format=", "HEAD");
      assert.deepEqual(nameOnly.stdout.trim().split("\n").sort(), ["a.txt", "b.txt"]);
    });
  });
});

test("mode paths with directories already removed by git rm: every one is committed, not just the one still on disk (a path gone from disk and index used to drop out of the list)", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      for (const d of ["p1", "p2", "p3"]) {
        fs.mkdirSync(path.join(repo.dir, d));
        fs.writeFileSync(path.join(repo.dir, d, "f.txt"), `${d}\n`);
      }
      commitFile(repo, "other.txt", "o\n");
      repo.git("rm", "-rq", "p1", "p2", "p3");
      // p1 keeps a build leftover on disk, the way bin/obj outlive a git rm
      fs.mkdirSync(path.join(repo.dir, "p1", "obj"), { recursive: true });
      fs.writeFileSync(path.join(repo.dir, "other.txt"), "o, changed\n");
      repo.git("add", "other.txt");

      const result = runCommit(bash, repo, ["drop three", "p1 p2 p3"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const nameStatus = repo.git("show", "--name-status", "--format=", "HEAD");
      assert.deepEqual(nameStatus.stdout.trim().split("\n").sort(), ["D\tp1/f.txt", "D\tp2/f.txt", "D\tp3/f.txt"]);
      const staged = repo.git("diff", "--cached", "--name-only");
      assert.equal(staged.stdout.trim(), "other.txt");
    });
  });
});

test("mode paths with a tracked file under a directory its .gitignore ignores: committed with exit 0, nothing else swept in (git add exits 1 on the ignored parent)", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      fs.mkdirSync(path.join(repo.dir, "skills", "k", "refs"), { recursive: true });
      fs.writeFileSync(path.join(repo.dir, "skills", ".gitignore"), "*\n!.gitignore\n!k/\n");
      fs.writeFileSync(path.join(repo.dir, "skills", "k", "refs", "a.md"), "a\n");
      fs.writeFileSync(path.join(repo.dir, "skills", "k", "refs", "b.md"), "b\n");
      repo.git("add", "-f", "skills");
      repo.git("commit", "-m", "seed skills");
      commitFile(repo, "other.txt", "o\n");
      fs.writeFileSync(path.join(repo.dir, "skills", "k", "refs", "a.md"), "a, changed\n");
      fs.writeFileSync(path.join(repo.dir, "skills", "k", "refs", "b.md"), "b, changed\n");
      repo.git("add", "-f", "skills/k/refs/b.md");
      fs.writeFileSync(path.join(repo.dir, "other.txt"), "o, changed\n");
      repo.git("add", "other.txt");

      const result = runCommit(bash, repo, ["refs", "skills/k/refs/a.md skills/k/refs/b.md"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const nameOnly = repo.git("show", "--name-only", "--format=", "HEAD");
      assert.deepEqual(nameOnly.stdout.trim().split("\n").sort(), ["skills/k/refs/a.md", "skills/k/refs/b.md"]);
      const staged = repo.git("diff", "--cached", "--name-only");
      assert.equal(staged.stdout.trim(), "other.txt");
    });
  });
});

test("mode paths with an untracked file an ignore rule covers: it is not force-added", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, ".gitignore", "build/\n");
      fs.mkdirSync(path.join(repo.dir, "build"));
      fs.writeFileSync(path.join(repo.dir, "build", "out.js"), "gen\n");
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "a\n");

      const result = runCommit(bash, repo, ["a only", "a.txt build/out.js"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const nameOnly = repo.git("show", "--name-only", "--format=", "HEAD");
      assert.equal(nameOnly.stdout.trim(), "a.txt");
    });
  });
});

test("a selector naming only paths that do not exist exits 3 and commits nothing - staged work elsewhere stays staged (it used to fall back to 'git add -A' of everything)", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "a\n");
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "a, changed\n");
      repo.git("add", "a.txt");
      fs.writeFileSync(path.join(repo.dir, "b.txt"), "untracked\n");
      const before = repo.git("rev-parse", "HEAD").stdout;

      const result = runCommit(bash, repo, ["typo", "src/nope.ts lib/gone"]);
      assert.equal(result.status, 3);
      assert.match(result.stderr, /none of the named paths exists: src\/nope\.ts lib\/gone/);
      assert.equal(repo.git("rev-parse", "HEAD").stdout, before);
      assert.equal(repo.git("diff", "--cached", "--name-only").stdout.trim(), "a.txt");
      assert.match(repo.git("status", "--porcelain").stdout, /^\?\? b\.txt$/m);
    });
  });
});

// --- exit codes and messages ------------------------------------------------------

test("missing message -> exit 1 with usage on stderr, nothing committed", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      const result = runCommit(bash, repo, []);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /missing required parameter 'message'/);
      assert.match(result.stderr, /usage: commit\.sh <message> \[selector\.\.\.\]/);
    });
  });
});

test("a multi-line message round-trips verbatim into the commit body", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "content\n");
      const message = "feat: add thing\n\nlonger explanation on a second paragraph";
      const result = runCommit(bash, repo, [message]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const body = repo.git("log", "-1", "--format=%B");
      assert.equal(body.stdout.replace(/\n+$/, ""), message);
    });
  });
});

test("a message with a leading '-' is not mistaken for an option", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "content\n");
      const message = "-fix: dash-led message";
      const result = runCommit(bash, repo, [message]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const subject = repo.git("log", "-1", "--format=%s");
      assert.equal(subject.stdout.trim(), message);
    });
  });
});

test("nothing staged, mode 'all', no working-tree changes -> 'Nothing to commit.' on stdout, exit 0", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "content\n");
      const result = runCommit(bash, repo, ["no-op"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "Nothing to commit.\n");
      const subject = repo.git("log", "-1", "--format=%s");
      assert.equal(subject.stdout.trim(), "seed a.txt");
    });
  });
});

// --- edge cases: unborn HEAD, detached HEAD, missing user.email -----------------

test("unborn HEAD: the first commit succeeds as a root commit", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      fs.writeFileSync(path.join(repo.dir, "first.txt"), "first\n");
      const result = runCommit(bash, repo, ["root commit"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const log = repo.git("log", "--oneline");
      assert.equal(log.stdout.trim().split("\n").length, 1);
      const subject = repo.git("log", "-1", "--format=%s");
      assert.equal(subject.stdout.trim(), "root commit");
    });
  });
});

test("detached HEAD: a commit still lands, moving the detached HEAD forward (no branch update)", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "one\n");
      commitFile(repo, "b.txt", "two\n");
      const target = repo.git("rev-parse", "HEAD~1");
      assert.equal(target.status, 0, `git rev-parse should succeed: ${target.stderr}`);
      const checkout = repo.git("checkout", "--detach", target.stdout.trim());
      assert.equal(checkout.status, 0, `git checkout --detach should succeed: ${checkout.stderr}`);
      const before = repo.git("rev-parse", "HEAD");

      fs.writeFileSync(path.join(repo.dir, "c.txt"), "three\n");
      const result = runCommit(bash, repo, ["detached commit"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const after = repo.git("rev-parse", "HEAD");
      assert.notEqual(after.stdout.trim(), before.stdout.trim());
      const branch = repo.git("symbolic-ref", "-q", "HEAD");
      assert.notEqual(branch.status, 0, "HEAD should still be detached (no branch)");
    });
  });
});

test("user.email unset (config AND the env override the harness normally pins): commit.sh never lies about the outcome - either HEAD genuinely moved, or it failed and HEAD is untouched", () => {
  assertBash((bash) => {
    withGitRepo((repo) => {
      commitFile(repo, "a.txt", "content\n");
      const before = repo.git("rev-parse", "HEAD");
      const unsetEmail = repo.git("config", "--global", "--unset", "user.email");
      assert.equal(unsetEmail.status, 0, `git config --unset should succeed: ${unsetEmail.stderr}`);
      const unsetName = repo.git("config", "--global", "--unset", "user.name");
      assert.equal(unsetName.status, 0, `git config --unset should succeed: ${unsetName.stderr}`);

      // repo.env normally pins GIT_AUTHOR_*/GIT_COMMITTER_* env vars, which
      // would override the now-unset config identity - strip those too, so
      // this actually exercises "no identity configured anywhere".
      const noIdentityEnv = { ...repo.env };
      delete (noIdentityEnv as Record<string, string | undefined>).GIT_AUTHOR_NAME;
      delete (noIdentityEnv as Record<string, string | undefined>).GIT_AUTHOR_EMAIL;
      delete (noIdentityEnv as Record<string, string | undefined>).GIT_COMMITTER_NAME;
      delete (noIdentityEnv as Record<string, string | undefined>).GIT_COMMITTER_EMAIL;

      fs.writeFileSync(path.join(repo.dir, "b.txt"), "new\n");
      const result = runScript(SUT, ["identity test"], { shell: bash, cwd: repo.dir, env: noIdentityEnv });

      const after = repo.git("rev-parse", "HEAD");
      // Whether git falls back to a machine-derived identity (some
      // platforms only warn) or refuses outright (others hard-fail) is a
      // git-version/platform matter outside this script's control - what
      // commit.sh itself must never do is report success (exit 0) without
      // HEAD actually having moved, or report failure while a commit landed
      // anyway.
      if (result.status === 0) {
        assert.notEqual(after.stdout.trim(), before.stdout.trim(), "exit 0 must mean a commit genuinely landed");
      } else {
        assert.equal(after.stdout.trim(), before.stdout.trim(), "a non-zero exit must mean HEAD did not move");
      }
    });
  });
});
