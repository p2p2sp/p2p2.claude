/*
 * diff-files.test.ts - proves diff-files.sh's `sh diff-files.sh <repo-root>
 * [<base>]` contract (C4): the `BASE <merge-base sha> | BASE HEAD | BASE none`
 * line, then the changed files of the diff scope - sorted, unique, raw, deleted
 * ones excluded, nothing under `.temp/viber/code-auditor/` - plus the
 * `BAD_BASE <value>` and `NOT_A_REPO <root>` refusals (exit 1).
 *
 * diff-files.sh is `#!/bin/sh` and the skill invokes it as
 * `sh "${CLAUDE_SKILL_DIR}/scripts/diff-files.sh" ...`, so every case runs
 * through forEachShell("posix", ...) via opts.shell. Each case builds its own
 * throwaway repo; no case shares state with another.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/diff-files.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/code-auditor/scripts/diff-files.sh");

async function assertPosix(fn: (shell: Shell) => void | Promise<void>) {
  const skips = await forEachShell("posix", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "posix");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

async function run(shell: Shell, repo: GitRepo, args: string[] = []): Promise<RunResult> {
  return await runScript(SUT, [repo.dir, ...args], { shell, cwd: repo.dir, env: repo.env });
}

async function git(repo: GitRepo, ...args: string[]): Promise<string> {
  const result = await repo.git(...args);
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function write(repo: GitRepo, rel: string, content: string) {
  const file = path.join(repo.dir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** Writes the files, commits them all, returns the new commit sha. */
async function commitFiles(repo: GitRepo, files: Record<string, string>, message = "commit"): Promise<string> {
  for (const [rel, content] of Object.entries(files)) write(repo, rel, content);
  await git(repo, "add", "-A");
  await git(repo, "commit", "-m", message);
  return await git(repo, "rev-parse", "HEAD");
}

function lines(...rows: string[]): string {
  return rows.map((row) => `${row}\n`).join("");
}

function assertOutput(result: RunResult, expected: string) {
  assert.equal(result.status, 0, `unexpected exit status: stderr=${result.stderr}`);
  assert.equal(result.stdout, expected);
}

test("a feature branch prints its merge base, then a committed, a staged, an unstaged and an untracked path once each", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      const mainSha = await commitFiles(repo, { "base.txt": "1\n", "edited.txt": "1\n", "staged.txt": "1\n" });
      await git(repo, "checkout", "-b", "feature");
      await commitFiles(repo, { "committed.txt": "1\n" });
      write(repo, "staged.txt", "2\n");
      await git(repo, "add", "staged.txt");
      write(repo, "edited.txt", "2\n");
      write(repo, "untracked.txt", "1\n");
      assertOutput(
        await run(shell, repo),
        lines(`BASE ${mainSha}`, "committed.txt", "edited.txt", "staged.txt", "untracked.txt"),
      );
    });
  });
});

test("a file deleted since the base is not printed, committed or not", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      const mainSha = await commitFiles(repo, { "gone.txt": "1\n", "gone-too.txt": "1\n", "keep.txt": "1\n" });
      await git(repo, "checkout", "-b", "feature");
      await git(repo, "rm", "-q", "gone.txt");
      await git(repo, "commit", "-q", "-m", "drop");
      fs.rmSync(path.join(repo.dir, "gone-too.txt"));
      write(repo, "added.txt", "1\n");
      assertOutput(await run(shell, repo), lines(`BASE ${mainSha}`, "added.txt"));
    });
  });
});

test("on main only the uncommitted paths are printed and the base reads HEAD", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      await commitFiles(repo, { "one.txt": "1\n", "tracked.txt": "1\n" });
      await commitFiles(repo, { "two.txt": "1\n" });
      write(repo, "tracked.txt", "2\n");
      write(repo, "untracked.txt", "1\n");
      assertOutput(await run(shell, repo), lines("BASE HEAD", "tracked.txt", "untracked.txt"));
    });
  });
});

test("on main with origin/HEAD at main an unpushed commit is not printed and the base reads HEAD", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (remote) => {
      await withGitRepo(async (repo) => {
        await commitFiles(repo, { "pushed.txt": "1\n" });
        await git(repo, "remote", "add", "origin", remote.dir);
        await git(repo, "push", "-q", "origin", "main");
        await git(repo, "remote", "set-head", "origin", "main");
        await commitFiles(repo, { "unpushed.txt": "1\n" });
        assertOutput(await run(shell, repo), lines("BASE HEAD"));
      });
    }, { bare: true });
  });
});

test("with no origin/HEAD, main or master the base reads HEAD and a commit of the branch is not printed", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      await commitFiles(repo, { "one.txt": "1\n" });
      await git(repo, "branch", "-m", "dev");
      await commitFiles(repo, { "two.txt": "1\n" });
      assertOutput(await run(shell, repo), lines("BASE HEAD"));
    });
  });
});

test("on a detached HEAD the base reads HEAD and a commit of the branch left behind is not printed", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      await commitFiles(repo, { "one.txt": "1\n" });
      await git(repo, "checkout", "-q", "-b", "feature");
      await commitFiles(repo, { "feature.txt": "1\n" });
      await git(repo, "checkout", "-q", "--detach");
      assertOutput(await run(shell, repo), lines("BASE HEAD"));
    });
  });
});

test("on an orphan branch sharing no history with main the base reads HEAD", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      await commitFiles(repo, { "one.txt": "1\n" });
      await git(repo, "checkout", "-q", "--orphan", "island");
      await commitFiles(repo, { "island.txt": "1\n" });
      assertOutput(await run(shell, repo), lines("BASE HEAD"));
    });
  });
});

test("files under .temp/viber/code-auditor/ are never printed, even when the directory is not ignored", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      await commitFiles(repo, { "one.txt": "1\n" });
      write(repo, ".temp/viber/code-auditor/run-1/findings.md", "x\n");
      write(repo, "after.txt", "1\n");
      assertOutput(await run(shell, repo), lines("BASE HEAD", "after.txt"));
    });
  });
});

test("an explicit base two commits back on main prints that sha and the files of the two later commits plus the uncommitted ones", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      const first = await commitFiles(repo, { "a.txt": "1\n" });
      await commitFiles(repo, { "b.txt": "1\n" });
      await commitFiles(repo, { "c.txt": "1\n" });
      write(repo, "u.txt", "1\n");
      assertOutput(await run(shell, repo, [first]), lines(`BASE ${first}`, "b.txt", "c.txt", "u.txt"));
    });
  });
});

test("an explicit base given as a ref name prints its full sha", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      const first = await commitFiles(repo, { "a.txt": "1\n" });
      await git(repo, "tag", "start");
      await commitFiles(repo, { "b.txt": "1\n" });
      assertOutput(await run(shell, repo, ["start"]), lines(`BASE ${first}`, "b.txt"));
    });
  });
});

test("an explicit base naming no commit prints BAD_BASE and exits 1", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      await commitFiles(repo, { "a.txt": "1\n" });
      const result = await run(shell, repo, ["no-such-commit"]);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, lines("BAD_BASE no-such-commit"));
    });
  });
});

test("a path changed in a commit and again in the working tree is printed once, in sorted order", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      const mainSha = await commitFiles(repo, { "seed.txt": "1\n" });
      await git(repo, "checkout", "-q", "-b", "feature");
      await commitFiles(repo, { "b.txt": "1\n", "a.txt": "1\n" });
      write(repo, "a.txt", "2\n");
      assertOutput(await run(shell, repo), lines(`BASE ${mainSha}`, "a.txt", "b.txt"));
    });
  });
});

test("in a repository with no commit the base reads none and the staged and untracked paths follow", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      // the harness keeps its git config file in the repo dir; no commit has swept it up here
      write(repo, ".git/info/exclude", ".gitconfig-global\n");
      write(repo, "untracked.txt", "1\n");
      write(repo, "staged.txt", "1\n");
      await git(repo, "add", "staged.txt");
      assertOutput(await run(shell, repo), lines("BASE none", "staged.txt", "untracked.txt"));
    });
  });
});

test("in a repository with no commit a staged file deleted from disk is not printed and one present on disk is (the index alone is no proof the file exists)", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      write(repo, ".git/info/exclude", ".gitconfig-global\n");
      write(repo, "gone.txt", "1\n");
      write(repo, "kept.txt", "1\n");
      await git(repo, "add", "gone.txt", "kept.txt");
      fs.rmSync(path.join(repo.dir, "gone.txt"));
      assertOutput(await run(shell, repo), lines("BASE none", "kept.txt"));
    });
  });
});

test("a symlink turned into a regular file on the branch is printed (git reports it as type-changed, not modified)", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      await commitFiles(repo, { "seed.txt": "1\n" });
      // staged through the index, so the case needs no native symlink support
      write(repo, "link.txt", "seed.txt");
      const target = await git(repo, "hash-object", "-w", "link.txt");
      await git(repo, "update-index", "--add", "--cacheinfo", `120000,${target},link.txt`);
      await git(repo, "commit", "-q", "-m", "link");
      const mainSha = await git(repo, "rev-parse", "HEAD");
      await git(repo, "checkout", "-q", "-b", "feature");
      write(repo, "link.txt", "code\n");
      const blob = await git(repo, "hash-object", "-w", "link.txt");
      await git(repo, "update-index", "--cacheinfo", `100644,${blob},link.txt`);
      await git(repo, "commit", "-q", "-m", "typechange");
      assertOutput(await run(shell, repo), lines(`BASE ${mainSha}`, "link.txt"));
    });
  });
});

test("with nothing changed only the base line is printed", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      await commitFiles(repo, { "one.txt": "1\n" });
      assertOutput(await run(shell, repo), lines("BASE HEAD"));
    });
  });
});

test("outside a repository the script prints NOT_A_REPO and exits 1", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      await withTempDir("p2p2-nonrepo-", async (dir) => {
        const result = await runScript(SUT, [dir], { shell, cwd: repo.dir, env: repo.env });
        assert.equal(result.status, 1);
        assert.equal(result.stdout, lines(`NOT_A_REPO ${dir}`));
      });
    });
  });
});

test("a path with a space or a non-ASCII character is printed raw", async () => {
  await assertPosix(async (shell) => {
    await withGitRepo(async (repo) => {
      await commitFiles(repo, { "one.txt": "1\n" });
      write(repo, "a b.txt", "1\n");
      write(repo, "zażółć.txt", "1\n");
      assertOutput(await run(shell, repo), lines("BASE HEAD", "a b.txt", "zażółć.txt"));
    });
  });
});
