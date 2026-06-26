# DTCG → pure CSS (no framework) mapping

The `pure-css` target needs **no framework and no build step**: the L1
`tokens.css` already *is* valid CSS custom properties, so this target re-expresses
it as a small **utility/class layer** plus per-component **HTML patterns** that
SSR (or hand-written HTML) can emit directly. The theme artifact is `styles.css`.

> Sources:
> [MDN — Using CSS custom properties (variables)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Using_CSS_custom_properties),
> [MDN — `var()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Functions/var),
> [MDN — custom property (`--*`)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*).

## How CSS variables carry the tokens

- **Declare** on `:root` so they are global (custom properties **inherit** and
  apply to all elements): `:root { --color-text-primary: #111827; }`.
- **Consume** with `var()`: `color: var(--color-text-primary);`. Fallback:
  `var(--color-text-primary, #000)`.
- **Dark mode** is a scoped override — redeclare the same names under `.dark` (or
  `@media (prefers-color-scheme: dark)`); elements inside the scope pick up the
  overridden value. This is exactly the shape `tokens.css` already uses
  (`:root` light + `.dark`), so `styles.css` can `@import "tokens.css";` or inline
  it, then build the class layer on top.

## The theme artifact (`styles.css`)

`styles.css` = the L1 tokens (imported or inlined) + a thin semantic class layer.
Generate one class per recurring role; bind each property to a token by **name**,
never to a raw value:

```css
@import "tokens.css";            /* or inline the :root / .dark blocks */

.surface       { background: var(--color-surface-base); color: var(--color-text-primary); }
.surface-raised{ background: var(--color-surface-raised); box-shadow: var(--shadow-card); }
.text-muted    { color: var(--color-text-secondary); }
.btn {
  height: var(--size-control);
  padding-inline: var(--spacing-4);
  border-radius: var(--radius-control);
  font: var(--typography-button, inherit);
}
.btn-primary { background: var(--color-accent); color: var(--color-on-accent); }
.btn-primary:hover  { background: var(--color-accent-hover); }
.btn:focus-visible  { outline: var(--focus-ring-width) solid var(--color-focus-ring);
                      outline-offset: var(--focus-ring-offset); }
.card  { border-radius: var(--radius-card); box-shadow: var(--shadow-card);
         background: var(--color-surface-raised); }
.input { height: var(--size-control); border: 1px solid var(--color-border);
         border-radius: var(--radius-control); }
```

Rules:
- One class per semantic role from `foundations.md` (surface/text/border/accent/
  feedback); reuse, never introduce a new raw value.
- Honor the consistency rules: the single focus-ring style, the finite radius
  roles, the spacing rhythm, the elevation scale — each as a class bound to its
  token.
- Web-only foundations (hover, focus-ring, breakpoints, z-index) are in play here
  (unlike a mobile target); map L1 breakpoints to `@media (min-width: …)` using
  the breakpoint tokens.

## `components.md` HOW/WHERE for pure-css

Each L1 inventory component maps to a **documented HTML markup pattern** + the
class names above (no install, no import). Example mapping shape:

```html
<!-- Button (atomic) — variants: primary | secondary | ghost; states: hover/focus/disabled -->
<button class="btn btn-primary">Save</button>

<!-- Card (composite) — header / body / footer -->
<article class="card">
  <header class="card-header">…</header>
  <div class="card-body">…</div>
  <footer class="card-footer">…</footer>
</article>
```

For each component document: the semantic HTML element(s) + ARIA roles from the
L1 spec's a11y notes (e.g. modal → `role="dialog" aria-modal="true"`; nav →
`<nav>`; searchbox → labelled `<input type="search">`), the class names that bind
its tokens, and the state hooks (`:hover`, `:focus-visible`, `[aria-disabled]`,
`.is-open`).

**Gap policy:** every component must come from `components/inventory.md`. If a
visual the inventory lacks is needed, compose it from documented primitives and
say so, or write `> ⚠️ Needs input: …`. Never invent a component or a token.

This is a **web** target — `web-preview` can render its static appearance from
`styles.css` (plain `<link>`/inline `<style>`, no CDN, no Tailwind block).
