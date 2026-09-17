/*
 * bootstrap.test.ts - proves bootstrap.sh's idempotent environment seeding
 * (.temp/, .gitignore, .claude/superdev.yml, .gitattributes), replacing the retired
 * superdev/skills/setup/scripts/bootstrap.test.sh (every case that bash
 * harness asserted, run through the shared subprocess harness instead of a
 * bespoke bash test runner), plus the idempotence + seeding edge cases from
 * the task spec.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/bootstrap.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { coreUtilsPath } from "../harness/stub.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/skills/setup/scripts/bootstrap.sh");
const ASSETS_DIR = path.resolve(import.meta.dirname, "../../superdev/skills/setup/assets");
const ASSET_CONFIG = path.join(ASSETS_DIR, "config.yml");
const ASSET_GITIGNORE = path.join(ASSETS_DIR, "gitignore.txt");

function run(dir: string) {
  return runScript(SUT, [], { cwd: dir });
}

/** bootstrap.sh now shells out to check-playwright.sh, whose two tooling lines
 *  would read "found" on a host that has playwright-cli reachable - so the two
 *  cases below that assert bootstrap.sh's exact, full stdout run on the
 *  harness's minimal PATH (`coreUtilsPath`, which carries its own rationale).
 *  Every other case matches single lines and is indifferent to the host. */
function runIsolated(dir: string) {
  return runScript(SUT, [], { cwd: dir, env: { PATH: coreUtilsPath() } });
}

function readIfExists(file: string): string | undefined {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return undefined;
  }
}

test("seed-when-absent: a fresh project root seeds every item and prints one line each, in order, exit 0", () => {
  withTempDir("p2p2-bootstrap-", (dir) => {
    const result = runIsolated(dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      [
        ".temp: created",
        ".gitignore: created from template",
        "superdev.yml: seeded from template - defaults: adr=false, rules=false, memory=false, changelog=false, cleanup=false, stats=false, qa=false, e2e-ui=false, e2e-api=false",
        ".gitattributes: created with linguist-generated rule",
        "playwright-cli: not found",
        "@playwright/test: not found",
        "",
      ].join("\n"),
    );
    assert.ok(fs.statSync(path.join(dir, ".temp")).isDirectory());
    assert.equal(readIfExists(path.join(dir, ".gitignore")), fs.readFileSync(ASSET_GITIGNORE, "utf-8"));
    assert.equal(readIfExists(path.join(dir, ".claude", "superdev.yml")), fs.readFileSync(ASSET_CONFIG, "utf-8"));
    assert.equal(
      readIfExists(path.join(dir, ".gitattributes")),
      "docs/.workflows/** linguist-generated=true\n",
    );
  });
});

test("never-overwrite-when-present: a pre-existing superdev.yml (flipped switch) is byte-unchanged, reports current switches, exit 0", () => {
  withTempDir("p2p2-bootstrap-", (dir) => {
    fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
    const configPath = path.join(dir, ".claude", "superdev.yml");
    fs.writeFileSync(configPath, "adr:    false\nrules:  true\n");
    const before = fs.readFileSync(configPath, "utf-8");

    const result = run(dir);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(fs.readFileSync(configPath, "utf-8"), before);
    assert.match(result.stdout, /superdev\.yml: already present \(left untouched\) - current switches:/);
    assert.match(result.stdout, /^[ \t]*adr:[ \t]*false/m);
    assert.match(result.stdout, /^[ \t]*rules:[ \t]*true/m);
  });
});

test("idempotence: running twice reports 'already present' for every item on the second run and leaves file bytes unchanged", () => {
  withTempDir("p2p2-bootstrap-", (dir) => {
    const first = runIsolated(dir);
    assert.equal(first.status, 0, `stderr: ${first.stderr}`);

    const beforeGitignore = fs.readFileSync(path.join(dir, ".gitignore"), "utf-8");
    const beforeConfig = fs.readFileSync(path.join(dir, ".claude", "superdev.yml"), "utf-8");
    const beforeGitattributes = fs.readFileSync(path.join(dir, ".gitattributes"), "utf-8");

    const second = runIsolated(dir);

    assert.equal(second.status, 0, `stderr: ${second.stderr}`);
    assert.equal(
      second.stdout,
      [
        ".temp: already present",
        ".gitignore: already present (left untouched)",
        "superdev.yml: already present (left untouched) - current switches:",
        "adr:       false   # ADR capture -> docs/adr/",
        "rules:     false   # Rules system -> .claude/rules/",
        "memory:    false   # Memory system -> CLAUDE.md cascade",
        "changelog: false   # Changelog -> docs/changelog/",
        "cleanup:   false   # Remove the run's (or phase's) working dir after a completed build",
        "stats:     false   # Workflow execution stats -> .temp/superdev/stats/",
        "qa:        false   # Manual QA scenarios -> docs/qa/",
        "e2e-ui:    false   # Playwright UI test handoff -> docs/qa/<run>.e2e.md",
        "e2e-api:   false   # Playwright API test handoff -> docs/qa/<run>.e2e.md",
        ".gitattributes: linguist-generated rule already present",
        "playwright-cli: not found",
        "@playwright/test: not found",
        "",
      ].join("\n"),
    );
    assert.equal(fs.readFileSync(path.join(dir, ".gitignore"), "utf-8"), beforeGitignore);
    assert.equal(fs.readFileSync(path.join(dir, ".claude", "superdev.yml"), "utf-8"), beforeConfig);
    assert.equal(fs.readFileSync(path.join(dir, ".gitattributes"), "utf-8"), beforeGitattributes);
  });
});

test("edge: pre-existing .gitignore without a trailing newline is left byte-for-byte untouched", () => {
  withTempDir("p2p2-bootstrap-", (dir) => {
    const gitignorePath = path.join(dir, ".gitignore");
    fs.writeFileSync(gitignorePath, "node_modules/\n*.log");
    const before = fs.readFileSync(gitignorePath, "utf-8");

    const result = run(dir);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(fs.readFileSync(gitignorePath, "utf-8"), before);
    assert.match(result.stdout, /^\.gitignore: already present \(left untouched\)$/m);
  });
});

test("edge: a CRLF-authored existing .gitignore is left byte-for-byte untouched", () => {
  withTempDir("p2p2-bootstrap-", (dir) => {
    const gitignorePath = path.join(dir, ".gitignore");
    fs.writeFileSync(gitignorePath, "node_modules/\r\n*.log\r\n");
    const before = fs.readFileSync(gitignorePath, "utf-8");

    const result = run(dir);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(fs.readFileSync(gitignorePath, "utf-8"), before);
    assert.match(result.stdout, /^\.gitignore: already present \(left untouched\)$/m);
  });
});

test("edge: pre-existing .gitattributes that already carries the linguist rule reports already-present, no duplicate", () => {
  withTempDir("p2p2-bootstrap-", (dir) => {
    const gaPath = path.join(dir, ".gitattributes");
    fs.writeFileSync(gaPath, "*.png binary\ndocs/.workflows/** linguist-generated=true\n");

    const result = run(dir);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const contents = fs.readFileSync(gaPath, "utf-8");
    const occurrences = contents.split("docs/.workflows/** linguist-generated=true").length - 1;
    assert.equal(occurrences, 1);
    assert.match(result.stdout, /^\.gitattributes: linguist-generated rule already present$/m);
  });
});

test("edge: the append-if-absent rule does not duplicate when the existing .gitattributes lacks a final newline", () => {
  withTempDir("p2p2-bootstrap-", (dir) => {
    const gaPath = path.join(dir, ".gitattributes");
    fs.writeFileSync(gaPath, "*.png binary"); // no trailing newline

    const result = run(dir);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const contents = fs.readFileSync(gaPath, "utf-8");
    assert.equal(contents, "*.png binary\ndocs/.workflows/** linguist-generated=true\n");
    assert.match(result.stdout, /^\.gitattributes: linguist-generated rule appended$/m);
  });
});

test("edge: .temp/ already existing as a file rather than a directory - exit 0, no '.temp:' line, other items still seeded", () => {
  withTempDir("p2p2-bootstrap-", (dir) => {
    fs.writeFileSync(path.join(dir, ".temp"), "not a directory");

    const result = run(dir);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(fs.statSync(path.join(dir, ".temp")).isFile(), ".temp should remain the pre-existing file");
    assert.equal(fs.readFileSync(path.join(dir, ".temp"), "utf-8"), "not a directory");
    assert.doesNotMatch(result.stdout, /^\.temp:/m);
    // The remaining, independent seeding steps still run and report normally.
    assert.match(result.stdout, /^\.gitignore: created from template$/m);
    assert.match(result.stdout, /^\.gitattributes: created with linguist-generated rule$/m);
  });
});

test("edge: a read-only project root still exits 0 (fail-soft on every mutation)", () => {
  withTempDir("p2p2-bootstrap-readonly-", (scratch) => {
    const projectRoot = path.join(scratch, "project");
    fs.mkdirSync(projectRoot);
    // Best-effort: on POSIX this actually blocks writes into the directory;
    // on platforms where chmod does not enforce this (e.g. Windows, or a
    // root-run CI container) the seeding may simply succeed instead - either
    // way the script's contract is "exit 0 always", which is what we assert.
    fs.chmodSync(projectRoot, 0o555);
    try {
      const result = run(projectRoot);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    } finally {
      fs.chmodSync(projectRoot, 0o755);
    }
  });
});
