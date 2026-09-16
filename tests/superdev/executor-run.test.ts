/*
 * executor-run.test.ts - proves run.sh's contract, the deterministic half of
 * the superdev:executor fork: it reads a `label: value` block from stdin
 * (`command:` required, `cwd:`, `timeout:` and `expect-exit:` optional), runs
 * that one shell line through `bash -c`, keeps the whole output in
 * <repo-root>/.temp/superdev/logs/<utc>-<slug>-<pid>.log, and prints only the
 * fixed block `RESULT:` / `STATUS:` / `EXIT:` / `DURATION:` / `LOG:` /
 * `LINES:` / `TAIL:` (plus a single `REASON:` line on an error). `RESULT:`
 * comes first on every path and carries the whole SUCCESS/DEVIATION verdict,
 * so a caller can act on the block without reading the log; `TAIL:` is dropped
 * when the log holds no line with content. The command's own exit code is DATA
 * on the EXIT: line: the script exits 0 for ok and timeout, 2 for every error.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/executor-run.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunOpts, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir } from "../harness/tmp.ts";
import { withStub } from "../harness/stub.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/skills/executor/scripts/run.sh");

/** Feeds one label block to run.sh on stdin, the way the fork's heredoc does. */
function run(block: string[], opts: RunOpts = {}): RunResult {
  return runScript(SUT, [], { input: `${block.join("\n")}\n`, ...opts });
}

/** The printed block as its non-empty lines, in order. */
function lines(result: RunResult): string[] {
  return result.stdout.split("\n").filter((line) => line.length > 0);
}

/** The value of one printed line, e.g. valueOf(result, "LOG"). */
function valueOf(result: RunResult, label: string): string {
  const hit = lines(result).find((line) => line.startsWith(`${label}: `));
  assert.ok(hit !== undefined, `no ${label}: line in:\n${result.stdout}`);
  return hit.slice(label.length + 2);
}

test("happy path prints the fixed block, RESULT first, and keeps the whole output in the log", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const result = run([`command: printf 'hello\\nworld\\n'`, `cwd: ${slash(dir)}`]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stderr, "");
    const out = lines(result);
    assert.equal(out.length, 7, result.stdout);
    assert.equal(out[0], "RESULT: SUCCESS");
    assert.equal(out[1], "STATUS: ok");
    assert.equal(out[2], "EXIT: 0");
    assert.match(out[3], /^DURATION: \d+s$/);
    assert.match(out[4], /^LOG: \S/);
    assert.equal(out[5], "LINES: 2");
    assert.equal(out[6], "TAIL: world", "the log's last line rides on TAIL:");
    // no git repository above a temp dir, so cwd itself is the root
    const log = valueOf(result, "LOG");
    assert.equal(slash(path.dirname(log)), `${slash(dir)}/.temp/superdev/logs`);
    assert.equal(fs.readFileSync(log, "utf-8"), "hello\nworld\n");
  });
});

test("a non-zero exit is data: STATUS stays ok, the code rides on EXIT, the script exits 0", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const result = run([`command: printf 'boom\\n' >&2; exit 3`, `cwd: ${slash(dir)}`]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const out = lines(result);
    assert.equal(out[1], "STATUS: ok");
    assert.equal(out[2], "EXIT: 3");
    // stderr is captured too - the log is the command's whole output
    assert.equal(fs.readFileSync(valueOf(result, "LOG"), "utf-8"), "boom\n");
  });
});

test("inside a git repository the log lands under the repository root, not under the command's cwd", () => {
  withGitRepo((repo) => {
    const sub = path.join(repo.dir, "src", "deep");
    fs.mkdirSync(sub, { recursive: true });
    const result = run([`command: echo hi`, `cwd: ${slash(sub)}`], { env: repo.env });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const log = valueOf(result, "LOG");
    const root = slash(fs.realpathSync(repo.dir));
    assert.equal(slash(path.dirname(log)), `${root}/.temp/superdev/logs`);
    assert.ok(fs.existsSync(log), `log missing: ${log}`);
  });
});

test("a command that outruns its timeout is killed: STATUS timeout, EXIT 124, script exit 0", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const started = Date.now();
    const result = run([`command: sleep 30`, `cwd: ${slash(dir)}`, `timeout: 1`]);
    const elapsed = Date.now() - started;
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const out = lines(result);
    assert.equal(out[1], "STATUS: timeout");
    assert.equal(out[2], "EXIT: 124");
    assert.equal(out.length, 6, result.stdout);
    assert.ok(elapsed < 10_000, `the timeout was not enforced: ${elapsed}ms`);
    assert.ok(fs.existsSync(valueOf(result, "LOG")), "the partial log must survive the kill");
  });
});

test("no command: line -> RESULT DEVIATION, STATUS error with a one-line REASON, exit 2, and no log at all", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const result = run([`cwd: ${slash(dir)}`]);
    assert.equal(result.status, 2);
    assert.deepEqual(lines(result), ["RESULT: DEVIATION", "STATUS: error", "REASON: missing command:"]);
    assert.equal(fs.existsSync(path.join(dir, ".temp")), false, "a pre-launch error writes nothing");
  });
});

test("a cwd: that does not exist -> STATUS error naming the directory, exit 2", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const missing = path.join(dir, "nope");
    const result = run([`command: echo hi`, `cwd: ${slash(missing)}`]);
    assert.equal(result.status, 2);
    assert.equal(lines(result).length, 3, result.stdout);
    assert.equal(lines(result)[0], "RESULT: DEVIATION");
    assert.equal(lines(result)[1], "STATUS: error");
    assert.equal(slash(valueOf(result, "REASON")), `working directory missing: ${slash(missing)}`);
  });
});

for (const bad of ["abc", "0"]) {
  test(`timeout: ${bad} is not a positive integer -> STATUS error, exit 2`, () => {
    withTempDir("p2p2-executor-", (dir) => {
      const result = run([`command: echo hi`, `cwd: ${slash(dir)}`, `timeout: ${bad}`]);
      assert.equal(result.status, 2);
      assert.deepEqual(lines(result), ["RESULT: DEVIATION", "STATUS: error", `REASON: invalid timeout: ${bad}`]);
      assert.equal(fs.existsSync(path.join(dir, ".temp")), false, "a pre-launch error writes nothing");
    });
  });
}

test("a command the shell cannot find -> the whole block, STATUS error, EXIT 127, exit 2", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const result = run([`command: definitely-not-a-real-command-xyz`, `cwd: ${slash(dir)}`]);
    assert.equal(result.status, 2);
    const out = lines(result);
    assert.equal(out.length, 8, result.stdout);
    assert.equal(out[0], "RESULT: DEVIATION");
    assert.equal(out[1], "STATUS: error");
    assert.equal(out[2], "EXIT: 127");
    assert.match(out[3], /^DURATION: \d+s$/);
    assert.match(out[4], /^LOG: \S/);
    assert.match(out[5], /^LINES: [1-9]\d*$/);
    assert.match(out[6], /^TAIL: .*command not found/);
    assert.match(out[7], /^REASON: command not found or not executable \(exit 127\)$/);
    // the command DID run, so the shell's own message is in the log
    assert.match(fs.readFileSync(valueOf(result, "LOG"), "utf-8"), /command not found/);
  });
});

test("the log basename is <utc>-<slug>-<pid>.log, the command sanitised into the slug", () => {
  withTempDir("p2p2-executor-", (dir) => {
    // stubbed so the slug, not the real npm, is what this case exercises
    withStub("npm", "exit 0", (stubDir) => {
      const result = run([`command: npm test -- --grep "a b"`, `cwd: ${slash(dir)}`], { stubDirs: [stubDir] });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      const base = path.basename(valueOf(result, "LOG"));
      assert.match(base, /^\d{8}T\d{6}Z-npm-test-grep-a-b-\d+\.log$/);
    });
  });
});

test("the first occurrence of a label wins; unknown lines and a CRLF block are tolerated", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const result = run([
      `# a comment line is not a label`,
      `command: echo first\r`,
      `command: echo second\r`,
      `expect: the fork's own label, unknown here\r`,
      `expect-exit: nonzero\r`,
      `expect-exit: 0\r`,
      `cwd: ${slash(dir)}\r`,
    ]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    // the first expect-exit: wins too, its CR stripped before it is validated
    assert.equal(lines(result)[0], "RESULT: DEVIATION");
    assert.equal(lines(result)[1], "STATUS: ok");
    assert.equal(fs.readFileSync(valueOf(result, "LOG"), "utf-8"), "first\n");
  });
});

test("no cwd: line -> the command runs in the caller's own cwd", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const result = run([`command: pwd`], { cwd: dir });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const out = lines(result);
    assert.equal(out[1], "STATUS: ok");
    assert.equal(out[2], "EXIT: 0");
    // $PWD is the shell's own spelling of dir (an msys path under Git-Bash),
    // so only the tail of the log location compares across platforms
    assert.match(slash(valueOf(result, "LOG")), /\/\.temp\/superdev\/logs\/[^/]+\.log$/);
    assert.equal(out[5], "LINES: 1", "pwd printed its one line into the log");
  });
});

test("with no expect-exit: a non-zero exit is a DEVIATION while exit 0 stays a SUCCESS", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const deviation = run([`command: exit 3`, `cwd: ${slash(dir)}`]);
    assert.equal(deviation.status, 0, `stderr: ${deviation.stderr}`);
    assert.equal(lines(deviation)[0], "RESULT: DEVIATION");
    const success = run([`command: exit 0`, `cwd: ${slash(dir)}`]);
    assert.equal(lines(success)[0], "RESULT: SUCCESS");
  });
});

test("expect-exit: nonzero inverts the verdict - a failing command is the SUCCESS, exit 0 the DEVIATION", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const failed = run([`command: exit 1`, `cwd: ${slash(dir)}`, `expect-exit: nonzero`]);
    assert.equal(failed.status, 0, `stderr: ${failed.stderr}`);
    assert.equal(lines(failed)[0], "RESULT: SUCCESS");
    assert.equal(lines(failed)[2], "EXIT: 1", "the code itself stays data on EXIT:");
    const passed = run([`command: exit 0`, `cwd: ${slash(dir)}`, `expect-exit: nonzero`]);
    assert.equal(lines(passed)[0], "RESULT: DEVIATION");
  });
});

test("rejects an unparsable expect-exit", () => {
  withTempDir("p2p2-executor-", (dir) => {
    // only `nonzero` and a plain decimal (no sign, no leading zero) are codes
    for (const bad of ["abc", "-1", "01"]) {
      const result = run([`command: echo hi`, `cwd: ${slash(dir)}`, `expect-exit: ${bad}`]);
      assert.equal(result.status, 2, `expect-exit: ${bad} must be rejected`);
      assert.deepEqual(lines(result), [
        "RESULT: DEVIATION",
        "STATUS: error",
        `REASON: invalid expect-exit: ${bad}`,
      ]);
      assert.equal(fs.existsSync(path.join(dir, ".temp")), false, "a pre-launch error writes nothing");
    }
  });
});

test("expect-exit: an explicit code makes exactly that code the SUCCESS", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const matched = run([`command: exit 2`, `cwd: ${slash(dir)}`, `expect-exit: 2`]);
    assert.equal(lines(matched)[0], "RESULT: SUCCESS");
    const other = run([`command: exit 3`, `cwd: ${slash(dir)}`, `expect-exit: 2`]);
    assert.equal(lines(other)[0], "RESULT: DEVIATION");
    const green = run([`command: exit 0`, `cwd: ${slash(dir)}`, `expect-exit: 2`]);
    assert.equal(lines(green)[0], "RESULT: DEVIATION", "even exit 0 deviates from an explicit code");
  });
});

test("a silent command prints RESULT, LINES: 0 and no TAIL:", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const result = run([`command: exit 0`, `cwd: ${slash(dir)}`]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const out = lines(result);
    assert.equal(out.length, 6, result.stdout);
    assert.equal(out[0], "RESULT: SUCCESS");
    assert.equal(out[1], "STATUS: ok");
    assert.equal(out[2], "EXIT: 0");
    assert.match(out[3], /^DURATION: \d+s$/);
    assert.match(out[4], /^LOG: \S/);
    assert.equal(out[5], "LINES: 0");
    // the empty log still exists: the caller may still be pointed at it
    assert.equal(fs.readFileSync(valueOf(result, "LOG"), "utf-8"), "");
  });
});

test("TAIL: is the log's last line with content - trailing blank lines and a CR ending dropped", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const result = run([`command: printf 'first\\nBuild succeeded\\r\\n\\n   \\n'`, `cwd: ${slash(dir)}`]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(valueOf(result, "TAIL"), "Build succeeded");
    assert.equal(valueOf(result, "LINES"), "4", "TAIL: reports content, LINES: still counts every line");
  });
});

test("a timeout and a shell error deviate even when the exit code alone would satisfy expect-exit:", () => {
  withTempDir("p2p2-executor-", (dir) => {
    const timedOut = run([`command: sleep 30`, `cwd: ${slash(dir)}`, `timeout: 1`, `expect-exit: 124`]);
    assert.equal(lines(timedOut)[0], "RESULT: DEVIATION");
    assert.equal(lines(timedOut)[1], "STATUS: timeout");
    const notFound = run([`command: definitely-not-a-real-command-xyz`, `cwd: ${slash(dir)}`, `expect-exit: nonzero`]);
    assert.equal(lines(notFound)[0], "RESULT: DEVIATION");
    assert.equal(lines(notFound)[1], "STATUS: error");
  });
});
