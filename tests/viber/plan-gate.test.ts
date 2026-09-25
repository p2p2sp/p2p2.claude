/*
 * plan-gate.test.ts - proves viber/hooks/scripts/plan-gate.sh, the PreToolUse
 * gate on ExitPlanMode: the planner's review round, enforced by the harness
 * rather than by the model.
 *
 * What it must do: arm ONLY when the current plan-mode episode carries both
 * signals of the planner skill driving the plan (a Skill tool_use for `planner`,
 * the only form it can take, plus a Write/Edit of a `plans/*.md` file), then allow
 * ExitPlanMode only for a `viber:planner-review` dispatch that FOLLOWED the last
 * plan write, returned `VERDICT: PASS`, and whose plan file has not been touched
 * since (mtime vs. the verdict's transcript timestamp). A plain plan-mode plan
 * (a plan write with no planner skill) is gated the same way by
 * `viber:plain-plan-review`, but only when the session cwd's `.claude/viber.yml`
 * turns `plain-plan-review` on. Everything else - plain-plan-review off, an episode that
 * already built a plan, an unreadable transcript - passes untouched: a broken
 * gate must never trap the user in plan mode, so every case here also asserts
 * exit 0 and parseable JSON.
 *
 * Fixture lines are built as JS objects and serialized with JSON.stringify, so
 * quotes, backslashes and newlines are escaped exactly the way the real
 * transcript author encodes them - the script reads that text with grep/sed/awk
 * and never parses JSON, so hand-escaped fixtures would prove the wrong thing.
 * The line shapes (`"type":"permission-mode"`, `"name":"Skill","input":{"skill":`,
 * `"subagent_type":`) are taken from real transcripts.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/plan-gate.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { withStub } from "../harness/stub.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/hooks/scripts/plan-gate.sh");

// --- fixture builders -------------------------------------------------

function line(obj: unknown): string {
  return JSON.stringify(obj);
}

function writeTranscript(dir: string, name: string, lines: string[]): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, lines.map((l) => `${l}\n`).join(""));
  return file;
}

interface Decision {
  decision: string;
  reason?: string;
}

// plan-gate.sh ships mode 100755, but hooks.json invokes it as
// `bash "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/plan-gate.sh"` - the harness runs it
// the same way, because this file tests the script's content, not its exec bit.
function runPayload(payload: Record<string, unknown>): Decision {
  const result = runScript(SUT, [], { shell: "bash", input: JSON.stringify(payload) });
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}; stderr: ${result.stderr}`);
  let json: { hookSpecificOutput?: { hookEventName?: string; permissionDecision?: string; permissionDecisionReason?: string } };
  try {
    json = JSON.parse(result.stdout);
  } catch {
    throw new Error(`expected parseable JSON stdout, got: ${result.stdout}`);
  }
  const out = json.hookSpecificOutput;
  assert.ok(out, `expected hookSpecificOutput, got: ${result.stdout}`);
  assert.equal(out.hookEventName, "PreToolUse");
  return { decision: out.permissionDecision ?? "", reason: out.permissionDecisionReason };
}

function runCase(transcriptPath: string, cwd?: string): Decision {
  const payload: Record<string, unknown> = { transcript_path: transcriptPath, tool_name: "ExitPlanMode" };
  if (cwd) payload.cwd = cwd;
  return runPayload(payload);
}

/** The dated plan layout plan-path.sh owns; `plans` is the directory segment the
 *  gate anchors on. A path that never exists on disk is fine for every case but
 *  the mtime guard - the guard is skipped when the file cannot be read. */
const PLAN = "/repo/.claude/plans/2026-09-20-10-00-00_feat-x/plan.md";

/** Signal 1a: the planner skill invoked through the Skill tool. */
function skillUse(skill = "viber:planner"): string {
  return line({ type: "assistant", message: { content: [{ type: "tool_use", name: "Skill", input: { skill } }] } });
}

/** NOT a signal: a typed command. The planner skill is user-invocable: false, so
 *  `/viber:planner` cannot be typed at all, and a `planner` command that IS typeable
 *  belongs to some other plugin. */
function typedCommand(command = "/viber:planner"): string {
  return line({ type: "user", message: { content: `<command-name>${command}</command-name>` } });
}

/** Signal 2: the plan file itself, written by Write or Edit. */
function planWrite(filePath = PLAN, name: "Write" | "Edit" = "Write"): string {
  return line({ type: "assistant", message: { content: [{ type: "tool_use", name, input: { file_path: filePath, content: "# Plan" } }] } });
}

function dispatch(id?: string, agent = "viber:planner-review"): string {
  const use: Record<string, unknown> = {
    type: "tool_use",
    name: "Agent",
    input: { subagent_type: agent, prompt: `review ${PLAN}` },
  };
  if (id) use.id = id;
  return line({ type: "assistant", message: { content: [use] } });
}

interface VerdictOpts {
  id?: string;
  timestamp?: string;
  body?: string;
}

function verdict(value: "PASS" | "FAIL" | "DENIED", opts: VerdictOpts = {}): string {
  const block: Record<string, unknown> = {
    type: "tool_result",
    content: opts.body ?? `## Plan Review\nVERDICT: ${value}\nnotes.`,
  };
  if (opts.id) block.tool_use_id = opts.id;
  const obj: Record<string, unknown> = { type: "user", message: { content: [block] } };
  if (opts.timestamp) obj.timestamp = opts.timestamp;
  return line(obj);
}

function permissionMode(mode: string): string {
  return line({ type: "permission-mode", permissionMode: mode, sessionId: "s" });
}

/** A plan file that really exists, so the mtime guard has something to stat. */
function realPlan(dir: string, rel = ".claude/plans/2026-09-20-10-00-00_feat-x/plan.md"): string {
  const file = path.join(dir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "# Plan\n");
  return file;
}

const PASS = verdict("PASS");
const FAIL = verdict("FAIL");

// --- fail-open matrix -------------------------------------------------

test("empty stdin -> allow (a broken gate must never trap the user in plan mode)", () => {
  const result = runScript(SUT, [], { shell: "bash", input: "" });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, "allow");
});

test("a payload with no transcript_path key -> allow", () => {
  assert.equal(runPayload({ tool_name: "ExitPlanMode" }).decision, "allow");
});

test("transcript_path pointing at a file that does not exist -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    assert.equal(runCase(path.join(dir, "gone.jsonl")).decision, "allow");
  });
});

test("a transcript that is not JSONL at all -> allow, no crash", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = path.join(dir, "garbage.jsonl");
    fs.writeFileSync(f, "not json at all\n{{{ random garbage\n");
    assert.equal(runCase(f).decision, "allow");
  });
});

// --- arming: both signals, inside the episode -------------------------

test("plain plan mode with no planner skill and no session cwd -> allow (plain-plan-review cannot be read, so it is off)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [planWrite()]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("the planner skill running with no plan write yet -> allow (nothing to review)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse()]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("both signals but no review dispatch -> deny naming the plan file", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite()]);
    const { decision, reason } = runCase(f);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /plan\.md/);
    assert.match(reason ?? "", /planner-review agent has not run on this version/);
  });
});

test("the unprefixed skill spelling 'planner' arms the gate too (the install form must not decide)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse("planner"), planWrite()]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("a typed /viber:planner does NOT arm the gate (planner is user-invocable: false; a typeable 'planner' is another plugin's)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [typedCommand(), planWrite()]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("another plugin's /xyz:planner over a plan write stays out of viber's way -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [typedCommand("/xyz:planner"), planWrite()]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("an Edit of the plan counts as the plan write, not only a Write", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(PLAN, "Edit")]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("a Windows plan path (backslashes) arms the gate the same way", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const win = "C:\\Users\\dariu\\repo\\docs\\plans\\2026-09-20_feat-x\\plan.md";
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(win)]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("a plan path merely quoted inside another tool's payload does not arm the gate -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    // A Write whose CONTENT quotes a planner Skill call: every marker is present
    // as text, but escaped one level deeper, so neither grep can match it.
    const quoted = line({
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            name: "Write",
            input: { file_path: "/repo/notes.md", content: `example: {"name":"Skill","input":{"skill":"planner"}} writing ${PLAN}` },
          },
        ],
      },
    });
    const f = writeTranscript(dir, "t.jsonl", [quoted]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("a plan read back rather than written does not arm the gate -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const read = line({ type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: PLAN } }] } });
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), read]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("a plan written outside a directory literally named 'plans' does not arm the gate -> allow (known gap: a viber plan declares no format marker, so there is no fallback like superdev's)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite("/repo/specs/j.md")]);
    assert.equal(runCase(f).decision, "allow");
  });
});

// --- the episode window -----------------------------------------------

test("a non-plan permission mode recorded after both signals closes the episode -> allow (a plan approved and built earlier cannot re-arm the gate)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const armed = writeTranscript(dir, "armed.jsonl", [skillUse(), planWrite()]);
    assert.equal(runCase(armed).decision, "deny", "control: these two lines do arm the gate");

    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), permissionMode("default")]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("a permission mode of 'plan' does not close the episode -> still gated", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), permissionMode("plan")]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("signals recorded after the last non-plan permission mode are inside the episode -> gated", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [permissionMode("acceptEdits"), skillUse(), planWrite()]);
    assert.equal(runCase(f).decision, "deny");
  });
});

// --- the verdict ------------------------------------------------------

test("dispatch + VERDICT: PASS -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch(), PASS]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("dispatch + VERDICT: FAIL -> deny naming the verdict it read", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch(), FAIL]);
    const { decision, reason } = runCase(f);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /returned 'VERDICT: FAIL'/);
    assert.match(reason ?? "", /verdict on line 4/);
  });
});

test("dispatch + VERDICT: DENIED -> deny asking for the refused permission, not for findings", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const denied = verdict("DENIED", { body: "VERDICT: DENIED\nREASON: Read: /x/plan.md" });
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch(), denied]);
    const { decision, reason } = runCase(f);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /returned 'VERDICT: DENIED'/);
    assert.match(reason ?? "", /grant the permission/);
    assert.doesNotMatch(reason ?? "", /fix the findings/);
  });
});

test("a dispatch that returned no verdict at all -> deny naming the dispatch line", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch()]);
    const { decision, reason } = runCase(f);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /returned no 'VERDICT:' line/);
    assert.match(reason ?? "", /transcript line 3/);
  });
});

test("the unprefixed subagent spelling 'planner-review' is recognized -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const bare = line({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Agent", input: { subagent_type: "planner-review", prompt: "review" } }] },
    });
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), bare, PASS]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("a review that ran BEFORE the last plan write does not count -> deny (the current version was never reviewed)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch(), PASS, planWrite()]);
    const { decision, reason } = runCase(f);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /has not run on this version/);
  });
});

test("FAIL then a re-review PASS -> allow (the newest completed pair binds)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch(), FAIL, dispatch(), PASS]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("PASS then a re-review FAIL -> deny (the newest completed pair binds both ways)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch(), PASS, dispatch(), FAIL]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("a 'VERDICT: PASS' quoted in prose with no dispatch before it -> deny (the gate does not take the model's word for it)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const quoted = line({ type: "assistant", message: { content: "The reviewer would say VERDICT: PASS here.\n" } });
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), quoted]);
    const { decision, reason } = runCase(f);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /has not run on this version/);
  });
});

test("a qualified 'VERDICT: PASS is not warranted' does not read as a PASS -> deny on the real FAIL below it", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const mixed = verdict("FAIL", { body: "VERDICT: PASS is not warranted; see below.\nVERDICT: FAIL\nfix task 3." });
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch(), mixed]);
    const { decision, reason } = runCase(f);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /returned 'VERDICT: FAIL'/);
  });
});

test("a back-ticked `VERDICT: `PASS`` -> allow (the agent's own markdown must not gate the user)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const ticked = verdict("PASS", { body: "## Plan Review\nVERDICT: `PASS`\nall good." });
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch(), ticked]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("a verdict delivered inside a background agent's <result> element -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const bg = line({ type: "user", message: { content: "agent finished: <result>VERDICT: PASS</result>" } });
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch(), bg]);
    assert.equal(runCase(f).decision, "allow");
  });
});

// --- dispatch-id binding ----------------------------------------------

test("a verdict carrying the dispatch's own tool-use id is the one that binds -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const id = "toolu_01AbCdEf";
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch(id), verdict("PASS", { id })]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("an id-bearing dispatch with only a foreign VERDICT: PASS after it -> deny, own review still in flight", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const id = "toolu_01Mine";
    const f = writeTranscript(dir, "t.jsonl", [
      skillUse(),
      planWrite(),
      dispatch(id),
      verdict("PASS", { id: "toolu_01Other" }),
    ]);
    const { decision, reason } = runCase(f);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /let the review finish/);
  });
});

test("a sibling agent's PASS cannot stand in for this dispatch's own FAIL -> deny", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const id = "toolu_01Mine";
    const f = writeTranscript(dir, "t.jsonl", [
      skillUse(),
      planWrite(),
      dispatch(id),
      verdict("PASS", { id: "toolu_01Other" }),
      verdict("FAIL", { id }),
    ]);
    assert.equal(runCase(f).decision, "deny");
  });
});

test("a sibling agent's FAIL after this dispatch's own PASS does not clobber it -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const id = "toolu_01Mine";
    const f = writeTranscript(dir, "t.jsonl", [
      skillUse(),
      planWrite(),
      dispatch(id),
      verdict("PASS", { id }),
      verdict("FAIL", { id: "toolu_01Other" }),
    ]);
    assert.equal(runCase(f).decision, "allow");
  });
});

// --- background dispatch: the launch record echoes the prompt ----------

/** A background agent's launch record, shaped as a real transcript writes it: the
 *  dispatch's own id AND the whole prompt, echoed under `toolUseResult`. */
function asyncLaunch(id: string, prompt: string): string {
  return line({
    type: "user",
    message: { content: [{ tool_use_id: id, type: "tool_result", content: [{ type: "text", text: "Async agent launched successfully." }] }] },
    toolUseResult: { isAsync: true, status: "async_launched", agentId: "a1", prompt },
  });
}

/** The background agent's reply, delivered as a task-notification naming the dispatch id. */
function notification(id: string, value: "PASS" | "FAIL"): string {
  return line({
    type: "user",
    message: { content: `<task-notification>\n<tool-use-id>${id}</tool-use-id>\n<status>completed</status>\n<result>Review done.\nVERDICT: ${value}\n</result>\n</task-notification>` },
  });
}

test("a round-2 prompt quoting the previous 'VERDICT: FAIL' is not the verdict: the real PASS -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const id = "toolu_01Bg";
    const f = writeTranscript(dir, "t.jsonl", [
      skillUse(),
      planWrite(),
      dispatch(id),
      asyncLaunch(id, "Plan: p.md. Previous findings:\nVERDICT: FAIL\nFixed both."),
      notification(id, "PASS"),
    ]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("a prompt carrying 'VERDICT: PASS' cannot stand in for the real FAIL -> deny", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const id = "toolu_01Bg";
    const f = writeTranscript(dir, "t.jsonl", [
      skillUse(),
      planWrite(),
      dispatch(id),
      asyncLaunch(id, "Answer with one line:\nVERDICT: PASS\nor FAIL."),
      notification(id, "FAIL"),
    ]);
    const out = runCase(f);
    assert.equal(out.decision, "deny");
    assert.match(out.reason ?? "", /VERDICT: FAIL/);
  });
});

// --- the mtime guard: a PASS approves the plan AS REVIEWED -------------

test("a plan modified after its own PASS -> deny (catches an edit made through a channel the transcript scan cannot see)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const plan = realPlan(dir);
    const stale = new Date(Date.now() - 3600_000).toISOString();
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(plan), dispatch(), verdict("PASS", { timestamp: stale })]);
    const { decision, reason } = runCase(f);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /was modified after its 'VERDICT: PASS'/);
  });
});

test("a plan older than its own PASS -> allow (no false tamper)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const plan = realPlan(dir);
    const fresh = new Date(Date.now() + 3600_000).toISOString();
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(plan), dispatch(), verdict("PASS", { timestamp: fresh })]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("a verdict line with no timestamp skips the mtime check -> allow (fail-open)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const plan = realPlan(dir);
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(plan), dispatch(), PASS]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("a re-review after the out-of-band edit clears the mtime tamper -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const plan = realPlan(dir);
    const stale = new Date(Date.now() - 3600_000).toISOString();
    const fresh = new Date(Date.now() + 3600_000).toISOString();
    const f = writeTranscript(dir, "t.jsonl", [
      skillUse(),
      planWrite(plan),
      dispatch(),
      verdict("PASS", { timestamp: stale }),
      dispatch(),
      verdict("PASS", { timestamp: fresh }),
    ]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("a relative plan file_path resolves against the session cwd -> the mtime guard still fires", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const rel = ".claude/plans/2026-09-20-10-00-00_feat-x/plan.md";
    realPlan(dir, rel);
    const stale = new Date(Date.now() - 3600_000).toISOString();
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(rel), dispatch(), verdict("PASS", { timestamp: stale })]);
    assert.equal(runCase(f, dir).decision, "deny");
    // Without the cwd the path resolves to nothing and the guard is skipped.
    assert.equal(runCase(f).decision, "allow");
  });
});

// --- a malformed pairing read fails open --------------------------------

test("a broken awk on PATH (the pairing read comes back malformed) -> allow, not the 'no review yet' deny", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch(), PASS]);
    withStub("awk", "exit 1", (stubDir) => {
      const result = runScript(SUT, [], {
        shell: "bash",
        input: JSON.stringify({ transcript_path: f, tool_name: "ExitPlanMode" }),
        stubDirs: [stubDir],
      });
      assert.equal(result.status, 0, `expected exit 0, got ${result.status}; stderr: ${result.stderr}`);
      const json = JSON.parse(result.stdout);
      assert.equal(json.hookSpecificOutput.permissionDecision, "allow");
    });
  });
});

// --- transcript shape edge cases --------------------------------------

test("a transcript with CRLF line endings still resolves the happy path -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = path.join(dir, "crlf.jsonl");
    fs.writeFileSync(f, [skillUse(), planWrite(), dispatch(), PASS].join("\r\n") + "\r\n");
    assert.equal(runCase(f).decision, "allow");
  });
});

test("thousands of noise lines around the signals still resolve the happy path -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const noise = line({ type: "user", message: { content: "noise line, not relevant to the gate" } });
    const f = writeTranscript(dir, "t.jsonl", [
      ...Array(3000).fill(noise),
      skillUse(),
      planWrite(),
      ...Array(1000).fill(noise),
      dispatch(),
      PASS,
    ]);
    assert.equal(runCase(f).decision, "allow");
  });
});

test("the last of several plan writes is the one that must be reviewed", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const first = "/repo/.claude/plans/2026-09-20-09-00-00_a/plan.md";
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(first), dispatch(), PASS, planWrite(PLAN), dispatch(), PASS]);
    assert.equal(runCase(f).decision, "allow");
  });
});

// --- plain plan mode: plain-plan-review, behind the plain-plan-review switch --

const PLAIN = "viber:plain-plan-review";

/** A session cwd whose .claude/viber.yml carries the given body. */
function sessionWithConfig(dir: string, body: string): string {
  const cwd = path.join(dir, "session");
  fs.mkdirSync(path.join(cwd, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(cwd, ".claude", "viber.yml"), body);
  return cwd;
}

test("plain plan with plain-plan-review on and no review dispatch -> deny naming plain-plan-review and what to pass it", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const cwd = sessionWithConfig(dir, "plain-plan-review: true\n");
    const f = writeTranscript(dir, "t.jsonl", [planWrite()]);
    const { decision, reason } = runCase(f, cwd);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /plain-plan-review agent has not run on this version/);
    assert.match(reason ?? "", /one sentence stating the user's goal/);
    assert.match(reason ?? "", /plain-plan-review in \.claude\/viber\.yml/);
  });
});

test("plain plan with plain-plan-review off, absent, or no config file at all -> allow (the switch is the only arming signal)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [planWrite()]);
    assert.equal(runCase(f, sessionWithConfig(path.join(dir, "a"), "plain-plan-review: false\n")).decision, "allow");
    assert.equal(runCase(f, sessionWithConfig(path.join(dir, "b"), "adr: true\n")).decision, "allow");
    const bare = path.join(dir, "c");
    fs.mkdirSync(bare);
    assert.equal(runCase(f, bare).decision, "allow");
  });
});

test("plain plan with plain-plan-review on: plain-plan-review PASS -> allow, FAIL -> deny", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const cwd = sessionWithConfig(dir, "plain-plan-review: true\n");
    const pass = writeTranscript(dir, "pass.jsonl", [planWrite(), dispatch(undefined, PLAIN), PASS]);
    assert.equal(runCase(pass, cwd).decision, "allow");
    const fail = writeTranscript(dir, "fail.jsonl", [planWrite(), dispatch(undefined, PLAIN), FAIL]);
    const { decision, reason } = runCase(fail, cwd);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /plain-plan-review agent returned 'VERDICT: FAIL'/);
  });
});

test("the unprefixed subagent spelling 'plain-plan-review' is recognized -> allow", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const cwd = sessionWithConfig(dir, "plain-plan-review: true\n");
    const f = writeTranscript(dir, "t.jsonl", [planWrite(), dispatch(undefined, "plain-plan-review"), PASS]);
    assert.equal(runCase(f, cwd).decision, "allow");
  });
});

test("a planner-review PASS does not satisfy the plain gate -> deny (each path answers only to its own reviewer)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const cwd = sessionWithConfig(dir, "plain-plan-review: true\n");
    const f = writeTranscript(dir, "t.jsonl", [planWrite(), dispatch(), PASS]);
    const { decision, reason } = runCase(f, cwd);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /plain-plan-review agent has not run on this version/);
  });
});

test("a plain-plan-review PASS does not satisfy the planner gate -> deny, whatever plain-plan-review says", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const f = writeTranscript(dir, "t.jsonl", [skillUse(), planWrite(), dispatch(undefined, PLAIN), PASS]);
    for (const [i, body] of ["plain-plan-review: true\n", "plain-plan-review: false\n"].entries()) {
      const { decision, reason } = runCase(f, sessionWithConfig(path.join(dir, `s${i}`), body));
      assert.equal(decision, "deny");
      assert.match(reason ?? "", /viber:planner-review agent has not run on this version/);
    }
  });
});

test("plain plan modified after its plain-plan-review PASS -> deny (the mtime guard covers the plain path too)", () => {
  withTempDir("p2p2-plan-gate-", (dir) => {
    const cwd = sessionWithConfig(dir, "plain-plan-review: true\n");
    const plan = realPlan(dir);
    const stale = new Date(Date.now() - 3600_000).toISOString();
    const f = writeTranscript(dir, "t.jsonl", [planWrite(plan), dispatch(undefined, PLAIN), verdict("PASS", { timestamp: stale })]);
    const { decision, reason } = runCase(f, cwd);
    assert.equal(decision, "deny");
    assert.match(reason ?? "", /was modified after its 'VERDICT: PASS' - dispatch the viber:plain-plan-review agent/);
  });
});
