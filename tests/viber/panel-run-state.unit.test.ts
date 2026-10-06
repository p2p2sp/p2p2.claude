/*
 * panel-run-state.unit.test.ts - proves the pure run-state functions of the task
 * panel (viber/hooks/panel/run-state.ts): which directory holds the runs, whether
 * cleanup is on, the tasks of a plan, the done/skipped/deferred entries of a
 * status.md, which candidate run is the active one and the panel rows, states
 * and counts built from a run and the running set.
 *
 * Every case feeds text in and reads the returned value: no file, no process.
 * The viber.yml grammar mirrors viber/scripts/config.sh (group_value and the
 * switch reader), so each case spells the yml the way a project writes it.
 *   node --test tests/viber/panel-run-state.unit.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";

import {
  activeRun,
  isCleanupOn,
  panelOf,
  planTasks,
  runStatus,
  runsDirectory,
} from "../../viber/hooks/panel/run-state.ts";
import type { ActiveRun, RunCandidate, RunStatus } from "../../viber/hooks/panel/run-state.ts";

function planOf(...headings: string[]): string {
  const blocks = headings.map((h) => `<!-- TASK -->\n### ${h}\n- TDD: required\n<!-- /TASK -->\n`);
  return `# plan\n\n## Tasks\n\n${blocks.join("\n")}\n## Contracts\n\n### C1 - Run state\n`;
}

function candidate(key: string, plan: string, status: string | null): RunCandidate {
  return { key, plan, status };
}

function runOf(ids: string[], status: Partial<RunStatus> = {}): ActiveRun {
  return {
    key: "r",
    tasks: ids.map((id) => ({ id, title: `Title of ${id}` })),
    status: { done: [], skipped: [], deferred: [], ...status },
  };
}

// ---------------------------------------------------------------------------
// runsDirectory
// ---------------------------------------------------------------------------

test("runsDirectory returns _specs for a file that does not exist", () => {
  assert.equal(runsDirectory(null), "_specs");
});

test("runsDirectory returns the configured name from the directories group", () => {
  assert.equal(runsDirectory("directories:\n  runs: work\n"), "work");
});

test("runsDirectory returns _specs for a value holding a slash", () => {
  assert.equal(runsDirectory("directories:\n  runs: a/b\n"), "_specs");
});

test("runsDirectory returns _specs for a value holding a character outside the allowed set", () => {
  assert.equal(runsDirectory("directories:\n  runs: my$runs\n"), "_specs");
});

test("runsDirectory returns _specs for a single dot", () => {
  assert.equal(runsDirectory("directories:\n  runs: .\n"), "_specs");
});

test("runsDirectory returns _specs for a double dot", () => {
  assert.equal(runsDirectory("directories:\n  runs: ..\n"), "_specs");
});

test("runsDirectory returns _specs for a runs key outside the directories group", () => {
  assert.equal(runsDirectory("build:\n  runs: work\n"), "_specs");
});

test("runsDirectory returns _specs for a runs key of a group opened after directories closes", () => {
  assert.equal(runsDirectory("directories:\n  specs: x\nother:\n  runs: work\n"), "_specs");
});

test("runsDirectory reads a runs line at a deeper indentation inside the group", () => {
  assert.equal(runsDirectory("directories:\n    nested:\n        runs: deep\n"), "deep");
});

test("runsDirectory keeps the group open across a blank line and a column-0 comment", () => {
  assert.equal(runsDirectory("directories:\n  specs: x\n\n# note\n  runs: work\n"), "work");
});

test("runsDirectory cuts the value at the first space or comment and drops a CR", () => {
  assert.equal(runsDirectory("directories:\r\n  runs: work # where\r\n"), "work");
});

test("runsDirectory reads the first runs line when two are given", () => {
  assert.equal(runsDirectory("directories:\n  runs: first\n  runs: second\n"), "first");
});

// ---------------------------------------------------------------------------
// isCleanupOn
// ---------------------------------------------------------------------------

test("isCleanupOn is false for a file that does not exist", () => {
  assert.equal(isCleanupOn(null), false);
});

test("isCleanupOn is true for cleanup true inside build", () => {
  assert.equal(isCleanupOn("build:\n  cleanup: true\n"), true);
});

test("isCleanupOn reads true in any letter case", () => {
  assert.equal(isCleanupOn("build:\n  cleanup: TrUe\n"), true);
});

test("isCleanupOn is false for cleanup false", () => {
  assert.equal(isCleanupOn("build:\n  cleanup: false\n"), false);
});

test("isCleanupOn is false for a value that only starts with true", () => {
  assert.equal(isCleanupOn("build:\n  cleanup: truely\n"), false);
});

test("isCleanupOn cuts the value at a comment", () => {
  assert.equal(isCleanupOn("build:\n  cleanup: true # on\n"), true);
});

test("isCleanupOn is false when the whole value is a comment", () => {
  assert.equal(isCleanupOn("build:\n  cleanup: #true\n"), false);
});

test("isCleanupOn is false for a cleanup line outside build", () => {
  assert.equal(isCleanupOn("github:\n  cleanup: true\n"), false);
});

test("isCleanupOn is false for a column-0 cleanup line", () => {
  assert.equal(isCleanupOn("cleanup: true\n"), false);
});

test("isCleanupOn takes the first cleanup line of build", () => {
  assert.equal(isCleanupOn("build:\n  cleanup: false\n  cleanup: true\n"), false);
});

test("isCleanupOn is false for a cleanup line inside the extensions map of build", () => {
  const yml = "build:\n  extensions:\n    cleanup: true\n    other:\n      cleanup: true\n";
  assert.equal(isCleanupOn(yml), false);
});

test("isCleanupOn reads a build cleanup line that follows the extensions map", () => {
  const yml = "build:\n  extensions:\n    docs:\n      parallel: true\n  cleanup: true\n";
  assert.equal(isCleanupOn(yml), true);
});

test("isCleanupOn keeps the extensions map open across a blank line and a comment", () => {
  const yml = "build:\n  extensions:\n    docs:\n\n    # note\n    cleanup: true\n";
  assert.equal(isCleanupOn(yml), false);
});

test("isCleanupOn reads a cleanup line of build that comes before the extensions map", () => {
  const yml = "build:\n  cleanup: true\n  extensions:\n    docs:\n";
  assert.equal(isCleanupOn(yml), true);
});

test("isCleanupOn reads a CRLF file", () => {
  assert.equal(isCleanupOn("build:\r\n  cleanup: true\r\n"), true);
});

// ---------------------------------------------------------------------------
// planTasks
// ---------------------------------------------------------------------------

test("planTasks returns the id and title of each task block in plan order", () => {
  assert.deepEqual(planTasks(planOf("T1 - First step", "T2 - Second step")), [
    { id: "T1", title: "First step" },
    { id: "T2", title: "Second step" },
  ]);
});

test("planTasks splits a heading at its first dash separator", () => {
  assert.deepEqual(planTasks(planOf("T3 - Read a - b")), [{ id: "T3", title: "Read a - b" }]);
});

test("planTasks ignores the S and C headings outside the task blocks", () => {
  const plan = [
    "## Behaviour",
    "### S1 - Button appears",
    "## Tasks",
    "<!-- TASK -->",
    "### T1 - Only task",
    "<!-- /TASK -->",
    "## Contracts",
    "### C1 - Run state",
    "",
  ].join("\n");
  assert.deepEqual(planTasks(plan), [{ id: "T1", title: "Only task" }]);
});

test("planTasks ignores a task block that sits above the Tasks heading", () => {
  const plan = "<!-- TASK -->\n### T9 - Early\n<!-- /TASK -->\n## Tasks\n";
  assert.deepEqual(planTasks(plan), []);
});

test("planTasks returns no task for a plan with no task block", () => {
  assert.deepEqual(planTasks("# plan\n\n## Tasks\n\nnothing yet\n"), []);
});

test("planTasks reads a CRLF plan", () => {
  const plan = "## Tasks\r\n<!-- TASK -->\r\n### T1 - Windows step\r\n<!-- /TASK -->\r\n";
  assert.deepEqual(planTasks(plan), [{ id: "T1", title: "Windows step" }]);
});

test("planTasks takes the first heading of a block as its task", () => {
  const plan = "## Tasks\n<!-- TASK -->\n### T1 - Real\n### T2 - Stray\n<!-- /TASK -->\n";
  assert.deepEqual(planTasks(plan), [{ id: "T1", title: "Real" }]);
});

// ---------------------------------------------------------------------------
// runStatus
// ---------------------------------------------------------------------------

test("runStatus returns empty lists for null text", () => {
  assert.deepEqual(runStatus(null), { done: [], skipped: [], deferred: [] });
});

test("runStatus returns empty lists for empty text", () => {
  assert.deepEqual(runStatus(""), { done: [], skipped: [], deferred: [] });
});

test("runStatus reads every space-separated id of the done line", () => {
  assert.deepEqual(runStatus("done: T1 T2 T3\n").done, ["T1", "T2", "T3"]);
});

test("runStatus reads every space-separated id of the skipped line", () => {
  assert.deepEqual(runStatus("skipped: T4 T5\n").skipped, ["T4", "T5"]);
});

test("runStatus treats none on the done line as no entry", () => {
  assert.deepEqual(runStatus("done: none\n").done, []);
});

test("runStatus treats none on the skipped line as no entry", () => {
  assert.deepEqual(runStatus("skipped: none\n").skipped, []);
});

test("runStatus treats none on the deferred line as no entry", () => {
  assert.deepEqual(runStatus("deferred: none\n").deferred, []);
});

test("runStatus splits a deferred entry at its first colon", () => {
  assert.deepEqual(runStatus("deferred: T7:src/a.ts T8:C:/x/b.ts\n").deferred, [
    { id: "T7", path: "src/a.ts" },
    { id: "T8", path: "C:/x/b.ts" },
  ]);
});

test("runStatus ignores every key but done, skipped and deferred", () => {
  const text = [
    "# status",
    "progress: 2/5",
    "unreviewed: T1",
    "closed: memory",
    "decision: T1: done: T9",
    "",
    "done: T1",
  ].join("\n");
  assert.deepEqual(runStatus(text), { done: ["T1"], skipped: [], deferred: [] });
});

test("runStatus reads a CRLF status", () => {
  assert.deepEqual(runStatus("done: T1 T2\r\nskipped: T3\r\n"), {
    done: ["T1", "T2"],
    skipped: ["T3"],
    deferred: [],
  });
});

// ---------------------------------------------------------------------------
// activeRun
// ---------------------------------------------------------------------------

test("activeRun returns null for no candidate", () => {
  assert.equal(activeRun([], false), null);
});

test("activeRun returns null when every candidate has no task", () => {
  const empty = "## Tasks\n\nnothing\n";
  assert.equal(activeRun([candidate("a_run", empty, null), candidate("b_run", empty, null)], false), null);
});

test("activeRun picks the candidate whose key sorts last among those with tasks", () => {
  const found = activeRun(
    [
      candidate("2026-01-01_old", planOf("T1 - Old"), null),
      candidate("2026-03-01_new", planOf("T1 - New"), null),
      candidate("2026-02-01_mid", planOf("T1 - Mid"), null),
    ],
    false,
  );
  assert.equal(found?.key, "2026-03-01_new");
});

test("activeRun skips a newer candidate that has no task", () => {
  const found = activeRun(
    [candidate("2026-01-01_old", planOf("T1 - Old"), null), candidate("2026-09-01_new", "## Tasks\n", null)],
    false,
  );
  assert.equal(found?.key, "2026-01-01_old");
});

test("activeRun returns the tasks and the status of the picked run", () => {
  const found = activeRun([candidate("r", planOf("T1 - One", "T2 - Two"), "done: T1\ndeferred: T1:a.ts\n")], false);
  assert.deepEqual(found, {
    key: "r",
    tasks: [
      { id: "T1", title: "One" },
      { id: "T2", title: "Two" },
    ],
    status: { done: ["T1"], skipped: [], deferred: [{ id: "T1", path: "a.ts" }] },
  });
});

test("activeRun keeps a run with one task still open when cleanup is off", () => {
  const found = activeRun([candidate("r", planOf("T1 - One", "T2 - Two"), "done: T1\n")], false);
  assert.equal(found?.key, "r");
});

test("activeRun returns null when cleanup is off and every task is done or skipped", () => {
  const found = activeRun([candidate("r", planOf("T1 - One", "T2 - Two"), "done: T1\nskipped: T2\n")], false);
  assert.equal(found, null);
});

test("activeRun keeps a fully settled run when cleanup is on", () => {
  const found = activeRun([candidate("r", planOf("T1 - One", "T2 - Two"), "done: T1\nskipped: T2\n")], true);
  assert.equal(found?.key, "r");
});

test("activeRun never falls back to an older run when the newest one is settled and cleanup is off", () => {
  const found = activeRun(
    [
      candidate("2026-01-01_old", planOf("T1 - Old"), null),
      candidate("2026-02-01_new", planOf("T1 - New"), "done: T1\n"),
    ],
    false,
  );
  assert.equal(found, null);
});

// ---------------------------------------------------------------------------
// panelOf
// ---------------------------------------------------------------------------

test("panelOf returns one row per task in plan order carrying its id and title", () => {
  const panel = panelOf(runOf(["T3", "T1", "T2"]), []);
  assert.deepEqual(
    panel.rows.map((row) => [row.id, row.title]),
    [
      ["T3", "Title of T3"],
      ["T1", "Title of T1"],
      ["T2", "Title of T2"],
    ],
  );
});

test("panelOf carries the key of the run", () => {
  assert.equal(panelOf(runOf(["T1"]), []).key, "r");
});

test("panelOf marks a task on the done list as done", () => {
  assert.equal(panelOf(runOf(["T1"], { done: ["T1"] }), []).rows[0].state, "done");
});

test("panelOf marks a task on the skipped list as skipped", () => {
  assert.equal(panelOf(runOf(["T1"], { skipped: ["T1"] }), []).rows[0].state, "skipped");
});

test("panelOf keeps a done task done even when it is in the running set", () => {
  assert.equal(panelOf(runOf(["T1"], { done: ["T1"] }), ["T1"]).rows[0].state, "done");
});

test("panelOf keeps a skipped task skipped even when it is in the running set", () => {
  assert.equal(panelOf(runOf(["T1"], { skipped: ["T1"] }), ["T1"]).rows[0].state, "skipped");
});

test("panelOf marks a task in the running set and on neither list as running", () => {
  assert.equal(panelOf(runOf(["T1", "T2"]), ["T2"]).rows[1].state, "running");
});

test("panelOf marks a task in no list and not running as pending", () => {
  assert.equal(panelOf(runOf(["T1", "T2"]), ["T2"]).rows[0].state, "pending");
});

test("panelOf ignores a running id that is no task of the plan", () => {
  assert.deepEqual(
    panelOf(runOf(["T1"]), ["T9"]).rows.map((row) => row.state),
    ["pending"],
  );
});

test("panelOf gives each row the deferred paths of its own task only", () => {
  const deferred = [
    { id: "T1", path: "a.ts" },
    { id: "T2", path: "b.ts" },
    { id: "T1", path: "c.ts" },
  ];
  assert.deepEqual(
    panelOf(runOf(["T1", "T2", "T3"], { deferred }), []).rows.map((row) => row.deferred),
    [["a.ts", "c.ts"], ["b.ts"], []],
  );
});

test("panelOf counts the tasks on the done list as done", () => {
  assert.equal(panelOf(runOf(["T1", "T2", "T3"], { done: ["T1", "T3"], skipped: ["T2"] }), []).done, 2);
});

test("panelOf counts every task as total", () => {
  assert.equal(panelOf(runOf(["T1", "T2", "T3"], { done: ["T1"] }), ["T2"]).total, 3);
});
