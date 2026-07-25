#!/usr/bin/env node
// rank.ts - combine scout scores into a gated, ranked HOTLIST.
//
// Reads scout verdicts (JSONL, one object per line with at least `path`, `impact`,
// `opportunity`) and optionally the deterministic signals JSONL, computes
// `score = impact * opportunity`, assigns each file a 2x2 quadrant, drops
// everything outside the top-right corner, and writes hotlist.json + hotlist.md.
//
// The cut is deterministic so the same sweep ranks the same way every time.
//
// Usage:
//   node rank.ts --scores scores.jsonl [--signals signals.jsonl] \
//       [--min-impact 3] [--min-opportunity 3] [--top 20] \
//       [--job reliability/bugs] [--run-id 2026-06-26] \
//       --out-json hotlist.json --out-md hotlist.md

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Python-compat data model
//
// JSON is parsed with a bespoke parser so that (a) object key order is fully
// preserved (Map, like Python dict - JS objects reorder integer-like keys),
// and (b) ints and floats stay distinct (PyFloat wrapper), matching Python's
// int/float split in str() and json.dumps output.
// ---------------------------------------------------------------------------

class PyFloat {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}

type JsonValue = null | boolean | number | string | PyFloat | JsonValue[] | JsonMap;
interface JsonMap extends Map<JsonValue, JsonValue> {}

class JSONDecodeError extends Error {}
class ConvError extends Error {} // stands in for KeyError/TypeError/ValueError in int()

function numOf(v: JsonValue): number {
  return v instanceof PyFloat ? v.value : (v as number);
}

// Mirror Python truthiness ("", 0, [], {}, None, False are falsy; nan is truthy).
function pyTruthy(v: JsonValue | undefined): boolean {
  if (v === null || v === undefined || v === false) return false;
  if (v === true) return true;
  if (typeof v === "number") return v !== 0;
  if (v instanceof PyFloat) return v.value !== 0; // NaN !== 0 -> truthy, like Python
  if (typeof v === "string") return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof Map) return v.size > 0;
  return true;
}

// Mirror repr(float) / str(float).
function pyFloatRepr(v: number): string {
  if (Number.isNaN(v)) return "nan";
  if (v === Infinity) return "inf";
  if (v === -Infinity) return "-inf";
  if (Number.isInteger(v) && Math.abs(v) < 1e16) {
    return `${v}.0`;
  }
  const s = String(v);
  if (!s.includes("e") && !(v !== 0 && Math.abs(v) < 1e-4) && Math.abs(v) < 1e16) {
    return s;
  }
  // Python uses scientific notation when the decimal exponent is < -4 or >= 16,
  // with a sign and at least two exponent digits.
  const exp = v.toExponential();
  const m = /^(-?[0-9](?:\.[0-9]+)?)e([+-])([0-9]+)$/.exec(exp) as RegExpExecArray;
  const digits = m[3].length < 2 ? "0" + m[3] : m[3];
  return `${m[1]}e${m[2]}${digits}`;
}

// Mirror str() for values that end up inside f-strings.
function pyStr(v: JsonValue | undefined): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (v instanceof PyFloat) return pyFloatRepr(v.value);
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return pyRepr(v);
}

// Mirror repr() for JSON-derived values (used in the warn line).
function pyRepr(v: JsonValue | undefined): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (v instanceof PyFloat) return pyFloatRepr(v.value);
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return pyReprStr(v);
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(", ")}]`;
  const parts: string[] = [];
  for (const [k, val] of v) parts.push(`${pyRepr(k)}: ${pyRepr(val)}`);
  return `{${parts.join(", ")}}`;
}

function pyReprStr(s: string): string {
  const quote = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = quote;
  for (const ch of s) {
    const code = ch.codePointAt(0) as number;
    if (ch === "\\") out += "\\\\";
    else if (ch === quote) out += "\\" + quote;
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (code < 0x20 || code === 0x7f) out += "\\x" + code.toString(16).padStart(2, "0");
    else out += ch;
  }
  return out + quote;
}

// ---------------------------------------------------------------------------
// JSON: parse (order/type preserving) + dumps (Python json.dumps compatible)
// ---------------------------------------------------------------------------

function parseJson(text: string): JsonValue {
  let i = 0;

  const err = (msg: string): never => {
    throw new JSONDecodeError(`${msg}: char ${i}`);
  };
  const skipWS = (): void => {
    while (i < text.length && " \t\n\r".includes(text[i])) i++;
  };

  const parseString = (): string => {
    // text[i] === '"'
    i++;
    let out = "";
    while (true) {
      if (i >= text.length) err("Unterminated string");
      const ch = text[i];
      if (ch === '"') {
        i++;
        return out;
      }
      if (ch === "\\") {
        const e = text[i + 1];
        if (e === '"' || e === "\\" || e === "/") {
          out += e;
          i += 2;
        } else if (e === "b") {
          out += "\b";
          i += 2;
        } else if (e === "f") {
          out += "\f";
          i += 2;
        } else if (e === "n") {
          out += "\n";
          i += 2;
        } else if (e === "r") {
          out += "\r";
          i += 2;
        } else if (e === "t") {
          out += "\t";
          i += 2;
        } else if (e === "u") {
          const hex = text.slice(i + 2, i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) err("Invalid \\uXXXX escape");
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
        } else {
          err("Invalid \\escape");
        }
        continue;
      }
      const code = ch.charCodeAt(0);
      if (code < 0x20) err("Invalid control character in string");
      out += ch;
      i++;
    }
  };

  const parseNumber = (): number | PyFloat => {
    const m = /^-?(?:0|[1-9][0-9]*)(\.[0-9]+)?([eE][-+]?[0-9]+)?/.exec(text.slice(i));
    if (!m || m[0] === "" || m[0] === "-") err("Expecting value") as never;
    const mm = m as RegExpExecArray;
    i += mm[0].length;
    if (mm[1] === undefined && mm[2] === undefined) {
      return parseInt(mm[0], 10);
    }
    return new PyFloat(parseFloat(mm[0]));
  };

  const parseValue = (): JsonValue => {
    skipWS();
    if (i >= text.length) err("Expecting value");
    const c = text[i];
    if (c === "{") {
      i++;
      const map: JsonMap = new Map();
      skipWS();
      if (text[i] === "}") {
        i++;
        return map;
      }
      while (true) {
        skipWS();
        if (text[i] !== '"') err("Expecting property name enclosed in double quotes");
        const key = parseString();
        skipWS();
        if (text[i] !== ":") err("Expecting ':' delimiter");
        i++;
        map.set(key, parseValue());
        skipWS();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "}") {
          i++;
          return map;
        }
        err("Expecting ',' delimiter");
      }
    }
    if (c === "[") {
      i++;
      const arr: JsonValue[] = [];
      skipWS();
      if (text[i] === "]") {
        i++;
        return arr;
      }
      while (true) {
        arr.push(parseValue());
        skipWS();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "]") {
          i++;
          return arr;
        }
        err("Expecting ',' delimiter");
      }
    }
    if (c === '"') return parseString();
    if (text.startsWith("true", i)) {
      i += 4;
      return true;
    }
    if (text.startsWith("false", i)) {
      i += 5;
      return false;
    }
    if (text.startsWith("null", i)) {
      i += 4;
      return null;
    }
    // Python json accepts these non-standard constants by default.
    if (text.startsWith("NaN", i)) {
      i += 3;
      return new PyFloat(NaN);
    }
    if (text.startsWith("Infinity", i)) {
      i += 8;
      return new PyFloat(Infinity);
    }
    if (text.startsWith("-Infinity", i)) {
      i += 9;
      return new PyFloat(-Infinity);
    }
    if (c === "-" || (c >= "0" && c <= "9")) return parseNumber();
    return err("Expecting value") as never;
  };

  const value = parseValue();
  skipWS();
  if (i < text.length) err("Extra data");
  return value;
}

// json.dumps(..., indent=2): ensure_ascii escaping, no trailing newline.
function pyJsonDumps(v: JsonValue, indent: number): string {
  const escStr = (s: string): string => {
    let out = '"';
    for (let k = 0; k < s.length; k++) {
      const ch = s[k];
      const code = s.charCodeAt(k);
      if (ch === '"') out += '\\"';
      else if (ch === "\\") out += "\\\\";
      else if (ch === "\n") out += "\\n";
      else if (ch === "\r") out += "\\r";
      else if (ch === "\t") out += "\\t";
      else if (ch === "\b") out += "\\b";
      else if (ch === "\f") out += "\\f";
      else if (code < 0x20 || code > 0x7e) out += "\\u" + code.toString(16).padStart(4, "0");
      else out += ch;
    }
    return out + '"';
  };
  const dump = (val: JsonValue, level: number): string => {
    if (val === null) return "null";
    if (val === true) return "true";
    if (val === false) return "false";
    if (typeof val === "number") return String(val);
    if (val instanceof PyFloat) {
      if (Number.isNaN(val.value)) return "NaN";
      if (val.value === Infinity) return "Infinity";
      if (val.value === -Infinity) return "-Infinity";
      return pyFloatRepr(val.value);
    }
    if (typeof val === "string") return escStr(val);
    const pad = " ".repeat(indent * (level + 1));
    const padEnd = " ".repeat(indent * level);
    if (Array.isArray(val)) {
      if (val.length === 0) return "[]";
      const items = val.map((x) => pad + dump(x, level + 1));
      return "[\n" + items.join(",\n") + "\n" + padEnd + "]";
    }
    if (val.size === 0) return "{}";
    const items: string[] = [];
    for (const [k, x] of val) {
      // Python coerces non-string keys; ours are always strings here.
      const key = typeof k === "string" ? escStr(k) : escStr(pyStr(k));
      items.push(`${pad}${key}: ${dump(x, level + 1)}`);
    }
    return "{\n" + items.join(",\n") + "\n" + padEnd + "}";
  };
  return dump(v, 0);
}

// ---------------------------------------------------------------------------
// Python-compat misc helpers
// ---------------------------------------------------------------------------

const PY_WHITESPACE =
  " \t\n\r\v\f\u001c\u001d\u001e\u001f\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004" +
  "\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000";

function pyStrip(s: string): string {
  let a = 0;
  let b = s.length;
  while (a < b && PY_WHITESPACE.includes(s[a])) a++;
  while (b > a && PY_WHITESPACE.includes(s[b - 1])) b--;
  return s.slice(a, b);
}

// Mirror int(x) for JSON-derived values; throws ConvError where Python raises.
function pyInt(v: JsonValue | undefined): number {
  if (v === undefined) throw new ConvError("KeyError");
  if (typeof v === "number") return v;
  if (v === true) return 1;
  if (v === false) return 0;
  if (v instanceof PyFloat) {
    if (!Number.isFinite(v.value)) throw new ConvError("cannot convert");
    return Math.trunc(v.value);
  }
  if (typeof v === "string") {
    const t = pyStrip(v);
    if (/^[-+]?[0-9](_?[0-9])*$/.test(t)) return parseInt(t.replace(/_/g, ""), 10);
    throw new ConvError("invalid literal");
  }
  throw new ConvError("TypeError");
}

class Exit extends Error {
  code: number;
  constructor(code: number) {
    super("exit");
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Argument parsing (hand-rolled argparse equivalent for this fixed parser;
// usage/help text matches Python 3.9's argparse at 80 columns)
// ---------------------------------------------------------------------------

const PROG = path.basename(process.argv[1] ?? "rank.ts");

const USAGE =
  `usage: ${PROG} [-h] --scores SCORES [--signals SIGNALS]\n` +
  `${" ".repeat(7 + PROG.length + 1)}[--min-impact MIN_IMPACT] [--min-opportunity MIN_OPPORTUNITY]\n` +
  `${" ".repeat(7 + PROG.length + 1)}[--top TOP] [--job JOB] [--run-id RUN_ID] --out-json OUT_JSON\n` +
  `${" ".repeat(7 + PROG.length + 1)}--out-md OUT_MD\n`;

const HELP =
  USAGE +
  "\n" +
  "optional arguments:\n" +
  "  -h, --help            show this help message and exit\n" +
  "  --scores SCORES\n" +
  "  --signals SIGNALS\n" +
  "  --min-impact MIN_IMPACT\n" +
  "  --min-opportunity MIN_OPPORTUNITY\n" +
  "  --top TOP\n" +
  "  --job JOB\n" +
  "  --run-id RUN_ID\n" +
  "  --out-json OUT_JSON\n" +
  "  --out-md OUT_MD\n";

interface Args {
  scores: string;
  signals: string | null;
  minImpact: number;
  minOpportunity: number;
  top: number;
  job: string;
  runId: string;
  outJson: string;
  outMd: string;
}

function argError(msg: string): never {
  process.stderr.write(USAGE);
  process.stderr.write(`${PROG}: error: ${msg}\n`);
  throw new Exit(2);
}

function parseArgs(argv: string[]): Args {
  const longOptions = [
    "--help",
    "--scores",
    "--signals",
    "--min-impact",
    "--min-opportunity",
    "--top",
    "--job",
    "--run-id",
    "--out-json",
    "--out-md",
  ];
  const values: Record<string, string> = {};
  const seen = new Set<string>();
  const extras: string[] = [];

  const looksLikeValue = (tok: string): boolean => {
    if (!tok.startsWith("-")) return true;
    if (tok === "-") return true;
    return /^-\d+$|^-\d*\.\d+$/.test(tok); // negative numbers act as values
  };

  let i = 0;
  while (i < argv.length) {
    const tok = argv[i];
    if (tok === "--") {
      // argparse (3.9): the bare "--" and everything after it end up in the
      // unrecognized-arguments error for this all-optional parser
      extras.push(tok, ...argv.slice(i + 1));
      break;
    }
    if (looksLikeValue(tok)) {
      extras.push(tok);
      i++;
      continue;
    }
    let optPart = tok;
    let explicit: string | undefined;
    const eq = tok.indexOf("=");
    if (tok.startsWith("--") && eq >= 0) {
      optPart = tok.slice(0, eq);
      explicit = tok.slice(eq + 1);
    }
    let matched: string | null = null;
    if (optPart === "-h" || optPart === "--help") {
      matched = "--help";
    } else if (longOptions.includes(optPart)) {
      matched = optPart;
    } else if (optPart.startsWith("--")) {
      const candidates = longOptions.filter((o) => o.startsWith(optPart));
      if (candidates.length > 1) {
        argError(`ambiguous option: ${tok} could match ${candidates.join(", ")}`);
      }
      if (candidates.length === 1) matched = candidates[0];
    }
    if (matched === null) {
      extras.push(tok);
      i++;
      continue;
    }
    if (matched === "--help") {
      if (explicit !== undefined) {
        argError(`argument -h/--help: ignored explicit argument ${pyReprStr(explicit)}`);
      }
      process.stdout.write(HELP);
      throw new Exit(0);
    }
    let value: string;
    if (explicit !== undefined) {
      value = explicit;
      i++;
    } else if (i + 1 < argv.length && looksLikeValue(argv[i + 1])) {
      value = argv[i + 1];
      i += 2;
    } else {
      argError(`argument ${matched}: expected one argument`);
    }
    if (matched === "--min-impact" || matched === "--min-opportunity" || matched === "--top") {
      // Python int(): optional sign, decimal digits, single underscores between digits.
      const t = pyStrip(value);
      if (!/^[-+]?[0-9](_?[0-9])*$/.test(t)) {
        argError(`argument ${matched}: invalid int value: ${pyReprStr(value)}`);
      }
    }
    values[matched] = value;
    seen.add(matched);
  }

  const missing = ["--scores", "--out-json", "--out-md"].filter((o) => !seen.has(o));
  if (missing.length > 0) {
    argError(`the following arguments are required: ${missing.join(", ")}`);
  }
  if (extras.length > 0) {
    argError(`unrecognized arguments: ${extras.join(" ")}`);
  }

  const toInt = (opt: string, dflt: number): number =>
    seen.has(opt) ? parseInt(pyStrip(values[opt]).replace(/_/g, ""), 10) : dflt;

  return {
    scores: values["--scores"],
    signals: seen.has("--signals") ? values["--signals"] : null,
    minImpact: toInt("--min-impact", 3),
    minOpportunity: toInt("--min-opportunity", 3),
    top: toInt("--top", 20),
    job: seen.has("--job") ? values["--job"] : "",
    runId: seen.has("--run-id") ? values["--run-id"] : "",
    outJson: values["--out-json"],
    outMd: values["--out-md"],
  };
}

// ---------------------------------------------------------------------------
// rank
// ---------------------------------------------------------------------------

function loadJsonl(p: string): JsonMap[] {
  const rows: JsonMap[] = [];
  // Read errors are deliberately uncaught (exit 1), like the original.
  const buf = fs.readFileSync(p);
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
    .decode(buf)
    .replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  for (let ln = 1; ln <= lines.length; ln++) {
    const line = pyStrip(lines[ln - 1]);
    if (!line) continue;
    try {
      rows.push(parseJson(line) as JsonMap);
    } catch (e) {
      if (!(e instanceof JSONDecodeError)) throw e;
      console.error(`warn: skipping malformed line ${ln} in ${p}`);
    }
  }
  return rows;
}

function quadrant(impact: number, opportunity: number, t: number): string {
  const hiI = impact >= t;
  const hiO = opportunity >= t;
  if (hiI && hiO) return "HOTSPOT";
  if (hiI && !hiO) return "already-fine"; // high impact, nothing to win -> leave it
  if (!hiI && hiO) return "nobody-cares"; // broken but low impact -> skip it
  return "ignore";
}

function reason(rec: JsonMap): string {
  // Prefer the scout's own words; fall back to a signal-derived blurb.
  const imp = rec.get("impact_reason");
  const opp = rec.get("opportunity_reason");
  if (pyTruthy(imp) || pyTruthy(opp)) {
    return [imp, opp]
      .filter((x) => pyTruthy(x))
      .map((x) => x as string)
      .join(", ");
  }
  const churn = rec.get("churn");
  if (churn !== undefined && churn !== null && !isPyEq(churn, -1)) {
    const fixes = rec.has("fix_commits") ? rec.get("fix_commits") : "?";
    return `churn=${pyStr(churn)}, fixes=${pyStr(fixes)}`;
  }
  return "";
}

// Python `x != -1` for JSON values (numbers compare by value, others are !=).
function isPyEq(v: JsonValue, n: number): boolean {
  if (typeof v === "number") return v === n;
  if (v instanceof PyFloat) return v.value === n;
  if (v === true) return n === 1;
  if (v === false) return n === 0;
  return false;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  const t = Math.min(args.minImpact, args.minOpportunity);

  const scores = loadJsonl(args.scores);
  const sigByPath = new Map<JsonValue, JsonMap>();
  if (args.signals) {
    for (const s of loadJsonl(args.signals)) {
      if (s instanceof Map && s.has("path")) {
        sigByPath.set(s.get("path") as JsonValue, s);
      }
    }
  }

  const merged = new Map<JsonValue, JsonMap>();
  for (const rec of scores) {
    if (!(rec instanceof Map)) {
      // Python would crash with AttributeError on rec.get; mirror the crash.
      throw new TypeError(`'${rec === null ? "NoneType" : typeof rec}' object has no attribute 'get'`);
    }
    const p = rec.has("path") ? rec.get("path") : null;
    if (p === null || p === undefined) continue;
    let impact: number;
    let opportunity: number;
    try {
      if (!rec.has("impact") || !rec.has("opportunity")) throw new ConvError("KeyError");
      impact = pyInt(rec.get("impact"));
      opportunity = pyInt(rec.get("opportunity"));
    } catch (e) {
      if (!(e instanceof ConvError)) throw e;
      console.error(`warn: skipping record without numeric impact/opportunity: ${pyRepr(rec)}`);
      continue;
    }
    const row: JsonMap = new Map(sigByPath.get(p) ?? []);
    for (const [k, v] of rec) row.set(k, v);
    row.set("impact", Math.max(1, Math.min(5, impact)));
    row.set("opportunity", Math.max(1, Math.min(5, opportunity)));
    row.set("score", (row.get("impact") as number) * (row.get("opportunity") as number));
    row.set("quadrant", quadrant(row.get("impact") as number, row.get("opportunity") as number, t));
    row.set("reason", reason(row));
    // last write wins, but keep the higher score if a file was scored twice
    const prev = merged.get(p);
    if (prev === undefined || (row.get("score") as number) > (prev.get("score") as number)) {
      merged.set(p, row);
    }
  }

  const rows = Array.from(merged.values());
  // rank: score desc, then impact desc, then churn desc (stable)
  const churnKey = (r: JsonMap): number => {
    const c = r.has("churn") ? r.get("churn") : 0;
    return numOf(pyTruthy(c) ? (c as number | PyFloat) : 0);
  };
  rows.sort((a, b) => {
    const sa = a.get("score") as number;
    const sb = b.get("score") as number;
    if (sa !== sb) return sb - sa;
    const ia = a.get("impact") as number;
    const ib = b.get("impact") as number;
    if (ia !== ib) return ib - ia;
    const ca = churnKey(a);
    const cb = churnKey(b);
    if (ca !== cb) return cb - ca;
    return 0;
  });

  // Array.prototype.slice mirrors Python list[:top] for negative tops too.
  const hotspots = rows.filter((r) => r.get("quadrant") === "HOTSPOT").slice(0, args.top);
  const skipped = rows.filter((r) => r.get("quadrant") !== "HOTSPOT");

  for (let i = 0; i < hotspots.length; i++) {
    hotspots[i].set("rank", i + 1);
  }

  const hotKeys = ["rank", "path", "impact", "opportunity", "score", "quadrant", "reason"];
  const skipKeys = ["path", "impact", "opportunity", "score", "quadrant", "reason"];
  const pick = (r: JsonMap, keys: string[]): JsonMap => {
    const o: JsonMap = new Map();
    for (const k of keys) o.set(k, r.has(k) ? (r.get(k) as JsonValue) : null);
    return o;
  };

  const counts: JsonMap = new Map();
  counts.set("scored", rows.length);
  counts.set("hotspots", hotspots.length);
  counts.set("skipped", skipped.length);
  const out: JsonMap = new Map();
  out.set("run_id", args.runId);
  out.set("job", args.job);
  out.set("threshold", t);
  out.set("top", args.top);
  out.set("counts", counts);
  out.set("hotspots", hotspots.map((r) => pick(r, hotKeys)));
  out.set("skipped", skipped.map((r) => pick(r, skipKeys)));
  fs.writeFileSync(args.outJson, pyJsonDumps(out, 2), "utf8");

  // Markdown hotlist (the slide's HOTLIST READY table).
  const lines: string[] = [];
  let title = `# HOTLIST - ${args.runId || "run"}`;
  if (args.job) {
    title += `  (${args.job})`;
  }
  lines.push(title);
  lines.push("");
  lines.push(
    `Scored ${rows.length} files · ${hotspots.length} hotspots · ` +
      `${skipped.length} skipped · threshold ${t}.`,
  );
  lines.push("");
  lines.push("| # | Component | Impact | Opportunity | Score | Reason |");
  lines.push("|---|-----------|:------:|:-----------:|:-----:|--------|");
  for (const r of hotspots) {
    lines.push(
      `| ${pyStr(r.get("rank"))} | \`${pyStr(r.get("path"))}\` | ${pyStr(r.get("impact"))} | ` +
        `${pyStr(r.get("opportunity"))} | ${pyStr(r.get("score"))} | ${pyStr(r.get("reason"))} |`,
    );
  }
  if (skipped.length > 0) {
    lines.push("");
    lines.push("<details><summary>Skipped (not top-right corner)</summary>");
    lines.push("");
    lines.push("| Component | Impact | Opportunity | Score | Quadrant | Reason |");
    lines.push("|-----------|:------:|:-----------:|:-----:|----------|--------|");
    for (const r of skipped.slice(0, 50)) {
      lines.push(
        `| \`${pyStr(r.get("path"))}\` | ${pyStr(r.get("impact"))} | ${pyStr(r.get("opportunity"))} | ` +
          `${pyStr(r.get("score"))} | ${pyStr(r.get("quadrant"))} | ${pyStr(r.get("reason"))} |`,
      );
    }
    lines.push("");
    lines.push("</details>");
  }
  fs.writeFileSync(args.outMd, lines.join("\n") + "\n", "utf8");

  console.log(
    `hotlist: ${hotspots.length} hotspots from ${rows.length} scored files ` +
      `-> ${args.outJson}, ${args.outMd}`,
  );
}

try {
  main();
} catch (e) {
  if (e instanceof Exit) {
    process.exitCode = e.code;
  } else {
    throw e;
  }
}
