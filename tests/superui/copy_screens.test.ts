/*
 * copy_screens.test.ts - proves copy_screens.ts's
 * `copy_screens.ts INVENTORY_MD SOURCE_DIR OUT_DIR` contract: `SCREENS_OK
 * copied=<N> skipped=<M> -> <OUT_DIR>/screens` on stdout; deduplication of a
 * screen cited twice (once under Components, once under Patterns); zero
 * entries yields copied=0 skipped=0 at exit 0; exit 1 on an unreadable
 * inventory, a missing source dir, and a canonical name that is absolute or
 * carries a path separator in either direction (`/` and `\`); exit 2 on
 * usage errors.
 *
 * copy_screens.ts carries no importable symbols beyond its CLI, so every
 * case here drives it as a real subprocess via runScript, never imported.
 *
 * Repo reality: no build, no lint, no npm, no package.json - this file is run
 * directly by Node's native test runner + TypeScript type stripping:
 *   node --test tests/superui/copy_screens.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { runScript, type RunResult } from "../harness/run.ts";
import { withTempDir } from "../harness/tmp.ts";
import { INVENTORY_DELIMITER as D } from "../../superui/scripts/inventory-format.ts";

const SUT = path.resolve(import.meta.dirname, "../../superui/scripts/copy_screens.ts");

function run(args: string[], cwd?: string): RunResult {
  return runScript(SUT, args, { cwd });
}

interface ComponentEntry {
  slug: string;
  kind: string;
  canonical: string;
}

/** Builds a well-formed inventory.md with the given Components/Patterns entries. */
function buildInventory(components: ComponentEntry[], patterns: Array<{ slug: string; canonical: string }>): string {
  const lines: string[] = ["## Components"];
  for (const c of components) {
    lines.push(`- ${c.slug} ${D} ${c.kind} ${D} canonical: ${c.canonical}`);
  }
  lines.push("## Patterns");
  for (const p of patterns) {
    lines.push(`- ${p.slug} ${D} canonical: ${p.canonical}`);
  }
  return lines.join("\n") + "\n";
}

function writeInventory(dir: string, content: string): string {
  const p = path.join(dir, "inventory.md");
  fs.writeFileSync(p, content);
  return p;
}

function makeSourceDir(dir: string, files: Record<string, string>): string {
  const sourceDir = path.join(dir, "source");
  fs.mkdirSync(sourceDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(sourceDir, name), content);
  }
  return sourceDir;
}

// ---------------------------------------------------------------------------
// stdout marker line + basic copy
// ---------------------------------------------------------------------------

test("SCREENS_OK copied=<N> skipped=<M> -> <OUT_DIR>/screens on stdout, screen actually copied", () => {
  withTempDir("p2p2-copy-screens-ok-", (dir) => {
    const inventoryMd = writeInventory(dir, buildInventory([{ slug: "button", kind: "primary", canonical: "hero.png" }], []));
    const sourceDir = makeSourceDir(dir, { "hero.png": "PNGDATA" });
    const outDir = path.join(dir, "out");
    const result = run([inventoryMd, sourceDir, outDir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `SCREENS_OK copied=1 skipped=0 -> ${path.join(outDir, "screens")}\n`);
    assert.equal(fs.readFileSync(path.join(outDir, "screens", "hero.png"), "utf-8"), "PNGDATA");
  });
});

test("a canonical screen absent from SOURCE_DIR is skipped, not an error", () => {
  withTempDir("p2p2-copy-screens-skip-", (dir) => {
    const inventoryMd = writeInventory(
      dir,
      buildInventory(
        [{ slug: "button", kind: "primary", canonical: "hero.png" }],
        [{ slug: "modal", canonical: "missing.png" }],
      ),
    );
    const sourceDir = makeSourceDir(dir, { "hero.png": "PNGDATA" });
    const outDir = path.join(dir, "out");
    const result = run([inventoryMd, sourceDir, outDir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `SCREENS_OK copied=1 skipped=1 -> ${path.join(outDir, "screens")}\n`);
  });
});

// ---------------------------------------------------------------------------
// dedup: cited under both Components and Patterns
// ---------------------------------------------------------------------------

test("a screen cited twice (Components and Patterns) is copied once, not twice", () => {
  withTempDir("p2p2-copy-screens-dedup-", (dir) => {
    const inventoryMd = writeInventory(
      dir,
      buildInventory(
        [{ slug: "button", kind: "primary", canonical: "shared.png" }],
        [{ slug: "modal", canonical: "shared.png" }],
      ),
    );
    const sourceDir = makeSourceDir(dir, { "shared.png": "PNGDATA" });
    const outDir = path.join(dir, "out");
    const result = run([inventoryMd, sourceDir, outDir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `SCREENS_OK copied=1 skipped=0 -> ${path.join(outDir, "screens")}\n`);
    assert.deepEqual(fs.readdirSync(path.join(outDir, "screens")), ["shared.png"]);
  });
});

// ---------------------------------------------------------------------------
// zero entries -> exit 0
// ---------------------------------------------------------------------------

test("zero entries yields copied=0 skipped=0 and still exits 0, with an existing empty screens dir", () => {
  withTempDir("p2p2-copy-screens-zero-", (dir) => {
    const inventoryMd = writeInventory(dir, buildInventory([], []));
    const sourceDir = makeSourceDir(dir, {});
    const outDir = path.join(dir, "out");
    const result = run([inventoryMd, sourceDir, outDir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `SCREENS_OK copied=0 skipped=0 -> ${path.join(outDir, "screens")}\n`);
    assert.deepEqual(fs.readdirSync(path.join(outDir, "screens")), []);
  });
});

test("an inventory with no entries at all (no Components/Patterns headings) still exits 0", () => {
  withTempDir("p2p2-copy-screens-noheadings-", (dir) => {
    const inventoryMd = writeInventory(dir, "Nothing structured here.\n");
    const sourceDir = makeSourceDir(dir, {});
    const outDir = path.join(dir, "out");
    const result = run([inventoryMd, sourceDir, outDir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `SCREENS_OK copied=0 skipped=0 -> ${path.join(outDir, "screens")}\n`);
  });
});

// ---------------------------------------------------------------------------
// exit 1: unreadable inventory / missing source dir / bad canonical name
// ---------------------------------------------------------------------------

test("a non-existent INVENTORY_MD exits 1", () => {
  withTempDir("p2p2-copy-screens-noinv-", (dir) => {
    const sourceDir = makeSourceDir(dir, {});
    const result = run([path.join(dir, "no-such-inventory.md"), sourceDir, path.join(dir, "out")]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /error: cannot read inventory/);
  });
});

test("a non-existent SOURCE_DIR exits 1", () => {
  withTempDir("p2p2-copy-screens-nosrc-", (dir) => {
    const inventoryMd = writeInventory(dir, buildInventory([], []));
    const result = run([inventoryMd, path.join(dir, "does-not-exist"), path.join(dir, "out")]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /error: cannot read source dir/);
  });
});

test("a SOURCE_DIR that is actually a file exits 1", () => {
  withTempDir("p2p2-copy-screens-srcfile-", (dir) => {
    const inventoryMd = writeInventory(dir, buildInventory([], []));
    const notADir = path.join(dir, "not-a-dir");
    fs.writeFileSync(notADir, "x");
    const result = run([inventoryMd, notADir, path.join(dir, "out")]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /is not a directory/);
  });
});

test("a canonical filename that is an absolute path exits 1", () => {
  withTempDir("p2p2-copy-screens-abs-", (dir) => {
    const abs = process.platform === "win32" ? "C:\\evil.png" : "/etc/evil.png";
    const inventoryMd = writeInventory(dir, buildInventory([{ slug: "evil", kind: "x", canonical: abs }], []));
    const sourceDir = makeSourceDir(dir, {});
    const result = run([inventoryMd, sourceDir, path.join(dir, "out")]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must not be an absolute path or contain a path separator/);
  });
});

test("a canonical filename carrying a forward-slash path separator exits 1", () => {
  withTempDir("p2p2-copy-screens-fslash-", (dir) => {
    const inventoryMd = writeInventory(dir, buildInventory([{ slug: "evil", kind: "x", canonical: "sub/evil.png" }], []));
    const sourceDir = makeSourceDir(dir, {});
    const result = run([inventoryMd, sourceDir, path.join(dir, "out")]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must not be an absolute path or contain a path separator/);
  });
});

test("a canonical filename carrying a backslash path separator exits 1", () => {
  withTempDir("p2p2-copy-screens-bslash-", (dir) => {
    const inventoryMd = writeInventory(
      dir,
      buildInventory([{ slug: "evil", kind: "x", canonical: "sub\\evil.png" }], []),
    );
    const sourceDir = makeSourceDir(dir, {});
    const result = run([inventoryMd, sourceDir, path.join(dir, "out")]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must not be an absolute path or contain a path separator/);
  });
});

// ---------------------------------------------------------------------------
// exit 2: usage errors
// ---------------------------------------------------------------------------

test("wrong argument count prints usage + an error line on stderr and exits 2", () => {
  withTempDir("p2p2-copy-screens-usage-", (dir) => {
    const result = run([dir]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^usage: copy_screens\.ts /);
    assert.match(result.stderr, /expected 3 arguments/);
    assert.equal(result.stdout, "");
  });
});

test("-h prints help text on stdout and exits 0", () => {
  const result = run(["-h"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^usage: copy_screens\.ts /);
});

// ---------------------------------------------------------------------------
// edge case: non-ASCII canonical name
// ---------------------------------------------------------------------------

test("a canonical screen name with a non-ASCII character copies correctly", () => {
  withTempDir("p2p2-copy-screens-nonascii-", (dir) => {
    const name = "café.png";
    const inventoryMd = writeInventory(dir, buildInventory([{ slug: "cafe", kind: "x", canonical: name }], []));
    const sourceDir = makeSourceDir(dir, { [name]: "PNGDATA" });
    const outDir = path.join(dir, "out");
    const result = run([inventoryMd, sourceDir, outDir]);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.stdout, `SCREENS_OK copied=1 skipped=0 -> ${path.join(outDir, "screens")}\n`);
    assert.equal(fs.readFileSync(path.join(outDir, "screens", name), "utf-8"), "PNGDATA");
  });
});
