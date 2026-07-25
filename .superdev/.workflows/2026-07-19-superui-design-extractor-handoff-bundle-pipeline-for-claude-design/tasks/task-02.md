
## Task 2 - feat(superui): add registry merge and design.md renderer
- Covers: criteria #3

### Dependencies
- Task 1 - blocks: Task 3, Task 4, Task 6

### Files
- add - `superui/scripts/build_registry.ts` (`main`, `mergeFragments`, `validateShape`, `detectCollisions`)
- add - `superui/scripts/render_design_md.ts` (`main`, `renderSection`, `renderTokenTable`, `renderSurfaceOrder`, `renderAccentUsage`, `renderTextStyles`)

### Test Commands
*Build*
- `sh superui/scripts/check_node.sh`

*Tests*
- `$NODE superui/scripts/build_registry.ts .temp/design-extractor-fixtures/notes .temp/design-extractor-fixtures/registry.json` - expect a one-line summary naming the token count and unknown count
- `$NODE superui/scripts/render_design_md.ts .temp/design-extractor-fixtures/registry.json .temp/design-extractor-fixtures/design.md` - expect a one-line summary naming the ten sections written
- `grep -c '^## ' .temp/design-extractor-fixtures/design.md` - expect `10`
- `$NODE superui/scripts/build_registry.ts .temp/design-extractor-fixtures/notes-collision .temp/design-extractor-fixtures/bad.json; echo $?` - expect `1` and a message naming the duplicated token and both fragments

### Approach
1. Hand-write fixture fragments under `.temp/design-extractor-fixtures/notes/notes-{colors,typography,dimensions,effects-motion}.json` covering at least two tokens each plus a surface order, an accent-usage entry, a text style and one unknown; and a `notes-collision/` variant where two fragments declare the same token name.
2. Write `build_registry.ts`: read every `notes-*.json` in the input dir, `validateShape` each against the fragment contract below (reject unknown top-level keys, missing `evidence`, any token missing `value` - a token entry always carries a measured value, and anything unmeasurable belongs in `unknowns` as a standalone entry instead, never as a valueless token - and any `tokens{}` key or `textStyles[].name` carrying no dot, since `checkTokenRefs` resolves only dotted references and a bare name would enter the registry unflagged with every spec reference to it escaping validation), `detectCollisions` across fragments, then merge into one `registry.json` preserving insertion order per section. Self-verify by re-reading the written file and re-counting. Exit 1 on shape violation or collision, 2 on bad arguments.
3. Write `render_design_md.ts`: read `registry.json` and emit all ten sections in contract order with fixed `## 3.N` headings. Group 3.1 by ramp when token names share a `<ramp>.<step>` prefix. Emit a `light` and a `dark` column wherever any token in the section carries a `dark` value. Render 3.3 as an ordered list with hex per level taken from `surfaceOrder` already ranked by the sampler, never re-sorted here. Emit 3.10 as `none` when no token carries a `dark` value.
4. Every value cell prints exactly what the registry holds; an entry listed in `unknowns` renders as `> NEEDS INPUT: <what> - <reason>` inside its section instead of a fabricated value. Neither script ever invents, rounds or infers a value.
5. Both scripts carry the `IN :` / `OUT:` / exit-code header contract and print a one-line self-verified summary.

### Edge cases
- Empty input dir: exit 1 naming the dir, not an empty registry.
- A section with no tokens at all still emits its heading plus an explicit `none` line, so criterion #3 (every section present) holds and `validate_bundle.ts` can distinguish "measured as absent" from "never filled".
- A token carrying `dark` but no light value: exit 1 from `validateShape` - a dark-only token has no light counterpart to render.
- A token in section 3.2 missing `primitive` or `usedFor`: exit 1 from `validateShape`, since the 3.2 renderer would otherwise emit an empty cell. Both fields stay optional for every other section.
- A duplicate token name WITHIN one fragment is deliberately not detected: `tokens` is a JSON object keyed by name, so `JSON.parse` keeps the last occurrence and the duplicate is unobservable without a raw-text pre-scan. Only cross-fragment collisions are detectable, and those are what `detectCollisions` covers.

### Contracts
The ten `design.md` sections, fixed headings, emitted in this exact order - this is the authoritative list for `render_design_md.ts`, for the `section` field of every registry entry, and for the analyst duty split in Task 4:
- `## 3.1 Color primitives` - name, hex, optional oklch or rgb, notes. Every distinct measured color, deduped, grouped by ramp where one exists.
- `## 3.2 Semantic colors` - role, source primitive name, hex light, hex dark, where used. The primitive column comes from each token's `primitive` field and the usage column from its `usedFor` field; a semantic token in section 3.2 must carry both, enforced by `validateShape`. Every role name is dotted, since `checkTokenRefs` only resolves references carrying at least one dot - a bare `focus` or `success` could never be validated. Minimum roles: `color.surface.base/raised/muted/overlay`, `color.text.primary/secondary/on-accent`, `color.border.default/strong`, `color.accent.*`, `color.focus`, plus a dotted `color.feedback.<name>` for every feedback color present.
- `## 3.3 Surface / elevation order` - mandatory ordered list, one line per region, darkest first, hex per level. Rendered from `surfaceOrder`.
- `## 3.4 Accent-usage inventory` - mandatory, per screen, every legitimate appearance of the chromatic accent. Rendered from `accentUsage` by `renderAccentUsage`.
- `## 3.5 Typography` - families with role and fallback stack, then the finite type scale: style name, family, size, weight, line-height, letter-spacing, where used. Rendered from `textStyles` by `renderTextStyles`.
- `## 3.6 Spacing` - step and value.
- `## 3.7 Radii and borders` - radii token and value, then border-width token and value.
- `## 3.8 Shadows and effects` - per level the full layer stack, plus overlay scrim color and opacity, disabled opacity, and z-index order.
- `## 3.9 Motion` - name, duration, cubic-bezier.
- `## 3.10 Dark mode summary` - which tokens differ in dark, or the literal `none`.

Fragment (`notes-<foundation>.json`): `{ "foundation": "colors|typography|dimensions|effects-motion", "tokens": { "<name>": { "value": string, "dark": string|null, "type": string, "section": "3.1".."3.9", "primitive": string|null, "usedFor": string|null, "evidence": { "screen": string, "method": "points"|"regions"|"geometry"|"reference", "detail": string }, "notes": string|null } }, "surfaceOrder": [ { "region": string, "hex": string, "luminance": number, "rank": number } ], "accentUsage": [ { "screen": string, "where": string, "token": string } ], "textStyles": [ { "name": string, "family": string, "size": string, "weight": number, "lineHeight": number, "letterSpacing": string, "usedFor": string } ]  // `name` is DOTTED, e.g. `text.body`, `text.h1` - specs reference a type style by that name in a `font` property line, so it must satisfy the same dotted form as a token, "unknowns": [ { "what": string, "reason": string, "section": string } ] }`. `registry.json` is the same shape minus `foundation`, with the four fragments merged. `registry.json` is internal to `.temp/` and never enters the bundle.

The RESOLUTION NAMESPACE that `checkTokenRefs` validates against is the union of two things and nothing else: every key of `tokens{}`, plus every `textStyles[].name`. A spec's `font` property line references a dotted type-style name, so excluding `textStyles[]` would let every font reference escape validation. `surfaceOrder[].region` and `accentUsage[].where` are prose labels, not token names, and are deliberately outside the namespace; `accentUsage[].token` must name a key already in `tokens{}` and is validated by `build_registry.ts` at merge time, not by `checkTokenRefs`.

### DoD
All four test commands produce the stated output and exit codes; the rendered `design.md` has ten `## ` headings and no cell holding a value absent from the fixture registry.


### Covered criteria
3. `design.md` carries sections 3.1 through 3.10, each non-empty, with every value table rendered by `render_design_md.ts` from `registry.json` rather than authored by an agent.
