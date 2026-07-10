---
name: design-guardian
description: Use when a design system has been adapted to a target (a targets/<chosen>/ directory produced by superui:adapt-target) and the user intent touches UI implementation — building a component, editing a page, restyling, theming, or fixing a layout. Triggers - "build a component", "edit this page", "add a form", "restyle the header", "implement the UI", a path under .superui/layout/design-system/, a reference to design tokens, a target.md, a theme artifact, or a component spec, or any Edit/Write target whose extension matches the active target's idiom. Fires before any Edit/Write touching UI so the agent is bound to documented tokens, components, foundations rules, and the three-path gap policy. In a project with no adapted target it does not gate — it says so in one sentence and lets the edit proceed. Distinct from superui:extract-design-system (which authors the agnostic system), superui:adapt-target (which adapts it to a target), and superui:web-preview (which renders HTML previews).
---

# Design System Guardian

## Overview

This skill guards UI edits against design-system drift: before markup or CSS changes in an adapted project, it loads a verbatim **discipline brief** built from the documented tokens, components, and foundations, so the edit is grounded in the documented system instead of improvised values.

**Violating the letter of the rule is violating the spirit of the rule.**

## Unadapted project -> pass through (check FIRST)

Resolve the root (procedure under Inputs). The project is NOT adapted when either holds:

- no `.superui/layout/` exists anywhere on the resolution path, or
- `.superui/layout/design-system/` exists (an L1 system) but no `targets/<t>/target.md` exists for any target.

Then do NOT gate:

1. Tell the user in one sentence that the project has no design system adapted to a target (optionally suggest `superui:adapt-target`).
2. Let the edit proceed normally — no brief, no discipline requirements.

## The Iron Law

```
IN AN ADAPTED PROJECT: NO UI MARKUP OR CSS WITHOUT THE DISCIPLINE BRIEF IN CONTEXT.
```

The law binds ONLY a project whose design system has already been adapted to a target (at least one `targets/<t>/target.md` exists). There, markup or CSS without the brief? Delete. Load. Restart. In an unadapted project the law does not apply — take the pass-through above.

## When to Use

Before any Edit/Write touching UI — components, pages, layouts, markup, theme CSS. ESPECIALLY when small.

Do NOT trigger for pure-logic frontend — hooks, reducers, validators, tests. No JSX/HTML/CSS -> skip.

## Inputs — design-system contract

### Resolve the root

1. An explicit design-system path given in the user's prompt wins. Use it as-is.
2. Otherwise walk UP the directory tree, starting from the directory of the file being edited, one level at a time up to the repo root. The first directory containing `.superui/layout/` wins; the contract root is `<that dir>/.superui/layout/design-system/`.
3. Nothing found up to the repo root -> unadapted project; take the pass-through path above.

### Read the contract (paths relative to the resolved root)

- Tokens — `design-tokens.yaml`, semantic tier only. Collect token NAMES, not values -> `{TOKEN_NAMES}`. If no semantic tier exists, collect primitive-tier token names instead and record that fact in `{THEMING_NOTE}` (see below).
- Foundations — `foundations.md`. Extract the body of the section `## 6. Patterns & usage / consistency rules` -> `{PATTERNS_AND_CONSISTENCY_VERBATIM}`. If that exact heading is absent, use the first section whose heading contains "Patterns". If no such section exists either, put the ENTIRE `foundations.md` into the placeholder. Never emit the brief with `{PATTERNS_AND_CONSISTENCY_VERBATIM}` empty.
- Inventory — `components/inventory.md` -> `{INVENTORY}`.
- Active target — `targets/<chosen>/target.md`. The manifest names the target and its theme-artifact filename -> `{TARGET}`. Exactly one `targets/<t>/target.md` -> that target is active. More than one -> ask the user which target is active before building the brief. None -> unadapted; pass-through path. No per-stack knowledge is baked into this skill — the target manifest is the only source.
- Mapping — `targets/<chosen>/components.md`, the per-target component realization (markup/import) -> `{COMPONENT_MAPPING}`.

### How to fill {THEMING_NOTE}

Build it from the active `target.md`:

1. `target.md` declares a theme-artifact filename -> write: "Theme values (light/dark) live in `<that filename>`; reference them, never restate raw values."
2. `design-tokens.yaml` has no semantic tier -> append: "No semantic token tier exists; use primitive token names directly, never raw values."
3. `target.md` declares no theme artifact -> write: "No theme artifact declared for this target; treat any theming need as a gap under the three-path policy."

## The Process

1. Resolve the root. Unadapted -> pass through and stop here.
2. Read tokens, the foundations patterns section, and the inventory.
3. Resolve the active target from `targets/<chosen>/target.md` (ask when several) and read its `components.md`.
4. Fill every placeholder in the brief template; `{PATH}` is the resolved contract root.
5. Emit the brief verbatim into context, then proceed with the edit under it.

Out of scope: extraction, target adaptation, previews, token proposal.

## The Brief Template

```
# Design System Discipline Brief

Source: {PATH}
Active target: {TARGET}

## Semantic tokens
{TOKEN_NAMES}

## Component inventory
{INVENTORY}

## Target component mapping
{COMPONENT_MAPPING}

## Foundations — patterns & consistency rules (verbatim)
{PATTERNS_AND_CONSISTENCY_VERBATIM}

## Theming note
{THEMING_NOTE}

## Meta-discipline
- Use tokens by name. No raw values.
- Compose from inventory. No invented variants.
- Honor every foundations rule.

## Three-path gap policy
Missing value/variant/component -> pick ONE path, announce it:
1. Reuse (default) — bend the edit to the nearest existing documented token/component. Choose when an existing entry is a close fit.
2. Extend — stop; propose the addition upstream via superui:extract-design-system. Choose when the gap is systemic and will recur beyond this edit.
3. Document — choose when the edit cannot wait and nothing close fits. As the temporary value, apply the nearest existing documented token (as in Reuse) — never a raw literal. Leave a comment reading NEEDS INPUT: <what is missing> in the edited file's own comment syntax, exactly at the edited spot, AND repeat the same note in the final answer to the user as `> NEEDS INPUT: <what is missing>`.

User override: when the user EXPLICITLY demands a specific raw value ("exactly #FF0000"), the user's authority wins — apply the requested value as given and note in the final answer that it deviates from the design system. Do not argue.

Silent invention IS drift.
```

## Red Flags — STOP (adapted project only)

- "Just one hardcoded color."
- "Too simple to look up."
- "Overkill here."
- "Align later."
- "I remember the token."

Load the brief.

## Common Rationalizations

- "One hardcode is faster." Reality: drift compounds.
- "Skip inventory." Reality: ad-hoc IS the gap.
- "Foundations are guidance." Reality: verbatim is law.
- "Add token inline." Reality: authoring belongs upstream.
- "Dark mode later." Reality: theming is contract.
- "Checked inventory mentally." Reality: mental checks drift.

## Checklist

- [ ] Brief in context, from disk.
- [ ] Every color/radius/spacing/shadow/font-size = a token.
- [ ] Every component in `{INVENTORY}`; gaps via the three-path policy.
- [ ] Every `{PATTERNS_AND_CONSISTENCY_VERBATIM}` rule honored.
- [ ] Theming respects `{THEMING_NOTE}`.
- [ ] No silent invention.

Can't check every box? You skipped the discipline. Start over.
