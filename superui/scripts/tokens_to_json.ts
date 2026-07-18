/* Serialize a DTCG-in-YAML token file to DTCG JSON — the vendor-neutral interchange form.

IN : argv[1] — path to dtcg.yml (read as UTF-8). Run validate_tokens.ts on it
     FIRST; this script transcribes, it does not check DTCG conformance.
     argv[2] — output path for tokens.json (written as UTF-8; parent dir must exist).
OUT: writes argv[2] with the same tree serialized as JSON — every key, every
     $-metadata entry (incl. $extensions.org.superui.dark / .synthesized /
     .provenance) and YAML document order preserved 1:1. No alias resolution,
     no value transformation, no key sorting — aliases stay "{a.b.c}" strings
     for the consuming target adapter to resolve. 2-space indent, trailing
     newline. Losslessness is asserted before the write: the parsed YAML and the
     re-parsed emitted JSON must be identical structures.
     stdout — one summary line: "<n> tokens -> <path>".
Exit codes: 0 = written; 1 = error (message on stderr: bad args,
     unreadable/unparsable input, non-string key, unserializable value,
     round-trip mismatch).
Flags: none.

Ported from tokens_to_json.py; runs under plain Node (native type stripping),
no third-party dependencies — the YAML subset parser is bundled in lib/yaml.ts.
Usage: node tokens_to_json.ts TOKENS.yaml OUTPUT.json
*/
import { readFileSync, writeFileSync } from "node:fs";
import { safeLoad, YamlFloat, YAMLError, pyFloatRepr } from "./lib/yaml.ts";
import type { YamlValue } from "./lib/yaml.ts";

function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(1);
}

/** Python repr() of a string (for paths in error messages). */
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

/** Python str()/repr() of a non-string scalar key. */
function pyScalarStr(k: unknown): string {
  if (k === null) return "None";
  if (k === true) return "True";
  if (k === false) return "False";
  if (k instanceof YamlFloat) return pyFloatRepr(k.value);
  return String(k);
}

function pyTypeName(k: unknown): string {
  if (k === null) return "NoneType";
  if (typeof k === "boolean") return "bool";
  if (k instanceof YamlFloat) return "float";
  if (typeof k === "number") return "int";
  return typeof k;
}

/** Map a Node fs error to Python's OSError message format. */
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

/** JSON object keys are always strings, so a non-string YAML key would be
 *  coerced silently (500 -> "500") and break losslessness. Reject it instead. */
function checkKeys(node: YamlValue, path: string[]): void {
  if (node instanceof Map) {
    for (const [key, child] of node) {
      if (typeof key !== "string") {
        const loc = path.join(".") || "<root>";
        fail(
          `${loc}: key ${pyScalarStr(key)} is ${pyTypeName(key)}, not a string — ` +
            `quote it in the YAML ("${pyScalarStr(key)}":)`,
        );
      }
      checkKeys(child, [...path, key]);
    }
  } else if (Array.isArray(node)) {
    node.forEach((child, i) => checkKeys(child, [...path, String(i)]));
  }
}

/** A token is any object with $value; $-prefixed keys are never groups. */
function countTokens(node: YamlValue): number {
  if (!(node instanceof Map)) return 0;
  if (node.has("$value")) return 1;
  let n = 0;
  for (const [key, child] of node) {
    if (!(key as string).startsWith("$")) n += countTokens(child);
  }
  return n;
}

/** json.dumps-compatible string escaping with ensure_ascii=False:
 *  only quote, backslash and control chars are escaped. */
function jsonEsc(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const c = s.charCodeAt(i);
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\b") out += "\\b";
    else if (ch === "\t") out += "\\t";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\f") out += "\\f";
    else if (ch === "\r") out += "\\r";
    else if (c < 0x20) out += "\\u" + c.toString(16).padStart(4, "0");
    else out += ch;
  }
  return out + '"';
}

/** json.dumps(data, indent=2, ensure_ascii=False, sort_keys=False,
 *  allow_nan=False) — document order preserved (Map iteration order). */
function dumps(v: YamlValue, level: number): string {
  if (v === null) return "null";
  if (v === true) return "true";
  if (v === false) return "false";
  if (typeof v === "number") return String(v);
  if (v instanceof YamlFloat) {
    if (!Number.isFinite(v.value)) {
      throw new Error(
        `Out of range float values are not JSON compliant: ${pyFloatRepr(v.value)}`,
      );
    }
    return pyFloatRepr(v.value);
  }
  if (typeof v === "string") return jsonEsc(v);
  const pad = "  ".repeat(level + 1);
  const closePad = "  ".repeat(level);
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    const items = v.map((x) => pad + dumps(x, level + 1));
    return "[\n" + items.join(",\n") + "\n" + closePad + "]";
  }
  if (v.size === 0) return "{}";
  const items: string[] = [];
  for (const [k, val] of v) {
    items.push(pad + jsonEsc(k as string) + ": " + dumps(val, level + 1));
  }
  return "{\n" + items.join(",\n") + "\n" + closePad + "}";
}

/** Python == between the parsed YAML tree and the reloaded JSON value:
 *  dict comparison ignores key order; ints and floats compare numerically. */
function deepEq(a: YamlValue, b: unknown): boolean {
  if (a === null) return b === null;
  if (typeof a === "boolean") return typeof b === "boolean" && a === b;
  if (typeof a === "number") return typeof b === "number" && a === b;
  if (a instanceof YamlFloat) return typeof b === "number" && a.value === b;
  if (typeof a === "string") return a === b;
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((x, i) => deepEq(x, (b as unknown[])[i]))
    );
  }
  if (typeof b !== "object" || b === null || Array.isArray(b)) return false;
  const obj = b as Record<string, unknown>;
  if (Object.keys(obj).length !== a.size) return false;
  for (const [k, val] of a) {
    if (!Object.prototype.hasOwnProperty.call(obj, k as string)) return false;
    if (!deepEq(val, obj[k as string])) return false;
  }
  return true;
}

function main(): void {
  if (process.argv.length !== 4) {
    fail("usage: tokens_to_json.ts TOKENS.yaml OUTPUT.json");
  }
  const src = process.argv[2];
  const dst = process.argv[3];

  let text: string;
  try {
    text = readFileSync(src, "utf-8");
  } catch (e) {
    fail(`cannot read ${pyReprStr(src)}: ${osErrorMsg(e as NodeJS.ErrnoException, src)}`);
  }
  let data: YamlValue;
  try {
    data = safeLoad(text, src);
  } catch (e) {
    if (e instanceof YAMLError) {
      fail(`cannot parse ${pyReprStr(src)}: ${e.message}`);
    }
    throw e;
  }
  if (!(data instanceof Map)) {
    fail("top level must be a mapping");
  }

  checkKeys(data, []);

  let out: string;
  try {
    // Document order is preserved (Map iteration order); non-finite floats
    // are rejected rather than emitting invalid JSON (allow_nan=False).
    out = dumps(data, 0) + "\n";
  } catch (e) {
    fail(`cannot serialize ${pyReprStr(src)} to JSON: ${(e as Error).message}`);
  }

  if (!deepEq(data, JSON.parse(out))) {
    fail("round-trip mismatch: the emitted JSON does not reload as the source YAML");
  }

  try {
    writeFileSync(dst, out, "utf-8");
  } catch (e) {
    fail(`cannot write ${pyReprStr(dst)}: ${osErrorMsg(e as NodeJS.ErrnoException, dst)}`);
  }
  console.log(`${countTokens(data)} tokens -> ${dst}`);
}

main();
