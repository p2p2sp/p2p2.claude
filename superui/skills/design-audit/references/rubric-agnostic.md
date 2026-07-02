# Drift rubric — agnostic mode (no idiom)

Active when the design system exists but NO target has been adapted (`targets/<chosen>/target.md` absent). The idiom family is unknown, so idiom-specific checks are OFF.

The design system is the source of truth: semantic names in `tokens.css` / `design-tokens.yaml`, the `## 6. Patterns & usage / consistency rules` of `foundations.md`, and `components/inventory.md`.

## What is drift here (token level only)

- Raw color literal (`#rrggbb`, `rgb()/rgba()`, `hsl()/hsla()`, `Color(0x…)`, `Colors.*`) where a semantic color token exists.
- Raw dimension literal (`px`/`rem`/`em`) where a spacing/radius/font-size token exists.
- Invented component variant/state not present in the component's spec.

Do NOT report idiom-specific concepts — off-theme classes, `--custom-property`, inline `style`/`sx`, or Dart widget specifics. There is no active target to judge them against.

## Classify every finding (two buckets)

- Drift (fixable) — the literal duplicates or trivially maps onto an existing documented token. Report the token to use.
- Gap (needs design decision) — no documented equivalent. Flag as a candidate extension (`extract-design-system` / `create-component`).

## Wave 2 hints (report as cluster candidates, do not fix)

Recurrence clustering is supra-idiomatic, so it still runs:

- A block that matches an `inventory.md` entry but is re-implemented in ≥2 places → Type I (scattered known component).
- A recurring component-like block not in `inventory.md`, repeated in ≥ the recurrence threshold → Type II (undocumented pattern).

Note the limitation in the report: idiom checks were skipped and Wave 2 detectability is partial (only files carrying raw-value drift are swept). Recommend running `adapt-target` and re-auditing.
