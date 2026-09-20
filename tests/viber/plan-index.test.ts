/*
 * plan-index.test.ts - proves viber/scripts/plan-index.sh's two contracts.
 *
 * `plan-index.sh <plan>` validates the plan's structure and prints the compact
 * index that is the orchestrator's WHOLE view of it - the skill carries
 * `disallowed-tools: Read`, so a plan defect this script lets through is a
 * defect nothing else in the track can see. A non-zero exit must print nothing
 * on stdout and leave nothing on disk.
 *
 * That index is also what a session which did not start the build resumes from:
 * the run's own status.md (`done`, `skipped`, `unreviewed`, `closed`) passes through, and a
 * `dirty:` line names a task whose files carry uncommitted work from a session
 * that was cut off inside it. A missing dirty line sends a fresh coder onto
 * another one's half-finished work.
 *
 * `plan-index.sh <plan> --split` additionally decomposes the plan in place:
 * `spec.md` (everything above `## Tasks`) plus one `tasks/<id>.md` per task,
 * carrying the block verbatim, the plan's goal, the text of the criteria its
 * `Covers:` line names, the contract blocks its `Uses:` line names and the plan's
 * out-of-scope list. That file IS a coder's WHOLE input - it gets no `spec:` line
 * at all - so a task file that loses a field, loses a contract or picks up a
 * neighbour's is silent, uncatchable drift.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/plan-index.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/plan-index.sh");

/** The dated run directory plan-path.sh owns; the decomposition lands beside the plan. */
const PLAN_DIR = "docs/_specs/2026-09-20-10-00-00_add-login";
const PLAN_REL = `${PLAN_DIR}/plan.md`;

function run(dir: string, env: Record<string, string>, args: string[]) {
  return runScript(SUT, args, { cwd: dir, env, shell: "bash" });
}

function write(root: string, rel: string, content: string): void {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

interface TaskFields {
  id?: string;
  title?: string;
  tdd?: string;
  covers?: string;
  /** `null` omits the line entirely - the shape a plan written before `Uses:` has. */
  uses?: string | null;
  deps?: string;
  files?: string;
}

/** The `## Contracts` appendix every default task names through `Uses: C1`. It
 *  sits BELOW the tasks, so it never reaches spec.md - only the task files whose
 *  `Uses:` line asks for it. */
const CONTRACT = ["### C1 - Login endpoint", "", "POST /login -> 200 | 401", "", "Body: `{ user, pass }`"];

/** A plan in the template's shape. The header carries two acceptance criteria,
 *  the first of them wrapped over two lines - a criterion's continuation is
 *  part of its text and has to reach the task file with it. */
function planBody(tasks: TaskFields[], criteria = 2, contracts: string[] = CONTRACT): string {
  const crit = [
    "1. A user with valid credentials gets a session.",
    "   The session survives a reload.",
    "2. An invalid password is rejected.",
  ].slice(0, criteria === 1 ? 2 : 3);
  return [
    "# Add login",
    "",
    "## Goal",
    "",
    "Users can log in.",
    "The session is durable.",
    "",
    "## Acceptance criteria",
    "",
    ...crit,
    "",
    "## Scope",
    "",
    "### File map",
    "",
    "- add - src/login.ts - the handler",
    "",
    "### Out of scope",
    "",
    "- Password reset.",
    "- OAuth.",
    "",
    "## Tasks",
    "",
    ...tasks.flatMap((t) => [
      "<!-- TASK -->",
      `### ${t.id ?? "T1"} - ${t.title ?? "do the thing"}`,
      `- TDD: ${t.tdd ?? "required"}`,
      `- Covers: ${t.covers ?? "#1"}`,
      ...(t.uses === null ? [] : [`- Uses: ${t.uses ?? "C1"}`]),
      `- Depends-on: ${t.deps ?? "none"}`,
      `- Files: ${t.files ?? "src/a.ts"}`,
      "- Delivers: the thing",
      "- Verification: npm test -> green",
      "- DoD: it works",
      "<!-- /TASK -->",
      "",
    ]),
    ...(contracts.length ? ["## Contracts", "", ...contracts, ""] : []),
  ].join("\n");
}

/** T1 names the one contract block, T2 names none: the split has to be selective. */
const TWO_TASKS: TaskFields[] = [
  { id: "T1", title: "Add the login handler", files: "src/login.ts" },
  {
    id: "T2",
    title: "Reject a bad password",
    covers: "#2",
    uses: "none",
    deps: "T1",
    files: "src/reject.ts",
  },
];

function seed(dir: string, body: string): void {
  write(dir, PLAN_REL, body);
}

/** The run's state file, as --split writes it and commit-task.sh advances it.
 *  Every key is optional here: what the file does not carry is simply not set. */
function seedStatus(dir: string, entries: Record<string, string>): void {
  write(
    dir,
    `${PLAN_DIR}/status.md`,
    ["# status", "", ...Object.entries(entries).map(([k, v]) => `${k}: ${v}`), ""].join("\n"),
  );
}

function readRun(dir: string, rel: string): string {
  return fs.readFileSync(path.join(dir, PLAN_DIR, rel), "utf-8");
}

function taskFiles(dir: string): string[] {
  const tasks = path.join(dir, PLAN_DIR, "tasks");
  return fs.existsSync(tasks) ? fs.readdirSync(tasks).sort() : [];
}

// --- the index -------------------------------------------------------------

test("the index carries one row per task: id, state, TDD marker, normalised deps, files and title", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      [
        `plan: ${PLAN_REL}`,
        "title: Add login",
        "progress: 0/2",
        "tasks: id | state | tdd | deps | files | title",
        "T1 | todo | required | - | src/login.ts | Add the login handler",
        "T2 | todo | required | T1 | src/reject.ts | Reject a bad password",
        "",
      ].join("\n"),
    );
  });
});

test("state and the progress counter come from the run's own status.md, which is how a build resumes", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));
    seedStatus(dir, { progress: "1/2", done: "T1" });

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^progress: 1\/2$/m);
    assert.match(result.stdout, /^T1 \| done \|/m);
    assert.match(result.stdout, /^T2 \| todo \|/m);
  });
});

test("the status file's other entries pass through, and a skipped task is settled rather than todo", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));
    seedStatus(dir, { progress: "1/2", done: "T1", skipped: "T2", unreviewed: "T1", closed: "memory qa" });

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^progress: 1\/2$/m);
    assert.match(result.stdout, /^skipped: T2$/m);
    assert.match(result.stdout, /^unreviewed: T1$/m);
    assert.match(result.stdout, /^closed: memory qa$/m);
    assert.match(result.stdout, /^T2 \| skipped \|/m);
  });
});

test("a run whose status file carries none of those entries reports none of them, so a run that needed no decision stays quiet", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));
    seedStatus(dir, { progress: "0/2", done: "none", skipped: "none", unreviewed: "none", closed: "none" });

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    for (const line of [/^skipped:/m, /^unreviewed:/m, /^closed:/m, /^dirty:/m]) {
      assert.doesNotMatch(result.stdout, line);
    }
  });
});

test("a plan with no status file beside it reports nothing done, which is the state of a run that never started", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^progress: 0\/2$/m);
    assert.match(result.stdout, /^T1 \| todo \|/m);
    for (const line of [/^skipped:/m, /^unreviewed:/m, /^closed:/m]) {
      assert.doesNotMatch(result.stdout, line);
    }
  });
});

test("a task whose own files carry uncommitted work is reported dirty - that is a session cut off mid-task", () => {
  withGitRepo((repo) => {
    seed(repo.dir, planBody(TWO_TASKS));
    write(repo.dir, "src/login.ts", "committed\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "seed");

    // T1's file edited but not committed, T2's created but never staged
    write(repo.dir, "src/login.ts", "half a coder's work\n");
    write(repo.dir, "src/reject.ts", "and another\n");

    const result = run(repo.dir, repo.env, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^dirty: T1 \| src\/login\.ts$/m);
    assert.match(result.stdout, /^dirty: T2 \| src\/reject\.ts$/m);
    // the state itself still comes from the plan, never from the tree
    assert.match(result.stdout, /^T1 \| todo \|/m);
  });
});

test("a clean tree reports no dirty line, so a build that starts normally sees no resume noise", () => {
  withGitRepo((repo) => {
    seed(repo.dir, planBody(TWO_TASKS));
    write(repo.dir, "src/login.ts", "committed\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "seed");

    const result = run(repo.dir, repo.env, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.doesNotMatch(result.stdout, /^dirty:/m);
  });
});

// --- validation ------------------------------------------------------------

test("a missing argument, a missing plan and an unknown second argument all exit 2 with nothing on stdout", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));

    for (const args of [[], ["docs/_specs/nope/plan.md"], [PLAN_REL, "--decompose"]]) {
      const result = run(dir, {}, args);
      assert.equal(result.status, 2, `args ${JSON.stringify(args)} -> stderr: ${result.stderr}`);
      assert.equal(result.stdout, "");
    }
  });
});

test("--split refuses any plan but the run's own <dir>/plan.md - it rebuilds <dir>/tasks and would delete a real one", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // the exact shape that would cost a project its own tasks/ directory:
    // a plan sitting loose in the repository root
    write(dir, "plan.md", planBody(TWO_TASKS));
    write(dir, "tasks/keep.txt", "a directory this project owns\n");
    write(dir, `${PLAN_DIR}/steps.md`, planBody(TWO_TASKS));

    for (const rel of ["plan.md", `${PLAN_DIR}/steps.md`]) {
      const result = run(dir, {}, [rel, "--split"]);
      assert.equal(result.status, 2, `${rel} -> stdout: ${result.stdout}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /--split expects the run/);
    }

    assert.deepEqual(fs.readdirSync(path.join(dir, "tasks")), ["keep.txt"]);
  });
});

test("a plan with no task blocks exits 3", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody([]).replace(/<!-- \/?TASK -->/g, ""));

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 3);
    assert.equal(result.stdout, "");
  });
});

test("a broken task contract exits 4 and names the task", () => {
  const cases: Array<[string, TaskFields[], RegExp, string[]?]> = [
    [
      "duplicate id",
      [
        { id: "T1", files: "src/a.ts" },
        { id: "T1", files: "src/b.ts" },
      ],
      /duplicate task id: T1/,
    ],
    [
      "an id that is not a bare token - it names the task file",
      [{ id: "T 1/x", files: "src/a.ts" }],
      /task id "T 1\/x"/,
    ],
    ["a Covers pointing at a criterion that does not exist", [{ id: "T1", covers: "#9" }], /Covers #9/],
    [
      "a task with no Uses line - the one a plan written before the field looks like",
      [{ id: "T1", uses: null }],
      /task T1: missing Uses/,
    ],
    [
      "a Uses pointing at a contract block that does not exist",
      [{ id: "T1", uses: "C9" }],
      /task T1: Uses C9, no such contract block/,
    ],
    ["a glob in Files", [{ id: "T1", files: "src/*.ts" }], /is a glob/],
    ["a directory in Files", [{ id: "T1", files: "src/" }], /is a directory/],
    ["a TDD marker that is neither required nor none", [{ id: "T1", tdd: "maybe" }], /TDD must be/],
    [
      "a dependency pointing forward",
      [
        { id: "T1", deps: "T2", files: "src/a.ts" },
        { id: "T2", files: "src/b.ts" },
      ],
      /must reference an earlier task/,
    ],
    [
      "two tasks with no dependency path between them claiming the same file",
      [
        { id: "T1", files: "src/a.ts" },
        { id: "T2", files: "src/a.ts" },
      ],
      /both list src\/a\.ts/,
    ],
    [
      "two contract blocks sharing an id - the id is what a Uses line resolves",
      [{ id: "T1" }],
      /duplicate contract id: C1/,
      [...CONTRACT, "", "### C1 - Login endpoint again", "", "POST /login -> 204"],
    ],
    [
      "a contract heading with no id in front of the name",
      [{ id: "T1", uses: "none" }],
      /contract heading must be "### <id> - <name>", got: Login endpoint/,
      ["### Login endpoint", "", "POST /login -> 200 | 401"],
    ],
  ];

  for (const [name, tasks, expected, contracts] of cases) {
    withTempDir("p2p2-viber-", (dir) => {
      // one criterion, which every default Covers names: each case has to fail
      // for the defect it carries, not for an uncovered criterion
      seed(dir, planBody(tasks, 1, contracts));

      const result = run(dir, {}, [PLAN_REL]);
      assert.equal(result.status, 4, `${name} -> stdout: ${result.stdout} stderr: ${result.stderr}`);
      assert.equal(result.stdout, "", name);
      assert.match(result.stderr, expected, name);
    });
  }
});

test("an acceptance criterion no task's Covers names exits 4 (nothing downstream gates the spec as a whole)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // both criteria present, every task pointing at the first one
    seed(dir, planBody([{ id: "T1", covers: "#1" }]));

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 4, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /criterion #2 is covered by no task/);
  });
});

test("a contract block no task's Uses names exits 4 (the split would leave it unreachable)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // the block is in the appendix and every task says it touches no shape, so
    // nothing would ever carry it to a coder
    seed(dir, planBody([{ id: "T1", uses: "none" }], 1));

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 4, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /contract C1 is used by no task/);
  });
});

test("a plan that introduces no shape at all validates with every task on Uses: none", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody([{ id: "T1", uses: "none" }], 1, []));

    const result = run(dir, {}, [PLAN_REL, "--split"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.doesNotMatch(readRun(dir, "tasks/T1.md"), /## Contracts/);
  });
});

test("a rejected plan is never decomposed - --split writes nothing when validation fails", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody([{ id: "T1", covers: "#9" }]));

    const result = run(dir, {}, [PLAN_REL, "--split"]);
    assert.equal(result.status, 4);
    assert.deepEqual(fs.readdirSync(path.join(dir, PLAN_DIR)), ["plan.md"]);
  });
});

// --- the decomposition -----------------------------------------------------

test("--split writes the specification and one file per task, and still prints the index", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));

    const result = run(dir, {}, [PLAN_REL, "--split"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^T2 \| todo \| required \| T1 \| src\/reject\.ts \| Reject a bad password$/m);

    assert.deepEqual(taskFiles(dir), ["T1.md", "T2.md"]);

    // spec.md is everything ABOVE the task list, verbatim: WHAT and WHY, no task
    // and - because the appendix sits below the tasks - no contract either.
    const spec = readRun(dir, "spec.md");
    assert.match(spec, /^# Add login$/m);
    assert.match(spec, /^- add - src\/login\.ts - the handler$/m);
    assert.match(spec, /^### Out of scope$/m);
    assert.doesNotMatch(spec, /## Tasks/);
    assert.doesNotMatch(spec, /Add the login handler/);
    assert.doesNotMatch(spec, /## Contracts|POST \/login/);
  });
});

test("a task file carries its own block verbatim, the text of the criteria it covers, and no other task", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));
    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);

    const t1 = readRun(dir, "tasks/T1.md");
    assert.match(t1, /^### T1 - Add the login handler$/m);
    assert.match(t1, /^- Files: src\/login\.ts$/m);
    assert.match(t1, /^- DoD: it works$/m);
    assert.doesNotMatch(t1, /<!-- TASK -->/);
    // the neighbour, its file and its title stay out of this context entirely
    assert.doesNotMatch(t1, /T2|Reject a bad password|src\/reject\.ts/);

    // the covered criterion arrives whole, continuation line included
    assert.match(
      t1,
      /^## Covered criteria\n1\. A user with valid credentials gets a session\.\n {3}The session survives a reload\.$/m,
    );
    assert.doesNotMatch(t1, /An invalid password is rejected/);

    assert.match(readRun(dir, "tasks/T2.md"), /^## Covered criteria\n2\. An invalid password is rejected\.$/m);
  });
});

test("a task file carries the run's goal and its out-of-scope list, so a coder needs no second file", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));
    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);

    for (const id of ["T1", "T2"]) {
      const body = readRun(dir, `tasks/${id}.md`);
      assert.match(body, /^## Goal\nUsers can log in\.\nThe session is durable\.$/m, id);
      assert.match(body, /^## Out of scope\n- Password reset\.\n- OAuth\.$/m, id);
      // the file map is the planner's decomposition artefact and the closing
      // writer's input - never a coder's, which is bounded by its own Files
      assert.doesNotMatch(body, /## Scope|### File map/, id);
    }
  });
});

test("a contract block reaches the tasks whose Uses names it and no others", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));
    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);

    // T1 uses C1: the whole block arrives, heading and body
    assert.match(
      readRun(dir, "tasks/T1.md"),
      /^## Contracts\n\n### C1 - Login endpoint\n\nPOST \/login -> 200 \| 401\n\nBody: `\{ user, pass \}`$/m,
    );
    // T2 says none: not the section, not one line of the shape
    const t2 = readRun(dir, "tasks/T2.md");
    assert.doesNotMatch(t2, /## Contracts|C1|POST \/login/);
  });
});

test("tasks/ is rebuilt from scratch, so a task dropped from the plan leaves no stale file behind", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));
    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);
    assert.deepEqual(taskFiles(dir), ["T1.md", "T2.md"]);

    seed(dir, planBody([TWO_TASKS[0]!], 1));
    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);
    assert.deepEqual(taskFiles(dir), ["T1.md"]);
  });
});

test("--split outside a git repository still decomposes and exits 0", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));

    const result = run(dir, { GIT_CEILING_DIRECTORIES: dir }, [PLAN_REL, "--split"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(taskFiles(dir), ["T1.md", "T2.md"]);
  });
});

// --- the decomposition commit ----------------------------------------------

function subjects(repo: GitRepo): string[] {
  return repo.git("log", "--format=%s").stdout.trim().split("\n").filter(Boolean);
}

test("the decomposition is committed with the plan, and nothing outside the run directory rides along", () => {
  withGitRepo((repo) => {
    write(repo.dir, "README.md", "seed\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "seed");

    seed(repo.dir, planBody(TWO_TASKS));
    // a change the user has open, and one they already staged: neither is this
    // script's business
    write(repo.dir, "README.md", "edited\n");
    write(repo.dir, "src/other.ts", "staged by the user\n");
    repo.git("add", "src/other.ts");

    const result = run(repo.dir, repo.env, [PLAN_REL, "--split"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    assert.deepEqual(subjects(repo), [
      "chore(viber): decompose plan 2026-09-20-10-00-00_add-login",
      "seed",
    ]);
    const committed = repo
      .git("show", "--name-only", "--format=", "HEAD")
      .stdout.trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .sort();
    assert.deepEqual(committed, [
      PLAN_REL,
      `${PLAN_DIR}/spec.md`,
      `${PLAN_DIR}/status.md`,
      `${PLAN_DIR}/tasks/T1.md`,
      `${PLAN_DIR}/tasks/T2.md`,
    ].sort());

    // the user's own work is exactly where they left it
    assert.equal(fs.readFileSync(path.join(repo.dir, "README.md"), "utf-8"), "edited\n");
    assert.match(repo.git("status", "--short").stdout, /README\.md/);
    assert.match(repo.git("status", "--short").stdout, /src\/other\.ts/);
  });
});

test("--split writes the run's state file, and a later --split leaves the progress in it untouched", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));

    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);
    assert.equal(
      readRun(dir, "status.md"),
      "# status\n\nprogress: 0/2\ndone: none\nskipped: none\nunreviewed: none\nclosed: none\n",
    );

    // a resume splits again: the file is the build's progress, never reset by it
    seedStatus(dir, { progress: "1/2", done: "T1", skipped: "none", unreviewed: "none", closed: "none" });
    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);
    assert.match(readRun(dir, "status.md"), /^done: T1$/m);
    assert.match(run(dir, {}, [PLAN_REL]).stdout, /^progress: 1\/2$/m);
  });
});

test("a second --split with the plan unchanged commits nothing and still exits 0", () => {
  withGitRepo((repo) => {
    seed(repo.dir, planBody(TWO_TASKS));
    repo.git("add", "-A");
    repo.git("commit", "-m", "seed");

    assert.equal(run(repo.dir, repo.env, [PLAN_REL, "--split"]).status, 0);
    const after = subjects(repo);
    assert.equal(run(repo.dir, repo.env, [PLAN_REL, "--split"]).status, 0);
    assert.deepEqual(subjects(repo), after);
  });
});
