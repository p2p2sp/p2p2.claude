/*
 * build_report.unit.test.ts - locks down superbiz's report builder: every
 * validation rule of report-data.json, the label merge, the one-pass template
 * fill, exit 2 on a wrong argument count and import safety. Imports the
 * script, spawns nothing, writes nothing; the file-writing CLI cases live in
 * build_report.test.ts.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is
 * run directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superbiz/build_report.unit.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";

import {
  DEFAULT_LABELS,
  main,
  mergeLabels,
  render,
  validate,
} from "../../superbiz/skills/idea-validator/scripts/build_report.mjs";
import { capture, validReport as valid } from "./fixture.ts";

const dim = (d: any, key: string) => d.scorecard.dimensions.find((x: any) => x.key === key);
const TEMPLATE = `<html lang="__LANG__"><title>__TITLE__</title><script type="application/json">__REPORT_DATA__</script></html>`;

// ---------------------------------------------------------------------------
// validate - one case per rule: the mutation and the problem it must report
// ---------------------------------------------------------------------------

test("validate accepts the minimal valid report", () => {
  assert.deepEqual(validate(valid()), []);
});

test("validate rejects a non-object document with a single problem", () => {
  assert.deepEqual(validate([]), ["report data must be a JSON object"]);
});

const RULES: Array<[string, (d: any) => void, string]> = [
  ["a missing required path", (d) => delete d.meta.one_liner, "missing: meta.one_liner"],
  ["a non-boolean quick_mode", (d) => (d.meta.quick_mode = "no"), "wrong type: meta.quick_mode (expected boolean)"],
  ["a string total", (d) => (d.scorecard.total = "3"), "wrong type: scorecard.total (expected number)"],
  ["dimensions that are not a list", (d) => (d.scorecard.dimensions = {}), "wrong type: scorecard.dimensions (expected list)"],
  ["an unknown verdict label", (d) => (d.verdict.label = "Maybe"), "verdict.label must be one of: Go, No-Go, Pivot"],
  ["a Pivot without pivot_suggestion", (d) => (d.verdict.pivot_suggestion = ""), "verdict.pivot_suggestion required when label == Pivot"],
  ["dimensions out of canonical order", (d) => d.scorecard.dimensions.reverse(), "scorecard.dimensions keys must be exactly, in order:"],
  ["a missing dimension", (d) => d.scorecard.dimensions.pop(), "scorecard.dimensions keys must be exactly, in order:"],
  ["a score above 5", (d) => (dim(d, "market").score = 6), "dimension market: score must be int 1-5"],
  ["a fractional score", (d) => (dim(d, "market").score = 2.5), "dimension market: score must be int 1-5"],
  ["a boolean score", (d) => (dim(d, "market").score = true), "dimension market: score must be int 1-5"],
  ["an unknown confidence", (d) => (dim(d, "market").confidence = "certain"), "dimension market: confidence must be high/medium/low"],
  ["an empty justification", (d) => (dim(d, "market").justification = ""), "dimension market: justification missing"],
  ["an empty evidence list", (d) => (dim(d, "market").evidence = []), "dimension market: evidence list empty"],
  ["a weight of 3", (d) => (dim(d, "market").weight = 3), "dimension market: weight must be 1 or 2"],
  ["a total off by more than 0.06", (d) => (d.scorecard.total = 3.1), "scorecard.total 3.1 does not match recomputed 3.00"],
  ["a Go with a key dimension at 2", (d) => {
    d.verdict.label = "Go";
    dim(d, "distribution").score = 2;
    d.scorecard.total = 2.82;
  }, "verdict Go not allowed: key dimension(s) distribution score ≤ 2"],
  ["a Go with a low-confidence key dimension and no condition", (d) => {
    d.verdict.label = "Go";
    dim(d, "autopilot_fit").confidence = "low";
  }, "verdict Go with low-confidence key dimension(s) autopilot_fit must set verdict.conditional_on"],
  ["six council members", (d) => d.council.members.pop(), "council.members must have 7 entries"],
  ["an empty dissent", (d) => (d.council.dissent.text = ""), "council.dissent.text is mandatory"],
  ["a missing round2_held", (d) => delete d.council.round2_held, "council.round2_held missing"],
  ["a skipped round 2 outside quick mode", (d) => (d.council.round2_held = false), "round2_held must be true unless quick_mode"],
  ["a missing lean canvas box", (d) => delete d.lean_canvas.uvp, "lean_canvas.uvp missing"],
  ["a missing research block", (d) => delete d.research.market, "research.market missing"],
  ["a research list that is a string", (d) => (d.research.problem.open = "none"), "research.problem.open must be a list"],
  ["two experiments", (d) => d.experiments.pop(), "experiments must have 3-8 entries"],
  ["nine experiments", (d) => d.experiments.push(...valid().experiments, ...valid().experiments), "experiments must have 3-8 entries"],
  ["an experiment without a metric", (d) => (d.experiments[1].metric = ""), "experiment 2: metric missing"],
  ["a missing threshold", (d) => (d.thresholds.no_go = ""), "thresholds.no_go missing"],
  ["a missing weekly hours total", (d) => delete d.autopilot_fit.hours_per_week_total, "autopilot_fit.hours_per_week_total missing"],
  ["killers that are not a list", (d) => (d.autopilot_fit.killers = null), "autopilot_fit.killers must be a list (may be empty)"],
  ["a missing closing note", (d) => delete d.appendix.closing_note, "appendix.closing_note missing"],
  ["sources that are not a list", (d) => (d.appendix.sources = {}), "appendix.sources must be a list"],
];

for (const [name, mutate, expected] of RULES) {
  test(`validate reports ${name}`, () => {
    const d = valid();
    mutate(d);
    const problems: string[] = validate(d);
    assert.ok(problems.some((p) => p.includes(expected)), `expected "${expected}" in:\n${problems.join("\n")}`);
  });
}

test("validate accepts a skipped round 2 in quick mode", () => {
  const d = valid();
  d.meta.quick_mode = true;
  d.council.round2_held = false;
  assert.deepEqual(validate(d), []);
});

test("validate accepts a Go with a low-confidence key dimension when conditional_on is set", () => {
  const d = valid();
  d.verdict.label = "Go";
  d.verdict.conditional_on = "experiment #1";
  dim(d, "problem").confidence = "low";
  assert.deepEqual(validate(d), []);
});

test("validate still applies the verdict rules when another dimension lacks its score", () => {
  const d = valid();
  d.verdict.label = "Go";
  delete dim(d, "market").score;
  dim(d, "problem").score = 1;
  dim(d, "distribution").confidence = "low";
  const problems: string[] = validate(d);
  assert.ok(problems.includes("dimension market: score must be int 1-5"));
  assert.ok(problems.some((p) => p.startsWith("verdict Go not allowed: key dimension(s) problem")));
  assert.ok(problems.some((p) => p.startsWith("verdict Go with low-confidence key dimension(s) distribution")));
});

test("validate skips the total check while a score or weight is invalid", () => {
  const d = valid();
  dim(d, "market").weight = 3;
  dim(d, "timing").score = 9;
  const problems: string[] = validate(d);
  assert.ok(!problems.some((p) => p.startsWith("scorecard.total")), problems.join("\n"));
});

// ---------------------------------------------------------------------------
// mergeLabels - English defaults under the data's own labels
// ---------------------------------------------------------------------------

test("mergeLabels fills every default and keeps the data's own labels", () => {
  const d = valid();
  d.labels = { verdict: "Werdykt", extra: "E", canvas: { uvp: "UVP" } };
  const { labels } = mergeLabels(d);
  assert.equal(labels.verdict, "Werdykt");
  assert.equal(labels.extra, "E");
  assert.equal(labels.scorecard, DEFAULT_LABELS.scorecard);
  assert.equal(labels.canvas.uvp, "UVP");
  assert.equal(labels.canvas.problem, DEFAULT_LABELS.canvas.problem);
  assert.equal(DEFAULT_LABELS.verdict, "Verdict");
  assert.equal(DEFAULT_LABELS.canvas.uvp, "Unique value proposition");
});

test("mergeLabels supplies every default when the data has no labels", () => {
  const { labels } = mergeLabels(valid());
  assert.deepEqual(labels, DEFAULT_LABELS);
});

// ---------------------------------------------------------------------------
// render - one-pass fill, escaping
// ---------------------------------------------------------------------------

test("render escapes </ in the data and < in the title, and keeps $ patterns literal", () => {
  const d = valid();
  d.meta.title = "A </script> $& $' __LANG__";
  const html: string = render(d, TEMPLATE);
  assert.ok(html.startsWith('<html lang="pl"><title>A &lt;/script> $& $\' __LANG__</title>'), html);
  const payload = html.slice(html.indexOf("json\">") + 6, html.lastIndexOf("</script>"));
  assert.ok(!payload.includes("</"), payload);
  assert.equal(JSON.parse(payload.replaceAll("<\\/", "</")).meta.title, d.meta.title);
});

// ---------------------------------------------------------------------------
// main - CLI exit codes
// ---------------------------------------------------------------------------

test("main returns 2 and prints usage on a wrong argument count", () => {
  const out = capture();
  assert.equal(main(["only-one.json"], out.log), 2);
  assert.match(out.lines.join("\n"), /Usage: node build_report\.mjs/);
});

// ---------------------------------------------------------------------------
// import safety
// ---------------------------------------------------------------------------

test("importing the script does not run its CLI", () => {
  assert.equal(typeof main, "function");
  assert.ok(
    process.exitCode === undefined || process.exitCode === 0,
    `process.exitCode should be unset or 0 after import, got ${String(process.exitCode)}`,
  );
});
