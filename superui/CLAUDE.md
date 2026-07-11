# superui — the design / frontend ecosystem

> Dev-time orientation for **editing this plugin's source**. Like the repo root `CLAUDE.md`, it is **not a
> plugin input** — it never reaches the skills / manifest / hooks as runtime data, and the plugin reads
> host-project design knowledge from the **consuming** repo when it runs there, never from here. See the root
> `CLAUDE.md` for the repo-wide warnings and cross-plugin invariants; this file holds only what is specific to
> `superui`.

`superui` is the design / frontend ecosystem: the framework-agnostic **L1** design-system extractor and a
professional UI/UX standards advisor. It is a **single-domain** plugin, so its skills carry **no group prefix**
(the plugin name is the group) and are flat-named. It ships **no agents**. The **per-skill** catalog of record is
`.claude-plugin/plugin.json` `skills[]`; the injected manifest (`hooks/content/manifest.md`) documents the
design-artifact location, not individual skills.

## Layout (superui internals)

```
superui/
  .claude-plugin/plugin.json   The plugin manifest — skills[] is the catalog of record
  hooks/             One injected dispatcher manifest + SessionStart only (no plan gate)
    content/manifest.md  The injected `using-superui` dispatcher (`.superui/layout/` design-artifact location)
    scripts/         session-start.sh
  shared/            Plugin-level shared scripts (scripts/check_python.sh — the Python preflight,
                     `!`-injected by each superui skill that runs a Python step)
  skills/            Flat-named skills (single-domain plugin); extract-design-system bundles helper scripts,
                     pro-designer bundles references/ + a contrast script
```

## Skills (flat-named, single domain)

Two skills, each composing via CSO `description:`:

- `extract-design-system` — reverse-engineers a **framework-agnostic** design system (DTCG tokens, foundations,
  a pure-CSS `tokens.css`, and a tiered component catalog) from a folder of UI screenshots or a website URL.
  Source-only; targets no UI framework and builds no HTML mockups. Default output `.superui/layout/design-system/`.
  Bundles `scripts/{sample_colors.py, validate_tokens.py, tokens_to_css.py}` — the last one derives `tokens.css`
  deterministically from the validated YAML (no hand-written CSS).
- `pro-designer` — the cross-cutting **professional UI/UX standards** advisor (model-invocable via CSO):
  visual hierarchy, 60-30-10 color discipline, type ramps, 4/8pt spacing, accessibility,
  component states, form-validation UX, and evidence-based conversion psychology with hard anti-dark-pattern
  rules. Fires when creating, styling, or reviewing ANY interface. Bundles `references/` (color, typography,
  layout-spacing, components-states, forms, accessibility, ux-psychology, saas-dashboards, mobile, process) and
  `scripts/check_contrast.py` (WCAG AA contrast gate). Advisory only — it does not touch `.superui/layout/`;
  in a project with a documented design system there, that system takes precedence over its generic absolutes.

## Architecture invariants (superui-specific)

- **Injected manifest, no plan gate.** A single `SessionStart` hook force-injects `hooks/content/manifest.md`
  (the `using-superui` dispatcher) **verbatim** once per session (`source == "resume"` excluded; fail-open).
  Unlike superdev, superui ships **no `PreToolUse` plan gate** — its only hook is `SessionStart`. The manifest
  documents the design-artifact location, not routing.
- **Design artifacts location.** The framework-agnostic design system lives under `.superui/layout/` in the host
  project.
- **Dark-mode canon.** The L1 dark-mode literal `$extensions.org.superui.dark` on a token (a complete dark
  replacement for `$value`, same shape, aliases allowed) is the ONLY dark source in `design-tokens.yaml`,
  consumed by `tokens_to_css.py` (`.dark` block in `tokens.css`). Renaming it is a coordinated change.
- **Scripted artifacts are regenerated wholesale.** The converter output (`tokens.css`) is fully rewritten on
  re-run; hand-maintained knowledge belongs in `design-tokens.yaml`, never in the generated file.
