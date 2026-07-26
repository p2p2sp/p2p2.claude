/*
 * session-start.test.ts - proves session-start.sh's manifest-injection
 * contract (force-inject hooks/content/manifest.md verbatim as
 * additionalContext, plus a user-facing systemMessage banner carrying the
 * plugin version), including its fail-open behaviour when the manifest
 * cannot be found.
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

/** Builds a fake plugin root: `<dir>/hooks/content/manifest.md` with the
 *  given content, returning the plugin-root path to hand the script as
 *  CLAUDE_PLUGIN_ROOT. */
function fakePluginRoot(dir: string, manifest: string): string {
  const contentDir = path.join(dir, "hooks", "content");
  fs.mkdirSync(contentDir, { recursive: true });
  fs.writeFileSync(path.join(contentDir, "manifest.md"), manifest);
  return dir;
}

/** Copies session-start.sh into a fresh `<dir>/hooks/scripts/` with NO
 *  sibling `hooks/content/manifest.md` - this is required to actually
 *  reproduce "manifest unreadable": the real script also falls back to
 *  `$SCRIPT_DIR/../content/manifest.md` when CLAUDE_PLUGIN_ROOT's manifest is
 *  missing, and $SCRIPT_DIR is the SUT's own real location (which DOES carry
 *  a real manifest.md) - so merely pointing CLAUDE_PLUGIN_ROOT elsewhere is
 *  not sufficient to neutralise both lookup paths at once. */
function isolatedScript(dir: string): string {
  const scriptsDir = path.join(dir, "hooks", "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });
  const dest = path.join(scriptsDir, "session-start.sh");
  fs.copyFileSync(SUT, dest);
  fs.chmodSync(dest, 0o755);
  return dest;
}

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

test("manifest present -> additionalContext equals the manifest bytes verbatim, systemMessage carries the version", () => {
  withTempDir("p2p2-session-start-", (dir) => {
    // No trailing newline in the fixture: the script reads the file via a
    // `$(cat ...)` command substitution, which - per bash semantics - strips
    // ALL trailing newlines from the captured value. A dedicated test below
    // asserts that stripping explicitly; this fixture stays newline-free so
    // "verbatim" can be asserted with plain equality here.
    const manifest = "# superdev manifest\nsome instructions here.";
    const root = fakePluginRoot(path.join(dir, "myplugin-1.2.3"), manifest);
    const json = run(SUT, JSON.stringify({ source: "startup" }), { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.hookEventName, "SessionStart");
    assert.equal(json.hookSpecificOutput.additionalContext, manifest);
    assert.equal(json.systemMessage, `superdev loaded ${path.basename(root)}`);
  });
});

test("a manifest file's trailing newline(s) are stripped from additionalContext ($(cat ...) command-substitution semantics)", () => {
  withTempDir("p2p2-session-start-", (dir) => {
    const root = fakePluginRoot(path.join(dir, "plugin"), "manifest body\n\n\n");
    const json = run(SUT, JSON.stringify({ source: "startup" }), { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.additionalContext, "manifest body");
  });
});

test("manifest unreadable (no manifest anywhere the script looks) -> additionalContext absent, systemMessage still present, exit 0", () => {
  withTempDir("p2p2-session-start-", (dir) => {
    const script = isolatedScript(path.join(dir, "isolated"));
    const emptyRoot = path.join(dir, "empty-root");
    fs.mkdirSync(emptyRoot, { recursive: true });
    const json = run(script, JSON.stringify({ source: "startup" }), { CLAUDE_PLUGIN_ROOT: emptyRoot });
    assert.equal(json.hookSpecificOutput.hookEventName, "SessionStart");
    assert.equal(json.hookSpecificOutput.additionalContext, undefined);
    assert.equal(json.systemMessage, `superdev loaded ${path.basename(emptyRoot)}`);
  });
});

test('source: "resume" on stdin -> the script itself does not filter by source (matcher-level exclusion happens in hooks.json), so it still injects normally', () => {
  withTempDir("p2p2-session-start-", (dir) => {
    const manifest = "manifest body";
    const root = fakePluginRoot(path.join(dir, "plugin"), manifest);
    const json = run(SUT, JSON.stringify({ source: "resume" }), { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.additionalContext, manifest);
    assert.ok(json.systemMessage.length > 0);
  });
});

test("malformed stdin JSON is drained and ignored - the script never parses stdin as JSON", () => {
  withTempDir("p2p2-session-start-", (dir) => {
    const manifest = "manifest body";
    const root = fakePluginRoot(path.join(dir, "plugin"), manifest);
    const json = run(SUT, "not json { at all", { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.additionalContext, manifest);
  });
});

test("empty stdin (closed immediately) -> still emits the manifest normally, exit 0", () => {
  withTempDir("p2p2-session-start-", (dir) => {
    const manifest = "manifest body";
    const root = fakePluginRoot(path.join(dir, "plugin"), manifest);
    const json = run(SUT, "", { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.additionalContext, manifest);
    assert.ok(json.systemMessage.length > 0);
  });
});

test("no CLAUDE_PLUGIN_ROOT set -> falls back to the real manifest via SCRIPT_DIR, version banner reads 'dev'", () => {
  const result = runScript(SUT, [], { shell: "bash", input: JSON.stringify({ source: "startup" }) });
  assert.equal(result.status, 0);
  const json = JSON.parse(result.stdout);
  assert.equal(json.systemMessage, "superdev loaded dev");
  assert.ok(json.hookSpecificOutput.additionalContext.length > 0);
});

test("a manifest containing characters that must survive JSON encoding round-trips exactly", () => {
  withTempDir("p2p2-session-start-", (dir) => {
    const manifest = 'line with a "quote", a \\backslash\\, a café, and:\nsecond line after a real newline';
    const root = fakePluginRoot(path.join(dir, "plugin"), manifest);
    const json = run(SUT, JSON.stringify({ source: "startup" }), { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.additionalContext, manifest);
  });
});
