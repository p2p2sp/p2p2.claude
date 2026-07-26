/*
 * render_design_md.test.ts - proves the hand-rolled markdown tables in
 * renderSubsectionBody("3.2", ...) (semantic colors) and renderTextStyles
 * (3.5 type scale) never let a free-text value break row arity: a `usedFor`
 * carrying `|` or a newline must render as exactly one table cell, and the
 * Notes column must render on its own merits (a measured note) independent
 * of whether any row in the table is proposed. Also proves the 3.10 dark
 * mode summary (renderSubsectionBody("3.10", ...)) marks a proposed dark
 * value distinguishably from a measured one, honouring the same
 * measured|proposed provenance vocabulary the table renderers use.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is
 * run directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/render_design_md.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { renderSubsectionBody, renderTextStyles } from "../../superui/scripts/render_design_md.ts";
import type { Registry, TokenEntry, TextStyleEntry } from "../../superui/scripts/render_design_md.ts";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function mkToken(overrides: Partial<TokenEntry> & { section: string }): TokenEntry {
  return {
    value: "#0057FF",
    dark: null,
    type: "color",
    primitive: null,
    usedFor: null,
    evidence: null,
    notes: null,
    ...overrides,
  };
}

function mkRegistry(tokens: Record<string, TokenEntry>): Registry {
  return {
    tokens,
    surfaceOrder: [],
    accentUsage: [],
    textStyles: [],
    unknowns: [],
  };
}

function mkTextStyle(overrides: Partial<TextStyleEntry> & { name: string; usedFor: string }): TextStyleEntry {
  return {
    family: "Inter",
    size: "16px",
    weight: 400,
    lineHeight: 1.5,
    letterSpacing: "0",
    ...overrides,
  };
}

/** Table lines only (drop prose/blank lines around the table). */
function tableLines(md: string): string[] {
  return md.split("\n").filter((l) => l.startsWith("|"));
}

/** Split one markdown table row into its cells, respecting the `cellSafe` escaping (`\|`). */
function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|\s*$/, "");
  return trimmed.split(/(?<!\\)\|/).map((c) => c.trim());
}

// ---------------------------------------------------------------------------
// 3.2 semantic colors - usedFor escaping
// ---------------------------------------------------------------------------

test("a 3.2 token's usedFor containing a pipe or newline renders as exactly one table cell", () => {
  const registry = mkRegistry({
    "color.brand.primary": mkToken({
      section: "3.2",
      primitive: "primitive.blue.500",
      usedFor: "page background | card surfaces\nand modal overlays",
    }),
  });

  const output = renderSubsectionBody("3.2", registry);
  const lines = tableLines(output);
  const headerCells = splitRow(lines[0]);
  // header, separator, exactly one data row - a raw newline must not fork a second row
  assert.equal(lines.length, 3, `expected exactly one data row, got table lines:\n${lines.join("\n")}`);
  const dataCells = splitRow(lines[2]);
  assert.equal(dataCells.length, headerCells.length, "data row cell count must match header cell count");
});

// ---------------------------------------------------------------------------
// 3.2 semantic colors - Notes column decoupled from Source/hasProposed
// ---------------------------------------------------------------------------

test("a 3.2 token's measured notes render even when no 3.2 row is proposed", () => {
  const registry = mkRegistry({
    "color.brand.primary": mkToken({
      section: "3.2",
      primitive: "primitive.blue.500",
      usedFor: "page background",
      notes: "sampled from the header on login.png",
    }),
  });

  const output = renderSubsectionBody("3.2", registry);
  const lines = tableLines(output);
  const headerCells = splitRow(lines[0]);
  assert.ok(headerCells.includes("Notes"), `expected a Notes column, got header: ${headerCells.join(" | ")}`);
  assert.ok(!headerCells.includes("Source"), `no row is proposed, so Source should not render: ${headerCells.join(" | ")}`);
  const dataCells = splitRow(lines[2]);
  assert.equal(dataCells.length, headerCells.length);
  const notesIdx = headerCells.indexOf("Notes");
  assert.equal(dataCells[notesIdx], "sampled from the header on login.png");
});

// ---------------------------------------------------------------------------
// 3.2 negative: no proposed, no notes -> exactly the five pinned columns
// ---------------------------------------------------------------------------

test("a 3.2 table with no proposed row and no notes still emits exactly its five pinned columns", () => {
  const registry = mkRegistry({
    "color.brand.primary": mkToken({
      section: "3.2",
      primitive: "primitive.blue.500",
      usedFor: "page background",
    }),
  });

  const output = renderSubsectionBody("3.2", registry);
  const lines = tableLines(output);
  const headerCells = splitRow(lines[0]);
  assert.deepEqual(headerCells, ["Role", "Primitive", "Hex (light)", "Hex (dark)", "Where used"]);
});

// ---------------------------------------------------------------------------
// 3.5 typography - usedFor escaping in renderTextStyles
// ---------------------------------------------------------------------------

test("a textStyle's usedFor containing a pipe or newline renders as exactly one table cell", () => {
  const textStyles: TextStyleEntry[] = [
    mkTextStyle({ name: "type.body", usedFor: "body copy | captions\nand tooltips" }),
  ];

  const output = renderTextStyles(textStyles);
  const lines = tableLines(output);
  const headerCells = splitRow(lines[0]);
  assert.equal(lines.length, 3, `expected exactly one data row, got table lines:\n${lines.join("\n")}`);
  const dataCells = splitRow(lines[2]);
  assert.equal(dataCells.length, headerCells.length, "data row cell count must match header cell count");
});

// ---------------------------------------------------------------------------
// 3.10 dark mode summary - proposed provenance
// ---------------------------------------------------------------------------

test("a proposed dark value in the 3.10 summary renders distinguishably from a measured one", () => {
  const registry = mkRegistry({
    "color.surface.default": mkToken({
      section: "3.1",
      dark: "#0B0B0B",
    }),
    "color.surface.accent": mkToken({
      section: "3.1",
      dark: "#221100",
      proposed: true,
      rationale: "no dark-mode screenshot supplied",
    }),
  });

  const output = renderSubsectionBody("3.10", registry);
  const bullets = output.split("\n").filter((l) => l.startsWith("- "));
  assert.equal(bullets.length, 2, `expected two bullets, got:\n${output}`);
  const measuredLine = bullets.find((l) => l.includes("color.surface.default"));
  const proposedLine = bullets.find((l) => l.includes("color.surface.accent"));
  assert.ok(measuredLine, "expected a bullet for the measured token");
  assert.ok(proposedLine, "expected a bullet for the proposed token");
  assert.notEqual(
    measuredLine!.replace("color.surface.default", "X").replace("#0B0B0B", "Y"),
    proposedLine!.replace("color.surface.accent", "X").replace("#221100", "Y"),
    "a proposed dark bullet must be shaped differently from a measured one, not just differ by name/value",
  );
});

test("an all-measured 3.10 summary still renders exactly the current bullet shape", () => {
  const registry = mkRegistry({
    "color.surface.default": mkToken({
      section: "3.1",
      dark: "#0B0B0B",
    }),
  });

  const output = renderSubsectionBody("3.10", registry);
  assert.equal(output, "- `color.surface.default` - light #0057FF, dark #0B0B0B");
});
