---
name: design-system-generator
description: Mechanical artifact tail of a design-system run — composes dtcg.yml from notes, generates css/skeleton/doc/specs/sheets/index. Invoked only by design-system-extractor and design-system-creator via the Skill tool, never directly.
allowed-tools: Write, Bash(sh:*), Bash(python:*), Bash(python3:*), Bash(py:*), Bash(mkdir:*), Bash(cp:*), Agent
user-invocable: false
---

# Design System Generator — mechanical tail

Turn a run's foundation notes + inventory into the full `.superui/design-system/` artifact set: `dtcg.yml`, `tokens.css`, `DESIGN.md`, specs, sheets, `index.html`. You do zero user conversation and zero design judgment — every measurement/design decision already happened before you were invoked; you compose, generate, fan out to producer agents, and gate.

## Input contract
A labeled block, one `label: value` per line:
- `run:` run-dir containing `notes-<foundation>.md` x4 (colors, typography, dimensions, effects-motion) and, when the caller has one, `source-map.md`.
- `out:` output dir already containing `inventory.md` (one entry per component/pattern).
- `spec-producer:` the agent to fan out specs to — `superui:spec-writer` | `superui:spec-designer`.
- `provenance:` `measured` | `designed`.
- Optional `source:` screenshots dir (spec-writer sampling runs off this; also signals design-doc-writer should pick up `<run>/source-map.md`).
- Optional `context:` brief path (creator's brief.md — narrative context for design-doc-writer and input for spec-designer).
- Optional `intake:` intake-answers path (authoritative user clarifications, forwarded wherever the source-map is).

## Ground rules

- Zero user conversation, zero design judgment — every value/decision arrives already made in `run:`/`out:`/notes/inventory; you never invent or approve anything.
- NEVER do a producer's job inline — no writing tokens/specs/sheets yourself. Spawn the owning agent (Agent tool, `subagent_type: superui:<agent-name>`) even when the task looks small.
- Fan-out steps run agents in parallel, batched (about 5 concurrent); wait for a batch before dispatching the next.
- Single writer per file: `dtcg.yml` is written only by `token-composer` (compose job, then the merge job); each spec and each sheet has exactly one producer at a time.
- Scripted artifacts (`tokens.css`, `tokens.json`, the DESIGN.md skeleton, `index.html`) are regenerated wholesale, never patched by hand.
- RE-DISPATCH CONVENTION (gate failures, lint hits): spawn the same agent type again with its normal inputs PLUS its previous output path and the findings as additional constraints; it regenerates its artifact in full honoring them. Cap remediation at two rounds per gate — after that, carry the remaining findings into your final message as `> NEEDS INPUT` instead of looping.
- Trust the scripts: each verifies its own result — do not re-check or hand-edit script output.

## Checklist — execute in order, never skip a step or a gate

### 0 — Env check [you]
Run `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"`. `PYTHON_MISSING` -> stop now, write no artifacts, and return a single failure line telling the caller to send the user to `/superui:setup`. `PYTHON_OK <cmd>` -> use `<cmd>` in place of `python` in every step below, and state it as the interpreter command when spawning the Bash-bearing agents (`token-composer`, `spec-writer`/`spec-designer`).

### 1 — Compose tokens [token-composer, x1]
Spawn `superui:token-composer` (compose job) with: the four `<run>/notes-<foundation>.md` paths, validator path `${CLAUDE_PLUGIN_ROOT}/scripts/validate_tokens.py`, DTCG format reference `${CLAUDE_PLUGIN_ROOT}/references/dtcg-token-format.md`, template path `${CLAUDE_PLUGIN_ROOT}/assets/tokens.template.yaml`, output `<out>/dtcg.yml`. When `provenance: designed`, the dispatch also instructs: write `$extensions.org.superui.provenance: designed` at the dtcg.yml ROOT, and preserve that root marker across every later write (this step and every merge in step 6). GATE: composer reports 0 errors.

### 2 — Generate tokens.css + tokens.json [scripts]
```
python "${CLAUDE_PLUGIN_ROOT}/scripts/tokens_to_css.py" <out>/dtcg.yml <out>/tokens.css
python "${CLAUDE_PLUGIN_ROOT}/scripts/tokens_to_json.py" <out>/dtcg.yml <out>/tokens.json
```
Note the reported dark-override count — it is the DARK FLAG for step 8.

### 3 — Generate DESIGN.md skeleton [script]
```
python "${CLAUDE_PLUGIN_ROOT}/scripts/design_md_skeleton.py" <out>/dtcg.yml <out>/DESIGN.md
```

### 4 — Complete DESIGN.md [design-doc-writer, x1]
Spawn `superui:design-doc-writer` with: skeleton path, dtcg.yml, the four notes paths, completeness-map reference `${CLAUDE_PLUGIN_ROOT}/references/design-system-foundations.md`, plus caller-specific context docs — when `source:` was given, also `<run>/source-map.md` (if present) and `<intake>` (if given); when `context:` was given, also the brief path (`<context>`) as narrative context (product/audience/mood driving the prose). GATE: no `<!-- FILL: ... -->` placeholder left in DESIGN.md (leftover `> NEEDS INPUT` markers are allowed — collect them for your final message).

### 5 — Specs fan-out [spec-producer, xN parallel]
Skip entirely when `<out>/inventory.md` lists no entries. Otherwise spawn `<spec-producer>` once per inventory entry:
- `superui:spec-writer`: the entry line, source dir (`<source>`) + intake answers (`<intake>`) when given, dtcg.yml, spec template reference `${CLAUDE_PLUGIN_ROOT}/references/component-spec.md`, example spec `${CLAUDE_PLUGIN_ROOT}/assets/example-component-spec.md`, sampler path `${CLAUDE_PLUGIN_ROOT}/scripts/sample_colors.py`, output `<out>/components/<slug>.md` or `<out>/patterns/<slug>.md`.
- `superui:spec-designer`: the entry line, brief path (`<context>`), dtcg.yml, the same template and example paths — no source dir, no sampler.

Collect the token blocks from each agent's report (skip the ones reporting `none`): `MISSING-TOKENS` blocks into `<run>/missing-tokens.md`, `SYNTHESIZED-TOKENS` blocks into `<run>/synthesized-tokens.md`. GATE: one spec file per inventory entry.

### 6 — Reconcile [token-composer merge, x1 — only if either token list has entries]
Spawn `superui:token-composer` (merge job) with: `<out>/dtcg.yml`, whichever of `<run>/missing-tokens.md` / `<run>/synthesized-tokens.md` has entries (token-composer distinguishes `MISSING-TOKENS` vs `SYNTHESIZED-TOKENS` entries by tag — pass both files when both are non-empty), validator path, DTCG format reference, template path (same set as step 1). When `provenance: designed`, the dispatch again instructs preserving the root provenance marker. The composer keeps proposed names unless a tier rule forces a rename, and reports renames as `old -> new` lines. Then:
```
python "${CLAUDE_PLUGIN_ROOT}/scripts/tokens_to_css.py" <out>/dtcg.yml <out>/tokens.css
python "${CLAUDE_PLUGIN_ROOT}/scripts/tokens_to_json.py" <out>/dtcg.yml <out>/tokens.json
python "${CLAUDE_PLUGIN_ROOT}/scripts/check_spec_tokens.py" <out>
```
If the composer reported renames, re-dispatch `<spec-producer>` for each affected spec with the rename map, then re-run the checker. GATE: composer reports 0 errors; `check_spec_tokens.py` exits 0 (every spec token reference resolves in dtcg.yml).

### 7 — Copy doc chrome [script]
```
cp "${CLAUDE_PLUGIN_ROOT}/assets/doc-chrome/docs.css" <out>/docs.css
```

### 8 — Sheets fan-out [html-visualizer, xN parallel]
Spawn `superui:html-visualizer` once per sheet:
- foundation sheets → `<out>/foundations/<name>.html`, emitted when ANY of the sheet's dtcg.yml groups exist: `color` (groups: color) · `typography` (font, dimension, typography) · `spacing-radius` (spacing, radius, size, border, border-width) · `effects` (shadow, opacity, motion, zindex); content source = those groups + the matching DESIGN.md sections.
- one per component spec → `<out>/components/<slug>.html`;
- one per pattern spec → `<out>/patterns/<slug>.html`.

Each gets: sheet kind + content source, template `${CLAUDE_PLUGIN_ROOT}/assets/doc-chrome/sheet.template.html`, hrefs (`../docs.css`, `../tokens.css` from subdirs), the dark flag (from step 2), output path. GATE: one sheet per emitted foundation / spec.

### 9 — Index + lint [scripts]
```
python "${CLAUDE_PLUGIN_ROOT}/scripts/build_index.py" <out>
python "${CLAUDE_PLUGIN_ROOT}/scripts/lint_previews.py" <out>
```
Lint violations name the offending sheet — re-dispatch that sheet's `html-visualizer` per the re-dispatch convention (lint lines as findings), then re-run the lint. GATE: lint exits 0.

### 10 — Return [you]
End with a single message: the artifact paths (`dtcg.yml` first, then `DESIGN.md`, `tokens.css`, `tokens.json`, `inventory.md`, `index.html`), token/spec/sheet counts, every collected `> NEEDS INPUT` item (from design-doc-writer, spec producers, and any un-remediated re-dispatch findings), and confirmation every gate is green. You never talk to the user directly — the caller relays this verbatim.

## Edge cases

- Both token-list kinds may appear in one run (e.g. a spec producer re-dispatch after renames adds fresh entries of either tag) — pass every non-empty file to the step-6 merge job; `token-composer` already distinguishes by tag.
- Empty inventory (no entries in `<out>/inventory.md`) — skip step 5 (and any per-entry work in step 6) entirely; still render foundation sheets and the index in steps 8-9.
- `PYTHON_MISSING` at step 0 — stop immediately; return only the single failure line pointing at `/superui:setup`; write no artifacts.

## Contracts

- Input contract above — the interface both callers (`design-system-extractor`, `design-system-creator`) dispatch against.
- Return contract: the step-10 final text is the ENTIRE output of this skill — artifact paths, counts, and every carried `> NEEDS INPUT` item. The caller relays it verbatim without re-verifying (per the repo's script/fork trust invariant).
