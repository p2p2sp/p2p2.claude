# superui — the design / frontend ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** — it never reaches the skills / agents / manifest / hooks as runtime data, and the plugin reads
> host-project design knowledge from the **consuming** repo when it runs there, never from here. See the root
> `CLAUDE.md` for the repo-wide warnings and cross-plugin invariants; this file holds only what is specific to
> `superui`.

`superui` is the design / frontend ecosystem: the multi-agent, framework-agnostic design-system extractor
(an orchestrator skill dispatching eight plugin agents) and a professional UI/UX standards advisor. It is a
**single-domain** plugin, so its skills carry **no group prefix** (the plugin name is the group) and are
flat-named. The **per-component** catalog of record is `.claude-plugin/plugin.json` `skills[]` + `agents[]`;
the injected manifest (`hooks/content/manifest.md`) documents the design-artifact location, not individual
skills.

## Layout (superui internals)

```
superui/
  .claude-plugin/plugin.json   The plugin manifest — skills[] + agents[] are the catalog of record
  hooks/             One injected dispatcher manifest + SessionStart only (no plan gate)
    content/manifest.md  The injected `using-superui` dispatcher (`.superui/layout/` design-artifact location)
    scripts/         session-start.sh
  shared/            Plugin-level shared scripts (scripts/check_python.sh — the Python preflight,
                     `!`-injected by each superui skill that runs a Python step)
  agents/            The eight extraction workers (see below) — genuine plugin agents, dispatched by the
                     design-system-extractor orchestrator via the Agent tool (`subagent_type: superui:<name>`)
  skills/            Flat-named skills (single-domain plugin); design-system-extractor bundles scripts/,
                     references/ and assets/ (incl. the fixed doc chrome); pro-designer bundles references/
                     + a contrast script
```

## Skills (flat-named, single domain)

- `design-system-extractor` — the ORCHESTRATOR of a multi-agent extraction pipeline. Reverse-engineers a
  **framework-agnostic** design system from a folder of UI screenshots (screenshots ONLY — no website
  scraping) into `.superui/layout/design-system/`: DTCG tokens (`dtcg.yml`), a `DESIGN.md` system document
  (with a mandatory agent-usage section), a derived pure-CSS `tokens.css`, per-component and per-pattern
  specs (`.md`), and a static HTML documentation site (per-foundation / per-component / per-pattern sheets +
  `index.html`) rendered inside a FIXED bundled doc chrome (`assets/doc-chrome/`). The SKILL.md body is a hard
  step checklist (0a–6); every measurement/spec/sheet is produced by one of the eight agents — the
  orchestrator itself only runs scripts, gates, and the user conversation. Run state lives under
  `.temp/design-system-extractor/<run>/`.
- `pro-designer` — the cross-cutting **professional UI/UX standards** advisor (model-invocable via CSO):
  visual hierarchy, 60-30-10 color discipline, type ramps, 4/8pt spacing, accessibility, component states,
  form-validation UX, and evidence-based conversion psychology with hard anti-dark-pattern rules. Fires when
  creating, styling, or reviewing ANY interface. Bundles `references/` and `scripts/check_contrast.py`
  (WCAG AA contrast gate). Advisory only — it does not touch `.superui/layout/`; in a project with a
  documented design system there, that system takes precedence over its generic absolutes.

## Agents (the extraction workers, `agents/*.md`)

Single-responsibility workers with input->work->output contracts; none may ask the user (they return
`> NEEDS INPUT` markers instead). Spawned in parallel where the pipeline allows.

- `source-scout` — maps the screenshots (inventory, viewports, dark coverage, per-foundation reading lists,
  ambiguities). HINTS ONLY: names what and where to measure, never a value.
- `foundation-analyst` — measures ONE foundation (colors | typography | dimensions | effects-motion); the
  colors analyst always reads ALL screens (surface/elevation order via `--regions`, accent-usage inventory).
- `token-composer` — the ONLY writer of `dtcg.yml` (compose from notes, or merge missing-token lists);
  validates in a loop until clean.
- `design-doc-writer` — fills the script-generated `DESIGN.md` skeleton (headings are a contract).
- `component-scout` — the single deduplicated inventory: components (flat; atomic|composite as metadata) +
  patterns (screen-level compositions), each with a canonical screen.
- `spec-writer` — one spec per inventory entry; tokens by NAME; unmatched values come back as
  `MISSING-TOKENS`, never written into `dtcg.yml`.
- `html-visualizer` — one documentation sheet per foundation/spec, inside the fixed chrome; preview styling
  is exclusively `var(--token)` (lint-enforced); never reads screenshots.
- `fidelity-reviewer` — independent verification: re-samples the source and reports artifact mismatches
  (surface order, radii, accent discipline, state form+color); never edits.

## Architecture invariants (superui-specific)

- **Injected manifest, no plan gate.** A single `SessionStart` hook force-injects `hooks/content/manifest.md`
  (the `using-superui` dispatcher) **verbatim** once per session (`source == "resume"` excluded; fail-open).
  Unlike superdev, superui ships **no `PreToolUse` plan gate** — its only hook is `SessionStart`. The manifest
  documents the design-artifact location, not routing.
- **Design artifacts location.** The framework-agnostic design system lives under `.superui/layout/` in the
  host project (`design-system/` for the extractor's output).
- **Orchestrator does no worker work.** The extractor SKILL.md is a checklist + gates; screenshots are read
  and artifacts authored ONLY by the agents. Deterministic steps are scripts run by the orchestrator
  (`tokens_to_css.py`, `design_md_skeleton.py`, `build_index.py`, `lint_previews.py`).
- **Single writer per file.** `dtcg.yml` is written exclusively by `token-composer`; each spec/sheet has
  exactly one producer per run. Never two agents into one file.
- **Dark-mode canon.** The L1 dark literal `$extensions.org.superui.dark` on a token (a complete dark
  replacement for `$value`, same shape, aliases allowed) is the ONLY dark source in `dtcg.yml`, consumed by
  `tokens_to_css.py` (`.dark` block) and surfaced in sheets via the conditional dark toggle (present only
  when dark values exist). Renaming it is a coordinated change.
- **Scripted artifacts are regenerated wholesale.** `tokens.css`, `index.html`, and the DESIGN.md skeleton
  are fully rewritten on re-run; hand-maintained knowledge belongs in `dtcg.yml` / the writer-filled DESIGN.md
  sections / the specs, never in generated output. The doc chrome (`docs.css`, `sheet.template.html`) is a
  fixed asset copied into the output — the documented system renders inside it through its own tokens.

## Scripts inventory

- `skills/design-system-extractor/scripts/sample_colors.py` — k-means palette / exact pixel sampling;
  `--regions` ranks named region backgrounds by luminance (the measured surface/elevation order).
- `skills/design-system-extractor/scripts/validate_tokens.py` — DTCG conformance + recursive alias
  resolution incl. the dark extension.
- `skills/design-system-extractor/scripts/tokens_to_css.py` — deterministic `dtcg.yml` -> `tokens.css`
  (`:root` + `.dark`).
- `skills/design-system-extractor/scripts/design_md_skeleton.py` — `dtcg.yml` -> DESIGN.md skeleton
  (auto stats + `<!-- FILL -->` placeholders; heading contract, self-verified).
- `skills/design-system-extractor/scripts/check_spec_tokens.py` — resolves every backticked token
  reference in the specs against `dtcg.yml`; exit 1 on dangling references.
- `skills/design-system-extractor/scripts/build_index.py` — output dir -> `index.html` (narrative pulled
  from DESIGN.md; links self-verified).
- `skills/design-system-extractor/scripts/lint_previews.py` — flags raw hex/rgb/hsl/px in sheet styles;
  exit 1 on violations.
- `skills/pro-designer/scripts/check_contrast.py` — WCAG AA contrast gate.
- `shared/scripts/check_python.sh` — the Python preflight (`!`-injected).
