/*
 * roadmap-status.test.ts - proves roadmap-status.sh's contract: given a
 * roadmap.md it prints one "<dir><TAB><status>" line per "- Dir:" line, in
 * file order, with <dir> resolved against the roadmap's OWN directory, and
 * closes with "next: <dir>" for the first phase that is not done (or
 * "next: none"). Statuses: an absent directory is done (cleaned up); a
 * status.md whose "task: NN" matches the highest tasks/task-NN.md is done,
 * any other status.md is building; spec.md or plan.md without status.md is
 * planned; anything else is pending. Exits 1 on a missing argument or a
 * nonexistent file, 3 on a roadmap carrying no "- Dir:" line.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/roadmap-status.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/roadmap-status.sh");

/** The roadmap always lives at <root>/run/roadmap.md, so every assertion also
 *  proves the dir values are resolved against the roadmap's own directory
 *  rather than against the process's cwd (which is <root>). */
const RUN_DIR = "run";

interface PhaseOpts {
  /** status.md's "task: NN" value; omitted -> no status.md at all. */
  lastTask?: string;
  /** Task numbers to write under tasks/ as task-NN.md. */
  tasks?: string[];
  /** Extra files to create in the phase dir, e.g. "spec.md" / "plan.md". */
  files?: string[];
}

/** Creates <root>/run/<rel> with the requested working files. */
function makePhase(root: string, rel: string, opts: PhaseOpts = {}): void {
  const abs = path.join(root, RUN_DIR, rel);
  fs.mkdirSync(abs, { recursive: true });
  for (const n of opts.tasks ?? []) {
    fs.mkdirSync(path.join(abs, "tasks"), { recursive: true });
    fs.writeFileSync(path.join(abs, "tasks", `task-${n}.md`), "## a task\n");
  }
  if (opts.lastTask !== undefined) {
    fs.writeFileSync(path.join(abs, "status.md"), `task: ${opts.lastTask}\n`);
  }
  for (const file of opts.files ?? []) {
    fs.writeFileSync(path.join(abs, file), "# placeholder\n");
  }
}

/** Writes <root>/run/roadmap.md with one phase block per entry of `dirs`
 *  (each passed through verbatim, so a caller can exercise odd spacing) and
 *  returns the roadmap's path relative to `root`. */
function writeRoadmap(root: string, dirs: string[]): string {
  const lines = ["# Roadmap: demo", "", "## Goal", "Ship it in phases.", "", "## Phases"];
  dirs.forEach((dir, index) => {
    const nn = String(index + 1).padStart(2, "0");
    lines.push(`### ${nn}. Phase ${nn}`, `- Dir: ${dir}`, `- Goal: deliver ${nn}`, "- Depends on: none", "");
  });
  lines.push("## Out of scope", "- nothing");
  const file = path.join(root, RUN_DIR, "roadmap.md");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join("\n") + "\n");
  return `${RUN_DIR}/roadmap.md`;
}

function run(root: string, args: string[]): RunResult {
  return runScript(SUT, args, { cwd: root, shell: "bash" });
}

/** stdout split into non-empty lines, CR-tolerant. */
function outLines(stdout: string): string[] {
  return stdout.split(/\r?\n/).filter((line) => line.length > 0);
}

// --- one case per status ---------------------------------------------------

test("a phase directory with no working file yet -> pending", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    makePhase(root, "phases/01-a");
    const result = run(root, [writeRoadmap(root, ["phases/01-a"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), ["run/phases/01-a\tpending", "next: run/phases/01-a"]);
  });
});

test("a phase holding spec.md or plan.md but no status.md -> planned", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    makePhase(root, "phases/01-a", { files: ["spec.md"] });
    makePhase(root, "phases/02-b", { files: ["plan.md"] });
    const result = run(root, [writeRoadmap(root, ["phases/01-a", "phases/02-b"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/01-a\tplanned",
      "run/phases/02-b\tplanned",
      "next: run/phases/01-a",
    ]);
  });
});

test("a phase whose status.md lags the highest task -> building", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    makePhase(root, "phases/01-a", { lastTask: "01", tasks: ["01", "02", "03"], files: ["plan.md"] });
    const result = run(root, [writeRoadmap(root, ["phases/01-a"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), ["run/phases/01-a\tbuilding", "next: run/phases/01-a"]);
  });
});

test("a status.md with no tasks/ dir at all -> building (highest stays 00)", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    makePhase(root, "phases/01-a", { lastTask: "00" });
    makePhase(root, "phases/02-b", { lastTask: "03" });
    const result = run(root, [writeRoadmap(root, ["phases/01-a", "phases/02-b"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/01-a\tbuilding",
      "run/phases/02-b\tbuilding",
      "next: run/phases/01-a",
    ]);
  });
});

test("a status.md whose task equals the highest tasks/task-NN.md -> done", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    makePhase(root, "phases/01-a", { lastTask: "03", tasks: ["01", "02", "03"] });
    const result = run(root, [writeRoadmap(root, ["phases/01-a"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), ["run/phases/01-a\tdone", "next: none"]);
  });
});

test("an absent phase directory (cleaned up after its build) -> done", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    const result = run(root, [writeRoadmap(root, ["phases/01-a"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), ["run/phases/01-a\tdone", "next: none"]);
  });
});

// --- the report as a whole -------------------------------------------------

test("a mixed roadmap keeps file order and points next: at the first non-done phase", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    // Listed 03, 01, 02 on purpose: the report follows the FILE's order.
    makePhase(root, "phases/03-c", { lastTask: "02", tasks: ["01", "02"] });
    makePhase(root, "phases/01-a", { lastTask: "01", tasks: ["01", "02"] });
    makePhase(root, "phases/02-b", { files: ["spec.md"] });
    const result = run(root, [writeRoadmap(root, ["phases/03-c", "phases/01-a", "phases/02-b"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/03-c\tdone",
      "run/phases/01-a\tbuilding",
      "run/phases/02-b\tplanned",
      "next: run/phases/01-a",
    ]);
    assert.equal(result.stderr, "");
  });
});

test("every phase done -> next: none", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    makePhase(root, "phases/01-a", { lastTask: "02", tasks: ["01", "02"] });
    const result = run(root, [writeRoadmap(root, ["phases/01-a", "phases/02-b"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/01-a\tdone",
      "run/phases/02-b\tdone",
      "next: none",
    ]);
  });
});

// --- path handling ---------------------------------------------------------

test("a roadmap path with a './' prefix prints its phases without it", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    makePhase(root, "phases/01-a");
    const roadmap = writeRoadmap(root, ["phases/01-a"]);
    const result = run(root, [`./${roadmap}`]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), ["run/phases/01-a\tpending", "next: run/phases/01-a"]);
  });
});

test("an absolute roadmap path prefixes every phase with the roadmap's own directory", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    makePhase(root, "phases/01-a", { lastTask: "01", tasks: ["01"] });
    writeRoadmap(root, ["phases/01-a"]);
    const roadmap = path.join(root, RUN_DIR, "roadmap.md");
    const result = runScript(SUT, [roadmap], { shell: "bash" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const expected = slash(path.join(root, RUN_DIR, "phases", "01-a"));
    assert.deepEqual(outLines(slash(result.stdout)), [`${expected}\tdone`, "next: none"]);
  });
});

test("a Dir: value padded with trailing whitespace is trimmed", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    makePhase(root, "phases/01-a", { files: ["plan.md"] });
    const result = run(root, [writeRoadmap(root, ["phases/01-a   "])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), ["run/phases/01-a\tplanned", "next: run/phases/01-a"]);
  });
});

// --- failure modes ---------------------------------------------------------

test("missing argument -> exit 1 with usage on stderr and nothing on stdout", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    const result = run(root, []);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /missing required parameter 'roadmap-file'/);
    assert.match(result.stderr, /usage: roadmap-status\.sh <roadmap-file>/);
  });
});

test("nonexistent roadmap file -> exit 1", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    const result = run(root, ["run/roadmap.md"]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /roadmap file not found: run\/roadmap\.md/);
  });
});

test("a roadmap carrying no '- Dir:' line -> exit 3", () => {
  withTempDir("p2p2-roadmap-status-", (root) => {
    const file = path.join(root, RUN_DIR, "roadmap.md");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "# Roadmap: demo\n\n## Phases\n\n(to be filled in)\n");
    const result = run(root, [`${RUN_DIR}/roadmap.md`]);
    assert.equal(result.status, 3);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /no '- Dir:' lines found in run\/roadmap\.md/);
  });
});
