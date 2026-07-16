---
name: design-system-extractor
description: Use when the user provides a folder of UI screenshots and wants to reverse-engineer a framework-agnostic design system from it. Triggers: "extract a design system", "build design tokens from these screens", "document the components in this UI", "reverse-engineer this UI", a filesystem path to a screenshots directory. Screenshots only — does not scrape websites, does not target any UI framework. Orchestrates dedicated agents to produce DTCG design tokens (dtcg.yml), a DESIGN.md system document, a pure-CSS tokens.css, per-component and per-pattern specs, and a static HTML documentation site (foundation, component, and pattern sheets plus index.html).
allowed-tools: Write, Bash(sh:*), Bash(python:*), Bash(python3:*), Bash(py:*), Bash(mkdir:*), Skill, Agent
---

# Design System Extractor — measurement head

Turn a folder of UI screenshots into a framework-agnostic design system: DTCG tokens, a DESIGN.md document, pure-CSS tokens, specs, and an HTML documentation site. You are the MEASUREMENT HEAD: you map the source, resolve ambiguities with the user, dispatch the measurement agents, hand the measured notes + inventory to the shared `design-system-generator` tail for artifact production, then verify fidelity and present results. You never write tokens/specs/sheets yourself — neither directly nor by owning those steps; the mechanical generation pipeline is the generator's job.

Input contract: the screenshots-directory path comes from the invocation prompt or arguments. If none is present, ask for it before starting.

## Ground rules

- NEVER do a worker's job inline — no reading source screenshots, no measuring, no writing tokens/specs/sheets yourself. Spawn the owning agent (Agent tool, `subagent_type: superui:<agent-name>`) for the steps you own; the mechanical artifact-generation steps (compose tokens, css/skeleton/doc, specs, sheets, index) belong to `design-system-generator`, invoked as one step below.
- Fan-out steps run agents in parallel, batched (about 5 concurrent); wait for a batch before dispatching the next.
- One writer per file: within your own steps, `component-scout` is the sole writer of `inventory.md`; the generator's artifact writers (one per file) are documented in its own SKILL.md.
- Workers never talk to the user. All questions happen in steps 1/3 and when presenting; workers — and the generator, relaying its own workers' — return `> NEEDS INPUT` markers you carry to the user.
- RE-DISPATCH CONVENTION (gate failures, for the steps you own directly): spawn the same agent type again with its normal inputs PLUS its previous output path and the findings as additional constraints; it regenerates its artifact in full honoring them. Cap remediation at two rounds per gate — after that, surface the remaining findings to the user instead of looping.
- Trust the scripts and the generator: each verifies its own result — do not re-check or hand-edit script output, and relay the generator's return verbatim rather than re-verifying it.
- Paths: `<run>` = `.temp/design-system-extractor/<run-slug>/` (run state: source map, notes, reports; slug = source dir basename). `<out>` = `.superui/design-system/` (final artifacts; the user may override).

## Output layout

```
<out>/
  dtcg.yml  DESIGN.md  tokens.css  tokens.json  docs.css  index.html  inventory.md
  foundations/<name>.html
  components/<slug>.md  components/<slug>.html
  patterns/<slug>.md    patterns/<slug>.html
```

## Checklist — execute in order, never skip a step or a gate

### 1 — Intake [you]
Run `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"`. `PYTHON_MISSING` -> tell the user the pipeline's `*.py` steps need Python 3 and point them at `/superui:setup`; stop before any `python ...` step. `PYTHON_OK <cmd>` -> use `<cmd>` in place of `python` everywhere below, and state it as the interpreter command when spawning the Bash-bearing agents (`foundation-analyst`, `fidelity-reviewer`).

Confirm the source directory exists and contains images. Ask the user for scope only if genuinely unclear (which screens are canonical, desired output dir). Create `<run>` and the `<out>` skeleton (`mkdir`). GATE: source dir confirmed non-empty.

### 2 — Source map [source-scout, x1]
Spawn `superui:source-scout` with: source dir, output path `<run>/source-map.md`. GATE: source-map exists and covers every image file in the directory.

### 3 — Resolve ambiguities [you + user]
Read ONLY the `## Ambiguities` section of the source map. If it is non-empty, ask the user those questions now and write the answers to `<run>/intake-answers.md`. Every later agent dispatch that lists the source map also gets `<run>/intake-answers.md` when it exists (authoritative user clarifications). GATE: no unanswered ambiguity that blocks measurement.

### 4 — Foundations fan-out [foundation-analyst, x4 parallel]
Spawn `superui:foundation-analyst` once per foundation — `colors`, `typography`, `dimensions`, `effects-motion` — each with: its foundation name, source dir, source-map path (+ intake answers), sampler path `${CLAUDE_PLUGIN_ROOT}/scripts/sample_colors.py`, template path `${CLAUDE_PLUGIN_ROOT}/assets/tokens.template.yaml`, output `<run>/notes-<foundation>.md`. GATE: four notes files exist; the colors notes contain a measured surface/elevation order AND an accent-usage inventory. Missing either → re-dispatch the colors analyst per the re-dispatch convention.

### 5 — Inventory [component-scout, x1]
Spawn `superui:component-scout` with: source dir, source-map path (+ intake answers), detection catalog `${CLAUDE_PLUGIN_ROOT}/references/component-patterns.md`, output `<out>/inventory.md`. Then LIST the inventory to the user in your reply (components by kind, then patterns, then flagged inconsistencies) so they see what was identified before the specs land. GATE: inventory exists; user has seen it (do not block on approval unless they object).

### 6 — Generate artifacts [design-system-generator, x1]
Invoke `design-system-generator` via the Skill tool with the labeled block:
```
run: <run>
out: <out>
spec-producer: superui:spec-writer
provenance: measured
source: <source dir>
intake: <run>/intake-answers.md   (when it exists)
```
The generator composes `dtcg.yml`, renders `tokens.css`/`DESIGN.md`/specs/sheets/`index.html`, and returns a single message with artifact paths, counts, and every carried `> NEEDS INPUT` item. GATE: the generator reports success (all its internal gates green). A failure line (env or gate) -> surface it to the user verbatim and stop; do not run the fidelity fan-out on missing artifacts.

### 7 — Fidelity review fan-out [fidelity-reviewer, xM parallel]
Spawn `superui:fidelity-reviewer` per scope: one per pattern's canonical screen; one per canonical screen of components NOT covered by any pattern scope (group components sharing a canonical screen into one scope); plus one whole-system scope for surface/elevation order + accent discipline. Each gets: scope, source dir, artifact paths, sampler path, output `<run>/review-<scope>.md`.

Mismatches route to the owning producer per the re-dispatch convention — the same producers `design-system-generator`'s own checklist names for that artifact kind (its token composer for token issues, then a re-run of its css/spec-token scripts; its spec producer for a spec issue; its sheet renderer for a sheet issue; its doc-completion step for a DESIGN.md issue, revision: previous DESIGN.md + findings, affected sections only). Re-dispatch that agent directly (Agent tool) with its previous output path plus the findings as additional constraints. After fixes, spawn a fresh `fidelity-reviewer` on the affected scope. GATE: every scope reports PASS (or two remediation rounds spent — then report the residue to the user).

### 8 — Present results [you]
Give the user: the artifact paths (`dtcg.yml` first, then `DESIGN.md`, `tokens.css`, `tokens.json`, `inventory.md`, `index.html`), component/pattern counts, every collected `NEEDS INPUT` item (yours plus the generator's relayed ones), and the inventory's flagged inconsistencies. Keep it short. If `<out>/completions.md` already existed before this run, report that this re-extraction regenerated the artifacts wholesale and overwrote the previous syntheses it recorded; suggest running `design-system-completer` to re-validate and re-apply them.

## Scripts (each carries its I/O contract in its header)

Plain Python (stdlib + `pyyaml`, `Pillow`, `numpy`). Install if missing, using the step-1 interpreter: `<cmd> -m pip install pyyaml pillow numpy --break-system-packages`.

Run by YOU (the head):
- `check_python.sh` — the step-1 interpreter check.

Run by the GENERATOR or its AGENTS (never by you — see `design-system-generator`'s own Scripts section):
- `tokens_to_css.py`, `design_md_skeleton.py`, `check_spec_tokens.py`, `build_index.py`, `lint_previews.py` — the mechanical generation/validation scripts.
- `sample_colors.py` — pixel sampling (foundation-analyst, the generator's spec producer, fidelity-reviewer).
- `validate_tokens.py` — DTCG conformance + alias resolution (the generator's token composer).
