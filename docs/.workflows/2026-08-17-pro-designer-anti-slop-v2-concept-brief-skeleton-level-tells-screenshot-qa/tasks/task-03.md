
## Task 3 - refactor(superui): tighten distinctiveness.md - token scope, subject artifacts, signature recurrence
- Covers: criteria #6, #10
- TDD: none

### Dependencies
- Task 1 - blocks: Task 7

### Files
- modify - superui/skills/pro-designer/references/distinctiveness.md (sections: intro scope paragraph, `## Ground the direction in the subject`, `## One signature element`, `## Plan-then-critique pass`)

### Test Commands
#### Build
- none (markdown-only plugin source, no build step)

#### Tests
- bash -c '! grep -n "Plan-then-critique pass" superui/skills/pro-designer/references/distinctiveness.md' (expect exit 0 - section replaced)
- bash -c '! grep -nP "\x{2014}|\x{2013}" superui/skills/pro-designer/references/distinctiveness.md' (expect exit 0)

### Approach
1. Rewrite the scope sentence "When the project defines its own design system, that system IS the direction...": the project's tokens bind palette, type, radius and spacing and are audited, never rivaled - but a new Persuade/Experience surface still requires the concept brief (concepting.md), expressed in those tokens.
2. In `## Ground the direction in the subject`, add a verifiable rule: when the product concerns physical or visual objects, the page MUST show them as designed graphic elements (their shapes, proportions, layouts from their world); line icons are allowed only for abstract concepts; test - point at 3 places on the render that show the product's world, not the template's.
3. In `## One signature element`, add: a signature element exists only if it recurs in at least 3 points of the page in consistent form; one hero effect followed by neutral cards is decoration, not a signature; returns may be quieter (list marker, chip shape, CTA background) but must exist.
4. Replace the whole `## Plan-then-critique pass` section with a one-line pointer: the mandatory pre-build concept brief and skeleton critique live in concepting.md (mirroring the existing anti-slop.md pointer style).

### Edge cases
- none

### Contracts
- none

### DoD
The four edits are in place, the old plan-then-critique body is gone, both grep checks pass.


### Covered criteria
6. `distinctiveness.md`: the design-system scope line no longer says the system IS the direction (tokens bind values; a new Persuade/Experience surface still needs the concept brief); subject grounding is a verifiable rule (products about physical/visual objects must render them as designed graphic elements, line icons only for abstract concepts, with the point-at-3-places test); the signature element requires recurrence in at least 3 points in consistent form (quieter returns allowed, but present); the "Plan-then-critique pass" section is replaced by a one-line pointer to `concepting.md`.
10. No file under `superui/` gained an em dash (U+2014), en dash (U+2013), table, emoji, source URL, or external source name; `superui/.claude-plugin/plugin.json` is unchanged.
