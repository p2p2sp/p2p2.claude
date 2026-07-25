
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


### Covered criteria
3. `superui/scripts/build_foundation_data.py` emits `foundations/<name>.data.js` from `dtcg.yml` + `DESIGN.md` using the generator's existing group mapping (color · typography · spacing-radius · effects); re-running after a token value edit changes the emitted readout with no LLM step; self-verifies and prints a one-line summary.
