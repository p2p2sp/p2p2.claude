/*
 * build_meta.ts — derives `meta.yml`, the handoff bundle's machine index,
 * from the bundle directory's own contents (never authored by an agent).
 * Because `meta.yml` is a pure function of what is already on disk under
 * the bundle dir, meta-versus-contents consistency holds by construction
 * and needs no separate validation pass.
 *
 * IN : BUNDLE_DIR — the handoff bundle dir (already holding `design.md`,
 *      `inventory.md`, `components/*.md`, `patterns/*.md`, `screens/*.png`).
 *      SOURCE — the source-screenshots dir path (or label), recorded as-is
 *      into `meta.yml`'s `source` field.
 * OUT: stdout — one line on success:
 *        META_OK screens=<N> components=<N> patterns=<N> -> <BUNDLE_DIR>/meta.yml
 *      BUNDLE_DIR/meta.yml holds: `version: 1`, `source`, `generatedAt`
 *      (ISO-8601), `darkMode` (true unless design.md section 3.10's body is
 *      the literal `none`), `screens: []` (every `screens/*.png` basename,
 *      sorted), `components: [{ slug, kind, canonical, spec }]` (from
 *      `inventory.md`'s `## Components` entries), `patterns: [{ slug,
 *      canonical, spec }]` (from `## Patterns` entries).
 * Exit codes: 0 = ok; 1 = BUNDLE_DIR absent/not-a-directory, or
 *      `design.md` / `inventory.md` missing/unreadable, or a self-verify
 *      mismatch after writing (message on stderr); 2 = command-line usage
 *      errors.
 *
 * Field derivation (per Task 3 Contracts):
 *   - `kind` for a component entry is the SECOND `·`-separated field of its
 *     inventory line (index 1 when splitting on `·`) — the unlabelled
 *     `atomic|composite` token. There is no `kind:` label in the inventory
 *     format and the third field is `canonical:`, not `kind:`.
 *   - A pattern entry carries no `kind` — that axis does not exist at
 *     pattern level (Task 4 Contracts).
 *   - `canonical` for either kind is read from the entry's `canonical:`
 *     field (component: `·` index 2; pattern: `·` index 1).
 *   - `spec` is the bundle-relative path this script assigns by convention:
 *     `components/<slug>.md` or `patterns/<slug>.md`.
 *   - Emitted by direct string assembly — no YAML library, and none needed
 *     since nothing reads `meta.yml` back.
 *
 * Usage: node build_meta.ts BUNDLE_DIR SOURCE
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComponentMeta {
  slug: string;
  kind: string;
  canonical: string;
  spec: string;
}

export interface PatternMeta {
  slug: string;
  canonical: string;
  spec: string;
}

export interface BundleMeta {
  version: 1;
  source: string;
  generatedAt: string;
  darkMode: boolean;
  screens: string[];
  components: ComponentMeta[];
  patterns: PatternMeta[];
}

// ---------------------------------------------------------------------------
// design.md — section 3.10 body, to derive darkMode
// ---------------------------------------------------------------------------

function section310Body(designMd: string): string {
  const lines = designMd.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => /^## 3\.10\b/.test(l));
  if (startIdx === -1) return "";
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return lines
    .slice(startIdx + 1, endIdx)
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// inventory.md — Components / Patterns entry parsing
// ---------------------------------------------------------------------------

function sectionLines(inventoryMd: string, heading: string): string[] {
  const lines = inventoryMd.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => l.trim() === heading);
  if (startIdx === -1) return [];
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx + 1, endIdx).filter((l) => l.startsWith("- "));
}

function slugOf(entryLine: string): string {
  const firstField = entryLine.split("·")[0];
  const withoutBullet = firstField.replace(/^- /, "");
  return withoutBullet.split(" — ")[0].trim();
}

function canonicalOf(field: string): string {
  const idx = field.indexOf(":");
  return idx === -1 ? field.trim() : field.slice(idx + 1).trim();
}

export function parseComponents(inventoryMd: string): ComponentMeta[] {
  return sectionLines(inventoryMd, "## Components").map((line) => {
    const fields = line.split("·");
    const slug = slugOf(line);
    const kind = (fields[1] ?? "").trim();
    const canonical = canonicalOf(fields[2] ?? "");
    return { slug, kind, canonical, spec: `components/${slug}.md` };
  });
}

export function parsePatterns(inventoryMd: string): PatternMeta[] {
  return sectionLines(inventoryMd, "## Patterns").map((line) => {
    const fields = line.split("·");
    const slug = slugOf(line);
    const canonical = canonicalOf(fields[1] ?? "");
    return { slug, canonical, spec: `patterns/${slug}.md` };
  });
}

// ---------------------------------------------------------------------------
// scanBundle
// ---------------------------------------------------------------------------

/** Scans BUNDLE_DIR's own contents and derives the full `meta.yml` shape. Throws Error on a missing required file. */
export function scanBundle(bundleDir: string, source: string): BundleMeta {
  let designMd: string;
  try {
    designMd = readFileSync(join(bundleDir, "design.md"), "utf-8");
  } catch (e) {
    throw new Error(`cannot read '${join(bundleDir, "design.md")}': ${(e as Error).message}`);
  }
  let inventoryMd: string;
  try {
    inventoryMd = readFileSync(join(bundleDir, "inventory.md"), "utf-8");
  } catch (e) {
    throw new Error(`cannot read '${join(bundleDir, "inventory.md")}': ${(e as Error).message}`);
  }

  let screens: string[] = [];
  try {
    screens = readdirSync(join(bundleDir, "screens"))
      .filter((f) => /\.png$/i.test(f))
      .sort();
  } catch {
    screens = [];
  }

  const darkMode = section310Body(designMd) !== "none";
  const components = parseComponents(inventoryMd);
  const patterns = parsePatterns(inventoryMd);

  return {
    version: 1,
    source,
    generatedAt: new Date().toISOString(),
    darkMode,
    screens,
    components,
    patterns,
  };
}

// ---------------------------------------------------------------------------
// emitYaml
// ---------------------------------------------------------------------------

/** Direct string assembly — no YAML library, no reader depends on round-tripping this file. */
export function emitYaml(meta: BundleMeta): string {
  const lines: string[] = [];
  lines.push(`version: ${meta.version}`);
  lines.push(`source: ${meta.source}`);
  lines.push(`generatedAt: ${meta.generatedAt}`);
  lines.push(`darkMode: ${meta.darkMode}`);

  if (meta.screens.length === 0) {
    lines.push("screens: []");
  } else {
    lines.push("screens:");
    for (const s of meta.screens) lines.push(`  - ${s}`);
  }

  if (meta.components.length === 0) {
    lines.push("components: []");
  } else {
    lines.push("components:");
    for (const c of meta.components) {
      lines.push(`  - slug: ${c.slug}`);
      lines.push(`    kind: ${c.kind}`);
      lines.push(`    canonical: ${c.canonical}`);
      lines.push(`    spec: ${c.spec}`);
    }
  }

  if (meta.patterns.length === 0) {
    lines.push("patterns: []");
  } else {
    lines.push("patterns:");
    for (const p of meta.patterns) {
      lines.push(`  - slug: ${p.slug}`);
      lines.push(`    canonical: ${p.canonical}`);
      lines.push(`    spec: ${p.spec}`);
    }
  }

  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const PROG = basename(process.argv[1] ?? "build_meta.ts");

function usageText(): string {
  return `usage: ${PROG} [-h] BUNDLE_DIR SOURCE`;
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
    argError(`expected 2 arguments (BUNDLE_DIR SOURCE), got ${argv.length}`);
  }
  const [bundleDir, source] = argv;

  let st;
  try {
    st = statSync(bundleDir);
  } catch (e) {
    exitErr(`error: cannot read bundle dir '${bundleDir}': ${(e as Error).message}`);
  }
  if (!st.isDirectory()) {
    exitErr(`error: '${bundleDir}' is not a directory`);
  }

  let meta: BundleMeta;
  try {
    meta = scanBundle(bundleDir, source);
  } catch (e) {
    exitErr(`error: ${(e as Error).message}`);
  }

  const yaml = emitYaml(meta);
  const outputPath = join(bundleDir, "meta.yml");
  writeFileSync(outputPath, yaml);

  // Self-verify: re-read the written file and re-derive the same counts rather than trust the write.
  let written: string;
  try {
    written = readFileSync(outputPath, "utf-8");
  } catch (e) {
    exitErr(`error: self-verify failed reading back '${outputPath}': ${(e as Error).message}`);
  }
  const writtenEntryCount = (written.match(/^  - slug: /gm) ?? []).length;
  const expectedEntryCount = meta.components.length + meta.patterns.length;
  if (writtenEntryCount !== expectedEntryCount) {
    exitErr(
      `error: self-verify failed for '${outputPath}' (expected ${expectedEntryCount} 'slug:' entries, found ${writtenEntryCount})`,
    );
  }
  if (!written.includes(`source: ${meta.source}`) || !written.includes(`darkMode: ${meta.darkMode}`)) {
    exitErr(`error: self-verify failed for '${outputPath}' (source/darkMode mismatch after write)`);
  }

  process.stdout.write(
    `META_OK screens=${meta.screens.length} components=${meta.components.length} patterns=${meta.patterns.length} -> ${outputPath}\n`,
  );
}

main();
