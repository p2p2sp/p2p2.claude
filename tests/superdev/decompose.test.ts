/*
 * decompose.test.ts - proves decompose.sh's plan -> working-dir contract:
 * `decompose.sh <plan-file> [commit-prefix]` builds
 * docs/.workflows/<date>-<slug>/{plan-header.md,plan.md,status.md,base.md,
 * tasks/task-NN.md,implementation/}, prints a clean stdout index (all git
 * noise on stderr), commits the decomposition - skipping only that commit, and
 * keeping the built tree, outside a git repository - and exits 1/4/5 on its
 * documented error paths.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/decompose.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir, withGitRepo, type GitRepo } from "../harness/tmp.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/decompose.sh");

// --- fixture builders ---------------------------------------------------

function acceptanceCriteria(items: string[]): string {
  return items.map((text, i) => `${i + 1}. ${text}`).join("\n");
}

function taskBlock(heading: string, covers: number[], body = "Do the work."): string {
  return ["<!-- TASK -->", "", `## ${heading}`, `- Covers: #${covers.join(", #")}`, body, "<!-- /TASK -->", ""].join(
    "\n",
  );
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

// decompose.sh ships mode 100644 (git ls-files) - every SKILL.md invokes it
// explicitly as `bash "${CLAUDE_PLUGIN_ROOT}/scripts/decompose.sh" ...`, never
// bare, so the portability sweep does not require an exec bit here; the
// harness must invoke it the same way.
function run(repo: GitRepo, args: string[]): RunResult {
  return runScript(SUT, args, { cwd: repo.dir, env: repo.env, shell: "bash" });
}

function subjectOf(repo: GitRepo): string {
  return repo.git("log", "-1", "--format=%s").stdout.trim();
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
          "status: none",
          `base: ${base}`,
          `plan-header: ${header}`,
          `plan: ${planCopy}`,
          `${task1}\tTask 1 - build widget`,
          `${task2}\tTask 2 - ship widget`,
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
          tasks: [taskBlock("Task 1\tTabbed", [1])],
        }),
      );
      const result = run(repo, [plan]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const dir = `docs/.workflows/${todayISO()}-tabbed-title-plan`;
      const indexLine = result.stdout.split("\n").find((l) => l.startsWith(`${dir}/tasks/task-01.md`));
      assert.ok(indexLine, `expected the task-01 index row, got:\n${result.stdout}`);
      // one tab separates path from title in the well-formed case; the embedded
      // tab in the title itself yields a THIRD field, breaking any \t-split parse.
      assert.equal(indexLine!.split("\t").length, 3);
    });
  });
});
