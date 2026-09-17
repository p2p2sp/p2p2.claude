/*
 * orphan-tags.test.ts - a static sweep proving no tracked file carries an
 * ORPHAN closing tag: a line that is nothing but `</name>` while no `<name`
 * opener exists anywhere in that same file.
 *
 * Why this file exists: writer agents have repeatedly appended a bare
 * `</content>` as the last line of files they created - the closing tag of
 * their own `Write` call leaking into the value instead of terminating it.
 * The earliest occurrence (`19e671a`) hit all three files of a single run,
 * including a two-line notes file with no template and no injected input, so
 * the tag is a write-call artifact, not content copied from anywhere. One such
 * tag reached `superdev/references/changelog-entry-format.md` and shipped in
 * release 0.46.1, where it sat inside the very document an agent reads as its
 * format authority. The agent prompts carry a read-back guard against it, but
 * a guard operates on what the model plans to write, and this artifact appears
 * when the call is emitted - so this sweep is the deterministic half.
 *
 * Scope: every tracked file except `docs/` and `.docs/` (dev-time working dirs
 * and never-shipped notes, which keep historical run records verbatim) and
 * except binaries. That covers all six plugins' shipped sources plus the repo's
 * own `CLAUDE.md` cascade and `.claude/rules/`, the two surfaces the memory and
 * rules writers contaminated.
 *
 * Orphan, not "any closing tag on its own line": `superbiz`'s HTML report
 * template and `superdev/hooks/content/manifest.md`'s `</superdev:manifest>`
 * are legitimate and each has its opener in the same file.
 *
 * The detector is a pure function (path + text in, violation strings out) with
 * self-checks proving it fires on synthetic bad samples and stays quiet on the
 * legitimate precedents, so its green run on this tree is meaningful rather
 * than vacuous.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/orphan-tags.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { runScript } from "./harness/run.ts";

/** A line holding a closing tag and nothing else (leading/trailing blanks aside). */
const CLOSING_TAG_LINE = /^[ \t]*<\/([A-Za-z][A-Za-z0-9_.:-]*)>[ \t]*$/;

/** Extensions read as text; anything else is skipped as a binary. */
const BINARY_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2"];

// ---------------------------------------------------------------------------
// Detector - pure over (path, text), so the self-checks below need no
// filesystem and no git.
// ---------------------------------------------------------------------------

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

/** True when `content` opens a `<name ...>` tag anywhere: `<name` followed by a
 *  tag terminator (whitespace, `/` or `>`), so an attribute-bearing opener
 *  (`<html lang="en">`) counts and the closing tag itself never does. */
function hasOpeningTag(content: string, name: string): boolean {
  return new RegExp(`<${escapeRegExp(name)}(?=[\\s/>])`).test(content);
}

/** Every self-standing closing tag whose opener is absent from the same file. */
function orphanTagViolations(filePath: string, content: string): string[] {
  const violations: string[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = CLOSING_TAG_LINE.exec(lines[i]);
    if (match === null) continue;
    const name = match[1];
    if (hasOpeningTag(content, name)) continue;
    violations.push(
      `${filePath}:${i + 1}: orphan closing tag </${name}> - no <${name}> opener in this file; ` +
        `a write-call artifact, delete the line`,
    );
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Self-checks
// ---------------------------------------------------------------------------

test("self-check: orphanTagViolations fires on a trailing bare </content> (the artifact this file exists for)", () => {
  const violations = orphanTagViolations("a.md", "# Title\n\nsome prose\n</content>\n");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /a\.md:4: orphan closing tag <\/content>/);
});

test("self-check: orphanTagViolations fires on a two-line notes file that is content plus the tag (the 19e671a shape)", () => {
  const violations = orphanTagViolations("task-04-notes.md", "no deviations\n</content>\n");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /task-04-notes\.md:2:/);
});

test("self-check: orphanTagViolations fires on an indented </parameter> in the middle of a file", () => {
  const violations = orphanTagViolations("b.md", "line one\n  </parameter>\nline three\n");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /b\.md:2: orphan closing tag <\/parameter>/);
});

test("self-check: orphanTagViolations stays quiet on balanced HTML, including an attribute-bearing opener", () => {
  const html = '<html lang="en">\n<head>\n<style>\nbody { margin: 0 }\n</style>\n</head>\n</html>\n';
  assert.deepEqual(orphanTagViolations("report-template.html", html), []);
});

test("self-check: orphanTagViolations stays quiet on a namespaced tag whose opener is in the same file (the manifest precedent)", () => {
  const manifest = "<superdev:manifest>\n\nrouting text\n\n</superdev:manifest>\n";
  assert.deepEqual(orphanTagViolations("manifest.md", manifest), []);
});

test("self-check: orphanTagViolations stays quiet on a closing tag named inline in prose (the agent guard's own wording)", () => {
  const guard =
    "- A file you write ends on its own last line of content: a trailing bare closing tag\n" +
    "  (`</content>`, `</parameter>`) is a write-call artifact, never authored text.\n";
  assert.deepEqual(orphanTagViolations("agent.md", guard), []);
});

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

function repoRoot(): string {
  const result = runScript("git", ["rev-parse", "--show-toplevel"]);
  if (result.status !== 0) throw new Error(`git rev-parse --show-toplevel failed: ${result.stderr}`);
  return result.stdout.trim();
}

/** `-z` because a path carrying a non-ASCII character (the repo has one under
 *  `docs/`) comes back C-quoted and octal-escaped otherwise, which both breaks
 *  the read and slips past a `docs/` prefix filter behind its opening quote. */
function sweptFiles(root: string): string[] {
  const result = runScript("git", ["ls-files", "-z"], { cwd: root });
  if (result.status !== 0) throw new Error(`git ls-files failed: ${result.stderr}`);
  return result.stdout
    .split("\0")
    .filter((line) => line.length > 0)
    .filter((p) => !p.startsWith("docs/") && !p.startsWith(".docs/"))
    .filter((p) => !BINARY_EXTENSIONS.some((ext) => p.toLowerCase().endsWith(ext)));
}

test("no tracked file outside docs/ carries an orphan closing tag left behind by a write call", () => {
  const root = repoRoot();
  const violations: string[] = [];
  for (const repoRelativePath of sweptFiles(root)) {
    const content = fs.readFileSync(`${root}/${repoRelativePath}`, "utf-8");
    violations.push(...orphanTagViolations(repoRelativePath, content));
  }
  assert.equal(violations.length, 0, `orphan closing tags:\n${violations.join("\n")}`);
});
