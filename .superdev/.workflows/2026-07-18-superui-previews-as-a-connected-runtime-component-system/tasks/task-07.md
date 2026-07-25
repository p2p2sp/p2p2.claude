
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


### Covered criteria
9. `superui/CLAUDE.md` is consistent with the above (layout, dark-mode canon single-source note replacing the "two places" note, provenance canon wording, scripted-artifacts invariant, scripts inventory, html-visualizer description).
10. End-to-end on a `.temp` fixture: `build_foundation_data.py` → `build_sheets.py` → `build_index.py` → `lint_previews.py` all exit 0 and the index links resolve.
