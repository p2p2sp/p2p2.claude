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

## Namespace map

| DTCG token (type / role) | v4 theme namespace | Generated utilities |
|---|---|---|
| color | `--color-{name}` | `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*` … |
| dimension, role `spacing` | `--spacing-{name}` | `p-*`, `m-*`, `gap-*`, `w-*`, `h-*`, `size-*` |
| dimension, role `font-size`/`text` | `--text-{name}` | `text-*` (size) |
| dimension, role `radius` | `--radius-{name}` | `rounded-*` |
| dimension, role `breakpoint` | `--breakpoint-{name}` | `{name}:` responsive variant |
| fontFamily | `--font-{name}` | `font-*` |
| fontWeight | `--font-weight-{name}` | `font-*` (weight) |
| shadow | `--shadow-{name}` | `shadow-*` |
| cubicBezier | `--ease-{name}` | `ease-*` |
| duration | *(no util namespace)* | emit as plain `--duration-*`; use via arbitrary value `duration-[var(--duration-fast)]` |
| number (z-index, opacity) | *(no util namespace)* | emit as plain `--z-*` / `--opacity-*` custom props |

Role is taken from `$extensions.org.tailwindcss.namespace` if present, else from
the token's top-level group name (`spacing`, `radius`, `breakpoint`, etc.). The
`tokens_to_tailwind.py` script implements exactly this.

### Color output
For sRGB colors with a `hex`, the converter emits the hex (most readable). For
colors with alpha < 1 or non-sRGB spaces it emits a modern CSS color function
(`color(srgb r g b / a)` or `oklch(…)`). Either way utilities resolve normally.

### Typography composites
`typography` tokens don't map to a single namespace. The converter emits their
parts to the relevant namespaces (`--text-*`, `--font-*`, `--font-weight-*`) and
lists each named style in a comment so you can build a matching utility or a
small `@utility` (e.g. `@utility text-heading-1 { … }`) by hand if desired.

### Semantic vs primitive
Emit **both** layers. Primitives become the base scale; semantic tokens become
named variables that reference primitives, e.g.
`--color-text-primary: var(--color-gray-900);` → utilities `text-text-primary`
read awkwardly, so for semantic colors prefer concise role names
(`--color-fg`, `--color-bg`, `--color-surface`, `--color-accent`,
`--color-border`) → `text-fg`, `bg-surface`, `border-border`. The converter uses
the semantic token's leaf path to build a short utility-friendly name and warns
on collisions.

### Dark mode (only if tokens declare a dark theme)
The converter scaffolds:

```css
@custom-variant dark (&:where(.dark, .dark *));
```
and emits dark overrides inside `@layer base { .dark { --color-…: …; } }` from a
`$extensions.org.tailwindcss.dark` value on the relevant tokens. Toggle by adding
`class="dark"` on `<html>`.

## Consuming the theme

The generated `theme.css` / `globals.css` is the machine-readable output of the
design system — the bridge from the tokens to any implementation. Building live
HTML example pages from it (Play CDN single-file mockups, the app shell wired to
the documented components) is the job of the separate **ui-mockup** skill,
not this one.
