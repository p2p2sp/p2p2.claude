/*
 * validate_bundle.ts - validates a finished handoff bundle against
 * `registry.json` (build_registry.ts's merged token/style namespace) and the bundle's
 * own internal cross-references. Never mutates the bundle; a clean run and a
 * dirty run both leave every file untouched.
 *
 * Two mutually exclusive modes, selected by the required `--mode` flag:
 *   - design   - BUNDLE_DIR holds only `DESIGN.md` (design-extractor-builder's output). Runs checkSections +
 *     checkForbidden. REGISTRY_JSON is still a required positional (CLI uniformity across both modes) but its
 *     content is unused - no token references exist to check.
 *   - platform - BUNDLE_DIR holds a platform's satellites + `screens/` (component-extractor-builder's output,
 *     no `DESIGN.md`). Runs checkTokenRefs + checkScreenRefs + checkEffectLines + checkForbidden; checkSections
 *     is skipped entirely (there is no `DESIGN.md` to check).
 *
 * IN : BUNDLE_DIR - the bundle dir to validate (contents depend on --mode,
 *      see above). REGISTRY_JSON - the `build_registry.ts` output
 *      (`{ tokens, textStyles, ... }`); the resolution namespace a spec's
 *      token references are checked against is exactly `Object.keys(tokens)`
 *      union every `textStyles[].name`.
 * OUT: stdout - one `FINDING: <category> <detail>` line per defect found
 *      (checkTokenRefs, then checkScreenRefs, then checkEffectLines, then
 *      checkForbidden for `--mode platform`; checkSections then
 *      checkForbidden for `--mode design`), or the single line `CLEAN` when
 *      none are found.
 * Exit codes: 0 = clean bundle; 1 = BUNDLE_DIR absent/empty/not-a-directory
 *      (message on stderr naming the dir), or one-or-more findings printed
 *      (still exit 1, findings are on stdout, not an error); 2 =
 *      command-line usage errors (including a missing or unrecognised
 *      `--mode` value).
 *
 * Finding categories:
 *   - unknown-token   - (platform mode only) a backticked dotted token in
 *     `DESIGN.components.md` or `DESIGN.patterns.md` resolves against neither
 *     `tokens{}` nor `textStyles[].name`. A backtick span counts as a token
 *     reference only when it matches `<group>.<name>` (at least one dot, no
 *     whitespace, no slash) AND is not an image filename (`login.png` is
 *     exempt by extension, not by heuristic) - a bare property name (`bg`,
 *     `radius`) never contains a dot and is excluded by construction.
 *   - missing-screen  - (platform mode only) a `canonical: <filename>.png`
 *     line inside a satellite (a consolidated spec's canonical reference)
 *     names a file absent from `screens/`. References are deduplicated by
 *     exact filename first, so one absent screen cited from several specs
 *     yields exactly one finding. The literal value `none` (an invented
 *     spec's deliberate "no canonical screen" declaration, per
 *     `inventory-format.ts`'s `canonicalRefs`) is never checked against
 *     `screens/` and never yields this finding. Also fires as a fail-open
 *     backstop: a satellite carrying real spec content (at least one
 *     `## <slug>` wrapper) contributes ZERO `canonical:` lines - real or
 *     `none` - to a run whose total such-line count is zero. An entirely
 *     empty run (no spec content anywhere) stays CLEAN; content citing
 *     nothing, not even `none`, is a defect, not silence.
 *   - empty-section   - (design mode only) a standard `## ` heading in
 *     `DESIGN.md` is missing, or is followed by no non-whitespace content
 *     before the next `## ` heading or EOF. The required set is the fixed
 *     STANDARD_HEADINGS below.
 *   - forbidden-artifact - (both modes) any `*.css`, `*.js`, `*.html` or
 *     `*.json` file anywhere under BUNDLE_DIR (blanket rejection, not a name
 *     heuristic; `DESIGN.md`'s inline YAML front matter is not a file and is
 *     unaffected).
 *   - missing-effect-line - (platform mode only) a `## <slug>` block in
 *     `DESIGN.components.md` (satellites only - `DESIGN.patterns.md`
 *     describes composition, not painted surfaces, and is out of scope here)
 *     lacks a `border:`, `shadow:` or `gradient:` property line, up to one
 *     finding per missing property (three max per block). `none` is a
 *     satisfying value for any of the three - absence of an effect is a
 *     stated measurement, not an omission; only the property LINE itself is
 *     required. A block carrying all three (any value) contributes zero
 *     findings; a satellite absent or reduced to `assemble_specs.ts`'s "None
 *     catalogued." stub (no `## ` wrapper) contributes zero blocks and
 *     therefore zero findings.
 *
 * Usage: node validate_bundle.ts BUNDLE_DIR REGISTRY_JSON --mode design|platform
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CANONICAL_LINE_RE, canonicalRefs } from "./inventory-format.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FindingCategory = "unknown-token" | "missing-screen" | "empty-section" | "forbidden-artifact" | "missing-effect-line";

export interface Finding {
  category: FindingCategory;
  detail: string;
}

interface Registry {
  tokens: Record<string, unknown>;
  textStyles: { name: string }[];
}

// The fixed standard heading set DESIGN.md must carry - mirrors render_design_md.ts's STANDARD_HEADINGS.
const STANDARD_HEADINGS = [
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
// Directory walk (shared by checkForbidden)
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

/** The two consolidated satellites - the specs no longer ship as a per-entry file fan. */
function specFiles(bundleDir: string): string[] {
  return [join(bundleDir, "DESIGN.components.md"), join(bundleDir, "DESIGN.patterns.md")].filter((f) => existsSync(f));
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

/** A satellite "carries spec content" when it has at least one `## <slug>` wrapper - assemble_specs.ts's
 * empty-dir stub is a bare `# Title` + "None catalogued." line with no `## ` heading, so this excludes it. */
function hasSpecContent(content: string): boolean {
  return /^## /m.test(content);
}

export function checkScreenRefs(bundleDir: string): Finding[] {
  const cited = new Set<string>();
  const contentfulFiles: string[] = [];
  let rawCanonicalLines = 0;

  for (const file of specFiles(bundleDir)) {
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    if (hasSpecContent(content)) contentfulFiles.push(file);
    for (const filename of canonicalRefs(content)) cited.add(filename);
    // Counted separately from `cited`: a `canonical: none` line is a deliberate, no-screen declaration -
    // canonicalRefs drops it (it is never a screen reference), but it must still count as "the run engaged
    // with the canonical field" for the backstop below, or an all-invented satellite would fail-open on
    // every `## <slug>` block.
    rawCanonicalLines += (content.match(CANONICAL_LINE_RE) ?? []).length;
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

  // Fail-open backstop: zero entries across an entirely empty run is legitimately clean, but a satellite
  // that carries real spec content and still contributes zero canonical: lines (real or `none`) is a
  // defect, not silence.
  if (rawCanonicalLines === 0) {
    for (const file of contentfulFiles) {
      const rel = relative(bundleDir, file).split("\\").join("/");
      findings.push({ category: "missing-screen", detail: `${rel} carries spec content but cites no canonical screen` });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// checkSections
// ---------------------------------------------------------------------------

export function checkSections(bundleDir: string): Finding[] {
  let content: string;
  try {
    content = readFileSync(join(bundleDir, "DESIGN.md"), "utf-8");
  } catch (e) {
    return [{ category: "empty-section", detail: `DESIGN.md is missing or unreadable: ${(e as Error).message}` }];
  }
  const lines = content.split(/\r?\n/);

  // Index every `## ` heading (exactly h2, never `### ` subsections) by its title.
  const headings: { title: string; start: number }[] = [];
  lines.forEach((line, i) => {
    const m = /^## (.+?)\s*$/.exec(line);
    if (m) headings.push({ title: m[1].trim(), start: i });
  });

  const findings: Finding[] = [];
  for (const expected of STANDARD_HEADINGS) {
    const h = headings.find((x) => x.title === expected);
    if (!h) {
      findings.push({ category: "empty-section", detail: `DESIGN.md is missing the '${expected}' section` });
      continue;
    }
    let end = lines.length;
    for (const x of headings) {
      if (x.start > h.start && x.start < end) end = x.start;
    }
    const body = lines.slice(h.start + 1, end).join("\n").trim();
    if (body.length === 0) {
      findings.push({ category: "empty-section", detail: `DESIGN.md section '${expected}' has no content` });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// checkEffectLines
// ---------------------------------------------------------------------------

/** One required property per `## <slug>` block - a block missing any of these has no place for a
 * measured-or-none verdict to live. Anchored per-property so `border-radius:` never satisfies `border`. */
const EFFECT_PROPERTIES = ["border", "shadow", "gradient"] as const;

function effectLineRe(property: string): RegExp {
  return new RegExp(`^[ \\t>|*-]*\\*{0,2}${property}\\*{0,2}[ \\t]*:`, "im");
}

export function checkEffectLines(bundleDir: string): Finding[] {
  const file = join(bundleDir, "DESIGN.components.md");
  let content: string;
  try {
    content = readFileSync(file, "utf-8");
  } catch {
    return [];
  }

  const findings: Finding[] = [];
  const headingRe = /^## (.+?)\s*$/gm;
  const matches = Array.from(content.matchAll(headingRe));
  for (let i = 0; i < matches.length; i++) {
    const slug = matches[i][1].trim();
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : content.length;
    const block = content.slice(start, end);
    for (const property of EFFECT_PROPERTIES) {
      if (!effectLineRe(property).test(block)) {
        findings.push({ category: "missing-effect-line", detail: `'${slug}' is missing a '${property}:' line` });
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// checkForbidden
// ---------------------------------------------------------------------------

const FORBIDDEN_EXT_RE = /\.(css|js|html|json)$/i;

/** Blanket rejection of css/js/html/json anywhere under the bundle dir - not a name heuristic. */
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
  return `usage: ${PROG} [-h] BUNDLE_DIR REGISTRY_JSON --mode design|platform`;
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

  let mode: string | undefined;
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--mode") {
      mode = argv[i + 1];
      i++;
    } else if (argv[i].startsWith("--mode=")) {
      mode = argv[i].slice("--mode=".length);
    } else {
      positional.push(argv[i]);
    }
  }
  if (positional.length !== 2) {
    argError(`expected 2 arguments (BUNDLE_DIR REGISTRY_JSON), got ${positional.length}`);
  }
  if (mode !== "design" && mode !== "platform") {
    argError(`--mode must be 'design' or 'platform', got ${mode === undefined ? "nothing" : `'${mode}'`}`);
  }
  const [bundleDir, registryPath] = positional;

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

  const findings: Finding[] =
    mode === "design"
      ? [...checkSections(bundleDir), ...checkForbidden(bundleDir)]
      : [
          ...checkTokenRefs(bundleDir, registry),
          ...checkScreenRefs(bundleDir),
          ...checkEffectLines(bundleDir),
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
