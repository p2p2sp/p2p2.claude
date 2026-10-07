/*
 * panel-run-events.unit.test.ts - proves the pure functions of the task panel's hooks
 * module that recognise a run event: the run key and task id carried by a
 * `viber:task-coder` or `viber:task-reviewer` dispatch, a Bash command calling one of
 * viber's run scripts, and the run key a build's own script call claims for the session.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/panel-run-events.unit.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";

import { claimedRunKey, dispatchedTask, isRunScriptCall } from "../../viber/hooks/panel/run-events.ts";

const KEY = "2026-10-06-10-21-02_viber-task-panel-in-the-terminal";
const DIR = `docs/_specs/${KEY}`;

function prompt(taskLine: string): string {
  return `${taskLine}\nnotes: ${DIR}/work/T3-coder.md\nout: .temp/viber/T3/\nrefs: refs`;
}

test("a viber:task-coder dispatch returns the run key and id of its task: line", () => {
  assert.deepEqual(dispatchedTask("viber:task-coder", prompt(`task: ${DIR}/tasks/T3.md`)), { run: KEY, id: "T3" });
});

test("a viber:task-reviewer dispatch returns the run key and id of its task: line", () => {
  assert.deepEqual(dispatchedTask("viber:task-reviewer", prompt(`task: ${DIR}/tasks/T12.md`)), { run: KEY, id: "T12" });
});

test("a task: line with Windows separators still returns its run key and id", () => {
  assert.deepEqual(dispatchedTask("viber:task-coder", prompt("task: docs\\_specs\\run\\tasks\\T7.md")), { run: "run", id: "T7" });
});

test("a task: line with an absolute path returns the directory holding tasks as the run key", () => {
  assert.deepEqual(dispatchedTask("viber:task-coder", prompt(`task: C:\\p\\${DIR}/tasks/T2.md`)), { run: KEY, id: "T2" });
});

test("a dispatch of another subagent type returns null", () => {
  assert.equal(dispatchedTask("viber:arbiter", prompt(`task: ${DIR}/tasks/T3.md`)), null);
});

test("a dispatch with no subagent type returns null", () => {
  assert.equal(dispatchedTask(undefined, prompt(`task: ${DIR}/tasks/T3.md`)), null);
});

test("a dispatch with no prompt returns null", () => {
  assert.equal(dispatchedTask("viber:task-coder", undefined), null);
});

test("a prompt with no task: line returns null", () => {
  assert.equal(dispatchedTask("viber:task-coder", prompt(`report: ${DIR}/work/T3-coder.md`)), null);
});

test("a task: line whose path is not under a tasks directory returns null", () => {
  assert.equal(dispatchedTask("viber:task-coder", prompt(`task: ${DIR}/notes/T3.md`)), null);
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

test("a commit-task.sh call on a run's plan claims that run's key", () => {
  assert.equal(claimedRunKey(`"/p/viber/scripts/commit-task.sh" "${DIR}/plan.md" "T3"`), KEY);
});

test("a commit-task.sh call with a flag and a Windows plan path claims that run's key", () => {
  assert.equal(claimedRunKey(`"/p/viber/scripts/commit-task.sh" --skip "C:\\p\\docs\\_specs\\${KEY}\\plan.md" "T3"`), KEY);
});

test("a plan-index.sh --split call claims that run's key", () => {
  assert.equal(claimedRunKey(`"/p/viber/scripts/plan-index.sh" "${DIR}/plan.md" --split`), KEY);
});

test("a plan-index.sh call without --split claims nothing (the planner validates its own plan in another session)", () => {
  assert.equal(claimedRunKey(`"/p/viber/scripts/plan-index.sh" "${DIR}/plan.md"`), null);
});

test("a plan-path.sh call claims nothing (intent and fixer call it while planning, not building)", () => {
  assert.equal(claimedRunKey(`"/p/viber/scripts/plan-path.sh" --land "${DIR}/plan.md"`), null);
});

test("a commit-task.sh --e2e call names no plan and claims nothing", () => {
  assert.equal(claimedRunKey(`"/p/viber/scripts/commit-task.sh" --e2e "docs/specs/${KEY}/qa.e2e.md" "spec.ts"`), null);
});
