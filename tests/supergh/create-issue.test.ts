/*
 * create-issue.test.ts - proves supergh/skills/create-issue/scripts/create.sh's
 * `create.sh <body-path> <title> [--type X] [--label L]... [--assignee A]...
 * [--project P]...` contract against a stubbed `gh`: ISSUE_URL=/ISSUE_NUMBER=
 * always printed on success, TYPE=applied|dropped|error|none across all four
 * outcomes (with TYPE_ERROR= alongside dropped/error), every --label/--assignee/
 * --project pair forwarded to `gh issue create` verbatim and in order, an
 * unknown flag or a missing/valueless flag rejected with exit 2, and exit 1
 * with a single ERROR line on stderr and nothing printed when `gh issue
 * create` itself fails.
 *
 * create.sh is `#!/bin/sh`, so every case runs through forEachShell("posix",
 * ...) via opts.shell, never executed directly. `gh` is always a withStub -
 * this test never shells out to the real gh.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/supergh/create-issue.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { withStub } from "../harness/stub.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../supergh/skills/create-issue/scripts/create.sh");

function assertPosix(fn: (shell: Shell) => void) {
  const skips = forEachShell("posix", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "posix");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

/** A `gh` stub that answers both `issue create` and `api -X PATCH`, each
 *  argv logged one-arg-per-line (a "===" separator between calls) into
 *  `$ARGV_FILE` so a test can assert exact argument values without any
 *  shell-quoting ambiguity. Behavior of each call is controlled entirely
 *  through env vars (never hardcoded), so one stub body serves every test. */
const GH_STUB = `
log() { for a in "$@"; do printf '%s\\n' "$a" >> "$ARGV_FILE"; done; printf '===\\n' >> "$ARGV_FILE"; }
if [ "$1" = "issue" ] && [ "$2" = "create" ]; then
  log "$@"
  body_file=""; prev=""
  for a in "$@"; do
    if [ "$prev" = "--body-file" ]; then body_file="$a"; fi
    prev="$a"
  done
  if [ -n "$body_file" ] && [ ! -f "$body_file" ] && [ -n "\${REQUIRE_BODY_FILE:-}" ]; then
    printf 'gh: body-file not found: %s\\n' "$body_file" >&2
    exit 1
  fi
  if [ -n "\${ISSUE_STDERR:-}" ]; then printf '%s' "$ISSUE_STDERR" >&2; fi
  printf '%s' "\${ISSUE_STDOUT:-}"
  exit "\${ISSUE_EXIT:-0}"
fi
if [ "$1" = "api" ]; then
  log "$@"
  if [ -n "\${PATCH_STDERR:-}" ]; then printf '%s' "$PATCH_STDERR" >&2; fi
  exit "\${PATCH_EXIT:-0}"
fi
exit 1
`;

interface Ctx {
  shell: Shell;
  cwd: string;
  bodyPath: string;
  argvFile: string;
}

/** Runs `create.sh` with the `gh` stub dir prepended to PATH and
 *  `ARGV_FILE` set, so every call in a test shares the same shape. */
function runWithStub(ctx: Ctx, stubDir: string, args: string[], env: Record<string, string> = {}): RunResult {
  return runScript(SUT, args, {
    shell: ctx.shell,
    cwd: ctx.cwd,
    env: { ARGV_FILE: ctx.argvFile, ...env },
    stubDirs: [stubDir],
  });
}

function argvCalls(ctx: Ctx): string[][] {
  const raw = fs.readFileSync(ctx.argvFile, "utf-8");
  const blocks = raw.split("===\n").filter((b) => b.length > 0 || raw === "===\n");
  return blocks
    .map((block) => block.split("\n").filter((line) => line.length > 0))
    .filter((call) => call.length > 0);
}

// --- TYPE outcomes ------------------------------------------------------------

test("TYPE=applied: title with an embedded quote and a non-ASCII char round-trips, ISSUE_URL/ISSUE_NUMBER/TYPE all printed", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const bodyPath = path.join(cwd, "body.md");
        fs.writeFileSync(bodyPath, "body\n");
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath, argvFile };
        const title = 'Cost is $5 "urgent" café';
        const result = runWithStub(ctx, stubDir, [bodyPath, title, "--type", "bug"], {
          ISSUE_STDOUT: "https://github.com/acme/widgets/issues/42\n",
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        const lines = result.stdout.split("\n").filter((l) => l.length > 0);
        assert.deepEqual(lines, [
          "ISSUE_URL=https://github.com/acme/widgets/issues/42",
          "ISSUE_NUMBER=42",
          "TYPE=applied",
        ]);
        const calls = argvCalls(ctx);
        assert.equal(calls.length, 2, "expects one issue-create call and one api-PATCH call");
        assert.deepEqual(calls[0], ["issue", "create", "--title", title, "--body-file", bodyPath]);
      });
    });
  });
});

test("TYPE=dropped: each documented benign PATCH-failure pattern yields TYPE=dropped with TYPE_ERROR", () => {
  const patterns = ["Issue types are not enabled", "repo not found", "unknown issue types field", "Validation Failed", "error: 403", "error: 404"];
  assertPosix((shell) => {
    for (const message of patterns) {
      withTempDir("p2p2-create-issue-", (cwd) => {
        withStub("gh", GH_STUB, (stubDir) => {
          const bodyPath = path.join(cwd, "body.md");
          fs.writeFileSync(bodyPath, "body\n");
          const argvFile = path.join(cwd, "argv.log");
          fs.writeFileSync(argvFile, "");
          const ctx: Ctx = { shell, cwd, bodyPath, argvFile };
          const result = runWithStub(ctx, stubDir, [bodyPath, "a title", "--type", "epic"], {
            ISSUE_STDOUT: "https://github.com/acme/widgets/issues/7\n",
            PATCH_EXIT: "1",
            PATCH_STDERR: message,
          });
          assert.equal(result.status, 0, `stderr: ${result.stderr}`);
          assert.match(result.stdout, /^TYPE=dropped$/m, `pattern "${message}" should be classified as dropped:\n${result.stdout}`);
          assert.match(result.stdout, new RegExp(`^TYPE_ERROR=.*${message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
        });
      });
    }
  });
});

test("TYPE=error: an unrelated PATCH failure yields TYPE=error with TYPE_ERROR", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const bodyPath = path.join(cwd, "body.md");
        fs.writeFileSync(bodyPath, "body\n");
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath, argvFile };
        const result = runWithStub(ctx, stubDir, [bodyPath, "a title", "--type", "bug"], {
          ISSUE_STDOUT: "https://github.com/acme/widgets/issues/9\n",
          PATCH_EXIT: "1",
          PATCH_STDERR: "internal server error",
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.match(result.stdout, /^TYPE=error$/m);
        assert.match(result.stdout, /^TYPE_ERROR=.*internal server error/m);
      });
    });
  });
});

test("TYPE=none: no --type given, no PATCH call is made at all", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const bodyPath = path.join(cwd, "body.md");
        fs.writeFileSync(bodyPath, "body\n");
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath, argvFile };
        const result = runWithStub(ctx, stubDir, [bodyPath, "a title"], {
          ISSUE_STDOUT: "https://github.com/acme/widgets/issues/3\n",
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        const lines = result.stdout.split("\n").filter((l) => l.length > 0);
        assert.deepEqual(lines, ["ISSUE_URL=https://github.com/acme/widgets/issues/3", "ISSUE_NUMBER=3", "TYPE=none"]);
        const calls = argvCalls(ctx);
        assert.equal(calls.length, 1, "no api PATCH call should be logged when --type is absent");
      });
    });
  });
});

// --- flag forwarding ------------------------------------------------------------

test("repeated --label/--assignee/--project pairs are all forwarded to gh verbatim, in order", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const bodyPath = path.join(cwd, "body.md");
        fs.writeFileSync(bodyPath, "body\n");
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath, argvFile };
        const result = runWithStub(
          ctx,
          stubDir,
          [
            bodyPath,
            "a title",
            "--label",
            "bug",
            "--label",
            "urgent",
            "--assignee",
            "octocat",
            "--project",
            "Roadmap",
          ],
          { ISSUE_STDOUT: "https://github.com/acme/widgets/issues/1\n" },
        );
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        const calls = argvCalls(ctx);
        assert.equal(calls.length, 1);
        assert.deepEqual(calls[0], [
          "issue",
          "create",
          "--title",
          "a title",
          "--body-file",
          bodyPath,
          "--label",
          "bug",
          "--label",
          "urgent",
          "--assignee",
          "octocat",
          "--project",
          "Roadmap",
        ]);
      });
    });
  });
});

test("an unknown flag exits 2", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const bodyPath = path.join(cwd, "body.md");
        fs.writeFileSync(bodyPath, "body\n");
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath, argvFile };
        const result = runWithStub(ctx, stubDir, [bodyPath, "a title", "--bogus", "x"]);
        assert.equal(result.status, 2);
        assert.match(result.stderr, /unknown flag --bogus/);
      });
    });
  });
});

test("--type with no value exits 2", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const bodyPath = path.join(cwd, "body.md");
        fs.writeFileSync(bodyPath, "body\n");
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath, argvFile };
        const result = runWithStub(ctx, stubDir, [bodyPath, "a title", "--type"]);
        assert.equal(result.status, 2);
        assert.match(result.stderr, /--type needs a value/);
      });
    });
  });
});

// --- missing arguments ----------------------------------------------------------

test("exit 2 on no arguments", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath: "", argvFile };
        const result = runWithStub(ctx, stubDir, []);
        assert.equal(result.status, 2);
        assert.match(result.stderr, /need <body_path> <title>/);
      });
    });
  });
});

test("exit 2 when only the body path is given (title missing)", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const bodyPath = path.join(cwd, "body.md");
        fs.writeFileSync(bodyPath, "body\n");
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath, argvFile };
        const result = runWithStub(ctx, stubDir, [bodyPath]);
        assert.equal(result.status, 2);
        assert.match(result.stderr, /need <body_path> <title>/);
      });
    });
  });
});

// --- gh issue create failure -----------------------------------------------------

test("gh issue create fails: exit 1, a single ERROR line on stderr, nothing printed on stdout", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const bodyPath = path.join(cwd, "body.md");
        fs.writeFileSync(bodyPath, "body\n");
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath, argvFile };
        const result = runWithStub(ctx, stubDir, [bodyPath, "a title"], {
          ISSUE_EXIT: "1",
          ISSUE_STDERR: "permission denied",
        });
        assert.equal(result.status, 1);
        assert.equal(result.stdout, "");
        const stderrLines = result.stderr.split("\n").filter((l) => l.length > 0);
        assert.equal(stderrLines.length, 1, `expected a single ERROR line, got:\n${result.stderr}`);
        assert.match(result.stderr, /^ERROR create\.sh: gh issue create failed:/);
      });
    });
  });
});

test("a body path that does not exist: create.sh does not itself validate the file, it lets gh reject it", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const missingBodyPath = path.join(cwd, "does-not-exist.md");
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath: missingBodyPath, argvFile };
        const result = runWithStub(ctx, stubDir, [missingBodyPath, "a title"], {
          REQUIRE_BODY_FILE: "1",
        });
        // The stub enforces file existence the way real gh would; create.sh
        // must relay that failure through the same exit-1/ERROR contract as
        // any other gh failure - it never pre-checks the path itself.
        assert.equal(result.status, 1);
        assert.match(result.stderr, /^ERROR create\.sh: gh issue create failed:/);
      });
    });
  });
});

// --- URL parsing edge cases -------------------------------------------------------

test("a URL followed by a trailing CRLF still parses cleanly", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const bodyPath = path.join(cwd, "body.md");
        fs.writeFileSync(bodyPath, "body\n");
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath, argvFile };
        const result = runWithStub(ctx, stubDir, [bodyPath, "a title"], {
          ISSUE_STDOUT: "https://github.com/acme/widgets/issues/11\r\n\r\n",
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.match(result.stdout, /^ISSUE_URL=https:\/\/github\.com\/acme\/widgets\/issues\/11$/m);
        assert.match(result.stdout, /^ISSUE_NUMBER=11$/m);
      });
    });
  });
});

test("gh writes a warning to stderr and exits 0: the URL is still found among the noise", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const bodyPath = path.join(cwd, "body.md");
        fs.writeFileSync(bodyPath, "body\n");
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath, argvFile };
        const result = runWithStub(ctx, stubDir, [bodyPath, "a title"], {
          ISSUE_STDOUT: "https://github.com/acme/widgets/issues/12\n",
          ISSUE_STDERR: "warning: some non-fatal notice\n",
        });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.match(result.stdout, /^ISSUE_URL=https:\/\/github\.com\/acme\/widgets\/issues\/12$/m);
      });
    });
  });
});

test("a URL with a non-numeric issue number never matches the pattern -> treated as create failure, exit 1", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-create-issue-", (cwd) => {
      withStub("gh", GH_STUB, (stubDir) => {
        const bodyPath = path.join(cwd, "body.md");
        fs.writeFileSync(bodyPath, "body\n");
        const argvFile = path.join(cwd, "argv.log");
        fs.writeFileSync(argvFile, "");
        const ctx: Ctx = { shell, cwd, bodyPath, argvFile };
        const result = runWithStub(ctx, stubDir, [bodyPath, "a title"], {
          ISSUE_STDOUT: "https://github.com/acme/widgets/issues/abc\n",
        });
        assert.equal(result.status, 1);
        assert.equal(result.stdout, "");
        assert.match(result.stderr, /^ERROR create\.sh: gh issue create failed:/);
      });
    });
  });
});
