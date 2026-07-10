# Drift rubric — JS theme-object family (MUI)

Active for target `react-mui`. Files: `.jsx`, `.tsx`, `.js`, `.ts`.

The design system is the source of truth: semantic tokens in `tokens.css` / `design-tokens.yaml`, the generated `theme.ts` (`targets/react-mui/theme.ts`), the `## 6. Patterns & usage / consistency rules` of `foundations.md`, `components/inventory.md`, and `targets/react-mui/components.md` (which MUI component realizes each entry). Compare code against these, never against memory.

## What is drift here

- Literal color/spacing/typography value inside `sx={{…}}`, `styled(…)`, or an inline `style={{…}}` instead of a theme reference (`theme.palette.*`, `theme.spacing()`, `theme.typography.*`, `theme.shape.*`).
- Hardcoded `#rrggbb` / `rgb()` / `px` literal where the theme names the token.
- A component built ad-hoc from primitives when `components.md` maps it to a concrete MUI component.
- Invented variant/state not present in the component's spec.

There is no CSS-class or `--custom-property` concept here — do not report those.

## Classify every finding (two buckets)

- Drift (fixable) — maps onto an existing theme token / mapped MUI component. Report the replacement, e.g. "replace `sx={{ color: '#111' }}` with `sx={{ color: 'text.primary' }}`" or "use `<Button>` per `components.md`".
- Gap (needs design decision) — no documented equivalent. Flag as a candidate extension (`superui:extract-design-system` / `superui:create-component`). No mechanical swap.

## Wave 2 hints (report as cluster candidates, do not fix)

- A JSX block that matches an `inventory.md` entry but is re-implemented inline in ≥2 places → Type I (scattered known component).
- A recurring custom component not in `inventory.md`, repeated in ≥ the recurrence threshold → Type II (undocumented pattern).
