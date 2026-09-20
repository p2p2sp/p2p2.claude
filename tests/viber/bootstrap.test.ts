/*
 * bootstrap.test.ts - proves viber/skills/setup/scripts/bootstrap.sh seeds a
 * host project from the skill's own bundled files and never overwrites what the
 * project already has: `.claude/viber.yml` from templates/viber.yml, and
 * `.gitignore` from assets/gitignore.txt when the project has none - otherwise
 * the file stays the user's and the single edit is the `.temp/` rule, appended
 * on its own line even when the file ends without one.
 *
 * Two properties carry the design. It resolves the REPOSITORY ROOT itself, so a
 * session started in a subdirectory still seeds the root rather than scattering
 * a second .gitignore. And it ALWAYS exits 0, because it runs as a `!` preload
 * where a non-zero exit aborts the whole skill load - a project that refuses one
 * of these files is not a broken setup.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/bootstrap.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withGitRepo, withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/setup/scripts/bootstrap.sh");
const ASSET_GITIGNORE = path.resolve(import.meta.dirname, "../../viber/skills/setup/assets/gitignore.txt");
const TEMPLATE_CONFIG = path.resolve(import.meta.dirname, "../../viber/skills/setup/templates/viber.yml");

function run(dir: string, env: Record<string, string> = {}) {
  return runScript(SUT, [], { cwd: dir, env, shell: "bash" });
}

function read(file: string): string {
  return fs.readFileSync(file, "utf-8");
}

function configPath(root: string): string {
  return path.join(root, ".claude", "viber.yml");
}

test("a fresh repository seeds both files from the bundled ones and prints one line each, exit 0", () => {
  withGitRepo(({ dir, env }) => {
    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      [
        "viber.yml: seeded from template - adr, memory and rules all on",
        ".gitignore: created from template (ignores .temp/)",
        "",
      ].join("\n"),
    );
    assert.equal(read(configPath(dir)), read(TEMPLATE_CONFIG));
    assert.equal(read(path.join(dir, ".gitignore")), read(ASSET_GITIGNORE));
  });
});

test("the bundled .gitignore already carries the .temp/ rule, so a fresh seed needs no append", () => {
  // The seeded file IS the asset byte for byte (asserted above), so the run's
  // own second step must recognise the rule rather than duplicate it.
  assert.match(read(ASSET_GITIGNORE), /^\.temp\/$/m);
});

test("running twice leaves both files byte-identical and reports them as already present", () => {
  withGitRepo(({ dir, env }) => {
    const first = run(dir, env);
    assert.equal(first.status, 0, `stderr: ${first.stderr}`);
    const afterFirstConfig = read(configPath(dir));
    const afterFirstIgnore = read(path.join(dir, ".gitignore"));

    const second = run(dir, env);

    assert.equal(second.status, 0, `stderr: ${second.stderr}`);
    assert.equal(
      second.stdout,
      ["viber.yml: already present (left untouched)", ".gitignore: already ignores .temp/", ""].join("\n"),
    );
    assert.equal(read(configPath(dir)), afterFirstConfig);
    assert.equal(read(path.join(dir, ".gitignore")), afterFirstIgnore);
  });
});

test("a project that already has a .gitignore keeps it: only the .temp/ rule is appended, the bundled one is never copied over it", () => {
  withGitRepo(({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    fs.writeFileSync(ignore, "node_modules/\n*.log\n");

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: \.temp\/ appended$/m);
    assert.equal(read(ignore), "node_modules/\n*.log\n.temp/\n");
  });
});

test("an existing .gitignore with no final newline gets the rule on its own line (a glued '*.log.temp/' would ignore nothing)", () => {
  withGitRepo(({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    fs.writeFileSync(ignore, "node_modules/\n*.log"); // no trailing newline

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(read(ignore), "node_modules/\n*.log\n.temp/\n");
  });
});

test("a bare '.temp' rule (no trailing slash) counts as present - the file is left byte-for-byte untouched", () => {
  withGitRepo(({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    const before = "# mine\n  .temp  \nbuild/\n";
    fs.writeFileSync(ignore, before);

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: already ignores \.temp\/$/m);
    assert.equal(read(ignore), before);
  });
});

test("a commented-out .temp line does not count as the rule, so it is still appended", () => {
  withGitRepo(({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    fs.writeFileSync(ignore, "# .temp/\n");

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: \.temp\/ appended$/m);
    assert.equal(read(ignore), "# .temp/\n.temp/\n");
  });
});

test("a pre-existing viber.yml is the user's: byte-unchanged even with every switch flipped off", () => {
  withGitRepo(({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    const before = "adr: false\nmemory: false\nrules: false\n";
    fs.writeFileSync(cfg, before);

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^viber\.yml: already present \(left untouched\)$/m);
    assert.equal(read(cfg), before);
  });
});

test("run from a subdirectory: both files land at the repository root, not in the subdirectory", () => {
  withGitRepo(({ dir, env }) => {
    const nested = path.join(dir, "src", "deep");
    fs.mkdirSync(nested, { recursive: true });

    const result = run(nested, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(fs.existsSync(configPath(dir)), "viber.yml should be seeded at the repository root");
    assert.ok(fs.existsSync(path.join(dir, ".gitignore")), ".gitignore should be seeded at the repository root");
    assert.equal(fs.existsSync(path.join(nested, ".gitignore")), false);
    assert.equal(fs.existsSync(configPath(nested)), false);
  });
});

test("outside a repository the cwd is the base - the seeding still happens and the exit is still 0", () => {
  withTempDir("p2p2-viber-bootstrap-", (dir) => {
    const result = run(dir);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(fs.existsSync(configPath(dir)));
    assert.ok(fs.existsSync(path.join(dir, ".gitignore")));
  });
});

test("a read-only project root still exits 0 (fail-soft on every mutation)", () => {
  withTempDir("p2p2-viber-bootstrap-readonly-", (scratch) => {
    const projectRoot = path.join(scratch, "project");
    fs.mkdirSync(projectRoot);
    // Best-effort: on POSIX this actually blocks writes into the directory; on
    // platforms where chmod does not enforce it (Windows, or a root-run CI
    // container) the seeding simply succeeds instead - either way the script's
    // contract is "exit 0 always", which is what we assert.
    fs.chmodSync(projectRoot, 0o555);
    try {
      const result = run(projectRoot);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    } finally {
      fs.chmodSync(projectRoot, 0o755);
    }
  });
});
