#!/usr/bin/env node
// Lint generated documentation sheets and their data files for raw (non-token)
// style values.
//
// IN : argv[1] — the design-system output dir; every *.html AND every *.data.js
//      under it (recursive) is scanned. index.html is included; components.js
//      and docs.css are NOT scanned (the fixed chrome legitimately carries raw
//      values and var() fallbacks).
// OUT: stdout — one "VIOLATION <file>: <snippet>" line per finding, then a
//      summary line: "<n> files scanned, <v> violations".
//      A violation is any of the following inside a style="..." attribute, a
//      <style>...</style> block, or (in a *.data.js file) a JS string literal
//      carrying markup (HTML/CSS comments stripped first from *.html; *.data.js
//      is scanned as raw source text, never parsed as JS):
//        - a hex color literal  (#abc, #aabbcc, #aabbccdd)
//        - rgb( / rgba( / hsl( / hsla(
//        - a px length other than 0px
//      Sheets/data must express every such value as var(--token) from
//      tokens.css. In *.data.js, a style attribute inside a JS string literal
//      arrives backslash-escaped (style=\\"color: ...\\") — the attr pattern
//      tolerates an optional backslash before each quote so plain, single-quoted
//      and JS-escaped forms are all caught.
// Exit codes: 0 = clean (files may be zero — reported in the summary);
//      1 = violations found or the dir is unreadable.
// Flags: none.

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Python-compat helpers
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
// lint_previews
// ---------------------------------------------------------------------------

const STYLE_BLOCK = /<style\b[^>]*>(.*?)<\/style>/gis;
const STYLE_ATTR = /style\s*=\s*(?:\\?"((?:[^"\\]|\\.)*?)\\?"|'([^']*)')/gi;
const HTML_COMMENT = /<!--.*?-->/gs;
const CSS_COMMENT = /\/\*.*?\*\//gs;

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FUNC = /\b(?:rgba?|hsla?)\s*\(/g;
const PX = /(?<![\w.-])(\d*\.?\d+)px\b/g;

function violationsIn(cssText: string): string[] {
  const found: string[] = [];
  const text = cssText.replace(CSS_COMMENT, "");
  for (const m of text.matchAll(HEX)) {
    found.push(m[0]);
  }
  for (const m of text.matchAll(FUNC)) {
    found.push(m[0] + "...)");
  }
  for (const m of text.matchAll(PX)) {
    if (parseFloat(m[1]) !== 0) {
      found.push(m[0]);
    }
  }
  return found;
}

function snippet(s: string, needle: string): string {
  const i = s.indexOf(needle.split("...")[0]);
  if (i < 0) return needle;
  return pyStrip(
    s.slice(Math.max(0, i - 30), i + needle.length + 30).replace(/\n/g, " "),
  );
}

// Mirror os.walk (top-down, symlinked dirs listed but not descended): collect
// every file under root.
function collectFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // os.walk swallows listing errors by default
    }
    const subdirs: string[] = [];
    for (const entry of entries) {
      const full = pyJoin(dir, entry.name);
      let isDir = false;
      if (entry.isDirectory()) {
        isDir = true;
      } else if (entry.isSymbolicLink()) {
        try {
          isDir = fs.statSync(full).isDirectory();
        } catch {
          isDir = false;
        }
        if (isDir) continue; // listed in dirnames but not walked; never a file
      }
      if (isDir) subdirs.push(full);
      else if (entry.name.endsWith(".html") || entry.name.endsWith(".data.js")) files.push(full);
    }
    for (const sub of subdirs) walk(sub);
  };
  walk(root);
  return files;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length !== 1) {
    die("usage: lint_previews.ts DESIGN_SYSTEM_DIR");
  }
  const root = argv[0];
  let isDir = false;
  try {
    isDir = fs.statSync(root).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) {
    die(`error: not a directory: ${root}`);
  }

  const files = collectFiles(root);

  let total = 0;
  for (const p of files.slice().sort()) {
    let raw: string;
    try {
      const buf = fs.readFileSync(p);
      // Python's strict utf-8 decode: a decode error is an uncaught exception.
      raw = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
        .decode(buf)
        .replace(/\r\n?/g, "\n");
    } catch (e) {
      if (isFsError(e)) {
        console.log(`VIOLATION ${p}: unreadable (${formatOSError(e, p)})`);
        total += 1;
        continue;
      }
      throw e;
    }
    const doc = raw.replace(HTML_COMMENT, "");
    const chunks: string[] = [];
    for (const m of doc.matchAll(STYLE_BLOCK)) {
      chunks.push(m[1]);
    }
    for (const m of doc.matchAll(STYLE_ATTR)) {
      chunks.push(m[1] || m[2] || "");
    }
    const rel = path.relative(root, p);
    for (const chunk of chunks) {
      for (const v of violationsIn(chunk)) {
        console.log(`VIOLATION ${rel}: ${snippet(chunk, v)}`);
        total += 1;
      }
    }
  }

  console.log(`\n${files.length} files scanned, ${total} violations`);
  throw new Exit(total ? 1 : 0);
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
