
## Task 1 - feat(superui): add pro-designer concepting reference with mandatory concept brief
- Covers: criteria #1, #10
- TDD: none

### Dependencies
- none - blocks: Task 2, Task 3, Task 7

### Files
- add - superui/skills/pro-designer/references/concepting.md (sections: intro "Read when", `## The concept brief`, `## Skeleton critique`)

### Test Commands
#### Build
- none (markdown-only plugin source, no build step)

#### Tests
- bash -c '! grep -rnP "\x{2014}|\x{2013}" superui/skills/pro-designer/references/concepting.md' (expect exit 0 - no em/en dashes)

### Approach
1. Create `concepting.md` opening with a "Read when" line: before building ANY new Persuade or Experience surface, before the layout skeleton - also when the project defines a design system (tokens bind values, not the concept).
2. Write `## The concept brief` as a numbered 6-part artifact (5-10 lines total, written out and shown to the user before any layout work): thesis; subject world (3-5 physical artifacts/rituals from the product's domain, at least one promoted to the page's main visual device); one narrow out-of-web reference anchor justified by the subject and different per brief - never from a stock list; 3 named anti-references (what the page deliberately does NOT do because everyone in the category does); signature element + recurrence plan (at least 3 placements: hero, mid-page, CTA/footer - form named for each); section sequence with a layout family named per section (families -> anti-slop.md).
3. Write `## Skeleton critique`: before building, attack the sequence - "would this same section sequence ship for any similar product?"; if yes, redesign the outline, not the cosmetics; after the critique, derive every build decision from the revised brief.
4. Style: English, short bullets, plain hyphens, no tables/emoji, no source attribution.

### Edge cases
- none

### Contracts
- The brief is a conversational artifact shown to the user, not a file the skill persists in the host repo (pro-designer stays advisory, writes nothing).

### DoD
`concepting.md` exists with the three sections above covering all six brief parts and the skeleton critique; dash grep passes.


### Covered criteria
1. `superui/skills/pro-designer/references/concepting.md` exists and specifies a mandatory pre-layout Concept Brief (shown to the user) with exactly these parts: thesis (one sentence of what the page proves), subject world (3-5 physical artifacts/rituals, at least one promoted to the page's main visual device), one narrow out-of-web reference anchor justified by the subject, 3 named anti-references (deliberate taboos), signature element with a recurrence plan (at least 3 placements), and a section sequence listing a layout family per section - plus a skeleton critique ("would this same section sequence ship for any similar product?" - if yes, redesign the outline, not the cosmetics), applying also when the project already has a design system.
10. No file under `superui/` gained an em dash (U+2014), en dash (U+2013), table, emoji, source URL, or external source name; `superui/.claude-plugin/plugin.json` is unchanged.
