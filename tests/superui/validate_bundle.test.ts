/*
 * validate_bundle.test.ts - closes the canonical-screen gate's fail-open
 * hole: CANONICAL_LINE_RE must parse a `canonical:` line regardless of
 * leading markdown decoration (list marker, indentation, blockquote/heading
 * marker, bold emphasis, capitalised label), and checkScreenRefs must not
 * report CLEAN when a satellite carries real spec content but the run cites
 * zero canonical screens.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is
 * run directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/validate_bundle.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { canonicalRefs } from "../../superui/scripts/inventory-format.ts";
import { checkScreenRefs } from "../../superui/scripts/validate_bundle.ts";

// ---------------------------------------------------------------------------
// canonicalRefs - decorated canonical: lines
// ---------------------------------------------------------------------------

test("canonicalRefs captures a bare canonical: line", () => {
  assert.deepEqual(canonicalRefs("canonical: hero.png"), ["hero.png"]);
});

test("canonicalRefs captures a list-marker-prefixed canonical: line", () => {
  assert.deepEqual(canonicalRefs("- canonical: hero.png"), ["hero.png"]);
});

test("canonicalRefs captures an indented canonical: line", () => {
  assert.deepEqual(canonicalRefs("  canonical: hero.png"), ["hero.png"]);
});

test("canonicalRefs captures a bold-emphasised canonical: line", () => {
  assert.deepEqual(canonicalRefs("**canonical:** hero.png"), ["hero.png"]);
});

test("canonicalRefs captures a capitalised Canonical: line", () => {
  assert.deepEqual(canonicalRefs("Canonical: hero.png"), ["hero.png"]);
});

// ---------------------------------------------------------------------------
// checkScreenRefs - fail-open backstop
// ---------------------------------------------------------------------------

/** Builds a temp bundle dir; returns its path. Caller is responsible for cleanup via rmSync. */
function makeBundle(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "validate-bundle-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content, "utf-8");
  }
  return dir;
}

test("checkScreenRefs reports missing-screen when a satellite carries spec content but cites no canonical screen", () => {
  const dir = makeBundle({
    "DESIGN.components.md": "# Components\n\n## button\n\nA button spec with no canonical line at all.\n",
    "DESIGN.patterns.md": "# Patterns\n\nNone catalogued.\n",
  });
  try {
    const findings = checkScreenRefs(dir);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].category, "missing-screen");
    assert.match(findings[0].detail, /DESIGN\.components\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// checkScreenRefs - must-not-regress negatives
// ---------------------------------------------------------------------------

test("checkScreenRefs still resolves a canonical filename containing spaces", () => {
  const dir = makeBundle({
    "DESIGN.components.md": "# Components\n\n## button\n\ncanonical: My Screenshot.png\n",
    "screens/My Screenshot.png": "",
  });
  try {
    assert.deepEqual(checkScreenRefs(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkScreenRefs stays clean when the whole run has zero entries and zero refs", () => {
  const dir = makeBundle({
    "DESIGN.components.md": "# Components\n\nNone catalogued.\n",
    "DESIGN.patterns.md": "# Patterns\n\nNone catalogued.\n",
  });
  try {
    assert.deepEqual(checkScreenRefs(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkScreenRefs reports CLEAN (no findings) when every citation is satisfied", () => {
  const dir = makeBundle({
    "DESIGN.components.md": "# Components\n\n## button\n\ncanonical: hero.png\n",
    "DESIGN.patterns.md": "# Patterns\n\nNone catalogued.\n",
    "screens/hero.png": "",
  });
  try {
    assert.deepEqual(checkScreenRefs(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
