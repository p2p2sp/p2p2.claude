/*
 * extension.test.ts - proves viber/skills/extension/scripts/extension.sh's
 * contract: with no argument it reports the configuration state, the listed
 * agents, the listed names with no file, and one AGENT= line per project agent
 * saying whether it carries the extension marker; with `--add <name>` it
 * registers a name once on the `extensions:` line under `build:`.
 *
 * Two properties carry the design. It always exits 0 (a refusal is a STATUS=
 * line, never a failure), and a refusal - no config, a config without the key,
 * an invalid name - leaves every file untouched. A name is checked against the
 * list as the file spells it, so one already listed is `present` and the file
 * stays byte-identical.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/extension.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/extension/scripts/extension.sh");

const MARKER = "<!-- viber:extension -->";

async function run(args: string[], cwd: string, env: Record<string, string>): Promise<RunResult> {
  const result = await runScript(SUT, args, { cwd, env, shell: "bash" });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  return result;
}

function writeFile(root: string, rel: string, body: string): void {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

/** A viber.yml whose `build:` group carries the given `extensions:` line. */
function config(extensionsLine: string): string {
  return ["schema: 3", "build:", "  memory: true", extensionsLine, "  extensions-parallel: false", "github:", "  issues: false", ""].join("\n");
}

function readConfig(root: string): string {
  return fs.readFileSync(path.join(root, ".claude", "viber.yml"), "utf8");
}

function lines(result: RunResult): string[] {
  return result.stdout.split("\n").filter((line) => line !== "");
}

test("with no argument it prints the state, the listed agents that exist and the listed names with no file", async () => {
  await withGitRepo(async (repo) => {
    writeFile(repo.dir, ".claude/viber.yml", config("  extensions: docs, gone"));
    writeFile(repo.dir, ".claude/agents/docs.md", "docs agent\n");
    const printed = lines(await run([], repo.dir, repo.env));
    assert.deepEqual(printed.slice(0, 3), ["CONFIG=ok", "LISTED=docs", "MISSING=gone"]);
  });
});

test("with no argument it prints one AGENT= line per agent file, sorted by name, contract only for a file holding the marker line", async () => {
  await withGitRepo(async (repo) => {
    writeFile(repo.dir, ".claude/viber.yml", config("  extensions:"));
    writeFile(repo.dir, ".claude/agents/zeta.md", `intro\n${MARKER}\nbody\n`);
    writeFile(repo.dir, ".claude/agents/alpha.md", `plain agent\nmentions ${MARKER} inside a sentence\n`);
    writeFile(repo.dir, ".claude/agents/mid.md", `${MARKER}\n`);
    const printed = lines(await run([], repo.dir, repo.env));
    assert.deepEqual(printed.slice(3), ["AGENT=alpha | plain", "AGENT=mid | contract", "AGENT=zeta | contract"]);
  });
});

test("--add on an empty list writes `extensions: x`", async () => {
  await withGitRepo(async (repo) => {
    writeFile(repo.dir, ".claude/viber.yml", config("  extensions:"));
    const result = await run(["--add", "x"], repo.dir, repo.env);
    assert.deepEqual([lines(result), readConfig(repo.dir)], [["STATUS=added"], config("  extensions: x")]);
  });
});

test("--add after a name appends it, writing `extensions: x, y`", async () => {
  await withGitRepo(async (repo) => {
    writeFile(repo.dir, ".claude/viber.yml", config("  extensions: x"));
    await run(["--add", "y"], repo.dir, repo.env);
    assert.equal(readConfig(repo.dir), config("  extensions: x, y"));
  });
});

test("--add of a name already listed prints STATUS=present and leaves the file byte-identical", async () => {
  await withGitRepo(async (repo) => {
    const before = config("  extensions: x, y   # run order");
    writeFile(repo.dir, ".claude/viber.yml", before);
    const result = await run(["--add", "x"], repo.dir, repo.env);
    assert.deepEqual([lines(result), readConfig(repo.dir)], [["STATUS=present"], before]);
  });
});

test("--add keeps a trailing comment on the extensions line", async () => {
  await withGitRepo(async (repo) => {
    writeFile(repo.dir, ".claude/viber.yml", config("  extensions: x   # run order"));
    await run(["--add", "y"], repo.dir, repo.env);
    assert.equal(readConfig(repo.dir), config("  extensions: x, y   # run order"));
  });
});

test("--add on a line holding only a comment puts the name before the comment", async () => {
  await withGitRepo(async (repo) => {
    writeFile(repo.dir, ".claude/viber.yml", config("  extensions: # none yet"));
    await run(["--add", "x"], repo.dir, repo.env);
    assert.equal(readConfig(repo.dir), config("  extensions: x # none yet"));
  });
});

test("--add with no .claude/viber.yml prints STATUS=no-config and creates no file", async () => {
  await withGitRepo(async (repo) => {
    const result = await run(["--add", "x"], repo.dir, repo.env);
    assert.deepEqual([lines(result), fs.existsSync(path.join(repo.dir, ".claude"))], [["STATUS=no-config"], false]);
  });
});

test("--add on a config with no extensions: key under build: prints STATUS=stale and leaves the file untouched", async () => {
  await withGitRepo(async (repo) => {
    const before = ["schema: 2", "build:", "  memory: true", "github:", "  extensions: x", ""].join("\n");
    writeFile(repo.dir, ".claude/viber.yml", before);
    const result = await run(["--add", "x"], repo.dir, repo.env);
    assert.deepEqual([lines(result), readConfig(repo.dir)], [["STATUS=stale"], before]);
  });
});

for (const name of ["Docs", "-docs", "../escape", "a b", ""]) {
  test(`--add of the invalid name ${JSON.stringify(name)} prints STATUS=invalid-name and leaves the file untouched`, async () => {
    await withGitRepo(async (repo) => {
      const before = config("  extensions:");
      writeFile(repo.dir, ".claude/viber.yml", before);
      const result = await run(["--add", name], repo.dir, repo.env);
      assert.deepEqual([lines(result), readConfig(repo.dir)], [["STATUS=invalid-name"], before]);
    });
  });
}

test("with no argument and no .claude/viber.yml it prints CONFIG=no-config with nothing listed", async () => {
  await withGitRepo(async (repo) => {
    const printed = lines(await run([], repo.dir, repo.env));
    assert.deepEqual(printed, ["CONFIG=no-config", "LISTED=none", "MISSING=none"]);
  });
});

test("with no argument and no extensions: key under build: it prints CONFIG=stale", async () => {
  await withGitRepo(async (repo) => {
    writeFile(repo.dir, ".claude/viber.yml", ["schema: 2", "build:", "  memory: true", ""].join("\n"));
    const printed = lines(await run([], repo.dir, repo.env));
    assert.equal(printed[0], "CONFIG=stale");
  });
});
