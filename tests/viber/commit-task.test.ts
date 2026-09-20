/*
 * commit-task.test.ts - proves viber/scripts/commit-task.sh's contract:
 * `commit-task.sh <plan-file> <task-id>` stages ONLY the paths on that task's
 * `- Files:` line, commits them under the task's own heading line
 * (`### T1 - <title>`) as the subject, writes the `<!-- done: ... -->` marker and
 * the `## Tasks (x/N)` header, and prints `committed: <sha>` and `progress: x/N`
 * on stdout with anything left outside the commit named on stderr.
 *
 * The marker and the commit are ATOMIC: the marker is written first so it rides
 * IN the commit, and any failure from there on (a refused `git commit`, a plan
 * outside the repository) restores the plan from its backup and exits 5 with
 * nothing committed and nothing recorded. A plan claiming a task is done that was
 * never committed would be skipped forever when a build resumes after a context
 * reset, and the orchestrator never re-verifies the script - so this is the one
 * invariant the suite exists for.
 *
 * `commit-task.sh <plan-file> <task-id> <fix-number> <file>...` is the post-test
 * repair of an already committed task: subject `T1(2) - <title>` off the same
 * heading, the plan untouched, and nothing the caller did not name - `.temp/`
 * reports above all - reaching the history.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/commit-task.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/commit-task.sh");

// commit-task.sh ships mode 100755 and the implementor invokes it directly as
// `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" ...`, never through bash; the
// harness below still runs it via shell: "bash" because it is testing the
// script's content, not its exec bit (portability.test.ts covers that).
function run(dir: string, env: Record<string, string>, args: string[]) {
  return runScript(SUT, args, { cwd: dir, env, shell: "bash" });
}

/** The dated directory layout plan-path.sh owns - the plan lives in the repo. */
const PLAN_REL = "docs/plans/2026-09-20-10-00-00_feat-x/plan.md";

function write(root: string, rel: string, content: string): void {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** A plan in the template's shape: the `<!-- done: - -->` marker, the
 *  `## Tasks (0/N)` header, and one `<!-- TASK -->` block per task whose
 *  `- Files:` line is the machine-readable map the script stages literally and
 *  whose `### T<n> - <title>` heading is the commit subject it reads. */
function planBody(tasks: Array<[id: string, files: string, title?: string]>): string {
  return [
    "# Plan - feat x",
    "",
    "<!-- done: - -->",
    "",
    `## Tasks (0/${tasks.length})`,
    "",
    ...tasks.flatMap(([id, files, title]) => [
      "<!-- TASK -->",
      `### ${id} - ${title ?? `task ${id}`}`,
      `- Files: ${files}`,
      "<!-- /TASK -->",
      "",
    ]),
  ].join("\n");
}

const TWO_TASKS: Array<[string, string, string?]> = [
  ["T1", "src/a.ts"],
  ["T2", "src/b.ts"],
];

/** Commits the plan and a README so the only pending change a test sees is the
 *  one the test makes. */
function seed(repo: GitRepo, tasks: Array<[string, string, string?]> = TWO_TASKS): void {
  write(repo.dir, PLAN_REL, planBody(tasks));
  write(repo.dir, "README.md", "seed\n");
  repo.git("add", "-A");
  repo.git("commit", "-m", "seed");
}

function readPlan(repo: GitRepo): string {
  return fs.readFileSync(path.join(repo.dir, PLAN_REL), "utf-8");
}

function planDirEntries(repo: GitRepo): string[] {
  return fs.readdirSync(path.join(repo.dir, path.dirname(PLAN_REL))).sort();
}

function subjects(repo: GitRepo): string[] {
  return repo.git("log", "--format=%s").stdout.trim().split("\n").filter(Boolean);
}

function committedFiles(repo: GitRepo): string[] {
  return repo
    .git("show", "--name-only", "--format=", "HEAD")
    .stdout.trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

function stagedFiles(repo: GitRepo): string[] {
  return repo.git("diff", "--cached", "--name-only").stdout.trim().split("\n").filter(Boolean).sort();
}

/** Makes `git commit` fail while `git add` keeps working - the pre-commit hook
 *  / rejected-signature class of failure, reproduced through an unresolvable
 *  gpg program rather than a hook script, because a hook needs an exec bit that
 *  Windows does not carry. */
function breakCommit(repo: GitRepo): void {
  repo.git("config", "commit.gpgsign", "true");
  repo.git("config", "gpg.program", "p2p2-no-such-gpg");
}

function fixCommit(repo: GitRepo): void {
  repo.git("config", "commit.gpgsign", "false");
}

test("a task commits only its own Files: paths, with the done marker and the counter riding in that same commit", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^committed: [0-9a-f]{7,}\nprogress: 1\/2\n$/);

    assert.match(readPlan(repo), /<!-- done: T1 -->/);
    assert.match(readPlan(repo), /^## Tasks \(1\/2\)$/m);
    assert.deepEqual(committedFiles(repo), [PLAN_REL, "src/a.ts"].sort());

    // Read back out of history, not out of the working tree: a resume after a
    // context reset must find the marker in the commit itself.
    const fromHistory = repo.git("show", `HEAD:${PLAN_REL}`).stdout;
    assert.match(fromHistory, /<!-- done: T1 -->/);
    assert.match(fromHistory, /^## Tasks \(1\/2\)$/m);
  });
});

test("the commit subject is the task's whole heading line, taken from the plan (the orchestrator never composes or paraphrases it)", () => {
  withGitRepo((repo) => {
    seed(repo, [["T1", "src/a.ts", "add the plan index"], ["T2", "src/b.ts"]]);
    write(repo.dir, "src/a.ts", "work\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(subjects(repo)[0], "T1 - add the plan index");
  });
});

test("a file outside the task's map stays out of the commit and is named on stderr", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, "src/UNRELATED.ts", "not mine\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), [PLAN_REL, "src/a.ts"].sort());
    assert.match(result.stderr, /left outside the commit \(not in task T1 file map\)/);
    assert.match(result.stderr, /src\/UNRELATED\.ts/);
  });
});

test("a refused git commit leaves the plan byte-for-byte unchanged and exits 5 (a task marked done but never committed is skipped forever on resume)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    const before = readPlan(repo);
    breakCommit(repo);

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 5);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /plan rolled back, task T1 is NOT marked done/);

    assert.equal(readPlan(repo), before);
    assert.deepEqual(subjects(repo), ["seed"]);
  });
});

test("a refused git commit leaves no backup or temp file next to the plan", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    breakCommit(repo);

    run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.deepEqual(planDirEntries(repo), ["plan.md"]);
  });
});

test("a refused git commit leaves the task's work staged, so the same call retried after the cause is fixed commits it", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    breakCommit(repo);

    const refused = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(refused.status, 5);
    assert.ok(stagedFiles(repo).includes("src/a.ts"), `staged: ${stagedFiles(repo).join(", ")}`);

    fixCommit(repo);
    const retried = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(retried.status, 0, `stderr: ${retried.stderr}`);
    assert.match(retried.stdout, /progress: 1\/2\n$/);
    assert.match(readPlan(repo), /<!-- done: T1 -->/);
    assert.deepEqual(committedFiles(repo), [PLAN_REL, "src/a.ts"].sort());
  });
});

test("a plan outside the repository fails while staging and still rolls the marker back", () => {
  // The plan mode hand-over case: plan mode can name a file outside the project,
  // where `git add` is fatal - the marker must not survive that either.
  withTempDir("p2p2-viber-outside-", (outside) => {
    withGitRepo((repo) => {
      seed(repo);
      write(repo.dir, "src/a.ts", "work\n");
      const plan = path.join(outside, "plan.md");
      fs.writeFileSync(plan, planBody(TWO_TASKS));
      const before = fs.readFileSync(plan, "utf-8");

      const result = run(repo.dir, repo.env, [plan, "T1"]);
      assert.equal(result.status, 5);
      assert.equal(result.stdout, "");
      assert.equal(fs.readFileSync(plan, "utf-8"), before);
      assert.deepEqual(fs.readdirSync(outside), ["plan.md"]);
      assert.deepEqual(subjects(repo), ["seed"]);
    });
  });
});

test("the second task advances the counter to 2/2 and appends to the marker", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    write(repo.dir, "src/b.ts", "more\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T2"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /progress: 2\/2\n$/);
    assert.match(readPlan(repo), /<!-- done: T1 T2 -->/);
    assert.match(readPlan(repo), /^## Tasks \(2\/2\)$/m);
  });
});

test("committing the same task id twice does not duplicate it in the marker or double the counter", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    write(repo.dir, "src/a.ts", "more work\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /progress: 1\/2\n$/);
    assert.match(readPlan(repo), /<!-- done: T1 -->/);
    assert.match(readPlan(repo), /^## Tasks \(1\/2\)$/m);
  });
});

test("a fix number commits a repair of that task under 'T<n>(<round>) - <title>', naming the task it repairs and leaving the plan's progress alone", () => {
  withGitRepo((repo) => {
    seed(repo, [["T1", "src/a.ts", "add the plan index"], ["T2", "src/b.ts"]]);
    write(repo.dir, "src/a.ts", "work\n");
    run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    const before = readPlan(repo);
    write(repo.dir, "src/a.ts", "repair\n");
    write(repo.dir, "src/UNRELATED.ts", "not part of the fix\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "2", "src/a.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^committed: [0-9a-f]{7,}\nprogress: unchanged\n$/);
    assert.equal(readPlan(repo), before);
    assert.deepEqual(committedFiles(repo), ["src/a.ts"]);
    assert.equal(subjects(repo)[0], "T1(2) - add the plan index");
    assert.match(result.stderr, /left outside the commit \(not in the fix's file list\)/);
    assert.match(result.stderr, /src\/UNRELATED\.ts/);
  });
});

test("a fix refuses a .temp path instead of writing machine state into the history", () => {
  // The whole point of the explicit list: a run's own review and test reports
  // live under .temp/viber/ and must never reach a commit.
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "repair\n");
    write(repo.dir, ".temp/viber/2026-09-20-10-00-00_feat-x/tests-1.md", "one failure\n");

    const result = run(repo.dir, repo.env, [
      PLAN_REL,
      "T1",
      "1",
      "src/a.ts",
      ".temp/viber/2026-09-20-10-00-00_feat-x/tests-1.md",
    ]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), ["src/a.ts"]);
    assert.match(result.stderr, /refused \.temp\/viber/);
  });
});

test("a fix number without a file list exits 2 rather than falling back to the whole tree", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "repair\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "1"]);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /usage: commit-task\.sh <plan-file> <task-id>/);
    assert.deepEqual(subjects(repo), ["seed"]);
  });
});

test("a third argument that is not a fix number exits 2 (a caller passing a hand-written subject is refused, never committed under it)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "repair\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "fix: post-test repair", "src/a.ts"]);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /usage: commit-task\.sh <plan-file> <task-id>/);
    assert.deepEqual(subjects(repo), ["seed"]);
  });
});

test("a task id that is not in the plan exits 3 without touching the plan or the history", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    const before = readPlan(repo);

    const result = run(repo.dir, repo.env, [PLAN_REL, "T9"]);
    assert.equal(result.status, 3);
    assert.match(result.stderr, /no task 'T9' in/);
    assert.equal(readPlan(repo), before);
    assert.deepEqual(subjects(repo), ["seed"]);
  });
});

test("a task whose files produced no change exits 4 without touching the plan", () => {
  withGitRepo((repo) => {
    seed(repo);
    const before = readPlan(repo);

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 4);
    assert.match(result.stderr, /task T1 produced no changes to commit/);
    assert.equal(readPlan(repo), before);
    assert.deepEqual(subjects(repo), ["seed"]);
  });
});

test("a missing argument exits 2 with usage on stderr", () => {
  withGitRepo((repo) => {
    seed(repo);
    const result = run(repo.dir, repo.env, [PLAN_REL]);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /usage: commit-task\.sh <plan-file> <task-id>/);
  });
});

test("a plan path that does not exist exits 2 (never a half-run against a typo'd path)", () => {
  withGitRepo((repo) => {
    seed(repo);
    const result = run(repo.dir, repo.env, ["docs/plans/nope/plan.md", "T1"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /plan file not found/);
    assert.deepEqual(subjects(repo), ["seed"]);
  });
});
