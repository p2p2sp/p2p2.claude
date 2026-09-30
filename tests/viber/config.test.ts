/*
 * config.test.ts - proves viber/scripts/config.sh's contract: it resolves the
 * `.claude/viber.yml` keys into the block a skill preloads.
 *
 * Two properties carry the whole design. It is FAIL-OPEN and always exits 0,
 * because it runs as a `!` preload where a non-zero exit aborts the entire skill
 * load - a project with no config file must simply build with every layer off.
 * And it resolves the file against the REPOSITORY ROOT, not the caller's cwd: a
 * preload runs wherever the session started, so a session opened in a
 * subdirectory would otherwise silently report every switch off and turn off
 * every layer the user configured.
 *
 * Two kinds of key, told apart by WHERE they sit. A SWITCH is a top-level key
 * and is on only when it literally says `true`. A DIRECTORY key lives inside the
 * `directories:` group and names one directory under docs/, never a path. The
 * group is a contract rather than a presentation: a same-named key outside it is
 * ignored, which is the whole reason it exists - `runs` alone reads like a count
 * and `specs` like a switch. And the value is sanitized, because the invariant
 * that "docs/ is the one home for persisted knowledge" rests on it: a slash, a
 * traversal or an absolute path leaves the default standing.
 *
 * `--branching` prints the branching report instead of the block: the mode, the
 * valid work entries and issue type mappings in file order, then one `error:`
 * line per configuration problem - still exit 0 whatever the file holds.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/config.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withGitRepo, withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/config.sh");

/** Every switch off and both directory keys at their default - what a project
 *  with no config file, and every unusable value, resolves to. */
const OFF = { adr: "false", memory: "false", rules: "false", qa: "false", cleanup: "false", "final-review": "false", "plain-plan-review": "false", issues: "false", "fast-path": "false", "baseline-tests": "false" };
const DEFAULT_DIRS = { runs: "_specs", specifications: "specs" };

function run(dir: string, env: Record<string, string> = {}) {
  return runScript(SUT, [], { cwd: dir, env, shell: "bash" });
}

function writeConfig(root: string, body: string): void {
  fs.mkdirSync(path.join(root, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(root, ".claude", "viber.yml"), body);
}

/** The `directories:` group as the template writes it. */
function group(entries: Record<string, string>): string {
  return ["directories:", ...Object.entries(entries).map(([key, value]) => `  ${key}: ${value}`), ""].join("\n");
}

/** Every key the script printed, in the fixed order it prints them. */
function config(stdout: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of stdout.trim().split("\n").slice(1)) {
    const [key, value] = line.split(":").map((s) => s.trim());
    if (key) out[key] = value ?? "";
  }
  return out;
}

/** The switches alone, so a case about a switch need not restate the two
 *  directory names. */
function switches(stdout: string): Record<string, string> {
  const all = config(stdout);
  delete all["directories.runs"];
  delete all["directories.specifications"];
  delete all["tiers.min"];
  delete all["tiers.max"];
  delete all["branching.mode"];
  return all;
}

/** The two tier keys alone, under their short names. */
function tiers(stdout: string): Record<string, string> {
  const all = config(stdout);
  return { min: all["tiers.min"], max: all["tiers.max"] };
}

const DEFAULT_TIERS = { min: "haiku", max: "opus" };

/** The two directory keys alone, under their short names. The script prints
 *  them dotted, which is itself asserted below. */
function dirs(stdout: string): Record<string, string> {
  const all = config(stdout);
  return { runs: all["directories.runs"], specifications: all["directories.specifications"] };
}

test("no config file: every switch is off, both directories default, and the exit is still 0", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    const result = await run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout.split("\n")[0], "# viber config (resolved)");
    assert.deepEqual(switches(result.stdout), OFF);
    assert.deepEqual(dirs(result.stdout), DEFAULT_DIRS);
  });
});

test("the group keys are printed dotted, so no reader can take one for a switch", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    const printed = (await run(dir)).stdout.trim().split("\n");
    assert.deepEqual(printed.slice(-5, -1), [
      "directories.runs: _specs",
      "directories.specifications: specs",
      "tiers.min: haiku",
      "tiers.max: opus",
    ]);
  });
});

test("`issues` prints directly after `plain-plan-review`, in the header's fixed order", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, "issues: true\n");

    const printed = (await run(dir)).stdout.trim().split("\n");
    const ppr = printed.indexOf("plain-plan-review: false");
    assert.equal(ppr >= 0, true, `plain-plan-review line missing: ${printed.join(" | ")}`);
    assert.equal(printed[ppr + 1], "issues: true");
  });
});

for (const value of ["true", "TRUE", "True"]) {
  test(`\`fast-path: ${value}\` resolves to true, matched in any letter case`, async () => {
    await withTempDir("p2p2-viber-", async (dir) => {
      writeConfig(dir, `fast-path: ${value}\n`);

      assert.deepEqual(switches((await run(dir)).stdout), { ...OFF, "fast-path": "true" });
    });
  });
}

for (const [label, body] of [
  ["the key absent", "adr: true\n"],
  ["another value", "adr: true\nfast-path: enabled\n"],
  ["the value false", "fast-path: false\n"],
] as const) {
  test(`a config with ${label} resolves \`fast-path\` to false`, async () => {
    await withTempDir("p2p2-viber-", async (dir) => {
      writeConfig(dir, body);

      assert.equal(switches((await run(dir)).stdout)["fast-path"], "false");
    });
  });
}

test("`fast-path` prints directly after the `issues` line, in the header's fixed order", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, "fast-path: true\n");

    const printed = (await run(dir)).stdout.trim().split("\n");
    const issuesIdx = printed.indexOf("issues: false");
    assert.equal(issuesIdx >= 0, true, `issues line missing: ${printed.join(" | ")}`);
    assert.equal(printed[issuesIdx + 1], "fast-path: true");
  });
});

for (const value of ["true", "TRUE", "True"]) {
  test(`\`baseline-tests: ${value}\` resolves to true, matched in any letter case`, async () => {
    await withTempDir("p2p2-viber-", async (dir) => {
      writeConfig(dir, `baseline-tests: ${value}\n`);

      assert.deepEqual(switches((await run(dir)).stdout), { ...OFF, "baseline-tests": "true" });
    });
  });
}

for (const [label, body] of [
  ["the key absent", "adr: true\n"],
  ["another value", "adr: true\nbaseline-tests: enabled\n"],
  ["the value false", "baseline-tests: false\n"],
] as const) {
  test(`a config with ${label} resolves \`baseline-tests\` to false`, async () => {
    await withTempDir("p2p2-viber-", async (dir) => {
      writeConfig(dir, body);

      assert.equal(config((await run(dir)).stdout)["baseline-tests"], "false");
    });
  });
}

test("`baseline-tests` prints directly after the `fast-path` line, in the header's fixed order", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, "baseline-tests: true\n");

    const printed = (await run(dir)).stdout.trim().split("\n");
    const fastPathIdx = printed.indexOf("fast-path: false");
    assert.equal(fastPathIdx >= 0, true, `fast-path line missing: ${printed.join(" | ")}`);
    assert.equal(printed[fastPathIdx + 1], "baseline-tests: true");
  });
});

test("only `true` counts as on - false, a missing key, a commented-out line and a near-miss value are all off", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["adr: false", "# memory: true", "rules: truthy", "qa: yes", "cleanup: on", "extra: true", ""].join("\n"));

    const result = await run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(switches(result.stdout), OFF);
  });
});

test("the seeded template turns every switch on, comments and case notwithstanding", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(
      dir,
      ["# viber switches", "adr: true  # the decisions worth keeping", "memory: TRUE", "rules: true", "qa: true", "cleanup: true", "plain-plan-review: true", "issues: true", ""].join("\n"),
    );

    const result = await run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(switches(result.stdout), {
      adr: "true",
      memory: "true",
      rules: "true",
      qa: "true",
      cleanup: "true",
      "final-review": "false",
      "plain-plan-review": "true",
      issues: "true",
      "fast-path": "false",
      "baseline-tests": "false",
    });
  });
});

test("an indented `qa: true` under a group is not a column-0 switch, so it stays off", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["some_group:", "  qa: true", ""].join("\n"));

    const result = await run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(switches(result.stdout), OFF);
  });
});

test("`memory: TRUE` at column 0 resolves to on - the value is matched in any letter case", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, "memory: TRUE\n");

    const result = await run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(switches(result.stdout), { ...OFF, memory: "true" });
  });
});

test("`MEMORY: true` resolves to off - the key itself is matched case-sensitively", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, "MEMORY: true\n");

    const result = await run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(switches(result.stdout), OFF);
  });
});

test("the shipped template is what setup seeds: seven switches on, qa, issues and baseline-tests off, and both directories named", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    const template = path.resolve(import.meta.dirname, "../../viber/skills/setup/templates/viber.yml");
    writeConfig(dir, fs.readFileSync(template, "utf-8"));

    const result = await run(dir);
    assert.deepEqual(switches(result.stdout), {
      adr: "true",
      memory: "true",
      rules: "true",
      qa: "false",
      cleanup: "true",
      "final-review": "true",
      "plain-plan-review": "true",
      issues: "false",
      "fast-path": "true",
      "baseline-tests": "false",
    });
    assert.deepEqual(dirs(result.stdout), DEFAULT_DIRS);
    assert.deepEqual(tiers(result.stdout), DEFAULT_TIERS);
  });
});

test("the file is resolved against the repository root, so a session started in a subdirectory reads the same config", async () => {
  await withGitRepo(async (repo) => {
    writeConfig(repo.dir, `memory: true\n${group({ specifications: "archive" })}`);
    const nested = path.join(repo.dir, "src", "deep");
    fs.mkdirSync(nested, { recursive: true });

    const result = await runScript(SUT, [], { cwd: nested, env: repo.env, shell: "bash" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(switches(result.stdout), { ...OFF, memory: "true" });
    assert.deepEqual(dirs(result.stdout), { runs: "_specs", specifications: "archive" });
  });
});

test("an unreadable or malformed config never fails the preload", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, "\u0000\u0001 not: yaml: at: all\n");

    const result = await run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(switches(result.stdout), OFF);
    assert.deepEqual(dirs(result.stdout), DEFAULT_DIRS);
  });
});

// --- the directories group ---

test("a directory key takes the name it was given, extra indentation and a trailing comment notwithstanding", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(
      dir,
      ["directories:", "    runs: work-in-progress   # where an open run lives", "  specifications: docs_archive.v2", ""].join("\n"),
    );

    const result = await run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(dirs(result.stdout), { runs: "work-in-progress", specifications: "docs_archive.v2" });
  });
});

test("the group is a contract: a same-named key at the top level is NOT this key", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, "runs: builds\nspecifications: archive\n");

    const result = await run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(dirs(result.stdout), DEFAULT_DIRS);
  });
});

test("the group ends at the next top-level key, so an indented line below one is out of it", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["directories:", "  runs: builds", "qa: true", "  specifications: archive", ""].join("\n"));

    const result = await run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(dirs(result.stdout), { runs: "builds", specifications: "specs" });
    assert.deepEqual(switches(result.stdout), { ...OFF, qa: "true" });
  });
});

test("a blank line and a column-0 comment leave the group open, because that is how it gets written", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(
      dir,
      ["directories:", "  runs: builds", "", "# where the archive lands", "  specifications: archive", ""].join("\n"),
    );

    assert.deepEqual(dirs((await run(dir)).stdout), { runs: "builds", specifications: "archive" });
  });
});

test("a value that is a path rather than a name is refused, and the default stands", async () => {
  const refused = ["../escape", "/absolute", "a/b", "./here", ".", "..", "", "   ", "two;words", "quoted'name"];
  for (const value of refused) {
    await withTempDir("p2p2-viber-", async (dir) => {
      writeConfig(dir, group({ runs: value, specifications: value }));

      const result = await run(dir);
      assert.equal(result.status, 0, `stderr for "${value}": ${result.stderr}`);
      assert.deepEqual(dirs(result.stdout), DEFAULT_DIRS, `"${value}" must not name a directory`);
    });
  }
});

test("a directory value is cut at the first space, the way a trailing comment is - the first word is the name", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, group({ runs: "work in progress" }));

    assert.deepEqual(dirs((await run(dir)).stdout), { runs: "work", specifications: "specs" });
  });
});

test("the first assignment inside the group wins, so a later duplicate cannot quietly override it", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["directories:", "  runs: first", "  runs: second", ""].join("\n"));

    assert.deepEqual(dirs((await run(dir)).stdout), { runs: "first", specifications: "specs" });
  });
});

test("a commented-out directory key is not an assignment, so the default stands", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["directories:", "  # runs: commented", "  specifications: kept", ""].join("\n"));

    assert.deepEqual(dirs((await run(dir)).stdout), { runs: "_specs", specifications: "kept" });
  });
});

// --- the tiers group ---

test("the tiers group narrows the range, case and a trailing comment notwithstanding", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["tiers:", "  min: Sonnet  # never haiku", "  max: sonnet", ""].join("\n"));

    const result = await run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(tiers(result.stdout), { min: "sonnet", max: "sonnet" });
  });
});

test("fable is a tier above opus, reached only when the project names it", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["tiers:", "  min: sonnet", "  max: Fable", ""].join("\n"));

    assert.deepEqual(tiers((await run(dir)).stdout), { min: "sonnet", max: "fable" });
  });
});

test("an unknown tier falls back to that key's default alone", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["tiers:", "  min: sonnet", "  max: mythos", ""].join("\n"));

    assert.deepEqual(tiers((await run(dir)).stdout), { min: "sonnet", max: "opus" });
  });
});

test("fable as min above the default max is an inverted range, so both reset", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["tiers:", "  min: fable", ""].join("\n"));

    assert.deepEqual(tiers((await run(dir)).stdout), DEFAULT_TIERS);
  });
});

test("an inverted range resets both keys to the full range, so no dispatch is left without a model", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["tiers:", "  min: opus", "  max: haiku", ""].join("\n"));

    assert.deepEqual(tiers((await run(dir)).stdout), DEFAULT_TIERS);
  });
});

test("tier keys outside the tiers group are not tier keys", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["min: sonnet", "max: sonnet", group({ min: "sonnet" })].join("\n"));

    assert.deepEqual(tiers((await run(dir)).stdout), DEFAULT_TIERS);
  });
});

test("a CRLF config still yields its tiers (a stray CR is not part of the value)", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, "tiers:\r\n  min: sonnet\r\n  max: sonnet\r\n");

    assert.deepEqual(tiers((await run(dir)).stdout), { min: "sonnet", max: "sonnet" });
  });
});

// --- the branching group ---

/** The one branching line of the block, the last line the script prints. */
function branching(stdout: string): string {
  return stdout.trim().split("\n").slice(-1)[0];
}

test("no config file: the output ends with branching.mode: off, right after the tiers", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    const result = await run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(result.stdout.trim().split("\n").slice(-2), ["tiers.max: opus", "branching.mode: off"]);
  });
});

test("the branching group gives the block its mode alone, a mixed-case mode lowered and a trailing comment dropped", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["branching:", "  mode: Required  # every run on its own branch", "  work:", "    fix:", "      base: release/2.x", "      name: 'fix/{slug}'", "      target: release/2.x", ""].join("\n"));

    const result = await run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(branching(result.stdout), "branching.mode: required");
  });
});

test("no config file: the block names only the branching mode, no branching.base or branching.name line (a skill reads its branch from the work entries)", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    const result = await run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const printed = result.stdout.trim().split("\n");
    assert.deepEqual(printed.filter((line) => line.startsWith("branching.")), ["branching.mode: off"]);
    assert.equal(printed.at(-1), "branching.mode: off");
  });
});

for (const [label, body] of [
  ["the flat keys", ["branching:", "  mode: allowed", "  base: develop", "  name: 'feature/{slug}'", ""].join("\n")],
  ["a work entry", ["branching:", "  mode: allowed", "  work:", "    feature:", "      base: develop", "      name: 'feature/{slug}'", "      target: develop", ""].join("\n")],
]) {
  test(`a file holding ${label}: the block names only the branching mode, no branching.base or branching.name line (a skill reads its branch from the work entries)`, async () => {
    await withTempDir("p2p2-viber-", async (dir) => {
      writeConfig(dir, body);

      const result = await run(dir);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const printed = result.stdout.trim().split("\n");
      assert.deepEqual(printed.filter((line) => line.startsWith("branching.")), ["branching.mode: allowed"]);
      assert.equal(printed.at(-1), "branching.mode: allowed");
    });
  });
}

for (const mode of ["on", "true", "gitflow", `"allowed"`]) {
  test(`an unknown mode ${mode} resolves to off (only off, allowed and required are modes)`, async () => {
    await withTempDir("p2p2-viber-", async (dir) => {
      writeConfig(dir, ["branching:", `  mode: ${mode}`, ""].join("\n"));

      assert.equal(branching((await run(dir)).stdout), "branching.mode: off");
    });
  });
}

test("branching keys outside the branching group are not branching keys", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["mode: required", "base: develop", group({ name: "feat/{slug}" })].join("\n"));

    assert.equal(branching((await run(dir)).stdout), "branching.mode: off");
  });
});

test("cleanup is a switch like the other four and nothing about it is special", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, "cleanup: true\n");

    assert.deepEqual(switches((await run(dir)).stdout), { ...OFF, cleanup: "true" });
  });
});

test("`final-review: true` resolves to true, matched in any letter case", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, "final-review: TRUE\n");

    assert.deepEqual(switches((await run(dir)).stdout), { ...OFF, "final-review": "true" });
  });
});

test("a config without the `final-review` key, or with any other value, resolves to false", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["adr: true", "final-review: enabled", ""].join("\n"));

    assert.deepEqual(switches((await run(dir)).stdout), { ...OFF, adr: "true" });
  });
});

test("`final-review` prints directly after the `cleanup` line, in the header's fixed order", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, "final-review: true\n");

    const printed = (await run(dir)).stdout.trim().split("\n");
    const cleanupIdx = printed.indexOf("cleanup: false");
    assert.equal(cleanupIdx >= 0, true, `cleanup line missing: ${printed.join(" | ")}`);
    assert.equal(printed[cleanupIdx + 1], "final-review: true");
  });
});

// --- config.sh --branching: work entries and issue type mappings ---

function runBranching(dir: string) {
  return runScript(SUT, ["--branching"], { cwd: dir, shell: "bash" });
}

/** Every line `--branching` printed, the exit asserted 0 first: no input may break the preload. */
async function report(dir: string): Promise<string[]> {
  const result = await runBranching(dir);
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  return result.stdout.trim().split("\n");
}

test("--branching with no config file prints only the mode, off, and exits 0", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    assert.deepEqual(await report(dir), ["mode: off"]);
  });
});

/** A valid GitFlow-shaped group: its mappings written BEFORE its work entries, a quoted issue type holding a space. */
const GITFLOW = [
  "branching:",
  "  mode: Required  # every run on its own branch",
  "  issue-type-mappings:",
  "    Bug: hotfix",
  '    "Feature Request": feature',
  "    Feature: feature",
  "  work:",
  "    feature:",
  "      base: develop",
  "      name: 'feature/{issue-number}-{slug}'",
  "      target: develop",
  "    hotfix:",
  "      base: main",
  '      name: "hotfix/{slug}"',
  "      target: main",
  "qa: true",
  "",
];

test("--branching prints the mode, then every valid work entry and every mapping in file order, with no error line", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, GITFLOW.join("\n"));

    assert.deepEqual(await report(dir), [
      "mode: required",
      "entry: feature | base: develop | name: feature/{issue-number}-{slug} | target: develop",
      "entry: hotfix | base: main | name: hotfix/{slug} | target: main",
      "map: Bug | hotfix",
      "map: Feature Request | feature",
      "map: Feature | feature",
    ]);
  });
});

const LEGACY = "error: branching.base and branching.name are no longer read - move them into a branching.work entry";

for (const legacy of ["base: develop", "name: 'feature/{issue}-{slug}'"]) {
  test(`--branching refuses the flat ${legacy.split(":")[0]} directly under branching: with the move message, the entries still printed`, async () => {
    await withTempDir("p2p2-viber-", async (dir) => {
      writeConfig(dir, ["branching:", "  mode: allowed", `  ${legacy}`, "  work:", "    fix:", "      base: main", "      name: fix/{slug}", "      target: main", ""].join("\n"));

      assert.deepEqual(await report(dir), ["mode: allowed", "entry: fix | base: main | name: fix/{slug} | target: main", LEGACY]);
    });
  });
}

/** One `fix` entry beside a valid `feature` one, its three fields as given (a null field is left out). */
function withFix(fields: { base: string | null; name: string | null; target: string | null }): string {
  const fix = Object.entries(fields)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `      ${key}: ${value}`);
  return ["branching:", "  mode: allowed", "  work:", "    feature:", "      base: main", "      name: feat/{slug}", "      target: main", "    fix:", ...fix, ""].join("\n");
}

const FEATURE = "entry: feature | base: main | name: feat/{slug} | target: main";

test("--branching drops an entry whose name uses the old {issue} placeholder and says it is now {issue-number}", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, withFix({ base: "main", name: "'fix/{issue}-{slug}'", target: "main" }));

    assert.deepEqual(await report(dir), ["mode: allowed", FEATURE, "error: work entry fix: {issue} is now {issue-number}"]);
  });
});

for (const missing of ["base", "name", "target"] as const) {
  test(`--branching drops an entry missing its ${missing} and names the missing field`, async () => {
    await withTempDir("p2p2-viber-", async (dir) => {
      writeConfig(dir, withFix({ base: "main", name: "fix/{slug}", target: "main", [missing]: null }));

      assert.deepEqual(await report(dir), ["mode: allowed", FEATURE, `error: work entry fix: missing ${missing}`]);
    });
  });
}

const INVALID: Array<[string, { base: string; name: string; target: string }, string]> = [
  ["a base read as an option", { base: "-main", name: "fix/{slug}", target: "main" }, "invalid base: -main"],
  ["an absolute base", { base: "/main", name: "fix/{slug}", target: "main" }, "invalid base: /main"],
  ["a base holding a range", { base: "main..develop", name: "fix/{slug}", target: "main" }, "invalid base: main..develop"],
  ["a target with a shell metacharacter", { base: "main", name: "fix/{slug}", target: "rel;ease" }, "invalid target: rel;ease"],
  ["a target read as an option", { base: "main", name: "fix/{slug}", target: "-x" }, "invalid target: -x"],
  ["a name with a variable", { base: "main", name: "fix/$USER", target: "main" }, "invalid name: fix/$USER"],
  ["a name with a tilde", { base: "main", name: "'fix/{slug}~1'", target: "main" }, "invalid name: fix/{slug}~1"],
];

for (const [label, fields, reason] of INVALID) {
  test(`--branching drops an entry with ${label} and names the field and its value`, async () => {
    await withTempDir("p2p2-viber-", async (dir) => {
      writeConfig(dir, withFix(fields));

      assert.deepEqual(await report(dir), ["mode: allowed", FEATURE, `error: work entry fix: ${reason}`]);
    });
  });
}

test("--branching drops an entry whose key is not a plain name", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["branching:", "  work:", "    fix;rm:", "      base: main", "      name: fix/{slug}", "      target: main", ""].join("\n"));

    assert.deepEqual(await report(dir), ["mode: off", "error: work entry fix;rm: invalid key: fix;rm"]);
  });
});

test("--branching drops a mapping naming no work entry, and one naming a dropped entry, each with its own line", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(
      dir,
      [withFix({ base: "main", name: null, target: "main" }), "  issue-type-mappings:", "    Feature: feature", "    Bug: fix", "    Task: chore", ""].join("\n"),
    );

    assert.deepEqual(await report(dir), [
      "mode: allowed",
      FEATURE,
      "map: Feature | feature",
      "error: work entry fix: missing name",
      "error: issue-type-mappings: Bug names no work entry: fix",
      "error: issue-type-mappings: Task names no work entry: chore",
    ]);
  });
});

for (const [mode, printed] of [["allowed", "allowed"], ["REQUIRED", "required"]]) {
  test(`--branching under mode ${mode} with no valid work entry says so`, async () => {
    await withTempDir("p2p2-viber-", async (dir) => {
      writeConfig(dir, ["branching:", `  mode: ${mode}`, "  work:", "    fix:", "      base: main", ""].join("\n"));

      assert.deepEqual(await report(dir), [
        `mode: ${printed}`,
        "error: work entry fix: missing name",
        "error: work entry fix: missing target",
        "error: no valid branching.work entry",
      ]);
    });
  });
}

test("--branching reads a CRLF config the same way (a stray CR is not part of any value)", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, GITFLOW.join("\r\n"));

    assert.deepEqual(await report(dir), [
      "mode: required",
      "entry: feature | base: develop | name: feature/{issue-number}-{slug} | target: develop",
      "entry: hotfix | base: main | name: hotfix/{slug} | target: main",
      "map: Bug | hotfix",
      "map: Feature Request | feature",
      "map: Feature | feature",
    ]);
  });
});

test("--branching reads no work entry outside the branching group", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, ["branching:", "  mode: allowed", "qa: true", "  work:", "    fix:", "      base: main", "      name: fix/{slug}", "      target: main", ""].join("\n"));

    assert.deepEqual(await report(dir), ["mode: allowed", "error: no valid branching.work entry"]);
  });
});

test("--branching over a malformed config still exits 0 with the mode off", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    writeConfig(dir, "\u0000\u0001 not: yaml: at: all\n");

    assert.deepEqual(await report(dir), ["mode: off"]);
  });
});

for (const mode of ["off", "gitflow"]) {
  test(`--branching under mode ${mode} asks for no work entry (only a mode other than off needs one)`, async () => {
    await withTempDir("p2p2-viber-", async (dir) => {
      writeConfig(dir, ["branching:", `  mode: ${mode}`, ""].join("\n"));

      assert.deepEqual(await report(dir), ["mode: off"]);
    });
  });
}
