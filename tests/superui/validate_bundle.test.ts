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
import { checkEffectLines, checkScreenRefs } from "../../superui/scripts/validate_bundle.ts";

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

// ---------------------------------------------------------------------------
// checkEffectLines
// ---------------------------------------------------------------------------

test("checkEffectLines reports zero findings when DESIGN.components.md is absent", () => {
  const dir = makeBundle({
    "DESIGN.patterns.md": "# Patterns\n\nNone catalogued.\n",
  });
  try {
    assert.deepEqual(checkEffectLines(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkEffectLines reports one missing-effect-line finding per absent property", () => {
  const dir = makeBundle({
    "DESIGN.components.md": "# Components\n\n## card\n\nA card with no effect lines at all.\n",
  });
  try {
    const findings = checkEffectLines(dir);
    assert.equal(findings.length, 3);
    for (const f of findings) assert.equal(f.category, "missing-effect-line");
    assert.ok(findings.some((f) => /border/.test(f.detail)));
    assert.ok(findings.some((f) => /shadow/.test(f.detail)));
    assert.ok(findings.some((f) => /gradient/.test(f.detail)));
    assert.ok(findings.every((f) => /card/.test(f.detail)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkEffectLines is clean when a block carries all three effect lines, including a 'none' value", () => {
  const dir = makeBundle({
    "DESIGN.components.md":
      "# Components\n\n## card\n\nborder: 1px solid #eee\nshadow: none\ngradient: linear-gradient(180deg, #fff 0%, #f7f8fa 100%)\n",
  });
  try {
    assert.deepEqual(checkEffectLines(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkEffectLines is clean on the assemble_specs.ts 'None catalogued.' stub (no ## wrapper)", () => {
  const dir = makeBundle({
    "DESIGN.components.md": "# Components\n\nNone catalogued.\n",
  });
  try {
    assert.deepEqual(checkEffectLines(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkEffectLines does not accept border-radius: as satisfying the border property", () => {
  const dir = makeBundle({
    "DESIGN.components.md":
      "# Components\n\n## card\n\nborder-radius: 8px\nshadow: none\ngradient: none\n",
  });
  try {
    const findings = checkEffectLines(dir);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].category, "missing-effect-line");
    assert.match(findings[0].detail, /border/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkEffectLines accepts a bold-labelled or table-cell effect line", () => {
  const dir = makeBundle({
    "DESIGN.components.md":
      "# Components\n\n## card\n\n**border:** none\n| shadow: none |\ngradient: none\n",
  });
  try {
    assert.deepEqual(checkEffectLines(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
