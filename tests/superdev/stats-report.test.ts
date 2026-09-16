/*
 * stats-report.test.ts - proves stats-report.sh's contract: renders
 * `.temp/superdev/stats/<run>.md` out of the events stats-record.sh appended
 * and the fixed template `superdev/references/stats-template.md`, substituting
 * each of the five placeholders exactly once and leaving everything else in
 * the template byte for byte; a row's wall time is its own duration_ms, or the
 * gap to the previous event's stamp when it carries none; the anomalies
 * section joins the noted events with the counters read out of the run's
 * implementation/ dir, and reads `none` when neither yields anything.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/stats-report.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/stats-report.sh");
const RECORDER = path.resolve(import.meta.dirname, "../../superdev/scripts/stats-record.sh");
const TEMPLATE = path.resolve(import.meta.dirname, "../../superdev/references/stats-template.md");

interface Event {
  stamp: number;
  kind: string;
  label: string;
  model?: string;
  effort?: string;
  tokens?: string;
  toolUses?: string;
  durationMs?: string;
  verdict?: string;
  note?: string;
}

/** One event as the ten tab-separated fields stats-record.sh writes. */
function line(event: Event): string {
  return [
    String(event.stamp),
    event.kind,
    event.label,
    event.model ?? "-",
    event.effort ?? "-",
    event.tokens ?? "-",
    event.toolUses ?? "-",
    event.durationMs ?? "-",
    event.verdict ?? "-",
    event.note ?? "-",
  ].join("\t");
}

/** Writes a run's events file under the temp dir the script will run in. */
function writeEvents(dir: string, run: string, events: Event[]): void {
  const statsDir = path.join(dir, ".temp", "superdev", "stats");
  fs.mkdirSync(statsDir, { recursive: true });
  fs.writeFileSync(path.join(statsDir, `${run}.events`), events.map(line).join("\n") + "\n");
}

function reportPath(dir: string, run: string): string {
  return path.join(dir, ".temp", "superdev", "stats", `${run}.md`);
}

function readReport(dir: string, run: string): string {
  return fs.readFileSync(reportPath(dir, run), "utf-8");
}

/** Line endings normalised, so a CRLF checkout cannot fail a content
 *  comparison for a reason that is not the script's. */
function lf(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

/** The lines of one `## <heading>` section of the report, blank lines at both
 *  ends dropped. */
function section(report: string, heading: string): string[] {
  const lines = lf(report).split("\n");
  const start = lines.indexOf(`## ${heading}`);
  assert.notEqual(start, -1, `section "## ${heading}" missing from:\n${report}`);
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break;
    body.push(lines[i]);
  }
  while (body.length > 0 && body[0] === "") body.shift();
  while (body.length > 0 && body[body.length - 1] === "") body.pop();
  return body;
}

/** A run's implementation/ dir, one fixture file per entry. */
function writeImplementation(dir: string, run: string, files: Record<string, string>): void {
  const implDir = path.join(dir, "docs", ".workflows", run, "implementation");
  fs.mkdirSync(implDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(implDir, name), content);
  }
}

test("a run with several events renders both tables and the totals", () => {
  withTempDir("p2p2-stats-report-", (dir) => {
    writeEvents(dir, "run-a", [
      { stamp: 1700000000, kind: "start", label: "plan" },
      {
        stamp: 1700000100,
        kind: "implementor",
        label: "tasks/task-01.md",
        model: "opus",
        effort: "high",
        tokens: "12000",
        toolUses: "9",
        durationMs: "95000",
        verdict: "PASS",
      },
      {
        stamp: 1700000160,
        kind: "task-reviewer",
        label: "tasks/task-01.md",
        model: "sonnet",
        effort: "high",
        tokens: "4321",
        toolUses: "3",
        durationMs: "30000",
        verdict: "PASS",
      },
      { stamp: 1700000180, kind: "commit", label: "task-01" },
    ]);

    const result = runScript(SUT, ["docs/.workflows/run-a"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(slash(result.stdout.trim()), "stats: .temp/superdev/stats/run-a.md");

    const report = readReport(dir, "run-a");
    // 95000 ms -> 01:35, 30000 ms -> 00:30, summed 02:05; tokens 12000 + 4321.
    assert.deepEqual(section(report, "Per task"), [
      "| Task | Implementor | Review | Rounds | Wall | Tokens |",
      "| --- | --- | --- | --- | --- | --- |",
      "| tasks/task-01.md | opus/high | sonnet/high | 1 | 02:05 | 16321 |",
    ]);
    // The commit event carries no duration, so its wall time is the gap from
    // the task-reviewer event's stamp (1700000180 - 1700000160).
    assert.deepEqual(section(report, "Per dispatch kind"), [
      "| Kind | Count | Wall | Tokens |",
      "| --- | --- | --- | --- |",
      "| start | 1 | 00:00 | - |",
      "| implementor | 1 | 01:35 | 12000 |",
      "| task-reviewer | 1 | 00:30 | 4321 |",
      "| commit | 1 | 00:20 | - |",
    ]);
    assert.deepEqual(section(report, "Totals"), [
      "- Wall time: 03:00",
      "- Tokens: 16321",
      "- Dispatches: 3",
    ]);
    assert.deepEqual(section(report, "Anomalies"), ["none"]);
  });
});

test("a fork event, carrying no usage figures, is timed from the previous event's stamp", () => {
  withTempDir("p2p2-stats-report-", (dir) => {
    writeEvents(dir, "run-a", [
      { stamp: 1700000000, kind: "start", label: "plan" },
      {
        stamp: 1700000100,
        kind: "implementor",
        label: "tasks/task-01.md",
        model: "opus",
        effort: "high",
        tokens: "12000",
        durationMs: "95000",
        verdict: "PASS",
      },
      {
        stamp: 1700000225,
        kind: "fork",
        label: "superbuild-reviewer-change",
        verdict: "PASS",
      },
    ]);

    const result = runScript(SUT, ["docs/.workflows/run-a"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const report = readReport(dir, "run-a");
    // 1700000225 - 1700000100 = 125 s, and no token figure at all.
    assert.ok(
      section(report, "Per dispatch kind").includes("| fork | 1 | 02:05 | - |"),
      `kind table:\n${section(report, "Per dispatch kind").join("\n")}`,
    );
    // A fork is not a task: it never gets a row in the per-task table.
    assert.deepEqual(section(report, "Per task"), [
      "| Task | Implementor | Review | Rounds | Wall | Tokens |",
      "| --- | --- | --- | --- | --- | --- |",
      "| tasks/task-01.md | opus/high | - | 0 | 01:35 | 12000 |",
    ]);
  });
});

test("a noted event becomes one anomaly line, offset from the start event", () => {
  withTempDir("p2p2-stats-report-", (dir) => {
    writeEvents(dir, "run-a", [
      { stamp: 1700000000, kind: "start", label: "plan" },
      {
        stamp: 1700000075,
        kind: "task-reviewer",
        label: "tasks/task-01.md",
        model: "sonnet",
        effort: "high",
        verdict: "FAIL",
        note: "FAIL: REASON: the build command was never run",
      },
      {
        stamp: 1700000730,
        kind: "escalation",
        label: "round-01",
        note: "session limit, user resumed",
      },
    ]);

    const result = runScript(SUT, ["docs/.workflows/run-a"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    assert.deepEqual(section(readReport(dir, "run-a"), "Anomalies"), [
      "01:15 task-reviewer tasks/task-01.md - FAIL: REASON: the build command was never run",
      "12:10 escalation round-01 - session limit, user resumed",
    ]);
  });
});

test("the counters are read out of the run's implementation/ dir, one row per task", () => {
  withTempDir("p2p2-stats-report-", (dir) => {
    writeEvents(dir, "run-a", [{ stamp: 1700000000, kind: "start", label: "plan" }]);
    writeImplementation(dir, "run-a", {
      "task-01-notes.md": [
        "# Task 1 notes",
        "",
        "## Runs",
        "- node --test -> pass 4",
        "",
        "UNDERSPECIFIED: the retry cap - fixed at 5, nothing named one",
        "CARRY: superdev/scripts/decompose.sh - the header block never reaches plan-header.md",
        "reason for the extra file",
        "touched: superdev/scripts/decompose.sh",
        "touched: tests/superdev/decompose.test.ts",
      ].join("\n"),
      "task-01-review-1.md": "# task review\n\n- NOTE: plan defect - the header constraint does not hold\n",
      "task-01-review-2.md": "# task review\n\nVERDICT: PASS\n",
      "task-02-notes.md": "# Task 2 notes\n\nno deviations\n",
    });

    const result = runScript(SUT, ["docs/.workflows/run-a"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    // task-02 has every counter at zero, so it gets no row at all.
    assert.deepEqual(section(readReport(dir, "run-a"), "Anomalies"), [
      "| Task | UNDERSPECIFIED | CARRY | touched | NOTE: plan defect | Extra review rounds |",
      "| --- | --- | --- | --- | --- | --- |",
      "| task-01 | 1 | 1 | 2 | 1 | 1 |",
    ]);
  });
});

test("a noted event and a counter row are both rendered, the notes first", () => {
  withTempDir("p2p2-stats-report-", (dir) => {
    writeEvents(dir, "run-a", [
      { stamp: 1700000000, kind: "start", label: "plan" },
      { stamp: 1700000060, kind: "escalation", label: "round-01", note: "agent returned no report" },
    ]);
    writeImplementation(dir, "run-a", {
      "fix-01-notes.md": "# fix-01 notes\n\nC1: fixed\ntouched: superdev/references/review-contract.md\n",
    });

    const result = runScript(SUT, ["docs/.workflows/run-a"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    assert.deepEqual(section(readReport(dir, "run-a"), "Anomalies"), [
      "01:00 escalation round-01 - agent returned no report",
      "",
      "| Task | UNDERSPECIFIED | CARRY | touched | NOTE: plan defect | Extra review rounds |",
      "| --- | --- | --- | --- | --- | --- |",
      "| fix-01 | 0 | 0 | 1 | 0 | 0 |",
    ]);
  });
});

test("no note and no implementation/ dir prints the single line 'none'", () => {
  withTempDir("p2p2-stats-report-", (dir) => {
    writeEvents(dir, "run-a", [
      { stamp: 1700000000, kind: "start", label: "plan" },
      { stamp: 1700000030, kind: "commit", label: "close-out" },
    ]);

    const result = runScript(SUT, ["docs/.workflows/run-a"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(section(readReport(dir, "run-a"), "Anomalies"), ["none"]);
    // No dispatch carried a model or a review, so the task table is empty too.
    assert.deepEqual(section(readReport(dir, "run-a"), "Per task"), ["none"]);
  });
});

test("the rendered report is the template with its five placeholders substituted and nothing else changed", () => {
  withTempDir("p2p2-stats-report-", (dir) => {
    writeEvents(dir, "run-a", [
      { stamp: 1700000000, kind: "start", label: "plan" },
      {
        stamp: 1700000100,
        kind: "implementor",
        label: "tasks/task-01.md",
        model: "opus",
        effort: "high",
        tokens: "12000",
        toolUses: "9",
        durationMs: "95000",
        verdict: "PASS",
      },
    ]);

    const result = runScript(SUT, ["docs/.workflows/run-a"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const template = lf(fs.readFileSync(TEMPLATE, "utf-8"));
    for (const placeholder of ["{{RUN}}", "{{TASKS_TABLE}}", "{{KINDS_TABLE}}", "{{TOTALS}}", "{{ANOMALIES}}"]) {
      assert.equal(
        template.split(placeholder).length - 1,
        1,
        `${placeholder} must appear exactly once in the template`,
      );
    }

    const expected = template
      .replace("{{RUN}}", "run-a")
      .replace(
        "{{TASKS_TABLE}}",
        [
          "| Task | Implementor | Review | Rounds | Wall | Tokens |",
          "| --- | --- | --- | --- | --- | --- |",
          "| tasks/task-01.md | opus/high | - | 0 | 01:35 | 12000 |",
        ].join("\n"),
      )
      .replace(
        "{{KINDS_TABLE}}",
        [
          "| Kind | Count | Wall | Tokens |",
          "| --- | --- | --- | --- |",
          "| start | 1 | 00:00 | - |",
          "| implementor | 1 | 01:35 | 12000 |",
        ].join("\n"),
      )
      .replace("{{TOTALS}}", ["- Wall time: 01:40", "- Tokens: 12000", "- Dispatches: 1"].join("\n"))
      .replace("{{ANOMALIES}}", "none");

    assert.equal(lf(readReport(dir, "run-a")), expected);
  });
});

test("a missing events file -> exit 1 with a message on stderr and no report written", () => {
  withTempDir("p2p2-stats-report-", (dir) => {
    const result = runScript(SUT, ["docs/.workflows/run-a"], { cwd: dir });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(
      slash(result.stderr),
      /error: no events file: \.temp\/superdev\/stats\/run-a\.events/,
    );
    assert.equal(fs.existsSync(reportPath(dir, "run-a")), false);
  });
});

test("a missing argument -> exit 1 with the usage line on stderr and nothing written", () => {
  withTempDir("p2p2-stats-report-", (dir) => {
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /error: missing required parameter/);
    assert.match(result.stderr, /usage: stats-report\.sh <workdir>/);
    assert.equal(fs.existsSync(path.join(dir, ".temp")), false);
  });
});

test("an empty argument is rejected the same way as a missing one", () => {
  withTempDir("p2p2-stats-report-", (dir) => {
    const result = runScript(SUT, [""], { cwd: dir });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /usage: stats-report\.sh <workdir>/);
    assert.equal(fs.existsSync(path.join(dir, ".temp")), false);
  });
});

test("an event line carrying fewer fields than the contract renders with '-' in every missing one", () => {
  withTempDir("p2p2-stats-report-", (dir) => {
    const statsDir = path.join(dir, ".temp", "superdev", "stats");
    fs.mkdirSync(statsDir, { recursive: true });
    fs.writeFileSync(
      path.join(statsDir, "run-a.events"),
      ["1700000000\tstart\tplan", "1700000045\tfork\tsimplebuild-reviewer"].join("\n") + "\n",
    );

    const result = runScript(SUT, ["docs/.workflows/run-a"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const report = readReport(dir, "run-a");
    assert.ok(
      section(report, "Per dispatch kind").includes("| fork | 1 | 00:45 | - |"),
      `kind table:\n${section(report, "Per dispatch kind").join("\n")}`,
    );
    assert.deepEqual(section(report, "Anomalies"), ["none"]);
  });
});

test("the run id matches stats-record.sh's, for a phase workdir and for the basename fallback", () => {
  withTempDir("p2p2-stats-report-", (dir) => {
    for (const workdir of ["./docs/.workflows/2026-09-16-run/phases/01-slug/", "some/other/workdir/"]) {
      const recorded = runScript(RECORDER, [workdir, "start", "plan"], { cwd: dir });
      assert.equal(recorded.status, 0, `stderr: ${recorded.stderr}`);
      const events = slash(recorded.stdout.trim()).replace(/^stats: /, "").replace(/ -> .*$/, "");

      const result = runScript(SUT, [workdir], { cwd: dir });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(
        slash(result.stdout.trim()),
        `stats: ${events.replace(/\.events$/, ".md")}`,
      );
    }
  });
});
