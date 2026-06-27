# Recurring component patterns — detection & documentation

A catalog of the UI building blocks to look for in a source UI (screenshots or a
rendered page). For each detected component, document in its spec (template +
taxonomy in `component-spec.md`): where it appears, its anatomy,
its states/variants (mark inferred vs. visible), the tokens it consumes, and
accessibility notes. Use this list as a checklist — scan every screen against
all entries.

For each pattern below: **Cues** = how to recognize it · **Anatomy** = its parts
· **States** = variations to look for · **Tokens** = what it typically consumes.

## Contents
App shell · Sidebar / nav rail · Logo / brand lockup · User / account menu ·
Modal / dialog · Content area with header · List with search · Right side panel ·
[Supporting patterns](#supporting-patterns-to-also-check) ·
[Visual-consistency checklist](#visual-consistency-checklist)

---

## App shell / layout frame
- **Cues:** Page divides into persistent regions: left nav, top bar, main area,
  optional right panel. Regions stay fixed while content scrolls.
- **Anatomy:** sidebar · top bar/header · main content · (right side panel) ·
  (footer/status bar).
- **Geometry & surface (measure each region, never assume):** sample every
  region's background and assign its `color.surface.*` token AS MEASURED — run
  `sample_colors.py --regions` and adopt the printed luminance order; if two
  adjacent regions differ, state which is raised relative to the other. For each
  region also capture: which region owns the divider/border and on which edge,
  corner radii on large panels/shell (with a token), and whether content is FLUSH
  vs an INSET/FLOATING panel.
- **States:** sidebar expanded vs. collapsed; with/without right panel.
- **Tokens:** layout widths (`dimension`); per-region `color.surface.*` by the
  measured order above (not a flat bucket); `border`/divider with its owner+edge;
  large-region `radius.*`; `zindex`.
- **Worked example (regression):** an HR-style shell — sidebar on the canvas
  (`surface.base`, grayer); content a RAISED white panel (`surface.raised`) INSET
  from the sidebar by a hairline divider the content owns on its left edge, with a
  captured top-left `radius.panel`; the active nav item a thin INK bar
  (`color.text.primary`), not the accent. Measuring — not assuming "sidebar =
  raised, nav-active = accent" — is what gets this right.

## Sidebar / nav rail with collapsible icon rail
- **Cues:** Vertical strip of nav items, each an icon + label; a toggle
  (chevron/hamburger) collapses it to an icon-only rail. Active item highlighted.
- **Anatomy:** header (logo) · nav groups · nav item (icon + label + optional
  badge/caret) · collapse toggle · footer (user menu).
- **States:** expanded / collapsed; item default / hover / active / focus;
  group expanded / collapsed; item with submenu (flyout when collapsed).
- **Active item (measure form + color, do not assume):** read the active
  treatment from pixels — its FORM (left bar / filled pill / underline / tint)
  AND its color — and map the color to the semantic token that actually matches
  (often `color.text.primary`/ink, not the chromatic accent). Do not default the
  active indicator to `color.accent.*`.
- **Tokens:** `spacing.*` (item padding, gap), icon size (`dimension`), the
  sidebar surface assigned by the measured region order (see App shell),
  `color.text.*`, the measured active-indicator token (per above), `radius.*`,
  control height, `motion.*` (collapse transition).
- **A11y:** `nav` landmark; icon-only items need `aria-label`/tooltip;
  toggle has `aria-expanded`; active item `aria-current="page"`.

## Logo component / brand lockup
- **Cues:** Mark + optional wordmark, top of sidebar or header.
- **Anatomy:** symbol (SVG) · wordmark · clickable wrapper (links home).
- **States:** full (expanded sidebar) vs. mark-only (collapsed); light/dark
  variant if theme changes.
- **Tokens:** logo dimensions, `spacing`, brand `color.*`.
- **A11y:** wrapping link with accessible name (e.g. "Acme — Home").

## User / account menu (avatar)
- **Cues:** Circular avatar (image or initials), often bottom of sidebar or
  top-right; may show name/role; opens a dropdown.
- **Anatomy:** avatar (image | initials | status dot) · name + secondary text ·
  caret · dropdown menu (items, separators, sign-out).
- **States:** menu closed / open; avatar with image vs. initials; online status.
- **Tokens:** avatar size + `radius.full`, `color.surface.raised` (menu),
  `shadow.*`, `color.text.*`, item padding.
- **A11y:** trigger is a `button` with `aria-haspopup`/`aria-expanded`; menu is
  a `menu` with focusable items; closes on Esc / outside click.

## Modal / dialog (header · content · footer)
- **Cues:** Centered panel over a dimmed overlay; three bands — title bar with
  close (×), scrollable body, action footer with buttons.
- **Anatomy:** overlay/scrim · panel · header (title + close) · content (body,
  may scroll) · footer (primary + secondary actions).
- **States:** open / closed; content short vs. scrolling; with/without footer;
  destructive variant (red primary).
- **Tokens:** `color.surface.raised`, overlay color + opacity, `radius.modal`,
  `shadow.overlay`, `spacing` (band padding), `zindex.modal`, max-width.
- **A11y:** `role="dialog"` + `aria-modal="true"`, labelled by the title, focus
  trapped, focus restored on close, Esc closes.

## Content area with header (page header / section header)
- **Cues:** Main region begins with a title row: heading + subtitle/breadcrumb on
  the left, actions (buttons, filters) on the right; content below.
- **Anatomy:** breadcrumb · title + subtitle · meta · action cluster · divider ·
  body region.
- **States:** with/without breadcrumb; sticky header on scroll; tabbed.
- **Tokens:** `typography.heading-*`, `spacing`, `color.border` (divider),
  `color.text.secondary`.

## List with search (searchable list / filterable table)
- **Cues:** A search input above a repeating list/table of rows; possibly
  filter chips, sort controls, pagination, empty/loading states.
- **Anatomy:** toolbar (search field + filters + sort) · list/table · row item
  (avatar/icon · primary + secondary text · meta · row actions) · footer
  (pagination / count) · empty state · loading skeleton.
- **States:** populated / empty / loading / no-results; row default / hover /
  selected; search focused.
- **Tokens:** input height + `radius.control` + `border`, row padding, `spacing`
  (row gap), `color.surface.*`, `color.text.*`, divider color, `shadow` (focus).
- **A11y:** search is a labelled `searchbox`; list uses list/table semantics;
  results count announced; empty state has guidance text.

## Right-hand side panel (detail / inspector drawer)
- **Cues:** Secondary column pinned to the right edge showing detail/properties
  for the current selection; may be collapsible or a slide-over drawer.
- **Anatomy:** panel header (title + close/collapse) · sections (label/value
  pairs, fields) · panel footer (actions).
- **States:** open / collapsed / hidden; docked vs. overlay drawer.
- **Tokens:** panel width, `color.surface.*`, left `border`, `spacing`,
  `shadow` (if overlay), `zindex`.
- **A11y:** `complementary`/`region` landmark with a label; if a drawer, same
  focus rules as modal.

## Supporting patterns to also check
- **Card:** elevated/bordered container, header/body/footer → `radius.card`,
  `shadow.card`, `border`, padding.
- **Button system:** primary / secondary / ghost / destructive / icon; sizes;
  default/hover/active/disabled/focus → accent colors, control height,
  `radius.control`, focus ring.
- **Form fields:** label · input · helper/error · states (focus, error,
  disabled) → input height, border, focus ring color, `color.feedback.error`.
- **Tabs / segmented control**, **breadcrumb**, **badge / tag / pill / status
  dot**, **tooltip / popover**, **toast / notification**, **table** (header,
  sortable, zebra/divider), **pagination**, **avatar group / stacked avatars**,
  **progress / skeleton**, **toolbar / action bar**, **dropdown / select**,
  **stat / KPI tile** (dashboards).

---

## Visual-consistency checklist

Record these as system-wide rules in `foundations.md` — every spec must honor them:

- **Radius:** how many distinct corner radii exist? Map each to a role —
  control, card, modal, pill/full, AND large-surface / panel / shell (a rounded
  panel corner or inset content region). Sample radii on big regions too, not only
  on small controls. Reuse, don't introduce new ones.
- **Elevation:** count the distinct shadow levels; they form the elevation
  scale. Each surface picks a level, not an ad-hoc shadow.
- **Spacing rhythm:** is there a base step (4 / 8 px)? Do paddings/gaps land on
  it? Note exceptions.
- **Icon size(s):** the small set of icon sizes (e.g. 16 / 20 / 24).
- **Control height:** shared height for buttons / inputs / select.
- **Color roles:** every color used maps to a semantic role (surface, text,
  border, accent, feedback); no raw one-off colors.
- **Typography scale:** the finite set of text styles; headings/body/caption all
  come from it.
- **Focus treatment:** the one focus-ring style (color + width + offset).
- **Alignment grid:** the column/grid the layout snaps to; gutter and max width.

If two components solve the same job differently (two button radii, two card
shadows), flag the inconsistency for the user rather than encoding both blindly.
