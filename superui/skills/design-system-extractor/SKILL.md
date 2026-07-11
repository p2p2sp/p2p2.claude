---
name: design-system-extractor
description: Use when the user provides a folder of UI screenshots and wants to reverse-engineer a framework-agnostic design system from it. Triggers: "extract a design system", "build design tokens from these screens", "document the components in this UI", "reverse-engineer this UI", a filesystem path to a screenshots directory. Screenshots only — does not scrape websites, does not target any UI framework. Orchestrates dedicated agents to produce DTCG design tokens (dtcg.yml), a DESIGN.md system document, a pure-CSS tokens.css, per-component and per-pattern specs, and a static HTML documentation site (foundation, component, and pattern sheets plus index.html).
allowed-tools: Write, Bash(sh:*), Bash(python:*), Bash(python3:*), Bash(py:*), Bash(mkdir:*), Bash(cp:*)
---

# Design System Extractor — orchestrator

Turn a folder of UI screenshots into a framework-agnostic design system: DTCG
tokens, a DESIGN.md document, pure-CSS tokens, specs, and an HTML documentation
site. You are the ORCHESTRATOR: every measurement, spec, and sheet is produced
by a dedicated agent; you run the checklist, the deterministic scripts, and the
conversation with the user — nothing else.

Input contract: the screenshots-directory path comes from the invocation prompt
or arguments. If none is present, ask for it before starting.

## Python preflight

!`sh "${CLAUDE_PLUGIN_ROOT}/shared/scripts/check_python.sh"`

If the line above reads `PYTHON_MISSING`, tell the user the pipeline's `*.py`
steps need Python 3 (install it; on Windows ensure `python` or `py` is on
`PATH`) and stop before any `python ...` step. If it reads `PYTHON_OK <cmd>`,
use `<cmd>` in place of `python` everywhere below — and state it as the
interpreter command when spawning the Bash-bearing agents (`foundation-analyst`,
`token-composer`, `spec-writer`, `fidelity-reviewer`).

## Ground rules

- NEVER do a worker's job inline — no reading source screenshots, no measuring,
  no writing tokens/specs/sheets yourself. Spawn the owning agent (Agent tool,
  `subagent_type: superui:<agent-name>`) even when the task looks small.
- Fan-out steps run agents in parallel, batched (about 5 concurrent); wait for
  a batch before dispatching the next.
- One writer per file: `dtcg.yml` is written only by `token-composer` (steps 2,
  4c, and step-6 token fixes); each spec and each sheet has exactly one
  producer at a time.
- Workers never talk to the user. All questions happen in steps 0a/0c and when
  presenting; workers return `> NEEDS INPUT` markers you carry to the user.
- RE-DISPATCH CONVENTION (gate failures, lint hits, review findings): spawn the
  same agent type again with its normal inputs PLUS its previous output path
  and the findings as additional constraints; it regenerates its artifact in
  full honoring them. Cap remediation at two rounds per gate — after that,
  surface the remaining findings to the user instead of looping.
- Trust the scripts: each verifies its own result — do not re-check or
  hand-edit script output. `tokens.css`, `index.html`, and the DESIGN.md
  skeleton are regenerated wholesale, never patched by hand.
- Paths: `<run>` = `.temp/design-system-extractor/<run-slug>/` (run state:
  source map, notes, reports; slug = source dir basename). `<out>` =
  `.superui/design-system/` (final artifacts; the user may override).

## Output layout

```
<out>/
  dtcg.yml  DESIGN.md  tokens.css  docs.css  index.html  inventory.md
  foundations/<name>.html
  components/<slug>.md  components/<slug>.html
  patterns/<slug>.md    patterns/<slug>.html
```

## Checklist — execute in order, never skip a step or a gate

### 0a — Intake [you]
Confirm the source directory exists and contains images. Ask the user for
scope only if genuinely unclear (which screens are canonical, desired output
dir). Create `<run>` and the `<out>` skeleton (`mkdir`).
GATE: source dir confirmed non-empty.

### 0b — Source map [source-scout, x1]
Spawn `superui:source-scout` with: source dir, output path
`<run>/source-map.md`.
GATE: source-map exists and covers every image file in the directory.

### 0c — Resolve ambiguities [you + user]
Read ONLY the `## Ambiguities` section of the source map. If it is non-empty,
ask the user those questions now and write the answers to
`<run>/intake-answers.md`. Every later agent dispatch that lists the source map
also gets `<run>/intake-answers.md` when it exists (authoritative user
clarifications).
GATE: no unanswered ambiguity that blocks measurement.

### 1 — Foundations fan-out [foundation-analyst, x4 parallel]
Spawn `superui:foundation-analyst` once per foundation — `colors`,
`typography`, `dimensions`, `effects-motion` — each with: its foundation name,
source dir, source-map path (+ intake answers), sampler path
`${CLAUDE_SKILL_DIR}/scripts/sample_colors.py`, template path
`${CLAUDE_SKILL_DIR}/assets/tokens.template.yaml`, output
`<run>/notes-<foundation>.md`.
GATE: four notes files exist; the colors notes contain a measured
surface/elevation order AND an accent-usage inventory. Missing either →
re-dispatch the colors analyst per the re-dispatch convention.

### 2 — Compose tokens [token-composer, x1]
Spawn `superui:token-composer` (compose job) with: the four notes paths,
validator path `${CLAUDE_SKILL_DIR}/scripts/validate_tokens.py`, DTCG format
reference `${CLAUDE_SKILL_DIR}/references/dtcg-token-format.md`, template path,
output `<out>/dtcg.yml`.
GATE: composer reports 0 errors.

### 2s — Generate tokens.css [script]
```
python "${CLAUDE_SKILL_DIR}/scripts/tokens_to_css.py" <out>/dtcg.yml <out>/tokens.css
```
Note the reported dark-override count — it is the DARK FLAG for step 5
(dark overrides > 0 → flag set).

### 3s — Generate DESIGN.md skeleton [script]
```
python "${CLAUDE_SKILL_DIR}/scripts/design_md_skeleton.py" <out>/dtcg.yml <out>/DESIGN.md
```

### 3 — Complete DESIGN.md [design-doc-writer, x1]
Spawn `superui:design-doc-writer` with: skeleton path, dtcg.yml, the notes
paths, source-map path (+ intake answers), completeness-map reference
`${CLAUDE_SKILL_DIR}/references/design-system-foundations.md`.
GATE: no `<!-- FILL: ... -->` placeholder left in DESIGN.md (leftover
`> NEEDS INPUT` markers are allowed — collect them for the user).

### 4a — Inventory [component-scout, x1]
Spawn `superui:component-scout` with: source dir, source-map path (+ intake
answers), detection catalog
`${CLAUDE_SKILL_DIR}/references/component-patterns.md`, output
`<out>/inventory.md`.
Then LIST the inventory to the user in your reply (components by kind, then
patterns, then flagged inconsistencies) so they see what was identified before
the specs land.
GATE: inventory exists; user has seen it (do not block on approval unless they
object).

### 4b — Specs fan-out [spec-writer, xN parallel]
Spawn `superui:spec-writer` once per inventory entry with: the entry line,
source dir (+ intake answers), dtcg.yml, spec template reference
`${CLAUDE_SKILL_DIR}/references/component-spec.md`, example spec
`${CLAUDE_SKILL_DIR}/assets/example-component-spec.md`, sampler path, output
`<out>/components/<slug>.md` or `<out>/patterns/<slug>.md`.
Collect the `MISSING-TOKENS` blocks from the agents' reports (skip the ones
reporting `none`) into `<run>/missing-tokens.md`.
GATE: one spec file per inventory entry.

### 4c — Reconcile [token-composer merge, x1 — only if missing tokens exist]
Spawn `superui:token-composer` (merge job) with: `<out>/dtcg.yml`,
`<run>/missing-tokens.md`, validator path, DTCG format reference, template
path (same set as step 2). The composer keeps the proposed names unless a tier
rule forces a rename, and reports renames as `old -> new` lines. Then:
```
python "${CLAUDE_SKILL_DIR}/scripts/tokens_to_css.py" <out>/dtcg.yml <out>/tokens.css
python "${CLAUDE_SKILL_DIR}/scripts/check_spec_tokens.py" <out>
```
If the composer reported renames, re-dispatch `spec-writer` for each affected
spec with the rename map, then re-run the checker.
GATE: composer reports 0 errors; `check_spec_tokens.py` exits 0 (every spec
token reference resolves in dtcg.yml).

### 5 — Sheets fan-out [html-visualizer, xN parallel]
First: `cp "${CLAUDE_SKILL_DIR}/assets/doc-chrome/docs.css" <out>/docs.css`.
Spawn `superui:html-visualizer` once per sheet:
- foundation sheets → `<out>/foundations/<name>.html`, emitted when ANY of the
  sheet's dtcg.yml groups exist: `color` (groups: color) · `typography`
  (font, dimension, typography) · `spacing-radius` (spacing, radius, size,
  border, border-width) · `effects` (shadow, opacity, motion, zindex);
  content source = those groups + the matching DESIGN.md sections.
- one per component spec → `<out>/components/<slug>.html`;
- one per pattern spec → `<out>/patterns/<slug>.html`.
Each gets: sheet kind + content source, template
`${CLAUDE_SKILL_DIR}/assets/doc-chrome/sheet.template.html`, hrefs
(`../docs.css`, `../tokens.css` from subdirs), the dark flag (from step 2s),
output path.
GATE: one sheet per emitted foundation / spec.

### 5s — Index + lint [scripts]
```
python "${CLAUDE_SKILL_DIR}/scripts/build_index.py" <out>
python "${CLAUDE_SKILL_DIR}/scripts/lint_previews.py" <out>
```
Lint violations name the offending sheet — re-dispatch that sheet's
`html-visualizer` per the re-dispatch convention (lint lines as findings),
then re-run the lint.
GATE: lint exits 0.

### 6 — Fidelity review fan-out [fidelity-reviewer, xM parallel]
Spawn `superui:fidelity-reviewer` per scope: one per pattern's canonical
screen; one per canonical screen of components NOT covered by any pattern
scope (group components sharing a canonical screen into one scope); plus one
whole-system scope for surface/elevation order + accent discipline. Each
gets: scope, source dir, artifact paths, sampler path, output
`<run>/review-<scope>.md`.
Mismatches route to the OWNING producer per the re-dispatch convention:
token issues → `token-composer` (merge job, step-2 input set) then re-run the
step-4c scripts; spec issues → that spec's `spec-writer`; sheet issues → that
sheet's `html-visualizer`; DESIGN.md issues → `design-doc-writer` (revision:
previous DESIGN.md + findings, affected sections only). After fixes, spawn a
fresh `fidelity-reviewer` on the affected scope.
GATE: every scope reports PASS (or two remediation rounds spent — then report
the residue to the user).

### Present results [you]
Give the user: the artifact paths (`dtcg.yml` first, then `DESIGN.md`,
`tokens.css`, `inventory.md`, `index.html`), component/pattern counts, every
collected `NEEDS INPUT` item, and the inventory's flagged inconsistencies.
Keep it short.

## Scripts (each carries its I/O contract in its header)

Plain Python (stdlib + `pyyaml`, `Pillow`, `numpy`). Install if missing, using
the preflight interpreter:
`<cmd> -m pip install pyyaml pillow numpy --break-system-packages`.

Run by YOU (the orchestrator):
- `tokens_to_css.py TOKENS.yaml OUT.css` — dtcg.yml → tokens.css (`:root` +
  `.dark`); its summary line carries the dark-override count (the dark flag).
- `design_md_skeleton.py TOKENS.yaml OUT.md` — DESIGN.md skeleton with
  auto-filled token stats and `<!-- FILL -->` placeholders.
- `check_spec_tokens.py DESIGN_SYSTEM_DIR` — resolves every token reference in
  the specs against dtcg.yml; exit 1 on dangling references.
- `build_index.py DESIGN_SYSTEM_DIR` — scans the output tree → `index.html`
  (narrative sections pulled from DESIGN.md).
- `lint_previews.py DESIGN_SYSTEM_DIR` — flags raw hex/rgb/hsl/px values inside
  sheet `<style>`/`style=` blocks; exit 1 on violations.

Run by AGENTS (never by you):
- `sample_colors.py` — pixel sampling (foundation-analyst, spec-writer,
  fidelity-reviewer).
- `validate_tokens.py TOKENS.yaml` — DTCG conformance + alias resolution
  (token-composer).
