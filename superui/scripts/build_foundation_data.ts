#!/usr/bin/env node
// Deterministically derive foundation preview data from dtcg.yml (no LLM step).
//
// IN : argv[1] — design-system dir. Needs dtcg.yml (read as UTF-8; run
//      validate_tokens.py on it first — this script assumes a well-formed tree
//      but still fails hard on any alias it cannot resolve). DESIGN.md is
//      OPTIONAL — when present, its matching '## <Foundation>' section (e.g.
//      '## Color') supplies a leading prose section; when absent, or when a
//      given foundation has no matching section, that foundation's sheet still
//      emits with tokens only.
// OUT: writes <dir>/foundations/<name>.data.js for each foundation with at
//      least one matching dtcg.yml group — name in
//      color | typography | spacing-radius | effects (the same group mapping
//      design-system-generator's step 8 uses): color (groups: color) ·
//      typography (font, dimension, typography) · spacing-radius (spacing,
//      radius, size, border, border-width) · effects (shadow, opacity, motion,
//      zindex). Each file registers window.SUPERUI_DATA["foundation:<name>"]
//      per superui/references/preview-data-format.md: one token-grid section
//      per present dtcg.yml group (heading = group name), each item's varName
//      a leading-'--'-free dots-to-hyphens token path, value a fully resolved
//      human readout (alias chains followed to their concrete value; a token
//      carrying $extensions.org.superui.dark gets a " (dark: ...)" suffix),
//      usage from $description when present, render kind derived from the
//      token's dtcg.yml group. A foundation with none of its mapped groups
//      present is not emitted, and any stale foundations/<name>.data.js from a
//      previous run is deleted.
//      stdout — one summary line naming the emitted foundations.
//      Self-verifies: re-reads each written file, confirms the registry key and
//      that the embedded payload parses as JSON.
// Exit codes: 0 = written (or nothing to emit) and self-verified; 1 = bad args,
//      unreadable dtcg.yml, an unresolvable/circular alias, or a
//      self-verification failure.
// Flags: none.
//
// Regenerated wholesale — never hand-edit an emitted foundations/*.data.js;
// re-run this script after any dtcg.yml token value edit and reload the sheet
// in a browser. No LLM step and no HTML regeneration involved.

import {
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { join } from "node:path";

const ALIAS_RE = /^\{([^}]+)\}$/;
const MISSING = Symbol("missing"); // sentinel: token has no dark extension

// Same group mapping as design-system-generator/SKILL.md step 8.
const FOUNDATIONS: Record<string, string[]> = {
  color: ["color"],
  typography: ["font", "dimension", "typography"],
  "spacing-radius": ["spacing", "radius", "size", "border", "border-width"],
  effects: ["shadow", "opacity", "motion", "zindex"],
};

const TITLES: Record<string, string> = {
  color: "Color",
  typography: "Typography",
  "spacing-radius": "Spacing & Radius",
  effects: "Effects",
};

const SUBTITLES: Record<string, string> = {
  color: "Core palette tokens",
  typography: "Type scale and font tokens",
  "spacing-radius": "Spacing, sizing, and radius tokens",
  effects: "Shadow, opacity, and motion tokens",
};

// Per-group live-sample kind — one of the render enum in preview-data-format.md
// (color | type | spacing | radius | shadow | opacity | motion | none).
const GROUP_RENDER = new Map<string, string>([
  ["color", "color"],
  ["font", "type"],
  ["dimension", "type"],
  ["typography", "type"],
  ["spacing", "spacing"],
  ["size", "spacing"],
  ["border-width", "spacing"],
  ["radius", "radius"],
  ["border", "none"], // composite width+style+color — no single live sample
  ["shadow", "shadow"],
  ["opacity", "opacity"],
  ["motion", "motion"],
  ["zindex", "none"], // a bare number — no visual sample
]);

function fail(msg: string): never {
  writeSync(2, `error: ${msg}\n`);
  process.exit(1);
}

// ---------- filesystem / text helpers ----------

interface ErrnoLike {
  code?: unknown;
  errno?: unknown;
  path?: unknown;
}

// Detect a filesystem error (the counterpart of catching OSError).
function isOsError(e: unknown): boolean {
  const err = e as ErrnoLike;
  return (
    typeof e === "object" &&
    e !== null &&
    typeof err.code === "string" &&
    typeof err.errno === "number"
  );
}

// Render a filesystem error the way OSError stringifies:
// "[Errno N] <message>: '<path>'".
const ERRNO_TEXT: Record<string, string> = {
  ENOENT: "No such file or directory",
  EACCES: "Permission denied",
  EISDIR: "Is a directory",
  ENOTDIR: "Not a directory",
  EPERM: "Operation not permitted",
  EEXIST: "File exists",
  ENOSPC: "No space left on device",
  EROFS: "Read-only file system",
  ELOOP: "Too many levels of symbolic links",
  ENAMETOOLONG: "File name too long",
  EMFILE: "Too many open files",
  EBADF: "Bad file descriptor",
  EINVAL: "Invalid argument",
  EIO: "Input/output error",
  EBUSY: "Resource busy",
  ENOTEMPTY: "Directory not empty",
};

function osErrorMsg(e: unknown, pathHint?: string): string {
  const err = e as ErrnoLike;
  const n = typeof err.errno === "number" ? Math.abs(err.errno) : 0;
  const code = typeof err.code === "string" ? err.code : String(e);
  const text = ERRNO_TEXT[code] ?? code;
  const p = typeof err.path === "string" ? err.path : pathHint;
  return p !== undefined ? `[Errno ${n}] ${text}: '${p}'` : `[Errno ${n}] ${text}`;
}

// Read a file as strict UTF-8 with universal-newline translation
// (\r\n and \r become \n), the way a text-mode read behaves.
const utf8Strict = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function readTextPy(p: string): string {
  return utf8Strict.decode(readFileSync(p)).replace(/\r\n|\r/g, "\n");
}

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

// Whitespace set of str.strip()/rstrip() (str.isspace characters).
const PY_WS =
  " \\t\\n\\r\\v\\f\\x1c\\x1d\\x1e\\x1f\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const RSTRIP_RE = new RegExp(`[${PY_WS}]+$`);
const LSTRIP_RE = new RegExp(`^[${PY_WS}]+`);

function pyRstrip(s: string): string {
  return s.replace(RSTRIP_RE, "");
}

function pyLstrip(s: string): string {
  return s.replace(LSTRIP_RE, "");
}

function pyStrip(s: string): string {
  return pyRstrip(pyLstrip(s));
}

// str.splitlines(): splits on the full line-boundary set, no trailing empty.
function pySplitlines(s: string): string[] {
  if (s === "") return [];
  const parts = s.split(/\r\n|[\n\v\f\r\x1c\x1d\x1e\x85\u2028\u2029]/);
  if (parts[parts.length - 1] === "") parts.pop();
  return parts;
}

// html.escape(s, quote=False)
function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// str.title(): uppercase every cased character that follows an uncased one.
function pyTitle(s: string): string {
  let out = "";
  let prevCased = false;
  for (const ch of s) {
    const cased = /[\p{Lu}\p{Ll}\p{Lt}]/u.test(ch);
    if (cased) {
      out += prevCased ? ch.toLowerCase() : ch.toUpperCase();
    } else {
      out += ch;
    }
    prevCased = cased;
  }
  return out;
}

// ---------- Python-compatible value formatting ----------

// YAML floats keep their float-ness (16.0 vs 16) in a tagged wrapper so the
// readouts can format them exactly like the reference implementation.
interface PyFloat {
  __pyfloat: true;
  v: number;
}

function mkFloat(v: number): PyFloat {
  return { __pyfloat: true, v };
}

function isPyFloat(x: unknown): x is PyFloat {
  return (
    typeof x === "object" &&
    x !== null &&
    (x as PyFloat).__pyfloat === true &&
    typeof (x as PyFloat).v === "number"
  );
}

type YamlScalar = string | number | boolean | null | PyFloat;
type YamlKey = YamlScalar;
type YamlValue = YamlScalar | YamlValue[] | YamlMap;
type YamlMap = Map<YamlKey, YamlValue>;

// repr(float): shortest round-trip digits, fixed notation for exponents in
// [-4, 16), scientific with a signed two-digit-minimum exponent otherwise.
function pyFloatStr(x: number): string {
  if (Number.isNaN(x)) return "nan";
  if (x === Infinity) return "inf";
  if (x === -Infinity) return "-inf";
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const neg = x < 0;
  const s = String(Math.abs(x));
  let mant = s;
  let exp = 0;
  const e = s.indexOf("e");
  if (e >= 0) {
    mant = s.slice(0, e);
    exp = parseInt(s.slice(e + 1), 10);
  }
  let ip = mant;
  let fp = "";
  const dot = mant.indexOf(".");
  if (dot >= 0) {
    ip = mant.slice(0, dot);
    fp = mant.slice(dot + 1);
  }
  let digits = ip + fp;
  let decExp = ip.length + exp; // digit count before the decimal point
  let lead = 0;
  while (lead < digits.length - 1 && digits[lead] === "0") lead += 1;
  digits = digits.slice(lead);
  decExp -= lead;
  let end = digits.length;
  while (end > 1 && digits[end - 1] === "0") end -= 1;
  digits = digits.slice(0, end);
  const e10 = decExp - 1;
  let body: string;
  if (e10 >= -4 && e10 < 16) {
    if (decExp <= 0) body = "0." + "0".repeat(-decExp) + digits;
    else if (decExp >= digits.length)
      body = digits + "0".repeat(decExp - digits.length) + ".0";
    else body = digits.slice(0, decExp) + "." + digits.slice(decExp);
  } else {
    const m = digits.length > 1 ? digits[0] + "." + digits.slice(1) : digits;
    const es = Math.abs(e10).toString().padStart(2, "0");
    body = m + "e" + (e10 < 0 ? "-" : "+") + es;
  }
  return (neg ? "-" : "") + body;
}

// str(x)
function pyStr(x: unknown): string {
  if (typeof x === "string") return x;
  if (x === null || x === undefined) return "None";
  if (x === true) return "True";
  if (x === false) return "False";
  if (isPyFloat(x)) return pyFloatStr(x.v);
  if (typeof x === "number") {
    if (Number.isInteger(x) && !Number.isSafeInteger(x)) return BigInt(x).toString();
    return String(x);
  }
  if (Array.isArray(x) || x instanceof Map) return pyRepr(x);
  return String(x);
}

// repr(x) — for the str() fallbacks on containers.
function pyReprStr(s: string): string {
  const q = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = q;
  for (const ch of s) {
    const c = ch.codePointAt(0) as number;
    if (ch === "\\" || ch === q) out += "\\" + ch;
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (c < 0x20 || c === 0x7f) out += "\\x" + c.toString(16).padStart(2, "0");
    else out += ch;
  }
  return out + q;
}

function pyRepr(x: unknown): string {
  if (typeof x === "string") return pyReprStr(x);
  if (x === null || x === undefined) return "None";
  if (x === true) return "True";
  if (x === false) return "False";
  if (isPyFloat(x)) return pyFloatStr(x.v);
  if (typeof x === "number") return pyStr(x);
  if (Array.isArray(x)) return "[" + x.map(pyRepr).join(", ") + "]";
  if (x instanceof Map) {
    const parts: string[] = [];
    for (const [k, v] of x) parts.push(`${pyRepr(k)}: ${pyRepr(v)}`);
    return "{" + parts.join(", ") + "}";
  }
  return String(x);
}

function unwrapNum(x: unknown): number {
  if (x === true) return 1;
  if (x === false) return 0;
  if (isPyFloat(x)) return x.v;
  return x as number;
}

// bool(x)
function pyTruthy(x: unknown): boolean {
  if (x === null || x === undefined || x === false) return false;
  if (x === true) return true;
  if (typeof x === "number") return x !== 0;
  if (isPyFloat(x)) return x.v !== 0;
  if (typeof x === "string") return x.length > 0;
  if (Array.isArray(x)) return x.length > 0;
  if (x instanceof Map) return x.size > 0;
  return true;
}

// round(x): nearest integer, ties to even; int() of a non-finite float raises.
function pyRound(x: number): number {
  if (!Number.isFinite(x)) {
    throw new Error("cannot convert float NaN or infinity to integer");
  }
  const f = Math.floor(x);
  const diff = x - f;
  if (diff < 0.5) return f;
  if (diff > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

// format(n, "02x") — zero-padded to overall width 2, sign included in width.
function hex02(n: number): string {
  const sign = n < 0 ? "-" : "";
  const h = Math.abs(n).toString(16);
  const width = 2 - sign.length;
  return sign + (h.length < width ? "0".repeat(width - h.length) + h : h);
}

function mapGet(m: YamlMap, k: YamlKey, def: YamlValue): YamlValue {
  return m.has(k) ? (m.get(k) as YamlValue) : def;
}

// ---------- YAML subset parser (replaces the YAML dependency) ----------
// Covers the dtcg.yml serialization: block mappings & sequences, flow
// collections, single-/double-quoted and plain scalars, block scalars,
// comments, and YAML-1.1 plain-scalar resolution (bool/int/float/null with
// the same regexes the reference resolver uses). Anchors, aliases, tags,
// directives, and multi-document streams are unsupported and raise.

class YamlError extends Error {}

const YAML_BOOL_RE =
  /^(?:yes|Yes|YES|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF)$/;
const YAML_NULL_RE = /^(?:~|null|Null|NULL|)$/;
const YAML_INT_RE =
  /^(?:[-+]?0b[0-1_]+|[-+]?0[0-7_]+|[-+]?(?:0|[1-9][0-9_]*)|[-+]?0x[0-9a-fA-F_]+|[-+]?[1-9][0-9_]*(?::[0-5]?[0-9])+)$/;
const YAML_FLOAT_RE =
  /^(?:[-+]?(?:[0-9][0-9_]*)\.[0-9_]*(?:[eE][-+][0-9]+)?|\.[0-9_]+(?:[eE][-+][0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/;

function parseYamlInt(text: string): number {
  let s = text.replace(/_/g, "");
  let sign = 1;
  if (s[0] === "-") {
    sign = -1;
    s = s.slice(1);
  } else if (s[0] === "+") {
    s = s.slice(1);
  }
  if (s.startsWith("0b")) return sign * parseInt(s.slice(2), 2);
  if (s.startsWith("0x")) return sign * parseInt(s.slice(2), 16);
  if (s.includes(":")) {
    let v = 0;
    for (const part of s.split(":")) v = v * 60 + parseInt(part, 10);
    return sign * v;
  }
  if (s.length > 1 && s[0] === "0") return sign * parseInt(s, 8);
  return sign * parseInt(s, 10);
}

function parseYamlFloat(text: string): number {
  let s = text.replace(/_/g, "").toLowerCase();
  let sign = 1;
  if (s[0] === "-") {
    sign = -1;
    s = s.slice(1);
  } else if (s[0] === "+") {
    s = s.slice(1);
  }
  if (s === ".inf") return sign * Infinity;
  if (s === ".nan") return NaN;
  if (s.includes(":")) {
    let v = 0;
    for (const part of s.split(":")) v = v * 60 + parseFloat(part);
    return sign * v;
  }
  return sign * parseFloat(s);
}

function resolveYamlScalar(text: string): YamlScalar {
  if (YAML_NULL_RE.test(text)) return null;
  if (YAML_BOOL_RE.test(text)) return /^(?:yes|true|on)$/i.test(text);
  if (YAML_INT_RE.test(text)) return parseYamlInt(text);
  if (YAML_FLOAT_RE.test(text)) return mkFloat(parseYamlFloat(text));
  return text;
}

const DQ_ESCAPES: Record<string, string> = {
  "0": "\0",
  a: "\x07",
  b: "\b",
  t: "\t",
  n: "\n",
  v: "\v",
  f: "\f",
  r: "\r",
  e: "\x1b",
  " ": " ",
  '"': '"',
  "/": "/",
  "\\": "\\",
  N: "\x85",
  _: "\xa0",
  L: "\u2028",
  P: "\u2029",
};

function parseYamlLines(lines: string[]): YamlValue | null {
  let i = 0;

  const at = (): string => ` (line ${i + 1})`;

  const isBlankOrCommentLine = (line: string): boolean => {
    const t = line.trim();
    return t === "" || t.startsWith("#");
  };

  const indentOf = (line: string): number => {
    let n = 0;
    while (n < line.length && line[n] === " ") n += 1;
    if (n < line.length && line[n] === "\t") {
      throw new YamlError(`tab character used for indentation${at()}`);
    }
    return n;
  };

  const skipBlank = (): void => {
    while (i < lines.length && isBlankOrCommentLine(lines[i])) i += 1;
  };

  // Decode one double-quote escape starting at the backslash.
  const dqEscape = (s: string, p: number): { text: string; next: number } => {
    const c = s[p + 1];
    if (c === undefined) throw new YamlError(`unexpected end of escape${at()}`);
    if (c === "x" || c === "u" || c === "U") {
      const width = c === "x" ? 2 : c === "u" ? 4 : 8;
      const hex = s.slice(p + 2, p + 2 + width);
      if (hex.length !== width || !/^[0-9a-fA-F]+$/.test(hex)) {
        throw new YamlError(`invalid \\${c} escape${at()}`);
      }
      return { text: String.fromCodePoint(parseInt(hex, 16)), next: p + 2 + width };
    }
    const mapped = DQ_ESCAPES[c];
    if (mapped === undefined) throw new YamlError(`unknown escape \\${c}${at()}`);
    return { text: mapped, next: p + 2 };
  };

  // ---- flow-context scanner (also used for quoted scalars in block
  // position); pulls extra lines on demand so flow nodes may span lines ----
  interface FlowResult {
    value: YamlValue;
    tail: string;
  }

  const parseFlowText = (first: string): FlowResult => {
    let s = first;
    let p = 0;

    const err = (msg: string): never => {
      throw new YamlError(`${msg}${at()}`);
    };

    const ensure = (): boolean => {
      while (p >= s.length) {
        if (i >= lines.length) return false;
        s += "\n" + lines[i];
        i += 1;
      }
      return true;
    };

    const skipWsAndComments = (): void => {
      for (;;) {
        if (!ensure()) return;
        const c = s[p];
        if (c === " " || c === "\t" || c === "\n") {
          p += 1;
          continue;
        }
        if (c === "#" && (p === 0 || s[p - 1] === " " || s[p - 1] === "\t" || s[p - 1] === "\n")) {
          while (p < s.length && s[p] !== "\n") p += 1;
          continue;
        }
        return;
      }
    };

    const parseDq = (): string => {
      p += 1; // opening quote
      let out = "";
      for (;;) {
        if (!ensure()) err("unterminated double-quoted scalar");
        const c = s[p];
        if (c === '"') {
          p += 1;
          return out;
        }
        if (c === "\\") {
          if (s[p + 1] === "\n" || (p + 1 >= s.length && i < lines.length)) {
            // escaped line break: continuation without a space
            if (p + 1 >= s.length) ensure();
            p += 2;
            while (p < s.length && (s[p] === " " || s[p] === "\t")) p += 1;
            continue;
          }
          const r = dqEscape(s, p);
          out += r.text;
          p = r.next;
          continue;
        }
        if (c === "\n") {
          out = out.replace(/[ \t]+$/, "");
          p += 1;
          let breaks = 1;
          for (;;) {
            if (!ensure()) err("unterminated double-quoted scalar");
            if (s[p] === " " || s[p] === "\t") {
              p += 1;
              continue;
            }
            if (s[p] === "\n") {
              breaks += 1;
              p += 1;
              continue;
            }
            break;
          }
          out += breaks === 1 ? " " : "\n".repeat(breaks - 1);
          continue;
        }
        out += c;
        p += 1;
      }
    };

    const parseSq = (): string => {
      p += 1; // opening quote
      let out = "";
      for (;;) {
        if (!ensure()) err("unterminated single-quoted scalar");
        const c = s[p];
        if (c === "'") {
          if (s[p + 1] === "'") {
            out += "'";
            p += 2;
            continue;
          }
          p += 1;
          return out;
        }
        if (c === "\n") {
          out = out.replace(/[ \t]+$/, "");
          p += 1;
          let breaks = 1;
          for (;;) {
            if (!ensure()) err("unterminated single-quoted scalar");
            if (s[p] === " " || s[p] === "\t") {
              p += 1;
              continue;
            }
            if (s[p] === "\n") {
              breaks += 1;
              p += 1;
              continue;
            }
            break;
          }
          out += breaks === 1 ? " " : "\n".repeat(breaks - 1);
          continue;
        }
        out += c;
        p += 1;
      }
    };

    const parsePlainFlow = (): YamlScalar => {
      let out = "";
      for (;;) {
        if (p >= s.length) {
          if (!ensure()) break;
        }
        const c = s[p];
        if (c === "," || c === "]" || c === "}" || c === "[" || c === "{") break;
        if (c === ":") {
          const nxt = p + 1 < s.length ? s[p + 1] : "";
          if (
            nxt === "" ||
            nxt === " " ||
            nxt === "\t" ||
            nxt === "\n" ||
            nxt === "," ||
            nxt === "]" ||
            nxt === "}"
          ) {
            break;
          }
        }
        if (
          c === "#" &&
          out.length > 0 &&
          (s[p - 1] === " " || s[p - 1] === "\t" || s[p - 1] === "\n")
        ) {
          while (p < s.length && s[p] !== "\n") p += 1;
          continue;
        }
        if (c === "\n") {
          skipWsAndComments();
          if (p >= s.length) break;
          const c2 = s[p];
          if (c2 === "," || c2 === "]" || c2 === "}") break;
          out = out.replace(/[ \t]+$/, "") + " ";
          continue;
        }
        out += c;
        p += 1;
      }
      const text = out.replace(/[ \t]+$/, "");
      if (text === "") err("expected a flow scalar");
      return resolveYamlScalar(text);
    };

    const parseKeyScalar = (): YamlKey => {
      skipWsAndComments();
      if (!ensure()) err("unexpected end of stream in flow mapping");
      const c = s[p];
      if (c === '"') return parseDq();
      if (c === "'") return parseSq();
      return parsePlainFlow();
    };

    const parseSeq = (): YamlValue[] => {
      p += 1; // '['
      const arr: YamlValue[] = [];
      skipWsAndComments();
      if (ensure() && s[p] === "]") {
        p += 1;
        return arr;
      }
      for (;;) {
        arr.push(parseValue());
        skipWsAndComments();
        if (!ensure()) err("expected ',' or ']', but got end of stream");
        const c = s[p];
        if (c === ",") {
          p += 1;
          skipWsAndComments();
          if (ensure() && s[p] === "]") {
            p += 1;
            return arr;
          }
          continue;
        }
        if (c === "]") {
          p += 1;
          return arr;
        }
        err("expected ',' or ']' in flow sequence");
      }
    };

    const parseMap = (): YamlMap => {
      p += 1; // '{'
      const map: YamlMap = new Map();
      skipWsAndComments();
      if (ensure() && s[p] === "}") {
        p += 1;
        return map;
      }
      for (;;) {
        const key = parseKeyScalar();
        skipWsAndComments();
        let value: YamlValue = null;
        if (ensure() && s[p] === ":") {
          p += 1;
          value = parseValue();
        }
        map.set(key, value);
        skipWsAndComments();
        if (!ensure()) err("expected ',' or '}', but got end of stream");
        const c = s[p];
        if (c === ",") {
          p += 1;
          skipWsAndComments();
          if (ensure() && s[p] === "}") {
            p += 1;
            return map;
          }
          continue;
        }
        if (c === "}") {
          p += 1;
          return map;
        }
        err("expected ',' or '}' in flow mapping");
      }
    };

    const parseValue = (): YamlValue => {
      skipWsAndComments();
      if (!ensure()) err("unexpected end of stream in flow collection");
      const c = s[p];
      if (c === "{") return parseMap();
      if (c === "[") return parseSeq();
      if (c === '"') return parseDq();
      if (c === "'") return parseSq();
      if (c === "&" || c === "*" || c === "!") {
        err("anchors, aliases and tags are not supported");
      }
      return parsePlainFlow();
    };

    const value = parseValue();
    return { value, tail: s.slice(p) };
  };

  const checkTail = (tail: string): void => {
    const t = tail.replace(/^[ \t]+/, "");
    if (t !== "" && !t.startsWith("#")) {
      throw new YamlError(`unexpected content after node${at()}`);
    }
  };

  // ---- block-context parsing ----

  interface ScannedKey {
    key: YamlKey;
    rest: string;
  }

  // Detect "key:" at the start of a block line; null when the line is not a
  // mapping entry.
  const tryScanKey = (content: string): ScannedKey | null => {
    if (content.length === 0) return null;
    const c0 = content[0];
    if (c0 === "{" || c0 === "[" || c0 === "#") return null;
    if (c0 === '"' || c0 === "'") {
      let p = 1;
      let key = "";
      if (c0 === '"') {
        for (;;) {
          if (p >= content.length) return null;
          const c = content[p];
          if (c === "\\") {
            const r = dqEscape(content, p);
            key += r.text;
            p = r.next;
            continue;
          }
          if (c === '"') {
            p += 1;
            break;
          }
          key += c;
          p += 1;
        }
      } else {
        for (;;) {
          if (p >= content.length) return null;
          const c = content[p];
          if (c === "'") {
            if (content[p + 1] === "'") {
              key += "'";
              p += 2;
              continue;
            }
            p += 1;
            break;
          }
          key += c;
          p += 1;
        }
      }
      while (p < content.length && content[p] === " ") p += 1;
      if (
        p < content.length &&
        content[p] === ":" &&
        (p + 1 === content.length || content[p + 1] === " " || content[p + 1] === "\t")
      ) {
        return { key, rest: content.slice(p + 1) };
      }
      return null;
    }
    for (let p = 0; p < content.length; p += 1) {
      const c = content[p];
      if (
        c === ":" &&
        (p + 1 === content.length || content[p + 1] === " " || content[p + 1] === "\t")
      ) {
        const keyText = content.slice(0, p).replace(/[ \t]+$/, "");
        if (keyText === "") return null;
        return { key: resolveYamlScalar(keyText), rest: content.slice(p + 1) };
      }
      if (c === "#" && p > 0 && (content[p - 1] === " " || content[p - 1] === "\t")) {
        return null;
      }
    }
    return null;
  };

  const parseBlockScalar = (parentIndent: number, header: string): string => {
    const style = header[0]; // '|' or '>'
    let chomp: "clip" | "strip" | "keep" = "clip";
    let explicitIndent: number | null = null;
    let p = 1;
    while (p < header.length) {
      const c = header[p];
      if (c === "+") chomp = "keep";
      else if (c === "-") chomp = "strip";
      else if (c >= "1" && c <= "9") explicitIndent = parseInt(c, 10);
      else break;
      p += 1;
    }
    const tail = header.slice(p).replace(/^[ \t]+/, "");
    if (tail !== "" && !tail.startsWith("#")) {
      throw new YamlError(`unexpected content in block scalar header${at()}`);
    }
    const collected: Array<{ blank: boolean; line: string }> = [];
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === "") {
        collected.push({ blank: true, line: "" });
        i += 1;
        continue;
      }
      const ind = indentOf(line);
      if (ind <= parentIndent) break;
      collected.push({ blank: false, line });
      i += 1;
    }
    // drop trailing blank collection back onto the stream (they may belong to
    // the following structure only when nothing followed the scalar; harmless
    // either way since blank lines are skipped everywhere)
    let blockIndent = explicitIndent !== null ? parentIndent + explicitIndent : -1;
    if (blockIndent < 0) {
      for (const entry of collected) {
        if (!entry.blank) {
          blockIndent = indentOf(entry.line);
          break;
        }
      }
    }
    if (blockIndent < 0) blockIndent = parentIndent + 1;
    const contentLines = collected.map((entry) =>
      entry.blank ? "" : entry.line.slice(blockIndent),
    );
    while (contentLines.length > 0 && contentLines[contentLines.length - 1] === "") {
      if (chomp === "keep") break;
      contentLines.pop();
    }
    let text: string;
    if (style === "|") {
      text = contentLines.join("\n");
    } else {
      let out = "";
      let prevFolded = false; // previous line was a foldable text line
      for (const line of contentLines) {
        if (line === "") {
          out += "\n";
          prevFolded = false;
          continue;
        }
        if (line.startsWith(" ")) {
          out += (prevFolded ? "\n" : "") + line;
          prevFolded = false;
          out += "\n";
          continue;
        }
        if (prevFolded) out += " ";
        out += line;
        prevFolded = true;
      }
      text = out.replace(/\n+$/, "");
      text = contentLines.length > 0 ? text : "";
    }
    if (chomp === "strip") return text.replace(/\n+$/, "");
    if (chomp === "keep") return text + "\n".repeat(1);
    return text === "" ? "" : text + "\n";
  };

  // Inline value after "key:" or a whole-line scalar node; the current line
  // is already consumed, flow/quoted nodes may pull further lines.
  const parseInlineValue = (parentIndent: number, restRaw: string): YamlValue => {
    const rest = restRaw.replace(/^[ \t]+/, "");
    if (rest === "" || rest.startsWith("#")) return null;
    const c0 = rest[0];
    if (c0 === "{" || c0 === "[") {
      const r = parseFlowText(rest);
      checkTail(r.tail);
      return r.value;
    }
    if (c0 === '"' || c0 === "'") {
      const r = parseFlowText(rest); // a quoted scalar parses the same way
      checkTail(r.tail);
      return r.value;
    }
    if (c0 === "|" || c0 === ">") {
      return parseBlockScalar(parentIndent, rest);
    }
    if (c0 === "&" || c0 === "*" || c0 === "!" || c0 === "%") {
      throw new YamlError(`anchors, aliases, tags and directives are not supported${at()}`);
    }
    if (rest === "-" || rest.startsWith("- ")) {
      throw new YamlError(`block sequence entries are not allowed here${at()}`);
    }
    // plain scalar, possibly folded over more-indented continuation lines
    let text = rest;
    let hadComment = false;
    for (let p = 1; p < text.length; p += 1) {
      if (text[p] === "#" && (text[p - 1] === " " || text[p - 1] === "\t")) {
        text = text.slice(0, p);
        hadComment = true;
        break;
      }
    }
    text = text.replace(/[ \t]+$/, "");
    if (!hadComment) {
      for (;;) {
        let blanks = 0;
        let j = i;
        while (j < lines.length && lines[j].trim() === "") {
          blanks += 1;
          j += 1;
        }
        if (j >= lines.length) break;
        const line = lines[j];
        const ind = indentOf(line);
        if (ind <= parentIndent) break;
        const content = line.slice(ind);
        if (content.startsWith("#")) break;
        if (content === "-" || content.startsWith("- ")) {
          throw new YamlError(`unexpected block sequence entry${at()}`);
        }
        if (tryScanKey(content) !== null) {
          throw new YamlError(`mapping values are not allowed here${at()}`);
        }
        let piece = content;
        let pieceComment = false;
        for (let p = 1; p < piece.length; p += 1) {
          if (piece[p] === "#" && (piece[p - 1] === " " || piece[p - 1] === "\t")) {
            piece = piece.slice(0, p);
            pieceComment = true;
            break;
          }
        }
        piece = piece.replace(/[ \t]+$/, "");
        text += (blanks > 0 ? "\n".repeat(blanks) : " ") + piece;
        i = j + 1;
        if (pieceComment) break;
      }
    }
    return resolveYamlScalar(text);
  };

  // Value belonging to a "key:" whose rest was empty: an indented child node,
  // a sequence at the key's own indent, or null.
  const parseChildValue = (keyIndent: number): YamlValue => {
    skipBlank();
    if (i >= lines.length) return null;
    const line = lines[i];
    if (line.trim() === "...") return null;
    const ind = indentOf(line);
    if (ind > keyIndent) return parseNode(ind);
    const content = line.slice(ind);
    if (ind === keyIndent && (content === "-" || content.startsWith("- "))) {
      return parseSequence(keyIndent);
    }
    return null;
  };

  const parseMapping = (indent: number): YamlMap => {
    const map: YamlMap = new Map();
    for (;;) {
      skipBlank();
      if (i >= lines.length) break;
      const line = lines[i];
      if (line.trim() === "...") break;
      const ind = indentOf(line);
      if (ind < indent) break;
      if (ind > indent) throw new YamlError(`bad indentation in mapping${at()}`);
      const content = line.slice(indent);
      if (content === "-" || content.startsWith("- ")) {
        throw new YamlError(`unexpected block sequence entry in mapping${at()}`);
      }
      const scanned = tryScanKey(content);
      if (scanned === null) {
        throw new YamlError(`could not find expected ':'${at()}`);
      }
      i += 1;
      const restTrim = scanned.rest.replace(/^[ \t]+/, "");
      const value =
        restTrim === "" || restTrim.startsWith("#")
          ? parseChildValue(indent)
          : parseInlineValue(indent, scanned.rest);
      map.set(scanned.key, value);
    }
    return map;
  };

  const parseSequence = (indent: number): YamlValue[] => {
    const arr: YamlValue[] = [];
    for (;;) {
      skipBlank();
      if (i >= lines.length) break;
      const line = lines[i];
      if (line.trim() === "...") break;
      const ind = indentOf(line);
      if (ind < indent) break;
      if (ind > indent) throw new YamlError(`bad indentation in sequence${at()}`);
      const content = line.slice(indent);
      if (!(content === "-" || content.startsWith("- "))) break;
      if (content === "-") {
        i += 1;
        skipBlank();
        if (
          i < lines.length &&
          lines[i].trim() !== "..." &&
          indentOf(lines[i]) > indent
        ) {
          arr.push(parseNode(indentOf(lines[i])));
        } else {
          arr.push(null);
        }
      } else {
        let sp = 1;
        while (indent + sp < line.length && line[indent + sp] === " ") sp += 1;
        const contentCol = indent + sp;
        lines[i] = " ".repeat(contentCol) + line.slice(contentCol);
        arr.push(parseNode(contentCol));
      }
    }
    return arr;
  };

  const parseNode = (indent: number): YamlValue => {
    const line = lines[i];
    const content = line.slice(indent);
    if (content === "-" || content.startsWith("- ")) {
      return parseSequence(indent);
    }
    if (tryScanKey(content) !== null) {
      return parseMapping(indent);
    }
    i += 1;
    return parseInlineValue(indent, content);
  };

  // ---- document ----
  skipBlank();
  if (i < lines.length && lines[i].trim().startsWith("%")) {
    throw new YamlError(`YAML directives are not supported${at()}`);
  }
  if (i < lines.length && lines[i].trim() === "---") {
    i += 1;
    skipBlank();
  }
  if (i >= lines.length || lines[i].trim() === "...") return null;
  const node = parseNode(indentOf(lines[i]));
  skipBlank();
  if (i < lines.length && lines[i].trim() !== "...") {
    throw new YamlError(`unexpected content after document${at()}`);
  }
  return node;
}

function yamlSafeLoad(text: string): YamlValue | null {
  if (text.startsWith("\uFEFF")) text = text.slice(1);
  return parseYamlLines(text.split("\n"));
}

// ---------- token tree walk (mirrors tokens_to_css.py / validate_tokens.py,
// duplicated locally per this repo's standalone-script convention) ----------

function varName(path: string): string {
  return path.replaceAll(".", "-");
}

function groupHeading(group: string): string {
  return pyTitle(group.replaceAll("-", " "));
}

interface TokenInfo {
  type: YamlValue;
  value: YamlValue;
  dark: YamlValue | typeof MISSING;
  description: YamlValue;
  group: string;
}

function darkOf(node: YamlMap): YamlValue | typeof MISSING {
  const ext = node.get("$extensions");
  if (ext instanceof Map) {
    const org = ext.get("org.superui");
    if (org instanceof Map && org.has("dark")) return org.get("dark") as YamlValue;
  }
  return MISSING;
}

function walk(
  node: YamlValue,
  path: string[],
  inheritedType: YamlValue,
  tokens: Map<string, TokenInfo>,
): void {
  if (!(node instanceof Map)) return;
  const nodeType = node.has("$type") ? (node.get("$type") as YamlValue) : inheritedType;
  if (node.has("$value")) {
    tokens.set(path.join("."), {
      type: nodeType,
      value: node.get("$value") as YamlValue,
      dark: darkOf(node),
      description: node.has("$description")
        ? (node.get("$description") as YamlValue)
        : null,
      group: path[0],
    });
    return;
  }
  for (const [key, child] of node) {
    // A non-string key raises here, exactly like the reference walk.
    if ((key as string).startsWith("$")) continue;
    walk(child, [...path, key as string], nodeType, tokens);
  }
}

// Follow alias strings ("{a.b.c}") to their concrete value, recursively,
// at any nesting depth inside a composite. Raises via fail() on a dangling
// or circular alias.
function resolveDeep(
  pathLabel: string,
  value: YamlValue,
  tokens: Map<string, TokenInfo>,
  seen: Set<string>,
): YamlValue {
  if (typeof value === "string") {
    const m = ALIAS_RE.exec(pyStrip(value));
    if (m) {
      const target = m[1];
      if (seen.has(target)) fail(`${pathLabel}: circular alias via ${target}`);
      if (!tokens.has(target)) {
        fail(`${pathLabel}: alias '{${target}}' does not resolve`);
      }
      return resolveDeep(
        pathLabel,
        (tokens.get(target) as TokenInfo).value,
        tokens,
        new Set([...seen, target]),
      );
    }
    return value;
  }
  if (value instanceof Map) {
    const out: YamlMap = new Map();
    for (const [k, v] of value) {
      out.set(k, resolveDeep(pathLabel, v as YamlValue, tokens, seen));
    }
    return out;
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveDeep(pathLabel, v, tokens, seen));
  }
  return value;
}

// ---------- resolved-value -> human readout ----------

function num(x: unknown): string {
  if (typeof x === "number" || typeof x === "boolean" || isPyFloat(x)) {
    const v = unwrapNum(x);
    if (!Number.isFinite(v)) {
      // int(x) on NaN/inf raises
      throw new Error("cannot convert float NaN or infinity to integer");
    }
    if (Math.trunc(v) === v) return BigInt(v).toString();
  }
  return pyStr(x);
}

// Numeric loose-equality helper (1 == 1.0 == True).
function eqOne(x: unknown): boolean {
  if (typeof x === "number") return x === 1;
  if (typeof x === "boolean") return x === true;
  if (isPyFloat(x)) return x.v === 1;
  return false;
}

function colorReadout(v: YamlValue): string {
  if (!(v instanceof Map)) return pyStr(v);
  const alpha = mapGet(v, "alpha", 1);
  const comps = v.get("components");
  const space = mapGet(v, "colorSpace", "srgb");
  if (space === "srgb") {
    if (eqOne(alpha) && typeof v.get("hex") === "string") return v.get("hex") as string;
    if (Array.isArray(comps) && comps.length === 3) {
      const [r, g, b] = comps.map((c) => pyRound(unwrapNum(c) * 255));
      if (eqOne(alpha)) return `#${hex02(r)}${hex02(g)}${hex02(b)}`;
      return `rgb(${r} ${g} ${b} / ${num(alpha)})`;
    }
  }
  if (Array.isArray(comps)) {
    const c = comps.map((x) => num(x)).join(" ");
    return eqOne(alpha)
      ? `color(${pyStr(space)} ${c})`
      : `color(${pyStr(space)} ${c} / ${num(alpha)})`;
  }
  return pyStr(v);
}

function dimReadout(v: YamlValue): string {
  if (v instanceof Map && v.has("value") && v.has("unit")) {
    return `${num(v.get("value"))}${pyStr(v.get("unit"))}`;
  }
  return pyStr(v);
}

function fontfamilyReadout(v: YamlValue): string {
  const fams = Array.isArray(v) ? v : [v];
  return fams.map((f) => pyStr(f)).join(", ");
}

function bezierReadout(v: YamlValue): string {
  if (typeof v === "string") return v; // keyword like ease-in-out
  if (Array.isArray(v) && v.length === 4) {
    return `cubic-bezier(${v.map((x) => num(x)).join(", ")})`;
  }
  return pyStr(v);
}

function shadowReadout(v: YamlValue): string {
  const layers = Array.isArray(v) ? v : [v];
  const parts: string[] = [];
  for (const layer of layers) {
    if (!(layer instanceof Map)) {
      parts.push(pyStr(layer));
      continue;
    }
    const bits: string[] = [];
    if (pyTruthy(layer.get("inset"))) bits.push("inset");
    for (const k of ["offsetX", "offsetY", "blur", "spread"]) {
      const def: YamlMap = new Map<YamlKey, YamlValue>([
        ["value", 0],
        ["unit", "px"],
      ]);
      bits.push(dimReadout(mapGet(layer, k, def)));
    }
    bits.push(colorReadout(mapGet(layer, "color", null)));
    parts.push(bits.join(" "));
  }
  return parts.join(", ");
}

function borderReadout(v: YamlValue): string {
  if (!(v instanceof Map)) return pyStr(v);
  const style = mapGet(v, "style", "solid");
  return `${dimReadout(mapGet(v, "width", null))} ${pyStr(style)} ${colorReadout(mapGet(v, "color", null))}`;
}

function transitionReadout(v: YamlValue): string {
  if (!(v instanceof Map)) return pyStr(v);
  const bits: string[] = [dimReadout(mapGet(v, "duration", null))];
  const tf = mapGet(v, "timingFunction", null);
  if (tf !== null) bits.push(bezierReadout(tf));
  const delay = mapGet(v, "delay", null);
  if (delay !== null) bits.push(dimReadout(delay));
  return bits.join(" ");
}

function typographyReadout(v: YamlValue): string {
  if (!(v instanceof Map)) return pyStr(v);
  const parts: string[] = [];
  for (const [k, sv] of v) {
    if (sv instanceof Map && sv.has("value") && sv.has("unit")) {
      parts.push(`${pyStr(k)}: ${dimReadout(sv)}`);
    } else if (sv instanceof Map && (sv.has("colorSpace") || sv.has("hex"))) {
      parts.push(`${pyStr(k)}: ${colorReadout(sv)}`);
    } else if (Array.isArray(sv)) {
      parts.push(`${pyStr(k)}: ${sv.map((x) => pyStr(x)).join(", ")}`);
    } else {
      parts.push(`${pyStr(k)}: ${pyStr(sv)}`);
    }
  }
  return parts.join("; ");
}

function valueReadout(tokenType: YamlValue, v: YamlValue): string {
  if (tokenType === "color") return colorReadout(v);
  if (tokenType === "dimension" || tokenType === "duration") return dimReadout(v);
  if (tokenType === "number" || tokenType === "fontWeight") {
    return typeof v === "number" || isPyFloat(v) || typeof v === "boolean"
      ? num(v)
      : pyStr(v);
  }
  if (tokenType === "fontFamily") return fontfamilyReadout(v);
  if (tokenType === "cubicBezier") return bezierReadout(v);
  if (tokenType === "shadow") return shadowReadout(v);
  if (tokenType === "border") return borderReadout(v);
  if (tokenType === "transition") return transitionReadout(v);
  if (tokenType === "typography") return typographyReadout(v);
  return pyStr(v);
}

interface SheetItem {
  name: string;
  varName: string;
  value: string;
  render: string;
  usage?: unknown;
}

function buildItem(
  path: string,
  info: TokenInfo,
  tokens: Map<string, TokenInfo>,
): SheetItem {
  const resolved = resolveDeep(path, info.value, tokens, new Set([path]));
  let readout = valueReadout(info.type, resolved);
  if (info.dark !== MISSING) {
    const darkResolved = resolveDeep(
      `${path} (dark)`,
      info.dark as YamlValue,
      tokens,
      new Set([path]),
    );
    readout = `${readout} (dark: ${valueReadout(info.type, darkResolved)})`;
  }
  const item: SheetItem = {
    name: path,
    varName: varName(path),
    value: readout,
    render: GROUP_RENDER.get(info.group) ?? "none",
  };
  if (pyTruthy(info.description)) {
    item.usage = isPyFloat(info.description) ? info.description.v : info.description;
  }
  return item;
}

// ---------- DESIGN.md -> HTML (same minimal markdown->HTML helpers as
// build_index.py, duplicated locally per this repo's standalone-script
// convention) ----------

function mdInline(s: string): string {
  s = escapeHtml(s);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

function mdBlock(lines: string[]): string {
  // Minimal markdown -> HTML: bullets (with indented continuation lines)
  // and paragraphs. Skips comments.
  const out: string[] = [];
  let para: string[] = [];
  let inUl = false;

  const flushPara = (): void => {
    if (para.length > 0) {
      out.push("<p>" + mdInline(para.join(" ")) + "</p>");
      para = [];
    }
  };

  for (const raw of lines) {
    const line = pyRstrip(raw);
    if (pyLstrip(line).startsWith("<!--") || line.endsWith("-->")) {
      continue;
    }
    if (line.startsWith("- ")) {
      flushPara();
      if (!inUl) {
        out.push('<ul class="principles-list">');
        inUl = true;
      }
      out.push("<li>" + mdInline(line.slice(2)) + "</li>");
    } else if (pyStrip(line) === "") {
      flushPara();
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
    } else if (inUl && line.startsWith("  ")) {
      out[out.length - 1] =
        out[out.length - 1].slice(0, -"</li>".length) +
        " " +
        mdInline(pyStrip(line)) +
        "</li>";
    } else {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      para.push(pyStrip(line));
    }
  }
  flushPara();
  if (inUl) {
    out.push("</ul>");
  }
  return out.join("\n");
}

function sectionsOf(mdText: string): Map<string, string[]> {
  // Split DESIGN.md into {heading: [lines]} for '## ' headings.
  const secs = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of pySplitlines(mdText)) {
    if (line.startsWith("## ")) {
      current = pyStrip(line.slice(3));
      secs.set(current, []);
    } else if (current !== null) {
      (secs.get(current) as string[]).push(line);
    }
  }
  return secs;
}

// ---------- write + self-verify ----------

interface Sheet {
  title: string;
  subtitle: string;
  sections: unknown[];
}

function writeSheet(outPath: string, key: string, sheet: Sheet): void {
  const payload = JSON.stringify(sheet, null, 2);
  const content =
    "window.SUPERUI_DATA = window.SUPERUI_DATA || {};\n" +
    `window.SUPERUI_DATA["${key}"] = ${payload};\n`;
  try {
    writeFileSync(outPath, content, "utf-8");
  } catch (e) {
    if (isOsError(e)) fail(`cannot write ${outPath}: ${osErrorMsg(e, outPath)}`);
    throw e;
  }

  const written = readTextPy(outPath);
  const prefix = `window.SUPERUI_DATA["${key}"] = `;
  const idx = written.indexOf(prefix);
  if (idx < 0) {
    fail(`self-verify failed for ${outPath}: registry key missing`);
  }
  let literal = pyRstrip(written.slice(idx + prefix.length));
  if (literal.endsWith(";")) {
    literal = literal.slice(0, -1);
  }
  try {
    JSON.parse(literal);
  } catch (e) {
    fail(`self-verify failed for ${outPath}: malformed payload (${(e as Error).message})`);
  }
}

function main(): void {
  if (process.argv.length !== 3) {
    fail("usage: build_foundation_data.ts DESIGN_SYSTEM_DIR");
  }
  const root = process.argv[2];
  const dtcgPath = join(root, "dtcg.yml");
  let raw: string;
  try {
    raw = readTextPy(dtcgPath);
  } catch (e) {
    if (isOsError(e)) fail(`cannot read ${dtcgPath}: ${osErrorMsg(e, dtcgPath)}`);
    throw e;
  }
  const data = yamlSafeLoad(raw);
  if (!(data instanceof Map)) {
    fail("top level must be a mapping");
  }

  const tokens = new Map<string, TokenInfo>();
  walk(data, [], null, tokens);

  let designSections = new Map<string, string[]>();
  const designMd = join(root, "DESIGN.md");
  if (isFile(designMd)) {
    designSections = sectionsOf(readTextPy(designMd));
  }

  const outDir = join(root, "foundations");
  mkdirSync(outDir, { recursive: true });

  const emitted: string[] = [];
  for (const [foundation, groups] of Object.entries(FOUNDATIONS)) {
    const itemsByGroup = new Map<string, SheetItem[]>();
    for (const [path, info] of tokens) {
      if (groups.includes(info.group)) {
        if (!itemsByGroup.has(info.group)) itemsByGroup.set(info.group, []);
        (itemsByGroup.get(info.group) as SheetItem[]).push(
          buildItem(path, info, tokens),
        );
      }
    }

    const outPath = join(outDir, `${foundation}.data.js`);
    if (itemsByGroup.size === 0) {
      if (isFile(outPath)) unlinkSync(outPath);
      continue;
    }

    const sections: unknown[] = [];
    const headingLines = designSections.get(TITLES[foundation]);
    if (headingLines !== undefined) {
      const proseHtml = mdBlock(headingLines);
      if (proseHtml) {
        sections.push({ type: "prose", html: proseHtml });
      }
    }
    for (const group of groups) {
      // stable, mapping order
      if (itemsByGroup.has(group)) {
        sections.push({
          type: "token-grid",
          heading: groupHeading(group),
          items: itemsByGroup.get(group) as SheetItem[],
        });
      }
    }

    const sheet: Sheet = {
      title: TITLES[foundation],
      subtitle: SUBTITLES[foundation],
      sections,
    };
    writeSheet(outPath, `foundation:${foundation}`, sheet);
    emitted.push(foundation);
  }

  if (emitted.length > 0) {
    writeSync(1, `${emitted.length} foundations emitted: ${emitted.join(", ")} -> ${outDir}\n`);
  } else {
    writeSync(1, `0 foundations emitted (no matching dtcg.yml groups) -> ${outDir}\n`);
  }
}

main();
