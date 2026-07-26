/*
 * rank.test.ts - proves rank.ts's
 * `rank.ts --scores SCORES [--signals SIGNALS] [--min-impact N]
 * [--min-opportunity N] [--top N] [--job JOB] [--run-id RUN_ID]
 * --out-json OUT_JSON --out-md OUT_MD` contract: score = impact * opportunity,
 * the 2x2 quadrant cut (HOTSPOT / already-fine / nobody-cares / ignore, both
 * gates inclusive), a stable rank + score/impact/churn sort, --top capping
 * hotspots into overflow rather than dropping them, the opportunity histogram
 * + degenerate flag, USAGE + exit 2 on bad arguments, and exit 0 with the
 * documented `hotlist: N hotspots from M scored files -> ...` stdout line.
 *
 * rank.ts carries no CLI guard and exports no single symbol (unlike
 * superui/scripts/check_contrast.ts:251), so every case here drives it as a
 * real subprocess via runScript, never imported - importing it would run its
 * main() unconditionally.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superfix/rank.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../superfix/skills/code-auditor/scripts/rank.ts");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

function writeJsonl(file: string, lines: unknown[]): void {
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + (lines.length ? "\n" : ""));
}

function runRank(dir: string, args: string[]): RunResult {
  return runScript(SUT, args, { cwd: dir });
}

/** Runs rank.ts over `scores` with default out paths, asserts a clean exit,
 *  and returns the parsed hotlist.json plus the raw hotlist.md text. */
function rank(
  dir: string,
  scores: unknown[],
  extraArgs: string[] = [],
): { result: RunResult; json: Rec; md: string } {
  const scoresPath = path.join(dir, "scores.jsonl");
  const jsonPath = path.join(dir, "hotlist.json");
  const mdPath = path.join(dir, "hotlist.md");
  writeJsonl(scoresPath, scores);
  const result = runRank(dir, ["--scores", scoresPath, "--out-json", jsonPath, "--out-md", mdPath, ...extraArgs]);
  assert.equal(result.status, 0, `rank.ts should exit 0: stderr=${result.stderr}`);
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const md = fs.readFileSync(mdPath, "utf8");
  return { result, json, md };
}

// --- score = impact x opportunity, the 2x2 quadrant cut ---------------------

test("score is impact x opportunity, and every quadrant is cut at the inclusive >= gate", () => {
  withTempDir("p2p2-rank-quad-", (dir) => {
    const { json, md } = rank(dir, [
      { path: "hot.ts", impact: 5, opportunity: 5 }, // HOTSPOT
      { path: "fine.ts", impact: 5, opportunity: 1 }, // already-fine
      { path: "nobody.ts", impact: 1, opportunity: 5 }, // nobody-cares
      { path: "ignore.ts", impact: 1, opportunity: 1 }, // ignore
    ]);

    assert.equal(json.counts.scored, 4);
    assert.equal(json.counts.hotspots, 1);
    assert.equal(json.counts.skipped, 3);
    assert.equal(json.hotspots.length, 1);
    assert.equal(json.hotspots[0].path, "hot.ts");
    assert.equal(json.hotspots[0].score, 25);
    assert.equal(json.hotspots[0].quadrant, "HOTSPOT");
    assert.equal(json.hotspots[0].rank, 1);

    const skippedByPath = Object.fromEntries(json.skipped.map((r: Rec) => [r.path, r]));
    assert.equal(skippedByPath["fine.ts"].quadrant, "already-fine");
    assert.equal(skippedByPath["nobody.ts"].quadrant, "nobody-cares");
    assert.equal(skippedByPath["ignore.ts"].quadrant, "ignore");
    // skipped rows carry no rank key
    for (const key of Object.keys(skippedByPath)) {
      assert.ok(!("rank" in skippedByPath[key]));
    }

    assert.match(md, /\| 1 \| `hot\.ts` \| 5 \| 5 \| 25 \|/);
  });
});

test("--min-impact / --min-opportunity are inclusive gates: a score exactly at the threshold is a HOTSPOT", () => {
  withTempDir("p2p2-rank-threshold-", (dir) => {
    const { json } = rank(
      dir,
      [{ path: "edge.ts", impact: 4, opportunity: 4 }],
      ["--min-impact", "4", "--min-opportunity", "4"],
    );
    assert.equal(json.hotspots.length, 1, "impact == min-impact and opportunity == min-opportunity must clear the gate");
    assert.equal(json.hotspots[0].quadrant, "HOTSPOT");

    const belowJson = rank(
      dir,
      [{ path: "below.ts", impact: 3, opportunity: 4 }],
      ["--min-impact", "4", "--min-opportunity", "4"],
    ).json;
    assert.equal(belowJson.hotspots.length, 0, "impact one below min-impact must not clear the gate");
    assert.equal(belowJson.skipped[0].quadrant, "nobody-cares");
  });
});

// --- reason derivation --------------------------------------------------------

test("reason prefers impact/opportunity_reason, falls back to churn/fix_commits, else empty", () => {
  withTempDir("p2p2-rank-reason-", (dir) => {
    const { json } = rank(dir, [
      { path: "reasoned.ts", impact: 4, opportunity: 4, impact_reason: "hot path", opportunity_reason: "" },
      { path: "churned.ts", impact: 4, opportunity: 4, churn: 7, fix_commits: 3 },
      { path: "unknown-churn.ts", impact: 4, opportunity: 4, churn: -1 },
      { path: "bare.ts", impact: 4, opportunity: 4 },
    ]);
    const byPath = Object.fromEntries(json.hotspots.map((r: Rec) => [r.path, r]));
    assert.equal(byPath["reasoned.ts"].reason, "hot path");
    assert.equal(byPath["churned.ts"].reason, "churn=7, fixes=3");
    assert.equal(byPath["unknown-churn.ts"].reason, "", "churn=-1 is the unknown sentinel, not a real value");
    assert.equal(byPath["bare.ts"].reason, "");
  });
});

// --- opportunity histogram + degenerate flag ---------------------------------

test("opportunity_histogram counts every scored row, and degenerate fires only when no row clears min-opportunity", () => {
  withTempDir("p2p2-rank-degenerate-", (dir) => {
    const normal = rank(dir, [
      { path: "a.ts", impact: 5, opportunity: 5 },
      { path: "b.ts", impact: 1, opportunity: 1 },
    ]).json;
    assert.deepEqual(normal.opportunity_histogram, { "1": 1, "2": 0, "3": 0, "4": 0, "5": 1 });
    assert.equal(normal.degenerate, false);

    const { json: degenerateJson, md } = rank(dir, [
      { path: "c.ts", impact: 5, opportunity: 1 },
      { path: "d.ts", impact: 5, opportunity: 2 },
    ]);
    assert.equal(degenerateJson.degenerate, true, "max opportunity (2) is below the default min-opportunity (3)");
    assert.equal(degenerateJson.hotspots.length, 0);
    assert.match(md, /DEGENERATE OPPORTUNITY DISTRIBUTION/);
  });
});

// --- --top caps hotspots into overflow, never drops gate-clearing rows -------

test("--top caps hotspots and moves the remaining gate-clearing rows to overflow", () => {
  withTempDir("p2p2-rank-top-", (dir) => {
    const scores = [
      { path: "r1.ts", impact: 5, opportunity: 5, churn: 3 },
      { path: "r2.ts", impact: 5, opportunity: 5, churn: 2 },
      { path: "r3.ts", impact: 5, opportunity: 5, churn: 1 },
    ];
    const capped = rank(dir, scores, ["--top", "1"]).json;
    assert.equal(capped.hotspots.length, 1);
    assert.equal(capped.overflow.length, 2);
    assert.equal(capped.hotspots[0].path, "r1.ts", "highest churn breaks the score/impact tie");
    assert.deepEqual(
      capped.overflow.map((r: Rec) => r.rank),
      [2, 3],
      "overflow rows keep their rank from the full gate-clearing order",
    );

    const zero = rank(dir, scores, ["--top", "0"]).json;
    assert.equal(zero.hotspots.length, 0);
    assert.equal(zero.overflow.length, 3);

    const overshoot = rank(dir, scores, ["--top", "100"]).json;
    assert.equal(overshoot.hotspots.length, 3);
    assert.equal(overshoot.overflow.length, 0);
  });
});

// --- --job / --run-id ---------------------------------------------------------

test("--job and --run-id land in hotlist.json and the hotlist.md title", () => {
  withTempDir("p2p2-rank-job-", (dir) => {
    const { json, md } = rank(
      dir,
      [{ path: "a.ts", impact: 5, opportunity: 5 }],
      ["--job", "reliability/bugs", "--run-id", "2026-06-26"],
    );
    assert.equal(json.job, "reliability/bugs");
    assert.equal(json.run_id, "2026-06-26");
    assert.match(md, /^# HOTLIST - 2026-06-26 {2}\(reliability\/bugs\)$/m);
  });
});

// --- --signals merge -----------------------------------------------------------

test("--signals merges matching rows and warns on stderr for a score with no signals row", () => {
  withTempDir("p2p2-rank-signals-", (dir) => {
    const signalsPath = path.join(dir, "signals.jsonl");
    writeJsonl(signalsPath, [{ path: "a.ts", loc: 42, dependents: 3 }]);
    const scoresPath = path.join(dir, "scores.jsonl");
    writeJsonl(scoresPath, [
      { path: "a.ts", impact: 5, opportunity: 5 },
      { path: "b.ts", impact: 5, opportunity: 5 },
    ]);
    const jsonPath = path.join(dir, "hotlist.json");
    const mdPath = path.join(dir, "hotlist.md");
    const result = runRank(dir, [
      "--scores",
      scoresPath,
      "--signals",
      signalsPath,
      "--out-json",
      jsonPath,
      "--out-md",
      mdPath,
    ]);
    assert.equal(result.status, 0, `stderr=${result.stderr}`);
    assert.match(result.stderr, /warn: no signals row for b\.ts/);
    // hotKeys never surface loc/dependents directly, but a merged signals row
    // for a.ts must not error and b.ts must still be scored despite the warn.
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    assert.equal(json.counts.scored, 2);
  });
});

// --- documented stdout marker line -------------------------------------------

test("stdout prints the documented `hotlist: N hotspots from M scored files -> ...` line", () => {
  withTempDir("p2p2-rank-stdout-", (dir) => {
    const scoresPath = path.join(dir, "scores.jsonl");
    const jsonPath = path.join(dir, "hotlist.json");
    const mdPath = path.join(dir, "hotlist.md");
    writeJsonl(scoresPath, [{ path: "a.ts", impact: 5, opportunity: 5 }]);
    const result = runRank(dir, ["--scores", scoresPath, "--out-json", jsonPath, "--out-md", mdPath]);
    assert.equal(result.stdout, `hotlist: 1 hotspots from 1 scored files -> ${jsonPath}, ${mdPath}\n`);
  });
});

// --- USAGE + exit codes -------------------------------------------------------

test("missing required arguments print USAGE + an error line on stderr and exit 2", () => {
  withTempDir("p2p2-rank-usage-", (dir) => {
    const result = runRank(dir, ["--scores", path.join(dir, "scores.jsonl")]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^usage: rank\.ts /);
    assert.match(result.stderr, /the following arguments are required: --out-json, --out-md/);
    assert.equal(result.stdout, "");
  });
});

test("--help prints the help text to stdout and exits 0", () => {
  withTempDir("p2p2-rank-help-", (dir) => {
    const result = runRank(dir, ["--help"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /^usage: rank\.ts /);
    assert.match(result.stdout, /show this help message and exit/);
  });
});

// --- boundary inputs ----------------------------------------------------------

test("an empty --scores file yields zero scored rows and a non-degenerate, all-zero histogram", () => {
  withTempDir("p2p2-rank-empty-", (dir) => {
    const { json } = rank(dir, []);
    assert.equal(json.counts.scored, 0);
    assert.equal(json.degenerate, false);
    assert.deepEqual(json.opportunity_histogram, { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 });
  });
});

test("a malformed JSONL line warns on stderr and is skipped, other rows still rank", () => {
  withTempDir("p2p2-rank-malformed-", (dir) => {
    const scoresPath = path.join(dir, "scores.jsonl");
    fs.writeFileSync(
      scoresPath,
      '{"path": "a.ts", "impact": 5, "opportunity": 5}\nnot json\n{"path": "b.ts", "impact": 5, "opportunity": 5}\n',
    );
    const jsonPath = path.join(dir, "hotlist.json");
    const mdPath = path.join(dir, "hotlist.md");
    const result = runRank(dir, ["--scores", scoresPath, "--out-json", jsonPath, "--out-md", mdPath]);
    assert.equal(result.status, 0, `stderr=${result.stderr}`);
    assert.match(result.stderr, /warn: skipping malformed line 2 in /);
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    assert.equal(json.counts.scored, 2);
  });
});

test("a record missing impact/opportunity, and a non-object record, both warn and are dropped", () => {
  withTempDir("p2p2-rank-missing-key-", (dir) => {
    const scoresPath = path.join(dir, "scores.jsonl");
    fs.writeFileSync(
      scoresPath,
      '{"path": "a.ts", "impact": 5, "opportunity": 5}\n[1,2,3]\n{"path": "no-impact.ts", "opportunity": 5}\n',
    );
    const jsonPath = path.join(dir, "hotlist.json");
    const mdPath = path.join(dir, "hotlist.md");
    const result = runRank(dir, ["--scores", scoresPath, "--out-json", jsonPath, "--out-md", mdPath]);
    assert.equal(result.status, 0, `stderr=${result.stderr}`);
    assert.match(result.stderr, /warn: skipping non-object record: \[1, 2, 3\]/);
    assert.match(result.stderr, /warn: skipping record without numeric impact\/opportunity: \{'path': 'no-impact\.ts', 'opportunity': 5\}/);
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    assert.equal(json.counts.scored, 1);
  });
});

test("ties in score are broken deterministically by impact desc, then churn desc", () => {
  withTempDir("p2p2-rank-ties-", (dir) => {
    const { json } = rank(dir, [
      { path: "high-churn.ts", impact: 5, opportunity: 5, churn: 2 },
      { path: "low-churn.ts", impact: 5, opportunity: 5, churn: 1 },
      { path: "low-impact.ts", impact: 3, opportunity: 5, churn: 99 },
    ]);
    assert.deepEqual(
      json.hotspots.map((r: Rec) => r.path),
      ["high-churn.ts", "low-churn.ts", "low-impact.ts"],
      "score 25 beats score 15 regardless of churn; within score 25, higher churn ranks first",
    );
  });
});

test("--out-json pointing at a directory that does not exist crashes with a non-zero exit", () => {
  withTempDir("p2p2-rank-unwritable-", (dir) => {
    const scoresPath = path.join(dir, "scores.jsonl");
    writeJsonl(scoresPath, [{ path: "a.ts", impact: 5, opportunity: 5 }]);
    const result = runRank(dir, [
      "--scores",
      scoresPath,
      "--out-json",
      path.join(dir, "no-such-dir", "hotlist.json"),
      "--out-md",
      path.join(dir, "hotlist.md"),
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ENOENT/);
  });
});

test("--out-md pointing at a directory that does not exist crashes with a non-zero exit", () => {
  withTempDir("p2p2-rank-unwritable-md-", (dir) => {
    const scoresPath = path.join(dir, "scores.jsonl");
    writeJsonl(scoresPath, [{ path: "a.ts", impact: 5, opportunity: 5 }]);
    const result = runRank(dir, [
      "--scores",
      scoresPath,
      "--out-json",
      path.join(dir, "hotlist.json"),
      "--out-md",
      path.join(dir, "no-such-dir", "hotlist.md"),
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ENOENT/);
  });
});

// --- edge cases ----------------------------------------------------------------

test("a path with a Windows-style backslash is preserved verbatim, and CRLF line endings parse the same as LF", () => {
  withTempDir("p2p2-rank-edgecases-", (dir) => {
    const winPath = "src\\module\\file.ts";
    const scoresPath = path.join(dir, "scores.jsonl");
    const line = JSON.stringify({ path: winPath, impact: 5, opportunity: 5 });
    fs.writeFileSync(scoresPath, `${line}\r\n`);
    const jsonPath = path.join(dir, "hotlist.json");
    const mdPath = path.join(dir, "hotlist.md");
    const result = runRank(dir, ["--scores", scoresPath, "--out-json", jsonPath, "--out-md", mdPath]);
    assert.equal(result.status, 0, `stderr=${result.stderr}`);
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    assert.equal(json.hotspots.length, 1);
    assert.equal(json.hotspots[0].path, winPath);
  });
});

test("hotlist.json is stable across two identical runs", () => {
  withTempDir("p2p2-rank-stable-", (dir) => {
    const scores = [
      { path: "a.ts", impact: 5, opportunity: 5, churn: 3 },
      { path: "b.ts", impact: 4, opportunity: 4, churn: 1 },
      { path: "c.ts", impact: 1, opportunity: 1 },
    ];
    const first = rank(dir, scores).json;
    const second = rank(dir, scores).json;
    assert.deepEqual(first, second);
  });
});
