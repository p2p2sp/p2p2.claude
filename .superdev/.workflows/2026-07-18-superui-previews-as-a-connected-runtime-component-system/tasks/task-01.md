
## Task 1 — feat(superui): add doc-chrome components.js runtime and preview data format
- Covers: criteria #1, #2

### Dependencies
- none

### Files
- add - superui/assets/doc-chrome/components.js (custom elements + dark-toggle init)
- add - superui/references/preview-data-format.md (data.js schema contract)
- delete - superui/assets/doc-chrome/sheet.template.html

### Test Commands
*Build*
- `node --check superui/assets/doc-chrome/components.js 2>/dev/null || echo "node absent - skipped"` — expect exit 0 (or the skip line)

*Tests*
- `grep -c "customElements.define" superui/assets/doc-chrome/components.js` — expect >= 3
- `grep -c "attachShadow" superui/assets/doc-chrome/components.js` — expect 0
- `grep -rl "superui-docs-theme" superui/assets/` — expect exactly `superui/assets/doc-chrome/components.js`
- `test ! -f superui/assets/doc-chrome/sheet.template.html && echo DELETED` — expect `DELETED`

### Approach
1. Write `superui/references/preview-data-format.md`: registry line `window.SUPERUI_DATA = window.SUPERUI_DATA || {};` then one assignment `window.SUPERUI_DATA["<kind>:<slug>"] = {...}` per file, `<kind>` in `foundation|component|pattern`. Object shape: `title`, `subtitle`, optional `provenance: "designed"`, optional `demo: { defaultVariant, defaultState, variants: { <v>: { states: { <s>: { markup } } } } }` (components only; `markup` is an HTML string whose every style value is `var(--token)`), and `sections: []` with typed entries: `token-grid` (items: `name`, `varName`, `value`, `usage`, `render: color|type|spacing|radius|shadow|opacity|motion|none`), `prose` (`html`), `state-matrix` (`variants`, `states` — rendered from `demo`), `anatomy` (`items`), `props-table` (`columns`, `rows`), `dos-donts` (`dos`, `donts`), `composition` (`markup`, may contain `<ds-demo name variant state>` tags — patterns only), `needs-input` (`text`, also used for `> SYNTHESIZED:` with a `synthesized: true` flag). State the color rule: a color is always given as a token `varName`, never a literal; the runtime renders the swatch.
2. Write `components.js`: header comment carries the chrome-class inventory (moved verbatim from `sheet.template.html`'s comment) and the schema pointer. Top-level immediate code: if `document.body.dataset.darkToggle !== undefined` (script tag sits at body top, blocking, so body exists) apply persisted `localStorage["superui-docs-theme"] === "dark"` by adding `.dark` to `document.documentElement` (pre-paint, no flash) and inject the `<button class="dark-toggle" aria-label="Toggle dark mode">` with the existing toggle+persist behavior.
3. Define light-DOM custom elements rendering ONLY with chrome classes already in `docs.css`: `<ds-sheet key>` (renders `.sheet-header` h1/subtitle, the provenance note when present, then walks `sections[]` dispatching per type — token cards with `.swatch`/`.type-row`/spacing bars per `render` kind, `.frame` state matrix built from `demo`, `.props-table`, `.dos-donts`, `.anatomy-notes`, `.needs-input`) and `<ds-demo name variant state>` (injects the referenced component's `demo` markup from the registry). All elements defer rendering to `DOMContentLoaded` so data `<script src>` order never matters.
4. Runtime swatch rule: wherever a section item names a color token, render `.swatch`/`.swatch-inline`/`.swatch-strip` painted `style="background: var(--name)"` — this moves html-visualizer's "color shown, never text alone" duty into the runtime.

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


### Covered criteria
1. `superui/assets/doc-chrome/components.js` exists: vanilla custom elements (no external deps, no Shadow DOM — light DOM styled by `docs.css`/`tokens.css`), rendering sheets from `window.SUPERUI_DATA` on `DOMContentLoaded`; it is the SINGLE source of the dark-toggle behavior (applies persisted `superui-docs-theme` and injects the `.dark-toggle` button only when `<body data-dark-toggle>` is present); `superui/assets/doc-chrome/sheet.template.html` is deleted; no other file in `superui/` carries the toggle script block.
2. `superui/references/preview-data-format.md` documents the `*.data.js` schema (registry key `"<kind>:<slug>"`, `title`/`subtitle`/`provenance`, `demo.variants[v].states[s].markup`, typed `sections[]`) and is the contract shared by `components.js`, `html-visualizer`, and the two new scripts.
