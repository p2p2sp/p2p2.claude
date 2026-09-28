/*
 * commit-task.test.ts - proves viber/scripts/commit-task.sh's contract:
 * `commit-task.sh <plan-file> <task-id>` stages ONLY the paths on that task's
 * `- Files:` line and commits through that same pathspec - a file staged before
 * or beside the run stays in the index instead of riding along - under the
 * task's own heading line
 * (`### T1 - <title>`) as the subject, writes the `done:` and `progress:` lines
 * of the run's `status.md` - never the plan, which is frozen the moment it lands
 * - and prints `committed: <sha>` and `progress: x/N`
 * on stdout. Its stderr warning is scoped by subtracting the WHOLE plan's file
 * map, not the one task's slice: coders run in parallel, so another task's work
 * in progress is always in the tree and a warning naming it would fire on every
 * commit and mean nothing. What survives the subtraction is a change no task
 * accounted for.
 *
 * The entry and the commit are ATOMIC: the entry is written first so it rides
 * IN the commit, and any failure from there on (a refused `git commit`, a plan
 * outside the repository) restores `status.md` from its backup - or removes it
 * again when that call is what created it - and exits 5 with
 * nothing committed and nothing recorded. A status claiming a task is done that was
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
 * What a later session cannot derive from the tree is recorded in `status.md`
 * beside the done entry: `--skip` (the user dropped a task),
 * `--unreviewed` (the user waived the review gate), `--defer` (this task left a
 * path for a later one to prove, `<task-id>:<path>`) and the close entries above.
 * Every commit form also carries the run's own trail - the notes and reports
 * under `<run-dir>/work/` - derived from the task id or the round, so a parallel
 * task's notes never ride along and the trail reaches another machine.
 *
 * A named path is staged in whatever state it arrives - already staged, already
 * removed with `git rm`, tracked under a directory an ignore rule covers - so
 * it never drops out of the pathspec and stays staged, uncommitted.
 * `--landed <sha>` records a task whose work another commit already carried: a
 * status-only commit under a derived subject, refused unless the sha is in
 * HEAD's history, touches the task's files, and those files are clean.
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

/** The dated run directory plan-path.sh owns - the plan lives in the repo, and
 *  the run's state lives beside it in status.md, which plan-index.sh --split
 *  writes with the decomposition. */
const RUN_DIR = "docs/_specs/2026-09-20-10-00-00_feat-x";
const PLAN_REL = `${RUN_DIR}/plan.md`;
const STATUS_REL = `${RUN_DIR}/status.md`;

function write(root: string, rel: string, content: string): void {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** A plan in the template's shape: the `## Tasks` header and one `<!-- TASK -->`
 *  block per task, whose `- Files:` line is the machine-readable map the script
 *  stages literally and whose `### T<n> - <title>` heading is the commit subject
 *  it reads. It carries no progress of its own: a landed plan is never written
 *  to again. */
function planBody(tasks: Array<[id: string, files: string, title?: string]>): string {
  return [
    "# Plan - feat x",
    "",
    "## Tasks",
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

/** The state file as --split leaves it: every key present, nothing done. */
function statusBody(total: number): string {
  return `# status\n\nprogress: 0/${total}\ndone: none\nskipped: none\nunreviewed: none\ndeferred: none\nclosed: none\n`;
}

const TWO_TASKS: Array<[string, string, string?]> = [
  ["T1", "src/a.ts"],
  ["T2", "src/b.ts"],
];

/** Commits the plan, its state file and a README so the only pending change a
 *  test sees is the one the test makes. */
function seed(repo: GitRepo, tasks: Array<[string, string, string?]> = TWO_TASKS): void {
  write(repo.dir, PLAN_REL, planBody(tasks));
  write(repo.dir, STATUS_REL, statusBody(tasks.length));
  write(repo.dir, "README.md", "seed\n");
  repo.git("add", "-A");
  repo.git("commit", "-m", "seed");
}

/** Commits a hand-written plan body verbatim, for a case `planBody`'s task
 *  shape cannot express (a Contracts appendix, prose mentioning the marker). */
function seedRaw(repo: GitRepo, planText: string, total: number): void {
  write(repo.dir, PLAN_REL, planText);
  write(repo.dir, STATUS_REL, statusBody(total));
  write(repo.dir, "README.md", "seed\n");
  repo.git("add", "-A");
  repo.git("commit", "-m", "seed");
}

/** Two real tasks plus a `## Contracts` appendix whose own heading is shaped
 *  exactly like a task's (`### C3 - <name>`) - the case `--skip`/`--defer`
 *  must not confuse with a task id. */
const CONTRACTS_PLAN = [
  "# Plan - feat x",
  "",
  "## Tasks",
  "",
  "<!-- TASK -->",
  "### T1 - task T1",
  "- Files: src/a.ts",
  "<!-- /TASK -->",
  "",
  "<!-- TASK -->",
  "### T2 - task T2",
  "- Files: src/b.ts",
  "<!-- /TASK -->",
  "",
  "## Contracts",
  "",
  "### C3 - TASK marker line",
  "",
  "File: none",
  "",
].join("\n");

function readPlan(repo: GitRepo): string {
  return fs.readFileSync(path.join(repo.dir, PLAN_REL), "utf-8");
}

function readStatus(repo: GitRepo): string {
  return fs.readFileSync(path.join(repo.dir, STATUS_REL), "utf-8");
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

test("a task commits only its own Files: paths, with the done entry and the counter riding in that same commit", () => {
  withGitRepo((repo) => {
    seed(repo);
    const planBefore = readPlan(repo);
    write(repo.dir, "src/a.ts", "work\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^committed: [0-9a-f]{7,}\nprogress: 1\/2\n$/);

    assert.match(readStatus(repo), /^done: T1$/m);
    assert.match(readStatus(repo), /^progress: 1\/2$/m);
    // the plan defines the work and is never edited to record how it is going
    assert.equal(readPlan(repo), planBefore);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());

    // Read back out of history, not out of the working tree: a resume after a
    // context reset must find the entry in the commit itself.
    const fromHistory = repo.git("show", `HEAD:${STATUS_REL}`).stdout;
    assert.match(fromHistory, /^done: T1$/m);
    assert.match(fromHistory, /^progress: 1\/2$/m);
  });
});

test("a Files path made of bracketed segments is staged literally - the App Router route lands, the sibling its character class covers does not", () => {
  withGitRepo((repo) => {
    // Every Next.js App Router route carries brackets in its own name. Git reads
    // "[id]" in a pathspec as a wildmatch character class, so without
    // GIT_LITERAL_PATHSPECS the neighbouring "src/app/i/page.tsx" - one char out
    // of {i,d} - is a candidate for the same commit.
    const route = "src/app/[id]/page.tsx";
    seed(repo, [["T1", route]]);
    write(repo.dir, route, "work\n");
    write(repo.dir, "src/app/i/page.tsx", "someone else\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^committed: [0-9a-f]{7,}\nprogress: 1\/1\n$/);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, route].sort());
    assert.match(result.stderr, /src\/app\/i\/page\.tsx/);
  });
});

test("a bracketed Files path its own coder never wrote commits nothing - it does not fall back to the sibling its character class covers", () => {
  withGitRepo((repo) => {
    // The case the literal pathspec is FOR: git only prefers an exact match when
    // the exact path is there. With T1's file still unwritten, "src/app/[id]/..."
    // read as a pattern matches a parallel coder's "src/app/i/..." instead, and
    // that work would land under T1's subject with T1 marked done.
    seed(repo, [["T1", "src/app/[id]/page.tsx"]]);
    write(repo.dir, "src/app/i/page.tsx", "another coder, mid-task\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 4, `stdout: ${result.stdout} stderr: ${result.stderr}`);
    assert.deepEqual(subjects(repo), ["seed"]);
    assert.deepEqual(stagedFiles(repo), []);
    assert.match(readStatus(repo), /^done: none$/m);
  });
});

test("a run whose status file is missing gets one created inside the task's own commit (a build that never split still commits)", () => {
  withGitRepo((repo) => {
    seed(repo);
    fs.rmSync(path.join(repo.dir, STATUS_REL));
    repo.git("add", "-A");
    repo.git("commit", "-m", "no status file");
    write(repo.dir, "src/a.ts", "work\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /progress: 1\/2\n$/);
    assert.match(readStatus(repo), /^done: T1$/m);
    assert.match(readStatus(repo), /^skipped: none$/m);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());
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
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());
    assert.match(result.stderr, /changed, claimed by no task in the plan/);
    assert.match(result.stderr, /src\/UNRELATED\.ts/);
  });
});

test("--with adds a path no task claims to the task's own commit, so the commit that lands a task is the whole task", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    // the file the task's own work forced: the plan gave it no owner
    write(repo.dir, "src/wiring.ts", "register\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--with", "src/wiring.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts", "src/wiring.ts"].sort());
    assert.doesNotMatch(result.stderr, /claimed by no task in the plan/);
  });
});

test("--with refuses a path another task's Files claims and commits the rest (that task may have a coder writing the file right now)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, "src/b.ts", "another task's file\n");
    write(repo.dir, "src/wiring.ts", "register\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--with", "src/b.ts", "src/wiring.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /refused src\/b\.ts - claimed by task T2/);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts", "src/wiring.ts"].sort());
  });
});

test("--with takes a path claimed by a task already done and names that task on stderr (no later commit would ever stage the file)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, STATUS_REL, statusBody(2).replace("done: none", "done: T2").replace("progress: 0/2", "progress: 1/2"));
    repo.git("add", "-A");
    repo.git("commit", "-m", "T2 done");
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, "src/b.ts", "a defect T1's tests exposed\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--with", "src/b.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /took src\/b\.ts - claimed by committed task T2/);
    assert.doesNotMatch(result.stderr, /refused/);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts", "src/b.ts"].sort());
    assert.match(readStatus(repo), /^done: T2 T1$/m);
  });
});

test("--with still refuses a path whose owner was skipped (its half-finished files stay uncommitted and visible)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, STATUS_REL, statusBody(2).replace("skipped: none", "skipped: T2"));
    repo.git("add", "-A");
    repo.git("commit", "-m", "T2 skipped");
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, "src/b.ts", "half-finished\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--with", "src/b.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /refused src\/b\.ts - claimed by task T2/);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());
  });
});

test("--with a path the task already claims commits it once, not twice", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--with", "src/a.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());
  });
});

test("--with a .temp path is refused, like any other form (machine state never reaches the history)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, ".temp/viber/T1/build.log", "noise\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--with", ".temp/viber/T1/build.log"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /refused \.temp\/viber\/T1\/build\.log/);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());
  });
});

test("--with combines with --unreviewed in either order, and --with alone with no path exits 2", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, "src/wiring.ts", "register\n");

    assert.equal(run(repo.dir, repo.env, [PLAN_REL, "T1", "--with"]).status, 2);
    assert.equal(run(repo.dir, repo.env, [PLAN_REL, "T1", "--with", "--unreviewed"]).status, 2);

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--unreviewed", "--with", "src/wiring.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(readStatus(repo), /^unreviewed: T1$/m);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts", "src/wiring.ts"].sort());
  });
});

test("--defer records who owes a path its test, and that entry rides in the task's own commit", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--defer", "T2:src/a.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(readStatus(repo), /^deferred: T2:src\/a\.ts$/m);

    // read back out of history: a resumed session in another context still
    // knows which task owes the proof
    const fromHistory = repo.git("show", `HEAD:${STATUS_REL}`).stdout;
    assert.match(fromHistory, /^deferred: T2:src\/a\.ts$/m);
    // the path is already in the task's own map - --defer stages nothing
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());
  });
});

test("--defer normalizes a leading './' on the path half of an entry, like every other path argument", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--defer", "T2:./src/a.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(readStatus(repo), /^deferred: T2:src\/a\.ts$/m);
  });
});

test("--defer takes several entries and appends each one once, so a repeated deferral does not pile up", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");

    assert.equal(
      run(repo.dir, repo.env, [PLAN_REL, "T1", "--defer", "T2:src/a.ts", "T2:src/wiring.ts"]).status,
      0,
    );
    assert.match(readStatus(repo), /^deferred: T2:src\/a\.ts T2:src\/wiring\.ts$/m);

    // the same entry on the next commit is a no-op, like every other key
    write(repo.dir, "src/b.ts", "work\n");
    assert.equal(run(repo.dir, repo.env, [PLAN_REL, "T2", "--defer", "T2:src/a.ts"]).status, 0);
    assert.match(readStatus(repo), /^deferred: T2:src\/a\.ts T2:src\/wiring\.ts$/m);
  });
});

test("--defer refuses an entry no task in the plan owns and commits anyway (untested code with no owner is unfinished, not deferred)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");

    const result = run(repo.dir, repo.env, [
      PLAN_REL,
      "T1",
      "--defer",
      "T9:src/a.ts",
      "src/a.ts",
      "T2:src/a.ts",
    ]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /refused T9:src\/a\.ts - no task T9 in the plan/);
    assert.match(result.stderr, /refused src\/a\.ts - a --defer entry is <task-id>:<path>/);
    assert.match(readStatus(repo), /^deferred: T2:src\/a\.ts$/m);
    assert.match(readStatus(repo), /^done: T1$/m);

    // and it is a flag like the others: no entry at all is a usage error
    assert.equal(run(repo.dir, repo.env, [PLAN_REL, "T2", "--defer"]).status, 2);
    assert.equal(run(repo.dir, repo.env, [PLAN_REL, "T2", "--defer", "--unreviewed"]).status, 2);
  });
});

test("a refused git commit rolls the deferred entry back with the done entry - neither outlives a commit that did not happen", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    const before = readStatus(repo);
    breakCommit(repo);

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--defer", "T2:src/a.ts"]);
    assert.equal(result.status, 5);
    assert.equal(readStatus(repo), before);
    assert.deepEqual(subjects(repo), ["seed"]);
  });
});

test("another task's work in progress is not named on stderr (coders run in parallel, so a warning scoped to one task's map would fire on every commit)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, "src/b.ts", "T2's coder, still running\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());
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
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());
    assert.deepEqual(stagedFiles(repo), ["src/PRESTAGED.ts"]);
  });
});

test("a refused git commit leaves status.md byte-for-byte unchanged and exits 5 (a task marked done but never committed is skipped forever on resume)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    const before = readStatus(repo);
    breakCommit(repo);

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 5);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /status rolled back, task T1 is NOT marked done/);

    assert.equal(readStatus(repo), before);
    assert.deepEqual(subjects(repo), ["seed"]);
  });
});

test("a refused git commit leaves no backup or temp file in the run directory", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    breakCommit(repo);

    run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.deepEqual(planDirEntries(repo), ["plan.md", "status.md"]);
  });
});

test("a refused commit on a run with no status file leaves none behind (the call is what created it)", () => {
  withGitRepo((repo) => {
    seed(repo);
    fs.rmSync(path.join(repo.dir, STATUS_REL));
    repo.git("add", "-A");
    repo.git("commit", "-m", "no status file");
    write(repo.dir, "src/a.ts", "work\n");
    breakCommit(repo);

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 5);
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
    assert.match(readStatus(repo), /^done: T1$/m);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());
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
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/b.ts"].sort());
    assert.deepEqual(stagedFiles(repo), ["src/a.ts"]);
    assert.match(readStatus(repo), /^done: T2$/m);
  });
});

test("a plan outside the repository fails while staging and leaves no state file behind", () => {
  // The plan mode hand-over case: plan mode can name a file outside the project,
  // where `git add` is fatal - the entry must not survive that either, and the
  // status file this call created must be gone with it.
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

test("the second task advances the counter to 2/2 and appends to the done entry", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    write(repo.dir, "src/b.ts", "more\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T2"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /progress: 2\/2\n$/);
    assert.match(readStatus(repo), /^done: T1 T2$/m);
    assert.match(readStatus(repo), /^progress: 2\/2$/m);
  });
});

test("committing the same task id twice does not duplicate it in the done entry or double the counter", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    write(repo.dir, "src/a.ts", "more work\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /progress: 1\/2\n$/);
    assert.match(readStatus(repo), /^done: T1$/m);
    assert.match(readStatus(repo), /^progress: 1\/2$/m);
  });
});

test("a fix number commits a repair of that task under 'T<n>(<round>) - <title>', naming the task it repairs and leaving the plan's progress alone", () => {
  withGitRepo((repo) => {
    seed(repo, [["T1", "src/a.ts", "add the plan index"], ["T2", "src/b.ts"]]);
    write(repo.dir, "src/a.ts", "work\n");
    run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    const before = readStatus(repo);
    write(repo.dir, "src/a.ts", "repair\n");
    write(repo.dir, "src/UNRELATED.ts", "not part of the fix\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "2", "src/a.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^committed: [0-9a-f]{7,}\nprogress: unchanged\n$/);
    assert.equal(readStatus(repo), before);
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

test("a task id that is not in the plan exits 3 without touching the run's state or the history", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    const before = readStatus(repo);

    const result = run(repo.dir, repo.env, [PLAN_REL, "T9"]);
    assert.equal(result.status, 3);
    assert.match(result.stderr, /no task 'T9' in/);
    assert.equal(readStatus(repo), before);
    assert.deepEqual(subjects(repo), ["seed"]);
  });
});

test("a task whose files produced no change exits 4 without touching the run's state", () => {
  withGitRepo((repo) => {
    seed(repo);
    const before = readStatus(repo);

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 4);
    assert.match(result.stderr, /task T1 produced no changes to commit/);
    assert.equal(readStatus(repo), before);
    assert.deepEqual(subjects(repo), ["seed"]);
  });
});

test("a Files path its coder already removed with git rm rides in the task's commit, and another staged path stays staged (a path gone from index and tree fails 'git add')", () => {
  withGitRepo((repo) => {
    seed(repo, [["T1", "src/a.ts, src/gone.ts"], ["T2", "src/b.ts"]]);
    write(repo.dir, "src/gone.ts", "old\n");
    write(repo.dir, "src/other.ts", "old\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "base");
    repo.git("rm", "-q", "src/gone.ts");
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, "src/other.ts", "new\n");
    repo.git("add", "src/other.ts");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.doesNotMatch(result.stderr, /could not stage/);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts", "src/gone.ts"].sort());
    assert.deepEqual(stagedFiles(repo), ["src/other.ts"]);
  });
});

test("a tracked file under a directory its .gitignore ignores is committed, staged or not (git add exits 1 on the ignored parent yet stages the file)", () => {
  withGitRepo((repo) => {
    seed(repo, [["T1", "skills/k-x/refs/a.md, skills/k-x/refs/b.md, skills/k-x/refs/c.md"], ["T2", "src/b.ts"]]);
    write(repo.dir, "skills/.gitignore", "*\n!.gitignore\n!k-*/\n");
    for (const f of ["a", "b", "c"]) write(repo.dir, `skills/k-x/refs/${f}.md`, "old\n");
    repo.git("add", "-f", "skills");
    repo.git("commit", "-m", "base");
    write(repo.dir, "skills/k-x/refs/a.md", "new\n");
    write(repo.dir, "skills/k-x/refs/b.md", "new\n");
    repo.git("add", "skills/k-x/refs/b.md");
    repo.git("rm", "-q", "skills/k-x/refs/c.md");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.doesNotMatch(result.stderr, /could not stage/);
    assert.deepEqual(
      committedFiles(repo),
      [STATUS_REL, "skills/k-x/refs/a.md", "skills/k-x/refs/b.md", "skills/k-x/refs/c.md"].sort(),
    );
    assert.deepEqual(stagedFiles(repo), []);
  });
});

test("an untracked file an ignore rule covers is still refused with a warning (a Files entry never force-adds what the repo ignores)", () => {
  withGitRepo((repo) => {
    seed(repo, [["T1", "src/a.ts, build/out.js"], ["T2", "src/b.ts"]]);
    write(repo.dir, ".gitignore", "build/\n");
    repo.git("add", ".gitignore");
    repo.git("commit", "-m", "ignore");
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, "build/out.js", "gen\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /could not stage build\/out\.js/);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());
  });
});

test("--repair stages a path already removed with git rm (the flag forms share the same staging)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "lib/x.ts", "old\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "base");
    repo.git("rm", "-q", "lib/x.ts");

    const result = run(repo.dir, repo.env, ["--repair", PLAN_REL, "1", "lib/x.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), ["lib/x.ts"]);
  });
});

test("the exit 4 of a task commit names --landed, so the orchestrator knows how to record work another commit already carried", () => {
  withGitRepo((repo) => {
    seed(repo);
    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 4);
    assert.match(result.stderr, /--landed <sha>/);
  });
});

test("--landed marks a task done whose work another commit already carried, in a status-only commit under a derived subject", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    repo.git("add", "src/a.ts");
    repo.git("commit", "-m", "landed elsewhere");
    const sha = repo.git("rev-parse", "HEAD").stdout.trim();

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--landed", sha.slice(0, 7)]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^committed: [0-9a-f]{7,}\nsubject: chore\(viber\): record T1 done, landed in [0-9a-f]{7,}\nprogress: 1\/2\n$/);
    assert.deepEqual(committedFiles(repo), [STATUS_REL]);
    assert.match(readStatus(repo), /^done: T1$/m);
    assert.match(repo.git("log", "-1", "--format=%b").stdout, new RegExp(`Refs: ${PLAN_REL} task T1 landed ${sha}`));
  });
});

test("--landed refuses a commit that touches none of the task's files, and one that is not in HEAD's history, without recording anything", () => {
  withGitRepo((repo) => {
    seed(repo);
    const seedSha = repo.git("rev-parse", "HEAD").stdout.trim();
    const before = readStatus(repo);

    const wrong = run(repo.dir, repo.env, [PLAN_REL, "T1", "--landed", seedSha]);
    assert.equal(wrong.status, 4);
    assert.match(wrong.stderr, /touches none of task T1's files/);

    const unknown = run(repo.dir, repo.env, [PLAN_REL, "T1", "--landed", "deadbeef"]);
    assert.equal(unknown.status, 2);
    assert.match(unknown.stderr, /not a commit in HEAD's history/);

    assert.equal(readStatus(repo), before);
    assert.deepEqual(subjects(repo), ["seed"]);
  });
});

test("--landed refuses while the task's files still carry uncommitted changes (they belong in a normal task commit)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    repo.git("add", "src/a.ts");
    repo.git("commit", "-m", "landed elsewhere");
    const sha = repo.git("rev-parse", "HEAD").stdout.trim();
    write(repo.dir, "src/a.ts", "more\n");
    const before = readStatus(repo);

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--landed", sha]);
    assert.equal(result.status, 4);
    assert.match(result.stderr, /still has uncommitted changes/);
    assert.equal(readStatus(repo), before);
  });
});

test("--landed marks a task done through a --no-ff merge commit that brought its files in on the first parent's diff", () => {
  withGitRepo((repo) => {
    seed(repo);
    repo.git("checkout", "-b", "feature");
    write(repo.dir, "src/a.ts", "work\n");
    repo.git("add", "src/a.ts");
    repo.git("commit", "-m", "add a.ts on feature");
    repo.git("checkout", "main");
    repo.git("merge", "--no-ff", "feature", "-m", "merge feature");
    const sha = repo.git("rev-parse", "HEAD").stdout.trim();

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--landed", sha.slice(0, 7)]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(
      result.stdout,
      /^committed: [0-9a-f]{7,}\nsubject: chore\(viber\): record T1 done, landed in [0-9a-f]{7,}\nprogress: 1\/2\n$/,
    );
    assert.deepEqual(committedFiles(repo), [STATUS_REL]);
    assert.match(readStatus(repo), /^done: T1$/m);
  });
});

test("--landed refuses a --no-ff merge commit that brought in only files no task's map claims, even though the merge itself changed the tree", () => {
  withGitRepo((repo) => {
    seed(repo);
    repo.git("checkout", "-b", "feature");
    write(repo.dir, "src/UNRELATED.ts", "not part of any task\n");
    repo.git("add", "src/UNRELATED.ts");
    repo.git("commit", "-m", "add unrelated file on feature");
    repo.git("checkout", "main");
    repo.git("merge", "--no-ff", "feature", "-m", "merge unrelated");
    const sha = repo.git("rev-parse", "HEAD").stdout.trim();
    const before = readStatus(repo);

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--landed", sha]);
    assert.equal(result.status, 4);
    assert.match(result.stderr, /touches none of task T1's files/);
    assert.equal(readStatus(repo), before);
    // no new commit was made recording the task done - the three from the
    // fixture merge are all there is, in whatever order equal pinned commit
    // dates leave them
    assert.deepEqual(subjects(repo).sort(), ["add unrelated file on feature", "merge unrelated", "seed"]);
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
    const before = readStatus(repo);

    const result = run(repo.dir, repo.env, ["--repair", PLAN_REL, "2", "src/legacy.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^committed: [0-9a-f]{7,}\n/);
    assert.match(result.stdout, /^subject: fix\(viber\): post-test repair \(round 2\)$/m);
    assert.match(result.stdout, /^progress: unchanged$/m);

    assert.equal(subjects(repo)[0], "fix(viber): post-test repair (round 2)");
    assert.deepEqual(committedFiles(repo), ["src/legacy.ts"]);
    assert.match(repo.git("log", "-1", "--format=%b").stdout, /Refs: docs\/_specs\/\S+ post-test fix 2/);
    assert.equal(readStatus(repo), before);
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
      assert.deepEqual(committedFiles(repo), [...files, STATUS_REL].sort());
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

    // status.md rides along because the close records itself there, nothing else
    assert.deepEqual(committedFiles(repo), ["CLAUDE.md", STATUS_REL].sort());
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

/** --qa records the close in the run's status and so takes the plan; --e2e runs after the
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
      const expected = form === "--e2e" ? [...files] : [...files, STATUS_REL];
      assert.deepEqual(committedFiles(repo), expected.sort());
    });
  }
});

test("--qa and --e2e close out no task, so neither ever touches the progress counter", () => {
  for (const form of ["--qa", "--e2e"]) {
    withGitRepo((repo) => {
      seed(repo);
      const before = readStatus(repo);
      write(repo.dir, `${RUN_DIR}/qa.e2e.md`, "Base: unknown\n");

      const result = run(repo.dir, repo.env, closeArgs(form, [`${RUN_DIR}/qa.e2e.md`]));
      assert.equal(result.status, 0, `${form} -> stderr: ${result.stderr}`);
      assert.doesNotMatch(result.stdout, /progress:/);
      assert.match(readStatus(repo), /^done: none$/m);
      assert.match(readStatus(repo), /^progress: 0\/2$/m);
      // --e2e records nothing at all; --qa adds only its closed entry
      if (form === "--e2e") assert.equal(readStatus(repo), before);
      else assert.match(readStatus(repo), /^closed: qa$/m);
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

      const expected = form === "--e2e" ? [`${RUN_DIR}/qa.md`] : [`${RUN_DIR}/qa.md`, STATUS_REL];
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

// --- --review: the one commit that lands the final review's fix -------------

test("--review commits the named files under 'fix(viber): final review', with a Refs footer naming the plan, and records final-review on status.md's closed line", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "the final review's fix\n");

    const result = run(repo.dir, repo.env, ["--review", PLAN_REL, "src/a.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^committed: [0-9a-f]{7,}\nsubject: fix\(viber\): final review\n$/);
    assert.equal(subjects(repo)[0], "fix(viber): final review");
    assert.match(repo.git("log", "-1", "--format=%b").stdout, new RegExp(`Refs: ${PLAN_REL} final review`));
    assert.deepEqual(committedFiles(repo), ["src/a.ts", STATUS_REL].sort());
    assert.match(readStatus(repo), /^closed: final-review$/m);
  });
});

test("--review carries every 'work/final-review-*.md' report (slice reviews and rechecks) and every 'work/final-fix-coder-*.md' fix-round notes file present in the run directory, and no other task's own trail", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "the fix\n");
    write(repo.dir, `${RUN_DIR}/work/final-review-1.md`, "reviewer A's findings\n");
    write(repo.dir, `${RUN_DIR}/work/final-review-2.md`, "reviewer B's findings\n");
    write(repo.dir, `${RUN_DIR}/work/final-review-recheck-1.md`, "recheck of fix round 1\n");
    write(repo.dir, `${RUN_DIR}/work/final-fix-coder-1.md`, "what fix round 1 changed\n");
    write(repo.dir, `${RUN_DIR}/work/final-fix-coder-2.md`, "what fix round 2 changed\n");
    write(repo.dir, `${RUN_DIR}/work/T1-coder.md`, "an ordinary task's own notes, not this trail\n");

    const result = run(repo.dir, repo.env, ["--review", PLAN_REL, "src/a.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(
      committedFiles(repo),
      [
        "src/a.ts",
        STATUS_REL,
        `${RUN_DIR}/work/final-review-1.md`,
        `${RUN_DIR}/work/final-review-2.md`,
        `${RUN_DIR}/work/final-review-recheck-1.md`,
        `${RUN_DIR}/work/final-fix-coder-1.md`,
        `${RUN_DIR}/work/final-fix-coder-2.md`,
      ].sort(),
    );
  });
});

test("--review with named files producing no change exits 4, nothing committed and status.md unchanged", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "already committed\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "already recorded");
    const before = readStatus(repo);

    const result = run(repo.dir, repo.env, ["--review", PLAN_REL, "src/a.ts"]);
    assert.equal(result.status, 4, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /no changes to commit/);
    assert.equal(readStatus(repo), before);
    assert.deepEqual(subjects(repo), ["already recorded", "seed"]);
  });
});

test("--review against a missing plan exits 2, and calling it with no file at all names --review in the usage error", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");

    const noPlan = run(repo.dir, repo.env, ["--review", "docs/_specs/nope/plan.md", "src/a.ts"]);
    assert.equal(noPlan.status, 2);
    assert.match(noPlan.stderr, /plan file not found/);

    const noFiles = run(repo.dir, repo.env, ["--review", PLAN_REL]);
    assert.equal(noFiles.status, 2);
    assert.match(noFiles.stderr, /--review <plan-file> <file> \[<file>\.\.\.\]/);
  });
});

test("--review leaves the progress counter unchanged", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    write(repo.dir, "src/b.ts", "the final review's fix\n");

    const result = run(repo.dir, repo.env, ["--review", PLAN_REL, "src/b.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(readStatus(repo), /^progress: 1\/2$/m);
    assert.doesNotMatch(result.stdout, /progress:/);
  });
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
      ["src/a.ts", STATUS_REL, `${RUN_DIR}/work/T1-coder.md`, `${RUN_DIR}/work/review-T1-1.md`].sort(),
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

    const status = readStatus(repo);
    assert.match(status, /^done: T1$/m);
    assert.match(status, /^unreviewed: T1$/m);
    // the entry is written before the commit, so it rides in that same one
    assert.deepEqual(committedFiles(repo), ["src/a.ts", STATUS_REL].sort());
    assert.match(repo.git("show", "HEAD:" + STATUS_REL).stdout, /^unreviewed: T1$/m);
  });
});

test("--skip records a dropped task without a commit, because it has none to ride in", () => {
  withGitRepo((repo) => {
    seed(repo);

    const result = run(repo.dir, repo.env, ["--skip", PLAN_REL, "T2"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^skipped: T2$/m);
    assert.match(result.stdout, /^progress: unchanged$/m);

    const status = readStatus(repo);
    assert.match(status, /^skipped: T2$/m);
    assert.match(status, /^done: none$/m);
    assert.match(status, /^progress: 0\/2$/m);
    assert.deepEqual(subjects(repo), ["seed"]);
    // it waits in status.md for whichever commit comes next
    assert.deepEqual(stagedFiles(repo), []);
    assert.match(repo.git("status", "--short").stdout, new RegExp(`M {1,2}${STATUS_REL}`));
  });
});

test("--skip twice does not duplicate the id, and an unknown id exits 3 without touching the state", () => {
  withGitRepo((repo) => {
    seed(repo);
    run(repo.dir, repo.env, ["--skip", PLAN_REL, "T2"]);
    run(repo.dir, repo.env, ["--skip", PLAN_REL, "T2"]);
    assert.match(readStatus(repo), /^skipped: T2$/m);

    const before = readStatus(repo);
    const unknown = run(repo.dir, repo.env, ["--skip", PLAN_REL, "T9"]);
    assert.equal(unknown.status, 3);
    assert.match(unknown.stderr, /no task 'T9'/);
    assert.equal(readStatus(repo), before);
  });
});

test("--skip with a contract id exits 3 (a Contracts heading is shaped like a task's, but it is not one)", () => {
  withGitRepo((repo) => {
    seedRaw(repo, CONTRACTS_PLAN, 2);

    const result = run(repo.dir, repo.env, ["--skip", PLAN_REL, "C3"]);
    assert.equal(result.status, 3);
    assert.match(result.stderr, /no task 'C3' in/);
  });
});

test("--skip with a regex metacharacter in the id exits 3 instead of matching a task heading as a pattern (the id is compared as a fixed string)", () => {
  // "T." would match task heading "### T1 - ..." as a regex (any char after
  // "T"), so this exiting 3 proves the id is compared literally. No bare "*"
  // here: on Git-Bash the MSYS runtime expands it against the cwd before argv
  // ever reaches the script (see plan-path.test.ts).
  withGitRepo((repo) => {
    seed(repo);

    const result = run(repo.dir, repo.env, ["--skip", PLAN_REL, "T."]);
    assert.equal(result.status, 3);
    assert.match(result.stderr, /no task 'T\.' in/);
  });
});

test("--skip with a task already committed as done exits 2, naming it as already done", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    const before = readStatus(repo);

    const result = run(repo.dir, repo.env, ["--skip", PLAN_REL, "T1"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /task 'T1' is already done - it cannot be skipped/);
    assert.equal(readStatus(repo), before);
  });
});

test("--decide appends one decision line to status.md and prints its two lines without a commit (it has none to ride in)", () => {
  withGitRepo((repo) => {
    seed(repo);
    const before = readStatus(repo);

    const result = run(repo.dir, repo.env, ["--decide", PLAN_REL, "T2", "keep the old parser"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "decided: T2\nprogress: unchanged\n");
    assert.equal(readStatus(repo), `${before}decision: T2: keep the old parser\n`);
    assert.deepEqual(subjects(repo), ["seed"]);
    assert.deepEqual(stagedFiles(repo), []);
  });
});

test("a decision line rides in the next task commit", () => {
  withGitRepo((repo) => {
    seed(repo);
    run(repo.dir, repo.env, ["--decide", PLAN_REL, "T2", "keep the old parser"]);
    write(repo.dir, "src/a.ts", "work\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(repo.git("show", `HEAD:${STATUS_REL}`).stdout, /^decision: T2: keep the old parser$/m);
  });
});

test("a refused task commit rolls status.md back with its decision lines intact", () => {
  withGitRepo((repo) => {
    seed(repo);
    run(repo.dir, repo.env, ["--decide", PLAN_REL, "T2", "keep the old parser"]);
    write(repo.dir, "src/a.ts", "work\n");
    breakCommit(repo);

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 5);
    assert.equal(readStatus(repo), `${statusBody(2)}decision: T2: keep the old parser\n`);
  });
});

const DECIDE_REFUSALS: Array<[name: string, args: string[], code: number, stderr: RegExp]> = [
  ["an unknown task id exits 3", ["T9", "keep it"], 3, /no task 'T9'/],
  ["a task on the done list exits 2", ["T1", "keep it"], 2, /task 'T1' is already done/],
  ["a task on the skipped list exits 2", ["T2", "keep it"], 2, /task 'T2' is skipped/],
  ["an empty text exits 2", ["T3", ""], 2, /one non-empty line/],
  ["a whitespace-only text exits 2", ["T3", "   "], 2, /one non-empty line/],
  ["a multi-line text exits 2", ["T3", "first\nsecond"], 2, /one non-empty line/],
  ["a text carrying a carriage return exits 2", ["T3", "first\rsecond"], 2, /one non-empty line/],
  ["a missing text exits 2", ["T3"], 2, /usage: commit-task\.sh/],
];

for (const [name, args, code, stderr] of DECIDE_REFUSALS) {
  test(`--decide refuses ${name} and leaves status.md byte-for-byte unchanged`, () => {
    withGitRepo((repo) => {
      seed(repo, [
        ["T1", "src/a.ts"],
        ["T2", "src/b.ts"],
        ["T3", "src/c.ts"],
      ]);
      write(repo.dir, STATUS_REL, "# status\n\nprogress: 1/3\ndone: T1\nskipped: T2\nunreviewed: none\ndeferred: none\nclosed: none\n");
      const before = readStatus(repo);

      const result = run(repo.dir, repo.env, ["--decide", PLAN_REL, ...args]);
      assert.equal(result.status, code, `stderr: ${result.stderr}`);
      assert.match(result.stderr, stderr);
      assert.equal(result.stdout, "");
      assert.equal(readStatus(repo), before);
    });
  });
}

test("--decide against a missing plan exits 2", () => {
  withGitRepo((repo) => {
    seed(repo);
    const before = readStatus(repo);

    const result = run(repo.dir, repo.env, ["--decide", `${RUN_DIR}/nope.md`, "T1", "keep it"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /plan file not found/);
    assert.equal(readStatus(repo), before);
  });
});

test("--decide with the same task id and text twice leaves one line", () => {
  withGitRepo((repo) => {
    seed(repo);
    run(repo.dir, repo.env, ["--decide", PLAN_REL, "T2", "keep the old parser"]);

    const result = run(repo.dir, repo.env, ["--decide", PLAN_REL, "T2", "keep the old parser"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(readStatus(repo).match(/^decision: /gm)?.length, 1);
  });
});

test("--decide stores a text holding a colon intact", () => {
  withGitRepo((repo) => {
    seed(repo);

    run(repo.dir, repo.env, ["--decide", PLAN_REL, "T2", "scope: src/b.ts only, note: no retry"]);
    assert.match(readStatus(repo), /^decision: T2: scope: src\/b\.ts only, note: no retry$/m);
  });
});

test("--decide on a run with no status file creates it holding the decision line", () => {
  withGitRepo((repo) => {
    seed(repo);
    fs.rmSync(path.join(repo.dir, STATUS_REL));

    const result = run(repo.dir, repo.env, ["--decide", PLAN_REL, "T1", "keep it"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(readStatus(repo), `${statusBody(2)}decision: T1: keep it\n`);
  });
});

test("--decide on a status file with no final newline starts its line on a line of its own", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, STATUS_REL, statusBody(2).trimEnd());

    run(repo.dir, repo.env, ["--decide", PLAN_REL, "T1", "keep it"]);
    assert.equal(readStatus(repo), `${statusBody(2)}decision: T1: keep it\n`);
  });
});

test("--defer naming a contract id is refused with a warning, like an id no task owns", () => {
  withGitRepo((repo) => {
    seedRaw(repo, CONTRACTS_PLAN, 2);
    write(repo.dir, "src/a.ts", "work\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--defer", "C3:src/a.ts"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /refused C3:src\/a\.ts - no task C3 in the plan/);
    assert.doesNotMatch(readStatus(repo), /deferred: C3/);
  });
});

test("a plan mentioning the TASK marker in prose keeps its real task total (only a marker standing alone on its line opens or closes a block)", () => {
  withGitRepo((repo) => {
    const plan = [
      "# Plan - feat x",
      "",
      "## Tasks",
      "",
      "Note: every task is bounded by an `<!-- TASK -->` marker on its own line.",
      "",
      "<!-- TASK -->",
      "### T1 - task T1",
      "- Files: src/a.ts",
      "<!-- /TASK -->",
      "",
      "<!-- TASK -->",
      "### T2 - task T2",
      "- Files: src/b.ts",
      "<!-- /TASK -->",
      "",
    ].join("\n");
    seedRaw(repo, plan, 2);
    write(repo.dir, "src/a.ts", "work\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /progress: 1\/2\n$/);
  });
});

test("committing T1 does not stage a report shaped like a different task's own (review-T1-b-1.md is not T1's review-T1-<n>.md)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, `${RUN_DIR}/work/T1-coder.md`, "notes\n");
    write(repo.dir, `${RUN_DIR}/work/review-T1-1.md`, "T1's own round 1\n");
    write(repo.dir, `${RUN_DIR}/work/review-T1-b-1.md`, "a different task's report\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(
      committedFiles(repo),
      ["src/a.ts", STATUS_REL, `${RUN_DIR}/work/T1-coder.md`, `${RUN_DIR}/work/review-T1-1.md`].sort(),
    );
    assert.deepEqual(stagedFiles(repo), []);
    assert.ok(fs.existsSync(path.join(repo.dir, `${RUN_DIR}/work/review-T1-b-1.md`)));
  });
});

test("a plan Files entry with a leading './' stages the normalized path and is recognized by claimant lookups the same as the unprefixed form", () => {
  withGitRepo((repo) => {
    seed(repo, [["T1", "./src/a.ts"], ["T2", "src/b.ts"]]);
    write(repo.dir, "src/b.ts", "T2 work\n");
    write(repo.dir, "src/a.ts", "T1's own file, not yet committed - still open\n");

    // T2 tries to pull T1's file in through --with while T1 is still open: the
    // claimant lookup must recognize "src/a.ts" as T1's "./src/a.ts" entry and
    // refuse it, the same as if the plan had spelled it without the "./".
    const blocked = run(repo.dir, repo.env, [PLAN_REL, "T2", "--with", "src/a.ts"]);
    assert.equal(blocked.status, 0, `stderr: ${blocked.stderr}`);
    assert.match(blocked.stderr, /refused src\/a\.ts - claimed by task T1/);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/b.ts"].sort());

    // once T1 lands, its own commit stages the normalized path, not the literal "./" one
    write(repo.dir, "src/a.ts", "T1 work\n");
    const landed = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    assert.equal(landed.status, 0, `stderr: ${landed.stderr}`);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());
    assert.doesNotMatch(landed.stderr, /claimed by no task/);
  });
});

test("a '--with' path with a leading './' before '.temp' is refused like its normalized form (the leading './' is not a bypass)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    write(repo.dir, ".temp/x", "noise\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--with", "./.temp/x"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /refused \.temp\/x - \.temp is machine state, never committed/);
    assert.deepEqual(committedFiles(repo), [STATUS_REL, "src/a.ts"].sort());
  });
});

test("--chore and --qa record which half of the close is done, so a resumed run does not repeat it", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "CLAUDE.md", "memory\n");
    write(repo.dir, `${RUN_DIR}/qa.md`, "the acceptance document\n");

    run(repo.dir, repo.env, ["--chore", PLAN_REL, "CLAUDE.md"]);
    assert.match(readStatus(repo), /^closed: memory$/m);

    run(repo.dir, repo.env, ["--qa", PLAN_REL, `${RUN_DIR}/qa.md`]);
    assert.match(readStatus(repo), /^closed: memory qa$/m);
    assert.match(repo.git("log", "--format=%b", "-1").stdout, new RegExp(`Refs: ${PLAN_REL} close`));
  });
});

test("a refused close commit rolls the closed entry back, so the run never claims a close the history does not show", () => {
  withGitRepo((repo) => {
    seed(repo);
    const before = readStatus(repo);
    write(repo.dir, "CLAUDE.md", "memory\n");
    breakCommit(repo);

    const result = run(repo.dir, repo.env, ["--chore", PLAN_REL, "CLAUDE.md"]);
    assert.equal(result.status, 5);
    assert.match(result.stderr, /status rolled back, the close is NOT recorded/);
    assert.equal(readStatus(repo), before);
    assert.deepEqual(subjects(repo), ["seed"]);
    assert.deepEqual(planDirEntries(repo), ["plan.md", "status.md"]);

    fixCommit(repo);
  });
});

test("a fix number refuses a '.temp' path even with a leading './' (the leading './' is not a bypass)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/a.ts", "work\n");
    run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    write(repo.dir, "src/a.ts", "repair\n");
    write(repo.dir, ".temp/x", "noise\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "2", "src/a.ts", "./.temp/x"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /refused \.temp\/x - \.temp is machine state, never committed/);
    assert.deepEqual(committedFiles(repo), ["src/a.ts"]);
  });
});

// --- a run tied to an issue: every commit that takes the plan links it -------

const ISSUE_URL = "https://github.com/acme/widgets/issues/42";

/** The run's plan behind a frontmatter, as planner writes it for a run tied to an issue. */
function seedWithFrontmatter(repo: GitRepo, lines: string[]): void {
  seedRaw(repo, ["---", ...lines, "---", "", planBody(TWO_TASKS)].join("\n"), TWO_TASKS.length);
}

/** The commit body's last paragraph, which is where git reads trailers from. */
function lastParagraph(repo: GitRepo): string {
  const paragraphs = repo.git("log", "-1", "--format=%b").stdout.trim().split(/\n\s*\n/);
  return paragraphs[paragraphs.length - 1];
}

test("a plan whose frontmatter names an issue adds Refs: #<N> under the run's own Refs line in every form that takes the plan", () => {
  const forms: Array<[name: string, act: (repo: GitRepo) => void, runRefs: string]> = [
    ["task", (repo) => {
      write(repo.dir, "src/a.ts", "work\n");
      run(repo.dir, repo.env, [PLAN_REL, "T1"]);
    }, `Refs: ${PLAN_REL} task T1`],
    ["fix", (repo) => {
      write(repo.dir, "src/a.ts", "work\n");
      run(repo.dir, repo.env, [PLAN_REL, "T1"]);
      write(repo.dir, "src/a.ts", "repair\n");
      run(repo.dir, repo.env, [PLAN_REL, "T1", "2", "src/a.ts"]);
    }, `Refs: ${PLAN_REL} task T1 fix 2`],
    ["--repair", (repo) => {
      write(repo.dir, "src/legacy.ts", "regression\n");
      run(repo.dir, repo.env, ["--repair", PLAN_REL, "2", "src/legacy.ts"]);
    }, `Refs: ${PLAN_REL} post-test fix 2`],
    ["--chore", (repo) => {
      write(repo.dir, "CLAUDE.md", "memory\n");
      run(repo.dir, repo.env, ["--chore", PLAN_REL, "CLAUDE.md"]);
    }, `Refs: ${PLAN_REL} close`],
    ["--qa", (repo) => {
      write(repo.dir, `${RUN_DIR}/qa.md`, "the acceptance document\n");
      run(repo.dir, repo.env, ["--qa", PLAN_REL, `${RUN_DIR}/qa.md`]);
    }, `Refs: ${PLAN_REL} close`],
    ["--review", (repo) => {
      write(repo.dir, "src/a.ts", "work\n");
      run(repo.dir, repo.env, ["--review", PLAN_REL, "src/a.ts"]);
    }, `Refs: ${PLAN_REL} final review`],
  ];
  for (const [name, act, runRefs] of forms) {
    withGitRepo((repo) => {
      seedWithFrontmatter(repo, [`source: /home/u/plans/feat-x.md`, `issue: ${ISSUE_URL}`]);
      act(repo);
      assert.notEqual(subjects(repo)[0], "seed", `${name} committed nothing`);
      assert.equal(lastParagraph(repo), `${runRefs}\nRefs: #42`, name);
    });
  }
});

test("--landed also links the issue, after the landed sha", () => {
  withGitRepo((repo) => {
    seedWithFrontmatter(repo, [`issue: ${ISSUE_URL}`]);
    write(repo.dir, "src/a.ts", "work\n");
    repo.git("add", "src/a.ts");
    repo.git("commit", "-m", "landed elsewhere");
    const sha = repo.git("rev-parse", "HEAD").stdout.trim();

    const result = run(repo.dir, repo.env, [PLAN_REL, "T1", "--landed", sha]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(lastParagraph(repo), `Refs: ${PLAN_REL} task T1 landed ${sha}\nRefs: #42`);
  });
});

test("no issue link is added for a plan without the key, a URL that is no issue, or an issue: line outside the frontmatter (a wrong #N would link an unrelated issue)", () => {
  const plans: Array<[name: string, text: string]> = [
    ["no key", ["---", "source: /home/u/plans/feat-x.md", "---", "", planBody(TWO_TASKS)].join("\n")],
    ["pull request URL", ["---", "issue: https://github.com/acme/widgets/pull/42", "---", "", planBody(TWO_TASKS)].join("\n")],
    ["no frontmatter", [`issue: ${ISSUE_URL}`, "", planBody(TWO_TASKS)].join("\n")],
    ["unclosed frontmatter", ["---", `issue: ${ISSUE_URL}`, "", planBody(TWO_TASKS)].join("\n")],
  ];
  for (const [name, text] of plans) {
    withGitRepo((repo) => {
      seedRaw(repo, text, TWO_TASKS.length);
      write(repo.dir, "src/a.ts", "work\n");
      const result = run(repo.dir, repo.env, [PLAN_REL, "T1"]);
      assert.equal(result.status, 0, `${name} -> stderr: ${result.stderr}`);
      assert.equal(lastParagraph(repo), `Refs: ${PLAN_REL} task T1`, name);
    });
  }
});

test("a CRLF plan still yields the issue link (the key is matched with its carriage return cut)", () => {
  withGitRepo((repo) => {
    const text = ["---", `issue: ${ISSUE_URL}`, "---", "", planBody(TWO_TASKS)].join("\n").replace(/\n/g, "\r\n");
    seedRaw(repo, text, TWO_TASKS.length);
    write(repo.dir, "CLAUDE.md", "memory\n");
    const result = run(repo.dir, repo.env, ["--chore", PLAN_REL, "CLAUDE.md"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(lastParagraph(repo), `Refs: ${PLAN_REL} close\nRefs: #42`);
  });
});

test("--repair refuses a '.temp' path even with a leading './' (the leading './' is not a bypass)", () => {
  withGitRepo((repo) => {
    seed(repo);
    write(repo.dir, "src/legacy.ts", "the regression the suite caught\n");
    write(repo.dir, ".temp/x", "noise\n");

    const result = run(repo.dir, repo.env, ["--repair", PLAN_REL, "2", "src/legacy.ts", "./.temp/x"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /refused \.temp\/x - \.temp is machine state, never committed/);
    assert.deepEqual(committedFiles(repo), ["src/legacy.ts"]);
  });
});
