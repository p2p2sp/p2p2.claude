#!/usr/bin/env node
// Extract completeness facts from an extracted design system — data only,
// no judgment about what SHOULD exist.
//
// IN : argv[1] — the design-system output dir (reads <dir>/dtcg.yml, and every
//      *.md under <dir>/components/ and <dir>/patterns/, plus <dir>/completions.md
//      if present).
//      argv[2] — output path for the facts file (written as UTF-8).
// OUT: writes argv[2] — four '## ' sections, each holding single '- ' fact
//      lines:
//        ## Tier facts          per top-level group: token count, raw vs alias
//                               split; then which of primitive/semantic/component
//                               tiers are present vs absent across all groups
//                               (component = a top-level group named `component`
//                               or `components` — the conventional DTCG
//                               component-local-token namespace)
//        ## Dark facts          total color tokens, how many carry
//                               $extensions.org.superui.dark; when that count is
//                               > 0, the color tokens still lacking it; when 0,
//                               a single "no dark theme detected" line
//        ## Spec state facts    per components/*.md and patterns/*.md: whether
//                               '## States' exists, and if so the row names
//                               parsed from the first cell of its '|' table rows
//        ## Provenance facts    system provenance: designed|measured, from the
//                               root $extensions.org.superui.provenance marker
//                               (present|absent) on the dtcg.yml document itself;
//                               tokens flagged $extensions.org.superui.synthesized,
//                               specs carrying a '**Provenance:**' line or a
//                               '> SYNTHESIZED:' marker, and whether
//                               completions.md exists (its '- ' entries verbatim)
//      stdout — nothing on success. Self-verifies: re-reads the written file and
//      asserts all four headings are present.
// Exit codes: 0 = written and verified (gaps are DATA, not errors — an empty
//      system still exits 0 with sections stating "none found" /
//      "no dark theme detected"); 1 = bad args, missing/unreadable dtcg.yml,
//      malformed YAML, or self-verification failure. No output file is left
//      behind on any failure before the write step.
// Flags: none.

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
// check_completeness
// ---------------------------------------------------------------------------

const ALIAS_RE = /^\{([^}]+)\}$/;
const SEP_ROW_RE = /^\s*\|[\s:|-]+\|\s*$/;

const SECTIONS = ["## Tier facts", "## Dark facts", "## Spec state facts", "## Provenance facts"];

interface TokenInfo {
  node: YamlMap;
  type: Yaml;
}

// Return the $extensions.org.superui mapping, or null when absent.
function orgSuperui(node: YamlMap): YamlMap | null {
  const ext = node.get("$extensions");
  if (ext instanceof Map) {
    const org = ext.get("org.superui");
    if (org instanceof Map) return org;
  }
  return null;
}

function hasDark(node: YamlMap): boolean {
  const org = orgSuperui(node);
  return org !== null && org.has("dark");
}

function hasSynthesized(node: YamlMap): boolean {
  const org = orgSuperui(node);
  return org !== null && org.get("synthesized") === true;
}

// Walk a parsed dtcg.yml mapping into {dotted path: {node, type}}, resolving
// $type inheritance from enclosing groups (own $type, else the nearest
// ancestor's).
function loadTokens(data: YamlMap): Map<string, TokenInfo> {
  const tokens = new Map<string, TokenInfo>();

  const walk = (node: Yaml, path_: string[], inheritedType: Yaml): void => {
    if (!(node instanceof Map)) return;
    const nodeType = node.has("$type") ? node.get("$type") : inheritedType;
    if (node.has("$value")) {
      tokens.set(path_.join("."), { node, type: nodeType });
      return;
    }
    for (const [key, child] of node) {
      if (typeof key === "string" && key.startsWith("$")) continue;
      walk(child, path_.concat([pyStr(key)]), nodeType);
    }
  };

  walk(data, [], null);
  return tokens;
}

function tierFacts(tokens: Map<string, TokenInfo>): string[] {
  const groups = new Map<string, { total: number; raw: number; alias: number }>();
  for (const [p, info] of tokens) {
    const di = p.indexOf(".");
    const top = di < 0 ? p : p.slice(0, di);
    let g = groups.get(top);
    if (g === undefined) {
      g = { total: 0, raw: 0, alias: 0 };
      groups.set(top, g);
    }
    g.total += 1;
    const value = info.node.get("$value");
    if (typeof value === "string" && ALIAS_RE.test(pyStrip(value))) {
      g.alias += 1;
    } else {
      g.raw += 1;
    }
  }

  if (groups.size === 0) return ["- none found"];

  const lines: string[] = [];
  for (const name of Array.from(groups.keys()).sort()) {
    const g = groups.get(name) as { total: number; raw: number; alias: number };
    lines.push(`- group \`${name}\`: ${g.total} tokens (${g.raw} raw, ${g.alias} alias)`);
  }

  let primitive = false;
  let semantic = false;
  for (const g of groups.values()) {
    if (g.raw > 0) primitive = true;
    if (g.alias > 0) semantic = true;
  }
  const component = Array.from(groups.keys()).some((n) => n === "component" || n === "components");
  const tiers: Array<[string, boolean]> = [
    ["primitive", primitive],
    ["semantic", semantic],
    ["component", component],
  ];
  const present = tiers.filter(([, ok]) => ok).map(([n]) => n);
  const absent = tiers.filter(([, ok]) => !ok).map(([n]) => n);
  if (present.length > 0) lines.push(`- tiers present: ${present.join(", ")}`);
  if (absent.length > 0) lines.push(`- tiers absent: ${absent.join(", ")}`);
  return lines;
}

function darkFacts(tokens: Map<string, TokenInfo>): string[] {
  const colorPaths = Array.from(tokens.entries())
    .filter(([, info]) => info.type === "color")
    .map(([p]) => p)
    .sort();
  if (colorPaths.length === 0) {
    return ["- total color tokens: 0", "- no dark theme detected"];
  }

  const darkPaths = new Set(colorPaths.filter((p) => hasDark((tokens.get(p) as TokenInfo).node)));
  const lines = [
    `- total color tokens: ${colorPaths.length}`,
    `- color tokens with dark: ${darkPaths.size}`,
  ];
  if (darkPaths.size > 0) {
    const missing = colorPaths.filter((p) => !darkPaths.has(p));
    if (missing.length > 0) {
      for (const p of missing) lines.push(`- missing dark: \`${p}\``);
    } else {
      lines.push("- no color tokens missing dark");
    }
  } else {
    lines.push("- no dark theme detected");
  }
  return lines;
}

// Return the '## States' table's data-row cells (header row excluded), or
// null when no '## States' heading exists, or [] when the heading exists but
// no table rows follow it.
function statesTableRows(text: string): string[] | null {
  const lines = pySplitlines(text);
  for (let i = 0; i < lines.length; i++) {
    if (pyStrip(lines[i]) === "## States") {
      const tableLines: string[] = [];
      for (const later of lines.slice(i + 1)) {
        if (later.startsWith("## ")) break;
        const stripped = pyStrip(later);
        if (stripped.startsWith("|")) tableLines.push(later);
      }
      const rows = tableLines.filter((r) => !SEP_ROW_RE.test(r));
      return rows.length > 1 ? rows.slice(1) : [];
    }
  }
  return null;
}

function listSpecDirs(root: string, sub: string): string[] | null {
  const d = pyJoin(root, sub);
  let isDir = false;
  try {
    isDir = fs.statSync(d).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) return null;
  return fs.readdirSync(d).sort();
}

function specStateFacts(root: string): string[] {
  const lines: string[] = [];
  let foundAny = false;
  for (const sub of ["components", "patterns"]) {
    const names = listSpecDirs(root, sub);
    if (names === null) continue;
    for (const name of names) {
      if (!name.endsWith(".md")) continue;
      foundAny = true;
      const rel = `${sub}/${name}`;
      const text = readTextStrict(pyJoin(pyJoin(root, sub), name)); // errors uncaught, like the original
      const rows = statesTableRows(text);
      if (rows === null) {
        lines.push(`- ${rel}: no ## States section`);
        continue;
      }
      if (rows.length === 0) {
        lines.push(`- ${rel}: ## States present, no state rows found`);
        continue;
      }
      const states: string[] = [];
      for (const rowLine of rows) {
        const cells = pyStrip(rowLine).replace(/^\|+|\|+$/g, "").split("|");
        states.push(cells.length > 0 ? pyStrip(cells[0]) : "");
      }
      lines.push(`- ${rel}: states = ${states.join(", ")}`);
    }
  }
  if (!foundAny) lines.push("- none found");
  return lines;
}

// Return "designed" when the dtcg.yml document itself (root, sibling of the
// top-level token groups) carries $extensions.org.superui.provenance:
// designed; "measured" otherwise (marker absent or any other value).
function systemProvenance(data: YamlMap): string {
  const org = orgSuperui(data);
  if (org !== null && org.get("provenance") === "designed") return "designed";
  return "measured";
}

function provenanceFacts(root: string, data: YamlMap, tokens: Map<string, TokenInfo>): string[] {
  const lines: string[] = [];
  const marker = systemProvenance(data);
  const presence = marker === "designed" ? "present" : "absent";
  lines.push(`- system provenance: ${marker} (root marker ${presence})`);
  const synthesized = Array.from(tokens.entries())
    .filter(([, info]) => hasSynthesized(info.node))
    .map(([p]) => p)
    .sort();
  lines.push(`- synthesized tokens: ${synthesized.length}`);
  for (const p of synthesized) {
    lines.push(`- synthesized token: \`${p}\``);
  }

  const markedSpecs: string[] = [];
  for (const sub of ["components", "patterns"]) {
    const names = listSpecDirs(root, sub);
    if (names === null) continue;
    for (const name of names) {
      if (!name.endsWith(".md")) continue;
      const text = readTextStrict(pyJoin(pyJoin(root, sub), name)); // errors uncaught, like the original
      if (text.includes("**Provenance:**") || text.includes("> SYNTHESIZED:")) {
        markedSpecs.push(`${sub}/${name}`);
      }
    }
  }
  if (markedSpecs.length > 0) {
    for (const s of markedSpecs) lines.push(`- provenance-marked spec: ${s}`);
  } else {
    lines.push("- no provenance-marked specs found");
  }

  const completions = pyJoin(root, "completions.md");
  let isFile = false;
  try {
    isFile = fs.statSync(completions).isFile();
  } catch {
    isFile = false;
  }
  if (isFile) {
    lines.push("- completions.md: present");
    const text = readTextStrict(completions); // errors uncaught, like the original
    for (const line of text.split("\n")) {
      if (pyStrip(line).startsWith("- ")) {
        lines.push(pyStrip(line));
      }
    }
  } else {
    lines.push("- completions.md: absent");
  }
  return lines;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length !== 2) {
    die("usage: check_completeness.ts DESIGN_SYSTEM_DIR OUT.md");
  }
  const root = argv[0];
  const outPath = argv[1];

  const dtcgPath = pyJoin(root, "dtcg.yml");
  let text: string;
  try {
    text = readTextStrict(dtcgPath);
  } catch (e) {
    if (isFsError(e)) die(`error: cannot read ${dtcgPath}: ${formatOSError(e, dtcgPath)}`);
    throw e; // decode errors are uncaught, like the original
  }
  let data: Yaml;
  try {
    data = parseYamlDocument(text);
  } catch (e) {
    if (e instanceof YAMLError) die(`error: cannot parse ${dtcgPath}: ${e.message}`);
    throw e;
  }
  if (!(data instanceof Map)) {
    die(`error: ${dtcgPath} top level must be a mapping`);
  }

  const tokens = loadTokens(data);

  const lines: string[] = [];
  lines.push("## Tier facts");
  lines.push(...tierFacts(tokens));
  lines.push("");
  lines.push("## Dark facts");
  lines.push(...darkFacts(tokens));
  lines.push("");
  lines.push("## Spec state facts");
  lines.push(...specStateFacts(root));
  lines.push("");
  lines.push("## Provenance facts");
  lines.push(...provenanceFacts(root, data, tokens));
  lines.push("");

  try {
    fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  } catch (e) {
    if (isFsError(e)) die(`error: cannot write ${outPath}: ${formatOSError(e, outPath)}`);
    throw e;
  }

  let written: string;
  try {
    written = readTextStrict(outPath);
  } catch (e) {
    if (isFsError(e)) die(`error: cannot re-read ${outPath}: ${formatOSError(e, outPath)}`);
    throw e;
  }
  for (const heading of SECTIONS) {
    if (!`\n${written}\n`.includes(`\n${heading}\n`)) {
      die(`error: self-verification failed — missing heading '${heading}'`);
    }
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
