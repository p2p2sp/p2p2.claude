/*
 * write-report-name.unit.test.ts - proves the three pure functions behind viber's
 * hooks-module answer to the harness guard that refuses a subagent's Write of a
 * `.md` file whose name starts with report, summary, findings or analysis: which
 * agent it serves, which refusal it recognises, and which paths it may write.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/write-report-name.unit.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";

import { isInsideRoot, isReportNameRefusal, isViberAgent } from "../../viber/hooks/write/report-name.ts";

const REFUSAL =
  "<tool_use_error>Subagents should return findings as text, not write report files. Include this content in your final response instead.</tool_use_error>";

test("a viber agent type is a viber agent", () => {
  assert.equal(isViberAgent("viber:task-coder"), true);
});

test("another agent type is not a viber agent", () => {
  assert.equal(isViberAgent("general-purpose"), false);
});

test("no agent type is not a viber agent", () => {
  assert.equal(isViberAgent(undefined), false);
});

test("the guard text on a name starting with reports is the refusal", () => {
  assert.equal(isReportNameRefusal("C:\\repo\\help\\widgets\\reports.pl.md", REFUSAL), true);
});

test("each guarded word, in any case, is the refusal", () => {
  for (const name of ["Summary.md", "FINDINGS-2.md", "analysis.en.md", "report.md"]) {
    assert.equal(isReportNameRefusal(`/repo/docs/${name}`, REFUSAL), true, name);
  }
});

test("a guarded word that does not start the name is no refusal", () => {
  assert.equal(isReportNameRefusal("/repo/docs/x-reports.md", REFUSAL), false);
});

test("a guarded name with another extension is no refusal", () => {
  assert.equal(isReportNameRefusal("/repo/src/reports.ts", REFUSAL), false);
});

test("a guarded word in a directory name only is no refusal", () => {
  assert.equal(isReportNameRefusal("/repo/reports/index.md", REFUSAL), false);
});

test("another error on a guarded name is no refusal", () => {
  assert.equal(isReportNameRefusal("/repo/docs/reports.md", "<tool_use_error>File has not been read yet.</tool_use_error>"), false);
});

test("no error text is no refusal", () => {
  assert.equal(isReportNameRefusal("/repo/docs/reports.md", undefined), false);
});

test("a file under the root is inside it", () => {
  assert.equal(isInsideRoot("/home/u/repo", "/home/u/repo/help/reports.md"), true);
});

test("a Windows path under the root is inside it whatever its separators and case", () => {
  assert.equal(isInsideRoot("C:\\Projects\\Repo", "c:/projects/repo/help/reports.pl.md"), true);
});

test("a root given with a trailing separator still holds its files", () => {
  assert.equal(isInsideRoot("/home/u/repo/", "/home/u/repo/reports.md"), true);
});

test("a sibling directory sharing the root's prefix is outside it", () => {
  assert.equal(isInsideRoot("/home/u/repo", "/home/u/repo-other/reports.md"), false);
});

test("a path climbing out with .. is outside the root", () => {
  assert.equal(isInsideRoot("/home/u/repo", "/home/u/repo/../secret/reports.md"), false);
});

test("a relative path is outside the root", () => {
  assert.equal(isInsideRoot("/home/u/repo", "help/reports.md"), false);
});

test("on a POSIX root the case of the path matters", () => {
  assert.equal(isInsideRoot("/home/u/repo", "/home/u/Repo/reports.md"), false);
});
