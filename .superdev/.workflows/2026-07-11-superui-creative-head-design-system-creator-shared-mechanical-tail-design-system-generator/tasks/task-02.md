
## Task 2 - feat(superui): add design-system-generator, the shared mechanical tail sub-skill
- Covers: criteria #3

### Dependencies
- Task 1 - blocks: Task 3, 6

### Files
- add - superui/skills/design-system-generator/SKILL.md
- modify - superui/.claude-plugin/plugin.json (skills[] += "./skills/design-system-generator/")
- modify - superui/CLAUDE.md (skills section: generator entry; invariant "Orchestrator does no worker work" notes the tail)

### Test Commands
*Build*
- `python3 -c "import json;json.load(open('superui/.claude-plugin/plugin.json'))"`

*Tests*
- `grep -n 'user-invocable: false' superui/skills/design-system-generator/SKILL.md`
- `grep -n 'context: fork' superui/skills/design-system-generator/SKILL.md` -> no hit
- `grep -cn 'AskUserQuestion' superui/skills/design-system-generator/SKILL.md` -> 0

### Approach
1. Frontmatter: `name: design-system-generator`; `description:` "Mechanical artifact tail of a design-system run - composes dtcg.yml from notes, generates css/skeleton/doc/specs/sheets/index. Invoked only by design-system-extractor and design-system-creator via the Skill tool, never directly."; `user-invocable: false`; `allowed-tools: Write, Bash(sh:*), Bash(python:*), Bash(python3:*), Bash(py:*), Bash(mkdir:*), Bash(cp:*)`.
2. `# Input contract` (labeled block, one `label: value` per line): `run:` run-dir containing `notes-<foundation>.md` x4 (+ later collected token lists), `out:` output dir containing `inventory.md`, `spec-producer:` `superui:spec-writer` | `superui:spec-designer`, `provenance:` `measured` | `designed`, optional `source:` screenshots dir (spec-writer runs), optional `intake:` intake-answers path, optional `context:` brief path (spec-designer + design-doc-writer context). Env-check as step 0 (contract from Task 1) resolving `<py>`.
3. Steps (adapted verbatim from extractor's current steps 5,6,7,8,10,11,12,13 with the new `${CLAUDE_PLUGIN_ROOT}` paths): compose (token-composer; when `provenance: designed` the dispatch adds: write `$extensions.org.superui.provenance: designed` at the dtcg.yml root and preserve it on every later write) -> `tokens_to_css.py` (dark-count = dark flag) -> `design_md_skeleton.py` -> design-doc-writer (context docs: `source:`+`intake:` when given, `context:` brief when given) -> spec fan-out one `spec-producer:` agent per inventory entry, parallel (spec-writer dispatch: entry, `source:`, `intake:`, dtcg.yml, template `${CLAUDE_PLUGIN_ROOT}/references/component-spec.md`, example `${CLAUDE_PLUGIN_ROOT}/assets/example-component-spec.md`, sampler `${CLAUDE_PLUGIN_ROOT}/scripts/sample_colors.py`; spec-designer dispatch: entry, `context:` brief, dtcg.yml, same template/example - no source, no sampler) -> collect non-`none` token blocks into `<run>/missing-tokens.md` (MISSING-TOKENS) and/or `<run>/synthesized-tokens.md` (SYNTHESIZED-TOKENS) -> if any: token-composer merge + re-run `tokens_to_css.py` + `check_spec_tokens.py` (renames -> re-dispatch the spec producer with the rename map) -> `cp "${CLAUDE_PLUGIN_ROOT}/assets/doc-chrome/docs.css" <out>/docs.css` -> html-visualizer fan-out per sheet (template `${CLAUDE_PLUGIN_ROOT}/assets/doc-chrome/sheet.template.html`, hrefs `../docs.css` `../tokens.css`, dark flag) -> `build_index.py` + `lint_previews.py` (violations -> re-dispatch html-visualizer) -> final message: artifact paths, token/spec/sheet counts, every collected `> NEEDS INPUT`, all gates green.
4. Ground rules section: zero user conversation; zero design judgment; single-writer preserved (dtcg.yml only via token-composer; one producer per spec/sheet); scripted artifacts regenerated wholesale.

### Edge cases
- Both token-list kinds may appear in one run (a spec-writer re-dispatch after renames) - pass each file to the merge job; token-composer already distinguishes by tag.
- Empty inventory (no entries) -> skip spec/sheet fan-outs for components, still render foundation sheets + index.
- `PYTHON_MISSING` at step 0 -> return a single failure line telling the caller to send the user to `/superui:setup`; no artifacts written.

### Contracts
- Generator input contract above - consumed by Tasks 3 and 6.
- Generator return contract: final text = artifact paths + counts + carried NEEDS INPUT items (callers relay verbatim; per repo invariant callers do not re-verify).

### DoD
SKILL.md complete with input/output contract and all mechanical steps; plugin.json + superui/CLAUDE.md list it; greps above pass.


### Covered criteria
3. `superui/skills/design-system-generator/SKILL.md` exists: `user-invocable: false` (NOT `context: fork`), description routing-guards it to the extractor/creator callers, labeled-args input contract (`run:`, `out:`, `spec-producer:`, `provenance:`, optional `source:`, `context:`, `intake:`), and a mechanical checklist covering: compose (token-composer) -> tokens_to_css -> design_md_skeleton -> design-doc-writer -> spec fan-out via the `spec-producer:` agent -> collect MISSING-/SYNTHESIZED-TOKENS -> token-composer merge + re-css + check_spec_tokens -> docs.css copy -> html-visualizer fan-out -> build_index + lint_previews (violations re-dispatched). It never talks to the user; NEEDS INPUT items and result paths/counts are returned to the caller.
