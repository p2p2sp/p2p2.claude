#!/usr/bin/env node
// Script every preview shell from its *.data.js sibling (no LLM step).
//
// IN : argv[1] — design-system dir. Scans foundations/*.data.js,
//      components/*.data.js, patterns/*.data.js (any subset may be absent or
//      empty). Needs docs.css, tokens.css and components.js at the dir root
//      (copied there by an earlier pipeline step) — every shell links them.
// OUT: writes <dir>/<kind-dir>/<slug>.html for each <kind-dir>/<slug>.data.js
//      found — a thin shell only: <head> with a <title> taken from the data
//      file's own "title" field (regex-extracted; falls back to the slug when
//      absent/unparsable) plus <link>s to ../docs.css and ../tokens.css; a
//      <body[ data-dark-toggle]> carrying a blocking
//      <script src="../components.js"></script> at the top, one
//      <ds-sheet key="<kind>:<slug>"></ds-sheet>, and
//      <script src="<slug>.data.js"></script>. A pattern shell additionally
//      carries one <script src="../components/<f>"> per file present in
//      components/*.data.js, so any <ds-demo> the pattern's data references
//      always resolves. data-dark-toggle appears on every <body> iff
//      tokens.css's .dark block declares at least one custom property (same
//      rule as build_index.py's has_dark_overrides, duplicated locally per
//      this repo's standalone-script convention).
//      Wholesale regeneration: every run rewrites every shell and deletes any
//      <kind-dir>/*.html whose matching *.data.js no longer exists.
//      index.html is never touched (owned by build_index.py).
//      stdout — one summary line "<n> shells -> <dir>".
//      Self-verifies: every href/src a shell emits (../docs.css, ../tokens.css,
//      ../components.js, its own data file, and — for patterns — every
//      ../components/<f> reference) is checked to resolve to an existing file.
// Exit codes: 0 = written and verified (incl. the zero-data-files case);
//      1 = bad args, missing design-system dir, or a shell referencing a
//      missing file.
// Flags: none.
//
// Regenerated wholesale — never hand-edit an emitted *.html shell; re-run this
// script after any *.data.js change (or after build_foundation_data.py /
// html-visualizer produce new ones) and reload in a browser. No HTML authoring
// happens anywhere else.

import {
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { join, normalize } from "node:path";

const KIND_OF: Record<string, string> = {
  foundations: "foundation",
  components: "component",
  patterns: "pattern",
};

const TITLE_RE = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/;

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

// ---------- shell building ----------

function hasDarkOverrides(root: string): boolean {
  // True when tokens.css's .dark block declares at least one custom
  // property. Same rule as build_index.py's has_dark_overrides, duplicated
  // locally per this repo's standalone-script convention.
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

function extractTitle(dataPath: string, slug: string): string {
  let text: string;
  try {
    text = readTextPy(dataPath);
  } catch (e) {
    if (isOsError(e)) return slug;
    throw e;
  }
  const m = TITLE_RE.exec(text);
  if (!m) return slug;
  try {
    return JSON.parse('"' + m[1] + '"') as string;
  } catch {
    return m[1];
  }
}

function renderShell(
  title: string,
  key: string,
  slug: string,
  darkAttr: boolean,
  extraScripts: string[],
): string {
  const bodyAttr = darkAttr ? " data-dark-toggle" : "";
  const extras = extraScripts
    .map((s) => `\n<script src="${s}"></script>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="../docs.css">
<link rel="stylesheet" href="../tokens.css">
</head>
<body${bodyAttr}>
<script src="../components.js"></script>
<ds-sheet key="${key}"></ds-sheet>
<script src="${slug}.data.js"></script>${extras}
</body>
</html>
`;
}

function main(): void {
  if (process.argv.length !== 3) fail("usage: build_sheets.ts DESIGN_SYSTEM_DIR");
  const root = process.argv[2];
  if (!isDir(root)) fail(`no such directory: ${root}`);

  const darkAttr = hasDarkOverrides(root);

  const componentsDir = join(root, "components");
  const componentDataFiles = isDir(componentsDir)
    ? pySorted(readdirSync(componentsDir).filter((f) => f.endsWith(".data.js")))
    : [];

  let total = 0;
  // (shell_dir, referenced-relative-path) to self-verify at the end
  const refs: Array<[string, string]> = [];

  for (const [subdir, kind] of Object.entries(KIND_OF)) {
    const d = join(root, subdir);
    if (!isDir(d)) continue;

    const dataFiles = pySorted(
      readdirSync(d).filter((f) => f.endsWith(".data.js")),
    );
    const expectedHtmls = new Set<string>();

    for (const f of dataFiles) {
      const slug = f.slice(0, -".data.js".length);
      expectedHtmls.add(slug + ".html");
      const dataPath = join(d, f);
      const title = extractTitle(dataPath, slug);
      const key = `${kind}:${slug}`;

      let extraScripts: string[] = [];
      if (kind === "pattern") {
        extraScripts = componentDataFiles.map((cf) => `../components/${cf}`);
      }

      const page = renderShell(title, key, slug, darkAttr, extraScripts);
      const outPath = join(d, slug + ".html");
      try {
        writeFileSync(outPath, page, "utf-8");
      } catch (e) {
        if (isOsError(e)) fail(`cannot write ${outPath}: ${osErrorMsg(e, outPath)}`);
        throw e;
      }

      refs.push([d, "../docs.css"]);
      refs.push([d, "../tokens.css"]);
      refs.push([d, "../components.js"]);
      refs.push([d, f]);
      for (const s of extraScripts) {
        refs.push([d, s]);
      }
      total += 1;
    }

    // wholesale regeneration: drop stale shells with no matching data file
    for (const existing of readdirSync(d)) {
      if (existing.endsWith(".html") && !expectedHtmls.has(existing)) {
        unlinkSync(join(d, existing));
      }
    }
  }

  const missing = refs
    .map(([d, ref]) => normalize(join(d, ref)))
    .filter((p) => !isFile(p));
  if (missing.length > 0) {
    for (const m of missing) {
      writeSync(2, `error: dangling shell reference ${m}\n`);
    }
    process.exit(1);
  }

  writeSync(1, `${total} shells -> ${root}\n`);
}

main();
