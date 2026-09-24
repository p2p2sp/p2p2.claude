/*
 * session-start.test.ts - proves session-start.sh's contract: a constant
 * obsolescence banner in `systemMessage` and NO context injection at all
 * (superdev ships no manifest any more; `additionalContext` must never be
 * emitted), whatever the hook payload on stdin looks like.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/session-start.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/hooks/scripts/session-start.sh");
const BANNER = "!!! superdev is obsolete - use viber instead !!!";

// session-start.sh ships mode 100644 (git ls-files) - hooks.json always
// invokes it as `bash "session-start.sh"`, never bare, so the portability
// sweep does not require an exec bit here; the harness must invoke it the
// same way.
function run(script: string, input: string, env: Record<string, string> = {}) {
  const result = runScript(script, [], { shell: "bash", input, env });
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}; stderr: ${result.stderr}`);
  let json: any;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    throw new Error(`expected parseable JSON stdout, got: ${result.stdout}`);
  }
  return json;
}

test("startup payload -> systemMessage is the obsolescence banner and additionalContext is absent", () => {
  const json = run(SUT, JSON.stringify({ source: "startup" }));
  assert.equal(json.systemMessage, BANNER);
  assert.equal(json.hookSpecificOutput.hookEventName, "SessionStart");
  assert.equal(json.hookSpecificOutput.additionalContext, undefined);
});

test("a leftover hooks/content/manifest.md beside the script is NOT injected (the injection path is gone, not merely fail-open)", () => {
  withTempDir("p2p2-session-start-", (dir) => {
    const root = path.join(dir, "myplugin-1.2.3");
    const contentDir = path.join(root, "hooks", "content");
    const scriptsDir = path.join(root, "hooks", "scripts");
    fs.mkdirSync(contentDir, { recursive: true });
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.writeFileSync(path.join(contentDir, "manifest.md"), "# stale manifest\nmust never be injected.");
    const dest = path.join(scriptsDir, "session-start.sh");
    fs.copyFileSync(SUT, dest);
    fs.chmodSync(dest, 0o755);
    const json = run(dest, JSON.stringify({ source: "startup" }), { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.additionalContext, undefined);
    assert.equal(json.systemMessage, BANNER);
  });
});

test("the banner carries no plugin version - CLAUDE_PLUGIN_ROOT's basename never reaches the output", () => {
  withTempDir("p2p2-session-start-", (dir) => {
    const root = path.join(dir, "superdev-9.9.9");
    fs.mkdirSync(root, { recursive: true });
    const json = run(SUT, JSON.stringify({ source: "startup" }), { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.systemMessage, BANNER);
    assert.ok(!json.systemMessage.includes("9.9.9"));
  });
});

test('source: "resume" on stdin -> the script itself does not filter by source (matcher-level exclusion happens in hooks.json), output is unchanged', () => {
  const json = run(SUT, JSON.stringify({ source: "resume" }));
  assert.equal(json.systemMessage, BANNER);
  assert.equal(json.hookSpecificOutput.additionalContext, undefined);
});

test("malformed stdin JSON is drained and ignored - the script never parses stdin as JSON", () => {
  const json = run(SUT, "not json { at all");
  assert.equal(json.systemMessage, BANNER);
});

test("empty stdin (closed immediately) -> still emits the banner, exit 0", () => {
  const json = run(SUT, "");
  assert.equal(json.systemMessage, BANNER);
  assert.equal(json.hookSpecificOutput.hookEventName, "SessionStart");
});

test("no CLAUDE_PLUGIN_ROOT set -> same constant output, exit 0", () => {
  const result = runScript(SUT, [], { shell: "bash", input: JSON.stringify({ source: "startup" }) });
  assert.equal(result.status, 0);
  const json = JSON.parse(result.stdout);
  assert.equal(json.systemMessage, BANNER);
  assert.equal(json.hookSpecificOutput.additionalContext, undefined);
});
