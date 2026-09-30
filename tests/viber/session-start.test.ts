/*
 * session-start.test.ts - proves viber/hooks/scripts/session-start.sh's
 * injection contract: hooks/content/manifest.md goes into the session verbatim
 * as additionalContext, with a user-facing systemMessage banner carrying the
 * plugin version, and the hook falls open to the banner alone whenever the
 * manifest is empty or cannot be found.
 *
 * The empty case is not an edge here: viber ships the manifest file empty, so
 * "banner only, nothing injected" is the plugin's shipped state until the file
 * carries content. The case that reads the REAL manifest therefore derives its
 * expectation from the file rather than hard-coding either state - filling the
 * manifest in must not turn this suite red.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/session-start.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/hooks/scripts/session-start.sh");
const SHIPPED_MANIFEST = path.resolve(import.meta.dirname, "../../viber/hooks/content/manifest.md");

/** Builds a fake plugin root: `<dir>/hooks/content/manifest.md` with the given
 *  content, returning the plugin-root path to hand the script as
 *  CLAUDE_PLUGIN_ROOT. */
function fakePluginRoot(dir: string, manifest: string): string {
  const contentDir = path.join(dir, "hooks", "content");
  fs.mkdirSync(contentDir, { recursive: true });
  fs.writeFileSync(path.join(contentDir, "manifest.md"), manifest);
  return dir;
}

/** Copies session-start.sh into a fresh `<dir>/hooks/scripts/` with NO sibling
 *  `hooks/content/manifest.md` - required to actually reproduce "manifest
 *  unreadable": the script also falls back to
 *  `$SCRIPT_DIR/../content/manifest.md`, and $SCRIPT_DIR is the SUT's own real
 *  location, so pointing CLAUDE_PLUGIN_ROOT elsewhere does not neutralise both
 *  lookup paths at once. */
function isolatedScript(dir: string): string {
  const scriptsDir = path.join(dir, "hooks", "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });
  const dest = path.join(scriptsDir, "session-start.sh");
  fs.copyFileSync(SUT, dest);
  fs.chmodSync(dest, 0o755);
  return dest;
}

/** hooks.json always invokes the script as `bash "session-start.sh"`, never
 *  bare, so the harness invokes it the same way. */
async function run(script: string, input: string, env: Record<string, string> = {}) {
  const result = await runScript(script, [], { shell: "bash", input, env });
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}; stderr: ${result.stderr}`);
  let json: any;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    throw new Error(`expected parseable JSON stdout, got: ${result.stdout}`);
  }
  return json;
}

test("manifest present -> additionalContext equals the manifest bytes verbatim, systemMessage carries the version", async () => {
  await withTempDir("p2p2-viber-session-start-", async (dir) => {
    // No trailing newline in the fixture: the script reads the file through a
    // `$(cat ...)` command substitution, which strips ALL trailing newlines
    // from the captured value (asserted on its own below), so "verbatim" can be
    // compared with plain equality here.
    const manifest = "# viber manifest\nsome instructions here.";
    const root = fakePluginRoot(path.join(dir, "viber-1.2.3"), manifest);
    const json = await run(SUT, JSON.stringify({ source: "startup" }), { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.hookEventName, "SessionStart");
    assert.equal(json.hookSpecificOutput.additionalContext, manifest);
    assert.equal(json.systemMessage, `viber loaded ${path.basename(root)}`);
  });
});

test("an EMPTY manifest injects nothing - the banner fires alone, so a file not yet written leaks no half-content into the session", async () => {
  await withTempDir("p2p2-viber-session-start-", async (dir) => {
    const root = fakePluginRoot(path.join(dir, "plugin"), "");
    const json = await run(SUT, JSON.stringify({ source: "startup" }), { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.hookEventName, "SessionStart");
    assert.equal(json.hookSpecificOutput.additionalContext, undefined);
    assert.equal(json.systemMessage, "viber loaded plugin");
  });
});

test("a whitespace-only manifest is treated as empty too (the command substitution strips it to nothing)", async () => {
  await withTempDir("p2p2-viber-session-start-", async (dir) => {
    const root = fakePluginRoot(path.join(dir, "plugin"), "\n\n\n");
    const json = await run(SUT, JSON.stringify({ source: "startup" }), { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.additionalContext, undefined);
  });
});

test("a manifest file's trailing newline(s) are stripped from additionalContext ($(cat ...) command-substitution semantics)", async () => {
  await withTempDir("p2p2-viber-session-start-", async (dir) => {
    const root = fakePluginRoot(path.join(dir, "plugin"), "manifest body\n\n\n");
    const json = await run(SUT, JSON.stringify({ source: "startup" }), { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.additionalContext, "manifest body");
  });
});

test("manifest unreadable (none anywhere the script looks) -> additionalContext absent, systemMessage still present, exit 0", async () => {
  await withTempDir("p2p2-viber-session-start-", async (dir) => {
    const script = isolatedScript(path.join(dir, "isolated"));
    const emptyRoot = path.join(dir, "empty-root");
    fs.mkdirSync(emptyRoot, { recursive: true });
    const json = await run(script, JSON.stringify({ source: "startup" }), { CLAUDE_PLUGIN_ROOT: emptyRoot });
    assert.equal(json.hookSpecificOutput.hookEventName, "SessionStart");
    assert.equal(json.hookSpecificOutput.additionalContext, undefined);
    assert.equal(json.systemMessage, `viber loaded ${path.basename(emptyRoot)}`);
  });
});

test('source: "resume" on stdin -> the script itself does not filter by source (the matcher in hooks.json excludes it), so it still injects normally', async () => {
  await withTempDir("p2p2-viber-session-start-", async (dir) => {
    const manifest = "manifest body";
    const root = fakePluginRoot(path.join(dir, "plugin"), manifest);
    const json = await run(SUT, JSON.stringify({ source: "resume" }), { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.additionalContext, manifest);
    assert.ok(json.systemMessage.length > 0);
  });
});

test("malformed stdin JSON is drained and ignored - the script never parses stdin as JSON", async () => {
  await withTempDir("p2p2-viber-session-start-", async (dir) => {
    const manifest = "manifest body";
    const root = fakePluginRoot(path.join(dir, "plugin"), manifest);
    const json = await run(SUT, "not json { at all", { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.additionalContext, manifest);
  });
});

test("empty stdin (closed immediately) -> still emits the manifest normally, exit 0", async () => {
  await withTempDir("p2p2-viber-session-start-", async (dir) => {
    const manifest = "manifest body";
    const root = fakePluginRoot(path.join(dir, "plugin"), manifest);
    const json = await run(SUT, "", { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.additionalContext, manifest);
    assert.ok(json.systemMessage.length > 0);
  });
});

test("no CLAUDE_PLUGIN_ROOT set -> falls back to the SHIPPED manifest via SCRIPT_DIR, version banner reads 'dev'", async () => {
  const result = await runScript(SUT, [], { shell: "bash", input: JSON.stringify({ source: "startup" }) });
  assert.equal(result.status, 0);
  const json = JSON.parse(result.stdout);
  assert.equal(json.systemMessage, "viber loaded dev");
  // Derived from the shipped file, so this case holds both while the manifest
  // is empty (its shipped state today) and once it carries content.
  const shipped = fs.readFileSync(SHIPPED_MANIFEST, "utf-8").replace(/\n+$/, "");
  assert.equal(json.hookSpecificOutput.additionalContext, shipped === "" ? undefined : shipped);
});

test("a manifest containing characters that must survive JSON encoding round-trips exactly", async () => {
  await withTempDir("p2p2-viber-session-start-", async (dir) => {
    const manifest = 'line with a "quote", a \\backslash\\, a café, and:\nsecond line after a real newline';
    const root = fakePluginRoot(path.join(dir, "plugin"), manifest);
    const json = await run(SUT, JSON.stringify({ source: "startup" }), { CLAUDE_PLUGIN_ROOT: root });
    assert.equal(json.hookSpecificOutput.additionalContext, manifest);
  });
});
