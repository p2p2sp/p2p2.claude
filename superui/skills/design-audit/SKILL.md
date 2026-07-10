---
name: design-audit
description: >-
  Prioritized, multi-agent audit of how faithfully a project uses its adapted superui design system. Two waves. Wave 1 — compliance: sweep the UI code for drift from the system (raw hex/px values, off-theme or arbitrary classes, undocumented custom properties, inline styles, invented component variants) and classify each finding as Drift (maps onto a documented token/component — replace it) or Gap (no documented equivalent — a candidate system extension). Wave 2 — component library: find base components re-implemented and scattered across the app (Type I, in the inventory) and recurring component-like patterns absent from the reference system (Type II), then propose extracting a sibling library referenced from a directory next to the project, plus authoring the missing reference components. Idiom-aware — it distinguishes web (CSS/markup, MUI theme-object) from Flutter (widgets/ThemeData), driven by the active target. Output is ONE markdown report; it changes no code. User-only: run it deliberately with `/superui:design-audit`. Triggers: "audit the design system usage", "check design-system compliance", "find style drift across the app", "which components should we extract into a library".
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash(sh:*) Bash(bash:*) Bash(python:*) Bash(python3:*) Bash(py:*) Bash(mkdir:*) Bash(date:*)
---

# Design Audit — design-system compliance + component-library investigation

## Python preflight

!`sh "${CLAUDE_PLUGIN_ROOT}/shared/scripts/check_python.sh"`

The line above runs the Python check at load. If it reads `PYTHON_MISSING`, tell the user the ranking step needs **Python 3** (install it; on Windows make sure `python` or `py` is on `PATH`) and **stop before the `rank.py` step**. If it reads `PYTHON_OK <cmd>`, use `<cmd>` in place of `python` in every `python …` command below.

## The one law

Every UI file gets a single score: `score = Impact × Opportunity`.

- Impact — how central/visible the surface (shared component, high-traffic screen, many importers).
- Opportunity — how much drift is present and how mechanically fixable it is now.

Cheap `design-scout` agents score everything (breadth); a deterministic gate keeps only the top-right corner; frontier `design-detective` agents investigate the survivors (depth). Orchestration state lives in files under a workspace dir, never bloating the main context — that is what lets this scale.

## Operating principles

- **Read-only.** You audit; you change no application code, tokens, or components, and you scaffold nothing. The only writes are the report and the `.temp/` workspace.
- **The design system on disk is the source of truth.** Semantic names in `tokens.css` / `design-tokens.yaml`, the `## 6. Patterns & usage / consistency rules` of `foundations.md`, `components/inventory.md`, and the active target's `targets/<chosen>/components.md`. Never judge against memory.
- **Idiom-aware.** The active target selects one rubric family; the definition of a raw value, an off-theme class, and a component differs entirely between web and Flutter. Inject the active rubric; do not apply CSS rules to Dart.
- **Two buckets, always.** Every Wave 1 finding is Drift (documented equivalent exists — name the replacement) or Gap (none — a candidate extension, routed upstream, never a mechanical swap).
- **Thin harness.** Keep deterministic code to cheap signal collection + ranking; leave all judgment to the agents.

## Arguments

```
/superui:design-audit [--recurrence N] [--scope <pathspec>] [--root <design-system-root>]
```

- `--recurrence N` (default 3): Wave 2 Type II threshold (a pattern must recur in >= N places). Type I always uses 2.
- `--scope <pathspec>`: limit the sweep to a subtree (e.g. `src/features`); default is the whole repo minus vendor/build.
- `--root <path>`: override the default design-system root `.superui/layout/design-system/`.

## Idiom families (from `targets/<chosen>/target.md`)

- `pure-css`, `tailwind`, `react-shadcn` → family `css`
- `react-mui` → family `js-theme`
- `flutter` → family `flutter`
- no target adapted → family `agnostic` (degraded: token/variant checks only, idiom checks skipped)

## Workflow

### Phase 0 — Frame & preconditions
1. Resolve the design-system root (default `.superui/layout/design-system/`; `--root` overrides; in a monorepo where the default is absent, `Glob **/design-system/foundations.md`, take the nearest, ask if several).
2. **Hard stop if the system is missing.** If `tokens.css` or `components/inventory.md` is absent, do NOT create a workspace or a report — tell the user the design system has not been extracted and route them to `superui:extract-design-system`. Stop.
3. Create the workspace with a timestamp run-id:
   ```bash
   RUN_ID="$(date +%Y%m%d-%H%M%S)"
   mkdir -p .temp/superui-audit/"$RUN_ID"/{signals,scores,reports,hotlist}
   ```
4. Resolve the active target: count `targets/*/target.md`. Zero → family `agnostic` (note it in the report, suggest `superui:adapt-target`). One → derive the family from its target. Several → `AskUserQuestion` which target is active, then use it.

### Phase 1 — Sweep (cheap, deterministic signals)
```bash
bash "${CLAUDE_SKILL_DIR}/scripts/collect_signals.sh" <family|agnostic> . [--scope <pathspec>] \
  > .temp/superui-audit/"$RUN_ID"/signals/signals.jsonl
```
One JSON line per UI file with `raw_value_hits`, `class_hits`, `inline_style_hits`, `loc`. These are priors for the scouts, not the score.

### Phase 2 — Load the active rubric
```bash
bash "${CLAUDE_SKILL_DIR}/scripts/route.sh" <family|agnostic>
```
Capture its stdout — the active idiom rubric. Pass it verbatim into every scout and detective prompt. (Runtime, not a load-time inject: the family is only known after Phase 0.)

### Phase 3 — Score (fan out scouts, cheap model)
For each file (or batch of 5-15 for a large tree, 1 for a hot module), spawn a `design-scout` (Task tool, `subagent_type: superui:design-scout`) — parallel, tens at a time is normal. Give each: the file path(s), the matching signal line(s), the active rubric, and a short excerpt of the semantic token names + `inventory.md`. The scoring anchors are baked into the agent definition — do not paste them into the prompt. Each returns one strict JSON line per file; append to `.temp/superui-audit/"$RUN_ID"/scores/scores.jsonl`.

### Phase 4 — Gate (rank, build the hotlist)
```bash
python "${CLAUDE_SKILL_DIR}/scripts/rank.py" \
  --scores  .temp/superui-audit/"$RUN_ID"/scores/scores.jsonl \
  --signals .temp/superui-audit/"$RUN_ID"/signals/signals.jsonl \
  --min-impact 3 --min-opportunity 3 --top 20 --run-id "$RUN_ID" \
  --out-json .temp/superui-audit/"$RUN_ID"/hotlist/hotlist.json \
  --out-md   .temp/superui-audit/"$RUN_ID"/hotlist/hotlist.md
```
Show `hotlist.md` to the user before spending frontier detectives. Besides the dispatched hotspots it carries three coverage sections: `beyond_cut` (hotspots that cleared the gate but fell past `--top` — not dispatched; the user can override and add them), `skipped` (non-hotspot quadrants), and `unscored` (swept files that never got a scout score — a coverage hole to rescore). Nothing from the sweep disappears silently.

### Phase 5 — Dispatch detectives (frontier model, top-N only)
Group the hotlist's hotspots by `cluster_hint` first: hotspots sharing a non-empty `cluster_hint` form ONE cluster — spawn a single `design-detective` for it, with the highest-ranked path as the entry point and the remaining cluster paths listed as known sibling occurrences (Wave 2 evidence). Each hotspot with an empty `cluster_hint` gets its own detective. Spawn via Task tool, `subagent_type: superui:design-detective`. Give each: the entry-point hotspot (plus any cluster siblings), the active rubric, the design-system paths (`tokens.css`, `inventory.md`, active `components.md`), the recurrence threshold (`--recurrence`, default 3), and the report output path `.temp/superui-audit/"$RUN_ID"/reports/<rank>-<slug>.md`. It confirms each finding against the on-disk system, classifies Drift/Gap, groups Wave 2 candidates, and writes its report (or `NO FINDING`).

### Phase 6 — Synthesize (one report)
Read `references/synthesis.md`. Deduplicate Wave 1 findings (by token/value) and Wave 2 candidates (by component identity), build the extraction blueprint for the active family (or the agnostic variant), and assemble ONE report at `.superui/layout/audit/design-audit-<RUN_ID>.md`. Then give the user its path. Keep the chat message short: files swept, hotspots, Drift/Gap counts, library candidates, and any target/agnostic caveat.

### Open new fronts (optional)
If a detective confirms a drift class (e.g. one raw shadow value that should be a token), spawn a fresh scout wave for that same pattern across the rest of the repo. Stop when new waves stop producing hotspots; record in the report which areas got only a shallow pass so it never reads as a false "all clear".

## Output the user sees
- `.temp/superui-audit/<run-id>/hotlist/hotlist.md` — the ranked triage table: dispatched hotspots, "Beyond the cut" (gate-clearing hotspots past `--top`, overridable), the skipped quadrants, and the unscored files (coverage holes).
- `.superui/layout/audit/design-audit-<run-id>.md` — the single final report (Wave 1 + Wave 2 + extraction blueprint + next steps); give the user this path.

## Reference files
- `references/scoring.md` — the 1-5 Impact/Opportunity anchors, the per-axis 2x2 gate (`--min-impact` / `--min-opportunity`), the scout JSON shape, the hotlist schema (hotspots + beyond_cut + skipped + unscored).
- `references/synthesis.md` — the detective report schema (Drift/Gap + Type I/II + CONFIDENCE + the CHECKED tail), confirm-against-disk, dedup, the final-report structure, and the extraction blueprint (per family + agnostic variant).
- `references/rubric-css.md` · `rubric-js-theme.md` · `rubric-flutter.md` · `rubric-agnostic.md` — the per-family drift rubrics, injected by `route.sh`.

## Subagents this skill drives
Dispatched via the Task tool with a plugin-namespaced `subagent_type`:
- `superui:design-scout` — cheap breadth-first scorer (spawn many).
- `superui:design-detective` — frontier depth-first investigator (spawn few).

## Related skills
- **superui:extract-design-system** — authors the agnostic L1 system; the hard-stop target when no system exists, and the route for Wave 1 Gaps / Wave 2 Type II.
- **superui:adapt-target** — adapts the system to one target; the route when no `target.md` exists (agnostic mode).
- **superui:create-component** — authors a net-new reference component; the route for a Wave 2 Type II pattern.
- **superui:design-guardian** — the per-edit gate; this skill is its repo-wide, after-the-fact counterpart.
