/*
 * bootstrap.test.ts - proves viber/skills/setup/scripts/bootstrap.sh seeds a
 * host project from the skill's own bundled files and never overwrites a value
 * the project already carries: `.claude/viber.yml` from templates/viber.yml, and
 * `.gitignore` from templates/gitignore.txt when the project has none - otherwise
 * the file stays the user's and the single edit is the `.temp/` rule, appended
 * on its own line even when the file ends without one. `CLAUDE.md` is the one
 * item it only REPORTS: the agents read the host's build and test commands from
 * it, and a stub written here would be exactly the file that names none.
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

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { coreUtilsPath, withStub } from "../harness/stub.ts";
import { withGitRepo, withTempDir } from "../harness/tmp.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/setup/scripts/bootstrap.sh");
const TEMPLATE_GITIGNORE = path.resolve(import.meta.dirname, "../../viber/skills/setup/templates/gitignore.txt");
const TEMPLATE_CONFIG = path.resolve(import.meta.dirname, "../../viber/skills/setup/templates/viber.yml");

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

test("a fresh repository seeds both files from the bundled ones and prints one line each, exit 0", () => {
  withGitRepo(({ dir, env }) => {
    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      [
        "viber.yml: seeded from template - every switch is commented in it",
        ".gitignore: created from template (ignores .temp/)",
        "settings.json: absent",
        "CLAUDE.md: missing - run /init, then add the build and test commands",
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
      [
        "viber.yml: already present and complete (left untouched)",
        ".gitignore: already ignores .temp/",
        "settings.json: absent",
        "CLAUDE.md: missing - run /init, then add the build and test commands",
        "gh: present",
        "",
      ].join("\n"),
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

test("a config seeded by an older version keeps its own values and gains only the keys the template adds", () => {
  withGitRepo(({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    fs.writeFileSync(cfg, "adr: false\nmemory: false\nrules: false\n");

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^viber\.yml: merged from the template: qa, cleanup, plain-plan-review, issues, directories, tiers, branching \(your own values kept\)$/m);

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
    assert.match(after, /^plain-plan-review: true$/m);
    assert.match(after, /^issues: true$/m);
    assert.match(after, /^directories:\n {2}runs: _specs\n {2}specifications: specs$/m);
    assert.match(after, /^tiers:\n {2}min: haiku\n {2}max: opus$/m);
    assert.match(after, /^branching:\n {2}mode: off\n {2}base: main\n {2}name: '\{type\}\/\{issue\}-\{slug\}'$/m);
    assert.match(after, /# implementor writes the build's QA scenarios at the close[\s\S]*^qa: false$/m);
  });
});

test("merging is idempotent: a second run over the merged file reports it complete and changes nothing", () => {
  withGitRepo(({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    fs.writeFileSync(cfg, "adr: false\n");

    run(dir, env);
    const merged = read(cfg);
    const second = run(dir, env);

    assert.equal(second.status, 0, `stderr: ${second.stderr}`);
    assert.match(second.stdout, /^viber\.yml: already present and complete \(left untouched\)$/m);
    assert.equal(read(cfg), merged);
  });
});

test("a missing child of the directories group is inserted INSIDE the group, not appended past it", () => {
  withGitRepo(({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    // A second top-level key after the group proves the insertion point: appending
    // the child at the end of the file would put it outside the group, where the
    // three readers that parse that group would never see it.
    fs.writeFileSync(cfg, "adr: true\nmemory: true\nrules: true\nqa: true\ndirectories:\n  runs: builds\ncleanup: true\nplain-plan-review: true\nissues: true\ntiers:\n  min: haiku\n  max: opus\nbranching:\n  mode: off\n  base: main\n  name: '{type}/{issue}-{slug}'\n");

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^viber\.yml: merged from the template: directories\.specifications \(your own values kept\)$/m);
    assert.equal(
      read(cfg),
      "adr: true\nmemory: true\nrules: true\nqa: true\ndirectories:\n  runs: builds\n  specifications: specs\ncleanup: true\nplain-plan-review: true\nissues: true\ntiers:\n  min: haiku\n  max: opus\nbranching:\n  mode: off\n  base: main\n  name: '{type}/{issue}-{slug}'\n",
    );
  });
});

test("a directories key carrying a value instead of a group is left exactly as it is", () => {
  withGitRepo(({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    const before = "adr: true\nmemory: true\nrules: true\nqa: true\ncleanup: true\nplain-plan-review: true\nissues: true\ndirectories: nonsense\ntiers:\n  min: haiku\n  max: opus\nbranching:\n  mode: off\n  base: main\n  name: '{type}/{issue}-{slug}'\n";
    fs.writeFileSync(cfg, before);

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^viber\.yml: already present and complete \(left untouched\)$/m);
    assert.equal(read(cfg), before);
  });
});

test("a CRLF config comes back with ONE ending throughout, never a mix of the two", () => {
  withGitRepo(({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    fs.writeFileSync(cfg, "adr: true\r\nmemory: true\r\nrules: true\r\ncleanup: true\r\ndirectories:\r\n  runs: _specs\r\n");

    const result = run(dir, env);

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

test("a config already carrying every template key is byte-identical after a run", () => {
  withGitRepo(({ dir, env }) => {
    const cfg = configPath(dir);
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    // The user's own wording and ordering, not the template's: the merge reads
    // which keys are declared, never how the file is written.
    const before = "# my own header\ncleanup: false\nplain-plan-review: false\nissues: false\nqa: true\nrules: true\nmemory: true\nadr: true\n\ndirectories:\n  specifications: archive\n  runs: open\ntiers:\n  max: sonnet\n  min: sonnet\nbranching:\n  name: '{type}/{issue}-{slug}'\n  base: develop\n  mode: required\n";
    fs.writeFileSync(cfg, before);

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^viber\.yml: already present and complete \(left untouched\)$/m);
    assert.equal(read(cfg), before);
  });
});

test("a rooted '/.temp/' rule counts as present - no second .temp entry is appended", () => {
  withGitRepo(({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    const before = "node_modules/\n/.temp/\nbuild/\n";
    fs.writeFileSync(ignore, before);

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: already ignores \.temp\/$/m);
    assert.equal(read(ignore), before);
  });
});

test("a '.temp/**' glob rule counts as present - no second .temp entry is appended", () => {
  withGitRepo(({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    const before = "node_modules/\n.temp/**\nbuild/\n";
    fs.writeFileSync(ignore, before);

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: already ignores \.temp\/$/m);
    assert.equal(read(ignore), before);
  });
});

test("a '.temp/*' glob rule counts as present - no second .temp entry is appended", () => {
  withGitRepo(({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    const before = "node_modules/\n.temp/*\nbuild/\n";
    fs.writeFileSync(ignore, before);

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: already ignores \.temp\/$/m);
    assert.equal(read(ignore), before);
  });
});

test("an unanchored '**/.temp/' rule counts as present - no second .temp entry is appended", () => {
  withGitRepo(({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    const before = "node_modules/\n**/.temp/\nbuild/\n";
    fs.writeFileSync(ignore, before);

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: already ignores \.temp\/$/m);
    assert.equal(read(ignore), before);
  });
});

test("a negated '!.temp/' rule does NOT count as present - the entry is still appended (a negation un-ignores, it does not ignore)", () => {
  withGitRepo(({ dir, env }) => {
    const ignore = path.join(dir, ".gitignore");
    const before = "node_modules/\n!.temp/\nbuild/\n";
    fs.writeFileSync(ignore, before);

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^\.gitignore: \.temp\/ appended$/m);
    assert.equal(read(ignore), before + ".temp/\n");
  });
});

test("an existing .claude/settings.json at the repository root is reported present and left byte-unchanged (the skill asks reset or merge on this line)", () => {
  withGitRepo(({ dir, env }) => {
    const settings = path.join(dir, ".claude", "settings.json");
    fs.mkdirSync(path.dirname(settings), { recursive: true });
    const before = '{ "permissions": {} }\n';
    fs.writeFileSync(settings, before);
    const nested = path.join(dir, "src");
    fs.mkdirSync(nested);

    const result = run(nested, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^settings\.json: present$/m);
    assert.equal(read(settings), before);
  });
});

test("a project with a CLAUDE.md is told to check it, and the file is left byte-unchanged", () => {
  withGitRepo(({ dir, env }) => {
    const memory = path.join(dir, "CLAUDE.md");
    const before = "# project\n\nBuild: make\nTest: make test\n";
    fs.writeFileSync(memory, before);

    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^CLAUDE\.md: present - check it names the build and test commands$/m);
    assert.equal(read(memory), before);
  });
});

test("a project without a CLAUDE.md gets the /init prompt and no stub (a seeded file would name no commands)", () => {
  withGitRepo(({ dir, env }) => {
    const result = run(dir, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^CLAUDE\.md: missing - run \/init, then add the build and test commands$/m);
    assert.equal(fs.existsSync(path.join(dir, "CLAUDE.md")), false);
  });
});

test("the CLAUDE.md check resolves at the repository root, not at the cwd it was called from", () => {
  withGitRepo(({ dir, env }) => {
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# root\n");
    const nested = path.join(dir, "src", "deep");
    fs.mkdirSync(nested, { recursive: true });

    const result = run(nested, env);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^CLAUDE\.md: present/m);
  });
});

test("a gh on PATH is reported present and never run (the stub would fail the run if it were)", () => {
  withTempDir("p2p2-viber-bootstrap-gh-", (dir) => {
    const result = withStub("gh", "exit 1", (stubDir) =>
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
  () => {
    withTempDir("p2p2-viber-bootstrap-nogh-", (dir) => {
      const result = runScript(SUT, [], { cwd: dir, env: { PATH: coreUtilsPath() }, shell: "bash" });

      assert.equal(result.status, 0, `stderr: ${result.stderr}`);
      assert.match(result.stdout, /^gh: missing - install the GitHub CLI \(https:\/\/cli\.github\.com\), then run gh auth login$/m);
    });
  },
);

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
