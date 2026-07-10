# Drift rubric — CSS/markup family

Active for targets `pure-css`, `tailwind`, `react-shadcn`. Files: `.css`, `.scss`, `.html`, `.jsx`, `.tsx`.

The design system is the source of truth: semantic names in `tokens.css` / `design-tokens.yaml`, the `## 6. Patterns & usage / consistency rules` section of `foundations.md`, `components/inventory.md`, and the active target's `targets/<chosen>/components.md` (real class names / markup). Compare code against these, never against memory.

## What is drift here

- Raw color literal (`#rrggbb`, `rgb()/rgba()`, `hsl()/hsla()`) where a semantic color token exists.
- Raw dimension literal (`px`/`rem`/`em`) used for spacing, radius, font-size, or border where a token exists.
- Off-theme / arbitrary utility class — a Tailwind arbitrary value (`bg-[#0af]`, `p-[13px]`) or an ad-hoc CSS class hardcoding a value the theme already names.
- Undocumented CSS custom property (`--foo`) absent from `tokens.css`.
- Inline `style="…"` / `style={{…}}` carrying a value that maps to a token or a themed class.
- Invented component variant or state not present in the component's spec.

## Classify every finding (two buckets)

- Drift (fixable) — the value/class/variant duplicates or trivially maps onto an existing documented token/component. Report the exact replacement, e.g. "replace `#111827` with `var(--color-text-primary)`" or "use the mapped class from `components.md`".
- Gap (needs design decision) — no documented equivalent exists. Flag it as a candidate design-system extension (route to `superui:extract-design-system` / `superui:create-component`). Do NOT propose a mechanical swap for a gap.

## Wave 2 hints (report as cluster candidates, do not fix)

- A markup block that matches an `inventory.md` entry but is re-implemented inline in ≥2 places → Type I (scattered known component).
- A recurring component-like markup block (button, card, field, badge…) not in `inventory.md`, repeated in ≥ the recurrence threshold → Type II (undocumented pattern).
