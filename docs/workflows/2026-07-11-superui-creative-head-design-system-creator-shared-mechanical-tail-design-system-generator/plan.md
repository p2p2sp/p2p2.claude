# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "superui: creative head (design-system-creator) + shared mechanical tail (design-system-generator)"

---
<!-- HEADER -->

## Goal
superui gains a creative design path: `design-system-creator` interviews the user (prose, one question at a time), optionally samples inspiration images as moodboard HINTS, dispatches a new holistic `design-director` agent (pro-designer doctrine preloaded via agent frontmatter `skills:`), gates on user approval of the direction, then produces the full `.superui/design-system/` artifact set through a new shared mechanical sub-skill `design-system-generator` - the same tail the slimmed-down `design-system-extractor` now calls. Designed systems carry a root provenance marker in `dtcg.yml`. Shared scripts/references/assets consolidate at the superui plugin root; `!` preflights are removed in favor of a user-only `superui:setup` diagnostic skill and README-documented requirements.

## Context
Approved in the superdev interview: split "creative/measurement head vs mechanical tail" (decision 2.4), one holistic design agent + parallel spec designers (3.1), name `design-system-creator` CSO-routable (4.1/creator), hard collision gate - full redesign or abort, never merge (5.1), root-level provenance marker in dtcg.yml (6.3), user-only setup + README, preflights removed (7.1), shared scripts at plugin root. ONE DEVIATION from the interview wording: the generator cannot be `context: fork` - a forked skill runs as a subagent and subagents cannot spawn subagents (harness restriction), while the generator must dispatch `token-composer`/`html-visualizer`/spec producers via the Agent tool. It is therefore a `user-invocable: false` sub-skill invoked inline via the Skill tool (exact precedent: superdev's `superplan`). The head/tail responsibility split is unchanged. Repo has no build/test - markdown/JSON edits are shipping; verification is grep + running the bundled Python scripts on fixtures.

## Acceptance criteria
1. `superui/scripts/` holds `check_python.sh`, `sample_colors.py`, `check_contrast.py`, `validate_tokens.py`, `tokens_to_css.py`, `design_md_skeleton.py`, `check_spec_tokens.py`, `build_index.py`, `lint_previews.py`; `superui/references/` holds `dtcg-token-format.md`, `component-spec.md`, `design-system-foundations.md`; `superui/assets/` holds `tokens.template.yaml`, `example-component-spec.md`, `doc-chrome/` (`docs.css`, `sheet.template.html`). `superui/shared/` no longer exists. `component-patterns.md` stays under the extractor; `check_completeness.py` stays under the completer; pro-designer `references/` stay under pro-designer. `grep -rn "shared/scripts\|design-system-extractor/scripts\|design-system-extractor/references\|design-system-extractor/assets\|pro-designer/scripts" superui/` returns no live references (CLAUDE.md/README prose updated too).
2. No superui SKILL.md contains a `` !` `` preflight line; extractor, completer, creator and generator each carry an explicit early env-check step (`sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"`; on `PYTHON_MISSING` stop and point at `/superui:setup`); pro-designer's contrast-script instructions handle a missing interpreter by pointing at `/superui:setup`.
3. `superui/skills/design-system-generator/SKILL.md` exists: `user-invocable: false` (NOT `context: fork`), description routing-guards it to the extractor/creator callers, labeled-args input contract (`run:`, `out:`, `spec-producer:`, `provenance:`, optional `source:`, `context:`, `intake:`), and a mechanical checklist covering: compose (token-composer) -> tokens_to_css -> design_md_skeleton -> design-doc-writer -> spec fan-out via the `spec-producer:` agent -> collect MISSING-/SYNTHESIZED-TOKENS -> token-composer merge + re-css + check_spec_tokens -> docs.css copy -> html-visualizer fan-out -> build_index + lint_previews (violations re-dispatched). It never talks to the user; NEEDS INPUT items and result paths/counts are returned to the caller.
4. Extractor SKILL.md is a measurement head: keeps intake, source-scout, foundation-analyst fan-out, component-scout (+ showing the inventory), fidelity-reviewer fan-out, Present results (incl. the existing completions.md report); its former steps 5-8/10-13 are replaced by ONE Skill invocation of `design-system-generator` with `spec-producer: superui:spec-writer`, `provenance: measured`; `Skill` added to its `allowed-tools`, `cp` dropped.
5. `superui/agents/design-director.md` exists: single holistic spawn; frontmatter `skills:` preloads pro-designer; tools `Read, Write, Glob, Grep, Bash`; input = brief path (+ optional inspiration-hints path, template path, contrast-script path, output run-dir); output = the four `notes-<foundation>.md` files honoring foundation-analyst's conventions (per finding: template-vocabulary name + value + rationale-as-evidence; dark values inline next to light; colors notes carry surface/elevation order, accent-usage plan and a `CONTRAST-PAIRS:` section it has verified with `check_contrast.py`) + an inventory proposal in component-scout's format using the sanctioned synthesized entry shape + a direction rationale; never talks to the user (`> NEEDS INPUT` convention).
6. `superui/agents/spec-designer.md` exists: one spawn per inventory entry; designs a spec WITHOUT screenshots from inventory entry + dtcg.yml + brief + spec template/example; frontmatter `skills:` preloads pro-designer; every value a token NAME; unmatched values emitted as a `SYNTHESIZED-TOKENS:` block (design-synthesizer's shape); spec carries `**Provenance:** designed, not extracted`; never edits dtcg.yml.
7. Provenance canon extended end-to-end: token-composer writes `$extensions.org.superui.provenance: designed` at the dtcg.yml ROOT when its dispatch says so and preserves an existing root marker across merges; fidelity-reviewer's skip rule gains the root-marker = whole-system-skip granularity; `check_completeness.py` reports system provenance under `## Provenance facts`; `python superui/scripts/validate_tokens.py` exits 0 on a fixture dtcg.yml bearing the root marker (tolerance confirmed - no validator change expected).
8. `superui/skills/design-system-creator/SKILL.md` exists: CSO-routable + user-invocable; description covers design-from-intent-plus-inspiration in any language and explicitly routes pixel-perfect replication requests to the extractor; body enforces: env-check -> collision gate (`.superui/design-system/DESIGN.md` exists -> hard stop; explicit user choice full-redesign-overwrite vs abort with routing to completer/extractor; never merge) -> prose interview ONE question per turn (no AskUserQuestion; product, audience, mood adjectives, optional inspiration dir, what to take, what to avoid -> `<run>/brief.md`) -> optional `sample_colors.py` pass over inspiration images into `<run>/inspiration-hints.md` labeled as hints-never-canon -> design-director dispatch -> USER GATE on the direction (approve/adjust loop) -> write `<out>/inventory.md` + invoke generator (`spec-producer: superui:spec-designer`, `provenance: designed`) -> contrast QA re-running `check_contrast.py` on the CONTRAST-PAIRS against final token values -> present results.
9. `superui/skills/setup/SKILL.md` exists, user-only (`disable-model-invocation: true`), runs a bundled `scripts/check_env.sh` that reports interpreter (via `check_python.sh`) and third-party modules (Pillow, numpy, PyYAML) as PASS/FAIL lines with install hints; `superui/README.md` documents requirements (Python 3 + `pip install pillow numpy pyyaml`), setup usage and the skill/agent map; root `README.md` superui table lists all seven skills (extractor, creator, completer, guardian, pro-designer, setup, with generator noted as internal) and links `superui/README.md`.
10. `superui/.claude-plugin/plugin.json` lists skills `design-system-creator`, `design-system-generator`, `setup` and agents `design-director`, `spec-designer` (existing entries intact); `superui/CLAUDE.md` reflects the new layout, skill/agent taxonomy, head/tail invariant, extended provenance canon and scripts inventory; root `CLAUDE.md` superui description updated; `superui/hooks/content/manifest.md` untouched unless it names artifact writers (then extended by one line).

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - refactor(superui): consolidate shared scripts, references and assets at plugin root; drop `!` preflights
- Covers: criteria #1, #2 (extractor/completer/pro-designer parts)

### Dependencies
- none - blocks: Task 2, 3, 4, 5, 6, 7

### Files
- modify (git mv) - superui/shared/scripts/check_python.sh -> superui/scripts/check_python.sh (update its `# superui - shared/scripts/...` header comment)
- modify (git mv) - superui/skills/design-system-extractor/scripts/{sample_colors,validate_tokens,tokens_to_css,design_md_skeleton,check_spec_tokens,build_index,lint_previews}.py -> superui/scripts/
- modify (git mv) - superui/skills/pro-designer/scripts/check_contrast.py -> superui/scripts/check_contrast.py (remove now-empty pro-designer/scripts/)
- modify (git mv) - superui/skills/design-system-extractor/references/{dtcg-token-format,component-spec,design-system-foundations}.md -> superui/references/
- modify (git mv) - superui/skills/design-system-extractor/assets/{tokens.template.yaml,example-component-spec.md} and assets/doc-chrome/ -> superui/assets/
- modify - superui/skills/design-system-extractor/SKILL.md (path idioms only: `${CLAUDE_SKILL_DIR}/scripts|references|assets/...` -> `${CLAUDE_PLUGIN_ROOT}/scripts|references|assets/...`; `references/component-patterns.md` stays `${CLAUDE_SKILL_DIR}`-relative; delete `!` preflight line 15; insert env-check into step 1: run `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"`, `PYTHON_MISSING` -> stop, point at `/superui:setup`; `PYTHON_OK <cmd>` -> `<cmd>` is the interpreter passed onward)
- modify - superui/skills/design-system-completer/SKILL.md (same preflight->env-check swap; sibling-path idioms `${CLAUDE_SKILL_DIR}/../design-system-extractor/{scripts,references,assets}/...` -> `${CLAUDE_PLUGIN_ROOT}/{scripts,references,assets}/...`; `../pro-designer/references/` refs unchanged; own `scripts/check_completeness.py` unchanged)
- modify - superui/skills/pro-designer/SKILL.md (delete `## Python preflight` section incl. `!` line; contrast-script path -> `${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.py`; interpreter wording: try `python`/`python3`, on failure skip with note + point at `/superui:setup`)
- modify - superui/CLAUDE.md (layout block: `shared/` -> `scripts/` + `references/` + `assets/`; scripts inventory paths)
- modify - CLAUDE.md (root: the `shared/scripts` convention sentence - superui now uses plugin-root `scripts/`; supergh keeps `shared/`)

### Test Commands
*Build*
- none (markdown/JSON repo) - `python3 -c "import json;json.load(open('superui/.claude-plugin/plugin.json'))"` must exit 0

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

<!-- /TASK -->

---

<!-- TASK -->

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

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - refactor(superui): slim design-system-extractor to the measurement head
- Covers: criteria #4

### Dependencies
- Task 2 - blocks: Task 7

### Files
- modify - superui/skills/design-system-extractor/SKILL.md (steps + allowed-tools)
- modify - superui/CLAUDE.md (extractor entry: head role, step count)

### Test Commands
*Build*
- `python3 -c "import json;json.load(open('superui/.claude-plugin/plugin.json'))"`

*Tests*
- `grep -n 'design-system-generator' superui/skills/design-system-extractor/SKILL.md` -> the Skill invocation step
- `grep -n 'token-composer\|html-visualizer\|design-doc-writer\|spec-writer' superui/skills/design-system-extractor/SKILL.md` -> only the generator-args line naming `spec-producer: superui:spec-writer` (no owned dispatch steps)
- `grep -n 'Bash(cp' superui/skills/design-system-extractor/SKILL.md` -> no hit; `grep -n 'Skill' superui/skills/design-system-extractor/SKILL.md` -> allowed-tools hit

### Approach
1. Renumber the checklist: 1 intake+env-check (Task 1 text), 2 source-map (source-scout), 3 resolve ambiguities, 4 foundations fan-out (sampler/template at `${CLAUDE_PLUGIN_ROOT}` paths), 5 inventory (component-scout) + LIST it to the user, 6 invoke `design-system-generator` via the Skill tool with the labeled block (`run:`, `out:`, `spec-producer: superui:spec-writer`, `provenance: measured`, `source:`, `intake:` when present), 7 fidelity-reviewer fan-out (unchanged scopes; artifacts now exist), 8 Present results (unchanged text incl. completions.md report; add the generator's relayed NEEDS INPUT items).
2. Delete the bodies of former steps 5-8 and 10-13 (now generator-owned); keep every gate that belongs to the head (source-map coverage, colors-notes surface order + accent inventory, inventory shown to user, fidelity PASS).
3. `allowed-tools`: `Write, Bash(sh:*), Bash(python:*), Bash(python3:*), Bash(py:*), Bash(mkdir:*), Skill` (drop `Bash(cp:*)`).
4. Update the SKILL.md intro/Scripts section to reflect which scripts the head still runs itself (only `check_python.sh`; sampler is agent-run).

### Edge cases
- Generator returns a failure line (env or gate) -> extractor surfaces it and stops; no fidelity fan-out on missing artifacts.
- Spec-writer NEEDS INPUT markers arrive via the generator's return - extractor carries them into Present results exactly like today.

### Contracts
- Consumes the generator input/return contract from Task 2 (labeled args, verbatim relay).

### DoD
Extractor SKILL.md contains only head steps + one generator invocation; greps pass; CLAUDE.md entry matches.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - feat(superui): system-level provenance marker in dtcg.yml across the canon
- Covers: criteria #7

### Dependencies
- Task 1 - blocks: Task 6, 7

### Files
- modify - superui/agents/token-composer.md (compose/merge: root marker write + preserve)
- modify - superui/agents/fidelity-reviewer.md (skip rule: root marker granularity)
- modify - superui/skills/design-system-completer/scripts/check_completeness.py (system-provenance fact line)
- modify - superui/CLAUDE.md (Provenance canon bullet: 4th marker, its writers/consumers)

### Test Commands
*Build*
- `python3 -c "import yaml" 2>/dev/null || echo PyYAML missing (install before running fixtures)`

*Tests*
- fixture: write `.temp/provenance-fixture/dtcg.yml` containing `$extensions: {org.superui.provenance: designed}` at root plus 2 valid tokens -> `python3 superui/scripts/validate_tokens.py .temp/provenance-fixture/dtcg.yml` exits 0
- `python3 superui/skills/design-system-completer/scripts/check_completeness.py .temp/provenance-fixture .temp/provenance-fixture/facts.md` exits 0 AND `grep -n 'provenance' .temp/provenance-fixture/facts.md` shows the system-provenance line under `## Provenance facts`

### Approach
1. token-composer.md: input gains optional `provenance: designed` line -> on compose, write `$extensions` with `org.superui.provenance: designed` at the dtcg.yml ROOT; on every job (compose or merge) an existing root marker is preserved verbatim - never dropped, never added unrequested. Per-token `synthesized: true` rules unchanged.
2. fidelity-reviewer.md: extend the skip sentence - a root `$extensions.org.superui.provenance: designed` marker means the ENTIRE system is designed: skip all token spot-checks and spec comparisons, report `system provenance: designed - comparison skipped` with the usual skipped count.
3. check_completeness.py: in the `## Provenance facts` section emit `system provenance: designed|measured (root marker present|absent)`; keep exit-code contract (gaps are data); update its header contract comment + self-verify.
4. superui/CLAUDE.md: document the 4th canon marker (writer: token-composer on generator instruction; consumers: fidelity-reviewer, check_completeness.py; validator tolerance verified).

### Edge cases
- Root `$extensions` written as a `$`-prefixed top-level key MUST remain ignored by `validate_tokens.py`'s group walk (verified in exploration: `key.startswith("$") -> continue`); the fixture test guards regressions.
- Merge into a designed system with MISSING-TOKENS entries (later re-extraction flows) - root marker preserved even when per-token flags differ.

### Contracts
- `$extensions.org.superui.provenance: designed` at dtcg.yml root; absence = measured. Written only by token-composer when instructed; read by fidelity-reviewer + check_completeness.py.

### DoD
Fixture validates + facts line present; all four files updated consistently; canon bullet in superui/CLAUDE.md names the new marker.

<!-- /TASK -->

---

<!-- TASK -->

## Task 5 - feat(superui): add design-director and spec-designer agents
- Covers: criteria #5, #6

### Dependencies
- Task 1, Task 4 - blocks: Task 6

### Files
- add - superui/agents/design-director.md
- add - superui/agents/spec-designer.md
- modify - superui/.claude-plugin/plugin.json (agents[] += design-director, spec-designer)
- modify - superui/CLAUDE.md (agents section: two new workers)

### Test Commands
*Build*
- `python3 -c "import json;json.load(open('superui/.claude-plugin/plugin.json'))"`

*Tests*
- `grep -n 'skills:' superui/agents/design-director.md superui/agents/spec-designer.md` -> both preload pro-designer
- `grep -n 'NEEDS INPUT' superui/agents/design-director.md` -> convention present
- `grep -n 'SYNTHESIZED-TOKENS' superui/agents/spec-designer.md` -> block format present

### Approach
1. design-director.md - frontmatter: `name: design-director`, description "Designs the complete visual direction of a NEW design system from a user brief + optional inspiration hints - all four foundation notes files, an inventory proposal and a rationale. Spawn exactly one; design coherence requires a single head.", `tools: Read, Write, Glob, Grep, Bash`, `skills: [superui:pro-designer]` (preloads the doctrine; verify the namespaced id resolves at implementation - fallback to `[pro-designer]`). Body (input->work->output): inputs = brief path, optional inspiration-hints path (hints are mood direction, NEVER values to copy verbatim), template path (`tokens.template.yaml` vocabulary), contrast script path, output run-dir, notes/inventory format contracts. Work order: read doctrine references relevant to the brief; design holistically (palette incl. dark, type ramp, spacing/dimensions, effects/motion) under pro-designer non-negotiables; verify every planned text/surface pair with `python <contrast-script>` and record a `CONTRAST-PAIRS:` section (fg-token, bg-token, type, result) in the colors notes; write `notes-colors.md`, `notes-typography.md`, `notes-dimensions.md`, `notes-effects-motion.md` (per finding: template-vocabulary name, designed value, evidence = one-line design rationale incl. `hint:`/`doctrine:` basis; dark values inline next to light; colors notes additionally carry surface/elevation order + accent-usage plan); write the inventory proposal (component-scout section format; entries in the sanctioned synthesized shape `- <slug> - <Display name> · atomic|composite · synthesized (no canonical screen) · states: <list>`, patterns with `composed of:`); write a short direction rationale file. Hard rules: never talk to the user (`> NEEDS INPUT`), never write outside the run-dir, never lift a sampled inspiration value unchanged without recording it as deliberate (`hint-adopted`).
2. spec-designer.md - frontmatter: `name: spec-designer`, description "Designs ONE component or pattern spec for a design system that has no source screenshots - from the inventory entry, dtcg.yml and the design brief, following the bundled spec template. Values by token NAME only; unmatched values return as SYNTHESIZED-TOKENS. Spawn one per inventory entry, in parallel.", `tools: Read, Write, Glob, Grep`, `skills: [superui:pro-designer]`. Body mirrors design-synthesizer's discipline: inputs = inventory entry, dtcg.yml, spec template ref, example spec, brief path, output spec path; extrapolate from the system's own tokens/scales first, pro-designer doctrine second; spec follows the template with `**Provenance:** designed, not extracted` on the meta line; states designed as FORM + COLOR; every value a token NAME; missing tokens -> `SYNTHESIZED-TOKENS:` block (`- <name> = <value> (evidence: synthesized - <basis>)`); end message = spec path + block (or `SYNTHESIZED-TOKENS: none`). Hard rules: never edit dtcg.yml, one entry only, never talk to the user.
3. Register both in plugin.json agents[] and describe them in superui/CLAUDE.md (agents section).

### Edge cases
- No inspiration provided -> design-director works from brief + doctrine alone (hints input is optional).
- A CONTRAST-PAIRS failure during design -> design-director adjusts values BEFORE writing notes (prevention over correction), never records a failing pair.
- spec-designer needing a token that exists -> alias per design-synthesizer's rule (emit `<value> = {existing.path}`), never duplicate a raw value.

### Contracts
- design-director output feeds token-composer compose (notes) and the creator's inventory write - formats above.
- spec-designer SYNTHESIZED-TOKENS feeds token-composer merge unchanged (existing canon).

### DoD
Both agent files complete with contracts; plugin.json + superui/CLAUDE.md in sync; greps pass.

<!-- /TASK -->

---

<!-- TASK -->

## Task 6 - feat(superui): add design-system-creator, the creative head skill
- Covers: criteria #8

### Dependencies
- Task 2, Task 4, Task 5 - blocks: Task 7

### Files
- add - superui/skills/design-system-creator/SKILL.md
- modify - superui/.claude-plugin/plugin.json (skills[] += "./skills/design-system-creator/")
- modify - superui/CLAUDE.md (skills section: creator entry; design-artifacts invariant: three writers now - extractor, completer, creator)

### Test Commands
*Build*
- `python3 -c "import json;json.load(open('superui/.claude-plugin/plugin.json'))"`

*Tests*
- `grep -n 'AskUserQuestion' superui/skills/design-system-creator/SKILL.md` -> no hit
- `grep -n 'design-system-generator' superui/skills/design-system-creator/SKILL.md` -> invocation step with `spec-producer: superui:spec-designer` and `provenance: designed`
- `grep -n 'design-system-extractor' superui/skills/design-system-creator/SKILL.md` -> pixel-perfect routing + collision routing hits

### Approach
1. Frontmatter: `name: design-system-creator`; CSO `description:` - "Designs a NEW framework-agnostic design system from the user's intent and optional inspiration materials - inspiration, never replication. Use when the user describes a product/mood and wants a visual direction or design system created from scratch ('design me a design system', 'projekt od zera z inspiracji'), in any language. Inspiration images are hints only; for pixel-perfect extraction from screenshots use design-system-extractor. Produces the same `.superui/design-system/` artifacts (dtcg.yml, DESIGN.md, tokens.css, specs, HTML sheets), marked with designed provenance and enforced by design-system-guardian afterwards. NOT for styling individual pages/components (pro-designer/guardian handle those)."; `allowed-tools: Write, Bash(sh:*), Bash(python:*), Bash(python3:*), Bash(py:*), Bash(mkdir:*), Skill`.
2. Steps: 1 env-check (Task 1 contract) + collision gate - Glob `.superui/design-system/DESIGN.md`; PRESENT -> hard stop, ask the user plainly: full redesign (this run OVERWRITES the whole system wholesale) or abort (gaps in the existing system -> `design-system-completer`; new source screenshots -> `design-system-extractor`); proceed only on explicit "redesign". ABSENT -> `mkdir` `<run>` (`.temp/design-system-creator/<slug>/`) + `<out>` skeleton. 2 interview - prose, ONE question per turn, no forms: product + audience, mood (3-5 adjectives), optional inspiration dir, per-source what to take (palette/type/density/mood) and what to avoid; write `<run>/brief.md`. 3 optional inspiration hints - per image `python <py> "${CLAUDE_PLUGIN_ROOT}/scripts/sample_colors.py" <image> --k 6` into `<run>/inspiration-hints.md`, each palette labeled `hint - mood direction, not canon`. 4 dispatch design-director (brief, hints, template `${CLAUDE_PLUGIN_ROOT}/assets/tokens.template.yaml`, contrast script `${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.py`, run-dir; formats per Task 5). 5 GATE: present the direction to the user - palette (token names + prose), type ramp, mood rationale, inventory list; adjust -> re-dispatch design-director with the user's corrections (loop); approve -> continue. 6 copy the approved inventory proposal to `<out>/inventory.md`; invoke `design-system-generator` (Skill tool, labeled args: `run:`, `out:`, `spec-producer: superui:spec-designer`, `provenance: designed`, `context: <run>/brief.md`). 7 contrast QA - re-run `check_contrast.py` on every CONTRAST-PAIRS entry against the FINAL dtcg.yml values (post-merge renames resolved via the generator's rename report); any failure -> token-composer merge job with corrected values from a re-dispatched design-director scoped to the failing tokens. 8 Present results - artifact paths, counts, NEEDS INPUT items, one line: "system provenance: designed - design-system-guardian now enforces it on every UI task".
3. Ground rules: workers never talk to the user; inspiration values are hints (adopting one verbatim is design-director's explicit `hint-adopted` call); this skill never edits `.superui/design-system/` directly - all writes flow through the generator's single-writer pipeline (the sole exception: copying `inventory.md` into `<out>`, mirroring the extractor's component-scout ownership).

### Edge cases
- User has no inspiration materials -> skip step 3; brief-only design is first-class.
- Inspiration dir contains an unreadable/non-image file -> skip it with a note (sampler exits 1; do not abort the run).
- User rejects the direction twice -> offer to restate the brief (loop to step 2) instead of a third blind re-design.
- Existing system present but user insists on merge -> refuse; explain completer owns gap-filling, offer redesign or abort (decision 5.1).

### Contracts
- Consumes: generator input/return contract (Task 2), design-director/spec-designer contracts (Task 5), env-check contract (Task 1).
- Produces: `.superui/design-system/` full artifact set with root provenance marker (Task 4).

### DoD
SKILL.md complete (frontmatter CSO + 8 steps + ground rules); plugin.json + superui/CLAUDE.md in sync; greps pass.

<!-- /TASK -->

---

<!-- TASK -->

## Task 7 - feat(superui): setup skill, READMEs and final docs sync
- Covers: criteria #9, #10 (and closes #2's setup pointer)

### Dependencies
- Task 3, Task 6 - blocks: none

### Files
- add - superui/skills/setup/SKILL.md
- add - superui/skills/setup/scripts/check_env.sh
- add - superui/README.md
- modify - superui/.claude-plugin/plugin.json (skills[] += "./skills/setup/")
- modify - README.md (root: superui table lists extractor, creator, completer, guardian, pro-designer, setup + generator as internal; link to superui/README.md; Install section mentions superui requirements pointer)
- modify - superui/CLAUDE.md (layout: setup skill + README; final consistency audit of every section touched by Tasks 1-6)
- modify - CLAUDE.md (root: superui description - creator + generator + setup; catalog sentence about superui skill count)
- modify - superui/hooks/content/manifest.md (ONLY if it names `.superui/design-system/` writers - then add creator; otherwise untouched)

### Test Commands
*Build*
- `python3 -c "import json;json.load(open('superui/.claude-plugin/plugin.json'))"`

*Tests*
- `sh superui/skills/setup/scripts/check_env.sh` -> one line per check: `PYTHON <cmd>|MISSING`, `MODULE <name> OK|MISSING (pip install <pkg>)`; always exit 0
- `grep -n 'disable-model-invocation: true' superui/skills/setup/SKILL.md`
- `grep -n 'superui/README.md' README.md` -> link present
- `grep -rn 'shared/' superui/CLAUDE.md` -> no stale layout references

### Approach
1. check_env.sh (POSIX sh, `set -eu`, exit 0 always - diagnostic): source interpreter via `"${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"` (fallback `$(dirname "$0")/../../../scripts/check_python.sh` for direct runs); print `PYTHON <cmd>` or `PYTHON MISSING`; for each module pair (`PIL`:pillow, `numpy`:numpy, `yaml`:pyyaml) run `<cmd> -c "import <module>"` and print `MODULE <module> OK` / `MODULE <module> MISSING (pip install <pkg>)`; header comment carries the I/O contract (self-verifying script, caller trusts output).
2. setup SKILL.md - frontmatter per superdev precedent: `name: setup`, `description: Setup / diagnose the superui environment (Python + required modules).`, `allowed-tools: Read, Bash(sh:*)`, `user-invocable: true`, `disable-model-invocation: true`. Body: run check_env.sh in a fenced `!` block? NO - plain instruction: run `sh "${CLAUDE_SKILL_DIR}/scripts/check_env.sh"`, trust its lines, report PASS/FAIL table to the user with per-OS install hints (macOS `brew install python3`, Windows python.org + PATH note, `pip install pillow numpy pyyaml`), remind which skills need what (sampling needs Pillow+numpy; token pipeline needs PyYAML; contrast/lint/index are stdlib).
3. superui/README.md: what the plugin is (4 user-facing skills + guardian doctrine + internal generator), requirements section (Python 3; `pip install pillow numpy pyyaml`; run `/superui:setup` to verify), quick-start flows (extract vs create vs complete), artifact location `.superui/design-system/`.
4. Root README.md superui section: full skill table + one-line generator note + link; root CLAUDE.md superui bullets: creator/generator/setup + "three writers" of `.superui/design-system/`.
5. Read manifest.md; apply the conditional edit only if writers are named.
6. Final audit pass over superui/CLAUDE.md for contradictions with Tasks 1-6 (per repo self-documentation invariant).

### Edge cases
- check_env.sh must not fail (`set -eu` + guarded command checks) when python is absent entirely - every probe wrapped so the script still prints its lines and exits 0.
- `${CLAUDE_PLUGIN_ROOT}` is unset when the user runs the script manually from the repo - the dirname fallback covers it.

### Contracts
- check_env.sh output contract above - the setup skill trusts it verbatim (script-vs-fork invariant).

### DoD
Setup runs and reports; both READMEs shipped; plugin.json final state has 7 skills + 12 agents; no stale `shared/` references anywhere; manifest decision recorded in the task's commit message.

<!-- /TASK -->
