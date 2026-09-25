/*
 * post-comment.test.ts - proves viber/scripts/post-comment.sh's
 * `post-comment.sh <N | #N | issue url> <comment file>` contract against a
 * stubbed `gh`: the reference and the file reach `gh issue comment` through
 * `--body-file`, `#N` is normalized to `N`, exactly one COMMENT_URL= line is
 * printed once gh returned a well-formed issuecomment URL (CRLF and stderr
 * noise tolerated), exit 1 with one ERROR line and an empty stdout when gh
 * fails, prints no comment URL or is not on PATH at all, and exit 2 with gh
 * never called on a wrong argument count, a malformed reference or a missing
 * comment file.
 *
 * post-comment.sh is `#!/bin/sh`, so every case runs through
 * forEachShell("posix", ...) via opts.shell, never executed directly. `gh` is
 * always a withStub, or absent - this test never shells out to the real gh.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/post-comment.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { coreUtilsPath, withStub } from "../harness/stub.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/post-comment.sh");

const COMMENT_URL = "https://github.com/acme/widgets/issues/42#issuecomment-1234567";

function assertPosix(fn: (shell: Shell) => void) {
  const skips = forEachShell("posix", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "posix");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

/** A `gh` stub logging its argv one-arg-per-line (a "===" separator after
 *  each call) into `$ARGV_FILE`; its stdout, stderr and exit code come from
 *  env vars, so one body serves every case. */
const GH_STUB = `
for a in "$@"; do printf '%s\\n' "$a" >> "$ARGV_FILE"; done; printf '===\\n' >> "$ARGV_FILE"
if [ -n "\${GH_STDERR:-}" ]; then printf '%s' "$GH_STDERR" >&2; fi
printf '%s' "\${GH_STDOUT:-}"
exit "\${GH_EXIT:-0}"
`;

/** Runs post-comment.sh with a fresh `gh` stub first on PATH. `args` may use
 *  the token "<file>", replaced by the path of an existing comment file.
 *  Returns the result, every logged gh call and that file's path. */
function runStubbed(
  shell: Shell,
  args: string[],
  env: Record<string, string> = {},
): { result: RunResult; calls: string[][]; file: string } {
  return withTempDir("p2p2-post-comment-", (cwd) =>
    withStub("gh", GH_STUB, (stubDir) => {
      const file = path.join(cwd, "comment.md");
      fs.writeFileSync(file, "## Summary\n\nLine one.\nLine two.\n");
      const argvFile = path.join(cwd, "argv.log");
      fs.writeFileSync(argvFile, "");
      const real = args.map((a) => (a === "<file>" ? file : a));
      const result = runScript(SUT, real, { shell, cwd, env: { ARGV_FILE: argvFile, ...env }, stubDirs: [stubDir] });
      const calls = fs
        .readFileSync(argvFile, "utf-8")
        .split("===\n")
        .map((block) => block.split("\n").filter((line) => line.length > 0))
        .filter((call) => call.length > 0);
      return { result, calls, file };
    }),
  );
}

// --- success --------------------------------------------------------------------

test("a bare number and a file reach gh issue comment through --body-file, and exactly one COMMENT_URL= line is printed", () => {
  assertPosix((shell) => {
    const { result, calls, file } = runStubbed(shell, ["42", "<file>"], { GH_STDOUT: COMMENT_URL + "\n" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `COMMENT_URL=${COMMENT_URL}\n`);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], ["issue", "comment", "42", "--body-file", file]);
  });
});

test("#42 is passed to gh as 42, an issue url verbatim, and one carrying a comment fragment or a query as the bare issue url", () => {
  assertPosix((shell) => {
    const url = "https://github.com/acme/widgets/issues/42";
    for (const [ref, expected] of [["#42", "42"], [url, url], [`${url}#issuecomment-1`, url], [`${url}?foo=1`, url]]) {
      const { result, calls } = runStubbed(shell, [ref, "<file>"], { GH_STDOUT: COMMENT_URL + "\n" });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(calls[0][2], expected);
    }
  });
});

test("a comment URL followed by CRLF and a stderr warning still parses cleanly", () => {
  assertPosix((shell) => {
    const { result } = runStubbed(shell, ["42", "<file>"], {
      GH_STDOUT: COMMENT_URL + "\r\n\r\n",
      GH_STDERR: "warning: some non-fatal notice\n",
    });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `COMMENT_URL=${COMMENT_URL}\n`);
  });
});

// --- gh failure -------------------------------------------------------------------

test("gh fails: exit 1, one ERROR line carrying gh's message, nothing on stdout", () => {
  assertPosix((shell) => {
    const { result } = runStubbed(shell, ["42", "<file>"], { GH_EXIT: "1", GH_STDERR: "HTTP 401: Bad credentials\n" });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    const lines = result.stderr.split("\n").filter((l) => l.length > 0);
    assert.equal(lines.length, 1, `expected a single ERROR line, got:\n${result.stderr}`);
    assert.match(lines[0], /^ERROR post-comment\.sh: gh issue comment failed: .*Bad credentials/);
  });
});

test("gh exits 0 but prints no comment URL: exit 1, nothing on stdout (an issue URL alone is not proof a comment landed)", () => {
  assertPosix((shell) => {
    for (const out of ["", "https://github.com/acme/widgets/issues/42\n", "https://github.com/acme/widgets/issues/42#issuecomment-abc\n"]) {
      const { result } = runStubbed(shell, ["42", "<file>"], { GH_STDOUT: out });
      assert.equal(result.status, 1, `gh stdout ${JSON.stringify(out)}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /^ERROR post-comment\.sh: gh issue comment failed:/);
    }
  });
});

const ghOnCorePath = coreUtilsPath()
  .split(path.delimiter)
  .some((dir) => ["gh", "gh.exe"].some((n) => fs.existsSync(path.join(dir, n))));

test(
  "gh not on PATH: exit 1 with one ERROR line naming gh",
  { skip: ghOnCorePath ? "a real gh sits in the core utilities directory, so its absence cannot be staged" : false },
  () => {
    assertPosix((shell) => {
      withTempDir("p2p2-post-comment-", (cwd) => {
        const file = path.join(cwd, "comment.md");
        fs.writeFileSync(file, "body\n");
        const result = runScript(SUT, ["42", file], { shell, cwd, env: { PATH: coreUtilsPath() } });
        assert.equal(result.status, 1);
        assert.equal(result.stdout, "");
        assert.match(result.stderr, /^ERROR post-comment\.sh: gh not found on PATH$/m);
      });
    });
  },
);

// --- bad arguments ----------------------------------------------------------------

test("a wrong argument count: exit 2 and gh is never called", () => {
  assertPosix((shell) => {
    for (const args of [[], ["42"], ["42", "<file>", "extra"]]) {
      const { result, calls } = runStubbed(shell, args);
      assert.equal(result.status, 2, `args ${JSON.stringify(args)}`);
      assert.match(result.stderr, /need <issue number or url> <comment file>/);
      assert.equal(calls.length, 0);
    }
  });
});

test("a reference that is neither a number nor an issue url: exit 2 and gh is never called", () => {
  assertPosix((shell) => {
    for (const ref of ["", "login is broken", "https://github.com/acme/widgets/pull/42", "https://github.com/acme/issues/42"]) {
      const { result, calls } = runStubbed(shell, [ref, "<file>"]);
      assert.equal(result.status, 2, `ref ${JSON.stringify(ref)}: ${result.stderr}`);
      assert.match(result.stderr, /not an issue number or url/);
      assert.equal(calls.length, 0);
    }
  });
});

test("a comment file that does not exist: exit 2 and gh is never called (nothing half-posted)", () => {
  assertPosix((shell) => {
    const { result, calls } = runStubbed(shell, ["42", "does-not-exist.md"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^ERROR post-comment\.sh: comment file not found: does-not-exist\.md$/m);
    assert.equal(calls.length, 0);
  });
});
