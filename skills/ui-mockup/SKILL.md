---
name: ui-mockup
description: 'Use when a design system already exists (from ui-extract
  or an equivalent: design tokens, a theme.css/globals.css, and component specs)
  and the user wants live HTML pages to preview, verify, or present it. Triggers:
  "generate mockups", "build mockup pages", "preview the design system", "show the
  components in HTML", "make a component showcase", "build login/signup/404 pages
  from the design system", "present the design system to the team", or a path to a
  design-system folder. Produces self-contained, zero-build static HTML (Tailwind
  v4 browser CDN) in a chosen directory: an index page, layout pages, app pages
  (login, signup, password reset, 404/500), and one showcase page per component
  with every variant and state, plus a dark/light toggle. Does not extract or
  author the design system itself; that is the separate ui-extract
  skill.'
---

# Mockup Generator

Turn an existing **design system** — tokens, a theme stylesheet, and component
specs — into a set of **live, self-contained HTML pages** so the user can open
them in a browser, confirm the system is coherent and matches intent, spot
components that need correction, and present it to a team. Run manually: the
user names the design-system source and the output directory.

## Operating principles

Carried from the upstream system. They shape every step.

- **Render only what the specs document.** Every variant, state, and part shown
  must come from a component spec or a page in the design system. Never invent a
  variant, color, size, or state that the source does not define.
- **Surface gaps, do not fill them.** If a spec says `⚠️ Needs input: …`, render
  a visible placeholder card carrying that exact note — do not guess the markup.
  The mockups are a verification surface; a hidden gap defeats the purpose.
- **One source of truth = the design system.** Class names, colors, and spacing
  come from the generated `theme.css`/`globals.css`, never from memory. The
  builder injects that theme into every page, so the theme text lives once.
- **Ask when ambiguous, never assume.** If the design-system folder is missing
  files, the theme format is unclear, or a spec is contradictory, ask before
  generating.
- **Faithful, not embellished.** Do not add decorative flourishes the design
  system does not call for. Fidelity is the point; a prettier-than-the-spec
  mockup hides defects.

## Inputs — the design-system contract

Point the skill at a design-system directory (default
`.docs/layout/design-system/`). Read these before generating; if the
theme or specs are absent, stop and ask.

| File | Used for |
|------|----------|
| `theme.css` (or `globals.css` for shadcn) | Injected into every page; **defines the actual utility class names** available |
| `components/inventory.md` | The list of components → one showcase page each |
| `components/<tier>/<name>.md` | Per-component variants, states, anatomy, tokens → the showcase content |
| `foundations.md` | Page/layout intent, theming approach, a11y notes |
| `design-tokens.yaml` | Cross-reference only (the theme is the class-name source) |

**Critical:** component specs name tokens as DTCG dot-paths (`color.surface.accent`,
`radius.control`). The **utility class names** that actually work
(`bg-surface`, `rounded-control`, …) live in `theme.css`. Read `theme.css` to
learn the real classes; use those in the markup. → `references/page-anatomy.md`.

## Outputs

Write under the user-specified directory (default `.docs/layout/mockups/`):

```
index.html              # index of every generated page, styled with the design system
layouts/                # layout_base.html (app shell), layout_showcase.html (kitchen sink), …
pages/                  # login, signup, password-reset, error-404, error-500, + pages from composite specs
components/             # one <name>.html per component — every variant × state
assets/
  mockup.js             # dark/light toggle + interactive state toggles
  mockup.css            # neutral showcase chrome (labels, grids) — kept separate from the design system
```

`index.html`, `layouts/`, and `pages/` are styled **with** the design system.
Component showcase pages render DS-styled samples inside a **neutral** chrome so
the chrome never masks a design-system defect.

## Delivery: zero-build, browser CDN

Each page is self-contained and opens directly from disk (`file://`). It loads
the **Tailwind v4 browser build** from a CDN and inlines the design-system theme
into a `style type="text/tailwindcss"` block, so utilities resolve in the
browser with no build step. Exact `head` template, theme-injection mechanics,
dark-mode + state-toggle JS, and the shadcn/OKLCH case: `references/page-anatomy.md`.
(The browser build is dev/prototype-only — correct for review mockups; it needs
internet to fetch the CDN. Offline vendoring option is in the reference.)

## Workflow

Phases in order. The builder script handles all boilerplate; author judgment
goes into the per-page content fragments.

### Phase 0 — Intake
1. Resolve the design-system directory and the output directory (ask if not
   given). `view` the directory; confirm a theme file and `components/` exist.
   A prompt naming a source does not guarantee it is present — check.
2. Detect the theme flavor: standard Tailwind v4 (`theme.css`) vs shadcn
   (`globals.css`, OKLCH). The builder handles both; just pass the right file.
3. Read `theme.css` and skim `foundations.md` so you know the available utility
   classes and the theming/dark-mode setup before writing any markup.

### Phase 1 — Scaffold
Read `references/page-anatomy.md`, then scaffold the site and shared assets:

```bash
python scripts/build_site.py init \
  --design-system .docs/layout/design-system \
  --out .docs/layout/mockups
```

This creates the folders, writes `assets/mockup.js` and `assets/mockup.css`, and
caches the theme. It does **not** write content pages — you author those next.

### Phase 2 — Author component showcases
Read `references/showcase-patterns.md`. For **each** component in
`components/inventory.md`: read its spec, then author a content fragment that
renders every documented variant, and every documented state (using the
real-state vs forced-state convention from the reference), each labeled, plus a
"Tokens consumed" strip for traceability. Save fragments under
`content/components/<name>.html`. Surface any `⚠️ Needs input` as a placeholder.

### Phase 3 — Author pages
Author the standard app pages — login, signup, password reset, error 404, error
500 — plus one page per relevant **composite** form spec (register, 2FA, create,
edit, search). Build each from the documented composite/atomic components, not
from scratch. Save under `content/pages/<name>.html`.

### Phase 4 — Author layouts
Author `layout_base.html` from the **layout-tier** specs (app shell: header,
sidebar/nav, content region) and `layout_showcase.html` — a single kitchen-sink
page placing many components together to reveal spacing/rhythm inconsistencies.
One layout file per distinct layout component. Save under `content/layouts/`.

### Phase 5 — Build + index
Author `manifest.json` listing every page (`path`, `title`, `group`, `layout`),
then build the whole site and the auto-generated `index.html` in one pass:

```bash
python scripts/build_site.py build \
  --design-system .docs/layout/design-system \
  --out .docs/layout/mockups \
  --manifest manifest.json
```

The builder wraps each fragment in the shared page shell (CDN + injected theme +
assets), then regenerates `index.html` from the manifest so it always lists every
page. → manifest schema in `references/page-anatomy.md`.

### Phase 6 — Verify and present
Spot-check the generated HTML for broken token references (a utility class with
no matching `theme.css` variable renders unstyled — fix by using the real class
name). Then `present_files` with `index.html` first. Keep the message short:
what was generated, the page/component count, and any `⚠️ Needs input` gaps the
user should resolve in the design system.

## Quick reference

| Need | Do |
|------|-----|
| Find the real utility class for a token | Look it up in `theme.css`, not the spec's dot-path |
| Show a `:hover`/`:focus` state | Forced-state class on a static sample (CSS can't force pseudo-classes) — see reference |
| A spec section is missing | Render a `⚠️ Needs input` placeholder; do not invent |
| Add dark mode | Already wired: `mockup.js` toggles `.dark` on `html`; theme provides the overrides |
| Regenerate after a design-system change | Re-run `build_site.py build`; fragments and theme re-inject |

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Using spec dot-path names as classes (`bg-color.surface.accent`) | Use the generated utility (`bg-surface`) from `theme.css` |
| Inventing variants/states not in the spec | Render only documented ones; flag gaps |
| Inlining the theme by hand into each file | Let `build_site.py` inject it — one source of truth |
| Styling showcase chrome with DS utilities | Keep chrome in neutral `mockup.css` so it can't hide DS defects |
| `index.html` drifting out of sync | Never hand-edit it; it is generated from `manifest.json` |
| Embellishing beyond the spec | Match the spec exactly; fidelity reveals defects |

## Reference files
- `references/page-anatomy.md` — the page shell template, Tailwind v4 browser-CDN
  + theme-injection mechanics, the shadcn/OKLCH case, dark-mode + state-toggle JS
  contract, manifest schema, offline vendoring. **Read before Phase 1.**
- `references/showcase-patterns.md` — turning a component spec into a showcase
  (variants × states, forced-state convention, anatomy annotation, token strip),
  the standard page set, per-tier patterns, surfacing gaps. **Read before Phase 2.**

## Scripts
Plain Python 3 (stdlib only — no install needed).
- `scripts/build_site.py init|build …` — scaffolds the site + shared assets,
  injects the design-system theme into every page, and generates `index.html`
  from the manifest. Run `python scripts/build_site.py --help`.

## Related skills
- **ui-extract** — produces the design system (tokens, theme,
  component specs) this skill consumes. It is the **required upstream**: run it
  first if no design system exists yet. (Reference by name; load on demand.)
