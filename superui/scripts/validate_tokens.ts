/* Validate a DTCG-in-YAML token file.

IN : argv[1] — path to the tokens YAML file (read as UTF-8).
OUT: stdout — one "WARN  ..." line per warning, one "ERROR ..." line per error,
     then a summary line: "<n> tokens, <e> errors, <w> warnings".
Exit codes: 0 = valid (warnings allowed), 1 = errors found (or unusable input).
Flags: none.

Checks:
  - tokens have $value and a resolvable $type (own or inherited from a group)
  - token/group names don't start with '$' and contain no '.', '{', '}'
  - alias references "{a.b.c}" resolve to an existing token (no cycles),
    RECURSIVELY: every alias string nested anywhere inside a composite $value
    dict/list (typography, shadow — including layer lists — border, gradient,
    transition) is resolved; a dangling nested alias is an error
  - color values are an object with BOTH colorSpace and components (DTCG
    requires both; a bare hex is not sufficient); srgb components are 3
    numbers in 0..1; alpha in 0..1
  - dimension/duration values are {value: number, unit: str}
  - $extensions.org.superui.dark (the L1 dark-mode canon): when present on a
    token it is validated exactly like $value — same type checks and the same
    recursive alias resolution (aliases and composites allowed)

Ported from validate_tokens.py; runs under plain Node (native type stripping),
no third-party dependencies — the YAML subset parser is bundled in lib/yaml.ts.
Usage: node validate_tokens.ts TOKENS.yaml
*/
import { readFileSync } from "node:fs";
import { safeLoad, YamlFloat } from "./lib/yaml.ts";
import type { YamlValue, YamlMap } from "./lib/yaml.ts";

const ALIAS_RE = /^\{([^}]+)\}$/;
const META = new Set(["$value", "$type", "$description", "$extensions", "$deprecated"]);
const BAD_NAME = /[.{}]/;
const MISSING: unique symbol = Symbol("missing"); // sentinel: token has no dark extension

interface TokenInfo {
  type: YamlValue;
  value: YamlValue;
  dark: YamlValue | typeof MISSING;
}

const errors: string[] = [];
const warnings: string[] = [];
const tokens: Map<string, TokenInfo> = new Map(); // dotted path -> info

// Python isinstance(x, (int, float)) counts bools as ints — mirror that.
function isPyNum(v: unknown): boolean {
  return typeof v === "number" || typeof v === "boolean" || v instanceof YamlFloat;
}

function pyVal(v: unknown): number {
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v instanceof YamlFloat) return v.value;
  return v as number;
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
    // token
    if (!node.has("$type") && inheritedType === null) {
      errors.push(`${path.join(".")}: missing $type (and none inherited)`);
    }
    tokens.set(path.join("."), {
      type: nodeType,
      value: node.get("$value") as YamlValue,
      dark: darkOf(node),
    });
    for (const k of node.keys()) {
      // faithful to the Python original: a non-string key crashes here
      // (AttributeError there, TypeError here), same exit code 1
      if ((k as string).startsWith("$")) {
        if (!META.has(k as string)) {
          warnings.push(`${path.join(".")}: unknown meta key ${k}`);
        }
      } else {
        errors.push(
          `${path.join(".")}: a token with $value cannot also ` +
            `nest child '${k}' — it is silently ignored; move the ` +
            `nested tokens out of this $value node`,
        );
      }
    }
    return;
  }
  // group
  for (const [key, child] of node) {
    if ((key as string).startsWith("$")) continue;
    if (BAD_NAME.test(key as string)) {
      errors.push(`name '${key}' contains a reserved char (. { })`);
    }
    walk(child, [...path, key as string], nodeType);
  }
}

/** Follow aliases to detect cycles / dangling refs — recursively, so alias
 *  strings nested inside composite dicts/lists are resolved too. */
function resolve(path: string, value: YamlValue, seen: Set<string>): void {
  if (typeof value === "string") {
    const m = ALIAS_RE.exec(value.trim());
    if (m) {
      const target = m[1];
      if (seen.has(target)) {
        errors.push(`${path}: circular alias via ${target}`);
        return;
      }
      if (!tokens.has(target)) {
        errors.push(`${path}: alias '{${target}}' does not resolve`);
        return;
      }
      resolve(path, tokens.get(target)!.value, new Set([...seen, target]));
    }
  } else if (value instanceof Map) {
    for (const v of value.values()) resolve(path, v, seen);
  } else if (Array.isArray(value)) {
    for (const v of value) resolve(path, v, seen);
  }
}

function checkColor(path: string, v: YamlValue): void {
  if (typeof v === "string" && ALIAS_RE.test(v.trim())) return;
  if (!(v instanceof Map)) {
    errors.push(`${path}: color value must be an object or alias`);
    return;
  }
  if (!v.has("colorSpace")) {
    errors.push(`${path}: color object missing required 'colorSpace'`);
  }
  const comps = v.get("components");
  if (comps === undefined || comps === null) {
    errors.push(
      `${path}: color object missing required 'components' ` +
        `(a bare hex is not valid DTCG)`,
    );
  }
  const space = v.get("colorSpace");
  if (space === "srgb" && Array.isArray(comps)) {
    if (comps.length !== 3) {
      errors.push(`${path}: srgb needs 3 components`);
    } else if (comps.some((c) => !isPyNum(c) || pyVal(c) < 0 || pyVal(c) > 1)) {
      errors.push(`${path}: srgb components must be 0..1`);
    }
  }
  const a = v.has("alpha") ? v.get("alpha") : 1;
  if (!(isPyNum(a) && pyVal(a) >= 0 && pyVal(a) <= 1)) {
    errors.push(`${path}: alpha must be 0..1`);
  }
}

function checkDim(path: string, v: YamlValue): void {
  if (typeof v === "string" && ALIAS_RE.test(v.trim())) return;
  if (!(v instanceof Map && v.has("value") && v.has("unit"))) {
    errors.push(`${path}: dimension/duration must be {value, unit}`);
  }
}

/** Type-specific checks — shared by $value and the dark extension. */
function checkTyped(path: string, tokenType: YamlValue, value: YamlValue): void {
  if (tokenType === "color") {
    checkColor(path, value);
  } else if (tokenType === "dimension" || tokenType === "duration") {
    checkDim(path, value);
  }
}

function main(): void {
  if (process.argv.length !== 3) {
    console.error("usage: validate_tokens.ts TOKENS.yaml");
    process.exit(1);
  }
  const text = readFileSync(process.argv[2], "utf-8");
  const data = safeLoad(text, process.argv[2]);
  if (!(data instanceof Map)) {
    console.error("Top level must be a mapping");
    process.exit(1);
  }

  walk(data, [], null);

  for (const [path, info] of tokens) {
    resolve(path, info.value, new Set([path]));
    checkTyped(path, info.type, info.value);
    if (info.dark !== MISSING) {
      const dpath = `${path} ($extensions.org.superui.dark)`;
      resolve(dpath, info.dark, new Set([path]));
      checkTyped(dpath, info.type, info.dark);
    }
  }

  for (const w of warnings) console.log(`WARN  ${w}`);
  for (const e of errors) console.log(`ERROR ${e}`);
  console.log(`\n${tokens.size} tokens, ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length > 0 ? 1 : 0);
}

main();
