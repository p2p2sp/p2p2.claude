/*
 * collect_signals.test.ts - proves collect_signals.sh's
 * `collect_signals.sh [window_days] [repo_root] [--with-dependents] [--scope <dir>]`
 * contract: one JSONL record per tracked file with keys path/churn/
 * fix_commits/recency_days/loc/dependents/dependents_stem (dependents counted
 * by a lockstep-unique literal, echoed back as dependents_stem),
 * --with-dependents position-agnostic, --scope narrowing the record set only
 * (every probe value stays the unscoped one) and rejecting a non-repo-relative
 * directory with exit 2, the kept-extension list + per-file warnings on stderr
 * only, and exit 1 with no stdout on an unborn HEAD.
 *
 * collect_signals.sh ships mode 100644 (git ls-files) - the skill invokes it
 * explicitly as `bash "${CLAUDE_SKILL_DIR}/scripts/collect_signals.sh" ...`,
 * never bare - and it is `#!/usr/bin/env bash`, so every case here runs
 * through forEachShell("bash", ...) via opts.shell.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/collect_signals.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";
import { forEachShell } from "../harness/shells.ts";
import { canDenyRead, denyRead, restoreRead } from "../harness/perms.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/code-auditor/scripts/collect_signals.sh");

async function assertBash(fn: (bash: string) => void | Promise<void>) {
  const skips = await forEachShell("bash", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "bash");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

async function run(bash: string, repo: GitRepo, args: string[]): Promise<RunResult> {
  // --with-dependents spawns a process per candidate stem: seconds alone, past the 60 s default when the whole suite shares the machine.
  return await runScript(SUT, args, { shell: bash, cwd: repo.dir, env: repo.env, timeout: 180000 });
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
async function commitAt(repo: GitRepo, daysAgo: number, message: string): Promise<void> {
  const date = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
  const env = { ...repo.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
  const add = await runScript("git", ["add", "-A"], { cwd: repo.dir, env });
  assert.equal(add.status, 0, `git add failed: ${add.stderr}`);
  const commit = await runScript("git", ["commit", "-m", message], { cwd: repo.dir, env });
  assert.equal(commit.status, 0, `git commit failed: ${commit.stderr}`);
}

/** old.txt: 3 commits (day 45, day 10, day 5 - the last one a "fix:"), plus a
 *  single fresh new.txt (day 1) - enough spread to exercise the --since
 *  window boundary and recency_days without depending on wall-clock timing
 *  beyond a few days' margin either side. */
async function buildChurnFixture(repo: GitRepo): Promise<void> {
  fs.writeFileSync(path.join(repo.dir, "old.txt"), "line1\nline2\n");
  await commitAt(repo, 45, "add old file");

  fs.writeFileSync(path.join(repo.dir, "old.txt"), "line1\nline2\nline3\n");
  await commitAt(repo, 10, "update old file");

  fs.writeFileSync(path.join(repo.dir, "old.txt"), "line1\nline2\nline3\nline4\n");
  await commitAt(repo, 5, "fix: correct off-by-one bug");

  fs.writeFileSync(path.join(repo.dir, "new.txt"), "a\nb\nc\nd\ne\n");
  await commitAt(repo, 1, "add new feature file");
}

async function buildDependentsFixture(repo: GitRepo): Promise<void> {
  fs.writeFileSync(path.join(repo.dir, "widget.ts"), "export const widget = 1;\n");
  fs.writeFileSync(path.join(repo.dir, "consumer.md"), "See widget.ts for the implementation.\n");
  await commitAt(repo, 0, "seed dependents fixture");
}

/** Two files under src/ (one of them nested), one under lib/, one under the
 *  prefix-sharing sibling srcx/, and a README mentioning the alpha and gamma
 *  stems - so a `--scope src` run can be checked for exactly the right subtree
 *  (srcx/ excluded) and for dependents counted repo-wide (README.md is outside
 *  the scope yet still counts towards src/alpha.ts). */
async function buildScopeFixture(repo: GitRepo): Promise<void> {
  fs.mkdirSync(path.join(repo.dir, "src", "deep"), { recursive: true });
  fs.mkdirSync(path.join(repo.dir, "lib"), { recursive: true });
  fs.mkdirSync(path.join(repo.dir, "srcx"), { recursive: true });
  fs.writeFileSync(path.join(repo.dir, "src", "alpha.ts"), "export const alpha = 1;\n");
  fs.writeFileSync(path.join(repo.dir, "src", "deep", "beta.ts"), "export const beta = 2;\n");
  fs.writeFileSync(path.join(repo.dir, "lib", "gamma.ts"), "export const gamma = 3;\n");
  fs.writeFileSync(path.join(repo.dir, "srcx", "delta.ts"), "export const delta = 4;\n");
  fs.writeFileSync(path.join(repo.dir, "README.md"), "Docs for alpha and gamma.\n");
  await commitAt(repo, 1, "seed scope fixture");
}

function pathsOf(result: RunResult): string[] {
  return recordsOf(result)
    .map((r) => r.path as string)
    .sort();
}

// --- record shape --------------------------------------------------------

test("one JSONL record per tracked file, with exactly the documented keys", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "one\ntwo\n");
      fs.writeFileSync(path.join(repo.dir, "b.md"), "hello\n");
      await commitAt(repo, 0, "seed two files");

      const result = await run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const records = recordsOf(result);
      assert.equal(records.length, 2);
      for (const record of records) {
        assert.deepEqual(Object.keys(record).sort(), [
          "churn",
          "dependents",
          "dependents_stem",
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
      assert.equal((byPath["a.txt"] as any).dependents_stem, null);
    });
  });
});

// --- window_days / repo_root positionals ---------------------------------

test("[window_days] controls the --since cutoff for churn/fix_commits", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildChurnFixture(repo);

      const narrow = await run(bash, repo, ["30"]);
      assert.equal(narrow.status, 0, `stderr: ${narrow.stderr}`);
      const narrowOld = recordFor(narrow, "old.txt");
      assert.equal(narrowOld.churn, 2, "the day-45 commit must fall outside a 30-day window");
      assert.equal(narrowOld.fix_commits, 1);

      const wide = await run(bash, repo, ["55"]);
      assert.equal(wide.status, 0, `stderr: ${wide.stderr}`);
      const wideOld = recordFor(wide, "old.txt");
      assert.equal(wideOld.churn, 3, "a 55-day window must include the day-45 commit too");
      assert.equal(wideOld.fix_commits, 1);
    });
  });
});

test("recency_days reflects days since the file's last commit, loc reflects its current line count", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildChurnFixture(repo);
      const result = await run(bash, repo, ["55"]);
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

test("[repo_root] may be a directory other than the caller's cwd", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildChurnFixture(repo);
      await withTempDir("p2p2-collect-signals-cwd-", async (cwd) => {
        const result = await runScript(SUT, ["55", repo.dir], { shell: bash, cwd, env: repo.env });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.equal(recordFor(result, "old.txt").churn, 3);
      });
    });
  });
});

// --- --with-dependents, any argument position -----------------------------

test("--with-dependents may appear in any argument position and still binds window_days/repo_root correctly", async () => {
  await assertBash(async (bash) => {
    const positions: string[][] = [
      ["--with-dependents"],
      ["30", "--with-dependents"],
      ["--with-dependents", "30"],
      ["30", ".", "--with-dependents"],
    ];
    for (const args of positions) {
      await withGitRepo(async (repo) => {
        await buildDependentsFixture(repo);
        const result = await run(bash, repo, args);
        assert.equal(result.status, 0, `args=${args.join(" ")} stderr: ${result.stderr}`);
        assert.equal(recordFor(result, "widget.ts").dependents, 1, `args=${args.join(" ")}`);
        assert.equal(recordFor(result, "consumer.md").dependents, 0, `args=${args.join(" ")}`);
      });
    }
  });
});

// --- --scope ---------------------------------------------------------------

test("--scope <dir> emits records for that subtree only, never for a sibling sharing its prefix", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildScopeFixture(repo);
      const result = await run(bash, repo, ["--scope", "src"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.deepEqual(pathsOf(result), ["src/alpha.ts", "src/deep/beta.ts"]);
      assert.match(result.stderr, /^scope: src \(2 files\)$/m);
    });
  });
});

test("a --scope value tolerates a leading ./ and a trailing / and resolves to the same subtree", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildScopeFixture(repo);
      const plain = await run(bash, repo, ["--scope", "src"]);
      const decorated = await run(bash, repo, ["--scope", "./src/"]);
      assert.equal(decorated.status, 0, `stderr: ${decorated.stderr}`);
      assert.deepEqual(pathsOf(decorated), pathsOf(plain));
      assert.match(decorated.stderr, /^scope: src \(2 files\)$/m);
    });
  });
});

test("a scoped record carries exactly the values the unscoped run computes for that same file", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildScopeFixture(repo);
      const unscoped = await run(bash, repo, ["30", "--with-dependents"]);
      assert.equal(unscoped.status, 0, `stderr: ${unscoped.stderr}`);
      const scoped = await run(bash, repo, ["30", "--scope", "src", "--with-dependents"]);
      assert.equal(scoped.status, 0, `stderr: ${scoped.stderr}`);

      const before = recordFor(unscoped, "src/alpha.ts");
      const after = recordFor(scoped, "src/alpha.ts");
      // README.md sits OUTSIDE the scope and must still count - dependents is
      // a repo-wide probe, narrowed by nothing.
      assert.equal(before.dependents, 1, "README.md mentions the alpha stem");
      for (const key of ["path", "churn", "fix_commits", "recency_days", "loc", "dependents", "dependents_stem"]) {
        assert.equal(after[key], before[key], `field ${key} must not change under --scope`);
      }
    });
  });
});

test("--scope may appear before or after the positionals and still binds window_days/repo_root correctly", async () => {
  await assertBash(async (bash) => {
    const positions: string[][] = [
      ["30", "--scope", "src"],
      ["--scope", "src", "30", "."],
    ];
    for (const args of positions) {
      await withGitRepo(async (repo) => {
        await buildScopeFixture(repo);
        const result = await run(bash, repo, args);
        assert.equal(result.status, 0, `args=${args.join(" ")} stderr: ${result.stderr}`);
        assert.deepEqual(pathsOf(result), ["src/alpha.ts", "src/deep/beta.ts"], `args=${args.join(" ")}`);
      });
    }
  });
});

test("a --scope matching zero tracked files is a valid empty sweep, not an error", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildScopeFixture(repo);
      const result = await run(bash, repo, ["--scope", "nowhere"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /^scope: nowhere \(0 files\)$/m);
    });
  });
});

test("an absolute or ..-bearing --scope value exits 2 with no stdout and one stderr line naming it", async () => {
  await assertBash(async (bash) => {
    for (const scope of ["/etc", "/", "//", "C:/tmp", "..", "../sibling", "src/../lib", "src/.."]) {
      await withGitRepo(async (repo) => {
        await buildScopeFixture(repo);
        const result = await run(bash, repo, ["--scope", scope]);
        assert.equal(result.status, 2, `scope=${scope} stderr: ${result.stderr}`);
        assert.equal(result.stdout, "", `scope=${scope}`);
        const stderrLines = result.stderr.split("\n").filter((line) => line.length > 0);
        assert.equal(stderrLines.length, 1, `scope=${scope} stderr: ${result.stderr}`);
        assert.ok(
          stderrLines[0].startsWith("collect_signals.sh: --scope must be a repo-root-relative directory: "),
          `scope=${scope} stderr: ${result.stderr}`,
        );
        assert.ok(stderrLines[0].endsWith(scope.replace(/\/+$/, "")), `scope=${scope} stderr: ${result.stderr}`);
      });
    }
  });
});

test("a trailing --scope with no value exits 2 with no stdout", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildScopeFixture(repo);
      const result = await run(bash, repo, ["30", ".", "--scope"]);
      assert.equal(result.status, 2, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /^collect_signals\.sh: --scope requires a directory argument$/m);
    });
  });
});

// --- dependents_stem ------------------------------------------------------

/** Four files sharing the basename stem `index`, plus the mentions that make
 *  each surviving literal countable. a/index.ts and lib/a/index.ts both reach
 *  `a/index` in the first extension round, so only lib/a/index.ts has a
 *  segment left to add; a/index.ts and the root index.ts run out of path.
 *  widget.ts is the control - a stem unique from the start. */
async function buildCollisionFixture(repo: GitRepo): Promise<void> {
  fs.mkdirSync(path.join(repo.dir, "a"), { recursive: true });
  fs.mkdirSync(path.join(repo.dir, "b"), { recursive: true });
  fs.mkdirSync(path.join(repo.dir, "lib", "a"), { recursive: true });
  fs.writeFileSync(path.join(repo.dir, "a", "index.ts"), "export const value = 1;\n");
  fs.writeFileSync(path.join(repo.dir, "b", "index.ts"), "export const value = 2;\n");
  fs.writeFileSync(path.join(repo.dir, "lib", "a", "index.ts"), "export const value = 3;\n");
  fs.writeFileSync(path.join(repo.dir, "index.ts"), "export const value = 0;\n");
  for (const name of ["use1.md", "use2.md", "use3.md"]) {
    fs.writeFileSync(path.join(repo.dir, name), "imports a/index for the value\n");
  }
  fs.writeFileSync(path.join(repo.dir, "use4.md"), "imports b/index for the value\n");
  fs.writeFileSync(path.join(repo.dir, "use5.md"), "imports lib/a/index for the value\n");
  fs.writeFileSync(path.join(repo.dir, "widget.ts"), "export const widget = 1;\n");
  fs.writeFileSync(path.join(repo.dir, "consumer.md"), "See widget for the implementation.\n");
  await commitAt(repo, 1, "seed collision fixture");
}

/** Criterion 9 verbatim: a/index.ts, b/index.ts, three files mentioning the
 *  literal a/index and one mentioning b/index, none of them named index.ts. */
async function buildTwoIndexFixture(repo: GitRepo): Promise<void> {
  fs.mkdirSync(path.join(repo.dir, "a"), { recursive: true });
  fs.mkdirSync(path.join(repo.dir, "b"), { recursive: true });
  fs.writeFileSync(path.join(repo.dir, "a", "index.ts"), "export const value = 1;\n");
  fs.writeFileSync(path.join(repo.dir, "b", "index.ts"), "export const value = 2;\n");
  for (const name of ["u1.md", "u2.md", "u3.md"]) {
    fs.writeFileSync(path.join(repo.dir, name), "imports a/index for the value\n");
  }
  fs.writeFileSync(path.join(repo.dir, "u4.md"), "imports b/index for the value\n");
  await commitAt(repo, 1, "seed two-index fixture");
}

test("a repeated stem is counted by the literal the colliding group lockstep-extends to", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildCollisionFixture(repo);
      const result = await run(bash, repo, ["--with-dependents"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const b = recordFor(result, "b/index.ts");
      assert.equal(b.dependents_stem, "b/index", "one segment is enough to make b unique");
      assert.equal(b.dependents, 1);

      const libA = recordFor(result, "lib/a/index.ts");
      assert.equal(libA.dependents_stem, "lib/a/index", "a/index still collided, so lib/ extends again");
      assert.equal(libA.dependents, 1, "use5.md is the only file carrying the full literal");

      const widget = recordFor(result, "widget.ts");
      assert.equal(widget.dependents_stem, "widget", "a stem unique from the start never extends");
      assert.equal(widget.dependents, 1);
    });
  });
});

test("a path that runs out of segments while still colliding gets dependents -1 and dependents_stem null", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildCollisionFixture(repo);
      const result = await run(bash, repo, ["--with-dependents"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const a = recordFor(result, "a/index.ts");
      assert.equal(a.dependents, -1, "a/index still collides with lib/a/index.ts and a has nothing left");
      assert.equal(a.dependents_stem, null);

      const root = recordFor(result, "index.ts");
      assert.equal(root.dependents, -1, "a root file with a repeated stem has no segment to add at all");
      assert.equal(root.dependents_stem, null);
    });
  });
});

test("two same-stem files in different directories each count by their own one-segment literal", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildTwoIndexFixture(repo);
      const result = await run(bash, repo, ["--with-dependents"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const a = recordFor(result, "a/index.ts");
      assert.equal(a.dependents, 3);
      assert.equal(a.dependents_stem, "a/index");

      const b = recordFor(result, "b/index.ts");
      assert.equal(b.dependents, 1);
      assert.equal(b.dependents_stem, "b/index");
    });
  });
});

test("the counting literal is judged repo-wide, so --scope does not shrink it back to the bare stem", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildTwoIndexFixture(repo);
      const result = await run(bash, repo, ["--scope", "b", "--with-dependents"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.deepEqual(pathsOf(result), ["b/index.ts"]);

      const b = recordFor(result, "b/index.ts");
      // a/index.ts is outside the scope and still collides with this file -
      // judging uniqueness on the scoped set alone would yield a bare `index`.
      assert.equal(b.dependents_stem, "b/index");
      assert.equal(b.dependents, 1);
    });
  });
});

// --- stderr: extension list + warnings only -------------------------------

test("stderr carries the kept-extension list and nothing else on a clean run", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      fs.writeFileSync(path.join(repo.dir, "a.txt"), "one\n");
      await commitAt(repo, 0, "seed");
      const result = await run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stderr, /^sweep extensions:.*\btxt\b.*$/m);
      assert.doesNotMatch(result.stderr, /warning:/);
      assert.doesNotMatch(result.stdout, /sweep extensions:/);
    });
  });
});

test(
  "a per-file probe failure (unreadable tracked file) warns on stderr only and is skipped from stdout",
  { skip: canDenyRead() ? false : "this machine cannot deny its own account read access" },
  async () => {
    await assertBash(async (bash) => {
      await withGitRepo(async (repo) => {
        fs.writeFileSync(path.join(repo.dir, "locked.txt"), "secret\n");
        fs.writeFileSync(path.join(repo.dir, "open.txt"), "visible\n");
        await commitAt(repo, 0, "seed");
        const locked = path.join(repo.dir, "locked.txt");
        assert.ok(denyRead(locked), "the deny must hold, or this case proves nothing");
        try {
          const result = await run(bash, repo, []);
          assert.equal(result.status, 0, `stderr: ${result.stderr}`);
          assert.match(result.stderr, /warning: skipping locked\.txt \(loc probe failed\)/);
          const records = recordsOf(result);
          assert.ok(
            !records.some((r) => r.path === "locked.txt"),
            "locked.txt must be skipped from stdout, not merely warned about",
          );
          assert.ok(records.some((r) => r.path === "open.txt"));
        } finally {
          restoreRead(locked);
        }
      });
    });
  },
);

// --- exit codes / degenerate repos ----------------------------------------

test("unborn HEAD -> non-zero exit, one stderr line, zero stdout", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      const result = await run(bash, repo, []);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      const stderrLines = result.stderr.split("\n").filter((line) => line.length > 0);
      assert.equal(stderrLines.length, 1);
      assert.match(result.stderr, /HEAD has no commits yet \(unborn HEAD\) - nothing to sweep/);
    });
  });
});

test("a repo whose only commit is empty -> exit 0, empty stdout (nothing tracked to sweep)", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      const commit = await runScript("git", ["commit", "--allow-empty", "-m", "empty init"], {
        cwd: repo.dir,
        env: repo.env,
      });
      assert.equal(commit.status, 0, `stderr: ${commit.stderr}`);
      const result = await run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "");
    });
  });
});

// --- edge cases ------------------------------------------------------------

test("a tracked filename with a space and a non-ASCII character comes through unquoted", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      const name = "café notes.md";
      fs.writeFileSync(path.join(repo.dir, name), "notes\n");
      await commitAt(repo, 0, "add unicode filename");
      const result = await run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(recordFor(result, name).path, name);
    });
  });
});

test("a file deleted in a later commit does not appear in the output", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      fs.writeFileSync(path.join(repo.dir, "temp.txt"), "temp\n");
      await commitAt(repo, 2, "add temp file");
      fs.rmSync(path.join(repo.dir, "temp.txt"));
      await commitAt(repo, 1, "remove temp file");
      const result = await run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.ok(!recordsOf(result).some((r) => r.path === "temp.txt"));
    });
  });
});

test("a shallow clone still produces valid JSONL output without crashing", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildChurnFixture(repo);
      await withTempDir("p2p2-collect-signals-shallow-", async (parentDir) => {
        const shallowDir = path.join(parentDir, "shallow");
        const clone = await runScript("git", ["clone", "--depth", "1", repo.dir, shallowDir], { env: repo.env });
        assert.equal(clone.status, 0, `git clone --depth 1 failed: ${clone.stderr}`);
        const result = await runScript(SUT, ["55", shallowDir], { shell: bash, env: repo.env });
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
