/*
 * commit-task.test.ts - proves viber/scripts/commit-task.sh's contract:
 * `commit-task.sh <plan-file> <task-id>` stages ONLY the paths on that task's
 * `- Files:` line and commits through that same pathspec - a file staged before
 * or beside the run stays in the index instead of riding along - under the
 * task's own heading line
 * (`### T1 - <title>`) as the subject, writes the `<!-- done: ... -->` marker and
 * the `## Tasks (x/N)` header, and prints `committed: <sha>` and `progress: x/N`
 * on stdout. Its stderr warning is scoped by subtracting the WHOLE plan's file
 * map, not the one task's slice: coders run in parallel, so another task's work
 * in progress is always in the tree and a warning naming it would fire on every
 * commit and mean nothing. What survives the subtraction is a change no task
 * accounted for.
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
 * `commit-task.sh --repair <plan-file> <round> <file>...` is that same repair when
 * the failing file belongs to no task at all: a DERIVED subject
 * (`fix(viber): post-test repair (round 2)`) instead of a borrowed heading, so a
 * regression in code the plan never touched is committable without inventing a
 * task id. It shares its staging loop with `--chore`, `--qa` and `--e2e`, whose
 * cases below prove the `.temp/` refusal for all of them.
 *
 * `--chore`, `--qa` and `--e2e` are the three forms for what a run produces beside
 * its task map - the knowledge files a close wrote, that close's QA documents, and
 * the Playwright specs a later e2e pass generated. None takes a task id or a
 * subject: each DERIVES its own, so the plan's progress is never touched and no
 * caller can get a hand-written subject into the history through them. The first
 * two take the plan to record the close in it; `--e2e` runs after the build, when
 * nothing resumes any more, and takes none.
 *
 * What a later session cannot derive from the tree is recorded in the plan beside
 * the done marker, created on demand: `--skip` (the user dropped a task),
 * `--unreviewed` (the user waived the review gate) and the close markers above.
 * Every commit form also carries the run's own trail - the notes and reports
 * under `<run-dir>/work/` - derived from the task id or the round, so a parallel
 * task's notes never ride along and the trail reaches another machine.
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

/** The dated run directory plan-path.sh owns - the plan lives in the repo. */
const PLAN_REL = "docs/_specs/2026-09-20-10-00-00_feat-x/plan.md";

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

test("a changed file no task in the plan claims stays out of the commit and is named on stderr", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, "src/UNRELATED.ts", "not mine\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), [PLAN_REL, "src/a.ts"].sort());
    assert.match(result.stderr, /changed, claimed by no task in the plan/);
    assert.match(result.stderr, /src\/UNRELATED\.ts/);
  });
});

test("another task's work in progress is not named on stderr (coders run in parallel, so a warning scoped to one task's map would fire on every commit)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, "src/b.ts", "T2's coder, still running\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), [PLAN_REL, "src/a.ts"].sort());
    assert.doesNotMatch(result.stderr, /claimed by no task/);
    assert.doesNotMatch(result.stderr, /src\/b\.ts/);
  });
});

test("a wholly untracked directory holding another task's file is not warned about (git collapses it to 'dir/' unless every untracked file is listed)", () => {
  withGitRepo((repo) => {
    seed(repo, [["T1", "src/a.ts"], ["T2", "lib/b.ts"]]);
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, "lib/b.ts", "T2's coder, in a directory git has never seen\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.doesNotMatch(result.stderr, /claimed by no task/);
    assert.doesNotMatch(result.stderr, /lib/);
  });
});

test("a file staged before the run stays staged and out of the task's commit (the orchestrator has no Bash to notice a dirty index)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, "src/PRESTAGED.ts", "staged by the user before the build\n");
    repo.git("add", "--", "src/PRESTAGED.ts");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), [PLAN_REL, "src/a.ts"].sort());
    assert.deepEqual(stagedFiles(repo), ["src/PRESTAGED.ts"]);
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

test("work left staged by a refused commit does not ride along in the next task's commit (the user answered 'skip', not 'retry')", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    breakCommit(repo);
    assert.equal(run(repo.dir, repo.env, [PLAN_REL, "T1"]).status, 5);
    fixCommit(repo);

    write(repo.dir, "src/b.ts", "the task after the skipped one\n");
    const result = run(repo.dir, repo.env, [PLAN_REL, "T2"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), [PLAN_REL, "src/b.ts"].sort());
    assert.deepEqual(stagedFiles(repo), ["src/a.ts"]);
    assert.match(readPlan(repo), /<!-- done: T2 -->/);
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
    assert.match(result.stderr, /changed, claimed by no task in the plan/);
    assert.match(result.stderr, /src\/UNRELATED\.ts/);
  });
});

test("a fix commits only the files it names, even when other work is already staged", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    write(repo.dir, "src/a.ts", "repair\n");
    write(repo.dir, "src/b.ts", "another task's work, staged and not yet committed\n");
    repo.git("add", "--", "src/b.ts");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "2", "src/a.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), ["src/a.ts"]);
    assert.deepEqual(stagedFiles(repo), ["src/b.ts"]);
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
    const result = run(repo.dir, repo.env, ["docs/_specs/nope/plan.md", "T1"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /plan file not found/);
    assert.deepEqual(subjects(repo), ["seed"]);
  });
});

// --- --repair: a post-test fix outside the plan's file map ------------------

test("--repair commits a fix in a file no task's map names, under a derived subject and with the plan untouched", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/legacy.ts", "the regression the suite caught\n");
    const before = readPlan(repo);

    const result = run(repo.dir, repo.env, ["--repair", PLAN_REL, "2", "src/legacy.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^committed: [0-9a-f]{7,}\n/);
    assert.match(result.stdout, /^subject: fix\(viber\): post-test repair \(round 2\)$/m);
    assert.match(result.stdout, /^progress: unchanged$/m);

    assert.equal(subjects(repo)[0], "fix(viber): post-test repair (round 2)");
    assert.deepEqual(committedFiles(repo), ["src/legacy.ts"]);
    assert.match(repo.git("log", "-1", "--format=%b").stdout, /Refs: docs\/_specs\/\S+ post-test fix 2/);
    assert.equal(readPlan(repo), before);
  });
});

test("--repair without a numeric round, without a file, or against a missing plan exits 2 (the fallback never becomes a way to commit anything at all)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/legacy.ts", "the regression the suite caught\n");

    const noRound = run(repo.dir, repo.env, ["--repair", PLAN_REL, "src/legacy.ts"]);
    assert.equal(noRound.status, 2);
    assert.match(noRound.stderr, /usage: commit-task\.sh/);

    const noFiles = run(repo.dir, repo.env, ["--repair", PLAN_REL, "1"]);
    assert.equal(noFiles.status, 2);
    assert.match(noFiles.stderr, /usage: commit-task\.sh/);

    const noPlan = run(repo.dir, repo.env, ["--repair", "docs/_specs/nope/plan.md", "1", "src/legacy.ts"]);
    assert.equal(noPlan.status, 2);
    assert.match(noPlan.stderr, /plan file not found/);

    assert.deepEqual(subjects(repo), ["seed"]);
  });
});

// --- --chore: what the close produced, which no task owns -------------------

test("--chore derives its subject from the paths, so the orchestrator composes no commit subject here either", () => {
  const cases: Array<[files: string[], subject: string]> = [
    [["CLAUDE.md"], "chore(viber): update project memory"],
    [["src/CLAUDE.md"], "chore(viber): update project memory"],
    [[".claude/rules/naming.md"], "chore(viber): update project rules"],
    [["CLAUDE.md", ".claude/rules/naming.md"], "chore(viber): update project memory and rules"],
    [["docs/notes.md"], "chore(viber): update project knowledge"],
  ];

  for (const [files, subject] of cases) {
    withGitRepo((repo) => {
      seed(repo);
      for (const f of files) write(repo.dir, f, "written by the close\n");

      const result = run(repo.dir, repo.env, ["--chore", PLAN_REL, ...files]);
      assert.equal(result.status, 0, `${files.join(",")} -> stderr: ${result.stderr}`);
      assert.match(result.stdout, /^committed: [0-9a-f]{7,}\n/);
      assert.match(result.stdout, new RegExp(`^subject: ${subject.replace(/[()]/g, "\\$&")}$`, "m"));
      assert.equal(subjects(repo)[0], subject);
      assert.deepEqual(committedFiles(repo), [...files, PLAN_REL].sort());
    });
  }
});

test("--chore commits nothing it was not given, and refuses a .temp/ path outright", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "CLAUDE.md", "memory\n");
    write(repo.dir, ".temp/viber/run/T1-coder.md", "the notes memory was written from\n");
    write(repo.dir, "src/a.ts", "a coder left this behind\n");

    const result = run(repo.dir, repo.env, ["--chore", PLAN_REL, "CLAUDE.md", ".temp/viber/run/T1-coder.md"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /refused \.temp\/viber\/run\/T1-coder\.md/);

    // the plan rides along because the close records itself there, nothing else
    assert.deepEqual(committedFiles(repo), ["CLAUDE.md", PLAN_REL].sort());
    // git collapses an untracked directory in --short, so both show as the dir
    const dirty = repo.git("status", "--short").stdout;
    assert.match(dirty, /\?\? \.temp\//);
    assert.match(dirty, /\?\? src\//);
  });
});

test("--chore with nothing changed exits 4, and without a plan or a file exits 2", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "CLAUDE.md", "memory\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "already recorded");

    const unchanged = run(repo.dir, repo.env, ["--chore", PLAN_REL, "CLAUDE.md"]);
    assert.equal(unchanged.status, 4);
    assert.match(unchanged.stderr, /no changes to commit/);

    const noFiles = run(repo.dir, repo.env, ["--chore", PLAN_REL]);
    assert.equal(noFiles.status, 2);
    assert.match(noFiles.stderr, /usage: commit-task\.sh/);

    const noPlan = run(repo.dir, repo.env, ["--chore"]);
    assert.equal(noPlan.status, 2);
    assert.match(noPlan.stderr, /usage: commit-task\.sh/);
  });
});

// --- --qa and --e2e: the QA documents a build's close wrote, and the specs a
// --- later e2e pass generated, neither of which any task's map names ----------

const RUN_DIR = "docs/_specs/2026-09-20-10-00-00_feat-x";

/** --qa records the close in the plan and so takes it; --e2e runs after the
 *  build, when nothing resumes any more, and takes no plan at all. */
function closeArgs(form: string, files: string[]): string[] {
  return form === "--e2e" ? [form, ...files] : [form, PLAN_REL, ...files];
}

test("--qa and --e2e each carry a fixed derived subject, so no caller composes a commit subject here either", () => {
  const cases: Array<[form: string, files: string[], subject: string]> = [
    ["--qa", [`${RUN_DIR}/qa.md`, `${RUN_DIR}/qa.e2e.md`], "docs(viber): qa scenarios"],
    ["--e2e", ["tests/e2e/qa-01-approve-a-timesheet.spec.ts", `${RUN_DIR}/qa.e2e.md`], "test(viber): e2e specs"],
  ];

  for (const [form, files, subject] of cases) {
    withGitRepo((repo) => {
      seed(repo);
      for (const f of files) write(repo.dir, f, "written after the build\n");

      const result = run(repo.dir, repo.env, closeArgs(form, files));
      assert.equal(result.status, 0, `${form} -> stderr: ${result.stderr}`);
      assert.match(result.stdout, /^committed: [0-9a-f]{7,}\n/);
      assert.match(result.stdout, new RegExp(`^subject: ${subject.replace(/[()]/g, "\\$&")}$`, "m"));
      assert.equal(subjects(repo)[0], subject);
      const expected = form === "--e2e" ? [...files] : [...files, PLAN_REL];
      assert.deepEqual(committedFiles(repo), expected.sort());
    });
  }
});

test("--qa and --e2e close out no task, so neither ever touches the progress counter", () => {
  for (const form of ["--qa", "--e2e"]) {
    withGitRepo((repo) => {
      seed(repo);
      const before = readPlan(repo);
      write(repo.dir, `${RUN_DIR}/qa.e2e.md`, "Base: unknown\n");

      const result = run(repo.dir, repo.env, closeArgs(form, [`${RUN_DIR}/qa.e2e.md`]));
      assert.equal(result.status, 0, `${form} -> stderr: ${result.stderr}`);
      assert.doesNotMatch(result.stdout, /progress:/);
      assert.match(readPlan(repo), /<!-- done: - -->/);
      assert.match(readPlan(repo), /^## Tasks \(0\/2\)$/m);
      // --e2e records nothing at all; --qa adds only its closed marker
      if (form === "--e2e") assert.equal(readPlan(repo), before);
      else assert.match(readPlan(repo), /<!-- closed: qa -->/);
    });
  }
});

test("--qa and --e2e commit nothing they were not given, and refuse a .temp/ path outright", () => {
  for (const form of ["--qa", "--e2e"]) {
    withGitRepo((repo) => {
      seed(repo);
      write(repo.dir, `${RUN_DIR}/qa.md`, "the acceptance document\n");
      write(repo.dir, ".temp/viber/e2e/launch.log", "the log the run redirected\n");
      write(repo.dir, "src/a.ts", "a coder left this behind\n");

      const result = run(repo.dir, repo.env, closeArgs(form, [`${RUN_DIR}/qa.md`, ".temp/viber/e2e/launch.log"]));
      assert.equal(result.status, 0, `${form} -> stderr: ${result.stderr}`);
      assert.match(result.stderr, /refused \.temp\/viber\/e2e\/launch\.log/);

      const expected = form === "--e2e" ? [`${RUN_DIR}/qa.md`] : [`${RUN_DIR}/qa.md`, PLAN_REL];
      assert.deepEqual(committedFiles(repo), expected.sort());
      const dirty = repo.git("status", "--short").stdout;
      assert.match(dirty, /\?\? \.temp\//);
      assert.match(dirty, /\?\? src\//);
    });
  }
});

test("--qa and --e2e with nothing changed exit 4, and with no file at all exit 2", () => {
  for (const form of ["--qa", "--e2e"]) {
    withGitRepo((repo) => {
      seed(repo);
      write(repo.dir, `${RUN_DIR}/qa.md`, "already committed\n");
      repo.git("add", "-A");
      repo.git("commit", "-m", "already recorded");

      const unchanged = run(repo.dir, repo.env, closeArgs(form, [`${RUN_DIR}/qa.md`]));
      assert.equal(unchanged.status, 4, `${form} -> stderr: ${unchanged.stderr}`);
      assert.match(unchanged.stderr, /no changes to commit/);

      const noFiles = run(repo.dir, repo.env, closeArgs(form, []));
      assert.equal(noFiles.status, 2);
      assert.match(noFiles.stderr, /usage: commit-task\.sh/);
    });
  }
});

// --- the run's own state: the two decisions and the trail -------------------

test("a task commit carries its own trail and no other task's, so the notes travel with the code they describe", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "the work\n");
    write(repo.dir, `${RUN_DIR}/work/T1-coder.md`, "what the diff does not say\n");
    write(repo.dir, `${RUN_DIR}/work/review-T1-1.md`, "round 1 findings\n");
    write(repo.dir, `${RUN_DIR}/work/T2-coder.md`, "another coder, still working\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(
      committedFiles(repo),
      ["src/a.ts", PLAN_REL, `${RUN_DIR}/work/T1-coder.md`, `${RUN_DIR}/work/review-T1-1.md`].sort(),
    );
    // the run's own directory is not part of any task's map, so it is never
    // reported as an unclaimed change either
    assert.doesNotMatch(result.stderr, /claimed by no task/);
  });
});

test("a post-test fix carries its round's trail, not the task's", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "the work\n");
    run(repo.dir, repo.env, [PLAN_REL, "T1"]);

    write(repo.dir, "src/a.ts", "the repair\n");
    write(repo.dir, `${RUN_DIR}/work/tests-2.md`, "the failing run\n");
    write(repo.dir, `${RUN_DIR}/work/repair-2-coder.md`, "what the repair changed\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "2", "src/a.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(
      committedFiles(repo),
      ["src/a.ts", `${RUN_DIR}/work/tests-2.md`, `${RUN_DIR}/work/repair-2-coder.md`].sort(),
    );
    assert.match(result.stdout, /^progress: unchanged$/m);
  });
});

test("--unreviewed records the waived review gate in the same commit that marks the task done", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "accepted as it stands\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--unreviewed"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^progress: 1\/2$/m);

    const plan = readPlan(repo);
    assert.match(plan, /<!-- done: T1 -->/);
    assert.match(plan, /<!-- unreviewed: T1 -->/);
    // the marker is created on demand, so it rides in that same commit
    assert.deepEqual(committedFiles(repo), ["src/a.ts", PLAN_REL].sort());
    assert.match(repo.git("show", "HEAD:" + PLAN_REL).stdout, /<!-- unreviewed: T1 -->/);
  });
});

test("--skip records a dropped task without a commit, because it has none to ride in", () => {
  withGitRepo((repo) => {
    seed(repo);

    const result = run(repo.dir, repo.env, ["--skip", PLAN_REL, "T2"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^skipped: T2$/m);
    assert.match(result.stdout, /^progress: unchanged$/m);

    const plan = readPlan(repo);
    assert.match(plan, /<!-- skipped: T2 -->/);
    assert.match(plan, /<!-- done: - -->/);
    assert.match(plan, /^## Tasks \(0\/2\)$/m);
    assert.deepEqual(subjects(repo), ["seed"]);
    // it waits in the plan for whichever commit comes next
    assert.deepEqual(stagedFiles(repo), []);
    assert.match(repo.git("status", "--short").stdout, new RegExp(`M {1,2}${PLAN_REL}`));
  });
});

test("--skip twice does not duplicate the id, and an unknown id exits 3 without touching the plan", () => {
  withGitRepo((repo) => {
    seed(repo);
    run(repo.dir, repo.env, ["--skip", PLAN_REL, "T2"]);
    run(repo.dir, repo.env, ["--skip", PLAN_REL, "T2"]);
    assert.match(readPlan(repo), /<!-- skipped: T2 -->/);

    const before = readPlan(repo);
    const unknown = run(repo.dir, repo.env, ["--skip", PLAN_REL, "T9"]);
    assert.equal(unknown.status, 3);
    assert.match(unknown.stderr, /no task 'T9'/);
    assert.equal(readPlan(repo), before);
  });
});

test("--chore and --qa record which half of the close is done, so a resumed run does not repeat it", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "CLAUDE.md", "memory\n");
    write(repo.dir, `${RUN_DIR}/qa.md`, "the acceptance document\n");

    run(repo.dir, repo.env, ["--chore", PLAN_REL, "CLAUDE.md"]);
    assert.match(readPlan(repo), /<!-- closed: memory -->/);

    run(repo.dir, repo.env, ["--qa", PLAN_REL, `${RUN_DIR}/qa.md`]);
    assert.match(readPlan(repo), /<!-- closed: memory qa -->/);
    assert.match(repo.git("log", "--format=%b", "-1").stdout, new RegExp(`Refs: ${PLAN_REL} close`));
  });
});

test("a refused close commit rolls the closed marker back, so the plan never claims a close the history does not show", () => {
  withGitRepo((repo) => {
    seed(repo);
    const before = readPlan(repo);
    write(repo.dir, "CLAUDE.md", "memory\n");
    breakCommit(repo);

    const result = run(repo.dir, repo.env, ["--chore", PLAN_REL, "CLAUDE.md"]);
    assert.equal(result.status, 5);
    assert.match(result.stderr, /plan rolled back, the close is NOT recorded/);
    assert.equal(readPlan(repo), before);
    assert.deepEqual(subjects(repo), ["seed"]);
    assert.deepEqual(planDirEntries(repo), ["plan.md"]);

    fixCommit(repo);
  });
});
