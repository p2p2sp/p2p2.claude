/* Deterministically transform a validated DTCG-in-YAML token file into tokens.css.

IN : argv[1] — path to dtcg.yml (read as UTF-8). Run
     validate_tokens.ts on it FIRST; this script assumes a well-formed tree
     but still fails hard on any alias it cannot resolve.
     argv[2] — output path for tokens.css (written as UTF-8; parent dir must exist).
OUT: writes argv[2] with:
     - :root { ... } — one flat custom property per token (primitives AND
       semantic/component), in YAML order. Property name = token path with
       dots replaced by hyphens, prefixed "--" (color.surface.base ->
       --color-surface-base). Alias values emit var(--target-path). Shadow /
       border / transition composites emit one usable CSS value (nested
       aliases become var(--...)). Typography and gradient composites emit as
       CSS comments — their parts already exist as tokens, so markup consumes
       the parts directly (gradients also lack a direction in DTCG).
     - .dark { ... } — one override per token carrying
       $extensions.org.superui.dark (the L1 dark-mode canon), rendered exactly
       like $value. When no token carries a dark value, the block is a TODO
       scaffold comment.
     stdout — one summary line: "<n> declarations, <m> dark overrides -> <path>".
Exit codes: 0 = written; 1 = error (message on stderr: bad args,
     unreadable input, unresolvable alias, unrenderable value).
Flags: none.

Ported from tokens_to_css.py; runs under plain Node (native type stripping),
no third-party dependencies — the YAML subset parser is bundled in lib/yaml.ts.
Usage: node tokens_to_css.ts TOKENS.yaml OUTPUT.css
*/
import { readFileSync, writeFileSync } from "node:fs";
import { safeLoad, YamlFloat, pyFloatRepr } from "./lib/yaml.ts";
import type { YamlValue, YamlMap } from "./lib/yaml.ts";

const ALIAS_RE = /^\{([^}]+)\}$/;
const IDENT_RE = /^-?[A-Za-z_][A-Za-z0-9_-]*$/;
const MISSING: unique symbol = Symbol("missing");

interface TokenInfo {
  type: YamlValue;
  value: YamlValue;
  dark: YamlValue | typeof MISSING;
}

const tokens: Map<string, TokenInfo> = new Map(); // dotted path -> info

function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function pyReprStr(s: string): string {
  const q = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = q;
  for (const ch of s) {
    if (ch === "\\" || ch === q) out += "\\" + ch;
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else out += ch;
  }
  return out + q;
}

function osErrorMsg(e: NodeJS.ErrnoException, path: string): string {
  const table: Record<string, [number, string]> = {
    ENOENT: [2, "No such file or directory"],
    EACCES: [13, "Permission denied"],
    ENOTDIR: [20, "Not a directory"],
    EISDIR: [21, "Is a directory"],
  };
  const hit = e.code !== undefined ? table[e.code] : undefined;
  if (hit) return `[Errno ${hit[0]}] ${hit[1]}: ${pyReprStr(path)}`;
  return e.message;
}

// Python isinstance(x, (int, float)) counts bools as ints — mirror that.
function isPyNum(v: unknown): boolean {
  return typeof v === "number" || typeof v === "boolean" || v instanceof YamlFloat;
}

function pyVal(v: unknown): number {
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v instanceof YamlFloat) return v.value;
  return v as number;
}

/** Python str() for the value shapes this script can meet. */
function pyStr(v: unknown): string {
  if (v === undefined || v === null) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (v instanceof YamlFloat) return pyFloatRepr(v.value);
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  return pyReprValue(v); // Python str(list/dict) == repr(list/dict)
}

function pyReprValue(v: unknown): string {
  if (v === undefined || v === null) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (v instanceof YamlFloat) return pyFloatRepr(v.value);
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return pyReprStr(v);
  if (Array.isArray(v)) return "[" + v.map(pyReprValue).join(", ") + "]";
  if (v instanceof Map) {
    const parts: string[] = [];
    for (const [k, val] of v) parts.push(`${pyReprValue(k)}: ${pyReprValue(val)}`);
    return "{" + parts.join(", ") + "}";
  }
  return String(v);
}

/** Python truthiness for the shapes met here. */
function pyTruthy(v: unknown): boolean {
  if (v === undefined || v === null || v === false) return false;
  if (v === true) return true;
  if (typeof v === "number") return v !== 0;
  if (v instanceof YamlFloat) return v.value !== 0;
  if (typeof v === "string") return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof Map) return v.size > 0;
  return true;
}

/** Python round() — banker's rounding (half to even). */
function pyRound(x: number): number {
  const f = Math.floor(x);
  if (x - f === 0.5) return f % 2 === 0 ? f : f + 1;
  return Math.round(x);
}

/** Python f"{n:02x}" (lowercase hex, zero-padded to width 2 incl. sign). */
function hex02(n: number): string {
  const s = (n < 0 ? "-" : "") + Math.abs(n).toString(16);
  return s.padStart(2, "0");
}

function cssName(path: string): string {
  return "--" + path.replace(/\./g, "-");
}

function darkOf(node: YamlMap): YamlValue | typeof MISSING {
  const ext = node.get("$extensions");
  if (ext instanceof Map) {
    const org = ext.get("org.superui");
    if (org instanceof Map && org.has("dark")) {
      return org.get("dark") as YamlValue;
    }
  }
  return MISSING;
}

function walk(node: YamlValue, path: string[], inheritedType: YamlValue): void {
  if (!(node instanceof Map)) return;
  const nodeType = node.has("$type") ? (node.get("$type") as YamlValue) : inheritedType;
  if (node.has("$value")) {
    tokens.set(path.join("."), {
      type: nodeType,
      value: node.get("$value") as YamlValue,
      dark: darkOf(node),
    });
    return;
  }
  for (const [key, child] of node) {
    // faithful to the Python original: a non-string key crashes here
    if ((key as string).startsWith("$")) continue;
    walk(child, [...path, key as string], nodeType);
  }
}

/** Return var(--...) when v is an alias string, else null. */
function aliasVar(path: string, v: unknown): string | null {
  if (typeof v === "string") {
    const m = ALIAS_RE.exec(v.trim());
    if (m) {
      const target = m[1];
      if (!tokens.has(target)) {
        fail(`${path}: alias '{${target}}' does not resolve`);
      }
      return `var(${cssName(target)})`;
    }
  }
  return null;
}

function num(x: unknown): string {
  if (isPyNum(x)) {
    const v = pyVal(x);
    if (Number.isFinite(v) && v === Math.trunc(v)) {
      // Python str(int(x)) — exact digits even beyond 1e21
      return Math.abs(v) >= 1e21 ? BigInt(v).toString() : String(Math.trunc(v));
    }
  }
  return pyStr(x);
}

function cssColor(path: string, v: unknown): string {
  const a0 = aliasVar(path, v);
  if (a0) return a0;
  if (!(v instanceof Map)) {
    fail(`${path}: color value must be an object or alias`);
  }
  const alpha = v.has("alpha") ? v.get("alpha") : 1;
  const alphaIsOne = isPyNum(alpha) && pyVal(alpha) === 1;
  const comps = v.get("components");
  const space = v.has("colorSpace") ? v.get("colorSpace") : "srgb";
  if (space === "srgb") {
    if (alphaIsOne && typeof v.get("hex") === "string") {
      return v.get("hex") as string;
    }
    if (!(Array.isArray(comps) && comps.length === 3)) {
      fail(`${path}: srgb color needs 3 components`);
    }
    const [r, g, b] = comps.map((c) => pyRound(pyVal(c) * 255));
    if (alphaIsOne) {
      return `#${hex02(r)}${hex02(g)}${hex02(b)}`;
    }
    return `rgb(${r} ${g} ${b} / ${num(alpha)})`;
  }
  if (!Array.isArray(comps)) {
    fail(`${path}: color needs a components list`);
  }
  const c = comps.map((x) => num(x)).join(" ");
  return alphaIsOne ? `color(${pyStr(space)} ${c})` : `color(${pyStr(space)} ${c} / ${num(alpha)})`;
}

function cssDim(path: string, v: unknown): string {
  const a = aliasVar(path, v);
  if (a) return a;
  if (!(v instanceof Map && v.has("value") && v.has("unit"))) {
    fail(`${path}: dimension/duration must be {value, unit} or alias`);
  }
  return `${num(v.get("value"))}${pyStr(v.get("unit"))}`;
}

function cssFontFamily(path: string, v: unknown): string {
  const a = aliasVar(path, v);
  if (a) return a;
  const fams = Array.isArray(v) ? v : [v];
  const out: string[] = [];
  for (const f0 of fams) {
    const f = pyStr(f0);
    out.push(IDENT_RE.test(f) ? f : `"${f}"`);
  }
  return out.join(", ");
}

function cssBezier(path: string, v: unknown): string {
  const a = aliasVar(path, v);
  if (a) return a;
  if (typeof v === "string") return v; // keyword like ease-in-out
  if (!(Array.isArray(v) && v.length === 4)) {
    fail(`${path}: cubicBezier must be 4 numbers, a keyword, or an alias`);
  }
  return `cubic-bezier(${v.map((x) => num(x)).join(", ")})`;
}

function cssShadow(path: string, v: unknown): string {
  const a = aliasVar(path, v);
  if (a) return a;
  const layers = Array.isArray(v) ? v : [v];
  const parts: string[] = [];
  for (const layer of layers) {
    const la = aliasVar(path, layer);
    if (la) {
      parts.push(la);
      continue;
    }
    if (!(layer instanceof Map)) {
      fail(`${path}: shadow layer must be an object or alias`);
    }
    const bits: string[] = [];
    if (pyTruthy(layer.get("inset"))) bits.push("inset");
    for (const k of ["offsetX", "offsetY", "blur", "spread"]) {
      const d = layer.has(k)
        ? layer.get(k)
        : new Map<string, YamlValue>([
            ["value", 0],
            ["unit", "px"],
          ]);
      bits.push(cssDim(path, d));
    }
    bits.push(cssColor(path, layer.has("color") ? layer.get("color") : null));
    parts.push(bits.join(" "));
  }
  return parts.join(", ");
}

function cssBorder(path: string, v: unknown): string {
  const a = aliasVar(path, v);
  if (a) return a;
  if (!(v instanceof Map)) {
    fail(`${path}: border must be an object or alias`);
  }
  const style = v.has("style") ? v.get("style") : "solid";
  if (typeof style !== "string") {
    fail(`${path}: strokeStyle objects are not CSS-representable; use a keyword`);
  }
  return (
    `${cssDim(path, v.has("width") ? v.get("width") : null)} ${style} ` +
    `${cssColor(path, v.has("color") ? v.get("color") : null)}`
  );
}

function cssTransition(path: string, v: unknown): string {
  const a = aliasVar(path, v);
  if (a) return a;
  if (!(v instanceof Map)) {
    fail(`${path}: transition must be an object or alias`);
  }
  const bits = [cssDim(path, v.has("duration") ? v.get("duration") : null)];
  const tf = v.has("timingFunction") ? v.get("timingFunction") : null;
  if (tf !== null && tf !== undefined) {
    bits.push(cssBezier(path, tf));
  }
  const delay = v.has("delay") ? v.get("delay") : null;
  if (delay !== null && delay !== undefined) {
    bits.push(cssDim(path, delay));
  }
  return bits.join(" ");
}

/** Render one composite sub-part for a comment (typography / gradient). */
function subValue(path: string, k: unknown, v: unknown): string {
  const a = aliasVar(path, v);
  if (a) return a;
  if (v instanceof Map && v.has("value") && v.has("unit")) {
    return cssDim(path, v);
  }
  if (v instanceof Map && (v.has("colorSpace") || v.has("hex"))) {
    return cssColor(path, v);
  }
  if (Array.isArray(v)) {
    return v.map((x) => pyStr(x)).join(", ");
  }
  return isPyNum(v) ? num(v) : pyStr(v);
}

function typographyComment(path: string, v: unknown): string {
  if (!(v instanceof Map)) {
    fail(`${path}: typography must be an object`);
  }
  const parts: string[] = [];
  for (const [k, sv] of v) {
    parts.push(`${pyStr(k)}: ${subValue(path, k, sv)}`);
  }
  return `/* typography ${path}: ${parts.join("; ")} */`;
}

function gradientComment(path: string, v: unknown): string {
  if (!Array.isArray(v)) {
    fail(`${path}: gradient must be a list of stops`);
  }
  const stops = v
    .map((s) => {
      const m = s as YamlMap; // a non-mapping stop crashes, like Python's s.get
      const color = m.has("color") ? m.get("color") : null;
      const position = m.has("position") ? m.get("position") : 0;
      return `${subValue(path, "color", color)} ${num(position)}`;
    })
    .join(", ");
  return `/* gradient ${path}: stops [${stops}] — direction is usage-specific */`;
}

/** Return ['decl', css_value] or ['comment', text]. */
function render(path: string, tokenType: YamlValue, v: YamlValue): [string, string] {
  const a = aliasVar(path, v);
  if (a) return ["decl", a];
  if (tokenType === "color") return ["decl", cssColor(path, v)];
  if (tokenType === "dimension" || tokenType === "duration") {
    return ["decl", cssDim(path, v)];
  }
  if (tokenType === "number" || tokenType === "fontWeight") {
    if (isPyNum(v)) return ["decl", num(v)];
    return ["decl", pyStr(v)]; // fontWeight keyword
  }
  if (tokenType === "fontFamily") return ["decl", cssFontFamily(path, v)];
  if (tokenType === "cubicBezier") return ["decl", cssBezier(path, v)];
  if (tokenType === "shadow") return ["decl", cssShadow(path, v)];
  if (tokenType === "border") return ["decl", cssBorder(path, v)];
  if (tokenType === "transition") return ["decl", cssTransition(path, v)];
  if (tokenType === "typography") return ["comment", typographyComment(path, v)];
  if (tokenType === "gradient") return ["comment", gradientComment(path, v)];
  if (isPyNum(v) || typeof v === "string") {
    return ["decl", isPyNum(v) ? num(v) : v];
  }
  fail(`${path}: cannot render $type ${pyReprValue(tokenType)} to CSS`);
}

function main(): void {
  if (process.argv.length !== 4) {
    fail("usage: tokens_to_css.ts TOKENS.yaml OUTPUT.css");
  }
  let text: string;
  try {
    text = readFileSync(process.argv[2], "utf-8");
  } catch (e) {
    fail(
      `cannot read ${pyReprStr(process.argv[2])}: ${osErrorMsg(e as NodeJS.ErrnoException, process.argv[2])}`,
    );
  }
  const data = safeLoad(text, process.argv[2]);
  if (!(data instanceof Map)) {
    fail("top level must be a mapping");
  }

  walk(data, [], null);

  const rootLines: string[] = [];
  const darkLinesArr: string[] = [];
  let nDecl = 0;
  let nDark = 0;
  for (const [path, info] of tokens) {
    const [kind, textVal] = render(path, info.type, info.value);
    if (kind === "decl") {
      rootLines.push(`  ${cssName(path)}: ${textVal};`);
      nDecl += 1;
    } else {
      rootLines.push(`  ${textVal}`);
    }
    if (info.dark !== MISSING) {
      const [dkind, dtext] = render(`${path} (dark)`, info.type, info.dark);
      if (dkind === "decl") {
        darkLinesArr.push(`  ${cssName(path)}: ${dtext};`);
        nDark += 1;
      } else {
        darkLinesArr.push(`  ${dtext}`);
      }
    }
  }

  let darkLines = darkLinesArr;
  if (darkLines.length === 0) {
    darkLines = [
      "  /* TODO: no dark values captured — add " +
        "$extensions.org.superui.dark to the tokens that differ " +
        "and re-run tokens_to_css.ts */",
    ];
  }

  const out = [
    "/* tokens.css — GENERATED from dtcg.yml by",
    "   superui/scripts/tokens_to_css.ts. Do not edit by hand;",
    "   edit the YAML and re-run. */",
    "",
    ":root {",
    ...rootLines,
    "}",
    "",
    ".dark {",
    ...darkLines,
    "}",
    "",
  ].join("\n");
  try {
    writeFileSync(process.argv[3], out, "utf-8");
  } catch (e) {
    fail(
      `cannot write ${pyReprStr(process.argv[3])}: ${osErrorMsg(e as NodeJS.ErrnoException, process.argv[3])}`,
    );
  }
  console.log(`${nDecl} declarations, ${nDark} dark overrides -> ${process.argv[3]}`);
}

main();
