
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


### Covered criteria
3. `references/components-states.md` carries all nine approved items: overlay focus/keyboard contract (modal traps focus, closes on Esc, returns focus to trigger; menu opens on Enter/Space, navigates with arrows, closes on Esc), modal scrim 40-60% black, toast discipline (auto-dismiss 3-5s, never steals focus, `aria-live="polite"`, assertive only for errors), `aria-live` for non-form async status, full state priority order (disabled > loading > pressed > focus > hover), enter/exit motion asymmetry (exit ~60-70% of enter duration; ease-out entering, ease-in exiting, never linear for UI motion), stagger cap (~8 children; existing 80ms delay value unchanged), space reservation for async content against layout shift (explicit dimensions or aspect-ratio; `font-display: swap` with a metric-similar fallback), and token-by-token streaming for AI responses instead of a long spinner.
7. Every file under `superui/skills/pro-designer/` touched by this plan (the 5 edited references, tokens.md, SKILL.md) is free of em dashes (U+2014) and en dashes (U+2013) - including the two pre-existing en dashes in forms.md example strings, replaced with plain hyphens; new content uses bullets only (no tables, no emoji, no italics); no Tailwind/shadcn/React-specific wording in any added rule; all pre-existing rules that conflicted with the external source remain unchanged (`superui/CLAUDE.md` is exempt from the dash sweep - only its pro-designer entry sentence changes).
