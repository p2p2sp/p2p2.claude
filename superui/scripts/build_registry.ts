/*
 * build_registry.ts — merges per-foundation measurement fragments
 * (`notes-<foundation>.json`, written by the foundation-analyst agents) into
 * one `registry.json`, the sole resolution namespace `render_design_md.ts`
 * and `validate_bundle.ts` (Task 3) read against. registry.json never enters
 * the handoff bundle — it is internal to `.temp/`.
 *
 * IN : INPUT_DIR — directory holding one or more `notes-*.json` fragments,
 *      each shaped `{ foundation, tokens, surfaceOrder, accentUsage,
 *      textStyles, unknowns, resolved }` (see the Task 2 Contracts block for
 *      the full per-field shape). A `foundation:"proposed"` fragment (written
 *      by the design synthesizer) carries proposed tokens/textStyles plus a
 *      `resolved` list of the unknowns those proposals cover. OUTPUT_PATH —
 *      where to write the merged `registry.json`.
 * OUT: stdout — one line on success:
 *        REGISTRY_OK tokens=<N> unknowns=<M> -> <OUTPUT_PATH>
 *      OUTPUT_PATH holds the merged registry: the same shape as a fragment
 *      minus `foundation` and `resolved`, tokens/surfaceOrder/accentUsage/
 *      textStyles concatenated in fragment-then-within-fragment order, and
 *      `unknowns` concatenated then filtered — any entry matched (by section
 *      + `what`) by some fragment's `resolved` list is dropped, so a proposed
 *      value never coexists with a `> NEEDS INPUT` for the same gap.
 * Exit codes: 0 = ok; 1 = empty/unreadable input dir, invalid JSON, a shape
 *      violation (message on stderr, naming the fragment and field), or a
 *      cross-fragment token-name collision (message names the duplicated
 *      token and both fragments); 2 = command-line usage errors.
 *
 * Validation performed by validateShape (per fragment) and detectCollisions
 * (across fragments):
 *   - no unknown top-level key;
 *   - every `tokens{}` key and every `textStyles[].name` contains a dot —
 *     checkTokenRefs (Task 3) resolves only dotted references, so a bare
 *     name would enter the registry unflagged and every spec reference to
 *     it would escape validation;
 *   - every token carries a non-empty `value` (a dark-only token, i.e. one
 *     carrying `dark` but no `value`, is rejected — it has no light
 *     counterpart to render);
 *   - a measured token carries a well-formed `evidence` object; a proposed
 *     token (`proposed:true`, a best-practice value the synthesizer supplied
 *     for a foundation="proposed" fragment) carries a non-empty `rationale`
 *     instead and its `evidence` is stored null — the two provenances are
 *     mutually exclusive per token;
 *   - a token in section "3.2" carries non-empty `primitive` and `usedFor`
 *     (both stay optional for every other section);
 *   - after merging, every `accentUsage[].token` names a key already
 *     present in the merged `tokens{}`.
 * A duplicate key WITHIN one fragment is deliberately not detectable:
 * `tokens` is a JSON object keyed by name, so `JSON.parse` silently keeps
 * the last occurrence. Only cross-fragment collisions are observable, and
 * detectCollisions covers exactly those.
 *
 * Usage: node build_registry.ts INPUT_DIR OUTPUT_PATH
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EvidenceMethod = "points" | "regions" | "geometry" | "reference";

export interface Evidence {
  screen: string;
  method: EvidenceMethod;
  detail: string;
}

export interface TokenEntry {
  value: string;
  dark: string | null;
  type: string;
  section: string; // "3.1".."3.9"
  primitive: string | null;
  usedFor: string | null;
  evidence: Evidence | null; // null only for a proposed token (no pixel evidence exists)
  notes: string | null;
  proposed: boolean; // true = a best-practice value the synthesizer proposed, not a measured one
  rationale: string | null; // why the proposed value — required when `proposed`, else null
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
  proposed: boolean; // true = a best-practice type style the synthesizer proposed, not a measured one
  rationale: string | null; // why the proposed style — required when `proposed`, else null
}

export interface UnknownEntry {
  what: string;
  reason: string;
  section: string;
}

export interface Fragment {
  foundation: string;
  tokens: Record<string, TokenEntry>;
  surfaceOrder: SurfaceOrderEntry[];
  accentUsage: AccentUsageEntry[];
  textStyles: TextStyleEntry[];
  unknowns: UnknownEntry[];
  resolved: UnknownEntry[]; // unknowns (from any fragment) this fragment's proposed values cover; dropped from merged unknowns
}

export interface Registry {
  tokens: Record<string, TokenEntry>;
  surfaceOrder: SurfaceOrderEntry[];
  accentUsage: AccentUsageEntry[];
  textStyles: TextStyleEntry[];
  unknowns: UnknownEntry[];
}

interface NamedFragment {
  filename: string;
  data: Fragment;
}

export interface Collision {
  token: string;
  fragments: [string, string];
}

// ---------------------------------------------------------------------------
// Shape validation
// ---------------------------------------------------------------------------

export class ShapeError extends Error {}

const ALLOWED_TOP_KEYS = ["foundation", "tokens", "surfaceOrder", "accentUsage", "textStyles", "unknowns", "resolved"];
const ALLOWED_FOUNDATIONS = ["colors", "typography", "dimensions", "effects-motion", "proposed"];
const ALLOWED_METHODS: EvidenceMethod[] = ["points", "regions", "geometry", "reference"];
const TOKEN_SECTION_RE = /^3\.[1-9]$/;
const UNKNOWN_SECTION_RE = /^3\.(?:[1-9]|10)$/;

function isDotted(name: string): boolean {
  return typeof name === "string" && name.includes(".") && !name.startsWith(".") && !name.endsWith(".");
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function validateToken(name: string, raw: unknown, filename: string): TokenEntry {
  if (!isDotted(name)) {
    throw new ShapeError(`${filename}: token name '${name}' is not dotted (needs a '<group>.<name>' form)`);
  }
  if (!isPlainObject(raw)) {
    throw new ShapeError(`${filename}: token '${name}' must be an object`);
  }
  const entry = raw as Record<string, unknown>;
  if (!nonEmptyString(entry.value)) {
    const darkNote = entry.dark ? " (carries 'dark' but no light 'value' — a dark-only token has no light counterpart to render)" : "";
    throw new ShapeError(`${filename}: token '${name}' is missing 'value'${darkNote}`);
  }
  if (entry.dark !== undefined && entry.dark !== null && typeof entry.dark !== "string") {
    throw new ShapeError(`${filename}: token '${name}' has a non-string 'dark'`);
  }
  if (!nonEmptyString(entry.type)) {
    throw new ShapeError(`${filename}: token '${name}' is missing 'type'`);
  }
  if (!nonEmptyString(entry.section) || !TOKEN_SECTION_RE.test(entry.section)) {
    throw new ShapeError(`${filename}: token '${name}' has an invalid 'section' (${String(entry.section)})`);
  }
  if (entry.proposed !== undefined && typeof entry.proposed !== "boolean") {
    throw new ShapeError(`${filename}: token '${name}' has a non-boolean 'proposed'`);
  }
  const proposed = entry.proposed === true;
  if (entry.rationale !== undefined && entry.rationale !== null && typeof entry.rationale !== "string") {
    throw new ShapeError(`${filename}: token '${name}' has a non-string 'rationale'`);
  }
  // A proposed token carries a rationale in place of pixel evidence; a measured token carries evidence.
  let evidence: Evidence | null = null;
  if (proposed) {
    if (!nonEmptyString(entry.rationale)) {
      throw new ShapeError(`${filename}: token '${name}' is proposed and is missing 'rationale'`);
    }
  } else {
    if (!isPlainObject(entry.evidence)) {
      throw new ShapeError(`${filename}: token '${name}' is missing 'evidence'`);
    }
    const ev = entry.evidence as Record<string, unknown>;
    if (!nonEmptyString(ev.screen)) {
      throw new ShapeError(`${filename}: token '${name}' evidence is missing 'screen'`);
    }
    if (!ALLOWED_METHODS.includes(ev.method as EvidenceMethod)) {
      throw new ShapeError(`${filename}: token '${name}' evidence has an invalid 'method' (${String(ev.method)})`);
    }
    if (!nonEmptyString(ev.detail)) {
      throw new ShapeError(`${filename}: token '${name}' evidence is missing 'detail'`);
    }
    evidence = { screen: ev.screen as string, method: ev.method as EvidenceMethod, detail: ev.detail as string };
  }
  if (entry.primitive !== undefined && entry.primitive !== null && typeof entry.primitive !== "string") {
    throw new ShapeError(`${filename}: token '${name}' has a non-string 'primitive'`);
  }
  if (entry.usedFor !== undefined && entry.usedFor !== null && typeof entry.usedFor !== "string") {
    throw new ShapeError(`${filename}: token '${name}' has a non-string 'usedFor'`);
  }
  if (entry.section === "3.2") {
    if (!nonEmptyString(entry.primitive)) {
      throw new ShapeError(`${filename}: token '${name}' is in section 3.2 and is missing 'primitive'`);
    }
    if (!nonEmptyString(entry.usedFor)) {
      throw new ShapeError(`${filename}: token '${name}' is in section 3.2 and is missing 'usedFor'`);
    }
  }
  if (entry.notes !== undefined && entry.notes !== null && typeof entry.notes !== "string") {
    throw new ShapeError(`${filename}: token '${name}' has a non-string 'notes'`);
  }
  return {
    value: entry.value as string,
    dark: (entry.dark as string | null) ?? null,
    type: entry.type as string,
    section: entry.section as string,
    primitive: (entry.primitive as string | null) ?? null,
    usedFor: (entry.usedFor as string | null) ?? null,
    evidence,
    notes: (entry.notes as string | null) ?? null,
    proposed,
    rationale: (entry.rationale as string | null) ?? null,
  };
}

function validateSurfaceOrder(raw: unknown, filename: string): SurfaceOrderEntry[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new ShapeError(`${filename}: 'surfaceOrder' must be an array`);
  return raw.map((item, i) => {
    if (!isPlainObject(item)) throw new ShapeError(`${filename}: surfaceOrder[${i}] must be an object`);
    if (!nonEmptyString(item.region)) throw new ShapeError(`${filename}: surfaceOrder[${i}] is missing 'region'`);
    if (!nonEmptyString(item.hex)) throw new ShapeError(`${filename}: surfaceOrder[${i}] is missing 'hex'`);
    if (typeof item.luminance !== "number") throw new ShapeError(`${filename}: surfaceOrder[${i}] is missing 'luminance'`);
    if (typeof item.rank !== "number") throw new ShapeError(`${filename}: surfaceOrder[${i}] is missing 'rank'`);
    return { region: item.region, hex: item.hex, luminance: item.luminance, rank: item.rank } as SurfaceOrderEntry;
  });
}

function validateAccentUsage(raw: unknown, filename: string): AccentUsageEntry[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new ShapeError(`${filename}: 'accentUsage' must be an array`);
  return raw.map((item, i) => {
    if (!isPlainObject(item)) throw new ShapeError(`${filename}: accentUsage[${i}] must be an object`);
    if (!nonEmptyString(item.screen)) throw new ShapeError(`${filename}: accentUsage[${i}] is missing 'screen'`);
    if (!nonEmptyString(item.where)) throw new ShapeError(`${filename}: accentUsage[${i}] is missing 'where'`);
    if (!nonEmptyString(item.token)) throw new ShapeError(`${filename}: accentUsage[${i}] is missing 'token'`);
    return { screen: item.screen, where: item.where, token: item.token } as AccentUsageEntry;
  });
}

function validateTextStyles(raw: unknown, filename: string): TextStyleEntry[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new ShapeError(`${filename}: 'textStyles' must be an array`);
  return raw.map((item, i) => {
    if (!isPlainObject(item)) throw new ShapeError(`${filename}: textStyles[${i}] must be an object`);
    if (!nonEmptyString(item.name) || !isDotted(item.name)) {
      throw new ShapeError(`${filename}: textStyles[${i}].name '${String(item.name)}' is not dotted (needs a '<group>.<name>' form)`);
    }
    if (!nonEmptyString(item.family)) throw new ShapeError(`${filename}: textStyles[${i}] is missing 'family'`);
    if (!nonEmptyString(item.size)) throw new ShapeError(`${filename}: textStyles[${i}] is missing 'size'`);
    if (typeof item.weight !== "number") throw new ShapeError(`${filename}: textStyles[${i}] is missing 'weight'`);
    if (typeof item.lineHeight !== "number") throw new ShapeError(`${filename}: textStyles[${i}] is missing 'lineHeight'`);
    if (!nonEmptyString(item.letterSpacing)) throw new ShapeError(`${filename}: textStyles[${i}] is missing 'letterSpacing'`);
    if (!nonEmptyString(item.usedFor)) throw new ShapeError(`${filename}: textStyles[${i}] is missing 'usedFor'`);
    if (item.proposed !== undefined && typeof item.proposed !== "boolean") {
      throw new ShapeError(`${filename}: textStyles[${i}] has a non-boolean 'proposed'`);
    }
    const proposed = item.proposed === true;
    if (item.rationale !== undefined && item.rationale !== null && typeof item.rationale !== "string") {
      throw new ShapeError(`${filename}: textStyles[${i}] has a non-string 'rationale'`);
    }
    if (proposed && !nonEmptyString(item.rationale)) {
      throw new ShapeError(`${filename}: textStyles[${i}] is proposed and is missing 'rationale'`);
    }
    return {
      name: item.name,
      family: item.family,
      size: item.size,
      weight: item.weight,
      lineHeight: item.lineHeight,
      letterSpacing: item.letterSpacing,
      usedFor: item.usedFor,
      proposed,
      rationale: (item.rationale as string | null) ?? null,
    } as TextStyleEntry;
  });
}

function validateUnknowns(raw: unknown, filename: string): UnknownEntry[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new ShapeError(`${filename}: 'unknowns' must be an array`);
  return raw.map((item, i) => {
    if (!isPlainObject(item)) throw new ShapeError(`${filename}: unknowns[${i}] must be an object`);
    if (!nonEmptyString(item.what)) throw new ShapeError(`${filename}: unknowns[${i}] is missing 'what'`);
    if (!nonEmptyString(item.reason)) throw new ShapeError(`${filename}: unknowns[${i}] is missing 'reason'`);
    if (!nonEmptyString(item.section) || !UNKNOWN_SECTION_RE.test(item.section)) {
      throw new ShapeError(`${filename}: unknowns[${i}] has an invalid 'section' (${String(item.section)})`);
    }
    return { what: item.what, reason: item.reason, section: item.section } as UnknownEntry;
  });
}

/** Validates one parsed fragment against the Task 2 fragment contract; throws ShapeError on any violation. */
export function validateShape(raw: unknown, filename: string): Fragment {
  if (!isPlainObject(raw)) {
    throw new ShapeError(`${filename}: fragment must be a JSON object`);
  }
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_TOP_KEYS.includes(key)) {
      throw new ShapeError(`${filename}: unknown top-level key '${key}'`);
    }
  }
  if (!nonEmptyString(raw.foundation) || !ALLOWED_FOUNDATIONS.includes(raw.foundation)) {
    throw new ShapeError(`${filename}: 'foundation' must be one of ${ALLOWED_FOUNDATIONS.join("|")}`);
  }
  const tokensRaw = raw.tokens ?? {};
  if (!isPlainObject(tokensRaw)) {
    throw new ShapeError(`${filename}: 'tokens' must be an object`);
  }
  const tokens: Record<string, TokenEntry> = {};
  for (const [name, entry] of Object.entries(tokensRaw)) {
    tokens[name] = validateToken(name, entry, filename);
  }
  return {
    foundation: raw.foundation,
    tokens,
    surfaceOrder: validateSurfaceOrder(raw.surfaceOrder, filename),
    accentUsage: validateAccentUsage(raw.accentUsage, filename),
    textStyles: validateTextStyles(raw.textStyles, filename),
    unknowns: validateUnknowns(raw.unknowns, filename),
    resolved: validateUnknowns(raw.resolved, filename),
  };
}

// ---------------------------------------------------------------------------
// Collision detection + merge
// ---------------------------------------------------------------------------

/** Cross-fragment token-name collisions only — a same-fragment duplicate is unobservable after JSON.parse. */
export function detectCollisions(fragments: NamedFragment[]): Collision[] {
  const seen = new Map<string, string>();
  const collisions: Collision[] = [];
  for (const { filename, data } of fragments) {
    for (const name of Object.keys(data.tokens)) {
      const prev = seen.get(name);
      if (prev !== undefined) {
        collisions.push({ token: name, fragments: [prev, filename] });
      } else {
        seen.set(name, filename);
      }
    }
  }
  return collisions;
}

/** Stable key for matching a `resolved` entry against an `unknowns` entry — section plus the `what` text. */
function unknownKey(u: UnknownEntry): string {
  return `${u.section} ${u.what}`;
}

/**
 * Merges validated fragments into one registry, preserving insertion order per section. Any merged `unknowns`
 * entry a fragment lists under `resolved` (matched by section + `what`) is dropped — a proposed value now
 * covers it, so it must not also render as `> NEEDS INPUT`.
 */
export function mergeFragments(fragments: NamedFragment[]): Registry {
  const tokens: Record<string, TokenEntry> = {};
  const surfaceOrder: SurfaceOrderEntry[] = [];
  const accentUsage: AccentUsageEntry[] = [];
  const textStyles: TextStyleEntry[] = [];
  const unknowns: UnknownEntry[] = [];
  const resolvedKeys = new Set<string>();
  for (const { data } of fragments) {
    Object.assign(tokens, data.tokens);
    surfaceOrder.push(...data.surfaceOrder);
    accentUsage.push(...data.accentUsage);
    textStyles.push(...data.textStyles);
    unknowns.push(...data.unknowns);
    for (const r of data.resolved) resolvedKeys.add(unknownKey(r));
  }
  const filteredUnknowns = unknowns.filter((u) => !resolvedKeys.has(unknownKey(u)));
  return { tokens, surfaceOrder, accentUsage, textStyles, unknowns: filteredUnknowns };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const PROG = basename(process.argv[1] ?? "build_registry.ts");

function usageText(): string {
  return `usage: ${PROG} [-h] INPUT_DIR OUTPUT_PATH`;
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
    argError(`expected 2 arguments (INPUT_DIR OUTPUT_PATH), got ${argv.length}`);
  }
  const [inputDir, outputPath] = argv;

  let filenames: string[];
  try {
    filenames = readdirSync(inputDir)
      .filter((f) => /^notes-.*\.json$/.test(f))
      .sort();
  } catch (e) {
    exitErr(`error: cannot read input dir '${inputDir}': ${(e as Error).message}`);
  }
  if (filenames.length === 0) {
    exitErr(`error: no notes-*.json fragments found in '${inputDir}'`);
  }

  const fragments: NamedFragment[] = [];
  for (const filename of filenames) {
    const full = join(inputDir, filename);
    let raw: string;
    try {
      raw = readFileSync(full, "utf-8");
    } catch (e) {
      exitErr(`error: cannot read '${full}': ${(e as Error).message}`);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      exitErr(`error: '${filename}' is not valid JSON: ${(e as Error).message}`);
    }
    try {
      fragments.push({ filename, data: validateShape(parsed, filename) });
    } catch (e) {
      if (e instanceof ShapeError) exitErr(`error: ${e.message}`);
      throw e;
    }
  }

  const collisions = detectCollisions(fragments);
  if (collisions.length > 0) {
    for (const c of collisions) {
      process.stderr.write(`error: token '${c.token}' is declared in both '${c.fragments[0]}' and '${c.fragments[1]}'\n`);
    }
    process.exit(1);
  }

  const merged = mergeFragments(fragments);
  for (const au of merged.accentUsage) {
    if (!Object.hasOwn(merged.tokens, au.token)) {
      exitErr(`error: accentUsage entry (screen '${au.screen}') references unknown token '${au.token}'`);
    }
  }

  const tokenCount = Object.keys(merged.tokens).length;
  const unknownCount = merged.unknowns.length;
  writeFileSync(outputPath, JSON.stringify(merged, null, 2) + "\n");

  // Self-verify: re-read the written file and re-count rather than trust the write.
  let reread: Registry;
  try {
    reread = JSON.parse(readFileSync(outputPath, "utf-8")) as Registry;
  } catch (e) {
    exitErr(`error: self-verify failed reading back '${outputPath}': ${(e as Error).message}`);
  }
  const rereadTokenCount = Object.keys(reread.tokens ?? {}).length;
  const rereadUnknownCount = (reread.unknowns ?? []).length;
  if (rereadTokenCount !== tokenCount || rereadUnknownCount !== unknownCount) {
    exitErr(
      `error: self-verify failed for '${outputPath}' (wrote tokens=${tokenCount} unknowns=${unknownCount}, ` +
        `read back tokens=${rereadTokenCount} unknowns=${rereadUnknownCount})`,
    );
  }

  process.stdout.write(`REGISTRY_OK tokens=${tokenCount} unknowns=${unknownCount} -> ${outputPath}\n`);
}

main();
