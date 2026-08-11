
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


### Covered criteria
1. `references/forms.md` carries a mobile input mechanics section: minimum 16px font-size on inputs because iOS Safari auto-zooms below 16px; semantic `type`/`inputmode` attributes to raise the matching mobile keyboard; correct `autocomplete` tokens and a ban on blanket `autocomplete="off"`.
2. `references/accessibility.md` carries: a viewport rule (never `user-scalable=no` or `maximum-scale=1`; keep pinch-zoom available) and an accessible-name rule (icon-only controls need `aria-label` or visually hidden text; meaningful images need alt text; decorative ones are hidden from assistive tech).
7. Every file under `superui/skills/pro-designer/` touched by this plan (the 5 edited references, tokens.md, SKILL.md) is free of em dashes (U+2014) and en dashes (U+2013) - including the two pre-existing en dashes in forms.md example strings, replaced with plain hyphens; new content uses bullets only (no tables, no emoji, no italics); no Tailwind/shadcn/React-specific wording in any added rule; all pre-existing rules that conflicted with the external source remain unchanged (`superui/CLAUDE.md` is exempt from the dash sweep - only its pro-designer entry sentence changes).
