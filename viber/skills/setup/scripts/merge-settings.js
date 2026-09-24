// merge-settings.js - the merge program merge-settings.sh runs through node,
// pulled out of an inline heredoc because this repo forbids heredocs in a
// shipped script. Logic is unchanged from the embedded version: it merges
// the bundled permissions template into the host project's settings.json,
// key by key, idempotently (see merge-settings.sh's own header for the full
// merge rules and stdout/exit-code contract, which this program produces).
//
// Contract:
//   argv   : two paths, read from process.argv.slice(2) - <template> <target>.
//   cwd    : irrelevant; every path is resolved from argv.
//   stdout : exactly one line (the merge-settings.sh contract).
//   exit   : 0 merged/created/already up to date; 1 template missing; 2 the
//            target could not be read or parsed, or the write failed.
"use strict";

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
