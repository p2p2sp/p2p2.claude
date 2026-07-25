/*
 * section-model.ts — the one place the design.md `3.N` section list is
 * declared. build_registry.ts and render_design_md.ts both import from here
 * instead of each keeping its own list, so the two can never drift out of
 * sync with each other.
 *
 * Every section falls into exactly one of three provenance classes:
 *   - token-backed  (TOKEN_BACKED_SECTIONS) — rendered from `tokens{}` entries
 *     carrying that `section`; these are the only sections a token may
 *     legally declare.
 *   - field-backed   — rendered from a dedicated array field instead of a
 *     token: 3.3 from `surfaceOrder`, 3.4 from `accentUsage`. A token
 *     declaring one of these sections is rejected — it has no renderer.
 *   - derived        — 3.10, rendered from the `dark` value already present
 *     on measured tokens; never authored directly by a fragment.
 * A section absent from `TOKEN_BACKED_SECTIONS` has no token renderer.
 *
 * IN : nothing — pure constant module.
 * OUT: SECTION_IDS (all ten, in order), SECTION_TITLES (id -> title),
 *      TOKEN_BACKED_SECTIONS (the token-legal subset), isTokenSection(id),
 *      TOKEN_SECTION_RE (matches only TOKEN_BACKED_SECTIONS),
 *      UNKNOWN_SECTION_RE (matches any of SECTION_IDS — `unknowns`/`resolved`
 *      entries may name any section, including the field-backed and derived
 *      ones).
 */

export const SECTION_IDS = ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10"] as const;

export const SECTION_TITLES: Record<string, string> = {
  "3.1": "Color primitives",
  "3.2": "Semantic colors",
  "3.3": "Surface / elevation order",
  "3.4": "Accent-usage inventory",
  "3.5": "Typography",
  "3.6": "Spacing",
  "3.7": "Radii and borders",
  "3.8": "Shadows and effects",
  "3.9": "Motion",
  "3.10": "Dark mode summary",
};

// Token-legal sections: every SECTION_IDS entry except the field-backed 3.3/3.4 and the derived 3.10.
export const TOKEN_BACKED_SECTIONS: ReadonlySet<string> = new Set(
  SECTION_IDS.filter((id) => id !== "3.3" && id !== "3.4" && id !== "3.10"),
);

export function isTokenSection(id: string): boolean {
  return TOKEN_BACKED_SECTIONS.has(id);
}

function toAlternation(ids: Iterable<string>): string {
  return Array.from(ids)
    .map((id) => id.slice(2)) // "3.1" -> "1", "3.10" -> "10"
    .join("|");
}

export const TOKEN_SECTION_RE = new RegExp(`^3\\.(?:${toAlternation(TOKEN_BACKED_SECTIONS)})$`);
export const UNKNOWN_SECTION_RE = new RegExp(`^3\\.(?:${toAlternation(SECTION_IDS)})$`);
