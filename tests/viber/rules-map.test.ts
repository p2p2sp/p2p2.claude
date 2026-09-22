/*
 * rules-map.test.ts - proves viber/skills/rules/scripts/rules-map.sh's
 * contract: it is the ONE deterministic view the `/viber:rules` command has of
 * `.claude/rules/`, and the ONE gate in front of deleting a rule file.
 *
 * Three properties carry the design. The map mode is a `!` preload, so it
 * ALWAYS exits 0 - a non-zero exit there aborts the whole skill load, which is
 * why even "no repository at all" has to come back as a report rather than as
 * an error. A frozen rule (`_*.md`) is reported and nothing else: never scored
 * against the per-file budget, never called dead, never deleted - it is the
 * user's own file and no writer owns it. And `--reset` refuses the WHOLE call
 * the moment one target is unfit, because a partial delete leaves the layer in
 * a state neither the user nor the command can describe.
 *
 * The caller is trusted to take this output as it stands - the skill never
 * re-derives it - which makes the printed block and the exit codes (2: unusable
 * argv, 3: the reset refused) the whole interface.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/rules-map.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { slash } from "../harness/paths.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/rules/scripts/rules-map.sh");

/** The run stamp the caller spends as `.temp/viber/<id>/`. */
const ID_SHAPE = /^id: \d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/;

function run(repo: GitRepo, args: string[] = [], cwd = repo.dir) {
  return runScript(SUT, args, { cwd, env: repo.env, shell: "bash" });
}

/** Writes one file under the repo, creating its directory. */
function write(repo: GitRepo, relative: string, body: string): void {
  const file = path.join(repo.dir, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

/** Writes every entry, then commits the lot - the tree a map is taken of. */
function seed(repo: GitRepo, files: Record<string, string>): void {
  for (const [relative, body] of Object.entries(files)) write(repo, relative, body);
  repo.git("add", "-A");
  repo.git("commit", "-m", "seed");
}

/** A rule file with a block-sequence `paths:` key, the shape this repo's own
 *  rules use. */
function rule(globs: string[], body = "# rule\n"): string {
  return ["---", "paths:", ...globs.map((glob) => `  - "${glob}"`), "---", "", body].join("\n");
}

/** Every stdout line, separators normalized so a Windows path compares. */
function lines(stdout: string): string[] {
  return slash(stdout).trim().split("\n");
}

/** The lines opening on `<key>: `, that prefix stripped. */
function section(stdout: string, key: string): string[] {
  return lines(stdout)
    .filter((line) => line.startsWith(key + ": "))
    .map((line) => line.slice(key.length + 2));
}

test("map mode reports an empty layer when the rules directory is absent", () => {
  withGitRepo((repo) => {
    seed(repo, { "README.md": "# repo\n" });

    const result = run(repo);

    assert.equal(result.status, 0);
    assert.equal(lines(result.stdout)[0], "# viber rules map");
    assert.match(lines(result.stdout)[1], ID_SHAPE);
    assert.deepEqual(section(result.stdout, "state"), ["none"]);
    assert.deepEqual(section(result.stdout, "total"), ["0 ok"]);
  });
});

test("map mode scores a rule and counts only the tracked files its globs match", () => {
  withGitRepo((repo) => {
    const body = rule(["src/*.ts"]);
    seed(repo, {
      "src/a.ts": "a\n",
      "src/b.ts": "b\n",
      "src/deep/c.ts": "c\n",
      "docs/x.md": "x\n",
      ".claude/rules/code.md": body,
    });

    const result = run(repo);

    assert.equal(result.status, 0);
    assert.deepEqual(section(result.stdout, "state"), ["complete"]);
    assert.deepEqual(section(result.stdout, "rule"), [
      `.claude/rules/code.md ${Buffer.byteLength(body)} paths src/*.ts matches 2 ok`,
    ]);
    assert.deepEqual(section(result.stdout, "total"), [`${Buffer.byteLength(body)} ok`]);
  });
});

test("map mode reports a frozen rule without scoring it and leaves the layer empty", () => {
  withGitRepo((repo) => {
    const body = rule(["nothing/*.ts"], "# frozen\n");
    seed(repo, { "README.md": "# repo\n", ".claude/rules/_frozen.md": body });

    const result = run(repo);

    assert.equal(result.status, 0);
    assert.deepEqual(section(result.stdout, "state"), ["none"]);
    assert.deepEqual(section(result.stdout, "rule"), []);
    assert.deepEqual(section(result.stdout, "dead"), []);
    assert.deepEqual(section(result.stdout, "frozen"), [
      `.claude/rules/_frozen.md ${Buffer.byteLength(body)}`,
    ]);
    assert.deepEqual(section(result.stdout, "total"), [`${Buffer.byteLength(body)} ok`]);
  });
});

test("map mode names a rule whose globs match nothing as dead, in alphabetical order", () => {
  withGitRepo((repo) => {
    seed(repo, {
      "src/a.ts": "a\n",
      ".claude/rules/live.md": rule(["src/*.ts"]),
      ".claude/rules/gone.md": rule(["legacy/*.ts"]),
    });

    const result = run(repo);

    assert.equal(result.status, 0);
    assert.deepEqual(section(result.stdout, "dead"), [".claude/rules/gone.md"]);
    assert.deepEqual(section(result.stdout, "rule").map((line) => line.split(" ")[0]), [
      ".claude/rules/gone.md",
      ".claude/rules/live.md",
    ]);
  });
});

test("map mode marks the layer partial for a rule declaring no paths key and never calls it dead", () => {
  withGitRepo((repo) => {
    const body = "# loose\n\nA rule with no frontmatter at all.\n";
    seed(repo, {
      "src/a.ts": "a\n",
      ".claude/rules/live.md": rule(["src/*.ts"]),
      ".claude/rules/loose.md": body,
    });

    const result = run(repo);

    assert.equal(result.status, 0);
    assert.deepEqual(section(result.stdout, "state"), ["partial"]);
    assert.deepEqual(section(result.stdout, "dead"), []);
    assert.equal(
      section(result.stdout, "rule")[1],
      `.claude/rules/loose.md ${Buffer.byteLength(body)} paths none matches 0 ok`,
    );
  });
});

test("map mode reports a rule declaring paths global as global and never as dead", () => {
  withGitRepo((repo) => {
    const body = ["---", "paths: global", "---", "", "# everywhere", ""].join("\n");
    seed(repo, { "src/a.ts": "a\n", ".claude/rules/all.md": body });

    const result = run(repo);

    assert.equal(result.status, 0);
    assert.deepEqual(section(result.stdout, "state"), ["complete"]);
    assert.deepEqual(section(result.stdout, "dead"), []);
    assert.deepEqual(section(result.stdout, "rule"), [
      `.claude/rules/all.md ${Buffer.byteLength(body)} paths global global ok`,
    ]);
  });
});

test("map mode marks a rule past its own 4000 character budget", () => {
  withGitRepo((repo) => {
    const body = rule(["src/*.ts"], "x".repeat(4100));
    seed(repo, { "src/a.ts": "a\n", ".claude/rules/big.md": body });

    const result = run(repo);

    assert.equal(result.status, 0);
    assert.deepEqual(section(result.stdout, "rule"), [
      `.claude/rules/big.md ${Buffer.byteLength(body)} paths src/*.ts matches 1 OVER-FILE`,
    ]);
  });
});

test("map mode totals every rule file, frozen included, against the 40000 character budget", () => {
  withGitRepo((repo) => {
    const frozen = rule(["src/*.ts"], "y".repeat(41000));
    const small = rule(["src/*.ts"], "# small\n");
    seed(repo, {
      "src/a.ts": "a\n",
      ".claude/rules/_frozen.md": frozen,
      ".claude/rules/small.md": small,
    });
    const sum = Buffer.byteLength(frozen) + Buffer.byteLength(small);

    const result = run(repo);

    assert.equal(result.status, 0);
    assert.ok(sum > 40000, `the fixture has to cross the budget, got ${sum}`);
    assert.deepEqual(section(result.stdout, "total"), [`${sum} OVER-DIR`]);
    assert.deepEqual(section(result.stdout, "frozen"), [
      `.claude/rules/_frozen.md ${Buffer.byteLength(frozen)}`,
    ]);
  });
});

test("map mode names every rule holding uncommitted work", () => {
  withGitRepo((repo) => {
    seed(repo, { "src/a.ts": "a\n", ".claude/rules/live.md": rule(["src/*.ts"]) });
    write(repo, ".claude/rules/live.md", rule(["src/*.ts"], "# edited\n"));
    write(repo, ".claude/rules/fresh.md", rule(["src/*.ts"]));

    const result = run(repo);

    assert.equal(result.status, 0);
    assert.deepEqual(section(result.stdout, "dirty"), [
      ".claude/rules/fresh.md untracked",
      ".claude/rules/live.md modified",
    ]);
  });
});

test("map mode reports outside a git repository, every rule untracked and none dead", () => {
  withTempDir("p2p2-rules-", (dir) => {
    const body = rule(["src/*.ts"]);
    fs.mkdirSync(path.join(dir, ".claude", "rules"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".claude", "rules", "live.md"), body);

    const result = runScript(SUT, [], { cwd: dir, shell: "bash" });

    assert.equal(result.status, 0);
    assert.deepEqual(section(result.stdout, "state"), ["complete"]);
    assert.deepEqual(section(result.stdout, "dead"), []);
    assert.deepEqual(section(result.stdout, "dirty"), [".claude/rules/live.md untracked"]);
  });
});

test("reset deletes every clean rule it is given", () => {
  withGitRepo((repo) => {
    seed(repo, {
      "src/a.ts": "a\n",
      ".claude/rules/one.md": rule(["src/*.ts"]),
      ".claude/rules/two.md": rule(["src/*.ts"]),
    });

    const result = run(repo, ["--reset", ".claude/rules/one.md", ".claude/rules/two.md"]);

    assert.equal(result.status, 0);
    assert.deepEqual(lines(result.stdout), [
      "removed: .claude/rules/one.md",
      "removed: .claude/rules/two.md",
      "removed: 2",
    ]);
    assert.equal(fs.existsSync(path.join(repo.dir, ".claude", "rules", "one.md")), false);
    assert.equal(fs.existsSync(path.join(repo.dir, ".claude", "rules", "two.md")), false);
  });
});

test("reset refuses the whole call when one target is frozen", () => {
  withGitRepo((repo) => {
    seed(repo, {
      "src/a.ts": "a\n",
      ".claude/rules/one.md": rule(["src/*.ts"]),
      ".claude/rules/_frozen.md": rule(["src/*.ts"]),
    });

    const result = run(repo, ["--reset", ".claude/rules/one.md", ".claude/rules/_frozen.md"]);

    assert.equal(result.status, 3);
    assert.deepEqual(lines(result.stdout), ["refused: .claude/rules/_frozen.md frozen"]);
    assert.equal(fs.existsSync(path.join(repo.dir, ".claude", "rules", "one.md")), true);
    assert.equal(fs.existsSync(path.join(repo.dir, ".claude", "rules", "_frozen.md")), true);
  });
});

test("reset names every unfit target and deletes nothing", () => {
  withGitRepo((repo) => {
    seed(repo, {
      "src/a.ts": "a\n",
      "docs/loose.md": "# not a rule\n",
      ".claude/rules/one.md": rule(["src/*.ts"]),
      ".claude/rules/edited.md": rule(["src/*.ts"]),
    });
    write(repo, ".claude/rules/edited.md", rule(["src/*.ts"], "# edited\n"));
    write(repo, ".claude/rules/fresh.md", rule(["src/*.ts"]));

    const result = run(repo, [
      "--reset",
      ".claude/rules/one.md",
      ".claude/rules/edited.md",
      ".claude/rules/fresh.md",
      ".claude/rules/gone.md",
      "docs/loose.md",
    ]);

    assert.equal(result.status, 3);
    assert.deepEqual(lines(result.stdout), [
      "refused: .claude/rules/edited.md modified",
      "refused: .claude/rules/fresh.md untracked",
      "refused: .claude/rules/gone.md missing",
      "refused: docs/loose.md not-a-rule",
    ]);
    assert.equal(fs.existsSync(path.join(repo.dir, ".claude", "rules", "one.md")), true);
    assert.equal(fs.existsSync(path.join(repo.dir, "docs", "loose.md")), true);
  });
});

test("reset with no target at all is refused as unusable argv", () => {
  withGitRepo((repo) => {
    seed(repo, { "src/a.ts": "a\n", ".claude/rules/one.md": rule(["src/*.ts"]) });

    const result = run(repo, ["--reset"]);

    assert.equal(result.status, 2);
    assert.deepEqual(lines(result.stdout), ["refused: - no-target"]);
  });
});

test("an argument that is not a mode is refused as unusable argv", () => {
  withGitRepo((repo) => {
    seed(repo, { "src/a.ts": "a\n", ".claude/rules/one.md": rule(["src/*.ts"]) });

    const result = run(repo, ["--audit"]);

    assert.equal(result.status, 2);
    assert.deepEqual(lines(result.stdout), ["refused: --audit unknown-mode"]);
  });
});

/** The mode git records for a shipped script. Tracked: straight out of the
 *  index. Not committed yet - which is what it is in the build that creates
 *  it - git derives the bit on the way in, from the `#!` line on Windows
 *  (`core.filemode` is false there) and from the mode bits everywhere else. */
function indexMode(file: string): string {
  const listed = runScript("git", ["ls-files", "-s", "--", file], {
    cwd: path.dirname(file),
  }).stdout.trim();
  if (listed) return listed.split(/\s+/)[0];
  const executable =
    process.platform === "win32"
      ? fs.readFileSync(file, "utf-8").startsWith("#!")
      : (fs.statSync(file).mode & 0o111) !== 0;
  return executable ? "100755" : "100644";
}

/** Whichever of `needles` the header does not carry - the caller asserts the
 *  empty list, so a failure names the missing line rather than just "false". */
function missingFrom(header: string, needles: string[]): string[] {
  return needles.filter((needle) => !header.includes(needle));
}

test("the script ships directly invocable, LF-only, its header printing its own stdout", () => {
  const source = fs.readFileSync(SUT, "utf-8");
  const header = source.slice(0, source.indexOf("\nset -u"));

  assert.equal(source.split("\n", 1)[0], "#!/usr/bin/env bash");
  assert.equal(source.includes("\r\n"), false);
  assert.equal(indexMode(SUT), "100755");
  assert.deepEqual(
    missingFrom(header, ["Contract:", "argv", "cwd", "env", "stdout", "exit"]),
    [],
  );
  assert.deepEqual(
    missingFrom(header, [
      "# viber rules map",
      "id: <yyyy-mm-dd-HH-mm-ss>",
      "state: none | partial | complete",
      "rule: <path> <chars> paths",
      "frozen: <path> <chars>",
      "dead: <path>",
      "dirty: <path> modified | untracked",
      "total: <chars> ok | OVER-DIR",
      "removed: <path>",
      "removed: <n>",
      "refused: <path>",
    ]),
    [],
  );
});
