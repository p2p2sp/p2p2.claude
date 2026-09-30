/*
 * bootstrap.test.ts - proves viber/skills/setup/scripts/bootstrap.sh seeds a
 * host project from the skill's own bundled files and never overwrites a value
 * the project already carries: `.claude/viber.yml` from templates/viber.yml, and
 * `.gitignore` from templates/gitignore.txt when the project has none - otherwise
 * the file stays the user's and the single edit is the `.temp/` rule, appended
 * on its own line even when the file ends without one. `CLAUDE.md` is the one
 * item it only REPORTS, never creates (a skeleton would name no command): the
 * line is `CLAUDE.md: present - <root>/CLAUDE.md`, the absolute path at the
 * repository root, so the skill can judge the content itself, or a plain
 * `CLAUDE.md: missing`.
 *
 * An existing `viber.yml` is MERGED rather than left alone, because a new
 * version ships new switches a file seeded by an older one would never see. The
 * merge runs in one direction: a top-level key the template has and the file
 * lacks is appended with its own comment and default, a missing child of the
 * `directories:` group is inserted inside that group where a reader looks for
 * it, and every key the file already declares keeps its value, its comment and
 * its position.
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

import { test } from "../harness/test.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { slash } from "../harness/paths.ts";
import { runScript } from "../harness/run.ts";
import { coreUtilsPath, withStub } from "../harness/stub.ts";
import { withGitRepo, withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/setup/scripts/bootstrap.sh");
const TEMPLATE_GITIGNORE = path.resolve(import.meta.dirname, "../../viber/skills/setup/templates/gitignore.txt");
const TEMPLATE_CONFIG = path.resolve(import.meta.dirname, "../../viber/skills/setup/templates/viber.yml");
const CONFIG_SH = path.resolve(import.meta.dirname, "../../viber/scripts/config.sh");

// A stub gh is always first on PATH, so the gh line never depends on whether
// the machine running the suite has the real one installed.
function run(dir: string, env: Record<string, string> = {}) {
  return withStub("gh", "exit 0", (stubDir) =>
    runScript(SUT, [], { cwd: dir, env, shell: "bash", stubDirs: [stubDir] }),
  );
}

function read(file: string): string {
  return fs.readFileSync(file, "utf-8");
}

function configPath(root: string): string {
  return path.join(root, ".claude", "viber.yml");
}

/** The repository root as `git rev-parse --show-toplevel` spells it: the real
 *  path (macOS /var is /private/var, a Windows temp dir may carry an 8.3 short
 *  name), slash-normalised. */
function repoRoot(dir: string): string {
  return slash(fs.realpathSync.native(dir));
}

/** The printed CLAUDE.md lines, slash-normalised. */
function claudeMdLines(stdout: string): string[] {
  return stdout.split(/\r?\n/).filter((l) => l.startsWith("CLAUDE.md:")).map(slash);
}

test("a fresh repository seeds both files from the bundled ones and prints one line each, exit 0", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      [
        "viber.yml: seeded from template - every switch is commented in it",
        ".gitignore: created from template (ignores .temp/)",
        "settings.json: absent",
        "CLAUDE.md: missing",
        "gh: present",
        "",
      ].join("\n"),
    );
    assert.equal(read(configPath(dir)), read(TEMPLATE_CONFIG));
    assert.equal(read(path.join(dir, ".gitignore")), read(TEMPLATE_GITIGNORE));
  });
});

test("the bundled .gitignore already carries the .temp/ rule, so a fresh seed needs no append", () => {
  // The seeded file IS the template byte for byte (asserted above), so the run's
  // own second step must recognise the rule rather than duplicate it.
  assert.match(read(TEMPLATE_GITIGNORE), /^\.temp\/$/m);
});

test("running twice leaves both files byte-identical and reports them as already present", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const first = await run(dir, env);
    assert.equal(first.status, 0, `stderr: ${first.stderr}`);
    const afterFirstConfig = read(configPath(dir));
    const afterFirstIgnore = read(path.join(dir, ".gitignore"));

    const second = await run(dir, env);

    assert.equal(second.status, 0, `stderr: ${second.stderr}`);
    assert.equal(
      second.stdout,
      [
        "viber.yml: already present and complete (left untouched)",
        ".gitignore: already ignores .temp/",
        "settings.json: absent",
        "CLAUDE.md: missing",
        "gh: present",
        "",
      ].join("\n"),
    );
    assert.equal(read(configPath(dir)), afterFirstConfig);
    assert.equal(read(path.join(dir, ".gitignore")), afterFirstIgnore);
  });
});

test("a project that already has a .gitignore keeps it: only the .temp/ rule is appended, the bundled one is never copied over it", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    fs.writeFileSync(ignore, "node_modules/\n*.log\n");

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: \.temp\/ appended$/m);
    assert.equal(read(ignore), "node_modules/\n*.log\n.temp/\n");
  });
});

test("an existing .gitignore with no final newline gets the rule on its own line (a glued '*.log.temp/' would ignore nothing)", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    fs.writeFileSync(ignore, "node_modules/\n*.log"); // no trailing newline

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(read(ignore), "node_modules/\n*.log\n.temp/\n");
  });
});

test("a bare '.temp' rule (no trailing slash) counts as present - the file is left byte-for-byte untouched", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    const before = "# mine\n  .temp  \nbuild/\n";
    fs.writeFileSync(ignore, before);

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: already ignores \.temp\/$/m);
    assert.equal(read(ignore), before);
  });
});

test("a commented-out .temp line does not count as the rule, so it is still appended", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    fs.writeFileSync(ignore, "# .temp/\n");

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: \.temp\/ appended$/m);
    assert.equal(read(ignore), "# .temp/\n.temp/\n");
  });
});

test("a config seeded by an older version keeps its own values and gains only the keys the template adds", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    fs.writeFileSync(cfg, "adr: false\nmemory: false\nrules: false\n");

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^viber\.yml: merged from the template: qa, cleanup, final-review, plain-plan-review, issues, fast-path, baseline-tests, directories, tiers, branching \(your own values kept\)$/m);

    const after = read(cfg);
    // Every value the user set survives, values included - a merge that reset a
    // switch to the template default would silently re-enable what they turned off.
    assert.match(after, /^adr: false$/m);
    assert.match(after, /^memory: false$/m);
    assert.match(after, /^rules: false$/m);
    assert.equal(after.startsWith("adr: false\nmemory: false\nrules: false\n"), true, "existing keys keep their position");
    // The new keys arrive at the template's default, each under its own comment.
    assert.match(after, /^qa: false$/m);
    assert.match(after, /^cleanup: true$/m);
    assert.match(after, /^final-review: true$/m);
    assert.match(after, /^plain-plan-review: true$/m);
    assert.match(after, /^issues: false$/m);
    assert.match(after, /^fast-path: true$/m);
    assert.match(after, /^baseline-tests: false$/m);
    assert.match(after, /^directories:\n {2}runs: _specs\n {2}specifications: specs$/m);
    assert.match(after, /^tiers:\n {2}min: haiku\n {2}max: opus$/m);
    assert.match(
      after,
      /^branching:\n {2}mode: off\n {2}work:\n {4}main:\n {6}base: main\n {6}name: '\{type\}\/\{slug\}'\n {6}target: main\n {2}# issue-type-mappings:\n {2}# {3}bug: main$/m,
    );
    assert.match(after, /# implementor writes the build's QA scenarios at the close[\s\S]*^qa: false$/m);
  });
});

test("a config lacking `fast-path` gains it on, every other value kept", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    fs.writeFileSync(cfg, "adr: false\nqa: true\nissues: true\n");

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const resolved = await runScript(CONFIG_SH, [], { cwd: dir, env, shell: "bash" });
    assert.match(resolved.stdout, /^fast-path: true$/m);
    assert.match(resolved.stdout, /^adr: false$/m);
    assert.match(resolved.stdout, /^qa: true$/m);
    assert.match(resolved.stdout, /^issues: true$/m);
  });
});

test("a config holding `fast-path: false` keeps it off through the merge", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    fs.writeFileSync(cfg, "adr: true\nfast-path: false\n");

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(read(cfg), /^fast-path: false$/m);
    assert.doesNotMatch(read(cfg), /^fast-path: true$/m);
  });
});

test("the template seeds `baseline-tests` off", () => {
  assert.match(read(TEMPLATE_CONFIG), /^baseline-tests: false$/m);
});

test("a config lacking `baseline-tests` gains it off on merge, every other value kept", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    const before = "adr: false\nqa: true\nissues: true\nfast-path: false\n";
    fs.writeFileSync(cfg, before);

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const after = read(cfg);
    assert.equal(after.startsWith(before), true, "every existing line keeps its value and position");
    assert.match(after, /^baseline-tests: false$/m);
  });
});

test("merging is idempotent: a second run over the merged file reports it complete and changes nothing", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    fs.writeFileSync(cfg, "adr: false\n");

    await run(dir, env);
    const merged = read(cfg);
    const second = await run(dir, env);

    assert.equal(second.status, 0, `stderr: ${second.stderr}`);
    assert.match(second.stdout, /^viber\.yml: already present and complete \(left untouched\)$/m);
    assert.equal(read(cfg), merged);
  });
});

test("a missing child of the directories group is inserted INSIDE the group, not appended past it", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    // A second top-level key after the group proves the insertion point: appending
    // the child at the end of the file would put it outside the group, where the
    // three readers that parse that group would never see it.
    fs.writeFileSync(cfg, "adr: true\nmemory: true\nrules: true\nqa: true\ndirectories:\n  runs: builds\ncleanup: true\nfinal-review: true\nplain-plan-review: true\nissues: true\nfast-path: true\nbaseline-tests: false\ntiers:\n  min: haiku\n  max: opus\nbranching:\n  mode: off\n  base: main\n  name: '{type}/{issue}-{slug}'\n");

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^viber\.yml: merged from the template: directories\.specifications \(your own values kept\)$/m);
    assert.equal(
      read(cfg),
      "adr: true\nmemory: true\nrules: true\nqa: true\ndirectories:\n  runs: builds\n  specifications: specs\ncleanup: true\nfinal-review: true\nplain-plan-review: true\nissues: true\nfast-path: true\nbaseline-tests: false\ntiers:\n  min: haiku\n  max: opus\nbranching:\n  mode: off\n  base: main\n  name: '{type}/{issue}-{slug}'\n",
    );
  });
});

test("a directories key carrying a value instead of a group is left exactly as it is", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    const before = "adr: true\nmemory: true\nrules: true\nqa: true\ncleanup: true\nfinal-review: true\nplain-plan-review: true\nissues: true\nfast-path: true\nbaseline-tests: false\ndirectories: nonsense\ntiers:\n  min: haiku\n  max: opus\nbranching:\n  mode: off\n  base: main\n  name: '{type}/{issue}-{slug}'\n";
    fs.writeFileSync(cfg, before);

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^viber\.yml: already present and complete \(left untouched\)$/m);
    assert.equal(read(cfg), before);
  });
});

test("a key written with blanks before its colon counts as declared, so a switch turned off that way stays off (config.sh reads the same grammar and would take an appended default)", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    const before = "adr: true\nmemory: true\nrules: true\nqa: true\ncleanup: true\nfinal-review\t: true\nplain-plan-review : false\nissues\t: true\nfast-path : true\nbaseline-tests\t: false\ndirectories :\n  runs : builds\n  specifications\t: archive\ntiers:\n  min: haiku\n  max: opus\nbranching:\n  mode: off\n";
    fs.writeFileSync(cfg, before);

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^viber\.yml: already present and complete \(left untouched\)$/m);
    assert.equal(read(cfg), before);

    const resolved = await runScript(CONFIG_SH, [], { cwd: dir, env, shell: "bash" });
    assert.match(resolved.stdout, /^plain-plan-review: false$/m);
    assert.match(resolved.stdout, /^directories\.runs: builds$/m);
  });
});

test("a CRLF config comes back with ONE ending throughout, never a mix of the two", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    fs.writeFileSync(cfg, "adr: true\r\nmemory: true\r\nrules: true\r\ncleanup: true\r\ndirectories:\r\n  runs: _specs\r\n");

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const after = read(cfg);
    // Which ending survives is the platform's: an awk that reads in text mode
    // (Git-Bash) hands the merge LF-only lines and the file is rewritten LF.
    // A MIXED file is the defect either way - a line-based reader takes the
    // stray CR as part of the value, so `specs` would silently become `specs\r`.
    const crlf = (after.match(/\r\n/g) ?? []).length;
    const lf = (after.match(/\n/g) ?? []).length;
    assert.equal(crlf === 0 || crlf === lf, true, `mixed line endings: ${crlf} CRLF of ${lf} lines`);
    assert.match(after.replace(/\r/g, ""), /^ {2}specifications: specs$/m);
    assert.match(after.replace(/\r/g, ""), /^qa: false$/m);
  });
});

test("a config already carrying every template key is byte-identical after a run", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    // The user's own wording and ordering, not the template's: the merge reads
    // which keys are declared, never how the file is written.
    const before = "# my own header\ncleanup: false\nfinal-review: false\nplain-plan-review: false\nissues: false\nfast-path: false\nbaseline-tests: true\nqa: true\nrules: true\nmemory: true\nadr: true\n\ndirectories:\n  specifications: archive\n  runs: open\ntiers:\n  max: sonnet\n  min: sonnet\nbranching:\n  name: '{type}/{issue}-{slug}'\n  base: develop\n  mode: required\n";
    fs.writeFileSync(cfg, before);

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^viber\.yml: already present and complete \(left untouched\)$/m);
    // final-review: false survives the merge byte-for-byte, same as every other
    // switch the user set - a merge that reset it to the template default would
    // silently re-enable the reviewer.
    assert.equal(read(cfg), before);
  });
});

test("a rooted '/.temp/' rule counts as present - no second .temp entry is appended", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    const before = "node_modules/\n/.temp/\nbuild/\n";
    fs.writeFileSync(ignore, before);

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: already ignores \.temp\/$/m);
    assert.equal(read(ignore), before);
  });
});

test("a '.temp/**' glob rule counts as present - no second .temp entry is appended", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    const before = "node_modules/\n.temp/**\nbuild/\n";
    fs.writeFileSync(ignore, before);

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: already ignores \.temp\/$/m);
    assert.equal(read(ignore), before);
  });
});

test("a '.temp/*' glob rule counts as present - no second .temp entry is appended", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    const before = "node_modules/\n.temp/*\nbuild/\n";
    fs.writeFileSync(ignore, before);

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: already ignores \.temp\/$/m);
    assert.equal(read(ignore), before);
  });
});

test("an unanchored '**/.temp/' rule counts as present - no second .temp entry is appended", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    const before = "node_modules/\n**/.temp/\nbuild/\n";
    fs.writeFileSync(ignore, before);

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: already ignores \.temp\/$/m);
    assert.equal(read(ignore), before);
  });
});

test("a negated '!.temp/' rule does NOT count as present - the entry is still appended (a negation un-ignores, it does not ignore)", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    const before = "node_modules/\n!.temp/\nbuild/\n";
    fs.writeFileSync(ignore, before);

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: \.temp\/ appended$/m);
    assert.equal(read(ignore), before + ".temp/\n");
  });
});

test("an existing .claude/settings.json at the repository root is reported present and left byte-unchanged (the skill asks reset or merge on this line)", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const settings = path.join(dir, ".claude", "settings.json");
    fs.mkdirSync(path.dirname(settings), { recursive: true });
    const before = '{ "permissions": {} }\n';
    fs.writeFileSync(settings, before);
    const nested = path.join(dir, "src");
    fs.mkdirSync(nested);

    const result = await run(nested, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^settings\.json: present$/m);
    assert.equal(read(settings), before);
  });
});

test("a project with a CLAUDE.md gets the absolute path of the file at the repository root, and the file is left byte-unchanged (the skill reads it through that path)", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const memory = path.join(dir, "CLAUDE.md");
    const before = "# project\n\nBuild: make\nTest: make test\n";
    fs.writeFileSync(memory, before);

    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(
      claudeMdLines(result.stdout).includes(`CLAUDE.md: present - ${repoRoot(dir)}/CLAUDE.md`),
      `stdout: ${result.stdout}`,
    );
    assert.equal(read(memory), before);
  });
});

test("a project without a CLAUDE.md gets a plain 'CLAUDE.md: missing' and no skeleton (a created file would name no command)", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const result = await run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^CLAUDE\.md: missing$/m);
    assert.equal(fs.existsSync(path.join(dir, "CLAUDE.md")), false);
  });
});

test("the CLAUDE.md check resolves at the repository root, and the printed path names the root, not the cwd it was called from", async () => {
  await withGitRepo(async ({ dir, env }) => {
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# root\n");
    const nested = path.join(dir, "src", "deep");
    fs.mkdirSync(nested, { recursive: true });

    const result = await run(nested, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(
      claudeMdLines(result.stdout).includes(`CLAUDE.md: present - ${repoRoot(dir)}/CLAUDE.md`),
      `stdout: ${result.stdout}`,
    );
  });
});

test("a gh on PATH is reported present and never run (the stub would fail the run if it were)", async () => {
  await withTempDir("p2p2-viber-bootstrap-gh-", async (dir) => {
    const result = await withStub("gh", "exit 1", (stubDir) =>
      runScript(SUT, [], { cwd: dir, env: {}, shell: "bash", stubDirs: [stubDir] }),
    );

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^gh: present$/m);
  });
});

const ghOnCorePath = coreUtilsPath()
  .split(path.delimiter)
  .some((d) => ["gh", "gh.exe"].some((n) => fs.existsSync(path.join(d, n))));

test(
  "no gh on PATH is reported as missing with the install hint, and the exit is still 0",
  { skip: ghOnCorePath ? "a real gh sits in the core utilities directory, so its absence cannot be staged" : false },
  async () => {
    await withTempDir("p2p2-viber-bootstrap-nogh-", async (dir) => {
      const result = await runScript(SUT, [], { cwd: dir, env: { PATH: coreUtilsPath() }, shell: "bash" });

      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^gh: missing - install the GitHub CLI \(https:\/\/cli\.github\.com\), then run gh auth login$/m);
    });
  },
);

test("run from a subdirectory: both files land at the repository root, not in the subdirectory", async () => {
  await withGitRepo(async ({ dir, env }) => {
    const nested = path.join(dir, "src", "deep");
    fs.mkdirSync(nested, { recursive: true });

    const result = await run(nested, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(fs.existsSync(configPath(dir)), "viber.yml should be seeded at the repository root");
    assert.ok(fs.existsSync(path.join(dir, ".gitignore")), ".gitignore should be seeded at the repository root");
    assert.equal(fs.existsSync(path.join(nested, ".gitignore")), false);
    assert.equal(fs.existsSync(configPath(nested)), false);
  });
});

test("outside a repository the cwd is the base - the seeding still happens and the exit is still 0", async () => {
  await withTempDir("p2p2-viber-bootstrap-", async (dir) => {
    const result = await run(dir);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(fs.existsSync(configPath(dir)));
    assert.ok(fs.existsSync(path.join(dir, ".gitignore")));
  });
});

test("outside a repository the CLAUDE.md line names a path the reader opens as written (Git Bash /c/... is no path to a Windows reader)", async () => {
  await withTempDir("p2p2-viber-bootstrap-", async (dir) => {
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# project\n");
    const result = await run(dir);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    const line = claudeMdLines(result.stdout).find((l) => l.startsWith("CLAUDE.md: present - "));
    assert.ok(line, `stdout: ${result.stdout}`);
    const printed = line.slice("CLAUDE.md: present - ".length);
    assert.equal(fs.realpathSync.native(printed), fs.realpathSync.native(path.join(dir, "CLAUDE.md")));
  });
});

test("a read-only project root still exits 0 (fail-soft on every mutation)", async () => {
  await withTempDir("p2p2-viber-bootstrap-readonly-", async (scratch) => {
    const projectRoot = path.join(scratch, "project");
    fs.mkdirSync(projectRoot);
    // Best-effort: on POSIX this actually blocks writes into the directory; on
    // platforms where chmod does not enforce it (Windows, or a root-run CI
    // container) the seeding simply succeeds instead - either way the script's
    // contract is "exit 0 always", which is what we assert.
    fs.chmodSync(projectRoot, 0o555);
    try {
      const result = await run(projectRoot);
      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    } finally {
      fs.chmodSync(projectRoot, 0o755);
    }
  });
});
