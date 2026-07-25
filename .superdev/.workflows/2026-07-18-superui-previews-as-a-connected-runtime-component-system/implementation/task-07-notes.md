## Task 7 - implementation notes

- Added a `references/` layout entry for `preview-data-format.md` (Task 1's new reference file) - the
  Approach's bullet list for CLAUDE.md doesn't name it explicitly, but it was a real staleness gap under the
  same "layout" heading the Approach calls out, and the file lives inside `superui/CLAUDE.md` (the task's only
  `Files` entry), so fixing it stays in scope.
- Also updated the "Orchestrator does no worker work" invariant's parenthetical script list (adding
  `build_foundation_data.py`, `build_sheets.py`) alongside the dedicated "Scripts inventory" section - not
  separately named in the Approach, but the same stale-script-list problem the Approach's "scripts inventory"
  bullet targets, in the same file.
- The assets-layout line originally worded the "template removed" note as "no `sheet.template.html`" - that
  phrasing would itself have matched the task's own `grep -rn "sheet.template" superui/` sweep and failed the
  DoD, so it was reworded to "no shared HTML template file" (same meaning, sweep-safe).
- No other deviations: dark-mode canon single-source rewrite, provenance canon (`html-visualizer` emits,
  `components.js` renders), scripted-artifacts invariant (shells/foundation-data/tokens.css/json/index.html/
  DESIGN.md skeleton scripted-wholesale vs `components/*.data.js`/`patterns/*.data.js` as LLM artifacts), the
  html-visualizer agent description, and the scripts-inventory entries for `build_foundation_data.py` /
  `build_sheets.py` / the reworked `build_index.py` / `lint_previews.py` all match the Approach directly.
  End-to-end fixture chain (`build_foundation_data.py` -> `build_sheets.py` -> `build_index.py` ->
  `lint_previews.py` on `.temp/preview-refactor/fixture`) all exit 0 and every `index.html` link resolves.
