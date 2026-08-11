/*
 * parse_design_md.test.ts - proves parse_design_md.ts reconstructs a
 * registry-shaped JSON from a rendered DESIGN.md: a round-trip through
 * render_design_md.ts (both run as real subprocesses, matching
 * copy_screens.test.ts's convention for a script driven end-to-end) survives
 * tokens/textStyles/surfaceOrder/accentUsage, plus unit-level coverage of
 * parseBodyTables/parseFrontMatter via direct import (matching
 * render_design_md.test.ts's convention for a script that also exports
 * symbols) for the per-section parsing behaviors and edge cases the DoD
 * calls out (proposed tokens, empty sections, escaped/multi-line cells,
 * `> NEEDS INPUT` markers).
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/parse_design_md.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { slash } from "../harness/paths.ts";
import { parseBodyTables, parseFrontMatter } from "../../superui/scripts/parse_design_md.ts";

const PARSE_SUT = path.resolve(import.meta.dirname, "../../superui/scripts/parse_design_md.ts");
const RENDER_SUT = path.resolve(import.meta.dirname, "../../superui/scripts/render_design_md.ts");

function runParse(args: string[]): RunResult {
  return runScript(PARSE_SUT, args);
}

function runRender(args: string[]): RunResult {
  return runScript(RENDER_SUT, args);
}

// ---------------------------------------------------------------------------
// Unit-level: parseBodyTables on a hand-built body fragment (3.6 spacing)
// ---------------------------------------------------------------------------

test("parseBodyTables extracts a plain 3.6 spacing token from its table", () => {
  const body = [
    "## Layout & Spacing",
    "",
    "| Step | Value |",
    "| --- | --- |",
    "| spacing.sm | 8px |",
    "",
    "## Motion",
    "",
    "none",
    "",
  ].join("\n");

  const registry = parseBodyTables(body);

  assert.ok(registry.tokens["spacing.sm"], `expected 'spacing.sm' token, got: ${JSON.stringify(registry.tokens)}`);
  assert.equal(registry.tokens["spacing.sm"].value, "8px");
  assert.equal(registry.tokens["spacing.sm"].section, "3.6");
  assert.deepEqual(registry.unknowns, []);
});

// ---------------------------------------------------------------------------
// Round trip: build a fixture registry, render it, parse it back
// ---------------------------------------------------------------------------

function buildFixtureRegistry() {
  return {
    tokens: {
      "color.blue.100": {
        value: "#EEF3FF",
        dark: null,
        type: "color",
        section: "3.1",
        primitive: null,
        usedFor: null,
        evidence: { screen: "a.png", method: "points", detail: "sampled" },
        notes: null,
      },
      "color.blue.200": {
        value: "#CCDBFF",
        dark: "#112244",
        type: "color",
        section: "3.1",
        primitive: null,
        usedFor: null,
        evidence: { screen: "a.png", method: "points", detail: "sampled" },
        notes: null,
      },
      "color.brand.accent": {
        value: "#0057FF",
        dark: null,
        type: "color",
        section: "3.1",
        primitive: null,
        usedFor: null,
        evidence: { screen: "a.png", method: "points", detail: "sampled" },
        notes: null,
      },
      "color.text.primary": {
        value: "#111111",
        dark: "#EEEEEE",
        type: "color",
        section: "3.2",
        primitive: "color.blue.900",
        usedFor: "body copy | headings and captions",
        evidence: { screen: "a.png", method: "regions", detail: "sampled" },
        notes: "sampled from hero",
      },
      "color.focus.ring": {
        value: "#0057FF",
        dark: null,
        type: "color",
        section: "3.2",
        primitive: "color.blue.500",
        usedFor: "focus outline",
        evidence: null,
        notes: null,
        proposed: true,
        rationale: "best-practice focus ring color, no measured focus state exists",
      },
      "font.family.sans": {
        value: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        dark: null,
        type: "fontFamily",
        section: "3.5",
        primitive: null,
        usedFor: null,
        evidence: { screen: "a.png", method: "reference", detail: "in-image label" },
        notes: null,
      },
      "spacing.sm": {
        value: "8px",
        dark: null,
        type: "dimension",
        section: "3.6",
        primitive: null,
        usedFor: null,
        evidence: { screen: "a.png", method: "geometry", detail: "measured gap" },
        notes: null,
      },
      "spacing.md": {
        value: "16px",
        dark: null,
        type: "dimension",
        section: "3.6",
        primitive: null,
        usedFor: null,
        evidence: { screen: "a.png", method: "geometry", detail: "measured gap" },
        notes: null,
      },
      "radius.sm": {
        value: "4px",
        dark: null,
        type: "dimension",
        section: "3.7",
        primitive: null,
        usedFor: null,
        evidence: { screen: "a.png", method: "radius" as unknown as "geometry", detail: "measured corner" },
        notes: null,
      },
      "border.default": {
        value: "1px",
        dark: null,
        type: "dimension",
        section: "3.7",
        primitive: null,
        usedFor: null,
        evidence: { screen: "a.png", method: "geometry", detail: "measured border" },
        notes: null,
      },
      "shadow.card": {
        value: "0 1px 2px rgba(0,0,0,.1)",
        dark: null,
        type: "shadow",
        section: "3.8",
        primitive: null,
        usedFor: null,
        evidence: { screen: "a.png", method: "geometry", detail: "measured falloff" },
        notes: null,
      },
      "gradient.hero": {
        value: "linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%)",
        dark: null,
        type: "gradient",
        section: "3.8",
        primitive: null,
        usedFor: null,
        evidence: { screen: "a.png", method: "geometry", detail: "measured gradient" },
        notes: null,
      },
      "motion.duration.fast": {
        value: "150ms",
        dark: null,
        type: "duration",
        section: "3.9",
        primitive: null,
        usedFor: null,
        evidence: { screen: "a.png", method: "reference", detail: "in-image label" },
        notes: null,
      },
    },
    surfaceOrder: [
      { region: "page background", hex: "#FFFFFF", luminance: 1, rank: 1 },
      { region: "card surface", hex: "#F5F5F5", luminance: 0.9, rank: 2 },
    ],
    accentUsage: [
      { screen: "login.png", where: "primary button fill", token: "color.brand.accent" },
      { screen: "login.png", where: "link text", token: "color.brand.accent" },
    ],
    textStyles: [
      {
        name: "type.body",
        family: "Inter",
        size: "16px",
        weight: 400,
        lineHeight: 1.5,
        letterSpacing: "0",
        usedFor: "body copy | captions",
      },
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
    unknowns: [],
  };
}

function renderFixture(dir: string): string {
  const registryPath = path.join(dir, "registry.json");
  const inventoryPath = path.join(dir, "inventory.md");
  const outputPath = path.join(dir, "DESIGN.md");
  fs.writeFileSync(registryPath, JSON.stringify(buildFixtureRegistry(), null, 2));
  fs.writeFileSync(inventoryPath, "## Components\n\n## Patterns\n");
  const renderResult = runRender([registryPath, inventoryPath, outputPath]);
  assert.equal(renderResult.status, 0, `render_design_md.ts failed: ${renderResult.stderr}`);
  return outputPath;
}

test("round trip: tokens/dark/proposed/rationale survive render -> parse", () => {
  withTempDir("p2p2-parse-design-roundtrip-", (dir) => {
    const designPath = renderFixture(dir);
    const outJsonPath = path.join(dir, "parsed.json");
    const result = runParse([designPath, outJsonPath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(slash(result.stdout), slash(`PARSE_DESIGN_OK tokens=13 textStyles=2 -> ${outJsonPath}\n`));

    const parsed = JSON.parse(fs.readFileSync(outJsonPath, "utf-8"));
    assert.equal(Object.keys(parsed.tokens).length, 13);
    assert.deepEqual(parsed.unknowns, []);

    assert.equal(parsed.tokens["color.blue.100"].value, "#EEF3FF");
    assert.equal(parsed.tokens["color.blue.100"].dark, null);
    assert.equal(parsed.tokens["color.blue.200"].dark, "#112244");
    assert.equal(parsed.tokens["color.brand.accent"].value, "#0057FF");

    assert.equal(parsed.tokens["color.text.primary"].value, "#111111");
    assert.equal(parsed.tokens["color.text.primary"].dark, "#EEEEEE");
    assert.equal(parsed.tokens["color.text.primary"].primitive, "color.blue.900");
    assert.equal(parsed.tokens["color.text.primary"].usedFor, "body copy | headings and captions");
    assert.equal(parsed.tokens["color.text.primary"].notes, "sampled from hero");
    assert.equal(parsed.tokens["color.text.primary"].proposed, false);
    assert.equal(parsed.tokens["color.text.primary"].evidence, null);

    assert.equal(parsed.tokens["color.focus.ring"].proposed, true);
    assert.equal(
      parsed.tokens["color.focus.ring"].rationale,
      "best-practice focus ring color, no measured focus state exists",
    );
    assert.equal(parsed.tokens["color.focus.ring"].evidence, null);

    assert.equal(parsed.tokens["font.family.sans"].value, "Inter, -apple-system, BlinkMacSystemFont, sans-serif");
    assert.equal(parsed.tokens["spacing.sm"].value, "8px");
    assert.equal(parsed.tokens["spacing.md"].value, "16px");
    assert.equal(parsed.tokens["radius.sm"].value, "4px");
    assert.equal(parsed.tokens["border.default"].value, "1px");
    assert.equal(parsed.tokens["shadow.card"].value, "0 1px 2px rgba(0,0,0,.1)");
    assert.equal(parsed.tokens["gradient.hero"].value, "linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%)");
    assert.equal(parsed.tokens["motion.duration.fast"].value, "150ms");

    assert.deepEqual(parsed.surfaceOrder, [
      { region: "page background", hex: "#FFFFFF", luminance: 1, rank: 1 },
      { region: "card surface", hex: "#F5F5F5", luminance: 0.9, rank: 2 },
    ]);

    assert.deepEqual(parsed.accentUsage, [
      { screen: "login.png", where: "primary button fill", token: "color.brand.accent" },
      { screen: "login.png", where: "link text", token: "color.brand.accent" },
    ]);

    assert.equal(parsed.textStyles.length, 2);
    const body = parsed.textStyles.find((t: { name: string }) => t.name === "type.body");
    assert.ok(body, `expected type.body textStyle, got: ${JSON.stringify(parsed.textStyles)}`);
    assert.equal(body.family, "Inter");
    assert.equal(body.size, "16px");
    assert.equal(body.weight, 400);
    assert.equal(body.lineHeight, 1.5);
    assert.equal(body.letterSpacing, "0");
    assert.equal(body.usedFor, "body copy | captions");
    assert.equal(body.proposed, false);

    const overline = parsed.textStyles.find((t: { name: string }) => t.name === "type.overline");
    assert.ok(overline, `expected type.overline textStyle, got: ${JSON.stringify(parsed.textStyles)}`);
    assert.equal(overline.proposed, true);
    assert.equal(overline.rationale, "best-practice overline style, no measured overline exists");
  });
});

// ---------------------------------------------------------------------------
// Proposed-token case (isolated, minimal fixture)
// ---------------------------------------------------------------------------

test("a proposed token with no dark value round-trips its Source + rationale", () => {
  withTempDir("p2p2-parse-design-proposed-", (dir) => {
    const registry = {
      tokens: {
        "color.focus.ring": {
          value: "#0057FF",
          dark: null,
          type: "color",
          section: "3.1",
          primitive: null,
          usedFor: null,
          evidence: null,
          notes: null,
          proposed: true,
          rationale: "best-practice focus ring, no measured focus state exists",
        },
      },
      surfaceOrder: [],
      accentUsage: [],
      textStyles: [],
      unknowns: [],
    };
    const registryPath = path.join(dir, "registry.json");
    const inventoryPath = path.join(dir, "inventory.md");
    const designPath = path.join(dir, "DESIGN.md");
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    fs.writeFileSync(inventoryPath, "## Components\n\n## Patterns\n");
    const renderResult = runRender([registryPath, inventoryPath, designPath]);
    assert.equal(renderResult.status, 0, `render_design_md.ts failed: ${renderResult.stderr}`);

    const outJsonPath = path.join(dir, "parsed.json");
    const result = runParse([designPath, outJsonPath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const parsed = JSON.parse(fs.readFileSync(outJsonPath, "utf-8"));
    assert.equal(parsed.tokens["color.focus.ring"].proposed, true);
    assert.equal(parsed.tokens["color.focus.ring"].rationale, "best-practice focus ring, no measured focus state exists");
    assert.equal(parsed.tokens["color.focus.ring"].evidence, null);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test("a minimal system (empty surfaceOrder/accentUsage/textStyles) still parses to valid empty collections at exit 0", () => {
  withTempDir("p2p2-parse-design-minimal-", (dir) => {
    const registry = {
      tokens: {
        "color.brand.primary": {
          value: "#0057FF",
          dark: null,
          type: "color",
          section: "3.1",
          primitive: null,
          usedFor: null,
          evidence: { screen: "a.png", method: "points", detail: "sampled" },
          notes: null,
        },
      },
      surfaceOrder: [],
      accentUsage: [],
      textStyles: [],
      unknowns: [],
    };
    const registryPath = path.join(dir, "registry.json");
    const inventoryPath = path.join(dir, "inventory.md");
    const designPath = path.join(dir, "DESIGN.md");
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    fs.writeFileSync(inventoryPath, "## Components\n\n## Patterns\n");
    const renderResult = runRender([registryPath, inventoryPath, designPath]);
    assert.equal(renderResult.status, 0, `render_design_md.ts failed: ${renderResult.stderr}`);

    const outJsonPath = path.join(dir, "parsed.json");
    const result = runParse([designPath, outJsonPath]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);

    const parsed = JSON.parse(fs.readFileSync(outJsonPath, "utf-8"));
    assert.equal(Object.keys(parsed.tokens).length, 1);
    assert.deepEqual(parsed.surfaceOrder, []);
    assert.deepEqual(parsed.accentUsage, []);
    assert.deepEqual(parsed.textStyles, []);
  });
});

test("> NEEDS INPUT blockquote lines inside a section are ignored, unknowns stays []", () => {
  const body = [
    "## Colors",
    "",
    "### 3.1 Color primitives",
    "",
    "| Name | Hex |",
    "| --- | --- |",
    "| color.brand.primary | #0057FF |",
    "",
    "> NEEDS INPUT: dark variant - no dark screenshot supplied",
    "",
    "### 3.2 Semantic colors",
    "",
    "none",
    "",
  ].join("\n");

  const registry = parseBodyTables(body);

  assert.deepEqual(registry.unknowns, []);
  assert.equal(registry.tokens["color.brand.primary"].value, "#0057FF");
});

test("parseFrontMatter splits the front matter block from the body", () => {
  const designMd = ["---", 'colors: "placeholder"', "---", "", "## Overview", "", "text", ""].join("\n");
  const { body } = parseFrontMatter(designMd);
  assert.ok(body.includes("## Overview"), `expected body to include '## Overview', got: ${body}`);
  assert.ok(!body.includes("colors:"), `expected front matter to be stripped from body, got: ${body}`);
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

test("a missing DESIGN_MD exits 1 naming the file", () => {
  withTempDir("p2p2-parse-design-missing-", (dir) => {
    const outJsonPath = path.join(dir, "parsed.json");
    const result = runParse([path.join(dir, "no-such-DESIGN.md"), outJsonPath]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /error: cannot read/);
  });
});

test("a DESIGN.md with no recognizable section tables exits 1 (zero tokens)", () => {
  withTempDir("p2p2-parse-design-malformed-", (dir) => {
    const designPath = path.join(dir, "DESIGN.md");
    fs.writeFileSync(designPath, "# Not a design seed\n\nJust some prose.\n");
    const outJsonPath = path.join(dir, "parsed.json");
    const result = runParse([designPath, outJsonPath]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(path.basename(designPath).replace(/\./g, "\\.")));
  });
});

test("wrong argument count prints usage + an error line on stderr and exits 2", () => {
  withTempDir("p2p2-parse-design-usage-", (dir) => {
    const result = runParse([dir]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^usage: parse_design_md\.ts /);
    assert.match(result.stderr, /expected 2 arguments/);
    assert.equal(result.stdout, "");
  });
});

test("-h prints help text on stdout and exits 0", () => {
  const result = runParse(["-h"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^usage: parse_design_md\.ts /);
});
