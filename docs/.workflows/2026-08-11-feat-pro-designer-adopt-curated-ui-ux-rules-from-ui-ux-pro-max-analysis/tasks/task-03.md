
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


### Covered criteria
4. `references/saas-dashboards.md` carries: chart micro-rules (pie/donut max 5 categories - switch to bars beyond; sort bar charts descending by value unless the axis is ordinal/time; provide a data-table alternative or a text summary for screen readers) and SVG icon craft rules (`currentColor` fills, `viewBox="0 0 24 24"`, a `<title>` element, design at 24px and test at 16px and 48px) plus an icon style-to-context mapping (outlined ~2px stroke for dense app UI, filled for mobile nav/toolbars, duotone for marketing surfaces - one style per product, per the distinctiveness lock).
5. `references/process.md` finish checklist carries: a social-share og:image (1200x630, critical content centered because platforms crop) and the favicon line extended with "legible at 16px, survives single-color".
7. Every file under `superui/skills/pro-designer/` touched by this plan (the 5 edited references, tokens.md, SKILL.md) is free of em dashes (U+2014) and en dashes (U+2013) - including the two pre-existing en dashes in forms.md example strings, replaced with plain hyphens; new content uses bullets only (no tables, no emoji, no italics); no Tailwind/shadcn/React-specific wording in any added rule; all pre-existing rules that conflicted with the external source remain unchanged (`superui/CLAUDE.md` is exempt from the dash sweep - only its pro-designer entry sentence changes).
