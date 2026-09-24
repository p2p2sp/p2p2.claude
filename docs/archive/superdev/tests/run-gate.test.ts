/*
 * run-gate.test.ts - proves run-gate.sh's contract: it reads the
 * "## Gate commands" block above the first "<!-- TASK -->" marker of
 * <workdir>/plan.md, selects its subsections from <stage> (checkpoint and
 * re-review:checkpoint -> Build + Tests, final and re-review:final -> those
 * plus Integration), runs every selected command ONCE through the sibling
 * executor runner, writes <out-file> whole (the "# <closing stage> review"
 * title, a "## Gates" line per selected subsection, then one
 * "### <subsection>" detail block per command carrying every line the runner
 * printed), and prints "<subsection>: <result>" lines, "GATES: <out-file>" and
 * "RED: yes|no" as its last line - exiting 0 whatever the commands returned.
 * A command's outcome is DATA on the RED: line; the non-zero exits are 1 for a
 * usage error or a missing plan/block and 2 for an unresolvable runner or an
 * unwritable out-file, and on every one of them stdout is empty, so an empty
 * stdout can never be misread as a green round.
 *
 * GATE_BUDGET bounds the WHOLE run rather than one command, so the script
 * always returns inside the timeout of the tool its caller invokes it through.
 * The two budget cases below set it from the environment, which is a hook for
 * these tests alone - no caller of a build ever sets it.
 *
 * The gate commands here are one-liners (printf, exit) run through the real
 * runner, so the runner's log files land under <temp dir>/.temp/superdev/logs
 * and go away with the temp dir.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/run-gate.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir } from "../harness/tmp.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/run-gate.sh");

interface GateSections {
  build?: string[];
  tests?: string[];
  integration?: string[];
}

/** A plan holding the gate block plus one task block below the marker; that
 *  task's own "### Task Checks" command (`exit 9`) must never run. An omitted
 *  section is left out of the block entirely. */
function planText(sections: GateSections): string {
  const lines = ["# SuperPlan", "", "## Gate commands", ""];
  const add = (name: string, entries: string[] | undefined) => {
    if (entries === undefined) return;
    lines.push(`#### ${name}`);
    for (const entry of entries) lines.push(`- ${entry}`);
    lines.push("");
  };
  add("Build", sections.build);
  add("Tests", sections.tests);
  add("Integration", sections.integration);
  lines.push("---", "", "<!-- TASK -->", "", "## Task 1 - a task", "", "### Task Checks", "- exit 9", "");
  return lines.join("\n");
}

/** Writes <dir>/plan.md and runs the script over it, from <dir>, with the
 *  out-file at <dir>/gates.md unless `out` says otherwise. `budget` sets
 *  GATE_BUDGET, the whole-run bound, which only this file ever overrides. */
function runGate(
  dir: string,
  stage: string,
  sections: GateSections | null,
  out?: string,
  budget?: string,
): RunResult {
  if (sections !== null) fs.writeFileSync(path.join(dir, "plan.md"), planText(sections));
  const outFile = out ?? `${slash(dir)}/gates.md`;
  // Generous: every command goes through the runner's one-second poll loop.
  return runScript(SUT, [slash(dir), stage, outFile], {
    cwd: dir,
    timeout: 180000,
    ...(budget === undefined ? {} : { env: { GATE_BUDGET: budget } }),
  });
}

/** The printed block as its non-empty lines, in order. */
function stdoutLines(result: RunResult): string[] {
  return result.stdout.split("\n").filter((line) => line.length > 0);
}

/** The "## Gates" section's lines, in order. */
function gateLines(text: string): string[] {
  const out: string[] = [];
  let inSection = false;
  for (const line of text.split("\n")) {
    if (line === "## Gates") {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (line.startsWith("#")) break;
    if (line.length > 0) out.push(line);
  }
  return out;
}

/** Every "### <subsection>" detail block, in order, as its non-empty lines. */
function detailBlocks(text: string): Array<{ subsection: string; lines: string[] }> {
  const blocks: Array<{ subsection: string; lines: string[] }> = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("### ")) {
      blocks.push({ subsection: line.slice(4), lines: [] });
      continue;
    }
    if (blocks.length === 0 || line.length === 0) continue;
    blocks[blocks.length - 1].lines.push(line);
  }
  return blocks;
}

const GREEN = "printf 'ok 1\\n'";
const RED = "printf 'FAIL 2\\n' >&2; exit 3";

test("stage checkpoint runs Build and Tests only - Integration gets no line and no block, and no task's own check runs", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    const result = runGate(dir, "checkpoint", { build: [GREEN], tests: [GREEN], integration: [RED] });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const text = fs.readFileSync(path.join(dir, "gates.md"), "utf-8");
    assert.equal(text.split("\n")[0], "# checkpoint review");
    assert.deepEqual(
      gateLines(text).map((line) => line.split(" - ")[0]),
      ["Build", "Tests"],
    );
    assert.deepEqual(
      detailBlocks(text).map((block) => block.subsection),
      ["Build", "Tests"],
    );
    const out = stdoutLines(result);
    assert.deepEqual(out.slice(0, 2), ["Build: pass", "Tests: pass"]);
    // Integration held the only red command and never ran, so the round is green.
    assert.equal(out[out.length - 1], "RED: no");
    const commands = detailBlocks(text).flatMap((block) => block.lines.filter((l) => l.startsWith("COMMAND: ")));
    assert.deepEqual(commands, [`COMMAND: ${GREEN}`, `COMMAND: ${GREEN}`]);
    assert.ok(!text.includes("exit 9"), "nothing below the <!-- TASK --> marker is ever collected");
  });
});

test("stage final adds Integration to the same two subsections", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    const result = runGate(dir, "final", { build: [GREEN], tests: [GREEN], integration: [GREEN] });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const text = fs.readFileSync(path.join(dir, "gates.md"), "utf-8");
    assert.equal(text.split("\n")[0], "# final review");
    assert.deepEqual(
      gateLines(text).map((line) => line.split(" - ")[0]),
      ["Build", "Tests", "Integration"],
    );
    assert.deepEqual(stdoutLines(result).slice(0, 3), ["Build: pass", "Tests: pass", "Integration: pass"]);
  });
});

test("a re-review stage takes the set of the stage it names and titles the block with that stage", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    const final = runGate(dir, "re-review:final", { build: [GREEN], tests: [GREEN], integration: [GREEN] });
    assert.equal(final.status, 0, `stderr: ${final.stderr}`);
    const finalText = fs.readFileSync(path.join(dir, "gates.md"), "utf-8");
    assert.equal(finalText.split("\n")[0], "# final review");
    assert.equal(gateLines(finalText).length, 3);

    const checkpoint = runGate(dir, "re-review:checkpoint", null);
    assert.equal(checkpoint.status, 0, `stderr: ${checkpoint.stderr}`);
    const checkpointText = fs.readFileSync(path.join(dir, "gates.md"), "utf-8");
    assert.equal(checkpointText.split("\n")[0], "# checkpoint review");
    assert.deepEqual(
      gateLines(checkpointText).map((line) => line.split(" - ")[0]),
      ["Build", "Tests"],
    );
  });
});

test("a 'none - <reason>' subsection carries its reason, runs nothing and stays out of the red", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    const reason = "the repo ships markdown only; it has no build step";
    const result = runGate(dir, "checkpoint", { build: [`none - ${reason}`], tests: [GREEN] });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const text = fs.readFileSync(path.join(dir, "gates.md"), "utf-8");
    assert.equal(gateLines(text)[0], `Build - none - ${reason}`);
    assert.deepEqual(
      detailBlocks(text).map((block) => block.subsection),
      ["Tests"],
      "a subsection that is not run gets no detail block",
    );
    assert.deepEqual(stdoutLines(result), [
      "Build: none",
      "Tests: pass",
      `GATES: ${slash(dir)}/gates.md`,
      "RED: no",
    ]);
  });
});

test("a selected subsection the gate block does not hold at all is 'absent', not 'none', and reds the round (the plan decided nothing about it)", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    const result = runGate(dir, "final", { build: [GREEN], tests: [GREEN] });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const text = fs.readFileSync(path.join(dir, "gates.md"), "utf-8");
    assert.equal(
      gateLines(text)[2],
      "Integration - absent - the plan's ## Gate commands block holds no such subsection",
    );
    assert.equal(stdoutLines(result)[2], "Integration: absent");
    // red, so a checkpoint round whose only fault is the hole still dispatches
    // the reviewer - which is what turns it into a BLOCKED.
    assert.equal(stdoutLines(result).at(-1), "RED: yes");
    assert.deepEqual(
      detailBlocks(text).map((block) => block.subsection),
      ["Build", "Tests"],
      "a subsection that is not run gets no detail block, absent as much as none",
    );
  });
});

test("a green run prints RED: no and carries every line the runner printed into the command's detail block", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    const result = runGate(dir, "checkpoint", { build: ["none - no build step"], tests: [GREEN] });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stderr, "");
    const text = fs.readFileSync(path.join(dir, "gates.md"), "utf-8");
    assert.match(gateLines(text)[1], /^Tests - pass - \d+s$/);
    const blocks = detailBlocks(text);
    assert.equal(blocks.length, 1);
    const lines = blocks[0].lines;
    assert.equal(lines[0], `COMMAND: ${GREEN}`);
    // written by run-gate.sh, not the runner: the bound this command got, which
    // a BLOCKED bullet on a timeout has to name and can no longer infer.
    assert.match(lines[1], /^TIMEOUT: \d+s$/);
    assert.equal(lines[2], "RESULT: SUCCESS");
    assert.equal(lines[3], "STATUS: ok");
    assert.equal(lines[4], "EXIT: 0");
    assert.match(lines[5], /^DURATION: \d+s$/);
    assert.match(lines[6], /^LOG: \S/);
    assert.equal(lines[7], "LINES: 1");
    assert.equal(lines[8], "TAIL: ok 1", "the evidence rules read TAIL off this block, so it is never filtered");
    assert.equal(lines.length, 9);
    // The LOG: path the reviewer is pointed at is the log that run actually
    // wrote. Read by its basename out of the known directory, never by the
    // printed path itself: a shell prints it in its own form (Git-Bash hands
    // back "/tmp/..." for the Windows temp dir), which Node would resolve
    // against the current drive.
    assert.match(lines[6], /^LOG: \S.*\/\.temp\/superdev\/logs\/[^/]+\.log$/);
    const log = path.join(dir, ".temp/superdev/logs", path.posix.basename(lines[6]));
    assert.equal(fs.readFileSync(log, "utf-8"), "ok 1\n");
    const out = stdoutLines(result);
    assert.equal(out.at(-2), `GATES: ${slash(dir)}/gates.md`);
    assert.equal(out.at(-1), "RED: no");
  });
});

test("one red command flips RED: yes, reds only its own subsection, and still exits 0 (the outcome is data, not this script's status)", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    const result = runGate(dir, "final", { build: [GREEN], tests: [GREEN, RED], integration: [GREEN] });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const text = fs.readFileSync(path.join(dir, "gates.md"), "utf-8");
    const gates = gateLines(text);
    assert.match(gates[0], /^Build - pass - \d+s$/);
    assert.match(gates[1], /^Tests - red - \d+s$/, "a subsection holding several commands still carries one line");
    assert.match(gates[2], /^Integration - pass - \d+s$/);
    const blocks = detailBlocks(text);
    assert.deepEqual(
      blocks.map((block) => block.subsection),
      ["Build", "Tests", "Tests", "Integration"],
      "one detail block per command, in the order they ran",
    );
    assert.deepEqual(
      [blocks[2].lines[0], ...blocks[2].lines.slice(2, 5)],
      [`COMMAND: ${RED}`, "RESULT: DEVIATION", "STATUS: ok", "EXIT: 3"],
    );
    assert.match(blocks[2].lines[1], /^TIMEOUT: \d+s$/);
    assert.deepEqual(stdoutLines(result), [
      "Build: pass",
      "Tests: red",
      "Integration: pass",
      `GATES: ${slash(dir)}/gates.md`,
      "RED: yes",
    ]);
  });
});

test("a command the runner refuses on its pre-launch error path keeps the round going, carries the RESULT/STATUS/REASON triple and counts red", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    // The runner writes its log under <cwd>/.temp/superdev/logs; a FILE named
    // .temp makes that mkdir impossible, so every command dies before launch.
    fs.writeFileSync(path.join(dir, ".temp"), "not a directory\n");
    const result = runGate(dir, "checkpoint", { build: [GREEN], tests: [GREEN] });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const text = fs.readFileSync(path.join(dir, "gates.md"), "utf-8");
    const blocks = detailBlocks(text);
    assert.equal(blocks.length, 2, "the second command still ran after the first never launched");
    assert.equal(blocks[0].lines[0], `COMMAND: ${GREEN}`);
    assert.match(blocks[0].lines[1], /^TIMEOUT: \d+s$/);
    assert.deepEqual(blocks[0].lines.slice(2, 4), ["RESULT: DEVIATION", "STATUS: error"]);
    assert.match(blocks[0].lines[4], /^REASON: cannot write log: /);
    assert.equal(blocks[0].lines.length, 5, "the pre-launch path is the shorter triple, with no EXIT/DURATION/LOG");
    assert.deepEqual(stdoutLines(result).slice(0, 2), ["Build: red", "Tests: red"]);
    assert.equal(stdoutLines(result).at(-1), "RED: yes");
  });
});

test("the budget bounds the whole run, not one command: a command it leaves no room for is reported red and never started", () => {
  withTempDir("p2p2-run-gate-budget-", (dir) => {
    // GATE_BUDGET=5: the Build command alone spends it (the runner polls once
    // a second and kills at the bound), so the Tests command starts with
    // nothing left. Without a whole-run budget this pair would run to
    // completion and the caller's own timeout would be the thing that stopped
    // it - killing the script before it writes any block at all.
    // The budget is 5 rather than 1 because the script bounds the run with
    // bash's SECONDS, which ticks on wall-clock boundaries rather than a full
    // second after the shell started: a 1s budget could already be spent
    // during the script's own startup, skipping the FIRST command too and
    // leaving a block with no LOG line (a flake seen on CI and locally).
    const result = runGate(dir, "checkpoint", { build: ["sleep 30"], tests: [GREEN] }, undefined, "5");
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const text = fs.readFileSync(path.join(dir, "gates.md"), "utf-8");
    const blocks = detailBlocks(text);
    assert.deepEqual(
      blocks.map((block) => block.subsection),
      ["Build", "Tests"],
      "the skipped command still opens its own entry - a silent gap would read as a subsection nobody selected",
    );
    assert.deepEqual(blocks[1].lines, [
      `COMMAND: ${GREEN}`,
      "RESULT: DEVIATION",
      "STATUS: error",
      "REASON: gate budget of 5s spent before this command ran",
    ], "no TIMEOUT line: the command the budget skipped was never given one");
    // STATUS: error is what the contract's case 1 settles as BLOCKED, so the
    // round says what it did not get to rather than passing on a short set.
    assert.deepEqual(stdoutLines(result), [
      "Build: red",
      "Tests: red",
      `GATES: ${slash(dir)}/gates.md`,
      "RED: yes",
    ]);
    // The log of the command that DID run is still reachable: only the one
    // with no room left was never launched.
    assert.ok(blocks[0].lines.some((line) => line.startsWith("LOG: ")), "the first command ran and logged");
  });
});

test("a GATE_BUDGET that is not a positive integer falls back to the default instead of skipping every command", () => {
  withTempDir("p2p2-run-gate-budget-bad-", (dir) => {
    const result = runGate(dir, "checkpoint", { build: [GREEN], tests: [GREEN] }, undefined, "not-a-number");
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(stdoutLines(result).slice(0, 2), ["Build: pass", "Tests: pass"]);
    assert.equal(stdoutLines(result).at(-1), "RED: no");
  });
});

test("a missing <workdir>/plan.md prints nothing on stdout at all and exits 1 (an empty stdout is never a green round)", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    const result = runGate(dir, "checkpoint", null);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /no plan to read gate commands from: /);
    assert.equal(fs.existsSync(path.join(dir, "gates.md")), false);
  });
});

test("a plan holding no '## Gate commands' block prints nothing on stdout and exits 1", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    fs.writeFileSync(path.join(dir, "plan.md"), "# SuperPlan\n\n<!-- TASK -->\n\n## Task 1 - a task\n");
    const result = runScript(SUT, [slash(dir), "checkpoint", `${slash(dir)}/gates.md`], { cwd: dir });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /no '## Gate commands' block in /);
  });
});

test("no arguments prints the usage line on stderr and exits 1", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /^usage: run-gate\.sh <workdir> <stage> <out-file>/);
  });
});

test("a <stage> outside the accepted set names that set on stderr, runs no command and writes no file", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    fs.writeFileSync(path.join(dir, "plan.md"), planText({ build: [GREEN], tests: [GREEN] }));
    const result = runScript(SUT, [slash(dir), "re-review", `${slash(dir)}/gates.md`], { cwd: dir });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /<stage>: checkpoint \| final \| re-review:checkpoint \| re-review:final/);
    assert.equal(fs.existsSync(path.join(dir, "gates.md")), false);
    assert.equal(fs.existsSync(path.join(dir, ".temp")), false, "no runner log dir: no command was launched");
  });
});

test("an <out-file> whose directory does not exist exits 2 with the reason on stderr and no stdout block", () => {
  withTempDir("p2p2-run-gate-", (dir) => {
    const result = runGate(dir, "checkpoint", { build: [GREEN], tests: [GREEN] }, `${slash(dir)}/absent/gates.md`);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /^error: cannot write gate block: /);
    assert.equal(fs.existsSync(path.join(dir, ".temp")), false, "the out-file is probed before the first command runs");
  });
});

// --- cwd independence ------------------------------------------------------

test("inside a repository every gate command runs at the REPOSITORY ROOT, whatever directory the caller started in", () => {
  withGitRepo((repo) => {
    const sub = path.join(repo.dir, "sub");
    fs.mkdirSync(sub, { recursive: true });
    // the command prints its own working directory; the marker file sits at
    // the repo root alone, so `ls` naming it proves where the command ran
    fs.writeFileSync(path.join(repo.dir, "ROOT-MARKER"), "x\n");
    fs.writeFileSync(
      path.join(repo.dir, "plan.md"),
      planText({ build: ["ls ROOT-MARKER"], tests: [GREEN] }),
    );

    const result = runScript(
      SUT,
      [slash(repo.dir), "checkpoint", `${slash(repo.dir)}/gates.md`],
      { cwd: sub, env: repo.env, timeout: 180000 },
    );
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    // green: `ls` found the root-only marker, so the command did not run in sub/
    assert.match(result.stdout, /^Build: pass$/m);
    assert.match(result.stdout, /^RED: no$/m);
  });
});

test("outside a repository the caller's cwd stays the base every gate command runs in", () => {
  withTempDir("p2p2-run-gate-nonrepo-", (dir) => {
    fs.writeFileSync(path.join(dir, "CWD-MARKER"), "x\n");
    const result = runGate(dir, "checkpoint", { build: ["ls CWD-MARKER"], tests: [GREEN] });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^Build: pass$/m);
    assert.match(result.stdout, /^RED: no$/m);
  });
});
