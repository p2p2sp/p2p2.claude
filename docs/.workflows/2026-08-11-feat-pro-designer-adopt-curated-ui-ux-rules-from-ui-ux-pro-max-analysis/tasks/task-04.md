
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


### Covered criteria
6. New `references/tokens.md` (~40 lines) exists covering: primitive -> semantic -> component layering with each layer referencing only the layer below; components consume semantic tokens, never primitives; dark mode overrides only the semantic layer; paired surface/foreground tokens; role-based naming (`destructive` not `red`) with the `--{category}-{item}-{variant}-{state}` convention; radius scale derived from one base token; named z-index tiers (content tiers, then dropdown < sticky < modal < popover < tooltip) instead of arbitrary `9999`; no raw hex/px values in component code once tokens exist. `SKILL.md` "Reference routing" has a line routing token architecture / theming mechanism / CSS variables / z-index layering to `references/tokens.md`, and `superui/CLAUDE.md`'s pro-designer entry mentions the new reference.
7. Every file under `superui/skills/pro-designer/` touched by this plan (the 5 edited references, tokens.md, SKILL.md) is free of em dashes (U+2014) and en dashes (U+2013) - including the two pre-existing en dashes in forms.md example strings, replaced with plain hyphens; new content uses bullets only (no tables, no emoji, no italics); no Tailwind/shadcn/React-specific wording in any added rule; all pre-existing rules that conflicted with the external source remain unchanged (`superui/CLAUDE.md` is exempt from the dash sweep - only its pro-designer entry sentence changes).
