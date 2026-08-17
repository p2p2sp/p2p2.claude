
## Task 6 - feat(superui): add scroll-reveal budget and no-JS visibility rules to motion.md
- Covers: criteria #8, #10
- TDD: none

### Dependencies
- none - blocks: Task 7

### Files
- modify - superui/skills/pro-designer/references/motion.md (sections: new `## Scroll-reveal budget` after the hunt list, `## clip-path recipes` reveal bullet, `## Never ship`)

### Test Commands
#### Build
- none (markdown-only plugin source, no build step)

#### Tests
- bash -c 'grep -n "Scroll-reveal budget" superui/skills/pro-designer/references/motion.md' (expect a match)
- bash -c '! grep -nP "\x{2014}|\x{2013}" superui/skills/pro-designer/references/motion.md' (expect exit 0)

### Approach
1. Add `## Scroll-reveal budget` after the hunt list: per page - one orchestrated entrance (typically the hero) plus at most 1-2 reveal moments; everything else renders visible; fade-up on every section is a named generated-look tell (anti-slop.md).
2. In the same section, the hard technical rule: content must be visible without JS and in a full-page screenshot - initial `opacity: 0` on content is an accessibility, SEO and share-card defect; progressive enhancement only (a JS-added class enables the animation, never the visibility).
3. In `## clip-path recipes`, append to the reveal-on-scroll bullet: counts against the scroll-reveal budget.
4. In `## Never ship`, add two entries: fade-up on every section -> the scroll-reveal budget; content hidden until a scroll handler runs -> visible by default, JS adds motion only.

### Edge cases
- none

### Contracts
- none

### DoD
New section plus both Never-ship entries present; both grep checks pass.


### Covered criteria
8. `motion.md` adds a scroll-reveal budget (one orchestrated entrance plus at most 1-2 reveal moments per page; all other content renders visible) and a hard rule that content is visible without JS and in full-page screenshots (initial `opacity: 0` on content is a defect; JS adds animation, not visibility), reflected in the "Never ship" list and referenced from the reveal-on-scroll recipe.
10. No file under `superui/` gained an em dash (U+2014), en dash (U+2013), table, emoji, source URL, or external source name; `superui/.claude-plugin/plugin.json` is unchanged.
