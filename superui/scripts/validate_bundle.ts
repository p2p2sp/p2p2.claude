/*
 * validate_bundle.ts — validates a finished handoff bundle against
 * `registry.json` (Task 2's merged token/style namespace) and the bundle's
 * own internal cross-references, before it is zipped. Never mutates the
 * bundle; a clean run and a dirty run both leave every file untouched.
 *
 * IN : BUNDLE_DIR — the handoff bundle dir (`design.md`, `inventory.md`,
 *      `components/*.md`, `patterns/*.md`, `screens/*.png`, optional
 *      `meta.yml` / `intake-answers.md`). REGISTRY_JSON — the
 *      `build_registry.ts` output (`{ tokens, textStyles, ... }`); the
 *      resolution namespace a spec's token references are checked against
 *      is exactly `Object.keys(tokens)` union every `textStyles[].name`.
 * OUT: stdout — one `FINDING: <category> <detail>` line per defect found
 *      (checkTokenRefs, then checkScreenRefs, then checkSections, then
 *      checkForbidden, in that order), or the single line `CLEAN` when none
 *      are found.
 * Exit codes: 0 = clean bundle; 1 = BUNDLE_DIR absent/empty/not-a-directory
 *      (message on stderr naming the dir), or one-or-more findings printed
 *      (still exit 1, findings are on stdout, not an error); 2 =
 *      command-line usage errors.
 *
 * Finding categories:
 *   - unknown-token   — a backticked dotted token in a `components/*.md` or
 *     `patterns/*.md` spec resolves against neither `tokens{}` nor
 *     `textStyles[].name`. A backtick span counts as a token reference only
 *     when it matches `<group>.<name>` (at least one dot, no whitespace, no
 *     slash) AND is not an image filename (`login.png` is exempt by
 *     extension, not by heuristic) — a bare property name (`bg`, `radius`)
 *     never contains a dot and is excluded by construction.
 *   - missing-screen  — a CANONICAL screen reference (a spec's `canonical:
 *     <filename>.png` line, or an `inventory.md` entry's `canonical:`
 *     field) names a file absent from `screens/`. References are
 *     deduplicated by exact filename first, so one absent screen cited from
 *     several places yields exactly one finding. `appears:` in
 *     `inventory.md` is source metadata, not a file reference, and is
 *     deliberately excluded — the bundle contract ships one PNG per
 *     canonical screen only.
 *   - empty-section   — a `## 3.N` heading in `design.md` is followed by no
 *     non-whitespace content before the next `## ` heading or EOF.
 *   - forbidden-artifact — any `*.css`, `*.js`, `*.html` or `*.json` file
 *     anywhere under BUNDLE_DIR (blanket rejection, not a name heuristic;
 *     `meta.yml` is YAML and unaffected).
 *
 * Usage: node validate_bundle.ts BUNDLE_DIR REGISTRY_JSON
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FindingCategory = "unknown-token" | "missing-screen" | "empty-section" | "forbidden-artifact";

export interface Finding {
  category: FindingCategory;
  detail: string;
}

interface Registry {
  tokens: Record<string, unknown>;
  textStyles: { name: string }[];
}

// ---------------------------------------------------------------------------
// Directory walk (shared by checkTokenRefs, checkForbidden)
// ---------------------------------------------------------------------------

function walkFiles(dir: string): string[] {
  let entries: string[] = [];
  let dirents;
  try {
    dirents = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const d of dirents) {
    const full = join(dir, d.name);
    if (d.isDirectory()) {
      entries = entries.concat(walkFiles(full));
    } else if (d.isFile()) {
      entries.push(full);
    }
  }
  return entries;
}

function specFiles(bundleDir: string): string[] {
  return [...walkFiles(join(bundleDir, "components")), ...walkFiles(join(bundleDir, "patterns"))].filter((f) =>
    f.endsWith(".md"),
  );
}

// ---------------------------------------------------------------------------
// checkTokenRefs
// ---------------------------------------------------------------------------

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp|tiff?)$/i;

/** A backticked span counts as a token reference: dotted, no whitespace, no slash, not an image filename. */
function isTokenLikeSpan(span: string): boolean {
  if (span.length === 0) return false;
  if (/\s/.test(span)) return false;
  if (span.includes("/") || span.includes("\\")) return false;
  if (!span.includes(".")) return false;
  if (span.startsWith(".") || span.endsWith(".")) return false;
  if (IMAGE_EXT_RE.test(span)) return false;
  return true;
}

export function checkTokenRefs(bundleDir: string, registry: Registry): Finding[] {
  const known = new Set<string>(Object.keys(registry.tokens ?? {}));
  for (const t of registry.textStyles ?? []) known.add(t.name);

  const findings: Finding[] = [];
  for (const file of specFiles(bundleDir)) {
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    const rel = relative(bundleDir, file).split("\\").join("/");
    const spans = content.match(/`([^`]+)`/g) ?? [];
    for (const raw of spans) {
      const span = raw.slice(1, -1);
      if (!isTokenLikeSpan(span)) continue;
      if (!known.has(span)) {
        findings.push({ category: "unknown-token", detail: `'${span}' referenced in ${rel} is not in the registry` });
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// checkScreenRefs
// ---------------------------------------------------------------------------

const CANONICAL_LINE_RE = /^canonical:\s*(\S+)\s*$/m;

function canonicalOfEntryLine(line: string, fieldIndex: number): string | null {
  const fields = line.split("·");
  const field = fields[fieldIndex];
  if (field === undefined) return null;
  const idx = field.indexOf(":");
  if (idx === -1) return null;
  return field.slice(idx + 1).trim();
}

export function checkScreenRefs(bundleDir: string): Finding[] {
  const cited = new Set<string>();

  for (const file of specFiles(bundleDir)) {
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    const m = CANONICAL_LINE_RE.exec(content);
    if (m) cited.add(m[1]);
  }

  let inventoryMd = "";
  try {
    inventoryMd = readFileSync(join(bundleDir, "inventory.md"), "utf-8");
  } catch {
    inventoryMd = "";
  }
  const lines = inventoryMd.split(/\r?\n/);
  let section: "components" | "patterns" | null = null;
  for (const line of lines) {
    if (line.trim() === "## Components") {
      section = "components";
      continue;
    }
    if (line.trim() === "## Patterns") {
      section = "patterns";
      continue;
    }
    if (/^## /.test(line)) {
      section = null;
      continue;
    }
    if (section && line.startsWith("- ")) {
      const canonical = canonicalOfEntryLine(line, section === "components" ? 2 : 1);
      if (canonical) cited.add(canonical);
    }
  }

  let shipped: Set<string>;
  try {
    shipped = new Set(readdirSync(join(bundleDir, "screens")));
  } catch {
    shipped = new Set();
  }

  const findings: Finding[] = [];
  for (const filename of cited) {
    if (!shipped.has(filename)) {
      findings.push({ category: "missing-screen", detail: `canonical screen '${filename}' is not present in screens/` });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// checkSections
// ---------------------------------------------------------------------------

const SECTION_HEADING_RE = /^## 3\.(10|[1-9])\b/;

export function checkSections(bundleDir: string): Finding[] {
  let content: string;
  try {
    content = readFileSync(join(bundleDir, "design.md"), "utf-8");
  } catch (e) {
    return [{ category: "empty-section", detail: `design.md is missing or unreadable: ${(e as Error).message}` }];
  }
  const lines = content.split(/\r?\n/);
  const headings: { num: string; start: number }[] = [];
  lines.forEach((line, i) => {
    const m = SECTION_HEADING_RE.exec(line);
    if (m) headings.push({ num: m[1], start: i });
  });

  const findings: Finding[] = [];
  for (let i = 0; i < headings.length; i++) {
    const end = i + 1 < headings.length ? headings[i + 1].start : lines.length;
    const body = lines
      .slice(headings[i].start + 1, end)
      .join("\n")
      .trim();
    if (body.length === 0) {
      findings.push({ category: "empty-section", detail: `design.md section 3.${headings[i].num} has no content` });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// checkForbidden
// ---------------------------------------------------------------------------

const FORBIDDEN_EXT_RE = /\.(css|js|html|json)$/i;

/** Blanket rejection of css/js/html/json anywhere under the bundle dir — not a name heuristic. */
export function checkForbidden(bundleDir: string): Finding[] {
  const findings: Finding[] = [];
  for (const file of walkFiles(bundleDir)) {
    if (FORBIDDEN_EXT_RE.test(file)) {
      const rel = relative(bundleDir, file).split("\\").join("/");
      findings.push({ category: "forbidden-artifact", detail: `${rel} is a forbidden artifact in the handoff bundle` });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const PROG = basename(process.argv[1] ?? "validate_bundle.ts");

function usageText(): string {
  return `usage: ${PROG} [-h] BUNDLE_DIR REGISTRY_JSON`;
}

function helpText(): string {
  return usageText() + "\n\nSee the top-of-file header comment for the full IN/OUT/exit-code contract.";
}

function argError(msg: string): never {
  process.stderr.write(usageText() + "\n");
  process.stderr.write(`${PROG}: error: ${msg}\n`);
  process.exit(2);
}

/** sys.exit(message)-equivalent: message on stderr, exit code 1. */
function exitErr(msg: string): never {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(helpText() + "\n");
    process.exit(0);
  }
  if (argv.length !== 2) {
    argError(`expected 2 arguments (BUNDLE_DIR REGISTRY_JSON), got ${argv.length}`);
  }
  const [bundleDir, registryPath] = argv;

  let st;
  try {
    st = statSync(bundleDir);
  } catch (e) {
    exitErr(`error: cannot read bundle dir '${bundleDir}': ${(e as Error).message}`);
  }
  if (!st.isDirectory()) {
    exitErr(`error: '${bundleDir}' is not a directory`);
  }
  if (readdirSync(bundleDir).length === 0) {
    exitErr(`error: bundle dir '${bundleDir}' is empty`);
  }

  let raw: string;
  try {
    raw = readFileSync(registryPath, "utf-8");
  } catch (e) {
    exitErr(`error: cannot read '${registryPath}': ${(e as Error).message}`);
  }
  let registry: Registry;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    registry = {
      tokens: (typeof parsed.tokens === "object" && parsed.tokens !== null ? (parsed.tokens as Record<string, unknown>) : {}),
      textStyles: (Array.isArray(parsed.textStyles) ? (parsed.textStyles as { name: string }[]) : []),
    };
  } catch (e) {
    exitErr(`error: '${registryPath}' is not valid JSON: ${(e as Error).message}`);
  }

  const findings: Finding[] = [
    ...checkTokenRefs(bundleDir, registry),
    ...checkScreenRefs(bundleDir),
    ...checkSections(bundleDir),
    ...checkForbidden(bundleDir),
  ];

  if (findings.length === 0) {
    process.stdout.write("CLEAN\n");
    process.exit(0);
  }

  for (const f of findings) {
    process.stdout.write(`FINDING: ${f.category} ${f.detail}\n`);
  }
  process.exit(1);
}

main();
