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
 * basename (`components` -> `# Components`, `patterns` -> `# Patterns`). Every
 * ATX heading INSIDE a spec body is shifted down (h1/h2 -> h3, h3-h5 down one,
 * h6 clamped at h6) on inclusion, so the slug wrappers are the only `## `
 * headings in the satellite; a heading line inside a fenced code block
 * (``` or ~~~) is left unmodified. A spec body that opened with `# ` (h1) logs
 * a non-fatal warning naming the file - the run still exits 0.
 *
 * IN : SPECS_DIR - a dir of zero or more `<slug>.md` intermediate specs.
 *      OUTPUT_MD - where to write the consolidated satellite.
 * OUT: stdout - one line on success:
 *        SPECS_OK entries=<N> -> <OUTPUT_MD>
 *      stderr - one `warning: <file> body carried an h1 heading, shifted to
 *      h3` line per spec whose body opened with an h1.
 *      OUTPUT_MD holds a `# <Title>` line then one `## <slug>` subsection per
 *      input spec (slugs sorted), each followed by that spec's body. An empty
 *      SPECS_DIR yields a titled stub with a "None catalogued." line (zero
 *      `## ` subsections) and still exits 0.
 * Exit codes: 0 = ok (including the empty-dir stub); 1 = SPECS_DIR
 *      unreadable/not-a-directory, an unreadable spec file, an unwritable
 *      OUTPUT_MD, or a self-verify mismatch after writing (message on
 *      stderr); 2 = command-line usage errors.
 *
 * Self-verify: re-read OUTPUT_MD and assert every expected `## <slug>` wrapper
 * (fenced regions excluded from the check) is present, rather than trust the
 * write. The first missing slug is named in the error.
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

/** `true` when `line` opens (or closes) a fenced code block; the fence character (\` or ~) otherwise `null`. */
function fenceMarker(line: string): string | null {
  const m = /^\s*(`{3,}|~{3,})/.exec(line);
  return m ? m[1][0] : null;
}

/**
 * Shift every ATX heading of level L in a spec body to min(6, max(3, L + 1)),
 * skipping lines inside a fenced code block (``` or ~~~) so a `## ` inside a
 * code sample is left unmodified. Both h1 and h2 land on h3 (the floor keeps a
 * body `# Title` from becoming a second `## ` that reads as a slug wrapper);
 * h3-h5 shift down one; h6 is clamped so nothing becomes h7. Reports whether
 * any h1 was shifted, for the caller's non-fatal warning.
 */
function demoteBodyHeadings(body: string): { text: string; shiftedH1: boolean } {
  let fenceChar: string | null = null;
  let shiftedH1 = false;
  const out: string[] = [];
  for (const line of body.split("\n")) {
    const marker = fenceMarker(line);
    if (marker !== null) {
      if (fenceChar === null) fenceChar = marker;
      else if (marker === fenceChar) fenceChar = null;
      out.push(line);
      continue;
    }
    if (fenceChar !== null) {
      out.push(line);
      continue;
    }
    const headingMatch = /^(#{1,6})(\s+)(.*)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      if (level === 1) shiftedH1 = true;
      const newLevel = Math.min(6, Math.max(3, level + 1));
      out.push("#".repeat(newLevel) + headingMatch[2] + headingMatch[3]);
      continue;
    }
    out.push(line);
  }
  return { text: out.join("\n"), shiftedH1 };
}

/** Every non-fenced `## <slug>` wrapper heading present in a written satellite, keyed by slug text. */
function nonFencedH2Slugs(text: string): Set<string> {
  let fenceChar: string | null = null;
  const slugs = new Set<string>();
  for (const line of text.split("\n")) {
    const marker = fenceMarker(line);
    if (marker !== null) {
      if (fenceChar === null) fenceChar = marker;
      else if (marker === fenceChar) fenceChar = null;
      continue;
    }
    if (fenceChar !== null) continue;
    const m = /^## (.+)$/.exec(line);
    if (m) slugs.add(m[1]);
  }
  return slugs;
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

  let files: string[];
  try {
    files = readdirSync(specsDir)
      .filter((f) => f.toLowerCase().endsWith(".md"))
      .sort();
  } catch (e) {
    exitErr(`error: cannot read specs dir '${specsDir}': ${(e as Error).message}`);
  }

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
      const { text, shiftedH1 } = demoteBodyHeadings(body.trim());
      if (shiftedH1) {
        process.stderr.write(`warning: ${join(specsDir, f)} body carried an h1 heading, shifted to h3\n`);
      }
      parts.push(`## ${slug}\n\n${text}`);
    }
  }
  try {
    writeFileSync(outputPath, parts.join("\n\n") + "\n");
  } catch (e) {
    exitErr(`error: cannot write '${outputPath}': ${(e as Error).message}`);
  }

  // Self-verify: re-read the written file and confirm every expected slug wrapper is present rather than trust the write.
  let written: string;
  try {
    written = readFileSync(outputPath, "utf-8");
  } catch (e) {
    exitErr(`error: self-verify failed reading back '${outputPath}': ${(e as Error).message}`);
  }
  const presentSlugs = nonFencedH2Slugs(written);
  for (const f of files) {
    const slug = f.replace(/\.md$/i, "");
    if (!presentSlugs.has(slug)) {
      exitErr(`error: self-verify failed for '${outputPath}' (missing '## ${slug}' subsection)`);
    }
  }

  process.stdout.write(`SPECS_OK entries=${files.length} -> ${outputPath}\n`);
}

main();
