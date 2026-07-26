/*
 * rank_edges.test.ts - proves rank_edges.ts's
 * `rank_edges.ts --edges EDGES --verdicts VERDICTS [--signals SIGNALS]
 * [--top-edges N] [--job JOB] [--run-id RUN_ID] --out-json OUT_JSON
 * --out-md OUT_MD` contract: MATCH pairs are dropped from dispatch/overflow
 * (kept in `match` for the record), NO_CONTRACT pairs likewise land in
 * `no_contract`, the remaining MISMATCH/UNCLEAR pairs rank by verdict class
 * then pair-Impact and cap at --top-edges, the per-path structural degree is
 * reported, USAGE prints on bad arguments, and stdout carries the documented
 * `edges: N dispatched from M pairs ...` line.
 *
 * rank_edges.ts carries no CLI guard and exports no single symbol (unlike
 * superui/scripts/check_contrast.ts:251), so every case here drives it as a
 * real subprocess via runScript, never imported - importing it would run its
 * main() unconditionally.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superfix/rank_edges.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../superfix/skills/code-auditor/scripts/rank_edges.ts");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

function writeJsonl(file: string, lines: unknown[]): void {
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + (lines.length ? "\n" : ""));
}

function runRankEdges(dir: string, args: string[]): RunResult {
  return runScript(SUT, args, { cwd: dir });
}

/** Runs rank_edges.ts over `edges`/`verdicts` with default out paths, asserts
 *  a clean exit, and returns the parsed edges.json plus the raw edges.md
 *  text. */
function rankEdges(
  dir: string,
  edges: unknown[],
  verdicts: unknown[],
  extraArgs: string[] = [],
): { result: RunResult; json: Rec; md: string } {
  const edgesPath = path.join(dir, "edges.jsonl");
  const verdictsPath = path.join(dir, "verdicts.jsonl");
  const jsonPath = path.join(dir, "edges.json");
  const mdPath = path.join(dir, "edges.md");
  writeJsonl(edgesPath, edges);
  writeJsonl(verdictsPath, verdicts);
  const result = runRankEdges(dir, [
    "--edges",
    edgesPath,
    "--verdicts",
    verdictsPath,
    "--out-json",
    jsonPath,
    "--out-md",
    mdPath,
    ...extraArgs,
  ]);
  assert.equal(result.status, 0, `rank_edges.ts should exit 0: stderr=${result.stderr}`);
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const md = fs.readFileSync(mdPath, "utf8");
  return { result, json, md };
}

// --- MATCH dropped, ranking by verdict class then pair-Impact ----------------

test("MATCH pairs are dropped from dispatch/overflow but kept in `match`; NO_CONTRACT likewise in `no_contract`", () => {
  withTempDir("p2p2-rank-edges-verdicts-", (dir) => {
    const edges = [
      { a: "a.ts", b: "b.ts", via: "shared.md", vias: ["shared.md"], fanout: 2, shared: 1 },
      { a: "c.ts", b: "d.ts", via: "shared.md", vias: ["shared.md"], fanout: 2, shared: 1 },
      { a: "e.ts", b: "f.ts", via: "syntax-token", vias: ["syntax-token"], fanout: 5, shared: 1 },
    ];
    const verdicts = [
      { a: "a.ts", b: "b.ts", verdict: "MATCH", reason: "contract confirmed" },
      { a: "c.ts", b: "d.ts", verdict: "MISMATCH", reason: "contract drift" },
      { a: "e.ts", b: "f.ts", verdict: "NO_CONTRACT", reason: "coincidental token" },
    ];
    const { json, md } = rankEdges(dir, edges, verdicts);

    assert.equal(json.counts.pairs, 3);
    assert.equal(json.counts.match, 1);
    assert.equal(json.counts.mismatch, 1);
    assert.equal(json.counts.no_contract, 1);
    assert.equal(json.counts.dispatch, 1);
    assert.deepEqual(
      json.dispatch.map((r: Rec) => [r.a, r.b]),
      [["c.ts", "d.ts"]],
    );
    assert.deepEqual(
      json.match.map((r: Rec) => [r.a, r.b]),
      [["a.ts", "b.ts"]],
    );
    assert.deepEqual(
      json.no_contract.map((r: Rec) => [r.a, r.b]),
      [["e.ts", "f.ts"]],
    );
    assert.match(md, /\| 1 \| `c\.ts` \| `d\.ts` \| MISMATCH \|/);
    assert.match(md, /<summary>Match \(contract confirmed, not dispatched\)<\/summary>/);
    assert.match(md, /<summary>No contract \(NO_CONTRACT, not dispatched\)<\/summary>/);
  });
});

test("MISMATCH ranks before UNCLEAR, then higher pair-Impact first (via --signals churn/dependents)", () => {
  withTempDir("p2p2-rank-edges-rank-", (dir) => {
    const edges = [
      { a: "unclear-a.ts", b: "unclear-b.ts", via: "x", vias: ["x"], fanout: 2, shared: 1 },
      { a: "mismatch-a.ts", b: "mismatch-b.ts", via: "y", vias: ["y"], fanout: 2, shared: 1 },
    ];
    const verdicts = [
      { a: "unclear-a.ts", b: "unclear-b.ts", verdict: "UNCLEAR", reason: "ambiguous" },
      { a: "mismatch-a.ts", b: "mismatch-b.ts", verdict: "MISMATCH", reason: "drift" },
    ];
    const signalsPath = path.join(dir, "signals.jsonl");
    writeJsonl(signalsPath, [
      { path: "unclear-a.ts", churn: 100, dependents: 100 },
      { path: "unclear-b.ts", churn: 100, dependents: 100 },
    ]);
    const { json } = rankEdges(dir, edges, verdicts, ["--signals", signalsPath]);
    assert.deepEqual(
      json.dispatch.map((r: Rec) => r.verdict),
      ["MISMATCH", "UNCLEAR"],
      "verdict class (MISMATCH before UNCLEAR) outranks a higher pair-Impact",
    );
    const unclear = json.dispatch.find((r: Rec) => r.verdict === "UNCLEAR");
    assert.equal(unclear.pair_impact, 400, "churn(a)+churn(b)+dependents(a)+dependents(b) = 100*4");
    const mismatch = json.dispatch.find((r: Rec) => r.verdict === "MISMATCH");
    assert.equal(mismatch.pair_impact, 0, "no signals row supplied for the mismatch pair");
  });
});

test("an unrecognized verdict string warns on stderr and is treated as UNCLEAR", () => {
  withTempDir("p2p2-rank-edges-bogus-verdict-", (dir) => {
    const edges = [{ a: "a.ts", b: "b.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 }];
    const verdicts = [{ a: "a.ts", b: "b.ts", verdict: "BOGUS", reason: "weird" }];
    const { json, result } = rankEdges(dir, edges, verdicts);
    assert.match(result.stderr, /warn: unrecognized verdict "BOGUS" for pair a\.ts\/b\.ts - treating as UNCLEAR/);
    assert.equal(json.dispatch[0].verdict, "UNCLEAR");
    assert.equal(json.counts.unclear, 1);
  });
});

// --- --top-edges caps dispatch into overflow ---------------------------------

test("--top-edges caps dispatch and moves the remaining ranked pairs to overflow", () => {
  withTempDir("p2p2-rank-edges-top-", (dir) => {
    const edges = [
      { a: "p1a.ts", b: "p1b.ts", via: "x", vias: ["x"], fanout: 1, shared: 3 },
      { a: "p2a.ts", b: "p2b.ts", via: "x", vias: ["x"], fanout: 1, shared: 2 },
      { a: "p3a.ts", b: "p3b.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 },
    ];
    const verdicts = edges.map((e) => ({ a: e.a, b: e.b, verdict: "MISMATCH", reason: "drift" }));

    const capped = rankEdges(dir, edges, verdicts, ["--top-edges", "1"]).json;
    assert.equal(capped.dispatch.length, 1);
    assert.equal(capped.overflow.length, 2);
    assert.equal(capped.dispatch[0].a, "p1a.ts", "higher shared count breaks the tied pair-Impact (0 for all)");
    assert.deepEqual(
      capped.overflow.map((r: Rec) => r.rank),
      [2, 3],
    );

    const zero = rankEdges(dir, edges, verdicts, ["--top-edges", "0"]).json;
    assert.equal(zero.dispatch.length, 0);
    assert.equal(zero.overflow.length, 3);

    const overshoot = rankEdges(dir, edges, verdicts, ["--top-edges", "100"]).json;
    assert.equal(overshoot.dispatch.length, 3);
    assert.equal(overshoot.overflow.length, 0);
  });
});

// --- --job / --run-id ---------------------------------------------------------

test("--job and --run-id land in edges.json and the edges.md title", () => {
  withTempDir("p2p2-rank-edges-job-", (dir) => {
    const edges = [{ a: "a.ts", b: "b.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 }];
    const verdicts = [{ a: "a.ts", b: "b.ts", verdict: "MISMATCH", reason: "drift" }];
    const { json, md } = rankEdges(dir, edges, verdicts, ["--job", "reliability/bugs", "--run-id", "2026-06-26"]);
    assert.equal(json.job, "reliability/bugs");
    assert.equal(json.run_id, "2026-06-26");
    assert.match(md, /^# EDGE GATE - 2026-06-26 {2}\(reliability\/bugs\)$/m);
  });
});

// --- structural degree ---------------------------------------------------------

test("degree reports how many candidate pairs each path appears in, from the full edge set, sorted desc then path asc, capped at 20", () => {
  withTempDir("p2p2-rank-edges-degree-", (dir) => {
    const edges = [
      { a: "hub.ts", b: "leaf1.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 },
      { a: "hub.ts", b: "leaf2.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 },
      { a: "hub.ts", b: "leaf3.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 },
      { a: "tieB.ts", b: "tieA.ts", via: "y", vias: ["y"], fanout: 1, shared: 1 },
    ];
    const verdicts = edges.map((e) => ({ a: e.a, b: e.b, verdict: "MATCH", reason: "" }));
    const { json } = rankEdges(dir, edges, verdicts);
    assert.equal(json.degree[0].path, "hub.ts");
    assert.equal(json.degree[0].degree, 3);
    // tieA.ts and tieB.ts both have degree 1; alphabetical tiebreak orders tieA before tieB.
    const tieEntries = json.degree.filter((d: Rec) => d.path === "tieA.ts" || d.path === "tieB.ts");
    assert.deepEqual(
      tieEntries.map((d: Rec) => d.path),
      ["tieA.ts", "tieB.ts"],
    );
  });
});

// --- USAGE + exit codes -------------------------------------------------------

test("missing required arguments print USAGE + an error line on stderr and exit 2", () => {
  withTempDir("p2p2-rank-edges-usage-", (dir) => {
    const result = runRankEdges(dir, ["--edges", path.join(dir, "edges.jsonl")]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^usage: rank_edges\.ts /);
    assert.match(result.stderr, /the following arguments are required: --verdicts, --out-json, --out-md/);
    assert.equal(result.stdout, "");
  });
});

test("a bare positional argument prints USAGE with 'unrecognized argument' and exits 2", () => {
  withTempDir("p2p2-rank-edges-positional-", (dir) => {
    const result = runRankEdges(dir, [
      "positional",
      "--edges",
      path.join(dir, "edges.jsonl"),
      "--verdicts",
      path.join(dir, "verdicts.jsonl"),
      "--out-json",
      path.join(dir, "o.json"),
      "--out-md",
      path.join(dir, "o.md"),
    ]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unrecognized argument: positional/);
  });
});

test("a flag with no following value prints USAGE with 'expected one argument' and exits 2", () => {
  withTempDir("p2p2-rank-edges-noval-", (dir) => {
    const result = runRankEdges(dir, [
      "--edges",
      path.join(dir, "edges.jsonl"),
      "--verdicts",
      path.join(dir, "verdicts.jsonl"),
      "--out-json",
      path.join(dir, "o.json"),
      "--out-md",
    ]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /argument --out-md: expected one argument/);
  });
});

test("--top-edges with a non-integer value prints USAGE with 'invalid int value' and exits 2", () => {
  withTempDir("p2p2-rank-edges-badint-", (dir) => {
    const edgesPath = path.join(dir, "edges.jsonl");
    const verdictsPath = path.join(dir, "verdicts.jsonl");
    writeJsonl(edgesPath, [{ a: "a.ts", b: "b.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 }]);
    writeJsonl(verdictsPath, [{ a: "a.ts", b: "b.ts", verdict: "MISMATCH", reason: "" }]);
    const result = runRankEdges(dir, [
      "--edges",
      edgesPath,
      "--verdicts",
      verdictsPath,
      "--top-edges",
      "abc",
      "--out-json",
      path.join(dir, "o.json"),
      "--out-md",
      path.join(dir, "o.md"),
    ]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /argument --top-edges: invalid int value: abc/);
  });
});

// --- documented stdout marker line -------------------------------------------

test("stdout prints the documented `edges: N dispatched from M pairs (...) -> ...` line", () => {
  withTempDir("p2p2-rank-edges-stdout-", (dir) => {
    const edgesPath = path.join(dir, "edges.jsonl");
    const verdictsPath = path.join(dir, "verdicts.jsonl");
    const jsonPath = path.join(dir, "edges.json");
    const mdPath = path.join(dir, "edges.md");
    writeJsonl(edgesPath, [{ a: "a.ts", b: "b.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 }]);
    writeJsonl(verdictsPath, [{ a: "a.ts", b: "b.ts", verdict: "MISMATCH", reason: "" }]);
    const result = runRankEdges(dir, [
      "--edges",
      edgesPath,
      "--verdicts",
      verdictsPath,
      "--out-json",
      jsonPath,
      "--out-md",
      mdPath,
    ]);
    assert.equal(result.stdout, `edges: 1 dispatched from 1 pairs (0 match, 0 no_contract, 0 unscored) -> ${jsonPath}, ${mdPath}\n`);
  });
});

// --- boundary inputs ------------------------------------------------------------

test("an empty --edges file yields zero pairs (edges is required to exist, but may be empty)", () => {
  withTempDir("p2p2-rank-edges-empty-", (dir) => {
    const { json } = rankEdges(dir, [], []);
    assert.equal(json.counts.pairs, 0);
    assert.equal(json.dispatch.length, 0);
    assert.equal(json.degree.length, 0);
  });
});

test("a missing --verdicts file is a valid empty result (missingOk), not a crash", () => {
  withTempDir("p2p2-rank-edges-no-verdicts-", (dir) => {
    const edgesPath = path.join(dir, "edges.jsonl");
    const jsonPath = path.join(dir, "edges.json");
    const mdPath = path.join(dir, "edges.md");
    writeJsonl(edgesPath, [{ a: "a.ts", b: "b.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 }]);
    const result = runRankEdges(dir, [
      "--edges",
      edgesPath,
      "--verdicts",
      path.join(dir, "no-such-verdicts.jsonl"),
      "--out-json",
      jsonPath,
      "--out-md",
      mdPath,
    ]);
    assert.equal(result.status, 0, `stderr=${result.stderr}`);
    assert.match(result.stderr, /warn: unscored pair a\.ts\/b\.ts - no verdict/);
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    assert.equal(json.counts.unscored, 1);
    assert.equal(json.counts.dispatch, 0);
  });
});

test("a missing --edges file crashes with a non-zero exit (edges is not missingOk)", () => {
  withTempDir("p2p2-rank-edges-no-edges-", (dir) => {
    const verdictsPath = path.join(dir, "verdicts.jsonl");
    writeJsonl(verdictsPath, [{ a: "a.ts", b: "b.ts", verdict: "MISMATCH", reason: "" }]);
    const result = runRankEdges(dir, [
      "--edges",
      path.join(dir, "no-such-edges.jsonl"),
      "--verdicts",
      verdictsPath,
      "--out-json",
      path.join(dir, "o.json"),
      "--out-md",
      path.join(dir, "o.md"),
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ENOENT/);
  });
});

test("a malformed JSONL line in --edges warns on stderr and is skipped", () => {
  withTempDir("p2p2-rank-edges-malformed-", (dir) => {
    const edgesPath = path.join(dir, "edges.jsonl");
    const verdictsPath = path.join(dir, "verdicts.jsonl");
    fs.writeFileSync(
      edgesPath,
      '{"a": "a.ts", "b": "b.ts", "via": "x", "vias": ["x"], "fanout": 1, "shared": 1}\nnot json\n',
    );
    writeJsonl(verdictsPath, [{ a: "a.ts", b: "b.ts", verdict: "MISMATCH", reason: "" }]);
    const jsonPath = path.join(dir, "edges.json");
    const mdPath = path.join(dir, "edges.md");
    const result = runRankEdges(dir, [
      "--edges",
      edgesPath,
      "--verdicts",
      verdictsPath,
      "--out-json",
      jsonPath,
      "--out-md",
      mdPath,
    ]);
    assert.equal(result.status, 0, `stderr=${result.stderr}`);
    assert.match(result.stderr, /warn: skipping malformed line 2 in /);
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    assert.equal(json.counts.pairs, 1);
  });
});

test("a record missing the required a/b keys is silently dropped from the pair set", () => {
  withTempDir("p2p2-rank-edges-missing-key-", (dir) => {
    const edges = [
      { a: "a.ts", b: "b.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 },
      { a: "only-a.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 }, // no `b`
    ];
    const verdicts = [{ a: "a.ts", b: "b.ts", verdict: "MISMATCH", reason: "" }];
    const { json } = rankEdges(dir, edges, verdicts);
    assert.equal(json.counts.pairs, 1);
    assert.ok(!json.dispatch.some((r: Rec) => r.a === "only-a.ts" || r.b === "only-a.ts"));
  });
});

test("--out-json pointing at a directory that does not exist crashes with a non-zero exit", () => {
  withTempDir("p2p2-rank-edges-unwritable-", (dir) => {
    const edgesPath = path.join(dir, "edges.jsonl");
    const verdictsPath = path.join(dir, "verdicts.jsonl");
    writeJsonl(edgesPath, [{ a: "a.ts", b: "b.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 }]);
    writeJsonl(verdictsPath, [{ a: "a.ts", b: "b.ts", verdict: "MISMATCH", reason: "" }]);
    const result = runRankEdges(dir, [
      "--edges",
      edgesPath,
      "--verdicts",
      verdictsPath,
      "--out-json",
      path.join(dir, "no-such-dir", "edges.json"),
      "--out-md",
      path.join(dir, "edges.md"),
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ENOENT/);
  });
});

test("--out-md pointing at a directory that does not exist crashes with a non-zero exit", () => {
  withTempDir("p2p2-rank-edges-unwritable-md-", (dir) => {
    const edgesPath = path.join(dir, "edges.jsonl");
    const verdictsPath = path.join(dir, "verdicts.jsonl");
    writeJsonl(edgesPath, [{ a: "a.ts", b: "b.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 }]);
    writeJsonl(verdictsPath, [{ a: "a.ts", b: "b.ts", verdict: "MISMATCH", reason: "" }]);
    const result = runRankEdges(dir, [
      "--edges",
      edgesPath,
      "--verdicts",
      verdictsPath,
      "--out-json",
      path.join(dir, "edges.json"),
      "--out-md",
      path.join(dir, "no-such-dir", "edges.md"),
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ENOENT/);
  });
});

// --- edge cases ------------------------------------------------------------------

test("a path with a Windows-style backslash is preserved verbatim, and CRLF line endings parse the same as LF", () => {
  withTempDir("p2p2-rank-edges-edgecases-", (dir) => {
    const winPath = "src\\module\\file.ts";
    const edgesPath = path.join(dir, "edges.jsonl");
    const verdictsPath = path.join(dir, "verdicts.jsonl");
    const edgeLine = JSON.stringify({ a: winPath, b: "other.ts", via: "x", vias: ["x"], fanout: 1, shared: 1 });
    const verdictLine = JSON.stringify({ a: winPath, b: "other.ts", verdict: "MISMATCH", reason: "" });
    fs.writeFileSync(edgesPath, `${edgeLine}\r\n`);
    fs.writeFileSync(verdictsPath, `${verdictLine}\r\n`);
    const jsonPath = path.join(dir, "edges.json");
    const mdPath = path.join(dir, "edges.md");
    const result = runRankEdges(dir, [
      "--edges",
      edgesPath,
      "--verdicts",
      verdictsPath,
      "--out-json",
      jsonPath,
      "--out-md",
      mdPath,
    ]);
    assert.equal(result.status, 0, `stderr=${result.stderr}`);
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    assert.equal(json.dispatch.length, 1);
    assert.equal(json.dispatch[0].a, winPath);
  });
});

test("edges.json is stable across two identical runs", () => {
  withTempDir("p2p2-rank-edges-stable-", (dir) => {
    const edges = [
      { a: "a.ts", b: "b.ts", via: "x", vias: ["x"], fanout: 1, shared: 3 },
      { a: "c.ts", b: "d.ts", via: "y", vias: ["y"], fanout: 1, shared: 1 },
    ];
    const verdicts = [
      { a: "a.ts", b: "b.ts", verdict: "MISMATCH", reason: "" },
      { a: "c.ts", b: "d.ts", verdict: "UNCLEAR", reason: "" },
    ];
    const first = rankEdges(dir, edges, verdicts).json;
    const second = rankEdges(dir, edges, verdicts).json;
    assert.deepEqual(first, second);
  });
});
