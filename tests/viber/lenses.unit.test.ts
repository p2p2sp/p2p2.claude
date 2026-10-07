/*
 * lenses.unit.test.ts - holds every audit lens file present in
 * viber/skills/code-auditor/references/lenses/ to the lens file shape the
 * code-auditor skill and its agents read: exactly the headings `## Hunts`,
 * `## Excluded`, `## Verify`, `## Severity` in that order, 3 to 6
 * `### <angle>` entries under `## Hunts`, no ```bash block, a
 * `Worktree: required` or `Worktree: none` line under `## Verify`, and at most
 * 8000 bytes. Beside each lens `<lens>.md` sits its `<lens>.signals.md`, read
 * by the mapper alone, holding at least one ```bash block.
 *
 * Every rule lives in the pure functions `lensProblems` and `signalsProblems`,
 * proven to fire on a synthetic bad file before it is trusted on the real
 * files, so a green run is never vacuous. One case per lens file carries the
 * file name, so `--test-name-pattern "bugs\.md"` selects that lens alone.
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
const HEADINGS = ["## Hunts", "## Excluded", "## Verify", "## Severity"];
const MAX_BYTES = 8000;
const SIGNALS_SUFFIX = ".signals.md";

type Rule = "headings" | "angles" | "bash" | "worktree" | "size";

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
  if (parsed.bashSections.length > 0) {
    problems.push({ rule: "bash", detail: `bash block under ${JSON.stringify(parsed.bashSections)}` });
  }
  if (!(parsed.lines.get("## Verify") ?? []).some((line) => /^Worktree: (required|none)$/.test(line.trimEnd()))) {
    problems.push({ rule: "worktree", detail: "no `Worktree: required | none` line under ## Verify" });
  }
  const bytes = Buffer.byteLength(text, "utf-8");
  if (bytes > MAX_BYTES) problems.push({ rule: "size", detail: `${bytes} bytes, want at most ${MAX_BYTES}` });
  return problems;
}

/** A signals file is the mapper's command list: at least one ```bash block. */
function signalsProblems(text: string): string[] {
  return parse(text).bashSections.length > 0 ? [] : ["no bash block"];
}

function rulesBroken(text: string): Rule[] {
  return lensProblems(text).map((problem) => problem.rule);
}

const hunts = (count: number) =>
  `## Hunts\n${Array.from({ length: count }, (_, i) => `### angle-${i + 1}\nWhat makes it a finding.\n`).join("\n")}`;
const EXCLUDED = "## Excluded\n- Style.\n";
const EXCLUDED_WITH_BASH = "## Excluded\n- Style.\n```bash\nls <scope>\n```\n";
const VERIFY = "## Verify\nWorktree: required\nRun the reproduction.\n";
const VERIFY_NO_WORKTREE = "## Verify\nRun the reproduction.\n";
const SEVERITY = "## Severity\n- 1-10: anything.\n";

const lens = (...sections: string[]) => ["# Sample lens\nAudits a sample; the other lens owns the rest.\n", ...sections].join("\n");

const BAD: { name: string; text: string; rule: Rule }[] = [
  { name: "a lens missing the ## Excluded heading", text: lens(hunts(3), VERIFY, SEVERITY), rule: "headings" },
  { name: "a lens holding ## Verify before ## Excluded", text: lens(hunts(3), VERIFY, EXCLUDED, SEVERITY), rule: "headings" },
  { name: "a lens still holding a ## Map signals section", text: lens(hunts(3), "## Map signals\nRank units by hits.\n", EXCLUDED, VERIFY, SEVERITY), rule: "headings" },
  { name: "a lens carrying 2 angles", text: lens(hunts(2), EXCLUDED, VERIFY, SEVERITY), rule: "angles" },
  { name: "a lens carrying 7 angles", text: lens(hunts(7), EXCLUDED, VERIFY, SEVERITY), rule: "angles" },
  { name: "a lens lacking the Worktree line", text: lens(hunts(3), EXCLUDED, VERIFY_NO_WORKTREE, SEVERITY), rule: "worktree" },
  { name: "a lens holding a bash block", text: lens(hunts(3), EXCLUDED_WITH_BASH, VERIFY, SEVERITY), rule: "bash" },
  { name: "a lens over 8000 bytes", text: `${lens(hunts(3), EXCLUDED, VERIFY, SEVERITY)}\n${"a".repeat(MAX_BYTES)}\n`, rule: "size" },
];

for (const bad of BAD) {
  test(`${bad.name} breaks the ${bad.rule} rule and no other (a rule that never fires makes every lens check vacuous)`, () => {
    assert.deepEqual(rulesBroken(bad.text), [bad.rule]);
  });
}

test("a signals file holding prose and no bash block is flagged (a rule that never fires makes the signals check vacuous)", () => {
  assert.deepEqual(signalsProblems("# Sample lens map signals\nRank units by hits.\n"), ["no bash block"]);
});

test("a signals file holding a bash block passes", () => {
  assert.deepEqual(signalsProblems("# Sample lens map signals\nHits:\n```bash\ngit log -- <scope>\n```\n"), []);
});

const ALL_FILES = fs.readdirSync(LENSES).filter((name) => name.endsWith(".md")).sort();
const LENS_FILES = ALL_FILES.filter((name) => !name.endsWith(SIGNALS_SUFFIX));

for (const file of LENS_FILES) {
  test(`the lens file ${file} holds the lens shape: four headings in order, 3 to 6 angles, no bash block, a Worktree line, at most 8000 bytes`, () => {
    assert.deepEqual(lensProblems(fs.readFileSync(path.join(LENSES, file), "utf-8")), []);
  });

  const signals = file.replace(/\.md$/, SIGNALS_SUFFIX);
  test(`the lens file ${file} has its signals file ${signals} holding at least one bash block`, () => {
    const target = path.join(LENSES, signals);
    assert.ok(fs.existsSync(target), `${signals} is missing`);
    assert.deepEqual(signalsProblems(fs.readFileSync(target, "utf-8")), []);
  });
}

test("every signals file belongs to a lens file (an orphan signals file is never read)", () => {
  const orphans = ALL_FILES.filter((name) => name.endsWith(SIGNALS_SUFFIX)).filter(
    (name) => !LENS_FILES.includes(name.slice(0, -SIGNALS_SUFFIX.length) + ".md"),
  );
  assert.deepEqual(orphans, []);
});
