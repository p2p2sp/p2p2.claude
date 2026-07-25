/*
 * assemble_specs.ts - consolidates every per-entry intermediate spec under
 * SPECS_DIR into ONE satellite markdown file (`DESIGN.components.md` or
 * `DESIGN.patterns.md`). It is the SOLE writer of its OUTPUT_MD and is run
 * once per kind - first the components specs dir, then the patterns specs dir.
 *
 * Each intermediate `<slug>.md` is wrapped under a `## <slug>` heading whose
 * slug is derived from the FILENAME (never by parsing the spec body), so the
 * consolidation stays independent of the spec's own `canonical:`/backtick
 * contract. The file opens with a `# <Title>` derived from SPECS_DIR's
 * basename (`components` -> `# Components`, `patterns` -> `# Patterns`). Any
 * `## ` heading INSIDE a spec body is demoted to `### ` on inclusion, so the
 * slug wrappers are the only `## ` headings in the satellite (this keeps the
 * self-verify's `## `-count == spec-count invariant exact regardless of how a
 * spec headed its own sections).
 *
 * IN : SPECS_DIR - a dir of zero or more `<slug>.md` intermediate specs.
 *      OUTPUT_MD - where to write the consolidated satellite.
 * OUT: stdout - one line on success:
 *        SPECS_OK entries=<N> -> <OUTPUT_MD>
 *      OUTPUT_MD holds a `# <Title>` line then one `## <slug>` subsection per
 *      input spec (slugs sorted), each followed by that spec's body. An empty
 *      SPECS_DIR yields a titled stub with a "None catalogued." line (zero
 *      `## ` subsections) and still exits 0.
 * Exit codes: 0 = ok (including the empty-dir stub); 1 = SPECS_DIR
 *      unreadable/not-a-directory, an unreadable spec file, or a self-verify
 *      mismatch after writing (message on stderr); 2 = command-line usage
 *      errors.
 *
 * Self-verify: re-read OUTPUT_MD and assert its `## ` subsection count equals
 * the number of input `.md` files (0 for the stub) rather than trust the write.
 *
 * Usage: node assemble_specs.ts SPECS_DIR OUTPUT_MD
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

// ---------------------------------------------------------------------------
// Title / body helpers
// ---------------------------------------------------------------------------

/** `# <Title>` for the satellite, derived from SPECS_DIR's basename (Titlecased). */
function titleFor(specsDir: string): string {
  const base = basename(specsDir.replace(/[\\/]+$/, ""));
  if (base.length === 0) return "Specs";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Demote any `## ` (exactly h2) heading in a spec body to `### `, leaving the slug wrappers the only h2. */
function demoteBodyHeadings(body: string): string {
  return body.replace(/^## /gm, "### ");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const PROG = basename(process.argv[1] ?? "assemble_specs.ts");

function usageText(): string {
  return `usage: ${PROG} [-h] SPECS_DIR OUTPUT_MD`;
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
  if (argv.length !== 2) {
    argError(`expected 2 arguments (SPECS_DIR OUTPUT_MD), got ${argv.length}`);
  }
  const [specsDir, outputPath] = argv;

  let st;
  try {
    st = statSync(specsDir);
  } catch (e) {
    exitErr(`error: cannot read specs dir '${specsDir}': ${(e as Error).message}`);
  }
  if (!st.isDirectory()) {
    exitErr(`error: '${specsDir}' is not a directory`);
  }

  const files = readdirSync(specsDir)
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .sort();

  const parts: string[] = [`# ${titleFor(specsDir)}`];
  if (files.length === 0) {
    parts.push("None catalogued.");
  } else {
    for (const f of files) {
      const slug = f.replace(/\.md$/i, "");
      let body: string;
      try {
        body = readFileSync(join(specsDir, f), "utf-8");
      } catch (e) {
        exitErr(`error: cannot read spec '${join(specsDir, f)}': ${(e as Error).message}`);
      }
      parts.push(`## ${slug}\n\n${demoteBodyHeadings(body.trim())}`);
    }
  }
  writeFileSync(outputPath, parts.join("\n\n") + "\n");

  // Self-verify: re-read the written file and re-count the `## ` subsections rather than trust the write.
  let written: string;
  try {
    written = readFileSync(outputPath, "utf-8");
  } catch (e) {
    exitErr(`error: self-verify failed reading back '${outputPath}': ${(e as Error).message}`);
  }
  const count = (written.match(/^## /gm) ?? []).length;
  if (count !== files.length) {
    exitErr(`error: self-verify failed for '${outputPath}' (expected ${files.length} '## ' subsections, found ${count})`);
  }

  process.stdout.write(`SPECS_OK entries=${files.length} -> ${outputPath}\n`);
}

main();
