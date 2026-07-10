# Page anatomy & build mechanics

How a generated page is assembled, how the active target's theme artifact reaches
the browser per delivery branch, and the contracts the builder and the shared JS
rely on.

## Contents
- [The page shell](#the-page-shell)
- [Per-target delivery branches](#per-target-delivery-branches)
- [The pure-css branch (plain CSS, no build)](#the-pure-css-branch-plain-css-no-build)
- [The Tailwind branches (browser build, no build step)](#the-tailwind-branches-browser-build-no-build-step)
- [Injecting the active target's theme artifact](#injecting-the-active-targets-theme-artifact)
- [The shadcn / OKLCH case](#the-shadcn--oklch-case)
- [Dark mode + state-toggle JS contract](#dark-mode--state-toggle-js-contract)
- [Showcase chrome vs design-system surface](#showcase-chrome-vs-design-system-surface)
- [The manifest](#the-manifest)
- [Offline vendoring (optional, Tailwind branches)](#offline-vendoring-optional-tailwind-branches)
- [The standalone single-file emit (artifact-conformant)](#the-standalone-single-file-emit-artifact-conformant)

## The page shell

Every output page shares one shell. The builder (`build_site.py`) owns it — you
never write it by hand. Authoring produces only the `<!-- CONTENT -->` fragment;
the builder wraps it. The `<head>` varies by the active target's delivery branch
(below); the body is the same for every branch. The shell, conceptually:

```
doctype html
html lang  (class is set by JS for dark mode)
  head
    meta charset / viewport
    title  ← from manifest
    «theme delivery»   ← per-target branch: plain <style> (pure-css)
                          OR Tailwind CDN <script> + <style type="text/tailwindcss">
    link  rel=stylesheet href=…/assets/preview.css   ← neutral chrome only
  body
    <nav>  ← optional shared header with dark-mode toggle + link back to index
    <main> ← the authored fragment
    script src=…/assets/preview.js
```

Relative `href`/`src` to `assets/…` resolve fine from `file://` (same-origin
local files). For the Tailwind branches the CDN `<script>` is the only thing that
needs the network; the `pure-css` branch needs nothing.

## Per-target delivery branches

The builder resolves the **active target** from `targets/<target>/target.md`
(which names the target and its `<theme-artifact>` filename) and selects one of
two `<head>` delivery branches. Only the three **web** targets are handled here —
`react-mui` / `flutter` are out of scope for this skill (see the SKILL.md
"Non-web targets" section).

| Active target | Theme artifact | Delivery branch |
|---------------|----------------|-----------------|
| `pure-css` | `styles.css` | Plain-CSS branch — ordinary `<style>` / `<link>`, no Tailwind, no CDN |
| `tailwind` | `theme.css` | Tailwind browser-CDN branch — `@theme` injected into a `text/tailwindcss` block |
| `react-shadcn` | `globals.css` | Tailwind browser-CDN branch — OKLCH `:root`/`.dark` + `@theme inline` injected the same way |

The builder reads `target.md` once per run; that single read decides the branch
and the theme-artifact filename for every page it emits.

## The pure-css branch (plain CSS, no build)

For a `pure-css` target the theme artifact (`styles.css`) is **already final
CSS** — a class/utility layer plus per-component rules that `adapt-target` derived
from `tokens.css`. There is no compiler in the loop, so the builder injects it as
ordinary CSS:

```html
<style>
/* ↓ injected verbatim from targets/pure-css/styles.css ↓ */
:root { --color-surface: …; }
.btn { … }
.dark { … }
</style>
```

(Equivalently a `<link rel="stylesheet">` to a copied `styles.css` — inlining
keeps each page self-contained, which is the skill's contract.) No
`<script src="…/@tailwindcss/browser">` tag and no `type="text/tailwindcss"`
block appear on a `pure-css` page — adding either is a defect. Markup uses the
plain class names `styles.css` defines (look them up there and in
`components.md`), not Tailwind utilities. This branch is **fully offline** by
construction.

## The Tailwind branches (browser build, no build step)

For `tailwind` and `react-shadcn`, Tailwind v4 ships a browser build that
compiles utilities in-page — the modern replacement for the v3
`cdn.tailwindcss.com` Play CDN. One script tag, no build:

```html
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
```

Source: Tailwind CSS docs, *Play CDN* (tailwindcss.com/docs/installation/play-cdn).
Notes that matter for previews:

- It is **development/prototype-only** — exactly the preview use case. Do not ship
  it to production.
- v4 targets **modern browsers only** (Safari 16.4+, Chrome 111+, Firefox 128+).
  Fine for a team review; note it if the audience uses old browsers.
- It scans the DOM for class names and reads any `<style type="text/tailwindcss">`
  block for `@import`, `@theme`, `@layer`, `@custom-variant`, `@utility`, etc. —
  the same directives the build tool understands.

Pin the major version (`@4`) so a future v5 cannot silently change output.

## Injecting the active target's theme artifact

The injection mechanism depends on the branch:

- **`pure-css`** — the theme artifact (`styles.css`) is plain CSS; inject it in an
  ordinary `<style>` (see the pure-css branch above). No stripping, no compiler.
- **`tailwind` / `react-shadcn`** — the theme artifact (`theme.css` / `globals.css`)
  must live **inside** a `type="text/tailwindcss"` style block for the browser
  build to process `@theme`/`@layer`. A plain `<link>` to it would be treated as
  ordinary CSS and `@theme` would be ignored. So the builder:

  1. Reads the active target's theme artifact once (`theme.css` or `globals.css`).
  2. Strips any leading `@import "tailwindcss";` it contains (the shell already
     has one — avoid duplicating).
  3. Emits the shell's block as:

  ```html
  <style type="text/tailwindcss">
  @import "tailwindcss";
  /* ↓ injected verbatim from the active target's theme artifact ↓ */
  @theme { … }
  @layer base { … }
  @custom-variant dark (&:where(.dark, .dark *));
  </style>
  ```

Because the builder reads the theme artifact once and injects it into every page,
the theme text has a single source of truth even though each output file is
self-contained. Regenerating after a design-system change re-injects it.

## The shadcn / OKLCH case

`react-shadcn` is a Tailwind-branch target whose theme artifact is `globals.css`
instead of `theme.css`: OKLCH colors, `:root` / `.dark` custom-property blocks,
and an `@theme inline { … }` mapping. The browser build supports all of this —
OKLCH, `@theme inline`, and `.dark` overrides. Treat it identically to the
`tailwind` branch: pass `globals.css` as the theme artifact; the same
strip-and-inject step applies. Dark mode still works via the `.dark` class on
`<html>`. No React is generated — the markup stays plain HTML using the same
utility class names shadcn's theme produces.

## Dark mode + state-toggle JS contract

`assets/preview.js` (written by `init`) provides two behaviors. Author markup to
these data-attributes; do not hand-roll per-page JS.

**Dark mode** — a control with `data-theme-toggle` flips `class="dark"` on
`<html>` and persists the choice in `localStorage` (works from `file://` in a
normal browser; this is a downloaded static file, not a sandboxed artifact). The
active target's `.dark` overrides do the rest.

**State toggles** — CSS cannot force `:hover`/`:focus`/`:active` on an element,
so interactive states are simulated by toggling a class on a target:

- A control with `data-state-toggle="<class>"` and `data-target="<selector>"`
  adds/removes `<class>` on the matched element(s) when clicked.
- Convention: the active target's hover/focus styles are exposed as classes you
  can apply directly (e.g. a `hover:bg-surface-hover` paired with a forced
  `bg-surface-hover` for the static example on a Tailwind branch; the equivalent
  hover class from `styles.css` on the pure-css branch). For the *interactive*
  sample, toggle the forced class; for the *static grid*, apply the forced class
  inline so every state is visible at once. Both appear on the showcase page.

The reference JS is generic and self-documenting; read `assets/preview.js` after
`init` for the exact attribute names if extending it.

## Showcase chrome vs design-system surface

Two visual layers, kept apart on purpose:

- **Design-system surface** — the actual component samples, pages, layouts.
  Styled only with the active target's classes (from the injected theme artifact).
- **Chrome** — labels ("Primary", "Hover"), the variant/state grid, the token
  strip, section headings. Styled with `assets/preview.css` using neutral,
  system-font CSS that does **not** depend on the design system.

Keeping chrome design-system-independent means a broken or ugly design-system
value shows up clearly instead of being masked by chrome that happens to look
fine. The chrome also stays readable in both light and dark.

## The manifest

`manifest.json` drives the `build` pass and the generated `index.html`. Shape:

```json
{
  "title": "Acme Design System — Preview",
  "design_system": ".superui/layout/design-system",
  "target": "tailwind",
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
grouped by `group` in declared order. Never hand-edit `index.html`. The active
target is passed on the CLI (`--target`); the optional top-level `target` key
records it for reference.

## Offline vendoring (optional, Tailwind branches)

The `pure-css` branch is already fully offline. For the Tailwind branches, if the
team needs the previews fully offline (no CDN fetch), vendor the browser build
locally. From a network with npm-registry access:

```bash
npm pack @tailwindcss/browser     # → tarball; extract package/dist/index.global.js
# place it at assets/tailwindcss-browser.js, then point the shell <script> at it
```

Pass `--vendor-tailwind` to `init` to have the builder attempt this and rewrite
the shell `<script>` to the local copy. If the registry is unreachable, the
builder leaves the CDN tag and warns. Default is the CDN tag. (No effect on a
`pure-css` target — that branch emits no `<script>` to rewrite.)

## The standalone single-file emit (artifact-conformant)

The multi-file `build` above writes a site whose pages reference shared
`assets/…` files (and, on a Tailwind branch, the CDN). That is correct for local
`file://` review but **not** publishable as a Claude Code Artifact: an artifact is
exactly **one** self-contained file under a strict CSP — no external requests, no
relative-link resolution, one page. `build_site.py standalone` emits that
conformant file, ready to publish as a Claude Code Artifact.

**What gets inlined.** `standalone` composes ONE page by inlining everything the
multi-file shell links out to:

- The showcase CSS and the dark-mode / state-toggle JS go **inline** in a
  `<style>` and a `<script>` block (no `assets/preview.css` / `assets/preview.js`
  `<link>`/`<src>`).
- The active target's theme artifact is injected per its branch (above): the
  `pure-css` `styles.css` as a plain `<style>`; the `tailwind` / `react-shadcn`
  theme inside a `text/tailwindcss` block — but the Tailwind browser build is
  inlined from the **vendored** `assets/tailwindcss-browser.js`, never the CDN
  `<script>` tag (an artifact cannot reach the CDN).
- The body is either one named page (`--page <manifest path or title>`) or the
  **combined showcase** — every manifest page stacked under one `<main>` with
  in-page `#anchor` links and a table of contents (the default).

The result is written to `--dest`; every relative `assets/…` link is dropped.

**The no-external-reference invariant.** A published artifact's CSP forbids any
off-page request, so `standalone` refuses (non-zero exit, with the offending
reference named) rather than emit a page that would fetch at runtime:

- An `http(s)://` or protocol-relative `//host` reference anywhere in the theme or
  a fragment (in a `url(...)`, `href`, `src`, `@import`, …) → refused. `data:`
  URIs and bare in-page `#anchor` fragments are **not** external and are allowed.
- A `tailwind` / `react-shadcn` target with no vendored build at
  `assets/tailwindcss-browser.js` → refused (inlining the CDN tag would leave a
  live fetch). Run `init --vendor-tailwind` first, or use `pure-css` for a
  fully-offline page by construction.

These are the same three guarantees a Claude Code Artifact must satisfy
(single file / no external references / size-bounded), so a `standalone` emit
is publishable as an artifact by construction.
The `pure-css` branch is the cleanest source (plain CSS inlined verbatim, nothing
to vendor); the Tailwind branches inline the vendored build, which makes the file
larger — prefer `--page` or `pure-css` if the combined showcase grows past the
single-page size budget.
