/*
 * switch-text.test.ts - proves viber/scripts/switch-text.sh's contract: it
 * resolves one `.claude/viber.yml` key through config.sh and prints the skill
 * fragment named after that key's value, so a loaded skill carries only the
 * instructions of its active configuration.
 *
 * It runs as a `!` preload, so every data condition - a missing fragment, an
 * unknown key, a bad name, a missing argument - prints nothing and still exits
 * 0: a non-zero exit would abort the whole skill load. The fragment is printed
 * verbatim apart from its two root placeholders, which a preload's output never
 * gets substituted by Claude Code, so the script expands them itself.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/switch-text.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";
import { withGitRepo, type GitRepo } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/switch-text.sh");

/** The skill directory every case hands the script: `<repo>/plugin/skills/demo`,
 *  so the plugin root it derives is `<repo>/plugin`. */
function skillDir(repo: GitRepo): string {
  return path.join(repo.dir, "plugin", "skills", "demo");
}

function writeConfig(repo: GitRepo, body: string): void {
  fs.mkdirSync(path.join(repo.dir, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(repo.dir, ".claude", "viber.yml"), body);
}

function writeFragment(repo: GitRepo, file: string, body: string): void {
  const dir = path.join(skillDir(repo), "fragments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), body);
}

function run(repo: GitRepo, args: string[], cwd: string = repo.dir, shell: Shell = "bash"): RunResult {
  return runScript(SUT, args, { cwd, env: repo.env, shell });
}

test("a true switch prints its .true.md fragment, byte for byte", () => {
  withGitRepo((repo) => {
    writeConfig(repo, "adr: true\n");
    writeFragment(repo, "step.true.md", "ADR on.\n\nSecond line.\n");
    writeFragment(repo, "step.false.md", "ADR off.\n");

    const result = run(repo, ["adr", skillDir(repo), "step"]);

    assert.deepEqual([result.status, result.stdout], [0, "ADR on.\n\nSecond line.\n"]);
  });
});

for (const [label, config] of [
  ["a false switch", "memory: false\n"],
  ["an absent switch", "adr: true\n"],
] as const) {
  test(`${label} prints the .false.md fragment (a disabled state that does something still gets its text)`, () => {
    withGitRepo((repo) => {
      writeConfig(repo, config);
      writeFragment(repo, "step.true.md", "Memory on.\n");
      writeFragment(repo, "step.false.md", "Memory off.\n");

      const result = run(repo, ["memory", skillDir(repo), "step"]);

      assert.deepEqual([result.status, result.stdout], [0, "Memory off.\n"]);
    });
  });
}

for (const [config, mode] of [
  ["branching:\n  mode: required\n", "required"],
  ["branching:\n  mode: Allowed\n", "allowed"],
  ["", "off"],
] as const) {
  test(`branching.mode resolved to ${mode} prints the fragment named by that mode`, () => {
    withGitRepo((repo) => {
      writeConfig(repo, config);
      writeFragment(repo, "branch.off.md", "off\n");
      writeFragment(repo, "branch.allowed.md", "allowed\n");
      writeFragment(repo, "branch.required.md", "required\n");

      const result = run(repo, ["branching.mode", skillDir(repo), "branch"]);

      assert.deepEqual([result.status, result.stdout], [0, `${mode}\n`]);
    });
  });
}

/** Every row stages the same config and fragments, and most rows name a file
 *  the fixture holds, so a row passes only because its argument is refused. */
for (const [label, args] of [
  ["a key whose fragment file is missing (memory resolves false, no step.false.md)", (dir: string) => ["memory", dir, "step"]],
  ["an unknown key", (dir: string) => ["e2e", dir, "step"]],
  ["a config key that is no switch (directories.runs)", (dir: string) => ["directories.runs", dir, "step"]],
  ["a config key that is no switch (tiers.min)", (dir: string) => ["tiers.min", dir, "step"]],
  ["a name holding a slash", (dir: string) => ["adr", dir, "../fragments/step"]],
  ["a name holding ..", (dir: string) => ["adr", dir, "..step"]],
  ["a missing name", (dir: string) => ["adr", dir]],
  ["an empty skill directory", () => ["adr", "", "step"]],
  ["a missing skill directory and name", () => ["adr"]],
  ["no argument at all", () => []],
] as const) {
  test(`${label} prints nothing and exits 0 (a preload must never abort the skill load)`, () => {
    withGitRepo((repo) => {
      writeConfig(repo, "adr: true\ne2e: true\n");
      writeFragment(repo, "step.true.md", "on\n");
      writeFragment(repo, "step._specs.md", "a directory name\n");
      writeFragment(repo, "step.haiku.md", "a tier\n");
      writeFragment(repo, "..step.true.md", "a dotted name\n");
      writeFragment(repo, ".true.md", "an empty name\n");

      const result = run(repo, [...args(skillDir(repo))]);

      assert.deepEqual([result.status, result.stdout], [0, ""]);
    });
  });
}

test("a session started in a subdirectory resolves the repository's config (a preload runs wherever the session started)", () => {
  withGitRepo((repo) => {
    writeConfig(repo, "adr: true\n");
    writeFragment(repo, "step.true.md", "on\n");
    writeFragment(repo, "step.false.md", "off\n");
    const sub = path.join(repo.dir, "src", "deep");
    fs.mkdirSync(sub, { recursive: true });

    const result = run(repo, ["adr", skillDir(repo), "step"], sub);

    assert.deepEqual([result.status, result.stdout], [0, "on\n"]);
  });
});

const PLACEHOLDERS = "Run ${CLAUDE_SKILL_DIR}/x.sh & ${CLAUDE_PLUGIN_ROOT}/scripts/y.sh\nthen ${CLAUDE_SKILL_DIR}/z & ${CLAUDE_PLUGIN_ROOT}.\n";

for (const [label, suffix] of [
  ["a skill directory as handed in", ""],
  ["a skill directory with a trailing separator", path.sep],
] as const) {
  test(`${label}: every root placeholder is replaced by the derived path, under every bash present`, () => {
    forEachShell("bash", (bash) => {
      withGitRepo((repo) => {
        writeConfig(repo, "qa: true\n");
        writeFragment(repo, "step.true.md", PLACEHOLDERS);
        const dir = skillDir(repo) + suffix;
        const root = path.join(repo.dir, "plugin");

        const result = run(repo, ["qa", dir, "step"], repo.dir, bash);

        assert.deepEqual(
          [result.status, result.stdout],
          [0, `Run ${dir}/x.sh & ${root}/scripts/y.sh\nthen ${dir}/z & ${root}.\n`],
        );
      });
    });
  });
}

test(
  "a skill directory written with backslashes derives the plugin root across them (a Windows CLAUDE_SKILL_DIR)",
  { skip: process.platform === "win32" ? "a backslash is a separator on Windows, so every other case already proves it there" : false },
  () => {
    withGitRepo((repo) => {
      writeConfig(repo, "qa: true\n");
      const dir = "C:\\host\\plugin\\skills\\demo";
      fs.mkdirSync(path.join(repo.dir, dir, "fragments"), { recursive: true });
      fs.writeFileSync(path.join(repo.dir, dir, "fragments", "step.true.md"), "${CLAUDE_PLUGIN_ROOT}|${CLAUDE_SKILL_DIR}\n");

      const result = run(repo, ["qa", dir, "step"]);

      assert.deepEqual([result.status, result.stdout], [0, `C:\\host\\plugin|${dir}\n`]);
    });
  },
);

/** The mode the index records for a shipped script - never the filesystem bit,
 *  which this repo's `core.filemode=false` ignores on the way in. */
function indexMode(file: string): string {
  const listed = runScript("git", ["ls-files", "-s", "--", file], { cwd: path.dirname(file) });
  return listed.stdout.trim().split(/\s+/)[0];
}

test("the index records the script 100755, so a skill can preload it by its bare quoted path", () => {
  assert.equal(indexMode(SUT), "100755");
});
