/*
 * handoff-path.test.ts - proves viber/skills/handoff/scripts/handoff-path.sh's
 * contract: exactly three lines (FILE=, EXISTS=, BRANCH=) naming where the
 * handoff file goes and on which branch the conversation stands.
 *
 * Two properties carry the design. It always exits 0 with an empty stderr,
 * because it runs as a `!` preload where a non-zero exit aborts the whole
 * skill load. And the root is the repository's, never the caller's cwd, so a
 * session started in a subdirectory writes under the same `.temp/`.
 *
 * Roots are compared as real paths (`sameFile`): git prints the resolved
 * `/private/var/...` on macOS and the `C:/...` form on Windows, the temp dir
 * may be spelled either way. The directory form's `.temp/viber/handoff` does
 * not exist, so the root is cut off the printed FILE before the comparison.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/handoff-path.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir } from "../harness/tmp.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/handoff/scripts/handoff-path.sh");

const STAMPED = /^(.*)\/(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})_\{slug\}\.md$/;

async function run(args: string[], cwd: string, env: Record<string, string> = {}): Promise<RunResult> {
  return await runScript(SUT, args, { cwd, env, shell: "bash" });
}

interface Printed {
  file: string;
  exists: string;
  branch: string;
}

/** The three lines, asserted present, in order, and nothing else. */
function parse(result: RunResult): Printed {
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.equal(result.stderr, "");
  const lines = result.stdout.split("\n");
  assert.equal(lines.length, 4, `expected three lines, got ${JSON.stringify(result.stdout)}`);
  assert.equal(lines[3], "");
  assert.match(lines[0], /^FILE=/);
  assert.match(lines[1], /^EXISTS=(true|false)$/);
  assert.match(lines[2], /^BRANCH=/);
  return {
    file: lines[0].slice("FILE=".length),
    exists: lines[1].slice("EXISTS=".length),
    branch: lines[2].slice("BRANCH=".length),
  };
}

/** Two paths naming one directory, however each spells it. */
function sameFile(a: string, b: string): boolean {
  return fs.realpathSync.native(a) === fs.realpathSync.native(b);
}

/** The directory a stamped FILE sits in, asserted stamped. */
function stampedDir(file: string): string {
  const match = STAMPED.exec(file);
  assert.ok(match, `not a stamped placeholder path: ${file}`);
  return match[1];
}

/** The printed root, for a FILE the test expects at `<root>/<rel>`. */
function rootOf(file: string, rel: string): string {
  const suffix = `/${rel}`;
  assert.ok(file.endsWith(suffix), `${file} does not end in ${suffix}`);
  return file.slice(0, -suffix.length);
}

test("no argument inside a repository is a stamped placeholder under <root>/.temp/viber/handoff, not existing, on the current branch", async () => {
  await withGitRepo(async (repo) => {
    const printed = parse(await run([], repo.dir, repo.env));
    const dir = stampedDir(printed.file);
    assert.ok(dir.endsWith("/.temp/viber/handoff"), dir);
    assert.ok(sameFile(dir.slice(0, -"/.temp/viber/handoff".length), repo.dir));
    assert.equal(printed.exists, "false");
    assert.equal(printed.branch, "main");
  });
});

test("an empty or blank argument is the default directory (the preload passes '' when the user named nothing)", async () => {
  await withGitRepo(async (repo) => {
    for (const arg of ["", "   "]) {
      const dir = stampedDir(parse(await run([arg], repo.dir, repo.env)).file);
      assert.ok(dir.endsWith("/.temp/viber/handoff"), `${JSON.stringify(arg)} -> ${dir}`);
    }
  });
});

test("a subdirectory cwd resolves the same repository root (a session started below the root must not write a second .temp/)", async () => {
  await withGitRepo(async (repo) => {
    const sub = path.join(repo.dir, "src", "deep");
    fs.mkdirSync(sub, { recursive: true });
    const fromRoot = stampedDir(parse(await run([], repo.dir, repo.env)).file);
    const fromSub = stampedDir(parse(await run([], sub, repo.env)).file);
    assert.equal(fromSub, fromRoot);
  });
});

test("a relative .md argument is that file under the root, also from a subdirectory", async () => {
  await withGitRepo(async (repo) => {
    const sub = path.join(repo.dir, "src");
    fs.mkdirSync(sub);
    for (const cwd of [repo.dir, sub]) {
      const printed = parse(await run(["docs/notes.md"], cwd, repo.env));
      assert.ok(sameFile(rootOf(printed.file, "docs/notes.md"), repo.dir));
      assert.equal(printed.exists, "false");
    }
  });
});

test("an absolute .md argument is kept as it is, separators aside", async () => {
  await withTempDir("p2p2-viber-", async (outside) => {
    await withGitRepo(async (repo) => {
      const target = path.join(outside, "handoff.md");
      const printed = parse(await run([target], repo.dir, repo.env));
      assert.equal(printed.file, slash(target));
    });
  });
});

test("an MSYS absolute argument (/c/...) becomes the C:/ form through cygpath", { skip: process.platform === "win32" ? false : "the /c/ spelling means a drive only under Git Bash; elsewhere it is an ordinary absolute path" }, async () => {
  await withTempDir("p2p2-viber-", async (outside) => {
    await withGitRepo(async (repo) => {
      const native = slash(outside);
      const msys = `/${native[0].toLowerCase()}${native.slice(2)}/handoff.md`;
      const printed = parse(await run([msys], repo.dir, repo.env));
      assert.match(printed.file, /^[A-Za-z]:\//);
      assert.ok(sameFile(rootOf(printed.file, "handoff.md"), outside));
    });
  });
});

test("an argument not ending in .md is a directory: stamped placeholder inside it, never EXISTS=true even when the directory exists", async () => {
  await withGitRepo(async (repo) => {
    fs.mkdirSync(path.join(repo.dir, "notes"));
    for (const arg of ["notes", "notes/"]) {
      const printed = parse(await run([arg], repo.dir, repo.env));
      assert.ok(sameFile(rootOf(stampedDir(printed.file), "notes"), repo.dir), printed.file);
      assert.equal(printed.exists, "false");
    }
  });
});

test("backslashes become forward slashes", async () => {
  await withGitRepo(async (repo) => {
    const printed = parse(await run(["docs\\sub\\x.md"], repo.dir, repo.env));
    assert.ok(sameFile(rootOf(printed.file, "docs/sub/x.md"), repo.dir), printed.file);
  });
});

test("an existing .md file is EXISTS=true, so the skill stops instead of overwriting it", async () => {
  await withGitRepo(async (repo) => {
    fs.writeFileSync(path.join(repo.dir, "old.md"), "kept\n");
    const printed = parse(await run(["old.md"], repo.dir, repo.env));
    assert.ok(sameFile(rootOf(printed.file, "old.md"), repo.dir));
    assert.equal(printed.exists, "true");
  });
});

test("?, *, [ and spaces pass through unchanged (no glob expansion, no word split)", async () => {
  await withGitRepo(async (repo) => {
    const rel = "a?*[b] c/n x.md";
    const printed = parse(await run([rel], repo.dir, repo.env));
    assert.ok(sameFile(rootOf(printed.file, rel), repo.dir), printed.file);
    assert.equal(printed.exists, "false");
  });
});

test("one pair of surrounding double quotes and surrounding whitespace are dropped (a user who quoted a path with a space)", async () => {
  await withGitRepo(async (repo) => {
    const printed = parse(await run([' "my notes.md" '], repo.dir, repo.env));
    assert.ok(sameFile(rootOf(printed.file, "my notes.md"), repo.dir), printed.file);
  });
});

test("a leading ./ is stripped exactly once (././x.md keeps its second ./)", async () => {
  await withGitRepo(async (repo) => {
    const once = parse(await run(["./x.md"], repo.dir, repo.env));
    assert.ok(sameFile(rootOf(once.file, "x.md"), repo.dir), once.file);
    assert.ok(!once.file.includes("/./"), once.file);

    const twice = parse(await run(["././x.md"], repo.dir, repo.env));
    assert.ok(sameFile(rootOf(twice.file, "./x.md"), repo.dir), twice.file);
  });
});

test("`.` alone is the root directory itself", async () => {
  await withGitRepo(async (repo) => {
    const printed = parse(await run(["."], repo.dir, repo.env));
    assert.ok(sameFile(stampedDir(printed.file), repo.dir), printed.file);
  });
});

test("a detached HEAD prints BRANCH=none", async () => {
  await withGitRepo(async (repo) => {
    assert.equal((await repo.git("commit", "--allow-empty", "-m", "seed")).status, 0);
    assert.equal((await repo.git("checkout", "--detach")).status, 0);
    assert.equal(parse(await run([], repo.dir, repo.env)).branch, "none");
  });
});

test("outside a repository the cwd is the root and BRANCH=none", async () => {
  await withTempDir("p2p2-viber-", async (dir) => {
    const printed = parse(await run([], dir, { GIT_CEILING_DIRECTORIES: dir }));
    const stamped = stampedDir(printed.file);
    assert.ok(stamped.endsWith("/.temp/viber/handoff"), stamped);
    assert.ok(sameFile(stamped.slice(0, -"/.temp/viber/handoff".length), dir));
    assert.equal(printed.branch, "none");
  });
});

test("nothing is created: the directory is left to the writer", async () => {
  await withGitRepo(async (repo) => {
    parse(await run([], repo.dir, repo.env));
    parse(await run(["notes/x.md"], repo.dir, repo.env));
    assert.equal(fs.existsSync(path.join(repo.dir, ".temp")), false);
    assert.equal(fs.existsSync(path.join(repo.dir, "notes")), false);
  });
});
