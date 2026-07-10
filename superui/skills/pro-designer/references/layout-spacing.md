# Layout & Spacing

Read when setting margins, padding, gaps, component sizes, grids, breakpoints, or container widths.

## Spacing token scale
- Put every padding, margin, and gap on the 4/8px scale: 4, 8, 12, 16, 24, 32, 40, 48, 64; add 80, 96, 128 for page-level spacing. Never emit off-scale values (13px, 18px, 25px) — arbitrary per-element values are the top source of inconsistent generated layouts.
- Define the scale once (CSS custom properties `--space-1: 4px` ... or a framework scale) and reference tokens everywhere. Base 4px = 0.25rem so spacing scales with user font-size settings.
- Grow the scale geometrically at the top (...32, 48, 64, 96, 128), not linearly — 4 vs 8px is a huge difference, 60 vs 64px is imperceptible.
- Tailwind nuance: integer utilities (`p-1`, `p-4`) are multiples of the 4px `--spacing` base, but fractional steps exist (`p-0.5` = 2px, `p-1.5` = 6px) and `p-px` = 1px. Use those, never arbitrary values like `p-[13px]`.

## How much white space
- Start with too much white space, then remove until it looks right — never build up from a cramped minimum. Cramped is the default failure mode of generated UIs.
- When unsure between two adjacent tokens, pick the larger.
- Practical defaults: card/panel padding 24px; form-field vertical gaps 16-24px; gaps between page sections 48-64px; page top/bottom padding 48-96px.
- Mobile rhythm: 16px between stacked blocks and form fields, 12px for tight intra-component gaps (e.g. tab bar internals), 32px before the primary CTA to set it apart from the form it concludes.

## Grouping and proximity
- Space between groups must be at least 2 scale steps larger than space within groups — equal spacing everywhere makes structure ambiguous and forces users to parse grouping from content (Gestalt proximity).
```
Bad:  label —16px— input —16px— next label   (which label owns which input?)
Good: label —8px— input —24px— next label
```
- Headings: 4-8px to their own paragraph, 32-48px before the next heading.
- Padding <= surrounding margin: an element's internal padding must not exceed the gap to its neighbors — e.g. a card with 16px padding needs >=16px (ideally 24px) between cards, or adjacent contents bleed together.
- Lockup: icon + title + description is one locked unit with fixed internal spacing (enforce via auto-layout/flex gap). An icon floating too far from its title stops being associated with it.
- Calibrate both directions: too tight reads as amateur chaos; too loose breaks functional context between related elements.

## Component sizing on the grid
- Interactive control heights in 8px increments: 32px compact, 40px default, 48px large — same set for buttons and inputs so rows and toolbars align without nudges.
- Icons at 16/20/24/32px; line-heights in multiples of 4px so text blocks stack on the grid.
- Keep at least 8px gap between adjacent tap targets (Android guidance) — undersized targets packed tightly cause mis-taps.

## Navigation structure
- Separate global navigation (main menu) visually and spatially from local controls (filters, toolbars scoped to one section) — mixing them hides the app's structure.
- Omit global nav on secondary full-workspace screens (e.g. map view) to maximize working area.

## Breakpoints (mobile-first, min-width)
- Base unqueried styles must produce a working single-column layout below 600px; layer `min-width` queries upward. Compact width (<600dp) covers 99.96% of phones in portrait.
- Use a standard set, don't invent numbers:
  - Tailwind: sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536px
  - Bootstrap 5.3: sm 576 / md 768 / lg 992 / xl 1200 / xxl 1400px
  - Material window size classes (width): compact <600dp, medium 600-839dp, expanded 840-1199dp, large 1200-1599dp, extra-large >=1600dp
- Android height size classes when vertical space matters (keyboards, landscape phones): compact <480dp, medium 480-899dp, expanded >=900dp.
- Column grid per breakpoint: 4 columns <600dp, 8 columns 600-839dp, 12 columns >=840dp. Margins and gutters 16dp up to 719dp, 24dp from 720dp upward.

## Big screens and line length
- Don't stretch content to fill wide screens: center the page in a max-width container of ~1200-1440px (`max-width: 80rem; margin-inline: auto; padding-inline: 24px`), fluid margins absorb the rest.
- At expanded/large widths add panes or columns (list-detail, sidebar, multi-column card grid) instead of widening a single column.
- Prose blocks: `max-width: 65ch` even when the parent is wider; optimal 50-75 characters per line, WCAG 1.4.8 hard cap 80 characters (40 CJK).

## Sources
- Cieden — Spacing best practices: https://cieden.com/book/sub-atomic/spacing/spacing-best-practices
- Nielsen Norman Group — The Principle of Proximity: https://www.nngroup.com/articles/gestalt-proximity/
- Refactoring UI — Start with too much white space: https://archive.org/details/RefactoringUIStartWithTooMuchWhiteSpace
- Tailwind CSS — Theme variables: https://tailwindcss.com/docs/theme
- Bootstrap 5.3 — Breakpoints: https://getbootstrap.com/docs/5.3/layout/breakpoints/
- Android Developers — Window size classes: https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes
- Material Design — Responsive layout grid: https://m2.material.io/design/layout/responsive-layout-grid.html
- W3C — Understanding WCAG 1.4.8 Visual Presentation: https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html
- Baymard Institute — Line length readability: https://baymard.com/blog/line-length-readability
