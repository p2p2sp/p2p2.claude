/*
 * render_design_md.ts - renders `DESIGN.md`, the one-shot design seed, from a
 * merged `registry.json` (written by build_registry.ts) plus the run's
 * `inventory.md` (for the Components overview). The output is a lean, readable
 * seed loosely conforming to the design.md standard:
 *   1. YAML front matter FIRST (before any prose) - DTCG-shaped light-value
 *      tokens: `colors` (3.1+3.2), `typography` (3.5 families + textStyles),
 *      `spacing` (3.6), `rounded` (3.7 `radius.*`). Nothing else lands in front
 *      matter (border widths, shadows, motion, surface order, accent usage live
 *      in the body only).
 *   2. A prose body under the fixed standard `## ` headings (Overview, Colors,
 *      Typography, Layout & Spacing, Elevation & Depth, Shapes, Motion,
 *      Components, Do's and Don'ts). The old `## 3.N` sections survive as `###`
 *      subsections grouped under those headings.
 *
 * Every value cell prints exactly what the registry holds; an entry listed in
 * `unknowns` renders as `> NEEDS INPUT: <what> - <reason>` inside its
 * subsection instead of a fabricated value. This script never invents, rounds
 * or infers a value - it is a pure renderer over already-measured (or
 * already-proposed) data. Overview and Do's-and-Don'ts are MECHANICAL only
 * (counts + fixed boilerplate); the script authors no narrative.
 *
 * Provenance: a token/textStyle carrying `proposed:true` is a best-practice
 * value the design synthesizer supplied for something the pipeline could not
 * measure. Such a row adds a `Source` column (`measured`|`proposed`) to its
 * body table and carries `PROPOSED - <rationale>` in `Notes`; when any proposed
 * value is present, a one-line `> Legend` follows the closing front-matter
 * `---`. Front matter may carry proposed defaults too - a `> Note` below the
 * front matter states the body Source columns are authoritative for provenance.
 *
 * CRITICAL - YAML quoting: `key: #fff` is a YAML comment (null), and a value
 * containing `:` breaks the scalar. The emitter double-quotes every string
 * value (hex, sizes, family stacks) and every risky key; only true numbers
 * (weight, lineHeight) stay bare - so no `: #` and no stray `:` ever reach the
 * front matter.
 *
 * IN : REGISTRY_JSON - a merged registry (`{ tokens, surfaceOrder, accentUsage,
 *      textStyles, unknowns }`). INVENTORY_MD - the run's `inventory.md`
 *      (`## Components` / `## Patterns` entry lines), read for the Components
 *      overview. OUTPUT_MD - where to write `DESIGN.md`. Optional
 *      `--source <label>` - recorded in the Overview sentence only.
 * OUT: stdout - one line on success:
 *        DESIGN_MD_OK headings=Overview,Colors,... -> <OUTPUT_MD>
 *      OUTPUT_MD opens with `---` front matter, then the fixed standard
 *      headings in order, each present and non-empty.
 * Exit codes: 0 = ok; 1 = unreadable/invalid-JSON registry, unreadable
 *      inventory, or a self-verify mismatch after writing (message on stderr);
 *      2 = command-line usage errors.
 *
 * Usage: node render_design_md.ts REGISTRY_JSON INVENTORY_MD OUTPUT_MD [--source <label>]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SECTION_TITLES } from "./section-model.ts";
import { parseInventoryEntries } from "./inventory-format.ts";

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
// Standard headings (fixed order + non-empty) - the self-verify + validation contract
// ---------------------------------------------------------------------------

export const STANDARD_HEADINGS = [
  "Overview",
  "Colors",
  "Typography",
  "Layout & Spacing",
  "Elevation & Depth",
  "Shapes",
  "Motion",
  "Components",
  "Do's and Don'ts",
] as const;

// ---------------------------------------------------------------------------
// Subsection catalog (the old `## 3.N` sections, now `###` under the headings)
// ---------------------------------------------------------------------------

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

/** The Notes cell for a token row: a proposed row leads with `PROPOSED - <rationale>`, then any measured note. */
export function tokenNotesCell(r: TokenRow): string {
  const parts: string[] = [];
  if (r.proposed) parts.push(r.rationale ? `PROPOSED - ${r.rationale}` : "PROPOSED");
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
// 3.1 - Color primitives (ramp-grouped)
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
// 3.2 - Semantic colors (pinned columns: role, primitive, hex light, hex dark, where used)
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
// 3.3 - Surface / elevation order
// ---------------------------------------------------------------------------

/** Renders `surfaceOrder` in its own array order - already ranked by the sampler, never re-sorted here. */
export function renderSurfaceOrder(surfaceOrder: SurfaceOrderEntry[]): string {
  if (surfaceOrder.length === 0) return "none\n";
  return surfaceOrder.map((s, i) => `${i + 1}. **${s.region}** - ${s.hex} (rank ${s.rank}, luminance ${s.luminance})`).join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// 3.4 - Accent-usage inventory (grouped per screen)
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
// 3.5 - Typography (families table + finite type scale)
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
      const note = t.proposed ? (t.rationale ? `PROPOSED - ${t.rationale}` : "PROPOSED") : "";
      cells.push(t.proposed ? "proposed" : "measured", cellSafe(note));
    }
    lines.push(`| ${cells.join(" | ")} |`);
  }
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// 3.7 - Radii and borders (split by name prefix)
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
// 3.10 - Dark mode summary
// ---------------------------------------------------------------------------

function renderDarkModeSummary(registry: Registry): string | null {
  const rows = Object.entries(registry.tokens)
    .filter(([, t]) => t.dark !== null && t.dark !== undefined && t.dark !== "")
    .map(([name, t]) => ({ name, ...t }));
  if (rows.length === 0) return null;
  return rows.map((r) => `- \`${r.name}\` - light ${r.value}, dark ${r.dark}`).join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Subsection body dispatcher (the old `## 3.N` bodies, now under `###`)
// ---------------------------------------------------------------------------

/** Renders one `## 3.N` subsection body (table/list + any NEEDS INPUT markers, or `none`) - no heading. */
export function renderSubsectionBody(sectionId: string, registry: Registry): string {
  const unknownsForSection = registry.unknowns.filter((u) => u.section === sectionId);
  const unknownBlock = unknownsForSection.map((u) => `> NEEDS INPUT: ${u.what} - ${u.reason}`).join("\n");

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

  return bodyParts.join("\n\n");
}

/** `### 3.N <title>` heading + its body. */
function renderSubsection(sectionId: string, registry: Registry): string {
  return `### ${sectionId} ${SECTION_TITLES[sectionId]}\n\n${renderSubsectionBody(sectionId, registry)}`;
}

// ---------------------------------------------------------------------------
// Front matter (DTCG-shaped, light values, quoted) - the first bytes of DESIGN.md
// ---------------------------------------------------------------------------

/** Double-quote every string scalar (escaping `\` and `"`); leave true numbers bare - no unquoted `#`/`:` ever. */
function yamlScalar(v: string | number): string {
  if (typeof v === "number") return String(v);
  return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Quote a mapping key only when it carries a YAML-significant char; dotted identifiers/slugs stay bare. */
function yamlKey(k: string): string {
  if (k === "" || /[:#{}[\],&*!|>'"%@`]/.test(k) || /^\s|\s$/.test(k)) {
    return `"${k.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return k;
}

function buildFrontMatter(registry: Registry): string {
  const lines: string[] = [];

  // colors <- 3.1 + 3.2, light `value`
  const colorRows = [...tokensForSection(registry, "3.1"), ...tokensForSection(registry, "3.2")];
  if (colorRows.length === 0) {
    lines.push("colors: {}");
  } else {
    lines.push("colors:");
    for (const r of colorRows) lines.push(`  ${yamlKey(r.name)}: ${yamlScalar(r.value)}`);
  }

  // typography <- 3.5 families + textStyles (nested maps)
  lines.push("typography:");
  const families = tokensForSection(registry, "3.5");
  if (families.length === 0) {
    lines.push("  families: {}");
  } else {
    lines.push("  families:");
    for (const f of families) lines.push(`    ${yamlKey(f.name)}: ${yamlScalar(f.value)}`);
  }
  if (registry.textStyles.length === 0) {
    lines.push("  styles: {}");
  } else {
    lines.push("  styles:");
    for (const t of registry.textStyles) {
      lines.push(`    ${yamlKey(t.name)}:`);
      lines.push(`      family: ${yamlScalar(t.family)}`);
      lines.push(`      size: ${yamlScalar(t.size)}`);
      lines.push(`      weight: ${yamlScalar(t.weight)}`);
      lines.push(`      lineHeight: ${yamlScalar(t.lineHeight)}`);
      lines.push(`      letterSpacing: ${yamlScalar(t.letterSpacing)}`);
    }
  }

  // spacing <- 3.6
  const spacing = tokensForSection(registry, "3.6");
  if (spacing.length === 0) {
    lines.push("spacing: {}");
  } else {
    lines.push("spacing:");
    for (const s of spacing) lines.push(`  ${yamlKey(s.name)}: ${yamlScalar(s.value)}`);
  }

  // rounded <- 3.7 `radius.*`
  const rounded = tokensForSection(registry, "3.7").filter((r) => r.name.startsWith("radius."));
  if (rounded.length === 0) {
    lines.push("rounded: {}");
  } else {
    lines.push("rounded:");
    for (const r of rounded) lines.push(`  ${yamlKey(r.name)}: ${yamlScalar(r.value)}`);
  }

  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Overview + Components + Do's-and-Don'ts - MECHANICAL only (no authored narrative)
// ---------------------------------------------------------------------------

function renderOverview(registry: Registry, source: string): string {
  const colorCount = Object.values(registry.tokens).filter((t) => t.section === "3.1" || t.section === "3.2").length;
  const styleCount = registry.textStyles.length;
  const spacingCount = tokensForSection(registry, "3.6").length;
  const shapeCount = tokensForSection(registry, "3.7").length;
  const hasDark = Object.values(registry.tokens).some((t) => t.dark !== null && t.dark !== undefined && t.dark !== "");
  const proposedCount =
    Object.values(registry.tokens).filter((t) => t.proposed === true).length +
    registry.textStyles.filter((t) => t.proposed === true).length;
  const src = source.length > 0 ? source : "the source screenshots";

  const sentences = [
    `This is a one-shot design seed extracted from ${src}.`,
    `It catalogues ${colorCount} color token(s), ${styleCount} type style(s), ${spacingCount} spacing step(s) and ${shapeCount} radius/border token(s).`,
    `Dark-mode values are ${hasDark ? "present" : "absent"}.`,
    proposedCount > 0
      ? `${proposedCount} value(s) are proposed best-practice defaults (not measured) - review them; the body Source columns mark provenance.`
      : `Every value is measured; the body Source columns mark provenance.`,
  ];
  return sentences.join(" ") + "\n";
}

function renderComponentsOverview(inventoryMd: string): string {
  const comps = parseInventoryEntries(inventoryMd, "## Components");
  const pats = parseInventoryEntries(inventoryMd, "## Patterns");
  const lines: string[] = [];
  lines.push(`${comps.length} component(s) and ${pats.length} pattern(s) catalogued. Full per-entry specifications live in the satellite files.`);
  lines.push("");
  lines.push("**Components**");
  lines.push("");
  if (comps.length === 0) lines.push("None catalogued.");
  else for (const c of comps) lines.push(`- ${c.slug} - ${c.kind || "component"}, canonical ${c.canonical || "n/a"}`);
  lines.push("");
  lines.push("**Patterns**");
  lines.push("");
  if (pats.length === 0) lines.push("None catalogued.");
  else for (const p of pats) lines.push(`- ${p.slug} - canonical ${p.canonical || "n/a"}`);
  lines.push("");
  lines.push("See `DESIGN.components.md` for component specs and `DESIGN.patterns.md` for pattern specs.");
  return lines.join("\n") + "\n";
}

function renderDosAndDonts(): string {
  return [
    "**Do**",
    "",
    "- Keep the neutral foundation dominant; reserve chromatic accent for the roles the Colors accent inventory lists.",
    "- Express each component state as a change of FORM (border, elevation, opacity, icon), not only a color swap.",
    "- Treat measured values as authoritative and review every `proposed` value before shipping.",
    "",
    "**Don't**",
    "",
    "- Don't spread an accent color into plain text or borders it was never measured on.",
    "- Don't hand-patch this seed - re-run the extractor when the source changes; iterating in Claude Design supersedes it.",
    "- Don't mistake a front-matter default for a measured value; the body Source columns are authoritative.",
  ].join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Body assembly (standard `##` headings, old sections as `###` subsections)
// ---------------------------------------------------------------------------

function renderBody(registry: Registry, inventoryMd: string, source: string): string {
  const blocks: string[] = [];

  blocks.push(`## Overview\n\n${renderOverview(registry, source)}`);

  blocks.push(
    [
      "## Colors",
      renderSubsection("3.1", registry),
      renderSubsection("3.2", registry),
      renderSubsection("3.4", registry),
      renderSubsection("3.10", registry),
    ].join("\n\n"),
  );

  blocks.push(`## Typography\n\n${renderSubsectionBody("3.5", registry)}`);
  blocks.push(`## Layout & Spacing\n\n${renderSubsectionBody("3.6", registry)}`);

  blocks.push(
    ["## Elevation & Depth", renderSubsection("3.3", registry), renderSubsection("3.8", registry)].join("\n\n"),
  );

  blocks.push(`## Shapes\n\n${renderSubsectionBody("3.7", registry)}`);
  blocks.push(`## Motion\n\n${renderSubsectionBody("3.9", registry)}`);
  blocks.push(`## Components\n\n${renderComponentsOverview(inventoryMd)}`);
  blocks.push(`## Do's and Don'ts\n\n${renderDosAndDonts()}`);

  return blocks.join("\n\n") + "\n";
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const PROG = basename(process.argv[1] ?? "render_design_md.ts");

function usageText(): string {
  return `usage: ${PROG} [-h] REGISTRY_JSON INVENTORY_MD OUTPUT_MD [--source <label>]`;
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(helpText() + "\n");
    process.exit(0);
  }

  let source = "";
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source") {
      source = argv[i + 1] ?? "";
      i++;
    } else if (argv[i].startsWith("--source=")) {
      source = argv[i].slice("--source=".length);
    } else {
      positional.push(argv[i]);
    }
  }
  if (positional.length !== 3) {
    argError(`expected 3 positional arguments (REGISTRY_JSON INVENTORY_MD OUTPUT_MD), got ${positional.length}`);
  }
  const [registryPath, inventoryPath, outputPath] = positional;

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

  let inventoryMd: string;
  try {
    inventoryMd = readFileSync(inventoryPath, "utf-8");
  } catch (e) {
    exitErr(`error: cannot read '${inventoryPath}': ${(e as Error).message}`);
  }

  const anyProposed =
    Object.values(registry.tokens).some((t) => t.proposed === true) ||
    registry.textStyles.some((t) => t.proposed === true);
  const caution =
    "> Note - front-matter token values are light-mode defaults and may include proposed best-practice values; the " +
    "body Source columns below are authoritative for provenance (measured vs proposed).\n";
  const legend = anyProposed
    ? "> Legend - Source: `measured` = sampled from the screenshots; `proposed` = a best-practice value supplied by the " +
      "design synthesizer (no source measurement, rationale in Notes). Review every proposed value before shipping.\n"
    : "";

  let out = `---\n${buildFrontMatter(registry)}---\n\n`;
  out += caution + "\n";
  if (anyProposed) out += legend + "\n";
  out += renderBody(registry, inventoryMd, source);
  writeFileSync(outputPath, out);

  // Self-verify: re-read the written file, assert the opening `---` and every standard heading by name.
  let written: string;
  try {
    written = readFileSync(outputPath, "utf-8");
  } catch (e) {
    exitErr(`error: self-verify failed reading back '${outputPath}': ${(e as Error).message}`);
  }
  if (!/^---\r?\n/.test(written)) {
    exitErr(`error: self-verify failed for '${outputPath}' (missing opening '---' front-matter delimiter)`);
  }
  for (const h of STANDARD_HEADINGS) {
    if (!new RegExp("^## " + escapeRegExp(h) + "\\s*$", "m").test(written)) {
      exitErr(`error: self-verify failed for '${outputPath}' (missing '## ${h}' heading)`);
    }
  }

  process.stdout.write(`DESIGN_MD_OK headings=${STANDARD_HEADINGS.join(",")} -> ${outputPath}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
