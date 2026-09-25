/*
 * create-issue.test.ts - proves viber/scripts/create-issue.sh's
 * `create-issue.sh <body file> <title> [--type <T>] [--label <L>]...
 * [--assignee <A>]... [--project <P>]...` contract against a stubbed `gh`:
 * the body always travels through `--body-file`, every --label/--assignee/
 * --project pair is forwarded to `gh issue create` verbatim and in order,
 * ISSUE_URL/ISSUE_NUMBER are printed only once gh returned a well-formed
 * issue URL, TYPE is none/applied/dropped/error depending on the `gh api`
 * PATCH outcome (and that PATCH always carries `--hostname <host>` for the
 * issue's own host, github.com included), a failed PATCH never removes the
 * created issue, and bad arguments or a missing body file exit 2 with gh
 * never invoked.
 *
 * create-issue.sh is `#!/bin/sh`, so every case runs through
 * forEachShell("posix", ...) via opts.shell, never executed directly. `gh` is
 * always a withStub, or absent - this test never shells out to the real gh.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/create-issue.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { coreUtilsPath, withStub } from "../harness/stub.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/create-issue.sh");

function assertPosix(fn: (shell: Shell) => void) {
  const skips = forEachShell("posix", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "posix");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

const ISSUE_URL = "https://github.com/acme/widgets/issues/42";

/** A `gh` stub logging every call's argv one-arg-per-line (a "===" separator
 *  after each) into `$ARGV_FILE`; the `issue create` call answers from
 *  CREATE_STDOUT/CREATE_STDERR/CREATE_EXIT, the `api` (PATCH) call from
 *  API_STDERR/API_EXIT - so one stub body serves both calls of one run. */
const GH_STUB = `
for a in "$@"; do printf '%s\\n' "$a" >> "$ARGV_FILE"; done; printf '===\\n' >> "$ARGV_FILE"
if [ "$1" = "issue" ]; then
  if [ -n "\${CREATE_STDERR:-}" ]; then printf '%s' "$CREATE_STDERR" >&2; fi
  printf '%s' "\${CREATE_STDOUT:-}"
  exit "\${CREATE_EXIT:-0}"
elif [ "$1" = "api" ]; then
  if [ -n "\${API_STDERR:-}" ]; then printf '%s' "$API_STDERR" >&2; fi
  exit "\${API_EXIT:-0}"
fi
exit 1
`;

/** Runs create-issue.sh with a fresh `gh` stub first on PATH. Returns the
 *  result and every logged gh call, split into per-call argv arrays. */
function runStubbed(
  shell: Shell,
  args: string[],
  env: Record<string, string> = {},
): { result: RunResult; calls: string[][]; body: string } {
  return withTempDir("p2p2-create-issue-", (cwd) =>
    withStub("gh", GH_STUB, (stubDir) => {
      const body = path.join(cwd, "body.md");
      fs.writeFileSync(body, "## Summary\n\nLine one.\nLine two.\n");
      const argvFile = path.join(cwd, "argv.log");
      fs.writeFileSync(argvFile, "");
      const real = args.map((a) => (a === "<body>" ? body : a));
      const result = runScript(SUT, real, { shell, cwd, env: { ARGV_FILE: argvFile, ...env }, stubDirs: [stubDir] });
      const calls = fs
        .readFileSync(argvFile, "utf-8")
        .split("===\n")
        .map((block) => block.split("\n").filter((line) => line.length > 0))
        .filter((call) => call.length > 0);
      return { result, calls, body };
    }),
  );
}

// --- bad arguments ----------------------------------------------------------------

test("a missing body file or title argument: exit 2 and gh is never called", () => {
  assertPosix((shell) => {
    for (const args of [[], ["only-body.md"]]) {
      const result = runScript(SUT, args, { shell });
      assert.equal(result.status, 2, `args ${JSON.stringify(args)}`);
      assert.match(result.stderr, /need <body file> <title>/);
      assert.equal(result.stdout, "");
    }
  });
});

test("a body file that does not exist: exit 2 and gh is never called (nothing half-created)", () => {
  assertPosix((shell) => {
    const result = runScript(SUT, ["does-not-exist.md", "A title"], { shell });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^ERROR create-issue\.sh: body file not found: does-not-exist\.md$/m);
    assert.equal(result.stdout, "");
  });
});

test("an unknown flag or a flag missing its value: exit 2 and gh is never called", () => {
  assertPosix((shell) => {
    for (const args of [["<body>", "A title", "--bogus"], ["<body>", "A title", "--type"], ["<body>", "A title", "--label"]]) {
      const { result, calls } = runStubbed(shell, args);
      assert.equal(result.status, 2, `args ${JSON.stringify(args)}: ${result.stderr}`);
      assert.equal(result.stdout, "");
      assert.equal(calls.length, 0);
    }
  });
});

// --- gh missing or create failing --------------------------------------------------

const ghOnCorePath = coreUtilsPath()
  .split(path.delimiter)
  .some((dir) => ["gh", "gh.exe"].some((n) => fs.existsSync(path.join(dir, n))));

test(
  "gh not on PATH: exit 1 with one ERROR line naming gh",
  { skip: ghOnCorePath ? "a real gh sits in the core utilities directory, so its absence cannot be staged" : false },
  () => {
    assertPosix((shell) => {
      withTempDir("p2p2-create-issue-", (cwd) => {
        const body = path.join(cwd, "body.md");
        fs.writeFileSync(body, "body\n");
        const result = runScript(SUT, [body, "A title"], { shell, cwd, env: { PATH: coreUtilsPath() } });
        assert.equal(result.status, 1);
        assert.equal(result.stdout, "");
        assert.match(result.stderr, /^ERROR create-issue\.sh: gh not found on PATH$/m);
      });
    });
  },
);

test("gh issue create fails: exit 1, one ERROR line carrying gh's message, nothing on stdout", () => {
  assertPosix((shell) => {
    const { result, calls } = runStubbed(shell, ["<body>", "A title"], { CREATE_EXIT: "1", CREATE_STDERR: "HTTP 401: Bad credentials\n" });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    const lines = result.stderr.split("\n").filter((l) => l.length > 0);
    assert.equal(lines.length, 1, `expected a single ERROR line, got:\n${result.stderr}`);
    assert.match(lines[0], /^ERROR create-issue\.sh: gh issue create failed: .*Bad credentials/);
    assert.equal(calls.length, 1);
  });
});

test("gh issue create exits 0 but prints no parsable issue URL: exit 1, nothing on stdout", () => {
  assertPosix((shell) => {
    for (const out of ["", "not a url\n", "https://github.com/acme/widgets/pull/42\n"]) {
      const { result } = runStubbed(shell, ["<body>", "A title"], { CREATE_STDOUT: out });
      assert.equal(result.status, 1, `gh stdout ${JSON.stringify(out)}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /^ERROR create-issue\.sh: gh issue create failed:/);
    }
  });
});

// --- success, no --type ------------------------------------------------------------

test("no --type: the body reaches gh issue create through --body-file, flags forward verbatim and in order, TYPE=none, and gh api is never called", () => {
  assertPosix((shell) => {
    const { result, calls, body } = runStubbed(
      shell,
      ["<body>", "A title", "--label", "bug", "--assignee", "octocat", "--label", "triage", "--project", "Roadmap"],
      { CREATE_STDOUT: ISSUE_URL + "\n" },
    );
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `ISSUE_URL=${ISSUE_URL}\nISSUE_NUMBER=42\nTYPE=none\n`);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], [
      "issue", "create", "--title", "A title", "--body-file", body,
      "--label", "bug", "--assignee", "octocat", "--label", "triage", "--project", "Roadmap",
    ]);
  });
});

// --- success, --type applied on a non-github.com host --------------------------------

test("--type applied: a non-github.com host's issue URL PATCHes repos/<owner>/<repo>/issues/<N> with --hostname <that host>, TYPE=applied", () => {
  assertPosix((shell) => {
    const url = "https://github.example.com/acme/widgets/issues/7";
    const { result, calls } = runStubbed(shell, ["<body>", "A title", "--type", "bug"], { CREATE_STDOUT: url + "\n" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `ISSUE_URL=${url}\nISSUE_NUMBER=7\nTYPE=applied\n`);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], ["api", "--hostname", "github.example.com", "-X", "PATCH", "repos/acme/widgets/issues/7", "-f", "type=bug"]);
  });
});

test("--type PATCH fails on a benign reason: TYPE=dropped, TYPE_ERROR carries the message, and the issue is never removed", () => {
  assertPosix((shell) => {
    for (const msg of ["issue types are not enabled for this repository", "HTTP 404: Not Found", "HTTP 403: Forbidden"]) {
      const { result, calls } = runStubbed(shell, ["<body>", "A title", "--type", "bug"], {
        CREATE_STDOUT: ISSUE_URL + "\n",
        API_EXIT: "1",
        API_STDERR: msg,
      });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(result.stdout, `ISSUE_URL=${ISSUE_URL}\nISSUE_NUMBER=42\nTYPE=dropped\nTYPE_ERROR=${msg}\n`);
      assert.ok(!calls.some((c) => c.includes("delete")), "the created issue must never be deleted");
    }
  });
});

test("--type PATCH fails on an unrecognized reason: TYPE=error, TYPE_ERROR carries the message, and the issue is never removed", () => {
  assertPosix((shell) => {
    const msg = "HTTP 500: Internal Server Error";
    const { result, calls } = runStubbed(shell, ["<body>", "A title", "--type", "bug"], {
      CREATE_STDOUT: ISSUE_URL + "\n",
      API_EXIT: "1",
      API_STDERR: msg,
    });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `ISSUE_URL=${ISSUE_URL}\nISSUE_NUMBER=42\nTYPE=error\nTYPE_ERROR=${msg}\n`);
    assert.ok(!calls.some((c) => c.includes("delete")), "the created issue must never be deleted");
  });
});
