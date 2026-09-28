/*
 * usage.test.ts - keeps viber/skills/setup/assets/usage.html, the help page
 * `/viber:help` and `/viber:setup` open, from falling behind the plugin.
 *
 * Every rule is a pure function over the page text (plus the source texts it
 * is checked against: plugin.json, each skill's SKILL.md frontmatter and the
 * viber.yml template) returning violation strings. Each rule has a self-check
 * proving it fires on a synthetic bad sample, so its green run on the real
 * page is meaningful rather than vacuous.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/usage.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const VIBER = path.resolve(import.meta.dirname, "../../viber");
const PAGE_PATH = path.join(VIBER, "skills/setup/assets/usage.html");
const TEMPLATE_PATH = path.join(VIBER, "skills/setup/templates/viber.yml");

/** The template ships this key commented out, yet the page still documents it. */
const REQUIRED_EXTRA_KEYS = ["branching-issue-type-mappings"];

type Skill = { name: string; auto: boolean };

// ---------------------------------------------------------------------------
// Sources - pure readers over the text of plugin.json, a SKILL.md, viber.yml
// ---------------------------------------------------------------------------

function lastSegment(entry: string): string {
  return entry.replace(/\/+$/, "").split("/").pop() ?? "";
}

function skillNames(pluginJson: string): string[] {
  return (JSON.parse(pluginJson).skills as string[]).map(lastSegment);
}

function agentNames(pluginJson: string): string[] {
  return (JSON.parse(pluginJson).agents as string[]).map((entry) => lastSegment(entry).replace(/\.md$/, ""));
}

/** True when the SKILL.md frontmatter says `user-invocable: false`. */
function isSelfStarting(skillMd: string): boolean {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(skillMd);
  return match !== null && /^user-invocable:[ \t]*false[ \t]*$/m.test(match[1]);
}

/** One `key-<path>` per uncommented template line opening a key at indent 0
 *  (`<key>`) or indent 2 (`<group>-<child>`); deeper lines need no entry. */
function templateKeyPaths(template: string): string[] {
  const paths: string[] = [];
  let group = "";
  for (const line of template.split(/\r?\n/)) {
    const match = /^( *)([A-Za-z][\w-]*)[ \t]*:/.exec(line);
    if (match === null) continue;
    const indent = match[1].length;
    if (indent === 0) {
      group = match[2];
      paths.push(group);
    } else if (indent === 2 && group !== "") {
      paths.push(`${group}-${match[2]}`);
    }
  }
  return paths;
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

/** The text between the end of the opener at `start` (a `<tag` of name `tag`)
 *  and its balanced closing tag; to the end of the text when never closed. */
function balancedInner(text: string, start: number, tag: string): string {
  const openEnd = text.indexOf(">", start) + 1;
  const token = new RegExp(`<(/?)${escapeRegExp(tag)}(?=[\\s>/])[^>]*>`, "gi");
  token.lastIndex = openEnd;
  let depth = 1;
  for (let match = token.exec(text); match !== null; match = token.exec(text)) {
    depth += match[1] === "/" ? -1 : 1;
    if (depth === 0) return text.slice(openEnd, match.index);
  }
  return text.slice(openEnd);
}

/** The inner HTML of the element carrying `id="<id>"`, or null when absent. */
function elementInner(page: string, id: string): string | null {
  const match = new RegExp(`<([A-Za-z][\\w-]*)\\b[^>]*\\sid="${escapeRegExp(id)}"[^>]*>`).exec(page);
  return match === null ? null : balancedInner(page, match.index, match[1]);
}

function hasId(page: string, id: string): boolean {
  return new RegExp(`\\sid="${escapeRegExp(id)}"`).test(page);
}

function bodyOf(page: string): { text: string; offset: number } {
  const start = page.search(/<body[\s>]/);
  const offset = start < 0 ? 0 : start;
  const end = page.indexOf("</body>", offset);
  return { text: page.slice(offset, end < 0 ? page.length : end), offset };
}

// ---------------------------------------------------------------------------
// Rules - pure over the page text (and the source texts)
// ---------------------------------------------------------------------------

function missingSkillCards(page: string, skills: string[]): string[] {
  return skills.filter((name) => !hasId(page, `skill-${name}`)).map((name) => `no card id="skill-${name}"`);
}

/** A well-formed label: `<span class="tag auto">` holding one `lang="en"` and
 *  one `lang="pl"` element. */
function hasAutoLabel(card: string): boolean {
  const match = /<span class="tag auto">/.exec(card);
  if (match === null) return false;
  const label = balancedInner(card, match.index, "span");
  return (label.match(/\slang="en"/g) ?? []).length === 1 && (label.match(/\slang="pl"/g) ?? []).length === 1;
}

function autoLabelViolations(page: string, skills: Skill[]): string[] {
  const violations: string[] = [];
  for (const skill of skills) {
    const card = elementInner(page, `skill-${skill.name}`);
    if (card === null) continue;
    if (skill.auto && !hasAutoLabel(card)) {
      violations.push(`skill-${skill.name}: user-invocable: false, but the card lacks <span class="tag auto"> with one en and one pl element`);
    }
    if (!skill.auto && /class="tag auto"/.test(card)) {
      violations.push(`skill-${skill.name}: the card carries the self-starting label, but the skill is user-invocable`);
    }
  }
  return violations;
}

function missingAgentLines(page: string, agents: string[]): string[] {
  return agents.filter((name) => !hasId(page, `agent-${name}`)).map((name) => `no line id="agent-${name}"`);
}

function missingKeyEntries(page: string, keyPaths: string[]): string[] {
  return keyPaths.filter((key) => !hasId(page, `key-${key}`)).map((key) => `no entry id="key-${key}"`);
}

/** Inside `<body>`, `lang` attributes alternate en, pl, en, pl, each pl on the
 *  same tag name as the en before it. Stops at the first break in the order. */
function languagePairViolations(page: string): string[] {
  const body = bodyOf(page);
  const tags = [...body.text.matchAll(/<([A-Za-z][\w-]*)\b[^>]*?\slang="([^"]*)"/g)].map((m) => ({
    tag: m[1].toLowerCase(),
    lang: m[2],
    line: lineOf(page, body.offset + (m.index ?? 0)),
  }));
  const violations: string[] = [];
  for (let i = 0; i < tags.length; i++) {
    const expected = i % 2 === 0 ? "en" : "pl";
    if (tags[i].lang !== expected) {
      violations.push(`line ${tags[i].line}: <${tags[i].tag} lang="${tags[i].lang}"> where lang="${expected}" was due`);
      return violations;
    }
    if (expected === "pl" && tags[i].tag !== tags[i - 1].tag) {
      violations.push(`line ${tags[i].line}: <${tags[i].tag} lang="pl"> pairs with <${tags[i - 1].tag} lang="en">`);
    }
  }
  if (tags.length % 2 === 1) violations.push(`line ${tags[tags.length - 1].line}: the last lang="en" has no lang="pl" pair`);
  return violations;
}

function brokenInternalLinks(page: string): string[] {
  return [...page.matchAll(/href="#([^"]*)"/g)]
    .filter((m) => !hasId(page, m[1]))
    .map((m) => `line ${lineOf(page, m.index ?? 0)}: href="#${m[1]}" has no id="${m[1]}"`);
}

function unknownCommands(page: string, skills: string[]): string[] {
  return [...page.matchAll(/\/viber:([A-Za-z0-9_-]+)/g)]
    .filter((m) => !skills.includes(m[1]))
    .map((m) => `line ${lineOf(page, m.index ?? 0)}: /viber:${m[1]} names no skill in plugin.json`);
}

/** Built from code points so this file itself holds neither character. */
const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);

function dashViolations(page: string): string[] {
  return [...page.matchAll(new RegExp(`[${EN_DASH}${EM_DASH}]`, "g"))].map(
    (m) => `line ${lineOf(page, m.index ?? 0)}: U+${m[0].charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

const EXTERNAL_LOADS: [string, RegExp][] = [
  ["<script src=", /<script\b[^>]*\ssrc\s*=/gi],
  ['<link rel="stylesheet"', /<link\b[^>]*\srel\s*=\s*["']?stylesheet/gi],
  ["@import", /@import\b/gi],
  ["url(http", /url\(\s*["']?\s*https?:/gi],
];

function externalLoadViolations(page: string): string[] {
  return EXTERNAL_LOADS.flatMap(([label, pattern]) =>
    [...page.matchAll(pattern)].map((m) => `line ${lineOf(page, m.index ?? 0)}: ${label}`),
  );
}

/** Every `<section ... id="guide-<slug>">` carries `class="guide"` and nothing else in it. */
function guideClassViolations(page: string): string[] {
  return [...page.matchAll(/<section\b[^>]*\sid="guide-[^"]*"[^>]*>/g)]
    .filter((m) => !/\sclass="guide"/.test(m[0]))
    .map((m) => `line ${lineOf(page, m.index ?? 0)}: ${m[0]} lacks class="guide" alone`);
}

// ---------------------------------------------------------------------------
// Self-checks - synthetic samples, no filesystem
// ---------------------------------------------------------------------------

const html = (body: string): string => `<!doctype html>\n<html lang="en">\n<head></head>\n<body>\n${body}\n</body>\n</html>\n`;
const label = '<span class="tag auto"><span lang="en">starts on its own</span><span lang="pl">startuje sam</span></span>';

test("self-check: templateKeyPaths keeps indent 0 and 2 keys, skips comments and deeper lines", () => {
  const template = "# adr: comment\nadr: true\n\ngroup:\n  child: x\n  deep:\n    leaf: y\n  # hidden: z\nnext: 1\n";

  assert.deepEqual(templateKeyPaths(template), ["adr", "group", "group-child", "group-deep", "next"]);
});

for (const [name, skillMd, expected] of [
  ["user-invocable: false in the frontmatter", "---\nname: a\nuser-invocable: false\n---\nbody\n", true],
  ["user-invocable: true in the frontmatter", "---\nname: b\nuser-invocable: true\n---\nbody\n", false],
  ["user-invocable: false in the body only", "---\nname: c\n---\nuser-invocable: false\n", false],
] as const) {
  test(`self-check: isSelfStarting reads ${name} as ${expected}`, () => {
    assert.equal(isSelfStarting(skillMd), expected);
  });
}

test("self-check: missingSkillCards fires on a sample missing a skill card", () => {
  const page = html('<article id="skill-setup"></article>');

  assert.deepEqual(missingSkillCards(page, ["setup", "commit"]), ['no card id="skill-commit"']);
});

for (const [name, card, skill] of [
  ["a self-starting card lacking its label", '<article id="skill-tdd"><h3>tdd</h3></article>', { name: "tdd", auto: true }],
  ["a self-starting card whose label misses its pl element", '<article id="skill-tdd"><span class="tag auto"><span lang="en">auto</span></span></article>', { name: "tdd", auto: true }],
  ["a user-invocable card carrying the label", `<article id="skill-commit">${label}</article>`, { name: "commit", auto: false }],
] as const) {
  test(`self-check: autoLabelViolations fires on ${name}`, () => {
    assert.equal(autoLabelViolations(html(card), [skill]).length, 1);
  });
}

test("self-check: autoLabelViolations stays quiet on a labelled self-starting card beside an unlabelled one", () => {
  const page = html(`<article id="skill-tdd"><h3>tdd</h3>${label}</article>\n<article id="skill-commit"><h3>commit</h3></article>`);

  assert.deepEqual(autoLabelViolations(page, [{ name: "tdd", auto: true }, { name: "commit", auto: false }]), []);
});

test("self-check: missingAgentLines fires on a sample missing an agent line", () => {
  const page = html('<li id="agent-prover"></li>');

  assert.deepEqual(missingAgentLines(page, ["prover", "closeout"]), ['no line id="agent-closeout"']);
});

test("self-check: missingKeyEntries fires on a sample missing a key entry", () => {
  const page = html('<div id="key-adr"></div>');

  assert.deepEqual(missingKeyEntries(page, ["adr", "tiers-min"]), ['no entry id="key-tiers-min"']);
});

for (const [name, body] of [
  ["two en in a row", '<span lang="en">a</span><span lang="en">b</span>'],
  ["a pl on another tag than its en", '<p lang="en">a</p><span lang="pl">b</span>'],
  ["an en with no pl after it", '<p lang="en">a</p><p lang="pl">b</p><p lang="en">c</p>'],
  ["a pl first", '<p lang="pl">a</p><p lang="en">b</p>'],
] as const) {
  test(`self-check: languagePairViolations fires on ${name}`, () => {
    assert.equal(languagePairViolations(html(body)).length, 1);
  });
}

test("self-check: languagePairViolations ignores the lang on <html>, outside <body>", () => {
  assert.deepEqual(languagePairViolations(html('<p lang="en">a</p><p lang="pl">b</p>')), []);
});

test("self-check: brokenInternalLinks fires on a link to a missing id", () => {
  const page = html('<a href="#here">ok</a><a href="#gone">bad</a><section id="here"></section>');

  assert.deepEqual(brokenInternalLinks(page), ['line 5: href="#gone" has no id="gone"']);
});

test("self-check: unknownCommands fires on a /viber:<name> no skill carries", () => {
  const page = html("<code>/viber:setup</code> <code>/viber:deploy</code>");

  assert.deepEqual(unknownCommands(page, ["setup"]), ["line 5: /viber:deploy names no skill in plugin.json"]);
});

for (const [name, char] of [
  ["an em dash", EM_DASH],
  ["an en dash", EN_DASH],
] as const) {
  test(`self-check: dashViolations fires on ${name}`, () => {
    assert.equal(dashViolations(html(`<p>a ${char} b</p>`)).length, 1);
  });
}

for (const [name, head] of [
  ["an external script", '<script src="https://cdn.example.com/x.js"></script>'],
  ["an external stylesheet", '<link rel="stylesheet" href="https://cdn.example.com/x.css">'],
  ["an @import", "<style>@import 'x.css';</style>"],
  ["a url( pointing to http", "<style>body { background: url(http://example.com/x.png); }</style>"],
] as const) {
  test(`self-check: externalLoadViolations fires on ${name}`, () => {
    assert.equal(externalLoadViolations(`<html><head>${head}</head><body></body></html>`).length, 1);
  });
}

test("self-check: externalLoadViolations stays quiet on an inline script and style and an outbound link", () => {
  const page = '<html><head><script>var a = 1;</script><style>a { color: red; }</style></head><body><a href="https://github.com/">repo</a></body></html>';

  assert.deepEqual(externalLoadViolations(page), []);
});

for (const [name, body] of [
  ["a guide section with no class", '<section id="guide-fix"></section>'],
  ["a guide section with a second class", '<section class="guide wide" id="guide-fix"></section>'],
] as const) {
  test(`self-check: guideClassViolations fires on ${name}`, () => {
    assert.equal(guideClassViolations(html(body)).length, 1);
  });
}

// ---------------------------------------------------------------------------
// The real page against the real sources
// ---------------------------------------------------------------------------

const PAGE = fs.readFileSync(PAGE_PATH, "utf-8");
const PLUGIN_JSON = fs.readFileSync(path.join(VIBER, ".claude-plugin/plugin.json"), "utf-8");
const SKILLS: Skill[] = skillNames(PLUGIN_JSON).map((name) => ({
  name,
  auto: isSelfStarting(fs.readFileSync(path.join(VIBER, "skills", name, "SKILL.md"), "utf-8")),
}));
const KEY_PATHS = [...templateKeyPaths(fs.readFileSync(TEMPLATE_PATH, "utf-8")), ...REQUIRED_EXTRA_KEYS];

for (const [name, violations] of [
  ["has a card for every skill plugin.json lists", () => missingSkillCards(PAGE, SKILLS.map((s) => s.name))],
  ["labels exactly the user-invocable: false cards as self-starting", () => autoLabelViolations(PAGE, SKILLS)],
  ["has a line for every agent plugin.json lists", () => missingAgentLines(PAGE, agentNames(PLUGIN_JSON))],
  ["has an entry for every viber.yml key", () => missingKeyEntries(PAGE, KEY_PATHS)],
  ["pairs every English piece with a Polish one", () => languagePairViolations(PAGE)],
  ["links only to ids it holds", () => brokenInternalLinks(PAGE)],
  ["names only /viber: commands a skill carries", () => unknownCommands(PAGE, SKILLS.map((s) => s.name))],
  ["holds no em dash and no en dash", () => dashViolations(PAGE)],
  ["loads no external script, stylesheet or resource", () => externalLoadViolations(PAGE)],
  ["gives every task guide class=\"guide\" alone", () => guideClassViolations(PAGE)],
] as const) {
  test(`the help page ${name}`, () => {
    assert.deepEqual(violations(), []);
  });
}
