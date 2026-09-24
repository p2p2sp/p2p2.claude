/*
 * phases-status.test.ts - proves phases-status.sh's contract: given a
 * phases.md it prints one "<dir><TAB><status><TAB><title>" line per "- Dir:"
 * line, in file order, with <dir> resolved against the phases file's OWN
 * directory and <title> taken from the "### NN. <title>" heading above that
 * line ("-" when there is none), and closes with "next: <dir><TAB><title>" for
 * the first phase that is not done (or "next: none"). Statuses: an absent
 * directory is done (cleaned up); a status.md whose "task: NN" matches the
 * highest tasks/task-NN.md is done, any other status.md is building; spec.md
 * or plan.md without status.md is planned; anything else is pending. Exits 1
 * on a missing argument or a nonexistent file, 3 on a phases file carrying no
 * "- Dir:" line.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/phases-status.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/phases-status.sh");

/** The phases file always lives at <root>/run/phases.md, so every assertion also
 *  proves the dir values are resolved against the phases file's own directory
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

/** One phase to list in phases.md: a bare Dir: value (which gets the default
 *  "### NN. Phase NN" heading), or an entry carrying its own heading title -
 *  `null` for a phase written with no "###" heading at all. */
type PhaseRef = string | { dir: string; title: string | null };

/** Writes <root>/run/phases.md with one phase block per entry of `phases`
 *  (dir value and title each passed through verbatim, so a caller can exercise
 *  odd spacing) and returns the phases file's path relative to `root`. */
function writePhases(root: string, phases: PhaseRef[]): string {
  const lines = ["# Phases: demo", "", "## Goal", "Ship it in phases.", "", "## Phases"];
  phases.forEach((phase, index) => {
    const nn = String(index + 1).padStart(2, "0");
    const dir = typeof phase === "string" ? phase : phase.dir;
    const title = typeof phase === "string" ? `Phase ${nn}` : phase.title;
    if (title !== null) {
      lines.push(`### ${nn}. ${title}`);
    }
    lines.push(`- Dir: ${dir}`, `- Goal: deliver ${nn}`, "- Depends on: none", "");
  });
  lines.push("## Out of scope", "- nothing");
  const file = path.join(root, RUN_DIR, "phases.md");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join("\n") + "\n");
  return `${RUN_DIR}/phases.md`;
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
  withTempDir("p2p2-phases-status-", (root) => {
    makePhase(root, "phases/01-a");
    const result = run(root, [writePhases(root, ["phases/01-a"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/01-a\tpending\tPhase 01",
      "next: run/phases/01-a\tPhase 01",
    ]);
  });
});

test("a phase holding spec.md or plan.md but no status.md -> planned", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    makePhase(root, "phases/01-a", { files: ["spec.md"] });
    makePhase(root, "phases/02-b", { files: ["plan.md"] });
    const result = run(root, [writePhases(root, ["phases/01-a", "phases/02-b"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/01-a\tplanned\tPhase 01",
      "run/phases/02-b\tplanned\tPhase 02",
      "next: run/phases/01-a\tPhase 01",
    ]);
  });
});

test("a phase whose status.md lags the highest task -> building", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    makePhase(root, "phases/01-a", { lastTask: "01", tasks: ["01", "02", "03"], files: ["plan.md"] });
    const result = run(root, [writePhases(root, ["phases/01-a"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/01-a\tbuilding\tPhase 01",
      "next: run/phases/01-a\tPhase 01",
    ]);
  });
});

test("a status.md with no tasks/ dir at all -> building (highest stays 00)", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    makePhase(root, "phases/01-a", { lastTask: "00" });
    makePhase(root, "phases/02-b", { lastTask: "03" });
    const result = run(root, [writePhases(root, ["phases/01-a", "phases/02-b"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/01-a\tbuilding\tPhase 01",
      "run/phases/02-b\tbuilding\tPhase 02",
      "next: run/phases/01-a\tPhase 01",
    ]);
  });
});

test("a status.md whose task equals the highest tasks/task-NN.md -> done", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    makePhase(root, "phases/01-a", { lastTask: "03", tasks: ["01", "02", "03"] });
    const result = run(root, [writePhases(root, ["phases/01-a"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), ["run/phases/01-a\tdone\tPhase 01", "next: none"]);
  });
});

test("an absent phase directory (cleaned up after its build) -> done", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    const result = run(root, [writePhases(root, ["phases/01-a"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), ["run/phases/01-a\tdone\tPhase 01", "next: none"]);
  });
});

// --- the title column ------------------------------------------------------

test("a '- Dir:' line with no '### NN.' heading before it -> title '-'", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    makePhase(root, "phases/01-a", { files: ["plan.md"] });
    makePhase(root, "phases/02-b");
    // 02-b is written with no heading at all: its title falls back to "-"
    // rather than inheriting 01-a's.
    const phases = writePhases(root, ["phases/01-a", { dir: "phases/02-b", title: null }]);
    const result = run(root, [phases]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/01-a\tplanned\tPhase 01",
      "run/phases/02-b\tpending\t-",
      "next: run/phases/01-a\tPhase 01",
    ]);
  });
});

test("a multi-word heading title padded with trailing spaces is trimmed", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    makePhase(root, "phases/01-a");
    const title = "Groundwork and the naming contract   ";
    const phases = writePhases(root, [{ dir: "phases/01-a", title }]);
    const result = run(root, [phases]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/01-a\tpending\tGroundwork and the naming contract",
      "next: run/phases/01-a\tGroundwork and the naming contract",
    ]);
  });
});

// --- the report as a whole -------------------------------------------------

test("a mixed phases file keeps file order and points next: at the first non-done phase", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    // Listed 03, 01, 02 on purpose: the report follows the FILE's order - and
    // so do the default headings, so phases/03-c carries the title "Phase 01".
    makePhase(root, "phases/03-c", { lastTask: "02", tasks: ["01", "02"] });
    makePhase(root, "phases/01-a", { lastTask: "01", tasks: ["01", "02"] });
    makePhase(root, "phases/02-b", { files: ["spec.md"] });
    const result = run(root, [writePhases(root, ["phases/03-c", "phases/01-a", "phases/02-b"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/03-c\tdone\tPhase 01",
      "run/phases/01-a\tbuilding\tPhase 02",
      "run/phases/02-b\tplanned\tPhase 03",
      "next: run/phases/01-a\tPhase 02",
    ]);
    assert.equal(result.stderr, "");
  });
});

test("every phase done -> next: none", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    makePhase(root, "phases/01-a", { lastTask: "02", tasks: ["01", "02"] });
    const result = run(root, [writePhases(root, ["phases/01-a", "phases/02-b"])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/01-a\tdone\tPhase 01",
      "run/phases/02-b\tdone\tPhase 02",
      "next: none",
    ]);
  });
});

// --- path handling ---------------------------------------------------------

test("a phases path with a './' prefix prints its phases without it", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    makePhase(root, "phases/01-a");
    const phasesFile = writePhases(root, ["phases/01-a"]);
    const result = run(root, [`./${phasesFile}`]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/01-a\tpending\tPhase 01",
      "next: run/phases/01-a\tPhase 01",
    ]);
  });
});

test("an absolute phases path prefixes every phase with the phases file's own directory", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    makePhase(root, "phases/01-a", { lastTask: "01", tasks: ["01"] });
    writePhases(root, ["phases/01-a"]);
    const phasesFile = path.join(root, RUN_DIR, "phases.md");
    const result = runScript(SUT, [phasesFile], { shell: "bash" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const expected = slash(path.join(root, RUN_DIR, "phases", "01-a"));
    assert.deepEqual(outLines(slash(result.stdout)), [`${expected}\tdone\tPhase 01`, "next: none"]);
  });
});

test("a Dir: value padded with trailing whitespace is trimmed", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    makePhase(root, "phases/01-a", { files: ["plan.md"] });
    const result = run(root, [writePhases(root, ["phases/01-a   "])]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(outLines(result.stdout), [
      "run/phases/01-a\tplanned\tPhase 01",
      "next: run/phases/01-a\tPhase 01",
    ]);
  });
});

// --- failure modes ---------------------------------------------------------

test("missing argument -> exit 1 with usage on stderr and nothing on stdout", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    const result = run(root, []);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /missing required parameter 'phases-file'/);
    assert.match(result.stderr, /usage: phases-status\.sh <phases-file>/);
  });
});

test("nonexistent phases file -> exit 1", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    const result = run(root, ["run/phases.md"]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /phases file not found: run\/phases\.md/);
  });
});

test("a phases file carrying no '- Dir:' line -> exit 3", () => {
  withTempDir("p2p2-phases-status-", (root) => {
    const file = path.join(root, RUN_DIR, "phases.md");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "# Phases: demo\n\n## Phases\n\n(to be filled in)\n");
    const result = run(root, [`${RUN_DIR}/phases.md`]);
    assert.equal(result.status, 3);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /no '- Dir:' lines found in run\/phases\.md/);
  });
});
