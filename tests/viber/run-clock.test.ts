/*
 * run-clock.test.ts - proves viber/scripts/run-clock.sh's contract: with no
 * argument it prints the run's start mark, with an epoch argument it prints
 * how long ago that mark was taken.
 *
 * Two properties carry the whole design. It always exits 0, because it runs as
 * a `!` preload where a non-zero exit aborts the entire skill load - so every
 * unusable argument (empty, non-numeric, in the future) is the VALUE
 * `elapsed: unknown` rather than an error, and the orchestrator drops the line
 * instead of inventing a duration. And it touches no file at all, so the
 * caller's cwd cannot change a single byte of its output.
 *
 * The clock ticks while the test runs: a case that asks for N seconds ago may
 * legitimately come back as N or N+1, so each expectation lists both literals
 * rather than deriving one.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/run-clock.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/scripts/run-clock.sh");

function run(args: string[] = [], cwd?: string) {
  return runScript(SUT, args, { cwd, shell: "bash" });
}

/** The start mark the script itself hands out, as a number. */
async function startMark(): Promise<number> {
  const result = await run();
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  const mark = Number(result.stdout.trim().replace("started: ", ""));
  assert.ok(Number.isInteger(mark), `not an epoch: ${result.stdout}`);
  return mark;
}

/** Runs the elapsed mode for a mark `seconds` in the past. */
async function elapsed(seconds: number) {
  return run([String(await startMark() - seconds)]);
}

test("no argument prints one `started:` line carrying the current epoch second", async () => {
  const before = Math.floor(Date.now() / 1000);
  const result = await run();
  const after = Math.floor(Date.now() / 1000);

  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.equal(result.stdout.trim().split("\n").length, 1);
  assert.match(result.stdout, /^started: \d+\n$/);

  const mark = Number(result.stdout.trim().slice("started: ".length));
  assert.ok(mark >= before && mark <= after, `${mark} outside [${before}, ${after}]`);
});

/** Each case: seconds ago -> the two literals the tick makes legitimate. */
const DURATIONS: Array<[number, string, string]> = [
  [0, "elapsed: 0s", "elapsed: 1s"],
  [7, "elapsed: 7s", "elapsed: 8s"],
  [59, "elapsed: 59s", "elapsed: 1m 00s"],
  [60, "elapsed: 1m 00s", "elapsed: 1m 01s"],
  [65, "elapsed: 1m 05s", "elapsed: 1m 06s"],
  [3599, "elapsed: 59m 59s", "elapsed: 1h 00m 00s"],
  [3600, "elapsed: 1h 00m 00s", "elapsed: 1h 00m 01s"],
  [8043, "elapsed: 2h 14m 03s", "elapsed: 2h 14m 04s"],
  [90061, "elapsed: 25h 01m 01s", "elapsed: 25h 01m 02s"],
];

for (const [seconds, expected, ticked] of DURATIONS) {
  test(`${seconds} seconds ago reads as ${expected.slice("elapsed: ".length)}`, async () => {
    const result = await elapsed(seconds);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout.trim().split("\n").length, 1);
    assert.ok(
      result.stdout === `${expected}\n` || result.stdout === `${ticked}\n`,
      `got ${JSON.stringify(result.stdout)}, expected ${expected} (or ${ticked})`,
    );
  });
}

test("the largest non-zero unit comes first and hours never roll over into days", async () => {
  // Epoch 0 is decades back: the hour count runs into six digits and stays an
  // hour count, and a leading-zero-free `10#` arithmetic never reads it as octal.
  const result = await run(["0"]);
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.match(result.stdout, /^elapsed: \d{5,}h \d{2}m \d{2}s\n$/);
});

test("a leading zero is decimal, never octal", async () => {
  const padded = await run([`0${await startMark() - 8043}`]);
  assert.equal(padded.status, 0, `stderr: ${padded.stderr}`);
  // A loaded machine can delay the spawn by a few seconds, so the seconds float.
  assert.match(padded.stdout, /^elapsed: 2h 14m 0[3-9]s\n$/);
});

/** Every argument that cannot be a mark, including the two shapes a lost
 *  context produces: an unsubstituted placeholder and the script's own
 *  `started: unknown` handed straight back. */
const UNUSABLE: Array<[string, string]> = [
  ["empty", ""],
  ["non-numeric", "abc"],
  ["an unsubstituted placeholder", "<started>"],
  ["the word unknown", "unknown"],
  ["a fractional epoch", "1750000000.5"],
  ["a negative number", "-1750000000"],
  ["a whole `started:` line", "started: 1750000000"],
];

for (const [label, argument] of UNUSABLE) {
  test(`${label} is \`elapsed: unknown\`, not an error`, async () => {
    const result = await run([argument]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "elapsed: unknown\n");
  });
}

test("a mark in the future is unknown rather than a negative duration", async () => {
  const result = await run([String(await startMark() + 600)]);
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.equal(result.stdout, "elapsed: unknown\n");
});

test("the exit is 0 whatever the argument, because a preload that fails takes the skill load with it", async () => {
  for (const args of [[], [""], ["abc"], ["0"], [String(Math.floor(Date.now() / 1000) + 99999)]]) {
    const result = await run(args);
    assert.equal(result.status, 0, `args ${JSON.stringify(args)} -> stderr: ${result.stderr}`);
    assert.equal(result.stderr, "");
  }
});

test("the cwd is irrelevant: a temp directory outside the repository reads the same clock", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    const started = await run([], dir);
    assert.equal(started.status, 0, `stderr: ${started.stderr}`);
    assert.match(started.stdout, /^started: \d+\n$/);

    const mark = Number(started.stdout.trim().slice("started: ".length)) - 65;
    const result = await run([String(mark)], dir);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(
      result.stdout === "elapsed: 1m 05s\n" || result.stdout === "elapsed: 1m 06s\n",
      `got ${JSON.stringify(result.stdout)}`,
    );
  });
});

test("a further argument is ignored", async () => {
  const result = await run([String(await startMark() - 8043), "extra", "arguments"]);
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.ok(
    result.stdout === "elapsed: 2h 14m 03s\n" || result.stdout === "elapsed: 2h 14m 04s\n",
    `got ${JSON.stringify(result.stdout)}`,
  );
});
