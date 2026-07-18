
## Task 6 — feat(superui): orchestrate data-then-shells pipeline in generator, completer, extractor
- Covers: criterion #8

### Dependencies
- Task 2 — blocks: step names the new script
- Task 3 — blocks: step names the new script
- Task 4 — blocks: lint/index semantics referenced
- Task 5 — blocks: fan-out dispatch payload

### Files
- modify - superui/skills/design-system-generator/SKILL.md (steps 7–9, ground rules, intro line)
- modify - superui/skills/design-system-completer/SKILL.md (step 7)
- modify - superui/skills/design-system-extractor/SKILL.md (output tree lines, script list line)

### Test Commands
*Build*
- none (markdown is shipping)

*Tests*
- `grep -q "build_foundation_data.py" superui/skills/design-system-generator/SKILL.md && grep -q "build_sheets.py" superui/skills/design-system-generator/SKILL.md && echo OK` — expect `OK`
- `grep -c "sheet.template" superui/skills/design-system-generator/SKILL.md superui/skills/design-system-completer/SKILL.md | grep -v ":0" | wc -l` — expect 0
- `grep -q "components.js" superui/skills/design-system-extractor/SKILL.md && echo OK` — expect `OK`

### Approach
1. Generator step 7: `cp` `docs.css` AND `components.js` into `<out>`. New step 7b: run `build_foundation_data.py <out>` (replaces foundation sheets in the LLM fan-out). Step 8: spawn `html-visualizer` once per component/pattern spec only, dispatch = sheet kind + spec path + `${CLAUDE_PLUGIN_ROOT}/references/preview-data-format.md` + output `<out>/components|patterns/<slug>.data.js` (no template path, no hrefs, no dark flag — dark is the shell's concern); GATE unchanged (one data file per spec). New step 8b: run `build_sheets.py <out>`. Step 9 unchanged commands; re-dispatch convention now names the offending DATA file's producer (a foundation-data violation is a script bug -> surface as `> NEEDS INPUT`, never re-dispatch an LLM at it). Update the intro artifact list (`*.data.js`, `components.js`, shells).
2. Completer step 7: first re-copy `docs.css` + `components.js` into `<out>` (idempotent `cp`); spawn `html-visualizer` per new-or-changed spec with the new dispatch payload; then run `build_foundation_data.py` (merged tokens change readouts), `build_sheets.py`, `build_index.py`, `lint_previews.py` — same gate.
3. Extractor SKILL.md: output-layout block gains `components.js`, `foundations|components|patterns/<slug>.data.js`; the mechanical-scripts list line gains the two new scripts.

### Edge cases
- Empty inventory: step 5 skipped as today; 7b/8b still run (foundation data + shells + index).
- `PYTHON_MISSING` gate already precedes every new script step — no new env handling.
- Pre-refactor `<out>` (specs exist, no `*.data.js`): the completer's `build_sheets.py` pass deletes legacy inline-markup sheets whose data files don't exist — accepted consequence of the no-migration decision; the completer's step-9 presentation notes that a full re-extraction restores the doc site in the new format.

### Contracts
- Generator dispatch payload to `html-visualizer` (consumed as Task 5 inputs); step order data -> shells -> index -> lint.

### DoD
All three skill docs updated and grep checks pass; no reference to the deleted template anywhere under `superui/skills/`.


### Covered criteria
8. `design-system-generator/SKILL.md` steps 7–9 orchestrate: copy `docs.css` + `components.js` → `build_foundation_data.py` → `html-visualizer` fan-out (components/patterns only, data outputs) → `build_sheets.py` → `build_index.py` + `lint_previews.py`; `design-system-completer/SKILL.md` step 7 mirrors the same tail; `design-system-extractor/SKILL.md` output tree and script list match.
