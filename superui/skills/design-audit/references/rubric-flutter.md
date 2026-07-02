# Drift rubric — Flutter/Dart family

Active for target `flutter`. Files: `.dart`.

The design system is the source of truth: semantic tokens in `tokens.css` / `design-tokens.yaml`, the generated `theme.dart` (`targets/flutter/theme.dart` — `ThemeData` / `ColorScheme` / `TextTheme` / any `ThemeExtension`), the `## 6. Patterns & usage / consistency rules` of `foundations.md`, `components/inventory.md`, and `targets/flutter/components.md` (which widget realizes each entry). Compare code against these, never against memory.

## What is drift here

- Literal `Color(0xFF…)` or `Colors.*` instead of `Theme.of(context).colorScheme.*` (or a `Theme.of(context).extension<…>()`).
- `EdgeInsets.*(<literal>)`, `SizedBox(width/height: <literal>)`, `BorderRadius.circular(<literal>)` with a hardcoded number where the theme/spacing constant exists.
- `TextStyle(fontSize: …, fontWeight: …)` literal instead of `Theme.of(context).textTheme.*`.
- A widget built inline that duplicates a documented component.

There is NO CSS, class, `--custom-property`, `sx`, or inline-`style` concept here — never report those. The reusable unit is a widget; a proposed reusable component is an extracted `StatelessWidget`.

## Classify every finding (two buckets)

- Drift (fixable) — maps onto an existing `ColorScheme`/`TextTheme`/spacing constant. Report the replacement, e.g. "replace `Color(0xFF111827)` with `Theme.of(context).colorScheme.onSurface`".
- Gap (needs design decision) — no documented equivalent. Flag as a candidate extension (`extract-design-system` / `create-component`). No mechanical swap.

## Wave 2 hints (report as cluster candidates, do not fix)

- A widget subtree that matches an `inventory.md` entry but is re-implemented inline in ≥2 places → Type I (scattered known component).
- A recurring un-catalogued widget (a custom button/card/tile) not in `inventory.md`, repeated in ≥ the recurrence threshold → Type II (undocumented pattern); the proposal is a new `StatelessWidget`.
