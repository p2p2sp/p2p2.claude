/*
 * rules-scripts.test.ts - proves the two superdev-rules reporter scripts'
 * documented stdout contracts:
 *   - detect_state.sh <path>    -> rules_dir: / rule_files: / frozen_files: /
 *     per-file "(paths: yes|MISSING)" or "(frozen)" lines / state: / action:
 *   - scan_conventions.sh <path> -> the five `##`-headed sections (integer
 *     counts only) plus the final "Read 2-3 representative files..." hint
 *
 * Both ship at mode 100755 and are invoked DIRECTLY by the skill, as
 * `"${CLAUDE_PLUGIN_ROOT}/skills/superdev-rules/scripts/<name>.sh" <path>` -
 * never through an interpreter word, which is what the repo's pre-approval
 * contract requires. (An earlier header claimed the opposite, reading the
 * SKILL.md's then-bare `scripts/<name>.sh` line as "through bash"; it was
 * neither - the path resolved against the host project and the file had no
 * exec bit.) The cases here still run under forEachShell("bash", ...) via
 * opts.shell, because what they prove is the script's CONTENT under every
 * bash variant, not its exec bit - tests/portability.test.ts owns that.
 * Only scan_conventions.sh sources the shared
 * superdev/scripts/lib_find_excludes.sh (detect_state.sh scans the fixed
 * .claude/rules subdir directly, with no gitignore-derived pruning).
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/rules-scripts.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { forEachShell } from "../harness/shells.ts";
import { slash } from "../harness/paths.ts";
import { canSymlinkDir } from "../harness/symlinks.ts";

const SCRIPTS_DIR = path.resolve(import.meta.dirname, "../../superdev/skills/superdev-rules/scripts");
const DETECT_STATE = path.join(SCRIPTS_DIR, "detect_state.sh");
const SCAN_CONVENTIONS = path.join(SCRIPTS_DIR, "scan_conventions.sh");

function assertBash(fn: (bash: string) => void) {
  const skips = forEachShell("bash", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "bash");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

function run(bash: string, script: string, args: string[] = []): RunResult {
  return runScript(script, args, { shell: bash });
}

function writeRuleFile(dir: string, name: string, opts: { paths: boolean }): void {
  const rulesDir = path.join(dir, ".claude", "rules");
  fs.mkdirSync(rulesDir, { recursive: true });
  const body = opts.paths
    ? '---\npaths:\n  - "**/*.ts"\n---\n# rule body\n'
    : "---\ndescription: no paths key\n---\n# rule body\n";
  fs.writeFileSync(path.join(rulesDir, name), body);
}

function writeFrozenFile(dir: string, name: string): void {
  const rulesDir = path.join(dir, ".claude", "rules");
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(path.join(rulesDir, name), "# hand-authored meta-rule\n");
}

// --- detect_state.sh --------------------------------------------------------

test("detect_state.sh: no .claude/rules at all -> state none", () => {
  assertBash((bash) => {
    withTempDir("p2p2-rules-detect-", (dir) => {
      const result = run(bash, DETECT_STATE, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^rules_dir: none$/m);
      assert.match(result.stdout, /^rule_files: 0$/m);
      assert.match(
        result.stdout,
        /^frozen_files: 0 \(leading _, immutable - excluded from state and from all downstream work\)$/m,
      );
      assert.match(result.stdout, /^state: none$/m);
      assert.match(result.stdout, /^action: initial discovery required$/m);
    });
  });
});

test("detect_state.sh: rule files present, one with paths: frontmatter, one missing it -> state partial", () => {
  assertBash((bash) => {
    withTempDir("p2p2-rules-detect-", (dir) => {
      writeRuleFile(dir, "good.md", { paths: true });
      writeRuleFile(dir, "bad.md", { paths: false });
      const result = run(bash, DETECT_STATE, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^rule_files: 2$/m);
      assert.match(result.stdout, /good\.md \(paths: yes\)$/m);
      assert.match(result.stdout, /bad\.md \(paths: MISSING\)$/m);
      assert.match(result.stdout, /^state: partial$/m);
      assert.match(result.stdout, /^action: discovery \+ fix files without paths: gating$/m);
    });
  });
});

test("detect_state.sh: every rule file carries paths: frontmatter -> state complete", () => {
  assertBash((bash) => {
    withTempDir("p2p2-rules-detect-", (dir) => {
      writeRuleFile(dir, "good.md", { paths: true });
      const result = run(bash, DETECT_STATE, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^rule_files: 1$/m);
      assert.match(result.stdout, /good\.md \(paths: yes\)$/m);
      assert.match(result.stdout, /^state: complete$/m);
      assert.match(result.stdout, /^action: maintenance mode \(audit\/candidates\/both\)$/m);
    });
  });
});

test("detect_state.sh: a frozen '_'-prefixed file is listed under frozen_files and excluded from the state calculation", () => {
  assertBash((bash) => {
    withTempDir("p2p2-rules-detect-", (dir) => {
      writeRuleFile(dir, "good.md", { paths: true });
      writeFrozenFile(dir, "_superdev.md");
      const result = run(bash, DETECT_STATE, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      // one real rule file (frozen not counted in rule_files)
      assert.match(result.stdout, /^rule_files: 1$/m);
      assert.match(
        result.stdout,
        /^frozen_files: 1 \(leading _, immutable - excluded from state and from all downstream work\)$/m,
      );
      assert.match(result.stdout, /_superdev\.md \(frozen\)$/m);
      // frozen file does not appear as a "paths:" scored entry
      assert.doesNotMatch(result.stdout, /_superdev\.md \(paths:/);
      assert.match(result.stdout, /^state: complete$/m);
    });
  });
});

test("detect_state.sh: only frozen files present -> rule_files stays 0, state none (frozen excluded from state)", () => {
  assertBash((bash) => {
    withTempDir("p2p2-rules-detect-", (dir) => {
      writeFrozenFile(dir, "_superdev.md");
      const result = run(bash, DETECT_STATE, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^rule_files: 0$/m);
      assert.match(result.stdout, /^frozen_files: 1 /m);
      assert.match(result.stdout, /^state: none$/m);
      assert.match(result.stdout, /^action: initial discovery required$/m);
    });
  });
});

test("detect_state.sh: a path argument with a space and a non-ASCII character resolves correctly", () => {
  assertBash((bash) => {
    withTempDir("p2p2-rules-detect-", (dir) => {
      const target = path.join(dir, "proj café space");
      fs.mkdirSync(target, { recursive: true });
      writeRuleFile(target, "good.md", { paths: true });
      const result = run(bash, DETECT_STATE, [target]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^rule_files: 1$/m);
      assert.match(result.stdout, /good\.md \(paths: yes\)$/m);
      assert.match(result.stdout, /^state: complete$/m);
    });
  });
});

// --- scan_conventions.sh ----------------------------------------------------

test("scan_conventions.sh: all documented sections appear with integer counts, over two languages and two naming styles", () => {
  assertBash((bash) => {
    withTempDir("p2p2-rules-scan-", (dir) => {
      fs.mkdirSync(path.join(dir, "src"), { recursive: true });
      fs.writeFileSync(path.join(dir, "src", "kebab-name.ts"), "x");
      fs.writeFileSync(path.join(dir, "src", "snake_name.ts"), "x");
      fs.writeFileSync(path.join(dir, "src", "PascalName.ts"), "x");
      fs.writeFileSync(path.join(dir, "src", "camelName.py"), "x");
      fs.writeFileSync(path.join(dir, "src", "single.py"), "x");
      fs.writeFileSync(path.join(dir, "src", "my.file.name.py"), "x");
      fs.writeFileSync(path.join(dir, ".editorconfig"), "");

      const result = run(bash, SCAN_CONVENTIONS, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      assert.match(result.stdout, /^=== Convention Signals ===$/m);
      assert.match(result.stdout, new RegExp(`^Target: ${escapeRegex(dir)}$`, "m"));

      assert.match(result.stdout, /^## Languages \(file extensions, top 12\)$/m);
      assert.match(result.stdout, /^\s*3\s+ts$/m);
      assert.match(result.stdout, /^\s*3\s+py$/m);

      assert.match(result.stdout, /^## File naming styles \(basenames, dot-files excluded\)$/m);
      assert.match(result.stdout, /^kebab-case:\s+1$/m);
      assert.match(result.stdout, /^snake_case:\s+1$/m);
      assert.match(result.stdout, /^PascalCase:\s+1$/m);
      assert.match(result.stdout, /^camelCase:\s+1$/m);
      assert.match(result.stdout, /^single-word:\s+1$/m);
      assert.match(result.stdout, /^dotted:\s+1$/m);

      assert.match(result.stdout, /^## Test file patterns$/m);
      assert.match(result.stdout, /^\*\.test\.\*: \d+$/m);
      assert.match(result.stdout, /^\*\.spec\.\*: \d+$/m);
      assert.match(result.stdout, /^\*_test\.\*: \d+$/m);
      assert.match(result.stdout, /^\*Test\.\*: \d+$/m);
      assert.match(result.stdout, /^test_\*: \d+$/m);
      assert.match(result.stdout, /^test directories:$/m);

      assert.match(result.stdout, /^## Tool \/ format configs \(depth 2\)$/m);
      assert.ok(slash(result.stdout).includes(slash(path.join(dir, ".editorconfig"))));

      assert.match(result.stdout, /^## Directory layout \(depth 2\)$/m);
      assert.ok(slash(result.stdout).includes(slash(path.join(dir, "src"))));

      assert.match(result.stdout, /^Read 2-3 representative files per candidate area before proposing a convention\.$/m);
    });
  });
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("scan_conventions.sh: a .gitignore-excluded directory's files are not counted", () => {
  assertBash((bash) => {
    withTempDir("p2p2-rules-scan-", (dir) => {
      fs.mkdirSync(path.join(dir, "ignored_dir"), { recursive: true });
      fs.mkdirSync(path.join(dir, "real"), { recursive: true });
      fs.writeFileSync(path.join(dir, ".gitignore"), "ignored_dir/\n");
      fs.writeFileSync(path.join(dir, "ignored_dir", "should-not-count.ts"), "x");
      fs.writeFileSync(path.join(dir, "real", "kebab-name.ts"), "x");

      const result = run(bash, SCAN_CONVENTIONS, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      // only the real/ file counts toward both the language tally and naming style
      assert.match(result.stdout, /^\s*1\s+ts$/m);
      assert.match(result.stdout, /^kebab-case:\s+1$/m);
      assert.ok(!result.stdout.includes("should-not-count"));
    });
  });
});

test(
  "scan_conventions.sh: a file reachable only through a symlinked subdirectory is not counted",
  { skip: canSymlinkDir() ? false : "this account cannot create a directory symlink" },
  () => {
  assertBash((bash) => {
    withTempDir("p2p2-rules-scan-", (dir) => {
      fs.mkdirSync(path.join(dir, "real"), { recursive: true });
      fs.writeFileSync(path.join(dir, "real", "kebab-name.ts"), "x");
      fs.symlinkSync("real", path.join(dir, "linked"), "dir");

      const result = run(bash, SCAN_CONVENTIONS, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      // the file is found once, through the real path only
      assert.match(result.stdout, /^\s*1\s+ts$/m);
      assert.match(result.stdout, /^kebab-case:\s+1$/m);
      // the symlink itself is not descended into (find does not follow it without -L)
      assert.ok(!slash(result.stdout).includes(slash(path.join(dir, "linked", "kebab-name.ts"))));
    });
  });
  },
);
