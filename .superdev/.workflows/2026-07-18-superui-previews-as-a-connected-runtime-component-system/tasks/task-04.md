
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


### Covered criteria
5. `superui/scripts/lint_previews.py` scans `*.data.js` in addition to `*.html`: a planted raw hex/px in a fixture data file exits 1; the clean fixture exits 0.
6. `superui/scripts/build_index.py` takes link labels from a data file's `"title"` (fallback: the shell's `<title>`), emits the `components.js` script tag + `data-dark-toggle` instead of the inline `DARK_TOGGLE` constant (constant deleted), and keeps its dangling-link self-verification.
