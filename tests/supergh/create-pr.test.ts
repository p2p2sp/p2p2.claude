/*
 * create-pr.test.ts - proves the three supergh/skills/create-pr/scripts/*.sh
 * scripts against a stubbed `gh`, real git facts (no network, no push):
 *
 *   - check-base.sh   : BASE_EXISTS=1|0, OPEN_PR= (fail-soft) when the base
 *                       exists, REMOTE_BRANCHES= (minus origin/HEAD and the
 *                       head branch) when it does not; exit 2 on missing args.
 *   - pr-facts.sh     : ISSUE_TITLE=/ISSUE_ERROR= (only when an issue number
 *                       is given), FIRST_SUBJECT=, CLOSES=, CHANGED_FILES=,
 *                       the COMMITS: marker followed by raw `git log`; every
 *                       probe fails independently (fail-soft) while the block
 *                       still emits; exit 2 on missing args.
 *   - create.sh       : PR_URL=/PR_NUMBER= parsed from gh, the invocation
 *                       always carries --draft and --body-file, exit 1 with
 *                       an ERROR line when creation fails, exit 2 on missing
 *                       args.
 *
 * All three are `#!/bin/sh`, so every case runs through forEachShell("posix",
 * ...) via opts.shell, never executed directly. `gh` is always a withStub -
 * this test never shells out to the real gh, and no remote is ever pushed to
 * (remote-tracking refs are faked locally with `git update-ref`).
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/supergh/create-pr.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, type GitRepo } from "../harness/tmp.ts";
import { withStub } from "../harness/stub.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";

const CHECK_BASE = path.resolve(import.meta.dirname, "../../supergh/skills/create-pr/scripts/check-base.sh");
const PR_FACTS = path.resolve(import.meta.dirname, "../../supergh/skills/create-pr/scripts/pr-facts.sh");
const CREATE = path.resolve(import.meta.dirname, "../../supergh/skills/create-pr/scripts/create.sh");

function assertPosix(fn: (shell: Shell) => void) {
  const skips = forEachShell("posix", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "posix");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

/** A `gh` stub answering `pr list`, `issue view` and `pr create`, each argv
 *  logged one-arg-per-line (a "===" separator between calls) into
 *  `$ARGV_FILE`. Behavior of each call is controlled entirely through env
 *  vars, so one stub body serves all three scripts under test. */
const GH_STUB = `
log() { for a in "$@"; do printf '%s\\n' "$a" >> "$ARGV_FILE"; done; printf '===\\n' >> "$ARGV_FILE"; }
if [ "$1" = "pr" ] && [ "$2" = "list" ]; then
  log "$@"
  if [ -n "\${PR_LIST_FAIL:-}" ]; then exit 1; fi
  printf '%s' "\${PR_LIST_STDOUT:-}"
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "view" ]; then
  log "$@"
  if [ -n "\${ISSUE_VIEW_FAIL:-}" ]; then printf '%s' "\${ISSUE_VIEW_STDERR:-error}" >&2; exit 1; fi
  printf '%s' "\${ISSUE_VIEW_STDOUT:-}"
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "create" ]; then
  log "$@"
  if [ -n "\${PR_CREATE_STDERR:-}" ]; then printf '%s' "$PR_CREATE_STDERR" >&2; fi
  printf '%s' "\${PR_CREATE_STDOUT:-}"
  exit "\${PR_CREATE_EXIT:-0}"
fi
exit 1
`;

function argvCalls(argvFile: string): string[][] {
  const raw = fs.readFileSync(argvFile, "utf-8");
  return raw
    .split("===\n")
    .map((block) => block.split("\n").filter((line) => line.length > 0))
    .filter((call) => call.length > 0);
}

function newArgvFile(repo: GitRepo): string {
  const argvFile = path.join(repo.dir, "argv.log");
  fs.writeFileSync(argvFile, "");
  return argvFile;
}

// ===================================================================
// check-base.sh
// ===================================================================

test("check-base: BASE_EXISTS=1, an open PR already exists -> OPEN_PR=<url>", () => {
  assertPosix((shell) => {
    withStub("gh", GH_STUB, (stubDir) => {
      withGitRepo((repo) => {
        repo.git("commit", "--allow-empty", "-m", "init");
        const sha = repo.git("rev-parse", "HEAD").stdout.trim();
        repo.git("update-ref", "refs/remotes/origin/main", sha);
        const argvFile = newArgvFile(repo);
        const result = runScript(CHECK_BASE, ["main", "feature"], {
          shell,
          cwd: repo.dir,
          env: { ...repo.env, ARGV_FILE: argvFile, PR_LIST_STDOUT: "https://github.com/acme/widgets/pull/9" },
          stubDirs: [stubDir],
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.deepEqual(
          result.stdout.split("\n").filter((l) => l.length > 0),
          ["BASE_EXISTS=1", "OPEN_PR=https://github.com/acme/widgets/pull/9"],
        );
        const calls = argvCalls(argvFile);
        assert.equal(calls.length, 1);
        assert.deepEqual(calls[0], ["pr", "list", "--head", "feature", "--base", "main", "--state", "open", "--json", "url", "--jq", ".[0].url // \"\""]);
      });
    });
  });
});

test("check-base: BASE_EXISTS=1, no open PR -> OPEN_PR= empty", () => {
  assertPosix((shell) => {
    withStub("gh", GH_STUB, (stubDir) => {
      withGitRepo((repo) => {
        repo.git("commit", "--allow-empty", "-m", "init");
        const sha = repo.git("rev-parse", "HEAD").stdout.trim();
        repo.git("update-ref", "refs/remotes/origin/main", sha);
        const argvFile = newArgvFile(repo);
        const result = runScript(CHECK_BASE, ["main", "feature"], {
          shell,
          cwd: repo.dir,
          env: { ...repo.env, ARGV_FILE: argvFile, PR_LIST_STDOUT: "" },
          stubDirs: [stubDir],
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.deepEqual(result.stdout.split("\n").filter((l) => l.length > 0), ["BASE_EXISTS=1", "OPEN_PR="]);
      });
    });
  });
});

test("check-base: BASE_EXISTS=1, the gh pr list probe itself fails -> fail-soft OPEN_PR= empty, exit 0", () => {
  assertPosix((shell) => {
    withStub("gh", GH_STUB, (stubDir) => {
      withGitRepo((repo) => {
        repo.git("commit", "--allow-empty", "-m", "init");
        const sha = repo.git("rev-parse", "HEAD").stdout.trim();
        repo.git("update-ref", "refs/remotes/origin/main", sha);
        const argvFile = newArgvFile(repo);
        const result = runScript(CHECK_BASE, ["main", "feature"], {
          shell,
          cwd: repo.dir,
          env: { ...repo.env, ARGV_FILE: argvFile, PR_LIST_FAIL: "1" },
          stubDirs: [stubDir],
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.deepEqual(result.stdout.split("\n").filter((l) => l.length > 0), ["BASE_EXISTS=1", "OPEN_PR="]);
      });
    });
  });
});

test("check-base: BASE_EXISTS=0 -> REMOTE_BRANCHES lists origin/* names, minus origin/HEAD and the head branch itself", () => {
  assertPosix((shell) => {
    withStub("gh", GH_STUB, (stubDir) => {
      withGitRepo((repo) => {
        repo.git("commit", "--allow-empty", "-m", "init");
        const sha = repo.git("rev-parse", "HEAD").stdout.trim();
        repo.git("update-ref", "refs/remotes/origin/a", sha);
        repo.git("update-ref", "refs/remotes/origin/b", sha);
        repo.git("update-ref", "refs/remotes/origin/feature", sha);
        repo.git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/a");
        const argvFile = newArgvFile(repo);
        const result = runScript(CHECK_BASE, ["release", "feature"], {
          shell,
          cwd: repo.dir,
          env: { ...repo.env, ARGV_FILE: argvFile },
          stubDirs: [stubDir],
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.deepEqual(result.stdout.split("\n").filter((l) => l.length > 0), ["BASE_EXISTS=0", "REMOTE_BRANCHES=a,b"]);
      });
    });
  });
});

test("check-base: exit 2 on missing arguments", () => {
  assertPosix((shell) => {
    withGitRepo((repo) => {
      const result = runScript(CHECK_BASE, ["main"], { shell, cwd: repo.dir, env: repo.env });
      assert.equal(result.status, 2);
      assert.match(result.stderr, /need <base> <head>/);
    });
  });
});

// ===================================================================
// pr-facts.sh
// ===================================================================

/** Seeds `main` with one commit, then a `feature` branch with two more
 *  commits ahead of it - one changing `a.txt`, the other `b.txt` - so
 *  FIRST_SUBJECT / CLOSES / CHANGED_FILES / COMMITS all have real content
 *  to assert against. */
function seedFeatureBranch(repo: GitRepo, secondSubject: string): void {
  fs.writeFileSync(path.join(repo.dir, "base.txt"), "base\n");
  assert.equal(repo.git("add", "-A").status, 0);
  assert.equal(repo.git("commit", "-m", "base commit").status, 0);
  assert.equal(repo.git("checkout", "-b", "feature").status, 0);
  fs.writeFileSync(path.join(repo.dir, "a.txt"), "a\n");
  assert.equal(repo.git("add", "-A").status, 0);
  const first = repo.git("commit", "-m", "first commit\n\nCloses #5");
  assert.equal(first.status, 0, `stderr: ${first.stderr}`);
  fs.writeFileSync(path.join(repo.dir, "b.txt"), "b\n");
  assert.equal(repo.git("add", "-A").status, 0);
  const second = repo.git("commit", "-m", secondSubject);
  assert.equal(second.status, 0, `stderr: ${second.stderr}`);
}

test("pr-facts: with an issue number -> ISSUE_TITLE from gh, plus FIRST_SUBJECT/CLOSES (issue itself excluded)/CHANGED_FILES/COMMITS all populated", () => {
  assertPosix((shell) => {
    withStub("gh", GH_STUB, (stubDir) => {
      withGitRepo((repo) => {
        seedFeatureBranch(repo, "second commit\n\nFixes #5\nFixes #6");
        const argvFile = newArgvFile(repo);
        const result = runScript(PR_FACTS, ["main", "feature", "5"], {
          shell,
          cwd: repo.dir,
          env: { ...repo.env, ARGV_FILE: argvFile, ISSUE_VIEW_STDOUT: "My Issue Title" },
          stubDirs: [stubDir],
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.match(result.stdout, /^ISSUE_TITLE=My Issue Title$/m);
        assert.doesNotMatch(result.stdout, /^ISSUE_ERROR=/m);
        assert.match(result.stdout, /^FIRST_SUBJECT=first commit$/m);
        // #5 is the issue itself, excluded; #6 is a distinct closes-ref.
        assert.match(result.stdout, /^CLOSES=6$/m);
        assert.match(result.stdout, /^CHANGED_FILES=a\.txt,b\.txt$/m);
        assert.match(result.stdout, /^COMMITS:$/m);
        const commitsBlock = result.stdout.split("COMMITS:\n")[1];
        assert.match(commitsBlock, /^first commit\nCloses #5\n\n---\n/);
        assert.match(commitsBlock, /second commit\nFixes #5\nFixes #6\n\n---/);
      });
    });
  });
});

test("pr-facts: without an issue number -> no ISSUE_TITLE or ISSUE_ERROR line is printed", () => {
  assertPosix((shell) => {
    withStub("gh", GH_STUB, (stubDir) => {
      withGitRepo((repo) => {
        seedFeatureBranch(repo, "second commit");
        const argvFile = newArgvFile(repo);
        const result = runScript(PR_FACTS, ["main", "feature"], {
          shell,
          cwd: repo.dir,
          env: { ...repo.env, ARGV_FILE: argvFile },
          stubDirs: [stubDir],
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.doesNotMatch(result.stdout, /^ISSUE_TITLE=/m);
        assert.doesNotMatch(result.stdout, /^ISSUE_ERROR=/m);
        // no gh call at all should have been logged.
        assert.equal(fs.readFileSync(argvFile, "utf-8"), "");
      });
    });
  });
});

test("pr-facts: ISSUE_ERROR= when the issue lookup fails", () => {
  assertPosix((shell) => {
    withStub("gh", GH_STUB, (stubDir) => {
      withGitRepo((repo) => {
        seedFeatureBranch(repo, "second commit");
        const argvFile = newArgvFile(repo);
        const result = runScript(PR_FACTS, ["main", "feature", "42"], {
          shell,
          cwd: repo.dir,
          env: { ...repo.env, ARGV_FILE: argvFile, ISSUE_VIEW_FAIL: "1", ISSUE_VIEW_STDERR: "issue not found" },
          stubDirs: [stubDir],
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.doesNotMatch(result.stdout, /^ISSUE_TITLE=/m);
        assert.match(result.stdout, /^ISSUE_ERROR=.*issue not found/m);
      });
    });
  });
});

test("pr-facts: empty CHANGED_FILES and FIRST_SUBJECT when base and head are identical (no commits in range)", () => {
  assertPosix((shell) => {
    withStub("gh", GH_STUB, (stubDir) => {
      withGitRepo((repo) => {
        repo.git("commit", "--allow-empty", "-m", "only commit");
        const argvFile = newArgvFile(repo);
        const result = runScript(PR_FACTS, ["main", "main"], {
          shell,
          cwd: repo.dir,
          env: { ...repo.env, ARGV_FILE: argvFile },
          stubDirs: [stubDir],
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.match(result.stdout, /^FIRST_SUBJECT=$/m);
        assert.match(result.stdout, /^CLOSES=$/m);
        assert.match(result.stdout, /^CHANGED_FILES=$/m);
        assert.match(result.stdout, /^COMMITS:\n?$/m);
      });
    });
  });
});

test("pr-facts: every probe fails independently (unresolvable base ref, no gh) -> the block still emits every key, exit 0", () => {
  assertPosix((shell) => {
    withGitRepo((repo) => {
      repo.git("commit", "--allow-empty", "-m", "only commit");
      const argvFile = newArgvFile(repo);
      // no gh stub on PATH at all - the issue-number branch's `gh issue view`
      // call fails to even find a `gh` binary, proving ISSUE_ERROR is set
      // without crashing the rest of the block.
      const result = runScript(PR_FACTS, ["nonexistent-base", "main", "7"], {
        shell,
        cwd: repo.dir,
        env: { ...repo.env, ARGV_FILE: argvFile },
      });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^ISSUE_ERROR=/m);
      assert.match(result.stdout, /^FIRST_SUBJECT=$/m);
      assert.match(result.stdout, /^CLOSES=$/m);
      assert.match(result.stdout, /^CHANGED_FILES=$/m);
      assert.match(result.stdout, /^COMMITS:\n?$/m);
    });
  });
});

test("pr-facts: exit 2 on missing arguments", () => {
  assertPosix((shell) => {
    withGitRepo((repo) => {
      const result = runScript(PR_FACTS, ["main"], { shell, cwd: repo.dir, env: repo.env });
      assert.equal(result.status, 2);
      assert.match(result.stderr, /need <base> <head> \[issue-number\]/);
    });
  });
});

// ===================================================================
// create-pr/scripts/create.sh
// ===================================================================

test("create.sh: PR_URL=/PR_NUMBER= parsed from gh, invocation carries --draft and --body-file", () => {
  assertPosix((shell) => {
    withStub("gh", GH_STUB, (stubDir) => {
      withGitRepo((repo) => {
        const argvFile = newArgvFile(repo);
        const bodyPath = path.join(repo.dir, "body.md");
        fs.writeFileSync(bodyPath, "pr body\n");
        const result = runScript(CREATE, ["main", "feature", bodyPath, "Add widgets"], {
          shell,
          cwd: repo.dir,
          env: { ...repo.env, ARGV_FILE: argvFile, PR_CREATE_STDOUT: "https://github.com/acme/widgets/pull/21\n" },
          stubDirs: [stubDir],
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.deepEqual(result.stdout.split("\n").filter((l) => l.length > 0), [
          "PR_URL=https://github.com/acme/widgets/pull/21",
          "PR_NUMBER=21",
        ]);
        const calls = argvCalls(argvFile);
        assert.equal(calls.length, 1);
        assert.deepEqual(calls[0], ["pr", "create", "--base", "main", "--head", "feature", "--draft", "--title", "Add widgets", "--body-file", bodyPath]);
        assert.ok(calls[0].includes("--draft"), "the invocation must always carry --draft");
        assert.ok(calls[0].includes("--body-file"), "the invocation must always carry --body-file");
      });
    });
  });
});

test("create.sh: gh pr create fails -> exit 1 with a single ERROR line on stderr", () => {
  assertPosix((shell) => {
    withStub("gh", GH_STUB, (stubDir) => {
      withGitRepo((repo) => {
        const argvFile = newArgvFile(repo);
        const bodyPath = path.join(repo.dir, "body.md");
        fs.writeFileSync(bodyPath, "pr body\n");
        const result = runScript(CREATE, ["main", "feature", bodyPath, "Add widgets"], {
          shell,
          cwd: repo.dir,
          env: { ...repo.env, ARGV_FILE: argvFile, PR_CREATE_EXIT: "1", PR_CREATE_STDERR: "a pull request already exists" },
          stubDirs: [stubDir],
        });
        assert.equal(result.status, 1);
        assert.equal(result.stdout, "");
        const stderrLines = result.stderr.split("\n").filter((l) => l.length > 0);
        assert.equal(stderrLines.length, 1, `expected a single ERROR line, got:\n${result.stderr}`);
        assert.match(result.stderr, /^ERROR create\.sh: gh pr create failed:.*a pull request already exists/);
      });
    });
  });
});

test("create.sh: exit 2 on missing arguments", () => {
  assertPosix((shell) => {
    withGitRepo((repo) => {
      const result = runScript(CREATE, ["main", "feature"], { shell, cwd: repo.dir, env: repo.env });
      assert.equal(result.status, 2);
      assert.match(result.stderr, /need <base> <head> <body_path> <title>/);
    });
  });
});
