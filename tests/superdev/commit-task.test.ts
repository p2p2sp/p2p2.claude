/*
 * commit-task.test.ts - proves commit-task.sh's contract: `commit-task.sh
 * <message> [task-file] [--notes <notes-file>] [--path <path>]...`
 * delegates to status-update.sh first (so a bumped status.md rides IN the same
 * commit as the task's work), then stages ONLY the declared set - the task
 * file's `### Files` paths, the notes file's `touched:` paths (each cut at the
 * first ` - ` or ` (` on its line, so an appended reason does not corrupt the
 * declaration), every `--path`
 * value and the run directory - and commits with <message>, printing
 * `commit: <sha>` as its last line. Any other change in the working tree (a
 * modified tracked file, an untracked file outside .gitignore) stops the run
 * with one `undeclared: <path>` line per path and exit 2, nothing committed -
 * followed by one `dropped: <path>` line per declared path that matched no
 * file, printed on that refusal only; .temp/ is ignored on both sides. `--path .` is the one mode that declares the
 * whole tree and switches that gate off - the fresh-repository initial commit -
 * and .temp/ stays out even there. Reports "Nothing to commit." on an empty
 * index, skips the commit outside a git repository, and exits 1 on a missing
 * message.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/commit-task.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/commit-task.sh");

// commit-task.sh ships mode 100755 (git ls-files) - orchestrators invoke it
// directly as `"${CLAUDE_PLUGIN_ROOT}/scripts/commit-task.sh" ...`, never
// through bash; the harness below still runs it via shell: "bash" because it
// is testing the script's content, not its exec bit.
function run(dir: string, env: Record<string, string>, args: string[]) {
  return runScript(SUT, args, { cwd: dir, env, shell: "bash" });
}

/** A run working directory deep enough that its grandparent is NOT the repo
 *  root - the layout every real build uses, where the declared set is the task
 *  file's `### Files` plus this directory and nothing else. */
const TASK_REL = "docs/.workflows/run/tasks/task-01.md";
const NOTES_REL = "docs/.workflows/run/implementation/task-01-notes.md";

function write(root: string, rel: string, content: string): void {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** A task file in the plan template's shape, declaring `files` under `### Files`. */
function taskBody(...files: string[]): string {
  return [
    "## Task 1 - a task",
    "- TDD: none",
    "",
    "### Files",
    ...files.map((file) => `- modify - ${file} (body)`),
    "",
    "### Test Commands",
    "- none",
    "",
    "### DoD",
    "- done",
    "",
  ].join("\n");
}

/** Commits what withGitRepo itself leaves in the tree (its `.gitconfig-global`),
 *  so the only pending change a test sees is the one the test made. Without
 *  this baseline commit-task.sh reports that file - rightly - as an undeclared
 *  change and refuses to commit. */
function commitBaseline(repo: GitRepo): void {
  repo.git("add", "-A");
  repo.git("commit", "-m", "baseline");
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

function lastStdoutLine(stdout: string): string {
  const lines = stdout.split("\n").filter((line) => line.length > 0);
  return lines[lines.length - 1] ?? "";
}

/** Seeds a committed baseline: the task file declaring `work.txt`, plus
 *  work.txt itself, all in one "seed" commit. Leaves work.txt modified - the
 *  task's own, declared, work. */
function seedRun(repo: GitRepo, extraSeedFiles: Record<string, string> = {}): void {
  write(repo.dir, TASK_REL, taskBody("work.txt"));
  write(repo.dir, "work.txt", "seed\n");
  for (const [rel, content] of Object.entries(extraSeedFiles)) {
    write(repo.dir, rel, content);
  }
  repo.git("add", "-A");
  repo.git("commit", "-m", "seed");
  write(repo.dir, "work.txt", "task work\n");
}

test("message-only commit stages and commits a pending change", () => {
  withGitRepo((repo) => {
    commitBaseline(repo);
    fs.writeFileSync(path.join(repo.dir, "a.txt"), "content\n");
    const result = run(repo.dir, repo.env, ["add a.txt", "--path", "a.txt"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    // commit-task.sh does not redirect `git commit`'s own summary output, so
    // it lands on commit-task.sh's stdout (unlike decompose.sh, which does).
    assert.match(result.stdout, /add a\.txt/);
    const subject = repo.git("log", "-1", "--format=%s");
    assert.equal(subject.stdout.trim(), "add a.txt");
  });
});

test("message + task file: the status.md bump lands in the SAME commit as the task's work", () => {
  withGitRepo((repo) => {
    // Pre-existing baseline: the task file is already committed, unchanged by this run.
    const tasksDir = path.join(repo.dir, "tasks");
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, "task-01.md"), taskBody("work.txt"));
    repo.git("add", "-A");
    repo.git("commit", "-m", "seed task file");

    // The task's actual work: a new file.
    fs.writeFileSync(path.join(repo.dir, "work.txt"), "done\n");

    const result = run(repo.dir, repo.env, ["finish task 1", "tasks/task-01.md"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const statusPath = path.join(repo.dir, "status.md");
    assert.equal(fs.readFileSync(statusPath, "utf-8"), "task: 01\n");

    const subject = repo.git("log", "-1", "--format=%s");
    assert.equal(subject.stdout.trim(), "finish task 1");

    // status.md is NEW (only produced by this run's status-update bump) and rides
    // in the same commit as work.txt - proving the bump happened BEFORE staging.
    assert.deepEqual(committedFiles(repo), ["status.md", "work.txt"]);
  });
});

test("clean index, no changes -> 'Nothing to commit.' on stdout, exit 0", () => {
  withGitRepo((repo) => {
    fs.writeFileSync(path.join(repo.dir, "a.txt"), "content\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "seed");

    const result = run(repo.dir, repo.env, ["no-op message"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "Nothing to commit.\n");
  });
});

test("outside a git repository -> skips the commit, exit 0, and the status bump still lands", () => {
  // no withGitRepo here on purpose: a bare temp dir is not a git repository, so
  // `git rev-parse --git-dir` fails and the commit section must bail out rather
  // than kill the caller's implementation loop.
  withTempDir("p2p2-commit-task-nonrepo-", (dir) => {
    const tasksDir = path.join(dir, "tasks");
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, "task-03.md"), "## a task\n");

    const result = run(dir, {}, ["finish task 3", "tasks/task-03.md"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    // the status-update.sh delegation runs BEFORE the git guard (its own line
    // comes first), so the resume marker is written even when nothing can be
    // committed.
    assert.equal(result.stdout, "status: ./status.md -> task: 03\nNot a git repository - skipping commit.\n");
    assert.equal(fs.readFileSync(path.join(dir, "status.md"), "utf-8"), "task: 03\n");
  });
});

test("missing message -> exit 1 with usage on stderr", () => {
  withGitRepo((repo) => {
    const result = run(repo.dir, repo.env, []);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /missing required parameter 'message'/);
    assert.match(result.stderr, /usage: commit-task\.sh <message> \[task-file\]/);
  });
});

test("a message containing a newline, a quote and a non-ASCII character round-trips verbatim", () => {
  withGitRepo((repo) => {
    commitBaseline(repo);
    fs.writeFileSync(path.join(repo.dir, "a.txt"), "content\n");
    const message = 'first line\nsecond line with a "quote" and café';
    const result = run(repo.dir, repo.env, [message, "--path", "a.txt"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const body = repo.git("log", "-1", "--format=%B");
    // git normalizes a commit message to end in exactly one \n, and `git log
    // --format=%B` appends its own trailing record-separator \n on top.
    assert.equal(body.stdout.replace(/\n+$/, ""), message);
  });
});

test("a tracked file modified outside the declared set -> exit 2, the path listed, nothing committed", () => {
  withGitRepo((repo) => {
    seedRun(repo, { "foreign.txt": "theirs\n" });
    // a parallel worker's edit, in a file no declaration covers
    write(repo.dir, "foreign.txt", "their change\n");

    const result = run(repo.dir, repo.env, ["task 1", TASK_REL]);
    assert.equal(result.status, 2, `stdout: ${result.stdout}`);
    assert.match(result.stdout, /^undeclared: foreign\.txt$/m);
    assert.match(result.stderr, /undeclared changes in the working tree - nothing committed/);
    // every declaration here matched a real file, so the refusal names none
    assert.doesNotMatch(result.stdout, /^dropped:/m);
    // nothing committed and nothing staged: HEAD is still the baseline
    assert.equal(repo.git("log", "-1", "--format=%s").stdout.trim(), "seed");
    assert.equal(repo.git("diff", "--cached", "--name-only").stdout.trim(), "");
  });
});

test("a refused commit also names every declared path that matched no file", () => {
  withGitRepo((repo) => {
    seedRun(repo, { "foreign.txt": "theirs\n" });
    // the task declares a second file it planned but never created ...
    write(repo.dir, TASK_REL, taskBody("work.txt", "planned/never.txt"));
    // ... and a parallel worker's edit forces the refusal
    write(repo.dir, "foreign.txt", "their change\n");

    const result = run(repo.dir, repo.env, ["task 1", TASK_REL]);
    assert.equal(result.status, 2, `stdout: ${result.stdout}`);
    assert.match(result.stdout, /^undeclared: foreign\.txt$/m);
    assert.match(result.stdout, /^dropped: planned\/never\.txt$/m);
    // the dropped list comes after the undeclared one, never interleaved
    assert.ok(
      result.stdout.indexOf("dropped: planned/never.txt") >
        result.stdout.indexOf("undeclared: foreign.txt"),
      `stdout: ${result.stdout}`,
    );
    assert.match(result.stderr, /undeclared changes in the working tree - nothing committed/);
    // still fail-closed: nothing committed, nothing staged
    assert.equal(repo.git("log", "-1", "--format=%s").stdout.trim(), "seed");
    assert.equal(repo.git("diff", "--cached", "--name-only").stdout.trim(), "");
  });
});

test("a declared path that matched no file is dropped silently on a run that commits", () => {
  withGitRepo((repo) => {
    seedRun(repo);
    // same never-created declaration as above, but no foreign change this time
    write(repo.dir, TASK_REL, taskBody("work.txt", "planned/never.txt"));

    const result = run(repo.dir, repo.env, ["task 1", TASK_REL]);
    assert.equal(result.status, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.doesNotMatch(result.stdout, /^dropped:/m);
    assert.deepEqual(committedFiles(repo), [
      "docs/.workflows/run/status.md",
      "docs/.workflows/run/tasks/task-01.md",
      "work.txt",
    ]);
  });
});

test("an untracked file outside the declared set and outside .gitignore -> exit 2, the path listed, nothing committed", () => {
  withGitRepo((repo) => {
    seedRun(repo);
    write(repo.dir, "stray.txt", "dropped here by hand\n");

    const result = run(repo.dir, repo.env, ["task 1", TASK_REL]);
    assert.equal(result.status, 2, `stdout: ${result.stdout}`);
    assert.match(result.stdout, /^undeclared: stray\.txt$/m);
    assert.equal(repo.git("log", "-1", "--format=%s").stdout.trim(), "seed");
    assert.equal(repo.git("diff", "--cached", "--name-only").stdout.trim(), "");
  });
});

test("an untracked file under .temp/ is neither undeclared nor committed", () => {
  withGitRepo((repo) => {
    // no .gitignore at all in this repo: .temp/ is out by commit-task.sh's own
    // rule, not by the host's ignore file.
    seedRun(repo);
    write(repo.dir, ".temp/superdev/scratch.md", "machine state\n");

    const result = run(repo.dir, repo.env, ["task 1", TASK_REL]);
    assert.equal(result.status, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.equal(repo.git("log", "-1", "--format=%s").stdout.trim(), "task 1");
    assert.deepEqual(committedFiles(repo), ["docs/.workflows/run/status.md", "work.txt"]);
    // still on disk, just never staged
    assert.ok(fs.existsSync(path.join(repo.dir, ".temp/superdev/scratch.md")));
  });
});

test("an untracked file covered by .gitignore is neither undeclared nor committed", () => {
  withGitRepo((repo) => {
    seedRun(repo, { ".gitignore": "build/\n" });
    write(repo.dir, "build/out.bin", "artifact\n");

    const result = run(repo.dir, repo.env, ["task 1", TASK_REL]);
    assert.equal(result.status, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), ["docs/.workflows/run/status.md", "work.txt"]);
  });
});

test("a 'touched:' path from --notes joins the declared set and lands in the commit", () => {
  withGitRepo((repo) => {
    seedRun(repo);
    // written by the implementor for a file outside the task's `### Files`
    write(repo.dir, NOTES_REL, ["# Task 1 notes", "", "- touched: sub/extra.txt", ""].join("\n"));
    write(repo.dir, "sub/extra.txt", "collateral\n");

    const result = run(repo.dir, repo.env, ["task 1", TASK_REL, "--notes", NOTES_REL]);
    assert.equal(result.status, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), [
      "docs/.workflows/run/implementation/task-01-notes.md",
      "docs/.workflows/run/status.md",
      "sub/extra.txt",
      "work.txt",
    ]);
  });
});

test("a 'touched:' line whose path is followed by ' - <reason>' declares the path alone", () => {
  withGitRepo((repo) => {
    seedRun(repo);
    // the shape that used to declare a pseudo-path and leave the real file
    // reported as an undeclared change; a second " - " must not widen the cut
    write(
      repo.dir,
      NOTES_REL,
      ["# Task 1 notes", "", "- touched: sub/extra.txt - the generator rewrote it - twice", ""].join("\n"),
    );
    write(repo.dir, "sub/extra.txt", "collateral\n");

    const result = run(repo.dir, repo.env, ["task 1", TASK_REL, "--notes", NOTES_REL]);
    assert.equal(result.status, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), [
      "docs/.workflows/run/implementation/task-01-notes.md",
      "docs/.workflows/run/status.md",
      "sub/extra.txt",
      "work.txt",
    ]);
  });
});

test("a 'touched:' line whose path is followed by a ' (<comment>)' declares the path alone", () => {
  withGitRepo((repo) => {
    seedRun(repo);
    write(
      repo.dir,
      NOTES_REL,
      ["# Task 1 notes", "", "- touched: sub/extra.txt (regenerated by the formatter)", ""].join("\n"),
    );
    write(repo.dir, "sub/extra.txt", "collateral\n");

    const result = run(repo.dir, repo.env, ["task 1", TASK_REL, "--notes", NOTES_REL]);
    assert.equal(result.status, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), [
      "docs/.workflows/run/implementation/task-01-notes.md",
      "docs/.workflows/run/status.md",
      "sub/extra.txt",
      "work.txt",
    ]);
  });
});

test("a 'touched:' path carrying a space is still declared whole", () => {
  withGitRepo((repo) => {
    seedRun(repo);
    // no " - " and no " (" anywhere: the cut leaves the whole trimmed value,
    // spaces and all, exactly as before the cut existed
    write(repo.dir, NOTES_REL, ["# Task 1 notes", "", "- touched: sub/two words.txt", ""].join("\n"));
    write(repo.dir, "sub/two words.txt", "collateral\n");

    const result = run(repo.dir, repo.env, ["task 1", TASK_REL, "--notes", NOTES_REL]);
    assert.equal(result.status, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), [
      "docs/.workflows/run/implementation/task-01-notes.md",
      "docs/.workflows/run/status.md",
      "sub/two words.txt",
      "work.txt",
    ]);
  });
});

test("a 'touched:' value that cuts to nothing declares nothing - a refused run names no dropped path", () => {
  withGitRepo((repo) => {
    seedRun(repo, { "foreign.txt": "theirs\n" });
    // nothing before the separator: the line must declare nothing at all,
    // rather than turning the reason into a pseudo-path
    write(repo.dir, NOTES_REL, ["# Task 1 notes", "", "- touched:  - I forgot the path", ""].join("\n"));
    // a parallel worker's edit forces the refusal, the one run that would print
    // a dropped declaration
    write(repo.dir, "foreign.txt", "their change\n");

    const result = run(repo.dir, repo.env, ["task 1", TASK_REL, "--notes", NOTES_REL]);
    assert.equal(result.status, 2, `stdout: ${result.stdout}`);
    assert.match(result.stdout, /^undeclared: foreign\.txt$/m);
    assert.doesNotMatch(result.stdout, /^dropped:/m);
    assert.match(result.stderr, /undeclared changes in the working tree - nothing committed/);
    // still fail-closed: nothing committed, nothing staged
    assert.equal(repo.git("log", "-1", "--format=%s").stdout.trim(), "seed");
    assert.equal(repo.git("diff", "--cached", "--name-only").stdout.trim(), "");
  });
});

test("--path <dir> declares every file below it, including a new one", () => {
  withGitRepo((repo) => {
    fs.writeFileSync(path.join(repo.dir, "a.txt"), "content\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "seed");
    write(repo.dir, "pkg/nested/new.txt", "fresh\n");

    const result = run(repo.dir, repo.env, ["add the package", "--path", "pkg"]);
    assert.equal(result.status, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.deepEqual(committedFiles(repo), ["pkg/nested/new.txt"]);
  });
});

test("--path . declares the whole tree - the fresh-repository initial commit - and still leaves .temp/ out", () => {
  withGitRepo((repo) => {
    // No commit yet and an untracked tree: exactly what the orchestrators' git
    // preflight hands over after `git init`. The harness's own .gitconfig-global
    // sits in that tree undeclared - under `--path .` it rides along instead of
    // stopping the run with exit 2.
    write(repo.dir, "src/app.txt", "source\n");
    write(repo.dir, ".temp/superdev/scratch.md", "machine state\n");

    const result = run(repo.dir, repo.env, ["chore: initial commit", "--path", "."]);
    assert.equal(result.status, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.doesNotMatch(result.stdout, /^undeclared: /m);

    // ls-tree, not `git show`: this is a root commit, so the tree itself is the
    // only statement of what the commit carries.
    const tracked = repo
      .git("ls-tree", "-r", "--name-only", "HEAD")
      .stdout.trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .sort();
    assert.ok(tracked.includes("src/app.txt"), `tracked: ${tracked.join(", ")}`);
    assert.ok(tracked.includes(".gitconfig-global"), `tracked: ${tracked.join(", ")}`);
    assert.ok(
      !tracked.some((file) => file === ".temp" || file.startsWith(".temp/")),
      `tracked: ${tracked.join(", ")}`,
    );
    // still on disk, just never staged
    assert.ok(fs.existsSync(path.join(repo.dir, ".temp/superdev/scratch.md")));

    const head = repo.git("rev-parse", "HEAD").stdout.trim();
    assert.equal(lastStdoutLine(result.stdout), `commit: ${head}`);
  });
});

test("the last stdout line is 'commit: <sha>' and equals git rev-parse HEAD", () => {
  withGitRepo((repo) => {
    seedRun(repo);

    const result = run(repo.dir, repo.env, ["task 1", TASK_REL]);
    assert.equal(result.status, 0, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
    const head = repo.git("rev-parse", "HEAD").stdout.trim();
    assert.equal(lastStdoutLine(result.stdout), `commit: ${head}`);
  });
});
