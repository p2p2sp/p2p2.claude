
## Task 4 - feat(superui): add skeleton-level and second-generation tells to anti-slop.md
- Covers: criteria #4, #5, #10
- TDD: none

### Dependencies
- none - blocks: Task 7

### Files
- modify - superui/skills/pro-designer/references/anti-slop.md (sections: intro paragraph, `## Layout tells`, `## Visual tells`, `## Hero discipline`, `## Copy and demo-content tells`)

### Test Commands
#### Build
- none (markdown-only plugin source, no build step)

#### Tests
- bash -c 'grep -n "second-generation" superui/skills/pro-designer/references/anti-slop.md' (expect a match - entropy meta-rule present)
- bash -c '! grep -nP "\x{2014}|\x{2013}" superui/skills/pro-designer/references/anti-slop.md' (expect exit 0)

### Approach
1. Intro: append the entropy meta-rule - any concrete recommendation repeated at scale becomes the next default; the file forces a subject-justified DECISION, never swaps one ready-made look for another; "safe escape looks" (emerald instead of purple, navy + glow instead of a mesh gradient, cream + serif + terracotta) are second-generation tells.
2. `## Layout tells`: add the top-order tell - the canonical section SEQUENCE (centered hero -> cards -> numbered steps -> feature grid -> centered CTA) is a tell in itself even when every section passes the individual bans; minimums: at least one fully asymmetric or full-bleed section, at least one section of different density/temperature than its neighbors, never two adjacent sections in the same card-on-slab language. Extend the existing uniform-rhythm bullet: constant section padding is a tell - vertical rhythm changes deliberately (a tight section after a spacious one). Add the cardocalypse bullet: max ~50% of page content in cards; the most important feature gets a unique non-card treatment; the rest may be a list or editorial layout; icon-in-a-rounded-square above a title is a named tell.
3. `## Visual tells`: add - fade-up-on-scroll on every section (budget -> motion.md); content invisible without JS / initial `opacity: 0` on content (hard rule -> motion.md); colored 3-4px bar on a card edge; a single serif-italic word inside a sans-serif H1; permanent dark mode as a reflex with no brief justification; safe emerald/green as the escape from purple. Do NOT duplicate the existing gradient-text tell.
4. `## Hero discipline`: add the eyebrow pill with a status dot above the H1 as a named default. `## Copy and demo-content tells`: add the "It's not just X, it's Y" cadence and adjective triads ("fast, simple, secure") as banned cadences.

### Edge cases
- none

### Contracts
- New tells keep the existing bullet style: tell first, then the fix or the reference arrow.

### DoD
All four sections updated with no duplicated tells; both grep checks pass.


### Covered criteria
4. `anti-slop.md` names as tells: the canonical section sequence itself (centered hero -> cards -> numbered steps -> feature grid -> centered CTA) with minimum variation requirements (one fully asymmetric or full-bleed section, one section of different density/temperature, never two adjacent sections in the same card-on-slab language); uniform section padding; cardocalypse limits (max ~50% of page content in cards, the most important feature gets unique non-card treatment, icon-in-rounded-square-above-title named as a tell); fade-up-on-scroll on every section plus content invisible without JS (deferring limits to motion.md).
5. `anti-slop.md` opens with an entropy meta-rule (any mass-repeated recommendation becomes the next default; safe escape looks are second-generation tells) and adds these tells: colored 3-4px card edge bar, single serif-italic word in a sans H1, unjustified permanent dark mode, safe emerald/green as a purple escape, eyebrow pill with dot above the H1, "It's not just X, it's Y" cadence, adjective triads. No duplicate of the existing gradient-text tell.
10. No file under `superui/` gained an em dash (U+2014), en dash (U+2013), table, emoji, source URL, or external source name; `superui/.claude-plugin/plugin.json` is unchanged.
