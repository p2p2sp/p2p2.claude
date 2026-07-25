
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


### Covered criteria
4. `superui/scripts/build_sheets.py` emits exactly one shell `.html` per existing `*.data.js` (foundations/components/patterns); a shell contains only head links, the `components.js` script tag, `<ds-sheet>`, and data `<script src>` tags (pattern shells additionally load every `components/*.data.js`); `data-dark-toggle` appears on `<body>` only when `tokens.css` has a non-empty `.dark` block; the script self-verifies every referenced file exists.
