# DTCG → Tailwind v4 mapping

Tailwind v4 is **CSS-first**: there is no `tailwind.config.js`. You import
Tailwind and declare design tokens as CSS variables inside an `@theme { … }`
block. Variables in known namespaces automatically generate utilities.

```css
@import "tailwindcss";

@theme {
  --color-brand-500: #3366f2;     /* → bg-brand-500, text-brand-500, border-brand-500 … */
  --font-sans: "Inter", system-ui, sans-serif;  /* → font-sans */
  --text-base: 1rem;              /* → text-base */
  --spacing-4: 1rem;              /* → p-4, gap-4, m-4 … */
  --radius-control: 0.5rem;       /* → rounded-control */
  --shadow-card: 0 1px 3px rgb(0 0 0 / 0.08);  /* → shadow-card */
  --breakpoint-3xl: 120rem;       /* → 3xl: variant */
  --ease-standard: cubic-bezier(0.4,0,0.2,1);  /* → ease-standard */
}
```

The converter (run via the SKILL.md Step 2 command) implements exactly the
mapping below; this file documents its actual behavior.

## Namespace map

DTCG type / role → v4 theme namespace → generated utilities:

- color → `--color-{name}` → `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*`, …
- dimension, role `spacing` → `--spacing-{name}` → `p-*`, `m-*`, `gap-*`, `w-*`, `h-*`, `size-*`
- dimension, role `font-size` / `text` → `--text-{name}` → `text-*` (size)
- dimension, role `radius` → `--radius-{name}` → `rounded-*`
- dimension, role `breakpoint` → `--breakpoint-{name}` → `{name}:` responsive variant
- fontFamily → `--font-{name}` → `font-*`
- fontWeight → `--font-weight-{name}` → `font-*` (weight)
- shadow → `--shadow-{name}` → `shadow-*`
- cubicBezier → `--ease-{name}` → `ease-*` (aliases in `$value` resolve to `var(--ease-…)`)
- duration → no utility namespace; emitted as `--duration-*`; use via arbitrary
  value, e.g. `duration-[var(--duration-fast)]`
- number (z-index, opacity) → no utility namespace; emitted as plain custom
  properties (e.g. `--z-*` / `--opacity-*`)

Role is taken from `$extensions.org.tailwindcss.namespace` if a token carries
it, else from the token's `$type` + top-level group name (`spacing`, `radius`,
`breakpoint`, etc.); `$extensions.org.tailwindcss.name` overrides the leaf name.

### Color output

Default output format is **hex**: sRGB colors emit `#rrggbb` when alpha is 1
(derived from `components` when no `hex` is given), and `rgb(r g b / a)` when
alpha < 1 (an alpha embedded in `#rrggbbaa` or set via `alpha:` is preserved,
even for hex-only tokens). With `--color-format oklch` every literal sRGB color
(components or hex-only) is converted to `oklch(…)` deterministically. Non-sRGB
spaces always emit natively (`oklch()` / `lab()` / `color(<space> …)`). Alias
values become `var(--color-…)` references either way. Utilities resolve all of
these normally.

### Typography composites

`typography` tokens don't map to a single namespace. The converter **decomposes**
each one: `fontSize` → `--text-{name}`, `lineHeight` → `--text-{name}--line-height`,
`letterSpacing` → `--text-{name}--letter-spacing` (Tailwind v4 font-size
sub-values, picked up by the `text-{name}` utility), `fontWeight` →
`--font-weight-{name}`, `fontFamily` → `--font-{name}`. Parts absent from the
composite are omitted; aliases inside parts resolve to `var(…)`. Each decomposed
style is listed in a trailing comment. Other composite types (border,
transition, gradient, …) are skipped and listed in a
`/* Composite tokens not auto-mapped … */` comment.

### Semantic vs primitive

Emit **both** layers. Primitives become the base scale; semantic tokens become
named variables that reference primitives, e.g.
`--color-text-primary: var(--color-gray-900);` → utilities `text-text-primary`
read awkwardly, so for semantic colors prefer concise role names
(`--color-fg`, `--color-bg`, `--color-surface`, `--color-accent`,
`--color-border`) → `text-fg`, `bg-surface`, `border-border`. The converter uses
the semantic token's leaf path to build a short utility-friendly name; when two
tokens emit the same custom-property name it warns on stderr and appends a
`/* WARNING: custom-property name collisions … */` comment (in CSS the later
declaration wins).

### Dark mode

The only dark source is `$extensions.org.superui.dark` on a token — same shape
as its `$value`, aliases allowed. The converter always scaffolds the
class-strategy variant:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

When at least one token carries a dark value, it emits the overrides after the
`@theme` block:

```css
@layer base {
  .dark {
    --color-surface: #17171c;
    --color-fg: var(--color-neutral-0);
  }
}
```

When no token has a dark value it emits a comment instead ("no dark overrides
in design-tokens.yaml ($extensions.org.superui.dark); if the L1 tokens.css has
a .dark block, port it manually"). It never fabricates dark values. Toggle by
adding `class="dark"` on `<html>`.

## Consuming the theme

The generated `theme.css` (for the `tailwind` target) / `globals.css` (for
`react-shadcn`) is the machine-readable output of the design system — the bridge
from the agnostic L1 tokens to a Tailwind implementation. It is regenerated in
full on every converter run, so never hand-edit it. Building live HTML example
pages from it (Play CDN single-file previews, the app shell wired to the
documented components) is the job of the separate **superui:web-preview** skill,
not this one.
