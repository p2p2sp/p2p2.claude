# SimplePlan
To build this plan must use the `simplebuild` skill.

Title: "feat(pro-designer): adopt curated UI/UX rules from ui-ux-pro-max analysis"

---
<!-- HEADER -->

## Goal
`superui/skills/pro-designer` carries the curated HIGH+MEDIUM knowledge selected from the 7-agent analysis of the ui-ux-pro-max-skill repo: new rules woven into 5 existing reference files, a new `references/tokens.md` with token-architecture doctrine, a routing line for it in `SKILL.md`, and an updated pro-designer description in `superui/CLAUDE.md`.

## Context
A 7-agent comparative analysis of github.com/nextlevelbuilder/ui-ux-pro-max-skill (clone at `.temp/ui-ux-pro-max-skill`) identified a curated set of genuinely additive, stack-agnostic rules missing from pro-designer, plus one structural gap: token-architecture doctrine. The user approved the exact item list in an interview. All content is advisory markdown - no scripts, no behavior change elsewhere. Constraints: stack-agnostic wording (plain CSS/HTML, no Tailwind/shadcn/React), style per `.claude/rules/_skills.md` (delta-only bullets, no tables, no emoji, no italics), never an em dash (U+2014) or en dash (U+2013) - plain hyphen only, and where the external source conflicts with existing pro-designer rules the existing rule wins unchanged (keep: 80ms stagger delay, M3 disabled recipe with aria-disabled, undo-over-confirm, 4.5:1 secondary-text floor).

## Acceptance criteria
1. `references/forms.md` carries a mobile input mechanics section: minimum 16px font-size on inputs because iOS Safari auto-zooms below 16px; semantic `type`/`inputmode` attributes to raise the matching mobile keyboard; correct `autocomplete` tokens and a ban on blanket `autocomplete="off"`.
2. `references/accessibility.md` carries: a viewport rule (never `user-scalable=no` or `maximum-scale=1`; keep pinch-zoom available) and an accessible-name rule (icon-only controls need `aria-label` or visually hidden text; meaningful images need alt text; decorative ones are hidden from assistive tech).
3. `references/components-states.md` carries all nine approved items: overlay focus/keyboard contract (modal traps focus, closes on Esc, returns focus to trigger; menu opens on Enter/Space, navigates with arrows, closes on Esc), modal scrim 40-60% black, toast discipline (auto-dismiss 3-5s, never steals focus, `aria-live="polite"`, assertive only for errors), `aria-live` for non-form async status, full state priority order (disabled > loading > pressed > focus > hover), enter/exit motion asymmetry (exit ~60-70% of enter duration; ease-out entering, ease-in exiting, never linear for UI motion), stagger cap (~8 children; existing 80ms delay value unchanged), space reservation for async content against layout shift (explicit dimensions or aspect-ratio; `font-display: swap` with a metric-similar fallback), and token-by-token streaming for AI responses instead of a long spinner.
4. `references/saas-dashboards.md` carries: chart micro-rules (pie/donut max 5 categories - switch to bars beyond; sort bar charts descending by value unless the axis is ordinal/time; provide a data-table alternative or a text summary for screen readers) and SVG icon craft rules (`currentColor` fills, `viewBox="0 0 24 24"`, a `<title>` element, design at 24px and test at 16px and 48px) plus an icon style-to-context mapping (outlined ~2px stroke for dense app UI, filled for mobile nav/toolbars, duotone for marketing surfaces - one style per product, per the distinctiveness lock).
5. `references/process.md` finish checklist carries: a social-share og:image (1200x630, critical content centered because platforms crop) and the favicon line extended with "legible at 16px, survives single-color".
6. New `references/tokens.md` (~40 lines) exists covering: primitive -> semantic -> component layering with each layer referencing only the layer below; components consume semantic tokens, never primitives; dark mode overrides only the semantic layer; paired surface/foreground tokens; role-based naming (`destructive` not `red`) with the `--{category}-{item}-{variant}-{state}` convention; radius scale derived from one base token; named z-index tiers (content tiers, then dropdown < sticky < modal < popover < tooltip) instead of arbitrary `9999`; no raw hex/px values in component code once tokens exist. `SKILL.md` "Reference routing" has a line routing token architecture / theming mechanism / CSS variables / z-index layering to `references/tokens.md`, and `superui/CLAUDE.md`'s pro-designer entry mentions the new reference.
7. Every file under `superui/skills/pro-designer/` touched by this plan (the 5 edited references, tokens.md, SKILL.md) is free of em dashes (U+2014) and en dashes (U+2013) - including the two pre-existing en dashes in forms.md example strings, replaced with plain hyphens; new content uses bullets only (no tables, no emoji, no italics); no Tailwind/shadcn/React-specific wording in any added rule; all pre-existing rules that conflicted with the external source remain unchanged (`superui/CLAUDE.md` is exempt from the dash sweep - only its pro-designer entry sentence changes).

<!-- /HEADER -->

---

<!-- TASK -->

## Task 1 - feat(pro-designer): add mobile input and non-visual a11y rules
- Covers: criteria #1, #2, #7
- TDD: none

### Dependencies
- none

### Files
- modify - superui/skills/pro-designer/references/forms.md (new section "Mobile input mechanics")
- modify - superui/skills/pro-designer/references/accessibility.md (extend section "Resize and spacing resilience"; new section "Accessible names and hidden semantics")

### Test Commands
*Build*
- none - markdown-only change, this repo has no build step

*Tests*
- `grep -n "16px" superui/skills/pro-designer/references/forms.md` - at least one match (new iOS zoom rule present; the file currently has none)
- `grep -n "aria-label" superui/skills/pro-designer/references/accessibility.md` - at least one match
- `! grep -rn "—" superui/skills/pro-designer/references/forms.md superui/skills/pro-designer/references/accessibility.md && ! grep -rn "–" superui/skills/pro-designer/references/forms.md superui/skills/pro-designer/references/accessibility.md` - exit 0 (no em/en dashes)

### Approach
1. In `forms.md`, after the "Required vs optional marking" section, insert a new `## Mobile input mechanics` section with 3 bullets: (a) inputs >= 16px font-size on mobile - iOS Safari auto-zooms any focused field below 16px and leaves the page zoomed; (b) semantic `type` (`email`, `tel`, `url`, `number`) plus `inputmode` (`numeric`, `decimal`) so the matching mobile keyboard opens; (c) real `autocomplete` tokens (`name`, `email`, `postal-code`, `cc-number`) - never blanket `autocomplete="off"`, it breaks password managers and autofill.
2. In `accessibility.md`, append one bullet to `## Resize and spacing resilience`: never `user-scalable=no` or `maximum-scale=1` in the viewport meta - pinch-zoom must stay available (SC 1.4.4); keep `width=device-width, initial-scale=1`.
3. In `accessibility.md`, after `## Never color alone (SC 1.4.1, Level A)`, insert a new `## Accessible names and hidden semantics` section with 3 bullets: (a) every icon-only control (icon button, triple-dot overflow, close X) carries `aria-label` or visually hidden text naming the action ("Close dialog", "Delete item"); (b) meaningful images get descriptive `alt`; (c) purely decorative icons/images are hidden from assistive tech (`aria-hidden="true"` or empty `alt`).
4. In `forms.md`, replace the two pre-existing en dashes (U+2013) with plain hyphens: the page-title example in "Error state visuals and accessibility" (`"3 Errors – Billing Address"`) and the date-range example in "Smart defaults" (`"15 Oct – 20 Oct"`) - required by SKILL.md's own hard no-dash rule; no other characters change.
5. Verify wording against the source files `.temp/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/references/quick-reference.md` (sections 1, 5, 8) and `.temp/ui-ux-pro-max-skill/.claude/skills/ui-styling/references/shadcn-accessibility.md` (ARIA Labels), then strip any stack-specific phrasing.

### Edge cases
- The 16px rule must not contradict forms.md's existing typography cross-references - phrase as a floor for inputs on mobile, not a global body-size rule (body 16px already lives in SKILL.md).
- The accessible-name rule must not duplicate the existing `aria-invalid`/`aria-describedby` form guidance in forms.md - scope it to icon-only controls and images.

### Contracts
none

### DoD
Both files carry the new sections with the exact rules of criteria #1-2; grep commands above pass; no other section of either file modified.

<!-- /TASK -->

---

<!-- TASK -->

## Task 2 - feat(pro-designer): add overlay focus contract, status feedback and motion asymmetry rules
- Covers: criteria #3, #7
- TDD: none

### Dependencies
- none

### Files
- modify - superui/skills/pro-designer/references/components-states.md (extend sections "Loading states", "Overlays: modal vs drawer vs popover", "Hover, focus, pressed", "Motion engineering"; new section "Toasts and async status")

### Test Commands
*Build*
- none - markdown-only change, this repo has no build step

*Tests*
- `grep -n "aria-live" superui/skills/pro-designer/references/components-states.md` - at least one match
- `grep -n "80ms" superui/skills/pro-designer/references/components-states.md` - still exactly one match (existing stagger value preserved)
- `! grep -n "—" superui/skills/pro-designer/references/components-states.md && ! grep -n "–" superui/skills/pro-designer/references/components-states.md` - exit 0

### Approach
1. In `## Overlays: modal vs drawer vs popover`, add 2 bullets: (a) keyboard/focus contract - a modal/drawer traps focus inside, autofocuses its first meaningful control, closes on Esc, and returns focus to the trigger on close; a menu/popover opens on Enter/Space, navigates with arrow keys, closes on Esc; (b) modal scrim: 40-60% black over the page - lighter fails to isolate the dialog, darker reads as a new screen.
2. After `## Optimistic UI`, insert a new `## Toasts and async status` section with 3 bullets: (a) toasts auto-dismiss in 3-5s, never steal focus, and announce via `aria-live="polite"` (`assertive` only for errors); (b) any non-form async status change (background save, async result) gets an `aria-live` region so state changes are announced (form errors keep `role="alert"` -> forms.md); (c) an AI/LLM response streams token-by-token as it arrives - a long spinner hiding an already-flowing answer is a designed-in wait.
3. In `## Loading states`, add 1 bullet: reserve space for async content - explicit dimensions or `aspect-ratio` on images, embeds and late-loading blocks so nothing jumps on arrival; load webfonts with `font-display: swap` plus a metric-similar fallback font.
4. In `## Hover, focus, pressed`, extend the "One layer at a time - pressed wins over hover" sentence to the full priority order: when states co-occur, disabled > loading > pressed > focus > hover.
5. In `## Motion engineering`, add 2 bullets: (a) exits run ~60-70% of the enter duration - leaving is acknowledgment, not a second entrance; ease-out entering, ease-in exiting, never linear for UI motion; (b) cap staggered reveals at ~8 children - beyond that the tail feels laggy; keep the existing 80ms delay recipe unchanged.
6. Verify wording against `.temp/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/references/quick-reference.md` (sections 7, 8), `.temp/ui-ux-pro-max-skill/.claude/skills/ui-styling/references/shadcn-accessibility.md` (Dialog/Modal Navigation, Live Regions), `.temp/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/references/pro-rules.md` (scrim), then strip stack-specific phrasing.

### Edge cases
- The toast bullet must not contradict the existing undo pattern (`"Deleted. Undo", ~5-10s`) in Optimistic UI - an undo toast keeps the longer window; state that plainly.
- The state-priority bullet must keep the existing M3 opacity values untouched.
- The scrim bullet must not conflict with accessibility.md's text-over-image scrim guidance (different concern - keep the word "modal" in the bullet).

### Contracts
none

### DoD
`components-states.md` carries all nine items of criterion #3 in the sections named above; grep commands pass; existing values (80ms, M3 opacities, undo window) byte-identical.

<!-- /TASK -->

---

<!-- TASK -->

## Task 3 - feat(pro-designer): add chart limits, SVG icon craft and finish-checklist items
- Covers: criteria #4, #5, #7
- TDD: none

### Dependencies
- none

### Files
- modify - superui/skills/pro-designer/references/saas-dashboards.md (extend sections "Chart construction" and "Icons")
- modify - superui/skills/pro-designer/references/process.md (extend section "What generated builds forget - finish checklist")

### Test Commands
*Build*
- none - markdown-only change, this repo has no build step

*Tests*
- `grep -n "currentColor" superui/skills/pro-designer/references/saas-dashboards.md` - at least one match
- `grep -n "1200x630" superui/skills/pro-designer/references/process.md` - one match
- `! grep -rn "—" superui/skills/pro-designer/references/saas-dashboards.md superui/skills/pro-designer/references/process.md && ! grep -rn "–" superui/skills/pro-designer/references/saas-dashboards.md superui/skills/pro-designer/references/process.md` - exit 0

### Approach
1. In `saas-dashboards.md` `## Chart construction`, add 2 bullets: (a) pie/donut max 5 categories - beyond that slices become unreadable, switch to a horizontal bar chart; sort bar charts descending by value unless the axis is ordinal or time; (b) every chart ships a non-visual alternative - a data-table view or a one-sentence text summary of the key insight for screen readers (the existing color-alone rule covers series encoding; do not duplicate it).
2. In `saas-dashboards.md` `## Icons`, add 3 bullets: (a) inline SVG craft - `fill`/`stroke` via `currentColor` so icons inherit text color, `viewBox="0 0 24 24"`, a `<title>` element naming the meaning, round caps/joins for outlined styles; (b) design icons at 24px and verify at 16px and 48px - detail that vanishes at 16px does not belong in the icon; (c) match icon style to context - outlined ~2px stroke for dense app UI, filled for mobile nav bars/toolbars, duotone for marketing surfaces; one style per product (consistency lock -> distinctiveness.md).
3. In `process.md` `## What generated builds forget - finish checklist`, edit the favicon line to "Legal footer links (privacy, terms); a real favicon - legible at 16px, survives single-color." and add one bullet: "A social share image (`og:image`, 1200x630) - critical content centered; platforms crop the edges."
4. Verify wording against `.temp/ui-ux-pro-max-skill/.claude/skills/design/references/icon-design.md` (SVG Best Practices, styles table), `.temp/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/data/charts.csv` (rows 2-3) and `.temp/ui-ux-pro-max-skill/.claude/skills/design/data/icon/styles.csv`, then strip stack-specific phrasing.

### Edge cases
- The icon-style mapping must defer to an existing product icon set (design-system precedence in SKILL.md) - phrase as guidance for choosing, not overriding.
- The chart data-table bullet must not restate the "never color alone" rule already present two bullets above.

### Contracts
none

### DoD
Both files carry the additions of criteria #4-5; grep commands pass; the existing Lucide/Phosphor and no-emoji bullets unchanged.

<!-- /TASK -->

---

<!-- TASK -->

## Task 4 - feat(pro-designer): add token-architecture reference with routing
- Covers: criteria #6, #7
- TDD: none

### Dependencies
- none

### Files
- add - superui/skills/pro-designer/references/tokens.md (new reference, ~40 lines)
- modify - superui/skills/pro-designer/SKILL.md (one new line in "## Reference routing")
- modify - superui/CLAUDE.md (pro-designer entry in "## Skills" - mention the new tokens.md reference)

### Test Commands
*Build*
- none - markdown-only change, this repo has no build step

*Tests*
- `grep -n "tokens.md" superui/skills/pro-designer/SKILL.md` - one match in the Reference routing section
- `grep -n "tokens.md" superui/CLAUDE.md` - at least one match
- `grep -c "^#" superui/skills/pro-designer/references/tokens.md` - headings present (file exists, structured)
- `! grep -n "—" superui/skills/pro-designer/references/tokens.md && ! grep -n "–" superui/skills/pro-designer/references/tokens.md` - exit 0

### Approach
1. Write `references/tokens.md` (~40 lines) mirroring the house style of the other references (H1 title + "Read when ..." line + `##` sections, delta-only bullets, no tables). Sections: (a) `## Three layers` - primitive (raw values: `--color-blue-600`, `--space-4`) -> semantic (purpose aliases: `--color-primary`, `--color-muted-foreground`) -> component (`--button-bg`), each layer referencing only the layer below; primitives change rarely, semantic changes for theming, component for per-component tuning; (b) `## Consumption rule` - components consume semantic tokens, never primitives; a component hardcoding a primitive breaks retheming; once tokens exist, no raw hex/px in component code; (c) `## Dark mode mechanism` - dark mode overrides ONLY the semantic layer, primitives never change (physiology of the values themselves -> color.md); (d) `## Pairing and naming` - every surface token ships with its foreground partner (`--surface` + `--surface-foreground`) so contrast is decided once at token level; name by role, never hue (`--color-destructive`, not `--color-red`); convention `--{category}-{item}-{variant}-{state}` (`--color-primary-hover`, `--button-bg-hover`); (e) `## Derived scales` - the radius scale derives from one base token (md = base - 2px, sm = base - 4px) so one change retunes the surface; z-index as named tiers defined once (content tiers first, then dropdown < sticky < modal < popover < tooltip), never an arbitrary `9999`.
2. Open the file with one framing line: advisory for host projects building their own CSS system; an existing project token set wins (design-system precedence -> SKILL.md).
3. In `SKILL.md` `## Reference routing`, insert after the color.md line: "Building or reviewing a token system - CSS variables, primitive/semantic/component layering, theming mechanism, dark-mode switching, z-index layers -> `references/tokens.md`".
4. In `superui/CLAUDE.md`, extend the pro-designer skill entry's reference inventory sentence to mention `references/tokens.md` (token-architecture doctrine distilled from the ui-ux-pro-max analysis) - minimal wording, matching the existing entry style.
5. Verify doctrine against `.temp/ui-ux-pro-max-skill/.claude/skills/design-system/references/token-architecture.md`, `semantic-tokens.md`, `primitive-tokens.md` and `.temp/ui-ux-pro-max-skill/.claude/skills/ui-styling/references/shadcn-theming.md` (paired foregrounds, role naming), then strip Tailwind/shadcn specifics and their concrete palette/z-index numbers (keep the tier ordering, drop the 1000-1400 values).

### Edge cases
- tokens.md must NOT describe superui's own DESIGN.md front-matter tokens or the design-extractor pipeline - it is host-project advice only; no mention of DTCG.
- The z-index tier bullet must present the ordering, not mandated numeric values.
- SKILL.md's "Design pass" numbered list stays untouched - routing line only.

### Contracts
none

### DoD
`references/tokens.md` exists with the five sections above; SKILL.md routes to it; superui/CLAUDE.md mentions it; grep commands pass.

<!-- /TASK -->
