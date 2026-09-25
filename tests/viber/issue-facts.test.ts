/*
 * issue-facts.test.ts - proves viber/skills/triage/scripts/issue-facts.sh's
 * `issue-facts.sh <N | #N | issue url>` contract against a stubbed `gh`: the
 * issue reference reaches `gh issue view` with the fixed `--json` field list
 * and a `--jq` filter, `#N` is normalized to `N`, a URL passes verbatim, gh's
 * stdout is relayed with CR stripped and nothing from its stderr, exit 1 with
 * one ERROR line and an empty stdout when gh fails, prints no `NUMBER=` first
 * line or is not on PATH at all, and exit 2 with gh never called on a wrong
 * argument count or a reference that is neither a number nor an issue url.
 *
 * issue-facts.sh is `#!/bin/sh`, so every case runs through
 * forEachShell("posix", ...) via opts.shell, never executed directly. `gh` is
 * always a withStub, or absent - this test never shells out to the real gh.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/issue-facts.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { coreUtilsPath, withStub } from "../harness/stub.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/triage/scripts/issue-facts.sh");

const FIELDS = "number,url,title,state,author,labels,body,comments";

const BLOCK = [
  "NUMBER=42",
  "URL=https://github.com/acme/widgets/issues/42",
  "TITLE=Login button does nothing",
  "STATE=OPEN",
  "AUTHOR=octocat",
  "LABELS=bug, ui",
  "COMMENTS=1",
  "--- body ---",
  "Steps:",
  "1. click login",
  "--- comment 1 by hubot at 2026-09-01T10:00:00Z ---",
  "Same here.",
];

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

/** Runs issue-facts.sh with a fresh `gh` stub first on PATH and returns the
 *  result plus every logged gh call. */
function runStubbed(shell: Shell, args: string[], env: Record<string, string> = {}): { result: RunResult; calls: string[][] } {
  return withTempDir("p2p2-issue-facts-", (cwd) =>
    withStub("gh", GH_STUB, (stubDir) => {
      const argvFile = path.join(cwd, "argv.log");
      fs.writeFileSync(argvFile, "");
      const result = runScript(SUT, args, { shell, cwd, env: { ARGV_FILE: argvFile, ...env }, stubDirs: [stubDir] });
      const calls = fs
        .readFileSync(argvFile, "utf-8")
        .split("===\n")
        .map((block) => block.split("\n").filter((line) => line.length > 0))
        .filter((call) => call.length > 0);
      return { result, calls };
    }),
  );
}

// --- success --------------------------------------------------------------------

test("a bare number reaches gh issue view with the fixed field list and a --jq filter, and the block is relayed verbatim", () => {
  assertPosix((shell) => {
    const { result, calls } = runStubbed(shell, ["42"], { GH_STDOUT: BLOCK.join("\n") + "\n" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(result.stdout.split("\n").filter((l) => l.length > 0), BLOCK);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].slice(0, 6), ["issue", "view", "42", "--json", FIELDS, "--jq"]);
    assert.equal(calls[0].length, 7, "the --jq filter is one argument");
    assert.match(calls[0][6], /^"NUMBER=/);
  });
});

test("#42 is passed to gh as 42 (a user typing the GitHub reference form)", () => {
  assertPosix((shell) => {
    const { result, calls } = runStubbed(shell, ["#42"], { GH_STDOUT: BLOCK.join("\n") + "\n" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(calls[0][2], "42");
  });
});

test("an issue url is passed to gh verbatim", () => {
  assertPosix((shell) => {
    const url = "https://github.com/acme/widgets/issues/42";
    const { result, calls } = runStubbed(shell, [url], { GH_STDOUT: BLOCK.join("\n") + "\n" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(calls[0][2], url);
  });
});

test("an issue url carrying a comment fragment or a query reaches gh as the bare issue url (the \"Copy link\" form of a comment must not be refused)", () => {
  assertPosix((shell) => {
    const url = "https://github.com/acme/widgets/issues/42";
    for (const ref of [`${url}#issuecomment-1`, `${url}?foo=1`, `${url}?foo=1#issuecomment-1`]) {
      const { result, calls } = runStubbed(shell, [ref], { GH_STDOUT: BLOCK.join("\n") + "\n" });
      assert.equal(result.status, 0, `ref ${JSON.stringify(ref)}: ${result.stderr}`);
      assert.equal(calls[0][2], url);
    }
  });
});

test("CR in gh's output is stripped (issue bodies written on the web carry CRLF)", () => {
  assertPosix((shell) => {
    const { result } = runStubbed(shell, ["42"], { GH_STDOUT: BLOCK.join("\r\n") + "\r\n" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(!result.stdout.includes("\r"), "no CR may survive");
    assert.deepEqual(result.stdout.split("\n").filter((l) => l.length > 0), BLOCK);
  });
});

test("a warning gh writes to stderr on success never reaches stdout (it would corrupt the block)", () => {
  assertPosix((shell) => {
    const { result } = runStubbed(shell, ["42"], {
      GH_STDOUT: BLOCK.join("\n") + "\n",
      GH_STDERR: "A new release of gh is available\n",
    });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(!result.stdout.includes("new release"));
    assert.match(result.stdout, /^NUMBER=42$/m);
  });
});

// --- gh failure -------------------------------------------------------------------

test("gh fails: exit 1, one ERROR line carrying gh's message, nothing on stdout", () => {
  assertPosix((shell) => {
    const { result } = runStubbed(shell, ["99999"], {
      GH_EXIT: "1",
      GH_STDERR: "GraphQL: Could not resolve to an issue\n",
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    const lines = result.stderr.split("\n").filter((l) => l.length > 0);
    assert.equal(lines.length, 1, `expected a single ERROR line, got:\n${result.stderr}`);
    assert.match(lines[0], /^ERROR issue-facts\.sh: gh issue view failed: .*Could not resolve/);
  });
});

test("gh exits 0 but prints no NUMBER= first line: exit 1, nothing on stdout (the block is trusted unchecked)", () => {
  assertPosix((shell) => {
    const { result } = runStubbed(shell, ["42"], { GH_STDOUT: "something else\nNUMBER=42\n" });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /^ERROR issue-facts\.sh: gh issue view failed:/);
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
      withTempDir("p2p2-issue-facts-", (cwd) => {
        const result = runScript(SUT, ["42"], { shell, cwd, env: { PATH: coreUtilsPath() } });
        assert.equal(result.status, 1);
        assert.equal(result.stdout, "");
        assert.match(result.stderr, /^ERROR issue-facts\.sh: gh not found on PATH$/m);
      });
    });
  },
);

// --- bad arguments ----------------------------------------------------------------

test("no argument or two arguments: exit 2 and gh is never called", () => {
  assertPosix((shell) => {
    for (const args of [[], ["42", "43"]]) {
      const { result, calls } = runStubbed(shell, args);
      assert.equal(result.status, 2, `args ${JSON.stringify(args)}`);
      assert.match(result.stderr, /need exactly one/);
      assert.equal(calls.length, 0);
    }
  });
});

test("a reference that is neither a number nor an issue url: exit 2 and gh is never called (pasted text must not reach gh)", () => {
  const bad = [
    "",
    "#",
    "login is broken",
    "42a",
    "http://github.com/acme/widgets/issues/42",
    "https://github.com/acme/widgets/pull/42",
    "https://github.com/acme/widgets/issues/",
    "https://github.com/acme/widgets/issues/#issuecomment-1",
    "https://github.com/acme/issues/42",
    "https://github.com/a/b/c/issues/42",
    "https://github.com//widgets/issues/42",
  ];
  assertPosix((shell) => {
    for (const ref of bad) {
      const { result, calls } = runStubbed(shell, [ref]);
      assert.equal(result.status, 2, `ref ${JSON.stringify(ref)}: ${result.stderr}`);
      assert.match(result.stderr, /not an issue number or url/);
      assert.equal(calls.length, 0);
    }
  });
});
