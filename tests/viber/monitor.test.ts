/*
 * monitor.test.ts - proves viber/hooks/monitor/monitor.ts, the build monitor's
 * pure logic: reading the stdout of `plan-path.sh` and `plan-index.sh --split`,
 * reading a coder or reviewer dispatch, choosing the active run, the status
 * line text, the panel rows, the events between two views and their toasts.
 *
 * monitor.ts carries no engine import on purpose: this file imports it
 * directly, so an engine import added there fails every case here at load.
 * The engine layer (register.tsx) is proven elsewhere, under `claude plugin
 * test`. The script samples below are copied from the scripts' own stdout
 * shapes; they are inputs, never run.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/monitor.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";

import {
  parseIndex,
  parseRunList,
  parseDispatch,
  pickRun,
  statusLine,
  panelRows,
  diffEvents,
  toastText,
  type Candidate,
  type Flight,
  type IndexTask,
  type RunIndex,
} from "../../viber/hooks/monitor/monitor.ts";

const PLAN = "docs/_specs/2026-10-03-09-08-46_add-search/plan.md";

/** A `plan-index.sh --split` stdout carrying every line kind the monitor reads,
 *  plus the ones it ignores (unreviewed, closed, next, verify, dirty, orphan). */
const INDEX_SAMPLE = [
  `plan: ${PLAN}`,
  "title: Add search",
  "progress: 2/4",
  "skipped: T3",
  "unreviewed: T1",
  "deferred: T4:src/a.ts T4:src/b.ts",
  "closed: memory rules",
  "decision: T2: keep the old cache",
  "ruling: T2: retry | why: flaky run | cost if wrong: one attempt",
  "ruling: tests: accept | why: pre-existing | cost if wrong: none",
  "next: part 2 of 3 - Search ranking",
  "tasks: id | state | tdd | excl | deps | feeds | files | title",
  "T1 | done | required | - | - | C1:2 | src/a.ts,src/b.ts | Index the documents",
  "T2 | done | none | - | T1 | - | src/c.ts | Rank the hits",
  "T3 | skipped | none | - | - | - | src/d.ts | Drop the legacy API",
  "T4 | todo | required | yes | T1,T2 | - | src/e.ts | Show results | with paging",
  "verify: T1 | node --test tests/a.test.ts",
  "verify: T4 | grep -n \"x | y\" src/e.ts",
  "dirty: T4 | src/e.ts",
  "orphan: lib/x.ts",
  "",
].join("\n");

/** parseIndex's view of `stdout`, failing the case when there is none. */
function parsed(stdout: string): RunIndex {
  const index = parseIndex(stdout);
  assert.ok(index, "parseIndex returned no view");
  return index;
}

test("parseIndex reads the plan, title and progress of a plan-index.sh sample", () => {
  const index = parsed(INDEX_SAMPLE);
  assert.deepEqual(
    { plan: index.plan, title: index.title, done: index.done, total: index.total },
    { plan: PLAN, title: "Add search", done: 2, total: 4 },
  );
});

test("parseIndex reads every task row with its id, state and title, a title holding ` | ` kept whole", () => {
  assert.deepEqual(parsed(INDEX_SAMPLE).tasks, [
    { id: "T1", state: "done", title: "Index the documents" },
    { id: "T2", state: "done", title: "Rank the hits" },
    { id: "T3", state: "skipped", title: "Drop the legacy API" },
    { id: "T4", state: "todo", title: "Show results | with paging" },
  ]);
});

test("parseIndex splits the skipped and deferred lines into their space-separated entries", () => {
  const index = parsed(INDEX_SAMPLE);
  assert.deepEqual({ skipped: index.skipped, deferred: index.deferred }, {
    skipped: ["T3"],
    deferred: ["T4:src/a.ts", "T4:src/b.ts"],
  });
});

test("parseIndex keeps every decision and ruling line's text after its label, in file order", () => {
  const index = parsed(INDEX_SAMPLE);
  assert.deepEqual({ decisions: index.decisions, rulings: index.rulings }, {
    decisions: ["T2: keep the old cache"],
    rulings: [
      "T2: retry | why: flaky run | cost if wrong: one attempt",
      "tests: accept | why: pre-existing | cost if wrong: none",
    ],
  });
});

test("parseIndex of a run with nothing skipped, deferred, decided or ruled leaves those lists empty", () => {
  const index = parsed([
    `plan: ${PLAN}`,
    "title: Add search",
    "progress: 0/1",
    "tasks: id | state | tdd | excl | deps | feeds | files | title",
    "T1 | todo | none | - | - | - | src/a.ts | Index the documents",
    "",
  ].join("\n"));
  assert.deepEqual([index.skipped, index.deferred, index.decisions, index.rulings], [[], [], [], []]);
});

/** Each case: what plan-index.sh printed -> no view. */
const NO_INDEX: Array<[string, string]> = [
  ["empty input (plan-index.sh without --split writes nothing)", ""],
  ["whitespace only", "\n  \n"],
  ["output with no progress line", `plan: ${PLAN}\ntitle: Add search\n`],
];

for (const [label, stdout] of NO_INDEX) {
  test(`parseIndex of ${label} is undefined`, () => {
    assert.equal(parseIndex(stdout), undefined);
  });
}

test("parseIndex reads CRLF line endings as plain ones (a Git Bash pipe on Windows)", () => {
  assert.deepEqual(parsed(INDEX_SAMPLE.replaceAll("\n", "\r\n")).tasks.at(-1), { id: "T4", state: "todo", title: "Show results | with paging" });
});

const OTHER = "docs/_specs/2026-09-18-09-12-44_add-login/plan.md";
const THIRD = "docs/_specs/2026-09-10-10-00-00_fix-cache/plan.md";

test("parseRunList returns the `path:` plan as the newest and every `open:` plan without its counter", () => {
  const list = parseRunList([
    `path: ${PLAN}`,
    "key: 2026-10-03-09-08-46_add-search",
    "state: existing",
    "branch: feature/add-search (kept)",
    `open: ${OTHER} | 2/6`,
    `open: ${THIRD} | 0/3`,
    "",
  ].join("\n"));
  assert.deepEqual(list, { newest: PLAN, open: [OTHER, THIRD] });
});

test("parseRunList of empty input has no newest plan and an empty open list (plan-path.sh exit 3 prints nothing)", () => {
  assert.deepEqual(parseRunList(""), { open: [] });
});

const RUN_DIR = "docs/_specs/2026-10-03-09-08-46_add-search";

/** A dispatch prompt as the implementor writes it, for task `id`. */
function taskPrompt(id: string): string {
  return [
    `task: ${RUN_DIR}/tasks/${id}.md`,
    `notes: ${RUN_DIR}/work/${id}-coder.md`,
    `out: .temp/viber/${id}/`,
    "refs: /home/me/.claude/plugins/cache/p2p2/viber/0.76.1/references",
  ].join("\n");
}

test("parseDispatch reads a viber:task-coder prompt as the coder of that task in the run's plan, at its tier", () => {
  assert.deepEqual(parseDispatch("viber:task-coder", taskPrompt("T5"), "opus"), {
    plan: PLAN, taskId: "T5", role: "coder", tier: "opus",
  });
});

test("parseDispatch reads a viber:task-reviewer prompt as the reviewer of that task, at its tier", () => {
  assert.deepEqual(parseDispatch("viber:task-reviewer", taskPrompt("T6"), "sonnet"), {
    plan: PLAN, taskId: "T6", role: "reviewer", tier: "sonnet",
  });
});

test("parseDispatch of a dispatch whose model is not one of the four tiers carries no tier", () => {
  assert.deepEqual(parseDispatch("viber:task-coder", taskPrompt("T5"), "claude-opus-5-5"), {
    plan: PLAN, taskId: "T5", role: "coder",
  });
});

test("parseDispatch reads a CRLF prompt's task line without the carriage return", () => {
  assert.equal(parseDispatch("viber:task-coder", taskPrompt("T5").replaceAll("\n", "\r\n"), "haiku")?.plan, PLAN);
});

/** Each case: subagent type, prompt -> not a dispatch. */
const NOT_DISPATCH: Array<[string, string, string]> = [
  ["another viber agent", "viber:arbiter", taskPrompt("T5")],
  ["another plugin's agent named task-coder", "other:task-coder", taskPrompt("T5")],
  ["a general-purpose agent", "general-purpose", taskPrompt("T5")],
  ["a type spelled like an inherited object key", "toString", taskPrompt("T5")],
  ["the repair coder's `spec:` form", "viber:task-coder", `report: ${RUN_DIR}/work/tests-1.md\nspec: ${RUN_DIR}/spec.md`],
  ["a `task:` line naming no task file", "viber:task-coder", `task: ${RUN_DIR}/plan.md`],
  ["an indented `task:` mention inside prose", "viber:task-reviewer", `see the  task: ${RUN_DIR}/tasks/T5.md line`],
];

for (const [label, type, prompt] of NOT_DISPATCH) {
  test(`parseDispatch of ${label} is undefined`, () => {
    assert.equal(parseDispatch(type, prompt, "sonnet"), undefined);
  });
}

/** Each case: candidates, the latest dispatch's plan -> the run shown. */
const PICKS: Array<[string, Candidate[], string | undefined, string | undefined]> = [
  [
    "the latest dispatch's run while it is unsettled, even when another changed later",
    [{ plan: PLAN, changedMs: 100, settled: false }, { plan: OTHER, changedMs: 900, settled: false }],
    PLAN,
    PLAN,
  ],
  [
    "the newest unsettled candidate once the latest dispatch's run is settled",
    [{ plan: PLAN, changedMs: 999, settled: true }, { plan: OTHER, changedMs: 500, settled: false }, { plan: THIRD, changedMs: 700, settled: false }],
    PLAN,
    THIRD,
  ],
  [
    "the newest unsettled candidate with no dispatch seen",
    [{ plan: PLAN, changedMs: 300, settled: false }, { plan: OTHER, changedMs: 800, settled: false }, { plan: THIRD, changedMs: 900, settled: true }],
    undefined,
    OTHER,
  ],
  [
    "the newest unsettled candidate when the latest dispatch's run is no candidate at all (archived)",
    [{ plan: OTHER, changedMs: 200, settled: false }, { plan: THIRD, changedMs: 100, settled: false }],
    PLAN,
    OTHER,
  ],
  [
    "nothing when every candidate is settled",
    [{ plan: PLAN, changedMs: 300, settled: true }, { plan: OTHER, changedMs: 800, settled: true }],
    PLAN,
    undefined,
  ],
  ["nothing with no candidate", [], undefined, undefined],
];

for (const [label, candidates, lastDispatchPlan, expected] of PICKS) {
  test(`pickRun picks ${label}`, () => {
    assert.equal(pickRun(candidates, lastDispatchPlan), expected);
  });
}

/** A run view of PLAN holding `tasks`, its counters derived from them as
 *  plan-index.sh derives them; `extra` overrides any other field. */
function view(tasks: IndexTask[], extra: Partial<RunIndex> = {}): RunIndex {
  return {
    plan: PLAN,
    title: "Add search",
    done: tasks.filter((task) => task.state === "done").length,
    total: tasks.length,
    skipped: tasks.filter((task) => task.state === "skipped").map((task) => task.id),
    deferred: [],
    decisions: [],
    rulings: [],
    tasks,
    ...extra,
  };
}

const MID_BUILD = view([
  { id: "T1", state: "done", title: "Index the documents" },
  { id: "T2", state: "done", title: "Rank the hits" },
  { id: "T3", state: "skipped", title: "Drop the legacy API" },
  { id: "T4", state: "todo", title: "Show results" },
  { id: "T5", state: "todo", title: "Page the results" },
  { id: "T6", state: "todo", title: "Highlight matches" },
]);

const FLIGHTS: Flight[] = [
  { agentId: "a1", dispatch: { plan: PLAN, taskId: "T5", role: "coder", tier: "opus" } },
  { agentId: "a2", dispatch: { plan: PLAN, taskId: "T6", role: "reviewer", tier: "sonnet" } },
];

test("statusLine renders the done count over the total and every in-flight task with its role and tier", () => {
  assert.equal(statusLine(MID_BUILD, FLIGHTS), "viber 2/6 | T5 coding opus | T6 reviewing sonnet");
});

test("statusLine with nothing in flight renders the progress alone", () => {
  assert.equal(statusLine(MID_BUILD, []), "viber 2/6");
});

test("statusLine names an in-flight task with no known tier by its role alone", () => {
  assert.equal(
    statusLine(MID_BUILD, [{ agentId: "a1", dispatch: { plan: PLAN, taskId: "T4", role: "coder" } }]),
    "viber 2/6 | T4 coding",
  );
});

test("statusLine leaves out a task in flight for another run (two builds at once show only the active one)", () => {
  assert.equal(
    statusLine(MID_BUILD, [...FLIGHTS, { agentId: "a3", dispatch: { plan: OTHER, taskId: "T1", role: "coder", tier: "haiku" } }]),
    "viber 2/6 | T5 coding opus | T6 reviewing sonnet",
  );
});

test("statusLine with no index is undefined, whatever is in flight (no active run shows nothing)", () => {
  assert.equal(statusLine(undefined, FLIGHTS), undefined);
});

test("panelRows marks each in-flight task coding or reviewing and carries every task's last coder tier and attempts, keyed `<plan>#<id>`", () => {
  const rows = panelRows(
    MID_BUILD,
    FLIGHTS,
    { [`${PLAN}#T2`]: 1, [`${PLAN}#T5`]: 2, [`${PLAN}#T6`]: 1 },
    { [`${PLAN}#T2`]: "haiku", [`${PLAN}#T5`]: "opus", [`${PLAN}#T6`]: "sonnet" },
  );
  assert.deepEqual(rows, [
    { id: "T1", title: "Index the documents", state: "done", attempts: 0, deferred: [] },
    { id: "T2", title: "Rank the hits", state: "done", tier: "haiku", attempts: 1, deferred: [] },
    { id: "T3", title: "Drop the legacy API", state: "skipped", attempts: 0, deferred: [] },
    { id: "T4", title: "Show results", state: "todo", attempts: 0, deferred: [] },
    { id: "T5", title: "Page the results", state: "coding", tier: "opus", attempts: 2, deferred: [] },
    { id: "T6", title: "Highlight matches", state: "reviewing", tier: "sonnet", attempts: 1, deferred: [] },
  ]);
});

test("panelRows ignores flights, attempts and tiers recorded for another run's task of the same id", () => {
  const rows = panelRows(
    MID_BUILD,
    [{ agentId: "a3", dispatch: { plan: OTHER, taskId: "T4", role: "coder", tier: "haiku" } }],
    { [`${OTHER}#T4`]: 3 },
    { [`${OTHER}#T4`]: "haiku" },
  );
  assert.deepEqual(rows[3], { id: "T4", title: "Show results", state: "todo", attempts: 0, deferred: [] });
});

test("panelRows hands each task the paths its own deferred entries owe, a path holding a colon kept whole", () => {
  const rows = panelRows(view(MID_BUILD.tasks, { deferred: ["T4:src/a.ts", "T6:src/c.ts", "T4:C:/w/b.ts"] }), [], {}, {});
  assert.deepEqual(rows.map((row) => [row.id, row.deferred]), [
    ["T1", []], ["T2", []], ["T3", []], ["T4", ["src/a.ts", "C:/w/b.ts"]], ["T5", []], ["T6", ["src/c.ts"]],
  ]);
});

/** MID_BUILD with the named tasks moved to a new state, counters re-derived. */
function after(states: Record<string, IndexTask["state"]>, extra: Partial<RunIndex> = {}): RunIndex {
  return view(MID_BUILD.tasks.map((task) => ({ ...task, state: states[task.id] ?? task.state })), extra);
}

const RULING = "T5: retry | why: flaky run | cost if wrong: one attempt";
const SETTLED = after({ T4: "done", T5: "done", T6: "skipped" });

/** Each case: previous view, next view -> the events between them. */
const DIFFS: Array<[string, RunIndex | undefined, RunIndex | undefined, ReturnType<typeof diffEvents>]> = [
  [
    "one task-done per newly done id, in task order, carrying the new progress",
    MID_BUILD,
    after({ T4: "done", T6: "done" }),
    [{ kind: "task-done", id: "T4", done: 4, total: 6 }, { kind: "task-done", id: "T6", done: 4, total: 6 }],
  ],
  [
    "no task-done for a newly skipped task",
    MID_BUILD,
    after({ T4: "skipped" }),
    [],
  ],
  [
    "one ruling per new ruling, an earlier one not repeated",
    after({}, { rulings: [RULING] }),
    after({}, { rulings: [RULING, "tests: accept | why: pre-existing | cost if wrong: none"] }),
    [{ kind: "ruling", text: "tests: accept | why: pre-existing | cost if wrong: none" }],
  ],
  [
    "a ruling recorded twice with the same text counted as new once more",
    after({}, { rulings: [RULING] }),
    after({}, { rulings: [RULING, RULING] }),
    [{ kind: "ruling", text: RULING }],
  ],
  [
    "the last task-done, then build-end with the final count, when the run turns settled",
    after({ T5: "done", T6: "skipped" }),
    SETTLED,
    [{ kind: "task-done", id: "T4", done: 4, total: 6 }, { kind: "build-end", done: 4, total: 6 }],
  ],
  [
    "build-end with the last known count when the run disappears (archived)",
    MID_BUILD,
    undefined,
    [{ kind: "build-end", done: 2, total: 6 }],
  ],
  ["nothing when no previous view exists (the first refresh of a session)", undefined, SETTLED, []],
  ["nothing when the previous view was already settled and the run disappears", SETTLED, undefined, []],
  ["nothing when the previous view was already settled and stays so", SETTLED, SETTLED, []],
  ["nothing when nothing changed", MID_BUILD, after({}), []],
  [
    "nothing when the next view is another run (two builds at once switch the view, they do not end it)",
    MID_BUILD,
    view(SETTLED.tasks, { plan: OTHER }),
    [],
  ],
];

for (const [label, prev, next, expected] of DIFFS) {
  test(`diffEvents yields ${label}`, () => {
    assert.deepEqual(diffEvents(prev, next), expected);
  });
}

/** Each case: event -> its one-line toast. */
const TOASTS: Array<[string, Parameters<typeof toastText>[0], string]> = [
  ["a task-done names the task and the new progress", { kind: "task-done", id: "T4", done: 4, total: 6 }, "viber: T4 done (4/6)"],
  ["a ruling names its subject and the ruling, without its why and cost", { kind: "ruling", text: RULING }, "viber ruling on T5: retry"],
  ["a ruling on a fixed subject names that subject", { kind: "ruling", text: "final-review: accept | why: minor only | cost if wrong: none" }, "viber ruling on final-review: accept"],
  ["a ruling of no known shape is shown whole", { kind: "ruling", text: "accept everything" }, "viber ruling: accept everything"],
  ["a build-end names the final count", { kind: "build-end", done: 4, total: 6 }, "viber build finished: 4/6 done"],
  ["a question says the build waits for an answer", { kind: "question" }, "viber build is waiting for your answer"],
];

for (const [label, event, expected] of TOASTS) {
  test(`toastText of ${label}`, () => {
    assert.equal(toastText(event), expected);
  });
}
