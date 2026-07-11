
## Task 1 — refactor(superui): consolidate shared scripts, references and assets at plugin root; drop `!` preflights
- Covers: criteria #1, #2 (extractor/completer/pro-designer parts)

### Dependencies
- none — blocks: Task 2, 3, 4, 5, 6, 7

### Files
- modify (git mv) - superui/shared/scripts/check_python.sh -> superui/scripts/check_python.sh (update its `# superui — shared/scripts/...` header comment)
- modify (git mv) - superui/skills/design-system-extractor/scripts/{sample_colors,validate_tokens,tokens_to_css,design_md_skeleton,check_spec_tokens,build_index,lint_previews}.py -> superui/scripts/
- modify (git mv) - superui/skills/pro-designer/scripts/check_contrast.py -> superui/scripts/check_contrast.py (remove now-empty pro-designer/scripts/)
- modify (git mv) - superui/skills/design-system-extractor/references/{dtcg-token-format,component-spec,design-system-foundations}.md -> superui/references/
- modify (git mv) - superui/skills/design-system-extractor/assets/{tokens.template.yaml,example-component-spec.md} and assets/doc-chrome/ -> superui/assets/
- modify - superui/skills/design-system-extractor/SKILL.md (path idioms only: `${CLAUDE_SKILL_DIR}/scripts|references|assets/...` -> `${CLAUDE_PLUGIN_ROOT}/scripts|references|assets/...`; `references/component-patterns.md` stays `${CLAUDE_SKILL_DIR}`-relative; delete `!` preflight line 15; insert env-check into step 1: run `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"`, `PYTHON_MISSING` -> stop, point at `/superui:setup`; `PYTHON_OK <cmd>` -> `<cmd>` is the interpreter passed onward)
- modify - superui/skills/design-system-completer/SKILL.md (same preflight->env-check swap; sibling-path idioms `${CLAUDE_SKILL_DIR}/../design-system-extractor/{scripts,references,assets}/...` -> `${CLAUDE_PLUGIN_ROOT}/{scripts,references,assets}/...`; `../pro-designer/references/` refs unchanged; own `scripts/check_completeness.py` unchanged)
- modify - superui/skills/pro-designer/SKILL.md (delete `## Python preflight` section incl. `!` line; contrast-script path -> `${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.py`; interpreter wording: try `python`/`python3`, on failure skip with note + point at `/superui:setup`)
- modify - superui/CLAUDE.md (layout block: `shared/` -> `scripts/` + `references/` + `assets/`; scripts inventory paths)
- modify - CLAUDE.md (root: the `shared/scripts` convention sentence — superui now uses plugin-root `scripts/`; supergh keeps `shared/`)

### Test Commands
*Build*
- none (markdown/JSON repo) — `python3 -c "import json;json.load(open('superui/.claude-plugin/plugin.json'))"` must exit 0

*Tests*
- `sh superui/scripts/check_python.sh` prints `PYTHON_OK <cmd>` or `PYTHON_MISSING`, exit 0
- `python3 superui/scripts/validate_tokens.py 2>&1; test $? -eq 1` (usage error, proves script runs from new path)
- `grep -rn 'shared/scripts' superui/ CLAUDE.md README.md` -> no hits outside .superdev/.temp history
- `grep -rn 'design-system-extractor/\(scripts\|references/dtcg\|references/component-spec\|references/design-system-foundations\|assets\)\|pro-designer/scripts' superui/` -> no hits

### Approach
1. `git mv` the files per the Files list; delete emptied dirs (`superui/shared/`, extractor `scripts/`, extractor `assets/` except nothing remains, pro-designer `scripts/`); extractor keeps `references/component-patterns.md` only.
2. Update every `${CLAUDE_SKILL_DIR}`/sibling-path string in the three SKILL.md files to the new `${CLAUDE_PLUGIN_ROOT}`-rooted locations (the exploration inventoried every occurrence: extractor steps 4-14 + Scripts section; completer steps 3, 5, 6, 7).
3. Replace the three identical `!` preflight lines + their explanation paragraphs with the env-check step text (extractor/completer) or the setup-pointer wording (pro-designer).
4. Sync superui/CLAUDE.md layout + scripts inventory and the root CLAUDE.md shared-scripts sentence.

### Edge cases
- zsh `nomatch`: none of the edited command lines may carry unquoted `?`/`*`/`[` tokens (keep existing quoting).
- Agents receive script paths from orchestrator prompts (placeholders like `<sampler>`), so NO agent file changes are needed for the moves.

### Contracts
- New canonical path roots consumed by every later task: `${CLAUDE_PLUGIN_ROOT}/scripts/`, `${CLAUDE_PLUGIN_ROOT}/references/`, `${CLAUDE_PLUGIN_ROOT}/assets/`.
- Env-check step contract: `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"` -> `PYTHON_OK <cmd>` | `PYTHON_MISSING` (exit 0 always).

### DoD
All greps clean, both script smoke-runs behave, extractor/completer/pro-designer SKILL.md carry no `!` line, superui/CLAUDE.md + root CLAUDE.md updated.


### Covered criteria
1. `superui/scripts/` holds `check_python.sh`, `sample_colors.py`, `check_contrast.py`, `validate_tokens.py`, `tokens_to_css.py`, `design_md_skeleton.py`, `check_spec_tokens.py`, `build_index.py`, `lint_previews.py`; `superui/references/` holds `dtcg-token-format.md`, `component-spec.md`, `design-system-foundations.md`; `superui/assets/` holds `tokens.template.yaml`, `example-component-spec.md`, `doc-chrome/` (`docs.css`, `sheet.template.html`). `superui/shared/` no longer exists. `component-patterns.md` stays under the extractor; `check_completeness.py` stays under the completer; pro-designer `references/` stay under pro-designer. `grep -rn "shared/scripts\|design-system-extractor/scripts\|design-system-extractor/references\|design-system-extractor/assets\|pro-designer/scripts" superui/` returns no live references (CLAUDE.md/README prose updated too).
2. No superui SKILL.md contains a `` !` `` preflight line; extractor, completer, creator and generator each carry an explicit early env-check step (`sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"`; on `PYTHON_MISSING` stop and point at `/superui:setup`); pro-designer's contrast-script instructions handle a missing interpreter by pointing at `/superui:setup`.
