#!/usr/bin/env node
// Build index.html for an extracted design-system directory.
//
// IN : argv[1] — the design-system output dir. Expected inside it:
//      DESIGN.md (narrative source), docs.css, tokens.css, components.js,
//      dtcg.yml, tokens.json, inventory.md, optionally foundations/*.html,
//      components/*.html, patterns/*.html (each with a sibling *.data.js).
// OUT: writes <dir>/index.html — the overview page (chrome classes from
//      docs.css): intro pulled from DESIGN.md's first paragraph, the fixed
//      three-layer explanation, Principles / Token naming / Status sections
//      pulled from the matching DESIGN.md sections (minimal markdown -> HTML:
//      paragraphs, "- " bullets, **bold**, `code`), and link lists to every
//      sheet found on disk (components get an atomic/composite badge from
//      inventory.md when available; link labels come from the sheet's sibling
//      *.data.js "title", falling back to the shell's <h1>/<title>). Loads
//      components.js (the single dark-toggle source) and carries
//      data-dark-toggle on <body> when tokens.css declares at least one .dark
//      override.
//      stdout — one summary line: "<f> foundation, <c> component, <p> pattern
//      sheets -> <path>".
//      Self-verifies: every href/src it emits (including components.js) points
//      at an existing file; a missing target exits 1 with a message on stderr.
// Exit codes: 0 = written and verified; 1 = bad args, missing DESIGN.md/docs.css/
//      tokens.css, or a dangling link.
// Flags: none.
//
// Regenerated wholesale on every run — never hand-edit index.html.

import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { basename, extname, join } from "node:path";

// sys.exit(msg) counterpart: message on stderr, exit 1.
function die(msg: string): never {
  writeSync(2, `${msg}\n`);
  process.exit(1);
}

// ---------- filesystem / text helpers ----------

interface ErrnoLike {
  code?: unknown;
  errno?: unknown;
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

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// sorted(): ascending code-point order, stable.
function codePointCompare(a: string, b: string): number {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const ca = a.codePointAt(i) as number;
    const cb = b.codePointAt(j) as number;
    if (ca !== cb) return ca - cb;
    i += ca > 0xffff ? 2 : 1;
    j += cb > 0xffff ? 2 : 1;
  }
  return a.length - i - (b.length - j);
}

function pySorted(items: string[]): string[] {
  return [...items].sort(codePointCompare);
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

// First n characters (code points) of s — a text-mode read(n) counterpart.
function takeCodePoints(s: string, n: number): string {
  if (s.length <= n) return s;
  let count = 0;
  let i = 0;
  while (i < s.length && count < n) {
    const c = s.codePointAt(i) as number;
    i += c > 0xffff ? 2 : 1;
    count += 1;
  }
  return s.slice(0, i);
}

// os.path.splitext(p)[0]
function splitextBase(p: string): string {
  const ext = extname(p);
  return ext === "" ? p : p.slice(0, p.length - ext.length);
}

// html.escape(s, quote=False)
function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// ---------- index building ----------

function hasDarkOverrides(root: string): boolean {
  // True when tokens.css's .dark block declares at least one custom property.
  let css: string;
  try {
    css = readTextPy(join(root, "tokens.css"));
  } catch (e) {
    if (isOsError(e)) return false;
    throw e;
  }
  const m = /\.dark\s*\{([\s\S]*?)\}/.exec(css);
  return m !== null && m[1].replace(/\/\*[\s\S]*?\*\//g, "").includes("--");
}

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
      // continuation of the previous bullet
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

const DATA_TITLE = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/;

function sheetTitle(path: string): string {
  // Link label for a sheet: sibling <slug>.data.js "title" first (the
  // data file is the single source of sheet content), falling back to the
  // shell's own <h1>/<title>, then the basename.
  const dataPath = splitextBase(path) + ".data.js";
  try {
    const m = DATA_TITLE.exec(takeCodePoints(readTextPy(dataPath), 4000));
    if (m) {
      try {
        return JSON.parse('"' + m[1] + '"') as string;
      } catch {
        return m[1];
      }
    }
  } catch (e) {
    if (!isOsError(e)) throw e;
  }
  try {
    const head = takeCodePoints(readTextPy(path), 4000);
    let m = /<h1>([\s\S]*?)<\/h1>/.exec(head);
    if (m) {
      return pyStrip(m[1].replace(/<[^>]+>/g, ""));
    }
    m = /<title>([\s\S]*?)<\/title>/.exec(head);
    if (m) {
      return pyStrip(m[1]);
    }
  } catch (e) {
    if (!isOsError(e)) throw e;
  }
  return splitextBase(basename(path));
}

function inventoryKinds(root: string): Map<string, string> {
  // slug -> 'atomic'|'composite' from inventory.md, best effort.
  const kinds = new Map<string, string>();
  const inv = join(root, "inventory.md");
  if (!isFile(inv)) {
    return kinds;
  }
  for (const line of readTextPy(inv).split("\n")) {
    const m = /^\s*-\s*([a-z0-9-]+)\s*—.*?·\s*(atomic|composite)/.exec(line);
    if (m) {
      kinds.set(m[1], m[2]);
    }
  }
  return kinds;
}

function linkList(
  root: string,
  subdir: string,
  kinds: Map<string, string> | null,
): [string[], string] {
  const d = join(root, subdir);
  if (!isDir(d)) {
    return [[], ""];
  }
  const files = pySorted(readdirSync(d).filter((f) => f.endsWith(".html")));
  const items: string[] = [];
  for (const f of files) {
    const slug = splitextBase(f);
    const title = escapeHtml(sheetTitle(join(d, f)));
    let badge = "";
    if (kinds !== null && kinds.has(slug)) {
      badge = `<span class="kind-badge">${kinds.get(slug)}</span>`;
    }
    items.push(`<li><a href="${subdir}/${f}">${title}</a>${badge}</li>`);
  }
  return [files.map((f) => join(subdir, f)), items.join("\n")];
}

function main(): void {
  if (process.argv.length !== 3) {
    die("usage: build_index.ts DESIGN_SYSTEM_DIR");
  }
  const root = process.argv[2];
  const designMd = join(root, "DESIGN.md");
  for (const req of [
    designMd,
    join(root, "docs.css"),
    join(root, "tokens.css"),
    join(root, "components.js"),
  ]) {
    if (!isFile(req)) {
      die(`error: missing required file ${req}`);
    }
  }

  const md = readTextPy(designMd);
  const secs = sectionsOf(md);

  const introLines: string[] = [];
  for (const line of pySplitlines(md)) {
    if (line.startsWith("## ")) {
      break;
    }
    if (line.startsWith("# ") || line.startsWith("<!--") || line.endsWith("-->")) {
      continue;
    }
    introLines.push(line);
  }
  const intro =
    mdBlock(introLines) || "<p>An extracted, token-bound design system.</p>";

  const kinds = inventoryKinds(root);
  const darkToggle = hasDarkOverrides(root);
  let targets: string[] = ["components.js"];
  const parts: string[] = [];

  parts.push('<div class="section index-hero">');
  parts.push(intro);
  parts.push("</div>");

  parts.push('<div class="section"><h2>How it\'s organized</h2>');
  parts.push(
    '<p class="section-sub">Three layers, from raw material to finished screens.</p>',
  );
  parts.push('<div class="card-grid">');
  parts.push(
    '<div class="card"><h4>Foundations</h4><p>Color, type, spacing &amp; radius, ' +
      "effects. The raw material — all bound to tokens.</p></div>",
  );
  parts.push(
    '<div class="card"><h4>Components</h4><p>Reusable building blocks assembled ' +
      "only from foundation tokens.</p></div>",
  );
  parts.push(
    '<div class="card"><h4>Patterns</h4><p>How components come together into ' +
      "real screens.</p></div>",
  );
  parts.push("</div></div>");

  for (const heading of ["Principles", "Token naming"]) {
    if (secs.has(heading)) {
      parts.push(`<div class="section"><h2>${heading}</h2>`);
      parts.push(mdBlock(secs.get(heading) as string[]));
      parts.push("</div>");
    }
  }

  for (const [subdir, label] of [
    ["foundations", "Foundations"],
    ["components", "Components"],
    ["patterns", "Patterns"],
  ] as Array<[string, string]>) {
    const [found, items] = linkList(
      root,
      subdir,
      subdir === "components" ? kinds : null,
    );
    targets = targets.concat(found);
    if (items) {
      parts.push(
        `<div class="section"><h2>${label}</h2>` +
          `<ul class="toc-list">${items}</ul></div>`,
      );
    }
  }

  if (secs.has("Status")) {
    parts.push('<div class="section"><h2>Status</h2>');
    parts.push(mdBlock(secs.get("Status") as string[]));
    parts.push("</div>");
  }

  parts.push(
    '<div class="section"><h2>Files</h2><ul class="toc-list">' +
      '<li><a href="DESIGN.md">DESIGN.md</a></li>' +
      '<li><a href="dtcg.yml">dtcg.yml</a></li>' +
      '<li><a href="tokens.json">tokens.json</a></li>' +
      '<li><a href="tokens.css">tokens.css</a></li>' +
      '<li><a href="inventory.md">inventory.md</a></li></ul></div>',
  );
  targets = targets.concat([
    "DESIGN.md",
    "dtcg.yml",
    "tokens.json",
    "tokens.css",
    "inventory.md",
  ]);

  const body = parts.join("\n");
  const bodyAttrs = darkToggle ? " data-dark-toggle" : "";
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Design System</title>
<link rel="stylesheet" href="docs.css">
<link rel="stylesheet" href="tokens.css">
</head>
<body${bodyAttrs}>
<script src="components.js"></script>
<header class="sheet-header">
  <h1>Design System</h1>
</header>
${body}
</body>
</html>
`;
  const out = join(root, "index.html");
  writeFileSync(out, page, "utf-8");

  // self-verify: every emitted link/script src resolves
  const missing = targets.filter((t) => !isFile(join(root, t)));
  if (missing.length > 0) {
    for (const t of missing) {
      writeSync(2, `error: dangling link target ${t}\n`);
    }
    process.exit(1);
  }

  const nf = targets.filter((t) => t.startsWith("foundations/")).length;
  const nc = targets.filter((t) => t.startsWith("components/")).length;
  const np = targets.filter((t) => t.startsWith("patterns/")).length;
  writeSync(1, `${nf} foundation, ${nc} component, ${np} pattern sheets -> ${out}\n`);
}

main();
