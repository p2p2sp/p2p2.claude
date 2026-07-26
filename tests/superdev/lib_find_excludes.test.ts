/*
 * lib_find_excludes.test.ts - proves lib_find_excludes.sh's
 * `load_find_excludes <start-path>` contract: it is a library meant to be
 * SOURCED (not executed), so every case here drives it through a tiny bash
 * wrapper that sources it, calls `load_find_excludes "$1"` and prints one
 * `FIND_EXCLUDES` element per line. The library requires bash arrays and
 * `BASH_SOURCE`, so every case runs under `forEachShell("bash", ...)` -
 * never a POSIX shell.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/lib_find_excludes.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { forEachShell } from "../harness/shells.ts";

const LIB = path.resolve(import.meta.dirname, "../../superdev/scripts/lib_find_excludes.sh");

function wrapperScript(libPath: string): string {
  return [
    "#!/usr/bin/env bash",
    `source "${libPath}"`,
    "load_find_excludes \"$1\"",
    "rc=$?",
    "printf '%s\\n' \"${FIND_EXCLUDES[@]}\"",
    "exit \"$rc\"",
  ].join("\n") + "\n";
}

/** Sources `libPath` (default: the real shipped library) into a fresh bash
 *  wrapper, calls `load_find_excludes <startPath>` and returns the result. */
function runLib(bash: string, startPath: string, libPath: string = LIB): RunResult {
  return withTempDir("p2p2-lib-wrapper-", (dir) => {
    const wrapper = path.join(dir, "wrapper.sh");
    fs.writeFileSync(wrapper, wrapperScript(libPath), { mode: 0o755 });
    fs.chmodSync(wrapper, 0o755);
    return runScript(wrapper, [startPath], { shell: bash });
  });
}

function excludesOf(result: RunResult): string[] {
  return result.stdout.split("\n").filter((l) => l.length > 0);
}

function patternTokens(name: string): string[] {
  return ["-not", "-path", `*/${name}`, "-not", "-path", `*/${name}/*`];
}

const SAFETY_FLOOR = [...patternTokens(".git"), ...patternTokens("node_modules")];

function withGitignoreDir<T>(contents: string, fn: (dir: string) => T): T {
  return withTempDir("p2p2-find-excludes-", (dir) => {
    fs.writeFileSync(path.join(dir, ".gitignore"), contents);
    return fn(dir);
  });
}

/** A start dir whose walk stops immediately (a `.git/` marker) with no
 *  `.gitignore` anywhere reachable - deterministic regardless of the host
 *  machine's real directory tree above the OS temp root. */
function withGitOnlyDir<T>(fn: (dir: string) => T): T {
  return withTempDir("p2p2-find-excludes-", (dir) => {
    fs.mkdirSync(path.join(dir, ".git"));
    return fn(dir);
  });
}

function assertBash(fn: (bash: string) => void) {
  const skips = forEachShell("bash", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "bash");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

// --- overarching contract ------------------------------------------------

test("the safety floor (.git, node_modules) is always present, the array is never empty, diagnostics stay off stdout, exit is always 0", () => {
  assertBash((bash) => {
    withGitOnlyDir((dir) => {
      const result = runLib(bash, dir);
      assert.equal(result.status, 0);
      const lines = excludesOf(result);
      assert.ok(lines.length > 0, "FIND_EXCLUDES must never be empty");
      for (const token of SAFETY_FLOOR) {
        assert.ok(lines.includes(token), `expected safety-floor token '${token}' in: ${lines.join(", ")}`);
      }
      assert.doesNotMatch(result.stdout, /lib_find_excludes:/, "diagnostics must never leak onto stdout");
    });
  });
});

// --- parser rules ----------------------------------------------------------

test("a trailing-slash directory entry ('build/') is excluded", () => {
  assertBash((bash) => {
    withGitignoreDir("build/\n", (dir) => {
      const result = runLib(bash, dir);
      assert.equal(result.status, 0);
      assert.deepEqual(excludesOf(result), [...SAFETY_FLOOR, ...patternTokens("build")]);
    });
  });
});

test("a bare name ('mydir', no dot extension) is treated as a directory", () => {
  assertBash((bash) => {
    withGitignoreDir("mydir\n", (dir) => {
      const result = runLib(bash, dir);
      assert.equal(result.status, 0);
      assert.deepEqual(excludesOf(result), [...SAFETY_FLOOR, ...patternTokens("mydir")]);
    });
  });
});

test("a '*.log' file pattern is skipped (file, not directory)", () => {
  assertBash((bash) => {
    withGitignoreDir("*.log\n", (dir) => {
      const result = runLib(bash, dir);
      assert.equal(result.status, 0);
      assert.deepEqual(excludesOf(result), SAFETY_FLOOR);
    });
  });
});

test("a '!negation' entry is skipped entirely", () => {
  assertBash((bash) => {
    withGitignoreDir("!excluded/\n", (dir) => {
      const result = runLib(bash, dir);
      assert.equal(result.status, 0);
      assert.deepEqual(excludesOf(result), SAFETY_FLOOR);
    });
  });
});

test("a '/root-anchored' entry has its leading '/' stripped", () => {
  assertBash((bash) => {
    withGitignoreDir("/rootdir/\n", (dir) => {
      const result = runLib(bash, dir);
      assert.equal(result.status, 0);
      assert.deepEqual(excludesOf(result), [...SAFETY_FLOOR, ...patternTokens("rootdir")]);
    });
  });
});

test("a '.idea' dot-dir (no further dot) is rescued as a directory, not skipped as a file", () => {
  assertBash((bash) => {
    withGitignoreDir(".idea\n", (dir) => {
      const result = runLib(bash, dir);
      assert.equal(result.status, 0);
      assert.deepEqual(excludesOf(result), [...SAFETY_FLOOR, ...patternTokens(".idea")]);
    });
  });
});

test("'**' is normalised to a single '*' inside a directory entry", () => {
  assertBash((bash) => {
    withGitignoreDir("foo/**/bar/\n", (dir) => {
      const result = runLib(bash, dir);
      assert.equal(result.status, 0);
      assert.deepEqual(excludesOf(result), [...SAFETY_FLOOR, ...patternTokens("foo/*/bar")]);
    });
  });
});

test("all-glob patterns ('*', '**', '*/') are dropped by the guard; a real entry alongside them still survives", () => {
  assertBash((bash) => {
    withGitignoreDir("*\n**\n*/\nkeep/\n", (dir) => {
      const result = runLib(bash, dir);
      assert.equal(result.status, 0);
      assert.deepEqual(excludesOf(result), [...SAFETY_FLOOR, ...patternTokens("keep")]);
    });
  });
});

test("a CRLF .gitignore resolves identically to an LF one, with no stray \\r in any token", () => {
  assertBash((bash) => {
    withGitignoreDir("build/\r\n", (dir) => {
      const result = runLib(bash, dir);
      assert.equal(result.status, 0);
      const lines = excludesOf(result);
      assert.deepEqual(lines, [...SAFETY_FLOOR, ...patternTokens("build")]);
      for (const line of lines) assert.doesNotMatch(line, /\r/);
    });
  });
});

test("a duplicate entry ('dupdir/' twice) is deduplicated to a single pattern pair", () => {
  assertBash((bash) => {
    withGitignoreDir("dupdir/\ndupdir/\n", (dir) => {
      const result = runLib(bash, dir);
      assert.equal(result.status, 0);
      assert.deepEqual(excludesOf(result), [...SAFETY_FLOOR, ...patternTokens("dupdir")]);
    });
  });
});

// --- fallback: bundled gitignore.txt when no project .gitignore exists ---
//
// The library resolves its bundled fallback relative to ITS OWN file
// location ($lib_dir/../../skills/setup/assets/gitignore.txt). From the
// script's real shipped location (superdev/scripts/), that offset is one
// level too many - it lands on the repo ROOT's skills/setup/assets/, which
// does not exist (the real asset lives at superdev/skills/setup/assets/) -
// verified directly against the real script below. So the fallback-merge
// mechanism itself is proven here via a relocated copy of the same,
// unmodified library positioned where its coded offset actually resolves;
// the real, shipped location's behavior is proven separately, unmodified.

test("mechanism: when the coded '../../skills/setup/assets/gitignore.txt' offset resolves, the fallback is parsed and merged", () => {
  assertBash((bash) => {
    withTempDir("p2p2-find-excludes-fallback-", (root) => {
      const libDir = path.join(root, "nested", "scripts");
      fs.mkdirSync(libDir, { recursive: true });
      const libCopy = path.join(libDir, "lib_find_excludes.sh");
      fs.writeFileSync(libCopy, fs.readFileSync(LIB, "utf-8"), { mode: 0o755 });
      fs.chmodSync(libCopy, 0o755);

      const assetsDir = path.join(root, "skills", "setup", "assets");
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.writeFileSync(path.join(assetsDir, "gitignore.txt"), "fallbackdir/\n");

      const startDir = path.join(root, "project");
      fs.mkdirSync(path.join(startDir, ".git"), { recursive: true });

      const result = runLib(bash, startDir, libCopy);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.doesNotMatch(result.stderr, /no fallback/);
      assert.deepEqual(excludesOf(result), [...SAFETY_FLOOR, ...patternTokens("fallbackdir")]);
    });
  });
});

test("real shipped location: no project .gitignore anywhere -> the coded fallback offset does not resolve, so the stderr warning fires and the safety floor stands alone", () => {
  assertBash((bash) => {
    withGitOnlyDir((dir) => {
      const result = runLib(bash, dir);
      assert.equal(result.status, 0);
      assert.match(result.stderr, /lib_find_excludes: no \.gitignore and no fallback \(.*gitignore\.txt\) - safety floor only/);
      assert.deepEqual(excludesOf(result), SAFETY_FLOOR);
    });
  });
});
