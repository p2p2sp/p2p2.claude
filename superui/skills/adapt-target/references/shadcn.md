# shadcn/ui compatibility mode

> **Layers on `tailwind.md`.** shadcn is Tailwind v4 underneath, so read
> `references/tailwind.md` first — the `@theme` namespace map, the v4 CSS-first
> model, and the DTCG → CSS-variable conversion all apply here. This file only
> adds the shadcn-specific semantic-token layer on top.

shadcn/ui is built on **Tailwind CSS** (utilities) + **Radix** (behavior). It is
not an installed component library — you copy components into your project and
they read their colors from a fixed set of **semantic CSS variables**. If the
extracted tokens use shadcn's names, the generated theme drops straight into a
shadcn project and the previews can use shadcn components.

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

Plus a base radius token `--radius`, from which the `radius-sm…xl` scale is
derived with shadcn's documented offsets: `sm` = radius − 4px, `md` = radius −
2px, `lg` = radius, `xl` = radius + 4px.

(Source: ui.shadcn.com/docs/theming, verified against the current Tailwind v4 /
OKLCH theming docs. The components in the L1 output — `components/inventory.md`
and each `components/<tier>/<name>.md` spec — map cleanly onto these roles:
sidebar→`sidebar-*`, modal/popover→`popover-*` / `card-*`, primary
button→`primary*`, hover/selected rows→`accent*`, focus ring→`ring`,
inputs→`input`/`ring`. Read the spec's token list and bind each named token to
the matching shadcn role.)

## How tokens map (L1 stays neutral)

The converter maps a color token to a shadcn variable when its **leaf name
equals a shadcn token name** (e.g. `color.primary`, `color.primary-foreground`,
`color.sidebar-accent`). The base radius is the dimension token at path
`radius` / `radius.base` or with leaf name `radius`; an alias `$value` there is
resolved to its literal (never emitted as an undefined `var(--radius-…)`).
shadcn roles it cannot find are listed in a trailing comment of the output.

Do **not** add shadcn-specific tokens or `$extensions` to the L1
`design-tokens.yaml` — L1 is target-neutral. Dark values come from the canonical
`$extensions.org.superui.dark` written by `superui:extract-design-system`; the
converter never invents them (with none present, `.dark` gets a TODO scaffold).
If the L1 leaf names differ from shadcn's roles and roles come out unmapped,
document the role-binding decisions as a mapping section in
`targets/react-shadcn/target.md` (a target artifact) and apply them by editing
the generated `globals.css` accordingly — never by renaming-for-shadcn or
annotating the L1 files.

## Generate

Run the `react-shadcn` converter command from **SKILL.md Step 2** (the full
invocation lives only there). Options, both documented in Step 2:
`--color-format oklch|hex` (default oklch here, matching shadcn v4) and
`--theme-only` (omit the `@import` line). Non-color tokens (fonts, spacing,
shadows, breakpoints, durations, …) are not emitted in this mode — they are
listed in a trailing "not emitted" comment; use the plain `tailwind` output or
hand-add them if the project needs them. Name collisions are warned on stderr
and flagged in an output comment.

Output structure (Tailwind v4, shadcn idiom):

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.2 0 0);
  /* …all mapped shadcn tokens… (other colors also exposed as --<leaf>) */
}
.dark { /* values from $extensions.org.superui.dark, or a TODO scaffold */ }

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-primary: var(--primary);
  /* …each token → var()… */
}
```

Note the dark variant selector: shadcn's documented idiom is
`@custom-variant dark (&:is(.dark *))`, while the plain tailwind mode uses the
Tailwind-docs `&:where(.dark, .dark *)` form — same class strategy, `:where()`
just keeps specificity at zero; the converter follows each ecosystem's own
documented selector.

Notes:
- shadcn v4 uses **OKLCH** by default; the converter converts sRGB (components
  or hex-only) → OKLCH deterministically. Opacity modifiers (`bg-primary/50`)
  work regardless of format in v4.
- The raw `:root`/`.dark` variables hold literal colors (aliases are resolved,
  not emitted as `var()`); `@theme inline` exposes them to utilities — this
  indirection is shadcn's documented v4 pattern and is why it differs from the
  plain `@theme` output (no `inline`).
- Non-shadcn colors are also emitted as `--<leaf>` + `--color-<leaf>` so you can
  still use `bg-brand-500` etc. If you want a clean shadcn-only file, strip that
  extra block by hand.
- Prototypes: paste the whole block into `<style type="text/tailwindcss">` (the
  CDN build processes `@custom-variant`, `:root`, `.dark`, and `@theme inline`).
  Add/remove `class="dark"` on `<html>` to preview dark mode.
- To run actual shadcn components in a real project (not the CDN prototype),
  install via the shadcn CLI (`npx shadcn add <component>`); this theme replaces
  the color block in your `globals.css`.
