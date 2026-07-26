/*
 * body-path.test.ts - proves supergh/shared/scripts/body-path.sh's single-
 * line contract: `.temp/<prefix>/<YYYYmmdd-HHMMSS>-<slug>.md`, the seven-step
 * slugify pipeline (lowercase, PL transliteration, punctuation collapse,
 * dash-run collapse, trim, 40-char word-boundary truncation, empty ->
 * "untitled"), and its three exit codes (0 / 2 missing args / 1 dir not
 * creatable).
 *
 * body-path.sh is `#!/bin/sh`, so every case runs through forEachShell
 * ("posix", ...) via opts.shell, never executed directly.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/supergh/body-path.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { forEachShell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../supergh/shared/scripts/body-path.sh");

/** `^\.temp/<prefix>/\d{8}-\d{6}-<slug>\.md$` - the timestamp is never a
 *  literal (it comes from `date`), so callers match this pattern, not a
 *  fixed string. */
const PATH_PATTERN = /^\.temp\/(.+)\/(\d{8})-(\d{6})-(.+)\.md$/;

function assertPosix(fn: (shell: string) => void) {
  const skips = forEachShell("posix", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "posix");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

function run(shell: string, cwd: string, args: string[]): RunResult {
  return runScript(SUT, args, { shell, cwd });
}

/** Runs the script and asserts a single stdout line matching PATH_PATTERN
 *  with the given prefix/slug, exit 0, and that the parent dir pre-exists. */
function assertPath(result: RunResult, prefix: string, slug: string): void {
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  const lines = result.stdout.split("\n").filter((line) => line.length > 0);
  assert.equal(lines.length, 1, `expected exactly one stdout line, got:\n${result.stdout}`);
  const match = lines[0].match(PATH_PATTERN);
  assert.ok(match, `stdout line "${lines[0]}" should match ${PATH_PATTERN}`);
  assert.equal(match![1], prefix);
  assert.equal(match![4], slug);
}

// --- the path contract + dir-created-before-print ---------------------------

test("stdout is exactly one line matching the documented path pattern, and .temp/<prefix>/ exists before it is read", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["create-issue", "hello world"]);
      assertPath(result, "create-issue", "hello-world");
      const lines = result.stdout.split("\n").filter((line) => line.length > 0);
      const dirPart = path.dirname(lines[0]);
      assert.ok(fs.statSync(path.join(dir, dirPart)).isDirectory(), ".temp/<prefix>/ must exist by the time the line is printed");
    });
  });
});

// --- slugify contract, step by step ------------------------------------------

test("slugify: uppercase input is lowercased", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["p", "HELLO WORLD"]);
      assertPath(result, "p", "hello-world");
    });
  });
});

test("slugify: every Polish diacritic, uppercase form, transliterates", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["p", "ĄĆĘŁŃÓŚŹŻ"]);
      assertPath(result, "p", "acelnoszz");
    });
  });
});

test("slugify: every Polish diacritic, lowercase form, transliterates", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["p", "ąćęłńóśźż"]);
      assertPath(result, "p", "acelnoszz");
    });
  });
});

test("slugify: punctuation is collapsed to '-'", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["p", "Hello, World! Test"]);
      assertPath(result, "p", "hello-world-test");
    });
  });
});

test("slugify: runs of '-' collapse into one", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["p", "a   b"]);
      assertPath(result, "p", "a-b");
    });
  });
});

test("slugify: leading and trailing '-' are trimmed", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["p", "  leading and trailing  "]);
      assertPath(result, "p", "leading-and-trailing");
    });
  });
});

test("slugify: a title over 40 chars cutting mid-word backs off to the last '-'", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      // slug = 20 a's + '-' + 30 b's (51 chars); chars 40 and 41 both fall
      // inside the b-run (non-dash), so the cut backs off to the one dash.
      const title = `${"a".repeat(20)} ${"b".repeat(30)}`;
      const result = run(shell, dir, ["p", title]);
      assertPath(result, "p", "a".repeat(20));
    });
  });
});

test("slugify: a title over 40 chars cutting exactly on a '-' boundary needs no back-off", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      // slug = "aaaaaaaaa-bbbbbbbbb-ccccccccc-ddddddddd-eeeeeeeee" (49 chars);
      // the 40th char is itself the 4th dash, so the cut is already clean -
      // the trailing dash from the 40-char cut is stripped, not backed off.
      const title = "aaaaaaaaa bbbbbbbbb ccccccccc ddddddddd eeeeeeeee";
      const result = run(shell, dir, ["p", title]);
      assertPath(result, "p", "aaaaaaaaa-bbbbbbbbb-ccccccccc-ddddddddd");
    });
  });
});

test("slugify: a title of only punctuation slugifies to 'untitled'", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["p", "!!!???"]);
      assertPath(result, "p", "untitled");
    });
  });
});

test("slugify: an empty title slugifies to 'untitled'", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["p", ""]);
      assertPath(result, "p", "untitled");
    });
  });
});

test("slugify: an embedded newline and CR collapse to a space, so the one-line contract holds", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["p", "Line1\nLine2\rLine3"]);
      assertPath(result, "p", "line1-line2-line3");
    });
  });
});

test("slugify: a 4-byte emoji is stripped under LC_ALL=C byte semantics, never breaking the pipeline", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["p", "party \u{1F389}"]);
      assertPath(result, "p", "party");
    });
  });
});

// --- edge cases ---------------------------------------------------------------

test("edge: a prefix containing a slash creates the nested .temp/<prefix>/ dir", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["sub/dir", "hello"]);
      assertPath(result, "sub/dir", "hello");
      assert.ok(fs.statSync(path.join(dir, ".temp", "sub", "dir")).isDirectory());
    });
  });
});

test("edge: a title of exactly 40 characters (single word, no dash) is preserved verbatim", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const title = "x".repeat(40);
      const result = run(shell, dir, ["p", title]);
      assertPath(result, "p", "x".repeat(40));
    });
  });
});

test("edge: a title of exactly 41 characters (single word, no dash) truncates to 40 with no further back-off (nothing to back off to)", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const title = "x".repeat(41);
      const result = run(shell, dir, ["p", title]);
      assertPath(result, "p", "x".repeat(40));
    });
  });
});

test("edge: two invocations within the same second produce the same path when the timestamp second is identical", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const first = run(shell, dir, ["p", "same title"]);
      const second = run(shell, dir, ["p", "same title"]);
      assert.equal(first.status, 0, `stderr: ${first.stderr}`);
      assert.equal(second.status, 0, `stderr: ${second.stderr}`);
      const firstLine = first.stdout.trim();
      const secondLine = second.stdout.trim();
      const firstMatch = firstLine.match(PATH_PATTERN);
      const secondMatch = secondLine.match(PATH_PATTERN);
      assert.ok(firstMatch && secondMatch, "both invocations should match the documented path pattern");
      // Only assert path identity when the two calls landed in the same
      // wall-clock second - a slow CI runner could legitimately straddle a
      // second boundary, which is not the case under test here.
      if (firstMatch![2] === secondMatch![2] && firstMatch![3] === secondMatch![3]) {
        assert.equal(firstLine, secondLine, "same-second invocations of the same title must produce the same path");
      }
    });
  });
});

test("edge: a read-only cwd (.temp cannot be created) exits 1", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-ro-", (scratch) => {
      const projectRoot = path.join(scratch, "project");
      fs.mkdirSync(projectRoot);
      // Best-effort: on POSIX this blocks writes into the directory; on a
      // platform where chmod does not enforce this the mkdir may simply
      // succeed instead (documented as a fail-soft possibility, not asserted
      // against here - only the read-only-enforcing branch is checked).
      fs.chmodSync(projectRoot, 0o555);
      try {
        const result = run(shell, projectRoot, ["p", "hello"]);
        if (!fs.existsSync(path.join(projectRoot, ".temp", "p"))) {
          assert.equal(result.status, 1, `stderr: ${result.stderr}`);
          assert.match(result.stderr, /could not create/);
        }
      } finally {
        fs.chmodSync(projectRoot, 0o755);
      }
    });
  });
});

// --- exit codes -----------------------------------------------------------------

test("exit 2 on no arguments", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, []);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /need <prefix> <title>/);
    });
  });
});

test("exit 2 when only the prefix is given", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      const result = run(shell, dir, ["only-prefix"]);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /need <prefix> <title>/);
    });
  });
});

test("exit 1 when .temp/<prefix> cannot be created because it already exists as a regular file", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-body-path-", (dir) => {
      fs.mkdirSync(path.join(dir, ".temp"), { recursive: true });
      fs.writeFileSync(path.join(dir, ".temp", "blocked"), "not a directory");
      const result = run(shell, dir, ["blocked", "hello"]);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /could not create/);
    });
  });
});
