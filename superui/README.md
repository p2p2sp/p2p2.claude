# superui

The design / frontend ecosystem for Claude Code. One thing it does: hold every interface you build to
professional UI/UX standards.

Ships no hooks, no manifest and no agents - one skill, `pro-designer`, reached automatically whenever you
touch an interface.

## Install

```
claude plugin marketplace add https://github.com/p2p2sp/p2p2.claude --scope user
claude plugin install superui@p2p2 --scope user
```

**Node.js >= 22.6** (`node` on PATH) is optional - it powers the bundled WCAG contrast checker, a TypeScript
script run directly by Node's native type stripping (on 22.6-23.5 the skill adds `--experimental-strip-types`
automatically; from 23.6 plain `node` suffices). No `npm install`, no packages, no build step. Without Node
the contrast check is skipped with a note and the rest of the review continues.

## Quick start

Just build. `pro-designer` fires by itself whenever you create, style or review any interface - a page,
screen, dashboard, form, onboarding flow, landing page, navigation or a single component - even when you
only say "add a settings page" and never mention design. It also fires when you ask for a critique, add
animations, or say a UI looks generic or AI-generated.

It is advisory: visual hierarchy, color discipline, type ramps, 4/8pt spacing, accessibility, component
states, form-validation UX, evidence-based conversion psychology with hard anti-dark-pattern rules,
purposeful motion, and aesthetic direction that refuses the recognizable generated look.

## Skills

| Skill | Role |
| --- | --- |
| `pro-designer` | Professional UI/UX standards - fires when creating, styling or reviewing any interface. Advisory only. |

See `CLAUDE.md` in this directory for the architecture.
