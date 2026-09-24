#!/usr/bin/env bash
#
# merge-settings.sh - merges the bundled permissions template into the host
# project's .claude/settings.json, additively and idempotently.
#
# Usage:
#   merge-settings.sh <template> [<target>]
#
# template (required) - the bundled permissions template
#                       (superdev/skills/setup/assets/settings.json).
# target   (optional) - the host settings file; defaults to
#                       .claude/settings.json relative to the current dir.
#
# Merge rules (applied by the embedded node program, only when the target
# already exists):
#   - permissions.allow / permissions.ask / permissions.deny keep the host's
#     entries in the host's order; template entries missing from a list are
#     appended at its end, each exactly once. A list that is not an array is
#     replaced by the merged array.
#   - permissions.defaultMode and permissions.disableAutoMode are set from the
#     template only when the host has none; any existing value is reported,
#     never overwritten.
#   - permissions is created when absent; every other key of the file
#     (host-specific ones included) is left exactly as it was.
#   - a semantically unchanged file is not rewritten at all, so a second run
#     leaves it byte-identical.
#   - the rewrite is atomic: the result is written to <target>.tmp and
#     renamed over the target.
#
# Output (stdout, exactly one line - plus the template body on the node-skip
# case, which is the block a user merges by hand):
#   settings.json: created from template
#   settings.json: merged - added <n> allow, <a> ask, <m> deny, defaultMode set, autoMode disabled
#   settings.json: merged - added <n> allow, <a> ask, <m> deny, defaultMode already <x> (left untouched), autoMode already <y> (left untouched)
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
target="${2:-.claude/settings.json}"

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

const templatePerms = isObject(template.permissions) ? template.permissions : {};
let changed = false;

if (!isObject(current.permissions)) {
  current.permissions = {};
  changed = true;
}
const perms = current.permissions;

/** Host order first, then the template entries that list does not already
 *  carry. Returns how many were appended. */
function mergeList(name) {
  const additions = Array.isArray(templatePerms[name]) ? templatePerms[name] : [];
  const hostValue = perms[name];
  const hostIsArray = Array.isArray(hostValue);
  const hostList = hostIsArray ? hostValue : [];
  const seen = new Set(hostList.filter((entry) => typeof entry === "string"));
  const missing = [];
  for (const entry of additions) {
    if (typeof entry !== "string" || seen.has(entry)) continue;
    seen.add(entry);
    missing.push(entry);
  }
  if (missing.length > 0 || (!hostIsArray && hostValue !== undefined)) {
    perms[name] = [...hostList, ...missing];
    changed = true;
  }
  return missing.length;
}

const addedAllow = mergeList("allow");
const addedAsk = mergeList("ask");
const addedDeny = mergeList("deny");

/** A scalar the template only seeds. The host's own value always wins, so a
 *  project that deliberately runs another mode - or that deliberately leaves
 *  auto mode on - is reported, never overridden. Returns the host's value, or
 *  undefined when the template's was taken. */
function mergeScalar(name) {
  if (perms[name] !== undefined) return oneLine(perms[name]);
  if (typeof templatePerms[name] === "string") {
    perms[name] = templatePerms[name];
    changed = true;
  }
  return undefined;
}

const hostMode = mergeScalar("defaultMode");
const modeClause =
  hostMode === undefined ? "defaultMode set" : `defaultMode already ${hostMode} (left untouched)`;

const hostAutoMode = mergeScalar("disableAutoMode");
const autoClause =
  hostAutoMode === undefined ? "autoMode disabled" : `autoMode already ${hostAutoMode} (left untouched)`;

if (!changed) {
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
  `settings.json: merged - added ${addedAllow} allow, ${addedAsk} ask, ${addedDeny} deny, ${modeClause}, ${autoClause}`,
);
NODE
exit $?
