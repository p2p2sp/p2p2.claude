# Recurring UI blocks — detection & classification

A catalog of the building blocks to look for in source screenshots. Scan every
screen against all entries; document each find per the template in
`component-spec.md`. For each entry below: **Cues** = how to recognize it ·
**Anatomy** = its parts · **States** = variations to look for · **Tokens** =
what it typically consumes.

Everything here is a DETECTION HINT, never a default: any "typical" value,
color role, or state treatment named below says what to LOOK FOR — every
assigned value comes from a measurement of THIS source.

## Component vs pattern — classification rule

- **Component** — a reusable block assembled from foundation tokens.
  Metadata `atomic` (smallest units: button, input, checkbox, badge, chip,
  avatar, icon, spinner, divider...) or `composite` (assembled blocks that are
  still reusable anywhere: modal, data table, toolbar, tabs, dropdown menu,
  navbar, sidebar, form group, card, pagination...).
- **Pattern** — how components come together into a REAL screen or a major
  recurring screen region: an app shell, a list page (toolbar + table +
  pagination), a settings form page, a page header hierarchy, a dashboard
  grid. When in doubt: if the block is an assembled full-width/full-page
  composition tied to a concrete use, it is a pattern; if it is a reusable
  box you could drop anywhere, it is a component.

## Contents
App shell (pattern) · Sidebar / nav rail · Logo / brand lockup · User menu ·
Modal / dialog · Page header (pattern) · List page (pattern) · Side panel ·
[Supporting blocks](#supporting-blocks-to-also-check) ·
[Visual-consistency checklist](#visual-consistency-checklist)

---

## App shell / layout frame — usually a PATTERN
- **Cues:** page divides into persistent regions: left nav, top bar, main
  area, optional right panel; regions stay fixed while content scrolls.
- **Anatomy:** sidebar · top bar · main content · (right panel) · (footer).
- **Geometry & surface (measure each region, never assume):** sample every
  region's background with `sample_colors.py --regions` and assign
  `color.surface.*` by the printed luminance order. For each region also
  capture: which region owns the divider/border and on which edge, corner
  radii on large panels/shell (with a token), and whether content is FLUSH vs
  an INSET/FLOATING panel.
- **States:** sidebar expanded vs collapsed; with/without right panel.
- **Tokens:** layout widths; per-region `color.surface.*` by measured order;
  divider `border` with owner+edge; large-region `radius.*`; `zindex`.
- **Worked example (regression):** an HR-style shell — sidebar on the canvas
  (`surface.base`, grayer); content a RAISED white panel (`surface.raised`)
  INSET from the sidebar by a hairline divider the content owns on its left
  edge, with a captured top-left `radius.panel`; the active nav item a thin
  INK bar (`color.text.primary`), not the accent. Measuring — not assuming
  "sidebar = raised, nav-active = accent" — is what gets this right.

## Sidebar / nav rail — composite component
- **Cues:** vertical strip of nav items (icon + label); a toggle collapses it
  to an icon rail; active item highlighted.
- **Anatomy:** header (logo) · nav groups · nav item (icon + label + optional
  badge/caret) · collapse toggle · footer (user menu).
- **States:** expanded/collapsed; item default/hover/active/focus; group
  expanded/collapsed; flyout when collapsed.
- **Active item (measure form + color):** read the active treatment from
  pixels — FORM (left bar / filled pill / underline / tint) AND color — and
  map the color to the semantic token that actually matches (often
  ink/`text.primary`, not the accent). Never default to `color.accent.*`.
- **Tokens:** `spacing.*`, icon size, the sidebar surface by measured order,
  `color.text.*`, the measured active-indicator token, `radius.*`, control
  height, `motion.*` (collapse).
- **A11y:** `nav` landmark; icon-only items need `aria-label`; toggle has
  `aria-expanded`; active item `aria-current="page"`.

## Logo / brand lockup — atomic component
- **Cues:** mark + optional wordmark, top of sidebar or header.
- **Anatomy:** symbol · wordmark · clickable wrapper (links home).
- **States:** full vs mark-only (collapsed sidebar); light/dark variant.
- **Tokens:** logo dimensions, `spacing`, brand `color.*`.
- **A11y:** wrapping link with accessible name.

## User / account menu — composite component
- **Cues:** avatar (image or initials) opening a dropdown; often bottom of
  sidebar or top-right.
- **Anatomy:** avatar (image | initials | status dot) · name + secondary text
  · caret · dropdown (items, separators, sign-out).
- **States:** closed/open; image vs initials; online status.
- **Tokens:** avatar size + `radius.full`, menu surface, `shadow.*`,
  `color.text.*`, item padding.
- **A11y:** trigger is a `button` with `aria-haspopup`/`aria-expanded`; menu
  items focusable; closes on Esc / outside click.

## Modal / dialog — composite component
- **Cues:** centered panel over a dimmed overlay; title bar with close,
  scrollable body, action footer.
- **Anatomy:** overlay/scrim · panel · header (title + close) · content ·
  footer (primary + secondary actions).
- **States:** open/closed; short vs scrolling content; destructive variant.
- **Tokens:** panel surface, overlay color+opacity, `radius.modal`,
  `shadow.overlay`, band padding, `zindex.modal`, max-width.
- **A11y:** `role="dialog"` + `aria-modal="true"`, labelled by title, focus
  trapped and restored, Esc closes.

## Page header — usually a PATTERN
- **Cues:** main region begins with a title row: heading + subtitle/breadcrumb
  left, actions right; content below.
- **Anatomy:** breadcrumb · title + subtitle · meta · action cluster ·
  divider · body region.
- **States:** with/without breadcrumb; sticky on scroll; tabbed.
- **Tokens:** `typography.heading-*`, `spacing`, divider `color.border`,
  `color.text.secondary`.

## List page / searchable table — usually a PATTERN
- **Cues:** toolbar (search, filters, sort) above a repeating list/table;
  pagination; empty/loading states.
- **Anatomy:** toolbar · list/table · row (avatar/icon · primary + secondary
  text · meta · row actions) · footer (count + pagination) · empty state ·
  loading skeleton.
- **States:** populated / empty / loading / no-results; row default / hover /
  selected; search focused. Document the WHOLE pattern's states — this is the
  Data/Empty/Loading trio a pattern sheet renders.
- **Tokens:** input height + `radius.control` + `border`, row padding,
  `spacing`, `color.surface.*`, `color.text.*`, divider, `shadow` (focus).
- **A11y:** labelled searchbox; list/table semantics; results count announced;
  empty state has guidance text.

## Right-hand side panel — composite component
- **Cues:** secondary column pinned right showing detail for the selection;
  collapsible or slide-over.
- **Anatomy:** panel header (title + close) · sections (label/value pairs,
  fields) · footer (actions).
- **States:** open / collapsed / hidden; docked vs overlay drawer.
- **Tokens:** panel width, surface, left `border`, `spacing`, `shadow` (if
  overlay), `zindex`.
- **A11y:** `complementary`/`region` landmark with a label; drawer follows
  modal focus rules.

## Supporting blocks to also check
- **Card:** elevated/bordered container → `radius.card`, `shadow.card`,
  `border`, padding.
- **Button system:** primary / secondary / ghost / destructive / icon; sizes;
  default/hover/active/disabled/focus → accent colors, control height,
  `radius.control`, focus ring.
- **Form fields:** label · input · helper/error · states (focus, error,
  disabled) → input height, border, focus ring, `color.feedback.error`.
- **Tabs / segmented control**, **breadcrumb**, **badge / tag / chip / status
  dot**, **tooltip / popover**, **toast / notification**, **table parts**
  (header cell, row, cell), **pagination**, **avatar / avatar group**,
  **progress / skeleton / spinner**, **toolbar / action bar**, **dropdown /
  select**, **stat / KPI tile** (dashboards).

---

## Visual-consistency checklist

Record these as system-wide rules in DESIGN.md — every spec must honor them:

- **Radius:** how many distinct radii exist? Map each to a role — control,
  card, modal, pill/full, AND large-surface/panel/shell. Sample radii on big
  regions too, not only small controls.
- **Elevation:** count the distinct shadow levels; each surface picks a level,
  not an ad-hoc shadow.
- **Spacing rhythm:** is there a base step (4/8 px)? Do paddings/gaps land on
  it? Note exceptions.
- **Icon size(s):** the small set of icon sizes.
- **Control height:** shared height for buttons / inputs / selects.
- **Color roles:** every used color maps to a semantic role; no raw one-offs.
- **Typography scale:** the finite set of text styles.
- **Focus treatment:** the one focus-ring style (color + width + offset).
- **Alignment grid:** the column grid, gutter, max width.

If two blocks solve the same job differently (two button radii, two card
shadows), flag the inconsistency rather than encoding both blindly.
