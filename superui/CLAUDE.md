# superui — the design / frontend ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** — it never reaches the skills / agents / manifest / hooks as runtime data, and the plugin reads
> host-project design knowledge from the **consuming** repo when it runs there, never from here. See the root
> `CLAUDE.md` for the repo-wide warnings and cross-plugin invariants; this file holds only what is specific to
> `superui`.

`superui` is the design / frontend ecosystem: the multi-agent, framework-agnostic design-system extractor
(an orchestrator skill dispatching eight extraction agents), an opt-in gap-completion orchestrator (dispatching
two further agents — `gap-analyst`, `design-synthesizer`) that validates and, on explicit user approval, fills
what the extraction could not measure, a doctrinal guardian that enforces the extracted system on every UI
task, and a professional UI/UX standards advisor. It is a
**single-domain** plugin, so its skills carry **no group prefix** (the plugin name is the group) and are
flat-named. The **per-component** catalog of record is `.claude-plugin/plugin.json` `skills[]` + `agents[]`;
the injected manifest (`hooks/content/manifest.md`) documents the design-artifact location, not individual
skills.

## Layout (superui internals)

```
superui/
  .claude-plugin/plugin.json   The plugin manifest — skills[] + agents[] are the catalog of record
  hooks/             One injected dispatcher manifest + SessionStart only (no plan gate)
    content/manifest.md  The injected `using-superui` dispatcher (`.superui/design-system/` design-artifact location)
    scripts/         session-start.sh
  scripts/           Plugin-root deterministic scripts, shared across skills (incl. check_python.sh —
                     the Python env-check, run as an explicit early step by each skill with a Python step,
                     no `!` preflight)
  references/        Plugin-root reference docs shared across skills (dtcg-token-format.md,
                     component-spec.md, design-system-foundations.md)
  assets/            Plugin-root bundled assets shared across skills (tokens.template.yaml,
                     example-component-spec.md, doc-chrome/ — the fixed doc chrome)
  agents/            The eight extraction workers plus the two completion workers (`gap-analyst`,
                     `design-synthesizer`) — genuine plugin agents, dispatched by the design-system-extractor
                     / design-system-completer orchestrators via the Agent tool (`subagent_type: superui:<name>`)
  skills/            Flat-named skills (single-domain plugin); design-system-extractor keeps only its own
                     references/component-patterns.md (everything else moved to the plugin-root scripts/,
                     references/, assets/ above, addressed via `${CLAUDE_PLUGIN_ROOT}/...`);
                     design-system-completer bundles only its own scripts/ (check_completeness.py) and
                     reuses the plugin-root scripts/references/assets plus pro-designer's references by
                     path — no duplicated reference files; design-system-guardian is a bare SKILL.md
                     (doctrine only, no bundled files); pro-designer bundles references/ only (its contrast
                     script now lives at the plugin-root scripts/)
```

## Skills (flat-named, single domain)

- `design-system-extractor` — the **measurement head** of a multi-agent extraction pipeline. Reverse-engineers
  a **framework-agnostic** design system from a folder of UI screenshots (screenshots ONLY — no website
  scraping) into `.superui/design-system/`: DTCG tokens (`dtcg.yml`), a `DESIGN.md` system document
  (with a mandatory agent-usage section), a derived pure-CSS `tokens.css`, per-component and per-pattern
  specs (`.md`), and a static HTML documentation site (per-foundation / per-component / per-pattern sheets +
  `index.html`) rendered inside a FIXED bundled doc chrome (`assets/doc-chrome/`). The SKILL.md body is a hard
  step checklist (1–8): intake/env-check, source-map, ambiguity resolution, foundations fan-out, inventory
  (shown to the user), ONE `Skill`-tool invocation of the shared `design-system-generator` tail
  (`spec-producer: superui:spec-writer`, `provenance: measured`) that owns every artifact-generation step,
  fidelity-review fan-out, and presenting results. It owns only measurement (source-scout, foundation-analyst,
  component-scout) and verification (fidelity-reviewer); it never writes tokens/specs/sheets itself — that is
  the generator's job. Run state lives under `.temp/design-system-extractor/<run>/`.
- `design-system-generator` — the shared **mechanical tail**, `user-invocable: false` (invoked only via the
  `Skill` tool by `design-system-extractor` and `design-system-creator`, never directly — it cannot be
  `context: fork` because it must itself dispatch agents, and a forked subagent cannot spawn subagents). Takes a
  labeled-args input contract (`run:`, `out:`, `spec-producer:`, `provenance:`, optional `source:`, `context:`,
  `intake:`) and runs the mechanical checklist common to both heads: compose `dtcg.yml` (`token-composer`) ->
  `tokens_to_css.py` -> `design_md_skeleton.py` -> `design-doc-writer` -> spec fan-out via whichever agent the
  caller names in `spec-producer:` (`spec-writer` for the extractor, `spec-designer` for the creator) -> collect
  `MISSING-TOKENS`/`SYNTHESIZED-TOKENS` -> `token-composer` merge + re-css + `check_spec_tokens.py` -> copy
  `docs.css` -> `html-visualizer` fan-out -> `build_index.py` + `lint_previews.py`. Zero user conversation, zero
  design judgment — every value it writes already arrived decided in its inputs; it returns artifact paths,
  counts, and carried `> NEEDS INPUT` items to its caller, which relays them verbatim.
- `design-system-completer` — the opt-in **gap-completion** orchestrator, run after the extractor when the
  source screenshots never showed some piece of the system (a missing state, missing dark coverage, a missing
  token role). Two hard-gated stages: (1) `check_completeness.py` extracts facts, `gap-analyst` judges them
  into a gap report, presented to the user — nothing is designed until per-gap/per-category approval; (2) only
  approved scopes are fanned out to `design-synthesizer`, whose output flows through the SAME single-writer
  pipeline as the extractor (`token-composer` merge for `dtcg.yml`, `html-visualizer` for sheets), never a
  side channel. Every synthesized token is flagged `$extensions.org.superui.synthesized: true`; every
  synthesized spec/section carries a `**Provenance:**` line or `> SYNTHESIZED:` marker. The orchestrator alone
  (mechanical, no judgment) appends to two ledgers: `<out>/completions.md` (what was synthesized, this run vs
  prior) and `inventory.md`'s `## Synthesized` section. Gated on `DESIGN.md` + `dtcg.yml` already existing
  (absent either -> stand down, point at the extractor, never scaffold `<out>` itself). Reuses the plugin-root
  scripts/references/assets (`${CLAUDE_PLUGIN_ROOT}/...`) and pro-designer's references by sibling path
  (`${CLAUDE_SKILL_DIR}/../pro-designer/references/`) — bundles only its own `check_completeness.py`.
- `design-system-guardian` — the doctrinal **enforcement** skill for the extractor's (and completer's) output
  (model-invocable via CSO; no fork, no `allowed-tools`, no bundled files). Fires on ANY UI creation/styling/
  review work; gates itself on the existence of `.superui/design-system/DESIGN.md` (absent -> silent stand-down).
  Pointer-not-payload: it forces reading the DESIGN.md agent-usage section + the touched component/pattern
  specs, bans raw values a token covers, bans inventing beyond spec, and mandates a post-generation
  self-check. Read-only towards `.superui/design-system/` — routes gaps dually: measurable-from-source ->
  `design-system-extractor`; absent-from-source (a state/dark value/token role the screenshots never showed) ->
  `design-system-completer`; never to inlined values.
  Role split vs `pro-designer`: pro-designer = GENERIC UI/UX standards; guardian = fidelity to THIS
  project's CONCRETE extracted system (which wins on conflict — pro-designer itself defers).
- `pro-designer` — the cross-cutting **professional UI/UX standards** advisor (model-invocable via CSO):
  visual hierarchy, 60-30-10 color discipline, type ramps, 4/8pt spacing, accessibility, component states,
  form-validation UX, and evidence-based conversion psychology with hard anti-dark-pattern rules. Fires when
  creating, styling, or reviewing ANY interface. Bundles `references/` and `scripts/check_contrast.py`
  (WCAG AA contrast gate). Advisory only — it does not touch `.superui/design-system/`; in a project with a
  documented design system there, that system takes precedence over its generic absolutes.

## Agents (the extraction + completion workers, `agents/*.md`)

Single-responsibility workers with input->work->output contracts; none may ask the user (they return
`> NEEDS INPUT` markers instead). Spawned in parallel where the pipeline allows.

- `source-scout` — maps the screenshots (inventory, viewports, dark coverage, per-foundation reading lists,
  ambiguities). HINTS ONLY: names what and where to measure, never a value.
- `foundation-analyst` — measures ONE foundation (colors | typography | dimensions | effects-motion); the
  colors analyst always reads ALL screens (surface/elevation order via `--regions`, accent-usage inventory).
- `token-composer` — the ONLY writer of `dtcg.yml` (compose from notes, or merge missing-token lists);
  validates in a loop until clean. Merge entries arrive tagged `MISSING-TOKENS` (measured, never flagged) or
  `SYNTHESIZED-TOKENS` (designed; every such entry gets `$extensions.org.superui.synthesized: true` on write,
  and a flag already present on an existing token is always preserved across the merge).
- `design-doc-writer` — fills the script-generated `DESIGN.md` skeleton (headings are a contract).
- `component-scout` — the single deduplicated inventory: components (flat; atomic|composite as metadata) +
  patterns (screen-level compositions), each with a canonical screen.
- `spec-writer` — one spec per inventory entry; tokens by NAME; unmatched values come back as
  `MISSING-TOKENS`, never written into `dtcg.yml`.
- `html-visualizer` — one documentation sheet per foundation/spec, inside the fixed chrome; preview styling
  is exclusively `var(--token)` (lint-enforced); never reads screenshots. Renders a `> SYNTHESIZED: <rationale>`
  note with the same chrome class as `> NEEDS INPUT`, and a spec's `**Provenance:** designed, not extracted`
  line as a visible note in the sheet header — no new chrome classes for either.
- `fidelity-reviewer` — independent verification: re-samples the source and reports artifact mismatches
  (surface order, radii, accent discipline, state form+color); never edits. Skips any token flagged
  `$extensions.org.superui.synthesized: true` and any spec/section carrying `**Provenance:**` or
  `> SYNTHESIZED:` (synthesized content has no source pixels by design) and reports the skipped count
  alongside the mismatch count.
- `gap-analyst` — the completer's judgment stage: turns `check_completeness.py` facts into a judged gap
  report against the extractor's/pro-designer's checklists, one `[G<n>]` entry per gap; on a re-apply run
  (a `completions.md` path given) also classifies every ledger entry as still-missing/now-measured/obsolete.
  Never proposes a fill value, never writes under `.superui/design-system/`. Spawn exactly one.
- `design-synthesizer` — the completer's design stage: designs exactly the user-approved gaps of ONE scope,
  extrapolating from the measured system first and falling back to pro-designer doctrine only where the
  system offers no basis. Emits a synthesized-tokens list (token-composer merge input) and provenance-marked
  spec content; never edits `dtcg.yml` directly. Spawn one per approved scope, in parallel.

## Architecture invariants (superui-specific)

- **Injected manifest, no plan gate.** A single `SessionStart` hook force-injects `hooks/content/manifest.md`
  (the `using-superui` dispatcher) **verbatim** once per session (`source == "resume"` excluded; fail-open).
  Unlike superdev, superui ships **no `PreToolUse` plan gate** — its only hook is `SessionStart`. The manifest
  documents the design-artifact location, not routing.
- **Design artifacts location.** The framework-agnostic design system lives under `.superui/design-system/`
  in the host project. BOTH pipelines write there: the extractor (measurement) and the completer (opt-in,
  user-gated synthesis) — never a third writer, and the completer never scaffolds `<out>` itself (it requires
  `DESIGN.md` + `dtcg.yml` to already exist).
- **Orchestrator does no worker work.** Both orchestrator SKILL.mds (extractor, completer) are a checklist +
  gates; screenshots/facts are read and artifacts authored ONLY by the agents. Deterministic steps are
  scripts run by the orchestrator (`tokens_to_css.py`, `design_md_skeleton.py`, `build_index.py`,
  `lint_previews.py`, `check_completeness.py`). The completer's sole hand-written exception is step 8
  (bookkeeping): a mechanical, judgment-free transcription of already-approved entries into the two ledgers
  below — never a parallel worker's job. The extractor's own artifact-generation steps live in the shared
  `design-system-generator` tail (`user-invocable: false`, invoked via the `Skill` tool, never `context: fork`
  since it must dispatch agents itself): it composes `dtcg.yml` / generates css-doc-skeleton-specs-sheets-index
  through the SAME agents and scripts, carries zero user conversation and zero design judgment of its own, and
  is shared verbatim by `design-system-creator`.
- **Single writer per file.** `dtcg.yml` is written exclusively by `token-composer` — in both pipelines: the
  extractor's compose job and the completer's merge job. Each spec/sheet has exactly one producer per run.
  Never two agents into one file.
- **Dark-mode canon.** The L1 dark literal `$extensions.org.superui.dark` on a token (a complete dark
  replacement for `$value`, same shape, aliases allowed) is the ONLY dark source in `dtcg.yml`, consumed by
  `tokens_to_css.py` (`.dark` block) and surfaced in sheets via the conditional dark toggle (present only
  when dark values exist). Renaming it is a coordinated change.
- **Provenance canon.** A coordinated vocabulary across `token-composer` / `fidelity-reviewer` /
  `html-visualizer` / `check_completeness.py`, parallel to the dark canon above — renaming any of the four
  markers is a coordinated change across all four:
  - `$extensions.org.superui.synthesized: true` on a `dtcg.yml` token — written only by `token-composer`'s
    merge job on a `SYNTHESIZED-TOKENS` entry (never on `MISSING-TOKENS`, never dropped once present);
    `fidelity-reviewer` skips it; `check_completeness.py` counts it under `## Provenance facts`.
  - `**Provenance:** designed, not extracted` — a meta line on a wholly-synthesized spec; `html-visualizer`
    renders it as a visible sheet-header note; `fidelity-reviewer` skips the whole file; the fact script
    detects it.
  - `> SYNTHESIZED: <rationale>` — a section-level marker inside an otherwise-measured spec, modeled on
    `> NEEDS INPUT`; `html-visualizer` renders it with the same `.needs-input` chrome class; `fidelity-reviewer`
    skips that section only; the fact script detects it.
  - `$extensions.org.superui.provenance: designed` at the `dtcg.yml` document ROOT (sibling of the top-level
    token groups, not inside any group) — a whole-system flag, independent of the three per-item markers
    above. Written only by `token-composer`'s compose job when its dispatch carries `provenance: designed`
    (the creator's path); preserved verbatim (never dropped, never added unrequested) across every subsequent
    compose or merge job. Consumed by `fidelity-reviewer` (root marker present -> skip ALL token spot-checks
    and spec comparisons wholesale, report `system provenance: designed — comparison skipped`) and by
    `check_completeness.py` (`## Provenance facts` reports `system provenance: designed|measured (root marker
    present|absent)`). `validate_tokens.py` already ignores any `$`-prefixed top-level key in its group walk,
    so the root marker needs no validator change — confirmed by the fixture test in Task 4.
- **`completions.md` ledger + inventory `## Synthesized` ownership.** Both live under `<out>` and are owned
  exclusively by the completer's step-8 bookkeeping (never `component-scout`, never any other agent).
  `completions.md` records what was synthesized, per run, with a rationale; a re-apply pass (run after
  re-extraction) drops every `now-measured` entry and re-appends only `still-missing` approved entries.
  `inventory.md`'s `## Synthesized` section lists synthesized components/patterns (no canonical screen) next
  to `component-scout`'s measured entries. When `<out>/completions.md` already existed before an
  extractor re-run, the extractor's "Present results" step reports that the re-extraction overwrote the
  previous syntheses and suggests re-running the completer to re-validate and re-apply them — the extractor
  itself never reads or reasons about ledger content beyond that existence check.
- **Scripted artifacts are regenerated wholesale.** `tokens.css`, `index.html`, and the DESIGN.md skeleton
  are fully rewritten on re-run; hand-maintained knowledge belongs in `dtcg.yml` / the writer-filled DESIGN.md
  sections / the specs, never in generated output. The doc chrome (`docs.css`, `sheet.template.html`) is a
  fixed asset copied into the output — the documented system renders inside it through its own tokens.

## Scripts inventory

- `scripts/check_python.sh` — the Python env-check; run as an explicit early step (`sh
  "${CLAUDE_PLUGIN_ROOT}/scripts/check_python.sh"`) by every skill with a Python step — no `!` preflight.
  `PYTHON_MISSING` -> that skill stops the Python-dependent parts and points the user at `/superui:setup`.
- `scripts/sample_colors.py` — k-means palette / exact pixel sampling; `--regions` ranks named region
  backgrounds by luminance (the measured surface/elevation order).
- `scripts/validate_tokens.py` — DTCG conformance + recursive alias resolution incl. the dark extension.
- `scripts/tokens_to_css.py` — deterministic `dtcg.yml` -> `tokens.css` (`:root` + `.dark`).
- `scripts/design_md_skeleton.py` — `dtcg.yml` -> DESIGN.md skeleton (auto stats + `<!-- FILL -->`
  placeholders; heading contract, self-verified).
- `scripts/check_spec_tokens.py` — resolves every backticked token reference in the specs against
  `dtcg.yml`; exit 1 on dangling references.
- `scripts/build_index.py` — output dir -> `index.html` (narrative pulled from DESIGN.md; links
  self-verified).
- `scripts/lint_previews.py` — flags raw hex/rgb/hsl/px in sheet styles; exit 1 on violations.
- `scripts/check_contrast.py` — WCAG AA contrast gate (pro-designer).
- `skills/design-system-completer/scripts/check_completeness.py` — `dtcg.yml` (+ specs, + `completions.md` if
  present) -> a four-section facts file (tier / dark / spec-state / provenance facts); exit 1 only on
  missing/unreadable `dtcg.yml`; gaps are data, not errors, so an empty system still exits 0.
