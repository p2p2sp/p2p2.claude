---
name: pro-designer
description: Professional UI/UX design standards for web apps, SaaS products and mobile apps - visual hierarchy, color-system discipline (neutral foundation, dark mode, accent scales), type scales, 8pt spacing, accessibility, component states, form validation UX, evidence-based conversion psychology with hard anti-dark-pattern rules, and distinctive aesthetic direction that avoids the generic AI-generated look. Use whenever creating, styling or reviewing ANY user interface - a page, screen, dashboard, form, onboarding or pricing flow, landing page, navigation, or a single component - even if the user only says "build/add/fix" and never says "design". Also use when critiquing existing UI, choosing colors, fonts, spacing, or layout, or when a UI looks generic, templated, or AI-generated.
allowed-tools: Bash(sh:*), Bash(node:*)
---

# Professional UI Design

UI is attention management, not decoration. A professional interface is transparent: color, size and space each carry one deliberate signal, so the user never guesses where to look or what to do next. Amateur UI fails by shouting everywhere at once; senior UI fails nothing - it removes until only the signal remains.

## Surface mode - name the visitor's success first

Before any design decision, name what the visitor's success looks like on THIS surface. Choose from the requested surface, not the product: a tool's landing page is still Persuade; a fashion brand's docs are still Read.

- **Persuade** - the visitor decides and acts: landing pages, marketing, pricing. Design earns attention and action.
- **Operate** - the visitor completes a task: app UI, dashboards, forms, settings, admin. Scanability, consistency and platform expectations outrank expression; brand lives in precise details.
- **Read** - the visitor understands something: docs, articles, help, changelogs. Structure for comprehension first, then make staying worth it.
- **Experience** - the visitor is inside the work itself: portfolios, galleries, showcases. The artifact leads from the first viewport; the interface recedes.

## Design pass - apply in this order

1. **Aesthetic direction** - only for a new surface with no established design system: ground the direction in the subject, refuse the AI-default looks (`references/anti-slop.md`), pick one signature element -> `references/distinctiveness.md`
2. **Layout skeleton** - spacing scale, grouping, grid, max-width -> `references/layout-spacing.md`
3. **Hierarchy & type** - one focal point per screen, fixed type ramp, mute labels / amplify values -> `references/typography.md`
4. **Color** - neutral foundation + elevation, a scarce 100-900 accent scale, dark mode by physiology, OKLCH theming -> `references/color.md`
5. **Components & states** - loading/empty/error designed, soft elevation, card anatomy -> `references/components-states.md`
6. **Flow psychology** - only on conversion surfaces (onboarding, signup, upgrade, pricing) -> `references/ux-psychology.md`
7. **QA** - checklist below + contrast script; never ship on "looks fine".

## Non-negotiables - every screen

- One primary CTA per screen; the accent color appears **only** where interaction is required - a scarce functional signal, not a surface fill.
- Text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI components). Run `"${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.ts"` with the command `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_node.sh"` resolves - never eyeball it. `NODE_MISSING` -> skip the check with a clear note and point the user at `/superui:setup`.
- Every spacing and component size sits on the 4/8px scale. Space between groups > space within groups; padding ≤ surrounding margin.
- Font sizes only from the type ramp. Body 16px / line-height 1.5, line length ≤ 75ch. Hierarchy via size + weight + color - never by adding typefaces.
- Red and green are reserved for system error/success states. Never decorative, never red logout.
- Every interactive element has visible hover, `:focus-visible`, and disabled states. No `outline: none` without an equal replacement.
- Every async view exists in at least 3 designed states: loading, empty, error.
- Color is never the only signal - pair it with icon, text, or underline.
- Touch targets: web ≥ 24×24 CSS px (WCAG AA legal floor), iOS ≥ 44×44 pt, Android ≥ 48×48 dp. Design anything a finger touches to 44-48px, not the web floor.
- In data display the value dominates, the label is muted - never equal weight.
- Demo content is real content: no Acme/John Doe/Lorem Ipsum, no fake round numbers (47.2%, not 50%), no cliche marketing verbs (Elevate, Seamless, Unleash). Full tells catalog in `references/anti-slop.md`.
- No dark patterns: no fake urgency, scarcity, progress, or anchors; defaults never work against the user. Full rules in `references/ux-psychology.md`.
- HARD RULE: never output an em dash (U+2014) or an en dash (U+2013) anywhere - not in UI copy, microcopy, code, comments, or reports. Always use a plain hyphen (-).

## Design-system precedence

When the project already defines its own design system - a token set, a design spec, or documented brand/UI guidelines - those authoritative values override this skill's generic absolutes: apply the project's own type ramp, spacing scale, and color system, never a second one alongside them. This skill stays advisory: it reasons about the project's system, never overwrites it.

## Scope discipline

- **The brief wins.** Honor aesthetics, eras, fonts, and palettes the user pinned - even when they conflict with this skill's anti-generic warnings. Redirecting a clear brief toward your own taste is failure; only accessibility and anti-dark-pattern rules stay non-negotiable.
- **Refinement preserves; redesign replaces.** Refinement keeps the incumbent identity, behavior, and copy, touching only what is in scope - ask before rewriting factual copy or adding claims. Redesign keeps product truth, content, and function, but treats the old look as evidence and anti-reference. Never split the difference into polish on a discarded look.

## Reference routing

- Aesthetic direction for a new surface, signature elements, UI copy/microcopy voice, consistency locks (radius/gray/theme/accent/register) -> `references/distinctiveness.md`
- UI that looks generic, templated, or AI-generated; hero composition; landing/marketing pages before shipping; demo data, placeholder names, marketing copy -> `references/anti-slop.md`
- Onboarding, signup, upgrade, pricing, paywalls, conversion flows -> `references/ux-psychology.md`
- Choosing/using colors, palettes, dark mode -> `references/color.md`
- Headings, body text, data/number display, form text conventions -> `references/typography.md`
- Page layout, spacing, responsive breakpoints, grids, navigation structure -> `references/layout-spacing.md`
- Contrast, focus states, non-color cues, target sizes -> `references/accessibility.md`
- Cards, badges, shadows, loading/empty/error/disabled states, optimistic UI, overlays (modal/drawer/popover), motion timing -> `references/components-states.md`
- Any form: fields, validation, error copy, smart defaults -> `references/forms.md`
- Dashboards, KPI tiles, data tables, charts, SaaS app chrome, sidebar, billing, landing pages and hero layouts -> `references/saas-dashboards.md`
- Mobile app UI, bottom navigation, touch ergonomics -> `references/mobile.md`
- Design process, wireframes, developer handoff specs -> `references/process.md`

## Final QA

- **Squint test**: blur your eyes - the primary CTA must be the only element that pops.
- **Contrast**: resolve the `node` command via `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_node.sh"` first (`NODE_MISSING` -> skip with a note and point at `/superui:setup`), then run `<resolved node cmd> "${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.ts" FG BG [TYPE] [FG BG [TYPE] ...]` for every text/background and component/background pair. TYPE = `normal` (default, 4.5:1) | `large` (3:1) | `ui` (borders/icons/focus, 3:1) - exit 1 means a pair failed the AA threshold for its own type; exit 2 means bad input or usage (an out-of-range color, a malformed JSON record, or no args).
- **States inventory**: hover, focus, disabled, loading, empty, error - all present?
- **Detail rule**: if a detail is too small or too faint to notice, delete it instead of keeping it faint.
- **Template test** (new surfaces only): would this exact palette + type + hero combination ship for any similar brief? If yes, it is a default, not a decision - revise the generic part (`references/distinctiveness.md`).
- **Bounded passes**: verify in batches, not an open loop - build fully, inspect once (desktop and mobile together), fix everything found in one batch, confirm with at most one more round, then stop polishing. Open-ended self-QA burns effort without improving the result.
