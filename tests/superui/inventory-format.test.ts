/*
 * inventory-format.test.ts - gives inventory-format.ts its own file (today it
 * is only exercised incidentally through validate_bundle.test.ts):
 * INVENTORY_DELIMITER is the single U+00B7 (`·`) character; parseInventoryEntries
 * handles a well-formed entry, an entry with surrounding whitespace, a missing
 * field, an empty line, a line using a look-alike middle dot, a CRLF line, and
 * a delimiter inside a value; canonicalRefs deduplicates and preserves order;
 * CANONICAL_LINE_RE tolerates the documented markdown decoration.
 *
 * Pure parsing module - imported in-process, no subprocess needed.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is
 * run directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/inventory-format.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  INVENTORY_DELIMITER,
  CANONICAL_LINE_RE,
  canonicalRefs,
  parseInventoryEntries,
} from "../../superui/scripts/inventory-format.ts";

const D = INVENTORY_DELIMITER;

// ---------------------------------------------------------------------------
// INVENTORY_DELIMITER
// ---------------------------------------------------------------------------

test("INVENTORY_DELIMITER is U+00B7", () => {
  assert.equal(INVENTORY_DELIMITER, "·");
  assert.equal(INVENTORY_DELIMITER.codePointAt(0), 0xb7);
});

// ---------------------------------------------------------------------------
// parseInventoryEntries - Components
// ---------------------------------------------------------------------------

test("parseInventoryEntries parses a well-formed Components entry", () => {
  const md = `## Components\n- button ${D} primary ${D} canonical: button.png\n`;
  const entries = parseInventoryEntries(md, "## Components");
  assert.deepEqual(entries, [{ slug: "button", kind: "primary", canonical: "button.png" }]);
});

test("parseInventoryEntries trims surrounding whitespace in every field", () => {
  const md = `## Components\n-   button   ${D}   primary   ${D}   canonical:   button.png   \n`;
  const entries = parseInventoryEntries(md, "## Components");
  assert.deepEqual(entries, [{ slug: "button", kind: "primary", canonical: "button.png" }]);
});

test("parseInventoryEntries returns an empty canonical when the canonical field is missing entirely", () => {
  const md = `## Components\n- button ${D} primary\n`;
  const entries = parseInventoryEntries(md, "## Components");
  assert.deepEqual(entries, [{ slug: "button", kind: "primary", canonical: "" }]);
});

test("parseInventoryEntries skips an empty line rather than emitting a bogus entry", () => {
  const md = `## Components\n\n- button ${D} primary ${D} canonical: button.png\n`;
  const entries = parseInventoryEntries(md, "## Components");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].slug, "button");
});

test("parseInventoryEntries does not split on a look-alike middle dot (only the real U+00B7 delimits)", () => {
  // U+2027 HYPHENATION POINT looks similar to U+00B7 but is a different code point.
  const lookalike = "‧";
  const md = `## Components\n- button ${lookalike} primary ${lookalike} canonical: button.png\n`;
  const entries = parseInventoryEntries(md, "## Components");
  assert.equal(entries.length, 1);
  // With no real delimiter present the whole line collapses into fields[0]; kind/canonical are empty.
  assert.equal(entries[0].kind, "");
  assert.equal(entries[0].canonical, "");
});

test("parseInventoryEntries handles a CRLF-terminated inventory", () => {
  const md = `## Components\r\n- button ${D} primary ${D} canonical: button.png\r\n`;
  const entries = parseInventoryEntries(md, "## Components");
  assert.deepEqual(entries, [{ slug: "button", kind: "primary", canonical: "button.png" }]);
});

test("parseInventoryEntries is unhandled (positional, per contract) when a delimiter appears inside a value", () => {
  const md = `## Components\n- button ${D} primary ${D} canonical: my${D}file.png\n`;
  const entries = parseInventoryEntries(md, "## Components");
  // The split is positional by design: the delimiter inside the value truncates the canonical field.
  assert.equal(entries[0].canonical, "my");
});

// ---------------------------------------------------------------------------
// parseInventoryEntries - Patterns (no kind field) + heading boundaries
// ---------------------------------------------------------------------------

test("parseInventoryEntries parses a Patterns entry (no kind field) and stops at the next heading", () => {
  const md = `## Components\n- button ${D} primary ${D} canonical: button.png\n## Patterns\n- modal ${D} canonical: modal.png\n## Other\n- ignored ${D} canonical: ignored.png\n`;
  const entries = parseInventoryEntries(md, "## Patterns");
  assert.deepEqual(entries, [{ slug: "modal", kind: "", canonical: "modal.png" }]);
});

test("parseInventoryEntries returns an empty array when the heading is absent", () => {
  assert.deepEqual(parseInventoryEntries("## Components\nno entries here\n", "## Patterns"), []);
});

// ---------------------------------------------------------------------------
// canonicalRefs - dedup + order, decorated lines
// ---------------------------------------------------------------------------

test("canonicalRefs deduplicates while preserving first-seen order", () => {
  const content = "canonical: a.png\ncanonical: b.png\ncanonical: a.png\ncanonical: c.png\n";
  assert.deepEqual(canonicalRefs(content), ["a.png", "b.png", "c.png"]);
});

test("CANONICAL_LINE_RE tolerates the documented markdown decoration", () => {
  const decorated = [
    "canonical: plain.png",
    "- canonical: list.png",
    "* canonical: star-list.png",
    "+ canonical: plus-list.png",
    "  canonical: indented.png",
    "> canonical: quoted.png",
    "### canonical: headed.png",
    "**canonical:** bold.png",
    "Canonical: capitalised.png",
  ].join("\n");
  assert.deepEqual(canonicalRefs(decorated), [
    "plain.png",
    "list.png",
    "star-list.png",
    "plus-list.png",
    "indented.png",
    "quoted.png",
    "headed.png",
    "bold.png",
    "capitalised.png",
  ]);
});

test("CANONICAL_LINE_RE is anchored to line start (never matches mid-line)", () => {
  CANONICAL_LINE_RE.lastIndex = 0;
  assert.deepEqual(canonicalRefs("see canonical: not-a-match.png in prose\n"), []);
});
