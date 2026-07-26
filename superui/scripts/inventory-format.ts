/*
 * inventory-format.ts — the one place the two shared line formats between
 * the design-extractor pipeline stages are parsed: a satellite's
 * `canonical: <filename>` line, and an `inventory.md` entry's U+00B7
 * (`·`)-delimited fields. validate_bundle.ts, render_design_md.ts, and
 * copy_screens.ts all import from here instead of each keeping its own
 * regex/split logic, so the two can never drift out of sync with each other.
 *
 * `CANONICAL_LINE_RE` tolerates the markdown decoration a `canonical:` line
 * commonly carries — leading indentation, a list marker (`-`/`*`/`+`), a
 * blockquote marker (`>`), a heading marker (`#` … `######`), bold emphasis
 * asterisks wrapped around the label, and a capitalised `Canonical:` label —
 * while staying anchored to line start so it never matches mid-line. It
 * still captures the WHOLE trimmed remainder, not just the first
 * non-whitespace token — `\s*(.+?)\s*$` forces even a lazy `.+?` to expand
 * to end of line because of the trailing `\s*$` anchor. This means a
 * filename containing spaces (e.g. a macOS screenshot name) captures in
 * full, but it also means a `canonical:` line carrying trailing commentary
 * after the filename captures whole too — that line shape is out of
 * contract (the satellite convention is the bare filename, nothing else),
 * and the deliberate behaviour is to surface it as a `missing-screen`
 * finding rather than silently truncate or drop it.
 *
 * `INVENTORY_DELIMITER` is the single U+00B7 (`·`) character `inventory.md`
 * uses to separate an entry's fields; a filename carrying that character
 * itself is out of contract and unhandled — the split is positional by
 * design.
 *
 * IN : nothing — pure parsing module.
 * OUT: INVENTORY_DELIMITER (the `·` character), CANONICAL_LINE_RE (global,
 *      multiline), canonicalRefs(content), parseInventoryEntries(inventoryMd,
 *      heading), InvEntry.
 */

export const INVENTORY_DELIMITER = "·";

// A consolidated satellite carries many `canonical:` lines (one per spec) — matchAll needs the global flag.
// Leading decoration, in order: indentation, an optional list marker, an optional blockquote marker, an
// optional heading marker, then the (optionally bold, optionally capitalised) `canonical:` label itself.
export const CANONICAL_LINE_RE = /^[ \t]*(?:[-*+]\s+)?(?:>\s*)?(?:#{1,6}\s+)?\*{0,2}[Cc]anonical:\*{0,2}\s*(.+?)\s*$/gm;

/** Deduplicated, in-first-seen-order list of every `canonical:` filename captured in `content`. */
export function canonicalRefs(content: string): string[] {
  const seen = new Set<string>();
  for (const m of content.matchAll(CANONICAL_LINE_RE)) seen.add(m[1]);
  return Array.from(seen);
}

export interface InvEntry {
  slug: string;
  kind: string;
  canonical: string;
}

/** `canonical: home.png` -> `home.png`; a label-less field returns trimmed. */
function fieldValue(field: string): string {
  const idx = field.indexOf(":");
  return idx === -1 ? field.trim() : field.slice(idx + 1).trim();
}

/** Parses every `- ` entry line under `## Components` or `## Patterns` in `inventory.md` into an `InvEntry`. */
export function parseInventoryEntries(inventoryMd: string, heading: string): InvEntry[] {
  const lines = inventoryMd.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      end = i;
      break;
    }
  }
  const isComponents = heading === "## Components";
  return lines
    .slice(start + 1, end)
    .filter((l) => l.startsWith("- "))
    .map((line) => {
      const fields = line.split(INVENTORY_DELIMITER);
      const slug = fields[0].replace(/^- /, "").split(" - ")[0].trim();
      if (isComponents) {
        return { slug, kind: (fields[1] ?? "").trim(), canonical: fieldValue(fields[2] ?? "") };
      }
      return { slug, kind: "", canonical: fieldValue(fields[1] ?? "") };
    });
}
