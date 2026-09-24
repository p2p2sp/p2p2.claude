/*
 * stats-record.test.ts - proves stats-record.sh's contract: appends exactly
 * one tab-separated event line - `<epoch seconds>`, kind, label, model,
 * effort, tokens, tool_uses, duration_ms, verdict, note, an absent optional
 * field written as `-` - to `.temp/superdev/stats/<run>.events` under the
 * current working directory, creating the directory as needed, deriving the
 * run id from the workdir tail after the last `docs/.workflows/`, and
 * reporting `stats: <path> -> <kind> <label>` on stdout.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/stats-record.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/stats-record.sh");

const USAGE_RE =
  /usage: stats-record\.sh <workdir> <kind> <label> \[model\] \[effort\] \[tokens\] \[tool_uses\] \[duration_ms\] \[verdict\] \[note\]/;

/** The events file of one run, under the temp dir the script ran in. */
function eventsPath(dir: string, run: string): string {
  return path.join(dir, ".temp", "superdev", "stats", `${run}.events`);
}

/** Every non-empty line of an events file, split into its tab-separated
 *  fields. */
function readEvents(dir: string, run: string): string[][] {
  const content = fs.readFileSync(eventsPath(dir, run), "utf-8");
  return content.split("\n").filter((line) => line.length > 0).map((line) => line.split("\t"));
}

test("a minimal three-argument call writes one line with '-' in every optional field", () => {
  withTempDir("p2p2-stats-record-", (dir) => {
    const result = runScript(SUT, ["docs/.workflows/2026-09-16-run/", "start", "plan"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const events = readEvents(dir, "2026-09-16-run");
    assert.equal(events.length, 1);
    const [stamp, kind, label, ...optional] = events[0];
    assert.match(stamp, /^\d{9,}$/);
    assert.equal(kind, "start");
    assert.equal(label, "plan");
    assert.deepEqual(optional, ["-", "-", "-", "-", "-", "-", "-"]);

    assert.equal(
      slash(result.stdout.trim()),
      "stats: .temp/superdev/stats/2026-09-16-run.events -> start plan",
    );
  });
});

test("a full ten-argument call writes every field in the documented order", () => {
  withTempDir("p2p2-stats-record-", (dir) => {
    const result = runScript(
      SUT,
      [
        "docs/.workflows/2026-09-16-run",
        "implementor",
        "tasks/task-01.md",
        "opus",
        "high",
        "12345",
        "7",
        "65000",
        "PASS",
        "first task, nothing to report",
      ],
      { cwd: dir },
    );
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const events = readEvents(dir, "2026-09-16-run");
    assert.equal(events.length, 1);
    assert.deepEqual(events[0].slice(1), [
      "implementor",
      "tasks/task-01.md",
      "opus",
      "high",
      "12345",
      "7",
      "65000",
      "PASS",
      "first task, nothing to report",
    ]);
    assert.equal(
      slash(result.stdout.trim()),
      "stats: .temp/superdev/stats/2026-09-16-run.events -> implementor tasks/task-01.md",
    );
  });
});

test("a second call appends, leaving the first line unchanged", () => {
  withTempDir("p2p2-stats-record-", (dir) => {
    runScript(SUT, ["docs/.workflows/run-a", "start", "plan"], { cwd: dir });
    const result = runScript(
      SUT,
      ["docs/.workflows/run-a", "fork", "superbuild-reviewer-change", "-", "-", "-", "-", "-", "FAIL"],
      { cwd: dir },
    );
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const events = readEvents(dir, "run-a");
    assert.equal(events.length, 2);
    assert.equal(events[0][1], "start");
    assert.equal(events[0][2], "plan");
    assert.equal(events[1][1], "fork");
    assert.equal(events[1][2], "superbuild-reviewer-change");
    assert.equal(events[1][8], "FAIL");
  });
});

test("an existing events file with no trailing newline gets the new event started on a fresh line", () => {
  withTempDir("p2p2-stats-record-", (dir) => {
    const statsDir = path.join(dir, ".temp", "superdev", "stats");
    fs.mkdirSync(statsDir, { recursive: true });
    const old = ["1700000000", "start", "plan", "-", "-", "-", "-", "-", "-", "-"].join("\t");
    fs.writeFileSync(path.join(statsDir, "run-a.events"), old);

    const result = runScript(SUT, ["docs/.workflows/run-a", "commit", "task-02"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const content = fs.readFileSync(eventsPath(dir, "run-a"), "utf-8");
    const lines = content.split("\n").filter((line) => line.length > 0);
    assert.equal(lines.length, 2);
    assert.equal(lines[0], old);
    assert.match(lines[1], /^\d{9,}\tcommit\ttask-02\t/);
  });
});

test("a phase workdir gets a run id of its own, its tail segments joined with '-'", () => {
  withTempDir("p2p2-stats-record-", (dir) => {
    const result = runScript(
      SUT,
      ["./docs/.workflows/2026-09-16-run/phases/01-slug/", "start", "plan"],
      { cwd: dir },
    );
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    assert.ok(fs.existsSync(eventsPath(dir, "2026-09-16-run-phases-01-slug")));
    assert.equal(
      slash(result.stdout.trim()),
      "stats: .temp/superdev/stats/2026-09-16-run-phases-01-slug.events -> start plan",
    );
  });
});

test("a workdir outside docs/.workflows falls back to its basename as the run id", () => {
  withTempDir("p2p2-stats-record-", (dir) => {
    const result = runScript(SUT, ["some/other/workdir/", "resume", "plan"], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const events = readEvents(dir, "workdir");
    assert.equal(events.length, 1);
    assert.equal(events[0][1], "resume");
    assert.equal(
      slash(result.stdout.trim()),
      "stats: .temp/superdev/stats/workdir.events -> resume plan",
    );
  });
});

test("a tab, a carriage return and a newline are stripped, so one event stays one line", () => {
  withTempDir("p2p2-stats-record-", (dir) => {
    // The newline argument crosses to the script through the harness's
    // environment transport on Windows and through argv everywhere else - the
    // script sees the same bytes either way.
    const result = runScript(
      SUT,
      [
        "docs/.workflows/run-a",
        "escalation",
        "round\t01",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "session limit\nuser resumed\r",
      ],
      { cwd: dir },
    );
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const content = fs.readFileSync(eventsPath(dir, "run-a"), "utf-8");
    assert.equal(content.split("\n").filter((line) => line.length > 0).length, 1);
    const fields = readEvents(dir, "run-a")[0];
    assert.equal(fields.length, 10);
    assert.equal(fields[2], "round01");
    assert.equal(fields[9], "session limituser resumed");
  });
});

test("a missing required argument -> exit 1 with usage on stderr and nothing written", () => {
  withTempDir("p2p2-stats-record-", (dir) => {
    const result = runScript(SUT, ["docs/.workflows/run-a", "start"], { cwd: dir });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /error: missing required parameter/);
    assert.match(result.stderr, USAGE_RE);
    assert.equal(fs.existsSync(path.join(dir, ".temp")), false);
  });
});

test("an empty required argument is rejected the same way as a missing one", () => {
  withTempDir("p2p2-stats-record-", (dir) => {
    const result = runScript(SUT, ["", "start", "plan"], { cwd: dir });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, USAGE_RE);
    assert.equal(fs.existsSync(path.join(dir, ".temp")), false);
  });
});
