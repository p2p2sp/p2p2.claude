/*
 * lens-map-signals.test.ts - proves every map-signal command a lens signals
 * file (`<lens>.signals.md` in viber/skills/code-auditor/references/lenses/)
 * tells the mapper to run is one bash actually executes: each ```bash block is
 * lifted from the signals file verbatim, its `<scope>` placeholder replaced by `.`, and run with empty stdin
 * from the root of a throwaway repository holding a few source files and a
 * fix history. A command passes on exit 0, or on exit 1 with empty stderr (a
 * grep or git grep matching nothing); anything else is a broken command.
 *
 * It also proves the window of the bugs signals file's first block, the
 * fix-history command: git answers a `--since` value it cannot parse with exit 0 and an
 * empty log, so only running it shows a 5-day-old fix listed and a
 * 400-day-old fix and a non-fix commit left out.
 *
 * It also runs blocks on a directory scope holding a space, on a non-ASCII
 * file name (git quotes such a path unless core.quotePath is off), and the
 * web-performance framework blocks on a scope below the app root.
 *
 * One case per signals file carries the file name, so
 * `--test-name-pattern "bugs\.signals"` selects that lens alone.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/lens-map-signals.test.ts
 */

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withGitRepo, withTempDir, type GitRepo } from "../harness/tmp.ts";
import { forEachShell, type Shell } from "../harness/shells.ts";

const LENSES = path.resolve(import.meta.dirname, "../../viber/skills/code-auditor/references/lenses");
const DAY_MS = 24 * 3600 * 1000;

async function assertBash(fn: (shell: Shell) => void | Promise<void>) {
  const skips = await forEachShell("bash", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "bash");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

/** Every ```bash block of a signals file, `<scope>` substituted by `scope` the
 *  way the mapper substitutes it (`.` for the repository-wide scope). */
function mapSignalCommands(file: string, scope = "."): string[] {
  const text = fs.readFileSync(path.join(LENSES, file), "utf-8");
  return [...text.matchAll(/^```bash\r?\n([\s\S]*?)^```/gm)].map((m) => m[1].trim().replaceAll("<scope>", scope));
}

/** Commits whatever is staged `daysAgo` days in the past (author == committer
 *  date), so the 12-month window is exercised whenever the suite runs. */
async function commitAt(repo: GitRepo, daysAgo: number, message: string): Promise<void> {
  const date = new Date(Date.now() - daysAgo * DAY_MS).toISOString();
  const env = { ...repo.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
  const add = await runScript("git", ["add", "-A"], { cwd: repo.dir, env });
  assert.equal(add.status, 0, `git add failed: ${add.stderr}`);
  const commit = await runScript("git", ["commit", "-q", "-m", message], { cwd: repo.dir, env });
  assert.equal(commit.status, 0, `git commit failed: ${commit.stderr}`);
}

function write(repo: GitRepo, file: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(repo.dir, file)), { recursive: true });
  fs.writeFileSync(path.join(repo.dir, file), content);
}

/** A seed of a few source files 500 days old, a fix 400 days old, a non-fix
 *  commit 10 days old and a fix 5 days old, each later commit touching a file
 *  of its own so the files a command lists name the commits it kept. */
async function buildHistory(repo: GitRepo): Promise<void> {
  write(repo, "README.md", "# sample\n");
  write(repo, "config.json", '{ "retry_count": 3, "base_url": "http://localhost" }\n');
  write(repo, "src/app.js", "try { run(); } catch (e) {}\n");
  write(repo, "src/util.py", "try:\n    load()\nexcept OSError: pass\n");
  write(repo, "scripts/build.sh", "#!/bin/sh\nrm -rf out 2>/dev/null || true\n");
  await commitAt(repo, 500, "chore: seed the tree");

  write(repo, "src/ancient.js", "export const ancient = 1;\n");
  await commitAt(repo, 400, "fix: ancient crash outside the window");

  write(repo, "src/feature.js", "export const feature = 1;\n");
  await commitAt(repo, 10, "feat: add the export feature");

  write(repo, "src/recent.js", "export const recent = 1;\n");
  await commitAt(repo, 5, "fix: recent crash inside the window");
}

async function runCommand(shell: Shell, repo: GitRepo, command: string): Promise<RunResult> {
  return await withTempDir("p2p2-lens-signal-", (dir) => {
    const script = path.join(dir, "signal.sh");
    fs.writeFileSync(script, `#!/usr/bin/env bash\n${command}\n`);
    return runScript(script, [], { shell, cwd: repo.dir, env: repo.env, input: "" });
  });
}

/** `ok` for exit 0, or exit 1 with empty stderr; otherwise what went wrong. */
function verdict(result: RunResult): string {
  const accepted = result.status === 0 || (result.status === 1 && result.stderr === "");
  return accepted ? "ok" : `exit ${result.status}, stderr: ${result.stderr}`;
}

async function verdicts(shell: Shell, repo: GitRepo, commands: string[]): Promise<{ command: string; verdict: string }[]> {
  const results = await Promise.all(commands.map((command) => runCommand(shell, repo, command)));
  return results.map((result, i) => ({ command: commands[i], verdict: verdict(result) }));
}

function allOk(commands: string[]): { command: string; verdict: string }[] {
  return commands.map((command) => ({ command, verdict: "ok" }));
}

const SIGNALS_FILES = fs.readdirSync(LENSES).filter((name) => name.endsWith(".signals.md")).sort();

for (const file of SIGNALS_FILES) {
  test(`every map-signal command of the signals file ${file} runs under bash in a throwaway repository and exits 0, or 1 with empty stderr`, async () => {
    const commands = mapSignalCommands(file);
    await withGitRepo(async (repo) => {
      await buildHistory(repo);
      await assertBash(async (shell) => {
        assert.deepEqual(await verdicts(shell, repo, commands), allOk(commands));
      });
    });
  });
}

test("the first map-signal command of bugs.signals.md, the fix history, lists a 5-day-old fix and leaves out a 400-day-old fix and a non-fix commit (git takes a --since it cannot parse as an empty window)", async () => {
  const fixHistory = mapSignalCommands("bugs.signals.md")[0];
  await withGitRepo(async (repo) => {
    await buildHistory(repo);
    await assertBash(async (shell) => {
      const result = await runCommand(shell, repo, fixHistory);
      assert.equal(result.status, 0, `the fix-history command must succeed: stderr=${result.stderr}`);
      assert.match(result.stdout, /src\/recent\.js/, `a fix inside the window must be listed:\n${fixHistory}\n${result.stdout}`);
      assert.doesNotMatch(result.stdout, /src\/ancient\.js/, "a fix older than 12 months is out of the window");
      assert.doesNotMatch(result.stdout, /src\/feature\.js/, "a non-fix subject is out of the fix history");
    });
  });
});

test("on the directory scope 'src/my app' the fix-history and error-swallowing commands of bugs.signals.md list src/my app/inside.js and never app/outside.js (an unquoted scope splits into two pathspecs)", async () => {
  const commands = mapSignalCommands("bugs.signals.md", "src/my app");
  const picked = [commands[0], commands[3]];
  await withGitRepo(async (repo) => {
    write(repo, "src/my app/inside.js", "try { run(); } catch (e) {}\n");
    write(repo, "app/outside.js", "try { go(); } catch (e) {}\n");
    await commitAt(repo, 5, "fix: crash in both");
    await assertBash(async (shell) => {
      for (const command of picked) {
        const result = await runCommand(shell, repo, command);
        assert.equal(result.status, 0, `${command}\nstderr=${result.stderr}`);
        assert.match(result.stdout, /src\/my app\/inside\.js/, `the scope's own file must be listed:\n${command}\n${result.stdout}`);
        assert.doesNotMatch(result.stdout, /outside\.js/, `a file outside the scope must not be listed:\n${command}\n${result.stdout}`);
      }
    });
  });
});

test("a non-ASCII source file src/żródło.js is listed by the first command of tests.signals.md, ends a row of the churn-times-size command of design.signals.md and is counted by the error-swallowing command of bugs.signals.md (git quotes such a path unless core.quotePath is off)", async () => {
  const noTest = mapSignalCommands("tests.signals.md")[0];
  const churnSize = mapSignalCommands("design.signals.md")[1];
  const swallowed = mapSignalCommands("bugs.signals.md")[3];
  await withGitRepo(async (repo) => {
    write(repo, "src/plain.js", "export const a = 1;\n");
    write(repo, "src/żródło.js", "export const b = 1;\n");
    await commitAt(repo, 10, "feat: two sources");
    write(repo, "src/plain.js", "export const a = 2;\n");
    write(repo, "src/żródło.js", "try { run(); } catch (e) {}\n");
    await commitAt(repo, 5, "feat: change both");
    await assertBash(async (shell) => {
      const listed = await runCommand(shell, repo, noTest);
      assert.equal(listed.status, 0, `stderr=${listed.stderr}`);
      assert.match(listed.stdout, /^src\/żródło\.js$/m, `a source file with no test must be listed:\n${listed.stdout}`);
      const rows = await runCommand(shell, repo, churnSize);
      assert.equal(rows.status, 0, `stderr=${rows.stderr}`);
      assert.match(rows.stdout, /^\d+ \d+ src\/żródło\.js$/m, `a churned file must hold a row:\n${rows.stdout}`);
      const counted = await runCommand(shell, repo, swallowed);
      assert.equal(counted.status, 0, `stderr=${counted.stderr}`);
      assert.match(counted.stdout, /^src\/żródło\.js:1$/m, `a swallowed error must be counted:\n${counted.stdout}`);
    });
  });
});

test("on the directory scope src the first two commands of web-performance.signals.md find next.config.js and package.json at the repository root (a framework is configured at the app root, above the scope)", async () => {
  const [configs, dependencies] = mapSignalCommands("web-performance.signals.md", "src");
  await withGitRepo(async (repo) => {
    write(repo, "package.json", '{ "dependencies": { "next": "14.0.0", "react": "18.2.0" } }\n');
    write(repo, "next.config.js", "module.exports = {};\n");
    write(repo, "src/components/Hero.tsx", 'import moment from "moment";\nexport default function Hero() { return <img src="/hero.png" />; }\n');
    await commitAt(repo, 5, "feat: app");
    await assertBash(async (shell) => {
      const found = await runCommand(shell, repo, configs);
      assert.equal(found.status, 0, `stderr=${found.stderr}`);
      assert.match(found.stdout, /^next\.config\.js$/m, `the framework config must be found:\n${found.stdout}`);
      const deps = await runCommand(shell, repo, dependencies);
      assert.equal(deps.status, 0, `stderr=${deps.stderr}`);
      assert.match(deps.stdout, /^package\.json$/m, `the framework dependency must be found:\n${deps.stdout}`);
    });
  });
});
