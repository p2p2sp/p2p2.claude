/*
 * section-model.test.ts - proves section-model.ts's constant contract:
 * SECTION_IDS carries no duplicates, SECTION_TITLES has exactly one entry per
 * id (no extras, none missing), TOKEN_BACKED_SECTIONS is a proper subset of
 * SECTION_IDS agreeing with isTokenSection() for every id, and the two
 * regexes (TOKEN_SECTION_RE / UNKNOWN_SECTION_RE) match every id they should
 * and reject the documented near-misses (3.11, 4.1, a bare 3).
 *
 * Pure constant module - imported in-process, no subprocess needed.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is
 * run directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/section-model.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SECTION_IDS,
  SECTION_TITLES,
  TOKEN_BACKED_SECTIONS,
  isTokenSection,
  TOKEN_SECTION_RE,
  UNKNOWN_SECTION_RE,
} from "../../superui/scripts/section-model.ts";

// ---------------------------------------------------------------------------
// SECTION_IDS / SECTION_TITLES
// ---------------------------------------------------------------------------

test("SECTION_IDS holds no duplicates", () => {
  assert.equal(new Set(SECTION_IDS).size, SECTION_IDS.length);
});

test("SECTION_TITLES has an entry for every id in SECTION_IDS and no extra keys", () => {
  for (const id of SECTION_IDS) {
    assert.ok(Object.prototype.hasOwnProperty.call(SECTION_TITLES, id), `missing title for ${id}`);
    assert.ok(typeof SECTION_TITLES[id] === "string" && SECTION_TITLES[id].length > 0, `empty title for ${id}`);
  }
  assert.deepEqual(Object.keys(SECTION_TITLES).sort(), [...SECTION_IDS].sort());
});

// ---------------------------------------------------------------------------
// TOKEN_BACKED_SECTIONS / isTokenSection
// ---------------------------------------------------------------------------

test("TOKEN_BACKED_SECTIONS is a subset of SECTION_IDS", () => {
  for (const id of TOKEN_BACKED_SECTIONS) {
    assert.ok(SECTION_IDS.includes(id as (typeof SECTION_IDS)[number]), `${id} is not in SECTION_IDS`);
  }
});

test("TOKEN_BACKED_SECTIONS excludes exactly the field-backed and derived sections (3.3, 3.4, 3.10)", () => {
  assert.deepEqual(
    [...TOKEN_BACKED_SECTIONS].sort(),
    SECTION_IDS.filter((id) => id !== "3.3" && id !== "3.4" && id !== "3.10").sort(),
  );
});

test("isTokenSection agrees with TOKEN_BACKED_SECTIONS for every SECTION_IDS entry", () => {
  for (const id of SECTION_IDS) {
    assert.equal(isTokenSection(id), TOKEN_BACKED_SECTIONS.has(id), `mismatch for ${id}`);
  }
});

// ---------------------------------------------------------------------------
// TOKEN_SECTION_RE / UNKNOWN_SECTION_RE
// ---------------------------------------------------------------------------

test("TOKEN_SECTION_RE matches every token-backed id and rejects every field-backed/derived id", () => {
  for (const id of SECTION_IDS) {
    assert.equal(
      TOKEN_SECTION_RE.test(id),
      TOKEN_BACKED_SECTIONS.has(id),
      `TOKEN_SECTION_RE.test(${id}) should be ${TOKEN_BACKED_SECTIONS.has(id)}`,
    );
  }
});

test("UNKNOWN_SECTION_RE matches every id in SECTION_IDS", () => {
  for (const id of SECTION_IDS) {
    assert.ok(UNKNOWN_SECTION_RE.test(id), `UNKNOWN_SECTION_RE should match ${id}`);
  }
});

test("both regexes reject 3.11, 4.1 and a bare 3", () => {
  for (const bogus of ["3.11", "4.1", "3"]) {
    assert.equal(TOKEN_SECTION_RE.test(bogus), false, `TOKEN_SECTION_RE should reject ${bogus}`);
    assert.equal(UNKNOWN_SECTION_RE.test(bogus), false, `UNKNOWN_SECTION_RE should reject ${bogus}`);
  }
});
