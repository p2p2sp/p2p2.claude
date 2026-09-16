/*
 * label.test.ts - proves label.sh's contract: `label.sh <args-block> <label>`
 * prints that label's value and nothing else, with CR stripped and both ends
 * trimmed; prints NOTHING (not even a newline) when the label is absent or its
 * value empty; and exits 0 in every one of those cases, because it runs as a
 * SKILL.md `!` preload where a non-zero exit aborts the whole fork load. A
 * wiring bug - wrong argument count, or a label outside [A-Za-z0-9_-]+ - is the
 * sole exit 1, with the message on stderr and stdout left clean.
 *
 * The three build reviewers each preload it six times (report / stage / since /
 * prior / decisions / notes), so the empty-output-on-absent-label case is what
 * their own "missing input <label>" check reads.
 *
 * Its parser lives in lib_label.sh, shared with resolve-input.sh - the last two
 * tests pin that shared behaviour, which is the whole reason the library exists:
 * before it, the reviewers' inline pipeline kept trailing whitespace that
 * resolve-input.sh trimmed, so one args block yielded two different values.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/label.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/label.sh");
const RESOLVE = path.resolve(import.meta.dirname, "../../superdev/scripts/resolve-input.sh");

/** The shape a build orchestrator actually dispatches. */
const BLOCK = [
  "plan: docs/.workflows/run/plan.md",
  "report: docs/.workflows/run/implementation/review-01.md",
  "stage: final",
  "since: 0a1b2c3",
  "prior: docs/.workflows/run/implementation/checkpoint-01.md",
  "notes: docs/.workflows/run/implementation",
  "",
].join("\n");

test("a present label prints its value and a single trailing newline", () => {
  const result = runScript(SUT, [BLOCK, "stage"]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "final\n");
  assert.equal(result.stderr, "");
});

test("each of the six reviewer labels resolves to its own value", () => {
  const expected: Record<string, string> = {
    report: "docs/.workflows/run/implementation/review-01.md\n",
    stage: "final\n",
    since: "0a1b2c3\n",
    prior: "docs/.workflows/run/implementation/checkpoint-01.md\n",
    decisions: "",
    notes: "docs/.workflows/run/implementation\n",
  };
  for (const [label, want] of Object.entries(expected)) {
    const result = runScript(SUT, [BLOCK, label]);
    assert.equal(result.status, 0, `${label} must exit 0`);
    assert.equal(result.stdout, want, `${label} value`);
  }
});

test("an absent label prints absolutely nothing and still exits 0 - a preload must never abort the fork load", () => {
  const result = runScript(SUT, [BLOCK, "decisions"]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("a label present with an empty value prints nothing, like an absent one", () => {
  const result = runScript(SUT, ["stage: final\nprior:\n", "prior"]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});

test("an empty args block prints nothing and exits 0", () => {
  const result = runScript(SUT, ["", "stage"]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});

test("leading and trailing whitespace around a value are both trimmed", () => {
  const result = runScript(SUT, ["   report:    docs/x.md   \n", "report"]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "docs/x.md\n");
});

test("a CRLF args block yields the same value as an LF one", () => {
  const lf = runScript(SUT, ["stage: final\nsince: abc\n", "since"]);
  const crlf = runScript(SUT, ["stage: final\r\nsince: abc\r\n", "since"]);
  assert.equal(crlf.status, 0);
  assert.equal(crlf.stdout, lf.stdout);
  assert.equal(crlf.stdout, "abc\n");
});

test("a value containing spaces is kept whole", () => {
  const result = runScript(SUT, ["report: docs/my run/review 01.md\n", "report"]);
  assert.equal(result.stdout, "docs/my run/review 01.md\n");
});

test("the first occurrence wins when a label repeats", () => {
  const result = runScript(SUT, ["stage: checkpoint\nstage: final\n", "stage"]);
  assert.equal(result.stdout, "checkpoint\n");
});

test("a label that is a prefix of another does not match it", () => {
  const result = runScript(SUT, ["prior-report: wrong.md\nprior: right.md\n", "prior"]);
  assert.equal(result.stdout, "right.md\n");
});

test("the args block's last line needs no trailing newline", () => {
  const result = runScript(SUT, ["stage: final\nsince: abc", "since"]);
  assert.equal(result.stdout, "abc\n");
});

test("a line that only mentions the label mid-sentence is not a label line", () => {
  const result = runScript(SUT, ["read the stage: note first\nstage: final\n", "stage"]);
  assert.equal(result.stdout, "final\n");
});

test("no label argument is a wiring bug: exit 1, usage on stderr, stdout clean", () => {
  const result = runScript(SUT, [BLOCK]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /usage: label\.sh <args-block> <label>/);
});

test("more than two arguments is the same wiring bug", () => {
  const result = runScript(SUT, [BLOCK, "stage", "since"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /usage: label\.sh/);
});

test("a label carrying a sed metacharacter is rejected instead of rewriting the expression", () => {
  for (const bad of ["a/b", "sta.ge", "sta*ge", "[stage]", "stage:extra"]) {
    const result = runScript(SUT, [BLOCK, bad]);
    assert.equal(result.status, 1, `${bad} must be rejected`);
    assert.equal(result.stdout, "", `${bad} must print no value`);
    assert.match(result.stderr, /invalid label/);
  }
});

test("an empty label string is rejected, not treated as a match-anything pattern", () => {
  const result = runScript(SUT, [BLOCK, ""]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
});

test("label.sh and resolve-input.sh agree on a value with trailing whitespace - the drift the shared library removed", () => {
  withTempDir("p2p2-label-", (dir) => {
    fs.writeFileSync(path.join(dir, "plan.md"), "body\n");
    // The trailing spaces are the point: the reviewers' old inline pipeline kept
    // them, so its path string differed from the one resolve-input.sh resolved.
    const block = "plan: plan.md   \n";
    const viaLabel = runScript(SUT, [block, "plan"], { cwd: dir });
    const viaResolve = runScript(RESOLVE, [block, "plan"], { cwd: dir });
    assert.equal(viaLabel.stdout, "plan.md\n");
    // resolve-input.sh echoes the value as given in its heading - identical only
    // because both trim through label_value.
    assert.equal(viaResolve.status, 0);
    assert.equal(viaResolve.stdout, "## plan (plan.md)\n\nbody\n\n");
  });
});

test("every reviewer SKILL.md preloads label.sh and pre-approves it in allowed-tools", () => {
  const reviewers = [
    "superbuild-reviewer-spec",
    "superbuild-reviewer-change",
    "simplebuild-reviewer",
  ];
  for (const name of reviewers) {
    const file = path.resolve(import.meta.dirname, `../../superdev/skills/${name}/SKILL.md`);
    const text = fs.readFileSync(file, "utf8");
    assert.match(
      text,
      /^allowed-tools: .*Bash\(\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/label\.sh:\*\)/m,
      `${name}: a bare Bash entry does not pre-approve a preload - the pattern entry is required`,
    );
    for (const label of ["report", "stage", "since", "prior", "decisions", "notes"]) {
      assert.ok(
        text.includes(`!\`"\${CLAUDE_PLUGIN_ROOT}/scripts/label.sh" "$ARGUMENTS" ${label}\``),
        `${name}: missing the ${label} preload`,
      );
    }
    assert.doesNotMatch(text, /printf '%s' "\$ARGUMENTS"/, `${name}: an inline pipeline came back`);
  }
});
