/* Minimal YAML subset parser for the superui plugin — a dependency-free
   replacement for PyYAML's yaml.safe_load(), covering exactly the YAML that
   this plugin's token-composer agent writes into dtcg.yml:

     - block mappings and block sequences (incl. compact "- key: value" items)
     - flow sequences [a, b] and flow mappings {a: b} (nested, multi-line)
     - plain / single-quoted / double-quoted scalars (multi-line folding)
     - block scalars | and > with chomping indicators (-, +) and explicit
       indentation indicators
     - comments and blank lines

   Scalar resolution matches PyYAML's YAML 1.1 rules: booleans incl.
   yes/no/on/off variants, ints (decimal / 0x / 0b / leading-0 octal /
   underscores / sexagesimal), floats (incl. .inf/.nan; exponents require a
   sign, so "1e3" is a string — a PyYAML quirk kept on purpose), null/~/empty,
   everything else a string. Floats are wrapped in YamlFloat so consumers can
   preserve Python's int/float distinction ("1.0" vs "1") when re-serializing.

   Mappings are returned as Map (never plain objects) so document key order is
   preserved 1:1 — including integer-like keys ("400", "500" font weights,
   which a plain JS object would reorder). Unquoted numeric keys resolve to
   numbers, exactly like PyYAML.

   Unsupported YAML (outside the superui subset) throws a YAMLError naming the
   construct: anchors (&), aliases (*), tags (!), directives (%), document
   markers (--- / ...), merge keys (<<), the '=' value special, explicit '?'
   keys, timestamp scalars, and flow collections used as mapping keys.

   Errors are YAMLError instances whose message mimics PyYAML's format
   ("while parsing a flow sequence\n  in FILE, line L, column C\n<problem>\n
   <mark>") so callers that print caught parse errors stay byte-compatible
   with the Python originals on common failure shapes. */

/** A YAML float — kept distinct from ints so Python's repr semantics
 *  (json.dumps writes 1.0, not 1) survive the port. */
export class YamlFloat {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}

export type YamlScalar = null | boolean | number | YamlFloat | string;
export type YamlValue = YamlScalar | YamlValue[] | YamlMap;
export type YamlMap = Map<YamlScalar, YamlValue>;

export class Mark {
  name: string;
  line: number; // 0-based
  column: number; // 0-based
  constructor(name: string, line: number, column: number) {
    this.name = name;
    this.line = line;
    this.column = column;
  }
  toString(): string {
    return `  in "${this.name}", line ${this.line + 1}, column ${this.column + 1}`;
  }
}

export class YAMLError extends Error {
  context: string | null;
  contextMark: Mark | null;
  problem: string | null;
  problemMark: Mark | null;
  constructor(
    context: string | null,
    contextMark: Mark | null,
    problem: string | null,
    problemMark: Mark | null,
  ) {
    const parts: string[] = [];
    if (context !== null) parts.push(context);
    if (contextMark !== null) parts.push(contextMark.toString());
    if (problem !== null) parts.push(problem);
    if (problemMark !== null) parts.push(problemMark.toString());
    super(parts.join("\n"));
    this.name = "YAMLError";
    this.context = context;
    this.contextMark = contextMark;
    this.problem = problem;
    this.problemMark = problemMark;
  }
}

/** Python repr(float) — shortest round-trip digits, Python's fixed/scientific
 *  switch (scientific when exp < -4 or exp >= 16) and two-digit exponents. */
export function pyFloatRepr(x: number): string {
  if (Number.isNaN(x)) return "nan";
  if (x === Infinity) return "inf";
  if (x === -Infinity) return "-inf";
  const neg = x < 0 || Object.is(x, -0);
  const s = Math.abs(x).toExponential(); // shortest digits, e.g. "9.8e-1"
  const m = s.match(/^(\d)(?:\.(\d+))?e([+-]\d+)$/);
  if (!m) return String(x); // unreachable for finite numbers
  const digits = m[1] + (m[2] ?? "");
  const exp = parseInt(m[3], 10);
  const sign = neg ? "-" : "";
  if (exp < -4 || exp >= 16) {
    const mant = m[1] + (m[2] ? "." + m[2] : "");
    const es = (exp < 0 ? "-" : "+") + String(Math.abs(exp)).padStart(2, "0");
    return sign + mant + "e" + es;
  }
  if (exp >= 0) {
    if (digits.length <= exp + 1) {
      return sign + digits + "0".repeat(exp + 1 - digits.length) + ".0";
    }
    return sign + digits.slice(0, exp + 1) + "." + digits.slice(exp + 1);
  }
  return sign + "0." + "0".repeat(-exp - 1) + digits;
}

// ---------------------------------------------------------------------------
// Scalar resolution (PyYAML YAML 1.1 implicit resolver)
// ---------------------------------------------------------------------------

const NULL_RE = /^(?:~|null|Null|NULL|)$/;
const TRUE_RE = /^(?:yes|Yes|YES|true|True|TRUE|on|On|ON)$/;
const FALSE_RE = /^(?:no|No|NO|false|False|FALSE|off|Off|OFF)$/;
const INT_RE =
  /^(?:[-+]?0b[0-1_]+|[-+]?0[0-7_]+|[-+]?(?:0|[1-9][0-9_]*)|[-+]?0x[0-9a-fA-F_]+|[-+]?[1-9][0-9_]*(?::[0-5]?[0-9])+)$/;
// PyYAML quirks preserved: the exponent requires a sign ("1e3" is a string)
// and the leading-dot form takes no sign ("-.5" is a string).
const FLOAT_RE =
  /^(?:[-+]?[0-9][0-9_]*\.[0-9_]*(?:[eE][-+][0-9]+)?|\.[0-9_]+(?:[eE][-+][0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/;
const TIMESTAMP_RE =
  /^(?:[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]|[0-9][0-9][0-9][0-9]-[0-9][0-9]?-[0-9][0-9]?(?:[Tt]|[ \t]+)[0-9][0-9]?:[0-9][0-9]:[0-9][0-9](?:\.[0-9]*)?(?:[ \t]*(?:Z|[-+][0-9][0-9]?(?::[0-9][0-9])?))?)$/;

function subsetError(what: string, mark: Mark | null): YAMLError {
  return new YAMLError(
    null,
    null,
    `${what} — outside the superui YAML subset`,
    mark,
  );
}

function constructInt(s: string): number {
  let t = s.replace(/_/g, "");
  let sign = 1;
  if (t[0] === "-") {
    sign = -1;
    t = t.slice(1);
  } else if (t[0] === "+") {
    t = t.slice(1);
  }
  let v: number;
  if (t.startsWith("0b")) v = parseInt(t.slice(2), 2);
  else if (t.startsWith("0x")) v = parseInt(t.slice(2), 16);
  else if (t.includes(":")) {
    v = t.split(":").reduce((acc, part) => acc * 60 + parseInt(part, 10), 0);
  } else if (t.length > 1 && t[0] === "0") v = parseInt(t, 8);
  else v = parseInt(t, 10);
  const r = sign * v;
  return r === 0 ? 0 : r; // Python int has no -0
}

function constructFloat(s: string): YamlFloat {
  let t = s.replace(/_/g, "").toLowerCase();
  let sign = 1;
  if (t[0] === "-") {
    sign = -1;
    t = t.slice(1);
  } else if (t[0] === "+") {
    t = t.slice(1);
  }
  let v: number;
  if (t === ".inf") v = Infinity;
  else if (t === ".nan") v = NaN;
  else if (t.includes(":")) {
    const parts = t.split(":");
    v = 0;
    for (const part of parts) v = v * 60 + Number(part);
  } else v = Number(t);
  return new YamlFloat(sign === -1 ? -v : v);
}

function resolveScalar(s: string, mark: Mark | null): YamlScalar {
  if (NULL_RE.test(s)) return null;
  if (TRUE_RE.test(s)) return true;
  if (FALSE_RE.test(s)) return false;
  if (INT_RE.test(s)) return constructInt(s);
  if (FLOAT_RE.test(s)) return constructFloat(s);
  if (TIMESTAMP_RE.test(s)) {
    throw subsetError(`timestamp scalar '${s}'`, mark);
  }
  if (s === "=") throw subsetError("the '=' value special", mark);
  if (s === "<<") throw subsetError("merge keys ('<<')", mark);
  return s;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

const DQ_ESCAPES: Record<string, string> = {
  "0": "\0",
  a: "\x07",
  b: "\b",
  t: "\t",
  "\t": "\t",
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

interface KeySep {
  key: YamlScalar;
  keyText: string;
  valueCol: number; // column just after the ':'
  colonCol: number;
}

class Parser {
  name: string;
  lines: string[];
  li: number;
  col: number;

  constructor(text: string, name: string) {
    this.name = name;
    if (text.startsWith("﻿")) text = text.slice(1);
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    this.lines = text.split("\n");
    this.li = 0;
    this.col = 0;
  }

  mark(li?: number, col?: number): Mark {
    return new Mark(this.name, li ?? this.li, col ?? this.col);
  }

  eofMark(): Mark {
    const last = this.lines.length - 1;
    return new Mark(this.name, last, this.lines[last].length);
  }

  err(
    context: string | null,
    contextMark: Mark | null,
    problem: string,
    problemMark: Mark | null,
  ): never {
    throw new YAMLError(context, contextMark, problem, problemMark);
  }

  atEof(): boolean {
    return this.li >= this.lines.length;
  }

  indentOf(li: number): number {
    const line = this.lines[li];
    let i = 0;
    while (i < line.length && line[i] === " ") i++;
    if (line[i] === "\t") {
      this.err(
        "while scanning for the next token",
        null,
        "found character '\\t' that cannot start any token",
        this.mark(li, i),
      );
    }
    return i;
  }

  isBlank(li: number): boolean {
    const t = this.lines[li].replace(/[ \t]+$/, "").replace(/^[ \t]+/, "");
    return t === "" || t.startsWith("#");
  }

  skipBlanks(): void {
    while (!this.atEof() && this.isBlank(this.li)) this.li++;
  }

  checkNodeStart(ch: string, mark: Mark): void {
    if (ch === "&") throw subsetError("anchors ('&')", mark);
    if (ch === "*") throw subsetError("aliases ('*')", mark);
    if (ch === "!") throw subsetError("tags ('!')", mark);
    if (ch === "%") throw subsetError("directives ('%')", mark);
    if (ch === "@" || ch === "`") {
      this.err(
        "while scanning for the next token",
        null,
        `found character '${ch}' that cannot start any token`,
        mark,
      );
    }
  }

  // -- document ------------------------------------------------------------

  parseDocument(): YamlValue {
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      if (/^---(?:\s|$)/.test(line) || /^\.\.\.(?:\s|$)/.test(line)) {
        throw subsetError(
          "document markers ('---' / '...', multi-document streams)",
          this.mark(i, 0),
        );
      }
      if (/^%/.test(line)) {
        throw subsetError("directives ('%')", this.mark(i, 0));
      }
    }
    this.skipBlanks();
    if (this.atEof()) return null;
    const value = this.parseBlockNode(0);
    this.skipBlanks();
    if (!this.atEof()) {
      this.err(
        null,
        null,
        "expected a single document in the stream",
        this.mark(this.li, this.indentOf(this.li)),
      );
    }
    return value;
  }

  // -- block structure -----------------------------------------------------

  parseBlockNode(minIndent: number): YamlValue {
    this.skipBlanks();
    if (this.atEof()) return null;
    const ind = this.indentOf(this.li);
    if (ind < minIndent) return null;
    const line = this.lines[this.li];
    const content = line.slice(ind);

    if (content === "-" || content.startsWith("- ")) {
      return this.parseBlockSeq(ind);
    }
    if (content[0] === "[" || content[0] === "{") {
      return this.parseFlowInBlock(ind, null);
    }
    if (content[0] === '"' || content[0] === "'") {
      const sep = this.findKeySep(this.li, ind);
      if (sep) return this.parseBlockMap(ind);
      return this.parseQuotedInBlock(ind, null);
    }
    this.checkNodeStart(content[0], this.mark(this.li, ind));
    if (content[0] === "?" && (content.length === 1 || content[1] === " ")) {
      throw subsetError("explicit ('?') mapping keys", this.mark(this.li, ind));
    }
    if (
      (content[0] === "|" || content[0] === ">") &&
      /^[|>][+-]?[0-9]?[+-]?\s*(?:#.*)?$/.test(content)
    ) {
      this.col = ind;
      return this.parseBlockScalar(ind);
    }
    const sep = this.findKeySep(this.li, ind);
    if (sep) return this.parseBlockMap(ind);
    this.col = ind;
    return this.parsePlainBlock(minIndent - 1);
  }

  /** Detect "key:" on line li (plain or quoted key). Returns null when the
   *  line does not introduce a mapping entry. */
  findKeySep(li: number, ind: number): KeySep | null {
    const content = this.lines[li].slice(ind);
    if (content[0] === '"' || content[0] === "'") {
      const q = this.scanQuotedSameLine(content, 0);
      if (!q) return null;
      let i = q.end;
      while (content[i] === " ") i++;
      if (
        content[i] === ":" &&
        (i + 1 >= content.length ||
          content[i + 1] === " " ||
          content[i + 1] === "\t")
      ) {
        return {
          key: q.value,
          keyText: q.value,
          valueCol: ind + i + 1,
          colonCol: ind + i,
        };
      }
      return null;
    }
    for (let i = 0; i < content.length; i++) {
      const ch = content[i];
      if (ch === "#" && i > 0 && content[i - 1] === " ") return null;
      if (
        ch === ":" &&
        (i + 1 >= content.length ||
          content[i + 1] === " " ||
          content[i + 1] === "\t")
      ) {
        if (i === 0) {
          this.err(
            null,
            null,
            "mapping values are not allowed here",
            this.mark(li, ind),
          );
        }
        const keyText = content.slice(0, i).replace(/[ \t]+$/, "");
        if (keyText[0] === "[" || keyText[0] === "{") {
          throw subsetError(
            "flow collections used as mapping keys",
            this.mark(li, ind),
          );
        }
        this.checkNodeStart(keyText[0], this.mark(li, ind));
        if (keyText === "?" || keyText.startsWith("? ")) {
          throw subsetError("explicit ('?') mapping keys", this.mark(li, ind));
        }
        if (keyText === "<<") {
          throw subsetError("merge keys ('<<')", this.mark(li, ind));
        }
        return {
          key: resolveScalar(keyText, this.mark(li, ind)),
          keyText,
          valueCol: ind + i + 1,
          colonCol: ind + i,
        };
      }
    }
    return null;
  }

  parseBlockMap(indent: number): YamlMap {
    const startMark = this.mark(this.li, indent);
    const map: YamlMap = new Map();
    let lastWasNested = false;
    for (;;) {
      this.skipBlanks();
      if (this.atEof()) break;
      const ind = this.indentOf(this.li);
      if (ind < indent) break;
      const content = this.lines[this.li].slice(ind);
      if (ind > indent) {
        const sep = this.findKeySep(this.li, ind);
        if (sep) {
          if (lastWasNested) {
            this.err(
              "while parsing a block mapping",
              startMark,
              "expected <block end>, but found '<block mapping start>'",
              this.mark(this.li, ind),
            );
          }
          this.err(
            null,
            null,
            "mapping values are not allowed here",
            this.mark(this.li, sep.colonCol),
          );
        }
        this.err(
          "while parsing a block mapping",
          startMark,
          "expected <block end>, but found '<scalar>'",
          this.mark(this.li, ind),
        );
      }
      if (content === "-" || content.startsWith("- ")) {
        this.err(
          "while parsing a block mapping",
          startMark,
          "expected <block end>, but found '-'",
          this.mark(this.li, ind),
        );
      }
      const sep = this.findKeySep(this.li, ind);
      if (!sep) {
        this.err(
          "while parsing a block mapping",
          startMark,
          "expected <block end>, but found '<scalar>'",
          this.mark(this.li, ind),
        );
      }
      const r = this.parseMapValue(sep.valueCol, indent, startMark);
      lastWasNested = r.nested;
      map.set(sep.key, r.value);
    }
    return map;
  }

  parseMapValue(
    valueCol: number,
    keyIndent: number,
    mapStartMark: Mark,
  ): { value: YamlValue; nested: boolean } {
    const line = this.lines[this.li];
    let i = valueCol;
    while (line[i] === " ") i++;
    const rest = line.slice(i);
    if (rest === "" || rest[0] === "#") {
      // nested block value (or null)
      this.li++;
      this.skipBlanks();
      if (this.atEof()) return { value: null, nested: true };
      const ind = this.indentOf(this.li);
      if (ind > keyIndent) {
        return { value: this.parseBlockNode(keyIndent + 1), nested: true };
      }
      const c = this.lines[this.li].slice(ind);
      if (ind === keyIndent && (c === "-" || c.startsWith("- "))) {
        return { value: this.parseBlockSeq(keyIndent), nested: true };
      }
      return { value: null, nested: true };
    }
    if (rest[0] === "|" || rest[0] === ">") {
      this.col = i;
      return { value: this.parseBlockScalar(keyIndent), nested: false };
    }
    if (rest === "-" || rest.startsWith("- ")) {
      this.err(
        null,
        null,
        "sequence entries are not allowed here",
        this.mark(this.li, i),
      );
    }
    this.checkNodeStart(rest[0], this.mark(this.li, i));
    if (rest[0] === "?" && (rest.length === 1 || rest[1] === " ")) {
      throw subsetError("explicit ('?') mapping keys", this.mark(this.li, i));
    }
    if (rest[0] === "[" || rest[0] === "{") {
      return {
        value: this.parseFlowInBlock(i, mapStartMark),
        nested: false,
      };
    }
    if (rest[0] === '"' || rest[0] === "'") {
      return {
        value: this.parseQuotedInBlock(i, mapStartMark),
        nested: false,
      };
    }
    this.col = i;
    return { value: this.parsePlainBlock(keyIndent), nested: false };
  }

  parseBlockSeq(indent: number): YamlValue[] {
    const startMark = this.mark(this.li, indent);
    const items: YamlValue[] = [];
    for (;;) {
      this.skipBlanks();
      if (this.atEof()) break;
      const ind = this.indentOf(this.li);
      if (ind < indent) break;
      const content = this.lines[this.li].slice(ind);
      if (ind > indent) {
        this.err(
          "while parsing a block collection",
          startMark,
          "expected <block end>, but found '<scalar>'",
          this.mark(this.li, ind),
        );
      }
      if (!(content === "-" || content.startsWith("- "))) break;
      // Replace the dash with a space: columns are preserved, and the item
      // parses as an ordinary block node indented past the dash.
      this.lines[this.li] =
        this.lines[this.li].slice(0, ind) +
        " " +
        this.lines[this.li].slice(ind + 1);
      items.push(this.parseBlockNode(indent + 1));
    }
    return items;
  }

  /** Flow collection appearing as a block-level value; consumes the rest of
   *  the line(s) and verifies only a comment/blank tail remains. */
  parseFlowInBlock(col: number, mapStartMark: Mark | null): YamlValue {
    this.col = col;
    const value = this.parseFlowValue(0);
    this.finishInlineValue(mapStartMark);
    return value;
  }

  parseQuotedInBlock(col: number, mapStartMark: Mark | null): string {
    this.col = col;
    const value = this.scanQuoted(this.lines[this.li][col] === '"');
    this.finishInlineValue(mapStartMark);
    return value;
  }

  /** After an inline (same-line-start) value: skip trailing spaces/comment,
   *  error on trailing junk, and advance to the next line. */
  finishInlineValue(mapStartMark: Mark | null): void {
    const line = this.lines[this.li];
    let i = this.col;
    while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;
    if (i < line.length && line[i] !== "#") {
      this.err(
        mapStartMark ? "while parsing a block mapping" : null,
        mapStartMark,
        "expected <block end>, but found '<scalar>'",
        this.mark(this.li, i),
      );
    }
    this.li++;
    this.col = 0;
  }

  // -- plain scalars in block context --------------------------------------

  /** Scan one line's worth of plain scalar starting at (this.li, this.col).
   *  Returns the text and whether a comment ended the scalar. */
  scanPlainLine(): { text: string; comment: boolean } {
    const line = this.lines[this.li];
    let i = this.col;
    let out = "";
    let comment = false;
    for (; i < line.length; i++) {
      const ch = line[i];
      if (ch === "#" && out.length > 0 && /[ \t]$/.test(out)) {
        comment = true;
        break;
      }
      if (
        ch === ":" &&
        (i + 1 >= line.length || line[i + 1] === " " || line[i + 1] === "\t")
      ) {
        this.err(
          null,
          null,
          "mapping values are not allowed here",
          this.mark(this.li, i),
        );
      }
      if (ch === "\t") {
        this.err(
          "while scanning for the next token",
          null,
          "found character '\\t' that cannot start any token",
          this.mark(this.li, i),
        );
      }
      out += ch;
    }
    return { text: out.replace(/[ \t]+$/, ""), comment };
  }

  parsePlainBlock(contextIndent: number): YamlScalar {
    const startMark = this.mark(this.li, this.col);
    const segs: string[] = [];
    const first = this.scanPlainLine();
    segs.push(first.text);
    this.li++;
    this.col = 0;
    if (!first.comment) {
      for (;;) {
        // gather blank run, find next content line
        let j = this.li;
        let blanks = 0;
        while (j < this.lines.length && /^[ \t]*$/.test(this.lines[j])) {
          blanks++;
          j++;
        }
        if (j >= this.lines.length) break;
        const ind = this.indentOf(j);
        if (ind <= contextIndent) break;
        const c = this.lines[j].slice(ind);
        if (c[0] === "#") break;
        for (let b = 0; b < blanks; b++) segs.push("");
        this.li = j;
        this.col = ind;
        const seg = this.scanPlainLine();
        segs.push(seg.text);
        this.li++;
        this.col = 0;
        if (seg.comment) break;
      }
    }
    // fold segments: adjacent text lines join with a space, n blank lines
    // between text lines become n newlines
    let out = segs[0];
    let i = 1;
    while (i < segs.length) {
      let blanks = 0;
      while (i < segs.length && segs[i] === "") {
        blanks++;
        i++;
      }
      if (i >= segs.length) break;
      out += blanks === 0 ? " " : "\n".repeat(blanks);
      out += segs[i];
      i++;
    }
    return resolveScalar(out, startMark);
  }

  // -- quoted scalars ------------------------------------------------------

  /** Single-line quoted scalar scan used for key detection; returns null when
   *  the quote does not close on the same line. */
  scanQuotedSameLine(
    content: string,
    from: number,
  ): { value: string; end: number } | null {
    const dq = content[from] === '"';
    let i = from + 1;
    let out = "";
    while (i < content.length) {
      const ch = content[i];
      if (dq && ch === "\\") {
        const esc = this.decodeEscapeAt(content, i);
        if (!esc) return null; // escaped line break or bad escape → not a key
        out += esc.text;
        i = esc.next;
        continue;
      }
      if (!dq && ch === "'" && content[i + 1] === "'") {
        out += "'";
        i += 2;
        continue;
      }
      if (ch === (dq ? '"' : "'")) return { value: out, end: i + 1 };
      out += ch;
      i++;
    }
    return null;
  }

  decodeEscapeAt(
    content: string,
    i: number,
  ): { text: string; next: number } | null {
    const c = content[i + 1];
    if (c === undefined) return null;
    if (c in DQ_ESCAPES) return { text: DQ_ESCAPES[c], next: i + 2 };
    if (c === "x" || c === "u" || c === "U") {
      const n = c === "x" ? 2 : c === "u" ? 4 : 8;
      const hex = content.slice(i + 2, i + 2 + n);
      if (hex.length !== n || !/^[0-9a-fA-F]+$/.test(hex)) return null;
      return { text: String.fromCodePoint(parseInt(hex, 16)), next: i + 2 + n };
    }
    return null;
  }

  /** Full quoted scalar scan from (this.li, this.col); supports multi-line
   *  folding. Leaves the cursor just after the closing quote. */
  scanQuoted(dq: boolean): string {
    const startMark = this.mark(this.li, this.col);
    const what = "a quoted scalar"; // PyYAML: EOF errors say "a quoted scalar"
    const escWhat = "a double-quoted scalar";
    let out = "";
    this.col++; // past opening quote
    for (;;) {
      if (this.atEof()) {
        this.err(
          `while scanning ${what}`,
          startMark,
          "found unexpected end of stream",
          this.eofMark(),
        );
      }
      const line = this.lines[this.li];
      if (this.col >= line.length) {
        // line break inside the scalar: fold
        out = out.replace(/[ \t]+$/, "");
        let breaks = 0;
        do {
          this.li++;
          this.col = 0;
          breaks++;
          if (this.atEof()) {
            this.err(
              `while scanning ${what}`,
              startMark,
              "found unexpected end of stream",
              this.eofMark(),
            );
          }
        } while (/^[ \t]*$/.test(this.lines[this.li]));
        out += breaks === 1 ? " " : "\n".repeat(breaks - 1);
        // skip leading whitespace of the continuation line
        while (
          this.lines[this.li][this.col] === " " ||
          this.lines[this.li][this.col] === "\t"
        ) {
          this.col++;
        }
        continue;
      }
      const ch = line[this.col];
      if (dq && ch === "\\") {
        if (this.col + 1 >= line.length) {
          // escaped line break: join without folding
          out = out.replace(/[ \t]+$/, "");
          this.li++;
          this.col = 0;
          if (this.atEof()) {
            this.err(
              `while scanning ${what}`,
              startMark,
              "found unexpected end of stream",
              this.eofMark(),
            );
          }
          while (
            this.lines[this.li][this.col] === " " ||
            this.lines[this.li][this.col] === "\t"
          ) {
            this.col++;
          }
          continue;
        }
        const esc = this.decodeEscapeAt(line, this.col);
        if (!esc) {
          this.err(
            `while scanning ${escWhat}`,
            startMark,
            `found unknown escape character '${line[this.col + 1]}'`,
            this.mark(this.li, this.col + 1),
          );
        }
        out += esc.text;
        this.col = esc.next;
        continue;
      }
      if (!dq && ch === "'" && line[this.col + 1] === "'") {
        out += "'";
        this.col += 2;
        continue;
      }
      if (ch === (dq ? '"' : "'")) {
        this.col++;
        return out;
      }
      out += ch;
      this.col++;
    }
  }

  // -- flow collections ----------------------------------------------------

  /** Skip spaces, comments and line breaks inside flow context. */
  skipFlowWS(): void {
    for (;;) {
      if (this.atEof()) return;
      const line = this.lines[this.li];
      while (
        this.col < line.length &&
        (line[this.col] === " " || line[this.col] === "\t")
      ) {
        this.col++;
      }
      if (this.col < line.length && line[this.col] === "#") {
        this.col = line.length;
      }
      if (this.col >= line.length) {
        this.li++;
        this.col = 0;
        continue;
      }
      return;
    }
  }

  parseFlowValue(depth: number): YamlValue {
    const line = this.lines[this.li];
    const ch = line[this.col];
    const mark = this.mark(this.li, this.col);
    this.checkNodeStart(ch, mark);
    if (ch === "?" && (line[this.col + 1] === " " || this.col + 1 >= line.length)) {
      throw subsetError("explicit ('?') mapping keys", mark);
    }
    if (ch === "[") return this.parseFlowSeq(depth);
    if (ch === "{") return this.parseFlowMap(depth);
    if (ch === '"' || ch === "'") return this.scanQuoted(ch === '"');
    return this.parsePlainFlow();
  }

  parseFlowSeq(depth: number): YamlValue[] {
    const startMark = this.mark(this.li, this.col);
    this.col++; // '['
    const items: YamlValue[] = [];
    for (;;) {
      this.skipFlowWS();
      if (this.atEof()) {
        this.err(
          "while parsing a flow sequence",
          startMark,
          "expected ',' or ']', but got '<stream end>'",
          this.eofMark(),
        );
      }
      if (this.lines[this.li][this.col] === "]") {
        this.col++;
        return items;
      }
      items.push(this.parseFlowValue(depth + 1));
      this.skipFlowWS();
      if (this.atEof()) {
        this.err(
          "while parsing a flow sequence",
          startMark,
          "expected ',' or ']', but got '<stream end>'",
          this.eofMark(),
        );
      }
      const ch = this.lines[this.li][this.col];
      if (ch === ",") {
        this.col++;
        continue;
      }
      if (ch === "]") {
        this.col++;
        return items;
      }
      this.err(
        "while parsing a flow sequence",
        startMark,
        `expected ',' or ']', but got '${ch}'`,
        this.mark(this.li, this.col),
      );
    }
  }

  parseFlowMap(depth: number): YamlMap {
    const startMark = this.mark(this.li, this.col);
    this.col++; // '{'
    const map: YamlMap = new Map();
    for (;;) {
      this.skipFlowWS();
      if (this.atEof()) {
        this.err(
          "while parsing a flow mapping",
          startMark,
          "expected ',' or '}', but got '<stream end>'",
          this.eofMark(),
        );
      }
      if (this.lines[this.li][this.col] === "}") {
        this.col++;
        return map;
      }
      const keyMark = this.mark(this.li, this.col);
      const key = this.parseFlowValue(depth + 1);
      if (Array.isArray(key) || key instanceof Map) {
        throw subsetError("flow collections used as mapping keys", keyMark);
      }
      if (key === "<<") throw subsetError("merge keys ('<<')", keyMark);
      this.skipFlowWS();
      if (this.atEof()) {
        this.err(
          "while parsing a flow mapping",
          startMark,
          "expected ',' or '}', but got '<stream end>'",
          this.eofMark(),
        );
      }
      let value: YamlValue = null;
      let ch = this.lines[this.li][this.col];
      if (ch === ":") {
        this.col++;
        this.skipFlowWS();
        if (this.atEof()) {
          this.err(
            "while parsing a flow mapping",
            startMark,
            "expected ',' or '}', but got '<stream end>'",
            this.eofMark(),
          );
        }
        ch = this.lines[this.li][this.col];
        if (ch !== "," && ch !== "}") {
          value = this.parseFlowValue(depth + 1);
        }
        this.skipFlowWS();
        if (this.atEof()) {
          this.err(
            "while parsing a flow mapping",
            startMark,
            "expected ',' or '}', but got '<stream end>'",
            this.eofMark(),
          );
        }
        ch = this.lines[this.li][this.col];
      }
      map.set(key as YamlScalar, value);
      if (ch === ",") {
        this.col++;
        continue;
      }
      if (ch === "}") {
        this.col++;
        return map;
      }
      this.err(
        "while parsing a flow mapping",
        startMark,
        `expected ',' or '}', but got '${ch}'`,
        this.mark(this.li, this.col),
      );
    }
  }

  parsePlainFlow(): YamlScalar {
    const startMark = this.mark(this.li, this.col);
    const segs: string[] = [];
    let cur = "";
    for (;;) {
      if (this.atEof()) break;
      const line = this.lines[this.li];
      if (this.col >= line.length) {
        segs.push(cur.replace(/[ \t]+$/, ""));
        cur = "";
        this.li++;
        this.col = 0;
        // stop folding at EOF; blank lines become newlines via segs
        if (this.atEof()) break;
        while (
          this.lines[this.li][this.col] === " " ||
          this.lines[this.li][this.col] === "\t"
        ) {
          this.col++;
        }
        continue;
      }
      const ch = line[this.col];
      if (ch === "," || ch === "[" || ch === "]" || ch === "{" || ch === "}") {
        break;
      }
      if (
        ch === ":" &&
        (this.col + 1 >= line.length ||
          " \t,[]{}".includes(line[this.col + 1]))
      ) {
        break;
      }
      if (ch === "#" && /[ \t]$/.test(cur)) break;
      cur += ch;
      this.col++;
    }
    segs.push(cur.replace(/[ \t]+$/, ""));
    // fold
    let out = segs[0];
    let i = 1;
    while (i < segs.length) {
      let blanks = 0;
      while (i < segs.length && segs[i] === "") {
        blanks++;
        i++;
      }
      if (i >= segs.length) break;
      out += blanks === 0 ? " " : "\n".repeat(blanks);
      out += segs[i];
      i++;
    }
    return resolveScalar(out, startMark);
  }

  // -- block scalars (| and >) ---------------------------------------------

  parseBlockScalar(parentIndent: number): string {
    const line = this.lines[this.li];
    const folded = line[this.col] === ">";
    let i = this.col + 1;
    let chomp: string | null = null;
    let increment: number | null = null;
    while (i < line.length) {
      const ch = line[i];
      if ((ch === "+" || ch === "-") && chomp === null) {
        chomp = ch;
        i++;
      } else if (/[1-9]/.test(ch) && increment === null) {
        increment = parseInt(ch, 10);
        i++;
      } else {
        break;
      }
    }
    while (line[i] === " " || line[i] === "\t") i++;
    if (i < line.length && line[i] !== "#") {
      this.err(
        "while scanning a block scalar",
        this.mark(this.li, this.col),
        `expected a comment or a line break, but found '${line[i]}'`,
        this.mark(this.li, i),
      );
    }
    const headerLi = this.li;
    this.li = headerLi + 1;
    this.col = 0;

    // determine block indent
    let blockIndent: number;
    if (increment !== null) {
      blockIndent = parentIndent + increment;
    } else {
      blockIndent = -1;
      for (let j = this.li; j < this.lines.length; j++) {
        if (/^[ \t]*$/.test(this.lines[j])) continue;
        const ind = this.indentOf(j);
        if (ind <= parentIndent) break;
        blockIndent = ind;
        break;
      }
      if (blockIndent === -1) {
        // no content — consume nothing (trailing blanks belong to the doc)
        return "";
      }
    }

    // collect content lines
    const raw: string[] = [];
    let lastContent = -1; // index in raw of last non-blank line
    while (this.li < this.lines.length) {
      const l = this.lines[this.li];
      if (/^[ \t]*$/.test(l)) {
        raw.push("");
        this.li++;
        continue;
      }
      const ind = this.indentOf(this.li);
      if (ind < blockIndent) break;
      raw.push(l.slice(blockIndent));
      lastContent = raw.length - 1;
      this.li++;
    }
    if (lastContent === -1) {
      // only blank lines
      if (chomp === "+") {
        let n = raw.length;
        if (this.atEof() && !this.docEndsWithNewline()) n = Math.max(0, n - 1);
        return "\n".repeat(n);
      }
      return "";
    }
    const trailingBlanks = raw.length - 1 - lastContent;
    const body = raw.slice(0, lastContent + 1);

    // assemble
    let out = "";
    if (folded) {
      let idx = 0;
      let leadBlanks = 0;
      while (idx < body.length && body[idx] === "") {
        leadBlanks++;
        idx++;
      }
      out += "\n".repeat(leadBlanks);
      let prevText: string | null = null;
      while (idx < body.length) {
        let blanks = 0;
        while (idx < body.length && body[idx] === "") {
          blanks++;
          idx++;
        }
        if (idx >= body.length) break;
        const text = body[idx];
        const more = text.startsWith(" ") || text.startsWith("\t");
        if (prevText === null) {
          out += text;
        } else {
          const prevMore2 =
            prevText.startsWith(" ") || prevText.startsWith("\t");
          if (prevMore2 || more) {
            out += "\n".repeat(blanks + 1);
          } else if (blanks === 0) {
            out += " ";
          } else {
            out += "\n".repeat(blanks);
          }
          out += text;
        }
        prevText = text;
        idx++;
      }
    } else {
      out = body.join("\n");
    }

    // chomping
    let breaks = trailingBlanks + 1;
    if (this.atEof() && !this.docEndsWithNewline()) breaks -= 1;
    if (chomp === "-") {
      // strip
    } else if (chomp === "+") {
      out += "\n".repeat(Math.max(0, breaks));
    } else {
      if (breaks > 0) out += "\n";
    }
    return out;
  }

  docEndsWithNewline(): boolean {
    // after split("\n"), a trailing newline leaves a final "" element
    return this.lines[this.lines.length - 1] === "";
  }
}

/** Parse a single YAML document (the superui subset). `name` appears in error
 *  marks, like PyYAML's stream name. */
export function safeLoad(text: string, name: string = "<unicode string>"): YamlValue {
  return new Parser(text, name).parseDocument();
}
