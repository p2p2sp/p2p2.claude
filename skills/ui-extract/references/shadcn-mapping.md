# shadcn/ui compatibility mode

shadcn/ui is built on **Tailwind CSS** (utilities) + **Radix** (behavior). It is
not an installed component library — you copy components into your project and
they read their colors from a fixed set of **semantic CSS variables**. If the
extracted tokens use shadcn's names and structure, the generated theme drops
straight into a shadcn project and the prototypes can use shadcn components.

Use this mode when the user targets shadcn, mentions shadcn components, or wants
the theme to populate a shadcn `globals.css`.

## shadcn token names (Tailwind v4)

Colors use a **`<role>` / `<role>-foreground`** convention: the base token is the
surface color, `-foreground` is the text/icon color on that surface (the
`background` suffix is dropped, so `primary` pairs with `primary-foreground`).

Color tokens: `background`, `foreground`, `card` / `card-foreground`,
`popover` / `popover-foreground`, `primary` / `primary-foreground`,
`secondary` / `secondary-foreground`, `muted` / `muted-foreground`,
`accent` / `accent-foreground`, `destructive` (+ `destructive-foreground`),
`border`, `input`, `ring`, `chart-1`…`chart-5`,
`sidebar` / `sidebar-foreground`, `sidebar-primary` / `sidebar-primary-foreground`,
`sidebar-accent` / `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`.

Plus a base radius token `--radius`, from which a `radius-sm…2xl` scale is derived.

(Source: ui.shadcn.com/docs/theming. The component-pattern names in
`component-patterns.md` map cleanly onto these: sidebar→`sidebar-*`,
modal/popover→`popover-*` / `card-*`, primary button→`primary*`, hover/selected
rows→`accent*`, focus ring→`ring`, inputs→`input`/`ring`.)

## How to author the tokens

Keep your **primitives** (ramps) as the source of truth and add shadcn semantic
tokens as **aliases** into them. Two ways to tell the converter a token is a
shadcn token:

1. **Name the token exactly** like the shadcn token (leaf name match), e.g.
   `color.primary`, `color.primary-foreground`, `color.sidebar-accent`.
2. **Explicit override** via extensions (use when your naming differs):
   ```yaml
   color:
     brandBlue:
       $value: "{color.brand.500}"
       $extensions: { org.shadcn: { token: primary } }
   ```

Base radius:
```yaml
radius:
  base:
    $value: { value: 0.625, unit: rem }
    $extensions: { org.shadcn: { token: radius } }
```

Dark mode — provide real dark values (the converter will **not** invent them):
```yaml
color:
  background:
    $value: "{color.neutral.0}"
    $extensions:
      org.shadcn:
        token: background
        dark: { colorSpace: srgb, components: [0.09,0.09,0.11], hex: "#17171c" }
```

Start from `assets/tokens.shadcn.template.yaml`.

## Generate

```bash
python scripts/tokens_to_tailwind.py TOKENS.yaml --shadcn -o globals.css
# options: --color-format oklch|hex  (default oklch, matching shadcn v4)
#          --theme-only               (omit the @import line)
```

Output structure (Tailwind v4, shadcn idiom):

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.2 0 0);
  /* …all mapped shadcn tokens… (primitives also exposed as custom colors) */
}
.dark { /* dark values, or a TODO scaffold if none were provided */ }

@theme inline {
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-lg: var(--radius);
  --color-background: var(--background);
  --color-primary: var(--primary);
  /* …each token → var()… */
}
```

Notes:
- shadcn v4 uses **OKLCH** by default; the converter converts sRGB→OKLCH
  deterministically. Opacity modifiers (`bg-primary/50`) work regardless of
  format in v4.
- The raw `:root`/`.dark` variables hold literal colors; `@theme inline` exposes
  them to utilities — this indirection is shadcn's documented v4 pattern and is
  why it differs from the plain `@theme` output (no `inline`).
- Primitives are also emitted as `--color-<leaf>` so you can still use
  `bg-brand-500` etc. If you want a clean shadcn-only file, don't name primitives
  in a way that surfaces them, or strip the `extra` block by hand.
- Prototypes: paste the whole block into `<style type="text/tailwindcss">` (the
  CDN build processes `@custom-variant`, `:root`, `.dark`, and `@theme inline`).
  Add/remove `class="dark"` on `<html>` to preview dark mode.
- To run actual shadcn components in a real project (not the CDN prototype),
  install via the shadcn CLI; this theme replaces the color block in your
  `globals.css`.
