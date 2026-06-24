---
name: ui-component-creator
description: Use when a framework-agnostic design system already exists on disk (default .superui/layout/design-system/, produced by ui-extract-system-design) and the user wants to author a NET-NEW component into it — describe a component that the source UI never had, draft its spec, preview it, and add it to the catalog. Triggers: "add a new component to the design system", "create a <component> spec", "author a stepper / toast / command-palette we don't have yet", "design a new component", "add a component to the inventory", or describing a component the extracted inventory is missing. Interactive L1 loop: help describe → draft an agnostic spec against the canonical component-spec.md (never-fabricate / reconcile discipline reused from ui-extract-system-design, no duplicated method) → render its own minimal pure-CSS single-component preview from tokens.css (variants/states labeled) → iterate visually → on convergence write components/<tier>/<name>.md, add the entry to inventory.md, and reconcile tokens via validate_tokens.py. Strictly L1: MUST NOT depend on ui-web-preview (L1 does not reach downstream). Distinct from ui-extract-system-design (reverse-engineers a whole system from a source) and ui-adapt (maps the system onto a target).
---

# Net-new Component Author

Author a **brand-new** component directly into the **framework-agnostic** design
system that L1 (`ui-extract-system-design`) produced — a component the source UI never had, so
there is nothing to reverse-engineer. This is an interactive L1 loop: help the
user describe the component, draft an agnostic spec, render its own minimal
pure-CSS preview, iterate visually, and on convergence write the spec into the
catalog and reconcile tokens. Run manually: the user names the design-system root
and describes the component.

This skill is **strictly L1**. It writes into the same neutral system `ui-extract-system-design`
owns, using the same canon and discipline. It **MUST NOT** depend on
`ui-web-preview` or any other downstream skill — L1 never reaches downstream. Its
preview is its own tiny, self-contained pure-CSS page, not the multi-page
per-target mockup builder.

## Operating principles

These shape every step. They are the **same** never-fabricate / one-source-of-
truth / reconcile discipline `ui-extract-system-design` runs — reused, not re-invented.

- **Never invent details.** A spec is only useful if it is true. Do not fabricate
  variants, states, anatomy parts, or accessibility behaviours the user has not
  described or confirmed. When a section can't be determined, **ask a short,
  specific question**; if you genuinely can't ask, write
  `> ⚠️ Needs input: <what's missing>` in that section rather than guessing.
- **One source of truth = the design system.** Every visual value the new
  component needs is referenced **by token name** (`color.surface.accent`,
  `radius.control`), never as a raw hex or px. If the component needs a value no
  token provides, that is a reconcile gap — add the token first (Phase 4), do not
  hardcode it.
- **Reuse the canon, don't duplicate it.** The tier taxonomy and the spec
  template live **once**, in `ui-extract-system-design`'s `references/component-spec.md`. Read
  it cross-skill (path below) and follow it verbatim — never paste a second copy
  of the template into this skill or into the output.
- **Ask when ambiguous, never assume.** If the design-system root is missing, the
  tier is unclear, or the description is contradictory, ask before drafting.
- **Faithful preview, neutral chrome.** The preview renders the component from the
  system's own `tokens.css` so a wrong token reference is *visible*. The preview
  chrome (labels, dark toggle) stays in its own namespace and never uses the
  design-system tokens, so it can't mask a defect.

## Inputs — the L1 agnostic system

Read these from `.superui/layout/design-system/` (default; the user may point at
another root). If the root is missing or has no `tokens.css`, stop and tell the
user to run `ui-extract-system-design` first — this skill **adds to** an existing system, it
does not create one.

| Input | What it gives this skill |
|------|------|
| `tokens.css` | The neutral theming artifact — semantic token names as `:root` (light) + `.dark` (dark) CSS custom properties. The preview inlines it; the spec references tokens by name. |
| `design-tokens.yaml` | The DTCG tokens (primitive + semantic). Edited + re-validated in Phase 4 when the new component needs a token the system lacks. |
| `foundations.md` | Principles, token tiers, visual foundations (universal vs web-only), theming, consistency rules, a11y — the rules the new component must honor. |
| `components/inventory.md` | The tiered catalog the new entry is appended to. Read it first so the new component fits the existing tier grouping and naming. |
| `components/<tier>/<name>.md` | Sibling specs — read one near the new component's tier to mirror depth, section order, and naming. |

**The canonical spec template (cross-skill, read-only):**

```
${CLAUDE_PLUGIN_ROOT}/skills/ui-extract-system-design/references/component-spec.md
```

This is the **single** canonical, framework-agnostic three-tier taxonomy + spec
template, shared with `ui-extract-system-design`. **Read it** before drafting and follow its
structure and section guidance exactly. The filled-in depth reference is
`${CLAUDE_PLUGIN_ROOT}/skills/ui-extract-system-design/assets/example-component-spec.md`.
Never duplicate the template — reuse it in place so the two producers stay in
sync.

## Outputs

On convergence, write under the design-system root (default
`.superui/layout/design-system/`):

| File | What happens |
|------|------|
| `components/<tier>/<name>.md` | The new component spec — **created** from the canonical template. |
| `components/inventory.md` | The new component **appended** under its tier (do not rewrite the file; add the one entry, preserving the existing grouping). |
| `design-tokens.yaml` | **Edited only if** the component needs a value no token provides (Phase 4 reconcile), then re-validated. |

The preview HTML (Phase 3) is a throwaway working artifact — write it under a
scratch path the user can open (e.g. `.superui/layout/design-system/.preview/<name>.html`)
and do not catalog it.

## Workflow

An interactive loop. Phases 1–3 repeat until the spec and preview converge; 4–5
land the result.

### Phase 0 — Intake

1. Resolve the design-system root (ask if not given). `view` it; confirm
   `tokens.css` and `components/` exist. A prompt naming a system does not
   guarantee it is present — check. If `tokens.css` is absent, stop and point the
   user to `ui-extract-system-design`.
2. Read `tokens.css`, skim `foundations.md`, and read `components/inventory.md`
   so you know the available tokens, the system's rules, and the existing tiers.
3. Read the canonical `component-spec.md` (path above) and skim a sibling spec
   near the new component's likely tier for depth and naming.

### Phase 1 — Describe (interactive)

Help the user pin down the component. Ask short, specific questions until you can
state, without guessing: its **one-sentence purpose**, its **tier** (Layout /
Composite / Atomic, per the canonical taxonomy), its **variants** (author-time
configurations) and **states** (runtime conditions) — keep the two distinct —
its **anatomy** (named parts), and its **accessibility** behaviour. Confirm the
component is genuinely **net-new** (absent from `inventory.md`); if it already
exists, stop and tell the user to edit the existing spec instead.

### Phase 2 — Draft the agnostic spec

Draft the spec **in working memory / a scratch file** using the canonical
template's exact structure, order, and section guidance. Reference every visual
value **by token name** from `tokens.css`. For any section the description does
not support, ask the user or carry `> ⚠️ Needs input: <what's missing>` — never
fabricate. This is a draft for preview, not the final write (that is Phase 5).

### Phase 3 — Preview (own minimal pure-CSS page)

Author a tiny HTML **fragment** for the component that renders **every drafted
variant and every drafted state**, each labeled, styling itself from the design
system's tokens via the CSS custom properties `tokens.css` declares
(`var(--color-...)`, …) — not raw values. A forced-state sample (a static element
with the hover/focus appearance) covers states CSS can't trigger statically;
label it as forced.

Render it with the bundled preview script — a single self-contained pure-CSS
`file://` page that inlines `tokens.css`, **no Tailwind, no CDN, no build step**:

```bash
python ${CLAUDE_SKILL_DIR}/scripts/preview_component.py \
  --design-system .superui/layout/design-system \
  --fragment <scratch>/<name>.fragment.html \
  --out .superui/layout/design-system/.preview/<name>.html \
  --title "<Component> preview"
```

Tell the user to open the `--out` file in a browser (the chrome has a dark/light
toggle). This script is intentionally one-component-only and **distinct from**
the downstream `ui-web-preview`'s `build_site.py` (multi-page, per-target,
Tailwind). Do not reach for `build_site.py` or any downstream skill here.

### Phase 4 — Iterate + reconcile

Loop with the user on the preview: adjust the draft spec and the fragment, re-run
the preview, repeat until it matches intent. Cross-check tokens ↔ component: if a
needed value has no token (a new focus-ring color, a component-scoped radius),
**add it to `design-tokens.yaml`** as a token (primitive → semantic, never a
duplicated raw value), then re-validate and fix every error before continuing:

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/ui-extract-system-design/scripts/validate_tokens.py \
  .superui/layout/design-system/design-tokens.yaml
```

If you added or changed a token, also update `tokens.css` to keep the neutral
theming artifact in sync (the same `:root` / `.dark` parallel-value discipline
`ui-extract-system-design` uses) and re-run the preview so it reflects the new token.

### Phase 5 — Converge: write into the catalog

When the spec and preview match intent:

1. Write the spec to `components/<tier>/<name>.md` using the canonical template.
2. **Append** the new component to `components/inventory.md` under its tier
   (add the one entry; preserve the existing grouping and order — do not rewrite
   the file).
3. Confirm `validate_tokens.py` exits 0 on the (possibly updated)
   `design-tokens.yaml`.

## Presenting results

Use `present_files` with the new `components/<tier>/<name>.md` first, then the
updated `inventory.md` (and `design-tokens.yaml` if it changed). Keep the message
short: the component name + tier, the variants/states it documents, any
`⚠️ Needs input` gaps left for the user to resolve, and any tokens you added.
Then offer the natural next step (see Related skills).

## Reference files

This skill reuses `ui-extract-system-design`'s canon rather than carrying its own — read these
cross-skill (load on demand):

- `${CLAUDE_PLUGIN_ROOT}/skills/ui-extract-system-design/references/component-spec.md` — the
  **canonical** three-tier taxonomy + spec template + section guidance (the
  shared canon). **Read before Phases 1–2 and 5.**
- `${CLAUDE_PLUGIN_ROOT}/skills/ui-extract-system-design/assets/example-component-spec.md` —
  a complete, filled-in Button spec at the expected depth. **Skim for depth.**
- `${CLAUDE_PLUGIN_ROOT}/skills/ui-extract-system-design/references/dtcg-token-format.md` —
  DTCG YAML schema. **Read only if Phase 4 adds a token.**

## Scripts

Plain Python 3 (stdlib only — no install needed).

- `scripts/preview_component.py --design-system DIR --fragment FRAG.html --out
  OUT.html [--title T]` — wraps **one** component fragment + the inlined
  `tokens.css` into a single self-contained pure-CSS `file://` page. Intentionally
  tiny (one component, no manifest/index/targets, no Tailwind/CDN) and distinct
  from `ui-web-preview`'s `build_site.py`. Run
  `python scripts/preview_component.py --help`.

Token validation reuses `ui-extract-system-design`'s
`${CLAUDE_PLUGIN_ROOT}/skills/ui-extract-system-design/scripts/validate_tokens.py` (needs
`pyyaml`: `pip install pyyaml --break-system-packages`). There is no separate
validator here.

## Related skills

This skill is **L1** — it writes into the framework-agnostic core. Everything
framework- or preview-specific is downstream; mention the next step when you
finish (reference by name; load on demand). **Do not depend on any of these from
within this skill** — L1 never reaches downstream.

- **ui-extract-system-design** — the L1 core that produces the system this skill adds to, and
  the owner of the canonical `component-spec.md` this skill reuses. Run it first
  if no design system exists yet.
- **ui-adapt** — adapts the agnostic system (including the component you just
  authored) to **one** chosen target. Re-run it afterward to map the new
  component into a target. The natural next step *after* the spec lands.
- **ui-web-preview** — renders live HTML preview pages for web targets once
  `ui-adapt` has produced a target. (This skill's own preview is a tiny L1
  authoring aid; the full multi-page builder is downstream — do not call it from
  here.)
- **ui-guardian** — binds UI implementation to the design system and the active
  target contract during coding.
