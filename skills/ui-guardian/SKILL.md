---
name: ui-guardian
description: Use when a design system exists on disk (default .docs/layout/design-system/) and the user intent touches UI implementation — building a component, editing a page, restyling, theming, or fixing a layout. Triggers - "build a component", "edit this page", "add a form", "restyle the header", "implement the UI", a path under .docs/layout/design-system/, a reference to design tokens, theme.css, globals.css, or a component spec, or any Edit/Write target with extension .tsx/.jsx/.vue/.svelte/.html/.css. Fires before any Edit/Write touching UI so the agent is bound to documented tokens, components, foundations rules, and the three-path gap policy. Distinct from ui-extract (which authors the system) and ui-mockup (which renders HTML previews).
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
| Root | `.docs/layout/design-system/` | Prompt overrides. |
| Monorepo | — | Default absent ⇒ `Glob **/design-system/foundations.md`; nearest; many ⇒ ask. |
| Tokens | `design-tokens.yaml` semantic tier | Names only; absent ⇒ primitives via `{THEMING_NOTE}`. |
| Foundations | `foundations.md` → `## 6. Patterns & usage / consistency rules` | Body ⇒ `{PATTERNS_AND_CONSISTENCY_VERBATIM}`. |
| Inventory | `components/inventory.md` | ⇒ `{INVENTORY}`. |
| Flavor | `theme.css` / `globals.css` | `theme.css` ⇒ Tailwind v4; `globals.css` ⇒ shadcn; both ⇒ ask. |

## The Process

Resolve root → read tokens, `foundations.md` §6, inventory → detect flavor → fill Brief → emit → exit. Out of scope: extraction, mockups, token proposal.

## The Brief Template

```
# Design System Discipline Brief

Source: {PATH}
Flavor: {FLAVOR}

## Semantic tokens
{TOKEN_NAMES}

## Utility class hints
{UTILITY_CLASS_HINTS}

## Component inventory
{INVENTORY}

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
2. **Extend** — stop; propose via ui-extract.
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

- **ui-extract** — authors the system; for Extend or creation.
- **ui-mockup** — renders the system as HTML.
