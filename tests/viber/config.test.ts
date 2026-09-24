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
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/config.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withGitRepo, withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/config.sh");

/** Every switch off and both directory keys at their default - what a project
 *  with no config file, and every unusable value, resolves to. */
const OFF = { adr: "false", memory: "false", rules: "false", qa: "false", cleanup: "false", "plain-plan-review": "false" };
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

test("no config file: every switch is off, both directories default, and the exit is still 0", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout.split("\n")[0], "# viber config (resolved)");
    assert.deepEqual(switches(result.stdout), OFF);
    assert.deepEqual(dirs(result.stdout), DEFAULT_DIRS);
  });
});

test("the group keys are printed dotted, so no reader can take one for a switch", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const printed = run(dir).stdout.trim().split("\n");
    assert.deepEqual(printed.slice(-4), [
      "directories.runs: _specs",
      "directories.specifications: specs",
      "tiers.min: haiku",
      "tiers.max: opus",
    ]);
  });
});

test("only `true` counts as on - false, a missing key, a commented-out line and a near-miss value are all off", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["adr: false", "# memory: true", "rules: truthy", "qa: yes", "cleanup: on", "extra: true", ""].join("\n"));

    const result = run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(switches(result.stdout), OFF);
  });
});

test("the seeded template turns every switch on, comments and case notwithstanding", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(
      dir,
      ["# viber switches", "adr: true  # the decisions worth keeping", "memory: TRUE", "rules: true", "qa: true", "cleanup: true", "plain-plan-review: true", ""].join("\n"),
    );

    const result = run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(switches(result.stdout), {
      adr: "true",
      memory: "true",
      rules: "true",
      qa: "true",
      cleanup: "true",
      "plain-plan-review": "true",
    });
  });
});

test("an indented `qa: true` under a group is not a column-0 switch, so it stays off", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["some_group:", "  qa: true", ""].join("\n"));

    const result = run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(switches(result.stdout), OFF);
  });
});

test("`memory: TRUE` at column 0 resolves to on - the value is matched in any letter case", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, "memory: TRUE\n");

    const result = run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(switches(result.stdout), { ...OFF, memory: "true" });
  });
});

test("`MEMORY: true` resolves to off - the key itself is matched case-sensitively", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, "MEMORY: true\n");

    const result = run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(switches(result.stdout), OFF);
  });
});

test("the shipped template is what setup seeds: five switches on, qa off, and both directories named", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const template = path.resolve(import.meta.dirname, "../../viber/skills/setup/templates/viber.yml");
    writeConfig(dir, fs.readFileSync(template, "utf-8"));

    const result = run(dir);
    assert.deepEqual(switches(result.stdout), {
      adr: "true",
      memory: "true",
      rules: "true",
      qa: "false",
      cleanup: "true",
      "plain-plan-review": "true",
    });
    assert.deepEqual(dirs(result.stdout), DEFAULT_DIRS);
    assert.deepEqual(tiers(result.stdout), DEFAULT_TIERS);
  });
});

test("the file is resolved against the repository root, so a session started in a subdirectory reads the same config", () => {
  withGitRepo((repo) => {
    writeConfig(repo.dir, `memory: true\n${group({ specifications: "archive" })}`);
    const nested = path.join(repo.dir, "src", "deep");
    fs.mkdirSync(nested, { recursive: true });

    const result = runScript(SUT, [], { cwd: nested, env: repo.env, shell: "bash" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(switches(result.stdout), { ...OFF, memory: "true" });
    assert.deepEqual(dirs(result.stdout), { runs: "_specs", specifications: "archive" });
  });
});

test("an unreadable or malformed config never fails the preload", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, "\u0000\u0001 not: yaml: at: all\n");

    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(switches(result.stdout), OFF);
    assert.deepEqual(dirs(result.stdout), DEFAULT_DIRS);
  });
});

// --- the directories group ---

test("a directory key takes the name it was given, extra indentation and a trailing comment notwithstanding", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(
      dir,
      ["directories:", "    runs: work-in-progress   # where an open run lives", "  specifications: docs_archive.v2", ""].join("\n"),
    );

    const result = run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(dirs(result.stdout), { runs: "work-in-progress", specifications: "docs_archive.v2" });
  });
});

test("the group is a contract: a same-named key at the top level is NOT this key", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, "runs: builds\nspecifications: archive\n");

    const result = run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(dirs(result.stdout), DEFAULT_DIRS);
  });
});

test("the group ends at the next top-level key, so an indented line below one is out of it", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["directories:", "  runs: builds", "qa: true", "  specifications: archive", ""].join("\n"));

    const result = run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(dirs(result.stdout), { runs: "builds", specifications: "specs" });
    assert.deepEqual(switches(result.stdout), { ...OFF, qa: "true" });
  });
});

test("a blank line and a column-0 comment leave the group open, because that is how it gets written", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(
      dir,
      ["directories:", "  runs: builds", "", "# where the archive lands", "  specifications: archive", ""].join("\n"),
    );

    assert.deepEqual(dirs(run(dir).stdout), { runs: "builds", specifications: "archive" });
  });
});

test("a value that is a path rather than a name is refused, and the default stands", () => {
  const refused = ["../escape", "/absolute", "a/b", "./here", ".", "..", "", "   ", "two;words", "quoted'name"];
  for (const value of refused) {
    withTempDir("p2p2-viber-", (dir) => {
      writeConfig(dir, group({ runs: value, specifications: value }));

      const result = run(dir);
      assert.equal(result.status, 0, `stderr for "${value}": ${result.stderr}`);
      assert.deepEqual(dirs(result.stdout), DEFAULT_DIRS, `"${value}" must not name a directory`);
    });
  }
});

test("a directory value is cut at the first space, the way a trailing comment is - the first word is the name", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, group({ runs: "work in progress" }));

    assert.deepEqual(dirs(run(dir).stdout), { runs: "work", specifications: "specs" });
  });
});

test("the first assignment inside the group wins, so a later duplicate cannot quietly override it", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["directories:", "  runs: first", "  runs: second", ""].join("\n"));

    assert.deepEqual(dirs(run(dir).stdout), { runs: "first", specifications: "specs" });
  });
});

test("a commented-out directory key is not an assignment, so the default stands", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["directories:", "  # runs: commented", "  specifications: kept", ""].join("\n"));

    assert.deepEqual(dirs(run(dir).stdout), { runs: "_specs", specifications: "kept" });
  });
});

// --- the tiers group ---

test("the tiers group narrows the range, case and a trailing comment notwithstanding", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["tiers:", "  min: Sonnet  # never haiku", "  max: sonnet", ""].join("\n"));

    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(tiers(result.stdout), { min: "sonnet", max: "sonnet" });
  });
});

test("fable is a tier above opus, reached only when the project names it", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["tiers:", "  min: sonnet", "  max: Fable", ""].join("\n"));

    assert.deepEqual(tiers(run(dir).stdout), { min: "sonnet", max: "fable" });
  });
});

test("an unknown tier falls back to that key's default alone", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["tiers:", "  min: sonnet", "  max: mythos", ""].join("\n"));

    assert.deepEqual(tiers(run(dir).stdout), { min: "sonnet", max: "opus" });
  });
});

test("fable as min above the default max is an inverted range, so both reset", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["tiers:", "  min: fable", ""].join("\n"));

    assert.deepEqual(tiers(run(dir).stdout), DEFAULT_TIERS);
  });
});

test("an inverted range resets both keys to the full range, so no dispatch is left without a model", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["tiers:", "  min: opus", "  max: haiku", ""].join("\n"));

    assert.deepEqual(tiers(run(dir).stdout), DEFAULT_TIERS);
  });
});

test("tier keys outside the tiers group are not tier keys", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["min: sonnet", "max: sonnet", group({ min: "sonnet" })].join("\n"));

    assert.deepEqual(tiers(run(dir).stdout), DEFAULT_TIERS);
  });
});

test("a CRLF config still yields its tiers (a stray CR is not part of the value)", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, "tiers:\r\n  min: sonnet\r\n  max: sonnet\r\n");

    assert.deepEqual(tiers(run(dir).stdout), { min: "sonnet", max: "sonnet" });
  });
});

test("cleanup is a switch like the other four and nothing about it is special", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, "cleanup: true\n");

    assert.deepEqual(switches(run(dir).stdout), { ...OFF, cleanup: "true" });
  });
});
