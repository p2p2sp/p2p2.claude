/*
 * portability.test.ts - a static cross-OS invariant sweep over every shipped
 * script (`*.sh` / `*.ts` outside `tests/`, enumerated from the git index so
 * only tracked, shipped files count): every script has a shebang on line 1
 * (`.ts` exempt - a module with none is only ever `import`ed, never
 * executed), no CRLF line ending anywhere, and the `100755` exec bit
 * whenever a `SKILL.md` or `superdev/hooks/hooks.json` invokes it without an
 * interpreter word (`bash …`/`sh …`) in front. Every `!` preload line and
 * every ```! ``` fenced block in every `SKILL.md` gets its own sweep: a glob
 * character (`?`, `*`, `[`) in a bare (unquoted) argument aborts a whole
 * fork load under zsh's default `nomatch`, so every such argument must be
 * quoted, and `${CLAUDE_PLUGIN_ROOT}`/`${CLAUDE_SKILL_DIR}` must be
 * double-quoted (they need variable expansion). Finally, every `#!/bin/sh`
 * script is swept, comment lines stripped, for bash-only syntax that a real
 * POSIX `/bin/sh` (dash, etc.) does not understand.
 *
 * Each rule is a small pure function (file text / mode+path in, a list of
 * violation strings out) with its own self-check proving it fires on a
 * synthetic bad sample - see the "self-check" tests below - so the sweep's
 * green run on this tree is proven meaningful, not just vacuously green.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is
 * run directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/portability.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "./harness/run.ts";

const INTERPRETER_WORDS = new Set(["bash", "sh", "node"]);
const GLOB_CHARS = ["?", "*", "["];
const ROOT_VARS = ["${CLAUDE_PLUGIN_ROOT}", "${CLAUDE_SKILL_DIR}"];

const BASHISMS: Array<{ name: string; test: (line: string) => boolean }> = [
  { name: "[[ (bash conditional, not a POSIX [[:class:]] bracket expr)", test: (l) => /\[\[(?!:)/.test(l) },
  { name: "(( (bash arithmetic command, not $(( expansion)", test: (l) => /(?<!\$)\(\(/.test(l) },
  { name: "NAME=( (bash array assignment)", test: (l) => /[A-Za-z0-9_]=\(/.test(l) },
  { name: "local -X (bash local flags)", test: (l) => /\blocal\s+-/.test(l) },
  { name: "<<< (bash here-string)", test: (l) => /<<</.test(l) },
  { name: "${var// (bash parameter substitution)", test: (l) => /\$\{[A-Za-z_][A-Za-z0-9_]*\/\//.test(l) },
  { name: "${BASH_ (bash-only variable)", test: (l) => /\$\{BASH_/.test(l) },
  { name: "function NAME (bash function keyword)", test: (l) => /\bfunction\s+[A-Za-z_]/.test(l) },
];

// ---------------------------------------------------------------------------
// Detectors - each is a pure function over file text (or mode+path), so each
// gets its own synthetic self-check below with no filesystem/git involved.
// ---------------------------------------------------------------------------

/** A shebang on line 1 is required for every `.sh` script; a `.ts` module is
 *  exempt (allowed to have none - it is `import`ed, never executed; the few
 *  that ARE run as a CLI always carry `#!/usr/bin/env node` anyway, but the
 *  absence of one is not itself a violation). */
function shebangViolations(filePath: string, content: string): string[] {
  if (!filePath.endsWith(".sh")) return [];
  const firstLine = content.split("\n", 1)[0];
  if (firstLine.startsWith("#!")) return [];
  return [`${filePath}:1: missing shebang on line 1`];
}

/** No shipped script may carry a CRLF line ending anywhere, on any OS. */
function crlfViolations(filePath: string, content: string): string[] {
  if (!content.includes("\r\n")) return [];
  const lineNo = content.slice(0, content.indexOf("\r\n")).split("\n").length;
  return [`${filePath}:${lineNo}: contains a CRLF line ending`];
}

/** Strips a #!/bin/sh script's comment-only lines and flags any bash-only
 *  construct - a real POSIX /bin/sh (dash, etc.) does not understand these,
 *  so a bashism here is invisible on a bash-as-sh machine (macOS, most
 *  Linux) and breaks only on a strict one. Line 1 (the shebang itself) is
 *  always skipped - it can never itself contain a bashism. */
function bashismViolations(filePath: string, content: string): string[] {
  if (filePath.split("/").includes("vendor")) return [];
  const lines = content.split("\n");
  if (!lines[0].trim().startsWith("#!/bin/sh")) return [];
  const violations: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("#")) continue; // comment-only line, stripped
    for (const bashism of BASHISMS) {
      if (bashism.test(line)) {
        violations.push(`${filePath}:${i + 1}: bashism under #!/bin/sh - ${bashism.name}`);
      }
    }
  }
  return violations;
}

/** Per-character quote state of `word` (a whitespace-delimited shell token
 *  that may itself embed one or more quoted runs) - `'none'` for a char
 *  outside any quotes, else the enclosing quote's kind. */
function quoteStates(word: string): Array<"none" | "single" | "double"> {
  const states: Array<"none" | "single" | "double"> = [];
  let state: "none" | "single" | "double" = "none";
  for (const ch of word) {
    if (state === "none" && ch === "'") {
      state = "single";
      states.push("single");
    } else if (state === "none" && ch === '"') {
      state = "double";
      states.push("double");
    } else if (state === "single" && ch === "'") {
      states.push("single");
      state = "none";
    } else if (state === "double" && ch === '"') {
      states.push("double");
      state = "none";
    } else {
      states.push(state);
    }
  }
  return states;
}

/** Splits a shell command line into words on whitespace outside quotes -
 *  good enough for the fixed, simple invocation shapes this repo's SKILL.md
 *  preloads actually use (no need for full shell-grammar fidelity). */
function splitWords(line: string): string[] {
  const words: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  for (const ch of line) {
    if (quote === null && (ch === " " || ch === "\t")) {
      if (current.length > 0) words.push(current);
      current = "";
      continue;
    }
    if (quote === null && (ch === "'" || ch === '"')) quote = ch;
    else if (quote !== null && ch === quote) quote = null;
    current += ch;
  }
  if (current.length > 0) words.push(current);
  return words;
}

/** Checks one already-extracted preload command line (from a `` !`…` ``
 *  line or a ```! fenced block) for the two zsh-nomatch-safety rules: a glob
 *  character must never sit in a bare (unquoted) position, and
 *  `${CLAUDE_PLUGIN_ROOT}`/`${CLAUDE_SKILL_DIR}` must be double-quoted. */
function preloadLineViolations(location: string, line: string): string[] {
  const violations: string[] = [];
  for (const word of splitWords(line)) {
    const states = quoteStates(word);
    for (let i = 0; i < word.length; i++) {
      if (GLOB_CHARS.includes(word[i]) && states[i] === "none") {
        violations.push(`${location}: unquoted '${word[i]}' in argument "${word}" (zsh nomatch risk)`);
      }
    }
    for (const rootVar of ROOT_VARS) {
      const idx = word.indexOf(rootVar);
      if (idx !== -1 && states[idx] !== "double") {
        violations.push(`${location}: ${rootVar} must be double-quoted in argument "${word}"`);
      }
    }
  }
  return violations;
}

/** Extracts every `` !`…` `` single-line preload and every ```! fenced
 *  block from a SKILL.md's content, paired with its 1-based line number(s),
 *  and runs `preloadLineViolations` over each. A backtick-preload match
 *  requires the closing backtick to end the line (only trailing whitespace
 *  after it) - this is what real preloads look like here, and it excludes
 *  prose that merely mentions the `` !`…` `` syntax mid-sentence. */
function preloadQuotingViolations(filePath: string, content: string): string[] {
  const violations: string[] = [];
  const lines = content.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    if (!inFence && line.trim() === "```!") {
      inFence = true;
      continue;
    }
    if (inFence && line.trim() === "```") {
      inFence = false;
      continue;
    }
    if (inFence) {
      violations.push(...preloadLineViolations(`${filePath}:${lineNo}`, line));
      continue;
    }
    const match = line.match(/!`(.*)`\s*$/);
    if (match) {
      violations.push(...preloadLineViolations(`${filePath}:${lineNo}`, match[1]));
    }
  }
  return violations;
}

interface CorpusHit {
  file: string;
  lineNo: number;
  explicit: boolean;
}

/** Every occurrence, across all SKILL.md files and hooks.json, of `pattern`
 *  (the literal `${CLAUDE_PLUGIN_ROOT}/...` or `${CLAUDE_SKILL_DIR}/...`
 *  invocation text for one script) - classified as `explicit` (the word
 *  immediately before the opening quote is `bash`/`sh`/`node`) or bare. */
function findInvocations(pattern: string, corpus: Array<{ file: string; content: string }>): CorpusHit[] {
  const hits: CorpusHit[] = [];
  for (const { file, content } of corpus) {
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      let searchFrom = 0;
      for (;;) {
        const at = line.indexOf(pattern, searchFrom);
        if (at === -1) break;
        searchFrom = at + pattern.length;
        const before = line.slice(0, at - 1).trimEnd();
        // Strip a wrapping inline-code backtick (`` `bash "..." `` `` in
        // prose) so the interpreter word compares cleanly.
        const lastWord = (before.split(/\s+/).pop() ?? "").replace(/^`+|`+$/g, "");
        hits.push({ file, lineNo: idx + 1, explicit: INTERPRETER_WORDS.has(lastWord) });
      }
    });
  }
  return hits;
}

/** The `${CLAUDE_PLUGIN_ROOT}/...`/`${CLAUDE_SKILL_DIR}/...` invocation
 *  text(s) a script would appear under in a SKILL.md/hooks.json, derived
 *  from its repo-relative path (`<plugin>/...` and, when it lives under
 *  `<plugin>/skills/<name>/...`, also `<plugin>/skills/<name>/...`). */
function invocationPatterns(repoRelativePath: string): string[] {
  const segments = repoRelativePath.split("/");
  const pluginRelative = segments.slice(1).join("/");
  const patterns = [`\${CLAUDE_PLUGIN_ROOT}/${pluginRelative}`];
  if (segments[1] === "skills" && segments.length > 3) {
    const skillRelative = segments.slice(3).join("/");
    patterns.push(`\${CLAUDE_SKILL_DIR}/${skillRelative}`);
  }
  return patterns;
}

/** The exec-bit rule itself: a script invoked bare (no interpreter word) in
 *  at least one SKILL.md/hooks.json line must carry the `100755` exec bit
 *  in the git index; a script found only under explicit `bash …`/`sh …`
 *  invocations, or not found in the corpus at all (e.g. sourced by another
 *  script rather than invoked directly), is not constrained either way. */
function execBitViolations(
  repoRelativePath: string,
  mode: string,
  corpus: Array<{ file: string; content: string }>,
): string[] {
  if (!repoRelativePath.endsWith(".sh")) return [];
  const hits = invocationPatterns(repoRelativePath).flatMap((pattern) => findInvocations(pattern, corpus));
  const bareHit = hits.find((hit) => !hit.explicit);
  if (!bareHit) return [];
  if (mode === "100755") return [];
  return [
    `${repoRelativePath}: invoked bare at ${bareHit.file}:${bareHit.lineNo} but git mode is ${mode} (expected 100755)`,
  ];
}

// ---------------------------------------------------------------------------
// Self-checks - one synthetic bad sample per detector, proving each one
// actually fires before it is trusted over the real tree below.
// ---------------------------------------------------------------------------

test("self-check: shebangViolations fires on a .sh file with no shebang", () => {
  assert.deepEqual(shebangViolations("plugin/scripts/foo.sh", "echo hi\n"), [
    "plugin/scripts/foo.sh:1: missing shebang on line 1",
  ]);
});

test("self-check: shebangViolations does not fire on a .ts file with no shebang", () => {
  assert.deepEqual(shebangViolations("plugin/scripts/foo.ts", "export const x = 1;\n"), []);
});

test("self-check: crlfViolations fires on a CRLF line", () => {
  const violations = crlfViolations("plugin/scripts/foo.sh", "#!/bin/sh\r\necho hi\n");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /foo\.sh:1: contains a CRLF line ending/);
});

test("self-check: crlfViolations does not fire on plain LF content", () => {
  assert.deepEqual(crlfViolations("plugin/scripts/foo.sh", "#!/bin/sh\necho hi\n"), []);
});

test("self-check: bashismViolations fires on [[ under a #!/bin/sh script", () => {
  const violations = bashismViolations("plugin/scripts/foo.sh", "#!/bin/sh\nif [[ -n \"$x\" ]]; then\n  echo y\nfi\n");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /foo\.sh:2: bashism under #!\/bin\/sh - \[\[/);
});

test("self-check: bashismViolations ignores a POSIX [[:space:]] bracket class and $(( arithmetic", () => {
  const content = '#!/bin/sh\nsed -e \'s/[[:space:]]*//\' file\nx=$((i-1))\n';
  assert.deepEqual(bashismViolations("plugin/scripts/foo.sh", content), []);
});

test("self-check: bashismViolations skips a comment line and a #!/usr/bin/env bash script entirely", () => {
  const commentedOut = "#!/bin/sh\n# example: if [[ -n $x ]]; then\necho ok\n";
  assert.deepEqual(bashismViolations("plugin/scripts/foo.sh", commentedOut), []);
  const bashScript = "#!/usr/bin/env bash\nif [[ -n $x ]]; then\n  echo y\nfi\n";
  assert.deepEqual(bashismViolations("plugin/scripts/foo.sh", bashScript), []);
});

test("self-check: preloadQuotingViolations fires on an unquoted '?plan' glob argument", () => {
  const content = 'name: foo\n---\n\nRun: !`"${CLAUDE_PLUGIN_ROOT}/scripts/resolve-input.sh" ?plan`\n';
  const violations = preloadQuotingViolations("plugin/skills/foo/SKILL.md", content);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /SKILL\.md:4: unquoted '\?' in argument "\?plan"/);
});

test("self-check: preloadQuotingViolations does not fire on the quoted '?plan' precedent", () => {
  const content = "Run: !`\"${CLAUDE_PLUGIN_ROOT}/scripts/resolve-input.sh\" '?plan'`\n";
  assert.deepEqual(preloadQuotingViolations("plugin/skills/foo/SKILL.md", content), []);
});

test("self-check: preloadQuotingViolations does not fire on a legitimate '*' inside a double-quoted string", () => {
  const content = 'Run: !`"${CLAUDE_PLUGIN_ROOT}/scripts/glob.sh" "prefix-*-suffix"`\n';
  assert.deepEqual(preloadQuotingViolations("plugin/skills/foo/SKILL.md", content), []);
});

test("self-check: preloadQuotingViolations fires on an unquoted ${CLAUDE_PLUGIN_ROOT}", () => {
  const content = "Run: !`${CLAUDE_PLUGIN_ROOT}/scripts/foo.sh`\n";
  const violations = preloadQuotingViolations("plugin/skills/foo/SKILL.md", content);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /must be double-quoted/);
});

test("self-check: preloadQuotingViolations ignores prose that merely mentions the !` syntax", () => {
  const content = "Field schemas (frontmatter fields, allowed values, paths, `!`-block + `$ARGUMENTS` safety) →\n";
  assert.deepEqual(preloadQuotingViolations("plugin/skills/foo/SKILL.md", content), []);
});

test("self-check: preloadQuotingViolations sweeps a ```! fenced block line-by-line", () => {
  const content = ['```!', 'sh "${CLAUDE_PLUGIN_ROOT}/scripts/foo.sh" ?bad', '```', ''].join("\n");
  const violations = preloadQuotingViolations("plugin/skills/foo/SKILL.md", content);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /SKILL\.md:2: unquoted '\?'/);
});

test("self-check: execBitViolations fires on a 100644 mode for a bare-invoked script", () => {
  const corpus = [
    { file: "plugin/skills/foo/SKILL.md", content: 'Run: !`"${CLAUDE_PLUGIN_ROOT}/scripts/bare.sh"`\n' },
  ];
  const violations = execBitViolations("plugin/scripts/bare.sh", "100644", corpus);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /invoked bare at plugin\/skills\/foo\/SKILL\.md:1 but git mode is 100644/);
});

test("self-check: execBitViolations does not fire on an explicit bash-invoked script with mode 100644", () => {
  const corpus = [
    { file: "plugin/skills/foo/SKILL.md", content: 'bash "${CLAUDE_PLUGIN_ROOT}/scripts/wrapped.sh"\n' },
  ];
  assert.deepEqual(execBitViolations("plugin/scripts/wrapped.sh", "100644", corpus), []);
});

test("self-check: execBitViolations does not fire on a script absent from the corpus", () => {
  assert.deepEqual(execBitViolations("plugin/scripts/unreferenced.sh", "100644", []), []);
});

test("self-check: execBitViolations recognizes an explicit invocation wrapped in a prose backtick span", () => {
  const corpus = [
    {
      file: "plugin/skills/foo/SKILL.md",
      content: 'Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/wrapped.sh" "<arg>"` to do the thing.\n',
    },
  ];
  assert.deepEqual(execBitViolations("plugin/scripts/wrapped.sh", "100644", corpus), []);
});

// ---------------------------------------------------------------------------
// The real sweep - every shipped script, enumerated from the git index.
// ---------------------------------------------------------------------------

interface IndexEntry {
  mode: string;
  repoRelativePath: string;
}

function repoRoot(): string {
  const result = runScript("git", ["rev-parse", "--show-toplevel"]);
  if (result.status !== 0) throw new Error(`git rev-parse --show-toplevel failed: ${result.stderr}`);
  return result.stdout.trim();
}

function listIndexed(root: string, pathspecs: string[]): IndexEntry[] {
  const result = runScript("git", ["ls-files", "-s", "--", ...pathspecs], { cwd: root });
  if (result.status !== 0) throw new Error(`git ls-files failed: ${result.stderr}`);
  return result.stdout
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      // "<mode> <sha> <stage>\t<path>"
      const [meta, repoRelativePath] = line.split("\t");
      const mode = meta.split(" ")[0];
      return { mode, repoRelativePath };
    });
}

const root = repoRoot();
const shippedScripts = listIndexed(root, ["*.sh", "*.ts"]).filter(
  (entry) => !entry.repoRelativePath.startsWith("tests/"),
);
const skillMdFiles = listIndexed(root, ["*.md"])
  .map((entry) => entry.repoRelativePath)
  .filter((p) => path.basename(p) === "SKILL.md");
const hooksJsonFiles = listIndexed(root, ["hooks.json"]).map((entry) => entry.repoRelativePath);

test("every shipped script has a shebang (or is an exempt .ts module) and no CRLF line ending", () => {
  const violations: string[] = [];
  for (const { repoRelativePath } of shippedScripts) {
    const content = fs.readFileSync(path.join(root, repoRelativePath), "utf-8");
    violations.push(...shebangViolations(repoRelativePath, content));
    violations.push(...crlfViolations(repoRelativePath, content));
  }
  assert.equal(violations.length, 0, `portability violations:\n${violations.join("\n")}`);
});

test("every #!/bin/sh script contains no bash-only syntax", () => {
  const violations: string[] = [];
  for (const { repoRelativePath } of shippedScripts) {
    const content = fs.readFileSync(path.join(root, repoRelativePath), "utf-8");
    violations.push(...bashismViolations(repoRelativePath, content));
  }
  assert.equal(violations.length, 0, `bashism violations:\n${violations.join("\n")}`);
});

test("every script invoked bare from a SKILL.md/hooks.json line carries the 100755 exec bit", () => {
  const corpus = [...skillMdFiles, ...hooksJsonFiles].map((file) => ({
    file,
    // hooks.json escapes its embedded quotes (\") - unescape so the same
    // literal-substring search used for SKILL.md prose applies unchanged.
    content: fs.readFileSync(path.join(root, file), "utf-8").replace(/\\"/g, '"'),
  }));
  const violations: string[] = [];
  for (const { mode, repoRelativePath } of shippedScripts) {
    violations.push(...execBitViolations(repoRelativePath, mode, corpus));
  }
  assert.equal(violations.length, 0, `exec-bit violations:\n${violations.join("\n")}`);
});

test("every SKILL.md ! preload quotes its glob-bearing arguments and double-quotes its plugin/skill-root variables", () => {
  const violations: string[] = [];
  for (const file of skillMdFiles) {
    const content = fs.readFileSync(path.join(root, file), "utf-8");
    violations.push(...preloadQuotingViolations(file, content));
  }
  assert.equal(violations.length, 0, `preload quoting violations:\n${violations.join("\n")}`);
});
