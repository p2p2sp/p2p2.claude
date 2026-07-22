---
name: pro-designer
description: Professional UI/UX design standards for web apps, SaaS products and mobile apps — visual hierarchy, color-system discipline (neutral foundation, dark mode, accent scales), type scales, 8pt spacing, accessibility, component states, form validation UX, and evidence-based conversion psychology with hard anti-dark-pattern rules. Use whenever creating, styling or reviewing ANY user interface — a page, screen, dashboard, form, onboarding or pricing flow, landing page, navigation, or a single component — even if the user only says "build/add/fix" and never says "design". Also use when critiquing existing UI or choosing colors, fonts, spacing, or layout.
allowed-tools: Bash(sh:*), Bash(node:*)
---

# Professional UI Design

UI is attention management, not decoration. A professional interface is transparent: color, size and space each carry one deliberate signal, so the user never guesses where to look or what to do next. Amateur UI fails by shouting everywhere at once; senior UI fails nothing — it removes until only the signal remains.

## Design pass — apply in this order

1. **Layout skeleton** — spacing scale, grouping, grid, max-width -> `references/layout-spacing.md`
2. **Hierarchy & type** — one focal point per screen, fixed type ramp, mute labels / amplify values -> `references/typography.md`
3. **Color** — neutral foundation + elevation, a scarce 100-900 accent scale, dark mode by physiology, OKLCH theming -> `references/color.md`
4. **Components & states** — loading/empty/error designed, soft elevation, card anatomy -> `references/components-states.md`
5. **Flow psychology** — only on conversion surfaces (onboarding, signup, upgrade, pricing) -> `references/ux-psychology.md`
6. **QA** — checklist below + contrast script; never ship on "looks fine".

## Non-negotiables — every screen

- One primary CTA per screen; the accent color appears **only** where interaction is required — a scarce functional signal, not a surface fill.
- Text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI components). Run `"${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.ts"` with the command `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_node.sh"` resolves — never eyeball it. `NODE_MISSING` -> skip the check with a clear note and point the user at `/superui:setup`.
- Every spacing and component size sits on the 4/8px scale. Space between groups > space within groups; padding ≤ surrounding margin.
- Font sizes only from the type ramp. Body 16px / line-height 1.5, line length ≤ 75ch. Hierarchy via size + weight + color — never by adding typefaces.
- Red and green are reserved for system error/success states. Never decorative, never red logout.
- Every interactive element has visible hover, `:focus-visible`, and disabled states. No `outline: none` without an equal replacement.
- Every async view exists in at least 3 designed states: loading, empty, error.
- Color is never the only signal — pair it with icon, text, or underline.
- Touch targets: web ≥ 24×24 CSS px (WCAG AA legal floor), iOS ≥ 44×44 pt, Android ≥ 48×48 dp. Design anything a finger touches to 44-48px, not the web floor.
- In data display the value dominates, the label is muted — never equal weight.
- No dark patterns: no fake urgency, scarcity, progress, or anchors; defaults never work against the user. Full rules in `references/ux-psychology.md`.

## Design-system precedence

When the project already defines its own design system — a token set, a design spec, or documented brand/UI guidelines — those authoritative values override this skill's generic absolutes: apply the project's own type ramp, spacing scale, and color system, never a second one alongside them. This skill stays advisory: it reasons about the project's system, never overwrites it.

## Reference routing

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

- **Squint test**: blur your eyes — the primary CTA must be the only element that pops.
- **Contrast**: `node "${CLAUDE_PLUGIN_ROOT}/scripts/check_contrast.ts" FG BG [TYPE] [FG BG [TYPE] ...]` (resolve the `node` command via `sh "${CLAUDE_PLUGIN_ROOT}/scripts/check_node.sh"` first; `NODE_MISSING` -> skip with a note and point at `/superui:setup`) for every text/background and component/background pair. TYPE = `normal` (default, 4.5:1) | `large` (3:1) | `ui` (borders/icons/focus, 3:1) — exit 1 means a pair failed the AA threshold for its own type.
- **States inventory**: hover, focus, disabled, loading, empty, error — all present?
- **Detail rule**: if a detail is too small or too faint to notice, delete it instead of keeping it faint.
