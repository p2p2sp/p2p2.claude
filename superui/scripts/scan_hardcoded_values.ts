#!/usr/bin/env node
// Scan implementation files for hardcoded style values that design tokens should cover.
//
// IN : argv[1] — path to a file with newline-separated file paths to scan (the
//      caller resolves the user's globs into this list; blank lines ignored).
//      argv[2] — path to the design system's dtcg.yml. Used ONLY to derive which
//      value FAMILIES the token set covers; families with zero tokens are not
//      scanned (nothing to drift against — a wholly missing family is a
//      system-level completeness matter, not a per-line hit) and are listed on
//      stderr as skipped.
// OUT: stdout — one line per hit: "<file>:<line>\t<family>\t<raw-value>", where
//      family is one of color | dimension | font | radius | shadow | duration.
//      stderr — informational only: skipped families and skipped files
//      (binary / minified / unreadable / vendored).
// Exit codes: 0 = scan completed (with or without hits), 1 = bad args or an
//      unreadable input list / dtcg.yml.
// Flags: none.
//
// Detection is intentionally DUMB and technology-neutral: line regexes for
// hex/rgb()/hsl()/oklch(), <number>px|rem|em in style-ish contexts, and the
// obvious style properties (font-size, font-family, border-radius, box-shadow,
// transition/animation durations) in any syntax, string literals included.
// FALSE POSITIVES ARE EXPECTED AND ACCEPTABLE — the consuming audit agent
// (token-drift-auditor) filters them in file context; do not tighten these
// patterns at the cost of recall.
// Skipped without scanning: binary files (NUL byte in the first 4 KB), minified
// files (any line longer than 2000 chars), and any path containing a
// node_modules / dist / build / .git / .superui segment.

import * as fs from "node:fs";

// ---------------------------------------------------------------------------
// Python-compat string helpers
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

// Mirror str.splitlines() (splits on \v, \f, \x1c-\x1e, \x85, U+2028/9 too).
const PY_LINEBREAK = /\r\n|[\n\r\v\f\u001c\u001d\u001e\u0085\u2028\u2029]/;

function pySplitlines(s: string): string[] {
  if (s === "") return [];
  const parts = s.split(PY_LINEBREAK);
  if (parts.length > 1 && parts[parts.length - 1] === "") parts.pop();
  return parts;
}
// ---------------------------------------------------------------------------
// Python-compat helpers
// ---------------------------------------------------------------------------

// Mirror Python repr() for strings (single-quote preference, minimal escapes).
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

// Mirror str() for scalar YAML keys (int keys like `500:` become "500").
function pyStr(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  return String(v);
}

// Mirror str(OSError): "[Errno N] message: 'path'" for common fs failures.
const OS_ERROR_TEXT: Record<string, string> = {
  ENOENT: "No such file or directory",
  EACCES: "Permission denied",
  EISDIR: "Is a directory",
  ENOTDIR: "Not a directory",
  ELOOP: "Too many levels of symbolic links",
  ENAMETOOLONG: "File name too long",
  EMFILE: "Too many open files",
  EPERM: "Operation not permitted",
  EIO: "Input/output error",
};

function isFsError(err: unknown): boolean {
  const e = err as { code?: unknown; errno?: unknown };
  return !!e && typeof e.code === "string" && typeof e.errno === "number";
}

function formatOSError(err: unknown, filename: string): string {
  const e = err as { code: string; errno: number; message?: string };
  if (Object.hasOwn(OS_ERROR_TEXT, e.code)) {
    return `[Errno ${Math.abs(e.errno)}] ${OS_ERROR_TEXT[e.code]}: ${pyReprStr(filename)}`;
  }
  return String(e.message ?? err);
}

// Mirror os.path.join (POSIX) without node's path normalization.
function pyJoin(a: string, b: string): string {
  if (b.startsWith("/")) return b;
  if (a === "" || a.endsWith("/")) return a + b;
  return a + "/" + b;
}

// Read a text file the way Python's open(encoding="utf-8") does: strict
// decoding (bad UTF-8 throws) and universal-newline translation.
function readTextStrict(p: string): string {
  const buf = fs.readFileSync(p);
  const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buf);
  return text.replace(/\r\n?/g, "\n");
}

// sys.exit(message): message to stderr, exit code 1.
class Exit extends Error {
  code: number;
  constructor(code: number) {
    super("exit");
    this.code = code;
  }
}

function die(msg: string): never {
  console.error(msg);
  throw new Exit(1);
}
// ---------------------------------------------------------------------------
// Minimal YAML parser (PyYAML-compatible subset for generated dtcg.yml files)
//
// Supports: block mappings/sequences, flow mappings/sequences (multi-line),
// single/double-quoted scalars, plain scalars with YAML 1.1 resolution
// (null/bool/int/float incl. PyYAML's signed-exponent float quirk), block
// scalars (| and >), comments, a leading document marker. Mappings preserve
// key order and key types (Map). Anchors/aliases/tags are not supported.
// ---------------------------------------------------------------------------

class YAMLError extends Error {}

type Yaml = null | boolean | number | string | Yaml[] | YamlMap;
interface YamlMap extends Map<Yaml, Yaml> {}

function parsePyInt(s: string): number {
  let t = s.replace(/_/g, "");
  let sign = 1;
  if (t[0] === "+" || t[0] === "-") {
    if (t[0] === "-") sign = -1;
    t = t.slice(1);
  }
  if (t === "0") return 0;
  if (t.startsWith("0b")) return sign * parseInt(t.slice(2), 2);
  if (t.startsWith("0x")) return sign * parseInt(t.slice(2), 16);
  if (t.includes(":")) {
    let value = 0;
    for (const part of t.split(":")) value = value * 60 + parseInt(part, 10);
    return sign * value;
  }
  if (t.startsWith("0")) return sign * parseInt(t, 8);
  return sign * parseInt(t, 10);
}

function parsePyFloat(s: string): number {
  let t = s.replace(/_/g, "").toLowerCase();
  let sign = 1;
  if (t[0] === "+" || t[0] === "-") {
    if (t[0] === "-") sign = -1;
    t = t.slice(1);
  }
  if (t.includes(":")) {
    const parts = t.split(":");
    let value = 0;
    for (const part of parts) value = value * 60 + parseFloat(part);
    return sign * value;
  }
  return sign * parseFloat(t);
}

function resolvePlain(s: string): Yaml {
  if (s === "" || /^(~|null|Null|NULL)$/.test(s)) return null;
  if (/^(yes|Yes|YES|true|True|TRUE|on|On|ON)$/.test(s)) return true;
  if (/^(no|No|NO|false|False|FALSE|off|Off|OFF)$/.test(s)) return false;
  if (
    /^[-+]?0b[0-1_]+$/.test(s) ||
    /^[-+]?0x[0-9a-fA-F_]+$/.test(s) ||
    /^[-+]?0[0-7_]+$/.test(s) ||
    /^[-+]?(0|[1-9][0-9_]*)$/.test(s) ||
    /^[-+]?[1-9][0-9_]*(:[0-5]?[0-9])+$/.test(s)
  ) {
    return parsePyInt(s);
  }
  if (
    /^[-+]?[0-9][0-9_]*\.[0-9_]*([eE][-+][0-9]+)?$/.test(s) ||
    /^\.[0-9_]+([eE][-+][0-9]+)?$/.test(s) ||
    /^[-+]?[0-9][0-9_]*(:[0-5]?[0-9])+\.[0-9_]*$/.test(s)
  ) {
    return parsePyFloat(s);
  }
  if (/^[-+]?\.(inf|Inf|INF)$/.test(s)) return s.startsWith("-") ? -Infinity : Infinity;
  if (/^\.(nan|NaN|NAN)$/.test(s)) return NaN;
  return s;
}

function parseYamlDocument(source: string): Yaml {
  const text = source.replace(/\r\n?/g, "\n").replace(/^﻿/, "");
  const lines = text.split("\n");
  let row = 0;
  let col = 0;

  function atEOF(): boolean {
    return row >= lines.length;
  }
  function curLine(): string {
    return lines[row] ?? "";
  }
  function nextLine(): void {
    row++;
    col = 0;
  }

  // Skip blank/comment lines; stop at the next content line and return its
  // indent, or -1 at end of input. Leaves the cursor at that line's start.
  function skipToContent(): number {
    while (!atEOF()) {
      const line = curLine();
      const indent = (/^ */.exec(line) as RegExpExecArray)[0].length;
      const rest = line.slice(indent);
      if (rest === "" || rest.startsWith("#")) {
        nextLine();
        continue;
      }
      if (rest.startsWith("\t")) {
        throw new YAMLError(`tab character used for indentation at line ${row + 1}`);
      }
      col = 0;
      return indent;
    }
    return -1;
  }

  // Rest of the current line must be blank or a comment; consume the line.
  function endLine(what: string): void {
    const rest = curLine().slice(col).replace(/^[ \t]*/, "");
    if (rest !== "" && !rest.startsWith("#")) {
      throw new YAMLError(`unexpected content after ${what} at line ${row + 1}: ${rest}`);
    }
    nextLine();
  }

  // Parse a single-line quoted scalar starting at line[i]. Returns null when
  // the closing quote is not on the same line.
  function readQuotedAt(line: string, i: number): { value: string; end: number } | null {
    const q = line[i];
    let out = "";
    let j = i + 1;
    const simple: Record<string, string> = {
      "0": "\0", a: "\x07", b: "\b", t: "\t", n: "\n", v: "\v", f: "\f",
      r: "\r", e: "\x1b", " ": " ", '"': '"', "/": "/", "\\": "\\",
      N: "\x85", _: "\xa0", L: "\u2028", P: "\u2029",
    };
    while (j < line.length) {
      const ch = line[j];
      if (q === "'") {
        if (ch === "'") {
          if (line[j + 1] === "'") {
            out += "'";
            j += 2;
            continue;
          }
          return { value: out, end: j + 1 };
        }
        out += ch;
        j++;
        continue;
      }
      if (ch === '"') return { value: out, end: j + 1 };
      if (ch === "\\") {
        const e = line[j + 1];
        if (e !== undefined && Object.hasOwn(simple, e)) {
          out += simple[e];
          j += 2;
          continue;
        }
        if (e === "x" || e === "u" || e === "U") {
          const n = e === "x" ? 2 : e === "u" ? 4 : 8;
          const hex = line.slice(j + 2, j + 2 + n);
          if (hex.length !== n || !/^[0-9a-fA-F]+$/.test(hex)) {
            throw new YAMLError(`invalid escape in double-quoted scalar at line ${row + 1}`);
          }
          out += String.fromCodePoint(parseInt(hex, 16));
          j += 2 + n;
          continue;
        }
        throw new YAMLError(`unknown escape '\\${e ?? ""}' at line ${row + 1}`);
      }
      out += ch;
      j++;
    }
    return null;
  }


  // Parse a quoted scalar at the cursor, spanning lines with YAML folding
  // (one break folds to a space, n breaks to n-1 newlines).
  function parseQuotedScalar(): string {
    const q = curLine()[col];
    col++;
    let out = "";
    let breaks = 0;
    const simple: Record<string, string> = {
      "0": "\0", a: "\x07", b: "\b", t: "\t", n: "\n", v: "\v", f: "\f",
      r: "\r", e: "\x1b", " ": " ", '"': '"', "/": "/", "\\": "\\",
      N: "\x85", _: "\xa0", L: "\u2028", P: "\u2029",
    };
    const flush = (): void => {
      if (breaks > 0) {
        out += breaks === 1 ? " " : "\n".repeat(breaks - 1);
        breaks = 0;
      }
    };
    const takeBreak = (fold: boolean): void => {
      out = out.replace(/[ \t]+$/, "");
      if (fold) breaks++;
      nextLine();
      if (atEOF()) throw new YAMLError("unterminated quoted scalar at end of stream");
      let k = 0;
      const l = curLine();
      while (l[k] === " " || l[k] === "\t") k++;
      col = k;
    };
    while (true) {
      const line = curLine();
      if (col >= line.length) {
        takeBreak(true);
        continue;
      }
      const ch = line[col];
      if (q === "'") {
        if (ch === "'") {
          if (line[col + 1] === "'") {
            flush();
            out += "'";
            col += 2;
            continue;
          }
          col++;
          return out;
        }
        flush();
        out += ch;
        col++;
        continue;
      }
      if (ch === '"') {
        col++;
        return out;
      }
      if (ch === "\\") {
        if (col + 1 >= line.length) {
          // escaped line break: continue without folding a space in
          takeBreak(false);
          continue;
        }
        const e = line[col + 1];
        flush();
        if (Object.hasOwn(simple, e)) {
          out += simple[e];
          col += 2;
          continue;
        }
        if (e === "x" || e === "u" || e === "U") {
          const n = e === "x" ? 2 : e === "u" ? 4 : 8;
          const hex = line.slice(col + 2, col + 2 + n);
          if (hex.length !== n || !/^[0-9a-fA-F]+$/.test(hex)) {
            throw new YAMLError(`invalid escape in double-quoted scalar at line ${row + 1}`);
          }
          out += String.fromCodePoint(parseInt(hex, 16));
          col += 2 + n;
          continue;
        }
        throw new YAMLError(`unknown escape '\\${e}' at line ${row + 1}`);
      }
      flush();
      out += ch;
      col++;
    }
  }

  // Detect `key:` at column `start` on the current line. Returns the resolved
  // key and the column just past the colon, or null when there is no key here.
  function readKey(start: number): { key: Yaml; after: number } | null {
    const line = curLine();
    const c = line[start];
    if (c === undefined) return null;
    if (c === "?" && (line[start + 1] === " " || start + 1 === line.length)) {
      throw new YAMLError(`explicit complex mapping keys are not supported (line ${row + 1})`);
    }
    if (c === '"' || c === "'") {
      const q = readQuotedAt(line, start);
      if (q === null) return null;
      let j = q.end;
      while (line[j] === " ") j++;
      if (line[j] === ":" && (j + 1 >= line.length || line[j + 1] === " " || line[j + 1] === "\t")) {
        return { key: q.value, after: j + 1 };
      }
      return null;
    }
    let depth = 0;
    for (let j = start; j < line.length; j++) {
      const ch = line[j];
      if (ch === "[" || ch === "{") depth++;
      else if (ch === "]" || ch === "}") depth--;
      else if (ch === "#" && j > start && (line[j - 1] === " " || line[j - 1] === "\t")) break;
      else if (
        ch === ":" &&
        depth === 0 &&
        (j + 1 >= line.length || line[j + 1] === " " || line[j + 1] === "\t")
      ) {
        const raw = line.slice(start, j).replace(/[ \t]+$/, "");
        if (raw === "") return null;
        return { key: resolvePlain(raw), after: j + 1 };
      }
    }
    return null;
  }

  function peek(): string {
    return curLine()[col];
  }

  // Inside a flow collection: skip spaces, newlines and comments.
  function flowSkipWS(): void {
    while (!atEOF()) {
      const line = curLine();
      if (col >= line.length) {
        nextLine();
        continue;
      }
      const c = line[col];
      if (c === " " || c === "\t") {
        col++;
        continue;
      }
      if (c === "#" && (col === 0 || line[col - 1] === " " || line[col - 1] === "\t")) {
        nextLine();
        continue;
      }
      return;
    }
    throw new YAMLError("unexpected end of stream inside a flow collection");
  }

  function parseFlowItem(): Yaml {
    const line = curLine();
    const c = line[col];
    if (c === "[" || c === "{") return parseFlow();
    if (c === '"' || c === "'") {
      return parseQuotedScalar();
    }
    if (c === "&" || c === "*" || c === "!") {
      throw new YAMLError(`anchors, aliases and tags are not supported (line ${row + 1})`);
    }
    let j = col;
    while (j < line.length) {
      const ch = line[j];
      if (ch === "," || ch === "]" || ch === "}" || ch === "[" || ch === "{") break;
      if (ch === ":" && (j + 1 >= line.length || " \t,]}".includes(line[j + 1]))) break;
      if (ch === "#" && j > col && (line[j - 1] === " " || line[j - 1] === "\t")) break;
      j++;
    }
    const raw = line.slice(col, j).replace(/[ \t]+$/, "");
    if (raw === "") throw new YAMLError(`expected a flow node at line ${row + 1}`);
    col = j;
    return resolvePlain(raw);
  }

  function parseFlow(): Yaml {
    const open = curLine()[col];
    col++;
    if (open === "[") {
      const arr: Yaml[] = [];
      flowSkipWS();
      if (peek() === "]") {
        col++;
        return arr;
      }
      while (true) {
        arr.push(parseFlowItem());
        flowSkipWS();
        const c = peek();
        if (c === ",") {
          col++;
          flowSkipWS();
          if (peek() === "]") {
            col++;
            return arr;
          }
          continue;
        }
        if (c === "]") {
          col++;
          return arr;
        }
        throw new YAMLError(`expected ',' or ']' in a flow sequence at line ${row + 1}`);
      }
    }
    const map: YamlMap = new Map();
    flowSkipWS();
    if (peek() === "}") {
      col++;
      return map;
    }
    while (true) {
      const key = parseFlowItem();
    let value: Yaml = null;
      flowSkipWS();
      if (peek() === ":") {
        col++;
        flowSkipWS();
        value = parseFlowItem();
        flowSkipWS();
      }
      map.set(key, value);
      const c = peek();
      if (c === ",") {
        col++;
        flowSkipWS();
        if (peek() === "}") {
          col++;
          return map;
        }
        continue;
      }
      if (c === "}") {
        col++;
        return map;
      }
      throw new YAMLError(`expected ',' or '}' in a flow mapping at line ${row + 1}`);
    }
  }

  function parseBlockScalar(parentIndent: number): string {
    const header = curLine().slice(col);
    const m = /^([|>])([+-]?)([0-9]*)([+-]?)[ \t]*(#.*)?$/.exec(header);
    if (!m) throw new YAMLError(`invalid block scalar header at line ${row + 1}`);
    const folded = m[1] === ">";
    const chomp = m[2] || m[4] || "";
    const explicit = m[3] ? parseInt(m[3], 10) : 0;
    nextLine();
    const body: string[] = [];
    let contentIndent = explicit ? parentIndent + explicit : -1;
    while (!atEOF()) {
      const l = curLine();
      const ind = (/^ */.exec(l) as RegExpExecArray)[0].length;
      if (l.slice(ind) === "") {
        body.push(contentIndent >= 0 && l.length > contentIndent ? l.slice(contentIndent) : "");
        nextLine();
        continue;
      }
      if (ind <= parentIndent) break;
      if (contentIndent < 0) contentIndent = ind;
      if (ind < contentIndent) break;
      body.push(l.slice(contentIndent));
      nextLine();
    }
    let content: string;
    if (folded) {
      let outStr = "";
      let prevNonEmpty = false;
      for (const bl of body) {
        if (bl === "") {
          outStr += "\n";
          prevNonEmpty = false;
        } else {
          if (prevNonEmpty) outStr += " ";
          outStr += bl;
          prevNonEmpty = true;
        }
      }
      content = outStr;
    } else {
      content = body.join("\n");
    }
    if (body.length > 0) content += "\n";
    if (chomp === "-") return content.replace(/\n+$/, "");
    if (chomp === "+") return content;
    if (/^\n*$/.test(content)) return "";
    return content.replace(/\n+$/, "\n");
  }

  // Parse a scalar or flow value that starts at the cursor on the current line.
  function parseInlineValue(parentIndent: number): Yaml {
    const line = curLine();
    const c = line[col];
    if (c === "{" || c === "[") {
      const v = parseFlow();
      endLine("flow collection");
      return v;
    }
    if (c === '"' || c === "'") {
      const v = parseQuotedScalar();
      endLine("quoted scalar");
      return v;
    }
    if (c === "&" || c === "*" || c === "!" || c === "%" || c === "@" || c === "`") {
      throw new YAMLError(`unsupported YAML token ${pyReprStr(c)} at line ${row + 1}`);
    }
    let raw = line.slice(col);
    const cm = /[ \t]#/.exec(raw);
    if (cm) raw = raw.slice(0, cm.index);
    raw = raw.replace(/[ \t]+$/, "");
    nextLine();
    // Fold deeper-indented plain-scalar continuation lines.
    const parts = [raw];
    while (true) {
      const saveRow = row;
      const saveCol = col;
      const ni = skipToContent();
      if (ni < 0 || ni <= parentIndent) {
        row = saveRow;
        col = saveCol;
        break;
      }
      if (readKey(ni) !== null) {
        throw new YAMLError(`mapping values are not allowed here (line ${row + 1})`);
      }
      let cval = curLine().slice(ni);
      const ccm = /[ \t]#/.exec(cval);
      if (ccm) cval = cval.slice(0, ccm.index);
      cval = cval.replace(/[ \t]+$/, "");
      parts.push(cval);
      nextLine();
    }
    return resolvePlain(parts.join(" "));
  }

  function isDashLine(rest: string): boolean {
    return rest === "-" || rest.startsWith("- ") || /^-[ \t]*(#.*)?$/.test(rest);
  }

  function isDocMarker(rest: string): boolean {
    return rest === "..." || rest === "---" || rest.startsWith("--- ");
  }

  // Parse the value that follows a mapping key's colon.
  function parseValueAfterColon(parentIndent: number): Yaml {
    const line = curLine();
    let i = col;
    while (line[i] === " " || line[i] === "\t") i++;
    const rest = line.slice(i);
    if (rest === "" || rest.startsWith("#")) {
      nextLine();
      const ni = skipToContent();
      if (ni < 0) return null;
      const nrest = curLine().slice(ni);
      if (ni > parentIndent) return parseNodeAt(ni, parentIndent);
      if (ni === parentIndent && isDashLine(nrest)) return parseBlockSeq(ni, false);
      return null;
    }
    col = i;
    if (rest[0] === "|" || rest[0] === ">") return parseBlockScalar(parentIndent);
    return parseInlineValue(parentIndent);
  }

  function parseBlockMap(indent: number, first: boolean): YamlMap {
    const map: YamlMap = new Map();
    while (true) {
      if (first) {
        first = false;
      } else {
        const i = skipToContent();
        if (i < 0 || i < indent) break;
        if (i > indent) throw new YAMLError(`bad indentation at line ${row + 1}`);
        const rest = curLine().slice(i);
        if (isDocMarker(rest)) {
          if (indent === 0) break;
          throw new YAMLError(`unexpected document marker at line ${row + 1}`);
        }
        if (isDashLine(rest)) {
          throw new YAMLError(`block sequence entry is not allowed in this mapping (line ${row + 1})`);
        }
      }
      const k = readKey(indent);
      if (k === null) throw new YAMLError(`expected a mapping key at line ${row + 1}`);
      col = k.after;
      map.set(k.key, parseValueAfterColon(indent));
    }
    return map;
  }

  function parseBlockSeq(indent: number, first: boolean): Yaml[] {
    const arr: Yaml[] = [];
    while (true) {
      if (first) {
        first = false;
      } else {
        const i = skipToContent();
        if (i < 0 || i < indent) break;
        if (i > indent) throw new YAMLError(`bad indentation at line ${row + 1}`);
        if (!isDashLine(curLine().slice(i))) break;
      }
      const line = curLine();
      if (/^-[ \t]*(#.*)?$/.test(line.slice(indent))) {
        nextLine();
        const ni = skipToContent();
        if (ni > indent) arr.push(parseNodeAt(ni, indent));
        else arr.push(null);
      } else {
        let j = indent + 1;
        while (line[j] === " ") j++;
        arr.push(parseNodeAt(j, indent));
      }
    }
    return arr;
  }

  // Parse a node whose first token starts at absolute column `start` on the
  // current line (which may be mid-line, e.g. after "- ").
  function parseNodeAt(start: number, parentIndent: number): Yaml {
    const rest = curLine().slice(start);
    if (isDashLine(rest)) return parseBlockSeq(start, true);
    if (readKey(start) !== null) return parseBlockMap(start, true);
    col = start;
    if (rest[0] === "|" || rest[0] === ">") return parseBlockScalar(parentIndent);
    return parseInlineValue(parentIndent);
  }

  // --- document level ---
  let indent = skipToContent();
  if (indent < 0) return null;
  if (indent === 0) {
    const first = curLine();
    if (first === "---") {
      nextLine();
      indent = skipToContent();
      if (indent < 0) return null;
    } else if (first.startsWith("--- ")) {
      col = 4;
      while (curLine()[col] === " ") col++;
      const v = parseNodeAt(col, -1);
      if (skipToContent() >= 0 && curLine().slice(col) !== "...") {
        throw new YAMLError("expected a single document in the stream");
      }
      return v;
    } else if (first.startsWith("%")) {
      throw new YAMLError("YAML directives are not supported");
    }
  }
  const value = parseNodeAt(indent, -1);
  const trailing = skipToContent();
  if (trailing >= 0) {
    const rest = curLine().slice(trailing);
    if (rest === "...") {
      nextLine();
      if (skipToContent() < 0) return value;
    }
    throw new YAMLError("expected a single document in the stream");
  }
  return value;
}


// ---------------------------------------------------------------------------
// scan_hardcoded_values
// ---------------------------------------------------------------------------

class ValueError extends Error {}

const SKIP_SEGMENTS = new Set(["node_modules", "dist", "build", ".git", ".superui"]);
const MAX_LINE = 2000;
const FAMILIES = ["color", "dimension", "font", "radius", "shadow", "duration"];

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)|\boklch\([^)]*\)/g;
const NUM_UNIT_RE = /\b\d+(?:\.\d+)?(?:px|rem|em)\b/g;
const DURATION_VAL_RE = /\b\d+(?:\.\d+)?m?s\b/g;
const FONT_FAMILY_RE = /font-family\s*[:=]\s*([^;"'\n{}]{1,80})/gi;

const CTX_RADIUS = /border-radius|corner-radius|\bradius\b|rounded/i;
const CTX_SHADOW = /box-shadow|drop-shadow|\bshadow\b|elevation/i;
const CTX_FONTSIZE = /font-size|\bfont\s*[:=]/i;
const CTX_DURATION = /transition|animation|duration|delay/i;
const CTX_STYLEISH = new RegExp(
  "padding|margin|\\bgap\\b|width|height|\\btop\\b|\\bright\\b|\\bbottom\\b|\\bleft\\b" +
    "|inset|spacing|\\bsize\\b|border|outline|line-height|letter-spacing|indent" +
    "|blur|offset|translate",
  "i",
);

// Families with at least one token in dtcg.yml. Throws on unreadable input.
function coveredFamilies(dtcgPath: string): Set<string> {
  const text = readTextStrict(dtcgPath);
  const data = parseYamlDocument(text);
  if (!(data instanceof Map)) {
    throw new ValueError("dtcg.yml top level must be a mapping");
  }
  const fams = new Set<string>();

  const walk = (node: Yaml, path_: string[], inherited: Yaml): void => {
    if (!(node instanceof Map)) return;
    const nodeType = node.has("$type") ? node.get("$type") : inherited;
    if (node.has("$value")) {
      const joined = path_.join(".").toLowerCase();
      if (nodeType === "color") fams.add("color");
      else if (nodeType === "shadow") fams.add("shadow");
      else if (nodeType === "duration") fams.add("duration");
      else if (nodeType === "fontFamily" || nodeType === "fontWeight" || nodeType === "typography") {
        fams.add("font");
      } else if (nodeType === "dimension") {
        fams.add("dimension");
        if (joined.includes("radius")) fams.add("radius");
        if (joined.includes("font")) fams.add("font");
      }
      return;
    }
    for (const [key, child] of node) {
      if (typeof key === "string" && key.startsWith("$")) continue;
      walk(child, path_.concat([pyStr(key)]), nodeType);
    }
  };

  walk(data, [], null);
  return fams;
}

// Family for a <number><px|rem|em> hit, or null when the line is not style-ish.
function classifyNumUnit(line: string): string | null {
  if (CTX_RADIUS.test(line)) return "radius";
  if (CTX_SHADOW.test(line)) return "shadow";
  if (CTX_FONTSIZE.test(line)) return "font";
  if (CTX_STYLEISH.test(line)) return "dimension";
  return null;
}

function scanFile(p: string, covered: Set<string>, out: string[], seen: Set<string>): void {
  const parts = p.split(/[\\/]+/);
  if (parts.some((seg) => SKIP_SEGMENTS.has(seg))) {
    console.error(`# skipped (vendored): ${p}`);
    return;
  }
  let lines: string[];
  try {
    const fd = fs.openSync(p, "r");
    let head: Buffer;
    try {
      const buf = Buffer.alloc(4096);
      const n = fs.readSync(fd, buf, 0, 4096, 0);
      head = buf.subarray(0, n);
    } finally {
      fs.closeSync(fd);
    }
    if (head.includes(0)) {
      console.error(`# skipped (binary): ${p}`);
      return;
    }
    // Python opens with errors="replace": lossy decode, never a decode error.
    const raw = fs.readFileSync(p).toString("utf8");
    lines = pySplitlines(raw.replace(/\r\n?/g, "\n"));
  } catch (e) {
    if (isFsError(e)) {
      console.error(`# skipped (unreadable): ${p}: ${formatOSError(e, p)}`);
      return;
    }
    throw e;
  }
  if (lines.some((line) => line.length > MAX_LINE)) {
    console.error(`# skipped (minified): ${p}`);
    return;
  }

  const emit = (lineno: number, family: string, value: string): void => {
    if (!covered.has(family)) return;
    const key = `${p}\u0000${lineno}\u0000${family}\u0000${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(`${p}:${lineno}\t${family}\t${value}`);
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const lineno = idx + 1;
    const line = lines[idx];
    for (const m of line.matchAll(COLOR_RE)) {
      emit(lineno, "color", m[0]);
    }
    for (const m of line.matchAll(NUM_UNIT_RE)) {
      const family = classifyNumUnit(line);
      if (family) {
        emit(lineno, family, m[0]);
      }
    }
    if (CTX_DURATION.test(line)) {
      for (const m of line.matchAll(DURATION_VAL_RE)) {
        emit(lineno, "duration", m[0]);
      }
    }
    for (const m of line.matchAll(FONT_FAMILY_RE)) {
      const value = pyStrip(m[1]).replace(/,+$/, "");
      if (value && !value.includes("var(") && !value.startsWith("{")) {
        emit(lineno, "font", value);
      }
    }
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length !== 2) {
    die("usage: scan_hardcoded_values.ts FILE_LIST DTCG_YML");
  }
  let paths: string[];
  try {
    const listText = readTextStrict(argv[0]);
    paths = listText
      .split("\n")
      .map((line) => pyStrip(line))
      .filter((line) => line.length > 0);
  } catch (e) {
    if (isFsError(e)) die(`error: cannot read file list ${argv[0]}: ${formatOSError(e, argv[0])}`);
    throw e; // decode errors are uncaught, like the original
  }
  let covered: Set<string>;
  try {
    covered = coveredFamilies(argv[1]);
  } catch (e) {
    let msg: string;
    if (e instanceof Exit) throw e;
    if (isFsError(e)) msg = formatOSError(e, argv[1]);
    else if (e instanceof YAMLError || e instanceof ValueError) msg = e.message;
    else if (e instanceof TypeError) msg = e.message; // bad UTF-8 (wording differs from Python's codec message)
    else throw e;
    die(`error: cannot read dtcg.yml ${argv[1]}: ${msg}`);
  }

  for (const family of FAMILIES) {
    if (!covered.has(family)) {
      console.error(`# family not covered by tokens, not scanned: ${family}`);
    }
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of paths) {
    scanFile(p, covered, out, seen);
  }
  for (const line of out) {
    console.log(line);
  }
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
