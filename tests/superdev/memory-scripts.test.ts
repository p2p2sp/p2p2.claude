/*
 * memory-scripts.test.ts - proves the three superdev-memory reporter scripts'
 * documented stdout contracts:
 *   - detect_state.sh <path>       -> root_file: / has_Memory_section: /
 *     child_nodes: / state: / action: (none/partial/complete)
 *   - analyze_structure.sh <path>  -> the six `##`-headed sections plus the
 *     final "Run estimate_tokens.sh ..." hint line
 *   - estimate_tokens.sh <path>    -> Total tokens: / File count: /
 *     Threshold: / Recommendation:, or exit 1 with "Error: Path not found:"
 *
 * All three are bash scripts shipped at mode 100644 (no exec bit - every
 * SKILL.md invokes them as `scripts/<name>.sh <path>`, i.e. through bash),
 * so every case here runs under forEachShell("bash", ...) via opts.shell,
 * never executed directly. All three source the shared
 * superdev/scripts/lib_find_excludes.sh, so a project .gitignore prunes
 * matching directories from every find they run.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/memory-scripts.test.ts
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

const SCRIPTS_DIR = path.resolve(import.meta.dirname, "../../superdev/skills/superdev-memory/scripts");
const DETECT_STATE = path.join(SCRIPTS_DIR, "detect_state.sh");
const ANALYZE_STRUCTURE = path.join(SCRIPTS_DIR, "analyze_structure.sh");
const ESTIMATE_TOKENS = path.join(SCRIPTS_DIR, "estimate_tokens.sh");

function assertBash(fn: (bash: string) => void) {
  const skips = forEachShell("bash", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "bash");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

function run(bash: string, script: string, args: string[] = [], opts: { cwd?: string } = {}): RunResult {
  return runScript(script, args, { shell: bash, cwd: opts.cwd });
}

function writeFileOfSize(filePath: string, bytes: number): void {
  fs.writeFileSync(filePath, "x".repeat(bytes));
}

// --- detect_state.sh -------------------------------------------------------

test("detect_state.sh: no CLAUDE.md anywhere -> state none", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-detect-", (dir) => {
      const result = run(bash, DETECT_STATE, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^root_file: none$/m);
      assert.match(result.stdout, /^has_Memory_section: false$/m);
      assert.match(result.stdout, /^child_nodes: 0$/m);
      assert.match(result.stdout, /^state: none$/m);
      assert.match(result.stdout, /^action: initial setup required$/m);
    });
  });
});

test("detect_state.sh: a root CLAUDE.md with no Memory Layer section -> state partial", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-detect-", (dir) => {
      fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# Title\nsome text\n");
      const result = run(bash, DETECT_STATE, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^root_file: CLAUDE\.md$/m);
      assert.match(result.stdout, /^has_Memory_section: false$/m);
      assert.match(result.stdout, /^state: partial$/m);
      assert.match(result.stdout, /^action: add Memory Layer section to CLAUDE\.md$/m);
    });
  });
});

test("detect_state.sh: an empty root CLAUDE.md is still detected but has no Memory Layer section -> state partial", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-detect-", (dir) => {
      fs.writeFileSync(path.join(dir, "CLAUDE.md"), "");
      const result = run(bash, DETECT_STATE, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^root_file: CLAUDE\.md$/m);
      assert.match(result.stdout, /^has_Memory_section: false$/m);
      assert.match(result.stdout, /^state: partial$/m);
    });
  });
});

test("detect_state.sh: root + Memory Layer section + child nodes -> state complete, child_nodes listed", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-detect-", (dir) => {
      fs.mkdirSync(path.join(dir, "child1"), { recursive: true });
      fs.mkdirSync(path.join(dir, "child2"), { recursive: true });
      fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# Title\n## Memory Layer\ntext\n");
      fs.writeFileSync(path.join(dir, "child1", "CLAUDE.md"), "# child1\n");
      fs.writeFileSync(path.join(dir, "child2", "CLAUDE.md"), "# child2\n");
      const result = run(bash, DETECT_STATE, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^has_Memory_section: true$/m);
      assert.match(result.stdout, /^child_nodes: 2$/m);
      // find's traversal order is not guaranteed - assert membership, not order.
      assert.ok(slash(result.stdout).includes(slash(path.join(dir, "child1", "CLAUDE.md"))));
      assert.ok(slash(result.stdout).includes(slash(path.join(dir, "child2", "CLAUDE.md"))));
      assert.match(result.stdout, /^state: complete$/m);
      assert.match(result.stdout, /^action: maintenance mode \(audit\/candidates\/both\)$/m);
    });
  });
});

test("detect_state.sh: default '.' argument resolves against cwd", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-detect-", (dir) => {
      const result = run(bash, DETECT_STATE, [], { cwd: dir });
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^root_file: none$/m);
      assert.match(result.stdout, /^state: none$/m);
    });
  });
});

test(
  "detect_state.sh: a CLAUDE.md reachable only through a symlinked subdirectory is not counted as a child node",
  { skip: canSymlinkDir() ? false : "this account cannot create a directory symlink" },
  () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-detect-", (dir) => {
      fs.mkdirSync(path.join(dir, "real"), { recursive: true });
      fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# Title\n## Memory Layer\ntext\n");
      fs.writeFileSync(path.join(dir, "real", "CLAUDE.md"), "# child\n");
      fs.symlinkSync("real", path.join(dir, "linked"), "dir");
      const result = run(bash, DETECT_STATE, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      // only the CLAUDE.md reached through the real dir is found; find does not
      // descend into a symlinked directory without -L.
      assert.match(result.stdout, /^child_nodes: 1$/m);
      assert.ok(slash(result.stdout).includes(slash(path.join(dir, "real", "CLAUDE.md"))));
    });
  });
  },
);

test("detect_state.sh: a .gitignore-excluded child directory's CLAUDE.md is not counted", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-detect-", (dir) => {
      fs.mkdirSync(path.join(dir, "ignored_dir"), { recursive: true });
      fs.writeFileSync(path.join(dir, ".gitignore"), "ignored_dir/\n");
      fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# Title\n## Memory Layer\ntext\n");
      fs.writeFileSync(path.join(dir, "ignored_dir", "CLAUDE.md"), "# child\n");
      const result = run(bash, DETECT_STATE, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^child_nodes: 0$/m);
    });
  });
});

test("detect_state.sh: a path argument with a space and a non-ASCII character resolves correctly", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-detect-", (dir) => {
      const target = path.join(dir, "with café space");
      fs.mkdirSync(target, { recursive: true });
      const result = run(bash, DETECT_STATE, [target]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^root_file: none$/m);
      assert.match(result.stdout, /^state: none$/m);
    });
  });
});

// --- analyze_structure.sh --------------------------------------------------

test("analyze_structure.sh: all documented sections appear, populated from a 3-level fixture", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-analyze-", (dir) => {
      fs.mkdirSync(path.join(dir, "src", "sub", "deep"), { recursive: true });
      fs.mkdirSync(path.join(dir, "bigdir"), { recursive: true });
      fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# root\n");
      fs.writeFileSync(path.join(dir, "src", "CLAUDE.md"), "# src\n");
      fs.writeFileSync(path.join(dir, "package.json"), "{}\n");
      for (let i = 1; i <= 25; i++) {
        fs.writeFileSync(path.join(dir, "bigdir", `file${i}.txt`), "x");
      }

      const result = run(bash, ANALYZE_STRUCTURE, [dir]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);

      assert.match(result.stdout, /^=== Memory Layer Structure Analysis ===$/m);
      assert.match(result.stdout, new RegExp(`^Target: ${escapeRegex(dir)}$`, "m"));

      assert.match(result.stdout, /^## Directory Structure \(depth 3\)$/m);
      assert.ok(slash(result.stdout).includes(slash(path.join(dir, "src", "sub", "deep"))));

      assert.match(result.stdout, /^## Existing Memory Nodes$/m);
      assert.ok(slash(result.stdout).includes(slash(path.join(dir, "CLAUDE.md"))));
      assert.ok(slash(result.stdout).includes(slash(path.join(dir, "src", "CLAUDE.md"))));

      assert.match(result.stdout, /^## Large Directories \(potential boundaries\)$/m);
      assert.match(result.stdout, /^\(Directories with >20 files\)$/m);
      assert.match(slash(result.stdout), new RegExp(`25 files: ${escapeRegex(slash(path.join(dir, "bigdir")))}`));

      assert.match(result.stdout, /^## Package\/Config Files \(semantic boundaries\)$/m);
      assert.ok(slash(result.stdout).includes(slash(path.join(dir, "package.json"))));

      assert.match(result.stdout, /^## Suggested Memory Node Locations$/m);
      assert.match(slash(result.stdout), new RegExp(`^1\\. Root: ${escapeRegex(slash(path.join(dir, "CLAUDE.md")))} \\(required\\)$`, "m"));
      assert.match(slash(result.stdout), new RegExp(`^2\\. Source: ${escapeRegex(slash(path.join(dir, "src", "CLAUDE.md")))}$`, "m"));

      assert.match(
        result.stdout,
        /^Run estimate_tokens\.sh on specific directories to determine if they need their own node\.$/m,
      );
    });
  });
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- estimate_tokens.sh -----------------------------------------------------

test("estimate_tokens.sh: nonexistent path -> exit 1, 'Error: Path not found:'", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-tokens-", (dir) => {
      const missing = path.join(dir, "does-not-exist");
      const result = run(bash, ESTIMATE_TOKENS, [missing]);
      assert.equal(result.status, 1);
      assert.match(result.stdout, new RegExp(`^Error: Path not found: ${escapeRegex(missing)}$`, "m"));
    });
  });
});

test("estimate_tokens.sh: an empty dir -> zero tokens, zero files, below the 20k threshold", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-tokens-", (dir) => {
      const target = path.join(dir, "empty");
      fs.mkdirSync(target);
      const result = run(bash, ESTIMATE_TOKENS, [target]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^Total tokens: ~0 \(0\)$/m);
      assert.match(result.stdout, /^File count: 0$/m);
      assert.match(result.stdout, /^Threshold: <20k$/m);
      assert.match(result.stdout, /^Recommendation: No dedicated Memory Node needed$/m);
    });
  });
});

test("estimate_tokens.sh: a known-size fixture below 20k tokens reports the exact total and file count", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-tokens-", (dir) => {
      const target = path.join(dir, "small");
      fs.mkdirSync(target);
      writeFileOfSize(path.join(target, "a.md"), 100); // 100 bytes / 4 = 25 tokens
      const result = run(bash, ESTIMATE_TOKENS, [target]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^Total tokens: ~25 \(25\)$/m);
      assert.match(result.stdout, /^File count: 1$/m);
      assert.match(result.stdout, /^Threshold: <20k$/m);
      assert.match(result.stdout, /^Recommendation: No dedicated Memory Node needed$/m);
    });
  });
});

test("estimate_tokens.sh: a fixture in the 20-64k token range reports the 'k'-formatted total", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-tokens-", (dir) => {
      const target = path.join(dir, "medium");
      fs.mkdirSync(target);
      writeFileOfSize(path.join(target, "a.md"), 100000); // 25000 tokens
      const result = run(bash, ESTIMATE_TOKENS, [target]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^Total tokens: ~25\.0k \(25000\)$/m);
      assert.match(result.stdout, /^Threshold: 20-64k$/m);
      assert.match(result.stdout, /^Recommendation: Good candidate for 2-3k token Memory Node$/m);
    });
  });
});

test("estimate_tokens.sh: a fixture above 64k tokens recommends splitting into child nodes", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-tokens-", (dir) => {
      const target = path.join(dir, "large");
      fs.mkdirSync(target);
      writeFileOfSize(path.join(target, "a.md"), 300000); // 75000 tokens
      const result = run(bash, ESTIMATE_TOKENS, [target]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^Total tokens: ~75\.0k \(75000\)$/m);
      assert.match(result.stdout, /^Threshold: >64k$/m);
      assert.match(result.stdout, /^Recommendation: Consider splitting into child Memory Nodes$/m);
    });
  });
});

test("estimate_tokens.sh: a .json file counts toward tokens but not toward the file count (extension sets differ)", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-tokens-", (dir) => {
      const target = path.join(dir, "jsononly");
      fs.mkdirSync(target);
      writeFileOfSize(path.join(target, "a.json"), 400); // 100 tokens
      const result = run(bash, ESTIMATE_TOKENS, [target]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^Total tokens: ~100 \(100\)$/m);
      assert.match(result.stdout, /^File count: 0$/m);
    });
  });
});

test("estimate_tokens.sh: a dir holding only .gitignore-excluded files is measured as empty", () => {
  assertBash((bash) => {
    withTempDir("p2p2-mem-tokens-", (dir) => {
      const target = path.join(dir, "proj");
      fs.mkdirSync(path.join(target, "ignored_dir"), { recursive: true });
      fs.writeFileSync(path.join(target, ".gitignore"), "ignored_dir/\n");
      writeFileOfSize(path.join(target, "ignored_dir", "a.md"), 100000);
      const result = run(bash, ESTIMATE_TOKENS, [target]);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^Total tokens: ~0 \(0\)$/m);
      assert.match(result.stdout, /^File count: 0$/m);
      assert.match(result.stdout, /^Threshold: <20k$/m);
    });
  });
});
