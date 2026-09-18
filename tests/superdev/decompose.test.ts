/*
 * decompose.test.ts - proves decompose.sh's plan -> working-dir contract:
 * `decompose.sh <plan-file> [commit-prefix]` builds
 * docs/.workflows/<date>-<slug>/{plan-header.md,plan.md,status.md,base.md,
 * tasks/task-NN.md,implementation/} under the repository root whatever cwd it
 * was started in, prints a clean stdout index (all git noise on stderr) whose
 * `root:` line names that root, commits the run directory ALONE - skipping
 * only that commit, and keeping the built tree, outside a git repository - and
 * exits 1/4/5/6/7 on its documented error paths - 7 being the reviewed-plan
 * guard: a `<plan>.sha256` sidecar (written by the ExitPlanMode hook) whose
 * digest differs from the plan's bytes refuses the decomposition outright.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/decompose.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir, withGitRepo, type GitRepo } from "../harness/tmp.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/decompose.sh");

// --- fixture builders ---------------------------------------------------

function acceptanceCriteria(items: string[]): string {
  return items.map((text, i) => `${i + 1}. ${text}`).join("\n");
}

function taskBlock(heading: string, covers: number[] | string, body = "Do the work."): string {
  // a plain number[] renders the bare-number grammar most fixtures use;
  // a string is the already-titled `Covers:` content, e.g. "`First criterion` (#1)",
  // verbatim after "- Covers: " - decompose.sh parses either the same way,
  // it only ever greps out the #<n> tokens.
  const coversLine = typeof covers === "string" ? `- Covers: ${covers}` : `- Covers: #${covers.join(", #")}`;
  return ["<!-- TASK -->", "", `## ${heading}`, coversLine, body, "<!-- /TASK -->", ""].join("\n");
}

/** The two task sections the `concurrent` column is derived from, rendered in
 *  the plan template's grammar and handed to `taskBlock` as its body. `deps`
 *  left out drops the whole `### Dependencies` section, `deps: []` renders the
 *  template's "- none" line and every entry becomes one "(Task <N>)" pointer;
 *  `files` left out drops `### Files`, every entry is a "- modify - " line
 *  written verbatim (annotation included, when the case wants one). The
 *  trailing `### Approach` is deliberate: a heading must close the section
 *  above it, so nothing below keeps feeding either capture. */
function taskSections(opts: { deps?: Array<number | string>; files?: string[]; approach?: string }): string {
  const lines: string[] = [];
  if (opts.deps !== undefined) {
    lines.push("### Dependencies");
    lines.push(
      ...(opts.deps.length === 0
        ? ["- none"]
        : opts.deps.map((n) => `- \`a preceding task\` (Task ${n}) - blocks: this task reads its output`)),
    );
    lines.push("");
  }
  if (opts.files !== undefined) {
    lines.push("### Files");
    lines.push(...opts.files.map((f) => `- modify - ${f}`));
    lines.push("");
  }
  lines.push("### Approach");
  lines.push(opts.approach ?? "1. Do the work.");
  return lines.join("\n");
}

function simplePlan(opts: { title: string; criteria: string[]; tasks: string[]; intentPath?: string }): string {
  return [
    `Title: "${opts.title}"`,
    ...(opts.intentPath ? [`Intent: ${opts.intentPath}`] : []),
    "",
    "<!-- HEADER -->",
    "",
    "## Goal",
    "Do the thing.",
    "",
    "## Acceptance criteria",
    acceptanceCriteria(opts.criteria),
    "",
    "<!-- /HEADER -->",
    "",
    ...opts.tasks,
  ].join("\n");
}

function specFixture(criteria: string[]): string {
  return [
    "## Acceptance criteria",
    acceptanceCriteria(criteria),
    "",
    "## Out of scope",
    "Nothing relevant.",
    "",
    "## Constraints / assumptions",
    "None.",
    "",
  ].join("\n");
}

function superPlan(opts: { title: string; specPath: string; tasks: string[]; intentPath?: string }): string {
  return [
    `Title: "${opts.title}"`,
    `Spec: ${opts.specPath}`,
    ...(opts.intentPath ? [`Intent: ${opts.intentPath}`] : []),
    "",
    "<!-- HEADER -->",
    "",
    "## Goal",
    "Do the bigger thing.",
    "",
    "<!-- /HEADER -->",
    "",
    ...opts.tasks,
  ].join("\n");
}

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function seedInitialCommit(repo: GitRepo): string {
  fs.writeFileSync(path.join(repo.dir, "README.md"), "seed\n");
  const add = repo.git("add", "-A");
  assert.equal(add.status, 0, `seed add failed: ${add.stderr}`);
  const commit = repo.git("commit", "-m", "seed");
  assert.equal(commit.status, 0, `seed commit failed: ${commit.stderr}`);
  return repo.git("rev-parse", "HEAD").stdout.trim();
}

// decompose.sh ships mode 100755 (git ls-files) - orchestrators invoke it
// directly as `"${CLAUDE_PLUGIN_ROOT}/scripts/decompose.sh" ...`, never
// through bash; the harness below still runs it via shell: "bash" because it
// is testing the script's content, not its exec bit.
function run(repo: GitRepo, args: string[]): RunResult {
  return runScript(SUT, args, { cwd: repo.dir, env: repo.env, shell: "bash" });
}

function subjectOf(repo: GitRepo): string {
  return repo.git("log", "-1", "--format=%s").stdout.trim();
}

/** The repository root as git itself spells it - the oracle for the index's
 *  `root:` line. Not compared against `repo.dir` directly: git prints the
 *  physical path (macOS resolves /var -> /private/var, Git-Bash expands an 8.3
 *  short name), which is the same directory under another spelling. */
function toplevelOf(repo: GitRepo): string {
  const result = repo.git("rev-parse", "--show-toplevel");
  assert.equal(result.status, 0, `rev-parse --show-toplevel failed: ${result.stderr}`);
  return result.stdout.trim();
}

/** Separators normalised, any trailing slash dropped and a Windows drive
 *  letter upper-cased, so a path printed by the script compares equal to the
 *  same path spelled by Node or by another git call. */
function normaliseAbs(value: string): string {
  return slash(value.trim())
    .replace(/\/+$/, "")
    .replace(/^([a-z]):/, (_match, drive: string) => `${drive.toUpperCase()}:`);
}

function indexValue(stdout: string, label: string): string | undefined {
  const line = stdout.split("\n").find((l) => l.startsWith(`${label}: `));
  return line === undefined ? undefined : line.slice(label.length + 2).trim();
}

/** Every path in the last commit, one per line. */
function committedPaths(repo: GitRepo): string[] {
  const result = repo.git("show", "--name-only", "--pretty=format:", "HEAD");
  assert.equal(result.status, 0, `git show failed: ${result.stderr}`);
  return result.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// --- happy path ----------------------------------------------------------

test("happy path (default prefix): builds the full tree, prints a clean index, commits with the default prefix", () => {
  withGitRepo((repo) => {
    const base = seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      const content = simplePlan({
        title: "My Simple Plan",
        criteria: ["First criterion text.", "Second criterion text."],
        tasks: [taskBlock("Task 1 - build widget", [1]), taskBlock("Task 2 - ship widget", [2])],
      });
      fs.writeFileSync(plan, content);

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const dir = `docs/.workflows/${todayISO()}-my-simple-plan`;
      const absDir = path.join(repo.dir, dir);
      const header = `${dir}/plan-header.md`;
      const planCopy = `${dir}/plan.md`;
      const task1 = `${dir}/tasks/task-01.md`;
      const task2 = `${dir}/tasks/task-02.md`;

      assert.equal(
        result.stdout,
        [
          `workdir: ${dir}`,
          `root: ${toplevelOf(repo)}`,
          "status: none",
          `base: ${base}`,
          `plan-header: ${header}`,
          `plan: ${planCopy}`,
          `${task1}\tTask 1 - build widget\t-\t-\tno`,
          `${task2}\tTask 2 - ship widget\t-\t-\tno`,
          "",
        ].join("\n"),
      );

      // git noise (the commit) lands on stderr, never stdout
      assert.doesNotMatch(result.stdout, /chore\(/);
      assert.match(result.stderr, /chore\(simplebuild\): decompose plan my-simple-plan/);

      // tree on disk
      assert.ok(fs.statSync(path.join(absDir, "implementation")).isDirectory());
      assert.equal(fs.readdirSync(path.join(absDir, "implementation")).length, 0);
      assert.equal(fs.readFileSync(path.join(absDir, "plan.md"), "utf-8"), content);
      assert.equal(fs.readFileSync(path.join(absDir, "status.md"), "utf-8"), "task: 00\n");
      assert.equal(fs.readFileSync(path.join(absDir, "base.md"), "utf-8"), `base: ${base}\n`);

      const headerText = fs.readFileSync(path.join(absDir, "plan-header.md"), "utf-8");
      assert.match(headerText, /^Title: "My Simple Plan"/);
      assert.match(headerText, /## Goal/);
      assert.match(headerText, /## Acceptance criteria/);
      assert.match(headerText, /1\. First criterion text\./);
      assert.match(headerText, /2\. Second criterion text\./);

      const task1Text = fs.readFileSync(path.join(absDir, "tasks", "task-01.md"), "utf-8");
      assert.match(task1Text, /## Task 1 - build widget/);
      assert.match(task1Text, /- Covers: #1/);
      assert.match(task1Text, /### Covered criteria\n1\. First criterion text\.\n$/);

      const task2Text = fs.readFileSync(path.join(absDir, "tasks", "task-02.md"), "utf-8");
      assert.match(task2Text, /### Covered criteria\n2\. Second criterion text\.\n$/);

      // commit created with the default "simplebuild" prefix
      assert.equal(subjectOf(repo), "chore(simplebuild): decompose plan my-simple-plan");
    });
  });
});

test("an explicit commit prefix is honored in the commit subject", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Prefixed Plan",
          criteria: ["Only criterion."],
          tasks: [taskBlock("Task 1 - do it", [1])],
        }),
      );

      const result = run(repo, [plan, "superbuild"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(subjectOf(repo), "chore(superbuild): decompose plan prefixed-plan");
    });
  });
});

test("superbuild track: criteria/out-of-scope/constraints are sourced from the spec, 'spec:' appears in the index", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-spec-", (planDir) => {
      const spec = path.join(planDir, "spec.md");
      fs.writeFileSync(spec, specFixture(["Spec-sourced criterion."]));
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        superPlan({
          title: "Spec Driven Plan",
          specPath: spec,
          tasks: [taskBlock("Task 1 - implement", [1])],
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, new RegExp(`^spec: ${spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));

      const dir = `docs/.workflows/${todayISO()}-spec-driven-plan`;
      const headerText = fs.readFileSync(path.join(repo.dir, dir, "plan-header.md"), "utf-8");
      assert.match(headerText, /## Out of scope/);
      assert.match(headerText, /Nothing relevant\./);
      assert.match(headerText, /## Constraints \/ assumptions/);

      const task1Text = fs.readFileSync(path.join(repo.dir, dir, "tasks", "task-01.md"), "utf-8");
      assert.match(task1Text, /### Covered criteria\n1\. Spec-sourced criterion\.\n$/);
    });
  });
});

// --- the commit stages the run directory alone ---------------------------

test("a dirty working tree: a pre-existing modified tracked file and an untracked stray file are not part of the decomposition commit", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    // the user's own work, sitting in the tree before the build starts
    fs.writeFileSync(path.join(repo.dir, "README.md"), "seed\nmy own edit\n");
    fs.writeFileSync(path.join(repo.dir, "stray.txt"), "my own untracked file\n");

    withTempDir("p2p2-decompose-dirty-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Dirty Tree Plan",
          criteria: ["One."],
          tasks: [taskBlock("Task 1 - do it", [1])],
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const dir = `docs/.workflows/${todayISO()}-dirty-tree-plan`;
      assert.equal(subjectOf(repo), "chore(simplebuild): decompose plan dirty-tree-plan");

      // the commit carries the run directory and nothing else
      const committed = committedPaths(repo);
      assert.ok(
        committed.includes(`${dir}/plan.md`),
        `expected the run directory in the commit, got:\n${committed.join("\n")}`,
      );
      for (const p of committed) {
        assert.ok(
          p.startsWith("docs/.workflows/"),
          `foreign path swept into the decomposition commit: ${p}`,
        );
      }

      // the user's changes stay in the working tree, uncommitted and untouched
      const status = repo.git("status", "--porcelain", "--untracked-files=all").stdout;
      assert.match(status, /^ ?M README\.md$/m);
      assert.match(status, /^\?\? stray\.txt$/m);
      assert.equal(fs.readFileSync(path.join(repo.dir, "README.md"), "utf-8"), "seed\nmy own edit\n");
    });
  });
});

// --- cwd independence ----------------------------------------------------

test("run from a subdirectory of the repo: the working dir is created under the repo root and the index prints root:", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    const sub = path.join(repo.dir, "sub");
    fs.mkdirSync(sub, { recursive: true });
    // the plan sits at the repo root, so the argument is relative to the
    // SUBDIRECTORY the script is started in - the caller's cwd, not the root
    fs.writeFileSync(
      path.join(repo.dir, "plan.md"),
      simplePlan({
        title: "Subdir Plan",
        criteria: ["One."],
        tasks: [taskBlock("Task 1 - do it", [1])],
      }),
    );

    const result = runScript(SUT, ["../plan.md"], { cwd: sub, env: repo.env, shell: "bash" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const dir = `docs/.workflows/${todayISO()}-subdir-plan`;
    assert.match(result.stdout, new RegExp(`^workdir: ${dir}$`, "m"));

    // built under the repo root, never under the cwd the run started in
    assert.ok(fs.existsSync(path.join(repo.dir, dir, "tasks", "task-01.md")));
    assert.equal(fs.existsSync(path.join(sub, "docs")), false);

    // root: names the repository root itself, not that cwd
    const root = indexValue(result.stdout, "root");
    assert.ok(root, `expected a root: line in:\n${result.stdout}`);
    assert.equal(normaliseAbs(root!), normaliseAbs(toplevelOf(repo)));
    assert.ok(
      normaliseAbs(root!).endsWith(`/${path.basename(repo.dir)}`),
      `expected root: to end at the repository directory, got: ${root}`,
    );
    assert.doesNotMatch(normaliseAbs(root!), /\/sub$/);

    // and the commit still carries only the run directory
    for (const p of committedPaths(repo)) {
      assert.ok(p.startsWith("docs/.workflows/"), `foreign path in the commit: ${p}`);
    }
  });
});

// --- Intent: preamble line -----------------------------------------------

test("simplebuild track: an Intent: line naming an existing file is copied into the header and the stdout index", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-intent-", (planDir) => {
      const intentFile = path.join(planDir, "intent.md");
      fs.writeFileSync(intentFile, "# Intent\n\nSynthesis.\n");
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Intent Bearing Plan",
          criteria: ["Only criterion."],
          tasks: [taskBlock("Task 1 - do it", [1])],
          intentPath: intentFile,
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(
        slash(result.stdout),
        new RegExp(`^intent: ${slash(intentFile).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"),
      );

      const dir = `docs/.workflows/${todayISO()}-intent-bearing-plan`;
      const headerText = fs.readFileSync(path.join(repo.dir, dir, "plan-header.md"), "utf-8");
      assert.match(slash(headerText), new RegExp(`^Intent: ${slash(intentFile).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
      assert.match(headerText, /^Title: "Intent Bearing Plan"/);
    });
  });
});

test("superbuild track: an Intent: line after Spec: is copied into the header, in order, and into the stdout index", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-intent-super-", (planDir) => {
      const spec = path.join(planDir, "spec.md");
      fs.writeFileSync(spec, specFixture(["Spec-sourced criterion."]));
      const intentFile = path.join(planDir, "intent.md");
      fs.writeFileSync(intentFile, "# Intent\n\nSynthesis.\n");
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        superPlan({
          title: "Spec And Intent Plan",
          specPath: spec,
          tasks: [taskBlock("Task 1 - implement", [1])],
          intentPath: intentFile,
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const stdoutSlashed = slash(result.stdout);
      const specIdx = stdoutSlashed.indexOf(`spec: ${slash(spec)}`);
      const intentIdx = stdoutSlashed.indexOf(`intent: ${slash(intentFile)}`);
      assert.ok(specIdx >= 0 && intentIdx >= 0 && specIdx < intentIdx, `expected spec: before intent: in:\n${result.stdout}`);

      const dir = `docs/.workflows/${todayISO()}-spec-and-intent-plan`;
      const headerText = slash(fs.readFileSync(path.join(repo.dir, dir, "plan-header.md"), "utf-8"));
      const specHdrIdx = headerText.indexOf(`Spec: ${slash(spec)}`);
      const intentHdrIdx = headerText.indexOf(`Intent: ${slash(intentFile)}`);
      assert.ok(
        specHdrIdx >= 0 && intentHdrIdx >= 0 && specHdrIdx < intentHdrIdx,
        `expected Spec: before Intent: in header:\n${headerText}`,
      );
    });
  });
});

test("a plan with no Intent: line produces neither the header line nor the stdout index line, exit 0", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "No Intent Plan",
          criteria: ["One."],
          tasks: [taskBlock("Task 1 - do it", [1])],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.doesNotMatch(result.stdout, /^intent:/m);
      const dir = `docs/.workflows/${todayISO()}-no-intent-plan`;
      const headerText = fs.readFileSync(path.join(repo.dir, dir, "plan-header.md"), "utf-8");
      assert.doesNotMatch(headerText, /^Intent:/m);
    });
  });
});

test("an Intent: line naming a missing file -> stderr warning, no header/index line, exit 0", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-intent-missing-", (planDir) => {
      const missingIntent = path.join(planDir, "missing-intent.md");
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Missing Intent Plan",
          criteria: ["One."],
          tasks: [taskBlock("Task 1 - do it", [1])],
          intentPath: missingIntent,
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stderr, /warning: intent file not found/);
      assert.doesNotMatch(result.stdout, /^intent:/m);
      const dir = `docs/.workflows/${todayISO()}-missing-intent-plan`;
      const headerText = fs.readFileSync(path.join(repo.dir, dir, "plan-header.md"), "utf-8");
      assert.doesNotMatch(headerText, /^Intent:/m);
    });
  });
});

// --- run-directory adoption from Intent:/Spec: --------------------------

test("adoption: an Intent: file already under docs/.workflows/<run>/ becomes the working dir, not the derived date-slug name", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    const runDir = "docs/.workflows/2026-01-02-adopted";
    fs.mkdirSync(path.join(repo.dir, runDir), { recursive: true });
    const intentRel = `${runDir}/intent.md`;
    fs.writeFileSync(path.join(repo.dir, intentRel), "# Intent\n\nAdopted synthesis.\n");

    withTempDir("p2p2-decompose-adopt-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Adopted Intent Plan",
          criteria: ["Only criterion."],
          tasks: [taskBlock("Task 1 - do it", [1])],
          intentPath: intentRel,
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, new RegExp(`^workdir: ${runDir}$`, "m"));

      const absDir = path.join(repo.dir, runDir);
      assert.ok(fs.existsSync(path.join(absDir, "plan-header.md")));
      assert.ok(fs.existsSync(path.join(absDir, "tasks", "task-01.md")));
      // the pre-existing intent.md survives untouched, sitting next to the
      // freshly built decomposition artifacts in the same adopted directory
      assert.equal(fs.readFileSync(path.join(absDir, "intent.md"), "utf-8"), "# Intent\n\nAdopted synthesis.\n");
    });
  });
});

test("adoption: an Intent: file under docs/.workflows/<run>/phases/01-<slug>/ adopts the phase directory, not the run root", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    const runDir = "docs/.workflows/2026-01-02-phased";
    const phaseDir = `${runDir}/phases/01-layout`;
    fs.mkdirSync(path.join(repo.dir, phaseDir), { recursive: true });
    fs.writeFileSync(path.join(repo.dir, runDir, "intent.md"), "# Intent\n\nWhole endeavour.\n");
    fs.writeFileSync(path.join(repo.dir, runDir, "phases.md"), "# Phases\n\n## Phases\n");
    const intentRel = `${phaseDir}/intent.md`;
    fs.writeFileSync(path.join(repo.dir, intentRel), "# Intent\n\nPhase 01 synthesis.\n");

    withTempDir("p2p2-decompose-adopt-phase-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Phase One Plan",
          criteria: ["Only criterion."],
          tasks: [taskBlock("Task 1 - do it", [1])],
          intentPath: intentRel,
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      // the full dirname is adopted - the phase dir, not its first level
      assert.match(result.stdout, new RegExp(`^workdir: ${phaseDir}$`, "m"));

      const absPhase = path.join(repo.dir, phaseDir);
      assert.ok(fs.existsSync(path.join(absPhase, "plan-header.md")));
      assert.ok(fs.existsSync(path.join(absPhase, "tasks", "task-01.md")));
      // the run root stays exactly as seeded - no build artifacts leak into it
      assert.deepEqual(fs.readdirSync(path.join(repo.dir, runDir)).sort(), ["intent.md", "phases", "phases.md"]);
    });
  });
});

test("adoption: a Spec: file alone (no Intent:) under docs/.workflows/<run>/ becomes the working dir", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    const runDir = "docs/.workflows/2026-01-02-spec-adopted";
    fs.mkdirSync(path.join(repo.dir, runDir), { recursive: true });
    const specRel = `${runDir}/spec.md`;
    fs.writeFileSync(path.join(repo.dir, specRel), specFixture(["Spec-sourced criterion."]));

    withTempDir("p2p2-decompose-adopt-spec-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        superPlan({
          title: "Adopted Spec Plan",
          specPath: specRel,
          tasks: [taskBlock("Task 1 - implement", [1])],
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, new RegExp(`^workdir: ${runDir}$`, "m"));

      const absDir = path.join(repo.dir, runDir);
      assert.ok(fs.existsSync(path.join(absDir, "plan-header.md")));
      assert.ok(fs.existsSync(path.join(absDir, "tasks", "task-01.md")));
      assert.equal(
        fs.readFileSync(path.join(absDir, "spec.md"), "utf-8"),
        specFixture(["Spec-sourced criterion."]),
      );
    });
  });
});

test("adoption: Intent: wins over a Spec: that resolves to a different run directory", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    const intentRunDir = "docs/.workflows/2026-01-02-intent-run";
    const specRunDir = "docs/.workflows/2026-01-02-spec-run";
    fs.mkdirSync(path.join(repo.dir, intentRunDir), { recursive: true });
    fs.mkdirSync(path.join(repo.dir, specRunDir), { recursive: true });
    const intentRel = `${intentRunDir}/intent.md`;
    const specRel = `${specRunDir}/spec.md`;
    fs.writeFileSync(path.join(repo.dir, intentRel), "# Intent\n\nSynthesis.\n");
    fs.writeFileSync(path.join(repo.dir, specRel), specFixture(["Spec-sourced criterion."]));

    withTempDir("p2p2-decompose-adopt-precedence-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        superPlan({
          title: "Precedence Plan",
          specPath: specRel,
          tasks: [taskBlock("Task 1 - implement", [1])],
          intentPath: intentRel,
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, new RegExp(`^workdir: ${intentRunDir}$`, "m"));
      assert.doesNotMatch(result.stdout, new RegExp(`^workdir: ${specRunDir}$`, "m"));

      // Intent's own run directory got the build; Spec's run directory was
      // left alone - only its pre-existing spec.md is there, nothing else.
      assert.ok(fs.existsSync(path.join(repo.dir, intentRunDir, "plan-header.md")));
      assert.deepEqual(fs.readdirSync(path.join(repo.dir, specRunDir)), ["spec.md"]);
    });
  });
});

test("adoption: an absolute Intent: path is normalised to the repo-relative run directory", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    const runDir = "docs/.workflows/2026-01-02-abs-adopted";
    const absRunDir = path.join(repo.dir, runDir);
    fs.mkdirSync(absRunDir, { recursive: true });
    const intentAbs = path.join(absRunDir, "intent.md");
    fs.writeFileSync(intentAbs, "# Intent\n\nAbsolute path synthesis.\n");

    withTempDir("p2p2-decompose-adopt-abs-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Absolute Path Plan",
          criteria: ["Only criterion."],
          tasks: [taskBlock("Task 1 - do it", [1])],
          intentPath: intentAbs,
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      // normalised to the bare repo-relative run dir - no absolute prefix,
      // no backslashes, even when the plan's Intent: line carried both
      assert.match(result.stdout, new RegExp(`^workdir: ${runDir}$`, "m"));
      assert.ok(fs.existsSync(path.join(absRunDir, "plan-header.md")));
    });
  });
});

test("adoption fallback: neither Intent: nor Spec: sits under docs/.workflows/ -> the derived <date>-<slug> name is used", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-adopt-fallback-", (planDir) => {
      const intentFile = path.join(planDir, "intent.md");
      fs.writeFileSync(intentFile, "# Intent\n\nSynthesis.\n");
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Fallback Plan",
          criteria: ["Only criterion."],
          tasks: [taskBlock("Task 1 - do it", [1])],
          intentPath: intentFile,
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-fallback-plan`;
      assert.match(result.stdout, new RegExp(`^workdir: ${dir}$`, "m"));
      assert.ok(fs.statSync(path.join(repo.dir, dir)).isDirectory());
    });
  });
});

test("adoption survival: a failed run never deletes the adopted run directory or its pre-existing intent.md", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    const runDir = "docs/.workflows/2026-01-02-fails";
    fs.mkdirSync(path.join(repo.dir, runDir), { recursive: true });
    const intentRel = `${runDir}/intent.md`;
    const intentContent = "# Intent\n\nPre-existing, must survive.\n";
    fs.writeFileSync(path.join(repo.dir, intentRel), intentContent);

    withTempDir("p2p2-decompose-adopt-fail-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Adopted Failing Plan",
          criteria: ["Only criterion."],
          tasks: [], // no <!-- TASK --> blocks -> exit 3
          intentPath: intentRel,
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 3);
      assert.match(result.stderr, /error: no <!-- TASK --> blocks found in plan/);

      const absDir = path.join(repo.dir, runDir);
      assert.ok(fs.statSync(absDir).isDirectory());
      assert.equal(fs.readFileSync(path.join(absDir, "intent.md"), "utf-8"), intentContent);
    });
  });
});

// --- exit codes ------------------------------------------------------------

test("missing plan-file argument -> exit 1", () => {
  withGitRepo((repo) => {
    const result = run(repo, []);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing required parameter 'plan-file'/);
    assert.match(result.stderr, /usage: decompose\.sh <plan-file> \[commit-prefix\]/);
  });
});

test("nonexistent plan file -> exit 1", () => {
  withGitRepo((repo) => {
    const result = run(repo, [path.join(repo.dir, "does-not-exist.md")]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /plan file not found/);
  });
});

test("a referenced spec file that does not exist -> exit 4", () => {
  withGitRepo((repo) => {
    withTempDir("p2p2-decompose-spec-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        superPlan({
          title: "Broken Spec Plan",
          specPath: path.join(planDir, "missing-spec.md"),
          tasks: [taskBlock("Task 1 - do it", [1])],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 4);
      assert.match(result.stderr, /spec file not found/);
    });
  });
});

test("a task's 'Covers:' criterion absent from the source -> exit 5", () => {
  withGitRepo((repo) => {
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Bad Criteria Plan",
          criteria: ["Only one criterion exists."],
          tasks: [taskBlock("Task 1 - do it", [99])],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 5);
      assert.match(result.stderr, /covers criterion #99, absent from source/);
      // the error names the task by its heading title, not just the file name
      assert.match(result.stderr, /`Task 1 - do it`/);
    });
  });
});

test("guard: a task's 'Covers:' line in the titled grammar still decomposes and the criterion lands verbatim", () => {
  withGitRepo((repo) => {
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Titled Covers Plan",
          criteria: ["First criterion text."],
          tasks: [taskBlock("Task 1 - do it", "`First criterion` (#1)")],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-titled-covers-plan`;
      const task1Text = fs.readFileSync(path.join(repo.dir, dir, "tasks", "task-01.md"), "utf-8");
      assert.match(task1Text, /- Covers: `First criterion` \(#1\)/);
      assert.match(task1Text, /### Covered criteria\n1\. First criterion text\.\n$/);
    });
  });
});

test("task blocks with no task heading -> exit 6, one error line each, no index rows, no working directory", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      // both blocks open with "## Notes" - a heading, but not the
      // "## Task <N> - <title>" one the splitter reads the task's title from
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Headless Plan",
          criteria: ["One.", "Two."],
          tasks: [taskBlock("Notes", [1]), taskBlock("Notes", [2])],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 6);

      // one error line per offending block, each naming its own task file
      const errors = result.stderr
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.includes("has no task heading"));
      assert.deepEqual(errors, [
        "error: task-01.md has no task heading",
        "error: task-02.md has no task heading",
      ]);

      // the run aborts ahead of the index: not a single task row on stdout
      const dir = `docs/.workflows/${todayISO()}-headless-plan`;
      assert.deepEqual(
        result.stdout.split("\n").filter((l) => l.startsWith(`${dir}/tasks/`)),
        [],
      );
      // ... and the cleanup trap removes the directory this run created
      assert.equal(fs.existsSync(path.join(repo.dir, dir)), false);
    });
  });
});

test("a task title carrying a shell metacharacter -> exit 8, one error line each, no index rows, no working directory (both orchestrators spend the title as a double-quoted shell argument)", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Unsafe Title Plan",
          criteria: ["One.", "Two.", "Three."],
          tasks: [
            // the shape adr-task.md used to prescribe: the title in backticks
            taskBlock("Task 1 - Write ADR `Make clean builds reproducible`", [1]),
            taskBlock('Task 2 - say "hello"', [2]),
            taskBlock("Task 3 - harmless title", [3]),
          ],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 8);

      // one error line per offending block; the clean third task is not named
      const errors = result.stderr
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.includes("shell metacharacter"));
      assert.equal(errors.length, 2);
      assert.match(errors[0], /^error: task-01\.md title carries a shell metacharacter/);
      assert.match(errors[1], /^error: task-02\.md title carries a shell metacharacter/);

      // the run aborts ahead of the index: not a single task row on stdout
      const dir = `docs/.workflows/${todayISO()}-unsafe-title-plan`;
      assert.deepEqual(
        result.stdout.split("\n").filter((l) => l.startsWith(`${dir}/tasks/`)),
        [],
      );
      assert.equal(fs.existsSync(path.join(repo.dir, dir)), false);
    });
  });
});

test("a task title carrying a dollar sign or a backslash is refused too, and an apostrophe is not (it is safe inside double quotes)", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const unsafe = path.join(planDir, "unsafe.md");
      fs.writeFileSync(
        unsafe,
        simplePlan({
          title: "Dollar Plan",
          criteria: ["One.", "Two."],
          tasks: [taskBlock("Task 1 - read $HOME", [1]), taskBlock("Task 2 - escape a \\ backslash", [2])],
        }),
      );
      const unsafeResult = run(repo, [unsafe]);
      assert.equal(unsafeResult.status, 8);
      assert.equal(
        unsafeResult.stderr.split("\n").filter((l) => l.includes("shell metacharacter")).length,
        2,
      );

      const safe = path.join(planDir, "safe.md");
      fs.writeFileSync(
        safe,
        simplePlan({
          title: "Apostrophe Plan",
          criteria: ["One."],
          tasks: [taskBlock("Task 1 - fix the user's profile", [1])],
        }),
      );
      const safeResult = run(repo, [safe]);
      assert.equal(safeResult.status, 0);
      assert.match(safeResult.stdout, /\tTask 1 - fix the user's profile\t/);
    });
  });
});

test("a conforming task heading below a prose line is not the block's opening -> exit 6", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      // the heading is present and well-formed, but a prose line precedes it:
      // only the block's FIRST non-empty line may carry the task's title
      const lateHeadingBlock = [
        "<!-- TASK -->",
        "",
        "A note that slipped in above the heading.",
        "",
        "## Task 1 - do it",
        "- Covers: #1",
        "Do the work.",
        "<!-- /TASK -->",
        "",
      ].join("\n");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Late Heading Plan",
          criteria: ["One."],
          tasks: [lateHeadingBlock],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 6);
      assert.match(result.stderr, /error: task-01\.md has no task heading/);
      const dir = `docs/.workflows/${todayISO()}-late-heading-plan`;
      assert.equal(fs.existsSync(path.join(repo.dir, dir)), false);
    });
  });
});

test("the heading's <N> is not checked against the file index: a mismatched number still decomposes", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      // "## Task 7 ..." in the FIRST block: the heading shape is all the
      // splitter requires - pairing <N> with the file index is not its job
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Renumbered Plan",
          criteria: ["One."],
          tasks: [taskBlock("Task 7 - do it", [1])],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-renumbered-plan`;
      const rows = result.stdout.split("\n").filter((l) => l.startsWith(`${dir}/tasks/`));
      assert.deepEqual(rows, [`${dir}/tasks/task-01.md\tTask 7 - do it\t-\t-\tno`]);
    });
  });
});

// --- no orphaned working directory on failure -------------------------

test("exit 3 (no TASK blocks): no working directory is left behind", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "No Tasks Plan",
          criteria: ["One."],
          tasks: [],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 3);
      assert.match(result.stderr, /error: no <!-- TASK --> blocks found in plan/);
      const dir = `docs/.workflows/${todayISO()}-no-tasks-plan`;
      assert.equal(fs.existsSync(path.join(repo.dir, dir)), false);
    });
  });
});

test("exit 4 (missing spec file): no working directory is left behind", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-spec-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        superPlan({
          title: "Broken Spec Orphan Plan",
          specPath: path.join(planDir, "missing-spec.md"),
          tasks: [taskBlock("Task 1 - do it", [1])],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 4);
      const dir = `docs/.workflows/${todayISO()}-broken-spec-orphan-plan`;
      assert.equal(fs.existsSync(path.join(repo.dir, dir)), false);
    });
  });
});

test("resume safety: the failure trap never removes a working directory that pre-existed the run", () => {
  withGitRepo((repo) => {
    const base = seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Resume Safety Plan",
          criteria: ["One."],
          tasks: [taskBlock("Task 1 - do it", [1])],
        }),
      );

      const first = run(repo, [plan]);
      assert.equal(first.status, 0, `stderr: ${first.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-resume-safety-plan`;
      const absDir = path.join(repo.dir, dir);
      assert.ok(fs.statSync(absDir).isDirectory());

      // re-run with the SAME title but the task blocks removed -> exit 3
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Resume Safety Plan",
          criteria: ["One."],
          tasks: [],
        }),
      );
      const second = run(repo, [plan]);
      assert.equal(second.status, 3);

      // the pre-existing working directory survives, status/base untouched
      assert.ok(fs.statSync(absDir).isDirectory());
      assert.equal(fs.readFileSync(path.join(absDir, "status.md"), "utf-8"), "task: 00\n");
      assert.equal(fs.readFileSync(path.join(absDir, "base.md"), "utf-8"), `base: ${base}\n`);
    });
  });
});

// --- edge cases --------------------------------------------------------

test("edge: an unborn HEAD (no commits yet) resolves base to 'none' and still commits", () => {
  withGitRepo((repo) => {
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Unborn Head Plan",
          criteria: ["One."],
          tasks: [taskBlock("Task 1 - do it", [1])],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^base: none$/m);
      const dir = `docs/.workflows/${todayISO()}-unborn-head-plan`;
      assert.equal(fs.readFileSync(path.join(repo.dir, dir, "base.md"), "utf-8"), "base: none\n");
      // the decomposition commit becomes the repo's first (root) commit
      assert.equal(subjectOf(repo), "chore(simplebuild): decompose plan unborn-head-plan");
    });
  });
});

test("edge: outside a git repository the tree is built and the commit is skipped, exit 0", () => {
  withTempDir("p2p2-decompose-nonrepo-", (projectDir) => {
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "No Git Plan",
          criteria: ["One."],
          tasks: [taskBlock("Task 1 - do it", [1])],
        }),
      );
      // no repo.env here on purpose: a bare temp dir is not a git repository,
      // so `git rev-parse --git-dir` fails and the commit section must bail out.
      const result = runScript(SUT, [plan], { cwd: projectDir, shell: "bash" });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stderr, /decompose: not a git repository - skipping commit/);
      assert.match(result.stdout, /^base: none$/m);

      // the decomposition itself is complete and SURVIVES - the cleanup trap is
      // disarmed before the commit section, so nothing rolls the working dir back.
      const dir = `docs/.workflows/${todayISO()}-no-git-plan`;
      const absDir = path.join(projectDir, dir);

      // no repository root to move to: root: falls back to the absolute cwd -
      // and in the NATIVE spelling, because the orchestrator joins it with this
      // index's relative paths and hands the result to workers that open files
      // directly, not through a shell. Asserted by opening it exactly that way:
      // under Git-Bash `pwd` alone prints "/c/Users/..." and the join below
      // resolves nowhere.
      const root = indexValue(result.stdout, "root");
      assert.ok(root, `expected a root: line in:\n${result.stdout}`);
      assert.ok(
        fs.existsSync(path.join(root as string, dir, "status.md")),
        `root: is not readable as a path: ${root}`,
      );
      assert.match(result.stdout, new RegExp(`^workdir: ${dir}$`, "m"));
      assert.equal(fs.readFileSync(path.join(absDir, "status.md"), "utf-8"), "task: 00\n");
      assert.equal(fs.readFileSync(path.join(absDir, "base.md"), "utf-8"), "base: none\n");
      assert.ok(fs.existsSync(path.join(absDir, "plan-header.md")));
      assert.ok(fs.existsSync(path.join(absDir, "plan.md")));
      assert.match(fs.readFileSync(path.join(absDir, "tasks", "task-01.md"), "utf-8"), /## Task 1 - do it/);
    });
  });
});

test("edge: a plan title that slugifies to an empty string falls back to the 'plan' slug", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "??? !!!",
          criteria: ["One."],
          tasks: [taskBlock("Task 1 - do it", [1])],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-plan`;
      assert.match(result.stdout, new RegExp(`^workdir: ${dir}$`, "m"));
      assert.ok(fs.statSync(path.join(repo.dir, dir)).isDirectory());
    });
  });
});

test("edge: two runs on the same day for the same plan produce the same <date>-<slug> dir, preserving status/base on resume", () => {
  withGitRepo((repo) => {
    const base = seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Resumable Plan",
          criteria: ["One.", "Two."],
          tasks: [taskBlock("Task 1 - do it", [1]), taskBlock("Task 2 - do it too", [2])],
        }),
      );

      const first = run(repo, [plan]);
      assert.equal(first.status, 0, `stderr: ${first.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-resumable-plan`;
      const absDir = path.join(repo.dir, dir);

      // simulate a completed task 1 (what status-update.sh would have done)
      fs.writeFileSync(path.join(absDir, "status.md"), "task: 01\n");

      const second = run(repo, [plan]);
      assert.equal(second.status, 0, `stderr: ${second.stderr}`);
      assert.match(second.stdout, new RegExp(`^workdir: ${dir}$`, "m"));
      // resumed status/base are surfaced and preserved, not reset
      assert.match(second.stdout, /^status: 01$/m);
      assert.equal(fs.readFileSync(path.join(absDir, "status.md"), "utf-8"), "task: 01\n");
      assert.equal(fs.readFileSync(path.join(absDir, "base.md"), "utf-8"), `base: ${base}\n`);
      // tasks/ is refreshed on every run
      assert.ok(fs.existsSync(path.join(absDir, "tasks", "task-02.md")));
    });
  });
});

test("edge: a plan file with CRLF line endings still resolves the happy path", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      const content = simplePlan({
        title: "CRLF Plan",
        criteria: ["One."],
        tasks: [taskBlock("Task 1 - do it", [1])],
      }).replace(/\n/g, "\r\n");
      fs.writeFileSync(plan, content);

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-crlf-plan`;
      assert.ok(fs.existsSync(path.join(repo.dir, dir, "tasks", "task-01.md")));
      assert.match(result.stdout, /Task 1 - do it/);
    });
  });
});

test("edge: a task title containing a tab breaks the tab-separated index row (documented, not fixed)", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Tabbed Title Plan",
          criteria: ["One."],
          // the tab sits INSIDE the title of an otherwise conforming
          // "## Task <N> - <title>" heading - the shape the splitter requires
          tasks: [taskBlock("Task 1 - Tab\tbed", [1])],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-tabbed-title-plan`;
      const indexLine = result.stdout.split("\n").find((l) => l.startsWith(`${dir}/tasks/task-01.md`));
      assert.ok(indexLine, `expected the task-01 index row, got:\n${result.stdout}`);
      // tabs separate path, title, model, review and concurrent in the
      // well-formed case (5 fields); the embedded tab in the title itself
      // yields a SIXTH field, breaking any \t-split parse.
      assert.equal(indexLine!.split("\t").length, 6);
    });
  });
});

test("task Model:/Review: markers land verbatim in the index columns, an Effort: line is body text only; a task without them prints '-'", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Marked Plan",
          criteria: ["One.", "Two.", "Three."],
          tasks: [
            taskBlock(
              "Task 1 - marked",
              [1],
              "- TDD: none\n- Model: sonnet\n- Effort: xhigh  \n- Review: sonnet high\nDo the work.",
            ),
            taskBlock("Task 2 - unmarked", [2]),
            // an empty "- Review:" value is an absent marker: the column reads "-"
            taskBlock("Task 3 - empty review", [3], "- Model: opus\n- Effort: low\n- Review:\nDo the work."),
          ],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-marked-plan`;
      const rows = result.stdout.split("\n").filter((l) => l.startsWith(`${dir}/tasks/`));
      assert.deepEqual(rows, [
        `${dir}/tasks/task-01.md\tTask 1 - marked\tsonnet\tsonnet high\tno`,
        `${dir}/tasks/task-02.md\tTask 2 - unmarked\t-\t-\tno`,
        `${dir}/tasks/task-03.md\tTask 3 - empty review\topus\t-\tno`,
      ]);
      // the marker lines stay in the task file - the implementor reads them there
      // too, the Effort: line included, which the index never carries
      const task1Text = fs.readFileSync(path.join(repo.dir, dir, "tasks", "task-01.md"), "utf-8");
      assert.match(task1Text, /^- Model: sonnet$/m);
      assert.match(task1Text, /^- Effort: xhigh/m);
      assert.match(task1Text, /^- Review: sonnet high$/m);
    });
  });
});

// --- the concurrent column -------------------------------------------------
// The fifth index column is DERIVED, never read from a marker: it says whether
// a task may be started while the PRECEDING task is still under review, so the
// build orchestrator never judges that itself.

test("the concurrent column: an independent successor reads yes, a dependent one and a file-sharing one read no, and task 1 always reads no", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-concurrent-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Concurrent Plan",
          criteria: ["One.", "Two.", "Three.", "Four."],
          tasks: [
            // task 1 has no preceding review to overlap with, however complete
            taskBlock("Task 1 - foundation", [1], taskSections({ deps: [], files: ["src/a.ts (widget)"] })),
            // no dependency on task 1 and no file shared with it; the "(Task 1)"
            // in ### Approach is prose - only the ### Dependencies section feeds
            // the dependency capture
            taskBlock(
              "Task 2 - independent",
              [2],
              taskSections({
                deps: [],
                files: ["src/b.ts (gadget)"],
                approach: "1. Mirror what (Task 1) did, in this file.",
              }),
            ),
            // the pointer is zero-padded on purpose: "(Task 02)" names task 2
            // exactly as "(Task 2)" does
            taskBlock("Task 3 - dependent", [3], taskSections({ deps: ["02"], files: ["src/c.ts (thing)"] })),
            // no declared dependency, but src/c.ts is task 3's file too
            taskBlock(
              "Task 4 - file sharing",
              [4],
              taskSections({ deps: [], files: ["src/d.ts (other)", "src/c.ts (thing)"] }),
            ),
          ],
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-concurrent-plan`;
      const rows = result.stdout.split("\n").filter((l) => l.startsWith(`${dir}/tasks/`));
      assert.deepEqual(rows, [
        `${dir}/tasks/task-01.md\tTask 1 - foundation\t-\t-\tno`,
        `${dir}/tasks/task-02.md\tTask 2 - independent\t-\t-\tyes`,
        `${dir}/tasks/task-03.md\tTask 3 - dependent\t-\t-\tno`,
        `${dir}/tasks/task-04.md\tTask 4 - file sharing\t-\t-\tno`,
      ]);
    });
  });
});

test("the concurrent column reads no for a task missing either section, and for one whose PREDECESSOR carries no '### Files' (incomplete task text never qualifies)", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-concurrent-partial-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Partial Sections Plan",
          criteria: ["One.", "Two.", "Three.", "Four.", "Five."],
          tasks: [
            taskBlock("Task 1 - complete", [1], taskSections({ deps: [], files: ["src/a.ts"] })),
            // no ### Dependencies section at all
            taskBlock("Task 2 - no dependencies section", [2], taskSections({ files: ["src/b.ts"] })),
            // no ### Files section at all
            taskBlock("Task 3 - no files section", [3], taskSections({ deps: [] })),
            // complete itself, but the overlap with task 3 is unknowable
            taskBlock("Task 4 - complete after a fileless one", [4], taskSections({ deps: [], files: ["src/d.ts"] })),
            // the control: the same shape, this time after a complete task
            taskBlock("Task 5 - complete after a complete one", [5], taskSections({ deps: [], files: ["src/e.ts"] })),
          ],
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-partial-sections-plan`;
      const rows = result.stdout.split("\n").filter((l) => l.startsWith(`${dir}/tasks/`));
      assert.deepEqual(rows, [
        `${dir}/tasks/task-01.md\tTask 1 - complete\t-\t-\tno`,
        `${dir}/tasks/task-02.md\tTask 2 - no dependencies section\t-\t-\tno`,
        `${dir}/tasks/task-03.md\tTask 3 - no files section\t-\t-\tno`,
        `${dir}/tasks/task-04.md\tTask 4 - complete after a fileless one\t-\t-\tno`,
        `${dir}/tasks/task-05.md\tTask 5 - complete after a complete one\t-\t-\tyes`,
      ]);
    });
  });
});

test("a non-literal '### Files' path is compared as the token it stands as: two identical placeholders overlap, two different ones do not", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-concurrent-nonliteral-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Placeholder Paths Plan",
          criteria: ["One.", "Two.", "Three."],
          tasks: [
            taskBlock("Task 1 - placeholder", [1], taskSections({ deps: [], files: ["src/<module>/thing.ts"] })),
            // byte-identical to task 1's token -> an overlap, so "no"
            taskBlock("Task 2 - same placeholder", [2], taskSections({ deps: [], files: ["src/<module>/thing.ts"] })),
            // a different token -> no overlap the script can see, so "yes"
            taskBlock("Task 3 - other placeholder", [3], taskSections({ deps: [], files: ["src/<other>/thing.ts"] })),
          ],
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-placeholder-paths-plan`;
      const rows = result.stdout.split("\n").filter((l) => l.startsWith(`${dir}/tasks/`));
      assert.deepEqual(rows, [
        `${dir}/tasks/task-01.md\tTask 1 - placeholder\t-\t-\tno`,
        `${dir}/tasks/task-02.md\tTask 2 - same placeholder\t-\t-\tno`,
        `${dir}/tasks/task-03.md\tTask 3 - other placeholder\t-\t-\tyes`,
      ]);
    });
  });
});

test("the ' (<symbol>)' annotation is cut before paths are compared: the same directory under two different annotations still overlaps", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-concurrent-annotated-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Annotated Paths Plan",
          criteria: ["One.", "Two."],
          tasks: [
            taskBlock(
              "Task 1 - first migration",
              [1],
              taskSections({ deps: [], files: ["src/Migrations/ (EF migration + designer)"] }),
            ),
            taskBlock(
              "Task 2 - second migration",
              [2],
              taskSections({ deps: [], files: ["src/Migrations/ (a second migration)"] }),
            ),
          ],
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-annotated-paths-plan`;
      const rows = result.stdout.split("\n").filter((l) => l.startsWith(`${dir}/tasks/`));
      assert.deepEqual(rows, [
        `${dir}/tasks/task-01.md\tTask 1 - first migration\t-\t-\tno`,
        `${dir}/tasks/task-02.md\tTask 2 - second migration\t-\t-\tno`,
      ]);
    });
  });
});

test("whole-line markers: a task body quoting the TASK markers in prose still decomposes into the real block count", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const plan = path.join(planDir, "plan.md");
      // the line this anchoring is about: a task whose body talks about the
      // markers. Matched unanchored, the backticked mention opened a third
      // block and the run produced a phantom index row with an empty title.
      const quoted = "The splitter opens a block on `<!-- TASK -->` and closes it on `<!-- /TASK -->`.";
      const quotingBlock = [
        // trailing spaces on the opening marker: it is still the whole line, so
        // the block opens exactly as it does without them
        "<!-- TASK -->   ",
        "",
        "## Task 1 - write about the markers",
        "- Covers: #1",
        quoted,
        "<!-- /TASK -->",
        "",
      ].join("\n");
      fs.writeFileSync(
        plan,
        simplePlan({
          title: "Marker Prose Plan",
          criteria: ["One.", "Two."],
          tasks: [quotingBlock, taskBlock("Task 2 - ship it", [2])],
        }),
      );

      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      const dir = `docs/.workflows/${todayISO()}-marker-prose-plan`;
      const absTasks = path.join(repo.dir, dir, "tasks");

      // exactly two real blocks -> two task files and two index rows, both titled
      assert.deepEqual(fs.readdirSync(absTasks).sort(), ["task-01.md", "task-02.md"]);
      const rows = result.stdout.split("\n").filter((l) => l.startsWith(`${dir}/tasks/`));
      assert.deepEqual(rows, [
        `${dir}/tasks/task-01.md\tTask 1 - write about the markers\t-\t-\tno`,
        `${dir}/tasks/task-02.md\tTask 2 - ship it\t-\t-\tno`,
      ]);

      // the quoted line is ordinary content: verbatim in the task file, opening nothing
      const task1Text = fs.readFileSync(path.join(absTasks, "task-01.md"), "utf-8");
      assert.ok(
        task1Text.split("\n").includes(quoted),
        `expected the quoted marker line verbatim in task-01.md, got:\n${task1Text}`,
      );
      assert.match(task1Text, /### Covered criteria\n1\. One\.\n$/);
    });
  });
});

// --- reviewed-plan guard: the `<plan>.sha256` sidecar the ExitPlanMode hook
// writes binds the build to the bytes the plan reviewer approved. ---

function sha256Hex(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function reviewedPlanFixture(planDir: string): { plan: string; sidecar: string } {
  const plan = path.join(planDir, "plan.md");
  fs.writeFileSync(
    plan,
    simplePlan({
      title: "Reviewed Plan",
      criteria: ["One."],
      tasks: [taskBlock("Task 1 - do it", [1])],
    }),
  );
  return { plan, sidecar: `${plan}.sha256` };
}

test("a sidecar whose digest matches the plan's bytes decomposes silently (no hash warning, exit 0)", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const { plan, sidecar } = reviewedPlanFixture(planDir);
      fs.writeFileSync(sidecar, `${sha256Hex(plan)}\n`);
      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.doesNotMatch(result.stderr, /reviewed hash|reviewed plan|sha256/);
      const dir = `docs/.workflows/${todayISO()}-reviewed-plan`;
      assert.ok(fs.existsSync(path.join(repo.dir, dir, "tasks", "task-01.md")));
    });
  });
});

test("a sidecar whose digest differs from the plan's bytes refuses with exit 7 naming the sidecar, and creates no working dir (a plan edited after its approval is never built as approved)", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const { plan, sidecar } = reviewedPlanFixture(planDir);
      // the digest of the plan as it stood BEFORE an edit
      fs.writeFileSync(sidecar, `${sha256Hex(plan)}\n`);
      fs.appendFileSync(plan, "\nAn edit the reviewer never saw.\n");
      const result = run(repo, [plan]);
      assert.equal(result.status, 7, `stdout: ${result.stdout}\nstderr: ${result.stderr}`);
      assert.match(result.stderr, /error: plan differs from the reviewed plan \(/);
      // the message names the sidecar by the path the SCRIPT resolved, so its
      // spelling is the shell's: under Git-Bash the Node temp root comes back
      // as "/tmp/<name>" where Node spells it "C:/Users/.../Temp/<name>" - the
      // same directory, and an equality on either form fails on one platform.
      // The two trailing segments are what both spellings share.
      const sidecarTail = `${path.basename(planDir)}/${path.basename(sidecar)}`;
      assert.ok(
        slash(result.stderr).includes(sidecarTail),
        `stderr must name the sidecar (${sidecarTail}):\n${result.stderr}`,
      );
      assert.match(result.stderr, /re-run the plan reviewer and ExitPlanMode/);
      assert.equal(result.stdout, "");
      assert.ok(!fs.existsSync(path.join(repo.dir, "docs", ".workflows")), "no working dir may be created on a refusal");
      assert.equal(subjectOf(repo), "seed");
    });
  });
});

test("no sidecar beside the plan decomposes with a stderr warning naming the absent sidecar (exit 0 - a plan that never went through the hook stays buildable)", () => {
  withGitRepo((repo) => {
    seedInitialCommit(repo);
    withTempDir("p2p2-decompose-plan-", (planDir) => {
      const { plan, sidecar } = reviewedPlanFixture(planDir);
      assert.ok(!fs.existsSync(sidecar));
      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stderr, /warning: no reviewed hash beside the plan \(.*absent\) - decomposing an unverified plan/);
      const dir = `docs/.workflows/${todayISO()}-reviewed-plan`;
      assert.ok(fs.existsSync(path.join(repo.dir, dir, "tasks", "task-01.md")));
    });
  });
});
