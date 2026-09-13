/*
 * cleanup-run.test.ts - proves cleanup-run.sh's contract: `cleanup-run.sh
 * <workdir> [commit-prefix]` removes a COMPLETED superdev run's working
 * directory plus its spec/intent files (each only when named by
 * plan-header.md's "Spec:"/"Intent:" line and present on disk), commits the
 * removal, and never touches an incomplete run or a directory outside
 * docs/.workflows/ - printing exactly one `CLEANUP: ...` line on stdout in
 * every case, with all git noise on stderr.
 *
 * A run phase (a workdir whose parent directory is named `phases`) is the
 * second shape: only that phase directory goes, under the commit slug
 * `<run slug without the date>-<phase dir>`, and the run root follows it in
 * the same commit once no phase directory is left.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/cleanup-run.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/cleanup-run.sh");

// --- fixture builder -------------------------------------------------------

const RUN_DIR = "docs/.workflows/2026-01-02-demo";
const SPEC_PATH = "docs/.workflows/20260102-demo.md";
const INTENT_PATH = "docs/.workflows/20260102-demo-intent.md";

type FileOpt = "present" | "missing-file" | "absent";

interface BuildOpts {
  /** Task numbers to create under tasks/, ascending (last = highest). Default ["01", "02"]. */
  taskNums?: string[];
  /** status.md's "task: NN" value. Default: the highest task number (a complete run). */
  lastTask?: string;
  /** "present" (default): Spec:/Intent: line + file on disk. "missing-file": line present,
   *  file absent. "absent": no Spec:/Intent: line at all. */
  spec?: FileOpt;
  intent?: FileOpt;
}

interface BuiltRun {
  dir: string;
  specPath?: string;
  intentPath?: string;
}

/** Writes docs/.workflows/2026-01-02-demo/{status.md,plan-header.md,
 *  tasks/task-NN.md,implementation/} under `root`, plus the optional spec/
 *  intent files it names - WITHOUT committing anything. */
function buildRunFiles(root: string, opts: BuildOpts = {}): BuiltRun {
  const dir = RUN_DIR;
  const abs = path.join(root, dir);
  fs.mkdirSync(path.join(abs, "tasks"), { recursive: true });
  fs.mkdirSync(path.join(abs, "implementation"), { recursive: true });

  const taskNums = opts.taskNums ?? ["01", "02"];
  for (const n of taskNums) {
    fs.writeFileSync(path.join(abs, "tasks", `task-${n}.md`), `## Task ${n}\nDo the work.\n`);
  }

  const highest = taskNums.length > 0 ? taskNums[taskNums.length - 1] : "00";
  const lastTask = opts.lastTask ?? highest;
  fs.writeFileSync(path.join(abs, "status.md"), `task: ${lastTask}\n`);

  const headerLines = ['Title: "Demo Run"'];

  let specPath: string | undefined;
  const specOpt = opts.spec ?? "present";
  if (specOpt !== "absent") {
    specPath = SPEC_PATH;
    headerLines.push(`Spec: ${specPath}`);
    if (specOpt === "present") {
      fs.writeFileSync(path.join(root, specPath), "# spec\n");
    }
  }

  let intentPath: string | undefined;
  const intentOpt = opts.intent ?? "present";
  if (intentOpt !== "absent") {
    intentPath = INTENT_PATH;
    headerLines.push(`Intent: ${intentPath} <!-- resume with: intent <path> -->`);
    if (intentOpt === "present") {
      fs.writeFileSync(path.join(root, intentPath), "# intent\n");
    }
  }

  headerLines.push("");
  fs.writeFileSync(path.join(abs, "plan-header.md"), headerLines.join("\n"));

  return { dir, specPath, intentPath };
}

/** Commits whatever the fixture builders wrote - the baseline every git-repo
 *  test starts from (so the removal below has something tracked to stage and
 *  commit). */
function seedCommit(repo: GitRepo): void {
  const add = repo.git("add", "-A");
  assert.equal(add.status, 0, `seed add failed: ${add.stderr}`);
  const commit = repo.git("commit", "-m", "seed run");
  assert.equal(commit.status, 0, `seed commit failed: ${commit.stderr}`);
}

/** Same as buildRunFiles, but commits everything first. */
function buildRun(repo: GitRepo, opts: BuildOpts = {}): BuiltRun {
  const built = buildRunFiles(repo.dir, opts);
  seedCommit(repo);
  return built;
}

// --- phase fixture builder -------------------------------------------------

interface PhaseOpts {
  /** Task numbers to create under the phase's tasks/, ascending. Default ["01", "02"]. */
  taskNums?: string[];
  /** status.md's "task: NN" value. Default: the highest task number (a complete phase). */
  lastTask?: string;
}

interface BuiltPhase {
  /** The phase workdir, e.g. docs/.workflows/2026-01-02-demo/phases/01-a. */
  dir: string;
  /** The run root holding intent.md, phases.md and phases/. */
  runRoot: string;
  /** The phase's own intent.md - named by its plan-header.md, and living INSIDE dir. */
  intentPath: string;
}

/** Writes a split run root (intent.md + phases.md) plus one phase workdir
 *  under phases/<phaseName>/ - WITHOUT committing anything. Call it once per
 *  phase to grow a multi-phase run. */
function buildPhaseFiles(root: string, phaseName: string, opts: PhaseOpts = {}): BuiltPhase {
  const runRoot = RUN_DIR;
  fs.mkdirSync(path.join(root, runRoot), { recursive: true });
  fs.writeFileSync(path.join(root, runRoot, "intent.md"), "# run intent\n");
  fs.writeFileSync(path.join(root, runRoot, "phases.md"), "# phases\n");

  const dir = `${runRoot}/phases/${phaseName}`;
  const abs = path.join(root, dir);
  fs.mkdirSync(path.join(abs, "tasks"), { recursive: true });
  fs.mkdirSync(path.join(abs, "implementation"), { recursive: true });

  const taskNums = opts.taskNums ?? ["01", "02"];
  for (const n of taskNums) {
    fs.writeFileSync(path.join(abs, "tasks", `task-${n}.md`), `## Task ${n}\nDo the work.\n`);
  }

  const highest = taskNums.length > 0 ? taskNums[taskNums.length - 1] : "00";
  fs.writeFileSync(path.join(abs, "status.md"), `task: ${opts.lastTask ?? highest}\n`);

  // the phase's intent lives inside the phase dir, so cleanup resolves an
  // "Intent:" target that its own workdir removal has already taken away
  const intentPath = `${dir}/intent.md`;
  fs.writeFileSync(path.join(root, intentPath), "# phase intent\n");
  fs.writeFileSync(
    path.join(abs, "plan-header.md"),
    ['Title: "Demo Phase"', `Intent: ${intentPath} <!-- resume with: intent <path> -->`, ""].join("\n"),
  );

  return { dir, runRoot, intentPath };
}

function run(repo: GitRepo, args: string[]): RunResult {
  return runScript(SUT, args, { cwd: repo.dir, env: repo.env, shell: "bash" });
}

function subjectOf(repo: GitRepo): string {
  return repo.git("log", "-1", "--format=%s").stdout.trim();
}

// --- happy path ------------------------------------------------------------

test("complete run with spec + intent: all three are removed, commit created, exit 0", () => {
  withGitRepo((repo) => {
    const { dir, specPath, intentPath } = buildRun(repo);
    const result = run(repo, [dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (removed)\n`);
    assert.equal(fs.existsSync(path.join(repo.dir, dir)), false);
    assert.equal(fs.existsSync(path.join(repo.dir, specPath!)), false);
    assert.equal(fs.existsSync(path.join(repo.dir, intentPath!)), false);
    assert.equal(subjectOf(repo), "chore(simplebuild): clean up run demo");
  });
});

test("an explicit commit prefix is honored in the commit subject", () => {
  withGitRepo((repo) => {
    const { dir } = buildRun(repo);
    const result = run(repo, [dir, "superbuild"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (removed)\n`);
    assert.equal(subjectOf(repo), "chore(superbuild): clean up run demo");
  });
});

test("incomplete run (task 01 of 02): nothing removed, skipped message, exit 0", () => {
  withGitRepo((repo) => {
    const { dir } = buildRun(repo, { lastTask: "01" });
    const result = run(repo, [dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (skipped - build not complete: task 01 of 02)\n`);
    assert.ok(fs.existsSync(path.join(repo.dir, dir)));
  });
});

test("no Spec:/Intent: lines: only the workdir is removed", () => {
  withGitRepo((repo) => {
    const { dir } = buildRun(repo, { spec: "absent", intent: "absent" });
    const result = run(repo, [dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (removed)\n`);
    assert.equal(fs.existsSync(path.join(repo.dir, dir)), false);
  });
});

test("an 'Intent:' line naming a missing file is ignored: workdir and spec are still removed", () => {
  withGitRepo((repo) => {
    const { dir, specPath } = buildRun(repo, { intent: "missing-file" });
    const result = run(repo, [dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (removed)\n`);
    assert.equal(fs.existsSync(path.join(repo.dir, dir)), false);
    assert.equal(fs.existsSync(path.join(repo.dir, specPath!)), false);
  });
});

test("a 'Spec:' line naming a missing file is ignored: workdir and intent are still removed", () => {
  withGitRepo((repo) => {
    const { dir, intentPath } = buildRun(repo, { spec: "missing-file" });
    const result = run(repo, [dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (removed)\n`);
    assert.equal(fs.existsSync(path.join(repo.dir, dir)), false);
    assert.equal(fs.existsSync(path.join(repo.dir, intentPath!)), false);
  });
});

test("a workdir outside docs/.workflows/ is skipped, exit 0, directory untouched", () => {
  withGitRepo((repo) => {
    const dir = "other/place";
    const abs = path.join(repo.dir, dir);
    fs.mkdirSync(abs, { recursive: true });
    fs.writeFileSync(path.join(abs, "status.md"), "task: 01\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "seed");

    const result = run(repo, [dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (skipped - not a superdev run dir)\n`);
    assert.ok(fs.existsSync(abs));
  });
});

test("an absolute workdir path outside docs/.workflows/ is skipped, exit 0", () => {
  withGitRepo((repo) => {
    const { dir } = buildRun(repo);
    const abs = path.join(repo.dir, dir);
    const result = run(repo, [abs]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${abs} (skipped - not a superdev run dir)\n`);
    assert.ok(fs.existsSync(abs));
  });
});

test("outside a git repository: files are removed, commit is skipped, exit 0", () => {
  withTempDir("p2p2-cleanup-nonrepo-", (projectDir) => {
    const { dir, specPath, intentPath } = buildRunFiles(projectDir);
    // no repo.env here on purpose: a bare temp dir is not a git repository,
    // so `git rev-parse --git-dir` fails and the commit section must bail out.
    const result = runScript(SUT, [dir], { cwd: projectDir, shell: "bash" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (removed - no git repository)\n`);
    assert.equal(fs.existsSync(path.join(projectDir, dir)), false);
    assert.equal(fs.existsSync(path.join(projectDir, specPath!)), false);
    assert.equal(fs.existsSync(path.join(projectDir, intentPath!)), false);
  });
});

test("missing workdir argument -> exit 1 with usage on stderr", () => {
  withGitRepo((repo) => {
    const result = run(repo, []);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /missing required parameter 'workdir'/);
    assert.match(result.stderr, /usage: cleanup-run\.sh <workdir> \[commit-prefix\]/);
  });
});

test("a nonexistent workdir -> exit 1", () => {
  withGitRepo((repo) => {
    const result = run(repo, ["docs/.workflows/2020-01-01-does-not-exist"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /workdir not found/);
  });
});

// --- edge cases --------------------------------------------------------

test("edge: a trailing slash and a leading './' are normalized before the guard and before printing", () => {
  withGitRepo((repo) => {
    const { dir } = buildRun(repo);
    const result = run(repo, [`./${dir}/`]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (removed)\n`);
  });
});

test("edge: an unparsable status.md is treated as task 00 and the run is skipped as incomplete", () => {
  withGitRepo((repo) => {
    const { dir } = buildRun(repo);
    fs.writeFileSync(path.join(repo.dir, dir, "status.md"), "garbage\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "corrupt status");

    const result = run(repo, [dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (skipped - build not complete: task 00 of 02)\n`);
    assert.ok(fs.existsSync(path.join(repo.dir, dir)));
  });
});

test("edge: no task files at all -> highest is 00, the run is skipped even with status 00", () => {
  withGitRepo((repo) => {
    const { dir } = buildRun(repo, { taskNums: [], lastTask: "00" });
    const result = run(repo, [dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (skipped - build not complete: task 00 of 00)\n`);
    assert.ok(fs.existsSync(path.join(repo.dir, dir)));
  });
});

test("edge: a workdir already removed by an earlier cleanup exits 1 with 'workdir not found'", () => {
  withGitRepo((repo) => {
    const { dir } = buildRun(repo);
    const first = run(repo, [dir]);
    assert.equal(first.status, 0, `stderr: ${first.stderr}`);

    const second = run(repo, [dir]);
    assert.equal(second.status, 1);
    assert.match(second.stderr, /workdir not found/);
  });
});

test("edge: a locally-modified tracked file in the workdir does not abort the removal", () => {
  withGitRepo((repo) => {
    // A tracked file with unstaged local modifications makes plain `git rm`
    // (no -f) refuse to remove it - cleanup-run.sh must use -f so the removal
    // (and the commit it produces) still goes through.
    const { dir } = buildRun(repo);
    fs.appendFileSync(path.join(repo.dir, dir, "status.md"), "dirty edit\n");

    const result = run(repo, [dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (removed)\n`);
    assert.equal(fs.existsSync(path.join(repo.dir, dir)), false);
    assert.equal(subjectOf(repo), "chore(simplebuild): clean up run demo");
  });
});

test("edge: an untracked run directory is removed with nothing to commit", () => {
  withGitRepo((repo) => {
    // Deliberately NOT committed - buildRunFiles only, no git add/commit - so
    // `git rm --ignore-unmatch` matches nothing and the plain `rm -rf` below it
    // does the actual removal, leaving the index clean.
    const { dir } = buildRunFiles(repo.dir);
    const result = run(repo, [dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${dir} (removed - nothing to commit)\n`);
    assert.equal(fs.existsSync(path.join(repo.dir, dir)), false);
  });
});

// --- run phases ------------------------------------------------------------

test("phase: only the completed phase dir is removed while another phase remains", () => {
  withGitRepo((repo) => {
    const first = buildPhaseFiles(repo.dir, "01-a");
    const second = buildPhaseFiles(repo.dir, "02-b");
    seedCommit(repo);

    const result = run(repo, [first.dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${first.dir} (removed)\n`);
    assert.equal(fs.existsSync(path.join(repo.dir, first.dir)), false);
    assert.ok(fs.existsSync(path.join(repo.dir, second.dir)));
    assert.ok(fs.existsSync(path.join(repo.dir, first.runRoot, "intent.md")));
    assert.ok(fs.existsSync(path.join(repo.dir, first.runRoot, "phases.md")));
    // slug: the run dir without its date, then the phase dir
    assert.equal(subjectOf(repo), "chore(simplebuild): clean up run demo-01-a");
  });
});

test("phase: the last remaining phase takes phases/ and the run root with it, in the same commit", () => {
  withGitRepo((repo) => {
    const only = buildPhaseFiles(repo.dir, "01-a");
    seedCommit(repo);

    const result = run(repo, [only.dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${only.dir} (removed - last phase, run root removed)\n`);
    assert.equal(fs.existsSync(path.join(repo.dir, only.runRoot)), false);
    assert.equal(subjectOf(repo), "chore(simplebuild): clean up run demo-01-a");
    // one commit carries both the phase and the run root
    assert.equal(repo.git("ls-files", "--", only.runRoot).stdout.trim(), "");
    const removed = repo.git("show", "--name-only", "--format=", "HEAD").stdout;
    assert.match(removed, new RegExp(`${only.runRoot}/intent\.md`));
    assert.match(removed, new RegExp(`${only.runRoot}/phases\.md`));
    assert.match(removed, new RegExp(`${only.dir}/status\.md`));
  });
});

test("phase: an incomplete phase is skipped and neither it nor the run root is touched", () => {
  withGitRepo((repo) => {
    const only = buildPhaseFiles(repo.dir, "01-a", { lastTask: "01" });
    seedCommit(repo);

    const result = run(repo, [only.dir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${only.dir} (skipped - build not complete: task 01 of 02)\n`);
    assert.ok(fs.existsSync(path.join(repo.dir, only.dir)));
    assert.ok(fs.existsSync(path.join(repo.dir, only.runRoot, "phases.md")));
  });
});

test("phase: outside a git repository the last phase still removes the run root, commit skipped", () => {
  withTempDir("p2p2-cleanup-phase-nonrepo-", (projectDir) => {
    const only = buildPhaseFiles(projectDir, "01-a");
    const result = runScript(SUT, [only.dir], { cwd: projectDir, shell: "bash" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      `CLEANUP: ${only.dir} (removed - last phase, run root removed - no git repository)\n`,
    );
    assert.equal(fs.existsSync(path.join(projectDir, only.runRoot)), false);
  });
});

test("edge: a phase path with './' and a trailing slash is detected, and stray files in phases/ count as empty", () => {
  withGitRepo((repo) => {
    const only = buildPhaseFiles(repo.dir, "01-a");
    // a loose file is not a phase: the run root must still go
    fs.writeFileSync(path.join(repo.dir, only.runRoot, "phases", "notes.txt"), "stray\n");
    seedCommit(repo);

    const result = run(repo, [`./${only.dir}/`]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `CLEANUP: ${only.dir} (removed - last phase, run root removed)\n`);
    assert.equal(fs.existsSync(path.join(repo.dir, only.runRoot)), false);
    assert.equal(subjectOf(repo), "chore(simplebuild): clean up run demo-01-a");
  });
});
