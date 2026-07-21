/*
 * render_design_md.ts — renders `design.md`'s ten fixed `## 3.N` sections
 * from a merged `registry.json` (written by build_registry.ts). Every value
 * cell prints exactly what the registry holds; an entry listed in
 * `unknowns` renders as `> NEEDS INPUT: <what> — <reason>` inside its
 * section instead of a fabricated value. This script never invents, rounds
 * or infers a value — it is a pure renderer over already-measured (or
 * already-proposed) data.
 *
 * Provenance: a token/textStyle carrying `proposed:true` is a best-practice
 * value the design synthesizer supplied for something the pipeline could not
 * measure. Such a row adds a `Source` column (`measured`|`proposed`) to its
 * table and carries `PROPOSED — <rationale>` in the `Notes` column; when any
 * proposed value is present, a one-line `> Legend` is prepended above
 * section 3.1 (it holds no `## ` heading, so the ten-heading self-verify and
 * every `## 3.N` consumer are unaffected).
 *
 * IN : REGISTRY_JSON — path to a merged registry (the `build_registry.ts`
 *      output shape: `{ tokens, surfaceOrder, accentUsage, textStyles,
 *      unknowns }`). OUTPUT_MD — where to write the rendered `design.md`.
 * OUT: stdout — one line on success:
 *        DESIGN_MD_OK sections=3.1,3.2,...,3.10 -> <OUTPUT_MD>
 *      OUTPUT_MD holds all ten sections in fixed order, each heading
 *      `## 3.N <title>` followed by non-empty content — either the
 *      rendered table/list, one or more `> NEEDS INPUT` lines, or the
 *      literal `none` when a section carries neither measured tokens nor an
 *      unknowns entry.
 * Exit codes: 0 = ok; 1 = unreadable/invalid-JSON registry, or a
 *      self-verify mismatch after writing (message on stderr); 2 =
 *      command-line usage errors.
 *
 * Section-specific rendering rules (see Task 2 Contracts for the full ten):
 *   - 3.1 groups tokens sharing a `<ramp>.<step>` name prefix under a ramp
 *     subheading; ungrouped primitives render in one flat table.
 *   - Any generic token table emits a "Dark" column only when at least one
 *     row in that section carries a non-null `dark` value (3.2 always shows
 *     Primitive/Hex-light/Hex-dark/Where-used — its columns are pinned).
 *   - 3.3 renders `surfaceOrder` as an ordered list in the array's own
 *     order (already ranked by the sampler — never re-sorted here).
 *   - 3.4 groups `accentUsage` per screen.
 *   - 3.5 renders section-3.5 tokens (font families) as a table, then the
 *     finite type scale from `textStyles[]`.
 *   - 3.7 splits section-3.7 tokens into a radii table and a border-width
 *     table by name prefix (`radius.*` / `border.*`).
 *   - 3.10 lists every token across the whole registry that carries a
 *     non-null `dark`, or the literal `none` when there are none.
 *
 * Usage: node render_design_md.ts REGISTRY_JSON OUTPUT_MD
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

// ---------------------------------------------------------------------------
// Types (mirrors the registry shape written by build_registry.ts)
// ---------------------------------------------------------------------------

export interface TokenEntry {
  value: string;
  dark: string | null;
  type: string;
  section: string;
  primitive: string | null;
  usedFor: string | null;
  evidence: { screen: string; method: string; detail: string } | null;
  notes: string | null;
  proposed?: boolean;
  rationale?: string | null;
}

export interface TokenRow extends TokenEntry {
  name: string;
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
  proposed?: boolean;
  rationale?: string | null;
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
// Section catalog (fixed order + titles, per Task 2 Contracts)
// ---------------------------------------------------------------------------

const SECTION_IDS = ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10"] as const;

const SECTION_TITLES: Record<string, string> = {
  "3.1": "Color primitives",
  "3.2": "Semantic colors",
  "3.3": "Surface / elevation order",
  "3.4": "Accent-usage inventory",
  "3.5": "Typography",
  "3.6": "Spacing",
  "3.7": "Radii and borders",
  "3.8": "Shadows and effects",
  "3.9": "Motion",
  "3.10": "Dark mode summary",
};

function tokensForSection(registry: Registry, section: string): TokenRow[] {
  return Object.entries(registry.tokens)
    .filter(([, t]) => t.section === section)
    .map(([name, t]) => ({ name, ...t }));
}

// ---------------------------------------------------------------------------
// Generic token table
// ---------------------------------------------------------------------------

/** Table-safe cell text: escape the column separator and flatten newlines so free-text rationale never breaks a row. */
function cellSafe(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();
}

/** The Notes cell for a token row: a proposed row leads with `PROPOSED — <rationale>`, then any measured note. */
export function tokenNotesCell(r: TokenRow): string {
  const parts: string[] = [];
  if (r.proposed) parts.push(r.rationale ? `PROPOSED — ${r.rationale}` : "PROPOSED");
  if (r.notes) parts.push(r.notes);
  return cellSafe(parts.join("; "));
}

/**
 * Generic Name/Value(+Dark)(+Source)(+Notes) table. Callers gate emptiness themselves; an empty `rows` renders "none".
 * The Source column appears only when a row is proposed (measured|proposed); the Notes column carries any measured
 * note plus each proposed row's rationale.
 */
export function renderTokenTable(rows: TokenRow[], opts: { nameHeader: string; valueHeader: string }): string {
  if (rows.length === 0) return "none\n";
  const hasDark = rows.some((r) => r.dark !== null && r.dark !== undefined && r.dark !== "");
  const hasProposed = rows.some((r) => r.proposed === true);
  const noteCells = rows.map((r) => tokenNotesCell(r));
  const hasNotes = noteCells.some((n) => n.length > 0);
  const headers = [opts.nameHeader, opts.valueHeader];
  if (hasDark) headers.push("Dark");
  if (hasProposed) headers.push("Source");
  if (hasNotes) headers.push("Notes");
  const lines = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  rows.forEach((r, i) => {
    const cells = [r.name, r.value];
    if (hasDark) cells.push(r.dark ?? "");
    if (hasProposed) cells.push(r.proposed ? "proposed" : "measured");
    if (hasNotes) cells.push(noteCells[i]);
    lines.push(`| ${cells.join(" | ")} |`);
  });
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// 3.1 — Color primitives (ramp-grouped)
// ---------------------------------------------------------------------------

function renderColorPrimitives(rows: TokenRow[]): string {
  const groups = new Map<string, TokenRow[]>();
  for (const row of rows) {
    const idx = row.name.lastIndexOf(".");
    const prefix = idx > 0 ? row.name.slice(0, idx) : row.name;
    const list = groups.get(prefix);
    if (list) list.push(row);
    else groups.set(prefix, [row]);
  }
  const parts: string[] = [];
  const singles: TokenRow[] = [];
  for (const [prefix, members] of groups) {
    if (members.length > 1) {
      parts.push(`**${prefix}**\n\n${renderTokenTable(members, { nameHeader: "Name", valueHeader: "Hex" })}`);
    } else {
      singles.push(...members);
    }
  }
  if (singles.length > 0) {
    parts.push(renderTokenTable(singles, { nameHeader: "Name", valueHeader: "Hex" }));
  }
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// 3.2 — Semantic colors (pinned columns: role, primitive, hex light, hex dark, where used)
// ---------------------------------------------------------------------------

function renderSemanticColors(rows: TokenRow[]): string {
  const hasProposed = rows.some((r) => r.proposed === true);
  const headers = ["Role", "Primitive", "Hex (light)", "Hex (dark)", "Where used"];
  if (hasProposed) headers.push("Source", "Notes");
  const lines = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  for (const r of rows) {
    const cells = [r.name, r.primitive ?? "", r.value, r.dark ?? "", r.usedFor ?? ""];
    if (hasProposed) cells.push(r.proposed ? "proposed" : "measured", tokenNotesCell(r));
    lines.push(`| ${cells.join(" | ")} |`);
  }
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// 3.3 — Surface / elevation order
// ---------------------------------------------------------------------------

/** Renders `surfaceOrder` in its own array order — already ranked by the sampler, never re-sorted here. */
export function renderSurfaceOrder(surfaceOrder: SurfaceOrderEntry[]): string {
  if (surfaceOrder.length === 0) return "none\n";
  return surfaceOrder.map((s, i) => `${i + 1}. **${s.region}** — ${s.hex} (rank ${s.rank}, luminance ${s.luminance})`).join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// 3.4 — Accent-usage inventory (grouped per screen)
// ---------------------------------------------------------------------------

export function renderAccentUsage(accentUsage: AccentUsageEntry[]): string {
  if (accentUsage.length === 0) return "none\n";
  const byScreen = new Map<string, AccentUsageEntry[]>();
  for (const a of accentUsage) {
    const list = byScreen.get(a.screen);
    if (list) list.push(a);
    else byScreen.set(a.screen, [a]);
  }
  const parts: string[] = [];
  for (const [screen, entries] of byScreen) {
    const bullets = entries.map((e) => `- ${e.where}: \`${e.token}\``).join("\n");
    parts.push(`**${screen}**\n\n${bullets}`);
  }
  return parts.join("\n\n") + "\n";
}

// ---------------------------------------------------------------------------
// 3.5 — Typography (families table + finite type scale)
// ---------------------------------------------------------------------------

export function renderTextStyles(textStyles: TextStyleEntry[]): string {
  if (textStyles.length === 0) return "none\n";
  const hasProposed = textStyles.some((t) => t.proposed === true);
  const headers = ["Style", "Family", "Size", "Weight", "Line-height", "Letter-spacing", "Where used"];
  if (hasProposed) headers.push("Source", "Notes");
  const lines = [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`];
  for (const t of textStyles) {
    const cells = [t.name, t.family, t.size, String(t.weight), String(t.lineHeight), t.letterSpacing, t.usedFor];
    if (hasProposed) {
      const note = t.proposed ? (t.rationale ? `PROPOSED — ${t.rationale}` : "PROPOSED") : "";
      cells.push(t.proposed ? "proposed" : "measured", cellSafe(note));
    }
    lines.push(`| ${cells.join(" | ")} |`);
  }
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// 3.7 — Radii and borders (split by name prefix)
// ---------------------------------------------------------------------------

function renderRadiiAndBorders(rows: TokenRow[]): string {
  const radii = rows.filter((r) => r.name.startsWith("radius."));
  const borders = rows.filter((r) => r.name.startsWith("border."));
  const other = rows.filter((r) => !r.name.startsWith("radius.") && !r.name.startsWith("border."));
  const parts: string[] = [
    `**Radii**\n\n${renderTokenTable(radii, { nameHeader: "Radius token", valueHeader: "Value" })}`,
    `**Border widths**\n\n${renderTokenTable(borders, { nameHeader: "Border-width token", valueHeader: "Value" })}`,
  ];
  if (other.length > 0) {
    parts.push(renderTokenTable(other, { nameHeader: "Name", valueHeader: "Value" }));
  }
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// 3.10 — Dark mode summary
// ---------------------------------------------------------------------------

function renderDarkModeSummary(registry: Registry): string | null {
  const rows = Object.entries(registry.tokens)
    .filter(([, t]) => t.dark !== null && t.dark !== undefined && t.dark !== "")
    .map(([name, t]) => ({ name, ...t }));
  if (rows.length === 0) return null;
  return rows.map((r) => `- \`${r.name}\`: ${r.value} -> ${r.dark}`).join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Section dispatcher
// ---------------------------------------------------------------------------

/** Renders one full `## 3.N <title>` section (heading + body + any NEEDS INPUT markers, or `none`). */
export function renderSection(sectionId: string, registry: Registry): string {
  const heading = `## ${sectionId} ${SECTION_TITLES[sectionId]}`;
  const unknownsForSection = registry.unknowns.filter((u) => u.section === sectionId);
  const unknownBlock = unknownsForSection.map((u) => `> NEEDS INPUT: ${u.what} — ${u.reason}`).join("\n");

  let hasContent = false;
  let body = "";
  switch (sectionId) {
    case "3.1": {
      const rows = tokensForSection(registry, "3.1");
      hasContent = rows.length > 0;
      if (hasContent) body = renderColorPrimitives(rows);
      break;
    }
    case "3.2": {
      const rows = tokensForSection(registry, "3.2");
      hasContent = rows.length > 0;
      if (hasContent) body = renderSemanticColors(rows);
      break;
    }
    case "3.3": {
      hasContent = registry.surfaceOrder.length > 0;
      if (hasContent) body = renderSurfaceOrder(registry.surfaceOrder);
      break;
    }
    case "3.4": {
      hasContent = registry.accentUsage.length > 0;
      if (hasContent) body = renderAccentUsage(registry.accentUsage);
      break;
    }
    case "3.5": {
      const families = tokensForSection(registry, "3.5");
      hasContent = families.length > 0 || registry.textStyles.length > 0;
      if (hasContent) {
        const parts: string[] = [];
        if (families.length > 0) parts.push(renderTokenTable(families, { nameHeader: "Role", valueHeader: "Family / fallback stack" }));
        if (registry.textStyles.length > 0) parts.push(renderTextStyles(registry.textStyles));
        body = parts.join("\n");
      }
      break;
    }
    case "3.6": {
      const rows = tokensForSection(registry, "3.6");
      hasContent = rows.length > 0;
      if (hasContent) body = renderTokenTable(rows, { nameHeader: "Step", valueHeader: "Value" });
      break;
    }
    case "3.7": {
      const rows = tokensForSection(registry, "3.7");
      hasContent = rows.length > 0;
      if (hasContent) body = renderRadiiAndBorders(rows);
      break;
    }
    case "3.8": {
      const rows = tokensForSection(registry, "3.8");
      hasContent = rows.length > 0;
      if (hasContent) body = renderTokenTable(rows, { nameHeader: "Name", valueHeader: "Value" });
      break;
    }
    case "3.9": {
      const rows = tokensForSection(registry, "3.9");
      hasContent = rows.length > 0;
      if (hasContent) body = renderTokenTable(rows, { nameHeader: "Name", valueHeader: "Value" });
      break;
    }
    case "3.10": {
      const summary = renderDarkModeSummary(registry);
      hasContent = summary !== null;
      if (summary !== null) body = summary;
      break;
    }
    default:
      hasContent = false;
  }

  const bodyParts: string[] = [];
  if (hasContent) bodyParts.push(body.trim());
  if (unknownsForSection.length > 0) bodyParts.push(unknownBlock);
  if (bodyParts.length === 0) bodyParts.push("none");

  return `${heading}\n\n${bodyParts.join("\n\n")}\n`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const PROG = basename(process.argv[1] ?? "render_design_md.ts");

function usageText(): string {
  return `usage: ${PROG} [-h] REGISTRY_JSON OUTPUT_MD`;
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
    argError(`expected 2 arguments (REGISTRY_JSON OUTPUT_MD), got ${argv.length}`);
  }
  const [registryPath, outputPath] = argv;

  let raw: string;
  try {
    raw = readFileSync(registryPath, "utf-8");
  } catch (e) {
    exitErr(`error: cannot read '${registryPath}': ${(e as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    exitErr(`error: '${registryPath}' is not valid JSON: ${(e as Error).message}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    exitErr(`error: '${registryPath}' must contain a JSON object (a registry, not a fragment array)`);
  }
  const p = parsed as Record<string, unknown>;
  const registry: Registry = {
    tokens: (typeof p.tokens === "object" && p.tokens !== null && !Array.isArray(p.tokens) ? p.tokens : {}) as Record<string, TokenEntry>,
    surfaceOrder: (Array.isArray(p.surfaceOrder) ? p.surfaceOrder : []) as SurfaceOrderEntry[],
    accentUsage: (Array.isArray(p.accentUsage) ? p.accentUsage : []) as AccentUsageEntry[],
    textStyles: (Array.isArray(p.textStyles) ? p.textStyles : []) as TextStyleEntry[],
    unknowns: (Array.isArray(p.unknowns) ? p.unknowns : []) as UnknownEntry[],
  };

  const rendered = SECTION_IDS.map((id) => renderSection(id, registry));
  const anyProposed =
    Object.values(registry.tokens).some((t) => t.proposed === true) ||
    registry.textStyles.some((t) => t.proposed === true);
  const legend = anyProposed
    ? "> Legend — Source: `measured` = sampled from the screenshots; `proposed` = a best-practice value supplied by the " +
      "design synthesizer (no source measurement, rationale in Notes). Review every proposed value before shipping.\n\n"
    : "";
  writeFileSync(outputPath, legend + rendered.join("\n"));

  // Self-verify: re-read the written file and re-count the section headings rather than trust the write.
  let written: string;
  try {
    written = readFileSync(outputPath, "utf-8");
  } catch (e) {
    exitErr(`error: self-verify failed reading back '${outputPath}': ${(e as Error).message}`);
  }
  const headingCount = (written.match(/^## /gm) ?? []).length;
  if (headingCount !== SECTION_IDS.length) {
    exitErr(`error: self-verify failed for '${outputPath}' (expected ${SECTION_IDS.length} '## ' headings, found ${headingCount})`);
  }

  process.stdout.write(`DESIGN_MD_OK sections=${SECTION_IDS.join(",")} -> ${outputPath}\n`);
}

main();
