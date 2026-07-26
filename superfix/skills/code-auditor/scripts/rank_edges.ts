#!/usr/bin/env node
// rank_edges.ts - the deterministic edge gate for the edge track.
//
// Joins collect_edges.sh's edge records with edge-scout's verdict records,
// drops MATCH pairs, ranks the rest (MISMATCH before UNCLEAR, then by a
// pair-Impact computed only from both endpoints' signals), caps dispatch at
// --top-edges, and writes edges.json + edges.md. Also reports the structural
// degree of every path (how many candidate pairs it appears in) so SKILL.md
// can pull a small budget of the highest-degree files into detective
// dispatch even when they never clear the pair gate.
//
// Usage:
//   node rank_edges.ts --edges edges.jsonl --verdicts edge_scores.jsonl \
//       [--signals signals.jsonl] [--top-edges 20] \
//       [--job reliability/bugs] [--run-id 2026-06-26] \
//       --out-json edges.json --out-md edges.md

import * as fs from "node:fs";

const USAGE =
  "usage: rank_edges.ts --edges EDGES --verdicts VERDICTS [--signals SIGNALS]\n" +
  "                      [--top-edges TOP_EDGES] [--job JOB] [--run-id RUN_ID]\n" +
  "                      --out-json OUT_JSON --out-md OUT_MD\n";

interface Args {
  edges: string;
  verdicts: string;
  signals: string | null;
  topEdges: number;
  job: string;
  runId: string;
  outJson: string;
  outMd: string;
}

function usageError(msg: string): never {
  process.stderr.write(USAGE);
  process.stderr.write(`rank_edges.ts: error: ${msg}\n`);
  process.exit(2);
}

// Plain flag loop - every flag takes exactly one value, no python-argparse
// compatibility layer needed here (unlike rank.ts).
function parseArgs(argv: string[]): Args {
  const values: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith("--")) {
      usageError(`unrecognized argument: ${tok}`);
    }
    const key = tok.slice(2);
    const val = argv[i + 1];
    if (val === undefined) {
      usageError(`argument --${key}: expected one argument`);
    }
    values[key] = val;
    i++;
  }

  const missing = ["edges", "verdicts", "out-json", "out-md"].filter((k) => values[k] === undefined);
  if (missing.length > 0) {
    usageError(`the following arguments are required: ${missing.map((k) => `--${k}`).join(", ")}`);
  }

  let topEdges = 20;
  if (values["top-edges"] !== undefined) {
    const n = parseInt(values["top-edges"], 10);
    if (Number.isNaN(n)) usageError(`argument --top-edges: invalid int value: ${values["top-edges"]}`);
    topEdges = n;
  }

  return {
    edges: values["edges"],
    verdicts: values["verdicts"],
    signals: values["signals"] ?? null,
    topEdges,
    job: values["job"] ?? "",
    runId: values["run-id"] ?? "",
    outJson: values["out-json"],
    outMd: values["out-md"],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// The verdicts file is absent exactly when the sweep found zero pairs, which
// collect_edges.sh documents as a valid result - missingOk lets that case
// through as an empty row set instead of a crash. Every other input
// (--edges, --signals) must still exist, so callers leave missingOk unset.
function loadJsonl(p: string, missingOk = false): Row[] {
  if (missingOk && !fs.existsSync(p)) return [];
  const rows: Row[] = [];
  // Read errors are deliberately uncaught (exit 1) - the file must exist.
  const text = fs.readFileSync(p, "utf8").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  for (let ln = 1; ln <= lines.length; ln++) {
    const line = lines[ln - 1].trim();
    if (!line) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      console.error(`warn: skipping malformed line ${ln} in ${p}`);
    }
  }
  return rows;
}

// A missing row, a missing field, or the -1 "unknown" sentinel all count as 0.
function signalValue(signals: Map<string, Row>, p: string, field: string): number {
  const row = signals.get(p);
  if (!row) return 0;
  const v = row[field];
  if (typeof v !== "number" || v === -1) return 0;
  return v;
}

// Impact-only: fix_commits is an Opportunity prior and the edge track carries
// no Opportunity axis, so it plays no part here.
function pairImpact(a: string, b: string, signals: Map<string, Row>): number {
  return (
    signalValue(signals, a, "churn") +
    signalValue(signals, b, "churn") +
    signalValue(signals, a, "dependents") +
    signalValue(signals, b, "dependents")
  );
}

const VALID_VERDICTS = new Set(["MATCH", "MISMATCH", "UNCLEAR"]);
const pairKey = (a: string, b: string): string => `${a}\x00${b}`;

// Markdown-table-surface only: JSON outputs keep the raw, unescaped value.
// Escapes `|` (which would otherwise split into a phantom cell) and collapses
// any embedded newline/carriage-return to a single space (which would
// otherwise break the row onto a new markdown line).
function mdCell(s: string): string {
  return String(s).replace(/\|/g, "\\|").replace(/\r\n?|\n/g, " ");
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  const edgeRows = loadJsonl(args.edges);
  const verdictRows = loadJsonl(args.verdicts, true);
  const signalRows = args.signals ? loadJsonl(args.signals) : [];

  const signals = new Map<string, Row>();
  for (const s of signalRows) {
    if (s && typeof s === "object" && typeof s.path === "string") signals.set(s.path, s);
  }

  const edgeByKey = new Map<string, Row>();
  for (const e of edgeRows) {
    if (!e || typeof e.a !== "string" || typeof e.b !== "string") continue;
    edgeByKey.set(pairKey(e.a, e.b), e);
  }

  const verdictByKey = new Map<string, Row>();
  for (const v of verdictRows) {
    if (!v || typeof v.a !== "string" || typeof v.b !== "string") continue;
    let verdict = v.verdict;
    if (!VALID_VERDICTS.has(verdict)) {
      console.error(`warn: unrecognized verdict ${JSON.stringify(verdict)} for pair ${v.a}/${v.b} - treating as UNCLEAR`);
      verdict = "UNCLEAR";
    }
    verdictByKey.set(pairKey(v.a, v.b), { ...v, verdict });
  }

  const allKeys = new Set<string>([...edgeByKey.keys(), ...verdictByKey.keys()]);

  const matched: Row[] = []; // MISMATCH / UNCLEAR, ranked and dispatched/overflowed
  const matchBucket: Row[] = []; // MATCH, kept for the record only
  let unscored = 0;

  for (const key of allKeys) {
    const edge = edgeByKey.get(key);
    const verdict = verdictByKey.get(key);
    if (!edge || !verdict) {
      const [a, b] = key.split("\x00");
      console.error(`warn: unscored pair ${a}/${b} - ${edge ? "no verdict" : "no edge record"}`);
      unscored++;
      continue;
    }
    const row: Row = {
      a: edge.a,
      b: edge.b,
      via: edge.via,
      shared: edge.shared,
      verdict: verdict.verdict,
      pair_impact: pairImpact(edge.a, edge.b, signals),
      reason: typeof verdict.reason === "string" ? verdict.reason : "",
    };
    if (row.verdict === "MATCH") matchBucket.push(row);
    else matched.push(row);
  }

  const verdictClass = (v: string): number => (v === "MISMATCH" ? 0 : 1);
  matched.sort((x, y) => {
    const vc = verdictClass(x.verdict) - verdictClass(y.verdict);
    if (vc !== 0) return vc;
    if (y.pair_impact !== x.pair_impact) return y.pair_impact - x.pair_impact;
    if (y.shared !== x.shared) return y.shared - x.shared;
    if (x.a !== y.a) return x.a < y.a ? -1 : 1;
    if (x.b !== y.b) return x.b < y.b ? -1 : 1;
    return 0;
  });
  matched.forEach((row, i) => {
    row.rank = i + 1;
  });

  const dispatch = matched.slice(0, args.topEdges);
  const overflow = matched.slice(dispatch.length);

  // Structural degree: how many candidate pairs (from the full edge record
  // set, regardless of verdict) each path participates in.
  const degreeCount = new Map<string, number>();
  for (const e of edgeRows) {
    if (!e || typeof e.a !== "string" || typeof e.b !== "string") continue;
    degreeCount.set(e.a, (degreeCount.get(e.a) ?? 0) + 1);
    degreeCount.set(e.b, (degreeCount.get(e.b) ?? 0) + 1);
  }
  const degree = Array.from(degreeCount.entries())
    .map(([path, deg]) => ({ path, degree: deg }))
    .sort((x, y) => y.degree - x.degree || (x.path < y.path ? -1 : x.path > y.path ? 1 : 0))
    .slice(0, 20);

  const mismatchCount = matched.filter((r) => r.verdict === "MISMATCH").length;
  const unclearCount = matched.filter((r) => r.verdict === "UNCLEAR").length;

  const out = {
    run_id: args.runId,
    job: args.job,
    top_edges: args.topEdges,
    counts: {
      pairs: allKeys.size,
      match: matchBucket.length,
      mismatch: mismatchCount,
      unclear: unclearCount,
      unscored,
      dispatch: dispatch.length,
    },
    dispatch,
    overflow,
    match: matchBucket,
    degree,
  };
  fs.writeFileSync(args.outJson, JSON.stringify(out, null, 2), "utf8");

  // Markdown - a ranked table for dispatch, plus <details> blocks for
  // overflow (visible but beyond the cap) and match (contract confirmed).
  const lines: string[] = [];
  let title = `# EDGE GATE - ${args.runId || "run"}`;
  if (args.job) title += `  (${args.job})`;
  lines.push(title);
  lines.push("");
  lines.push(
    `${allKeys.size} pairs · ${mismatchCount} mismatch · ${unclearCount} unclear · ` +
      `${matchBucket.length} match · ${unscored} unscored · top-edges ${args.topEdges}.`,
  );
  lines.push("");
  lines.push("| # | A | B | Verdict | Pair Impact | Shared | Via | Reason |");
  lines.push("|---|---|---|---------|:------------:|:------:|-----|--------|");
  for (const r of dispatch) {
    lines.push(
      `| ${r.rank} | \`${r.a}\` | \`${r.b}\` | ${r.verdict} | ${r.pair_impact} | ${r.shared} | \`${mdCell(r.via)}\` | ${mdCell(r.reason)} |`,
    );
  }
  if (overflow.length > 0) {
    lines.push("");
    lines.push("<details><summary>Overflow (ranked, beyond --top-edges)</summary>");
    lines.push("");
    lines.push("| # | A | B | Verdict | Pair Impact | Shared | Via | Reason |");
    lines.push("|---|---|---|---------|:------------:|:------:|-----|--------|");
    for (const r of overflow) {
      lines.push(
        `| ${r.rank} | \`${r.a}\` | \`${r.b}\` | ${r.verdict} | ${r.pair_impact} | ${r.shared} | \`${mdCell(r.via)}\` | ${mdCell(r.reason)} |`,
      );
    }
    lines.push("");
    lines.push("</details>");
  }
  if (matchBucket.length > 0) {
    lines.push("");
    lines.push("<details><summary>Match (contract confirmed, not dispatched)</summary>");
    lines.push("");
    lines.push("| A | B | Via | Shared | Reason |");
    lines.push("|---|---|-----|:------:|--------|");
    for (const r of matchBucket) {
      lines.push(`| \`${r.a}\` | \`${r.b}\` | \`${mdCell(r.via)}\` | ${r.shared} | ${mdCell(r.reason)} |`);
    }
    lines.push("");
    lines.push("</details>");
  }
  fs.writeFileSync(args.outMd, lines.join("\n") + "\n", "utf8");

  console.log(
    `edges: ${dispatch.length} dispatched from ${allKeys.size} pairs ` +
      `(${matchBucket.length} match, ${unscored} unscored) -> ${args.outJson}, ${args.outMd}`,
  );
}

main();
