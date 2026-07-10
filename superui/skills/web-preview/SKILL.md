---
name: web-preview
description: Use when a design system has already been adapted to a web target (a targets/<target>/ directory produced by adapt-target with a target.md + a theme artifact + components.md) and the user wants live HTML pages to preview, verify, or present it. Triggers: "preview the design system", "generate web preview pages", "build mockup/preview pages", "show the components in HTML", "make a component showcase", "build login/signup/404 pages from the design system", "present the design system to the team", or a path to a targets/<target>/ folder. Web targets only — pure-css (plain CSS), tailwind (Tailwind v4 browser CDN), and react-shadcn (Tailwind CDN, OKLCH theme); produces self-contained, zero-build static HTML in a chosen directory: an index page, layout pages, app pages (login, signup, password reset, 404/500), and one showcase page per component with every variant and state, plus a dark/light toggle. N/A for react-mui / flutter — those are previewed with their own tooling (Storybook / DartPad). Does not extract the agnostic system (extract-design-system) or adapt it to a target (adapt-target).
allowed-tools: Bash(sh:*)
---

# Web Preview Generator

Turn a design system that has already been **adapted to a web target** — a
`targets/<target>/` directory with a target manifest, a theme artifact, and a
component mapping — into a set of **live, self-contained HTML pages** so the user
can open them in a browser, confirm the system is coherent and matches intent,
spot components that need correction, and present it to a team. Run manually: the
user names the design-system root and the output directory; the skill resolves
the active web target from the on-disk `targets/<target>/` contract.

## Python preflight

!`"${CLAUDE_PLUGIN_ROOT}/shared/scripts/check_python.sh"`

The line above runs this skill's Python check at load. If it reads `PYTHON_MISSING`,
tell the user this skill's `*.py` steps need **Python 3** (install it; on Windows make
sure `python` or `py` is on `PATH`) and **stop before any `python …` step**. If it reads
`PYTHON_OK <cmd>`, use `<cmd>` in place of `python` in every `python …` command below.

## Operating principles

Carried from the upstream system. They shape every step.

- **Render only what the specs document.** Every variant, state, and part shown
  must come from a component spec or a page in the design system. Never invent a
  variant, color, size, or state that the source does not define.
- **Surface gaps, do not fill them.** If a spec or `target.md` says
  `⚠️ Needs input: …`, render a visible placeholder card carrying that exact note
  — do not guess the markup. The previews are a verification surface; a hidden
  gap defeats the purpose.
- **One source of truth = the active target.** Class names, colors, and spacing
  come from the chosen target's theme artifact (its `<theme-artifact>`), never
  from memory. The builder injects that theme into every page, so the theme text
  lives once.
- **Ask when ambiguous, never assume.** If the `targets/<target>/` directory is
  missing files, the target is not a web target, or a spec is contradictory, ask
  before generating.
- **Faithful, not embellished.** Do not add decorative flourishes the design
  system does not call for. Fidelity is the point; a prettier-than-the-spec
  preview hides defects.

## Inputs — the per-target contract

Point the skill at a design-system root (default `.superui/layout/design-system/`)
that has at least one adapted **web** target under `targets/<target>/`. The
target manifest (`target.md`) is the entry point: it names the target and its
theme-artifact filename. Read these before generating; if the target directory or
its theme artifact is absent, stop and ask (and direct the user to `adapt-target`).

| File | Used for |
|------|----------|
| `targets/<target>/target.md` | The active target manifest — names the target and its `<theme-artifact>` filename, install/import lines, and any `⚠️ Needs input` to surface |
| `targets/<target>/<theme-artifact>` (`styles.css` \| `theme.css` \| `globals.css`) | Injected into every page; **defines the actual class names** available |
| `targets/<target>/components.md` | The L1-spec × target mapping — how each component is realized on this target (markup pattern + classes) |
| `components/inventory.md` | The list of components → one showcase page each |
| `components/<tier>/<name>.md` | Per-component variants, states, anatomy, tokens → the showcase content (the WHAT) |
| `foundations.md` | Page/layout intent, theming approach, a11y notes |

**Web targets only.** This skill renders `pure-css`, `tailwind`, and
`react-shadcn`. For `react-mui` and `flutter`, stop and tell the user those are
previewed with their own ecosystem tooling — see "Non-web targets" below.

**Critical:** component specs name tokens as DTCG dot-paths (`color.surface.accent`,
`radius.control`). The **class names** that actually work live in the active
target's theme artifact (Tailwind utilities like `bg-surface` for `tailwind` /
`react-shadcn`; the plain CSS classes the `styles.css` layer defines for
`pure-css`). Read the theme artifact to learn the real classes, and read
`components.md` for the per-component markup pattern; use those in the markup. →
`references/page-anatomy.md`.

## Web targets and their delivery

The active target (resolved from `target.md`) selects both the theme-artifact
filename and how the page reaches the browser:

| Target | Theme artifact | Delivery |
|--------|----------------|----------|
| `pure-css` | `styles.css` | Plain CSS injected as an ordinary `<style>` (or linked) — **no Tailwind, no CDN, no build**. Markup uses the classes `styles.css` defines. |
| `tailwind` | `theme.css` | Tailwind v4 browser CDN; theme injected into a `<style type="text/tailwindcss">` block so `@theme` resolves in-page. |
| `react-shadcn` | `globals.css` | Tailwind v4 browser CDN; the shadcn OKLCH `:root`/`.dark` + `@theme inline` theme injected the same way. Markup stays plain HTML using shadcn's utility class names — no React is generated. |

The builder reads `target.md` to learn which branch applies and injects the right
theme artifact the right way. Exact head templates per branch, the
plain-CSS-vs-Tailwind-CDN split, dark-mode + state-toggle JS, and the OKLCH case:
`references/page-anatomy.md`. (The Tailwind browser build is dev/prototype-only —
correct for review previews; it needs internet to fetch the CDN. The `pure-css`
branch is fully offline by construction; an offline-vendoring option for the
Tailwind branches is in the reference.)

## Non-web targets (`react-mui` / `flutter`)

These are **out of scope** for this skill — there is no faithful zero-build
static-HTML preview for a React-MUI component tree or a Flutter widget tree.
When the active (or requested) target is one of these, do not generate; instead
tell the user where its native preview lives:

- `react-mui` → **Storybook** (or a Vite/CRA sandbox) renders the real MUI
  components against the generated `theme.ts`.
- `flutter` → **DartPad** (or a local `flutter run`) renders the widgets against
  the generated `theme.dart`.

If the user wants a static appearance check anyway, point them at adapting a web
target (`pure-css` / `tailwind`) as an approximation.

## Outputs

Write under the user-specified directory (default `.superui/layout/preview/`):

```
index.html              # index of every generated page, styled with the design system
layouts/                # layout_base.html (app shell), layout_showcase.html (kitchen sink), …
pages/                  # login, signup, password-reset, error-404, error-500, + pages from composite specs
components/             # one <name>.html per component — every variant × state
assets/
  preview.js            # dark/light toggle + interactive state toggles
  preview.css           # neutral showcase chrome (labels, grids) — kept separate from the design system
```

`index.html`, `layouts/`, and `pages/` are styled **with** the design system.
Component showcase pages render DS-styled samples inside a **neutral** chrome so
the chrome never masks a design-system defect.

## Delivery: zero-build static HTML

Each page is self-contained and opens directly from disk (`file://`). How the
theme reaches the browser depends on the active target's branch (above): the
`pure-css` branch inlines plain CSS with no network at all; the `tailwind` and
`react-shadcn` branches load the **Tailwind v4 browser build** from a CDN and
inline the theme artifact into a `<style type="text/tailwindcss">` block so
utilities resolve in the browser with no build step. Exact `head` templates per
branch, theme-injection mechanics, the OKLCH case, dark-mode + state-toggle JS,
and offline vendoring for the Tailwind branches: `references/page-anatomy.md`.

## Share a preview as an artifact (standalone single-file emit)

The multi-file site above is the default. When the user wants to **share** a
preview as a live link (not a `file://` path), emit a single self-contained file.
The builder's `standalone` command writes ONE network-free HTML page by inlining
the showcase CSS/JS and the active target's theme directly, and dropping every
relative `assets/…` link:

```bash
python ${CLAUDE_SKILL_DIR}/scripts/build_site.py standalone \
  --design-system .superui/layout/design-system \
  --target <chosen> \
  --out .superui/layout/preview \
  --manifest manifest.json \
  --dest .superui/layout/preview/standalone.html
# add --page "<manifest path or title>" to emit one page;
# default is the combined showcase of every manifest page.
```

It produces a file built to satisfy the Claude Code Artifact CSP (one file, no
external requests, in-page anchors only), so the `--dest` emit is publishable as a
private, shareable Claude Code Artifact as-is (or served from the local path when
artifacts are unavailable). Run the multi-file `build` for local review; run
`standalone` only when producing a shareable link.

**Caveats — size & Tailwind vendoring:**

- **`pure-css` is cleanest.** Its theme is plain CSS, so `standalone` inlines it
  verbatim and the page is fully offline by construction — nothing to vendor.
- **`tailwind` / `react-shadcn` need the vendored build.** Inlining the CDN
  `<script>` tag is not enough — an artifact cannot fetch the CDN, so `standalone`
  inlines the **vendored** browser build instead. Run `init --vendor-tailwind`
  first; without `assets/tailwindcss-browser.js` the `standalone` command refuses
  (non-zero exit) rather than emit a page that fetches at runtime.
- **Size.** Inlining the vendored Tailwind build plus every page into one file
  makes the Tailwind-branch standalone file large; an artifact is a single
  page (CSP cap ~16 MiB). Prefer `--page` to emit one page, or use `pure-css`,
  when the combined showcase grows too big to publish.

If the active theme/fragment carries an external `url()` / `http(s)://` / `//host`
reference (which the artifact CSP forbids), `standalone` refuses with the
offending reference named — inline or remove it at the source, then re-emit. →
the standalone single-file inlining contract in `references/page-anatomy.md`.

## Workflow

Phases in order. The builder script handles all boilerplate; author judgment
goes into the per-page content fragments.

### Phase 0 — Intake
1. Resolve the design-system root and the output directory (ask if not given).
   `view` the root; confirm a `targets/<target>/` directory with a `target.md`
   and a theme artifact exists. A prompt naming a source does not guarantee it is
   present — check.
2. Resolve the active target from `target.md`. If it is `react-mui` or `flutter`,
   stop and follow "Non-web targets" above. If it is a web target, note its
   `<theme-artifact>` filename and which delivery branch applies.
3. Read the theme artifact and `components.md`, and skim `foundations.md`, so you
   know the available classes, the per-component markup patterns, and the
   theming/dark-mode setup before writing any markup.

### Phase 1 — Scaffold
Read `references/page-anatomy.md`, then scaffold the site and shared assets:

```bash
python ${CLAUDE_SKILL_DIR}/scripts/build_site.py init \
  --design-system .superui/layout/design-system \
  --target <chosen> \
  --out .superui/layout/preview
```

This creates the folders, writes `assets/preview.js` and `assets/preview.css`,
and validates the target's theme artifact is present. It does **not** write
content pages — you author those next.

### Phase 2 — Author component showcases
Read `references/showcase-patterns.md`. For **each** component in
`components/inventory.md`: read its spec and its `components.md` entry, then
author a content fragment that renders every documented variant, and every
documented state (using the real-state vs forced-state convention from the
reference), each labeled, plus a "Tokens consumed" strip for traceability. Save
fragments under `content/components/<name>.html`. Surface any `⚠️ Needs input` as
a placeholder.

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
Author `manifest.json` listing every page (`path`, `fragment`, `title`, `group`, `layout`),
then build the whole site and the auto-generated `index.html` in one pass:

```bash
python ${CLAUDE_SKILL_DIR}/scripts/build_site.py build \
  --design-system .superui/layout/design-system \
  --target <chosen> \
  --out .superui/layout/preview \
  --manifest manifest.json
```

The builder wraps each fragment in the shared page shell (the right delivery
branch for the active target + injected theme artifact + assets), then
regenerates `index.html` from the manifest so it always lists every page. →
manifest schema in `references/page-anatomy.md`.

### Phase 6 — Verify and present
Spot-check the generated HTML for broken class references (a class with no
matching rule/variable in the theme artifact renders unstyled — fix by using the
real class name from the theme artifact / `components.md`). Then `present_files`
with `index.html` first. Keep the message short: what was generated, the
page/component count, and any `⚠️ Needs input` gaps the user should resolve in
the design system.

## Quick reference

| Need | Do |
|------|-----|
| Find the real class for a token | Look it up in the active target's theme artifact (+ `components.md`), not the spec's dot-path |
| Show a `:hover`/`:focus` state | Forced-state class on a static sample (CSS can't force pseudo-classes) — see reference |
| A spec section is missing | Render a `⚠️ Needs input` placeholder; do not invent |
| Add dark mode | Already wired: `preview.js` toggles `.dark` on `html`; the theme artifact provides the overrides |
| Regenerate after a design-system change | Re-run `build_site.py build`; fragments and theme artifact re-inject |
| Target is `react-mui` / `flutter` | Out of scope — point the user at Storybook / DartPad (see "Non-web targets") |

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Using spec dot-path names as classes (`bg-color.surface.accent`) | Use the real class from the theme artifact (`bg-surface` for Tailwind; the `styles.css` class for pure-css) |
| Loading the Tailwind CDN for a `pure-css` target | `pure-css` ships plain CSS — no CDN, no `text/tailwindcss` block; the builder picks the branch from `target.md` |
| Inventing variants/states not in the spec | Render only documented ones; flag gaps |
| Inlining the theme by hand into each file | Let `build_site.py` inject it — one source of truth |
| Styling showcase chrome with DS classes | Keep chrome in neutral `preview.css` so it can't hide DS defects |
| `index.html` drifting out of sync | Never hand-edit it; it is generated from `manifest.json` |
| Trying to preview `react-mui` / `flutter` as static HTML | Out of scope — use the native tooling (Storybook / DartPad) |

## Reference files
- `references/page-anatomy.md` — the page shell templates (per delivery branch),
  the per-target theme injection (plain-CSS `pure-css` branch vs Tailwind v4
  browser-CDN branch), the shadcn/OKLCH case, dark-mode + state-toggle JS
  contract, manifest schema, offline vendoring. **Read before Phase 1.**
- `references/showcase-patterns.md` — turning a component spec into a showcase
  (variants × states, forced-state convention, anatomy annotation, token strip),
  the standard page set, per-tier patterns, surfacing gaps. **Read before Phase 2.**

## Scripts
Plain Python 3 (stdlib only — no install needed).
- `${CLAUDE_SKILL_DIR}/scripts/build_site.py init|build|standalone …` — `init`/`build` scaffold the
  multi-file site + shared assets, inject the active target's theme artifact into
  every page (selecting the delivery branch from `target.md`), and generate
  `index.html` from the manifest. `standalone` emits ONE self-contained,
  network-free HTML file (Claude Code Artifact) by inlining the CSS/JS + theme and
  dropping relative `assets/…` links (see "Share a preview as an artifact" above).
  Run `python ${CLAUDE_SKILL_DIR}/scripts/build_site.py --help`.

## Related skills
- **adapt-target** — adapts the agnostic L1 system to one concrete target, producing
  the `targets/<target>/` contract this skill consumes. It is the **required
  upstream** for web targets: run it (and pick a web target) first if no
  `targets/<target>/` exists yet. (Reference by name; load on demand.)
- **extract-design-system** — produces the framework-agnostic L1 system (`tokens.css`,
  `components/inventory.md` + specs) that `adapt-target` reads. Run it first if no
  design system exists at all.
