/*
 * config.test.ts - proves viber/scripts/config.sh's contract: it resolves the
 * four `.claude/viber.yml` switches into the block a skill preloads.
 *
 * Two properties carry the whole design. It is FAIL-OPEN and always exits 0,
 * because it runs as a `!` preload where a non-zero exit aborts the entire skill
 * load - a project with no config file must simply build with every layer off.
 * And it resolves the file against the REPOSITORY ROOT, not the caller's cwd: a
 * preload runs wherever the session started, so a session opened in a
 * subdirectory would otherwise silently report every switch off and turn off
 * every layer the user configured.
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

function run(dir: string, env: Record<string, string> = {}) {
  return runScript(SUT, [], { cwd: dir, env, shell: "bash" });
}

function writeConfig(root: string, body: string): void {
  fs.mkdirSync(path.join(root, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(root, ".claude", "viber.yml"), body);
}

/** The four switches, in the fixed order the script prints them. */
function switches(stdout: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of stdout.trim().split("\n").slice(1)) {
    const [key, value] = line.split(":").map((s) => s.trim());
    if (key) out[key] = value ?? "";
  }
  return out;
}

test("no config file: every switch is off and the exit is still 0", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout.split("\n")[0], "# viber config (resolved)");
    assert.deepEqual(switches(result.stdout), { adr: "false", memory: "false", rules: "false", qa: "false" });
  });
});

test("only `true` counts as on - false, a missing key, a commented-out line and a near-miss value are all off", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["adr: false", "# memory: true", "rules: truthy", "qa: yes", "extra: true", ""].join("\n"));

    const result = run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(switches(result.stdout), { adr: "false", memory: "false", rules: "false", qa: "false" });
  });
});

test("the seeded template turns all four on, comments, indentation and case notwithstanding", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, ["# viber switches", "adr: true  # the decisions worth keeping", "  memory: TRUE", "rules: true", "qa: true", ""].join("\n"));

    const result = run(dir);
    assert.equal(result.status, 0);
    assert.deepEqual(switches(result.stdout), { adr: "true", memory: "true", rules: "true", qa: "true" });
  });
});

test("the shipped template is what setup seeds, and it turns all four on", () => {
  withTempDir("p2p2-viber-", (dir) => {
    const template = path.resolve(import.meta.dirname, "../../viber/skills/setup/templates/viber.yml");
    writeConfig(dir, fs.readFileSync(template, "utf-8"));

    assert.deepEqual(switches(run(dir).stdout), { adr: "true", memory: "true", rules: "true", qa: "true" });
  });
});

test("the file is resolved against the repository root, so a session started in a subdirectory reads the same switches", () => {
  withGitRepo((repo) => {
    writeConfig(repo.dir, "memory: true\n");
    const nested = path.join(repo.dir, "src", "deep");
    fs.mkdirSync(nested, { recursive: true });

    const result = runScript(SUT, [], { cwd: nested, env: repo.env, shell: "bash" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(switches(result.stdout), { adr: "false", memory: "true", rules: "false", qa: "false" });
  });
});

test("an unreadable or malformed config never fails the preload", () => {
  withTempDir("p2p2-viber-", (dir) => {
    writeConfig(dir, "\u0000\u0001 not: yaml: at: all\n");

    const result = run(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(switches(result.stdout), { adr: "false", memory: "false", rules: "false", qa: "false" });
  });
});
