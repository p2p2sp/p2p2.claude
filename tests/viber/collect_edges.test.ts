/*
 * collect_edges.test.ts - proves collect_edges.sh's
 * `collect_edges.sh [repo_root] [--max-fanout K] [--max-seconds S] [--scope <dir>]`
 * contract: one JSONL record per candidate pair with keys
 * a/b/via/vias/fanout/shared, --max-fanout capping a linking literal as
 * ambient once its fanout exceeds it, --scope keeping exactly the pairs with
 * at least one endpoint under it (its stdout string-equal to the matching
 * lines of an unscoped run, though it reads only the scope and the files
 * sharing a literal with it, even when its git grep fails, and printing a
 * `pass2 <N> files to scan` progress line) and rejecting a non-repo-relative
 * directory with exit 2,
 * a grep process count that does not grow with the literal count,
 * --max-seconds exiting 3 with no stdout and one deadline line once its
 * deadline passes (0 or absent: no limit, a non-integer: exit 2), exit 1
 * with no stdout on an unborn HEAD, and exit 0 with EMPTY stdout (not an
 * error) when no pairs are found.
 *
 * collect_edges.sh is `#!/usr/bin/env bash` and the skill invokes it
 * explicitly as `bash "${CLAUDE_SKILL_DIR}/scripts/collect_edges.sh" ...`,
 * so every case here runs through forEachShell("bash", ...) via opts.shell.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/collect_edges.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";
import { forEachShell } from "../harness/shells.ts";
import { canDenyRead, denyRead, restoreRead } from "../harness/perms.ts";
import { coreUtilsPath, withStub } from "../harness/stub.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/code-auditor/scripts/collect_edges.sh");

async function assertBash(fn: (bash: string) => void | Promise<void>) {
  const skips = await forEachShell("bash", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "bash");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

async function run(bash: string, repo: GitRepo, args: string[]): Promise<RunResult> {
  return await runScript(SUT, args, { shell: bash, cwd: repo.dir, env: repo.env });
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
async function commitAt(repo: GitRepo, daysAgo: number, message: string): Promise<void> {
  const date = new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
  const env = { ...repo.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
  const add = await runScript("git", ["add", "-A"], { cwd: repo.dir, env });
  assert.equal(add.status, 0, `git add failed: ${add.stderr}`);
  const commit = await runScript("git", ["commit", "-m", message], { cwd: repo.dir, env });
  assert.equal(commit.status, 0, `git commit failed: ${commit.stderr}`);
}

/** shared.md is a real tracked file mentioned by 3 other files, so it links
 *  all 3 into a clique of 3 pairs at fanout 3 - enough to exercise --max-
 *  fanout capping in both directions. */
async function buildPairFixture(repo: GitRepo): Promise<void> {
  fs.writeFileSync(path.join(repo.dir, "shared.md"), "shared config\n");
  fs.writeFileSync(path.join(repo.dir, "a.ts"), "// reads shared.md at startup\n");
  fs.writeFileSync(path.join(repo.dir, "b.ts"), "// also reads shared.md at startup\n");
  fs.writeFileSync(path.join(repo.dir, "c.ts"), "// depends on shared.md too\n");
  await commitAt(repo, 0, "seed pair fixture");
}

/** shared.md and other.md are tracked artifacts, never endpoints themselves -
 *  collect_edges.sh pairs the files that MENTION a literal. src/a.ts, src/b.ts
 *  and lib/c.ts all mention shared.md (fanout 3, a clique of 3 pairs, two of
 *  them straddling the src/ boundary), while lib/c.ts and lib/d.ts share
 *  other.md - the one pair with both endpoints outside src/. */
async function buildScopedPairFixture(repo: GitRepo): Promise<void> {
  fs.mkdirSync(path.join(repo.dir, "src"), { recursive: true });
  fs.mkdirSync(path.join(repo.dir, "lib"), { recursive: true });
  fs.writeFileSync(path.join(repo.dir, "shared.md"), "shared config\n");
  fs.writeFileSync(path.join(repo.dir, "other.md"), "other config\n");
  fs.writeFileSync(path.join(repo.dir, "src", "a.ts"), "// reads shared.md at startup\n");
  fs.writeFileSync(path.join(repo.dir, "src", "b.ts"), "// also reads shared.md at startup\n");
  fs.writeFileSync(path.join(repo.dir, "lib", "c.ts"), "// depends on shared.md and other.md\n");
  fs.writeFileSync(path.join(repo.dir, "lib", "d.ts"), "// also reads other.md\n");
  await commitAt(repo, 0, "seed scoped pair fixture");
}

function pairKeysOf(result: RunResult): string[] {
  return recordsOf(result)
    .map((r) => [r.a, r.b].join("|"))
    .sort();
}

// --- record shape ----------------------------------------------------------

test("JSONL records carry a, b, via, vias, fanout, shared - a always < b", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildPairFixture(repo);
      const result = await run(bash, repo, []);
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

test("--max-fanout caps as documented: a literal exceeding it is dropped as ambient", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildPairFixture(repo);

      const capped = await run(bash, repo, ["--max-fanout", "2"]);
      assert.equal(capped.status, 0, `stderr: ${capped.stderr}`);
      assert.equal(capped.stdout, "", "fanout 3 must exceed --max-fanout 2, dropping every pair");

      const uncapped = await run(bash, repo, ["--max-fanout", "3"]);
      assert.equal(uncapped.status, 0, `stderr: ${uncapped.stderr}`);
      assert.equal(recordsOf(uncapped).length, 3, "raising --max-fanout to 3 restores every pair");
    });
  });
});

test("[repo_root] may differ from cwd, and --max-fanout may appear before or after it", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildPairFixture(repo);
      await withTempDir("p2p2-collect-edges-cwd-", async (cwd) => {
        const before = await runScript(SUT, ["--max-fanout", "8", repo.dir], { shell: bash, cwd, env: repo.env });
        assert.equal(before.status, 0, `stderr: ${before.stderr}`);
        assert.equal(recordsOf(before).length, 3);

        const after = await runScript(SUT, [repo.dir, "--max-fanout", "8"], { shell: bash, cwd, env: repo.env });
        assert.equal(after.status, 0, `stderr: ${after.stderr}`);
        assert.equal(recordsOf(after).length, 3);
      });
    });
  });
});

// --- --scope ----------------------------------------------------------------

test("--scope <dir> keeps a pair iff at least one endpoint lies under it", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildScopedPairFixture(repo);
      const result = await run(bash, repo, ["--scope", "src"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      // The last two straddle the boundary - an edge whose other endpoint sits
      // outside src/ is exactly the contract a scoped audit must still see.
      assert.deepEqual(pairKeysOf(result), [
        "lib/c.ts|src/a.ts",
        "lib/c.ts|src/b.ts",
        "src/a.ts|src/b.ts",
      ]);
      assert.ok(
        !pairKeysOf(result).includes("lib/c.ts|lib/d.ts"),
        "a pair with BOTH endpoints outside the scope must never be emitted",
      );
      assert.match(result.stderr, /^scope: src \(3 pairs\)$/m);
    });
  });
});

test("a scoped pair carries exactly the values the unscoped run computes for it", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildScopedPairFixture(repo);
      const unscoped = await run(bash, repo, []);
      assert.equal(unscoped.status, 0, `stderr: ${unscoped.stderr}`);
      const scoped = await run(bash, repo, ["--scope", "src"]);
      assert.equal(scoped.status, 0, `stderr: ${scoped.stderr}`);

      const beforeRecords = recordsOf(unscoped);
      for (const record of recordsOf(scoped)) {
        const before = beforeRecords.find((r) => r.a === record.a && r.b === record.b);
        assert.ok(before, `expected ${record.a}|${record.b} in the unscoped run too`);
        assert.deepEqual(record, before, "the scope must narrow the pair set and nothing else");
        // Counting literals repo-wide is what keeps this at 3: a filter
        // applied BEFORE pairing would leave only src/a.ts and src/b.ts
        // mentioning shared.md, reporting fanout 2.
        assert.equal(record.fanout, 3, `${record.a}|${record.b} must keep the repo-wide fanout`);
      }
    });
  });
});

test("a --scope value tolerates a leading ./ and a trailing / and resolves to the same subtree", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildScopedPairFixture(repo);
      const plain = await run(bash, repo, ["--scope", "src"]);
      const decorated = await run(bash, repo, ["--scope", "./src/"]);
      assert.equal(decorated.status, 0, `stderr: ${decorated.stderr}`);
      assert.deepEqual(pairKeysOf(decorated), pairKeysOf(plain));
      assert.match(decorated.stderr, /^scope: src \(3 pairs\)$/m);
    });
  });
});

test("--scope may appear before or after [repo_root] and --max-fanout", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildScopedPairFixture(repo);
      await withTempDir("p2p2-collect-edges-scope-cwd-", async (cwd) => {
        const positions: string[][] = [
          ["--scope", "src", repo.dir, "--max-fanout", "8"],
          [repo.dir, "--max-fanout", "8", "--scope", "src"],
          [repo.dir, "--scope", "src", "--max-fanout", "8"],
        ];
        for (const args of positions) {
          const result = await runScript(SUT, args, { shell: bash, cwd, env: repo.env });
          assert.equal(result.status, 0, `args=${args.join(" ")} stderr: ${result.stderr}`);
          assert.deepEqual(
            pairKeysOf(result),
            ["lib/c.ts|src/a.ts", "lib/c.ts|src/b.ts", "src/a.ts|src/b.ts"],
            `args=${args.join(" ")}`,
          );
        }
      });
    });
  });
});

test("a --scope no pair reaches is a valid empty result, not an error", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildScopedPairFixture(repo);
      const result = await run(bash, repo, ["--scope", "nowhere"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /^scope: nowhere \(0 pairs\)$/m);
    });
  });
});

test("an absolute or ..-bearing --scope value exits 2 with no stdout and one stderr line naming it", async () => {
  await assertBash(async (bash) => {
    for (const scope of ["/etc", "/", "//", "C:/tmp", "..", "../sibling", "src/../lib", "src/.."]) {
      await withGitRepo(async (repo) => {
        await buildScopedPairFixture(repo);
        const result = await run(bash, repo, ["--scope", scope]);
        assert.equal(result.status, 2, `scope=${scope} stderr: ${result.stderr}`);
        assert.equal(result.stdout, "", `scope=${scope}`);
        const stderrLines = result.stderr.split("\n").filter((line) => line.length > 0);
        assert.equal(stderrLines.length, 1, `scope=${scope} stderr: ${result.stderr}`);
        assert.ok(
          stderrLines[0].startsWith("collect_edges.sh: --scope must be a repo-root-relative directory: "),
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
      await buildScopedPairFixture(repo);
      const result = await run(bash, repo, [".", "--scope"]);
      assert.equal(result.status, 2, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /^collect_edges\.sh: --scope requires a directory argument$/m);
    });
  });
});

/** A richer scope fixture for the scoped-vs-unscoped parity case: src/ (with a
 *  nested dir), the prefix-sharing sibling srcx/, lib/ and root artifacts.
 *  It carries a `MyValue.cs` vs `Value.cs` literal pair (a `git grep -F`
 *  substring hit the regex must discard), sentence punctuation
 *  (`report.md.)`, `report.md. Then`), a TAB right after a literal, a CRLF
 *  line end, a self-reference, a denied `logo.png` literal, an over-long tail
 *  (`com.example.UserServiceImpl`), a binary file, and `only.cfg`, a literal
 *  shared only by two files outside the scope. */
async function buildParityFixture(repo: GitRepo): Promise<void> {
  const write = (rel: string, body: string) => {
    fs.mkdirSync(path.dirname(path.join(repo.dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(repo.dir, rel), body);
  };
  write("shared.md", "shared config\n");
  write("Value.cs", "class Value {}\n");
  write("MyValue.cs", "class MyValue {}\n");
  write("report.md", "report\n");
  write("pair.json", "{}\n");
  write("logo.png", "not really a png\n");
  write("src/a.ts", "// reads shared.md and Value.cs, see report.md.)\n");
  write("src/b.ts", "// uses MyValue.cs\tand shared.md\t\n// self a.ts b.ts logo.png\n");
  write("src/deep/c.ts", "// reads pair.json and com.example.UserServiceImpl\r\n");
  write("srcx/c.ts", "// report.md. Then Value.cs\n");
  write("lib/d.ts", "// MyValue.cs and pair.json and only.cfg\n");
  write("lib/e.ts", "// pair.json logo.png only.cfg\n");
  write("data.dat", "bin\0shared.md\0\n");
  await commitAt(repo, 0, "seed parity fixture");
}

function underSrc(p: string): boolean {
  return p === "src" || p.startsWith("src/");
}

test("a scoped run prints exactly the unscoped lines whose a or b lies under the scope (scoping reads fewer files but must not change one byte)", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildParityFixture(repo);
      const unscoped = await run(bash, repo, []);
      assert.equal(unscoped.status, 0, `stderr: ${unscoped.stderr}`);
      const scoped = await run(bash, repo, ["--scope", "src"]);
      assert.equal(scoped.status, 0, `stderr: ${scoped.stderr}`);

      const expected = unscoped.stdout
        .split("\n")
        .filter((line) => line.length > 0)
        .filter((line) => {
          const record = JSON.parse(line);
          return underSrc(record.a) || underSrc(record.b);
        });
      assert.ok(expected.length > 0, `the fixture must yield scoped pairs, got:\n${unscoped.stdout}`);
      assert.ok(
        recordsOf(unscoped).some((r) => r.a === "lib/d.ts" && r.b === "lib/e.ts" && r.vias.includes("only.cfg")),
        "the fixture must hold a pair linked only outside the scope, or the filter proves nothing",
      );
      assert.equal(scoped.stdout, expected.map((line) => `${line}\n`).join(""));
    });
  });
});

test("a scoped run still counts an assume-unchanged and a skip-worktree file outside the scope (git grep reads neither from the working tree)", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      fs.mkdirSync(path.join(repo.dir, "src"), { recursive: true });
      fs.mkdirSync(path.join(repo.dir, "lib"), { recursive: true });
      fs.writeFileSync(path.join(repo.dir, "shared.md"), "shared config\n");
      fs.writeFileSync(path.join(repo.dir, "src", "a.ts"), "// reads shared.md\n");
      fs.writeFileSync(path.join(repo.dir, "lib", "b.ts"), "// nothing yet\n");
      fs.writeFileSync(path.join(repo.dir, "lib", "c.ts"), "// nothing yet\n");
      await commitAt(repo, 0, "seed hidden-entry fixture");
      for (const flags of [["--assume-unchanged", "lib/b.ts"], ["--skip-worktree", "lib/c.ts"]]) {
        const mark = await runScript("git", ["update-index", ...flags], { cwd: repo.dir, env: repo.env });
        assert.equal(mark.status, 0, `git update-index failed: ${mark.stderr}`);
      }
      fs.writeFileSync(path.join(repo.dir, "lib", "b.ts"), "// now reads shared.md\n");
      fs.writeFileSync(path.join(repo.dir, "lib", "c.ts"), "// now reads shared.md too\n");

      const unscoped = await run(bash, repo, []);
      assert.equal(unscoped.status, 0, `stderr: ${unscoped.stderr}`);
      const scoped = await run(bash, repo, ["--scope", "src"]);
      assert.equal(scoped.status, 0, `stderr: ${scoped.stderr}`);
      assert.deepEqual(pairKeysOf(scoped), ["lib/b.ts|src/a.ts", "lib/c.ts|src/a.ts"]);
      for (const record of recordsOf(scoped)) assert.equal(record.fanout, 3, `${record.a}|${record.b}`);
      const expected = unscoped.stdout
        .split("\n")
        .filter((line) => line.length > 0 && (underSrc(JSON.parse(line).a) || underSrc(JSON.parse(line).b)));
      assert.equal(scoped.stdout, expected.map((line) => `${line}\n`).join(""));
    });
  });
});

test("a scoped run whose git grep fails scans every candidate and still prints the unscoped lines under the scope", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildParityFixture(repo);
      const unscoped = await run(bash, repo, []);
      assert.equal(unscoped.status, 0, `stderr: ${unscoped.stderr}`);
      // An unparsable grep.threads makes git grep alone exit 128.
      const broken = { ...repo.env, GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "grep.threads", GIT_CONFIG_VALUE_0: "abc" };
      const scoped = await runScript(SUT, ["--scope", "src"], { shell: bash, cwd: repo.dir, env: broken });
      assert.equal(scoped.status, 0, `stderr: ${scoped.stderr}`);
      const expected = unscoped.stdout
        .split("\n")
        .filter((line) => line.length > 0 && (underSrc(JSON.parse(line).a) || underSrc(JSON.parse(line).b)));
      assert.equal(scoped.stdout, expected.map((line) => `${line}\n`).join(""));
    });
  });
});

test("a scoped run reports how many files pass 2 scans", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildScopedPairFixture(repo);
      const result = await run(bash, repo, ["--scope", "src"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stderr, /^collect_edges\.sh: pass2 \d+ files to scan$/m);
    });
  });
});

// --- process count and --max-seconds ----------------------------------------

/** The real grep, by an absolute forward-slash path a stub can `exec`
 *  (double-quoted in the stub: on Windows it holds a space). */
function realGrep(): string {
  const dir = coreUtilsPath().split(path.delimiter)[0];
  return path.join(dir, "grep").replace(/\\/g, "/");
}

/** `files` tracked .ts files, each holding `tokensPerFile` distinct literals. */
async function buildTokenFixture(repo: GitRepo, files: number, tokensPerFile: number): Promise<void> {
  for (let i = 0; i < files; i++) {
    const tokens: string[] = [];
    for (let k = 0; k < tokensPerFile; k++) tokens.push(`t${i}_${k}.md`);
    fs.writeFileSync(path.join(repo.dir, `f${i}.ts`), `// ${tokens.join(" ")}\n`);
  }
  await commitAt(repo, 0, "seed token fixture");
}

async function grepCalls(bash: string, tokensPerFile: number): Promise<number> {
  return await withGitRepo(async (repo) => {
    await buildTokenFixture(repo, 40, tokensPerFile);
    return await withStub("grep", `printf 'x\\n' >> "$GREP_LOG"\nexec "${realGrep()}" "$@"`, async (stubDir) => {
      const log = path.join(stubDir, "calls.log").replace(/\\/g, "/");
      const result = await runScript(SUT, [], {
        shell: bash,
        cwd: repo.dir,
        env: { ...repo.env, GREP_LOG: log },
        stubDirs: [stubDir],
      });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      return fs.readFileSync(log, "utf8").split("\n").filter((line) => line.length > 0).length;
    });
  });
}

test("the grep process count does not grow with the literal count (one grep per xargs batch, never one per literal)", async () => {
  await assertBash(async (bash) => {
    const one = await grepCalls(bash, 1);
    const fifty = await grepCalls(bash, 50);
    assert.equal(fifty, one, "50 literals per file must not spawn more greps than 1 literal per file");
    assert.ok(one < 10, `expected fewer than 10 grep calls over 40 files, got ${one}`);
  });
});

test("--max-seconds past its deadline exits 3 with empty stdout and the deadline line (proves the exit-3 contract only: the noise-filter greps alone pass the deadline here)", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      fs.writeFileSync(path.join(repo.dir, "a.ts"), "// reads shared.md\n");
      fs.writeFileSync(path.join(repo.dir, "b.ts"), "// also reads shared.md\n");
      await commitAt(repo, 0, "seed deadline fixture");
      await withStub("grep", `sleep 2\nexec "${realGrep()}" "$@"`, async (stubDir) => {
        const result = await runScript(SUT, ["--max-seconds", "1"], {
          shell: bash,
          cwd: repo.dir,
          env: repo.env,
          stubDirs: [stubDir],
        });
        assert.equal(result.status, 3, `stderr: ${result.stderr}`);
        assert.equal(result.stdout, "");
        assert.match(result.stderr, /^collect_edges\.sh: deadline of 1s exceeded - edge sweep abandoned$/m);
      });
    });
  });
});

test("--max-seconds 0 and an absent --max-seconds both run without a limit", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildPairFixture(repo);
      const absent = await run(bash, repo, []);
      assert.equal(absent.status, 0, `stderr: ${absent.stderr}`);
      assert.equal(recordsOf(absent).length, 3);
      const zero = await run(bash, repo, ["--max-seconds", "0"]);
      assert.equal(zero.status, 0, `stderr: ${zero.stderr}`);
      assert.equal(zero.stdout, absent.stdout);
    });
  });
});

test("a --max-seconds value that is not a non-negative integer exits 2 with no stdout", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildPairFixture(repo);
      for (const value of ["abc", "-1", "1.5"]) {
        const result = await run(bash, repo, ["--max-seconds", value]);
        assert.equal(result.status, 2, `value=${value} stderr: ${result.stderr}`);
        assert.equal(result.stdout, "", `value=${value}`);
        assert.match(result.stderr, /^collect_edges\.sh: --max-seconds must be a non-negative integer: /m);
      }
    });
  });
});

// --- exit codes / degenerate repos ------------------------------------------

test("unborn HEAD -> exit 1, no stdout", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      const result = await run(bash, repo, []);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /HEAD has no commits yet \(unborn HEAD\) - nothing to sweep/);
    });
  });
});

test("no pairs found -> exit 0 with EMPTY stdout (a valid result, not an error)", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      fs.writeFileSync(path.join(repo.dir, "lonely.md"), "nothing references anything else\n");
      await commitAt(repo, 0, "seed lonely file");
      const result = await run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, "");
    });
  });
});

test("a repo whose only commit is empty -> exit 0, empty stdout", async () => {
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

// --- edge cases --------------------------------------------------------------

test("a pair endpoint with a space and a non-ASCII character comes through unquoted", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      const name = "café notes.md";
      fs.writeFileSync(path.join(repo.dir, "shared.md"), "shared config\n");
      fs.writeFileSync(path.join(repo.dir, name), "reads shared.md at startup\n");
      fs.writeFileSync(path.join(repo.dir, "other.ts"), "// also reads shared.md\n");
      await commitAt(repo, 0, "seed unicode pair fixture");
      const result = await run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const records = recordsOf(result);
      const record = records.find((r) => r.a === name || r.b === name);
      assert.ok(record, `expected a pair containing ${name}, got:\n${result.stdout}`);
    });
  });
});

test("a file whose name starts with - is read as a file, never as a grep option", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      fs.writeFileSync(path.join(repo.dir, "shared.md"), "shared config\n");
      fs.writeFileSync(path.join(repo.dir, "-x.ts"), "// reads shared.md\n");
      fs.writeFileSync(path.join(repo.dir, "other.ts"), "// also reads shared.md\n");
      await commitAt(repo, 0, "seed dash-named fixture");
      const result = await run(bash, repo, []);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.deepEqual(pairKeysOf(result), ["-x.ts|other.ts"]);
    });
  });
});

test("a file deleted in a later commit never appears as a pair endpoint", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      fs.writeFileSync(path.join(repo.dir, "shared.md"), "shared config\n");
      fs.writeFileSync(path.join(repo.dir, "temp.ts"), "// reads shared.md\n");
      fs.writeFileSync(path.join(repo.dir, "keep.ts"), "// also reads shared.md\n");
      fs.writeFileSync(path.join(repo.dir, "keep2.ts"), "// depends on shared.md\n");
      await commitAt(repo, 2, "add temp + keep + keep2");
      fs.rmSync(path.join(repo.dir, "temp.ts"));
      await commitAt(repo, 1, "remove temp");

      const result = await run(bash, repo, []);
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
  { skip: canDenyRead() ? false : "this machine cannot deny its own account read access" },
  async () => {
    await assertBash(async (bash) => {
      await withGitRepo(async (repo) => {
        fs.writeFileSync(path.join(repo.dir, "shared.md"), "shared config\n");
        fs.writeFileSync(path.join(repo.dir, "locked.ts"), "// reads shared.md\n");
        fs.writeFileSync(path.join(repo.dir, "open.ts"), "// also reads shared.md\n");
        await commitAt(repo, 0, "seed unreadable fixture");
        const locked = path.join(repo.dir, "locked.ts");
        assert.ok(denyRead(locked), "the deny must hold, or this case proves nothing");
        try {
          const result = await run(bash, repo, []);
          assert.equal(result.status, 0, `stderr: ${result.stderr}`);
          assert.match(result.stderr, /warning: skipping locked\.ts \(unreadable\)/);
          const records = recordsOf(result);
          assert.ok(!records.some((r) => r.a === "locked.ts" || r.b === "locked.ts"));
        } finally {
          restoreRead(locked);
        }
      });
    });
  },
);

test("a shallow clone still produces the same pairs (collect_edges.sh reads content, not history)", async () => {
  await assertBash(async (bash) => {
    await withGitRepo(async (repo) => {
      await buildPairFixture(repo);
      await withTempDir("p2p2-collect-edges-shallow-", async (parentDir) => {
        const shallowDir = path.join(parentDir, "shallow");
        const clone = await runScript("git", ["clone", "--depth", "1", repo.dir, shallowDir], { env: repo.env });
        assert.equal(clone.status, 0, `git clone --depth 1 failed: ${clone.stderr}`);
        const result = await runScript(SUT, [shallowDir], { shell: bash, env: repo.env });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.equal(recordsOf(result).length, 3);
      });
    });
  });
});
