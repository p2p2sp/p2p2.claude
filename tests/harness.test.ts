/*
 * harness.test.ts - proves the shared subprocess/git/stub harness itself
 * (tests/harness/) before any script test relies on it: runScript,
 * withTempDir, withGitRepo, withStub, forEachShell and writePng each get one
 * assertion of their documented behaviour.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is
 * run directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/harness.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runScript } from "./harness/run.ts";
import { withTempDir, withGitRepo } from "./harness/tmp.ts";
import { withStub } from "./harness/stub.ts";
import { forEachShell, shellBin } from "./harness/shells.ts";
import { writePng } from "./harness/png.ts";
import { decodePng } from "../superui/scripts/vendor/png-decode.ts";

test("runScript round-trips stdout and stderr and reports the real exit status", () => {
  withTempDir("p2p2-harness-run-", (dir) => {
    const scriptPath = path.join(dir, "echo-both.sh");
    fs.writeFileSync(scriptPath, "#!/bin/sh\necho out-line\necho err-line 1>&2\nexit 7\n", { mode: 0o755 });
    fs.chmodSync(scriptPath, 0o755);

    const result = runScript(scriptPath, []);

    assert.equal(result.stdout, "out-line\n");
    assert.equal(result.stderr, "err-line\n");
    assert.equal(result.status, 7);
  });
});

test("withTempDir removes its directory once the callback returns", () => {
  let capturedDir = "";
  withTempDir("p2p2-harness-tmp-", (dir) => {
    capturedDir = dir;
    assert.ok(fs.existsSync(dir), "temp dir should exist inside the callback");
  });
  assert.equal(fs.existsSync(capturedDir), false, "temp dir should be gone after the callback returns");
});

test("withGitRepo pins the git identity and HOME away from the developer's real ones", () => {
  withGitRepo((repo) => {
    const email = repo.git("config", "user.email");
    assert.equal(email.status, 0, `git config user.email should succeed: ${email.stderr}`);
    assert.equal(email.stdout.trim(), "test@p2p2.invalid");
    assert.notEqual(repo.env.HOME, os.homedir(), "withGitRepo's HOME must not be the developer's real HOME");

    const status = repo.git("status", "--porcelain");
    assert.equal(status.status, 0, `git status should succeed in the throwaway repo: ${status.stderr}`);
  });
});

test("withStub shadows a real binary on PATH", () => {
  withStub("git", "echo stubbed-git", (stubDir) => {
    const result = runScript("git", ["--version"], { stubDirs: [stubDir] });
    assert.equal(result.status, 0, `stubbed git should succeed: ${result.stderr}`);
    assert.equal(result.stdout, "stubbed-git\n");
  });
});

test('forEachShell("posix", ...) yields at least one shell and never throws when one is absent', () => {
  let calls = 0;
  const skips = forEachShell("posix", (shell) => {
    calls += 1;
    assert.ok(fs.existsSync(shellBin(shell)), `resolved shell ${shellBin(shell)} should exist`);
  });
  assert.ok(calls > 0, "expected at least one POSIX shell on this machine (/bin/sh at minimum)");
  for (const skip of skips) {
    assert.equal(skip.kind, "posix");
    assert.ok(skip.reason.length > 0, "a skip must record a reason");
  }
});

test("writePng output round-trips through the vendor PNG decoder", () => {
  const width = 3;
  const height = 2;
  const rgba = new Uint8Array(width * height * 4);
  const pixels: Array<[number, number, number, number]> = [
    [255, 0, 0, 255],
    [0, 255, 0, 128],
    [0, 0, 255, 0],
    [255, 255, 0, 255],
    [0, 255, 255, 64],
    [255, 0, 255, 200],
  ];
  pixels.forEach(([r, g, b, a], i) => {
    rgba.set([r, g, b, a], i * 4);
  });

  const png = writePng(width, height, rgba);
  const decoded = decodePng(png);

  assert.equal(decoded.width, width);
  assert.equal(decoded.height, height);
  pixels.forEach(([r, g, b], i) => {
    assert.deepEqual(
      [decoded.rgb[i * 3], decoded.rgb[i * 3 + 1], decoded.rgb[i * 3 + 2]],
      [r, g, b],
      `pixel ${i} should round-trip its RGB channels (alpha dropped)`,
    );
  });
});
