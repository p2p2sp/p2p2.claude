# superui — the design / frontend ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** — it never reaches the skills / manifest / hooks as runtime data, and the plugin reads
> host-project design knowledge from the **consuming** repo when it runs there, never from here. See the root
> `CLAUDE.md` for the repo-wide warnings and cross-plugin invariants; this file holds only what is specific to
> `superui`.

`superui` is the design / frontend ecosystem: the framework-agnostic **L1** design system, per-target
adaptation, web preview, the UI-edit guardian, a shareable-artifact publisher, and a user-only design-system
audit. It is a **single-domain** plugin, so its skills carry **no group prefix** (the plugin name is the group)
and are flat-named. The **per-skill** catalog of record is `.claude-plugin/plugin.json` `skills[]` + `agents[]`;
the injected manifest (`hooks/content/manifest.md`) documents the design-guardian gate + design-artifact
location, not individual skills.

## Layout (superui internals)

```
superui/
  .claude-plugin/plugin.json   The plugin manifest — skills[] + agents[] are the catalog of record
  hooks/             One injected dispatcher manifest + SessionStart only (no plan gate)
    content/manifest.md  The injected `using-superui` dispatcher (design-guardian gate + `.superui/layout/`)
    scripts/         session-start.sh
  shared/            Plugin-level shared scripts (scripts/check_python.sh — the Python preflight,
                     `!`-injected by each superui skill that runs a Python step)
  skills/            Flat-named skills (single-domain plugin); some bundle preview / helper scripts. The
                     user-only design-audit orchestrator (disable-model-invocation; deliberately out of the
                     manifest, like superdev's setup / superfix's code-auditor) bundles its two plugin agents
                     under skills/design-audit/agents/ (design-scout.md + design-detective.md — superui's ONLY
                     agents[], the code-auditor-style orchestrator pattern) plus scripts/ (collect_signals.sh,
                     rank.py, route.sh, each with a *.test.sh) and references/ (rubric-{css,js-theme,flutter,
                     agnostic}.md, scoring.md, synthesis.md)
```

## Skills (flat-named, single domain)

The design skills form an L1 → target → preview → guard pipeline, each composing via CSO `description:`:

- `extract-design-system` — reverse-engineers a **framework-agnostic** design system (DTCG tokens, foundations,
  a pure-CSS `tokens.css`, and a tiered component catalog) from a folder of UI screenshots or a website URL.
  Source-only; targets no UI framework and builds no HTML mockups. Default output `.superui/layout/design-system/`.
- `create-component` — authors a **net-new** component into an existing agnostic system (describe → agnostic
  spec → minimal pure-CSS single-component preview → catalog entry). Strictly L1; MUST NOT depend on `web-preview`.
- `adapt-target` — adapts the L1 agnostic system onto **ONE** concrete UI target (pure-css / tailwind /
  react-shadcn / react-mui / flutter), writing `targets/<target>/`. Incremental and idempotent; never invents
  components absent from the L1 inventory.
- `web-preview` — renders live, zero-build **HTML** preview pages from an adapted **web** target (pure-css /
  tailwind / react-shadcn): index, layout pages, app pages, per-component showcases, dark/light toggle. N/A for
  react-mui / flutter (previewed with their own tooling).
- `design-guardian` — the **UI-edit guardian**: fires before any `Edit`/`Write` touching UI in a project whose
  design system has already been adapted to a target, binding the edit to the documented tokens / components /
  foundations and the three-path gap policy instead of improvising.
- `cc-artifact` — the distinct **Claude-Code-platform publisher**: publishes ONE already-written self-contained
  `.html`/`.md` as a private, shareable Claude Code Artifact. Opt-in, main-session only, fail-open; does NOT
  generate the file and is never invoked from a fork or an automated pipeline.
- `design-audit` — the **user-only** design-system audit orchestrator (`disable-model-invocation`, deliberately
  outside the manifest). A code-auditor-style orchestrator: deterministic signal sweep (`scripts/collect_signals.sh`)
  → cheap `design-scout` scoring fan-out → deterministic gate/rank (`scripts/rank.py`) → frontier
  `design-detective` dispatch → verified synthesis. Its two plugin agents are superui's **only** `agents[]`:
  - `design-scout` — cheap haiku scorer (breadth-first triage; spawn many).
  - `design-detective` — frontier opus investigator (depth-first; spawn few).
- `pro-designer` — the cross-cutting **professional UI/UX standards** advisor (model-invocable via CSO, outside
  the L1 pipeline): visual hierarchy, 60-30-10 color discipline, type ramps, 4/8pt spacing, accessibility,
  component states, form-validation UX, and evidence-based conversion psychology with hard anti-dark-pattern
  rules. Fires when creating, styling, or reviewing ANY interface. Bundles `references/` (color, typography,
  layout-spacing, components-states, forms, accessibility, ux-psychology, saas-dashboards, mobile, process) and
  `scripts/check_contrast.py` (WCAG AA contrast gate). Advisory only — it does not touch `.superui/layout/` and
  is not part of the L1 → target → preview → guard chain.

## Architecture invariants (superui-specific)

- **Injected manifest, no plan gate.** A single `SessionStart` hook force-injects `hooks/content/manifest.md`
  (the `using-superui` dispatcher) **verbatim** once per session (`source == "resume"` excluded; fail-open).
  Unlike superdev, superui ships **no `PreToolUse` plan gate** — its only hook is `SessionStart`. The manifest's
  live rule is the **design-guardian gate**: before any `Edit`/`Write` touching UI in an adapted project, bind
  to the documented tokens first via `design-guardian`.
- **Design artifacts location.** The framework-agnostic design system and its target adaptations live under
  `.superui/layout/` in the host project.
