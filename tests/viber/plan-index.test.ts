/*
 * plan-index.test.ts - proves viber/scripts/plan-index.sh's two contracts.
 *
 * `plan-index.sh <plan>` validates the plan's structure and prints the compact
 * index that is the orchestrator's WHOLE view of it - the skill's body forbids
 * it to open a file, so a plan defect this script lets through is a
 * defect nothing else in the track can see. A non-zero exit must print nothing
 * on stdout and leave nothing on disk.
 *
 * That index is also what a session which did not start the build resumes from:
 * the run's own status.md (`done`, `skipped`, `unreviewed`, `deferred`,
 * `closed`) passes through, and a
 * `dirty:` line names a task whose files carry uncommitted work from a session
 * that was cut off inside it. A missing dirty line sends a fresh coder onto
 * another one's half-finished work; a spurious one - the fixer's RED
 * reproduction test, named on the task's `Repro:` line and uncommitted by
 * design - stops every fix build on a question with one right answer.
 *
 * `plan-index.sh <plan> --split` additionally decomposes the plan in place:
 * `spec.md` (everything above `## Tasks`) plus one `tasks/<id>.md` per task,
 * carrying the block verbatim, the plan's goal, the text of the criteria its
 * `Covers:` line names, the contract blocks its `Uses:` line names, the big
 * shape's `### Must not change` where the plan has one, and the plan's
 * out-of-scope list. That file IS a coder's WHOLE input - it gets no `spec:` line
 * at all - so a task file that loses a field, loses a contract or picks up a
 * neighbour's is silent, uncatchable drift. The one line it does NOT carry
 * verbatim is `- DoD:`, cut on `;` into one numbered `- DoD.<k>:` line per
 * clause: a coder answers for each clause and a reviewer gates each one, which
 * the single sentence the plan keeps does not allow.
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
  /** Omitted entirely unless set - an absent line is what an ordinary task looks like. */
  exclusive?: string;
  /** Omitted entirely unless set - only a fixing task carries the fixer's RED test. */
  repro?: string;
  covers?: string;
  /** `null` omits the line entirely - the shape a plan written before `Uses:` has. */
  uses?: string | null;
  deps?: string;
  files?: string;
  /** Semicolon-separated clauses; the decomposition numbers them one per line. */
  dod?: string;
}

/** The `## Contracts` appendix every default task names through `Uses: C1`. It
 *  sits BELOW the tasks, so it never reaches spec.md - only the task files whose
 *  `Uses:` line asks for it. Its `File:` line says `none` - a wire shape declared
 *  in no file of this plan - which keeps the ownership rules out of every case
 *  that is not about them; the cases that are build their own appendix. */
const CONTRACT = [
  "### C1 - Login endpoint",
  "",
  "File: none",
  "",
  "POST /login -> 200 | 401",
  "",
  "Body: `{ user, pass }`",
];

/** An appendix whose shape lives in a file, which is what ties it to the task
 *  map: the task holding that path is the block's writer. */
function ownedContract(file: string): string[] {
  return ["### C1 - Login endpoint", "", `File: ${file}`, "", "POST /login -> 200 | 401"];
}

/** The acceptance criteria both spec shapes carry: two of them, the first
 *  wrapped over two lines - a criterion's continuation is part of its text and
 *  has to reach the task file with it. */
function criteriaLines(criteria: number): string[] {
  return [
    "1. A user with valid credentials gets a session.",
    "   The session survives a reload.",
    "2. An invalid password is rejected.",
  ].slice(0, criteria === 1 ? 2 : 3);
}

/** The head of a plan built from `templates/spec-lite.md`. */
function liteHead(criteria: number): string[] {
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
    ...criteriaLines(criteria),
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
  ];
}

/** The head of a plan built from `templates/spec-full.md`: the same four
 *  anchors, wrapped in the sections the big shape adds around them. */
function fullHead(criteria: number): string[] {
  return [
    "# Add login",
    "",
    "## Goal",
    "",
    "Users can log in.",
    "The session is durable.",
    "",
    "## Problem",
    "",
    "Anyone can read another person's orders.",
    "",
    "## Current behaviour",
    "",
    "Every page is public.",
    "",
    "### Must not change",
    "",
    "- The public catalogue stays reachable without an account.",
    "",
    "## Behaviour",
    "",
    "### S1 - Signing in [NEW]",
    "",
    "A returning customer reaches their own orders.",
    "",
    "Given a registered customer",
    "When they submit their credentials",
    "Then they see their own orders",
    "",
    "### Edge cases",
    "",
    "- An empty password -> the form is rejected before anything is checked.",
    "",
    "## Glossary",
    "",
    "- Session - the proof that this visitor signed in, held until they leave.",
    "",
    "## Acceptance criteria",
    "",
    ...criteriaLines(criteria),
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
    "## Constraints",
    "",
    "- The existing session cookie name has to survive.",
    "",
  ];
}

/** A plan in the template's shape: one of the two spec heads, then the task
 *  half every shape shares. */
function planBody(
  tasks: TaskFields[],
  criteria = 2,
  contracts: string[] = CONTRACT,
  shape: "lite" | "full" = "lite",
): string {
  return [
    ...(shape === "full" ? fullHead(criteria) : liteHead(criteria)),
    "## Tasks",
    "",
    ...tasks.flatMap((t) => [
      "<!-- TASK -->",
      `### ${t.id ?? "T1"} - ${t.title ?? "do the thing"}`,
      `- TDD: ${t.tdd ?? "required"}`,
      ...(t.exclusive === undefined ? [] : [`- Exclusive: ${t.exclusive}`]),
      ...(t.repro === undefined ? [] : [`- Repro: ${t.repro}`]),
      `- Covers: ${t.covers ?? "#1"}`,
      ...(t.uses === null ? [] : [`- Uses: ${t.uses ?? "C1"}`]),
      `- Depends-on: ${t.deps ?? "none"}`,
      `- Files: ${t.files ?? "src/a.ts"}`,
      "- Delivers: the thing",
      "- Verification: npm test -> green",
      `- DoD: ${t.dod ?? "it works"}`,
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

// --- the header documentation ------------------------------------------------

test("the header's example task titles carry no Conventional Commits type - a task title is prose, never a commit subject", () => {
  const source = fs.readFileSync(SUT, "utf-8");
  const exampleRows = source.split("\n").filter((l) => /^#\s+T[12] \|/.test(l));
  assert.equal(exampleRows.length, 2, `expected two example rows in the header, got: ${JSON.stringify(exampleRows)}`);
  for (const row of exampleRows) {
    assert.doesNotMatch(row, /\bchore:|\bfeat:/, row);
  }
});

// --- the index -------------------------------------------------------------

test("the index carries one row per task: id, state, TDD marker, exclusivity, normalised deps, files and title", () => {
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
        "tasks: id | state | tdd | excl | deps | feeds | files | title",
        "T1 | todo | required | - | - | - | src/login.ts | Add the login handler",
        "T2 | todo | required | - | T1 | - | src/reject.ts | Reject a bad password",
        "verify: T1 | npm test",
        "verify: T2 | npm test",
        "",
      ].join("\n"),
    );
  });
});

test("a marker mentioned mid-sentence in prose creates no task - only a marker alone on its own line opens one", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const body = planBody(TWO_TASKS).replace(
      "## Goal\n",
      "## Goal\n\nMentioning <!-- TASK --> inside a sentence must not open one.\n\n",
    );
    seed(dir, body);

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^progress: 0\/2$/m);
    assert.match(result.stdout, /^T1 \| todo \|/m);
    assert.match(result.stdout, /^T2 \| todo \|/m);
  });
});

test("Exclusive: true reaches the orchestrator as excl yes, and an absent line as '-' (the plan declares the constraint, the script only carries it)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(
      dir,
      planBody([
        { id: "T1", title: "Add the login handler", files: "src/login.ts" },
        {
          id: "T2",
          title: "Prove the endpoint against a real server",
          covers: "#2",
          uses: "none",
          deps: "T1",
          files: "test/login.api.ts",
          exclusive: "true",
        },
      ]),
    );

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      [
        `plan: ${PLAN_REL}`,
        "title: Add login",
        "progress: 0/2",
        "tasks: id | state | tdd | excl | deps | feeds | files | title",
        "T1 | todo | required | - | - | - | src/login.ts | Add the login handler",
        "T2 | todo | required | yes | T1 | - | test/login.api.ts | Prove the endpoint against a real server",
        "verify: T1 | npm test",
        "verify: T2 | npm test",
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
    seedStatus(dir, {
      progress: "1/2",
      done: "T1",
      skipped: "T2",
      unreviewed: "T1",
      deferred: "T2:src/reject.ts",
      closed: "memory qa",
    });

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^progress: 1\/2$/m);
    assert.match(result.stdout, /^skipped: T2$/m);
    assert.match(result.stdout, /^unreviewed: T1$/m);
    // who owes a test for code an earlier task left unproved - no later session
    // could read that off the tree
    assert.match(result.stdout, /^deferred: T2:src\/reject\.ts$/m);
    assert.match(result.stdout, /^closed: memory qa$/m);
    assert.match(result.stdout, /^T2 \| skipped \|/m);
  });
});

test("a run whose status file carries none of those entries reports none of them, so a run that needed no decision stays quiet", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));
    seedStatus(dir, {
      progress: "0/2",
      done: "none",
      skipped: "none",
      unreviewed: "none",
      deferred: "none",
      closed: "none",
    });

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    for (const line of [/^skipped:/m, /^unreviewed:/m, /^deferred:/m, /^closed:/m, /^dirty:/m]) {
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
    for (const line of [/^skipped:/m, /^unreviewed:/m, /^deferred:/m, /^closed:/m]) {
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

test("the Repro path is uncommitted by design and never reported dirty, while the rest of that task's files still are", () => {
  const FIX: TaskFields[] = [
    {
      id: "T1",
      title: "Fix the rejected login",
      tdd: "none",
      repro: "test/login.test.ts",
      files: "src/login.ts, test/login.test.ts",
    },
  ];
  withGitRepo((repo) => {
    seed(repo.dir, planBody(FIX, 1));
    write(repo.dir, "src/login.ts", "committed\n");
    write(repo.dir, "test/login.test.ts", "committed\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "seed");

    // the fixer's RED test, appended to an existing test file and left uncommitted
    write(repo.dir, "test/login.test.ts", "committed\nand a RED reproduction\n");
    let result = run(repo.dir, repo.env, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.doesNotMatch(result.stdout, /^dirty:/m);

    // a session cut off inside the fix still shows, the Repro path left out
    write(repo.dir, "src/login.ts", "half a coder's fix\n");
    result = run(repo.dir, repo.env, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^dirty: T1 \| src\/login\.ts$/m);
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

test(
  "--split accepts the run's own plan.md handed over with Windows separators (dirname splits a backslash, the shell's own expansion does not - disagreeing, they refuse a legitimate plan)",
  {
    skip:
      process.platform === "win32"
        ? false
        : "off Windows a backslash is a legal filename character, so the argument names no file",
  },
  () => {
    withTempDir("p2p2-viber-", (dir) => {
      seed(dir, planBody(TWO_TASKS));

      const result = run(dir, {}, [PLAN_REL.replace(/\//g, "\\"), "--split"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.deepEqual(taskFiles(dir), ["T1.md", "T2.md"]);
    });
  },
);

test("a <!-- TASK --> block above the plan's own \"## Tasks\" heading is refused, naming the task, and --split writes nothing for it", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // the cut point IS the "## Tasks" heading: a block that opens before it has
    // ever been seen would ride into spec.md rather than decompose into its own
    // task file, which is silent drift a coder never notices
    const misplaced = [
      "<!-- TASK -->",
      "### T0 - Misplaced task",
      "- TDD: required",
      "- Covers: #1",
      "- Uses: none",
      "- Depends-on: none",
      "- Files: src/misplaced.ts",
      "- Delivers: the thing",
      "- Verification: npm test -> green",
      "- DoD: it works",
      "<!-- /TASK -->",
      "",
      "",
    ].join("\n");
    const body = planBody(TWO_TASKS).replace("## Goal\n", `## Goal\n\n${misplaced}`);
    seed(dir, body);

    const result = run(dir, {}, [PLAN_REL, "--split"]);
    assert.equal(result.status, 4, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /task T0: <!-- TASK --> block sits above the "## Tasks" heading/);
    assert.deepEqual(fs.readdirSync(path.join(dir, PLAN_DIR)), ["plan.md"]);
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
    ["a recursive glob in Files", [{ id: "T1", files: "src/**/*.ts" }], /is a glob/],
    [
      // the bracket does not wrap the segment, so it is a character class and
      // not an App Router directory name - the one case the shape test keeps out
      "a character class inside a segment of a Files entry",
      [{ id: "T1", files: "src/a[bc].ts" }],
      /Files entry "src\/a\[bc\]\.ts" is a glob/,
    ],
    ["a directory in Files", [{ id: "T1", files: "src/" }], /is a directory/],
    // quoting reaches commit-task.sh as part of the pathspec and stages nothing
    ["a backticked path in Files", [{ id: "T1", files: "`src/a.ts`" }], /is not a bare path, drop the quoting/],
    ["a double-quoted path in Files", [{ id: "T1", files: '"src/a.ts"' }], /is not a bare path, drop the quoting/],
    ["a TDD marker that is neither required nor none", [{ id: "T1", tdd: "maybe" }], /TDD must be/],
    [
      "an Exclusive line spelled false rather than left out",
      [{ id: "T1", exclusive: "false" }],
      /task T1: Exclusive must be "true" or the line left out, got: "false"/,
    ],
    [
      "an Exclusive line spelled none - the mandatory fields' convention, borrowed where it does not hold",
      [{ id: "T1", exclusive: "none" }],
      /task T1: Exclusive must be "true" or the line left out, got: "none"/,
    ],
    [
      "a Repro path outside the task's own Files - it would be committed by nobody",
      [{ id: "T1", tdd: "none", repro: "test/other.test.ts", files: "src/a.ts" }],
      /task T1: Repro "test\/other\.test\.ts" must be one path of its own Files/,
    ],
    [
      "a Repro on a TDD: required task - the reproduction test already is the RED cycle",
      [{ id: "T1", repro: "src/a.ts", files: "src/a.ts" }],
      /task T1: Repro needs "TDD: none"/,
    ],
    [
      "a dependency pointing forward",
      [
        { id: "T1", deps: "T2", files: "src/a.ts" },
        { id: "T2", files: "src/b.ts" },
      ],
      /must reference an earlier task/,
    ],
    [
      "a task depending on an Exclusive task - it runs last, so nothing may depend on it",
      [
        { id: "T1", exclusive: "true", files: "src/a.ts" },
        { id: "T2", deps: "T1", files: "src/b.ts" },
      ],
      /task T2: Depends-on T1, an Exclusive task - it runs last, so no task may depend on it/,
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

test("a task depending on an Exclusive task validates under --split - a frozen plan resumed after the rule lands must still decompose", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(
      dir,
      planBody(
        [
          { id: "T1", exclusive: "true", files: "src/a.ts" },
          { id: "T2", deps: "T1", files: "src/b.ts" },
        ],
        1,
      ),
    );

    const result = run(dir, {}, [PLAN_REL, "--split"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(taskFiles(dir), ["T1.md", "T2.md"]);
  });
});

test("an Exclusive task depending on earlier tasks and having no dependents itself decomposes under --split", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(
      dir,
      planBody([
        { id: "T1", title: "Add the login handler", files: "src/login.ts" },
        {
          id: "T2",
          title: "Prove the endpoint against a real server",
          covers: "#2",
          uses: "none",
          deps: "T1",
          files: "test/login.api.ts",
          exclusive: "true",
        },
      ]),
    );

    const result = run(dir, {}, [PLAN_REL, "--split"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(taskFiles(dir), ["T1.md", "T2.md"]);
  });
});

test("a Files entry whose brackets wrap whole segments is an exact path and reaches the index untouched", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // the three Next.js App Router dynamic segments - a dynamic one, a catch-all
    // and an optional catch-all - plus a route group in parentheses. Every route
    // of such a project carries one, so rejecting the bracket itself would leave
    // no plan touching a route able to validate at all.
    const files = [
      "src/app/(public)/site-render/[host]/preview-draft/[token]/[[...path]]/page.tsx",
      "src/app/api/admin/sites/[siteId]/contents/[contentId]/route.ts",
      "src/app/blog/[...slug]/page.tsx",
    ].join(",");
    seed(dir, planBody([{ id: "T1", files }], 1));

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^T1 \| todo \| required \| - \| - \| - \| (.+) \| do the thing$/m);
    assert.ok(result.stdout.includes(`| ${files} |`), `stdout: ${result.stdout}`);
  });
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

test("only the criterion tokens of Covers count, so a digit inside an annotation covers nothing", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // "(see S2)" carries a 2, and criterion #2 is still covered by no task
    seed(dir, planBody([{ id: "T1", covers: "#1 (see S2)" }]));

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 4, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /criterion #2 is covered by no task/);
    assert.doesNotMatch(result.stderr, /criterion #1 |Covers #/);
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

test("an appendix where no block carries File fails validation outside --split (the exemption is for resuming a frozen plan, not for a fresh one)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody([{ id: "T1" }], 1, ["### C1 - Login endpoint", "", "POST /login -> 200 | 401"]));

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 4, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /contract C1: missing File/);
  });
});

test("an appendix where no block carries File validates untouched (a plan that landed before the field is frozen and still has to resume)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // the old shape: a block with no File line, naming a file no task owns -
    // exactly what the ownership rules reject, and exactly what a run started
    // under an earlier version carries
    seed(dir, planBody([{ id: "T1" }], 1, ["### C1 - Login endpoint", "", "POST /login -> 200 | 401"]));

    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);
  });
});

test("one block carrying File makes the line mandatory for the rest (a half-filled appendix is drift, not an older plan)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(
      dir,
      planBody([{ id: "T1", uses: "C1, C2" }], 1, [
        ...ownedContract("src/a.ts"),
        "",
        "### C2 - Session cookie",
        "",
        "Set-Cookie: sid",
      ]),
    );

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 4, `stderr: ${result.stderr}`);
    assert.match(result.stderr, /contract C2: missing File/);
  });
});

test("a contract file no task creates and the tree does not hold exits 4 (the shape would be invented by whoever needs it first)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // the task writes src/a.ts; the shape is declared in a file nobody owns, so
    // its coder would discover it missing and write it outside its own Files
    seed(dir, planBody([{ id: "T1" }], 1, ownedContract("src/session.ts")));

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 4, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /contract C1 declares src\/session\.ts, which no task creates/);
  });
});

test("a contract file already in the tree needs no owner - a shape this change only consumes is already written", () => {
  withTempDir("p2p2-viber-", (dir) => {
    write(dir, "src/session.ts", "export type Session = { id: string };\n");
    seed(dir, planBody([{ id: "T1" }], 1, ownedContract("src/session.ts")));

    assert.equal(run(dir, {}, [PLAN_REL]).status, 0);
  });
});

test("a contract file whose holders never name the block exits 4 (its writer would never see the shape)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // T1 holds the file the shape lives in but says it touches no shape; only
    // T2, which does not hold it, names C1 - so the block reaches the consumer
    // and never the writer
    seed(
      dir,
      planBody(
        [
          { id: "T1", uses: "none", files: "src/login.ts" },
          { id: "T2", covers: "#2", uses: "C1", deps: "T1", files: "src/reject.ts" },
        ],
        2,
        ownedContract("src/login.ts"),
      ),
    );

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 4, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /contract C1 declares src\/login\.ts, held by T1, but no holder names C1 in Uses/);
  });
});

test("one holder naming the block is enough - a file several tasks in one chain touch is not everyone's shape", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(
      dir,
      planBody(
        [
          { id: "T1", uses: "C1", files: "src/login.ts" },
          { id: "T2", covers: "#2", uses: "none", deps: "T1", files: "src/login.ts" },
        ],
        2,
        ownedContract("src/login.ts"),
      ),
    );

    assert.equal(run(dir, {}, [PLAN_REL]).status, 0);
  });
});

test("feeds names a contract block one task writes and another task consumes, and stays '-' for the consumer itself", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // T1 holds the file the shape lives in AND names it in Uses (satisfying
    // reachability); T2, which does not hold that file, also names it - the
    // one other task that makes T1's own work load-bearing
    seed(
      dir,
      planBody(
        [
          { id: "T1", uses: "C1", files: "src/login.ts" },
          { id: "T2", covers: "#2", uses: "C1", deps: "T1", files: "src/reject.ts" },
        ],
        2,
        ownedContract("src/login.ts"),
      ),
    );

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^T1 \| todo \| required \| - \| - \| C1 \| src\/login\.ts \| do the thing$/m);
    assert.match(result.stdout, /^T2 \| todo \| required \| - \| T1 \| - \| src\/reject\.ts \| do the thing$/m);
  });
});

test("a File entry whose bracket wraps a whole segment is a path, not a glob - like a Files entry", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const route = "src/app/api/sites/[siteId]/route.ts";
    seed(dir, planBody([{ id: "T1", files: route }], 1, ownedContract(route)));

    const result = run(dir, {}, [PLAN_REL]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  });
});

test("a File entry that is a glob, a directory or an absolute path exits 4, like a Files entry", () => {
  withTempDir("p2p2-viber-", (dir) => {
    for (const entry of ["src/*.ts", "src/", "/abs/login.ts", "src/a[bc].ts"]) {
      seed(dir, planBody([{ id: "T1" }], 1, ownedContract(entry)));

      const result = run(dir, {}, [PLAN_REL]);
      assert.equal(result.status, 4, `${entry}: ${result.stderr}`);
      assert.match(result.stderr, /must be one bare repo-relative file path/, entry);
    }
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
    assert.match(result.stdout, /^T2 \| todo \| required \| - \| T1 \| - \| src\/reject\.ts \| Reject a bad password$/m);

    assert.deepEqual(taskFiles(dir), ["T1.md", "T2.md"]);

    // spec.md is everything ABOVE the task list: WHAT and WHY, no task and -
    // because the appendix sits below the tasks - no contract either.
    const spec = readRun(dir, "spec.md");
    assert.match(spec, /^# Add login$/m);
    assert.match(spec, /^- add - src\/login\.ts - the handler$/m);
    assert.match(spec, /^### Out of scope$/m);
    assert.doesNotMatch(spec, /## Tasks/);
    assert.doesNotMatch(spec, /Add the login handler/);
    assert.doesNotMatch(spec, /## Contracts|POST \/login/);
  });
});

test("spec.md carries neither the frontmatter nor one HTML comment - the run plumbing stops at plan.md", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // The frontmatter is how the implementor finds the plan file again, and a
    // landed plan keeps it. It is the run plumbing, and spec.md outlives the
    // run - archived, the path it names is a plan mode file that is already
    // gone. The legacy comment marker is what a plan written before the key
    // moved carries, and the block comment is what a plan that never went
    // through --land brings with it.
    const body = [
      "---",
      "source: /home/u/.claude/plans/add-login.md",
      "---",
      "",
    ].join("\n") + planBody(TWO_TASKS).replace(
      "# Add login\n",
      [
        "# Add login",
        "",
        "<!-- source: /legacy/plans/add-login.md -->",
        "",
        "Build: skill `implementor`",
        "",
        "<!-- Guidance for whoever writes the plan:",
        "     it spans several lines and ends here. -->",
        "",
      ].join("\n"),
    );
    seed(dir, body);

    const r = run(dir, {}, [PLAN_REL, "--split"]);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    // the title is read off the H1, which the frontmatter above it does not move
    assert.match(r.stdout, /^title: Add login$/m);

    const spec = readRun(dir, "spec.md");
    assert.doesNotMatch(spec, /<!--|^---$|source:/m);
    assert.doesNotMatch(spec, /add-login\.md|Guidance for whoever/);
    // and what the cut leaves behind reads like a document written without any
    // of it: one blank line between kept lines, never two
    assert.match(spec, /^# Add login\n\nBuild: skill `implementor`\n\n## Goal\n/);
    assert.doesNotMatch(spec, /\n\n\n/);
    // the plan itself is untouched - it is the file the run resumes from
    const plan = fs.readFileSync(path.join(dir, PLAN_REL), "utf-8");
    assert.match(plan, /^---\nsource: \/home\/u/m);
  });
});

for (const [fence, other] of [["```", "~~~"], ["~~~", "```"]] as const) {
  test(`spec.md keeps a ${fence} fenced block above ## Tasks whole, its comment and blank lines included, and still cuts the comments outside it (a comment in an example is content, not guidance)`, () => {
    withTempDir("p2p2-viber-", (dir) => {
      const block = [
        `${fence}html`,
        "<!-- slot -->",
        "",
        "",
        other,
        "<!-- still inside: the other fence character closes nothing -->",
        `${fence}`,
      ].join("\n");
      seed(
        dir,
        planBody(TWO_TASKS).replace(
          "## Scope\n",
          ["<!-- guidance above the example -->", "", block, "", "## Scope", ""].join("\n"),
        ),
      );

      const r = run(dir, {}, [PLAN_REL, "--split"]);
      assert.equal(r.status, 0, `stderr: ${r.stderr}`);

      const spec = readRun(dir, "spec.md");
      assert.ok(spec.includes(`\n\n${block}\n\n## Scope\n`), spec);
      assert.doesNotMatch(spec, /guidance above the example/);
    });
  });
}

test("spec.md still loses a comment opened outside any fence whole, a fence line inside it included (a fence inside guidance opens nothing)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(
      dir,
      planBody(TWO_TASKS).replace(
        "## Scope\n",
        ["<!-- guidance that runs on", "```", "an example inside the guidance", "-->", "", "## Scope", ""].join("\n"),
      ),
    );

    const r = run(dir, {}, [PLAN_REL, "--split"]);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);

    const spec = readRun(dir, "spec.md");
    assert.match(spec, /^2\. An invalid password is rejected\.\n\n## Scope\n/m);
    assert.doesNotMatch(spec, /guidance that runs on|```|an example inside/);
  });
});

test("a plan frontmatter issue: line makes spec.md open with its own three-line frontmatter, then the specification as today", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // source and into ride the plan for the run's own plumbing; issue is the
    // one key the archive keeps, so it alone survives into spec.md
    const body = [
      "---",
      "source: /home/u/.claude/plans/add-login.md",
      "into: draft-1",
      "issue: https://github.com/acme/widgets/issues/42",
      "---",
      "",
    ].join("\n") + planBody(TWO_TASKS);
    seed(dir, body);

    const r = run(dir, {}, [PLAN_REL, "--split"]);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);

    const spec = readRun(dir, "spec.md");
    assert.match(spec, /^---\nissue: https:\/\/github\.com\/acme\/widgets\/issues\/42\n---\n\n# Add login\n/);
    assert.doesNotMatch(spec, /source:|into:|draft-1/);
    // no doubled blank line where the frontmatter meets the specification
    assert.doesNotMatch(spec, /\n\n\n/);
  });
});

test("a plan frontmatter with no issue: line, or an empty one, reaches spec.md exactly as a plan with no frontmatter at all", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const withoutIssue = planBody(TWO_TASKS);
    seed(dir, withoutIssue);
    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);
    const baseline = readRun(dir, "spec.md");

    const emptyIssue = ["---", "source: /home/u/plans/add-login.md", "issue:", "---", ""].join("\n") + withoutIssue;
    seed(dir, emptyIssue);
    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);
    assert.equal(readRun(dir, "spec.md"), baseline);
  });
});

test("<!-- TASK --> blocks under no \"## Tasks\" heading are refused, not silently left out of the decomposition", () => {
  withTempDir("p2p2-viber-", (dir) => {
    // The cut is that heading, so without it the whole task half rides into
    // spec.md and tasks/ comes out empty - while the index still lists every
    // task, which sends the orchestrator after a task file that was never
    // written. A translated or renamed heading is the way it happens.
    seed(dir, planBody(TWO_TASKS).replace("## Tasks", "## Zadania"));

    const result = run(dir, {}, [PLAN_REL, "--split"]);
    assert.equal(result.status, 4);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /no "## Tasks" heading/);
    assert.deepEqual(fs.readdirSync(path.join(dir, PLAN_DIR)), ["plan.md"]);
  });
});

test("a task file carries its own block verbatim, the text of the criteria it covers, and no other task", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));
    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);

    const t1 = readRun(dir, "tasks/T1.md");
    assert.match(t1, /^### T1 - Add the login handler$/m);
    assert.match(t1, /^- Files: src\/login\.ts$/m);
    assert.match(t1, /^- DoD\.1: it works$/m);
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

test("the DoD is cut into one numbered line per semicolon clause, and the plan keeps the single line it was written as", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const body = planBody([
      { ...TWO_TASKS[0]!, dod: "the endpoint answers 200;  a bad password answers 401 ; " },
      TWO_TASKS[1]!,
    ]);
    seed(dir, body);
    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);

    // a coder answers for each clause and a reviewer gates each one, which the
    // one sentence carrying all of them does not allow
    const t1 = readRun(dir, "tasks/T1.md");
    assert.match(t1, /^- DoD\.1: the endpoint answers 200$/m);
    assert.match(t1, /^- DoD\.2: a bad password answers 401$/m);
    // the empty trailing clause is dropped, so the numbers stay contiguous and
    // both sides cite the same one
    assert.doesNotMatch(t1, /^- DoD\.3:/m);
    assert.doesNotMatch(t1, /^- DoD: /m);

    // no semicolon is still one numbered clause, not an unnumbered line
    assert.match(readRun(dir, "tasks/T2.md"), /^- DoD\.1: it works$/m);

    // the decomposition is the only place the DoD is cut
    assert.equal(fs.readFileSync(path.join(dir, PLAN_REL), "utf-8"), body);
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
      /^## Contracts\n\n### C1 - Login endpoint\n\nFile: none\n\nPOST \/login -> 200 \| 401\n\nBody: `\{ user, pass \}`$/m,
    );
    // T2 says none: not the section, not one line of the shape
    const t2 = readRun(dir, "tasks/T2.md");
    assert.doesNotMatch(t2, /## Contracts|C1|POST \/login/);
  });
});

// --- the two spec shapes ---------------------------------------------------

/** The four anchors `plan-index.sh` reads out of a plan head. Both spec
 *  templates carry them character for character, which is what lets one script
 *  decompose either shape. */
const ANCHORS = ["## Goal", "## Acceptance criteria", "### File map", "### Out of scope"];

const TEMPLATES = path.resolve(import.meta.dirname, "../../viber/skills/planner/templates");

/** The `## ` and `### ` headings of a decomposed task file, in order. */
function headings(body: string): string[] {
  return body
    .split("\n")
    .filter((l) => /^#{2,3} /.test(l))
    .map((l) => l.trim());
}

test("both spec templates carry the four anchors, so the shape is a choice and never a second script", () => {
  const shapes = ["spec-lite.md", "spec-full.md"].map((name) =>
    fs.readFileSync(path.join(TEMPLATES, name), "utf-8"),
  );
  for (const [index, body] of shapes.entries()) {
    for (const anchor of ANCHORS) {
      assert.ok(
        body.split("\n").some((line) => line === anchor),
        `${index === 0 ? "spec-lite" : "spec-full"}.md is missing the anchor line "${anchor}"`,
      );
    }
  }
  // the fifth anchor is the big shape's alone: it reaches a task file the same
  // way the four do, and its absence from spec-lite is what keeps that shape's
  // task file exactly what it always was
  assert.ok(
    shapes[1]!.split("\n").some((line) => line === "### Must not change"),
    'spec-full.md is missing the anchor line "### Must not change"',
  );
  assert.ok(!shapes[0]!.includes("Must not change"), "spec-lite.md must not carry a regression boundary");

  // the task half is one file for both shapes
  const tasks = fs.readFileSync(path.join(TEMPLATES, "tasks.md"), "utf-8");
  assert.match(tasks, /^## Tasks$/m);
  assert.match(tasks, /^## Contracts$/m);
  assert.ok(!fs.existsSync(path.join(TEMPLATES, "plan.md")), "plan.md was replaced by the three templates");
});

/** A task file with the one block only the big shape contributes removed, which
 *  is what makes everything else comparable across the two shapes. */
function stripBoundary(body: string): string {
  return body.replace(/\n## Must not change\n[\s\S]*?(?=\n## Out of scope\n)/, "");
}

test("a plan built from spec-full plus tasks decomposes into the same task file as one built from spec-lite, but for the regression boundary", () => {
  const files: Record<string, Record<string, string>> = {};
  for (const shape of ["lite", "full"] as const) {
    withTempDir("p2p2-viber-", (dir) => {
      seed(dir, planBody(TWO_TASKS, 2, CONTRACT, shape));

      const result = run(dir, {}, [PLAN_REL, "--split"]);
      assert.equal(result.status, 0, `${shape} -> stderr: ${result.stderr}`);
      assert.deepEqual(taskFiles(dir), ["T1.md", "T2.md"], shape);

      files[shape] = { T1: readRun(dir, "tasks/T1.md"), T2: readRun(dir, "tasks/T2.md") };
      // every OTHER section the big shape adds is WHAT and WHY: it rides into
      // spec.md, never into a coder's file
      assert.match(readRun(dir, "spec.md"), shape === "full" ? /^## Glossary$/m : /^## Scope$/m, shape);
    });
  }

  for (const id of ["T1", "T2"]) {
    // the regression boundary every coder of the run holds, ahead of the
    // out-of-scope list: the one thing the big shape hands a task file
    assert.match(
      files.full![id]!,
      /\n## Must not change\n- The public catalogue stays reachable without an account\.\n\n## Out of scope\n/,
      id,
    );
    assert.doesNotMatch(files.lite![id]!, /Must not change/, id);
    assert.doesNotMatch(files.lite![id]!, /public catalogue/, id);

    // and nothing else differs by shape
    const full = stripBoundary(files.full![id]!);
    assert.deepEqual(headings(full), headings(files.lite![id]!), `${id} sections differ beyond the boundary`);
    assert.equal(full, files.lite![id], `${id} differs beyond the boundary`);
  }
});

test("a spec-full plan carrying no Must not change section decomposes exactly like spec-lite", () => {
  const files: Record<string, string> = {};
  for (const shape of ["lite", "full"] as const) {
    withTempDir("p2p2-viber-", (dir) => {
      // the big shape with that one section dropped: the script reads an anchor,
      // never a shape, so an absent one contributes nothing rather than failing
      const body = planBody(TWO_TASKS, 2, CONTRACT, shape).replace(
        "### Must not change\n\n- The public catalogue stays reachable without an account.\n\n",
        "",
      );
      assert.ok(shape === "lite" || !body.includes("Must not change"), "the fixture still carries the section");
      seed(dir, body);

      assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0, shape);
      files[shape] = readRun(dir, "tasks/T1.md");
    });
  }
  assert.equal(files.full, files.lite);
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

test("an untracked work/ trail file beside the plan stays out of the decomposition commit and stays untracked", () => {
  withGitRepo((repo) => {
    write(repo.dir, "README.md", "seed\n");
    repo.git("add", "-A");
    repo.git("commit", "-m", "seed");

    seed(repo.dir, planBody(TWO_TASKS));
    write(repo.dir, `${PLAN_DIR}/work/T3-notes.md`, "a coder's own trail, not the decomposition\n");

    const result = run(repo.dir, repo.env, [PLAN_REL, "--split"]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

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
    assert.ok(!committed.includes(`${PLAN_DIR}/work/T3-notes.md`));

    // still on disk, still untracked - never staged, never committed
    assert.equal(
      fs.readFileSync(path.join(repo.dir, `${PLAN_DIR}/work/T3-notes.md`), "utf-8"),
      "a coder's own trail, not the decomposition\n",
    );
    assert.match(repo.git("status", "--short").stdout, /\?\? .*work\//);
  });
});

test("a plan tied to an issue gets its decomposition commit footed with Refs: #<N>, and one without an issue gets no footer", () => {
  const cases: Array<[frontmatter: string[], body: RegExp]> = [
    [["---", "source: /home/u/plans/add-login.md", "issue: https://github.com/acme/widgets/issues/42", "---", ""], /^Refs: #42\n*$/],
    [["---", "source: /home/u/plans/add-login.md", "---", ""], /^\n*$/],
    [["---", "issue: https://github.com/acme/widgets/pull/42", "---", ""], /^\n*$/],
  ];
  for (const [frontmatter, body] of cases) {
    withGitRepo((repo) => {
      write(repo.dir, "README.md", "seed\n");
      repo.git("add", "-A");
      repo.git("commit", "-m", "seed");
      seed(repo.dir, frontmatter.join("\n") + planBody(TWO_TASKS));

      const result = run(repo.dir, repo.env, [PLAN_REL, "--split"]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(subjects(repo)[0], "chore(viber): decompose plan 2026-09-20-10-00-00_add-login");
      assert.match(repo.git("log", "-1", "--format=%b").stdout, body);
    });
  }
});

test("--split writes the run's state file, and a later --split leaves the progress in it untouched", () => {
  withTempDir("p2p2-viber-", (dir) => {
    seed(dir, planBody(TWO_TASKS));

    assert.equal(run(dir, {}, [PLAN_REL, "--split"]).status, 0);
    assert.equal(
      readRun(dir, "status.md"),
      "# status\n\nprogress: 0/2\ndone: none\nskipped: none\nunreviewed: none\ndeferred: none\nclosed: none\n",
    );

    // a resume splits again: the file is the build's progress, never reset by it
    seedStatus(dir, {
      progress: "1/2",
      done: "T1",
      skipped: "none",
      unreviewed: "none",
      deferred: "none",
      closed: "none",
    });
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
