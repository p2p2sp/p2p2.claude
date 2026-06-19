# Page anatomy & build mechanics

How a generated page is assembled, how the design-system theme reaches the
browser with no build step, and the contracts the builder and the shared JS
rely on.

## Contents
- [The page shell](#the-page-shell)
- [Tailwind v4 in the browser (no build)](#tailwind-v4-in-the-browser-no-build)
- [Injecting the design-system theme](#injecting-the-design-system-theme)
- [The shadcn / OKLCH case](#the-shadcn--oklch-case)
- [Dark mode + state-toggle JS contract](#dark-mode--state-toggle-js-contract)
- [Showcase chrome vs design-system surface](#showcase-chrome-vs-design-system-surface)
- [The manifest](#the-manifest)
- [Offline vendoring (optional)](#offline-vendoring-optional)

## The page shell

Every output page shares one shell. The builder (`build_site.py`) owns it — you
never write it by hand. Authoring produces only the `<!-- CONTENT -->` fragment;
the builder wraps it. The shell, conceptually:

```
doctype html
html lang  (class is set by JS for dark mode)
  head
    meta charset / viewport
    title  ← from manifest
    script src = Tailwind v4 browser build (CDN)
    style type="text/tailwindcss"   ← @import "tailwindcss" + injected @theme
    link  rel=stylesheet href=…/assets/mockup.css   ← neutral chrome only
  body
    <nav>  ← optional shared header with dark-mode toggle + link back to index
    <main> ← the authored fragment
    script src=…/assets/mockup.js
```

Relative `href`/`src` to `assets/…` resolve fine from `file://` (same-origin
local files). The CDN `<script>` is the only thing that needs the network.

## Tailwind v4 in the browser (no build)

Tailwind v4 ships a browser build that compiles utilities in-page — the modern
replacement for the v3 `cdn.tailwindcss.com` Play CDN. One script tag, no build:

```html
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
```

Source: Tailwind CSS docs, *Play CDN* (tailwindcss.com/docs/installation/play-cdn).
Notes that matter for mockups:

- It is **development/prototype-only** — exactly the mockup use case. Do not ship
  it to production.
- v4 targets **modern browsers only** (Safari 16.4+, Chrome 111+, Firefox 128+).
  Fine for a team review; note it if the audience uses old browsers.
- It scans the DOM for class names and reads any `<style type="text/tailwindcss">`
  block for `@import`, `@theme`, `@layer`, `@custom-variant`, `@utility`, etc. —
  the same directives the build tool understands.

Pin the major version (`@4`) so a future v5 cannot silently change output.

## Injecting the design-system theme

The theme must live **inside** a `type="text/tailwindcss"` style block for the
browser build to process `@theme`/`@layer`. A plain `<link>` to `theme.css`
would be treated as ordinary CSS and `@theme` would be ignored. So the builder:

1. Reads the design-system theme file once (`theme.css` or `globals.css`).
2. Strips any leading `@import "tailwindcss";` it contains (the shell already
   has one — avoid duplicating).
3. Emits the shell's block as:

```html
<style type="text/tailwindcss">
@import "tailwindcss";
/* ↓ injected verbatim from the design system's theme file ↓ */
@theme { … }
@layer base { … }
@custom-variant dark (&:where(.dark, .dark *));
</style>
```

Because the builder reads the theme once and injects it into every page, the
theme text has a single source of truth even though each output file is
self-contained. Regenerating after a design-system change re-injects it.

## The shadcn / OKLCH case

If the design system targets shadcn, the upstream emits `globals.css` instead of
`theme.css`: OKLCH colors, `:root` / `.dark` custom-property blocks, and an
`@theme inline { … }` mapping. The browser build supports all of this — OKLCH,
`@theme inline`, and `.dark` overrides. Treat it identically: pass `globals.css`
as the theme file; the same strip-and-inject step applies. Dark mode still works
via the `.dark` class on `<html>`. No React is generated — the markup stays
plain HTML using the same utility class names shadcn's theme produces.

## Dark mode + state-toggle JS contract

`assets/mockup.js` (written by `init`) provides two behaviors. Author markup to
these data-attributes; do not hand-roll per-page JS.

**Dark mode** — a control with `data-theme-toggle` flips `class="dark"` on
`<html>` and persists the choice in `localStorage` (works from `file://` in a
normal browser; this is a downloaded static file, not a sandboxed artifact). The
design system's `.dark` overrides do the rest.

**State toggles** — CSS cannot force `:hover`/`:focus`/`:active` on an element,
so interactive states are simulated by toggling a class on a target:

- A control with `data-state-toggle="<class>"` and `data-target="<selector>"`
  adds/removes `<class>` on the matched element(s) when clicked.
- Convention: the design system's hover/focus styles are exposed as utilities
  you can apply directly (e.g. a `hover:bg-surface-hover` paired with a forced
  `bg-surface-hover` for the static example). For the *interactive* sample,
  toggle the forced class; for the *static grid*, apply the forced class inline
  so every state is visible at once. Both appear on the showcase page.

The reference JS is generic and self-documenting; read `assets/mockup.js` after
`init` for the exact attribute names if extending it.

## Showcase chrome vs design-system surface

Two visual layers, kept apart on purpose:

- **Design-system surface** — the actual component samples, pages, layouts.
  Styled only with design-system utilities (from the injected theme).
- **Chrome** — labels ("Primary", "Hover"), the variant/state grid, the token
  strip, section headings. Styled with `assets/mockup.css` using neutral,
  system-font CSS that does **not** depend on the design system.

Keeping chrome design-system-independent means a broken or ugly design-system
value shows up clearly instead of being masked by chrome that happens to look
fine. The chrome also stays readable in both light and dark.

## The manifest

`manifest.json` drives the `build` pass and the generated `index.html`. Shape:

```json
{
  "title": "Acme Design System — Mockups",
  "design_system": ".docs/layout/design-system",
  "pages": [
    { "path": "layouts/layout_base.html",     "fragment": "content/layouts/layout_base.html",     "title": "Base layout (app shell)", "group": "Layouts",    "layout": "bare" },
    { "path": "pages/login.html",              "fragment": "content/pages/login.html",              "title": "Login",                    "group": "Pages",      "layout": "centered" },
    { "path": "components/button.html",        "fragment": "content/components/button.html",        "title": "Button",                   "group": "Components · Atomic", "layout": "showcase" }
  ]
}
```

Fields per page: `path` (output, relative to `--out`), `fragment` (authored
content, relative to `--out`), `title`, `group` (how `index.html` buckets it —
use the spec tier for components), `layout` (one of `bare` | `centered` |
`showcase`; selects how the shell frames the fragment — full-bleed, centered
card, or showcase-chrome wrapper). `index.html` is generated from `pages`,
grouped by `group` in declared order. Never hand-edit `index.html`.

## Offline vendoring (optional)

If the team needs the mockups fully offline (no CDN fetch), vendor the browser
build locally. From a network with npm-registry access:

```bash
npm pack @tailwindcss/browser     # → tarball; extract package/dist/index.global.js
# place it at assets/tailwindcss-browser.js, then point the shell <script> at it
```

Pass `--vendor-tailwind` to `init` to have the builder attempt this and rewrite
the shell `<script>` to the local copy. If the registry is unreachable, the
builder leaves the CDN tag and warns. Default is the CDN tag.
