/*
 * pr-threads.test.ts - proves viber/scripts/pr-threads.sh's
 * `pr-threads.sh <N | #N | pull request url>` contract up to its thread lines,
 * against a real throwaway git repo and a stubbed `gh`: the argument forms and
 * the exit 2 on a malformed one, the no-gh and no-repo stops, the wrong-branch
 * stop (no thread line, no threads file), the PR= to PUSHED= lines of a ready
 * run and exit 1 with one ERROR line when gh fails or prints nothing usable.
 *
 * pr-threads.sh is `#!/bin/sh`, so every case runs through
 * forEachShell("posix", ...) via opts.shell, never executed directly. `gh` is
 * always a withStub, or absent - this test never shells out to the real gh. The
 * stub answers `gh api graphql ... --jq <filter>` with the text the filter
 * would print (URL=, HEAD=, OID= lines), because the filter itself runs inside
 * the real gh.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/pr-threads.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";
import { coreUtilsPath, withStub } from "../harness/stub.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/pr-threads.sh");

async function assertPosix(fn: (shell: Shell) => void | Promise<void>) {
  const skips = await forEachShell("posix", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "posix");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

const PR_URL = "https://github.com/acme/widgets/pull/7";

/** A `gh` stub logging its argv one-arg-per-line (a "===" separator after each
 *  call) into `$ARGV_FILE`; its stdout, stderr and exit code come from env vars. */
const GH_STUB = `
for a in "$@"; do printf '%s\\n' "$a" >> "$ARGV_FILE"; done; printf '===\\n' >> "$ARGV_FILE"
if [ -n "\${GH_STDERR:-}" ]; then printf '%s' "$GH_STDERR" >&2; fi
printf '%s' "\${GH_STDOUT:-}"
exit "\${GH_EXIT:-0}"
`;

interface Scene {
  work: GitRepo;
  stubDir: string;
  argvFile: string;
  sha: string;
}

/** A work repo with one commit on `feature/x` and a `gh` stub first on PATH. */
async function withScene<T>(fn: (scene: Scene) => Promise<T>): Promise<T> {
  return await withGitRepo((work) =>
    withStub("gh", GH_STUB, async (stubDir) => {
      const argvFile = path.join(stubDir, "argv.log");
      fs.writeFileSync(argvFile, "");
      fs.writeFileSync(path.join(work.dir, "README.md"), "readme\n");
      await work.git("add", "--", "README.md");
      await work.git("commit", "-m", "init");
      await work.git("checkout", "-b", "feature/x");
      const sha = (await work.git("rev-parse", "HEAD")).stdout.trim();
      return await fn({ work, stubDir, argvFile, sha });
    }),
  );
}

/** What the real gh prints once its --jq filter ran. */
function ghOut(head: string, oid: string, url = PR_URL): string {
  return `URL=${url}\nHEAD=${head}\nOID=${oid}\n`;
}

async function runThreads(
  shell: Shell,
  scene: Scene,
  args: string[],
  opts: { env?: Record<string, string>; cwd?: string; noGh?: boolean } = {},
): Promise<RunResult> {
  const env = { ...scene.work.env, ARGV_FILE: scene.argvFile, ...(opts.noGh ? { PATH: coreUtilsPath() } : {}), ...opts.env };
  return await runScript(SUT, args, { shell, cwd: opts.cwd ?? scene.work.dir, env, stubDirs: opts.noGh ? [] : [scene.stubDir] });
}

/** Every gh call the stub logged, one argv array each. */
function ghCalls(scene: Scene): string[][] {
  return fs
    .readFileSync(scene.argvFile, "utf-8")
    .split("===\n")
    .map((block) => block.split("\n").filter((line) => line.length > 0))
    .filter((call) => call.length > 0);
}

/** The argument following `flag` in a logged gh call, undefined when the flag is absent. */
function flagValue(call: string[], flag: string): string | undefined {
  const at = call.indexOf(flag);
  return at < 0 ? undefined : call[at + 1];
}

function lines(result: RunResult): string[] {
  return result.stdout.split("\n").filter((l) => l.length > 0);
}

function stderrLines(result: RunResult): string[] {
  return result.stderr.split("\n").filter((l) => l.length > 0);
}

// --- arguments (DoD 1) -----------------------------------------------------------------

const BAD_ARGS: { name: string; args: string[] }[] = [
  { name: "no argument", args: [] },
  { name: "two arguments", args: ["7", "8"] },
  { name: "an empty argument", args: [""] },
  { name: "a word", args: ["abc"] },
  { name: "a lone hash", args: ["#"] },
  { name: "a number with a suffix", args: ["7x"] },
  { name: "an issue url", args: ["https://github.com/acme/widgets/issues/7"] },
  { name: "a pull url without a repository", args: ["https://github.com/acme/pull/7"] },
  { name: "a pull url with a non-numeric number", args: ["https://github.com/acme/widgets/pull/x"] },
  { name: "a plain http pull url", args: ["http://github.com/acme/widgets/pull/7"] },
];

for (const row of BAD_ARGS) {
  test(`${row.name}: exit 2 with one ERROR line, nothing on stdout and gh never called`, async () => {
    await assertPosix(async (shell) => {
      await withScene(async (scene) => {
        const result = await runThreads(shell, scene, row.args);
        assert.equal(result.status, 2, `stderr: ${result.stderr}`);
        assert.equal(result.stdout, "");
        assert.match(stderrLines(result).join("\n"), /^ERROR pr-threads\.sh: [^\n]+$/);
        assert.deepEqual(ghCalls(scene), []);
      });
    });
  });
}

const FORMS: { name: string; arg: string; hostname?: string; owner: string; repo: string }[] = [
  { name: "a bare number", arg: "7", owner: "owner={owner}", repo: "name={repo}" },
  { name: "a #number", arg: "#7", owner: "owner={owner}", repo: "name={repo}" },
  { name: "a pull url", arg: PR_URL, hostname: "github.com", owner: "owner=acme", repo: "name=widgets" },
  {
    name: "a pull url on another host with a fragment",
    arg: "https://ghe.example.com/acme/widgets/pull/7#discussion_r12",
    hostname: "ghe.example.com",
    owner: "owner=acme",
    repo: "name=widgets",
  },
  { name: "a pull url with a query", arg: `${PR_URL}?notification_referrer_id=1`, hostname: "github.com", owner: "owner=acme", repo: "name=widgets" },
];

for (const row of FORMS) {
  test(`${row.name} reaches gh api graphql with its owner, name, number 7 and ${row.hostname ? `--hostname ${row.hostname}` : "no --hostname"}`, async () => {
    await assertPosix(async (shell) => {
      await withScene(async (scene) => {
        const result = await runThreads(shell, scene, [row.arg], { env: { GH_STDOUT: ghOut("feature/x", scene.sha) } });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        const call = ghCalls(scene)[0];
        assert.deepEqual(call.slice(0, 2), ["api", "graphql"]);
        assert.ok(call.includes(row.owner), `owner in ${call.join(" ")}`);
        assert.ok(call.includes(row.repo), `name in ${call.join(" ")}`);
        assert.ok(call.includes("number=7"), `number in ${call.join(" ")}`);
        assert.equal(flagValue(call, "--hostname"), row.hostname);
      });
    });
  });
}

// --- the stops before gh (DoD 2) --------------------------------------------------------

const ghOnCorePath = coreUtilsPath()
  .split(path.delimiter)
  .some((dir) => ["gh", "gh.exe"].some((n) => fs.existsSync(path.join(dir, n))));

test(
  "gh missing: STATUS=stop REASON=no-gh and nothing else",
  { skip: ghOnCorePath ? "a real gh sits in the core utilities directory, so its absence cannot be staged" : false },
  async () => {
    await assertPosix(async (shell) => {
      await withScene(async (scene) => {
        const result = await runThreads(shell, scene, ["7"], { noGh: true });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.equal(result.stdout, "STATUS=stop\nREASON=no-gh\n");
      });
    });
  },
);

test("a working directory outside a git repository: STATUS=stop REASON=no-repo and gh api never called", async () => {
  await assertPosix(async (shell) => {
    await withScene(async (scene) => {
      await withTempDir("pr-threads-norepo-", async (dir) => {
        const result = await runThreads(shell, scene, ["7"], { cwd: dir, env: { GIT_CEILING_DIRECTORIES: path.dirname(dir) } });
        assert.equal(result.status, 0, `stderr: ${result.stderr}`);
        assert.equal(result.stdout, "STATUS=stop\nREASON=no-repo\n");
        assert.deepEqual(ghCalls(scene), []);
      });
    });
  });
});

// --- the wrong-branch stop (DoD 3) -------------------------------------------------------

test("a current branch other than headRefName: STATUS=stop REASON=wrong-branch with the branch facts, no THREAD= line", async () => {
  await assertPosix(async (shell) => {
    await withScene(async (scene) => {
      const result = await runThreads(shell, scene, ["7"], { env: { GH_STDOUT: ghOut("other", "0".repeat(40)) } });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.equal(
        result.stdout,
        `STATUS=stop\nREASON=wrong-branch\nPR=7\nPR_URL=${PR_URL}\nHEAD_BRANCH=other\nBRANCH=feature/x\nPUSHED=no\n`,
      );
    });
  });
});

test("a wrong-branch stop writes no threads file", async () => {
  await assertPosix(async (shell) => {
    await withScene(async (scene) => {
      await runThreads(shell, scene, ["7"], { env: { GH_STDOUT: ghOut("other", scene.sha) } });
      assert.equal(fs.existsSync(path.join(scene.work.dir, ".temp", "viber", "pr-feedback")), false);
    });
  });
});

test("a detached HEAD is a wrong-branch stop with an empty BRANCH=", async () => {
  await assertPosix(async (shell) => {
    await withScene(async (scene) => {
      await scene.work.git("checkout", "--detach");
      const result = await runThreads(shell, scene, ["7"], { env: { GH_STDOUT: ghOut("feature/x", scene.sha) } });
      assert.equal(result.stdout, `STATUS=stop\nREASON=wrong-branch\nPR=7\nPR_URL=${PR_URL}\nHEAD_BRANCH=feature/x\nBRANCH=\nPUSHED=yes\n`);
    });
  });
});

// --- PUSHED (DoD 4) ---------------------------------------------------------------------

test("a ready run prints STATUS= to PUSHED= in order, PUSHED=yes when local HEAD is headRefOid", async () => {
  await assertPosix(async (shell) => {
    await withScene(async (scene) => {
      const result = await runThreads(shell, scene, ["7"], { env: { GH_STDOUT: ghOut("feature/x", scene.sha) } });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.deepEqual(lines(result).slice(0, 6), ["STATUS=ready", "PR=7", `PR_URL=${PR_URL}`, "HEAD_BRANCH=feature/x", "BRANCH=feature/x", "PUSHED=yes"]);
    });
  });
});

test("a headRefOid other than local HEAD gives PUSHED=no", async () => {
  await assertPosix(async (shell) => {
    await withScene(async (scene) => {
      const result = await runThreads(shell, scene, ["7"], { env: { GH_STDOUT: ghOut("feature/x", "f".repeat(40)) } });
      assert.equal(lines(result)[5], "PUSHED=no");
    });
  });
});

test("a local commit on top of headRefOid gives PUSHED=no", async () => {
  await assertPosix(async (shell) => {
    await withScene(async (scene) => {
      await scene.work.git("commit", "--allow-empty", "-m", "local only");
      const result = await runThreads(shell, scene, ["7"], { env: { GH_STDOUT: ghOut("feature/x", scene.sha) } });
      assert.equal(lines(result)[5], "PUSHED=no");
    });
  });
});

// --- gh failure (DoD 5) -----------------------------------------------------------------

const GH_FAILURES: { name: string; env: Record<string, string> }[] = [
  { name: "gh exits 1", env: { GH_EXIT: "1", GH_STDERR: "HTTP 401: Bad credentials\n" } },
  { name: "gh exits 0 and prints nothing", env: {} },
  { name: "gh exits 0 and prints no headRefOid", env: { GH_STDOUT: `URL=${PR_URL}\nHEAD=feature/x\nOID=\n` } },
  { name: "gh exits 1 although it printed a block", env: { GH_EXIT: "1", GH_STDOUT: ghOut("feature/x", "a".repeat(40)) } },
];

for (const row of GH_FAILURES) {
  test(`${row.name}: exit 1 with one ERROR line and nothing on stdout`, async () => {
    await assertPosix(async (shell) => {
      await withScene(async (scene) => {
        const result = await runThreads(shell, scene, ["7"], { env: row.env });
        assert.equal(result.status, 1);
        assert.equal(result.stdout, "");
        assert.match(stderrLines(result).join("\n"), /^ERROR pr-threads\.sh: [^\n]+$/);
      });
    });
  });
}
