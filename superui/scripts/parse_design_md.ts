/*
 * parse_design_md.ts — reconstructs a registry-shaped JSON from an already
 * rendered `DESIGN.md` (the inverse of render_design_md.ts). The `### 3.N`
 * body tables/lists are the authoritative source: the YAML front matter is a
 * derived subset (colors/typography/spacing/rounded/shadows/gradients only,
 * no provenance markers) that cannot by itself distinguish measured from
 * proposed, carry a token's `primitive`/`usedFor`, or reconstruct
 * `surfaceOrder`/`accentUsage` — so every token/textStyle/surfaceOrder/
 * accentUsage entry is parsed from the body instead. Downstream consumers:
 * spec-writer dispatches, `validate_bundle.ts --mode platform`, the
 * component-synthesizer agent, and bundle-reviewer — all read the emitted
 * JSON as a registry, never `DESIGN.md` directly.
 *
 * Section-to-heading map (mirrors render_design_md.ts's renderBody): 3.1,
 * 3.2, 3.4 and 3.10 sit under `## Colors` as their own `### 3.N <title>`
 * subheadings; 3.3 and 3.8 sit under `## Elevation & Depth` the same way.
 * 3.5, 3.6, 3.7 and 3.9 each get the ENTIRE body of their own `## ` heading
 * (Typography / Layout & Spacing / Shapes / Motion respectively) with NO
 * `### 3.N` subheading of their own — render_design_md.ts never wraps a
 * lone subsection in one. 3.10 is derived (rendered from the `dark` field
 * already present on 3.1/3.2 tokens) and is never parsed back into anything
 * of its own.
 *
 * Per-section body shape parsed:
 *   - 3.1, 3.6, 3.7, 3.8, 3.9, and the 3.5 families table: one or more
 *     generic Name/Value(+Dark)(+Source)(+Notes) markdown tables — 3.1/3.7/
 *     3.8 may render several (grouped by name prefix), all sharing the same
 *     column shape; every row's first cell is the full dotted token name
 *     regardless of grouping.
 *   - 3.2: the pinned Role/Primitive/Hex(light)/Hex(dark)/Where
 *     used(+Source)(+Notes) table.
 *   - 3.5's second table (header `Style`): the type-scale table ->
 *     `textStyles`.
 *   - 3.3: a numbered list, `N. **region** - hex (rank R, luminance L)`.
 *   - 3.4: `**screen**` group headers followed by `- where: \`token\``
 *     bullets.
 * `evidence` is always reconstructed as `null` (no consumer needs it back);
 * `unknowns` is always `[]` (a `> NEEDS INPUT` line is prose the renderer
 * emitted for a human, not a re-parseable unknown, and no downstream
 * consumer of this script's output reads `unknowns`). A token's `type` is
 * not recoverable from the rendered table (render_design_md.ts never prints
 * it) — a per-section default is assigned instead (see `defaultTypeFor`);
 * no consumer reads `type` for behavior, only build_registry.ts requires it
 * non-empty.
 *
 * IN : DESIGN_MD — a `DESIGN.md` written by render_design_md.ts.
 *      OUTPUT_JSON — where to write the reconstructed registry.
 * OUT: stdout — one line on success:
 *        PARSE_DESIGN_OK tokens=<n> textStyles=<n> -> <OUTPUT_JSON>
 *      OUTPUT_JSON holds `{ tokens, textStyles, surfaceOrder, accentUsage,
 *      unknowns: [] }`.
 * Exit codes: 0 = ok; 1 = DESIGN_MD unreadable, or zero tokens were found
 *      (malformed/empty body — message on stderr, naming the file); 2 =
 *      command-line usage errors.
 *
 * Usage: node parse_design_md.ts DESIGN_MD OUTPUT_JSON
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SECTION_TITLES } from "./section-model.ts";

// ---------------------------------------------------------------------------
// Types (mirrors the registry shape build_registry.ts / render_design_md.ts use)
// ---------------------------------------------------------------------------

export interface TokenEntry {
  value: string;
  dark: string | null;
  type: string;
  section: string;
  primitive: string | null;
  usedFor: string | null;
  evidence: null;
  notes: string | null;
  proposed: boolean;
  rationale: string | null;
}

export interface SurfaceOrderEntry {
  region: string;
  hex: string;
  luminance: number;
  rank: number;
}

export interface AccentUsageEntry {
  screen: string;
  where: string;
  token: string;
}

export interface TextStyleEntry {
  name: string;
  family: string;
  size: string;
  weight: number;
  lineHeight: number;
  letterSpacing: string;
  usedFor: string;
  proposed: boolean;
  rationale: string | null;
}

export interface UnknownEntry {
  what: string;
  reason: string;
  section: string;
}

export interface Registry {
  tokens: Record<string, TokenEntry>;
  surfaceOrder: SurfaceOrderEntry[];
  accentUsage: AccentUsageEntry[];
  textStyles: TextStyleEntry[];
  unknowns: UnknownEntry[];
}

// ---------------------------------------------------------------------------
// Front matter / body split
// ---------------------------------------------------------------------------

/**
 * Splits a rendered `DESIGN.md` into its opening `---`-delimited front
 * matter and the prose body that follows. The front matter is a derived
 * subset (see header comment) — callers parse tokens from `body`, never
 * `frontMatter`. A document with no opening `---` block returns the whole
 * input as `body` and an empty `frontMatter`.
 */
export function parseFrontMatter(designMd: string): { frontMatter: string; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(designMd);
  if (!m) return { frontMatter: "", body: designMd };
  return { frontMatter: m[1], body: m[2] };
}

// ---------------------------------------------------------------------------
// Markdown table scanning
// ---------------------------------------------------------------------------

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 1;
}

function isSeparatorRow(line: string): boolean {
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
}

/** Unescapes `cellSafe`'s `\|` back to `|`; newline flattening (space-joined) is not reversible and is not reversed. */
function unescapeCell(cell: string): string {
  return cell.replace(/\\\|/g, "|");
}

/** Splits one `| a | b |` row into trimmed, unescaped cells — mirrors render_design_md.test.ts's own `splitRow`. */
function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|\s*$/, "");
  return trimmed.split(/(?<!\\)\|/).map((c) => unescapeCell(c.trim()));
}

/** Scans `content` for every `| header |` + `| --- |` + zero-or-more data-row markdown table, in order. */
function extractTables(content: string): ParsedTable[] {
  const lines = content.split(/\r?\n/);
  const tables: ParsedTable[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isTableRow(lines[i]) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const headers = splitRow(lines[i]);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) {
        rows.push(splitRow(lines[j]));
        j++;
      }
      tables.push({ headers, rows });
      i = j;
      continue;
    }
    i++;
  }
  return tables;
}

/** Drops every `> ...` blockquote line (NEEDS INPUT markers) before table/list scanning. */
function stripBlockquotes(content: string): string {
  return content
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith(">"))
    .join("\n");
}

// ---------------------------------------------------------------------------
// Notes-cell provenance parsing (inverse of render_design_md.ts's tokenNotesCell)
// ---------------------------------------------------------------------------

/**
 * Splits one row's Notes cell back into `rationale` (proposed rows) or
 * `notes` (measured rows). A proposed cell is `PROPOSED - <rationale>` (or
 * bare `PROPOSED` when the rationale was empty); the tokenNotesCell
 * "PROPOSED[...]; <measured notes>" combination is not reversible with full
 * fidelity — the whole remainder after the dash is kept as `rationale` and
 * a trailing measured note is not split back out (out of contract: a
 * proposed token carries no measured note in the fragments this pipeline
 * writes).
 */
function splitNotesCell(cell: string | undefined, proposed: boolean): { rationale: string | null; notes: string | null } {
  if (!proposed) return { rationale: null, notes: cell ? cell : null };
  if (!cell) return { rationale: "", notes: null };
  const m = /^PROPOSED(?: - (.*))?$/.exec(cell);
  if (m) return { rationale: m[1] ?? "", notes: null };
  return { rationale: cell.replace(/^PROPOSED[-;]?\s*/, ""), notes: null };
}

// ---------------------------------------------------------------------------
// Per-section token type defaults (never rendered, so never recoverable)
// ---------------------------------------------------------------------------

function defaultTypeFor(sectionId: string, name: string): string {
  switch (sectionId) {
    case "3.1":
    case "3.2":
      return "color";
    case "3.5":
      return "fontFamily";
    case "3.6":
    case "3.7":
      return "dimension";
    case "3.8":
      if (name.startsWith("shadow.")) return "shadow";
      if (name.startsWith("gradient.")) return "gradient";
      return "dimension";
    case "3.9":
      return "duration";
    default:
      return "string";
  }
}

// ---------------------------------------------------------------------------
// Per-section-shape parsers
// ---------------------------------------------------------------------------

/** Generic Name/Value(+Dark)(+Source)(+Notes) tables (3.1, 3.6, 3.7, 3.8, 3.9, and 3.5's families table). */
function parseGenericTables(content: string, sectionId: string): Record<string, TokenEntry> {
  const out: Record<string, TokenEntry> = {};
  for (const table of extractTables(content)) {
    if (table.headers[0] === "Style") continue; // the 3.5 text-scale table — handled by parseTypographyTables
    const darkIdx = table.headers.indexOf("Dark");
    const sourceIdx = table.headers.indexOf("Source");
    const notesIdx = table.headers.indexOf("Notes");
    for (const row of table.rows) {
      const name = row[0];
      if (!name) continue;
      const value = row[1] ?? "";
      const dark = darkIdx >= 0 ? row[darkIdx] || null : null;
      const proposed = sourceIdx >= 0 && row[sourceIdx] === "proposed";
      const { rationale, notes } = splitNotesCell(notesIdx >= 0 ? row[notesIdx] : undefined, proposed);
      out[name] = {
        value,
        dark,
        type: defaultTypeFor(sectionId, name),
        section: sectionId,
        primitive: null,
        usedFor: null,
        evidence: null,
        notes,
        proposed,
        rationale,
      };
    }
  }
  return out;
}

/** The pinned 3.2 semantic-colors table: Role/Primitive/Hex(light)/Hex(dark)/Where used(+Source)(+Notes). */
function parseSemanticTable(content: string): Record<string, TokenEntry> {
  const out: Record<string, TokenEntry> = {};
  for (const table of extractTables(content)) {
    const sourceIdx = table.headers.indexOf("Source");
    const notesIdx = table.headers.indexOf("Notes");
    for (const row of table.rows) {
      const name = row[0];
      if (!name) continue;
      const primitive = row[1] || null;
      const value = row[2] ?? "";
      const dark = row[3] || null;
      const usedFor = row[4] || null;
      const proposed = sourceIdx >= 0 && row[sourceIdx] === "proposed";
      const { rationale, notes } = splitNotesCell(notesIdx >= 0 ? row[notesIdx] : undefined, proposed);
      out[name] = {
        value,
        dark,
        type: "color",
        section: "3.2",
        primitive,
        usedFor,
        evidence: null,
        notes,
        proposed,
        rationale,
      };
    }
  }
  return out;
}

/** 3.5's two tables: the families table (generic) plus the `Style`-headed type-scale table -> textStyles. */
function parseTypographyTables(content: string): { families: Record<string, TokenEntry>; styles: TextStyleEntry[] } {
  const families = parseGenericTables(content, "3.5");
  const styles: TextStyleEntry[] = [];
  for (const table of extractTables(content)) {
    if (table.headers[0] !== "Style") continue;
    const sourceIdx = table.headers.indexOf("Source");
    const notesIdx = table.headers.indexOf("Notes");
    for (const row of table.rows) {
      const name = row[0];
      if (!name) continue;
      const proposed = sourceIdx >= 0 && row[sourceIdx] === "proposed";
      const { rationale } = splitNotesCell(notesIdx >= 0 ? row[notesIdx] : undefined, proposed);
      styles.push({
        name,
        family: row[1] ?? "",
        size: row[2] ?? "",
        weight: Number(row[3] ?? "0"),
        lineHeight: Number(row[4] ?? "0"),
        letterSpacing: row[5] ?? "",
        usedFor: row[6] ?? "",
        proposed,
        rationale,
      });
    }
  }
  return { families, styles };
}

/** 3.3's numbered list: `N. **region** - hex (rank R, luminance L)`. */
function parseSurfaceOrderList(content: string): SurfaceOrderEntry[] {
  const re = /^\d+\.\s+\*\*(.+?)\*\*\s+-\s+(\S+)\s+\(rank\s+(-?\d+(?:\.\d+)?),\s+luminance\s+(-?\d+(?:\.\d+)?)\)\s*$/gm;
  const out: SurfaceOrderEntry[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    out.push({ region: m[1], hex: m[2], rank: Number(m[3]), luminance: Number(m[4]) });
  }
  return out;
}

/** 3.4's `**screen**` groups + `- where: \`token\`` bullets. */
function parseAccentUsageList(content: string): AccentUsageEntry[] {
  const out: AccentUsageEntry[] = [];
  let currentScreen: string | null = null;
  const screenRe = /^\*\*(.+)\*\*\s*$/;
  const bulletRe = /^- (.+?): `(.+)`\s*$/;
  for (const line of content.split(/\r?\n/)) {
    const sm = screenRe.exec(line);
    if (sm) {
      currentScreen = sm[1];
      continue;
    }
    const bm = bulletRe.exec(line);
    if (bm && currentScreen) out.push({ screen: currentScreen, where: bm[1], token: bm[2] });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Heading -> section-id map (mirrors render_design_md.ts's renderBody)
// ---------------------------------------------------------------------------

const HEADING_TO_SECTIONS: Record<string, string[]> = {
  Colors: ["3.1", "3.2", "3.4", "3.10"],
  Typography: ["3.5"],
  "Layout & Spacing": ["3.6"],
  "Elevation & Depth": ["3.3", "3.8"],
  Shapes: ["3.7"],
  Motion: ["3.9"],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Splits `body` into `{ title, content }` per top-level `## ` heading (content spans to the next `## ` or EOF). */
function extractHeadingBlocks(body: string): { title: string; content: string }[] {
  const re = /^## (.+)$/gm;
  const matches = [...body.matchAll(re)];
  const blocks: { title: string; content: string }[] = [];
  for (let k = 0; k < matches.length; k++) {
    const start = matches[k].index + matches[k][0].length;
    const end = k + 1 < matches.length ? matches[k + 1].index : body.length;
    blocks.push({ title: matches[k][1].trim(), content: body.slice(start, end) });
  }
  return blocks;
}

/** Splits a `## ` block's content into per-`### 3.N <title>` sub-contents (content spans to the next `### ` or EOF). */
function extractSubsections(content: string, sectionIds: string[]): Record<string, string> {
  const positions: { id: string; index: number; length: number }[] = [];
  for (const id of sectionIds) {
    const re = new RegExp(`^### ${escapeRegExp(id)} ${escapeRegExp(SECTION_TITLES[id])}\\s*$`, "m");
    const m = re.exec(content);
    if (m) positions.push({ id, index: m.index, length: m[0].length });
  }
  positions.sort((a, b) => a.index - b.index);
  const result: Record<string, string> = {};
  for (let k = 0; k < positions.length; k++) {
    const start = positions[k].index + positions[k].length;
    const end = k + 1 < positions.length ? positions[k + 1].index : content.length;
    result[positions[k].id] = content.slice(start, end);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Top-level body parse
// ---------------------------------------------------------------------------

/**
 * Parses a `DESIGN.md` body (everything after the front matter) into a
 * registry-shaped object. `unknowns` is always `[]` (see header comment).
 */
export function parseBodyTables(body: string): Registry {
  const sectionContent: Record<string, string> = {};
  for (const block of extractHeadingBlocks(body)) {
    const ids = HEADING_TO_SECTIONS[block.title];
    if (!ids) continue;
    if (ids.length === 1) {
      sectionContent[ids[0]] = block.content;
    } else {
      Object.assign(sectionContent, extractSubsections(block.content, ids));
    }
  }

  const tokens: Record<string, TokenEntry> = {};
  const textStyles: TextStyleEntry[] = [];

  for (const id of ["3.1", "3.2", "3.5", "3.6", "3.7", "3.8", "3.9"]) {
    const content = sectionContent[id];
    if (content === undefined) continue;
    const clean = stripBlockquotes(content);
    if (id === "3.2") {
      Object.assign(tokens, parseSemanticTable(clean));
    } else if (id === "3.5") {
      const { families, styles } = parseTypographyTables(clean);
      Object.assign(tokens, families);
      textStyles.push(...styles);
    } else {
      Object.assign(tokens, parseGenericTables(clean, id));
    }
  }

  const surfaceOrder = sectionContent["3.3"] ? parseSurfaceOrderList(stripBlockquotes(sectionContent["3.3"])) : [];
  const accentUsage = sectionContent["3.4"] ? parseAccentUsageList(stripBlockquotes(sectionContent["3.4"])) : [];

  return { tokens, surfaceOrder, accentUsage, textStyles, unknowns: [] };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const PROG = basename(process.argv[1] ?? "parse_design_md.ts");

function usageText(): string {
  return `usage: ${PROG} [-h] DESIGN_MD OUTPUT_JSON`;
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
    argError(`expected 2 arguments (DESIGN_MD OUTPUT_JSON), got ${argv.length}`);
  }
  const [designPath, outputPath] = argv;

  let raw: string;
  try {
    raw = readFileSync(designPath, "utf-8");
  } catch (e) {
    exitErr(`error: cannot read '${designPath}': ${(e as Error).message}`);
  }

  const { body } = parseFrontMatter(raw);
  const registry = parseBodyTables(body);
  const tokenCount = Object.keys(registry.tokens).length;
  const textStyleCount = registry.textStyles.length;

  if (tokenCount === 0) {
    exitErr(`error: no tokens found in '${designPath}' (malformed or empty DESIGN.md body)`);
  }

  writeFileSync(outputPath, JSON.stringify(registry, null, 2) + "\n");

  // Self-verify: re-read the written file and re-count rather than trust the write.
  let reread: Registry;
  try {
    reread = JSON.parse(readFileSync(outputPath, "utf-8")) as Registry;
  } catch (e) {
    exitErr(`error: self-verify failed reading back '${outputPath}': ${(e as Error).message}`);
  }
  const rereadTokenCount = Object.keys(reread.tokens ?? {}).length;
  if (rereadTokenCount !== tokenCount) {
    exitErr(
      `error: self-verify failed for '${outputPath}' (wrote tokens=${tokenCount}, read back tokens=${rereadTokenCount})`,
    );
  }

  process.stdout.write(`PARSE_DESIGN_OK tokens=${tokenCount} textStyles=${textStyleCount} -> ${outputPath}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
