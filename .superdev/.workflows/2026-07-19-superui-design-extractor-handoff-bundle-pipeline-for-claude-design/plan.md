# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "superui design-extractor - handoff bundle pipeline for Claude Design"

---
<!-- HEADER -->

## Goal
`/superui:design-extractor <screenshots-dir>` turns a folder of UI screenshots into a handoff bundle at `.temp/design-extractor/<run>/handoff/` plus a sibling `handoff.zip`, containing exactly `design.md`, `inventory.md`, `components/<slug>.md`, `patterns/<slug>.md`, `screens/<file>.png`, `meta.yml` and optionally `intake-answers.md`. Every foundation value in `design.md` traces to a pixel sample or a stated in-image reference. The bundle carries no token file and no documentation-site artifact.

## Context
superui is being rebuilt around the pairing of Claude Code CLI and Claude Design. The old self-contained design-system pipeline (6 skills, 15 agents, 11 scripts) is set aside in `.temp/superui-legacy/` as read-only reference. The consumer on the Claude Design side builds live inline-styled Design Components and reads foundation values from `design.md` alone, so a parallel token file or generated doc site would create a competing source of truth and break click-to-edit. The surviving asset `sample_colors.ts` covers color, luminance-ranked surface order and accent inventory, but measures no geometry at all - that gap is the main new code. The bundle is one-shot input material: after iteration in Claude Design the authoritative artifact becomes the regenerated DTCG coming back, which a later skill will own.

## Acceptance criteria
1. Running the head skill on a screenshots directory produces `.temp/design-extractor/<run>/handoff/` with all required members present and a sibling `handoff.zip` that unpacks to the same tree.
2. The bundle contains no `*.json` token file, no `*.css`, no `*.js` and no `*.html` - verified by listing the bundle.
3. `design.md` carries sections 3.1 through 3.10, each non-empty, with every value table rendered by `render_design_md.ts` from `registry.json` rather than authored by an agent.
4. `validate_bundle.ts` exits 1 with a named finding when a spec cites a token absent from the registry, when a spec or inventory entry cites a CANONICAL screen absent from `screens/`, or when a required section of `design.md` is empty; it exits 0 on a clean bundle, including one whose inventory `appears:` lists screens that do not ship.
5. `measure_geometry.ts` reports the known geometry of a synthetic fixture image within the tolerance stated in its header, for each of its four modes.
6. The head SKILL.md performs no measuring and authors no measured or generated artifact inline - `design.md`, the specs, `inventory.md`, `screens/`, `meta.yml` and the zip all originate elsewhere. Transcribing the user's own intake answers to `<run>/intake-answers.md` is the one write it owns, and necessarily so, since `AskUserQuestion` runs only in the main context. The fork worker SKILL.md contains no user-facing question and no `AskUserQuestion`.
7. `superui/.claude-plugin/plugin.json` lists four skills and five agents, with no worker appearing in both arrays, and `superui/CLAUDE.md`, `superui/README.md`, root `README.md` and root `CLAUDE.md` describe the shipped state with no mid-rewrite or no-agents wording left anywhere.
8. No file under `superui/`, and neither root `README.md` nor root `CLAUDE.md`, references a removed artifact - `.superui/design-system/`, `tokens.css`, `DESIGN.md` generation, spec-token or preview linting, the doc chrome, or any set-aside skill name. The `.temp/`, `.docs/` and `.superdev/` trees keep the old names deliberately and are out of scope.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(superui): add measure_geometry.ts pixel-geometry sampler
- Covers: criteria #5

### Dependencies
- none - blocks: Task 2, Task 4, Task 6

### Files
- add - `superui/scripts/measure_geometry.ts` (`main`, `parseArgs`, `loadImage`, `scanRuns`, `fitRadius`, `scanShadow`, `inkBox`)
- add - `.temp/design-extractor-fixtures/make_fixture.ts` (`writePng`, `main`) - dev-time only, never shipped, not referenced by any skill

### Test Commands
*Build*
- `sh superui/scripts/check_node.sh` - expect one line `NODE_OK <cmd>`; use `<cmd>` below as `NODE`

*Tests*
- `$NODE .temp/design-extractor-fixtures/make_fixture.ts .temp/design-extractor-fixtures/box.png` - expect `wrote .temp/design-extractor-fixtures/box.png 240x160`
- `$NODE superui/scripts/measure_geometry.ts .temp/design-extractor-fixtures/box.png --edges 0,80,240,1 --axis h` - expect five runs: white 0..59, border 2px at 60, fill 96px at 62, border 2px at 158, white from 160
- `$NODE superui/scripts/measure_geometry.ts .temp/design-extractor-fixtures/box.png --radius 60,40,100,80 --corner tl` - expect `radius=8` with confidence >= 0.8
- `$NODE superui/scripts/measure_geometry.ts .temp/design-extractor-fixtures/box.png --ink 62,48,96,70` - expect ink bounds exactly x=70..109, y=90..109 and `capHeight=20`; the rect starts at y=48 to clear the 8px top-left corner arc as well as the four straight borders, so the modal background is unambiguously the box fill
- `$NODE superui/scripts/measure_geometry.ts .temp/design-extractor-fixtures/box.png --shadow 60,40,100,80 --side bottom` - expect `extent=6` with a non-zero `peakDelta` and `bgHex=#ffffff`
- `$NODE superui/scripts/measure_geometry.ts .temp/design-extractor-fixtures/box.png --edges 0,0,9999,1 --axis h; echo $?` - expect `1` and an out-of-bounds message on stderr
- `$NODE superui/scripts/measure_geometry.ts --edges 0,0,1,1; echo $?` - expect `2` and a usage block

### Approach
1. Write `make_fixture.ts`: emit a 240x160 PNG via `node:zlib.deflateSync` over raw scanlines with filter byte 0 per row - IHDR (color type 2, depth 8), single IDAT, IEND, CRC32 per chunk. Canvas `#ffffff`; a `#3366f2` box at x=60,y=40,w=100,h=80 with an 8px top-left corner radius and a 2px `#1b3fa0` border; a `#111111` glyph block at exactly x=70,y=90,w=40,h=20 (rows 90..109, deliberately clear of row 80 so the `--edges` row scan sees an unbroken fill run); and a drop-shadow band at rows y=120..125 darkening from `#c8c8c8` at y=120 and lightening per row so that y=125 is still measurably below white and y=126 is the first true `#ffffff` row, giving `--shadow` a deterministic extent of 6. Print `wrote <path> <W>x<H>`.
2. Write `measure_geometry.ts` reusing `vendor/png-decode.ts` and `vendor/jpeg-decode.ts` unchanged via `loadImage(path)` returning `{ width, height, rgb }` row-major RGB, mirroring how `sample_colors.ts` consumes them.
3. Implement `scanRuns(rgb, box, axis, tol)` - walk the box along `axis`, group consecutive pixels whose per-channel delta stays within `tol`, emit `offset length #hex` per run. This one primitive yields paddings, gaps, border widths, control heights and divider widths.
4. Implement `fitRadius(rgb, box, corner, tol)` - in the corner quadrant record, per row, the first column whose color differs from the outside background; fit the largest `r` whose quarter-circle matches those offsets, and report `confidence` as the fraction of rows within one pixel of the fit. Implement `scanShadow(rgb, box, side, tol)` - step outward from the box edge until luminance returns to the far background, printing `extent` (the count of rows or columns that differ from the far background), `peakDelta`, `bgHex`. Implement `inkBox(rgb, box, tol)` - define background as the modal color of the rect, then report the bounds of every pixel differing from it by more than `tol`, plus `capHeight`, and for multi-row ink the `lineStarts` and derived `lineHeight`.
5. Mirror `sample_colors.ts` conventions exactly: argparse-style flags with prefix abbreviation, `--tol N` (default 8, per-channel), `--json` for structured output, human-readable lines otherwise, and exit codes 0 ok / 1 unreadable image or out-of-bounds box or bad flag values / 2 usage errors. Head comment carries the full `IN :` / `OUT:` / exit-code contract plus the stated tolerance and the alpha limitation.

### Edge cases
- Alpha is discarded by both vendor decoders and cannot be recovered - a screenshot with transparency yields the raw under-color. Document this in the header as a known limitation; do not attempt compositing.
- Interlaced (Adam7) PNG, WebP and AVIF fail in the decoders with exit 1 - surface the decoder message verbatim, do not wrap it.
- Box partially or wholly outside the image: exit 1 with the offending rect echoed, never a silent clamp.
- Zero-width or zero-height box: exit 1.
- Antialiased edges: `--tol` governs run grouping; a run shorter than 1px cannot exist, so subpixel edges report as the nearest whole pixel and the header states this.
- `fitRadius` on a square corner returns `radius=0` with high confidence, not an error.

### Contracts
`loadImage(path: string): { width: number, height: number, rgb: Uint8Array }` - row-major RGB, 3 bytes per pixel. CLI: `measure_geometry.ts IMAGE (--edges x,y,w,h --axis h|v | --radius x,y,w,h --corner tl|tr|bl|br | --shadow x,y,w,h --side top|right|bottom|left | --ink x,y,w,h) [--tol N] [--json]`.

### DoD
Every test command above produces the stated output and exit codes. The script imports nothing outside `node:` builtins and the two existing vendor decoders.

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(superui): add bundle meta, validator and zip packer
- Covers: criteria #1, #2, #4

### Dependencies
- Task 2 - blocks: Task 6

### Files
- add - `superui/scripts/build_meta.ts` (`main`, `scanBundle`, `emitYaml`)
- add - `superui/scripts/validate_bundle.ts` (`main`, `checkTokenRefs`, `checkScreenRefs`, `checkSections`, `checkForbidden`)
- add - `superui/scripts/pack_bundle.ts` (`main`, `zipDir`, `writeCentralDirectory`)

### Test Commands
*Build*
- `sh superui/scripts/check_node.sh`

*Tests*
- `$NODE superui/scripts/build_meta.ts .temp/design-extractor-fixtures/handoff acme-screens` - expect a summary naming screen, component and pattern counts, and `meta.yml` written inside the bundle
- `$NODE superui/scripts/validate_bundle.ts .temp/design-extractor-fixtures/handoff .temp/design-extractor-fixtures/registry.json; echo $?` - expect `0` and a `CLEAN` line
- `$NODE superui/scripts/validate_bundle.ts .temp/design-extractor-fixtures/handoff-broken .temp/design-extractor-fixtures/registry.json; echo $?` - expect `1` and exactly four finding lines, one `unknown-token`, one `missing-screen`, one `empty-section`, one `forbidden-artifact`
- `$NODE superui/scripts/pack_bundle.ts .temp/design-extractor-fixtures/handoff .temp/design-extractor-fixtures/handoff.zip` - expect a summary naming the file count and byte size
- `unzip -l .temp/design-extractor-fixtures/handoff.zip` - expect the same tree as the source dir (skip this assertion with a note if `unzip` is absent; `pack_bundle.ts` self-verifies its own central directory regardless)

### Approach
1. Hand-write a fixture bundle under `.temp/design-extractor-fixtures/handoff/` (design.md from Task 2, a small inventory.md whose component entry appears on three screens of which one is canonical, one component spec carrying backticked property names and a backticked screen filename alongside real token references, one pattern spec, two PNG screens copied from the Task 1 fixture) and a `handoff-broken/` variant carrying exactly four seeded defects: an unknown token reference, a missing canonical screen, an empty section, and a stray `tokens.json`.
2. Write `build_meta.ts`: scan the bundle dir, derive `version`, `source` (from the argument), `generatedAt` (ISO-8601), `darkMode` (true when `design.md` section 3.10 is not `none`), and the `screens`, `components`, `patterns` lists from the files actually present, reading each spec's canonical-screen line for `canonical:` and taking each component's `kind` from the SECOND `·`-separated field of its `inventory.md` entry line (index 1 when splitting on `·`), which is the unlabelled `atomic|composite` token - there is no `kind:` label in the inventory format, and the third field is `canonical:`. Emit `meta.yml` by direct string assembly - no YAML library, and none needed since nothing reads it back. Because `meta.yml` is derived from directory contents, meta-versus-contents consistency holds by construction and needs no validation pass.
3. Write `validate_bundle.ts` taking the bundle dir and `registry.json`. `checkTokenRefs` extracts every backticked string from `components/*.md` and `patterns/*.md`, keeps only those matching the dotted token form defined in the Contracts block, and resolves each against the registry's resolution namespace as Task 2 pins it - the keys of `tokens{}` plus every `textStyles[].name` - so backticked property names, part names and screen filenames never produce a finding, and a spec's dotted type-style reference in a `font` line resolves rather than dangling. `checkScreenRefs` collects CANONICAL screen references only - each spec's canonical-screen line and each `canonical:` field in `inventory.md` - deduplicates them by filename so one absent screen cited from both sources yields exactly one finding, and asserts each exists in `screens/`; the inventory's `appears:` field is source metadata describing where a block was seen, not a file reference, and is deliberately excluded, matching the bundle contract's "one PNG per canonical screen". `checkSections` asserts each `## 3.N` heading in `design.md` has non-whitespace body content. `checkForbidden` asserts the bundle holds no `*.css`, `*.js`, `*.html` and no `*.json` at all, anywhere under the bundle dir - blanket rejection, not a name heuristic, since the bundle contract lists no legitimate JSON member and `registry.json` is internal to `.temp/`. `meta.yml` is YAML and unaffected. Print one `FINDING: <category> <detail>` line per defect and a `CLEAN` line when none; exit 1 when any finding exists, 2 on bad arguments.
4. Write `pack_bundle.ts`: build a ZIP with `node:zlib.deflateRawSync` per entry, local file headers, a central directory and an end-of-central-directory record, CRC32 per entry. Self-verify by re-reading the written archive and confirming the central directory entry count and each stored CRC before printing its summary.
5. All three carry the `IN :` / `OUT:` / exit-code header contract.

### Edge cases
- A spec citing a screen with different case on a case-insensitive filesystem: compare exactly as written and report a finding, since the consumer's filesystem may be case-sensitive.
- An inventory entry whose `appears:` lists screens absent from `screens/`: not a finding by construction, since only canonical screens ship. Cover this with a fixture entry appearing on three screens of which one is canonical, and assert `CLEAN`.
- Bundle dir absent or empty: exit 1 naming the dir.
- A token reference inside a fenced code block in a spec: still resolved, since the bundle has no code samples and treating them uniformly avoids a parser exception.
- Zero components or zero patterns: valid, emit empty lists in `meta.yml` and do not fail.
- File names holding non-ASCII: store UTF-8 bytes and set the ZIP language-encoding flag bit 11.

### Contracts
`meta.yml` per the bundle contract: `version: 1`, `source`, `generatedAt`, `darkMode`, `screens: []`, `components: [{ slug, kind, canonical, spec }]`, `patterns: [{ slug, canonical, spec }]`. `validate_bundle.ts` finding categories: `unknown-token`, `missing-screen`, `empty-section`, `forbidden-artifact`. A backticked string in a spec counts as a token reference only when it matches the dotted form `<group>.<name>` with at least one dot and no whitespace or slash; bare backticked words (`bg`, `text`, `radius`, part names) and backticked filenames (`login.png`) are excluded by that rule, the latter by an explicit image-extension exemption. The spec-file surface both scripts parse - the literal `canonical: <filename>.png` line and the backticked dotted token form - is pinned in Task 4's Contracts block and must agree with it verbatim.

### DoD
All five test commands produce the stated output and exit codes; the clean fixture yields `CLEAN` despite carrying backticked non-token strings and an `appears:` list wider than `screens/`; the broken fixture yields exactly four findings, one per seeded defect and one per finding category.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - feat(superui): add measuring agents foundation-analyst and spec-writer
- Covers: criteria #3, #6

### Dependencies
- Task 1, Task 2 - blocks: Task 6

### Files
- add - `superui/agents/foundation-analyst.md`
- add - `superui/agents/spec-writer.md`

### Test Commands
*Build*
- none - markdown artifacts, no build step in this repo

*Tests*
- `grep -n 'measure_geometry\|sample_colors' superui/agents/foundation-analyst.md superui/agents/spec-writer.md` - expect both named in each agent's input contract as dispatched script paths
- `grep -n 'CLAUDE_PLUGIN_ROOT' superui/agents/*.md` - expect no match; the variable is documented for hook and skill bodies only, and no agent in this repo uses it
- `grep -n 'AskUserQuestion\|ask the user' superui/agents/*.md` - expect no match
- Read both files against `.claude/rules/_skills.md` - no tables, no italics, no emoji, no caller narrative in the body

### Approach
1. Write `foundation-analyst.md` with frontmatter `name`, `description` ending "Invoked only by superui design-extractor skills, never directly.", `model: sonnet`, `tools: Read, Write, Glob, Grep, Bash`. Every script path arrives as a dispatched input, never as a `${CLAUDE_PLUGIN_ROOT}` reference in the body - that variable is documented for hook and skill bodies only, and the direct precedent is `.temp/superui-legacy/agents/foundation-analyst.md`, which takes the sampler path as an input. Body states the input contract (foundation name, source dir, source-map path, optional intake-answers path, absolute sampler path, absolute geometry script path, runtime command, output fragment path, and an optional re-dispatch pair - the previous fragment path plus findings to honor, on which it regenerates the fragment in full rather than patching it), the per-foundation duty split (colors covers sections 3.1 to 3.4 and 3.10 and always reads every screen; typography 3.5; dimensions 3.6 and 3.7; effects-motion 3.8 and 3.9), and the output contract: one `notes-<foundation>.json` fragment in the Task 2 shape. Every token name it proposes and every `textStyles[].name` is DOTTED (`color.surface.base`, `radius.control`, `text.body`) - a bare name is rejected by `validateShape` and would escape spec-reference validation entirely.
2. State the measurement law without exception: every value comes from an invocation of the dispatched sampler or geometry script, or from a stated in-image reference. Never a round number by habit, never a value from memory or a template. Every token carries its `evidence` object naming the screen, the method and the detail.
3. State the three exits for anything unmeasurable: an `unknowns` entry with a reason, a `> NEEDS INPUT` marker carried in the final message, or omission - never a fabricated value. Name the two legitimate non-pixel judgments: font-family identity by letterform (and say so explicitly when the family is unlabeled) and motion that is state-implied rather than observable.
4. For the colors foundation, mandate `--regions` over every major region background and transcribing the printed luminance rank verbatim into `surfaceOrder` - the analyst never ranks by eye. Mandate the accent-usage inventory as a per-screen enumeration.
5. Write `spec-writer.md` with the same frontmatter shape and `tools: Read, Write, Glob, Grep, Bash`. Input: one inventory entry line, source dir, `registry.json`, output spec path, script paths, runtime command, and an optional re-dispatch pair (previous spec path plus findings to honor, regenerating in full). It reads the entry's kind to choose its section list: a component entry yields Anatomy, a per-part table-free breakdown giving each part its own property-to-token lines (bg, text, border, radius, padding, font - one line per property, never several tokens lumped into one cell), every state as token deltas documenting both form and measured color, and a size-and-variant matrix with values per size; a pattern entry yields Composition, layout and arrangement with the tokens driving spacing and alignment, and whole-pattern states, with no size-and-variant matrix. Both kinds carry the canonical screen line plus an optional bbox crop hint. Every value is a token NAME from the registry; an unmatched value returns as a `MISSING-TOKENS:` block in the final message and never as a raw value in the spec.
6. Restate the variant-versus-state boundary: a variant is author-time configuration, a state is a runtime condition, never mixed. Restate that a state's color maps to the token that actually matches, often the ink token rather than the accent, never inferred from a typical pattern.
7. Pin the spec file's machine-readable surface in the agent body exactly as the Contracts block below states it - the `canonical: <filename>.png` line and the backticked dotted token form are parsed by `build_meta.ts` and `validate_bundle.ts`, so the agent must emit them verbatim rather than in a prose variant.

### Edge cases
- A canonical screen that does not show a state the inventory lists: read the other appearance screens; if still absent, emit `> NEEDS INPUT` rather than inventing the state.
- A measured value matching no registry token: `MISSING-TOKENS:` entry carrying the proposed name, the measured value and the evidence - the spec still carries the proposed NAME, never the raw value. A name arriving at `foundation-analyst` through a `MISSING-TOKENS:` entry is adopted VERBATIM - the analyst measures the value and keeps the proposed name unchanged, because the spec already holds that name and a rename would leave a dangling reference that `checkTokenRefs` reports as `unknown-token` on an otherwise clean run.
- Two analysts proposing the same token name is caught by `build_registry.ts` collision detection, not by the agents.

### Contracts
`foundation-analyst` writes the Task 2 fragment shape. `spec-writer` final message: the spec path plus `MISSING-TOKENS:` block or `MISSING-TOKENS: none`.

`spec-writer` handles both inventory kinds and the entry line selects everything. A component entry (carrying `atomic|composite` at `·` index 1) produces `components/<slug>.md`; a pattern entry (carrying `composed of:` and no `atomic|composite`) produces `patterns/<slug>.md`. This is one responsibility - write one spec from one entry - with a kind-dependent section list, not two responsibilities, since both shapes share the canonical line, the backticked dotted token form, the anatomy-or-composition breakdown and the state treatment.

Component spec sections: Anatomy, per-part property-to-token lines, every state as token deltas, size-and-variant matrix, canonical line, optional bbox.
Pattern spec sections: Composition (the component slugs it composes, by slug, matching the entry's `composed of:` list), layout and arrangement of those parts with the tokens driving spacing and alignment, whole-pattern states (data, empty, loading, error) as token deltas, canonical line, optional bbox. A pattern carries no size-and-variant matrix and no `atomic|composite` kind - those axes do not exist at pattern level.

The spec file's machine-readable surface, shared by both kinds, which `build_meta.ts` and `validate_bundle.ts` both parse - pin it exactly:
- Every spec carries one line matching `canonical: <filename>.png` at the top of the file, one screen only, the filename exactly as it appears in `screens/`. `build_meta.ts` reads this line for the `canonical` field; `checkScreenRefs` resolves it against `screens/`.
- Every token name in a spec is written in backticks and in the dotted `<group>.<name>` form. A value not expressed as a backticked dotted token is either a `MISSING-TOKENS:` entry or a prose note, never a bare raw value. `checkTokenRefs` resolves exactly these against the registry.
- The optional bbox crop hint is a separate line matching `bbox: x,y,w,h` and is never parsed by any script.

Two surfaces here are script-parsed and must agree verbatim with Task 3: the SPEC surface (the `canonical: <filename>.png` line and the backticked dotted token form) and, in Task 5, the INVENTORY surface (the `·` field order and the exact-filename `canonical:` value). Task 6's DoD carries the single mandatory reconciliation of both.

### DoD
Both agent files exist with the stated frontmatter and body contracts, name both measurement scripts as dispatched absolute-path inputs and never via `${CLAUDE_PLUGIN_ROOT}`, contain no user-facing question, and comply with `.claude/rules/_skills.md` formatting.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - feat(superui): add judgment agents source-scout, component-scout and bundle-reviewer
- Covers: criteria #6

### Dependencies
- none - blocks: Task 6, Task 7

### Files
- add - `superui/agents/source-scout.md`
- add - `superui/agents/component-scout.md`
- add - `superui/agents/bundle-reviewer.md`

### Test Commands
*Build*
- none - markdown artifacts

*Tests*
- `grep -n '^tools:' superui/agents/source-scout.md superui/agents/component-scout.md superui/agents/bundle-reviewer.md` - expect no `Bash` on any of the three
- `grep -n 'AskUserQuestion\|ask the user' superui/agents/*.md` - expect no match
- Read all three against `.claude/rules/_skills.md`

### Approach
1. Write `source-scout.md` - `tools: Read, Write, Glob, Grep`, no Bash by construction so it cannot measure. Input: source dir, output path. Reads every image without skipping any. Output `source-map.md` with fixed sections: screen inventory (content, viewport class, theme per file), dark-mode coverage, per-foundation reading lists (colors always reads all screens), phenomena to measure as locations only, component and pattern hotspots, and ambiguities each phrased as a question the user can answer. Hard rule stated prominently: hints, not values - never a hex, px, weight or ratio, not even an approximation.
2. Write `component-scout.md` - `tools: Read, Write, Glob, Grep`. Input: source dir, source-map path, optional intake-answers path, output `inventory.md` path, and an optional re-dispatch pair (previous inventory path plus constraints to honor, regenerating the file in full). Scans every screen, classifies each block as component (atomic or composite) or pattern, dedupes ruthlessly to one entry per distinct block with all appearance screens listed and one canonical screen chosen as the clearest and most complete. Two variants of the same job become one entry plus a flagged inconsistency. Emits the three contract sections with the exact entry line formats, and the `## Inconsistencies` section phrased for a human reader.
3. Write `bundle-reviewer.md` - `tools: Read, Glob, Grep`, cheap model. Input: bundle dir, registry path. It writes no file; every finding comes back in its return message as `FINDING: <category> <detail>` lines plus a `CLEAN` line when none, which is why it carries no `Write` tool. Reviews only what a script cannot decide: accent discipline against the accent-usage inventory, correctness of component dedup, whether each state documents a form and not only a color, and whether the surface order reads as a coherent elevation ladder. Explicitly forbidden from re-measuring anything - the values arrived from deterministic scripts and a second measurement adds nothing.
4. All three carry the routing guard in `description:` only, never in the body, and take no instruction about which skill invokes them or why.

### Edge cases
- An unreadable or cropped image: `source-scout` records it as an ambiguity, never guesses its content.
- A block appearing once across the whole set: still inventoried, with the single screen as canonical.
- `bundle-reviewer` finding a value it believes wrong: it reports the reasoning as a finding, never a corrected number, since it has no measurement authority.

### Contracts
`source-map.md` six fixed sections. `inventory.md` carries exactly three headings in this order: `## Components`, `## Patterns`, `## Inconsistencies`. Only the first two hold parseable entry lines, one per line starting with `- `; `## Inconsistencies` is prose for a human and is never parsed. Entry lines: components `- <slug> - <Display name> · atomic|composite · canonical: <screen> · appears: <screens> · states visible: <list>`; patterns `- <slug> - <Display name> · canonical: <screen> · composed of: <slugs> · states visible: <list>`. Splitting a component line on `·` puts `atomic|composite` at index 1 and `canonical:` at index 2 - the field order `build_meta.ts` depends on. The `canonical:` value is the exact source filename including its extension (`canonical: dashboard.png`), never a display name and never extension-less: `checkScreenRefs` resolves it against `screens/` verbatim and the builder copies by it, so a bare `dashboard` would yield a spurious `missing-screen` finding and a failed copy. The `appears:` list uses the same exact-filename form. `bundle-reviewer` returns findings in its message, never a file; categories: `accent-sprawl`, `dedup`, `state-form`, `surface-order`.

### DoD
All three agent files exist with the stated frontmatter, none declares Bash, none contains a user-facing question, and all comply with `.claude/rules/_skills.md`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - feat(superui): add design-extractor-builder fork worker
- Covers: criteria #1, #2, #3, #4, #6

### Dependencies
- Task 2, Task 3, Task 4, Task 5 - blocks: Task 7

### Files
- add - `superui/skills/design-extractor-builder/SKILL.md`

### Test Commands
*Build*
- none - markdown artifact

*Tests*
- `grep -n 'AskUserQuestion' superui/skills/design-extractor-builder/SKILL.md` - expect no match
- `grep -n 'context: fork\|user-invocable: false' superui/skills/design-extractor-builder/SKILL.md` - expect both present
- `grep -n 'superui:foundation-analyst\|superui:spec-writer\|superui:bundle-reviewer' superui/skills/design-extractor-builder/SKILL.md` - expect at least one match for each of the three agent names
- Read against `.claude/rules/_skills.md`

### Approach
1. Frontmatter: `name: design-extractor-builder`, `description` carrying only the routing guard "Invoked only by the design-extractor skill, never directly.", `context: fork`, `model: sonnet`, `user-invocable: false`, `allowed-tools: Read, Write, Glob, Grep, Bash, Bash(sh:*), Bash(node:*), Bash(mkdir:*), Agent`. No `!` preload, so no `Bash(<path>:*)` pattern entry is required.

A forked skill dispatching agents is settled, not novel - do not re-open it. The direct in-repo precedent is `.temp/superui-legacy/skills/design-system-generator/SKILL.md`: its frontmatter (line 6) carries `context: fork` plus `user-invocable: false` plus `Agent` in `allowed-tools`, and its body dispatches agents from inside that fork - line 27 "Spawn the owning agent (Agent tool, `subagent_type: superui:<agent-name>`)" and line 28 "Fan-out steps run agents in parallel, batched (about 5 concurrent)". That is exactly this task's shape. Note that the fork spawns only agents, never another fork. If the implementer wants the harness nesting-depth limit confirmed before building, resolve it via `claude-code-guide` per `.claude/rules/_research.md` rather than by inspection - but the precedent above already establishes that the pattern works.
2. Body opens with the labeled-args input contract, one `label: value` per line: `run:`, `out:`, `source:`, `source-map:`, `inventory:`, optional `intake:`. Then a numbered step checklist with an explicit gate per step, written as input-to-output with no mention of who invoked it.
3. Steps: resolve the Node command via `check_node.sh` as an explicit early step, and resolve `${CLAUDE_PLUGIN_ROOT}` into absolute paths for `sample_colors.ts` and `measure_geometry.ts` - a SKILL.md body is where that variable is valid, and the agents receive the resolved absolute paths plus the Node command in every dispatch, together with the `intake:` path in every `foundation-analyst` dispatch when that label is present, so the workers resolving an ambiguity actually see the user's answer to it; fan out `superui:foundation-analyst` four times in parallel (colors, typography, dimensions, effects-motion) writing fragments into `<run>/notes/`; run `build_registry.ts`; run `render_design_md.ts` into `<out>/design.md`; copy `inventory.md` into `<out>`; copy `<run>/intake-answers.md` into `<out>/intake-answers.md` when the `intake:` label is present, and skip silently when it is not; fan out `superui:spec-writer` one per inventory entry, batched about five concurrent, waiting for each batch, passing each dispatch an output path under `<out>/components/` or `<out>/patterns/` according to the entry's kind; collect every `MISSING-TOKENS:` block and re-dispatch the affected analyst to measure and re-run `build_registry.ts` and `render_design_md.ts`; copy every canonical screen into `<out>/screens/` verbatim with its source filename, deduplicating when several entries share one canonical screen - every source is PNG by the head's intake gate, so no conversion is possible or needed; run `build_meta.ts`; run `validate_bundle.ts`; dispatch `superui:bundle-reviewer` once; run `pack_bundle.ts`.
4. State the ground rules: never do a worker's job inline; trust every script's self-verified result and never re-check it; one writer per file; re-dispatch on a failed gate means spawning the same agent again with its previous output path and the findings as added constraints, regenerating in full, capped at two rounds per gate after which the residue is carried out as `> NEEDS INPUT`. Scope re-dispatch to the two agents this skill owns: `foundation-analyst` for a token or value finding, `spec-writer` for a spec finding. `bundle-reviewer` findings are never a gate here - `dedup` and `accent-sprawl` originate in the inventory, which arrives as an input and whose author this skill cannot dispatch, so every reviewer finding is carried verbatim into the return message for the user to act on.
5. Close with the return contract: one message carrying the bundle dir, the zip path, component and pattern counts, every `FINDING:` line from validator and reviewer, and every collected `> NEEDS INPUT` item.

### Edge cases
- `NODE_MISSING` from the env check: stop before any `node` step and return that as the single failure line pointing at `/superui:setup`.
- `validate_bundle.ts` exiting 1: carry every finding into the return message and still pack the bundle, since a finding is information for the user rather than a reason to withhold the artifact - state this explicitly so the step is not read as a hard stop.
- An inventory with zero entries: return a failure line rather than packing an empty bundle.
- A canonical screen named in the inventory but absent from the source dir: carried as a `missing-screen` finding by the validator, not silently skipped at copy time.

### Contracts
Input: the labeled-args block above. Output: a single return message; artifacts at `<out>/` and `<out>/../handoff.zip`.

### DoD
The file exists with the stated frontmatter, contains every step and gate, carries no user-facing question and no caller narrative in the body, and names each of the three dispatched agents by `superui:` prefix.

Plus the single cross-branch reconciliation, mandatory here because Tasks 3, 4 and 5 are parallel branches that meet only at runtime and this repo has no runtime test, so a format mismatch would ship silently and void criterion #4: before claiming this DoD, re-read the Contracts blocks of Tasks 3, 4 and 5 together and confirm both script-parsed surfaces agree verbatim - the SPEC surface (`canonical: <filename>.png` line, backticked dotted token form) and the INVENTORY surface (`·` field order, exact-filename `canonical:` value).

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - feat(superui): add design-extractor head skill
- Covers: criteria #1, #6

### Dependencies
- Task 5, Task 6 - blocks: Task 8

### Files
- add - `superui/skills/design-extractor/SKILL.md`

### Test Commands
*Build*
- none - markdown artifact

*Tests*
- `grep -n 'disable-model-invocation: true\|user-invocable: true' superui/skills/design-extractor/SKILL.md` - expect both
- `grep -n 'measure_geometry\|sample_colors\|render_design_md\|build_registry\|build_meta\|validate_bundle\|pack_bundle' superui/skills/design-extractor/SKILL.md` - expect no match, since the head owns no measurement or artifact-generation script
- `grep -n 'design-extractor-builder' superui/skills/design-extractor/SKILL.md` - expect one Skill-tool handoff
- Read against `.claude/rules/_skills.md`

### Approach
1. Frontmatter: `name: design-extractor`, a `description` stating the purpose (turn a folder of UI screenshots into a Claude Design handoff bundle) - routing is user-only, so the description serves the slash command rather than model routing, `allowed-tools: Read, Write, Glob, Bash(sh:*), Bash(mkdir:*), Bash(rm:*), Skill, Agent, AskUserQuestion` - `rm` is needed solely to clear a previous run's `<out>` in step 1, `user-invocable: true`, `disable-model-invocation: true`, `argument-hint: <screenshots-dir>`.
2. Body is four user-facing steps plus a handoff, each with a gate. Step 1 intake: take the directory from the arguments or ask for it, confirm it exists and holds images, then create `<run>` and `<out>` FRESH - the run slug is the source dir basename and therefore deterministic, and re-running on a changed source is the documented path, so an existing `<out>` must be removed before any write rather than written into. Otherwise a spec, pattern or screen from a previous run survives for an entry the new inventory no longer contains, `build_meta.ts` picks it up from the files actually present, and the stale member ships in `meta.yml` and the zip; `validate_bundle.ts` cannot catch this, since a stale spec's tokens and canonical screen still resolve. Require PNG sources by file extension using Glob, and stop with the reason when the directory holds anything else - JPEG is rejected because its lossy compression corrupts exact pixel sampling and would silently undermine the measurement law, WebP and AVIF because the decoders do not read them. The gate is extension-based on purpose: the head runs no script, and interlacing is visible only in the IHDR byte, so an interlaced PNG passes intake and surfaces later as the decoder's exit-1 message carried out in the fork's return. This keeps the bundle's `screens/<file>.png` contract true by construction, so no conversion step is ever needed downstream. Step 2: dispatch `superui:source-scout` for the source map. Step 3: read only the ambiguities section of the source map, ask the user those questions in prose, write the answers to `<run>/intake-answers.md`. Step 4: dispatch `superui:component-scout` for the inventory, passing `<run>/intake-answers.md` when step 3 wrote one so the scout sees the user's clarifications, then list the inventory to the user (components, then patterns, then flagged inconsistencies) so they see it before specs are written.
3. Handoff step: invoke `design-extractor-builder` via the Skill tool with the labeled-args block, then relay its return verbatim without re-verifying it.
4. Final step: report the bundle path, the zip path, the counts, every finding and every `> NEEDS INPUT`, then give the explicit next action on the Claude Design side - hand the zip over, and state that the bundle is one-shot input material, that iterating in Claude Design supersedes it, and that a changed source means re-running this skill rather than patching the bundle.
5. State the ground rules: never do a worker's job inline, no measuring and no artifact authoring here; paths are `<run>` = `.temp/design-extractor/<run-slug>/` with the slug from the source dir basename, `<out>` = `<run>/handoff/`.

### Edge cases
- No directory in the arguments: ask for one before doing anything else.
- Source dir empty, or holding no PNG, or holding a JPEG, WebP or AVIF: stop at the step 1 gate naming the offending files and the reason, before any run state is created.
- Re-running on a source directory already extracted: `<out>` exists from the previous run. Remove it wholesale before any write; never merge into it and never patch it. Confirm the removal in the step-1 gate, since every later step assumes an empty output tree.
- An interlaced PNG passes the extension gate by design and fails inside the fork at first decode; the fork carries the decoder's exit-1 message verbatim into its return, and this step reports it to the user with the file named.
- Source map reporting no ambiguities: skip step 3 entirely and write no intake-answers file.
- User objecting to the inventory: re-dispatch `component-scout` with the objection as an added constraint before handing off, capped at two rounds.

### Contracts
Consumes a screenshots directory path. Produces `.temp/design-extractor/<run-slug>/handoff/` and `.temp/design-extractor/<run-slug>/handoff.zip`.

### DoD
The file exists with the stated frontmatter, owns only the four user-facing steps plus the handoff, contains no measurement instruction and authors no measured or generated artifact - transcribing the user's intake answers is its sole write, exempt by criterion #6 - and complies with `.claude/rules/_skills.md`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 8 - chore(superui): register new components and clear stale references
- Covers: criteria #7, #8

### Dependencies
- Task 7 - blocks: none

### Files
- modify - `superui/.claude-plugin/plugin.json` (`skills`, `agents`)
- modify - `superui/CLAUDE.md` (Skills, Agents, Layout, Scripts inventory, routing sentence)
- modify - `superui/README.md` (Skills table, mid-rewrite note)
- modify - `README.md` (Super UI table, mid-rewrite note, superui bullet, three CSO-routing claims at lines 3, 28 and 60-61)
- modify - `CLAUDE.md` (superui bullet, two repository-layout sentences, two CSO-routing sentences, agents self-documentation clause - five sites, each pinned by verbatim quote in Approach step 4)
- modify - `superui/skills/setup/SKILL.md` (lines 11-14, lines 36-39)
- modify - `superui/skills/pro-designer/SKILL.md` (line 4, lines 34-36)

### Test Commands
*Build*
- `node -e "const m=require('./superui/.claude-plugin/plugin.json'); if(m.skills.length!==4||m.agents.length!==5) throw new Error('counts'); const dup=m.skills.filter(s=>m.agents.some(a=>a.includes(s.split('/')[2]))); if(dup.length) throw new Error('worker in both'); console.log('plugin.json ok')"` - expect `plugin.json ok`

*Tests*
- `for p in $(node -e "const m=require('./superui/.claude-plugin/plugin.json'); console.log([...m.skills.map(s=>s+'SKILL.md'),...m.agents].join(' '))"); do test -f "superui/${p#./}" || echo "MISSING $p"; done` - expect no output
- `grep -rn 'design-system-extractor\|design-system-creator\|design-system-generator\|design-system-completer\|design-system-auditor\|design-system-guardian\|\.superui/design-system\|tokens\.css\|lint_previews\|build_sheets\|build_index\|doc-chrome\|DESIGN\.md' superui/ README.md CLAUDE.md` - expect no match
- `grep -rin 'mid-rewrite\|rewrite target\|superui ships no agents\|superui.s went to legacy' superui/ README.md CLAUDE.md` - expect no match (case-insensitive; the pattern deliberately avoids the bare phrase "ships no agents", which stays true of superdev at `CLAUDE.md:179`)
- `grep -n 'allowed-tools' superui/skills/pro-designer/SKILL.md` - expect a comma-separated list

### Approach
1. Add `./skills/design-extractor/` and `./skills/design-extractor-builder/` to `skills[]`, bringing it to four entries alongside the retained `pro-designer` and `setup`, and restore an `agents[]` key listing the five agent files from Tasks 4 and 5. Confirm no worker appears in both arrays.
2. In `superui/CLAUDE.md`: delete the "superui is mid-rewrite" banner (lines 9-14) and the "there is currently no `agents[]` - the plugin ships no agents" clause (lines 17-19), replace the rewrite-target section with the shipped pipeline, add the two new skills to the Skills section, add an Agents section covering the five workers, restore `agents/` to the Layout block, and add the six new scripts to the Scripts inventory. Five further sentences become false and no test catches them, so fix each explicitly: the Layout note "There is no `agents/`, `references/`, or `assets/` dir at present"; the Scripts-inventory sentence "the only relative imports are `sample_colors.ts` -> `vendor/`"; the vendor bullet "Both consumed only by `sample_colors.ts`", since `measure_geometry.ts` becomes a second vendor consumer; the routing sentence at lines 18-19 "It ships no hooks and no manifest - every skill routes purely via its CSO `description:`", which stops being true once `design-extractor` carries `disable-model-invocation: true` and `design-extractor-builder` carries `user-invocable: false` - only `pro-designer` stays model-routable, so reword to say the plugin still ships no hooks and no manifest while naming which skills route by CSO and which are user-only or internal; and the SAME claim a second time inside the "No hooks, no manifest" architecture invariant at line 79 ("Every skill is reached through its own CSO `description:`"), which sits outside the section this step replaces and would otherwise leave the file contradicting its own corrected header - give it the identical treatment.
3. In `superui/README.md` and root `README.md`: add `design-extractor` to the skills tables, mark `design-extractor-builder` internal, and replace the mid-rewrite note with a description of the handoff-bundle flow. In `superui/README.md` also rewrite the closing pointer "See `superui/CLAUDE.md` for the architecture and the rewrite target", since step 2 deletes the section it points at. In root `README.md` fix the same CSO-routing overstatement step 4 fixes in root `CLAUDE.md`, at three further sites no grep catches: line 3 "`superui` and `supergh` route their skills purely via CSO descriptions", line 28 "while `superui` / `supergh` / `superfix` route purely via skill descriptions", and lines 60-61 "No manifest, no hooks - skills route via their CSO `description:`". All three stop being true once only `pro-designer` is model-routable; reword so the CSO claim covers supergh fully and superui partially, keeping the no-hooks-no-manifest fact intact.
4. In root `CLAUDE.md`, five sites, each identified by its verbatim quote rather than a line number: the superui bullet, updated to the shipped state; the Repository-layout line "`superfix` carries `agents/` (superui's went to legacy with the rewrite - it ships no agents today)", so it names both plugins as carrying `agents/`; the Repository-layout sentence claiming superui "keeps its shared scripts, references and assets at the plugin root (`<plugin>/scripts/`, `<plugin>/references/`, `<plugin>/assets/`)", since superui now carries plugin-root `scripts/` plus the restored `agents/` and no `shared/`, `references/` or `assets/` dir at all; both routing sentences "superui and supergh route purely via CSO `description:`" and "superui and supergh stay model-routable via CSO `description:`", which stop being true once only `pro-designer` is model-routable - reword so the CSO claim covers supergh fully and superui partially; and the agents clause of the self-documentation invariant, now that superui carries agents again.
5. In `superui/skills/setup/SKILL.md`: rewrite the purpose sentence to name the actual script duties (color sampling, geometry measurement, registry and design.md rendering, bundle validation and packing, contrast checks) and rewrite the closing impact paragraph to name the surviving skills instead of the removed ones.
6. In `superui/skills/pro-designer/SKILL.md`: change line 4 to a comma-separated `allowed-tools`, and rewrite the design-system-precedence section to point at the handoff bundle produced by `design-extractor` rather than the removed `.superui/design-system/` location.

### Edge cases
- Marketplace manifest `.claude-plugin/marketplace.json` needs no change: the plugin name and subdir source are unchanged. Do not touch it.
- The grep assertion is scoped to `superui/`, `README.md` and `CLAUDE.md` on purpose. Three other trees legitimately keep the old names and are out of scope: `.temp/superui-legacy/` (the set-aside reference), `.docs/` (dev-time source notes, never shipped, including `.docs/superui/README.md` which cites `.superui/design-system/`), and `.superdev/.workflows/` (archived run records, which are history and must not be rewritten).
- `pro-designer`'s bundled `references/*.md` may mention a design system generically; only the SKILL.md precedence section names the removed path and needs the edit.

### Contracts
`plugin.json` `skills[]` holds four entries (`pro-designer`, `setup`, `design-extractor`, `design-extractor-builder`), `agents[]` holds five, no overlap.

### DoD
Every test command passes; the four documentation files describe the shipped four-skill five-agent state; no file under `superui/`, and neither root `README.md` nor root `CLAUDE.md`, references a removed artifact or path. `.temp/`, `.docs/` and `.superdev/` are out of scope by design.

<!-- /TASK -->
