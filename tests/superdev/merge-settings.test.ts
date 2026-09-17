/*
 * merge-settings.test.ts - proves superdev/skills/setup/scripts/merge-settings.sh
 * merges the bundled permissions template into a host project's
 * .claude/settings.json additively (host order kept, template entries appended
 * once), idempotently (a second run rewrites nothing) and safely (a target that
 * is not valid JSON, or a host with no `node`, is left untouched and reported),
 * plus the shape of the shipped template itself - the single source of the
 * recommended allow/ask/deny lists the setup skill offers.
 *
 * The template is designed for a session with auto mode OFF: it seeds
 * permissions.disableAutoMode, so there is no classifier and every outcome is
 * decided by the static rules alone.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superdev/merge-settings.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { coreUtilsPath } from "../harness/stub.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../superdev/skills/setup/scripts/merge-settings.sh");
const ASSET_TEMPLATE = path.resolve(import.meta.dirname, "../../superdev/skills/setup/assets/settings.json");

/** A small file-local template so a merge assertion can name the exact
 *  entries and counts; the shipped asset is used only where the case is about
 *  the shipped asset itself (creation, the no-node block, its own shape). */
const FIXTURE_TEMPLATE = {
  $schema: "https://json.schemastore.org/claude-code-settings.json",
  permissions: {
    defaultMode: "acceptEdits",
    disableAutoMode: "disable",
    allow: ["Read", "Write", "Bash"],
    ask: ["Bash(git push:*)"],
    deny: ["Bash(sudo:*)", "Bash(rm -rf:*)"],
  },
};

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function fixtureTemplate(dir: string): string {
  const file = path.join(dir, "template.json");
  writeJson(file, FIXTURE_TEMPLATE);
  return file;
}

function targetPath(dir: string): string {
  return path.join(dir, ".claude", "settings.json");
}

function run(dir: string, template: string, target?: string): RunResult {
  const args = target === undefined ? [template] : [template, target];
  return runScript(SUT, args, { cwd: dir });
}

/** The no-node case starves PATH down to the core utilities (the script still
 *  needs bash, cat and command -v), so a developer's installed node cannot
 *  answer - and flip - the "not found" branch. */
function runWithoutNode(dir: string, template: string, target: string): RunResult {
  return runScript(SUT, [template, target], { cwd: dir, env: { PATH: coreUtilsPath() } });
}

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

test("no settings.json at all: the default target is created byte-identical to the shipped template, exit 0", () => {
  withTempDir("p2p2-merge-settings-", (dir) => {
    const result = run(dir, ASSET_TEMPLATE);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "settings.json: created from template\n");
    assert.equal(
      fs.readFileSync(targetPath(dir), "utf-8"),
      fs.readFileSync(ASSET_TEMPLATE, "utf-8"),
    );
  });
});

test("partial coverage: only the missing template entries are appended, after the host's own, and every other key survives", () => {
  withTempDir("p2p2-merge-settings-", (dir) => {
    const target = targetPath(dir);
    writeJson(target, {
      $schema: "https://json.schemastore.org/claude-code-settings.json",
      disableWorkflows: true,
      modelOverrides: { default: "claude-opus-4-8" },
      permissions: {
        additionalDirectories: ["C:/somewhere"],
        allow: ["Read", "HostOnlyTool"],
        ask: ["Bash(hostask:*)"],
        deny: ["Bash(hostonly:*)", "Bash(sudo:*)"],
      },
    });

    const result = run(dir, fixtureTemplate(dir), target);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      "settings.json: merged - added 2 allow, 1 ask, 1 deny, defaultMode set, autoMode disabled\n",
    );

    const merged = readJson(target);
    assert.deepEqual(merged.permissions.allow, ["Read", "HostOnlyTool", "Write", "Bash"]);
    assert.deepEqual(merged.permissions.ask, ["Bash(hostask:*)", "Bash(git push:*)"]);
    assert.deepEqual(merged.permissions.deny, ["Bash(hostonly:*)", "Bash(sudo:*)", "Bash(rm -rf:*)"]);
    assert.equal(merged.permissions.defaultMode, "acceptEdits");
    assert.equal(merged.permissions.disableAutoMode, "disable");
    // Host-only keys, at both levels, are carried over untouched.
    assert.equal(merged.disableWorkflows, true);
    assert.deepEqual(merged.modelOverrides, { default: "claude-opus-4-8" });
    assert.deepEqual(merged.permissions.additionalDirectories, ["C:/somewhere"]);
    // The atomic rewrite leaves no scratch file behind.
    assert.equal(fs.existsSync(`${target}.tmp`), false);
  });
});

test("permissions without defaultMode: the template's mode is set and reported as 'defaultMode set'", () => {
  withTempDir("p2p2-merge-settings-", (dir) => {
    const target = targetPath(dir);
    writeJson(target, {
      permissions: {
        allow: ["Read", "Write", "Bash"],
        ask: ["Bash(git push:*)"],
        deny: ["Bash(sudo:*)", "Bash(rm -rf:*)"],
      },
    });

    const result = run(dir, fixtureTemplate(dir), target);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      "settings.json: merged - added 0 allow, 0 ask, 0 deny, defaultMode set, autoMode disabled\n",
    );
    assert.equal(readJson(target).permissions.defaultMode, "acceptEdits");
  });
});

test("an existing defaultMode: plan is reported and left in place, never overwritten by the template's mode", () => {
  withTempDir("p2p2-merge-settings-", (dir) => {
    const target = targetPath(dir);
    writeJson(target, {
      permissions: {
        defaultMode: "plan",
        allow: ["Read", "Write"],
        ask: ["Bash(git push:*)"],
        deny: ["Bash(sudo:*)", "Bash(rm -rf:*)"],
      },
    });

    const result = run(dir, fixtureTemplate(dir), target);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      "settings.json: merged - added 1 allow, 0 ask, 0 deny, defaultMode already plan (left untouched), autoMode disabled\n",
    );
    const merged = readJson(target);
    assert.equal(merged.permissions.defaultMode, "plan");
    assert.deepEqual(merged.permissions.allow, ["Read", "Write", "Bash"]);
  });
});

test("an existing disableAutoMode is reported and left in place (a host that deliberately keeps auto mode on is never overridden)", () => {
  withTempDir("p2p2-merge-settings-", (dir) => {
    const target = targetPath(dir);
    writeJson(target, {
      permissions: {
        disableAutoMode: "allow",
        allow: ["Read", "Write", "Bash"],
        ask: ["Bash(git push:*)"],
        deny: ["Bash(sudo:*)", "Bash(rm -rf:*)"],
      },
    });

    const result = run(dir, fixtureTemplate(dir), target);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      "settings.json: merged - added 0 allow, 0 ask, 0 deny, defaultMode set, autoMode already allow (left untouched)\n",
    );
    assert.equal(readJson(target).permissions.disableAutoMode, "allow");
  });
});

test("idempotence: the second run reports 'already up to date' and leaves the file byte-identical", () => {
  withTempDir("p2p2-merge-settings-", (dir) => {
    const target = targetPath(dir);
    const template = fixtureTemplate(dir);
    writeJson(target, { permissions: { allow: ["HostOnlyTool"] } });

    const first = run(dir, template, target);
    assert.equal(first.status, 0, `stderr: ${first.stderr}`);
    assert.equal(
      first.stdout,
      "settings.json: merged - added 3 allow, 1 ask, 2 deny, defaultMode set, autoMode disabled\n",
    );
    const afterFirst = fs.readFileSync(target, "utf-8");

    const second = run(dir, template, target);

    assert.equal(second.status, 0, `stderr: ${second.stderr}`);
    assert.equal(second.stdout, "settings.json: already up to date\n");
    assert.equal(fs.readFileSync(target, "utf-8"), afterFirst);
  });
});

test("a settings.json that is not valid JSON (comments) is left byte-for-byte untouched, reported on one line, exit 2", () => {
  withTempDir("p2p2-merge-settings-", (dir) => {
    const target = targetPath(dir);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const before = '{\n  // a comment JSON does not allow\n  "permissions": {}\n}\n';
    fs.writeFileSync(target, before);

    const result = run(dir, fixtureTemplate(dir), target);

    assert.equal(result.status, 2, `stderr: ${result.stderr}`);
    assert.equal(fs.readFileSync(target, "utf-8"), before);
    const lines = result.stdout.split("\n").filter(Boolean);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /^settings\.json: not valid JSON - left untouched \(.+\)$/);
    assert.equal(fs.existsSync(`${target}.tmp`), false);
  });
});

test("no node on PATH: the merge is skipped with the recommended block on stdout and the target untouched, exit 0", () => {
  withTempDir("p2p2-merge-settings-", (dir) => {
    const target = targetPath(dir);
    writeJson(target, { permissions: { allow: ["HostOnlyTool"] } });
    const before = fs.readFileSync(target, "utf-8");

    const result = runWithoutNode(dir, ASSET_TEMPLATE, target);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      `settings.json: node not found - merge skipped, recommended block:\n${fs.readFileSync(ASSET_TEMPLATE, "utf-8")}`,
    );
    assert.equal(fs.readFileSync(target, "utf-8"), before);
  });
});

test("a template path that does not exist reports the missing template and exits 1, target untouched", () => {
  withTempDir("p2p2-merge-settings-", (dir) => {
    const target = targetPath(dir);
    writeJson(target, { permissions: { allow: ["HostOnlyTool"] } });
    const before = fs.readFileSync(target, "utf-8");
    const missing = path.join(dir, "nowhere", "settings.json");

    const result = run(dir, missing, target);

    assert.equal(result.status, 1, `stderr: ${result.stderr}`);
    assert.equal(
      slash(result.stdout),
      `settings.json: template missing at ${slash(missing)} - skipped\n`,
    );
    assert.equal(fs.readFileSync(target, "utf-8"), before);
  });
});

test("a permissions.allow that is not an array is replaced by the merged list and reported like any other merge", () => {
  withTempDir("p2p2-merge-settings-", (dir) => {
    const target = targetPath(dir);
    writeJson(target, {
      permissions: {
        defaultMode: "acceptEdits",
        allow: "Read",
        deny: ["Bash(sudo:*)"],
      },
    });

    const result = run(dir, fixtureTemplate(dir), target);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      "settings.json: merged - added 3 allow, 1 ask, 1 deny, defaultMode already acceptEdits (left untouched), autoMode disabled\n",
    );
    const merged = readJson(target);
    assert.deepEqual(merged.permissions.allow, ["Read", "Write", "Bash"]);
    assert.deepEqual(merged.permissions.deny, ["Bash(sudo:*)", "Bash(rm -rf:*)"]);
  });
});

test("the shipped template carries the recommended block only: built-in tools, destructive denies, no host-specific key", () => {
  const template = readJson(ASSET_TEMPLATE);

  assert.deepEqual(Object.keys(template), ["$schema", "permissions"]);
  assert.equal(template.$schema, "https://json.schemastore.org/claude-code-settings.json");
  assert.deepEqual(Object.keys(template.permissions), [
    "defaultMode",
    "disableAutoMode",
    "allow",
    "ask",
    "deny",
  ]);
  assert.equal(template.permissions.defaultMode, "acceptEdits");
  // "disable" is the literal the harness reads; a boolean is silently inert.
  assert.equal(template.permissions.disableAutoMode, "disable");

  const { allow, ask, deny } = template.permissions;
  assert.equal(allow.length, 31);
  assert.equal(new Set(allow).size, allow.length, "no duplicate allow entry");
  assert.equal(new Set(ask).size, ask.length, "no duplicate ask entry");
  assert.equal(new Set(deny).size, deny.length, "no duplicate deny entry");
  // Built-in tool names only: an mcp__* entry names a server of one host.
  assert.deepEqual(allow.filter((entry: string) => entry.startsWith("mcp__")), []);
  for (const expected of ["Read", "Glob", "Bash", "Skill", "Task", "ReadMcpResourceDirTool"]) {
    assert.ok(allow.includes(expected), `allow should carry ${expected}`);
  }
  // acceptEdits already auto-approves edits inside the working directory, so a
  // bare write tool in allow would only widen the rules to paths outside it -
  // and would pre-approve every shell redirect to such a path as well.
  for (const unwanted of ["Edit", "Write", "NotebookEdit"]) {
    assert.ok(!allow.includes(unwanted), `allow should not carry a bare ${unwanted}`);
  }
  // With no classifier, ask is the only human checkpoint left: outward-facing
  // operations, plus an interpreter as a command (the `curl … | sh` shape).
  for (const expected of ["Bash(git push:*)", "Bash(gh pr create:*)", "Bash(bash:*)", "Bash(sh:*)"]) {
    assert.ok(ask.includes(expected), `ask should carry ${expected}`);
  }
  for (const expected of [
    "Bash(rm -rf:*)",
    "Bash(rm *-r *-f*)",
    "Bash(sudo:*)",
    "Bash(dd:*)",
    "Bash(mkfs:*)",
    "Bash(git push --force:*)",
    // Prefix matching alone misses `git push origin main --force` and the
    // `git -c <k>=<v>` form, which makes git run a program it is handed.
    "Bash(git * --force*)",
    "Bash(git -c *)",
    "Bash(find * -delete*)",
    "Bash(chmod *777*)",
    "Bash(gh repo delete:*)",
    "Bash(npm publish:*)",
    "Read(**/.env)",
    "Edit(./.git/**)",
  ]) {
    assert.ok(deny.includes(expected), `deny should carry ${expected}`);
  }
});
