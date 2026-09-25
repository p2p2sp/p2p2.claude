/*
 * open-page.test.ts - proves viber/skills/setup/scripts/open-page.sh picks the
 * opener for the platform `uname -s` names, hands it the file, and prints its
 * one-line report, exit 0 on every report line and 2 only on a missing argument.
 *
 * No real browser ever opens: every case pins PATH to the harness's minimal one
 * (`coreUtilsPath`), stubs `uname` onto the platform it tests, and stubs the
 * opener that platform uses, so a real `open` or `xdg-open` in /usr/bin is
 * either shadowed or never reached. Each opener stub writes its argv to a log
 * file the test reads back.
 *
 * Repo reality: no build, no lint, no npm, no package.json (for THIS repo) -
 * this file is run directly by Node's native test runner + TypeScript type
 * stripping:
 *   node --test tests/viber/open-page.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { coreUtilsPath, withStub } from "../harness/stub.ts";
import { slash } from "../harness/paths.ts";

const SUT = path.resolve(import.meta.dirname, "../../viber/skills/setup/scripts/open-page.sh");

type Stub = [name: string, body: string];

/** Nests one `withStub` per entry and hands `fn` every stub dir. */
function withStubs<T>(stubs: Stub[], fn: (dirs: string[]) => T, dirs: string[] = []): T {
  if (stubs.length === 0) return fn(dirs);
  const [[name, body], ...rest] = stubs;
  return withStub(name, body, (dir) => withStubs(rest, fn, [...dirs, dir]));
}

/** A stub body that writes its argv, one per line, to `log`. */
function logArgs(log: string, exit = 0): string {
  return `printf '%s\\n' "$@" > "${slash(log)}"\nexit ${exit}`;
}

/** Windows-shaped `cygpath`: `-w` marks the path, `-m` returns it unchanged. */
const CYGPATH: Stub = ["cygpath", 'if [ "$1" = "-w" ]; then echo "WIN:$2"; else echo "$2"; fi'];

function run(dir: string, stubs: Stub[], env: Record<string, string> = {}) {
  const page = path.join(dir, "page.html");
  fs.writeFileSync(page, "<!doctype html>");
  return withStubs(stubs, (stubDirs) =>
    runScript(SUT, [page], { cwd: dir, env: { PATH: coreUtilsPath(), ...env }, stubDirs }),
  );
}

/** Polls for `file` up to 5 s: the Linux desktop branch starts its opener in the background. */
function waitFor(file: string): string {
  const pause = new Int32Array(new SharedArrayBuffer(4));
  for (let i = 0; i < 50 && !fs.existsSync(file); i++) Atomics.wait(pause, 0, 0, 100);
  return fs.readFileSync(file, "utf8");
}

test("no argument exits 2 with a usage line on stderr and nothing on stdout (a wiring bug, never a report line)", () => {
  const result = runScript(SUT, [], { env: { PATH: coreUtilsPath() } });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /usage: open-page\.sh <file>/);
});

test("a file that does not exist reports it missing at an absolute path, and the exit is still 0", () => {
  withTempDir("p2p2-viber-open-", (dir) => {
    const result = runScript(SUT, ["gone/page.html"], { cwd: dir, env: { PATH: coreUtilsPath() } });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^page\.html: missing at \S+\/gone\/page\.html\n$/);
    assert.ok(!result.stdout.includes("missing at gone/"), result.stdout);
  });
});

test("macOS hands the file to open and reports it opened", () => {
  withTempDir("p2p2-viber-open-", (dir) => {
    const log = path.join(dir, "open.log");
    const result = run(dir, [["uname", "echo Darwin"], ["open", logArgs(log)]]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "page.html: opened in the browser\n");
    assert.ok(fs.readFileSync(log, "utf8").trim().endsWith(`${path.basename(dir)}/page.html`));
  });
});

test("an opener that fails reports the browser did not open, with the path to open by hand", () => {
  withTempDir("p2p2-viber-open-", (dir) => {
    const log = path.join(dir, "open.log");
    const result = run(dir, [["uname", "echo Darwin"], ["open", logArgs(log, 1)]]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^page\.html: the browser did not open - open \S+\/page\.html by hand\n$/);
  });
});

test("Git Bash hands rundll32 the file handler and the Windows form of the path", () => {
  withTempDir("p2p2-viber-open-", (dir) => {
    const log = path.join(dir, "rundll32.log");
    const result = run(dir, [["uname", "echo MINGW64_NT-10.0-26200"], CYGPATH, ["rundll32", logArgs(log)]]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "page.html: opened in the browser\n");
    const [handler, target] = fs.readFileSync(log, "utf8").trim().split("\n");
    assert.equal(handler, "url.dll,FileProtocolHandler");
    assert.ok(target.startsWith("WIN:") && target.endsWith("/page.html"), target);
  });
});

test("Git Bash with no rundll32 reports no browser and the path to open by hand", () => {
  withTempDir("p2p2-viber-open-", (dir) => {
    const result = run(dir, [["uname", "echo MINGW64_NT-10.0-26200"], CYGPATH]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^page\.html: no browser to open it - open \S+\/page\.html by hand\n$/);
  });
});

test("WSL hands the file to wslview ahead of xdg-open", () => {
  withTempDir("p2p2-viber-open-", (dir) => {
    const log = path.join(dir, "wslview.log");
    const other = path.join(dir, "xdg.log");
    const result = run(
      dir,
      [["uname", "echo Linux"], ["wslview", logArgs(log)], ["xdg-open", logArgs(other)]],
      { DISPLAY: ":0" },
    );
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "page.html: opened in the browser\n");
    assert.ok(fs.readFileSync(log, "utf8").trim().endsWith("/page.html"));
    assert.ok(!fs.existsSync(other));
  });
});

const BACKGROUND_SKIP =
  process.platform === "win32"
    ? "a win32 spawn ends the script's background child with it; this branch only ever runs on Linux"
    : false;

test("a Linux desktop starts xdg-open with the file and reports it opened", { skip: BACKGROUND_SKIP }, () => {
  withTempDir("p2p2-viber-open-", (dir) => {
    const log = path.join(dir, "xdg.log");
    const result = run(dir, [["uname", "echo Linux"], ["xdg-open", logArgs(log)]], { WAYLAND_DISPLAY: "wayland-0" });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, "page.html: opened in the browser\n");
    assert.ok(waitFor(log).trim().endsWith("/page.html"));
  });
});

test("Linux with no display never runs xdg-open and reports no browser (a headless or remote session)", () => {
  withTempDir("p2p2-viber-open-", (dir) => {
    const log = path.join(dir, "xdg.log");
    const result = run(dir, [["uname", "echo Linux"], ["xdg-open", logArgs(log)]]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /^page\.html: no browser to open it - open \S+\/page\.html by hand\n$/);
    assert.ok(!fs.existsSync(log));
  });
});
