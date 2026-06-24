---
name: ui-guardian
description: Use when a design system has been adapted to a target (a targets/<chosen>/ directory produced by ui-adapt) and the user intent touches UI implementation — building a component, editing a page, restyling, theming, or fixing a layout. Triggers - "build a component", "edit this page", "add a form", "restyle the header", "implement the UI", a path under .superui/layout/design-system/, a reference to design tokens, a target.md, a theme artifact, or a component spec, or any Edit/Write target whose extension matches the active target's idiom. Fires before any Edit/Write touching UI so the agent is bound to documented tokens, components, foundations rules, and the three-path gap policy. Distinct from ui-extract-system-design (which authors the agnostic system), ui-adapt (which adapts it to a target), and ui-web-preview (which renders HTML previews).
---

# Design System Guardian

## Overview

A design system stops being a contract the moment UI work hardcodes. Binds UI work via a verbatim **discipline brief**.

**Violating the letter of the rule is violating the spirit of the rule.**

## The Iron Law

```
NO UI MARKUP OR CSS WITHOUT THE DISCIPLINE BRIEF IN CONTEXT.
```

Markup or CSS without brief? Delete. Load. Restart.

## When to Use

Before any Edit/Write touching UI — components, pages, layouts, markup, theme CSS. ESPECIALLY when small.

Do NOT trigger for pure-logic frontend — hooks, reducers, validators, tests. No JSX/HTML/CSS ⇒ skip.

## Inputs — design-system contract

| Source | Default | Behavior |
|--------|---------|----------|
| Root | `.superui/layout/design-system/` | Prompt overrides. |
| Monorepo | — | Default absent ⇒ `Glob **/design-system/foundations.md`; nearest; many ⇒ ask. |
| Tokens | `design-tokens.yaml` semantic tier | Names only; absent ⇒ primitives via `{THEMING_NOTE}`. |
| Foundations | `foundations.md` → `## 6. Patterns & usage / consistency rules` | Body ⇒ `{PATTERNS_AND_CONSISTENCY_VERBATIM}`. |
| Inventory | `components/inventory.md` | ⇒ `{INVENTORY}`. |
| Target | `targets/<chosen>/target.md` | The active-target manifest names the target + its theme-artifact filename ⇒ `{TARGET}`; absent ⇒ system not adapted, send to ui-adapt; many ⇒ ask which is active. No per-stack knowledge baked here — the manifest is the only source. |
| Mapping | `targets/<chosen>/components.md` | The per-target component realization (markup/import) ⇒ `{COMPONENT_MAPPING}`. |

## The Process

Resolve root → read tokens, `foundations.md` §6, inventory → resolve the active target from `targets/<chosen>/target.md` (+ its `components.md`) → fill Brief → emit → exit. Out of scope: extraction, target adaptation, previews, token proposal.

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
Missing value/variant/component ⇒ pick one, announce:
1. **Reuse** — bend to existing (default).
2. **Extend** — stop; propose via ui-extract-system-design.
3. **Document** — `Needs design-system input: <what is missing>`.
Silent invention IS drift.
```

## Red Flags — STOP

- "Just one hardcoded color."
- "Too simple to look up."
- "Overkill here."
- "Align later."
- "I remember the token."

Load the brief.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "One hardcode is faster" | Drift compounds. |
| "Skip inventory" | Ad-hoc IS the gap. |
| "Foundations are guidance" | Verbatim is law. |
| "Add token inline" | Authoring belongs upstream. |
| "Dark mode later" | Theming is contract. |
| "Checked inventory mentally" | Mental checks drift. |

## Checklist

- [ ] Brief in context, from disk.
- [ ] Every color/radius/spacing/shadow/font-size = a token.
- [ ] Every component in `{INVENTORY}`; gaps via three-path policy.
- [ ] Every `{PATTERNS_AND_CONSISTENCY_VERBATIM}` rule honored.
- [ ] Theming respects `{THEMING_NOTE}`.
- [ ] No silent invention.

Can't check every box? You skipped the discipline. Start over.

## Related skills

- **ui-extract-system-design** — authors the agnostic L1 system; for Extend or creation.
- **ui-adapt** — adapts the agnostic system to the active target; produces the `targets/<chosen>/` contract this skill reads. Run it first if no `target.md` exists.
- **ui-web-preview** — renders the active target as HTML.
