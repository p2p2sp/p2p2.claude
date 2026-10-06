/*
 * panel-run-events.unit.test.ts - proves the two pure functions of the task panel's
 * hooks module that recognise a run event: the task id carried by a `viber:task-coder`
 * or `viber:task-reviewer` dispatch, and a Bash command calling one of viber's run scripts.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/panel-run-events.unit.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";

import { dispatchedTaskId, isRunScriptCall } from "../../viber/hooks/panel/run-events.ts";

const DIR = "docs/_specs/2026-10-06-10-21-02_viber-task-panel-in-the-terminal";

function prompt(taskLine: string): string {
  return `${taskLine}\nnotes: ${DIR}/work/T3-coder.md\nout: .temp/viber/T3/\nrefs: refs`;
}

test("a viber:task-coder dispatch returns the id of its task: line", () => {
  assert.equal(dispatchedTaskId("viber:task-coder", prompt(`task: ${DIR}/tasks/T3.md`)), "T3");
});

test("a viber:task-reviewer dispatch returns the id of its task: line", () => {
  assert.equal(dispatchedTaskId("viber:task-reviewer", prompt(`task: ${DIR}/tasks/T12.md`)), "T12");
});

test("a task: line with Windows separators still returns its id", () => {
  assert.equal(dispatchedTaskId("viber:task-coder", prompt("task: docs\\_specs\\run\\tasks\\T7.md")), "T7");
});

test("a dispatch of another subagent type returns null", () => {
  assert.equal(dispatchedTaskId("viber:arbiter", prompt(`task: ${DIR}/tasks/T3.md`)), null);
});

test("a dispatch with no subagent type returns null", () => {
  assert.equal(dispatchedTaskId(undefined, prompt(`task: ${DIR}/tasks/T3.md`)), null);
});

test("a dispatch with no prompt returns null", () => {
  assert.equal(dispatchedTaskId("viber:task-coder", undefined), null);
});

test("a prompt with no task: line returns null", () => {
  assert.equal(dispatchedTaskId("viber:task-coder", prompt(`report: ${DIR}/work/T3-coder.md`)), null);
});

test("a task: line whose path is not under a tasks directory returns null", () => {
  assert.equal(dispatchedTaskId("viber:task-coder", prompt(`task: ${DIR}/notes/T3.md`)), null);
});

test("a command calling plan-path.sh is a run script call", () => {
  assert.equal(isRunScriptCall('"${CLAUDE_PLUGIN_ROOT}/scripts/plan-path.sh" --newest'), true);
});

test("a command calling plan-index.sh is a run script call", () => {
  assert.equal(isRunScriptCall('"/p/viber/scripts/plan-index.sh" docs/_specs/x/plan.md'), true);
});

test("a command calling commit-task.sh is a run script call", () => {
  assert.equal(isRunScriptCall('"/p/viber/scripts/commit-task.sh" "plan" "T3"'), true);
});

test("a command calling archive-run.sh is a run script call", () => {
  assert.equal(isRunScriptCall('"/p/viber/scripts/archive-run.sh" "plan"'), true);
});

test("a command calling another script is not a run script call", () => {
  assert.equal(isRunScriptCall('"/p/viber/scripts/config.sh" --all'), false);
});

test("an ordinary command is not a run script call", () => {
  assert.equal(isRunScriptCall("git status"), false);
});
