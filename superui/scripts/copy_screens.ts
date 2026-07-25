/*
 * copy_screens.ts - copies every deduplicated canonical screen cited in
 * INVENTORY_MD's `## Components` and `## Patterns` entries from SOURCE_DIR
 * into `<OUT_DIR>/screens/`. A canonical filename absent from SOURCE_DIR is
 * skipped without error - `validate_bundle.ts` reports it as a
 * `missing-screen` finding later in the pipeline; this script never fails
 * on it.
 *
 * IN : INVENTORY_MD - `inventory.md` path (already written, zero or more
 *      entries under `## Components` / `## Patterns`).
 *      SOURCE_DIR - the resolved source screenshots dir.
 *      OUT_DIR - the bundle output dir; `<OUT_DIR>/screens` is created if
 *      absent, reused as-is if already present (e.g. from a prior run).
 * OUT: stdout - one line on success:
 *        SCREENS_OK copied=<N> skipped=<M> -> <OUT_DIR>/screens
 * Exit codes: 0 = ok (including zero entries, which yields copied=0
 *      skipped=0 and an existing empty screens dir); 1 = INVENTORY_MD
 *      unreadable, SOURCE_DIR absent/not-a-directory, a canonical filename
 *      is an absolute path or contains a path separator, or a self-verify
 *      mismatch after copying (message on stderr); 2 = command-line usage
 *      errors.
 *
 * Self-verify: re-read `<OUT_DIR>/screens` and assert every copied filename
 * landed rather than trust the write.
 *
 * Usage: node copy_screens.ts INVENTORY_MD SOURCE_DIR OUT_DIR
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, isAbsolute, join } from "node:path";
import { parseInventoryEntries } from "./inventory-format.ts";

// ---------------------------------------------------------------------------
// Filename collection
// ---------------------------------------------------------------------------

/** Deduplicated, in-first-seen-order canonical filenames from both entry sections. */
function canonicalFilenames(inventoryMd: string): string[] {
  const entries = [
    ...parseInventoryEntries(inventoryMd, "## Components"),
    ...parseInventoryEntries(inventoryMd, "## Patterns"),
  ];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const e of entries) {
    const name = e.canonical.trim();
    if (name.length === 0 || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const PROG = basename(process.argv[1] ?? "copy_screens.ts");

function usageText(): string {
  return `usage: ${PROG} [-h] INVENTORY_MD SOURCE_DIR OUT_DIR`;
}

function helpText(): string {
  return usageText() + "\n\nSee the top-of-file header comment for the full IN/OUT/exit-code contract.";
}

function argError(msg: string): never {
  process.stderr.write(usageText() + "\n");
  process.stderr.write(`${PROG}: error: ${msg}\n`);
  process.exit(2);
}

/** sys.exit(message)-equivalent: message on stderr, exit code 1. */
function exitErr(msg: string): never {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(helpText() + "\n");
    process.exit(0);
  }
  if (argv.length !== 3) {
    argError(`expected 3 arguments (INVENTORY_MD SOURCE_DIR OUT_DIR), got ${argv.length}`);
  }
  const [inventoryPath, sourceDir, outDir] = argv;

  let inventoryMd: string;
  try {
    inventoryMd = readFileSync(inventoryPath, "utf-8");
  } catch (e) {
    exitErr(`error: cannot read inventory '${inventoryPath}': ${(e as Error).message}`);
  }

  let st;
  try {
    st = statSync(sourceDir);
  } catch (e) {
    exitErr(`error: cannot read source dir '${sourceDir}': ${(e as Error).message}`);
  }
  if (!st.isDirectory()) {
    exitErr(`error: '${sourceDir}' is not a directory`);
  }

  const filenames = canonicalFilenames(inventoryMd);

  // A canonical filename must resolve inside <out>/screens/, never outside it.
  for (const name of filenames) {
    if (isAbsolute(name) || name.includes("/") || name.includes("\\")) {
      exitErr(`error: canonical filename '${name}' must not be an absolute path or contain a path separator`);
    }
  }

  const screensDir = join(outDir, "screens");
  mkdirSync(screensDir, { recursive: true });

  let copied = 0;
  let skipped = 0;
  const copiedNames: string[] = [];
  for (const name of filenames) {
    const src = join(sourceDir, name);
    if (existsSync(src)) {
      copyFileSync(src, join(screensDir, name));
      copiedNames.push(name);
      copied++;
    } else {
      skipped++;
    }
  }

  // Self-verify: re-read the screens dir and confirm every copied name landed, rather than trust the write.
  let shipped: Set<string>;
  try {
    shipped = new Set(readdirSync(screensDir));
  } catch (e) {
    exitErr(`error: self-verify failed reading back '${screensDir}': ${(e as Error).message}`);
  }
  for (const name of copiedNames) {
    if (!shipped.has(name)) {
      exitErr(`error: self-verify failed for '${screensDir}' (expected '${name}' to be present after copy)`);
    }
  }

  process.stdout.write(`SCREENS_OK copied=${copied} skipped=${skipped} -> ${screensDir}\n`);
}

main();
