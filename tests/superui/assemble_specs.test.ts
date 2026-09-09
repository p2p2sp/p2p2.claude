/*
 * assemble_specs.test.ts - proves assemble_specs.ts's
 * `assemble_specs.ts SPECS_DIR OUTPUT_MD` contract: `SPECS_OK entries=<N> ->
 * <OUTPUT_MD>` on stdout; one `warning: <file> body carried an h1 heading,
 * shifted to h3` stderr line per offending spec; an empty SPECS_DIR yields
 * the documented "None catalogued." stub at exit 0; exit 1 on an unreadable
 * dir, an unreadable spec, and an unwritable output; exit 2 on usage errors.
 *
 * assemble_specs.ts carries no importable symbols beyond its CLI (unlike
 * section-model.ts/inventory-format.ts), so every case here drives it as a
 * real subprocess via runScript, never imported.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/assemble_specs.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { canDenyRead, denyRead, restoreRead } from "../harness/perms.ts";

const SUT = path.resolve(import.meta.dirname, "../../superui/scripts/assemble_specs.ts");

function run(args: string[], cwd?: string): RunResult {
  return runScript(SUT, args, { cwd });
}

function writeSpecs(dir: string, files: Record<string, string>): string {
  const specsDir = path.join(dir, "specs");
  fs.mkdirSync(specsDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(specsDir, name), content);
  }
  return specsDir;
}

// ---------------------------------------------------------------------------
// stdout marker line + assembled content
// ---------------------------------------------------------------------------

test("SPECS_OK entries=<N> -> <OUTPUT_MD> on stdout, one ## <slug> subsection per spec (sorted)", () => {
  withTempDir("p2p2-assemble-specs-ok-", (dir) => {
    const specsDir = writeSpecs(dir, {
      "button.md": "Body for button.\n",
      "alert.md": "Body for alert.\n",
    });
    const outputMd = path.join(dir, "DESIGN.components.md");
    const result = run([specsDir, outputMd]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `SPECS_OK entries=2 -> ${outputMd}\n`);

    const written = fs.readFileSync(outputMd, "utf-8");
    assert.match(written, /^# Specs$/m);
    const alertIdx = written.indexOf("## alert");
    const buttonIdx = written.indexOf("## button");
    assert.ok(alertIdx >= 0 && buttonIdx >= 0 && alertIdx < buttonIdx, "slugs should be sorted alphabetically");
    assert.match(written, /Body for button\./);
    assert.match(written, /Body for alert\./);
  });
});

test("the title is derived from SPECS_DIR's basename (Titlecased)", () => {
  withTempDir("p2p2-assemble-specs-title-", (dir) => {
    const patternsDir = path.join(dir, "patterns");
    fs.mkdirSync(patternsDir, { recursive: true });
    fs.writeFileSync(path.join(patternsDir, "modal.md"), "Body.\n");
    const outputMd = path.join(dir, "DESIGN.patterns.md");
    const result = run([patternsDir, outputMd]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(fs.readFileSync(outputMd, "utf-8"), /^# Patterns$/m);
  });
});

// ---------------------------------------------------------------------------
// h1-shift warning
// ---------------------------------------------------------------------------

test("a spec body opening with an h1 heading is shifted to h3 and warns once on stderr", () => {
  withTempDir("p2p2-assemble-specs-h1-", (dir) => {
    const specsDir = writeSpecs(dir, {
      "button.md": "# Button\n\nSome body text.\n",
      "alert.md": "## Alert\n\nAlready h2, no warning.\n",
    });
    const outputMd = path.join(dir, "OUTPUT.md");
    const result = run([specsDir, outputMd]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const stderrLines = result.stderr.split("\n").filter((l) => l.length > 0);
    assert.equal(stderrLines.length, 1, `expected exactly one warning, got:\n${result.stderr}`);
    assert.match(result.stderr, /warning: .*button\.md body carried an h1 heading, shifted to h3/);

    const written = fs.readFileSync(outputMd, "utf-8");
    assert.match(written, /### Button/, "the body's own h1 should shift to h3");
    assert.doesNotMatch(written, /^# Button$/m, "the shifted heading must not remain an h1");
  });
});

test("a heading inside a fenced code block is left unmodified and does not warn", () => {
  withTempDir("p2p2-assemble-specs-fenced-", (dir) => {
    const specsDir = writeSpecs(dir, {
      "snippet.md": "Body text.\n\n```\n# not a real heading\n```\n",
    });
    const outputMd = path.join(dir, "OUTPUT.md");
    const result = run([specsDir, outputMd]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stderr, "");
    const written = fs.readFileSync(outputMd, "utf-8");
    assert.match(written, /```\n# not a real heading\n```/);
  });
});

// ---------------------------------------------------------------------------
// empty SPECS_DIR stub
// ---------------------------------------------------------------------------

test("an empty SPECS_DIR yields the documented None catalogued. stub and still exits 0", () => {
  withTempDir("p2p2-assemble-specs-empty-", (dir) => {
    const specsDir = path.join(dir, "components");
    fs.mkdirSync(specsDir, { recursive: true });
    const outputMd = path.join(dir, "OUTPUT.md");
    const result = run([specsDir, outputMd]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `SPECS_OK entries=0 -> ${outputMd}\n`);
    const written = fs.readFileSync(outputMd, "utf-8");
    assert.match(written, /^# Components$/m);
    assert.match(written, /None catalogued\./);
    assert.doesNotMatch(written, /^## /m);
  });
});

// ---------------------------------------------------------------------------
// exit 1: unreadable dir / unreadable spec / unwritable output
// ---------------------------------------------------------------------------

test("a non-existent SPECS_DIR exits 1 with a stderr message", () => {
  withTempDir("p2p2-assemble-specs-nodir-", (dir) => {
    const result = run([path.join(dir, "does-not-exist"), path.join(dir, "OUTPUT.md")]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /error: cannot read specs dir/);
  });
});

test("a SPECS_DIR that is actually a file exits 1", () => {
  withTempDir("p2p2-assemble-specs-notdir-", (dir) => {
    const notADir = path.join(dir, "not-a-dir");
    fs.writeFileSync(notADir, "x");
    const result = run([notADir, path.join(dir, "OUTPUT.md")]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /is not a directory/);
  });
});

test(
  "an unreadable spec file exits 1 naming the file",
  { skip: canDenyRead() ? false : "this machine cannot deny its own account read access" },
  () => {
    withTempDir("p2p2-assemble-specs-unreadable-", (dir) => {
      const specsDir = writeSpecs(dir, { "locked.md": "secret body\n" });
      const lockedPath = path.join(specsDir, "locked.md");
      assert.ok(denyRead(lockedPath), "the deny must hold, or this case proves nothing");
      try {
        const result = run([specsDir, path.join(dir, "OUTPUT.md")]);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /error: cannot read spec/);
      } finally {
        restoreRead(lockedPath);
      }
    });
  },
);

test("an OUTPUT_MD whose parent directory does not exist exits 1", () => {
  withTempDir("p2p2-assemble-specs-unwritable-", (dir) => {
    const specsDir = writeSpecs(dir, { "button.md": "Body.\n" });
    const outputMd = path.join(dir, "no-such-dir", "OUTPUT.md");
    const result = run([specsDir, outputMd]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /error: cannot write/);
  });
});

// ---------------------------------------------------------------------------
// exit 2: usage errors
// ---------------------------------------------------------------------------

test("wrong argument count prints usage + an error line on stderr and exits 2", () => {
  withTempDir("p2p2-assemble-specs-usage-", (dir) => {
    const result = run([dir]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^usage: assemble_specs\.ts /);
    assert.match(result.stderr, /expected 2 arguments/);
    assert.equal(result.stdout, "");
  });
});

test("-h prints help text on stdout and exits 0", () => {
  const result = run(["-h"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^usage: assemble_specs\.ts /);
});
