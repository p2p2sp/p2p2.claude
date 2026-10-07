/*
 * lenses.unit.test.ts - holds every audit lens file present in
 * viber/skills/code-auditor/references/lenses/ to the lens file shape the
 * code-auditor skill and its agents read: exactly the headings `## Hunts`,
 * `## Map signals`, `## Excluded`, `## Verify`, `## Severity` in that order,
 * 3 to 6 `### <angle>` entries under `## Hunts`, at least one ```bash block
 * under `## Map signals` and none anywhere else, a `Worktree: required` or
 * `Worktree: none` line under `## Verify`, and at most 8000 bytes.
 *
 * Every rule lives in the pure function `lensProblems`, proven to fire on a
 * synthetic bad lens before it is trusted on the real files, so a green run is
 * never vacuous. One case per lens file carries the file name, so
 * `--test-name-pattern "bugs\.md"` selects that lens alone.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/lenses.unit.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const LENSES = path.resolve(import.meta.dirname, "../../viber/skills/code-auditor/references/lenses");
const HEADINGS = ["## Hunts", "## Map signals", "## Excluded", "## Verify", "## Severity"];
const MAX_BYTES = 8000;

type Rule = "headings" | "angles" | "map-signals" | "bash-outside" | "worktree" | "size";

interface Problem {
  rule: Rule;
  detail: string;
}

interface Parsed {
  headings: string[];
  lines: Map<string, string[]>;
  bashSections: string[];
}

/** Splits a lens text into its `## ` sections, ignoring headings inside fences,
 *  and records the section each ```bash block sits in. */
function parse(text: string): Parsed {
  const headings: string[] = [];
  const lines = new Map<string, string[]>();
  const bashSections: string[] = [];
  let section = "";
  let fenced = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("```")) {
      if (!fenced && line.trim() === "```bash") bashSections.push(section);
      fenced = !fenced;
      continue;
    }
    if (!fenced && line.startsWith("## ")) {
      section = line.trimEnd();
      headings.push(section);
      continue;
    }
    if (!fenced) lines.set(section, [...(lines.get(section) ?? []), line]);
  }
  return { headings, lines, bashSections };
}

function lensProblems(text: string): Problem[] {
  const parsed = parse(text);
  const problems: Problem[] = [];
  if (parsed.headings.join("\n") !== HEADINGS.join("\n")) {
    problems.push({ rule: "headings", detail: `found ${JSON.stringify(parsed.headings)}` });
  }
  const angles = (parsed.lines.get("## Hunts") ?? []).filter((line) => line.startsWith("### ")).length;
  if (angles < 3 || angles > 6) problems.push({ rule: "angles", detail: `found ${angles} angles, want 3 to 6` });
  if (!parsed.bashSections.includes("## Map signals")) {
    problems.push({ rule: "map-signals", detail: "no bash block under ## Map signals" });
  }
  const outside = parsed.bashSections.filter((section) => section !== "## Map signals");
  if (outside.length > 0) problems.push({ rule: "bash-outside", detail: `bash block under ${JSON.stringify(outside)}` });
  if (!(parsed.lines.get("## Verify") ?? []).some((line) => /^Worktree: (required|none)$/.test(line.trimEnd()))) {
    problems.push({ rule: "worktree", detail: "no `Worktree: required | none` line under ## Verify" });
  }
  const bytes = Buffer.byteLength(text, "utf-8");
  if (bytes > MAX_BYTES) problems.push({ rule: "size", detail: `${bytes} bytes, want at most ${MAX_BYTES}` });
  return problems;
}

function rulesBroken(text: string): Rule[] {
  return lensProblems(text).map((problem) => problem.rule);
}

const hunts = (count: number) =>
  `## Hunts\n${Array.from({ length: count }, (_, i) => `### angle-${i + 1}\nWhat makes it a finding.\n`).join("\n")}`;
const MAP = "## Map signals\nRank units by hits.\n```bash\ngit log --name-only --format= -- <scope>\n```\n";
const MAP_PROSE_ONLY = "## Map signals\nRank units by hits.\n";
const EXCLUDED = "## Excluded\n- Style.\n";
const EXCLUDED_WITH_BASH = "## Excluded\n- Style.\n```bash\nls <scope>\n```\n";
const VERIFY = "## Verify\nWorktree: required\nRun the recipe.\n";
const VERIFY_NO_WORKTREE = "## Verify\nRun the recipe.\n";
const SEVERITY = "## Severity\n- 1-10: anything.\n";

const lens = (...sections: string[]) => ["# Sample lens\nAudits a sample; the other lens owns the rest.\n", ...sections].join("\n");

const BAD: { name: string; text: string; rule: Rule }[] = [
  { name: "a lens missing the ## Excluded heading", text: lens(hunts(3), MAP, VERIFY, SEVERITY), rule: "headings" },
  { name: "a lens holding ## Verify before ## Excluded", text: lens(hunts(3), MAP, VERIFY, EXCLUDED, SEVERITY), rule: "headings" },
  { name: "a lens carrying 2 angles", text: lens(hunts(2), MAP, EXCLUDED, VERIFY, SEVERITY), rule: "angles" },
  { name: "a lens carrying 7 angles", text: lens(hunts(7), MAP, EXCLUDED, VERIFY, SEVERITY), rule: "angles" },
  { name: "a lens with no bash block under ## Map signals", text: lens(hunts(3), MAP_PROSE_ONLY, EXCLUDED, VERIFY, SEVERITY), rule: "map-signals" },
  { name: "a lens lacking the Worktree line", text: lens(hunts(3), MAP, EXCLUDED, VERIFY_NO_WORKTREE, SEVERITY), rule: "worktree" },
  { name: "a lens holding a bash block under ## Excluded", text: lens(hunts(3), MAP, EXCLUDED_WITH_BASH, VERIFY, SEVERITY), rule: "bash-outside" },
  { name: "a lens over 8000 bytes", text: `${lens(hunts(3), MAP, EXCLUDED, VERIFY, SEVERITY)}\n${"a".repeat(MAX_BYTES)}\n`, rule: "size" },
];

for (const bad of BAD) {
  test(`${bad.name} breaks the ${bad.rule} rule and no other (a rule that never fires makes every lens check vacuous)`, () => {
    assert.deepEqual(rulesBroken(bad.text), [bad.rule]);
  });
}

const LENS_FILES = fs.readdirSync(LENSES).filter((name) => name.endsWith(".md")).sort();

for (const file of LENS_FILES) {
  test(`the lens file ${file} holds the lens shape: five headings in order, 3 to 6 angles, map-signal bash blocks only, a Worktree line, at most 8000 bytes`, () => {
    assert.deepEqual(lensProblems(fs.readFileSync(path.join(LENSES, file), "utf-8")), []);
  });
}
