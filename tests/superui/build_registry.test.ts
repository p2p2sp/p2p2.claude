/*
 * build_registry.test.ts - closes the textStyle and resolved-list provenance
 * holes: a synthesized textStyle or token inside a foundation:"proposed"
 * fragment that omits `proposed: true` must be rejected by validateShape,
 * and mergeFragments must not let a fragment's `resolved` list clear an
 * `unknowns` entry unless that fragment actually contributed something
 * flagged `proposed: true`.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is
 * run directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/build_registry.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { validateShape, mergeFragments, ShapeError } from "../../superui/scripts/build_registry.ts";

test("a foundation:proposed fragment's textStyle with rationale but no proposed:true is rejected", () => {
  const raw = {
    foundation: "proposed",
    textStyles: [
      {
        name: "type.overline",
        family: "Inter",
        size: "10px",
        weight: 600,
        lineHeight: 1.2,
        letterSpacing: "0.08em",
        usedFor: "overline labels",
        rationale: "best-practice overline style, no measured overline exists",
        // proposed intentionally omitted
      },
    ],
  };
  assert.throws(() => validateShape(raw, "notes-synth.json"), ShapeError);
});

test("a foundation:proposed fragment's token with evidence but no proposed:true is rejected", () => {
  const raw = {
    foundation: "proposed",
    tokens: {
      "color.focus.ring": {
        value: "#0057ff",
        type: "color",
        section: "3.1",
        evidence: { screen: "login.png", method: "points", detail: "sampled focus ring" },
        // proposed intentionally omitted, even though this fragment is foundation:"proposed"
      },
    },
  };
  assert.throws(() => validateShape(raw, "notes-synth.json"), ShapeError);
});

test("mergeFragments keeps an unknowns entry whose only claiming fragment flagged nothing proposed", () => {
  const measuredFragment = {
    filename: "notes-colors.json",
    data: {
      foundation: "colors",
      tokens: {},
      surfaceOrder: [],
      accentUsage: [],
      textStyles: [],
      unknowns: [{ what: "focus ring color", reason: "no visible focus state on any screen", section: "3.1" }],
      resolved: [],
    },
  };
  const emptyProposedFragment = {
    filename: "notes-synth.json",
    data: {
      foundation: "proposed",
      tokens: {},
      surfaceOrder: [],
      accentUsage: [],
      textStyles: [],
      unknowns: [],
      resolved: [{ what: "focus ring color", reason: "no visible focus state on any screen", section: "3.1" }],
    },
  };
  const merged = mergeFragments([measuredFragment, emptyProposedFragment]);
  assert.equal(
    merged.unknowns.length,
    1,
    "the unknowns entry should survive: its only claiming fragment flagged nothing proposed",
  );
});

test("a measured fragment plus a well-formed proposed fragment still merge, resolving the unknown", () => {
  const measured = {
    filename: "notes-colors.json",
    data: validateShape(
      {
        foundation: "colors",
        tokens: {
          "color.brand.primary": {
            value: "#0057ff",
            dark: null,
            type: "color",
            section: "3.1",
            evidence: { screen: "login.png", method: "points", detail: "sampled brand button fill" },
          },
        },
        unknowns: [{ what: "focus ring color", reason: "no visible focus state on any screen", section: "3.1" }],
      },
      "notes-colors.json",
    ),
  };
  const proposed = {
    filename: "notes-synth.json",
    data: validateShape(
      {
        foundation: "proposed",
        tokens: {
          "color.focus.ring": {
            value: "#0057ff",
            dark: null,
            type: "color",
            section: "3.1",
            proposed: true,
            rationale: "best-practice focus ring color, no measured focus state exists",
          },
        },
        textStyles: [
          {
            name: "type.overline",
            family: "Inter",
            size: "10px",
            weight: 600,
            lineHeight: 1.2,
            letterSpacing: "0.08em",
            usedFor: "overline labels",
            proposed: true,
            rationale: "best-practice overline style, no measured overline exists",
          },
        ],
        resolved: [{ what: "focus ring color", reason: "no visible focus state on any screen", section: "3.1" }],
      },
      "notes-synth.json",
    ),
  };
  const merged = mergeFragments([measured, proposed]);
  assert.equal(Object.keys(merged.tokens).length, 2, "both the measured and proposed tokens should merge");
  assert.equal(merged.textStyles.length, 1, "the proposed textStyle should merge");
  assert.equal(merged.unknowns.length, 0, "the unknown is genuinely resolved: the proposed fragment contributed a proposed token");
});
