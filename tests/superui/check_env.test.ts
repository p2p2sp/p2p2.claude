/*
 * check_env.test.ts - proves superui/skills/setup/scripts/check_env.sh's
 * contract: it resolves check_node.sh from `$CLAUDE_PLUGIN_ROOT/scripts/`
 * when that path exists, else falls back to the relative
 * `../../../scripts/check_node.sh` (resolved from the script's own path via
 * `$0`, never from `cwd`); it emits `NODE <cmd>` / `NODE MISSING` plus a
 * `VERSION <v>` line whenever `node` is on PATH at all - even when the
 * delegated check_node.sh reports NODE_MISSING for being too old; and it
 * always exits 0 (diagnostic only).
 *
 * check_env.sh is `#!/bin/sh`, so every case runs through
 * forEachShell("posix", ...) via opts.shell, never executed directly.
 *
 * node --test tests/superui/check_env.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { withStub } from "../harness/stub.ts";
import { forEachShell } from "../harness/shells.ts";

const SUT = path.resolve(import.meta.dirname, "../../superui/skills/setup/scripts/check_env.sh");

/** The real PATH, minus every directory that resolves a real `node` - so
 *  "no node on PATH" is genuine even on a dev machine that has node
 *  installed, on every OS. */
function pathWithoutNode(): string {
  const nodeNames = process.platform === "win32" ? ["node.exe", "node.cmd", "node.bat", "node"] : ["node"];
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const kept = dirs.filter((dir) => !nodeNames.some((name) => fs.existsSync(path.join(dir, name))));
  return kept.join(path.delimiter);
}

function assertPosix(fn: (shell: string) => void) {
  const skips = forEachShell("posix", fn);
  for (const skip of skips) {
    assert.equal(skip.kind, "posix");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
}

function assertExitZero(result: RunResult) {
  assert.equal(result.status, 0, `check_env.sh must always exit 0 (diagnostic only): stderr=${result.stderr}`);
}

/** Writes a fake plugin root at <tmp>/<dirName>/scripts/check_node.sh whose
 *  body is the given shell snippet - lets a test prove check_env.sh delegates
 *  to $CLAUDE_PLUGIN_ROOT's copy verbatim, without depending on the real
 *  superui check_node.sh's own version-detection logic. */
function withFakePluginRoot<T>(dirName: string, checkNodeBody: string, fn: (root: string) => T): T {
  return withTempDir("p2p2-plugin-root-", (tmp) => {
    const root = path.join(tmp, dirName);
    const scriptsDir = path.join(root, "scripts");
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.writeFileSync(path.join(scriptsDir, "check_node.sh"), `#!/bin/sh\n${checkNodeBody}\n`, { mode: 0o755 });
    return fn(root);
  });
}

test("CLAUDE_PLUGIN_ROOT set to a valid plugin root -> delegates to that root's check_node.sh", () => {
  assertPosix((shell) => {
    withFakePluginRoot("plugin", "echo 'NODE_OK fakecmd --fake-flag'", (root) => {
      withStub("node", "echo 'v24.0.0'", (stubDir) => {
        const result = runScript(SUT, [], {
          shell,
          env: { CLAUDE_PLUGIN_ROOT: root },
          stubDirs: [stubDir],
        });
        assertExitZero(result);
        assert.equal(result.stdout, "NODE fakecmd --fake-flag\nVERSION v24.0.0\n");
      });
    });
  });
});

test("CLAUDE_PLUGIN_ROOT unset -> falls back to ../../../scripts/check_node.sh", () => {
  assertPosix((shell) => {
    withStub("node", "echo 'v24.0.0'", (stubDir) => {
      const result = runScript(SUT, [], { shell, stubDirs: [stubDir] });
      assertExitZero(result);
      // Matches the real superui/scripts/check_node.sh's NODE_OK for v24 -
      // proves the fallback path resolved and ran the genuine script.
      assert.equal(result.stdout, "NODE node\nVERSION v24.0.0\n");
    });
  });
});

test("CLAUDE_PLUGIN_ROOT pointing at a nonexistent dir -> falls back to the real check_node.sh", () => {
  assertPosix((shell) => {
    withStub("node", "echo 'v24.0.0'", (stubDir) => {
      const result = runScript(SUT, [], {
        shell,
        env: { CLAUDE_PLUGIN_ROOT: "/nonexistent/p2p2-fake-plugin-root" },
        stubDirs: [stubDir],
      });
      assertExitZero(result);
      assert.equal(result.stdout, "NODE node\nVERSION v24.0.0\n");
    });
  });
});

test("CLAUDE_PLUGIN_ROOT pointing at a dir with no check_node.sh -> falls back to the real check_node.sh", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-empty-root-", (root) => {
      withStub("node", "echo 'v24.0.0'", (stubDir) => {
        const result = runScript(SUT, [], {
          shell,
          env: { CLAUDE_PLUGIN_ROOT: root },
          stubDirs: [stubDir],
        });
        assertExitZero(result);
        assert.equal(result.stdout, "NODE node\nVERSION v24.0.0\n");
      });
    });
  });
});

test("CLAUDE_PLUGIN_ROOT containing a space -> still delegates correctly", () => {
  assertPosix((shell) => {
    withFakePluginRoot("plugin with space", "echo 'NODE_OK fakecmd'", (root) => {
      assert.ok(root.includes(" "), "the fake plugin root path must contain a space");
      const result = runScript(SUT, [], {
        shell,
        env: { CLAUDE_PLUGIN_ROOT: root, PATH: pathWithoutNode() },
      });
      assertExitZero(result);
      assert.equal(result.stdout, "NODE fakecmd\n");
    });
  });
});

test("invoked from a different cwd than its own directory -> fallback still resolves via $0, not cwd", () => {
  assertPosix((shell) => {
    withTempDir("p2p2-other-cwd-", (otherCwd) => {
      withStub("node", "echo 'v24.0.0'", (stubDir) => {
        const result = runScript(SUT, [], { shell, cwd: otherCwd, stubDirs: [stubDir] });
        assertExitZero(result);
        assert.equal(result.stdout, "NODE node\nVERSION v24.0.0\n");
      });
    });
  });
});

test("node exists but is too old -> NODE MISSING, VERSION still reported (node command itself exists)", () => {
  assertPosix((shell) => {
    withStub("node", "echo 'v20.0.0'", (stubDir) => {
      const result = runScript(SUT, [], { shell, stubDirs: [stubDir] });
      assertExitZero(result);
      assert.equal(result.stdout, "NODE MISSING\nVERSION v20.0.0\n");
    });
  });
});

test("no node on PATH -> NODE MISSING, no VERSION line", () => {
  assertPosix((shell) => {
    const result = runScript(SUT, [], { shell, env: { PATH: pathWithoutNode() } });
    assertExitZero(result);
    assert.equal(result.stdout, "NODE MISSING\n");
  });
});
