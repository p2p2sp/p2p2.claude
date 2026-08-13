/*
 * review-plan.test.ts - proves review-plan.sh's ExitPlanMode plan-approval
 * gate, replacing the retired superdev/hooks/scripts/review-plan.test.sh
 * (every case that bash harness asserted, run through the shared subprocess
 * harness instead of a bespoke bash test runner), plus the fail-open matrix
 * and edge cases from the task spec.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/review-plan.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/hooks/scripts/review-plan.sh");

// --- fixture builders -------------------------------------------------
// Lines are built as JS objects and serialized with JSON.stringify, so
// backslashes/quotes/newlines are escaped the same way a real transcript
// author (Claude Code) would encode them - no hand-escaped JSON text.
function line(obj: unknown): string {
  return JSON.stringify(obj);
}

function writeFixtureFile(dir: string, name: string, lines: string[]): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, lines.map((l) => `${l}\n`).join(""));
  return file;
}

interface Decision {
  decision: string;
  reason?: string;
}

// review-plan.sh ships mode 100644 (git ls-files) - hooks.json always invokes it
// as `bash "review-plan.sh"`, never bare, so the portability sweep does not
// require an exec bit here; the harness must invoke it the same way.
function runCase(transcriptPath: string): Decision {
  const result = runScript(SUT, [], {
    shell: "bash",
    input: JSON.stringify({ transcript_path: transcriptPath, tool_name: "ExitPlanMode" }),
  });
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}; stderr: ${result.stderr}`);
  let json: any;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    throw new Error(`expected parseable JSON stdout, got: ${result.stdout}`);
  }
  const out = json.hookSpecificOutput;
  assert.ok(out, `expected hookSpecificOutput, got: ${result.stdout}`);
  assert.equal(out.hookEventName, "PreToolUse");
  return { decision: out.permissionDecision, reason: out.permissionDecisionReason };
}

function writePlanFile(dir: string, name: string, contents: string): string {
  const plansDir = path.join(dir, ".claude", "plans");
  fs.mkdirSync(plansDir, { recursive: true });
  const file = path.join(plansDir, name);
  fs.writeFileSync(file, contents);
  return file;
}

function writeOf(filePath: string): string {
  return line({
    type: "assistant",
    message: { content: [{ type: "tool_use", name: "Write", input: { file_path: filePath, content: "plan" } }] },
  });
}

// --- fixture JSONL lines - a literal Windows-style transcript path
// ("C:\Users\..\.claude\plans\..") proves the backslash-unescape logic
// without needing a real file at that path: on every OS the disk read for it
// fails, so the format gate fails open exactly like a ".claude/plans/ empty"
// scenario, and only the reviewer/verdict chain gates. ---
const PLAN = "C:\\Users\\dariu\\.claude\\plans\\foo.md";

const LW = writeOf(PLAN);
const LR = line({
  type: "assistant",
  message: { content: [{ type: "tool_use", name: "Skill", input: { skill: "superdev:superplan-reviewer", args: PLAN } }] },
});
const LR2 = line({
  type: "assistant",
  message: {
    content: [
      {
        type: "tool_use",
        name: "Skill",
        input: {
          skill: "superdev:superplan-reviewer",
          args: `${PLAN}\n--- Previous review (round 1) ---\nVerdict: FAIL\n--- Fixes applied ---`,
        },
      },
    ],
  },
});
// Simple-path reviewer call - the gate must recognize simpleplan-reviewer, not only superplan-reviewer.
const LRS = line({
  type: "assistant",
  message: { content: [{ type: "tool_use", name: "Skill", input: { skill: "superdev:simpleplan-reviewer", args: PLAN } }] },
});
const LPASS = line({
  type: "user",
  message: { content: [{ type: "tool_result", content: "## Superplan Review\nVERDICT: PASS\nAll good." }] },
});
const LFAIL = line({
  type: "user",
  message: { content: [{ type: "tool_result", content: "## Superplan Review\nVERDICT: FAIL\nFix list: rework step 3." }] },
});
const LPASTE = line({
  type: "user",
  message: { content: "here is an older reviewed doc I pasted:\nVERDICT: PASS looked fine last week" },
});
const LLEGEND = line({
  type: "assistant",
  message: { content: "for reference the template legend is:\nVERDICT: PASS | FAIL" },
});
const LTAMPER_SED = line({
  type: "assistant",
  message: { content: [{ type: "tool_use", name: "Bash", input: { command: `sed -i s/x/y/ ${PLAN}` } }] },
});
const LTAMPER_REDIR = line({
  type: "assistant",
  message: { content: [{ type: "tool_use", name: "Bash", input: { command: `cat extra >> ${PLAN}` } }] },
});
const LSTAGE = line({
  type: "assistant",
  message: { content: [{ type: "tool_use", name: "Bash", input: { command: `git add ${PLAN}` } }] },
});
const LREDIR_OTHER = line({
  type: "assistant",
  message: { content: [{ type: "tool_use", name: "Bash", input: { command: "echo see foo.md > notes.txt" } }] },
});
// reviewer result whose FIRST verdict-shaped line is a NEGATED/qualified PASS, before the real FAIL
const LNEG = line({
  type: "user",
  message: {
    content: [
      {
        type: "tool_result",
        content: "## Superplan Review\nVERDICT: PASS is NOT warranted; see below.\nVERDICT: FAIL\nFix list: rework.",
      },
    ],
  },
});
const LTAMPER_GT = line({
  type: "assistant",
  message: { content: [{ type: "tool_use", name: "Bash", input: { command: `printf x > ${PLAN}` } }] },
});
const LTAMPER_TEE = line({
  type: "assistant",
  message: { content: [{ type: "tool_use", name: "Bash", input: { command: `echo x | tee ${PLAN}` } }] },
});
const LTAMPER_CP = line({
  type: "assistant",
  message: { content: [{ type: "tool_use", name: "Bash", input: { command: `cp other ${PLAN}` } }] },
});
const LTAMPER_MV = line({
  type: "assistant",
  message: { content: [{ type: "tool_use", name: "Bash", input: { command: `mv other ${PLAN}` } }] },
});
// Format-tolerance fixtures - the reviewer emits the canonical literal `VERDICT:`
// keyword (no bold, no case variance); the gate still tolerates a leading markdown
// list marker and back-ticks around the value.
const LPASS_CANON = line({
  type: "user",
  message: { content: [{ type: "tool_result", content: "## Superplan Review\nVERDICT: PASS\nAll good." }] },
});
const LPASS_LIST = line({
  type: "user",
  message: { content: [{ type: "tool_result", content: "## Superplan Review\n- VERDICT: `PASS`\nAll good." }] },
});
const LFAIL_LIST = line({
  type: "user",
  message: { content: [{ type: "tool_result", content: "## Superplan Review\n- VERDICT: `FAIL`\nFix list: rework step 3." }] },
});
const LNEG_UPPER = line({
  type: "user",
  message: {
    content: [
      {
        type: "tool_result",
        content: "## Superplan Review\nVERDICT: PASS is NOT warranted; see below.\nVERDICT: FAIL\nFix list: rework.",
      },
    ],
  },
});
// round-2 sibling: the reviewer-context file written NEXT TO the plan - matches the
// plans dir glob by path, must be EXCLUDED from plan-write detection.
const LWREV = line({
  type: "assistant",
  message: {
    content: [
      {
        type: "tool_use",
        name: "Write",
        input: { file_path: "C:\\Users\\dariu\\.claude\\plans\\foo.md.review-1.md", content: "--- Previous review (round 1) ---" },
      },
    ],
  },
});
// spec-faithful reviewer output: the verdict OPENS the content string.
const LPASS_START = line({ type: "user", message: { content: [{ type: "tool_result", content: "VERDICT: PASS\nAll good." }] } });
const LFAIL_START = line({
  type: "user",
  message: { content: [{ type: "tool_result", content: "VERDICT: FAIL\nFix list: rework step 3." }] },
});
// old bold format, now rejected outright - no verdict-shaped line matches, so the
// gate falls through to "no VERDICT: line found" and denies.
const LPASS_BOLD_OLD = line({
  type: "user",
  message: { content: [{ type: "tool_result", content: "## Superplan Review\n**VERDICT:** PASS\nAll good." }] },
});

test("A - happy path W->R->PASS -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("A2 - Simple-path W->R(simpleplan-reviewer)->PASS -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LRS, LPASS]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("B - genuine FAIL only -> deny", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LFAIL]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("G - reviewer FAIL then a later pasted 'Verdict: PASS' -> deny (no false-allow)", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LFAIL, LPASTE]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("H - reviewer FAIL then a 'Verdict: PASS | FAIL' legend line -> deny", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LFAIL, LLEGEND]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("T1 - genuine PASS then Bash `sed -i` on the plan path -> deny (tamper)", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS, LTAMPER_SED]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("T2 - genuine PASS then Bash `>>` redirect into the plan path -> deny (tamper)", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS, LTAMPER_REDIR]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("N1 - genuine PASS then `git add <plan>` (stage, not mutate) -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS, LSTAGE]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("N2 - genuine PASS then a redirect to ANOTHER file that only names the plan -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS, LREDIR_OTHER]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("N3 - genuine PASS then a later stray pasted PASS -> allow (no over-deny)", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS, LPASTE]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("R2 - round-2 re-review: prior FAIL rides ON the reviewer-call line, then genuine PASS -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR2, LPASS]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("NEG - a negated 'Verdict: PASS is NOT ...' precedes the real FAIL verdict -> deny", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LNEG]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("T3 - genuine PASS then a single `>` redirect into the plan -> deny (tamper)", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS, LTAMPER_GT]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("T4 - genuine PASS then `tee` writing the plan -> deny (tamper)", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS, LTAMPER_TEE]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("T5 - genuine PASS then `cp` overwriting the plan -> deny (tamper)", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS, LTAMPER_CP]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("T6 - genuine PASS then `mv` overwriting the plan -> deny (tamper)", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS, LTAMPER_MV]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("FC - canonical `VERDICT: PASS` -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS_CANON]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("FB - old bold `**VERDICT:** PASS` no longer matches -> deny", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS_BOLD_OLD]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("FL - list marker + back-ticked UPPER `- VERDICT: `PASS`` -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS_LIST]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("FF - same shape carrying FAIL must still deny, not slip through", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LFAIL_LIST]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("NEGU - negated UPPER PASS before the real UPPER FAIL -> deny", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LNEG_UPPER]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("P - plain path: plan-file WRITE only, NO reviewer call at all -> deny defaulting to simpleplan-reviewer", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW]);
    const { decision, reason } = runCase(f);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /simpleplan-reviewer/);
  });
});

test("R2T - round-2 sibling write, PASS, tamper on the REAL plan -> deny (sibling never becomes plan_base)", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LWREV, LR, LPASS, LTAMPER_SED]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("R2A - same round-2 flow without the tamper -> allow (sibling write is benign)", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LWREV, LR, LPASS]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("RS - review-sibling write ONLY (no plan write at all) must NOT arm the gate -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LWREV]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("VS - spec-faithful verdict opens the content string, PASS -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LPASS_START]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("VSF - same shape carrying FAIL must still deny", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR, LFAIL_START]);
    assert.equal(runCase(f).decision, "deny");
  });
});

// --- Format gate (Step 1b): the plan file must DECLARE its format ON DISK. ---

test("DF - plan declares SimplePlan format, reviewer PASS -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const plan = writePlanFile(dir, "simple.md", "# SimplePlan\nTo build this plan must use the `simplebuild` skill.\n");
    const lw = writeOf(plan);
    const lr = line({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Skill", input: { skill: "superdev:simpleplan-reviewer", args: plan } }] },
    });
    const f = writeFixtureFile(dir, "t.jsonl", [lw, lr, LPASS]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("DFS - plan declares SuperPlan format, reviewer PASS -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const plan = writePlanFile(dir, "super.md", "# SuperPlan\nTo build this plan use the `superbuild` skill.\n");
    const lw = writeOf(plan);
    const lr = line({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Skill", input: { skill: "superdev:superplan-reviewer", args: plan } }] },
    });
    const f = writeFixtureFile(dir, "t.jsonl", [lw, lr, LPASS]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("UF - plan declares NO format: deny even with reviewer PASS present, reason names the default SimplePlan format", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const plan = writePlanFile(dir, "nofmt.md", "# My Plan\nSome tasks, but no format marker at all.\n");
    const lw = writeOf(plan);
    const lr = line({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Skill", input: { skill: "superdev:simpleplan-reviewer", args: plan } }] },
    });
    const f = writeFixtureFile(dir, "t.jsonl", [lw, lr, LPASS]);
    const { decision, reason } = runCase(f);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /SimplePlan format/);
  });
});

test("both format markers present on the same plan -> allow (either marker satisfies the gate)", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const plan = writePlanFile(dir, "both.md", "# SimplePlan\n# SuperPlan (also mentions superbuild)\nbody\n");
    const lw = writeOf(plan);
    const lr = line({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Skill", input: { skill: "superdev:simpleplan-reviewer", args: plan } }] },
    });
    const f = writeFixtureFile(dir, "t.jsonl", [lw, lr, LPASS]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("multiple plan writes in one transcript - the LAST write is the operative plan for format/tamper", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const fooPath = writePlanFile(dir, "foo.md", "# SimplePlan\nfoo.\n");
    const barPath = writePlanFile(dir, "bar.md", "# SimplePlan\nbar.\n");
    const lwFoo = writeOf(fooPath);
    const lwBar = writeOf(barPath);
    const reviewer = line({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Skill", input: { skill: "superdev:simpleplan-reviewer", args: barPath } }] },
    });
    const tamperFoo = line({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Bash", input: { command: `sed -i s/x/y/ ${fooPath}` } }] },
    });
    const tamperBar = line({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Bash", input: { command: `sed -i s/x/y/ ${barPath}` } }] },
    });

    // Tampering the EARLIER (non-last) plan write's file after PASS is ignored - allow.
    const f1 = writeFixtureFile(dir, "t1.jsonl", [lwFoo, lwBar, reviewer, LPASS, tamperFoo]);
    assert.equal(runCase(f1).decision, "allow");

    // Tampering the LAST plan write's file after PASS re-gates - deny.
    const f2 = writeFixtureFile(dir, "t2.jsonl", [lwFoo, lwBar, reviewer, LPASS, tamperBar]);
    assert.equal(runCase(f2).decision, "deny");
  });
});

// --- Fail-open matrix (Approach step 2): every case must exit 0 and emit
// parseable JSON - a hook that exits non-zero or prints non-JSON is the
// failure mode under test. ---

test("transcript_path key absent from the stdin payload -> fails open (allow)", () => {
  const result = runScript(SUT, [], { shell: "bash", input: JSON.stringify({ tool_name: "ExitPlanMode" }) });
  assert.equal(result.status, 0);
  const json = JSON.parse(result.stdout);
  assert.equal(json.hookSpecificOutput.permissionDecision, "allow");
});

test("transcript_path points at a file that does not exist -> fails open (allow)", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const missing = path.join(dir, "does-not-exist.jsonl");
    assert.equal(runCase(missing).decision, "allow");
  });
});

test("transcript exists but is not valid JSONL -> fails open (allow), no crash", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = path.join(dir, "garbage.jsonl");
    fs.writeFileSync(f, "not json at all\nrandom garbage {{{ \n");
    assert.equal(runCase(f).decision, "allow");
  });
});

test("reviewer called but no 'VERDICT:' line appears anywhere -> deny naming the missing verdict", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = writeFixtureFile(dir, "t.jsonl", [LW, LR]);
    const { decision, reason } = runCase(f);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /no 'VERDICT:' line/);
  });
});

test("empty stdin -> fails open (allow), valid JSON, exit 0", () => {
  const result = runScript(SUT, [], { shell: "bash", input: "" });
  assert.equal(result.status, 0);
  const json = JSON.parse(result.stdout);
  assert.equal(json.hookSpecificOutput.permissionDecision, "allow");
});

// --- Edge cases (task spec) --------------------------------------------

test("a transcript with CRLF line endings still resolves the happy path -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const f = path.join(dir, "t.jsonl");
    fs.writeFileSync(f, [LW, LR, LPASS].join("\r\n") + "\r\n");
    assert.equal(runCase(f).decision, "allow");
  });
});

test("a very long transcript (thousands of noise lines) still resolves the happy path -> allow", () => {
  withTempDir("p2p2-review-plan-", (dir) => {
    const noise = line({ type: "user", message: { content: "noise line, not relevant to the gate" } });
    const lines = [...Array(5000).fill(noise), LW, LR, LPASS];
    const f = writeFixtureFile(dir, "t.jsonl", lines);
    assert.equal(runCase(f).decision, "allow");
  });
});
