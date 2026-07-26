# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "superui previews as a connected runtime component system"

---
<!-- HEADER -->

## Goal
superui's generated doc site stops duplicating body markup per HTML file. Every sheet becomes a thin, script-generated shell; all rendering happens at runtime through one shared vanilla-Web-Components asset (`components.js`); sheet content lives in per-sheet `*.data.js` files. Changing a component definition in `components.js`, or a component demo snippet in its `.data.js`, changes every sheet that uses it on reload - no regeneration. Foundation sheet data is derived from `dtcg.yml` by script, so a token value change never involves an LLM. The LLM (`html-visualizer`) writes only `components/<slug>.data.js` / `patterns/<slug>.data.js` and never touches HTML.

## Context
Today `html-visualizer` (haiku agent) authors the full body markup of every foundation/component/pattern sheet inline, so structural changes require regenerating N files via LLM, and patterns copy component markup instead of reusing it. Token values and chrome styling are already single-source (`tokens.css`, `docs.css`); this plan extends single-source to markup. Interview decisions (user-approved): vanilla Web Components, zero dependencies, zero build, `file://`-compatible (data via `<script src>`, never `fetch()`); HTML shells written only by a deterministic script; foundations data scripted from `dtcg.yml`; single-writer-per-file, whole-page dark canon, and provenance canon preserved. No downstream consumer reads preview HTML, so the format is free to change. No migration of existing host outputs (re-runs regenerate wholesale).

## Acceptance criteria
1. `superui/assets/doc-chrome/components.js` exists: vanilla custom elements (no external deps, no Shadow DOM - light DOM styled by `docs.css`/`tokens.css`), rendering sheets from `window.SUPERUI_DATA` on `DOMContentLoaded`; it is the SINGLE source of the dark-toggle behavior (applies persisted `superui-docs-theme` and injects the `.dark-toggle` button only when `<body data-dark-toggle>` is present); `superui/assets/doc-chrome/sheet.template.html` is deleted; no other file in `superui/` carries the toggle script block.
2. `superui/references/preview-data-format.md` documents the `*.data.js` schema (registry key `"<kind>:<slug>"`, `title`/`subtitle`/`provenance`, `demo.variants[v].states[s].markup`, typed `sections[]`) and is the contract shared by `components.js`, `html-visualizer`, and the two new scripts.
3. `superui/scripts/build_foundation_data.py` emits `foundations/<name>.data.js` from `dtcg.yml` + `DESIGN.md` using the generator's existing group mapping (color · typography · spacing-radius · effects); re-running after a token value edit changes the emitted readout with no LLM step; self-verifies and prints a one-line summary.
4. `superui/scripts/build_sheets.py` emits exactly one shell `.html` per existing `*.data.js` (foundations/components/patterns); a shell contains only head links, the `components.js` script tag, `<ds-sheet>`, and data `<script src>` tags (pattern shells additionally load every `components/*.data.js`); `data-dark-toggle` appears on `<body>` only when `tokens.css` has a non-empty `.dark` block; the script self-verifies every referenced file exists.
5. `superui/scripts/lint_previews.py` scans `*.data.js` in addition to `*.html`: a planted raw hex/px in a fixture data file exits 1; the clean fixture exits 0.
6. `superui/scripts/build_index.py` takes link labels from a data file's `"title"` (fallback: the shell's `<title>`), emits the `components.js` script tag + `data-dark-toggle` instead of the inline `DARK_TOGGLE` constant (constant deleted), and keeps its dangling-link self-verification.
7. `superui/agents/html-visualizer.md` outputs exactly one `<slug>.data.js` per dispatch conforming to `preview-data-format.md`; pattern data references component demos via `<ds-demo name="...">` and never inlines another component's markup; no HTML-authoring instruction remains; provenance/`> NEEDS INPUT`/`> SYNTHESIZED:` become data fields.
8. `design-system-generator/SKILL.md` steps 7–9 orchestrate: copy `docs.css` + `components.js` → `build_foundation_data.py` → `html-visualizer` fan-out (components/patterns only, data outputs) → `build_sheets.py` → `build_index.py` + `lint_previews.py`; `design-system-completer/SKILL.md` step 7 mirrors the same tail; `design-system-extractor/SKILL.md` output tree and script list match.
9. `superui/CLAUDE.md` is consistent with the above (layout, dark-mode canon single-source note replacing the "two places" note, provenance canon wording, scripted-artifacts invariant, scripts inventory, html-visualizer description).
10. End-to-end on a `.temp` fixture: `build_foundation_data.py` → `build_sheets.py` → `build_index.py` → `lint_previews.py` all exit 0 and the index links resolve.

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(superui): add doc-chrome components.js runtime and preview data format
- Covers: criteria #1, #2

### Dependencies
- none

### Files
- add - superui/assets/doc-chrome/components.js (custom elements + dark-toggle init)
- add - superui/references/preview-data-format.md (data.js schema contract)
- delete - superui/assets/doc-chrome/sheet.template.html

### Test Commands
*Build*
- `node --check superui/assets/doc-chrome/components.js 2>/dev/null || echo "node absent - skipped"` - expect exit 0 (or the skip line)

*Tests*
- `grep -c "customElements.define" superui/assets/doc-chrome/components.js` - expect >= 3
- `grep -c "attachShadow" superui/assets/doc-chrome/components.js` - expect 0
- `grep -rl "superui-docs-theme" superui/assets/` - expect exactly `superui/assets/doc-chrome/components.js`
- `test ! -f superui/assets/doc-chrome/sheet.template.html && echo DELETED` - expect `DELETED`

### Approach
1. Write `superui/references/preview-data-format.md`: registry line `window.SUPERUI_DATA = window.SUPERUI_DATA || {};` then one assignment `window.SUPERUI_DATA["<kind>:<slug>"] = {...}` per file, `<kind>` in `foundation|component|pattern`. Object shape: `title`, `subtitle`, optional `provenance: "designed"`, optional `demo: { defaultVariant, defaultState, variants: { <v>: { states: { <s>: { markup } } } } }` (components only; `markup` is an HTML string whose every style value is `var(--token)`), and `sections: []` with typed entries: `token-grid` (items: `name`, `varName`, `value`, `usage`, `render: color|type|spacing|radius|shadow|opacity|motion|none`), `prose` (`html`), `state-matrix` (`variants`, `states` - rendered from `demo`), `anatomy` (`items`), `props-table` (`columns`, `rows`), `dos-donts` (`dos`, `donts`), `composition` (`markup`, may contain `<ds-demo name variant state>` tags - patterns only), `needs-input` (`text`, also used for `> SYNTHESIZED:` with a `synthesized: true` flag). State the color rule: a color is always given as a token `varName`, never a literal; the runtime renders the swatch.
2. Write `components.js`: header comment carries the chrome-class inventory (moved verbatim from `sheet.template.html`'s comment) and the schema pointer. Top-level immediate code: if `document.body.dataset.darkToggle !== undefined` (script tag sits at body top, blocking, so body exists) apply persisted `localStorage["superui-docs-theme"] === "dark"` by adding `.dark` to `document.documentElement` (pre-paint, no flash) and inject the `<button class="dark-toggle" aria-label="Toggle dark mode">` with the existing toggle+persist behavior.
3. Define light-DOM custom elements rendering ONLY with chrome classes already in `docs.css`: `<ds-sheet key>` (renders `.sheet-header` h1/subtitle, the provenance note when present, then walks `sections[]` dispatching per type - token cards with `.swatch`/`.type-row`/spacing bars per `render` kind, `.frame` state matrix built from `demo`, `.props-table`, `.dos-donts`, `.anatomy-notes`, `.needs-input`) and `<ds-demo name variant state>` (injects the referenced component's `demo` markup from the registry). All elements defer rendering to `DOMContentLoaded` so data `<script src>` order never matters.
4. Runtime swatch rule: wherever a section item names a color token, render `.swatch`/`.swatch-inline`/`.swatch-strip` painted `style="background: var(--name)"` - this moves html-visualizer's "color shown, never text alone" duty into the runtime.

### Edge cases
- Registry key missing at render time -> the element renders a `.needs-input` note ("data missing: <key>"), never throws.
- `<ds-demo>` naming an unknown component/variant/state -> `.needs-input` chip in place.
- Unknown `sections[].type` -> skipped with `console.warn`.
- No `data-dark-toggle` on body -> no theme read, no button injected (light-only system).

### Contracts
- `window.SUPERUI_DATA["<kind>:<slug>"]` object shape as documented in `preview-data-format.md` (consumed by Tasks 2, 3, 4, 5).
- `components.js` uses only chrome classes defined in `docs.css`; adding a chrome class = coordinated edit of both fixed assets.

### DoD
components.js + reference exist, template deleted, all grep checks pass; a hand-written fixture shell + data file under `.temp/preview-refactor/` renders headers, token cards, matrix, and demo reuse when opened in a browser (structural greps stand in for the visual check in CI-less repo).

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - feat(superui): script foundation sheet data from dtcg.yml
- Covers: criterion #3

### Dependencies
- Task 1 - blocks: data schema must exist before a script emits it

### Files
- add - superui/scripts/build_foundation_data.py (main; group mapping; md_block helper)

### Test Commands
*Build*
- `python3 -m py_compile superui/scripts/build_foundation_data.py` - expect exit 0, silent

*Tests*
- `python3 superui/scripts/build_foundation_data.py .temp/preview-refactor/fixture` - expect summary line naming emitted foundations, exit 0
- `grep -q 'SUPERUI_DATA\["foundation:color"\]' .temp/preview-refactor/fixture/foundations/color.data.js && echo OK` - expect `OK`
- edit fixture token value, re-run, `grep <new-value> .temp/preview-refactor/fixture/foundations/color.data.js` - expect hit

### Approach
1. Create the shared fixture `.temp/preview-refactor/fixture/`: minimal `dtcg.yml` (a `color` group with one `$extensions.org.superui.dark` override, a `spacing` group), `DESIGN.md` with `## Color` prose, `tokens.css` generated via `python3 superui/scripts/tokens_to_css.py <fixture>/dtcg.yml <fixture>/tokens.css` (real `.dark` block), `tokens.json` via `python3 superui/scripts/tokens_to_json.py <fixture>/dtcg.yml <fixture>/tokens.json`, a stub `inventory.md`, copies of `superui/assets/doc-chrome/docs.css` and (Task 1's) `components.js` at the fixture root, and empty `components/` + `patterns/` dirs. The extra root files matter: `build_sheets.py` self-verifies the shells' `../docs.css`/`../tokens.css`/`../components.js` references, and `build_index.py` requires `docs.css` (+ `components.js` after Task 4) and self-verifies its `DESIGN.md`/`dtcg.yml`/`tokens.json`/`tokens.css`/`inventory.md` file links - without them the Task 3/4/7 fixture runs exit 1. Later tasks add hand-written data files here.
2. Header docstring with the I/O contract (repo script convention): IN `argv[1]` = design-system dir (needs `dtcg.yml`, `DESIGN.md`); OUT `foundations/<name>.data.js` per emitted foundation; stdout one summary line; exit 1 on missing inputs or unresolvable alias.
3. Reuse the generator step-8 mapping verbatim: `color` (groups: color) · `typography` (font, dimension, typography) · `spacing-radius` (spacing, radius, size, border, border-width) · `effects` (shadow, opacity, motion, zindex); emit a file when ANY mapped group exists in `dtcg.yml`.
4. Per token: `name` (dtcg path), `varName` (`--` + dots-to-hyphens), `value` (resolved readout incl. dark override note when `$extensions.org.superui.dark` present), `usage` (from `$description` when present), `render` kind derived from `$type`. Parse YAML with PyYAML (already a declared module dependency of the plugin - see `setup`); resolve aliases the way `validate_tokens.py` does.
5. Section prose: pull the matching `DESIGN.md` `## ` sections per foundation (same minimal md->html helpers as `build_index.py` - duplicated locally, standalone-script convention) into a leading `prose` section.
6. Self-verify: re-read each written file, assert the registry key and balanced JS literal (json.dumps-generated payload embedded in the assignment), then print the summary.

### Edge cases
- Fixture/host without `DESIGN.md` section for a foundation -> omit the prose section, still emit tokens.
- Empty mapped groups -> that foundation file is not emitted and a stale `foundations/<name>.data.js` from a previous run is deleted.
- Alias chains resolve recursively; a dangling alias exits 1 naming the token.

### Contracts
- Emits the Task 1 schema; payload built via `json.dumps` so the file is valid JS by construction.

### DoD
Script compiles; fixture run emits color/typography data with correct varNames and readouts; value-edit re-run reflects the new value; exit codes as documented.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(superui): script preview shells from data files
- Covers: criterion #4

### Dependencies
- Task 1 - blocks: shell must reference components.js contract
- Task 2 - blocks: fixture data files to build shells for

### Files
- add - superui/scripts/build_sheets.py (main; has_dark_overrides copy; title extraction)

### Test Commands
*Build*
- `python3 -m py_compile superui/scripts/build_sheets.py` - expect exit 0, silent

*Tests*
- `python3 superui/scripts/build_sheets.py .temp/preview-refactor/fixture` - expect "N shells -> <dir>" summary, exit 0
- `grep -c "ds-sheet" .temp/preview-refactor/fixture/foundations/color.html` - expect 1
- `grep -q "components/button.data.js" .temp/preview-refactor/fixture/patterns/login.html && echo OK` - expect `OK` (pattern loads all component data)
- `grep -c "data-dark-toggle" .temp/preview-refactor/fixture/foundations/color.html` - expect 1 when fixture tokens.css has a `.dark` block, else 0

### Approach
1. Header docstring contract: IN `argv[1]` = design-system dir; scans `foundations|components|patterns/*.data.js`; OUT one `<same-dir>/<slug>.html` per data file, wholesale-regenerated; stdout summary; exit 1 on bad args or a shell referencing a missing file.
2. Shell format (fixed, embedded in the script - replaces the deleted template): doctype, `<head>` with `<title>` = the data file's `"title"` (regex extract, fallback slug), links `../docs.css` + `../tokens.css`, then `<body[ data-dark-toggle]>`, blocking `<script src="../components.js"></script>` at body top, `<ds-sheet key="<kind>:<slug>"></ds-sheet>`, `<script src="<slug>.data.js"></script>`; pattern shells append one `<script src="../components/<f>">` per existing `components/*.data.js` (so `<ds-demo>` always resolves).
3. `data-dark-toggle` on `<body>` iff `tokens.css` `.dark` block declares a custom property (reuse `build_index.py`'s `has_dark_overrides` logic, duplicated locally per standalone-script convention).
4. Self-verify: every `src`/`href` emitted resolves to an existing file; dangling -> stderr + exit 1.

### Edge cases
- Zero data files -> zero shells, summary says so, exit 0 (empty-inventory systems still get foundation shells from Task 2's output).
- A stale `.html` whose `.data.js` no longer exists is deleted (wholesale regeneration).
- `index.html` is never touched (owned by `build_index.py`).

### Contracts
- Shell layout above is the fixed chrome format; `components.js` (Task 1) assumes body-top blocking load + `data-dark-toggle` attr.

### DoD
Script compiles; fixture (foundation + component + pattern data files incl. a hand-written `components/button.data.js` and `patterns/login.data.js`) yields shells passing all greps; self-verification catches a deliberately dangling reference (exit 1).

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - feat(superui): extend preview lint to data files and rework index toggle
- Covers: criteria #5, #6

### Dependencies
- Task 3 - blocks: fixture shells/data to lint and index

### Files
- modify - superui/scripts/lint_previews.py (file collection + docstring)
- modify - superui/scripts/build_index.py (DARK_TOGGLE removal; title source; components.js tag)

### Test Commands
*Build*
- `python3 -m py_compile superui/scripts/lint_previews.py superui/scripts/build_index.py` - expect exit 0, silent

*Tests*
- `python3 superui/scripts/lint_previews.py .temp/preview-refactor/fixture` - expect clean summary, exit 0
- plant `style=\"color: #ff0000\"` in a fixture data.js markup string, re-run lint - expect `VIOLATION` line naming the data file, exit 1 (then revert)
- `python3 superui/scripts/build_index.py .temp/preview-refactor/fixture` - expect summary line, exit 0
- `grep -c "DARK_TOGGLE" superui/scripts/build_index.py` - expect 0
- `grep -q "components.js" .temp/preview-refactor/fixture/index.html && echo OK` - expect `OK`

### Approach
1. `lint_previews.py`: collect `*.data.js` alongside `*.html` in the walk; for data files run the `STYLE_BLOCK`/`STYLE_ATTR`+value regexes over the raw text - BUT markup lives inside JS string literals, where a double-quoted attr arrives backslash-escaped (`style=\"color: ...\"`), which the current `STYLE_ATTR` (`style\s*=\s*("([^"]*)"|'([^']*)')`) does NOT match (the backslash sits between `=` and the quote). Extend the attr pattern (or add a data-file variant) to tolerate an optional backslash before the opening and closing quote - e.g. `style\s*=\s*\\?"((?:[^"\\]|\\.)*?)\\?"|style\s*=\s*'([^']*)'` - so plain, single-quoted, and JS-escaped forms are all caught; update the docstring contract (scans sheets AND data files; `components.js`/`docs.css` NOT scanned - fixed chrome).
2. `build_index.py`: delete the `DARK_TOGGLE` constant; emit `<script src="components.js"></script>` at body top and `data-dark-toggle` on `<body>` under the same `has_dark_overrides` condition (components.js is the single toggle source); add `components.js` to the required-files check and to link-target self-verification.
3. `sheet_title(path)`: try sibling `<slug>.data.js` `"title"` first, fallback to the existing `<h1>`/`<title>` scrape (shells still carry `<title>`), fallback basename.

### Edge cases
- Escaped quotes inside JS markup strings: the unmodified `STYLE_ATTR` would silently miss `style=\"...\"` (escaped-quote form) - the extended pattern from step 1 covers it; regexes still run on raw text, never parsed JS. The planted-violation test MUST plant in the escaped form to prove this path.
- A data file with no style attribute at all -> zero chunks, clean.
- Light-only system: no `data-dark-toggle` on index body, `components.js` still linked (it renders sections, not just the toggle).

### Contracts
- Lint exit semantics unchanged (0 clean / 1 violations) - generator and completer gates keep working verbatim.

### DoD
Both scripts compile; planted-violation test exits 1 naming the data file; clean run exits 0; regenerated fixture index has components.js, no inline toggle block, links verified.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - feat(superui): html-visualizer emits sheet data instead of HTML
- Covers: criterion #7

### Dependencies
- Task 1 - blocks: schema reference the agent must follow

### Files
- modify - superui/agents/html-visualizer.md (full body rewrite; frontmatter description)

### Test Commands
*Build*
- none (markdown is shipping)

*Tests*
- `grep -c "data.js" superui/agents/html-visualizer.md` - expect >= 3
- `grep -ci "sheet.template" superui/agents/html-visualizer.md` - expect 0
- `grep -q "ds-demo" superui/agents/html-visualizer.md && echo OK` - expect `OK`

### Approach
1. Rewrite as input->work->output (keep the agent name - no plugin.json/agents[] churn): inputs = sheet kind (`component`|`pattern`) + spec path, the `preview-data-format.md` reference path, output `.data.js` path, optionally previous output + findings on re-dispatch. Foundation sheets are no longer this agent's job (scripted).
2. Work: transcribe the spec 1:1 into the schema's `sections[]`; author `demo.variants[v].states[s].markup` once per variant/state with every style value `var(--token-name)`; pattern data composes via `<ds-demo name variant state>` inside `composition.markup` and NEVER inlines another component's markup; colors referenced by token varName only (the runtime shows swatches); `**Provenance:** designed, not extracted` -> `provenance: "designed"`; `> NEEDS INPUT` / `> SYNTHESIZED:` -> `needs-input` sections (synthesized flagged).
3. Self-check before returning: registry key matches `<kind>:<slug>`; no `#hex`/`rgb(`/`hsl(`/non-zero `px` inside any markup string; single registry assignment; end with output path + `self-check: clean`.
4. Keep hard rules: never read screenshots; never edit spec/dtcg.yml/tokens.css/docs.css/components.js or any file other than the one data file; gaps render as needs-input entries, never invented.

### Edge cases
- Spec documents a state the demo markup can't express with tokens alone -> needs-input entry, not a raw value.
- Re-dispatch with lint findings -> regenerate the whole data file honoring them.

### Contracts
- Output = exactly one `.data.js` conforming to `preview-data-format.md` (Task 1).

### DoD
Rewritten agent doc passes the greps, contains the schema reference input, the ds-demo composition rule, and no HTML-authoring instructions.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - feat(superui): orchestrate data-then-shells pipeline in generator, completer, extractor
- Covers: criterion #8

### Dependencies
- Task 2 - blocks: step names the new script
- Task 3 - blocks: step names the new script
- Task 4 - blocks: lint/index semantics referenced
- Task 5 - blocks: fan-out dispatch payload

### Files
- modify - superui/skills/design-system-generator/SKILL.md (steps 7–9, ground rules, intro line)
- modify - superui/skills/design-system-completer/SKILL.md (step 7)
- modify - superui/skills/design-system-extractor/SKILL.md (output tree lines, script list line)

### Test Commands
*Build*
- none (markdown is shipping)

*Tests*
- `grep -q "build_foundation_data.py" superui/skills/design-system-generator/SKILL.md && grep -q "build_sheets.py" superui/skills/design-system-generator/SKILL.md && echo OK` - expect `OK`
- `grep -c "sheet.template" superui/skills/design-system-generator/SKILL.md superui/skills/design-system-completer/SKILL.md | grep -v ":0" | wc -l` - expect 0
- `grep -q "components.js" superui/skills/design-system-extractor/SKILL.md && echo OK` - expect `OK`

### Approach
1. Generator step 7: `cp` `docs.css` AND `components.js` into `<out>`. New step 7b: run `build_foundation_data.py <out>` (replaces foundation sheets in the LLM fan-out). Step 8: spawn `html-visualizer` once per component/pattern spec only, dispatch = sheet kind + spec path + `${CLAUDE_PLUGIN_ROOT}/references/preview-data-format.md` + output `<out>/components|patterns/<slug>.data.js` (no template path, no hrefs, no dark flag - dark is the shell's concern); GATE unchanged (one data file per spec). New step 8b: run `build_sheets.py <out>`. Step 9 unchanged commands; re-dispatch convention now names the offending DATA file's producer (a foundation-data violation is a script bug -> surface as `> NEEDS INPUT`, never re-dispatch an LLM at it). Update the intro artifact list (`*.data.js`, `components.js`, shells).
2. Completer step 7: first re-copy `docs.css` + `components.js` into `<out>` (idempotent `cp`); spawn `html-visualizer` per new-or-changed spec with the new dispatch payload; then run `build_foundation_data.py` (merged tokens change readouts), `build_sheets.py`, `build_index.py`, `lint_previews.py` - same gate.
3. Extractor SKILL.md: output-layout block gains `components.js`, `foundations|components|patterns/<slug>.data.js`; the mechanical-scripts list line gains the two new scripts.

### Edge cases
- Empty inventory: step 5 skipped as today; 7b/8b still run (foundation data + shells + index).
- `PYTHON_MISSING` gate already precedes every new script step - no new env handling.
- Pre-refactor `<out>` (specs exist, no `*.data.js`): the completer's `build_sheets.py` pass deletes legacy inline-markup sheets whose data files don't exist - accepted consequence of the no-migration decision; the completer's step-9 presentation notes that a full re-extraction restores the doc site in the new format.

### Contracts
- Generator dispatch payload to `html-visualizer` (consumed as Task 5 inputs); step order data -> shells -> index -> lint.

### DoD
All three skill docs updated and grep checks pass; no reference to the deleted template anywhere under `superui/skills/`.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - docs(superui): sync CLAUDE.md canons and verify the pipeline end-to-end
- Covers: criteria #9, #10

### Dependencies
- Task 6 - blocks: documents the final orchestration

### Files
- modify - superui/CLAUDE.md (layout, skills/agents inventory, dark-mode canon, provenance canon, scripted-artifacts invariant, scripts inventory)

### Test Commands
*Build*
- none

*Tests*
- `grep -rn "sheet.template" superui/ | wc -l` - expect 0
- `grep -q "build_foundation_data.py" superui/CLAUDE.md && grep -q "build_sheets.py" superui/CLAUDE.md && echo OK` - expect `OK`
- end-to-end fixture chain: `python3 superui/scripts/build_foundation_data.py F && python3 superui/scripts/build_sheets.py F && python3 superui/scripts/build_index.py F && python3 superui/scripts/lint_previews.py F` (F=.temp/preview-refactor/fixture) - expect all exit 0

### Approach
1. Update `superui/CLAUDE.md`: assets layout (`doc-chrome/` = `docs.css` + `components.js`, template removed); dark-mode canon - the toggle block lives ONCE in `components.js`, gated by `data-dark-toggle` (delete the "lives in two places" sentence); provenance canon - `html-visualizer` emits provenance/synthesized data fields, `components.js` renders them (marker vocabulary unchanged); scripted-artifacts invariant - shells, foundation data, `tokens.css/json`, `index.html`, DESIGN.md skeleton regenerated wholesale, `*.data.js` under components/patterns are producer (LLM) artifacts; html-visualizer agent description (data writer, components/patterns only); scripts inventory + generator/completer skill descriptions updated to the new step chain.
2. Run the full fixture chain (test command above) as the end-to-end gate; fix any doc/script mismatch it exposes.
3. Sweep: `grep -rn "sheet.template" superui/` must return nothing.

### Edge cases
- Root `CLAUDE.md` and root `README.md` mention no doc-chrome internals (verified by grep) - no edits there; if the sweep finds one, update it in this task.

### Contracts
- none

### DoD
CLAUDE.md consistent with shipped behavior; template references gone repo-wide (`.superdev/.workflows/` and `.docs/` historical archives excluded); end-to-end fixture chain green.

<!-- /TASK -->
