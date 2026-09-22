/*
 * memory-map.test.ts - proves viber/skills/memory/scripts/memory-map.sh's
 * contract: with no argument it MAPS the host repository's `CLAUDE.md`
 * cascade (one line per node with its own and its chain's character count,
 * orphan nodes, directories that deserve a node, nodes carrying uncommitted
 * work), and with `--reset` it deletes the nodes it is given - all of them or
 * none.
 *
 * Two properties carry the design. The map ALWAYS exits 0, because it is a
 * `!` preload where a non-zero exit aborts the whole skill load - a directory
 * that is no repository at all is the empty map, not an error. And `--reset`
 * is all-or-nothing: one modified or untracked target refuses the whole call
 * with nothing deleted, so a user never loses half a cascade.
 *
 * Every case builds its own throwaway git repo through `withGitRepo`, so no
 * test reads this repository's index or the developer's ~/.gitconfig, and
 * several may run at once in the same tree.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/memory-map.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/memory/scripts/memory-map.sh");

function run(repo: GitRepo, args: string[] = []) {
  return runScript(SUT, args, { cwd: repo.dir, env: repo.env, shell: "bash" });
}

/** stdout split into lines, the trailing empty one dropped. */
function lines(stdout: string): string[] {
  return stdout.replace(/\n$/, "").split("\n");
}

/** Writes each `path -> content` pair into the repo, creating directories. */
function write(repo: GitRepo, files: Record<string, string>): void {
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(repo.dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  }
}

/** Writes the files and commits them, so every one of them is tracked. */
function commit(repo: GitRepo, files: Record<string, string>): void {
  write(repo, files);
  repo.git("add", "-A");
  repo.git("commit", "-m", "seed");
}

test("a repository with no tracked file at all is the empty map", () => {
  withGitRepo((repo) => {
    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const out = lines(result.stdout);
    assert.equal(out[0], "# viber memory map");
    assert.match(out[1], /^id: \d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/);
    assert.deepEqual(out.slice(2), ["state: none", "total: nodes 0"]);
  });
});

/** The lines of `out` opening with `prefix`, in the order printed. */
function pick(out: string[], prefix: string): string[] {
  return out.filter((line) => line.startsWith(prefix));
}

test("a tracked root CLAUDE.md is one node line carrying its own and its chain's character count", () => {
  withGitRepo((repo) => {
    commit(repo, { "CLAUDE.md": `${"x".repeat(99)}\n`, "README.md": "readme\n" });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const out = lines(result.stdout);
    assert.deepEqual(pick(out, "node:"), ["node: CLAUDE.md 100 chain 100 ok"]);
    assert.deepEqual(pick(out, "total:"), ["total: nodes 1"]);
  });
});

/** A CLAUDE.md body of exactly `chars` bytes, newline included. */
function node(chars: number): string {
  return `${"x".repeat(chars - 1)}\n`;
}

test("nodes come root first then in depth order, each chain adding every ancestor node above it", () => {
  withGitRepo((repo) => {
    commit(repo, {
      "CLAUDE.md": node(100),
      "docs/CLAUDE.md": node(50),
      "docs/deep/CLAUDE.md": node(30),
      // no api/CLAUDE.md: this chain skips the gap and lands on the root
      "api/v1/CLAUDE.md": node(20),
    });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(pick(lines(result.stdout), "node:"), [
      "node: CLAUDE.md 100 chain 100 ok",
      "node: docs/CLAUDE.md 50 chain 150 ok",
      "node: api/v1/CLAUDE.md 20 chain 120 ok",
      "node: docs/deep/CLAUDE.md 30 chain 180 ok",
    ]);
  });
});

test("a node past the 12000 character budget reads OVER-NODE", () => {
  withGitRepo((repo) => {
    commit(repo, { "CLAUDE.md": node(12001) });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(pick(lines(result.stdout), "node:"), [
      "node: CLAUDE.md 12001 chain 12001 OVER-NODE",
    ]);
  });
});

test("a chain past the 32000 character budget reads OVER-CHAIN while each node of it stays ok", () => {
  withGitRepo((repo) => {
    commit(repo, {
      // 12000 is the node budget exactly, not past it
      "CLAUDE.md": node(12000),
      "a/CLAUDE.md": node(11000),
      "a/b/CLAUDE.md": node(11000),
    });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(pick(lines(result.stdout), "node:"), [
      "node: CLAUDE.md 12000 chain 12000 ok",
      "node: a/CLAUDE.md 11000 chain 23000 ok",
      "node: a/b/CLAUDE.md 11000 chain 34000 OVER-CHAIN",
    ]);
  });
});

test("OVER-NODE wins over OVER-CHAIN when a node is past both budgets", () => {
  withGitRepo((repo) => {
    commit(repo, {
      "CLAUDE.md": node(12000),
      "a/CLAUDE.md": node(12000),
      "a/b/CLAUDE.md": node(12001),
    });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(pick(lines(result.stdout), "node:"), [
      "node: CLAUDE.md 12000 chain 12000 ok",
      "node: a/CLAUDE.md 12000 chain 24000 ok",
      "node: a/b/CLAUDE.md 12001 chain 36001 OVER-NODE",
    ]);
  });
});

test("only a node with no other tracked file anywhere beneath its directory is an orphan", () => {
  withGitRepo((repo) => {
    commit(repo, {
      "CLAUDE.md": node(40),
      "README.md": "readme\n",
      "lonely/CLAUDE.md": node(40),
      "docs/CLAUDE.md": node(40),
      "docs/guide.md": "guide\n",
      // a node over a subtree documents that subtree, orphan it is not
      "deep/CLAUDE.md": node(40),
      "deep/sub/impl.ts": "export const a = 1;\n",
    });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(pick(lines(result.stdout), "orphan:"), ["orphan: lonely/CLAUDE.md"]);
  });
});

test("a directory deserving a node is a candidate, marked toolchain only when it holds a manifest", () => {
  withGitRepo((repo) => {
    commit(repo, {
      "CLAUDE.md": node(40),
      "src/a.ts": "aaa\n",
      "src/b.ts": "bbbb\n",
      "src/c.ts": "c\n",
      "web/package.json": "{}\n",
      "web/index.js": "x\n",
      "web/style.css": "y\n",
    });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(pick(lines(result.stdout), "cand:"), [
      "cand: src files 3 bytes 11 plain",
      "cand: web files 3 bytes 7 toolchain",
    ]);
  });
});

test("a candidate already carrying a node, one under three files, one behind a dot segment and one at depth 3 are all left out", () => {
  withGitRepo((repo) => {
    commit(repo, {
      "CLAUDE.md": node(40),
      "docs/CLAUDE.md": node(40),
      "docs/a.md": "x\n",
      "docs/b.md": "x\n",
      "docs/c.md": "x\n",
      "tiny/a.txt": "x\n",
      "tiny/b.txt": "x\n",
      ".github/workflows/a.yml": "x\n",
      ".github/workflows/b.yml": "x\n",
      ".github/workflows/c.yml": "x\n",
      "deep/one/two/a.ts": "x\n",
      "deep/one/two/b.ts": "x\n",
      "deep/one/two/c.ts": "x\n",
    });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(pick(lines(result.stdout), "cand:"), [
      "cand: deep files 3 bytes 6 plain",
      "cand: deep/one files 3 bytes 6 plain",
    ]);
  });
});

/** The one `state:` line of a map. */
function state(out: string[]): string {
  return pick(out, "state:")[0];
}

test("state reads complete when a root node exists and no candidate is left without one", () => {
  withGitRepo((repo) => {
    commit(repo, {
      "CLAUDE.md": node(40),
      "src/CLAUDE.md": node(40),
      "src/a.ts": "x\n",
      "src/b.ts": "x\n",
      "src/c.ts": "x\n",
    });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const out = lines(result.stdout);
    assert.deepEqual(pick(out, "cand:"), []);
    assert.equal(state(out), "state: complete");
  });
});

test("state reads partial while a candidate is still without a node", () => {
  withGitRepo((repo) => {
    commit(repo, {
      "CLAUDE.md": node(40),
      "src/a.ts": "x\n",
      "src/b.ts": "x\n",
      "src/c.ts": "x\n",
    });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const out = lines(result.stdout);
    assert.deepEqual(pick(out, "cand:"), ["cand: src files 3 bytes 6 plain"]);
    assert.equal(state(out), "state: partial");
  });
});

test("state reads partial while nodes exist but the root node does not", () => {
  withGitRepo((repo) => {
    commit(repo, {
      "src/CLAUDE.md": node(40),
      "src/a.ts": "x\n",
      "src/b.ts": "x\n",
      "src/c.ts": "x\n",
    });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const out = lines(result.stdout);
    assert.deepEqual(pick(out, "cand:"), []);
    assert.equal(state(out), "state: partial");
  });
});

test("a node carrying uncommitted work is dirty, and an untracked one is no node at all", () => {
  withGitRepo((repo) => {
    commit(repo, {
      "CLAUDE.md": node(40),
      "docs/CLAUDE.md": node(40),
      "docs/guide.md": "x\n",
    });
    write(repo, {
      "CLAUDE.md": node(60),
      "new/CLAUDE.md": node(40),
    });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const out = lines(result.stdout);
    assert.deepEqual(pick(out, "dirty:"), [
      "dirty: CLAUDE.md modified",
      "dirty: new/CLAUDE.md untracked",
    ]);
    assert.deepEqual(pick(out, "total:"), ["total: nodes 2"]);
  });
});

test("a directory that is no repository at all maps as the empty layer and still exits 0", () => {
  withTempDir("p2p2-nogit-", (dir) => {
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), node(40));

    const result = runScript(SUT, [], { cwd: dir, shell: "bash" });

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const out = lines(result.stdout);
    assert.equal(out[0], "# viber memory map");
    assert.deepEqual(out.slice(2), ["state: none", "total: nodes 0"]);
  });
});

test("--reset deletes every node it is given, in the order it was given them", () => {
  withGitRepo((repo) => {
    commit(repo, {
      "CLAUDE.md": node(40),
      "docs/CLAUDE.md": node(40),
      "docs/guide.md": "x\n",
    });

    const result = run(repo, ["--reset", "docs/CLAUDE.md", "CLAUDE.md"]);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.deepEqual(lines(result.stdout), [
      "removed: docs/CLAUDE.md",
      "removed: CLAUDE.md",
      "removed: 2",
    ]);
    assert.equal(fs.existsSync(path.join(repo.dir, "CLAUDE.md")), false);
    assert.equal(fs.existsSync(path.join(repo.dir, "docs/CLAUDE.md")), false);
  });
});

test("one modified target among several refuses the whole --reset and deletes nothing", () => {
  withGitRepo((repo) => {
    commit(repo, {
      "CLAUDE.md": node(40),
      "a/CLAUDE.md": node(40),
      "b/CLAUDE.md": node(40),
    });
    write(repo, { "b/CLAUDE.md": node(60) });

    const result = run(repo, ["--reset", "CLAUDE.md", "a/CLAUDE.md", "b/CLAUDE.md"]);

    assert.equal(result.status, 3, `stderr: ${result.stderr}`);
    assert.deepEqual(lines(result.stdout), ["refused: b/CLAUDE.md modified"]);
    assert.equal(fs.existsSync(path.join(repo.dir, "CLAUDE.md")), true);
    assert.equal(fs.existsSync(path.join(repo.dir, "a/CLAUDE.md")), true);
    assert.equal(fs.existsSync(path.join(repo.dir, "b/CLAUDE.md")), true);
  });
});

test("--reset refuses a target that is not a node, one that is tracked nowhere and one that is untracked", () => {
  withGitRepo((repo) => {
    commit(repo, { "CLAUDE.md": node(40), "README.md": "readme\n" });
    write(repo, { "new/CLAUDE.md": node(40) });

    const result = run(repo, [
      "--reset",
      "CLAUDE.md",
      "README.md",
      "gone/CLAUDE.md",
      "new/CLAUDE.md",
    ]);

    assert.equal(result.status, 3, `stderr: ${result.stderr}`);
    assert.deepEqual(lines(result.stdout), [
      "refused: README.md not-a-node",
      "refused: gone/CLAUDE.md not-a-node",
      "refused: new/CLAUDE.md untracked",
    ]);
    assert.equal(fs.existsSync(path.join(repo.dir, "CLAUDE.md")), true);
    assert.equal(fs.existsSync(path.join(repo.dir, "new/CLAUDE.md")), true);
  });
});

test("a repository with tracked files but no node at all is state none, its candidates still listed", () => {
  withGitRepo((repo) => {
    commit(repo, {
      "README.md": "readme\n",
      "src/a.ts": "x\n",
      "src/b.ts": "x\n",
      "src/c.ts": "x\n",
    });

    const result = run(repo);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const out = lines(result.stdout);
    assert.equal(state(out), "state: none");
    assert.deepEqual(pick(out, "node:"), []);
    assert.deepEqual(pick(out, "cand:"), ["cand: src files 3 bytes 6 plain"]);
    assert.deepEqual(pick(out, "total:"), ["total: nodes 0"]);
  });
});

test("--reset with no path at all deletes nothing and exits 2", () => {
  withGitRepo((repo) => {
    commit(repo, { "CLAUDE.md": node(40) });

    const result = run(repo, ["--reset"]);

    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.equal(fs.existsSync(path.join(repo.dir, "CLAUDE.md")), true);
  });
});

test("an unknown argument is refused with no map printed", () => {
  withGitRepo((repo) => {
    commit(repo, { "CLAUDE.md": node(40) });

    const result = run(repo, ["--wipe"]);

    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
  });
});
