/*
 * plan-hints.test.ts - proves viber/hooks/scripts/plan-hints.sh, the
 * UserPromptSubmit hook that hands plain plan mode its plan-writing rules.
 *
 * What it must do: on a prompt whose payload carries `"permission_mode":"plan"`,
 * print one UserPromptSubmit additionalContext naming both rules (a closing
 * subagent review task, parallel subagents for independent tasks) - unless a
 * planner Skill tool_use sits in the current plan-mode episode, where the viber
 * planner already covers both. Any other mode, a payload without the key, or
 * empty stdin prints nothing. A missing transcript counts as no planner, so the
 * hint still fires. Every case asserts exit 0: a broken hint must never block a
 * prompt.
 *
 * The episode window and the planner Skill grep are copied from plan-gate.sh,
 * so the fixture line shapes are the ones tests/viber/plan-gate.test.ts uses,
 * serialized with JSON.stringify for the same reason: the script reads raw text
 * with grep/sed and never parses JSON.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/plan-hints.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/hooks/scripts/plan-hints.sh");

// --- fixture builders -------------------------------------------------

function line(obj: unknown): string {
  return JSON.stringify(obj);
}

function writeTranscript(dir: string, lines: string[]): string {
  const file = path.join(dir, "t.jsonl");
  fs.writeFileSync(file, lines.map((l) => `${l}\n`).join(""));
  return file;
}

function skillUse(skill = "viber:planner"): string {
  return line({ type: "assistant", message: { content: [{ type: "tool_use", name: "Skill", input: { skill } }] } });
}

function permissionMode(mode: string): string {
  return line({ type: "permission-mode", permissionMode: mode, sessionId: "s" });
}

// hooks.json invokes the script as `bash "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/plan-hints.sh"`,
// so the harness runs it through bash the same way.
function run(input: string): string {
  const result = runScript(SUT, [], { shell: "bash", input });
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}; stderr: ${result.stderr}`);
  return result.stdout;
}

function runPayload(payload: Record<string, unknown>): string {
  return run(JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt: "go", ...payload }));
}

/** Parses the hint and asserts it carries both rules. */
function assertHint(stdout: string): void {
  let json: { hookSpecificOutput?: { hookEventName?: string; additionalContext?: string } };
  try {
    json = JSON.parse(stdout);
  } catch {
    throw new Error(`expected parseable JSON stdout, got: ${stdout}`);
  }
  const out = json.hookSpecificOutput;
  assert.ok(out, `expected hookSpecificOutput, got: ${stdout}`);
  assert.equal(out.hookEventName, "UserPromptSubmit");
  const ctx = out.additionalContext ?? "";
  assert.match(ctx, /subagent reviews the finished implementation against the plan/);
  assert.match(ctx, /independent tasks in parallel subagents/);
  assert.match(ctx, /Skip both when a viber skill/);
}

// --- cases ------------------------------------------------------------

test("plan mode with no planner in the transcript -> additionalContext carries both rules", () => {
  withTempDir("p2p2-plan-hints-", (dir) => {
    const f = writeTranscript(dir, [permissionMode("plan")]);
    assertHint(runPayload({ permission_mode: "plan", transcript_path: f }));
  });
});

test("default permission mode -> nothing printed (the hint is for plan mode only)", () => {
  withTempDir("p2p2-plan-hints-", (dir) => {
    const f = writeTranscript(dir, []);
    assert.equal(runPayload({ permission_mode: "default", transcript_path: f }), "");
  });
});

test("a payload with no permission_mode key -> nothing printed", () => {
  withTempDir("p2p2-plan-hints-", (dir) => {
    const f = writeTranscript(dir, []);
    assert.equal(runPayload({ transcript_path: f }), "");
  });
});

test("empty stdin -> exit 0, nothing printed (fail-open)", () => {
  assert.equal(run(""), "");
});

test("a planner Skill tool_use in the current episode -> nothing printed (the viber planner covers both rules)", () => {
  withTempDir("p2p2-plan-hints-", (dir) => {
    const f = writeTranscript(dir, [permissionMode("plan"), skillUse()]);
    assert.equal(runPayload({ permission_mode: "plan", transcript_path: f }), "");
    const bare = writeTranscript(dir, [skillUse("planner")]);
    assert.equal(runPayload({ permission_mode: "plan", transcript_path: bare }), "");
  });
});

test("a planner Skill before a later non-plan permission mode -> the hint fires again (an earlier episode does not silence a new plain plan)", () => {
  withTempDir("p2p2-plan-hints-", (dir) => {
    const f = writeTranscript(dir, [skillUse(), permissionMode("default"), permissionMode("plan")]);
    assertHint(runPayload({ permission_mode: "plan", transcript_path: f }));
  });
});

test("plan mode with a transcript that does not exist -> the hint still fires (a missing transcript counts as no planner)", () => {
  withTempDir("p2p2-plan-hints-", (dir) => {
    assertHint(runPayload({ permission_mode: "plan", transcript_path: path.join(dir, "gone.jsonl") }));
    assertHint(runPayload({ permission_mode: "plan" }));
  });
});
