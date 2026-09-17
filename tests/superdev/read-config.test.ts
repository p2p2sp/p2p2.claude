/*
 * read-config.test.ts - proves read-config.sh's switch resolution, replacing
 * the retired superdev/scripts/read-config.test.sh (deterministic script runs
 * against a `withTempDir` scratch project root, asserted via the shared
 * subprocess harness instead of a bespoke bash test runner).
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/read-config.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/scripts/read-config.sh");

/** The fixed output shape: header line + exactly the nine keys, in order. */
function expectedBody(
  adr: boolean,
  rules: boolean,
  memory: boolean,
  changelog: boolean,
  cleanup: boolean,
  stats: boolean,
  qa: boolean,
  e2eUi: boolean,
  e2eApi: boolean,
): string {
  return [
    `adr: ${adr}`,
    `rules: ${rules}`,
    `memory: ${memory}`,
    `changelog: ${changelog}`,
    `cleanup: ${cleanup}`,
    `stats: ${stats}`,
    `qa: ${qa}`,
    `e2e-ui: ${e2eUi}`,
    `e2e-api: ${e2eApi}`,
  ].join("\n");
}

function bodyOf(stdout: string): string {
  return stdout
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .join("\n")
    .replace(/\n+$/, "");
}

function writeConfig(dir: string, contents: string): void {
  fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude", "superdev.yml"), contents);
}

test("missing .claude/superdev.yml -> all nine keys false, exit 0 (fail-open)", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(false, false, false, false, false, false, false, false, false));
  });
});

test("every key set true -> all nine resolve true", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(
      dir,
      "adr: true\nrules: true\nmemory: true\nchangelog: true\ncleanup: true\nstats: true\nqa: true\ne2e-ui: true\ne2e-api: true\n",
    );
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(true, true, true, true, true, true, true, true, true));
  });
});

test("keys in a different order than the fixed output order still resolve correctly", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "cleanup: true\nchangelog: true\nmemory: true\nrules: false\nadr: true\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(true, false, true, true, true, false, false, false, false));
  });
});

test("adr:true with no space after the colon resolves true", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "adr:true\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(true, false, false, false, false, false, false, false, false));
  });
});

test("adr : true with a space before the colon resolves true", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "adr : true\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(true, false, false, false, false, false, false, false, false));
  });
});

test("adr: TRUE (uppercase) resolves true - grep -i is case-insensitive", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "adr: TRUE\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    // grep -i makes the match case-insensitive, so TRUE resolves the same as true.
    assert.equal(bodyOf(result.stdout), expectedBody(true, false, false, false, false, false, false, false, false));
  });
});

test("a commented-out `# adr: true` line does not resolve true", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "# adr: true\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(false, false, false, false, false, false, false, false, false));
  });
});

test("a CRLF-authored yml still resolves correctly", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "adr: true\r\nrules: true\r\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(true, true, false, false, false, false, false, false, false));
  });
});

test("a key appearing twice resolves true if any occurrence is true", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "adr: false\nadr: true\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(true, false, false, false, false, false, false, false, false));
  });
});

test("mixed values with a trailing comment + an absent key (the seeded-asset shape)", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "# SuperDev Config\nadr:     false   # ADR capture\nrules:   true    # Rules system\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(false, true, false, false, false, false, false, false, false));
  });
});

test("non-true values (yes/1/truthy) never resolve true", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "adr: yes\nrules: 1\nmemory: truthy\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(false, false, false, false, false, false, false, false, false));
  });
});

test("a leftover `docs: true` key from the retired docs layer is ignored", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "docs: true\nadr: true\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(true, false, false, false, false, false, false, false, false));
  });
});

test("cleanup: true resolves independently of changelog", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "cleanup: true\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(false, false, false, false, true, false, false, false, false));
  });
});

test("stats: true resolves independently of the other switches", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "stats: true\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(false, false, false, false, false, true, false, false, false));
  });
});

test("e2e-ui: true and e2e-api: true resolve independently (a hyphenated key)", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    writeConfig(dir, "e2e-ui: true\ne2e-api: true\n");
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    assert.equal(bodyOf(result.stdout), expectedBody(false, false, false, false, false, false, false, true, true));
  });
});

test("output always carries the header line, then adr/rules/memory/changelog/cleanup/stats/qa/e2e-ui/e2e-api in that fixed order", () => {
  withTempDir("p2p2-read-config-", (dir) => {
    const result = runScript(SUT, [], { cwd: dir });
    assert.equal(result.status, 0);
    const lines = result.stdout.split("\n").filter((line) => line.length > 0);
    assert.equal(lines[0], "# superdev config (resolved)");
    assert.deepEqual(
      lines.slice(1),
      [
        "adr: false",
        "rules: false",
        "memory: false",
        "changelog: false",
        "cleanup: false",
        "stats: false",
        "qa: false",
        "e2e-ui: false",
        "e2e-api: false",
      ],
    );
  });
});
