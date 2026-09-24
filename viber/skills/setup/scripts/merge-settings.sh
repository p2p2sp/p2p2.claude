#!/usr/bin/env bash
#
# merge-settings.sh - merges the bundled permissions template into the host
# project's .claude/settings.json key by key, idempotently.
#
# Usage:
#   merge-settings.sh <template> [<target>]
#
# template (required) - the bundled permissions template
#                       (viber/skills/setup/assets/settings.json).
# target   (optional) - the host settings file; defaults to
#                       .claude/settings.json at the repository root (the
#                       current dir outside a repository), so a run from a
#                       subdirectory never seeds a nested .claude/.
#
# Merge rules (applied by the embedded node program, only when the target
# already exists), walked recursively over every key of the template:
#   - a key the host lacks is added with the template's value.
#   - an object on both sides is merged key by key, at any depth.
#   - an array on both sides keeps the host's entries in the host's order;
#     template entries missing from it are appended at its end, each exactly
#     once. Arrays only ever gain entries.
#   - in permissions.allow, permissions.ask and permissions.deny a template
#     rule already covered by a host rule of the same list is not appended: a
#     bare `Tool` covers every `Tool(<specifier>)`, and a match-all specifier
#     (`*`, `**`, `**/*`) counts as bare, so a host carrying `Edit` never gains
#     `Edit(**/*)`, and the reverse. A narrower host rule (`Edit(src/**)`)
#     covers nothing broader, and a host rule is never removed.
#   - anything else (a scalar, or a type mismatch) takes the template's value
#     when it differs. The template wins because a project's own override
#     belongs in .claude/settings.local.json, which this merge never touches.
#   - the one removal: an entry the template carries in permissions.ask is
#     dropped from the host's permissions.deny. deny outranks ask, so a rule
#     the template moved from deny to ask would otherwise stay a hard block in
#     every project set up before the move.
#   - a key the template does not carry is never changed or removed.
#   - a semantically unchanged file is not rewritten at all, so a second run
#     leaves it byte-identical.
#   - the rewrite is atomic: the result is written to <target>.tmp and
#     renamed over the target.
#
# Output (stdout, exactly one line - plus the template body on the node-skip
# case, which is the block a user merges by hand):
#   settings.json: created from template
#   settings.json: merged - added <k> keys, <e> list entries, updated <u> values, moved <d> deny to ask
#   settings.json: already up to date
#   settings.json: node not found - merge skipped, recommended block:
#   settings.json: template missing at <path> - skipped
#   settings.json: not valid JSON - left untouched (<message>)
#   settings.json: unreadable - left untouched (<message>)
#   settings.json: write failed (<message>)
#
# Exit codes:
#   0 - merged, already up to date, created, or skipped (no node on PATH)
#   1 - template missing/unreadable, or a wrong argument count
#   2 - the target could not be read or parsed, or the write failed
#
set -u

template="${1:-}"
root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$root" ] || [ ! -d "$root" ]; then
  root="$(pwd)"
fi
target="${2:-$root/.claude/settings.json}"

if [ -z "$template" ] || [ "$#" -gt 2 ]; then
  echo "usage: merge-settings.sh <template> [<target>]" >&2
  exit 1
fi

if [ ! -r "$template" ]; then
  echo "settings.json: template missing at $template - skipped"
  exit 1
fi

# node carries the merge (JSON in, JSON out); without it the step is skipped
# with the recommended block on stdout, never guessed at with a text editor.
if ! command -v node >/dev/null 2>&1; then
  echo "settings.json: node not found - merge skipped, recommended block:"
  cat "$template"
  exit 0
fi

if [ ! -f "$target" ]; then
  mkdir -p "$(dirname "$target")" 2>/dev/null
  if cp "$template" "$target" 2>/dev/null; then
    echo "settings.json: created from template"
    exit 0
  fi
  echo "settings.json: write failed (cannot create $target)"
  exit 2
fi

node - "$template" "$target" <<'NODE'
const fs = require("node:fs");

const [templatePath, targetPath] = process.argv.slice(2);

/** One stdout line is the whole contract, so a multi-line runtime message
 *  (V8 folds a JSON snippet into its parse errors) is flattened first. */
const oneLine = (value) => String(value).replace(/\s+/g, " ").trim();
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

function stop(line, code) {
  console.log(line);
  process.exit(code);
}

let template;
try {
  template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
} catch {
  stop(`settings.json: template missing at ${templatePath} - skipped`, 1);
}

let raw;
try {
  raw = fs.readFileSync(targetPath, "utf8");
} catch (error) {
  stop(`settings.json: unreadable - left untouched (${oneLine(error.message)})`, 2);
}

let current;
try {
  current = JSON.parse(raw);
} catch (error) {
  stop(`settings.json: not valid JSON - left untouched (${oneLine(error.message)})`, 2);
}
if (!isObject(current)) {
  stop("settings.json: not valid JSON - left untouched (top-level value is not an object)", 2);
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const counts = { keys: 0, entries: 0, values: 0, moved: 0 };

const RULE_LISTS = new Set(["permissions.allow", "permissions.ask", "permissions.deny"]);
const MATCH_ALL = new Set(["*", "**", "**/*"]);

/** `Tool` or `Tool(<specifier>)` -> { tool, spec }, a match-all specifier
 *  folded to null (bare); anything else -> null. */
function parseRule(entry) {
  if (typeof entry !== "string") return null;
  const match = /^([^()\s]+)(?:\((.*)\))?$/s.exec(entry);
  if (!match) return null;
  const spec = match[2] === undefined || MATCH_ALL.has(match[2].trim()) ? null : match[2];
  return { tool: match[1], spec };
}

function covers(existing, entry) {
  const have = parseRule(existing);
  const want = parseRule(entry);
  if (!have || !want || have.tool !== want.tool) return false;
  return have.spec === null || have.spec === want.spec;
}

function mergeInto(host, tpl, prefix = "") {
  for (const [key, value] of Object.entries(tpl)) {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    if (!Object.prototype.hasOwnProperty.call(host, key)) {
      host[key] = value;
      counts.keys += 1;
    } else if (isObject(host[key]) && isObject(value)) {
      mergeInto(host[key], value, keyPath);
    } else if (Array.isArray(host[key]) && Array.isArray(value)) {
      const rules = RULE_LISTS.has(keyPath);
      for (const entry of value) {
        if (host[key].some((existing) => same(existing, entry) || (rules && covers(existing, entry)))) continue;
        host[key].push(entry);
        counts.entries += 1;
      }
    } else if (!same(host[key], value)) {
      host[key] = value;
      counts.values += 1;
    }
  }
}

mergeInto(current, template);

const asked = template.permissions?.ask;
const deny = current.permissions?.deny;
if (Array.isArray(asked) && Array.isArray(deny)) {
  const kept = deny.filter((entry) => !asked.includes(entry));
  counts.moved = deny.length - kept.length;
  current.permissions.deny = kept;
}

if (counts.keys + counts.entries + counts.values + counts.moved === 0) {
  console.log("settings.json: already up to date");
  process.exit(0);
}

const tmpPath = `${targetPath}.tmp`;
try {
  fs.writeFileSync(tmpPath, `${JSON.stringify(current, null, 2)}\n`);
  fs.renameSync(tmpPath, targetPath);
} catch (error) {
  // The tmp file is deliberately left behind: the target is untouched and the
  // merged result stays inspectable next to it.
  stop(`settings.json: write failed (${oneLine(error.message)})`, 2);
}

console.log(
  `settings.json: merged - added ${counts.keys} keys, ${counts.entries} list entries, updated ${counts.values} values, moved ${counts.moved} deny to ask`,
);
NODE
exit $?
