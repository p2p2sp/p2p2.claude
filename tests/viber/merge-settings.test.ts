/*
 * merge-settings.test.ts - proves viber/skills/setup/scripts/merge-settings.sh
 * merges the bundled permissions template into a host project's
 * .claude/settings.json additively (host order kept, template entries appended
 * once), idempotently (a second run rewrites nothing) and safely (a target that
 * is not valid JSON, or a host with no `node`, is left untouched and reported),
 * plus the shape of the shipped template itself - the single source of the
 * recommended allow/deny lists /viber:setup offers.
 *
 * A top-level key of the template other than `permissions` is SEEDED, never
 * merged into: it is added only when the host has none, so a host value wins
 * whatever its shape.
 *
 * The template is designed for a session with auto mode OFF: it seeds
 * permissions.disableAutoMode, so there is no classifier and every outcome is
 * decided by the static rules alone.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/viber/merge-settings.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { coreUtilsPath } from "../harness/stub.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/setup/scripts/merge-settings.sh");
const ASSET_TEMPLATE = path.resolve(import.meta.dirname, "../../viber/skills/setup/assets/settings.json");

/** A small file-local template so a merge assertion can name the exact entries
 *  and counts; the shipped asset is used only where the case is about the
 *  shipped asset itself (creation, the no-node block, its own shape). */
const FIXTURE_TEMPLATE = {
  $schema: "https://json.schemastore.org/claude-code-settings.json",
  showClearContextOnPlanAccept: true,
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
  withTempDir("p2p2-viber-merge-settings-", (dir) => {
    const result = run(dir, ASSET_TEMPLATE);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "settings.json: created from template\n");
    assert.equal(fs.readFileSync(targetPath(dir), "utf-8"), fs.readFileSync(ASSET_TEMPLATE, "utf-8"));
  });
});

test("partial coverage: only the missing template entries are appended, after the host's own, and every other key survives", () => {
  withTempDir("p2p2-viber-merge-settings-", (dir) => {
    const target = targetPath(dir);
    writeJson(target, {
      $schema: "https://json.schemastore.org/claude-code-settings.json",
      disableWorkflows: true,
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
      "settings.json: merged - added 2 allow, 1 ask, 1 deny, 1 top-level, defaultMode set, autoMode disabled\n",
    );

    const merged = readJson(target);
    assert.deepEqual(merged.permissions.allow, ["Read", "HostOnlyTool", "Write", "Bash"]);
    assert.deepEqual(merged.permissions.ask, ["Bash(hostask:*)", "Bash(git push:*)"]);
    assert.deepEqual(merged.permissions.deny, ["Bash(hostonly:*)", "Bash(sudo:*)", "Bash(rm -rf:*)"]);
    assert.equal(merged.permissions.defaultMode, "acceptEdits");
    assert.equal(merged.permissions.disableAutoMode, "disable");
    // Host-only keys, at both levels, are carried over untouched.
    assert.equal(merged.disableWorkflows, true);
    assert.deepEqual(merged.permissions.additionalDirectories, ["C:/somewhere"]);
    // The template's own top-level key is seeded beside them.
    assert.equal(merged.showClearContextOnPlanAccept, true);
    // The atomic rewrite leaves no scratch file behind.
    assert.equal(fs.existsSync(`${target}.tmp`), false);
  });
});

test("an existing defaultMode: plan is reported and left in place, never overwritten by the template's mode", () => {
  withTempDir("p2p2-viber-merge-settings-", (dir) => {
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
      "settings.json: merged - added 1 allow, 0 ask, 0 deny, 2 top-level, defaultMode already plan (left untouched), autoMode disabled\n",
    );
    const merged = readJson(target);
    assert.equal(merged.permissions.defaultMode, "plan");
    assert.deepEqual(merged.permissions.allow, ["Read", "Write", "Bash"]);
  });
});

test("an existing disableAutoMode is reported and left in place (a host that deliberately keeps auto mode on is never overridden)", () => {
  withTempDir("p2p2-viber-merge-settings-", (dir) => {
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
      "settings.json: merged - added 0 allow, 0 ask, 0 deny, 2 top-level, defaultMode set, autoMode already allow (left untouched)\n",
    );
    assert.equal(readJson(target).permissions.disableAutoMode, "allow");
  });
});

test("a top-level key the host already carries is reported as not seeded and keeps the host's value (a deliberate false is never flipped back to the template's true)", () => {
  withTempDir("p2p2-viber-merge-settings-", (dir) => {
    const target = targetPath(dir);
    writeJson(target, {
      $schema: "https://example.invalid/other-schema.json",
      showClearContextOnPlanAccept: false,
      permissions: {
        defaultMode: "acceptEdits",
        disableAutoMode: "disable",
        allow: ["Read", "Write"],
        ask: ["Bash(git push:*)"],
        deny: ["Bash(sudo:*)", "Bash(rm -rf:*)"],
      },
    });

    const result = run(dir, fixtureTemplate(dir), target);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(
      result.stdout,
      "settings.json: merged - added 1 allow, 0 ask, 0 deny, 0 top-level, defaultMode already acceptEdits (left untouched), autoMode already disable (left untouched)\n",
    );
    const merged = readJson(target);
    assert.equal(merged.showClearContextOnPlanAccept, false);
    assert.equal(merged.$schema, "https://example.invalid/other-schema.json");
  });
});

test("idempotence: the second run reports 'already up to date' and leaves the file byte-identical", () => {
  withTempDir("p2p2-viber-merge-settings-", (dir) => {
    const target = targetPath(dir);
    const template = fixtureTemplate(dir);
    writeJson(target, { permissions: { allow: ["HostOnlyTool"] } });

    const first = run(dir, template, target);
    assert.equal(first.status, 0, `stderr: ${first.stderr}`);
    assert.equal(
      first.stdout,
      "settings.json: merged - added 3 allow, 1 ask, 2 deny, 2 top-level, defaultMode set, autoMode disabled\n",
    );
    const afterFirst = fs.readFileSync(target, "utf-8");

    const second = run(dir, template, target);

    assert.equal(second.status, 0, `stderr: ${second.stderr}`);
    assert.equal(second.stdout, "settings.json: already up to date\n");
    assert.equal(fs.readFileSync(target, "utf-8"), afterFirst);
  });
});

test("a settings.json that is not valid JSON (comments) is left byte-for-byte untouched, reported on one line, exit 2", () => {
  withTempDir("p2p2-viber-merge-settings-", (dir) => {
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
  withTempDir("p2p2-viber-merge-settings-", (dir) => {
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
  withTempDir("p2p2-viber-merge-settings-", (dir) => {
    const target = targetPath(dir);
    writeJson(target, { permissions: { allow: ["HostOnlyTool"] } });
    const before = fs.readFileSync(target, "utf-8");
    const missing = path.join(dir, "nowhere", "settings.json");

    const result = run(dir, missing, target);

    assert.equal(result.status, 1, `stderr: ${result.stderr}`);
    assert.equal(slash(result.stdout), `settings.json: template missing at ${slash(missing)} - skipped\n`);
    assert.equal(fs.readFileSync(target, "utf-8"), before);
  });
});

test("the shipped template carries the recommended block only: built-in tools, destructive denies, no host-specific key", () => {
  const template = readJson(ASSET_TEMPLATE);

  assert.deepEqual(Object.keys(template), ["$schema", "showClearContextOnPlanAccept", "permissions"]);
  assert.equal(template.$schema, "https://json.schemastore.org/claude-code-settings.json");
  assert.equal(template.showClearContextOnPlanAccept, true);
  assert.deepEqual(Object.keys(template.permissions), ["defaultMode", "disableAutoMode", "allow", "deny"]);
  assert.equal(template.permissions.defaultMode, "acceptEdits");
  // "disable" is the literal the harness reads; a boolean is silently inert.
  assert.equal(template.permissions.disableAutoMode, "disable");
  // No ask list at all: the recommended block prompts on nothing, and every
  // outcome is decided by allow and deny alone.
  assert.equal(template.permissions.ask, undefined);

  const { allow, deny } = template.permissions;
  assert.equal(new Set(allow).size, allow.length, "no duplicate allow entry");
  assert.equal(new Set(deny).size, deny.length, "no duplicate deny entry");
  // Built-in tool names only: an mcp__* entry names a server of one host.
  assert.deepEqual(
    allow.filter((entry: string) => entry.startsWith("mcp__")),
    [],
  );
  for (const expected of ["Read", "Glob", "Bash", "Skill", "Agent", "Task"]) {
    assert.ok(allow.includes(expected), `allow should carry ${expected}`);
  }
  // The write tools are allowed outright. Every byte viber puts in the tree
  // comes from a dispatched agent - seven of the eight carry Write or Edit -
  // and none of them declares a permissionMode, so each starts in the asking
  // default instead of inheriting the session's acceptEdits. That mode would
  // not cover them anyway: it is scoped to the working directory. A coder
  // stopped on a permission prompt strands the batch it was dispatched in,
  // which is why the bare entries are here; the deny list is what keeps .env,
  // .git/ and the key files out.
  for (const expected of ["Edit", "Write", "NotebookEdit"]) {
    assert.ok(allow.includes(expected), `allow should carry ${expected} - viber's coders write through it`);
  }
  for (const expected of [
    "Bash(rm -rf:*)",
    "Bash(sudo:*)",
    // Prefix matching alone misses `git push origin main --force` and the
    // `git -c <k>=<v>` form, which makes git run a program it is handed.
    "Bash(git * --force*)",
    "Bash(git -c *)",
    "Bash(git reset --hard:*)",
    "Bash(gh repo delete:*)",
    "Read(**/.env)",
    "Edit(./.git/**)",
  ]) {
    assert.ok(deny.includes(expected), `deny should carry ${expected}`);
  }
});
